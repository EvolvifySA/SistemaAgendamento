import { Patient, Appointment, SystemUser, ClinicSettings, Professional, Contact, TimeOffEntry } from "../types";
import { normalizePhone } from "../utils/phone";

export const INITIAL_PATIENTS: Patient[] = [
  {
    id: "pat-1",
    name: "Maria das Dores Silva",
    phone: "(11) 98765-4321",
    birthdate: "1964-08-12",
    cpf: "123.456.789-00",
    email: "maria.silva@email.com",
    address: {
      cep: "01310-100",
      street: "Avenida Paulista",
      number: "1000",
      neighborhood: "Bela Vista",
      city: "São Paulo",
      state: "SP"
    },
    importantNotes: "Diabética e Hipertensa. Alérgica a Dipirona.",
    quickNotes: "Prefere atendimento no primeiro horário da manhã.",
    absencesCount: 0,
    lastAppointmentDate: "2026-06-15",
    history: [
      { date: "2026-06-15", type: "Retorno", notes: "Ajuste na dose de medicação de controle contínuo.", status: "Atendido" },
      { date: "2026-05-10", type: "Primeira Consulta", notes: "Queixa de dores lombares. Solicitados exames de imagem.", status: "Atendido" }
    ]
  },
  {
    id: "pat-2",
    name: "João Roberto Ferreira",
    phone: "(11) 91234-5678",
    birthdate: "1988-03-24",
    importantNotes: "Nenhuma observação clínica relevante.",
    quickNotes: "Sempre pede confirmação via WhatsApp com 2 dias de antecedência.",
    absencesCount: 1,
    lastAppointmentDate: "2026-06-20",
    history: [
      { date: "2026-06-20", type: "Primeira Consulta", notes: "Consulta inicial preventiva de rotina.", status: "Atendido" },
      { date: "2026-06-05", type: "Primeira Consulta", notes: "Sem comparecimento.", status: "Faltou" }
    ]
  },
  {
    id: "pat-3",
    name: "Clara Nunes Mendes",
    phone: "(11) 97777-8888",
    birthdate: "1995-11-02",
    importantNotes: "Gestante de 14 semanas. Acompanhamento pré-natal.",
    quickNotes: "Paciente prefere contato exclusivo por mensagem, evita atender ligações.",
    absencesCount: 0,
    lastAppointmentDate: "2026-06-28",
    history: [
      { date: "2026-06-28", type: "Exame", notes: "Acompanhamento obstétrico inicial e revisão de exames de sangue.", status: "Atendido" }
    ]
  },
  {
    id: "pat-4",
    name: "Antônio Carlos de Souza",
    phone: "(11) 94444-5555",
    birthdate: "1952-05-18",
    importantNotes: "Cardiopata com marca-passo ativo.",
    quickNotes: "Vem acompanhado do filho. Precisa de auxílio de acessibilidade para locomoção.",
    absencesCount: 3,
    lastAppointmentDate: "2026-05-12",
    history: [
      { date: "2026-05-12", type: "Retorno", notes: "Revisão periódica cardiológica.", status: "Atendido" },
      { date: "2026-04-10", type: "Retorno", notes: "Consulta agendada mas o paciente esqueceu.", status: "Faltou" },
      { date: "2026-03-15", type: "Retorno", notes: "Falta sem aviso prévio.", status: "Faltou" },
      { date: "2026-02-01", type: "Retorno", notes: "Falta devido a imprevistos de transporte.", status: "Faltou" }
    ]
  },
  {
    id: "pat-5",
    name: "Gabriela Vasconcelos",
    phone: "(11) 96543-2109",
    birthdate: "2001-09-30",
    importantNotes: "Nenhuma observação clínica relevante.",
    quickNotes: "Prefere horários pós-18h.",
    absencesCount: 0,
    lastAppointmentDate: "2026-06-30",
    history: [
      { date: "2026-06-30", type: "Acompanhamento", notes: "Sessão de acompanhamento rotineiro.", status: "Atendido" }
    ]
  }
];

export const INITIAL_PROFESSIONALS: Professional[] = [
  {
    id: "prof-1",
    name: "Dra. Márcia",
    specialty: "Dentista",
    phone: "+55 83 9364-7272",
    email: "marciaodonto@yahoo.com.br",
    color: "#5A5A40",
    active: true,
    workingHoursStart: "08:00",
    workingHoursEnd: "18:00",
    workingDays: [1, 2, 3, 4, 5],
    defaultDuration: 30,
    notes: "Sócia-fundadora do consultório."
  },
  {
    id: "prof-2",
    name: "Dra. Francisca",
    specialty: "Dentista",
    phone: "+55 83 9987-0035",
    email: "fran_ramalho@yahoo.com.br",
    color: "#C17A63",
    active: true,
    workingHoursStart: "09:00",
    workingHoursEnd: "17:00",
    workingDays: [1, 2, 3, 4, 5],
    defaultDuration: 45,
    notes: "Sócia-fundadora do consultório."
  }
];

export const INITIAL_USERS: SystemUser[] = [
  { id: "usr-1", name: "Dra. Márcia", email: "marciaodonto@yahoo.com.br", role: "Doutora", active: true, needsPasswordChange: true },
  { id: "usr-2", name: "Lucas Vinícius (Admin)", email: "admin@franciscaemarcia.com.br", role: "Administrador", active: true },
  { id: "usr-3", name: "Roberta Fernandes", email: "recepcao@franciscaemarcia.com.br", role: "Recepção", active: true },
  { id: "usr-4", name: "Dra. Francisca", email: "fran_ramalho@yahoo.com.br", role: "Doutora", active: true, needsPasswordChange: true }
];

