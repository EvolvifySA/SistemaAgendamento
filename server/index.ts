import "dotenv/config";
import express from "express";
import crypto from "node:crypto";
import fs from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import pg from "pg";
import {
  INITIAL_APPOINTMENTS,
  INITIAL_CONTACTS,
  INITIAL_PATIENTS,
  INITIAL_PROFESSIONALS,
  INITIAL_SETTINGS,
  INITIAL_TIME_OFF,
  INITIAL_USERS
} from "../src/data/mockData";
import {
  AppBootstrapData,
  Appointment,
  AppointmentStatus,
  AuthSession,
  ClinicSettings,
  ClinicalReminder,
  Contact,
  Patient,
  Professional,
  SystemUser,
  TimeOffEntry
} from "../src/types";
import { normalizePhone } from "../src/utils/phone";

const { Pool } = pg;

const app = express();
const port = Number(process.env.PORT || 3001);
const calApiVersion = process.env.CAL_API_VERSION || "2024-06-14";
const calBookingsApiVersion = process.env.CAL_BOOKINGS_API_VERSION || "2026-02-25";
const databaseUrl = process.env.DATABASE_URL;
const isPostgresConfigured = Boolean(databaseUrl);
const authSecret = process.env.AUTH_SECRET || "dev-clinic-auth-secret";
const defaultInitialPassword = process.env.DEFAULT_INITIAL_PASSWORD || "123456";
const n8nConfirmationSecret = process.env.N8N_CONFIRMATION_SECRET || "dev-n8n-confirmation-secret";
const sessionTtlMs = 1000 * 60 * 60 * 12;

const pool = isPostgresConfigured
  ? new Pool({
      connectionString: databaseUrl,
      ssl: process.env.DATABASE_SSL === "true" ? { rejectUnauthorized: false } : undefined
    })
  : null;

app.use(express.json({ limit: "2mb" }));

const demoState = {
  patients: withPatientPhones(INITIAL_PATIENTS),
  appointments: withAppointmentMeta(INITIAL_APPOINTMENTS),
  users: INITIAL_USERS,
  professionals: INITIAL_PROFESSIONALS.map(withProfessionalDefaults),
  contacts: INITIAL_CONTACTS,
  clinicalReminders: [] as ClinicalReminder[],
  timeOff: INITIAL_TIME_OFF,
  settings: INITIAL_SETTINGS
};

type ContactWithProfessionalIds = Contact & { professionalIds?: string[] };
type StoredUser = SystemUser & { passwordHash?: string; passwordUpdatedAt?: string };
type AuthenticatedRequest = express.Request & { currentUser?: SystemUser };

function uniqueProfessionalIds(ids?: string[]): string[] {
  return [...new Set((ids || []).filter(Boolean))];
}

function contactRow(contact: ContactWithProfessionalIds): Record<string, unknown> {
  const { professionalIds: _professionalIds, ...row } = contact;
  return row as Record<string, unknown>;
}

function publicUser(user: StoredUser): SystemUser {
  const { passwordHash: _passwordHash, passwordUpdatedAt: _passwordUpdatedAt, ...safeUser } = user;
  return safeUser;
}

function publicUsers(users: StoredUser[]): SystemUser[] {
  return users.map(publicUser);
}

function hashPassword(password: string): string {
  const salt = crypto.randomBytes(16).toString("hex");
  const hash = crypto.scryptSync(password, salt, 64).toString("hex");
  return `scrypt$${salt}$${hash}`;
}

function verifyPassword(password: string, storedHash?: string): boolean {
  if (!storedHash) return password === defaultInitialPassword;
  const [algorithm, salt, hash] = storedHash.split("$");
  if (algorithm !== "scrypt" || !salt || !hash) return false;
  const expected = Buffer.from(hash, "hex");
  const actual = crypto.scryptSync(password, salt, expected.length);
  return expected.length === actual.length && crypto.timingSafeEqual(expected, actual);
}

function signToken(payload: Record<string, unknown>): string {
  const body = Buffer.from(JSON.stringify(payload)).toString("base64url");
  const signature = crypto.createHmac("sha256", authSecret).update(body).digest("base64url");
  return `${body}.${signature}`;
}

function verifyToken(token?: string): { userId: string; exp: number } | null {
  if (!token || !token.includes(".")) return null;
  const [body, signature] = token.split(".");
  const expected = crypto.createHmac("sha256", authSecret).update(body).digest("base64url");
  const signatureBuffer = Buffer.from(signature);
  const expectedBuffer = Buffer.from(expected);
  if (signatureBuffer.length !== expectedBuffer.length || !crypto.timingSafeEqual(signatureBuffer, expectedBuffer)) {
    return null;
  }

  try {
    const payload = JSON.parse(Buffer.from(body, "base64url").toString("utf8")) as { userId?: string; exp?: number };
    if (!payload.userId || !payload.exp || payload.exp < Date.now()) return null;
    return { userId: payload.userId, exp: payload.exp };
  } catch {
    return null;
  }
}

function createSession(user: StoredUser): AuthSession {
  return {
    user: publicUser(user),
    token: signToken({ userId: user.id, exp: Date.now() + sessionTtlMs })
  };
}

function todayISO() {
  return new Date().toISOString().slice(0, 10);
}

function addDays(dateStr: string, days: number): string {
  const date = new Date(`${dateStr}T12:00:00.000Z`);
  date.setUTCDate(date.getUTCDate() + days);
  return date.toISOString().slice(0, 10);
}

function withPatientPhones(patients: Patient[]): Patient[] {
  return patients.map((patient) => ({
    ...patient,
    normalizedPhone: patient.normalizedPhone || normalizePhone(patient.phone)
  }));
}

function withProfessionalDefaults(professional: Professional): Professional {
  const currentCalUsername = professional.calUsername === "evolvify/30min" ? undefined : professional.calUsername;
  const calUsername =
    currentCalUsername ||
    (professional.id === "prof-1" ? "dramarciaodonto/30min" : professional.id === "prof-2" ? "drafrancisc/30min" : undefined);
  const calEventTypeId = professional.calEventTypeId || (professional.id === "prof-1" ? 6546777 : professional.id === "prof-2" ? 6531418 : undefined);
  const calUserId = professional.calUserId || (professional.id === "prof-1" ? 3074022 : professional.id === "prof-2" ? 3069015 : undefined);
  const calAccountType = professional.calAccountType || "individual";
  const calApiKeyEnvVar =
    professional.calApiKeyEnvVar ||
    (professional.id === "prof-1" ? "CAL_API_KEY_MARCIA" : professional.id === "prof-2" ? "CAL_API_KEY_FRANCISCA" : undefined);

  return {
    ...professional,
    timezone: "America/Sao_Paulo",
    calAccountType,
    calApiKeyEnvVar,
    calUserId,
    calUsername,
    calEventTypeId,
    calConnected: Boolean(calUsername && calEventTypeId)
  };
}

