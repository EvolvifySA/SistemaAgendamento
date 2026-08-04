import React, { useState, useEffect } from "react";
import { Appointment, Patient, AppointmentStatus, Professional, SystemUser, ClinicSettings } from "../types";
import { CalInlineEmbed } from "./CalInlineEmbed";
import { 
  Calendar, 
  Clock, 
  Phone, 
  User, 
  Plus, 
  FileText, 
  CheckCircle, 
  AlertTriangle, 
  XCircle, 
  RotateCcw, 
  Sparkles,
  Info,
  ChevronLeft,
  ChevronRight,
  Search,
  Check,
  X,
  CalendarDays,
  MoreVertical,
  Activity,
  Trash2,
  Filter,
  Briefcase,
  Stethoscope
} from "lucide-react";

interface ScheduleViewProps {
  appointments: Appointment[];
  patients: Patient[];
  professionals: Professional[];
  currentUser: SystemUser;
  settings: ClinicSettings;
  dataMode: "production" | "demo";
  onAddAppointment: (app: Omit<Appointment, "id">) => void;
  onUpdateAppointmentStatus: (id: string, status: AppointmentStatus, notes?: string) => void;
  onUpdateAppointment?: (updated: Appointment) => void;
  onOpenNewPatient: () => void;
  selectedAppointmentFromDashboard: Appointment | null;
  clearSelectedAppointmentFromDashboard: () => void;
}