export const INITIAL_SETTINGS: ClinicSettings = {
  workingHoursStart: "08:00",
  workingHoursEnd: "18:00",
  workingDays: [1, 2, 3, 4, 5], // segunda a sexta
  defaultDuration: 30,
  gapDuration: 15,
  appointmentTypes: ["Primeira Consulta", "Retorno", "Exame", "Acompanhamento"],
  clinicName: "Francisca e Márcia Consultório Odontológico LTDA",
  clinicPhone: "+55 83 9364-7272",
  clinicEmail: "marciaodonto@yahoo.com.br",
  clinicAddress: "Alameda das Flores, 450 - Sala 12 - Jardim Paulistano, São Paulo - SP",
  timezone: "America/Sao_Paulo",
  calAccountType: "team"
};

export const INITIAL_CONTACTS: Contact[] = [
  {
    id: "ctc-1",
    name: "Maria das Dores Silva",
    phone: "(11) 98765-4321",
    normalizedPhone: normalizePhone("(11) 98765-4321"),
    email: "maria.silva@email.com",
    whatsappOptIn: true,
    patientId: "pat-1",
    tags: ["paciente", "whatsapp"],
    notes: "Contato vinculado automaticamente pela ficha do paciente.",
    source: "manual",
    createdAt: "2026-07-01T08:00:00.000Z",
    updatedAt: "2026-07-01T08:00:00.000Z"
  },
  {
    id: "ctc-2",
    name: "Lead WhatsApp",
    phone: "8398842527",
    normalizedPhone: normalizePhone("8398842527"),
    whatsappOptIn: true,
    tags: ["lead"],
    notes: "Contato ainda sem ficha clinica.",
    source: "whatsapp",
    createdAt: "2026-07-01T09:00:00.000Z",
    updatedAt: "2026-07-01T09:00:00.000Z"
  }
];

export const INITIAL_TIME_OFF: TimeOffEntry[] = [];

export const INITIAL_APPOINTMENTS: Appointment[] = [
  {
    id: "app-1",
    patientId: "pat-1",
    patientName: "Maria das Dores Silva",
    patientPhone: "(11) 98765-4321",
    professionalId: "prof-1",
    date: "2026-07-01",
    time: "08:00",
    endTime: "08:30",
    duration: 30,
    type: "Retorno",
    status: "Atendido",
    notes: "Paciente com melhora expressiva nos sintomas gerais."
  },
  {
    id: "app-2",
    patientId: "pat-2",
    patientName: "João Roberto Ferreira",
    patientPhone: "(11) 91234-5678",
    professionalId: "prof-1",
    date: "2026-07-01",
    time: "09:00",
    endTime: "10:00",
    duration: 60,
    type: "Primeira Consulta",
    status: "Confirmado",
    notes: "Aguardando na recepção."
  },
  {
    id: "app-3",
    patientId: "pat-3",
    patientName: "Clara Nunes Mendes",
    patientPhone: "(11) 97777-8888",
    professionalId: "prof-2",
    date: "2026-07-01",
    time: "09:30",
    endTime: "10:15",
    duration: 45,
    type: "Primeira Consulta",
    status: "Atendido",
    notes: "Primeiro acompanhamento pediátrico do recém-nascido."
  },
  {
    id: "app-4",
    patientId: "pat-4",
    patientName: "Antônio Carlos de Souza",
    patientPhone: "(11) 94444-5555",
    professionalId: "prof-1",
    date: "2026-07-01",
    time: "11:15",
    endTime: "12:00",
    duration: 45,
    type: "Retorno",
    status: "Faltou",
    notes: "Paciente não compareceu e não justificou a ausência."
  },
  {
    id: "app-5",
    patientId: "pat-5",
    patientName: "Gabriela Vasconcelos",
    patientPhone: "(11) 96543-2109",
    professionalId: "prof-2",
    date: "2026-07-01",
    time: "10:30",
    endTime: "11:15",
    duration: 45,
    type: "Acompanhamento",
    status: "Confirmado",
    notes: "Acompanhamento de rotina do bebê de 6 meses."
  },
  {
    id: "app-6",
    patientId: "pat-1",
    patientName: "Maria das Dores Silva",
    patientPhone: "(11) 98765-4321",
    professionalId: "prof-2",
    date: "2026-07-01",
    time: "14:00",
    endTime: "14:45",
    duration: 45,
    type: "Exame",
    status: "Agendado",
    notes: "Acompanhamento vacinal."
  },
  {
    id: "app-7",
    patientId: "pat-2",
    patientName: "João Roberto Ferreira",
    patientPhone: "(11) 91234-5678",
    professionalId: "prof-1",
    date: "2026-07-01",
    time: "15:00",
    endTime: "15:30",
    duration: 30,
    type: "Retorno",
    status: "Cancelado",
    notes: "Desmarcado pelo paciente devido a conflito de trabalho."
  },
  // Amanhã
  {
    id: "app-6",
    patientId: "pat-1",
    patientName: "Maria das Dores Silva",
    patientPhone: "(11) 98765-4321",
    professionalId: "prof-1",
    date: "2026-07-02",
    time: "09:00",
    endTime: "09:30",
    duration: 30,
    type: "Exame",
    status: "Confirmado",
    notes: "Verificação rápida de pressão arterial."
  },
  {
    id: "app-7",
    patientId: "pat-3",
    patientName: "Clara Nunes Mendes",
    patientPhone: "(11) 97777-8888",
    professionalId: "prof-2",
    date: "2026-07-02",
    time: "15:00",
    endTime: "15:30",
    duration: 30,
    type: "Retorno",
    status: "Agendado",
    notes: "Retorno pré-natal."
  }
];