function withAppointmentMeta(appointments: Appointment[]): Appointment[] {
  const baseline = "2026-07-01";
  const current = todayISO();

  return appointments.map((appointment, index) => {
    const date = appointment.date.startsWith("2026-07")
      ? addDays(current, appointment.date === baseline ? 0 : index % 4)
      : appointment.date;
    return {
      source: "demo",
      timezone: "America/Sao_Paulo",
      startAt: `${date}T${appointment.time}:00-03:00`,
      endAt: `${date}T${appointment.endTime || appointment.time}:00-03:00`,
      ...appointment,
      id: `${appointment.id}-${index}`,
      date
    };
  });
}

async function runSqlFiles(dir: string) {
  if (!pool) return;
  const files = (await fs.readdir(dir)).filter((file) => file.endsWith(".sql")).sort();
  for (const file of files) {
    const sql = await fs.readFile(path.join(dir, file), "utf8");
    await pool.query(sql);
  }
}

async function initDatabase() {
  if (!pool) return;
  const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
  await runSqlFiles(path.join(root, "db", "migrations"));
  await runSqlFiles(path.join(root, "db", "seeds"));
}

async function readTable<T>(table: string, fallback: T[]): Promise<T[]> {
  if (!pool) return fallback;
  const result = await pool.query(`select * from ${table}`);
  return result.rows as T[];
}

async function replaceTable<T extends { id: string }>(table: string, rows: T[]): Promise<T[]> {
  if (!pool) return rows;
  const client = await pool.connect();
  try {
    await client.query("begin");
    for (const row of rows) {
      await upsertRow(client, table, row);
    }
    if (table !== "professionals") {
      const ids = rows.map((row) => row.id);
      if (table === "patients") {
        await client.query('update contacts set "patientId" = null where "patientId" is not null and not ("patientId" = any($1::text[]))', [ids]);
      }
      if (ids.length > 0) {
        await client.query(`delete from ${table} where not (id = any($1::text[]))`, [ids]);
      } else {
        await client.query(`delete from ${table}`);
      }
    }
    await client.query("commit");
    return rows;
  } catch (error) {
    await client.query("rollback");
    throw error;
  } finally {
    client.release();
  }
}

async function upsertRow(client: pg.PoolClient | pg.Pool, table: string, row: Record<string, unknown>) {
  const columns = Object.keys(row).filter((key) => row[key] !== undefined);
  const values = columns.map((column) => row[column]);
  const quotedColumns = columns.map((column) => `"${column}"`).join(", ");
  const placeholders = columns.map((_, index) => `$${index + 1}`).join(", ");
  const updates = columns
    .filter((column) => column !== "id")
    .map((column) => `"${column}" = excluded."${column}"`)
    .join(", ");

  await client.query(
    `insert into ${table} (${quotedColumns}) values (${placeholders}) on conflict (id) do update set ${updates}`,
    values
  );
}

async function readContactProfessionalIds(): Promise<Map<string, string[]>> {
  const map = new Map<string, string[]>();
  if (!pool) return map;

  const result = await pool.query(
    'select "contactId", array_agg("professionalId" order by "professionalId") as "professionalIds" from contact_professionals group by "contactId"'
  );
  for (const row of result.rows as { contactId: string; professionalIds: string[] }[]) {
    map.set(row.contactId, row.professionalIds || []);
  }
  return map;
}

async function syncContactProfessionalIds(
  client: pg.PoolClient | pg.Pool,
  contactId: string,
  professionalIds?: string[],
  source = "manual"
) {
  const ids = uniqueProfessionalIds(professionalIds);
  if (ids.length > 0) {
    await client.query(
      'delete from contact_professionals where "contactId" = $1 and not ("professionalId" = any($2::text[]))',
      [contactId, ids]
    );
  } else {
    await client.query('delete from contact_professionals where "contactId" = $1', [contactId]);
  }

  for (const professionalId of ids) {
    await client.query(
      `insert into contact_professionals ("contactId", "professionalId", source, "createdAt", "updatedAt")
       values ($1, $2, $3, now()::text, now()::text)
       on conflict ("contactId", "professionalId") do update
       set "updatedAt" = excluded."updatedAt"`,
      [contactId, professionalId, source]
    );
  }
}

async function replaceContacts(rows: ContactWithProfessionalIds[]): Promise<Contact[]> {
  const normalized = rows.map((contact) => ({
    ...contact,
    normalizedPhone: normalizePhone(contact.phone),
    professionalIds: uniqueProfessionalIds(contact.professionalIds),
    updatedAt: contact.updatedAt || new Date().toISOString()
  }));

  if (!pool) return normalized;

  const client = await pool.connect();
  try {
    await client.query("begin");
    for (const row of normalized) {
      await upsertRow(client, "contacts", contactRow(row));
      await syncContactProfessionalIds(client, row.id, row.professionalIds);
    }

    const ids = normalized.map((row) => row.id);
    if (ids.length > 0) {
      await client.query("delete from contacts where not (id = any($1::text[]))", [ids]);
    } else {
      await client.query("delete from contacts");
    }

    await client.query("commit");
    return normalized;
  } catch (error) {
    await client.query("rollback");
    throw error;
  } finally {
    client.release();
  }
}

async function audit(action: string, payload: Record<string, unknown>) {
  if (!pool) return;
  await pool.query("insert into audit_log (action, payload) values ($1, $2)", [action, payload]);
}

async function readUsers(): Promise<StoredUser[]> {
  return readTable<StoredUser>("users", demoState.users as StoredUser[]);
}

async function saveStoredUser(user: StoredUser): Promise<StoredUser> {
  demoState.users = (demoState.users as StoredUser[]).map((item) => item.id === user.id ? user : item);
  if (!demoState.users.some((item) => item.id === user.id)) {
    demoState.users.push(user);
  }
  if (pool) await upsertRow(pool, "users", user as unknown as Record<string, unknown>);
  return user;
}

