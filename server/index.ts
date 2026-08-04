import "dotenv/config";
import express from "express";
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
  ClinicSettings,
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
const databaseUrl = process.env.DATABASE_URL;
const isPostgresConfigured = Boolean(databaseUrl);

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
  timeOff: INITIAL_TIME_OFF,
  settings: INITIAL_SETTINGS
};

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

async function audit(action: string, payload: Record<string, unknown>) {
  if (!pool) return;
  await pool.query("insert into audit_log (action, payload) values ($1, $2)", [action, payload]);
}

async function bootstrap(): Promise<AppBootstrapData> {
  const [patients, appointments, users, professionals, contacts, timeOff, settingsRows] = await Promise.all([
    readTable<Patient>("patients", demoState.patients),
    readTable<Appointment>("appointments_cache", demoState.appointments),
    readTable<SystemUser>("users", demoState.users),
    readTable<Professional>("professionals", demoState.professionals),
    readTable<Contact>("contacts", demoState.contacts),
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
      patientId: contact.patientId || matchedPatient?.id
    };
  });

  return {
    patients: normalizedPatients,
    appointments,
    users,
    professionals: professionals.map(withProfessionalDefaults),
    contacts: linkedContacts,
    timeOff,
    settings: settingsRows[0] || demoState.settings,
    mode: isPostgresConfigured ? "production" : "demo"
  };
}

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

app.put("/api/patients/bulk", async (req, res) => {
  const rows = withPatientPhones(req.body.patients || []);
  demoState.patients = rows;
  res.json(await replaceTable("patients", rows));
});

app.put("/api/contacts/bulk", async (req, res) => {
  const rows = (req.body.contacts || []).map((contact: Contact) => ({
    ...contact,
    normalizedPhone: normalizePhone(contact.phone),
    updatedAt: new Date().toISOString()
  }));
  demoState.contacts = rows;
  res.json(await replaceTable("contacts", rows));
});

app.put("/api/appointments/bulk", async (req, res) => {
  const rows = req.body.appointments || [];
  demoState.appointments = rows;
  res.json(await replaceTable("appointments_cache", rows));
});

app.put("/api/users/bulk", async (req, res) => {
  const rows = req.body.users || [];
  demoState.users = rows;
  res.json(await replaceTable("users", rows));
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

app.post("/api/cal/bookings/:uid/cancel", async (req, res) => {
  try {
    const { uid } = req.params;
    const result = await calRequest(`/v2/bookings/${encodeURIComponent(uid)}/cancel`, {
      method: "POST",
      body: JSON.stringify({ cancellationReason: req.body.cancellationReason || "Cancelado pelo painel" })
    });
    await audit("cal.booking.cancelled", { uid });
    res.json({ ok: true, result });
  } catch (error) {
    res.status(500).send(error instanceof Error ? error.message : "Erro ao cancelar no Cal.com.");
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

    let calOooId: number | undefined;
    const accountType = professional.calAccountType || "individual";
    if (accountType === "individual") {
      const token = getProfessionalCalToken(professional);
      if (!token) {
        return res.status(409).send(`Cal.com nao conectado: configure ${professional.calApiKeyEnvVar || "CAL_API_KEY_DENTISTA"} no .env do backend.`);
      }
      const response = await calRequest("/v2/me/ooo", { method: "POST", body: JSON.stringify(req.body) }, token);
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
          await calRequest(`/v2/me/ooo/${entry.calOooId}`, { method: "DELETE" }, token);
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

app.post("/api/webhooks/cal", async (req, res) => {
  try {
    const trigger = req.body?.triggerEvent || req.body?.type || "";
    const booking = req.body?.payload || req.body?.data || req.body;
    const attendee = booking?.attendees?.[0] || {};
    const phone = attendee.phoneNumber || attendee.phone || booking?.responses?.phone?.value || "";
    const normalizedPhone = normalizePhone(phone);
    const data = await bootstrap();
    const patient = data.patients.find((item) => item.normalizedPhone === normalizedPhone);
    const professional = data.professionals.find((item) => item.calEventTypeId === booking?.eventTypeId || item.calUsername === booking?.eventType?.slug);
    const startAt = booking?.startTime || booking?.start || booking?.startAt;
    const endAt = booking?.endTime || booking?.end || booking?.endAt;

    if (normalizedPhone && !data.contacts.some((contact) => contact.normalizedPhone === normalizedPhone)) {
      const contact: Contact = {
        id: `ctc-${Date.now()}`,
        name: attendee.name || booking?.title || "Contato Cal.com",
        phone,
        normalizedPhone,
        email: attendee.email,
        whatsappOptIn: true,
        patientId: patient?.id,
        tags: ["cal.com"],
        notes: "Contato criado automaticamente por webhook do Cal.com.",
        source: "cal.com",
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      };
      demoState.contacts.unshift(contact);
      if (pool) await upsertRow(pool, "contacts", contact as unknown as Record<string, unknown>);
    }

    if (booking?.uid && startAt) {
      const start = new Date(startAt);
      const end = endAt ? new Date(endAt) : new Date(start.getTime() + 30 * 60000);
      const appointment: Appointment = {
        id: `cal-${booking.uid}`,
        patientId: patient?.id || "",
        patientName: attendee.name || booking?.title || "Paciente Cal.com",
        patientPhone: phone,
        professionalId: professional?.id || "prof-1",
        date: start.toISOString().slice(0, 10),
        time: start.toISOString().slice(11, 16),
        endTime: end.toISOString().slice(11, 16),
        duration: Math.max(15, Math.round((end.getTime() - start.getTime()) / 60000)),
        type: booking?.eventType?.title || "Consulta",
        status: mapCalStatus(trigger),
        notes: booking?.description || "",
        calBookingUid: booking.uid,
        calStatus: booking.status,
        source: "cal.com",
        startAt: start.toISOString(),
        endAt: end.toISOString(),
        timezone: booking?.timeZone || "America/Sao_Paulo"
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
