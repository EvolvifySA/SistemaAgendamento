import React, { useState, useEffect } from "react";
import { 
  SystemUser, 
  Patient, 
  Appointment, 
  ClinicSettings, 
  Professional,
  Contact,
  TimeOffEntry,
  BookingContext,
  ClinicalReminder,
  AuthSession,
  CalBookingSuccess
} from "./types";
import {
  INITIAL_SETTINGS,
  INITIAL_CONTACTS,
  INITIAL_TIME_OFF
} from "./data/mockData";
import { apiClient } from "./services/apiClient";
import { normalizePhone } from "./utils/phone";

// Views imports
import { LoginScreen } from "./components/LoginScreen";
import { DashboardView } from "./components/DashboardView";
import { ScheduleView } from "./components/ScheduleView";
import { PatientView } from "./components/PatientView";
import { UserAdminView } from "./components/UserAdminView";
import { SettingsView } from "./components/SettingsView";
import { ProfileView } from "./components/ProfileView";
import { ProfessionalsView } from "./components/ProfessionalsView";
import { MetricsView } from "./components/MetricsView";
import { ContactsView } from "./components/ContactsView";
import { TimeOffView } from "./components/TimeOffView";
import { AppointmentDetailsModal } from "./components/AppointmentDetailsModal";

// Icons
import { 
  LayoutDashboard, 
  Calendar, 
  Users, 
  UserCheck, 
  Settings, 
  User, 
  LogOut, 
  Search,
  CheckCircle,
  Menu,
  X,
  Bell,
  Briefcase,
  TrendingUp,
  Heart,
  ContactRound,
  CalendarOff
} from "lucide-react";

const linkContactsToPatients = (contacts: Contact[], patients: Patient[]): Contact[] => {
  return contacts.map(contact => {
    const normalizedPhone = contact.normalizedPhone || normalizePhone(contact.phone);
    const matchedPatient = patients.find(patient => (patient.normalizedPhone || normalizePhone(patient.phone)) === normalizedPhone);
    return {
      ...contact,
      normalizedPhone,
      patientId: contact.patientId || matchedPatient?.id,
      professionalIds: contact.professionalIds || []
    };
  });
};