async function bootstrap(): Promise<AppBootstrapData> {
  const [patients, appointments, users, professionals, contacts, contactProfessionalIds, clinicalReminders, timeOff, settingsRows] = await Promise.all([
    readTable<Patient>("patients", demoState.patients),
    readTable<Appointment>("appointments_cache", demoState.appointments),
    readUsers(),
    readTable<Professional>("professionals", demoState.professionals),
    readTable<Contact>("contacts", demoState.contacts),
    readContactProfessionalIds(),
    readTable<ClinicalReminder>("clinical_reminders", demoState.clinicalReminders),
    readTable<TimeOffEntry>("time_off", demoState.timeOff),
    readTable<ClinicSettings & { id?: string }>("clinic_settings", [{ id: "default", ...demoState.settings }])
  ]);

  const normalizedPatients = withPatientPhones(patients);
  const linkedContacts = contacts.map((contact) => {
    const normalizedPhone = contact.normalizedPhone || normalizePhone(contact.phone);
    const matchedPatient = normalizedPatients.find((patient) => patient.normalizedPhone === normalizedPhone);
    return {
      ...contact,
      normalizedPhone,
      patientId: contact.patientId || matchedPatient?.id,
      professionalIds: contact.professionalIds || contactProfessionalIds.get(contact.id) || []
    };
  });

  return {
    patients: normalizedPatients,
    appointments,
    users: publicUsers(users),
    professionals: professionals.map(withProfessionalDefaults),
    contacts: linkedContacts,
    clinicalReminders,
    timeOff,
    settings: settingsRows[0] || demoState.settings,
    mode: isPostgresConfigured ? "production" : "demo"
  };
}

app.post("/api/auth/login", async (req, res) => {
  try {
    const { email, password } = req.body as { email?: string; password?: string };
    if (!email || !password) return res.status(400).send("Informe e-mail e senha.");

    const users = await readUsers();
    const user = users.find((item) => item.email.toLowerCase() === email.toLowerCase());
    if (!user || !verifyPassword(password, user.passwordHash)) {
      return res.status(401).send("E-mail ou senha invalidos.");
    }
    if (!user.active) return res.status(403).send("Esta conta esta desativada.");

    const updatedUser = user.passwordHash
      ? user
      : await saveStoredUser({
          ...user,
          passwordHash: hashPassword(password),
          passwordUpdatedAt: new Date().toISOString()
        });

    await audit("auth.login", { userId: updatedUser.id });
    res.json(createSession(updatedUser));
  } catch (error) {
    res.status(500).send(error instanceof Error ? error.message : "Erro ao entrar no sistema.");
  }
});

async function requireAuth(req: AuthenticatedRequest, res: express.Response, next: express.NextFunction) {
  try {
    if (req.path === "/auth/login" || req.path.startsWith("/webhooks/cal") || req.path.startsWith("/webhooks/whatsapp-confirmation")) return next();
    const header = req.headers.authorization || "";
    const token = header.startsWith("Bearer ") ? header.slice("Bearer ".length) : "";
    const payload = verifyToken(token);
    if (!payload) return res.status(401).send("Sessao expirada. Entre novamente.");

    const user = (await readUsers()).find((item) => item.id === payload.userId);
    if (!user || !user.active) return res.status(401).send("Usuario sem acesso ativo.");
    req.currentUser = publicUser(user);
    next();
  } catch (error) {
    res.status(500).send(error instanceof Error ? error.message : "Erro de autenticacao.");
  }
}

function requireAdmin(req: AuthenticatedRequest, res: express.Response): boolean {
  if (req.currentUser?.role === "Administrador") return true;
  res.status(403).send("Acesso restrito ao administrador.");
  return false;
}

app.use("/api", requireAuth);

app.get("/api/auth/me", async (req: AuthenticatedRequest, res) => {
  res.json({ user: req.currentUser });
});

app.post("/api/auth/logout", async (_req, res) => {
  res.json({ ok: true });
});

app.get("/api/bootstrap", async (_req, res) => {
  try {
    res.json(await bootstrap());
  } catch (error) {
    res.status(500).send(error instanceof Error ? error.message : "Erro ao carregar dados.");
  }
});

app.get("/api/appointments", async (req, res) => {
  try {
    const data = await bootstrap();
    const { from, to, professionalId, status } = req.query;
    res.json(data.appointments.filter((appointment) => {
      if (from && appointment.date < String(from)) return false;
      if (to && appointment.date > String(to)) return false;
      if (professionalId && professionalId !== "todas" && appointment.professionalId !== professionalId) return false;
      if (status && status !== "todos" && appointment.status !== status) return false;
      return true;
    }));
  } catch (error) {
    res.status(500).send(error instanceof Error ? error.message : "Erro ao listar agenda.");
  }
});

app.get("/api/appointments/cal/:uid", async (req, res) => {
  try {
    const data = await bootstrap();
    const appointment = data.appointments.find((item) => item.calBookingUid === req.params.uid) || null;
    res.json({ appointment });
  } catch (error) {
    res.status(500).send(error instanceof Error ? error.message : "Erro ao localizar agendamento Cal.com.");
  }
});

app.put("/api/patients/bulk", async (req, res) => {
  const rows = withPatientPhones(req.body.patients || []);
  demoState.patients = rows;
  res.json(await replaceTable("patients", rows));
});

app.put("/api/contacts/bulk", async (req, res) => {
  const rows = (req.body.contacts || []).map((contact: ContactWithProfessionalIds) => ({
    ...contact,
    normalizedPhone: normalizePhone(contact.phone),
    professionalIds: uniqueProfessionalIds(contact.professionalIds),
    updatedAt: new Date().toISOString()
  }));
  demoState.contacts = rows;
  res.json(await replaceContacts(rows));
});

app.put("/api/appointments/bulk", async (req, res) => {
  const rows = req.body.appointments || [];
  demoState.appointments = rows;
  res.json(await replaceTable("appointments_cache", rows));
});

app.put("/api/users/bulk", async (req: AuthenticatedRequest, res) => {
  if (!requireAdmin(req, res)) return;
  const storedUsers = await readUsers();
  const rows = (req.body.users || []).map((user: SystemUser) => {
    const existing = storedUsers.find((item) => item.id === user.id);
    return {
      ...existing,
      ...user,
      passwordHash: existing?.passwordHash,
      passwordUpdatedAt: existing?.passwordUpdatedAt
    };
  });
  demoState.users = rows;
  res.json(publicUsers(await replaceTable("users", rows)));
});

