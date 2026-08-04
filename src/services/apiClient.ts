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
} from "../types";

async function request<T>(path: string, options: RequestInit = {}): Promise<T> {
  const response = await fetch(path, {
    ...options,
    headers: {
      "Content-Type": "application/json",
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
  bootstrap: () => request<AppBootstrapData>("/api/bootstrap"),

  savePatients: (patients: Patient[]) =>
    request<Patient[]>("/api/patients/bulk", { method: "PUT", body: JSON.stringify({ patients }) }),

  saveContacts: (contacts: Contact[]) =>
    request<Contact[]>("/api/contacts/bulk", { method: "PUT", body: JSON.stringify({ contacts }) }),

  saveAppointments: (appointments: Appointment[]) =>
    request<Appointment[]>("/api/appointments/bulk", { method: "PUT", body: JSON.stringify({ appointments }) }),

  saveUsers: (users: SystemUser[]) =>
    request<SystemUser[]>("/api/users/bulk", { method: "PUT", body: JSON.stringify({ users }) }),

  saveProfessionals: (professionals: Professional[]) =>
    request<Professional[]>("/api/professionals/bulk", { method: "PUT", body: JSON.stringify({ professionals }) }),

  syncProfessionalEventType: (professionalId: string, calEventTypeId?: number) =>
    request<Professional>(`/api/professionals/${encodeURIComponent(professionalId)}/cal/sync-event-type`, {
      method: "POST",
      body: JSON.stringify({ calEventTypeId })
    }),

  saveSettings: (settings: ClinicSettings) =>
    request<ClinicSettings>("/api/settings", { method: "PUT", body: JSON.stringify(settings) }),

  updateAppointmentStatus: (id: string, status: AppointmentStatus, notes?: string) =>
    request<Appointment>(`/api/appointments/${encodeURIComponent(id)}/status`, {
      method: "PATCH",
      body: JSON.stringify({ status, notes })
    }),

  cancelCalBooking: (bookingUid: string, cancellationReason: string) =>
    request<{ ok: boolean }>(`/api/cal/bookings/${encodeURIComponent(bookingUid)}/cancel`, {
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