export const ScheduleView: React.FC<ScheduleViewProps> = ({
  appointments,
  patients,
  professionals,
  currentUser,
  settings,
  dataMode,
  onAddAppointment,
  onUpdateAppointmentStatus,
  onUpdateAppointment,
  onOpenNewPatient,
  selectedAppointmentFromDashboard,
  clearSelectedAppointmentFromDashboard
}) => {
  // Calendar View Mode: "mes" | "semana" | "dia"
  const [viewMode, setViewMode] = useState<"mes" | "semana" | "dia">("semana");

  const [currentDate, setCurrentDate] = useState<Date>(new Date());

  // Right sidebar details panel state
  const [selectedApp, setSelectedApp] = useState<Appointment | null>(null);

  // Find matching doctor for logged-in user if they are doctor
  const defaultProfId = React.useMemo(() => {
    if (currentUser && currentUser.role === "Doutora") {
      const match = professionals.find(p => p.email === currentUser.email);
      return match ? match.id : "todas";
    }
    return "todas";
  }, [currentUser, professionals]);

  // Professional filter for the schedule view
  const [selectedProfFilter, setSelectedProfFilter] = useState<string>("todas");

  // Sync default professional filter
  useEffect(() => {
    if (defaultProfId !== "todas") {
      setSelectedProfFilter(defaultProfId);
    }
  }, [defaultProfId]);

  // Local search filter for the agenda
  const [searchTerm, setSearchTerm] = useState("");

  // Resizing state
  const [resizingApp, setResizingApp] = useState<{
    id: string;
    initialY: number;
    initialDuration: number;
    currentDuration: number;
    view: "semana" | "dia";
  } | null>(null);

  const handleMouseDown = (e: React.MouseEvent, app: Appointment, view: "semana" | "dia") => {
    e.stopPropagation();
    e.preventDefault();
    setResizingApp({
      id: app.id,
      initialY: e.clientY,
      initialDuration: app.duration || 30,
      currentDuration: app.duration || 30,
      view
    });
  };

  useEffect(() => {
    if (!resizingApp) return;

    const handleMouseMove = (e: MouseEvent) => {
      const deltaY = e.clientY - resizingApp.initialY;
      // In weekly view: HOUR_ROW_HEIGHT = 80 pixels for 60 minutes
      // In daily view: DAY_ROW_HEIGHT = 140 pixels for 60 minutes
      const rowHeight = resizingApp.view === "semana" ? 80 : 140;
      const minutesPerPixel = 60 / rowHeight;
      const deltaMinutes = deltaY * minutesPerPixel;
      
      let newDuration = resizingApp.initialDuration + deltaMinutes;
      newDuration = Math.round(newDuration / 15) * 15;
      newDuration = Math.max(15, Math.min(240, newDuration));
      
      if (newDuration !== resizingApp.currentDuration) {
        setResizingApp(prev => prev ? { ...prev, currentDuration: newDuration } : null);
      }
    };

    const handleMouseUp = () => {
      const app = appointments.find(a => a.id === resizingApp.id);
      if (app && resizingApp.currentDuration !== resizingApp.initialDuration) {
        const newEndTime = calculateEndTime(app.time, resizingApp.currentDuration);
        
        const overlapApp = appointments.find(other => {
          if (other.id === app.id || other.date !== app.date || other.status === "Cancelado") return false;
          if (other.professionalId !== app.professionalId) return false;
          const startA = minutesSinceMidnight(app.time);
          const endA = startA + resizingApp.currentDuration;
          const startB = minutesSinceMidnight(other.time);
          const endB = minutesSinceMidnight(other.endTime || calculateEndTime(other.time, other.duration || 30));
          return startA < endB && endA > startB;
        });

        if (overlapApp) {
          alert(`⚠️ Conflito de Horário: Não foi possível redimensionar. O novo horário conflita com a consulta de ${overlapApp.patientName} (${overlapApp.time} às ${overlapApp.endTime || calculateEndTime(overlapApp.time, overlapApp.duration || 30)}).`);
        } else {
          if (onUpdateAppointment) {
            onUpdateAppointment({
              ...app,
              duration: resizingApp.currentDuration,
              endTime: newEndTime
            });
          }
        }
      }
      setResizingApp(null);
    };

    window.addEventListener("mousemove", handleMouseMove);
    window.addEventListener("mouseup", handleMouseUp);

    return () => {
      window.removeEventListener("mousemove", handleMouseMove);
      window.removeEventListener("mouseup", handleMouseUp);
    };
  }, [resizingApp, appointments, onUpdateAppointment]);

  // Drag and drop appointment state
  const [draggingApp, setDraggingApp] = useState<Appointment | null>(null);
  const [dragOverSlot, setDragOverSlot] = useState<{ date: string; time: string } | null>(null);

  const handleDragStart = (e: React.DragEvent, app: Appointment) => {
    setDraggingApp(app);
    e.dataTransfer.effectAllowed = "move";
    e.dataTransfer.setData("text/plain", app.id);
    
    // Slight opacity while dragging
    const target = e.currentTarget as HTMLElement;
    if (target) {
      target.style.opacity = "0.5";
    }
  };

  const handleDragEnd = (e: React.DragEvent) => {
    setDraggingApp(null);
    setDragOverSlot(null);
    const target = e.currentTarget as HTMLElement;
    if (target) {
      target.style.opacity = "";
    }
  };

  const handleDragOver = (e: React.DragEvent, dateStr: string, slotTime: string) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = "move";
    
    if (!dragOverSlot || dragOverSlot.date !== dateStr || dragOverSlot.time !== slotTime) {
      setDragOverSlot({ date: dateStr, time: slotTime });
    }
  };

  const handleDragLeave = (e: React.DragEvent) => {
    // Normal drag leave
  };

  const handleDrop = (e: React.DragEvent, dateStr: string, slotTime: string) => {
    e.preventDefault();
    setDragOverSlot(null);
    
    const appId = e.dataTransfer.getData("text/plain") || (draggingApp ? draggingApp.id : null);
    if (!appId) return;

    const app = appointments.find(a => a.id === appId);
    if (!app) return;

    // Same slot
    if (app.date === dateStr && app.time === slotTime) return;

    const duration = app.duration || 30;
    const newEndTime = calculateEndTime(slotTime, duration);

    // Check overlap for the same professional on the target date
    const overlapApp = appointments.find(other => {
      if (other.id === app.id || other.date !== dateStr || other.status === "Cancelado") return false;
      if (other.professionalId !== app.professionalId) return false;
      
      const startA = minutesSinceMidnight(slotTime);
      const endA = startA + duration;
      const startB = minutesSinceMidnight(other.time);
      const endB = minutesSinceMidnight(other.endTime || calculateEndTime(other.time, other.duration || 30));
      
      return startA < endB && endA > startB;
    });

    if (overlapApp) {
      const overlapEnd = overlapApp.endTime || calculateEndTime(overlapApp.time, overlapApp.duration || 30);
      alert(`⚠️ Conflito de Horário: Não foi possível mover a consulta. O novo horário (${slotTime} às ${newEndTime}) conflita com a consulta de ${overlapApp.patientName} (${overlapApp.time} às ${overlapEnd}).`);
      return;
    }

    if (onUpdateAppointment) {
      onUpdateAppointment({
        ...app,
        date: dateStr,
        time: slotTime,
        endTime: newEndTime
      });
    }
  };

  // New appointment form state
  const [showNewAppModal, setShowNewAppModal] = useState(false);
  const [formProfessionalId, setFormProfessionalId] = useState("");
  const [formPatientId, setFormPatientId] = useState("");
  const [formPhone, setFormPhone] = useState("");
  const [formDate, setFormDate] = useState(() => new Date().toISOString().slice(0, 10));
  const [formTime, setFormTime] = useState("09:00");
  const [formType, setFormType] = useState("Primeira Consulta");
  const [formNotes, setFormNotes] = useState("");
  const [formStatus, setFormStatus] = useState<AppointmentStatus>("Agendado");
  const [formDuration, setFormDuration] = useState<number>(30);
  const [formEndTime, setFormEndTime] = useState<string>("09:30");

  const minutesSinceMidnight = (timeStr: string): number => {
    if (!timeStr) return 0;
    const [h, m] = timeStr.split(":").map(Number);
    return (h || 0) * 60 + (m || 0);
  };

  const calculateEndTime = (startTimeStr: string, durationMin: number): string => {
    if (!startTimeStr) return "";
    const [h, m] = startTimeStr.split(":").map(Number);
    if (isNaN(h) || isNaN(m)) return "";
    let totalMin = h * 60 + m + durationMin;
    totalMin = totalMin % (24 * 60);
    const endH = Math.floor(totalMin / 60);
    const endM = totalMin % 60;
    return `${String(endH).padStart(2, "0")}:${String(endM).padStart(2, "0")}`;
  };

  const calculateDuration = (startTimeStr: string, endTimeStr: string): number => {
    const s = minutesSinceMidnight(startTimeStr);
    const e = minutesSinceMidnight(endTimeStr);
    return Math.max(0, e - s);
  };

  const handleStartTimeChange = (newStartTime: string) => {
    setFormTime(newStartTime);
    const calculatedEnd = calculateEndTime(newStartTime, formDuration);
    setFormEndTime(calculatedEnd);
  };

  const handleDurationChange = (newDuration: number) => {
    setFormDuration(newDuration);
    const calculatedEnd = calculateEndTime(formTime, newDuration);
    setFormEndTime(calculatedEnd);
  };

  const handleEndTimeChange = (newEndTime: string) => {
    setFormEndTime(newEndTime);
    const calculatedDur = calculateDuration(formTime, newEndTime);
    if (calculatedDur > 0) {
      setFormDuration(calculatedDur);
    }
  };

  const HOUR_ROW_HEIGHT = 80;

  const getMinutesFromStart = (timeStr: string): number => {
    if (!timeStr) return 0;
    const [h, m] = timeStr.split(":").map(Number);
    const minutes = (h || 0) * 60 + (m || 0);
    const startWorkMinutes = 8 * 60; // 08:00
    return Math.max(0, minutes - startWorkMinutes);
  };

  interface PositionedAppointment extends Appointment {
    top: number;
    height: number;
    width: string;
    left: string;
  }

  const getPositionedAppointments = (dayApps: Appointment[], hourRowHeight: number): PositionedAppointment[] => {
    const getMinutes = (timeStr: string) => {
      if (!timeStr) return 0;
      const [h, m] = timeStr.split(":").map(Number);
      return (h || 0) * 60 + (m || 0);
    };

    const getAppDuration = (app: Appointment) => {
      if (resizingApp && resizingApp.id === app.id) {
        return resizingApp.currentDuration;
      }
      return app.duration || 30;
    };

    const sorted = [...dayApps].sort((a, b) => getMinutes(a.time) - getMinutes(b.time));

    const groups: Appointment[][] = [];
    
    for (const app of sorted) {
      const start = getMinutes(app.time);
      const end = start + getAppDuration(app);
      
      let placed = false;
      for (const group of groups) {
        const overlaps = group.some(other => {
          const otherStart = getMinutes(other.time);
          const otherEnd = otherStart + getAppDuration(other);
          return start < otherEnd && end > otherStart;
        });
        
        if (overlaps) {
          group.push(app);
          placed = true;
          break;
        }
      }
      
      if (!placed) {
        groups.push([app]);
      }
    }

    const result: PositionedAppointment[] = [];
    
    for (const group of groups) {
      const columns: Appointment[][] = [];
      
      for (const app of group) {
        const start = getMinutes(app.time);
        
        let colIdx = 0;
        while (true) {
          if (!columns[colIdx]) {
            columns[colIdx] = [app];
            break;
          }
          const overlapsInCol = columns[colIdx].some(other => {
            const otherStart = getMinutes(other.time);
            const otherEnd = otherStart + getAppDuration(other);
            return start < otherEnd && (start + getAppDuration(app)) > otherStart;
          });
          
          if (!overlapsInCol) {
            columns[colIdx].push(app);
            break;
          }
          colIdx++;
        }
      }

      const totalCols = columns.length;
      
      for (let colIdx = 0; colIdx < totalCols; colIdx++) {
        for (const app of columns[colIdx]) {
          const startMin = getMinutesFromStart(app.time);
          const duration = getAppDuration(app);
          
          const top = (startMin / 60) * hourRowHeight;
          const height = (duration / 60) * hourRowHeight;
          
          const widthVal = 100 / totalCols;
          const leftVal = colIdx * widthVal;
          
          result.push({
            ...app,
            top,
            height,
            width: totalCols > 1 ? `${widthVal - 1}%` : "100%",
            left: `${leftVal}%`,
          });
        }
      }
    }
    
    return result;
  };

  const isSlotCovered = (dateStr: string, slotTime: string): boolean => {
    return filteredAppointments.some(app => {
      if (app.date !== dateStr || app.status === "Cancelado") return false;
      const [sh, sm] = app.time.split(":").map(Number);
      const start = sh * 60 + sm;
      const end = start + (app.duration || 30);
      
      const [sth, stm] = slotTime.split(":").map(Number);
      const slotMin = sth * 60 + stm;
      
      return slotMin >= start && slotMin < end;
    });
  };

  // Custom visual confirmation modal state
  const [confirmModal, setConfirmModal] = useState<{
    isOpen: boolean;
    type: "cancel" | "absent";
    appointmentId: string;
    patientName: string;
  } | null>(null);

  // Auto pre-populate formProfessionalId and its defaults when modal opens
  useEffect(() => {
    if (showNewAppModal) {
      if (selectedProfFilter && selectedProfFilter !== "todas") {
        setFormProfessionalId(selectedProfFilter);
        const prof = professionals.find(p => p.id === selectedProfFilter);
        if (prof) {
          setFormDuration(prof.defaultDuration);
          setFormEndTime(calculateEndTime(formTime, prof.defaultDuration));
        }
      } else {
        const firstActive = professionals.find(p => p.active);
        if (firstActive) {
          setFormProfessionalId(firstActive.id);
          setFormDuration(firstActive.defaultDuration);
          setFormEndTime(calculateEndTime(formTime, firstActive.defaultDuration));
        }
      }
    }
  }, [showNewAppModal, formTime, selectedProfFilter, professionals]);

  // Handle selected appointment from dashboard transition
  useEffect(() => {
    if (selectedAppointmentFromDashboard) {
      setSelectedApp(selectedAppointmentFromDashboard);
      // Parse its date to set calendar focus
      const parts = selectedAppointmentFromDashboard.date.split("-").map(Number);
      if (parts.length === 3) {
        setCurrentDate(new Date(parts[0], parts[1] - 1, parts[2]));
      }
      setViewMode("dia"); // switch to daily mode to view it properly
      clearSelectedAppointmentFromDashboard();
    }
  }, [selectedAppointmentFromDashboard]);

  // Sync details sidebar if appointment list updates
  useEffect(() => {
    if (selectedApp) {
      const fresh = appointments.find(a => a.id === selectedApp.id);
      if (fresh) {
        setSelectedApp(fresh);
      }
    }
  }, [appointments]);

  const filteredAppointments = React.useMemo(() => {
    return appointments.filter(app => {
      if (selectedProfFilter !== "todas" && app.professionalId !== selectedProfFilter) {
        return false;
      }
      return true;
    });
  }, [appointments, selectedProfFilter]);

  const selectedEmbedProfessional = React.useMemo(() => {
    if (selectedProfFilter !== "todas") {
      return professionals.find(p => p.id === selectedProfFilter);
    }
    return professionals.find(p => p.active);
  }, [professionals, selectedProfFilter]);

  const [visitedEmbedProfessionalIds, setVisitedEmbedProfessionalIds] = useState<string[]>([]);
  const activeProfessionals = React.useMemo(() => professionals.filter(p => p.active), [professionals]);

  useEffect(() => {
    if (!selectedEmbedProfessional?.id) return;
    setVisitedEmbedProfessionalIds((current) =>
      current.includes(selectedEmbedProfessional.id) ? current : [...current, selectedEmbedProfessional.id]
    );
  }, [selectedEmbedProfessional?.id]);

  const mountedEmbedProfessionals = React.useMemo(() => {
    return activeProfessionals.filter((professional) =>
      professional.id === selectedEmbedProfessional?.id || visitedEmbedProfessionalIds.includes(professional.id)
    );
  }, [activeProfessionals, selectedEmbedProfessional?.id, visitedEmbedProfessionalIds]);

  const openCalBooking = (professionalId?: string) => {
    const targetProfessionalId =
      professionalId ||
      (selectedProfFilter !== "todas" ? selectedProfFilter : selectedEmbedProfessional?.id);

    if (targetProfessionalId) {
      setSelectedProfFilter(targetProfessionalId);
    }

    window.setTimeout(() => {
      document.getElementById("cal-official-booking")?.scrollIntoView({ behavior: "smooth", block: "start" });
    }, 80);
  };

  // Date Formatting Helpers
  const formatISO = (date: Date): string => {
    const y = date.getFullYear();
    const m = String(date.getMonth() + 1).padStart(2, "0");
    const d = String(date.getDate()).padStart(2, "0");
    return `${y}-${m}-${d}`;
  };

  const getPortugueseMonthName = (monthIndex: number): string => {
    const months = [
      "Janeiro", "Fevereiro", "Março", "Abril", "Maio", "Junho",
      "Julho", "Agosto", "Setembro", "Outubro", "Novembro", "Dezembro"
    ];
    return months[monthIndex];
  };

  const WEEK_DAYS_LABEL = ["Domingo", "Segunda", "Terça", "Quarta", "Quinta", "Sexta", "Sábado"];
  const WEEK_DAYS_SHORT = ["Dom", "Seg", "Ter", "Qua", "Qui", "Sex", "Sáb"];

  // Hours array for vertical timeline (08:00 to 18:00)
  const HOURS_TIMELINE = [
    "08:00", "09:00", "10:00", "11:00", "12:00", "13:00", "14:00", "15:00", "16:00", "17:00", "18:00"
  ];

  // 30-minute intervals for Daily Timeline
  const DAILY_30MIN_SLOTS = [
    "08:00", "08:30", "09:00", "09:30", "10:00", "10:30", "11:00", "11:30", "12:00", "12:30",
    "13:00", "13:30", "14:00", "14:30", "15:00", "15:30", "16:00", "16:30", "17:00", "17:30", "18:00"
  ];

  // Navigation Logic
  const handlePrev = () => {
    if (viewMode === "mes") {
      setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() - 1, 1));
    } else if (viewMode === "semana") {
      const d = new Date(currentDate);
      d.setDate(currentDate.getDate() - 7);
      setCurrentDate(d);
    } else {
      const d = new Date(currentDate);
      d.setDate(currentDate.getDate() - 1);
      setCurrentDate(d);
    }
  };

  const handleNext = () => {
    if (viewMode === "mes") {
      setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 1));
    } else if (viewMode === "semana") {
      const d = new Date(currentDate);
      d.setDate(currentDate.getDate() + 7);
      setCurrentDate(d);
    } else {
      const d = new Date(currentDate);
      d.setDate(currentDate.getDate() + 1);
      setCurrentDate(d);
    }
  };

  const handleToday = () => {
    setCurrentDate(new Date());
  };

  // Filter Appointments with search term
  const filterBySearch = (list: Appointment[]) => {
    if (!searchTerm.trim()) return list;
    const term = searchTerm.toLowerCase();
    return list.filter(app => {
      const patientNameMatch = (app.patientName || "").toLowerCase().includes(term);
      const patientPhoneMatch = (app.patientPhone || "").toLowerCase().includes(term);
      const typeMatch = (app.type || "").toLowerCase().includes(term);
      const notesMatch = (app.notes || "").toLowerCase().includes(term);
      const statusMatch = (app.status || "").toLowerCase().includes(term);
      
      const prof = professionals.find(p => p.id === app.professionalId);
      const profNameMatch = prof ? (prof.name || "").toLowerCase().includes(term) || (prof.specialty || "").toLowerCase().includes(term) : false;
      
      return patientNameMatch || patientPhoneMatch || typeMatch || notesMatch || statusMatch || profNameMatch;
    });
  };

  // Status visual color styling lookup
  const getStatusStyle = (status: AppointmentStatus) => {
    switch (status) {
      case "Livre":
        return {
          bg: "bg-[#F5F5F0]",
          border: "border-[#E5E5E0]",
          text: "text-[#707060]",
          dot: "bg-[#707060]"
        };
      case "Agendado":
        return {
          bg: "bg-[#FCF6E5]",
          border: "border-[#EAD5A0]",
          text: "text-[#8C6D23]",
          dot: "bg-[#C19A37]"
        };
      case "Confirmado":
        return {
          bg: "bg-[#EDF6ED]",
          border: "border-[#C3E4C3]",
          text: "text-[#2E602E]",
          dot: "bg-green-600"
        };
      case "Atendido":
        return {
          bg: "bg-[#EEF4F8]",
          border: "border-[#CADCEB]",
          text: "text-[#244E72]",
          dot: "bg-blue-600"
        };
      case "Cancelado":
        return {
          bg: "bg-[#FDF2F2]",
          border: "border-[#F8D7D7]",
          text: "text-[#9B2C2C] line-through",
          dot: "bg-red-500"
        };
      case "Faltou":
        return {
          bg: "bg-[#FFF5EE]",
          border: "border-[#FCD9C3]",
          text: "text-[#A0522D]",
          dot: "bg-orange-500"
        };
      default:
        return {
          bg: "bg-[#F5F5F0]",
          border: "border-[#E5E5E0]",
          text: "text-[#707060]",
          dot: "bg-gray-400"
        };
    }
  };

  // Patient helper for warning or vital notes
  const getPatientInfo = (patientId: string): Patient | undefined => {
    return patients.find(p => p.id === patientId);
  };

  // Handle patient select in booking modal form
  const handleSelectPatientInForm = (patientId: string) => {
    setFormPatientId(patientId);
    const pat = patients.find(p => p.id === patientId);
    if (pat) {
      setFormPhone(pat.phone);
    }
  };

  // Trigger visual confirmations
  const triggerCancelConfirmation = (id: string, name: string) => {
    setConfirmModal({
      isOpen: true,
      type: "cancel",
      appointmentId: id,
      patientName: name
    });
  };

  const triggerAbsentConfirmation = (id: string, name: string) => {
    setConfirmModal({
      isOpen: true,
      type: "absent",
      appointmentId: id,
      patientName: name
    });
  };

  // Immediate Quick Status updates
  const handleConfirmStatus = (id: string) => {
    onUpdateAppointmentStatus(id, "Confirmado");
  };

  const handleAttendedStatus = (id: string) => {
    onUpdateAppointmentStatus(id, "Atendido");
  };

  // Return appointments are created in Cal.com; local calendar only reflects synced bookings.
  const handleScheduleReturn = (app: Appointment) => {
    openCalBooking(app.professionalId);
  };

  // Rescheduling starts from the official Cal.com flow.
  const handleRemarcarWizard = (app: Appointment) => {
    openCalBooking(app.professionalId);
  };

  // Submit New Appointment form
  const handleCreateAppointment = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formPatientId) {
      alert("Por favor, selecione um paciente cadastrado.");
      return;
    }

    const patient = patients.find(p => p.id === formPatientId);
    if (!patient) return;

    // Validate end time is greater than start time
    const startM = minutesSinceMidnight(formTime);
    const endM = minutesSinceMidnight(formEndTime);
    if (endM <= startM) {
      alert("⚠️ Erro: O horário de fim deve ser estritamente maior que o horário de início.");
      return;
    }

    if (!formProfessionalId) {
      alert("⚠️ Por favor, selecione a profissional responsável pelo atendimento.");
      return;
    }

    // Check collision / overlap with another active (non-cancelled) appointment for the same professional in the same period
    const overlapApp = appointments.find(app => {
      if (app.date !== formDate || app.status === "Cancelado") return false;
      if (app.professionalId !== formProfessionalId) return false;
      const startA = minutesSinceMidnight(formTime);
      const endA = minutesSinceMidnight(formEndTime);
      const startB = minutesSinceMidnight(app.time);
      const endB = minutesSinceMidnight(app.endTime || calculateEndTime(app.time, app.duration || 30));
      return startA < endB && endA > startB;
    });

    if (overlapApp) {
      alert("⚠️ Erro de Agendamento: Já existe uma consulta agendada para este horário com esta profissional.");
      return;
    }

    onAddAppointment({
      patientId: formPatientId,
      patientName: patient.name,
      patientPhone: formPhone || patient.phone,
      date: formDate,
      time: formTime,
      endTime: formEndTime,
      duration: formDuration,
      type: formType,
      status: formStatus,
      notes: formNotes,
      professionalId: formProfessionalId
    });

    setShowNewAppModal(false);
    // Reset fields
    setFormPatientId("");
    setFormPhone("");
    setFormNotes("");
    setFormTime("09:00");
    setFormDuration(30);
    setFormEndTime("09:30");
    alert("✨ Agendamento salvo com sucesso!");
  };

  // ==========================================
  // RENDER 1: VISUALIZAÇÃO MENSAL
  // ==========================================
  const renderMonthView = () => {
    const year = currentDate.getFullYear();
    const month = currentDate.getMonth();

    const firstDay = new Date(year, month, 1);
    const startWeekday = firstDay.getDay(); // 0 is Sunday
    const totalDays = new Date(year, month + 1, 0).getDate();

    const cells: (Date | null)[] = [];
    // Padding for previous month
    for (let i = 0; i < startWeekday; i++) {
      cells.push(null);
    }
    // Days of active month
    for (let d = 1; d <= totalDays; d++) {
      cells.push(new Date(year, month, d));
    }

    // Filter appointments of this month
    const monthPrefix = `${year}-${String(month + 1).padStart(2, "0")}`;

    return (
      <div className="bg-white rounded-[32px] border border-[#E5E5E0] shadow-sm overflow-hidden animate-fade-in">
        {/* Calendar Grid Header */}
        <div className="grid grid-cols-7 border-b border-[#F0F0E8] bg-[#FBFBFA]">
          {WEEK_DAYS_SHORT.map(label => (
            <div key={label} className="py-3 text-center text-[10px] font-bold text-[#707060] uppercase tracking-wider">
              {label}
            </div>
          ))}
        </div>

        {/* Days cells */}
        <div className="grid grid-cols-7 divide-x divide-y divide-[#F0F0E8] border-b border-[#F0F0E8]">
          {cells.map((day, idx) => {
            if (!day) {
              return <div key={`empty-${idx}`} className="h-32 bg-[#FBFBFA]/40"></div>;
            }

            const dateStr = formatISO(day);
            const dayAppointments = filterBySearch(filteredAppointments.filter(app => app.date === dateStr && app.status !== "Cancelado"));
            const totalCount = dayAppointments.length;
            const displayedApps = dayAppointments.slice(0, 3);
            const isToday = dateStr === formatISO(new Date());

            const isTargeted = dragOverSlot && dragOverSlot.date === dateStr;

            return (
              <div 
                key={dateStr}
                className={`h-32 p-2 flex flex-col justify-between hover:bg-[#FBFBFA] transition-all relative cursor-pointer ${
                  isToday ? "bg-[#F2F2E9]/40 border-t-2 border-t-[#5A5A40]" : ""
                } ${
                  isTargeted ? "bg-[#5A5A40]/15 border-2 border-dashed border-[#5A5A40]/30 z-10" : ""
                }`}
                onClick={() => {
                  setCurrentDate(day);
                  setViewMode("dia");
                }}
                onDragOver={(e) => {
                  e.preventDefault();
                  if (!dragOverSlot || dragOverSlot.date !== dateStr) {
                    setDragOverSlot({ date: dateStr, time: draggingApp ? draggingApp.time : "09:00" });
                  }
                }}
                onDrop={(e) => {
                  e.preventDefault();
                  setDragOverSlot(null);
                  const appId = e.dataTransfer.getData("text/plain") || (draggingApp ? draggingApp.id : null);
                  if (!appId) return;

                  const app = appointments.find(a => a.id === appId);
                  if (!app) return;

                  if (app.date === dateStr) return;

                  const duration = app.duration || 30;
                  const targetTime = app.time;
                  const newEndTime = calculateEndTime(targetTime, duration);

                  // Check overlap
                  const overlapApp = appointments.find(other => {
                    if (other.id === app.id || other.date !== dateStr || other.status === "Cancelado") return false;
                    if (other.professionalId !== app.professionalId) return false;
                    
                    const startA = minutesSinceMidnight(targetTime);
                    const endA = startA + duration;
                    const startB = minutesSinceMidnight(other.time);
                    const endB = minutesSinceMidnight(other.endTime || calculateEndTime(other.time, other.duration || 30));
                    
                    return startA < endB && endA > startB;
                  });

                  if (overlapApp) {
                    const overlapEnd = overlapApp.endTime || calculateEndTime(overlapApp.time, overlapApp.duration || 30);
                    alert(`⚠️ Conflito de Horário: Não foi possível mover a consulta. O horário das ${targetTime} conflita com a consulta de ${overlapApp.patientName} (${overlapApp.time} às ${overlapEnd}) no dia selecionado.`);
                    return;
                  }

                  if (onUpdateAppointment) {
                    onUpdateAppointment({
                      ...app,
                      date: dateStr,
                      time: targetTime,
                      endTime: newEndTime
                    });
                  }
                }}
              >
                {/* Cell top Header */}
                <div className="flex items-center justify-between">
                  <span className={`text-xs font-bold ${
                    isToday ? "bg-[#5A5A40] text-white px-2 py-0.5 rounded-full" : "text-[#1A1A1A]"
                  }`}>
                    {day.getDate()}
                  </span>
                  
                  {/* Plus action */}
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      setFormDate(dateStr);
                      setFormTime("09:00");
                      setFormDuration(30);
                      setFormEndTime("09:30");
                      openCalBooking();
                    }}
                    className="p-1 hover:bg-[#E5E5D8] rounded-full text-[#A0A090] hover:text-[#5A5A40] opacity-0 hover:opacity-100 sm:opacity-10 transition-all"
                    title="Abrir Cal.com"
                  >
                    <Plus className="w-3.5 h-3.5" />
                  </button>
                </div>

                {/* Event list */}
                <div className="mt-1 flex-1 overflow-hidden space-y-1">
                  {displayedApps.map(app => {
                    const style = getStatusStyle(app.status);
                    const appEndTime = app.endTime || calculateEndTime(app.time, app.duration || 30);
                    const prof = professionals.find(p => p.id === app.professionalId);
                    const profColor = prof ? prof.color : "#5A5A40";
                    return (
                      <div 
                        key={app.id}
                        onClick={(e) => {
                          e.stopPropagation();
                          setSelectedApp(app);
                        }}
                        draggable={true}
                        onDragStart={(e) => handleDragStart(e, app)}
                        onDragEnd={handleDragEnd}
                        className={`text-[9px] px-1.5 py-0.5 rounded-md truncate border ${style.bg} ${style.border} ${style.text} font-semibold cursor-grab active:cursor-grabbing`}
                        style={{ borderLeftColor: profColor, borderLeftWidth: '3.5px' }}
                        title={`${app.time}–${appEndTime} - ${app.patientName} (${prof ? prof.name : "Dra. Márcia"})`}
                      >
                        <span className="font-bold">{app.time}</span> {app.patientName.split(" ")[0]}
                      </div>
                    );
                  })}
                  {totalCount > 3 && (
                    <div className="text-[8px] font-bold text-[#C17A63] text-center bg-[#FFF5EE] py-0.5 rounded">
                      + {totalCount - 3} mais
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    );
  };

  // ==========================================
  // RENDER 2: VISUALIZAÇÃO SEMANAL
  // ==========================================
  const renderWeekView = () => {
    // Sunday of the current date week
    const sunOfWeek = new Date(currentDate);
    const dayOfWeek = currentDate.getDay();
    sunOfWeek.setDate(currentDate.getDate() - dayOfWeek);

    const weekDays: Date[] = [];
    for (let i = 0; i < 7; i++) {
      const d = new Date(sunOfWeek);
      d.setDate(sunOfWeek.getDate() + i);
      weekDays.push(d);
    }

    return (
      <div className="bg-white rounded-[32px] border border-[#E5E5E0] shadow-sm overflow-hidden animate-fade-in flex flex-col">
        {/* Table Week Header */}
        <div className="grid grid-cols-8 border-b border-[#F0F0E8] bg-[#FBFBFA]">
          {/* Axis spacer */}
          <div className="py-4 text-center text-[10px] font-bold text-[#A0A090] uppercase border-r border-[#F0F0E8] flex items-center justify-center">
            Horário
          </div>
          {weekDays.map((day, idx) => {
            const dateStr = formatISO(day);
            const isToday = dateStr === formatISO(new Date());
            
            return (
              <div 
                key={dateStr} 
                className={`py-3 text-center border-r border-[#F0F0E8] last:border-0 cursor-pointer hover:bg-[#F2F2E9]/20 transition-all ${
                  isToday ? "bg-[#F2F2E9]/40" : ""
                }`}
                onClick={() => {
                  setCurrentDate(day);
                  setViewMode("dia");
                }}
              >
                <p className="text-[10px] font-bold text-[#707060] uppercase tracking-wider">{WEEK_DAYS_SHORT[idx]}</p>
                <p className={`text-base font-serif font-bold mt-0.5 inline-block px-2 py-0.5 rounded-full ${
                  isToday ? "bg-[#5A5A40] text-white" : "text-[#1A1A1A]"
                }`}>
                  {day.getDate()}
                </p>
              </div>
            );
          })}
        </div>

        {/* Weekly Matrix Content */}
        <div className="flex bg-white overflow-x-auto pt-4 pb-8">
          
          {/* 1. Hour Axis Column and Day Columns Grid */}
          <div className="grid grid-cols-8 w-full relative">
            
            {/* Hour Axis (1st column of grid-cols-8) */}
            <div className="col-span-1 border-r border-[#F0F0E8] bg-[#FBFBFA]/50 relative" style={{ height: `${21 * (HOUR_ROW_HEIGHT / 2)}px` }}>
              {HOURS_TIMELINE.map((hourStr, idx) => {
                const top = idx * HOUR_ROW_HEIGHT;
                return (
                  <div 
                    key={hourStr} 
                    className="absolute left-0 right-0 text-center font-mono text-[11px] font-bold text-[#5A5A40]"
                    style={{ top: `${top - 8}px` }}
                  >
                    {hourStr}
                  </div>
                );
              })}
            </div>

            {/* 7 Day Columns (spanning the remaining 7 columns) */}
            {weekDays.map((day, dIdx) => {
              const dateStr = formatISO(day);
              
              // Get appointments for this day
              const dayApps = filteredAppointments.filter(app => app.date === dateStr && app.status !== "Cancelado");
              const matchedApps = filterBySearch(dayApps);
              const positionedApps = getPositionedAppointments(matchedApps, HOUR_ROW_HEIGHT);

              return (
                <div 
                  key={dateStr}
                  className="col-span-1 border-r border-[#F0F0E8] last:border-0 relative"
                  style={{ height: `${21 * (HOUR_ROW_HEIGHT / 2)}px` }}
                >
                  {/* Background 30-min slots for this column */}
                  <div className="absolute inset-0 flex flex-col">
                    {DAILY_30MIN_SLOTS.map((slotTime) => {
                      const isCovered = isSlotCovered(dateStr, slotTime);
                      const isTargeted = dragOverSlot && dragOverSlot.date === dateStr && dragOverSlot.time === slotTime;
                      return (
                        <div
                          key={slotTime}
                          style={{ height: `${HOUR_ROW_HEIGHT / 2}px` }}
                          className={`w-full border-b border-[#F5F5F0]/60 last:border-0 relative group flex items-center justify-center transition-all ${
                            isTargeted ? "bg-[#5A5A40]/15 border-2 border-dashed border-[#5A5A40]/40 z-10" : ""
                          }`}
                          onDragOver={(e) => handleDragOver(e, dateStr, slotTime)}
                          onDragLeave={handleDragLeave}
                          onDrop={(e) => handleDrop(e, dateStr, slotTime)}
                        >
                          {!isCovered && (
                            <button
                              onClick={() => {
                                setFormDate(dateStr);
                                setFormTime(slotTime);
                                setFormDuration(30);
                                setFormEndTime(calculateEndTime(slotTime, 30));
                                openCalBooking();
                              }}
                              className="absolute inset-0.5 rounded-lg border border-dashed border-transparent group-hover:border-[#E5E5E0] group-hover:bg-[#FBFBFA]/90 flex items-center justify-center text-[9px] text-[#A0A090] font-bold opacity-0 group-hover:opacity-100 transition-all cursor-pointer z-0"
                            >
                              <Plus className="w-3 h-3" />
                            </button>
                          )}
                        </div>
                      );
                    })}
                  </div>

                  {/* Absolute appointments */}
                  <div className="absolute inset-0 pointer-events-none p-0.5">
                    {positionedApps.map(app => {
                      const style = getStatusStyle(app.status);
                      const appEndTime = app.endTime || calculateEndTime(app.time, app.duration || 30);
                      const prof = professionals.find(p => p.id === app.professionalId);
                      const profColor = prof ? prof.color : "#5A5A40";

                      return (
                        <div
                          key={app.id}
                          onClick={() => setSelectedApp(app)}
                          draggable={true}
                          onDragStart={(e) => handleDragStart(e, app)}
                          onDragEnd={handleDragEnd}
                          className={`absolute p-1.5 rounded-xl border cursor-pointer transition-all hover:shadow-sm flex flex-col justify-between pointer-events-auto group/card cursor-grab active:cursor-grabbing ${style.bg} ${style.border} ${style.text}`}
                          style={{
                            top: `${app.top + 2}px`,
                            height: `${app.height - 4}px`,
                            width: `calc(${app.width} - 4px)`,
                            left: `calc(${app.left} + 2px)`,
                            borderLeftColor: profColor,
                            borderLeftWidth: '3.5px',
                            zIndex: 10
                          }}
                        >
                          <div className="space-y-0.5 flex-1 min-h-0 flex flex-col justify-between">
                            <div>
                              <div className="flex items-center justify-between gap-1 text-[8px] font-bold opacity-90">
                                <span className="truncate">{app.time} - {appEndTime}</span>
                                <span className={`w-1.5 h-1.5 rounded-full shrink-0 ${style.dot}`} />
                              </div>
                              <p className="font-bold text-[#1A1A1A] truncate leading-tight mt-0.5" title={app.patientName}>
                                {app.patientName.split(" ")[0]} {app.patientName.split(" ")[1] || ""}
                              </p>
                              {app.duration >= 45 && (
                                <p className="text-[8px] opacity-80 font-normal truncate mt-0.5">
                                  {app.type}
                                </p>
                              )}
                              {app.duration >= 60 && prof && (
                                <p className="text-[8px] opacity-80 font-medium truncate mt-0.5 text-[#5A5A40]">
                                  Dra. {prof.name.split(" ").slice(-1)[0]}
                                </p>
                              )}
                            </div>

                            {app.duration >= 60 && (
                              <div className="flex items-center justify-between border-t border-[#F5F5F0]/60 pt-0.5 mt-0.5">
                                <span className="text-[7px] font-bold uppercase tracking-wider opacity-90 truncate">
                                  {app.status}
                                </span>
                              </div>
                            )}
                          </div>

                          {/* Drag-to-resize handle at bottom edge */}
                          <div 
                            className="absolute bottom-0 left-0 right-0 h-1.5 cursor-ns-resize z-20 flex items-center justify-center bg-transparent hover:bg-[#5A5A40]/10 rounded-b-xl"
                            onMouseDown={(e) => handleMouseDown(e, app, "semana")}
                          />
                        </div>
                      );
                    })}
                  </div>

                </div>
              );
            })}

          </div>

        </div>
      </div>
    );
  };

  // ==========================================
  // RENDER 3: VISUALIZAÇÃO DIÁRIA
  // ==========================================
  const renderDayView = () => {
    const formattedSelectedDate = formatISO(currentDate);
    const isToday = formattedSelectedDate === formatISO(new Date());

    // 1. Get appointments for this specific day
    const dayAppointments = filteredAppointments.filter(app => app.date === formattedSelectedDate && app.status !== "Cancelado");

    // 2. Local search filter
    const matchedApps = filterBySearch(dayAppointments);

    // 3. Get positioned appointments using DAY_ROW_HEIGHT
    const DAY_ROW_HEIGHT = 140;
    const positionedApps = getPositionedAppointments(matchedApps, DAY_ROW_HEIGHT);

    return (
      <div className="bg-white rounded-[32px] border border-[#E5E5E0] shadow-sm overflow-hidden animate-fade-in flex flex-col">
        
        {/* Banner with date title */}
        <div className="px-8 py-5 border-b border-[#F5F5F0] bg-[#FBFBFA] flex items-center justify-between">
          <div className="flex items-center gap-2">
            <CalendarDays className="w-5 h-5 text-[#C17A63]" />
            <h3 className="font-serif text-lg text-[#1A1A1A]">
              {WEEK_DAYS_LABEL[currentDate.getDay()]}, {currentDate.getDate()} de {getPortugueseMonthName(currentDate.getMonth())} {isToday && <span className="text-xs bg-[#5A5A40] text-white font-sans px-2 py-0.5 rounded-full ml-2">Hoje</span>}
            </h3>
          </div>
          <span className="text-xs text-[#707060]">Modo de Atendimento Detalhado</span>
        </div>

        {/* Timeline Container */}
        <div className="flex bg-white overflow-x-auto pt-4 pb-8">
          
          {/* Hour labels axis */}
          <div className="w-20 border-r border-[#F0F0E8] bg-[#FBFBFA]/50 shrink-0 relative" style={{ height: `${21 * (DAY_ROW_HEIGHT / 2)}px` }}>
            {HOURS_TIMELINE.map((hourStr, idx) => {
              const top = idx * DAY_ROW_HEIGHT;
              return (
                <div 
                  key={hourStr} 
                  className="absolute left-0 right-0 text-center font-mono text-[11px] font-bold text-[#5A5A40]"
                  style={{ top: `${top - 8}px` }}
                >
                  {hourStr}
                </div>
              );
            })}
          </div>

          {/* Daily single column container */}
          <div className="flex-1 relative" style={{ height: `${21 * (DAY_ROW_HEIGHT / 2)}px` }}>
            
            {/* Background 30-min slots */}
            <div className="absolute inset-0 flex flex-col">
              {DAILY_30MIN_SLOTS.map((slotTime) => {
                const isCovered = isSlotCovered(formattedSelectedDate, slotTime);
                const isTargeted = dragOverSlot && dragOverSlot.date === formattedSelectedDate && dragOverSlot.time === slotTime;
                return (
                  <div
                    key={slotTime}
                    style={{ height: `${DAY_ROW_HEIGHT / 2}px` }}
                    className={`w-full border-b border-[#F5F5F0] last:border-0 relative group flex items-center pl-4 transition-all ${
                      isTargeted ? "bg-[#5A5A40]/15 border-2 border-dashed border-[#5A5A40]/40 z-10" : ""
                    }`}
                    onDragOver={(e) => handleDragOver(e, formattedSelectedDate, slotTime)}
                    onDragLeave={handleDragLeave}
                    onDrop={(e) => handleDrop(e, formattedSelectedDate, slotTime)}
                  >
                    {!isCovered && (
                      <button
                        onClick={() => {
                          setFormDate(formattedSelectedDate);
                          setFormTime(slotTime);
                          setFormDuration(30);
                          setFormEndTime(calculateEndTime(slotTime, 30));
                          openCalBooking();
                        }}
                        className="absolute inset-x-2 inset-y-1 rounded-xl border border-dashed border-transparent group-hover:border-[#E5E5E0] group-hover:bg-[#FBFBFA] flex items-center justify-center text-xs text-[#A0A090] font-bold opacity-0 group-hover:opacity-100 transition-all cursor-pointer z-0"
                      >
                        <Plus className="w-3.5 h-3.5 mr-1" /> Horário Livre ({slotTime})
                      </button>
                    )}
                  </div>
                );
              })}
            </div>

            {/* Absolutely positioned cards */}
            <div className="absolute inset-0 pointer-events-none p-1">
              {positionedApps.map(app => {
                const style = getStatusStyle(app.status);
                const appEndTime = app.endTime || calculateEndTime(app.time, app.duration || 30);
                const prof = professionals.find(p => p.id === app.professionalId);
                const profColor = prof ? prof.color : "#5A5A40";
                const patObj = getPatientInfo(app.patientId);

                return (
                  <div
                    key={app.id}
                    onClick={() => setSelectedApp(app)}
                    draggable={true}
                    onDragStart={(e) => handleDragStart(e, app)}
                    onDragEnd={handleDragEnd}
                    className={`absolute p-4 rounded-2xl border cursor-pointer transition-all hover:shadow-md flex flex-col justify-between pointer-events-auto group/card cursor-grab active:cursor-grabbing ${style.bg} ${style.border} ${style.text}`}
                    style={{
                      top: `${app.top + 4}px`,
                      height: `${app.height - 8}px`,
                      width: `calc(${app.width} - 8px)`,
                      left: `calc(${app.left} + 4px)`,
                      borderLeftColor: profColor,
                      borderLeftWidth: '6px',
                      zIndex: 10
                    }}
                  >
                    <div className="space-y-1.5 flex-1 min-h-0 flex flex-col justify-between">
                      <div>
                        <div className="flex flex-wrap items-center gap-2">
                          <h4 className="font-bold text-sm text-[#1A1A1A] leading-none truncate" title={app.patientName}>
                            {app.patientName}
                          </h4>
                          
                          {/* Type tags */}
                          {app.type === "Primeira Consulta" && (
                            <span className="bg-[#FCF6E5] text-[#8C6D23] border border-[#EAD5A0]/60 text-[9px] px-2 py-0.5 rounded-full font-bold uppercase tracking-wider">
                              1ª Consulta
                            </span>
                          )}
                          {app.type === "Retorno" && (
                            <span className="bg-[#E6EEF4] text-[#2C4A63] border border-[#CADCEB]/60 text-[9px] px-2 py-0.5 rounded-full font-bold uppercase tracking-wider">
                              Retorno
                            </span>
                          )}

                          {prof && (
                            <span 
                              className="text-[9px] text-white px-2 py-0.5 rounded-full font-bold uppercase tracking-wider shadow-xs"
                              style={{ backgroundColor: prof.color }}
                            >
                              Dra. {prof.name.split(" ").slice(-1)[0]}
                            </span>
                          )}

                          {/* Absences warning indicator */}
                          {patObj && patObj.absencesCount >= 3 && (
                            <span className="bg-red-50 text-red-700 border border-red-200 text-[9px] px-2 py-0.5 rounded-full font-bold flex items-center gap-1 animate-pulse">
                              <AlertTriangle className="w-2.5 h-2.5" /> ALTA AUSÊNCIA ({patObj.absencesCount} Faltas)
                            </span>
                          )}
                        </div>

                        {/* Complete details shown */}
                        <p className="text-[11px] text-[#707060] flex flex-wrap items-center gap-x-2 gap-y-0.5 mt-1.5">
                          <span className="font-bold text-[#5A5A40]">{app.time} - {appEndTime}</span>
                          <span>•</span>
                          <span>{app.patientPhone}</span>
                          {app.notes && (
                            <>
                              <span>•</span>
                              <span className="italic truncate max-w-[200px]" title={app.notes}>"{app.notes}"</span>
                            </>
                          )}
                        </p>

                        {/* Vital Warning notes if configured */}
                        {patObj && patObj.importantNotes && app.height >= 100 && (
                          <p className="text-[10px] text-amber-800 bg-amber-50 px-2 py-0.5 rounded border border-amber-100 mt-1 inline-block font-semibold">
                            ⚠️ {patObj.importantNotes}
                          </p>
                        )}
                      </div>

                      {/* Right/Bottom Action Buttons inside the card if there is enough height */}
                      {app.height >= 110 && (
                        <div className="flex flex-wrap items-center gap-1.5 pt-2 border-t border-[#F5F5F0]/60 mt-2" onClick={(e) => e.stopPropagation()}>
                          {app.status === "Agendado" && (
                            <button
                              onClick={() => handleConfirmStatus(app.id)}
                              className="px-2 py-1 bg-green-50 hover:bg-green-100 text-green-800 rounded-lg text-[10px] font-bold border border-green-200 flex items-center gap-1 cursor-pointer"
                              title="Confirmar Agendamento"
                            >
                              <Check className="w-3 h-3" /> Confirmar
                            </button>
                          )}

                          {app.status !== "Atendido" && app.status !== "Cancelado" && (
                            <button
                              onClick={() => handleAttendedStatus(app.id)}
                              className="px-2 py-1 bg-[#5A5A40] hover:bg-[#474732] text-white rounded-lg text-[10px] font-bold flex items-center gap-1 cursor-pointer"
                              title="Marcar como Atendido"
                            >
                              <CheckCircle className="w-3 h-3" /> Atendido
                            </button>
                          )}

                          {app.status !== "Faltou" && app.status !== "Atendido" && app.status !== "Cancelado" && (
                            <button
                              onClick={() => triggerAbsentConfirmation(app.id, app.patientName)}
                              className="px-2 py-1 bg-orange-50 hover:bg-orange-100 text-orange-800 rounded-lg text-[10px] font-bold border border-orange-200 cursor-pointer"
                              title="Marcar falta"
                            >
                              Marcar Falta
                            </button>
                          )}

                          {app.status !== "Cancelado" && app.status !== "Atendido" && (
                            <button
                              onClick={() => triggerCancelConfirmation(app.id, app.patientName)}
                              className="px-2 py-1 hover:bg-red-50 text-red-600 rounded-lg text-[10px] font-bold cursor-pointer"
                              title="Cancelar consulta"
                            >
                              Cancelar
                            </button>
                          )}

                          {app.status === "Atendido" && (
                            <button
                              onClick={() => handleScheduleReturn(app)}
                              className="px-2.5 py-1 bg-[#C17A63] hover:bg-[#ab6a54] text-white rounded-lg text-[10px] font-bold flex items-center gap-1 transition-all cursor-pointer"
                              title="Agendar retorno"
                            >
                              <Sparkles className="w-3 h-3" /> Retorno
                            </button>
                          )}
                        </div>
                      )}

                      {/* Status and footer line if short and height is too small for action buttons */}
                      {app.height < 110 && (
                        <div className="flex items-center justify-between border-t border-[#F5F5F0]/60 pt-1 mt-1">
                          <span className="text-[9px] font-bold uppercase tracking-wider text-[#707060] opacity-80">
                            {prof ? prof.specialty : "Dentista"}
                          </span>
                          <span className={`px-1.5 py-0.5 rounded-full text-[8px] font-bold uppercase tracking-wider ${style.bg} ${style.border} ${style.text}`}>
                            {app.status}
                          </span>
                        </div>
                      )}
                    </div>

                    {/* Drag-to-resize handle at bottom edge */}
                    <div 
                      className="absolute bottom-0 left-0 right-0 h-2 cursor-ns-resize z-20 flex items-center justify-center bg-transparent hover:bg-[#5A5A40]/10 rounded-b-2xl"
                      onMouseDown={(e) => handleMouseDown(e, app, "dia")}
                    />
                  </div>
                );
              })}
            </div>

          </div>
        </div>
      </div>
    );
  };

  // ==========================================
  // SIDEBAR DETAILS PANEL RENDER
  // ==========================================
  const renderSidebarDetails = () => {
    if (!selectedApp) return null;
    const style = getStatusStyle(selectedApp.status);
    const patientObj = getPatientInfo(selectedApp.patientId);

    return (
      <div className="bg-white rounded-[32px] border border-[#E5E5E0] shadow-md p-6 space-y-6 animate-slide-in relative flex flex-col justify-between">
        <div className="space-y-6">
          <div className="flex items-center justify-between border-b border-[#F5F5F0] pb-4">
            <h3 className="font-serif text-lg text-[#1A1A1A] font-semibold">Ficha do Agendamento</h3>
            <button 
              onClick={() => setSelectedApp(null)}
              className="p-1 hover:bg-[#F5F5F0] rounded-full text-[#A0A090] hover:text-[#5A5A40]"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          {/* Patient Header info */}
          <div className="space-y-3">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-[#F5F5F0] flex items-center justify-center text-[#5A5A40] font-serif italic font-bold">
                {selectedApp.patientName.charAt(0)}
              </div>
              <div>
                <h4 className="font-bold text-base text-[#1A1A1A] leading-tight">{selectedApp.patientName}</h4>
                <p className="text-xs text-[#707060] flex items-center gap-1 mt-0.5">
                  <Phone className="w-3.5 h-3.5 text-[#A0A090]" /> {selectedApp.patientPhone}
                </p>
              </div>
            </div>

            {/* Labels and alerts */}
            <div className="flex flex-wrap gap-1.5 pt-1">
              {selectedApp.type === "Primeira Consulta" && (
                <span className="bg-[#FCF6E5] text-[#8C6D23] border border-[#EAD5A0]/50 text-[9px] px-2.5 py-0.5 rounded-full font-bold uppercase tracking-wider">
                  Primeira Consulta
                </span>
              )}
              {selectedApp.type === "Retorno" && (
                <span className="bg-[#E6EEF4] text-[#2C4A63] border border-[#CADCEB]/50 text-[9px] px-2.5 py-0.5 rounded-full font-bold uppercase tracking-wider">
                  Retorno
                </span>
              )}
              {patientObj && patientObj.absencesCount >= 3 && (
                <span className="bg-red-50 text-red-700 border border-red-200 text-[9px] px-2 py-0.5 rounded-full font-bold flex items-center gap-1 animate-pulse">
                  <AlertTriangle className="w-3 h-3" /> ATENÇÃO: {patientObj.absencesCount} faltas no histórico
                </span>
              )}
            </div>
          </div>

          {/* Important Patient Warning Notes (Always visible) */}
          <div className="p-4 bg-amber-50 border border-amber-200 text-amber-900 rounded-2xl text-xs space-y-1">
            <p className="font-bold text-amber-900 flex items-center gap-1">
              <Info className="w-3.5 h-3.5 text-[#C17A63]" /> Informação Clínica Crítica:
            </p>
            <p className="text-[11px] text-amber-800 leading-relaxed font-medium">
              "{patientObj ? patientObj.importantNotes : "Nenhuma anotação de alergia ou restrição crítica registrada."}"
            </p>
          </div>

          {/* Agenda slot parameters */}
          <div className="grid grid-cols-2 gap-4 bg-[#FBFBFA] p-4 rounded-2xl border border-[#F0F0E8] text-xs">
            <div>
              <p className="text-[9px] uppercase tracking-wider text-[#A0A090] font-bold">Data do Atendimento</p>
              <p className="font-semibold text-[#1A1A1A] mt-1">{selectedApp.date}</p>
            </div>
            <div>
              <p className="text-[9px] uppercase tracking-wider text-[#A0A090] font-bold">Horário de Início</p>
              <p className="font-semibold text-[#1A1A1A] mt-1">{selectedApp.time}</p>
            </div>
            <div>
              <p className="text-[9px] uppercase tracking-wider text-[#A0A090] font-bold">Horário de Fim</p>
              <p className="font-semibold text-[#1A1A1A] mt-1">
                {selectedApp.endTime || calculateEndTime(selectedApp.time, selectedApp.duration || 30)}
              </p>
            </div>
            <div>
              <p className="text-[9px] uppercase tracking-wider text-[#A0A090] font-bold">Duração</p>
              <p className="font-semibold text-[#1A1A1A] mt-1">{selectedApp.duration || 30} minutos</p>
            </div>
            <div className="col-span-2 pt-2 border-t border-[#F0F0E8] space-y-1">
              <p className="text-[9px] uppercase tracking-wider text-[#A0A090] font-bold">Queixa / Observações do Agendamento</p>
              <p className="text-[11px] text-[#707060] italic leading-relaxed">
                {selectedApp.notes ? `"${selectedApp.notes}"` : "Nenhuma queixa anotada para este dia."}
              </p>
            </div>
            <div className="col-span-2 pt-2 border-t border-[#F0F0E8] flex items-center justify-between">
              <span className="text-[9px] uppercase tracking-wider text-[#A0A090] font-bold">Profissional Responsável</span>
              {(() => {
                const prof = professionals.find(p => p.id === selectedApp.professionalId);
                return prof ? (
                  <div className="flex items-center gap-1.5 bg-gray-50 border border-gray-100 px-2.5 py-0.5 rounded-full">
                    <span className="w-2 h-2 rounded-full" style={{ backgroundColor: prof.color }} />
                    <span className="font-bold text-[11px] text-[#1A1A1A]">{prof.name}</span>
                  </div>
                ) : (
                  <span className="text-[#A0A090] italic text-[11px]">Não vinculado</span>
                );
              })()}
            </div>
            <div className="col-span-2 pt-2 border-t border-[#F0F0E8] flex items-center justify-between">
              <span className="text-[9px] uppercase tracking-wider text-[#A0A090] font-bold">Status Atual</span>
              <span className={`px-2 py-0.5 rounded-full text-[9px] font-bold uppercase tracking-wider ${style.bg} ${style.border} ${style.text}`}>
                {selectedApp.status}
              </span>
            </div>
          </div>

          {/* Patient short history */}
          <div className="space-y-2">
            <h5 className="text-[10px] font-bold uppercase text-[#A0A090] tracking-wider">Histórico Curto de Consultas</h5>
            <div className="space-y-1.5 max-h-32 overflow-y-auto pr-1">
              {patientObj && patientObj.history && patientObj.history.length > 0 ? (
                patientObj.history.slice(0, 3).map((hist, hIdx) => (
                  <div key={hIdx} className="p-2 bg-[#FBFBFA] rounded-xl border border-[#F0F0E8] text-[10px] flex justify-between items-center gap-2">
                    <div>
                      <p className="font-bold text-[#1A1A1A]">{hist.date} - {hist.type}</p>
                      {hist.notes && <p className="text-gray-400 text-[9px] truncate max-w-xs">"{hist.notes}"</p>}
                    </div>
                    <span className="font-semibold text-xs text-[#5A5A40]">{hist.status}</span>
                  </div>
                ))
              ) : (
                <p className="text-[10px] text-gray-400 italic">Nenhum histórico anterior registrado.</p>
              )}
            </div>
          </div>
        </div>

        {/* Dynamic Buttons Grid inside Sidebar */}
        <div className="pt-4 border-t border-[#F5F5F0] space-y-2">
          {selectedApp.status === "Agendado" && (
            <button
              onClick={() => handleConfirmStatus(selectedApp.id)}
              className="w-full py-2.5 bg-[#EDF6ED] text-[#2E602E] border border-[#C3E4C3] rounded-xl text-xs font-bold hover:bg-[#dfeedf] transition-all flex items-center justify-center gap-1.5"
            >
              <Check className="w-4 h-4" /> Confirmar Consulta
            </button>
          )}

          {selectedApp.status !== "Atendido" && selectedApp.status !== "Cancelado" && (
            <button
              onClick={() => handleAttendedStatus(selectedApp.id)}
              className="w-full py-2.5 bg-[#5A5A40] text-white rounded-xl text-xs font-bold hover:bg-[#474732] transition-all flex items-center justify-center gap-1.5 shadow-xs"
            >
              <CheckCircle className="w-4 h-4" /> Marcar como Atendido
            </button>
          )}

          {selectedApp.status === "Atendido" && (
            <button
              onClick={() => handleScheduleReturn(selectedApp)}
              className="w-full py-2.5 bg-[#C17A63] text-white rounded-xl text-xs font-bold hover:bg-[#ab6a54] transition-all flex items-center justify-center gap-1.5 shadow-xs"
            >
              <Sparkles className="w-4 h-4" /> Agendar Retorno
            </button>
          )}

          <div className="grid grid-cols-2 gap-2">
            {selectedApp.status !== "Atendido" && (
              <button
                onClick={() => handleRemarcarWizard(selectedApp)}
                className="py-2 border border-[#D8D8C0] text-[#5A5A40] rounded-xl text-[10px] font-bold hover:bg-[#F2F2E9]/60 transition-all"
              >
                Remarcar
              </button>
            )}

            {selectedApp.status !== "Faltou" && selectedApp.status !== "Atendido" && selectedApp.status !== "Cancelado" && (
              <button
                onClick={() => triggerAbsentConfirmation(selectedApp.id, selectedApp.patientName)}
                className="py-2 bg-orange-50 text-orange-850 border border-orange-200 rounded-xl text-[10px] font-bold hover:bg-orange-100 transition-all"
              >
                Marcar como Faltou
              </button>
            )}
          </div>

          {selectedApp.status !== "Cancelado" && selectedApp.status !== "Atendido" && (
            <button
              onClick={() => triggerCancelConfirmation(selectedApp.id, selectedApp.patientName)}
              className="w-full py-2.5 bg-red-50 text-red-700 hover:bg-red-100 rounded-xl text-[10px] font-bold transition-all text-center"
            >
              Cancelar Consulta
            </button>
          )}
        </div>

      </div>
    );
  };

  return (
    <div className="space-y-6 animate-fade-in">
      
      {/* PROFESSIONAL CALENDAR TOPBAR CONTROLS */}
      <div className="flex flex-col xl:flex-row xl:items-center justify-between gap-4 bg-white p-5 rounded-[32px] border border-[#E5E5E0] shadow-xs">
        
        {/* Navigation Arrows, Hoje, & Month Year title */}
        <div className="flex flex-wrap items-center gap-3">
          
          <button
            onClick={handleToday}
            className="px-4 py-2 bg-white hover:bg-[#F5F5F0] border border-[#E5E5E0] text-[#5A5A40] rounded-xl text-xs font-bold transition-all"
          >
            Hoje
          </button>

          <div className="flex items-center border border-[#E5E5E0] rounded-xl overflow-hidden bg-white">
            <button
              onClick={handlePrev}
              className="p-2.5 hover:bg-[#F5F5F0] text-[#5A5A40] transition-all border-r border-[#E5E5E0]"
              title="Anterior"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
            <button
              onClick={handleNext}
              className="p-2.5 hover:bg-[#F5F5F0] text-[#5A5A40] transition-all"
              title="Próximo"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>

          <h3 className="text-sm md:text-base font-serif font-bold text-[#1A1A1A] ml-2">
            {viewMode === "mes" && (
              `${getPortugueseMonthName(currentDate.getMonth())} de ${currentDate.getFullYear()}`
            )}
            {viewMode === "semana" && (
              `Semana de ${new Date(currentDate.getFullYear(), currentDate.getMonth(), currentDate.getDate() - currentDate.getDay()).getDate()} a ${new Date(currentDate.getFullYear(), currentDate.getMonth(), currentDate.getDate() - currentDate.getDay() + 6).getDate()} de ${getPortugueseMonthName(currentDate.getMonth())}`
            )}
            {viewMode === "dia" && (
              `${currentDate.getDate()} de ${getPortugueseMonthName(currentDate.getMonth())} de ${currentDate.getFullYear()}`
            )}
          </h3>

        </div>

        {/* View mode toggle, search bar & action */}
        <div className="flex flex-col sm:flex-row flex-wrap items-stretch sm:items-center gap-3">
          
          {/* Local Search input */}
          <div className="relative">
            <Search className="w-3.5 h-3.5 text-[#A0A090] absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Filtrar agendamentos..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full sm:w-48 bg-[#FBFBFA] border border-[#E5E5E0] rounded-xl pl-9 pr-3 py-2 text-xs outline-none focus:border-[#5A5A40] transition-all"
            />
            {searchTerm && (
              <button 
                onClick={() => setSearchTerm("")}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-[10px] text-[#A0A090] hover:text-[#5A5A40] font-bold"
              >
                Limpar
              </button>
            )}
          </div>

          {/* Professional Filter Dropdown */}
          <div className="flex items-center gap-1.5 bg-[#FBFBFA] border border-[#E5E5E0] px-3.5 py-2 rounded-xl shadow-2xs">
            <Filter className="w-3.5 h-3.5 text-[#C17A63]" />
            <select
              value={selectedProfFilter}
              onChange={(e) => setSelectedProfFilter(e.target.value)}
              className="bg-transparent border-none outline-none text-xs font-bold text-[#5A5A40] cursor-pointer"
            >
              <option value="todas">Todas as Dentistas</option>
              {professionals.map(p => (
                <option key={p.id} value={p.id}>
                  Dra. {p.name.split(" ").slice(-1)[0]} ({p.specialty})
                </option>
              ))}
            </select>
          </div>

          {/* Toggle buttons */}
          <div className="bg-[#F5F5F0] p-1 rounded-xl border border-[#E5E5E0] flex">
            {(["mes", "semana", "dia"] as const).map(mode => (
              <button
                key={mode}
                onClick={() => setViewMode(mode)}
                className={`px-4 py-1.5 rounded-lg text-[11px] font-bold transition-all uppercase tracking-wider ${
                  viewMode === mode
                    ? "bg-[#5A5A40] text-white shadow-xs"
                    : "text-[#5A5A40] hover:bg-white/50"
                }`}
              >
                {mode === "mes" ? "Mês" : mode === "semana" ? "Semana" : "Dia"}
              </button>
            ))}
          </div>

          {/* Create Shortcut */}
          <button
            onClick={() => {
              document.getElementById("cal-official-booking")?.scrollIntoView({ behavior: "smooth", block: "start" });
            }}
            className="flex items-center justify-center gap-2 px-4 py-2.5 bg-[#5A5A40] text-white rounded-xl text-xs font-bold hover:bg-[#474732] shadow-sm transition-all whitespace-nowrap"
          >
            <Plus className="w-4 h-4" />
            <span>Ir para Cal.com</span>
          </button>

        </div>

      </div>

      <section id="cal-official-booking" className="space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <span className="text-[10px] font-extrabold text-[#C17A63] uppercase tracking-widest block mb-1">
              Agenda oficial
            </span>
            <h2 className="font-serif text-2xl italic text-[#5A5A40] font-semibold">Cal.com por dentista</h2>
            <p className="text-xs text-[#707060] mt-1">
              As marcações são feitas no Cal.com; o calendário abaixo é a visão operacional sincronizada do painel.
            </p>
          </div>
          <div className="bg-[#F5F5F0] border border-[#E5E5E0] rounded-2xl p-1 flex flex-wrap gap-1">
            {activeProfessionals.map(professional => {
              const active = selectedEmbedProfessional?.id === professional.id;
              return (
                <button
                  key={professional.id}
                  onClick={() => setSelectedProfFilter(professional.id)}
                  className={`px-4 py-2 rounded-xl text-xs font-bold transition-all ${
                    active ? "bg-[#5A5A40] text-white shadow-sm" : "text-[#5A5A40] hover:bg-white"
                  }`}
                >
                  {professional.name}
                </button>
              );
            })}
          </div>
        </div>
        <div>
          {mountedEmbedProfessionals.length > 0 ? (
            mountedEmbedProfessionals.map((professional) => (
              <div
                key={professional.id}
                className={selectedEmbedProfessional?.id === professional.id ? "block" : "hidden"}
              >
                <CalInlineEmbed professional={professional} />
              </div>
            ))
          ) : (
            <CalInlineEmbed professional={selectedEmbedProfessional} />
          )}
        </div>
      </section>

      {/* CORE WORKSPACE GRID CONTAINER (CALENDAR + SIDEBAR IF OPEN) */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        
        {/* Calendar viewport */}
        <div className={`${selectedApp ? "lg:col-span-8 xl:col-span-9" : "lg:col-span-12"} space-y-4`}>
          {viewMode === "mes" && renderMonthView()}
          {viewMode === "semana" && renderWeekView()}
          {viewMode === "dia" && renderDayView()}
        </div>

        {/* Sidebar details panel */}
        {selectedApp && (
          <div className="lg:col-span-4 xl:col-span-3">
            {renderSidebarDetails()}
          </div>
        )}

      </div>


      {/* PREMIUM CUSTOM VISUAL CONFIRMATION DIALOG MODAL (Requirement) */}
      {confirmModal && confirmModal.isOpen && (
        <div className="fixed inset-0 bg-[#1A1A1A]/40 backdrop-blur-xs z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-[32px] border border-[#E5E5E0] shadow-2xl w-full max-w-md p-8 space-y-6 animate-scale-up">
            
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-full bg-[#FFF5EE] flex items-center justify-center text-orange-600 border border-[#FCD9C3]">
                <AlertTriangle className="w-6 h-6 text-[#C17A63]" />
              </div>
              <div>
                <h4 className="font-serif text-lg text-[#1A1A1A] font-semibold leading-tight">
                  {confirmModal.type === "cancel" ? "Cancelar Atendimento?" : "Registrar Falta?"}
                </h4>
                <p className="text-[10px] text-[#A0A090] uppercase tracking-wider font-bold mt-0.5">Confirmação de Segurança</p>
              </div>
            </div>

            <p className="text-xs text-[#707060] leading-relaxed">
              {confirmModal.type === "cancel" 
                ? `Tem certeza de que deseja CANCELAR a consulta de ${confirmModal.patientName}? Esta ação liberará o horário correspondente no fluxo operacional da agenda.`
                : `Confirma que o paciente ${confirmModal.patientName} não compareceu à consulta? O histórico clínico será atualizado com uma ausência formal.`
              }
            </p>

            <div className="flex gap-3 pt-2">
              <button
                type="button"
                onClick={() => setConfirmModal(null)}
                className="flex-1 px-4 py-3 border border-[#D8D8C0] text-[#5A5A40] rounded-2xl text-xs font-semibold hover:bg-[#F5F5F0] transition-all"
              >
                Voltar
              </button>
              <button
                type="button"
                onClick={() => {
                  if (confirmModal.type === "cancel") {
                    onUpdateAppointmentStatus(confirmModal.appointmentId, "Cancelado");
                    if (selectedApp && selectedApp.id === confirmModal.appointmentId) {
                      setSelectedApp(prev => prev ? { ...prev, status: "Cancelado" } : null);
                    }
                  } else {
                    onUpdateAppointmentStatus(confirmModal.appointmentId, "Faltou");
                    if (selectedApp && selectedApp.id === confirmModal.appointmentId) {
                      setSelectedApp(prev => prev ? { ...prev, status: "Faltou" } : null);
                    }
                  }
                  setConfirmModal(null);
                }}
                className={`flex-1 px-4 py-3 text-white rounded-2xl text-xs font-bold shadow-md transition-all ${
                  confirmModal.type === "cancel" ? "bg-red-600 hover:bg-red-700" : "bg-orange-600 hover:bg-orange-750"
                }`}
              >
                {confirmModal.type === "cancel" ? "Confirmar Cancelamento" : "Confirmar Falta"}
              </button>
            </div>

          </div>
        </div>
      )}

      {/* NEW APPOINTMENT MODAL (Google Calendar Style Pre-filled Form) */}
      {showNewAppModal && (
        <div className="fixed inset-0 bg-[#1A1A1A]/40 backdrop-blur-xs z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-[32px] border border-[#E5E5E0] shadow-2xl w-full max-w-lg p-8 space-y-6 animate-scale-up max-h-[90vh] overflow-y-auto">
            
            <div className="flex justify-between items-center border-b border-[#F5F5F0] pb-4">
              <div className="flex items-center gap-2">
                <Calendar className="w-5 h-5 text-[#C17A63]" />
                <h3 className="font-serif text-xl text-[#5A5A40] italic font-semibold">Novo Agendamento Clínico</h3>
              </div>
              <button 
                onClick={() => setShowNewAppModal(false)}
                className="text-xs text-[#A0A090] hover:text-[#5A5A40] font-bold"
              >
                Voltar
              </button>
            </div>

            <form onSubmit={handleCreateAppointment} className="space-y-4">
              
              {/* Select Patient */}
              <div>
                <label className="block text-[10px] font-bold text-[#707060] uppercase tracking-wider mb-1">
                  Selecionar Paciente Cadastrado *
                </label>
                <select
                  value={formPatientId}
                  onChange={(e) => handleSelectPatientInForm(e.target.value)}
                  className="w-full bg-[#F5F5F0] border border-[#E5E5E0] rounded-2xl px-4 py-3 text-xs focus:border-[#5A5A40] focus:ring-1 focus:ring-[#5A5A40] outline-none transition-all font-semibold"
                  required
                >
                  <option value="">-- Escolha o paciente --</option>
                  {patients.map(p => (
                    <option key={p.id} value={p.id}>
                      {p.name} {p.absencesCount > 0 ? `(${p.absencesCount} faltas)` : ""}
                    </option>
                  ))}
                </select>
                <p className="text-[9px] text-[#A0A090] mt-1">
                  Não encontrou o paciente? Cadastre no módulo "Pacientes" antes de agendar.
                </p>
              </div>

              {/* Select Professional (Mandatory) */}
              <div>
                <label className="block text-[10px] font-bold text-[#707060] uppercase tracking-wider mb-1">
                  Profissional Responsável *
                </label>
                <select
                  value={formProfessionalId}
                  onChange={(e) => {
                    const profId = e.target.value;
                    setFormProfessionalId(profId);
                    // Load that professional's default duration if available!
                    const prof = professionals.find(p => p.id === profId);
                    if (prof) {
                      setFormDuration(prof.defaultDuration);
                      setFormEndTime(calculateEndTime(formTime, prof.defaultDuration));
                    }
                  }}
                  className="w-full bg-[#F5F5F0] border border-[#E5E5E0] rounded-2xl px-4 py-3 text-xs focus:border-[#5A5A40] focus:ring-1 focus:ring-[#5A5A40] outline-none transition-all font-semibold text-[#1A1A1A]"
                  required
                >
                  <option value="">-- Escolha a profissional responsável --</option>
                  {professionals.filter(p => p.active).map(p => (
                    <option key={p.id} value={p.id}>
                      Dra. {p.name} ({p.specialty})
                    </option>
                  ))}
                </select>
              </div>

              {/* Phone/Whatsapp */}
              <div>
                <label className="block text-[10px] font-bold text-[#707060] uppercase tracking-wider mb-1">
                  Telefone / WhatsApp
                </label>
                <input
                  type="text"
                  value={formPhone}
                  onChange={(e) => setFormPhone(e.target.value)}
                  placeholder="(11) 99999-9999"
                  className="w-full bg-[#F5F5F0] border border-[#E5E5E0] rounded-2xl px-4 py-3 text-xs focus:border-[#5A5A40] focus:ring-1 focus:ring-[#5A5A40] outline-none transition-all"
                />
              </div>

              {/* Date and Duration */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-[10px] font-bold text-[#707060] uppercase tracking-wider mb-1">
                    Data da Consulta *
                  </label>
                  <input
                    type="date"
                    value={formDate}
                    onChange={(e) => setFormDate(e.target.value)}
                    className="w-full bg-[#F5F5F0] border border-[#E5E5E0] rounded-2xl px-4 py-3 text-xs focus:border-[#5A5A40] focus:ring-1 focus:ring-[#5A5A40] outline-none transition-all"
                    required
                  />
                </div>
                <div>
                  <label className="block text-[10px] font-bold text-[#707060] uppercase tracking-wider mb-1">
                    Duração *
                  </label>
                  <select
                    value={formDuration}
                    onChange={(e) => handleDurationChange(Number(e.target.value))}
                    className="w-full bg-[#F5F5F0] border border-[#E5E5E0] rounded-2xl px-4 py-3 text-xs focus:border-[#5A5A40] focus:ring-1 focus:ring-[#5A5A40] outline-none transition-all font-semibold text-[#1A1A1A]"
                    required
                  >
                    <option value={30}>30 minutos (Padrão)</option>
                    <option value={45}>45 minutos</option>
                    <option value={60}>60 minutos (1 hora)</option>
                    <option value={90}>90 minutos (1h 30m)</option>
                  </select>
                </div>
              </div>

              {/* Start Time and End Time */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-[10px] font-bold text-[#707060] uppercase tracking-wider mb-1">
                    Horário de Início *
                  </label>
                  <input
                    type="time"
                    value={formTime}
                    onChange={(e) => handleStartTimeChange(e.target.value)}
                    className="w-full bg-[#F5F5F0] border border-[#E5E5E0] rounded-2xl px-4 py-3 text-xs focus:border-[#5A5A40] focus:ring-1 focus:ring-[#5A5A40] outline-none transition-all font-mono"
                    required
                  />
                </div>
                <div>
                  <label className="block text-[10px] font-bold text-[#707060] uppercase tracking-wider mb-1">
                    Horário de Fim *
                  </label>
                  <input
                    type="time"
                    value={formEndTime}
                    onChange={(e) => handleEndTimeChange(e.target.value)}
                    className="w-full bg-[#F5F5F0] border border-[#E5E5E0] rounded-2xl px-4 py-3 text-xs focus:border-[#5A5A40] focus:ring-1 focus:ring-[#5A5A40] outline-none transition-all font-mono"
                    required
                  />
                </div>
              </div>

              {/* Type and Initial Status */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-[10px] font-bold text-[#707060] uppercase tracking-wider mb-1">
                    Tipo de Atendimento
                  </label>
                  <select
                    value={formType}
                    onChange={(e) => setFormType(e.target.value)}
                    className="w-full bg-[#F5F5F0] border border-[#E5E5E0] rounded-2xl px-4 py-3 text-xs focus:border-[#5A5A40] focus:ring-1 focus:ring-[#5A5A40] outline-none transition-all"
                  >
                    <option value="Primeira Consulta">Primeira Consulta</option>
                    <option value="Retorno">Retorno</option>
                    <option value="Exame">Exame</option>
                    <option value="Acompanhamento">Acompanhamento</option>
                  </select>
                </div>
                <div>
                  <label className="block text-[10px] font-bold text-[#707060] uppercase tracking-wider mb-1">
                    Status Inicial
                  </label>
                  <select
                    value={formStatus}
                    onChange={(e) => setFormStatus(e.target.value as AppointmentStatus)}
                    className="w-full bg-[#F5F5F0] border border-[#E5E5E0] rounded-2xl px-4 py-3 text-xs focus:border-[#5A5A40] focus:ring-1 focus:ring-[#5A5A40] outline-none transition-all"
                  >
                    <option value="Agendado">Agendado (Pendente)</option>
                    <option value="Confirmado">Confirmado</option>
                    <option value="Atendido">Atendido</option>
                  </select>
                </div>
              </div>

              {/* Notes */}
              <div>
                <label className="block text-[10px] font-bold text-[#707060] uppercase tracking-wider mb-1">
                  Observações de Entrada / Queixa Principal
                </label>
                <textarea
                  value={formNotes}
                  onChange={(e) => setFormNotes(e.target.value)}
                  placeholder="Dores recorrentes, preferência de horário, etc..."
                  rows={3}
                  className="w-full bg-[#F5F5F0] border border-[#E5E5E0] rounded-2xl px-4 py-3 text-xs leading-relaxed focus:border-[#5A5A40] focus:ring-1 focus:ring-[#5A5A40] outline-none transition-all"
                />
              </div>

              {/* Submit / Cancel buttons */}
              <div className="flex gap-3 pt-4">
                <button
                  type="button"
                  onClick={() => setShowNewAppModal(false)}
                  className="flex-1 px-4 py-3 border border-[#D8D8C0] text-[#5A5A40] rounded-2xl text-xs font-semibold hover:bg-[#F5F5F0] transition-all"
                >
                  Voltar
                </button>
                <button
                  type="submit"
                  className="flex-1 px-4 py-3 bg-[#5A5A40] text-white rounded-2xl text-xs font-bold hover:bg-[#474732] shadow-md transition-all"
                >
                  Salvar agendamento
                </button>
              </div>

            </form>
          </div>
        </div>
      )}

    </div>
  );
};