export default function App() {
  // Session states
  const [currentUser, setCurrentUser] = useState<SystemUser | null>(null);
  const [activeView, setActiveView] = useState<string>("dashboard");

  // Clinical data store states
  const [patients, setPatients] = useState<Patient[]>([]);
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [users, setUsers] = useState<SystemUser[]>([]);
  const [professionals, setProfessionals] = useState<Professional[]>([]);
  const [contacts, setContacts] = useState<Contact[]>([]);
  const [clinicalReminders, setClinicalReminders] = useState<ClinicalReminder[]>([]);
  const [timeOff, setTimeOff] = useState<TimeOffEntry[]>([]);
  const [settings, setSettings] = useState<ClinicSettings>(INITIAL_SETTINGS);
  const [loadingData, setLoadingData] = useState(true);
  const [loadError, setLoadError] = useState("");

  // Global search & UI states
  const [globalSearch, setGlobalSearch] = useState("");
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [selectedAppointment, setSelectedAppointment] = useState<Appointment | null>(null);
  const [bookingContext, setBookingContext] = useState<BookingContext | undefined>();
  const [bookingPreferredProfessionalId, setBookingPreferredProfessionalId] = useState("");
  const [toastMessage, setToastMessage] = useState("");

  const hydrateData = (data: Awaited<ReturnType<typeof apiClient.bootstrap>>) => {
    const normalizedPatients = data.patients.map(p => ({
      ...p,
      normalizedPhone: p.normalizedPhone || normalizePhone(p.phone)
    }));
    setPatients(normalizedPatients);
    setAppointments(data.appointments);
    setUsers(data.users);
    setProfessionals(data.professionals);
    const contactsSource = data.mode === "demo" && data.contacts.length === 0 ? INITIAL_CONTACTS : data.contacts;
    const timeOffSource = data.mode === "demo" && data.timeOff.length === 0 ? INITIAL_TIME_OFF : data.timeOff;
    setContacts(linkContactsToPatients(contactsSource, normalizedPatients));
    setClinicalReminders(data.clinicalReminders || []);
    setTimeOff(timeOffSource);
    setSettings(data.settings);
  };

  const loadAppData = async () => {
    const data = await apiClient.bootstrap();
    hydrateData(data);
  };

  const showToast = (message: string) => {
    setToastMessage(message);
    window.setTimeout(() => setToastMessage(""), 3600);
  };

  // Load state from local storage or mock files on startup
  useEffect(() => {
    const load = async () => {
      const savedToken = window.sessionStorage.getItem("clinic_auth_token");
      if (!savedToken) {
        setLoadingData(false);
        return;
      }

      try {
        apiClient.setAuthToken(savedToken);
        const session = await apiClient.me();
        setCurrentUser(session.user);
        await loadAppData();
      } catch (error) {
        apiClient.setAuthToken("");
        setCurrentUser(null);
        setLoadError("");
      } finally {
        setLoadingData(false);
      }
    };

    load();

      // Set default initial logged-in user as Roberta (Recepção) or Lucas (Admin)
  }, []);

  // Sync data stores helper
  const savePatients = (updatedList: Patient[]) => {
    const normalized = updatedList.map(p => ({ ...p, normalizedPhone: normalizePhone(p.phone) }));
    setPatients(normalized);
    setContacts(prev => linkContactsToPatients(prev, normalized));
    void apiClient.savePatients(normalized);
  };

  const saveAppointments = (updatedList: Appointment[]) => {
    setAppointments(updatedList);
    void apiClient.saveAppointments(updatedList);
  };

  const saveProfessionals = (updatedList: Professional[]) => {
    setProfessionals(updatedList);
    void apiClient.saveProfessionals(updatedList);
  };

  const saveSettings = (updated: ClinicSettings) => {
    setSettings(updated);
    void apiClient.saveSettings(updated);
  };

  const saveContacts = (updatedList: Contact[]) => {
    const linked = linkContactsToPatients(updatedList, patients);
    setContacts(linked);
    void apiClient.saveContacts(linked);
  };

  const saveTimeOff = (updatedList: TimeOffEntry[]) => {
    setTimeOff(updatedList);
  };

  // Add entity handlers
  const handleAddPatient = (newPatData: Omit<Patient, "id" | "absencesCount" | "history">) => {
    const newPatient: Patient = {
      ...newPatData,
      id: `pat-${Date.now()}`,
      normalizedPhone: normalizePhone(newPatData.phone),
      absencesCount: 0,
      history: []
    };
    const updated = [newPatient, ...patients];
    savePatients(updated);
  };

  const handleUpdatePatient = (updatedPatient: Patient) => {
    const updated = patients.map(p => p.id === updatedPatient.id ? { ...updatedPatient, normalizedPhone: normalizePhone(updatedPatient.phone) } : p);
    savePatients(updated);
  };

  const handleDeletePatient = (patientId: string) => {
    const updatedPatients = patients.filter(p => p.id !== patientId);
    savePatients(updatedPatients);
    // Remove related appointments as well to avoid orphaned slots
    const updatedApps = appointments.filter(app => app.patientId !== patientId);
    saveAppointments(updatedApps);
  };

  const handleAddUser = async (newUserData: Omit<SystemUser, "id" | "needsPasswordChange"> & { password: string }) => {
    const created = await apiClient.createUser(newUserData);
    setUsers(current => [...current, created]);
    showToast(`Usuario ${created.name} criado com acesso ativo.`);
  };

  const handleUpdateUser = async (updatedUser: SystemUser) => {
    const saved = await apiClient.updateUser(updatedUser);
    setUsers(current => current.map(u => u.id === saved.id ? saved : u));

    if (currentUser && currentUser.id === saved.id) {
      setCurrentUser(saved);
    }
  };

  const handleUpdateUserPassword = async (userId: string, password: string) => {
    const saved = await apiClient.updateUserPassword(userId, password);
    setUsers(current => current.map(u => u.id === saved.id ? saved : u));
    showToast(`Senha de ${saved.name} atualizada.`);
  };

  const handleDeleteUser = async (userId: string) => {
    await apiClient.deleteUser(userId);
    setUsers(current => current.filter(user => user.id !== userId));
    showToast("Usuario excluido.");
  };

  const handleUpdateMyPassword = async (currentPassword: string, newPassword: string) => {
    const saved = await apiClient.updateMyPassword(currentPassword, newPassword);
    setUsers(current => current.map(u => u.id === saved.id ? saved : u));
    setCurrentUser(saved);
  };

  const handleAddProfessional = (newProfData: Omit<Professional, "id">) => {
    const newProf: Professional = {
      ...newProfData,
      id: `prof-${Date.now()}`
    };
    const updated = [...professionals, newProf];
    saveProfessionals(updated);
  };

  const handleUpdateProfessional = (updatedProf: Professional) => {
    const updated = professionals.map(p => p.id === updatedProf.id ? updatedProf : p);
    saveProfessionals(updated);
  };

  // Login/logout logic
  const handleLogin = async (session: AuthSession) => {
    apiClient.setAuthToken(session.token);
    setCurrentUser(session.user);
    await loadAppData();
    setActiveView("dashboard");
  };

  const handleLogout = () => {
    void apiClient.logout().catch(() => undefined);
    apiClient.setAuthToken("");
    setCurrentUser(null);
    setBookingContext(undefined);
    setBookingPreferredProfessionalId("");
    setSelectedAppointment(null);
  };

  // Quick navigation helpers
  const handleSelectAppointmentFromDashboard = (app: Appointment) => {
    setSelectedAppointment(app);
  };

  const handleSyncCalBooking = async (booking: CalBookingSuccess): Promise<Appointment | null> => {
    setBookingContext(undefined);
    setBookingPreferredProfessionalId("");
    if (!booking.uid) return null;

    for (let attempt = 0; attempt < 10; attempt += 1) {
      try {
        const result = await apiClient.findCalAppointment(booking.uid);
        if (result.appointment) {
          setAppointments((current) => [
            result.appointment as Appointment,
            ...current.filter((item) => item.id !== result.appointment?.id)
          ]);
          return result.appointment;
        }
      } catch {
        // A transient API failure should not discard the successful Cal.com booking.
      }

      if (attempt < 9) {
        await new Promise((resolve) => window.setTimeout(resolve, 1000));
      }
    }

    return null;
  };

  const handleCancelAppointment = async (appointment: Appointment, cancellationReason: string) => {
    if (!appointment.calBookingUid) throw new Error("Este agendamento nao possui identificador do Cal.com.");
    const result = await apiClient.cancelCalBooking(appointment.calBookingUid, cancellationReason);
    setAppointments((current) => current.map((item) => item.id === result.appointment.id ? result.appointment : item));
    setSelectedAppointment(result.appointment);
    showToast(result.alreadyCancelled ? "O agendamento ja estava cancelado." : "Agendamento cancelado no Cal.com.");
    return result.appointment;
  };

  const findContactForPatient = (patient: Patient) => {
    const normalizedPhone = patient.normalizedPhone || normalizePhone(patient.phone);
    return contacts.find(contact =>
      contact.patientId === patient.id ||
      contact.normalizedPhone === normalizedPhone
    );
  };

  const openCalBookingArea = (preferredProfessionalId = "") => {
    setBookingPreferredProfessionalId(preferredProfessionalId);
    setActiveView("agenda");
    window.setTimeout(() => {
      document.getElementById("cal-official-booking")?.scrollIntoView({ behavior: "smooth", block: "start" });
    }, 120);
  };

  const openCalBookingAreaForPatient = (patientId: string, intent: BookingContext["intent"]) => {
    const patient = patients.find(item => item.id === patientId);
    if (!patient) {
      openCalBookingArea();
      return;
    }

    const contact = findContactForPatient(patient);
    const linkedProfessionalIds = contact?.professionalIds || [];
    setBookingContext({ patientId, intent });
    showToast(`${patient.name} vinculado ao ${intent === "return" ? "agendamento de retorno" : "novo agendamento"}.`);
    openCalBookingArea(linkedProfessionalIds.length === 1 ? linkedProfessionalIds[0] : "");
  };

  const handleOpenNewAppointmentForPatient = (patientId: string) => {
    openCalBookingAreaForPatient(patientId, "new");
  };

  const handleOpenReturnForPatient = (patientId: string) => {
    openCalBookingAreaForPatient(patientId, "return");
  };

  const handleAddContact = (newContactData: Omit<Contact, "id" | "normalizedPhone" | "createdAt" | "updatedAt">) => {
    const now = new Date().toISOString();
    const newContact: Contact = {
      ...newContactData,
      id: `ctc-${Date.now()}`,
      normalizedPhone: normalizePhone(newContactData.phone),
      createdAt: now,
      updatedAt: now
    };
    saveContacts([newContact, ...contacts]);
  };

  const handleUpdateContact = (updatedContact: Contact) => {
    const updated = contacts.map(contact =>
      contact.id === updatedContact.id
        ? { ...updatedContact, normalizedPhone: normalizePhone(updatedContact.phone), updatedAt: new Date().toISOString() }
        : contact
    );
    saveContacts(updated);
  };

  const handleCreateClinicalReminder = async (
    reminder: Omit<ClinicalReminder, "id" | "status" | "createdBy" | "createdAt" | "updatedAt" | "completedAt">
  ) => {
    const created = await apiClient.createClinicalReminder(reminder);
    setClinicalReminders(current => [created, ...current]);
    showToast("Lembrete clinico criado.");
  };

  const handleUpdateClinicalReminder = async (reminder: ClinicalReminder) => {
    const saved = await apiClient.updateClinicalReminder(reminder);
    setClinicalReminders(current => current.map(item => item.id === saved.id ? saved : item));
  };

  const handleCreatePatientFromContact = (contact: Contact) => {
    const newPatient: Patient = {
      id: `pat-${Date.now()}`,
      name: contact.name,
      phone: contact.phone,
      normalizedPhone: normalizePhone(contact.phone),
      email: contact.email,
      importantNotes: "",
      quickNotes: contact.notes || "Criado a partir da aba Contatos.",
      absencesCount: 0,
      history: []
    };

    const updatedPatients = [newPatient, ...patients];
    savePatients(updatedPatients);
    saveContacts(contacts.map(item => item.id === contact.id ? { ...item, patientId: newPatient.id } : item));
    setActiveView("pacientes");
  };

  const handleSaveTimeOffEntry = async (entry: Omit<TimeOffEntry, "id" | "source"> | TimeOffEntry) => {
    try {
      if ("id" in entry) {
        const updated = await apiClient.updateTimeOff(entry.professionalId, entry);
        saveTimeOff(timeOff.map(item => item.id === updated.id ? updated : item));
      } else {
        const created = await apiClient.createTimeOff(entry.professionalId, entry);
        saveTimeOff([created, ...timeOff]);
      }
    } catch (error) {
      alert(error instanceof Error ? error.message : "Nao foi possivel salvar a folga.");
    }
  };

  const handleDeleteTimeOffEntry = async (entry: TimeOffEntry) => {
    try {
      await apiClient.deleteTimeOff(entry.professionalId, entry.id);
      saveTimeOff(timeOff.filter(item => item.id !== entry.id));
    } catch (error) {
      alert(error instanceof Error ? error.message : "Nao foi possivel remover a folga.");
    }
  };

  // Global searching matching logic
  const handleGlobalSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!globalSearch.trim()) return;
    
    // Quick routing to either Patients or Agenda if matching content
    const normalized = globalSearch.toLowerCase();
    const hasPatientMatch = patients.some(p => p.name.toLowerCase().includes(normalized));
    
    if (hasPatientMatch) {
      setActiveView("pacientes");
    } else {
      setActiveView("agenda");
    }
  };

  if (loadingData) {
    return (
      <div className="min-h-screen bg-[#F5F5F0] flex items-center justify-center text-[#5A5A40] text-sm font-bold">
        Carregando dados do consultorio...
      </div>
    );
  }

  if (loadError) {
    return (
      <div className="min-h-screen bg-[#F5F5F0] flex items-center justify-center p-6">
        <div className="bg-white border border-red-200 rounded-3xl p-8 max-w-lg text-sm text-red-700 shadow-sm">
          <p className="font-bold mb-2">Nao foi possivel carregar a API do consultorio.</p>
          <p>{loadError}</p>
          <p className="text-xs text-[#707060] mt-4">Inicie o backend com <code>npm run server</code> e mantenha o Vite em outra janela.</p>
        </div>
      </div>
    );
  }

  if (!currentUser) {
    return (
      <LoginScreen 
        onLoginSuccess={handleLogin}
      />
    );
  }

  // Sidebar navigation options filtered by user role
  const isAdm = currentUser.role === "Administrador";

  const NAVIGATION_ITEMS = [
    { id: "dashboard", label: "Dashboard", icon: LayoutDashboard },
    { id: "agenda", label: "Agenda Digital", icon: Calendar },
    { id: "pacientes", label: "Pacientes", icon: Users },
    { id: "contatos", label: "Contatos", icon: ContactRound },
    { id: "profissionais", label: "Profissionais", icon: Briefcase },
    { id: "folgas", label: "Folgas / Bloqueios", icon: CalendarOff },
    { id: "metricas", label: "Métricas da Clínica", icon: TrendingUp },
    ...(isAdm ? [
      { id: "usuarios", label: "Equipe / Usuários", icon: UserCheck },
      { id: "configuracoes", label: "Configurações", icon: Settings }
    ] : []),
    { id: "perfil", label: "Minha Conta", icon: User }
  ];

  const bookingPatient = bookingContext
    ? patients.find(patient => patient.id === bookingContext.patientId)
    : undefined;
  const bookingContact = bookingPatient ? findContactForPatient(bookingPatient) : undefined;

  return (
    <div className="min-h-screen bg-[#F5F5F0] text-[#1A1A1A] font-sans antialiased flex flex-col">
      
      {/* Topbar Banner */}
      <header className="sticky top-0 right-0 left-0 z-40 bg-white/90 backdrop-blur-md border-b border-[#E5E5E0] h-16 flex items-center justify-between px-6 md:px-10 gap-4 shrink-0 shadow-sm">
        
        {/* Mobile menu and Brand Logo */}
        <div className="flex items-center gap-3">
          <button 
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            className="p-1.5 hover:bg-[#F5F5F0] rounded-xl text-[#5A5A40] md:hidden"
          >
            {mobileMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
          </button>
          
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-full bg-[#5A5A40] flex items-center justify-center text-white font-serif italic font-bold text-sm">
              FM
            </div>
            <div>
              <span className="font-serif italic text-[#5A5A40] text-lg font-semibold leading-none block">
                Francisca &amp; Márcia
              </span>
              <span className="text-[8px] uppercase tracking-wider text-[#C17A63] font-bold block mt-0.5">
                Consultório Odontológico
              </span>
            </div>
          </div>
        </div>

        {/* Search bar inside topbar (Requirement) */}
        <form onSubmit={handleGlobalSearchSubmit} className="hidden md:flex relative max-w-md flex-1">
          <Search className="w-4 h-4 text-[#A0A090] absolute left-3.5 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder="Buscar por paciente, telefone, status da agenda..."
            value={globalSearch}
            onChange={(e) => setGlobalSearch(e.target.value)}
            className="w-full bg-[#F5F5F0] border border-[#E5E5E0] rounded-full pl-10 pr-4 py-2 text-xs outline-none focus:border-[#5A5A40] focus:ring-1 focus:ring-[#5A5A40] transition-all"
          />
        </form>

        {/* User Info with account control & profile */}
        <div className="flex items-center gap-4">
          
          <div className="text-right hidden sm:block">
            <p className="text-xs font-bold text-[#1A1A1A] leading-tight">{currentUser.name}</p>
            <p className="text-[9px] uppercase tracking-wider text-[#C17A63] font-bold mt-0.5">
              ● {currentUser.role}
            </p>
          </div>

          <div className="h-4 w-[1px] bg-[#E5E5E0] hidden sm:block"></div>

          {/* User Fast Navigation Trigger to Profile */}
          <button 
            onClick={() => setActiveView("perfil")}
            className="w-8 h-8 rounded-full bg-[#F2F2E9] border border-[#D8D8C0] flex items-center justify-center text-[#5A5A40] hover:bg-[#5A5A40] hover:text-white transition-all shadow-sm"
            title="Minha Conta"
          >
            <User className="w-4 h-4" />
          </button>

          {/* Sair (Logout) button */}
          <button 
            onClick={handleLogout}
            className="p-2 hover:bg-red-50 text-red-700 rounded-xl flex items-center gap-1.5 text-xs font-semibold transition-all border border-transparent hover:border-red-100"
            title="Desconectar do sistema"
          >
            <LogOut className="w-4 h-4" />
            <span className="hidden md:inline">Sair</span>
          </button>
        </div>

      </header>

      {bookingContext && bookingPatient && (
        <div className="z-30 bg-[#FFF8EE] border-b border-[#E8C7A8] px-6 md:px-10 py-3 flex flex-col md:flex-row md:items-center justify-between gap-3 text-xs">
          <div className="flex items-start md:items-center gap-2 text-[#6B4B2D]">
            <Bell className="w-4 h-4 text-[#C17A63] shrink-0 mt-0.5 md:mt-0" />
            <div>
              <p className="font-bold">
                Paciente vinculado ao Cal.com: {bookingPatient.name}
              </p>
              <p className="text-[11px]">
                {bookingContext.intent === "return" ? "Agendar retorno" : "Novo agendamento"} - {bookingPatient.phone}
              </p>
            </div>
          </div>
          <div className="flex gap-2">
            <button
              type="button"
              onClick={() => openCalBookingArea(bookingPreferredProfessionalId)}
              className="px-3 py-2 bg-[#5A5A40] text-white rounded-xl font-bold"
            >
              Ir para Agenda
            </button>
            <button
              type="button"
              onClick={() => {
                setBookingContext(undefined);
                setBookingPreferredProfessionalId("");
              }}
              className="px-3 py-2 bg-white border border-[#D8D8C0] text-[#5A5A40] rounded-xl font-bold"
            >
              Limpar vinculo
            </button>
          </div>
        </div>
      )}

      {/* Main Workspace layout */}
      <div className="flex flex-1 relative">
        
        {/* SIDEBAR NAVIGATION PANEL */}
        <aside className={`w-64 bg-white border-r border-[#E5E5E0] p-4 shrink-0 flex flex-col justify-between absolute md:relative inset-y-0 left-0 transform md:transform-none transition-transform duration-300 z-30 ${
          mobileMenuOpen ? "translate-x-0" : "-translate-x-full md:translate-x-0"
        }`}>
          <div className="space-y-6">
            <span className="text-[9px] font-bold text-[#A0A090] uppercase tracking-widest block mb-1 px-3">
              Módulos de Gestão
            </span>

            <nav className="space-y-1.5">
              {NAVIGATION_ITEMS.map(item => {
                const Icon = item.icon;
                const isActive = activeView === item.id;
                
                return (
                  <button
                    key={item.id}
                    onClick={() => {
                      setActiveView(item.id);
                      setMobileMenuOpen(false);
                    }}
                    className={`w-full text-left px-4 py-3 rounded-2xl transition-all text-xs font-semibold flex items-center gap-3 ${
                      isActive
                        ? "bg-[#5A5A40] text-white shadow-md"
                        : "text-[#1A1A1A] hover:bg-[#F2F2E9] hover:text-[#5A5A40]"
                    }`}
                  >
                    <Icon className="w-4 h-4" />
                    <span>{item.label}</span>
                  </button>
                );
              })}
            </nav>
          </div>

          <div />
        </aside>

        {/* Main Content Area dynamically loaded */}
        <main className="flex-1 p-6 md:p-10 max-w-7xl w-full mx-auto overflow-y-auto space-y-8">
          
          {activeView === "dashboard" && (
            <DashboardView 
              currentUser={currentUser}
              appointments={appointments}
              patients={patients}
              professionals={professionals}
              settings={settings}
              clinicalReminders={clinicalReminders}
              onNavigate={setActiveView}
              onOpenNewAppointment={() => {
                setBookingContext(undefined);
                openCalBookingArea();
              }}
              onOpenNewPatient={() => {
                setActiveView("pacientes");
                setTimeout(() => {
                  const btn = document.querySelector('[class*="Novo Paciente"]') as HTMLButtonElement;
                  if (btn) btn.click();
                }, 100);
              }}
              onSelectAppointment={handleSelectAppointmentFromDashboard}
              onCreateClinicalReminder={handleCreateClinicalReminder}
              onUpdateClinicalReminder={handleUpdateClinicalReminder}
            />
          )}

          {activeView === "agenda" && (
            <ScheduleView 
              appointments={appointments}
              patients={patients}
              professionals={professionals}
              currentUser={currentUser}
              settings={settings}
              onOpenNewPatient={() => {
                setActiveView("pacientes");
                setTimeout(() => {
                  const btn = document.querySelector('[class*="Novo Paciente"]') as HTMLButtonElement;
                  if (btn) btn.click();
                }, 100);
              }}
              bookingContext={bookingContext}
              bookingPatient={bookingPatient}
              bookingContact={bookingContact}
              preferredProfessionalId={bookingPreferredProfessionalId}
              onClearBookingContext={() => {
                setBookingContext(undefined);
                setBookingPreferredProfessionalId("");
              }}
              onSyncCalBooking={handleSyncCalBooking}
              onViewAppointment={setSelectedAppointment}
              onBackToDashboard={() => {
                setBookingContext(undefined);
                setBookingPreferredProfessionalId("");
                setActiveView("dashboard");
              }}
              onStartNewBooking={(professionalId) => {
                setBookingContext(undefined);
                openCalBookingArea(professionalId);
              }}
            />
          )}

          {activeView === "pacientes" && (
            <PatientView 
              patients={patients}
              appointments={appointments}
              contacts={contacts}
              onAddPatient={handleAddPatient}
              onEditPatient={handleUpdatePatient}
              onOpenNewAppointmentForPatient={handleOpenNewAppointmentForPatient}
              onOpenReturnForPatient={handleOpenReturnForPatient}
              onDeletePatient={handleDeletePatient}
              onCreateClinicalReminder={handleCreateClinicalReminder}
            />
          )}

          {activeView === "contatos" && (
            <ContactsView
              contacts={contacts}
              patients={patients}
              professionals={professionals}
              onAddContact={handleAddContact}
              onUpdateContact={handleUpdateContact}
              onCreatePatientFromContact={handleCreatePatientFromContact}
              onNavigate={setActiveView}
            />
          )}

          {activeView === "profissionais" && (
            <ProfessionalsView 
              currentUser={currentUser}
              professionals={professionals}
              onAddProfessional={handleAddProfessional}
              onUpdateProfessional={handleUpdateProfessional}
            />
          )}

          {activeView === "folgas" && (
            <TimeOffView
              currentUser={currentUser}
              professionals={professionals}
              timeOff={timeOff}
              onSaveTimeOff={handleSaveTimeOffEntry}
              onDeleteTimeOff={handleDeleteTimeOffEntry}
            />
          )}

          {activeView === "metricas" && (
            <MetricsView 
              currentUser={currentUser}
              appointments={appointments}
              patients={patients}
              professionals={professionals}
              settings={settings}
            />
          )}

          {activeView === "usuarios" && (
            <UserAdminView 
              currentUser={currentUser}
              users={users}
              onAddUser={handleAddUser}
              onUpdateUser={handleUpdateUser}
              onUpdateUserPassword={handleUpdateUserPassword}
              onDeleteUser={handleDeleteUser}
            />
          )}

          {activeView === "configuracoes" && (
            <SettingsView 
              currentUser={currentUser}
              settings={settings}
              onUpdateSettings={saveSettings}
            />
          )}

          {activeView === "perfil" && (
            <ProfileView 
              currentUser={currentUser}
              onUpdateMyPassword={handleUpdateMyPassword}
            />
          )}

        </main>

      </div>

      <AppointmentDetailsModal
        appointment={selectedAppointment}
        professionals={professionals}
        currentUser={currentUser}
        onClose={() => setSelectedAppointment(null)}
        onCancel={handleCancelAppointment}
      />

      {toastMessage && (
        <div className="fixed right-5 bottom-5 z-50 bg-[#1A1A1A] text-white px-5 py-3 rounded-2xl shadow-xl text-xs font-bold border border-white/10">
          {toastMessage}
        </div>
      )}

    </div>
  );
}