app.post("/api/users", async (req: AuthenticatedRequest, res) => {
  if (!requireAdmin(req, res)) return;
  const { name, email, role, active = true, password } = req.body as SystemUser & { password?: string };
  if (!name || !email || !role || !password) return res.status(400).send("Nome, e-mail, perfil e senha sao obrigatorios.");
  if (password.length < 6) return res.status(400).send("A senha deve ter pelo menos 6 caracteres.");

  const users = await readUsers();
  if (users.some((user) => user.email.toLowerCase() === email.toLowerCase())) {
    return res.status(409).send("Este e-mail ja esta cadastrado.");
  }

  const now = new Date().toISOString();
  const user: StoredUser = {
    id: `usr-${Date.now()}`,
    name,
    email,
    role,
    active,
    needsPasswordChange: false,
    passwordHash: hashPassword(password),
    passwordUpdatedAt: now
  };
  await saveStoredUser(user);
  await audit("user.created", { userId: user.id, createdBy: req.currentUser?.id });
  res.status(201).json(publicUser(user));
});

app.patch("/api/users/:id", async (req: AuthenticatedRequest, res) => {
  if (!requireAdmin(req, res)) return;
  const users = await readUsers();
  const user = users.find((item) => item.id === req.params.id);
  if (!user) return res.status(404).send("Usuario nao encontrado.");
  if (user.id === req.currentUser?.id && req.body.active === false) {
    return res.status(400).send("Voce nao pode desativar sua propria conta.");
  }

  const updated: StoredUser = {
    ...user,
    name: req.body.name ?? user.name,
    email: req.body.email ?? user.email,
    role: req.body.role ?? user.role,
    active: req.body.active ?? user.active,
    needsPasswordChange: req.body.needsPasswordChange ?? user.needsPasswordChange
  };
  await saveStoredUser(updated);
  await audit("user.updated", { userId: updated.id, updatedBy: req.currentUser?.id });
  res.json(publicUser(updated));
});

app.patch("/api/users/:id/password", async (req: AuthenticatedRequest, res) => {
  if (!requireAdmin(req, res)) return;
  const { password } = req.body as { password?: string };
  if (!password || password.length < 6) return res.status(400).send("A senha deve ter pelo menos 6 caracteres.");

  const users = await readUsers();
  const user = users.find((item) => item.id === req.params.id);
  if (!user) return res.status(404).send("Usuario nao encontrado.");

  const updated = {
    ...user,
    needsPasswordChange: false,
    passwordHash: hashPassword(password),
    passwordUpdatedAt: new Date().toISOString()
  };
  await saveStoredUser(updated);
  await audit("user.password.updated_by_admin", { userId: updated.id, updatedBy: req.currentUser?.id });
  res.json(publicUser(updated));
});

app.delete("/api/users/:id", async (req: AuthenticatedRequest, res) => {
  if (!requireAdmin(req, res)) return;
  const users = await readUsers();
  const user = users.find((item) => item.id === req.params.id);
  if (!user) return res.status(404).send("Usuario nao encontrado.");
  if (user.id === req.currentUser?.id) return res.status(400).send("Voce nao pode excluir sua propria conta.");

  const remainingUsers = users.filter((item) => item.id !== user.id);
  const remainingAdmins = remainingUsers.filter((item) => item.role === "Administrador" && item.active);
  if (user.role === "Administrador" && remainingAdmins.length === 0) {
    return res.status(400).send("Nao e permitido excluir o ultimo administrador ativo.");
  }

  demoState.users = remainingUsers;
  if (pool) await pool.query("delete from users where id = $1", [user.id]);
  await audit("user.deleted", { userId: user.id, deletedBy: req.currentUser?.id });
  res.json({ ok: true });
});

app.patch("/api/me/password", async (req: AuthenticatedRequest, res) => {
  const { currentPassword, newPassword } = req.body as { currentPassword?: string; newPassword?: string };
  if (!currentPassword || !newPassword) return res.status(400).send("Informe a senha atual e a nova senha.");
  if (newPassword.length < 6) return res.status(400).send("A nova senha deve ter pelo menos 6 caracteres.");

  const users = await readUsers();
  const user = users.find((item) => item.id === req.currentUser?.id);
  if (!user) return res.status(404).send("Usuario nao encontrado.");
  if (!verifyPassword(currentPassword, user.passwordHash)) return res.status(401).send("Senha atual incorreta.");

  const updated = {
    ...user,
    needsPasswordChange: false,
    passwordHash: hashPassword(newPassword),
    passwordUpdatedAt: new Date().toISOString()
  };
  await saveStoredUser(updated);
  await audit("user.password.updated_self", { userId: updated.id });
  res.json(publicUser(updated));
});

app.put("/api/professionals/bulk", async (req, res) => {
  const rows = (req.body.professionals || []).map(withProfessionalDefaults);
  demoState.professionals = rows;
  res.json(await replaceTable("professionals", rows));
});

app.put("/api/settings", async (req, res) => {
  const settings = { id: "default", ...(req.body as ClinicSettings) };
  demoState.settings = req.body as ClinicSettings;
  if (!pool) return res.json(req.body);
  await upsertRow(pool, "clinic_settings", settings);
  res.json(req.body);
});

app.post("/api/clinical-reminders", async (req: AuthenticatedRequest, res) => {
  const now = new Date().toISOString();
  const reminder: ClinicalReminder = {
    id: `rem-${Date.now()}`,
    title: String(req.body.title || "").trim(),
    description: String(req.body.description || "").trim(),
    priority: req.body.priority || "Media",
    status: "Aberto",
    dueDate: req.body.dueDate || undefined,
    dueTime: req.body.dueTime || undefined,
    patientId: req.body.patientId || undefined,
    professionalId: req.body.professionalId || undefined,
    createdBy: req.currentUser?.id || "",
    createdAt: now,
    updatedAt: now
  };
  if (!reminder.title) return res.status(400).send("Titulo do lembrete e obrigatorio.");

  demoState.clinicalReminders = [reminder, ...demoState.clinicalReminders];
  if (pool) await upsertRow(pool, "clinical_reminders", reminder as unknown as Record<string, unknown>);
  await audit("clinical_reminder.created", { reminderId: reminder.id, createdBy: req.currentUser?.id });
  res.status(201).json(reminder);
});

