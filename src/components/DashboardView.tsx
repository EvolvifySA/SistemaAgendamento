import React, { useState, useMemo } from "react";
import { Appointment, Patient, Professional, SystemUser } from "../types";
import { 
  Calendar, 
  Users, 
  Clock, 
  CheckCircle, 
  Plus, 
  ArrowRight, 
  UserPlus, 
  TrendingUp, 
  HeartHandshake,
  Filter,
  User,
  AlertCircle,
  HelpCircle,
  Stethoscope
} from "lucide-react";

interface DashboardViewProps {
  currentUser: SystemUser;
  appointments: Appointment[];
  patients: Patient[];
  professionals: Professional[];
  onNavigate: (viewId: string) => void;
  onOpenNewAppointment: () => void;
  onOpenNewPatient: () => void;
  onSelectAppointment: (app: Appointment) => void;
}

export const DashboardView: React.FC<DashboardViewProps> = ({
  currentUser,
  appointments,
  patients,
  professionals,
  onNavigate,
  onOpenNewAppointment,
  onOpenNewPatient,
  onSelectAppointment
}) => {
  // Today's Date Reference
  const todayStr = "2026-07-01";

  // State for active professional filter on dashboard
  const [selectedProfId, setSelectedProfId] = useState<string>("todas");

  // Get matching doctor for logged-in user if they are doctor
  const defaultProfId = useMemo(() => {
    if (currentUser.role === "Doutora") {
      const match = professionals.find(p => p.email === currentUser.email);
      return match ? match.id : "todas";
    }
    return "todas";
  }, [currentUser, professionals]);

  // Adjust active filter based on logged-in doctor
  const activeFilterId = currentUser.role === "Doutora" ? defaultProfId : selectedProfId;

  // Filter today's appointments
  const todayApps = useMemo(() => {
    return appointments.filter(app => {
      if (app.date !== todayStr) return false;
      if (activeFilterId !== "todas" && app.professionalId !== activeFilterId) return false;
      return true;
    });
  }, [appointments, activeFilterId]);

  const activeTodayApps = useMemo(() => {
    return todayApps.filter(app => app.status !== "Cancelado");
  }, [todayApps]);

  // Core metrics for the dashboard
  const totalToday = activeTodayApps.length;
  const pendingConfirmation = activeTodayApps.filter(app => app.status === "Agendado").length;
  const attendedCount = activeTodayApps.filter(app => app.status === "Atendido").length;

  // Next appointment
  const nextApp = useMemo(() => {
    // Find the next appointment which is either Confirmed or Scheduled and sorted by time
    const sortedActive = [...activeTodayApps].sort((a, b) => a.time.localeCompare(b.time));
    return sortedActive.find(app => app.status === "Confirmado" || app.status === "Agendado");
  }, [activeTodayApps]);

  // Calculate free slots
  const totalPossibleSlots = 10;
  const freeSlots = Math.max(0, totalPossibleSlots - activeTodayApps.filter(a => ["Agendado", "Confirmado", "Atendido"].includes(a.status)).length);

  // Absence alerts from the past week
  const absenceAlerts = useMemo(() => {
    return appointments.filter(app => app.status === "Faltou" && app.date <= todayStr).slice(0, 3);
  }, [appointments]);

  // Summary per professional for the clinical overview panel
  const professionalSummaries = useMemo(() => {
    return professionals.map(prof => {
      const profTodayApps = appointments.filter(app => app.date === todayStr && app.professionalId === prof.id && app.status !== "Cancelado");
      const next = [...profTodayApps]
        .filter(app => app.status === "Confirmado" || app.status === "Agendado")
        .sort((a,b) => a.time.localeCompare(b.time))[0];
      const pendingConf = profTodayApps.filter(app => app.status === "Agendado").length;

      return {
        prof,
        total: profTodayApps.length,
        nextTime: next ? next.time : null,
        nextPatient: next ? next.patientName : null,
        pendingConf
      };
    });
  }, [appointments, professionals]);

  const getGreeting = () => {
    const hours = new Date().getHours();
    if (hours < 12) return "Bom dia";
    if (hours < 18) return "Boa tarde";
    return "Boa noite";
  };

  return (
    <div className="space-y-8 animate-fade-in">
      
      {/* Welcome Banner */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 bg-white p-8 rounded-[32px] border border-[#E5E5E0] shadow-sm relative overflow-hidden">
        <div className="absolute right-0 top-0 w-48 h-full bg-gradient-to-l from-[#F5F5F0]/30 to-transparent pointer-events-none"></div>
        <div className="space-y-1">
          <h2 className="text-3xl font-serif text-[#1A1A1A] leading-tight">
            {getGreeting()}, <span className="italic text-[#5A5A40] font-semibold">{currentUser.name}</span>
          </h2>
          <p className="text-xs text-[#707060]">
            Seu consultório está operando com suporte a {professionals.length} dentistas. Dados mockados em tempo real.
          </p>
        </div>
        
        {/* Buttons */}
        <div className="flex flex-wrap items-center gap-3">
          <button 
            onClick={onOpenNewAppointment}
            className="flex items-center gap-2 px-5 py-2.5 bg-[#5A5A40] text-white rounded-full text-xs font-semibold shadow-md hover:shadow-lg hover:bg-[#474732] active:scale-95 transition-all"
          >
            <Plus className="w-4 h-4" />
            <span>Novo Agendamento</span>
          </button>
          <button 
            onClick={onOpenNewPatient}
            className="flex items-center gap-2 px-5 py-2.5 bg-white text-[#5A5A40] border border-[#D8D8C0] rounded-full text-xs font-semibold hover:bg-[#F5F5F0] active:scale-95 transition-all"
          >
            <UserPlus className="w-4 h-4" />
            <span>Novo Paciente</span>
          </button>
        </div>
      </div>

      {/* DASHBOARD FILTER - REQUIREMENT 7 */}
      {currentUser.role !== "Doutora" && (
        <div className="bg-white border border-[#E5E5E0] rounded-3xl p-5 shadow-sm flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-center gap-2 text-xs font-extrabold text-[#5A5A40] uppercase tracking-wider">
            <Filter className="w-4 h-4 text-[#C17A63]" />
            <span>Filtrar Dashboard Geral</span>
          </div>

          <div className="flex items-center gap-2">
            <span className="text-xs text-[#707060]">Exibir agenda de:</span>
            <select
              value={selectedProfId}
              onChange={(e) => setSelectedProfId(e.target.value)}
              className="bg-[#F5F5F0] border border-[#E5E5E0] rounded-xl px-4 py-2 text-xs font-bold text-[#1A1A1A] outline-none"
            >
              <option value="todas">Todas as Dentistas</option>
              {professionals.map(p => (
                <option key={p.id} value={p.id}>{p.name}</option>
              ))}
            </select>
          </div>
        </div>
      )}

      {/* Dynamic KPI Cards based on filter selection */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
        <div className="bg-white p-6 rounded-[32px] shadow-sm border border-[#E5E5E0] space-y-2 hover:shadow-md transition-all">
          <div className="flex items-center justify-between">
            <p className="text-[10px] uppercase tracking-wider text-[#A0A090] font-bold">Consultas de Hoje</p>
            <Calendar className="w-4 h-4 text-[#5A5A40]" />
          </div>
          <p className="text-4xl font-serif mt-1 text-[#1A1A1A]">{totalToday}</p>
          <p className="text-xs text-[#707060]">
            <span className="text-green-700 font-bold">{attendedCount}</span> finalizadas / {totalToday - attendedCount} restantes
          </p>
        </div>

        <div className="bg-white p-6 rounded-[32px] shadow-sm border border-[#E5E5E0] space-y-2 hover:shadow-md transition-all">
          <div className="flex items-center justify-between">
            <p className="text-[10px] uppercase tracking-wider text-[#A0A090] font-bold">Próximo Atendimento</p>
            <Clock className="w-4 h-4 text-[#C17A63]" />
          </div>
          {nextApp ? (
            <div>
              <p className="text-sm font-bold mt-1 truncate text-[#1A1A1A]">{nextApp.patientName}</p>
              <p className="text-xs text-[#C17A63] font-bold">{nextApp.time} • {nextApp.type}</p>
            </div>
          ) : (
            <div>
              <p className="text-sm font-bold mt-1 text-[#707060]">Nenhum pendente</p>
              <p className="text-xs text-[#A0A090]">Para o dia de hoje</p>
            </div>
          )}
        </div>

        <div className="bg-white p-6 rounded-[32px] shadow-sm border border-[#E5E5E0] space-y-2 hover:shadow-md transition-all">
          <div className="flex items-center justify-between">
            <p className="text-[10px] uppercase tracking-wider text-[#A0A090] font-bold">Vagas Livres</p>
            <TrendingUp className="w-4 h-4 text-[#5A5A40]" />
          </div>
          <p className="text-4xl font-serif mt-1 text-[#1A1A1A]">{freeSlots}</p>
          <p className="text-xs text-[#707060]">Slots estimados disponíveis</p>
        </div>

        <div className="bg-white p-6 rounded-[32px] shadow-sm border border-[#E5E5E0] space-y-2 hover:shadow-md transition-all">
          <div className="flex items-center justify-between">
            <p className="text-[10px] uppercase tracking-wider text-[#A0A090] font-bold">Aguardando Confirmação</p>
            <CheckCircle className="w-4 h-4 text-[#C17A63]" />
          </div>
          <p className="text-4xl font-serif mt-1 text-[#1A1A1A]">{pendingConfirmation}</p>
          <p className="text-xs text-[#707060]">Agendamentos não confirmados</p>
        </div>
      </div>

      {/* PROFESSIONAL OVERVIEW ROW - REQUIREMENT 7 */}
      {currentUser.role !== "Doutora" && (
        <div className="bg-white border border-[#E5E5E0] rounded-[32px] p-6 shadow-sm space-y-5">
          <div>
            <h3 className="font-serif text-xl text-[#1A1A1A] flex items-center gap-2">
              <Stethoscope className="w-5 h-5 text-[#5A5A40]" />
              <span>Resumo de Atendimentos por Dentista</span>
            </h3>
            <p className="text-xs text-[#707060]">Status geral e fila de trabalho de cada profissional para o dia de hoje.</p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {professionalSummaries.map(({ prof, total, nextTime, nextPatient, pendingConf }) => (
              <div 
                key={prof.id}
                className="border border-[#F0F0E8] rounded-2xl p-5 hover:border-[#D8D8C0] transition-all bg-[#FBFBFA] flex flex-col justify-between"
              >
                <div className="flex items-center justify-between pb-3 border-b border-[#F0F0E8]">
                  <div className="flex items-center gap-2.5">
                    <span className="w-3.5 h-3.5 rounded-full" style={{ backgroundColor: prof.color }} />
                    <span className="font-serif italic font-bold text-sm text-[#1A1A1A]">{prof.name}</span>
                  </div>
                  <span className="text-[10px] font-extrabold uppercase tracking-widest text-[#C17A63]">{prof.specialty}</span>
                </div>

                <div className="mt-4 grid grid-cols-3 gap-2 text-center">
                  <div className="bg-white p-2.5 rounded-xl border border-[#F0F0E8]">
                    <p className="text-lg font-bold text-[#5A5A40]">{total}</p>
                    <p className="text-[8px] text-[#707060] uppercase font-bold tracking-wider mt-0.5">Consultas</p>
                  </div>
                  <div className="bg-white p-2.5 rounded-xl border border-[#F0F0E8]">
                    <p className="text-lg font-bold text-[#C17A63]">{pendingConf}</p>
                    <p className="text-[8px] text-[#707060] uppercase font-bold tracking-wider mt-0.5">Aguardando</p>
                  </div>
                  <div className="bg-white p-2.5 rounded-xl border border-[#F0F0E8]">
                    <p className="text-lg font-bold text-emerald-700">
                      {appointments.filter(a => a.date === todayStr && a.professionalId === prof.id && a.status === "Atendido").length}
                    </p>
                    <p className="text-[8px] text-[#707060] uppercase font-bold tracking-wider mt-0.5">Atendidos</p>
                  </div>
                </div>

                <div className="mt-4 text-xs text-[#707060] flex items-center justify-between bg-white px-3.5 py-2 rounded-xl border border-[#F0F0E8]">
                  <span className="font-semibold">Próximo Atendimento:</span>
                  <span className="font-bold text-[#1A1A1A] font-mono">
                    {nextTime ? `${nextTime} (${nextPatient})` : "Finalizado / Nenhum"}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Main Grid: Today's Appointments & Shortcuts/Reminders */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        
        {/* Today's Schedule */}
        <div className="lg:col-span-8 bg-white rounded-[32px] shadow-sm border border-[#E5E5E0] overflow-hidden flex flex-col">
          <div className="px-8 py-6 border-b border-[#F5F5F0] flex justify-between items-center bg-[#FBFBFA]">
            <div>
              <h3 className="font-serif text-xl text-[#1A1A1A]">
                {activeFilterId === "todas" ? "Fila Geral de Consultas de Hoje" : `Fila de Atendimento - ${professionals.find(p => p.id === activeFilterId)?.name}`}
              </h3>
              <p className="text-xs text-[#707060] mt-0.5">Clique em um agendamento para abrir os detalhes e ações</p>
            </div>
            <button 
              onClick={() => onNavigate("agenda")}
              className="text-xs font-semibold text-[#5A5A40] hover:text-[#474732] underline underline-offset-4 flex items-center gap-1"
            >
              Ver Agenda Completa
              <ArrowRight className="w-3 h-3" />
            </button>
          </div>

          <div className="p-6 space-y-3 flex-1 overflow-y-auto max-h-[480px]">
            {activeTodayApps.length === 0 ? (
              <div className="text-center py-12 text-[#A0A090] italic text-sm">
                Nenhum agendamento ativo registrado para o dia de hoje sob este filtro.
              </div>
            ) : (
              activeTodayApps.map(app => {
                // Find professional color
                const prof = professionals.find(p => p.id === app.professionalId);
                const profColor = prof ? prof.color : "#5A5A40";

                let statusBg = "bg-[#EEEEEE] text-[#666666]";
                if (app.status === "Confirmado") statusBg = "bg-[#DDE6DD] text-[#3E523E]";
                if (app.status === "Agendado") statusBg = "bg-[#F5EEDD] text-[#63532C]";
                if (app.status === "Atendido") statusBg = "bg-[#E6EEF4] text-[#2C4A63]";
                if (app.status === "Faltou") statusBg = "bg-[#FBEBEB] text-[#802B2B]";

                return (
                  <div 
                    key={app.id}
                    onClick={() => onSelectAppointment(app)}
                    className="flex items-center p-4 rounded-2xl bg-[#FBFBFA] border border-[#F0F0E8] hover:border-[#D8D8C0] cursor-pointer transition-all hover:scale-[1.01] hover:shadow-sm"
                  >
                    {/* Professional Left Color Tag */}
                    <div className="w-1.5 h-10 rounded-full mr-3 shrink-0" style={{ backgroundColor: profColor }} />

                    <div className="w-16 shrink-0 text-center border-r border-[#E5E5E0] pr-3">
                      <p className="text-sm font-bold text-[#5A5A40]">{app.time}</p>
                    </div>

                    <div className="flex-1 min-w-0 pl-4">
                      <div className="flex items-center gap-2">
                        <p className="font-bold text-sm text-[#1A1A1A] truncate">{app.patientName}</p>
                        <span className="text-[9px] px-2 py-0.5 rounded-md font-bold text-white uppercase hidden sm:inline" style={{ backgroundColor: profColor }}>
                          {prof ? prof.name.split(" ").slice(-1)[0] : "Dentista"}
                        </span>
                      </div>
                      <p className="text-[11px] text-[#707060] flex items-center gap-2 mt-0.5">
                        <span className="font-semibold">{app.type}</span>
                        <span>•</span>
                        <span>{app.patientPhone}</span>
                      </p>
                    </div>

                    <div className="flex items-center gap-3 shrink-0 ml-4">
                      <span className={`px-2.5 py-1 text-[10px] font-bold uppercase rounded-full tracking-wider ${statusBg}`}>
                        {app.status}
                      </span>
                      <ChevronRightIcon className="w-4 h-4 text-[#A0A090]" />
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>

        {/* Reminders, Motivational Block, and Absences Alerts (Requirement 7) */}
        <div className="lg:col-span-4 flex flex-col gap-6">
          
          {/* Absences Alerts panel - requirement 7 */}
          {absenceAlerts.length > 0 && (
            <div className="bg-[#FFF5F5] p-6 rounded-[32px] border border-[#E9C3C3] space-y-3.5">
              <h4 className="font-serif text-sm font-bold text-[#8C1D1D] flex items-center gap-2">
                <AlertCircle className="w-4 h-4 text-[#8C1D1D]" />
                Alertas de Faltas Recentes
              </h4>
              <div className="space-y-3">
                {absenceAlerts.map(app => {
                  const prof = professionals.find(p => p.id === app.professionalId);
                  return (
                    <div key={app.id} className="text-xs bg-white/70 p-3 rounded-xl border border-[#E9C3C3]/50 text-[#5C1B1B] space-y-1">
                      <p className="font-bold">{app.patientName}</p>
                      <p className="opacity-90">Faltou na consulta de {app.type} em {app.date.split("-").reverse().slice(0, 2).join("/")} com {prof ? prof.name : "a dentista"}.</p>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          <div className="bg-[#F2F2E9] p-8 rounded-[32px] border border-[#E5E5E0]/60 space-y-5 flex-1">
            <h4 className="font-serif text-lg text-[#5A5A40] flex items-center gap-2">
              <HeartHandshake className="w-5 h-5 text-[#C17A63]" />
              Lembretes Clínicos
            </h4>
            <ul className="space-y-4">
              <li className="flex gap-3 text-xs leading-relaxed text-[#1A1A1A]">
                <div className="mt-1.5 w-2 h-2 rounded-full bg-[#C17A63] shrink-0"></div>
                <p><strong>Sr. Antônio Carlos:</strong> Verificar se virá acompanhado antes do atendimento das 11:15.</p>
              </li>
              <li className="flex gap-3 text-xs leading-relaxed text-[#1A1A1A]">
                <div className="mt-1.5 w-2 h-2 rounded-full bg-[#5A5A40] shrink-0"></div>
                <p><strong>WhatsApp:</strong> Lembrar de disparar as confirmações automáticas para as consultas de amanhã.</p>
              </li>
              <li className="flex gap-3 text-xs leading-relaxed text-[#707060] opacity-75">
                <div className="mt-1.5 w-2 h-2 rounded-full bg-[#A0A090] shrink-0"></div>
                <p>Revisar estoque de materiais esterilizados na sala principal.</p>
              </li>
            </ul>
          </div>

          <div className="bg-white p-6 rounded-[32px] border border-[#E5E5E0] space-y-2 shadow-sm">
            <p className="text-[10px] font-bold uppercase text-[#C17A63] tracking-widest">Informativo</p>
            <p className="text-xs italic text-[#707060] leading-relaxed">
              "A confirmação ágil e o registro de tags de preferência aumentam o engajamento do paciente e evitam atrasos clínicos significativos."
            </p>
          </div>
        </div>

      </div>
    </div>
  );
};

// Quick custom chevron to avoid importing extra icons
const ChevronRightIcon: React.FC<{ className?: string }> = ({ className }) => (
  <svg className={className} fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
  </svg>
);