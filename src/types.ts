export type UserRole = "Administrador" | "Doutora" | "Recepção";

export interface SystemUser {
  id: string;
  name: string;
  email: string;
  role: UserRole;
  active: boolean;
  needsPasswordChange?: boolean;
}

export type AppointmentStatus = "Livre" | "Agendado" | "Confirmado" | "Atendido" | "Cancelado" | "Faltou";

export interface Professional {
  id: string;
  name: string;
  specialty: string;
  phone?: string;
  email?: string;
  color: string; // Tailwind hex color or color class (e.g., "#5A5A40" or "emerald")
  active: boolean;
  workingHoursStart: string; // "08:00"
  workingHoursEnd: string; // "18:00"
  workingDays: number[]; // [1, 2, 3, 4, 5] (1 = Monday, 5 = Friday, etc.)
  defaultDuration: number; // minutes
  notes?: string;
  calUserId?: number;
  calUsername?: string;
  calEventTypeId?: number;
  calTeamId?: number;
  calOrgId?: number;
  calAccountType?: "individual" | "team" | "organization";
  calApiKeyEnvVar?: string;
  timezone?: string;
  calConnected?: boolean;
}

export interface Appointment {
  id: string;
  patientId: string;
  patientName: string;
  patientPhone: string;
  professionalId: string; // Required professional link
  date: string; // YYYY-MM-DD
  time: string; // HH:MM (Início)
  endTime: string; // HH:MM (Fim)
  duration: number; // minutes
  type: string; // "Primeira Consulta" | "Retorno" | "Exame" | "Acompanhamento"
  status: AppointmentStatus;
  notes: string;
  calBookingUid?: string;
  calStatus?: string;
  source?: "cal.com" | "internal" | "demo";
  startAt?: string;
  endAt?: string;
  timezone?: string;
}

export interface PatientAddress {
  cep: string;
  street: string; // logradouro
  number: string;
  complement?: string;
  neighborhood: string; // bairro
  city: string;
  state: string; // UF
}

export interface Patient {
  id: string;
  name: string;
  phone: string;
  normalizedPhone?: string;
  birthdate?: string; // YYYY-MM-DD
  cpf?: string;
  email?: string;
  address?: PatientAddress;
  importantNotes: string; // alergias ou avisos vitais
  quickNotes: string; // "Prefere manhã", etc.
  absencesCount: number;
  lastAppointmentDate?: string;
  history: {
    date: string;
    type: string;
    notes: string;
    status: AppointmentStatus;
  }[];
}

export interface Contact {
  id: string;
  name: string;
  phone: string;
  normalizedPhone: string;
  email?: string;
  whatsappOptIn: boolean;
  patientId?: string;
  tags: string[];
  notes: string;
  source: "manual" | "cal.com" | "whatsapp" | "import";
  createdAt: string;
  updatedAt: string;
}

export interface TimeOffEntry {
  id: string;
  professionalId: string;
  calOooId?: number;
  start: string;
  end: string;
  reason: "unspecified" | "vacation" | "travel" | "sick" | "public_holiday";
  notes: string;
  source: "cal.com" | "internal" | "demo";
}

export interface ClinicSettings {
  workingHoursStart: string;
  workingHoursEnd: string;
  workingDays: number[]; // 1-5, etc. (0 = Sunday)
  defaultDuration: number; // in minutes
  gapDuration: number; // in minutes
  appointmentTypes: string[];
  clinicName: string;
  clinicPhone: string;
  clinicEmail: string;
  clinicAddress: string;
  timezone: string;
  calAccountType: "individual" | "team" | "organization";
  calTeamId?: number;
  calOrgId?: number;
  n8nWebhookUrl?: string;
}

export interface AppBootstrapData {
  patients: Patient[];
  appointments: Appointment[];
  users: SystemUser[];
  professionals: Professional[];
  contacts: Contact[];
  timeOff: TimeOffEntry[];
  settings: ClinicSettings;
  mode: "production" | "demo";
}
