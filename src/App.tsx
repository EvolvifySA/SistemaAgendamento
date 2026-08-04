import React, { useState, useEffect } from "react";
import { 
  SystemUser, 
  Patient, 
  Appointment, 
  ClinicSettings, 
  AppointmentStatus,
  Professional,
  Contact,
  TimeOffEntry
} from "./types";
import {
  INITIAL_USERS,
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
      patientId: contact.patientId || matchedPatient?.id
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
  const [timeOff, setTimeOff] = useState<TimeOffEntry[]>([]);
  const [settings, setSettings] = useState<ClinicSettings>(INITIAL_SETTINGS);
  const [dataMode, setDataMode] = useState<"production" | "demo">("demo");
  const [loadingData, setLoadingData] = useState(true);
  const [loadError, setLoadError] = useState("");

  // Global search & UI states
  const [globalSearch, setGlobalSearch] = useState("");
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [dashboardSelectedApp, setDashboardSelectedApp] = useState<Appointment | null>(null);

  // Load state from local storage or mock files on startup
  useEffect(() => {
    const load = async () => {
      try {
        const data = await apiClient.bootstrap();
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
        setTimeOff(timeOffSource);
        setSettings(data.settings);
        setDataMode(data.mode);

        const savedSession = window.sessionStorage.getItem("clinic_session");
        if (savedSession) {
          setCurrentUser(JSON.parse(savedSession));
        } else if (data.mode === "demo") {
          const defaultAdmin = data.users.find(u => u.role === "Administrador") || data.users[0] || INITIAL_USERS[0];
          setCurrentUser(defaultAdmin);
        }
      } catch (error) {
        setLoadError(error instanceof Error ? error.message : "Falha ao carregar dados da API.");
      } finally {
        setLoadingData(false);
      }
    };

    load();

    // Auto log in as Admin by default for first experience to make it fast to explore,
    // but allow logging out to test other accounts!
    const savedSession = null;
    if (false && savedSession) {
      setCurrentUser(savedSession);
    } else if (false) {
      // Set default initial logged-in user as Roberta (Recepção) or Lucas (Admin)
      // Let's boot with Lucas (Admin) so they see all menus instantly
      const defaultAdmin = INITIAL_USERS.find(u => u.role === "Administrador") || INITIAL_USERS[0];
      setCurrentUser(defaultAdmin);
    }
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

  const saveUsers = (updatedList: SystemUser[]) => {
    setUsers(updatedList);
    void apiClient.saveUsers(updatedList);
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
    setSelectedPatientInView(newPatient);
  };

  const handleAddAppointment = (newAppData: Omit<Appointment, "id">) => {
    const newApp: Appointment = {
      ...newAppData,
      id: `app-${Date.now()}`
    };
    const updated = [newApp, ...appointments];
    saveAppointments(updated);
    
    // Append to patient history
    const pat = patients.find(p => p.id === newApp.patientId);
    if (pat) {
      const updatedHistory = [
        { date: newApp.date, type: newApp.type, notes: newApp.notes, status: newApp.status },
        ...pat.history
      ];
      const updatedPatientList = patients.map(p => 
        p.id === pat.id 
          ? { ...p, history: updatedHistory, lastAppointmentDate: newApp.date } 
          : p
      );
      savePatients(updatedPatientList);
    }
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

  const handleAddUser = (newUserData: Omit<SystemUser, "id">) => {
    const newUser: SystemUser = {
      ...newUserData,
      id: `usr-${Date.now()}`
    };
    const updated = [...users, newUser];
    saveUsers(updated);
  };

  const handleUpdateUser = (updatedUser: SystemUser) => {
    const updated = users.map(u => u.id === updatedUser.id ? updatedUser : u);
    saveUsers(updated);
    
    // If updating current user
    if (currentUser && currentUser.id === updatedUser.id) {
      setCurrentUser(updatedUser);
      window.sessionStorage.setItem("clinic_session", JSON.stringify(updatedUser));
    }
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

  const handleUpdateAppointment = (updatedApp: Appointment) => {
    const updated = appointments.map(app => app.id === updatedApp.id ? updatedApp : app);
    saveAppointments(updated);
  };

  const handleUpdateAppointmentStatus = (id: string, status: AppointmentStatus, customNotes?: string) => {
    const targetBeforeUpdate = appointments.find(a => a.id === id);
    if (status === "Cancelado" && targetBeforeUpdate?.calBookingUid) {
      void apiClient.cancelCalBooking(targetBeforeUpdate.calBookingUid, customNotes || "Cancelado pelo painel");
    }
    void apiClient.updateAppointmentStatus(id, status, customNotes);

    const updated = appointments.map(app => {
      if (app.id === id) {
        return { 
          ...app, 
          status,
          notes: customNotes !== undefined ? customNotes : app.notes 
        };
      }
      return app;
    });
    saveAppointments(updated);

    // Sync in patient stats if they missed (Faltou) or completed (Atendido)
    const targetApp = targetBeforeUpdate;
    if (targetApp) {
      const patientId = targetApp.patientId;
      const pat = patients.find(p => p.id === patientId);
      if (pat) {
        let absencesCount = pat.absencesCount;
        if (status === "Faltou") {
          absencesCount += 1;
        }

        // Update history entry in patient card
        const updatedHistory = pat.history.map(h => {
          if (h.date === targetApp.date && h.type === targetApp.type) {
            return { ...h, status };
          }
          return h;
        });

        // If history entry was not found, append it
        const exists = pat.history.some(h => h.date === targetApp.date && h.type === targetApp.type);
        if (!exists) {
          updatedHistory.unshift({
            date: targetApp.date,
            type: targetApp.type,
            notes: customNotes || targetApp.notes,
            status
          });
        }

        const updatedPatients = patients.map(p => 
          p.id === patientId 
            ? { ...p, absencesCount, history: updatedHistory } 
            : p
        );
        savePatients(updatedPatients);
      }
    }
  };

  // Login/logout logic
  const handleLogin = (user: SystemUser) => {
    setCurrentUser(user);
    window.sessionStorage.setItem("clinic_session", JSON.stringify(user));
    setActiveView("dashboard");
  };

  const handleLogout = () => {
    setCurrentUser(null);
    window.sessionStorage.removeItem("clinic_session");
  };

  // Quick navigation helpers
  const handleSelectAppointmentFromDashboard = (app: Appointment) => {
    setDashboardSelectedApp(app);
    setActiveView("agenda");
  };

  const openCalBookingArea = () => {
    setActiveView("agenda");
    window.setTimeout(() => {
      document.getElementById("cal-official-booking")?.scrollIntoView({ behavior: "smooth", block: "start" });
    }, 120);
  };

  // Helper for patient view linkage
  const [selectedPatientInView, setSelectedPatientInView] = useState<Patient | null>(null);

  const handleOpenNewAppointmentForPatient = () => {
    openCalBookingArea();
  };

  const handleOpenReturnForPatient = () => {
    openCalBookingArea();
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
        users={users.length > 0 ? users : INITIAL_USERS} 
        onLoginSuccess={handleLogin} 
        onUpdateUser={handleUpdateUser} 
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
              onNavigate={setActiveView}
              onOpenNewAppointment={openCalBookingArea}
              onOpenNewPatient={() => {
                setActiveView("pacientes");
                setTimeout(() => {
                  const btn = document.querySelector('[class*="Novo Paciente"]') as HTMLButtonElement;
                  if (btn) btn.click();
                }, 100);
              }}
              onSelectAppointment={handleSelectAppointmentFromDashboard}
            />
          )}

          {activeView === "agenda" && (
            <ScheduleView 
              appointments={appointments}
              patients={patients}
              professionals={professionals}
              currentUser={currentUser}
              settings={settings}
              dataMode={dataMode}
              onAddAppointment={handleAddAppointment}
              onUpdateAppointmentStatus={handleUpdateAppointmentStatus}
              onUpdateAppointment={handleUpdateAppointment}
              onOpenNewPatient={() => {
                setActiveView("pacientes");
                setTimeout(() => {
                  const btn = document.querySelector('[class*="Novo Paciente"]') as HTMLButtonElement;
                  if (btn) btn.click();
                }, 100);
              }}
              selectedAppointmentFromDashboard={dashboardSelectedApp}
              clearSelectedAppointmentFromDashboard={() => setDashboardSelectedApp(null)}
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
            />
          )}

          {activeView === "contatos" && (
            <ContactsView
              contacts={contacts}
              patients={patients}
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
              onUpdateUser={handleUpdateUser}
            />
          )}

        </main>

      </div>

    </div>
  );
}
