import React, { useState, useMemo } from "react";
import { Appointment, Patient, Professional, SystemUser, ClinicSettings } from "../types";
import { 
  TrendingUp, 
  Users, 
  Calendar, 
  CheckCircle2, 
  XCircle, 
  Clock, 
  DollarSign, 
  User, 
  BarChart3, 
  Filter, 
  Percent, 
  Smile, 
  Frown,
  Activity,
  Award
} from "lucide-react";

interface MetricsViewProps {
  currentUser: SystemUser;
  appointments: Appointment[];
  patients: Patient[];
  professionals: Professional[];
  settings: ClinicSettings;
}

export function MetricsView({ 
  currentUser, 
  appointments, 
  patients, 
  professionals,
  settings
}: MetricsViewProps) {
  
  // States for filters
  const [periodFilter, setPeriodFilter] = useState<"hoje" | "semana" | "mes" | "personalizado">("mes");
  const [profFilter, setProfFilter] = useState<string>("todas");
  const [statusFilter, setStatusFilter] = useState<string>("todos");
  const [typeFilter, setTypeFilter] = useState<string>("todos");

  // Custom range dates (used if personalizados)
  const today = new Date();
  const todayIso = today.toISOString().slice(0, 10);
  const [customStartDate, setCustomStartDate] = useState(todayIso);
  const [customEndDate, setCustomEndDate] = useState(todayIso);

  const startOfWeek = new Date(today);
  startOfWeek.setDate(today.getDate() - today.getDay() + 1);
  const endOfWeek = new Date(startOfWeek);
  endOfWeek.setDate(startOfWeek.getDate() + 6);
  const startOfMonth = new Date(today.getFullYear(), today.getMonth(), 1);
  const endOfMonth = new Date(today.getFullYear(), today.getMonth() + 1, 0);
  const iso = (date: Date) => date.toISOString().slice(0, 10);

  // Helper to determine if date is in range
  const isDateInPeriod = (dateStr: string): boolean => {
    if (periodFilter === "hoje") {
      return dateStr === todayIso;
    }
    if (periodFilter === "semana") {
      return dateStr >= iso(startOfWeek) && dateStr <= iso(endOfWeek);
    }
    if (periodFilter === "mes") {
      return dateStr >= iso(startOfMonth) && dateStr <= iso(endOfMonth);
    }
    if (periodFilter === "personalizado") {
      return dateStr >= customStartDate && dateStr <= customEndDate;
    }
    return true;
  };

  // Filtered Appointments based on selected criteria
  const filteredAppointments = useMemo(() => {
    return appointments.filter(app => {
      // Period
      if (!isDateInPeriod(app.date)) return false;

      // Professional
      if (profFilter !== "todas" && app.professionalId !== profFilter) return false;

      // Status
      if (statusFilter !== "todos" && app.status !== statusFilter) return false;

      // Type
      if (typeFilter !== "todos" && app.type !== typeFilter) return false;

      // If currentUser is doctor, she can only see her own metrics unless she is Administrator
      if (currentUser.role === "Doutora") {
        // Find which professional corresponds to her
        const matchedProf = professionals.find(p => p.email === currentUser.email);
        if (matchedProf && app.professionalId !== matchedProf.id) {
          return false;
        }
      }

      return true;
    });
  }, [appointments, periodFilter, profFilter, statusFilter, typeFilter, customStartDate, customEndDate, currentUser, professionals]);

  // General Indicators calculations (derived from filtered appointments and general clinic rules)
  const stats = useMemo(() => {
    const total = filteredAppointments.length;
    const atendidos = filteredAppointments.filter(a => a.status === "Atendido").length;
    const confirmados = filteredAppointments.filter(a => a.status === "Confirmado").length;
    const cancelados = filteredAppointments.filter(a => a.status === "Cancelado").length;
    const faltas = filteredAppointments.filter(a => a.status === "Faltou").length;
    const agendados = filteredAppointments.filter(a => a.status === "Agendado").length;

    // Total finished appointments + confirmed + missed (all scheduled spots that weren't cancelled)
    const activeExpectedSpots = atendidos + confirmados + faltas + agendados;
    const comparecimentoRate = activeExpectedSpots > 0 
      ? Math.round(((atendidos + confirmados) / activeExpectedSpots) * 100) 
      : 100;

    const activeProfsCount = profFilter === "todas" 
      ? professionals.filter(p => p.active).length 
      : 1;

    const daysCount = periodFilter === "hoje" ? 1 : periodFilter === "semana" ? 7 : periodFilter === "mes" ? endOfMonth.getDate() : Math.max(1, Math.ceil((new Date(customEndDate).getTime() - new Date(customStartDate).getTime()) / 86400000) + 1);
    const selectedProfs = profFilter === "todas" ? professionals.filter(p => p.active) : professionals.filter(p => p.id === profFilter);
    const dailyAvailableMinutes = selectedProfs.reduce((sum, prof) => {
      const [startH, startM] = prof.workingHoursStart.split(":").map(Number);
      const [endH, endM] = prof.workingHoursEnd.split(":").map(Number);
      return sum + Math.max(0, (endH * 60 + endM) - (startH * 60 + startM));
    }, 0);
    const totalMinutesAvailable = Math.max(0, dailyAvailableMinutes * daysCount);
    const occupiedMinutes = filteredAppointments
      .filter(a => a.status !== "Cancelado")
      .reduce((sum, a) => sum + (a.duration || 30), 0);

    const occupancyRate = Math.min(100, totalMinutesAvailable > 0 
      ? Math.round((occupiedMinutes / totalMinutesAvailable) * 100) 
      : 0);

    // Free slots estimate
    const slotDuration = settings.defaultDuration || 30;
    const totalSlots = Math.round(totalMinutesAvailable / slotDuration);
    const occupiedSlotsCount = filteredAppointments.filter(a => a.status !== "Cancelado").length;
    const freeSlots = Math.max(0, totalSlots - occupiedSlotsCount);

    // New patients (registered in current period or having first appointment as "Primeira Consulta" in period)
    const newPatients = filteredAppointments.filter(a => a.type === "Primeira Consulta" && a.status !== "Cancelado").length;
    const retornos = filteredAppointments.filter(a => a.type === "Retorno" && a.status !== "Cancelado").length;

    return {
      total,
      atendidos,
      confirmados,
      cancelados,
      faltas,
      agendados,
      comparecimentoRate,
      occupancyRate,
      freeSlots,
      newPatients,
      retornos,
      occupiedMinutes
    };
  }, [filteredAppointments, periodFilter, profFilter, professionals]);

  // Metrics per Professional breakdown (to build the interactive comparative table)
  const professionalsBreakdown = useMemo(() => {
    return professionals.map(prof => {
      const profApps = appointments.filter(a => a.professionalId === prof.id && isDateInPeriod(a.date));
      
      const total = profApps.length;
      const atendidos = profApps.filter(a => a.status === "Atendido").length;
      const confirmados = profApps.filter(a => a.status === "Confirmado").length;
      const faltas = profApps.filter(a => a.status === "Faltou").length;
      const cancelados = profApps.filter(a => a.status === "Cancelado").length;
      const retornos = profApps.filter(a => a.type === "Retorno" && a.status !== "Cancelado").length;
      const novos = profApps.filter(a => a.type === "Primeira Consulta" && a.status !== "Cancelado").length;

      const totalMinutes = profApps
        .filter(a => a.status === "Atendido")
        .reduce((sum, a) => sum + (a.duration || 30), 0);

      const avgDuration = atendidos > 0 ? Math.round(totalMinutes / atendidos) : 0;

      const daysCount = periodFilter === "hoje" ? 1 : periodFilter === "semana" ? 7 : periodFilter === "mes" ? endOfMonth.getDate() : Math.max(1, Math.ceil((new Date(customEndDate).getTime() - new Date(customStartDate).getTime()) / 86400000) + 1);
      const [startH, startM] = prof.workingHoursStart.split(":").map(Number);
      const [endH, endM] = prof.workingHoursEnd.split(":").map(Number);
      const availableMins = Math.max(0, ((endH * 60 + endM) - (startH * 60 + startM)) * daysCount);
      const occupiedMins = profApps
        .filter(a => a.status !== "Cancelado")
        .reduce((sum, a) => sum + (a.duration || 30), 0);

      const occupancy = Math.min(100, availableMins > 0 ? Math.round((occupiedMins / availableMins) * 100) : 0);

      return {
        ...prof,
        total,
        atendidos,
        confirmados,
        faltas,
        cancelados,
        retornos,
        novos,
        occupancy,
        totalMinutes,
        avgDuration
      };
    });
  }, [appointments, professionals, periodFilter]);

  // Chart data 1: Appointments by day of the current week
  const appointmentsByDay = useMemo(() => {
    const labels = ["Dom", "Seg", "Ter", "Qua", "Qui", "Sex", "Sáb"];
    const weekdays = [
      ...Array.from({ length: 7 }, (_, index) => {
        const day = new Date(startOfWeek);
        day.setDate(startOfWeek.getDate() + index);
        return { name: labels[day.getDay()], date: iso(day), count: 0 };
      })
    ];

    appointments.forEach(app => {
      const match = weekdays.find(w => w.date === app.date);
      if (match && app.status !== "Cancelado") {
        if (profFilter === "todas" || app.professionalId === profFilter) {
          match.count++;
        }
      }
    });

    return weekdays;
  }, [appointments, profFilter]);

  // Chart data 2: Status distribution
  const statusDistribution = useMemo(() => {
    const list = [
      { label: "Atendidos", count: stats.atendidos, color: "bg-emerald-500", text: "text-emerald-700" },
      { label: "Confirmados", count: stats.confirmados, color: "bg-blue-500", text: "text-blue-700" },
      { label: "Faltou", count: stats.faltas, color: "bg-amber-600", text: "text-amber-800" },
      { label: "Cancelados", count: stats.cancelados, color: "bg-rose-500", text: "text-rose-700" },
      { label: "Pendente", count: stats.agendados, color: "bg-[#5A5A40]", text: "text-[#5A5A40]" }
    ];
    return list.filter(item => item.count > 0);
  }, [stats]);

  // Chart data 3: Most common appointment types
  const typeDistribution = useMemo(() => {
    const map: Record<string, number> = {};
    filteredAppointments.forEach(app => {
      if (app.status !== "Cancelado") {
        map[app.type] = (map[app.type] || 0) + 1;
      }
    });

    const list = Object.entries(map).map(([type, count]) => ({ type, count }));
    const max = Math.max(...list.map(l => l.count), 1);
    return list.map(item => ({
      ...item,
      percentage: Math.round((item.count / max) * 100)
    })).sort((a,b) => b.count - a.count);
  }, [filteredAppointments]);

  // Chart data 4: Busiest hours
  const hoursDistribution = useMemo(() => {
    const hours = ["08:00", "09:00", "10:00", "11:00", "14:00", "15:00", "16:00"];
    const counts = hours.map(h => {
      const count = filteredAppointments.filter(app => app.time.startsWith(h.split(":")[0]) && app.status !== "Cancelado").length;
      return { hour: h, count };
    });
    return counts;
  }, [filteredAppointments]);

  return (
    <div className="space-y-8">
      
      {/* Header Panel */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <span className="text-[10px] font-extrabold text-[#C17A63] uppercase tracking-widest block mb-1">
            Análise Operacional & Gerencial
          </span>
          <h1 className="text-3xl font-serif italic text-[#5A5A40] font-semibold">
            Métricas de Atendimento
          </h1>
          <p className="text-xs text-[#707060] mt-1">
            Indicadores de produtividade da clínica, taxa de comparecimento, ocupação e performance por profissional.
          </p>
        </div>
      </div>

      {/* FILTER BAR PANEL - BENTO STYLED */}
      <div className="bg-white border border-[#E5E5E0] rounded-3xl p-6 shadow-sm space-y-4">
        <div className="flex items-center gap-2 text-xs font-bold text-[#5A5A40] uppercase tracking-wider pb-2 border-b border-[#F5F5F0]">
          <Filter className="w-4 h-4 text-[#C17A63]" />
          <span>Filtros Estatísticos</span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          
          {/* Period Filter */}
          <div>
            <label className="block text-[10px] font-bold text-[#707060] uppercase tracking-wider mb-1.5">
              Período de Análise
            </label>
            <select
              value={periodFilter}
              onChange={(e) => setPeriodFilter(e.target.value as any)}
              className="w-full bg-[#F5F5F0] border border-[#E5E5E0] rounded-2xl px-4 py-2.5 text-xs font-semibold text-[#1A1A1A] outline-none"
            >
              <option value="hoje">Hoje ({todayIso.split("-").reverse().join("/")})</option>
              <option value="semana">Esta Semana</option>
              <option value="mes">Este Mês</option>
              <option value="personalizado">Período Personalizado</option>
            </select>
          </div>

          {/* Professional Filter */}
          <div>
            <label className="block text-[10px] font-bold text-[#707060] uppercase tracking-wider mb-1.5">
              Dentista / Profissional
            </label>
            <select
              value={profFilter}
              onChange={(e) => setProfFilter(e.target.value)}
              className="w-full bg-[#F5F5F0] border border-[#E5E5E0] rounded-2xl px-4 py-2.5 text-xs font-semibold text-[#1A1A1A] outline-none"
              disabled={currentUser.role === "Doutora"}
            >
              <option value="todas">Todas as Profissionais</option>
              {professionals.map(p => (
                <option key={p.id} value={p.id}>{p.name}</option>
              ))}
            </select>
            {currentUser.role === "Doutora" && (
              <span className="text-[9px] text-[#A0A090] mt-1 block">Restrito ao seu perfil profissional</span>
            )}
          </div>

          {/* Status Filter */}
          <div>
            <label className="block text-[10px] font-bold text-[#707060] uppercase tracking-wider mb-1.5">
              Status da Agenda
            </label>
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="w-full bg-[#F5F5F0] border border-[#E5E5E0] rounded-2xl px-4 py-2.5 text-xs font-semibold text-[#1A1A1A] outline-none"
            >
              <option value="todos">Todos os Status</option>
              <option value="Atendido">Atendidos</option>
              <option value="Confirmado">Confirmados</option>
              <option value="Cancelado">Cancelados</option>
              <option value="Faltou">Faltas</option>
              <option value="Agendado">Agendados</option>
            </select>
          </div>

          {/* Type Filter */}
          <div>
            <label className="block text-[10px] font-bold text-[#707060] uppercase tracking-wider mb-1.5">
              Tipo de Atendimento
            </label>
            <select
              value={typeFilter}
              onChange={(e) => setTypeFilter(e.target.value)}
              className="w-full bg-[#F5F5F0] border border-[#E5E5E0] rounded-2xl px-4 py-2.5 text-xs font-semibold text-[#1A1A1A] outline-none"
            >
              <option value="todos">Todos os Tipos</option>
              <option value="Primeira Consulta">Primeira Consulta</option>
              <option value="Retorno">Retorno</option>
              <option value="Exame">Exame</option>
              <option value="Acompanhamento">Acompanhamento</option>
            </select>
          </div>

        </div>

        {/* Custom Period Picker */}
        {periodFilter === "personalizado" && (
          <div className="grid grid-cols-2 gap-4 pt-3 max-w-md border-t border-[#F5F5F0]">
            <div>
              <label className="block text-[9px] font-bold text-[#707060] uppercase tracking-wider mb-1">Início</label>
              <input 
                type="date" 
                value={customStartDate} 
                onChange={(e) => setCustomStartDate(e.target.value)} 
                className="w-full bg-[#F5F5F0] border border-[#E5E5E0] rounded-xl px-3 py-2 text-xs"
              />
            </div>
            <div>
              <label className="block text-[9px] font-bold text-[#707060] uppercase tracking-wider mb-1">Fim</label>
              <input 
                type="date" 
                value={customEndDate} 
                onChange={(e) => setCustomEndDate(e.target.value)} 
                className="w-full bg-[#F5F5F0] border border-[#E5E5E0] rounded-xl px-3 py-2 text-xs"
              />
            </div>
          </div>
        )}
      </div>

      {/* CORE STATS GRID - 11 KPI INDICATORS */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-6 gap-4">
        
        {/* Atendimentos Totais */}
        <div className="bg-white border border-[#E5E5E0] rounded-2xl p-4 flex flex-col justify-between shadow-sm min-h-[110px]">
          <div className="flex justify-between items-start text-[#A0A090]">
            <span className="text-[10px] font-bold uppercase tracking-wider">Total Período</span>
            <Activity className="w-4 h-4 text-[#5A5A40]" />
          </div>
          <div className="mt-2">
            <p className="text-2xl font-serif italic font-bold text-[#1A1A1A]">{stats.total}</p>
            <p className="text-[9px] text-[#707060] mt-0.5 font-medium">Consultas agendadas</p>
          </div>
        </div>

        {/* Atendidos */}
        <div className="bg-white border border-[#E5E5E0] rounded-2xl p-4 flex flex-col justify-between shadow-sm min-h-[110px]">
          <div className="flex justify-between items-start text-[#A0A090]">
            <span className="text-[10px] font-bold uppercase tracking-wider">Atendidos</span>
            <CheckCircle2 className="w-4 h-4 text-emerald-600" />
          </div>
          <div className="mt-2">
            <p className="text-2xl font-serif italic font-bold text-emerald-700">{stats.atendidos}</p>
            <p className="text-[9px] text-[#707060] mt-0.5 font-medium">Finalizados com sucesso</p>
          </div>
        </div>

        {/* Confirmados */}
        <div className="bg-white border border-[#E5E5E0] rounded-2xl p-4 flex flex-col justify-between shadow-sm min-h-[110px]">
          <div className="flex justify-between items-start text-[#A0A090]">
            <span className="text-[10px] font-bold uppercase tracking-wider">Confirmados</span>
            <Smile className="w-4 h-4 text-blue-500" />
          </div>
          <div className="mt-2">
            <p className="text-2xl font-serif italic font-bold text-blue-600">{stats.confirmados}</p>
            <p className="text-[9px] text-[#707060] mt-0.5 font-medium">Presença confirmada</p>
          </div>
        </div>

        {/* Faltaram */}
        <div className="bg-white border border-[#E5E5E0] rounded-2xl p-4 flex flex-col justify-between shadow-sm min-h-[110px]">
          <div className="flex justify-between items-start text-[#A0A090]">
            <span className="text-[10px] font-bold uppercase tracking-wider">Faltas</span>
            <Frown className="w-4 h-4 text-amber-600" />
          </div>
          <div className="mt-2">
            <p className="text-2xl font-serif italic font-bold text-amber-700">{stats.faltas}</p>
            <p className="text-[9px] text-[#707060] mt-0.5 font-medium">Pacientes ausentes</p>
          </div>
        </div>

        {/* Cancelados */}
        <div className="bg-white border border-[#E5E5E0] rounded-2xl p-4 flex flex-col justify-between shadow-sm min-h-[110px]">
          <div className="flex justify-between items-start text-[#A0A090]">
            <span className="text-[10px] font-bold uppercase tracking-wider">Cancelados</span>
            <XCircle className="w-4 h-4 text-rose-500" />
          </div>
          <div className="mt-2">
            <p className="text-2xl font-serif italic font-bold text-rose-600">{stats.cancelados}</p>
            <p className="text-[9px] text-[#707060] mt-0.5 font-medium">Desmarcados</p>
          </div>
        </div>

        {/* Taxa de Comparecimento */}
        <div className="bg-white border border-[#E5E5E0] rounded-2xl p-4 flex flex-col justify-between shadow-sm min-h-[110px]">
          <div className="flex justify-between items-start text-[#A0A090]">
            <span className="text-[10px] font-bold uppercase tracking-wider">Comparecimento</span>
            <Percent className="w-4 h-4 text-[#C17A63]" />
          </div>
          <div className="mt-2">
            <p className="text-2xl font-serif italic font-bold text-[#C17A63]">{stats.comparecimentoRate}%</p>
            <p className="text-[9px] text-[#707060] mt-0.5 font-medium">Eficiência de presença</p>
          </div>
        </div>

        {/* Novos Pacientes */}
        <div className="bg-white border border-[#E5E5E0] rounded-2xl p-4 flex flex-col justify-between shadow-sm min-h-[110px]">
          <div className="flex justify-between items-start text-[#A0A090]">
            <span className="text-[10px] font-bold uppercase tracking-wider">Novos Pacientes</span>
            <Users className="w-4 h-4 text-[#5A5A40]" />
          </div>
          <div className="mt-2">
            <p className="text-2xl font-serif italic font-bold text-[#1A1A1A]">{stats.newPatients}</p>
            <p className="text-[9px] text-[#707060] mt-0.5 font-medium">Primeiras consultas</p>
          </div>
        </div>

        {/* Retornos Agendados */}
        <div className="bg-white border border-[#E5E5E0] rounded-2xl p-4 flex flex-col justify-between shadow-sm min-h-[110px]">
          <div className="flex justify-between items-start text-[#A0A090]">
            <span className="text-[10px] font-bold uppercase tracking-wider">Retornos</span>
            <Clock className="w-4 h-4 text-[#A0A090]" />
          </div>
          <div className="mt-2">
            <p className="text-2xl font-serif italic font-bold text-[#5A5A40]">{stats.retornos}</p>
            <p className="text-[9px] text-[#707060] mt-0.5 font-medium">Consultas pós-atendimento</p>
          </div>
        </div>

        {/* Horários Livres */}
        <div className="bg-white border border-[#E5E5E0] rounded-2xl p-4 flex flex-col justify-between shadow-sm min-h-[110px]">
          <div className="flex justify-between items-start text-[#A0A090]">
            <span className="text-[10px] font-bold uppercase tracking-wider">Vagas Livres</span>
            <Calendar className="w-4 h-4 text-[#5A5A40]" />
          </div>
          <div className="mt-2">
            <p className="text-2xl font-serif italic font-bold text-[#5A5A40]">{stats.freeSlots}</p>
            <p className="text-[9px] text-[#707060] mt-0.5 font-medium">Horários vagos aprox.</p>
          </div>
        </div>

        {/* Taxa de Ocupação */}
        <div className="bg-white border border-[#E5E5E0] rounded-2xl p-4 flex flex-col justify-between shadow-sm min-h-[110px]">
          <div className="flex justify-between items-start text-[#A0A090]">
            <span className="text-[10px] font-bold uppercase tracking-wider">Ocupação Agenda</span>
            <TrendingUp className="w-4 h-4 text-[#C17A63]" />
          </div>
          <div className="mt-2">
            <p className="text-2xl font-serif italic font-bold text-[#C17A63]">{stats.occupancyRate}%</p>
            <p className="text-[9px] text-[#707060] mt-0.5 font-medium">Horas preenchidas</p>
          </div>
        </div>

        {/* Tempo Total de Atendimento */}
        <div className="col-span-2 bg-white border border-[#E5E5E0] rounded-2xl p-4 flex flex-col justify-between shadow-sm min-h-[110px]">
          <div className="flex justify-between items-start text-[#A0A090]">
            <span className="text-[10px] font-bold uppercase tracking-wider">Horas de Consulta</span>
            <Clock className="w-4 h-4 text-emerald-600" />
          </div>
          <div className="mt-2">
            <p className="text-2xl font-serif italic font-bold text-[#1A1A1A]">
              {Math.floor(stats.occupiedMinutes / 60)}h {stats.occupiedMinutes % 60}m
            </p>
            <p className="text-[9px] text-[#707060] mt-0.5 font-medium">Tempo acumulado em cadeira odontológica</p>
          </div>
        </div>

      </div>

      {/* CHARTS ROW - HIGH DESIGN REPLACING STANDARD LIBRARIES */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* Chart 1: Atendimentos por Dia da Semana (Pure responsive Vector Chart) */}
        <div className="bg-white border border-[#E5E5E0] rounded-3xl p-6 shadow-sm space-y-4">
          <div>
            <h3 className="font-serif italic text-base font-semibold text-[#1A1A1A]">
              Atendimentos por Dia
            </h3>
            <p className="text-[10px] text-[#707060]">Comparativo semanal de consultas finalizadas/agendadas</p>
          </div>

          {/* Simple and elegant bar display chart */}
          <div className="h-44 flex items-end gap-5 justify-between pt-6 border-b border-[#F5F5F0]">
            {appointmentsByDay.map(day => {
              const maxCount = Math.max(...appointmentsByDay.map(d => d.count), 1);
              const barHeightPct = Math.round((day.count / maxCount) * 100);
              
              return (
                <div key={day.name} className="flex-1 flex flex-col items-center gap-2 group h-full justify-end">
                  {/* Tooltip on hover */}
                  <div className="bg-[#1A1A1A] text-white text-[9px] font-bold px-1.5 py-0.5 rounded opacity-0 group-hover:opacity-100 transition-all transform translate-y-1 group-hover:-translate-y-1 pointer-events-none font-mono">
                    {day.count}
                  </div>
                  
                  {/* Dynamic height bar */}
                  <div 
                    className="w-full bg-[#5A5A40]/10 group-hover:bg-[#5A5A40]/30 rounded-t-lg transition-all relative overflow-hidden"
                    style={{ height: `${Math.max(10, barHeightPct * 0.7)}%` }}
                  >
                    <div 
                      className="absolute inset-x-0 bottom-0 bg-[#5A5A40] transition-all rounded-t-lg"
                      style={{ height: "100%" }}
                    />
                  </div>
                  
                  <span className="text-[10px] text-[#707060] font-bold">{day.name}</span>
                </div>
              );
            })}
          </div>
          
          <div className="text-[10px] text-[#A0A090] text-center italic">
            * Contagem total de atendimentos ativos da semana atual.
          </div>
        </div>

        {/* Chart 2: Distruição de Status (Visual segmented ring representation) */}
        <div className="bg-white border border-[#E5E5E0] rounded-3xl p-6 shadow-sm space-y-4">
          <div>
            <h3 className="font-serif italic text-base font-semibold text-[#1A1A1A]">
              Status dos Agendamentos
            </h3>
            <p className="text-[10px] text-[#707060]">Status geral no período analisado</p>
          </div>

          {/* Segmented Progress Stack */}
          <div className="space-y-3 pt-4">
            <div className="h-4 w-full rounded-full bg-[#F5F5F0] overflow-hidden flex">
              {statusDistribution.map(item => {
                const totalCount = statusDistribution.reduce((s,i) => s + i.count, 0) || 1;
                const widthPct = Math.round((item.count / totalCount) * 100);
                return (
                  <div 
                    key={item.label}
                    className={`${item.color} h-full transition-all`}
                    style={{ width: `${widthPct}%` }}
                    title={`${item.label}: ${item.count}`}
                  />
                );
              })}
            </div>

            <div className="grid grid-cols-2 gap-2 text-[10px] pt-2">
              {statusDistribution.map(item => {
                const totalCount = statusDistribution.reduce((s,i) => s + i.count, 0) || 1;
                const widthPct = Math.round((item.count / totalCount) * 100);
                return (
                  <div key={item.label} className="flex items-center gap-2">
                    <span className={`w-2.5 h-2.5 rounded-full ${item.color}`} />
                    <span className="font-semibold text-[#1A1A1A]">{item.label}</span>
                    <span className="text-[#707060]">({widthPct}%)</span>
                  </div>
                );
              })}
            </div>
          </div>

          {statusDistribution.length === 0 && (
            <div className="text-center py-6 text-xs text-[#A0A090] italic">
              Sem dados de status no período filtrado.
            </div>
          )}
        </div>

        {/* Chart 3: Tipos de Consulta Comuns & Horários de Maior Movimento */}
        <div className="bg-white border border-[#E5E5E0] rounded-3xl p-6 shadow-sm space-y-5">
          <div>
            <h3 className="font-serif italic text-base font-semibold text-[#1A1A1A]">
              Especialidades & Horários
            </h3>
            <p className="text-[10px] text-[#707060]">Preferência de agendamentos e horários pico</p>
          </div>

          <div className="space-y-3.5">
            {/* Top types */}
            <div className="space-y-2">
              <p className="text-[9px] font-bold text-[#C17A63] uppercase tracking-wider">Atendimentos mais Comuns</p>
              {typeDistribution.slice(0, 3).map(item => (
                <div key={item.type} className="space-y-1">
                  <div className="flex justify-between text-[10px] font-semibold">
                    <span className="text-[#1A1A1A]">{item.type}</span>
                    <span className="text-[#707060]">{item.count}</span>
                  </div>
                  <div className="h-1.5 w-full bg-[#F5F5F0] rounded-full overflow-hidden">
                    <div className="bg-[#C17A63] h-full rounded-full" style={{ width: `${item.percentage}%` }} />
                  </div>
                </div>
              ))}
              {typeDistribution.length === 0 && (
                <p className="text-xs text-[#A0A090] italic">Sem dados registrados.</p>
              )}
            </div>

            {/* Peak Hours display */}
            <div className="pt-2 border-t border-[#F5F5F0]">
              <p className="text-[9px] font-bold text-[#5A5A40] uppercase tracking-wider mb-2">Horários mais Movimentados</p>
              <div className="flex gap-1.5 overflow-x-auto pb-1">
                {hoursDistribution.map(h => {
                  const max = Math.max(...hoursDistribution.map(d => d.count), 1);
                  const isPeak = h.count === max;
                  return (
                    <div 
                      key={h.hour} 
                      className={`px-2 py-1.5 rounded-xl border text-center shrink-0 min-w-[50px] transition-all ${
                        isPeak 
                          ? "bg-[#5A5A40] text-white border-[#5A5A40]" 
                          : h.count > 0 
                            ? "bg-[#F2F2E9] text-[#5A5A40] border-[#E5E5D8]" 
                            : "bg-transparent text-[#A0A090] border-[#E5E5E0] border-dashed"
                      }`}
                    >
                      <p className="text-[9px] font-bold font-mono">{h.hour}</p>
                      <p className="text-[10px] font-extrabold mt-0.5">{h.count}</p>
                    </div>
                  );
                })}
              </div>
            </div>

          </div>
        </div>

      </div>

      {/* DETAILED STATS PER PROFESSIONAL TABLE & COMPARISONS */}
      {currentUser.role !== "Doutora" && (
        <div className="bg-white border border-[#E5E5E0] rounded-3xl p-6 shadow-sm space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-[#F5F5F0] pb-4">
            <div>
              <h3 className="font-serif italic text-lg font-semibold text-[#1A1A1A] flex items-center gap-2">
                <Award className="w-5 h-5 text-[#C17A63]" />
                <span>Desempenho por Dentista</span>
              </h3>
              <p className="text-xs text-[#707060]">Tabela comparativa direta de produtividade e atendimento clínico</p>
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="border-b border-[#E5E5E0] text-[10px] font-bold text-[#707060] uppercase tracking-wider bg-[#FBFBFA]">
                  <th className="py-3 px-4">Profissional</th>
                  <th className="py-3 px-4 text-center">Atendidos</th>
                  <th className="py-3 px-4 text-center">Confirmados</th>
                  <th className="py-3 px-4 text-center">Faltas</th>
                  <th className="py-3 px-4 text-center">Cancelados</th>
                  <th className="py-3 px-4 text-center">Ocupação</th>
                  <th className="py-3 px-4 text-center">Novos Pacs</th>
                  <th className="py-3 px-4 text-right">Tempo Atendendo</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#F5F5F0]">
                {professionalsBreakdown.map(prof => (
                  <tr key={prof.id} className="hover:bg-[#FBFBFA]/60 transition-all">
                    <td className="py-3.5 px-4">
                      <div className="flex items-center gap-2.5">
                        <span className="w-3 h-3 rounded-full shrink-0" style={{ backgroundColor: prof.color }} />
                        <div>
                          <p className="font-bold text-[#1A1A1A]">{prof.name}</p>
                          <p className="text-[9px] text-[#707060] font-medium">{prof.specialty}</p>
                        </div>
                      </div>
                    </td>
                    <td className="py-3.5 px-4 text-center font-semibold text-emerald-700">
                      {prof.atendidos}
                    </td>
                    <td className="py-3.5 px-4 text-center font-semibold text-blue-600">
                      {prof.confirmados}
                    </td>
                    <td className="py-3.5 px-4 text-center font-semibold text-amber-700">
                      {prof.faltas}
                    </td>
                    <td className="py-3.5 px-4 text-center font-semibold text-rose-600">
                      {prof.cancelados}
                    </td>
                    <td className="py-3.5 px-4 text-center">
                      <div className="flex items-center justify-center gap-1.5">
                        <span className="font-bold">{prof.occupancy}%</span>
                        <div className="w-8 h-1 bg-[#F5F5F0] rounded-full overflow-hidden hidden sm:block">
                          <div className="bg-[#C17A63] h-full" style={{ width: `${prof.occupancy}%` }} />
                        </div>
                      </div>
                    </td>
                    <td className="py-3.5 px-4 text-center font-bold">
                      {prof.novos}
                    </td>
                    <td className="py-3.5 px-4 text-right font-mono font-bold text-[#5A5A40]">
                      {Math.floor(prof.totalMinutes / 60)}h {prof.totalMinutes % 60}m
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Cards detail for mobile */}
          <div className="block lg:hidden space-y-4">
            {professionalsBreakdown.map(prof => (
              <div key={prof.id} className="border border-[#F0F0E8] rounded-2xl p-4 space-y-3 bg-[#FBFBFA]">
                <div className="flex items-center gap-2 pb-2 border-b border-[#F0F0E8]">
                  <span className="w-3 h-3 rounded-full" style={{ backgroundColor: prof.color }} />
                  <span className="font-bold text-xs">{prof.name}</span>
                </div>
                <div className="grid grid-cols-2 gap-2 text-[11px] text-[#707060]">
                  <p>Atendidos: <strong className="text-emerald-700">{prof.atendidos}</strong></p>
                  <p>Confirmados: <strong className="text-blue-600">{prof.confirmados}</strong></p>
                  <p>Faltas: <strong className="text-amber-700">{prof.faltas}</strong></p>
                  <p>Cancelados: <strong className="text-rose-600">{prof.cancelados}</strong></p>
                  <p>Ocupação: <strong>{prof.occupancy}%</strong></p>
                  <p>Retornos: <strong>{prof.retornos}</strong></p>
                  <p>Tempo total: <strong>{Math.floor(prof.totalMinutes / 60)}h {prof.totalMinutes % 60}m</strong></p>
                  <p>Tempo Médio/Atend: <strong>{prof.avgDuration} min</strong></p>
                </div>
              </div>
            ))}
          </div>

        </div>
      )}

    </div>
  );
}
