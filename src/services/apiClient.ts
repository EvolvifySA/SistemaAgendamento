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
} from "../types";

let authToken = window.sessionStorage.getItem("clinic_auth_token") || "";

function setAuthToken(token: string) {
  authToken = token;
  if (token) {
    window.sessionStorage.setItem("clinic_auth_token", token);
  } else {
    window.sessionStorage.removeItem("clinic_auth_token");
  }
}

async function request<T>(path: string, options: RequestInit = {}): Promise<T> {
  const response = await fetch(path, {
    ...options,
    headers: {
      "Content-Type": "application/json",
      ...(authToken ? { Authorization: `Bearer ${authToken}` } : {}),
      ...(options.headers || {})
    }
  });

  if (!response.ok) {
    const message = await response.text();
    throw new Error(message || `Falha na API (${response.status})`);
  }

  return response.json() as Promise<T>;
}

export const apiClient = {
  setAuthToken,

  login: (email: string, password: string) =>
    request<AuthSession>("/api/auth/login", { method: "POST", body: JSON.stringify({ email, password }) }),

  me: () => request<{ user: SystemUser }>("/api/auth/me"),

  logout: () => request<{ ok: boolean }>("/api/auth/logout", { method: "POST" }),

  bootstrap: () => request<AppBootstrapData>("/api/bootstrap"),

  savePatients: (patients: Patient[]) =>
    request<Patient[]>("/api/patients/bulk", { method: "PUT", body: JSON.stringify({ patients }) }),

  saveContacts: (contacts: Contact[]) =>
    request<Contact[]>("/api/contacts/bulk", { method: "PUT", body: JSON.stringify({ contacts }) }),

  saveAppointments: (appointments: Appointment[]) =>
    request<Appointment[]>("/api/appointments/bulk", { method: "PUT", body: JSON.stringify({ appointments }) }),

  saveUsers: (users: SystemUser[]) =>
    request<SystemUser[]>("/api/users/bulk", { method: "PUT", body: JSON.stringify({ users }) }),

  createUser: (user: Omit<SystemUser, "id" | "needsPasswordChange"> & { password: string }) =>
    request<SystemUser>("/api/users", { method: "POST", body: JSON.stringify(user) }),

  updateUser: (user: SystemUser) =>
    request<SystemUser>(`/api/users/${encodeURIComponent(user.id)}`, { method: "PATCH", body: JSON.stringify(user) }),

  updateUserPassword: (userId: string, password: string) =>
    request<SystemUser>(`/api/users/${encodeURIComponent(userId)}/password`, { method: "PATCH", body: JSON.stringify({ password }) }),

  deleteUser: (userId: string) =>
    request<{ ok: boolean }>(`/api/users/${encodeURIComponent(userId)}`, { method: "DELETE" }),

  updateMyPassword: (currentPassword: string, newPassword: string) =>
    request<SystemUser>("/api/me/password", { method: "PATCH", body: JSON.stringify({ currentPassword, newPassword }) }),

  saveProfessionals: (professionals: Professional[]) =>
    request<Professional[]>("/api/professionals/bulk", { method: "PUT", body: JSON.stringify({ professionals }) }),

  syncProfessionalEventType: (professionalId: string, calEventTypeId?: number) =>
    request<Professional>(`/api/professionals/${encodeURIComponent(professionalId)}/cal/sync-event-type`, {
      method: "POST",
      body: JSON.stringify({ calEventTypeId })
    }),

  saveSettings: (settings: ClinicSettings) =>
    request<ClinicSettings>("/api/settings", { method: "PUT", body: JSON.stringify(settings) }),

  createClinicalReminder: (reminder: Omit<ClinicalReminder, "id" | "status" | "createdBy" | "createdAt" | "updatedAt" | "completedAt">) =>
    request<ClinicalReminder>("/api/clinical-reminders", { method: "POST", body: JSON.stringify(reminder) }),

  updateClinicalReminder: (reminder: ClinicalReminder) =>
    request<ClinicalReminder>(`/api/clinical-reminders/${encodeURIComponent(reminder.id)}`, {
      method: "PATCH",
      body: JSON.stringify(reminder)
    }),

  updateAppointmentStatus: (id: string, status: AppointmentStatus, notes?: string) =>
    request<Appointment>(`/api/appointments/${encodeURIComponent(id)}/status`, {
      method: "PATCH",
      body: JSON.stringify({ status, notes })
    }),

  findCalAppointment: (bookingUid: string) =>
    request<{ appointment: Appointment | null }>(`/api/appointments/cal/${encodeURIComponent(bookingUid)}`),

  cancelCalBooking: (bookingUid: string, cancellationReason: string) =>
    request<{ ok: boolean; appointment: Appointment; calBooking: unknown; alreadyCancelled?: boolean }>(`/api/cal/bookings/${encodeURIComponent(bookingUid)}/cancel`, {
      method: "POST",
      body: JSON.stringify({ cancellationReason })
    }),

  rescheduleCalBooking: (bookingUid: string, start: string) =>
    request<{ ok: boolean }>(`/api/cal/bookings/${encodeURIComponent(bookingUid)}/reschedule`, {
      method: "POST",
      body: JSON.stringify({ start })
    }),

  createTimeOff: (professionalId: string, entry: Omit<TimeOffEntry, "id" | "professionalId" | "source">) =>
    request<TimeOffEntry>(`/api/professionals/${encodeURIComponent(professionalId)}/time-off`, {
      method: "POST",
      body: JSON.stringify(entry)
    }),

  updateTimeOff: (professionalId: string, entry: TimeOffEntry) =>
    request<TimeOffEntry>(`/api/professionals/${encodeURIComponent(professionalId)}/time-off/${encodeURIComponent(entry.id)}`, {
      method: "PATCH",
      body: JSON.stringify(entry)
    }),

  deleteTimeOff: (professionalId: string, entryId: string) =>
    request<{ ok: boolean }>(`/api/professionals/${encodeURIComponent(professionalId)}/time-off/${encodeURIComponent(entryId)}`, {
      method: "DELETE"
    })
};