app.patch("/api/clinical-reminders/:id", async (req: AuthenticatedRequest, res) => {
  const data = await bootstrap();
  const existing = data.clinicalReminders.find((item) => item.id === req.params.id);
  if (!existing) return res.status(404).send("Lembrete nao encontrado.");

  const status = req.body.status ?? existing.status;
  const updated: ClinicalReminder = {
    ...existing,
    title: req.body.title ?? existing.title,
    description: req.body.description ?? existing.description,
    priority: req.body.priority ?? existing.priority,
    status,
    dueDate: req.body.dueDate || undefined,
    dueTime: req.body.dueTime || undefined,
    patientId: req.body.patientId || undefined,
    professionalId: req.body.professionalId || undefined,
    updatedAt: new Date().toISOString(),
    completedAt: status === "Concluido"
      ? existing.completedAt || new Date().toISOString()
      : status === "Aberto"
        ? undefined
        : existing.completedAt
  };
  if (!updated.title.trim()) return res.status(400).send("Titulo do lembrete e obrigatorio.");

  demoState.clinicalReminders = demoState.clinicalReminders.map((item) => item.id === updated.id ? updated : item);
  if (pool) await upsertRow(pool, "clinical_reminders", updated as unknown as Record<string, unknown>);
  await audit("clinical_reminder.updated", { reminderId: updated.id, updatedBy: req.currentUser?.id, status: updated.status });
  res.json(updated);
});

app.patch("/api/appointments/:id/status", async (req, res) => {
  const { id } = req.params;
  const { status, notes } = req.body as { status: AppointmentStatus; notes?: string };
  const data = await bootstrap();
  const appointment = data.appointments.find((item) => item.id === id);
  if (!appointment) return res.status(404).send("Agendamento nao encontrado.");

  const updated = { ...appointment, status, notes: notes ?? appointment.notes };
  demoState.appointments = demoState.appointments.map((item) => item.id === id ? updated : item);

  if (pool) {
    await upsertRow(pool, "appointments_cache", updated);
    await audit("appointment.status.updated", { id, status });
  }

  res.json(updated);
});

async function calRequest(pathname: string, options: RequestInit = {}, tokenOverride?: string, apiVersion: string | false = calApiVersion) {
  const token = tokenOverride || process.env.CAL_API_KEY;
  if (!token) throw new Error("Chave Cal.com nao configurada no backend.");

  const response = await fetch(`https://api.cal.com${pathname}`, {
    ...options,
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
      ...(apiVersion ? { "cal-api-version": apiVersion } : {}),
      ...(options.headers || {})
    }
  });

  if (!response.ok) {
    const text = await response.text();
    throw new Error(text || `Erro Cal.com ${response.status}`);
  }

  return response.json().catch(() => ({ ok: true }));
}

function getProfessionalCalToken(professional: Professional) {
  const envVar = professional.calApiKeyEnvVar;
  if (!envVar) return null;
  return process.env[envVar] || null;
}

function getStringAtPath(source: unknown, path: string[]) {
  let current = source as Record<string, unknown> | undefined;
  for (const key of path) {
    if (!current || typeof current !== "object") return "";
    current = current[key] as Record<string, unknown> | undefined;
  }
  return typeof current === "string" ? current : "";
}

