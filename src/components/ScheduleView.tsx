import React, { useEffect, useMemo, useState } from "react";
import { Appointment, AppointmentStatus, ClinicSettings, Patient, Professional, SystemUser } from "../types";
import { CalInlineEmbed } from "./CalInlineEmbed";
import { BookOpenCheck, CalendarDays, CheckCircle2, ExternalLink, UserRoundCheck } from "lucide-react";

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

const tutorialSteps = [
  "Escolha a dentista na aba acima.",
  "Selecione a data e o horario disponivel no Cal.com.",
  "Preencha nome do paciente, WhatsApp e e-mail.",
  "Confirme a marcacao no formulario do Cal.com.",
  "Confira o booking no Dashboard apos webhook/sincronizacao."
];

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
  const defaultProfessionalId = useMemo(() => {
    if (currentUser.role !== "Doutora") return "";
    const match = professionals.find((professional) => professional.email === currentUser.email && professional.active);
    return match?.id || "";
  }, [currentUser, professionals]);

  const visibleProfessionals = useMemo(() => {
    const activeProfessionals = professionals.filter((professional) => professional.active);
    if (currentUser.role !== "Doutora") return activeProfessionals;
    return activeProfessionals.filter((professional) => professional.id === defaultProfessionalId);
  }, [currentUser, defaultProfessionalId, professionals]);

  const [selectedProfessionalId, setSelectedProfessionalId] = useState(defaultProfessionalId || visibleProfessionals[0]?.id || "");
  const [visitedProfessionalIds, setVisitedProfessionalIds] = useState<string[]>([]);

  const selectedProfessional = useMemo(() => {
    return visibleProfessionals.find((professional) => professional.id === selectedProfessionalId) || visibleProfessionals[0];
  }, [selectedProfessionalId, visibleProfessionals]);

  useEffect(() => {
    if (!selectedProfessional?.id) return;
    setVisitedProfessionalIds((current) =>
      current.includes(selectedProfessional.id) ? current : [...current, selectedProfessional.id]
    );
  }, [selectedProfessional?.id]);

  useEffect(() => {
    if (!defaultProfessionalId || selectedProfessionalId) return;
    setSelectedProfessionalId(defaultProfessionalId);
  }, [defaultProfessionalId, selectedProfessionalId]);

  useEffect(() => {
    if (!selectedAppointmentFromDashboard) return;
    setSelectedProfessionalId(selectedAppointmentFromDashboard.professionalId);
    clearSelectedAppointmentFromDashboard();
  }, [selectedAppointmentFromDashboard, clearSelectedAppointmentFromDashboard]);

  const mountedProfessionals = useMemo(() => {
    return visibleProfessionals.filter((professional) =>
      professional.id === selectedProfessional?.id || visitedProfessionalIds.includes(professional.id)
    );
  }, [selectedProfessional?.id, visibleProfessionals, visitedProfessionalIds]);

  const selectedTodayCount = useMemo(() => {
    const today = new Intl.DateTimeFormat("en-CA", {
      timeZone: settings.timezone || "America/Sao_Paulo",
      year: "numeric",
      month: "2-digit",
      day: "2-digit"
    }).format(new Date());
    return appointments.filter((appointment) =>
      appointment.date === today &&
      appointment.status !== "Cancelado" &&
      (!selectedProfessional?.id || appointment.professionalId === selectedProfessional.id)
    ).length;
  }, [appointments, selectedProfessional?.id, settings.timezone]);

  void patients;
  void dataMode;
  void onAddAppointment;
  void onUpdateAppointmentStatus;
  void onUpdateAppointment;

  return (
    <div className="space-y-6 animate-fade-in">
      <section id="cal-official-booking" className="space-y-4">
        <div className="flex flex-col xl:flex-row xl:items-end justify-between gap-4">
          <div>
            <span className="text-[10px] font-extrabold text-[#C17A63] uppercase tracking-widest block mb-1">
              Agenda oficial
            </span>
            <h1 className="font-serif text-3xl italic text-[#5A5A40] font-semibold">Cal.com por dentista</h1>
            <p className="text-xs text-[#707060] mt-1 max-w-2xl">
              As marcacoes sao feitas no Cal.com. Esta tela centraliza o embed oficial de cada dentista.
            </p>
          </div>

          <div className="flex flex-col sm:flex-row sm:items-center gap-3">
            <div className="bg-white border border-[#E5E5E0] rounded-2xl px-4 py-2.5 text-xs text-[#707060] flex items-center gap-2">
              <CalendarDays className="w-4 h-4 text-[#C17A63]" />
              <span>
                Hoje no painel: <strong className="text-[#1A1A1A]">{selectedTodayCount}</strong>
              </span>
            </div>
            <button
              type="button"
              onClick={onOpenNewPatient}
              className="inline-flex items-center justify-center gap-2 px-4 py-2.5 bg-white text-[#5A5A40] border border-[#D8D8C0] rounded-2xl text-xs font-bold hover:bg-[#F5F5F0] transition-all"
            >
              <UserRoundCheck className="w-4 h-4" />
              Novo paciente
            </button>
          </div>
        </div>

        <div className="bg-[#F5F5F0] border border-[#E5E5E0] rounded-2xl p-1 flex flex-wrap gap-1 w-fit">
          {visibleProfessionals.map((professional) => {
            const active = selectedProfessional?.id === professional.id;
            return (
              <button
                key={professional.id}
                type="button"
                onClick={() => setSelectedProfessionalId(professional.id)}
                className={`px-4 py-2 rounded-xl text-xs font-bold transition-all ${
                  active ? "bg-[#5A5A40] text-white shadow-sm" : "text-[#5A5A40] hover:bg-white"
                }`}
              >
                {professional.name}
              </button>
            );
          })}
        </div>

        {visibleProfessionals.length === 0 ? (
          <div className="bg-white border border-dashed border-[#E5E5E0] rounded-3xl p-10 text-center text-sm text-[#707060]">
            Nenhuma dentista ativa disponivel no painel.
          </div>
        ) : (
          <div>
            {mountedProfessionals.map((professional) => (
              <div
                key={professional.id}
                className={selectedProfessional?.id === professional.id ? "block" : "hidden"}
              >
                <CalInlineEmbed professional={professional} />
              </div>
            ))}
          </div>
        )}
      </section>

      <section className="bg-white border border-[#E5E5E0] rounded-3xl p-6 shadow-sm">
        <div className="flex flex-col lg:flex-row lg:items-start justify-between gap-6">
          <div className="max-w-lg">
            <div className="inline-flex items-center gap-2 text-[10px] font-extrabold text-[#C17A63] uppercase tracking-widest mb-2">
              <BookOpenCheck className="w-4 h-4" />
              Guia de agendamento
            </div>
            <h2 className="font-serif text-xl italic text-[#5A5A40] font-semibold">Fluxo recomendado para a recepcao</h2>
            <p className="text-xs text-[#707060] mt-1">
              Use este guia para marcar pelo Cal.com e depois acompanhar o booking sincronizado no painel.
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-5 gap-3 flex-1">
            {tutorialSteps.map((step, index) => (
              <div key={step} className="border border-[#F0F0E8] bg-[#FBFBFA] rounded-2xl p-4 min-h-[118px]">
                <div className="w-7 h-7 rounded-full bg-[#5A5A40] text-white text-xs font-bold flex items-center justify-center mb-3">
                  {index + 1}
                </div>
                <p className="text-[11px] text-[#1A1A1A] leading-relaxed font-semibold">{step}</p>
              </div>
            ))}
          </div>
        </div>

        <div className="mt-5 flex flex-wrap gap-3">
          {selectedProfessional?.calUsername && (
            <a
              href={`https://cal.com/${selectedProfessional.calUsername}`}
              target="_blank"
              rel="noreferrer"
              className="inline-flex items-center gap-2 text-xs font-bold text-[#5A5A40] hover:text-[#474732]"
            >
              <ExternalLink className="w-4 h-4" />
              Abrir agenda em nova aba
            </a>
          )}
          <span className="inline-flex items-center gap-2 text-xs text-[#707060]">
            <CheckCircle2 className="w-4 h-4 text-emerald-600" />
            O webhook do Cal.com alimenta Dashboard e Metricas.
          </span>
        </div>
      </section>
    </div>
  );
};
