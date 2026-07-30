import { Patient, Appointment, SystemUser, Professional, ClinicSettings } from "../types";

// Single seam between the UI and data persistence.
//
// Everything the app reads/writes goes through this file, backed today by
// localStorage (mock/demo mode). To plug in a real backend, replace the
// bodies of these functions with API calls (fetch/axios) to your DB service —
// the rest of the app (App.tsx and all views) never touches localStorage
// directly and won't need to change.
//
// Suggested REST shape for a future API, one resource per key below:
//   GET/POST/PUT/DELETE /api/patients
//   GET/POST/PUT       /api/appointments
//   GET/POST/PUT       /api/users
//   GET/POST/PUT       /api/professionals
//   GET/PUT            /api/settings
//   POST               /api/auth/login, /api/auth/logout

const KEYS = {
  patients: "dra_marcia_patients",
  appointments: "dra_marcia_appointments",
  users: "dra_marcia_users",
  professionals: "dra_marcia_professionals",
  settings: "dra_marcia_settings",
  session: "dra_marcia_session"
} as const;

function readJSON<T>(key: string): T | null {
  const raw = localStorage.getItem(key);
  return raw ? (JSON.parse(raw) as T) : null;
}

function writeJSON<T>(key: string, value: T): void {
  localStorage.setItem(key, JSON.stringify(value));
}

export const patientStorage = {
  load: () => readJSON<Patient[]>(KEYS.patients),
  save: (patients: Patient[]) => writeJSON(KEYS.patients, patients)
};

export const appointmentStorage = {
  load: () => readJSON<Appointment[]>(KEYS.appointments),
  save: (appointments: Appointment[]) => writeJSON(KEYS.appointments, appointments)
};

export const userStorage = {
  load: () => readJSON<SystemUser[]>(KEYS.users),
  save: (users: SystemUser[]) => writeJSON(KEYS.users, users)
};

export const professionalStorage = {
  load: () => readJSON<Professional[]>(KEYS.professionals),
  save: (professionals: Professional[]) => writeJSON(KEYS.professionals, professionals)
};

export const settingsStorage = {
  load: () => readJSON<ClinicSettings>(KEYS.settings),
  save: (settings: ClinicSettings) => writeJSON(KEYS.settings, settings)
};

export const sessionStorage_ = {
  load: () => readJSON<SystemUser>(KEYS.session),
  save: (user: SystemUser) => writeJSON(KEYS.session, user),
  clear: () => localStorage.removeItem(KEYS.session)
};