function normalizeCalUsername(value?: string) {
  if (!value) return "";
  return value
    .trim()
    .replace(/^https?:\/\/(app\.)?cal\.com\//, "")
    .replace(/^@/, "")
    .replace(/\/$/, "");
}

function extractCalUsername(eventTypeResponse: unknown, meResponse?: unknown) {
  const eventRoot = (eventTypeResponse as { data?: unknown })?.data || eventTypeResponse;
  const eventData = (eventRoot as { eventType?: unknown })?.eventType || eventRoot;
  const meData = (meResponse as { data?: unknown })?.data || meResponse;

  const bookingUrl =
    getStringAtPath(eventData, ["bookingUrl"]) ||
    getStringAtPath(eventData, ["bookerUrl"]) ||
    getStringAtPath(eventData, ["url"]) ||
    getStringAtPath(eventData, ["link"]) ||
    getStringAtPath(eventRoot, ["bookingUrl"]) ||
    getStringAtPath(eventRoot, ["bookerUrl"]);
  const fromUrl = normalizeCalUsername(bookingUrl);
  if (fromUrl.includes("/")) return fromUrl;

  const slug =
    getStringAtPath(eventData, ["slug"]) ||
    getStringAtPath(eventData, ["eventSlug"]) ||
    getStringAtPath(eventRoot, ["slug"]) ||
    getStringAtPath(eventRoot, ["eventSlug"]);
  const username =
    getStringAtPath(eventData, ["username"]) ||
    getStringAtPath(eventData, ["user", "username"]) ||
    getStringAtPath(eventData, ["owner", "username"]) ||
    getStringAtPath(eventData, ["profile", "username"]) ||
    getStringAtPath(eventData, ["users", "0", "username"]) ||
    getStringAtPath(eventRoot, ["username"]) ||
    getStringAtPath(meData, ["username"]);

  return username && slug ? `${username}/${slug}` : "";
}

app.post("/api/cal/bookings/:uid/cancel", async (req: AuthenticatedRequest, res) => {
  try {
    const { uid } = req.params;
    const cancellationReason = String(req.body?.cancellationReason || "").trim();
    if (!cancellationReason) return res.status(400).send("Informe o motivo do cancelamento.");

    const data = await bootstrap();
    const appointment = data.appointments.find((item) => item.calBookingUid === uid);
    if (!appointment) return res.status(404).send("Agendamento Cal.com nao encontrado no painel.");
    if (appointment.status === "Cancelado") {
      return res.json({ ok: true, appointment, calBooking: null, alreadyCancelled: true });
    }

    const professional = data.professionals.find((item) => item.id === appointment.professionalId);
    if (!professional) return res.status(409).send("Dentista do agendamento nao encontrada.");

    if (req.currentUser?.role === "Doutora") {
      const currentProfessional = data.professionals.find((item) =>
        item.email?.toLowerCase() === req.currentUser?.email.toLowerCase()
      );
      if (!currentProfessional || currentProfessional.id !== appointment.professionalId) {
        return res.status(403).send("A doutora somente pode cancelar os proprios atendimentos.");
      }
    }

    const token = getProfessionalCalToken(professional);
    if (!token) {
      return res.status(409).send(`Configure ${professional.calApiKeyEnvVar || "CAL_API_KEY_DENTISTA"} no backend.`);
    }

    const result = await calRequest(`/v2/bookings/${encodeURIComponent(uid)}/cancel`, {
      method: "POST",
      body: JSON.stringify({ cancellationReason, cancelSubsequentBookings: false })
    }, token, calBookingsApiVersion);

    const updated: Appointment = {
      ...appointment,
      status: "Cancelado",
      calStatus: "cancelled",
      cancellationReason,
      cancelledAt: new Date().toISOString(),
      cancelledByUserId: req.currentUser?.id
    };
    demoState.appointments = demoState.appointments.map((item) => item.id === updated.id ? updated : item);
    if (pool) await upsertRow(pool, "appointments_cache", updated as unknown as Record<string, unknown>);

    await audit("cal.booking.cancelled", {
      uid,
      appointmentId: appointment.id,
      professionalId: professional.id,
      cancellationReason,
      cancelledByUserId: req.currentUser?.id
    });
    res.json({ ok: true, appointment: updated, calBooking: result });
  } catch (error) {
    res.status(502).send(error instanceof Error ? error.message : "Erro ao cancelar no Cal.com.");
  }
});

app.post("/api/cal/bookings/:uid/reschedule", async (req, res) => {
  try {
    const { uid } = req.params;
    const result = await calRequest(`/v2/bookings/${encodeURIComponent(uid)}/reschedule`, {
      method: "POST",
      body: JSON.stringify({ start: req.body.start })
    });
    await audit("cal.booking.rescheduled", { uid, start: req.body.start });
    res.json({ ok: true, result });
  } catch (error) {
    res.status(500).send(error instanceof Error ? error.message : "Erro ao remarcar no Cal.com.");
  }
});

app.post("/api/professionals/:id/cal/sync-event-type", async (req, res) => {
  try {
    const data = await bootstrap();
    const professional = data.professionals.find((item) => item.id === req.params.id);
    if (!professional) return res.status(404).send("Profissional nao encontrada.");
    const eventTypeId = Number(req.body?.calEventTypeId || professional.calEventTypeId);
    if (!eventTypeId) return res.status(409).send("Configure o Event Type ID desta dentista antes de sincronizar.");

    const token = getProfessionalCalToken(professional);
    if (!token) {
      return res.status(409).send(`Configure ${professional.calApiKeyEnvVar || "CAL_API_KEY_DENTISTA"} no .env do backend antes de sincronizar.`);
    }

    const eventTypeResponse = await calRequest(`/v2/event-types/${eventTypeId}`, { method: "GET" }, token);
    let calUsername = extractCalUsername(eventTypeResponse);

    if (!calUsername) {
      const meResponse = await calRequest("/v2/me", { method: "GET" }, token);
      calUsername = extractCalUsername(eventTypeResponse, meResponse);
    }

    if (!calUsername) {
      return res.status(422).send("Event Type localizado, mas o Cal.com nao retornou username/slug suficiente. Preencha o link publico manualmente em Profissionais.");
    }

    const updated = withProfessionalDefaults({
      ...professional,
      calEventTypeId: eventTypeId,
      calUsername: normalizeCalUsername(calUsername),
      calAccountType: "individual",
      calConnected: true
    });

    demoState.professionals = demoState.professionals.map((item) => item.id === updated.id ? updated : item);
    if (pool) await upsertRow(pool, "professionals", updated as unknown as Record<string, unknown>);
    await audit("cal.event_type.synced", { professionalId: updated.id, calEventTypeId: updated.calEventTypeId });
    res.json(updated);
  } catch (error) {
    res.status(500).send(error instanceof Error ? error.message : "Erro ao sincronizar Event Type do Cal.com.");
  }
});

app.post("/api/professionals/:id/time-off", async (req, res) => {
  try {
    const data = await bootstrap();
    const professional = data.professionals.find((item) => item.id === req.params.id);
    if (!professional) return res.status(404).send("Profissional nao encontrada.");
    const startDate = new Date(req.body.start);
    const endDate = new Date(req.body.end);
    if (Number.isNaN(startDate.getTime()) || Number.isNaN(endDate.getTime())) {
      return res.status(400).send("Inicio e fim da folga precisam ser datas validas.");
    }
    if (endDate.getTime() <= startDate.getTime()) {
      return res.status(400).send("O fim da folga precisa ser depois do inicio.");
    }

    let calOooId: number | undefined;
    const accountType = professional.calAccountType || "individual";
    if (accountType === "individual") {
      const token = getProfessionalCalToken(professional);
      if (!token) {
        return res.status(409).send(`Cal.com nao conectado: configure ${professional.calApiKeyEnvVar || "CAL_API_KEY_DENTISTA"} no .env do backend.`);
      }
      const response = await calRequest("/v2/me/ooo", { method: "POST", body: JSON.stringify(req.body) }, token, false);
      calOooId = response?.data?.id;
    } else {
      const missingCalConfig = !professional.calUserId || (!professional.calTeamId && !professional.calOrgId);
      if (missingCalConfig) {
        return res.status(409).send("Cal.com nao conectado: configure calUserId e calTeamId ou calOrgId para esta dentista.");
      }
      const base = accountType === "organization"
        ? `/v2/organizations/${professional.calOrgId}/users/${professional.calUserId}/ooo`
        : `/v2/teams/${professional.calTeamId}/users/${professional.calUserId}/ooo`;
      const response = await calRequest(base, { method: "POST", body: JSON.stringify(req.body) });
      calOooId = response?.data?.id;
    }

    const entry: TimeOffEntry = {
      id: `off-${Date.now()}`,
      professionalId: professional.id,
      calOooId,
      start: req.body.start,
      end: req.body.end,
      reason: req.body.reason || "unspecified",
      notes: req.body.notes || "",
      source: calOooId ? "cal.com" : "internal"
    };

    demoState.timeOff = [entry, ...demoState.timeOff];
    if (pool) await upsertRow(pool, "time_off", entry as unknown as Record<string, unknown>);
    await audit("time_off.created", { professionalId: professional.id, entryId: entry.id });
    res.status(201).json(entry);
  } catch (error) {
    res.status(500).send(error instanceof Error ? error.message : "Erro ao criar folga.");
  }
});

app.patch("/api/professionals/:id/time-off/:entryId", async (req, res) => {
  const entry = req.body as TimeOffEntry;
  demoState.timeOff = demoState.timeOff.map((item) => item.id === req.params.entryId ? entry : item);
  if (pool) await upsertRow(pool, "time_off", entry as unknown as Record<string, unknown>);
  await audit("time_off.updated", { entryId: req.params.entryId });
  res.json(entry);
});

app.delete("/api/professionals/:id/time-off/:entryId", async (req, res) => {
  try {
    const data = await bootstrap();
    const professional = data.professionals.find((item) => item.id === req.params.id);
    const entry = data.timeOff.find((item) => item.id === req.params.entryId);

    if (professional && entry?.calOooId) {
      const accountType = professional.calAccountType || "individual";
      if (accountType === "individual") {
        const token = getProfessionalCalToken(professional);
        if (token) {
          await calRequest(`/v2/me/ooo/${entry.calOooId}`, { method: "DELETE" }, token, false);
        }
      } else {
        const base = accountType === "organization"
          ? `/v2/organizations/${professional.calOrgId}/users/${professional.calUserId}/ooo/${entry.calOooId}`
          : `/v2/teams/${professional.calTeamId}/users/${professional.calUserId}/ooo/${entry.calOooId}`;
        await calRequest(base, { method: "DELETE" });
      }
    }

    demoState.timeOff = demoState.timeOff.filter((item) => item.id !== req.params.entryId);
    if (pool) await pool.query("delete from time_off where id = $1", [req.params.entryId]);
    await audit("time_off.deleted", { entryId: req.params.entryId });
    res.json({ ok: true });
  } catch (error) {
    res.status(500).send(error instanceof Error ? error.message : "Erro ao remover folga.");
  }
});

function mapCalStatus(trigger: string): AppointmentStatus {
  if (trigger.includes("CANCELLED")) return "Cancelado";
  if (trigger.includes("NO_SHOW")) return "Faltou";
  return "Agendado";
}

function dateTimePartsInZone(value: Date, timeZone: string) {
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    hourCycle: "h23"
  }).formatToParts(value);
  const part = (type: Intl.DateTimeFormatPartTypes) => parts.find((item) => item.type === type)?.value || "";
  return {
    date: `${part("year")}-${part("month")}-${part("day")}`,
    time: `${part("hour")}:${part("minute")}`
  };
}

