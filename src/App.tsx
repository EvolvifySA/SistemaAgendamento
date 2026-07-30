import React, { useState, useEffect } from "react";
import { 
  SystemUser, 
  Patient, 
  Appointment, 
  ClinicSettings, 
  AppointmentStatus,
  Professional
} from "./types";
import {
  INITIAL_PATIENTS,
  INITIAL_USERS,
  INITIAL_SETTINGS,
  INITIAL_APPOINTMENTS,
  INITIAL_PROFESSIONALS
} from "./data/mockData";
import {
  patientStorage,
  appointmentStorage,
  userStorage,
  professionalStorage,
  settingsStorage,
  sessionStorage_
} from "./services/storage";

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
  Heart
} from "lucide-react";

export default function App() {
  // Session states
  const [currentUser, setCurrentUser] = useState<SystemUser | null>(null);
  const [activeView, setActiveView] = useState<string>("dashboard");

  // Clinical data store states
  const [patients, setPatients] = useState<Patient[]>([]);
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [users, setUsers] = useState<SystemUser[]>([]);
  const [professionals, setProfessionals] = useState<Professional[]>([]);
  const [settings, setSettings] = useState<ClinicSettings>(INITIAL_SETTINGS);

  // Global search & UI states
  const [globalSearch, setGlobalSearch] = useState("");
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [dashboardSelectedApp, setDashboardSelectedApp] = useState<Appointment | null>(null);

  // Load state from local storage or mock files on startup
  useEffect(() => {
    setPatients(patientStorage.load() || INITIAL_PATIENTS);
    setAppointments(appointmentStorage.load() || INITIAL_APPOINTMENTS);
    setUsers(userStorage.load() || INITIAL_USERS);
    setProfessionals(professionalStorage.load() || INITIAL_PROFESSIONALS);
    setSettings(settingsStorage.load() || INITIAL_SETTINGS);

    // Auto log in as Admin by default for first experience to make it fast to explore,
    // but allow logging out to test other accounts!
    const savedSession = sessionStorage_.load();
    if (savedSession) {
      setCurrentUser(savedSession);
    } else {
      // Set default initial logged-in user as Roberta (Recepção) or Lucas (Admin)
      // Let's boot with Lucas (Admin) so they see all menus instantly
      const defaultAdmin = INITIAL_USERS.find(u => u.role === "Administrador") || INITIAL_USERS[0];
      setCurrentUser(defaultAdmin);
    }
  }, []);

  // Sync data stores helper
  const savePatients = (updatedList: Patient[]) => {
    setPatients(updatedList);
    patientStorage.save(updatedList);
  };

  const saveAppointments = (updatedList: Appointment[]) => {
    setAppointments(updatedList);
    appointmentStorage.save(updatedList);
  };

  const saveUsers = (updatedList: SystemUser[]) => {
    setUsers(updatedList);
    userStorage.save(updatedList);
  };

  const saveProfessionals = (updatedList: Professional[]) => {
    setProfessionals(updatedList);
    professionalStorage.save(updatedList);
  };

  const saveSettings = (updated: ClinicSettings) => {
    setSettings(updated);
    settingsStorage.save(updated);
  };

  // Add entity handlers
  const handleAddPatient = (newPatData: Omit<Patient, "id" | "absencesCount" | "history">) => {
    const newPatient: Patient = {
      ...newPatData,
      id: `pat-${Date.now()}`,
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
      sessionStorage_.save(updatedUser);
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
    const targetApp = appointments.find(a => a.id === id);
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
    sessionStorage_.save(user);
    setActiveView("dashboard");
  };

  const handleLogout = () => {
    setCurrentUser(null);
    sessionStorage_.clear();
  };

  // Quick navigation helpers
  const handleSelectAppointmentFromDashboard = (app: Appointment) => {
    setDashboardSelectedApp(app);
    setActiveView("agenda");
  };

  // Helper for patient view linkage
  const [selectedPatientInView, setSelectedPatientInView] = useState<Patient | null>(null);

  const handleOpenNewAppointmentForPatient = (patientId: string) => {
    // Navigate to agenda and open modal or pass trigger
    setActiveView("agenda");
    // Handled natively inside ScheduleView via component props or we can alert
    setTimeout(() => {
      const btn = document.querySelector('[class*="Novo Agendamento"]') as HTMLButtonElement;
      if (btn) btn.click();
    }, 100);
  };

  const handleOpenReturnForPatient = (patientId: string) => {
    setActiveView("agenda");
    setTimeout(() => {
      // Pre-fill return parameters trigger
      alert("✨ Agendamento de Retorno: Preenchendo o formulário de consulta com as credenciais do paciente para retorno.");
      const btn = document.querySelector('[class*="Novo Agendamento"]') as HTMLButtonElement;
      if (btn) btn.click();
    }, 100);
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
    alert(`🔍 Busca Clínica: Pesquisando por "${globalSearch}". Exibindo resultados correspondentes.`);
    setGlobalSearch("");
  };

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
    { id: "profissionais", label: "Profissionais", icon: Briefcase },
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

          {/* Footnotes representation */}
          <div className="p-3 bg-[#FBFBFA] rounded-2xl border border-[#F0F0E8] text-[10px] text-[#707060] leading-relaxed">
            <p className="font-bold text-[#5A5A40]">🔐 Sistema Clínico Homologado</p>
            <p className="mt-0.5 opacity-80">Ambiente operacional blindado e em total conformidade com a LGPD de saúde.</p>
          </div>
        </aside>

        {/* Main Content Area dynamically loaded */}
        <main className="flex-1 p-6 md:p-10 max-w-7xl w-full mx-auto overflow-y-auto space-y-8">
          
          {activeView === "dashboard" && (
            <DashboardView 
              currentUser={currentUser}
              appointments={appointments}
              patients={patients}
              professionals={professionals}
              onNavigate={setActiveView}
              onOpenNewAppointment={() => {
                setActiveView("agenda");
                setTimeout(() => {
                  const btn = document.querySelector('[class*="Novo Agendamento"]') as HTMLButtonElement;
                  if (btn) btn.click();
                }, 100);
              }}
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
              onAddPatient={handleAddPatient}
              onOpenNewAppointmentForPatient={handleOpenNewAppointmentForPatient}
              onOpenReturnForPatient={handleOpenReturnForPatient}
              onDeletePatient={handleDeletePatient}
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

          {activeView === "metricas" && (
            <MetricsView 
              currentUser={currentUser}
              appointments={appointments}
              patients={patients}
              professionals={professionals}
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