function getBookingMetadata(booking: Record<string, unknown>): Record<string, unknown> {
  const metadata = booking.metadata || (booking.payload as { metadata?: unknown } | undefined)?.metadata;
  return metadata && typeof metadata === "object" ? metadata as Record<string, unknown> : {};
}

function getBookingEventTypeId(booking: Record<string, unknown>): number | undefined {
  const candidates = [
    booking.eventTypeId,
    (booking.eventType as { id?: unknown } | undefined)?.id,
    (booking.eventType as { eventTypeId?: unknown } | undefined)?.eventTypeId
  ];
  const value = candidates.find((candidate) => Number(candidate));
  return value ? Number(value) : undefined;
}

function getBookingEventTypeSlug(booking: Record<string, unknown>): string {
  const eventType = booking.eventType as Record<string, unknown> | undefined;
  const candidates = [
    eventType?.slug,
    eventType?.url,
    eventType?.bookingUrl,
    booking.eventSlug,
    booking.slug
  ];
  return normalizeCalUsername(candidates.find((candidate) => typeof candidate === "string") as string | undefined);
}

function getBookingPhone(booking: Record<string, unknown>, attendee: Record<string, unknown>): string {
  const responses = booking.responses as Record<string, { value?: unknown }> | undefined;
  const location = booking.location as { optionValue?: unknown } | undefined;
  const candidates = [
    attendee.phoneNumber,
    attendee.phone,
    responses?.phone?.value,
    responses?.telefone?.value,
    responses?.whatsapp?.value,
    location?.optionValue
  ];
  return candidates.find((candidate) => typeof candidate === "string" && candidate.trim()) as string || "";
}

function findProfessionalForBooking(
  professionals: Professional[],
  booking: Record<string, unknown>,
  metadata: Record<string, unknown>
) {
  const eventTypeId = getBookingEventTypeId(booking);
  if (eventTypeId) {
    const byEventType = professionals.find((professional) => professional.calEventTypeId === eventTypeId);
    if (byEventType) return byEventType;
  }

  const eventSlug = getBookingEventTypeSlug(booking);
  if (eventSlug) {
    const bySlug = professionals.find((professional) => {
      const username = normalizeCalUsername(professional.calUsername);
      return username === eventSlug || username.endsWith(`/${eventSlug}`) || eventSlug.endsWith(`/${username}`);
    });
    if (bySlug) return bySlug;
  }

  const metadataProfessionalId = typeof metadata.clinicProfessionalId === "string" ? metadata.clinicProfessionalId : "";
  return metadataProfessionalId
    ? professionals.find((professional) => professional.id === metadataProfessionalId)
    : undefined;
}

app.post("/api/webhooks/cal", async (req, res) => {
  try {
    const trigger = req.body?.triggerEvent || req.body?.type || "";
    const booking = (req.body?.payload || req.body?.data || req.body) as Record<string, unknown>;
    const attendee = ((booking?.attendees as Record<string, unknown>[] | undefined)?.[0] || {}) as Record<string, unknown>;
    const metadata = getBookingMetadata(booking);
    const phone = getBookingPhone(booking, attendee);
    const normalizedPhone = normalizePhone(phone);
    const data = await bootstrap();
    const metadataPatientId = typeof metadata.clinicPatientId === "string" ? metadata.clinicPatientId : "";
    const patient =
      data.patients.find((item) => item.id === metadataPatientId) ||
      data.patients.find((item) => item.normalizedPhone === normalizedPhone);
    const professional = findProfessionalForBooking(data.professionals, booking, metadata);
    const startAt = booking?.startTime || booking?.start || booking?.startAt;
    const endAt = booking?.endTime || booking?.end || booking?.endAt;

    if (booking?.uid && startAt && !professional) {
      await audit("cal.webhook.unmatched_professional", {
        uid: booking.uid,
        eventTypeId: getBookingEventTypeId(booking),
        eventSlug: getBookingEventTypeSlug(booking),
        metadata
      });
      return res.json({ ok: true, ignored: true, reason: "professional_not_identified" });
    }

    const existingContact = data.contacts.find((contact) => contact.normalizedPhone === normalizedPhone);
    if (normalizedPhone && !existingContact) {
      const contact: Contact = {
        id: `ctc-${Date.now()}`,
        name: String(attendee.name || booking?.title || patient?.name || "Contato Cal.com"),
        phone,
        normalizedPhone,
        email: typeof attendee.email === "string" ? attendee.email : patient?.email,
        whatsappOptIn: true,
        patientId: patient?.id,
        professionalIds: professional?.id ? [professional.id] : [],
        tags: ["cal.com"],
        notes: "Contato criado automaticamente por webhook do Cal.com.",
        source: "cal.com",
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      };
      demoState.contacts.unshift(contact);
      if (pool) {
        await upsertRow(pool, "contacts", contactRow(contact));
        await syncContactProfessionalIds(pool, contact.id, contact.professionalIds, "cal.com");
      }
    } else if (pool && existingContact && professional?.id) {
      await syncContactProfessionalIds(
        pool,
        existingContact.id,
        uniqueProfessionalIds([...(existingContact.professionalIds || []), professional.id]),
        "cal.com"
      );
    }

    if (booking?.uid && startAt) {
      const start = new Date(String(startAt));
      const end = endAt ? new Date(String(endAt)) : new Date(start.getTime() + 30 * 60000);
      const appointmentTimezone = professional.timezone || data.settings.timezone || "America/Sao_Paulo";
      const localStart = dateTimePartsInZone(start, appointmentTimezone);
      const localEnd = dateTimePartsInZone(end, appointmentTimezone);
      const existingAppointment = data.appointments.find((item) => item.calBookingUid === String(booking.uid));
      const cancellationReason = typeof booking.cancellationReason === "string" ? booking.cancellationReason : undefined;
      const isCancelled = trigger.includes("CANCELLED");
      const appointment: Appointment = {
        ...existingAppointment,
        id: `cal-${booking.uid}`,
        patientId: patient?.id || existingAppointment?.patientId || "",
        patientName: String(attendee.name || patient?.name || existingAppointment?.patientName || booking?.title || "Paciente Cal.com"),
        patientPhone: phone || existingAppointment?.patientPhone || "",
        professionalId: professional.id,
        date: localStart.date,
        time: localStart.time,
        endTime: localEnd.time,
        duration: Math.max(15, Math.round((end.getTime() - start.getTime()) / 60000)),
        type: String((booking?.eventType as { title?: unknown } | undefined)?.title || "Consulta"),
        status: mapCalStatus(trigger),
        notes: String(booking?.description || ""),
        calBookingUid: String(booking.uid),
        calStatus: typeof booking.status === "string" ? booking.status : undefined,
        source: "cal.com",
        startAt: start.toISOString(),
        endAt: end.toISOString(),
        timezone: appointmentTimezone,
        ...(isCancelled ? {
          cancellationReason: cancellationReason || existingAppointment?.cancellationReason,
          cancelledAt: existingAppointment?.cancelledAt || (typeof booking.updatedAt === "string" ? booking.updatedAt : new Date().toISOString())
        } : {})
      };

      demoState.appointments = [appointment, ...demoState.appointments.filter((item) => item.id !== appointment.id)];
      if (pool) await upsertRow(pool, "appointments_cache", appointment as unknown as Record<string, unknown>);
    }

    await audit("cal.webhook.received", { trigger });
    res.json({ ok: true });
  } catch (error) {
    res.status(500).send(error instanceof Error ? error.message : "Erro ao processar webhook Cal.com.");
  }
});

app.post("/api/webhooks/whatsapp-confirmation", async (req, res) => {
  try {
    const receivedSecret = String(req.headers["x-n8n-secret"] || "");
    if (receivedSecret !== n8nConfirmationSecret) {
      return res.status(401).send("Webhook nao autorizado.");
    }

    const {
      calBookingUid,
      patientPhone,
      confirmationStatus,
      confirmationAnswer,
      answeredAt
    } = req.body as {
      calBookingUid?: string;
      patientPhone?: string;
      confirmationStatus?: "confirmed" | "declined" | "pending";
      confirmationAnswer?: string;
      answeredAt?: string;
    };

    if (confirmationStatus !== "confirmed" && confirmationStatus !== "declined" && confirmationStatus !== "pending") {
      return res.status(400).send("Status de confirmacao invalido.");
    }

    const normalizedPhone = normalizePhone(patientPhone || "");
    const data = await bootstrap();
    const candidates = data.appointments.filter((appointment) => {
      if (calBookingUid && appointment.calBookingUid === calBookingUid) return true;
      return normalizedPhone && normalizePhone(appointment.patientPhone) === normalizedPhone && appointment.status !== "Cancelado";
    });

    const appointment = candidates
      .sort((a, b) => {
        const aDate = a.startAt || `${a.date}T${a.time || "00:00"}:00`;
        const bDate = b.startAt || `${b.date}T${b.time || "00:00"}:00`;
        return new Date(aDate).getTime() - new Date(bDate).getTime();
      })
      .find((item) => {
        const starts = new Date(item.startAt || `${item.date}T${item.time || "00:00"}:00`);
        return Number.isNaN(starts.getTime()) || starts.getTime() >= Date.now() - 2 * 60 * 60 * 1000;
      }) || candidates[0];

    if (!appointment) {
      await audit("whatsapp.confirmation.unmatched_appointment", { calBookingUid, patientPhone, confirmationStatus });
      return res.json({ ok: true, ignored: true, reason: "appointment_not_found" });
    }

    const updated: Appointment = {
      ...appointment,
      status: confirmationStatus === "confirmed" ? "Confirmado" : appointment.status,
      confirmationStatus,
      confirmationAnswer: confirmationAnswer || undefined,
      confirmationAnsweredAt: answeredAt || new Date().toISOString()
    };

    demoState.appointments = [updated, ...demoState.appointments.filter((item) => item.id !== updated.id)];
    if (pool) await upsertRow(pool, "appointments_cache", updated as unknown as Record<string, unknown>);
    await audit("whatsapp.confirmation.received", {
      appointmentId: updated.id,
      calBookingUid: updated.calBookingUid,
      confirmationStatus,
      confirmationAnswer
    });

    res.json({ ok: true, appointment: updated });
  } catch (error) {
    res.status(500).send(error instanceof Error ? error.message : "Erro ao processar confirmacao do WhatsApp.");
  }
});

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const distPath = path.resolve(__dirname, "../dist");
app.use(express.static(distPath));
app.get("*", (_req, res) => {
  res.sendFile(path.join(distPath, "index.html"));
});

initDatabase()
  .then(() => {
    app.listen(port, () => {
      console.log(`API do consultorio ouvindo em http://localhost:${port}`);
    });
  })
  .catch((error) => {
    console.error("Falha ao inicializar banco:", error);
    process.exit(1);
  });
