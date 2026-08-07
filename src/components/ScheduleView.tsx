import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Appointment, BookingContext, CalBookingSuccess, ClinicSettings, Contact, Patient, Professional, SystemUser } from "../types";
import { CalInlineEmbed } from "./CalInlineEmbed";
import { ArrowLeft, BookOpenCheck, CalendarCheck2, CalendarDays, CheckCircle2, ExternalLink, LoaderCircle, RefreshCw, UserRoundCheck, X } from "lucide-react";

interface ScheduleViewProps {
  appointments: Appointment[];
  patients: Patient[];
  professionals: Professional[];
  currentUser: SystemUser;
  settings: ClinicSettings;
  onOpenNewPatient: () => void;
  bookingContext?: BookingContext;
  bookingPatient?: Patient;
  bookingContact?: Contact;
  preferredProfessionalId?: string;
  onClearBookingContext: () => void;
  onSyncCalBooking: (booking: CalBookingSuccess) => Promise<Appointment | null>;
  onViewAppointment: (appointment: Appointment) => void;
  onBackToDashboard: () => void;
  onStartNewBooking: (professionalId: string) => void;
}

interface CompletedBookingState {
  booking: CalBookingSuccess;
  patientName: string;
  patientPhone: string;
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
  onOpenNewPatient,
  bookingContext,
  bookingPatient,
  bookingContact,
  preferredProfessionalId,
  onClearBookingContext,
  onSyncCalBooking,
  onViewAppointment,
  onBackToDashboard,
  onStartNewBooking
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
  const [completedBooking, setCompletedBooking] = useState<CompletedBookingState | null>(null);
  const [syncedAppointment, setSyncedAppointment] = useState<Appointment | null>(null);
  const [syncStatus, setSyncStatus] = useState<"idle" | "syncing" | "synced" | "delayed">("idle");
  const [embedInstanceKey, setEmbedInstanceKey] = useState(0);
  const mountedRef = useRef(true);

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
    if (!preferredProfessionalId) return;
    if (!visibleProfessionals.some((professional) => professional.id === preferredProfessionalId)) return;
    setSelectedProfessionalId(preferredProfessionalId);
  }, [preferredProfessionalId, visibleProfessionals]);

  useEffect(() => {
    mountedRef.current = true;
    return () => {
      mountedRef.current = false;
    };
  }, []);

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

  const syncBooking = useCallback(async (booking: CalBookingSuccess) => {
    if (!booking.uid) {
      setSyncStatus("delayed");
      return;
    }

    setSyncStatus("syncing");
    const appointment = await onSyncCalBooking(booking);
    if (!mountedRef.current) return;
    if (appointment) {
      setSyncedAppointment(appointment);
      setSyncStatus("synced");
    } else {
      setSyncStatus("delayed");
    }
  }, [onSyncCalBooking]);

  const handleBookingSuccessful = useCallback((booking: CalBookingSuccess) => {
    setCompletedBooking({
      booking,
      patientName: bookingPatient?.name || bookingContact?.name || "Agendamento Cal.com",
      patientPhone: bookingPatient?.phone || bookingContact?.phone || ""
    });
    setSyncedAppointment(null);
    void syncBooking(booking);
  }, [bookingContact?.name, bookingContact?.phone, bookingPatient?.name, bookingPatient?.phone, syncBooking]);

  const resetForNewBooking = (professionalId: string) => {
    setCompletedBooking(null);
    setSyncedAppointment(null);
    setSyncStatus("idle");
    setEmbedInstanceKey((current) => current + 1);
    onStartNewBooking(professionalId);
  };

  const formatBookingMoment = (value?: string) => {
    if (!value) return "Horario nao informado";
    const parsed = new Date(value);
    if (Number.isNaN(parsed.getTime())) return value;
    return new Intl.DateTimeFormat("pt-BR", {
      timeZone: settings.timezone || "America/Sao_Paulo",
      weekday: "long",
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit"
    }).format(parsed);
  };

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

        {bookingContext && bookingPatient && (
          <div className="bg-white border border-[#E5E5E0] rounded-2xl p-4 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-3">
            <div>
              <p className="text-[10px] uppercase tracking-wider font-extrabold text-[#C17A63]">
                {bookingContext.intent === "return" ? "Agendar retorno vinculado" : "Novo agendamento vinculado"}
              </p>
              <p className="text-sm font-bold text-[#1A1A1A] mt-1">{bookingPatient.name}</p>
              <p className="text-xs text-[#707060] mt-0.5">
                {bookingPatient.phone}
                {bookingPatient.email ? ` - ${bookingPatient.email}` : ""}
              </p>
              {(!bookingContact || (bookingContact.professionalIds || []).length !== 1) && (
                <p className="text-[11px] text-amber-700 font-semibold mt-2">
                  Escolha abaixo a agenda da dentista para este atendimento.
                </p>
              )}
            </div>
            <button
              type="button"
              onClick={onClearBookingContext}
              className="inline-flex items-center justify-center gap-1.5 px-3 py-2 bg-[#F5F5F0] text-[#5A5A40] border border-[#D8D8C0] rounded-xl text-xs font-bold hover:bg-white transition-all"
            >
              <X className="w-3.5 h-3.5" />
              Limpar vinculo
            </button>
          </div>
        )}

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
                {completedBooking?.booking.professionalId === professional.id ? (
                  <div className="bg-white border border-[#D8D8C0] rounded-2xl shadow-sm overflow-hidden">
                    <div className="px-6 py-8 sm:px-10 sm:py-10 text-center border-b border-[#E5E5E0]">
                      <div className="w-12 h-12 mx-auto rounded-full bg-green-50 border border-green-200 flex items-center justify-center text-green-700">
                        <CalendarCheck2 className="w-6 h-6" />
                      </div>
                      <p className="text-[10px] uppercase font-bold text-[#C17A63] mt-4">Agendamento concluido</p>
                      <h2 className="font-serif text-2xl text-[#5A5A40] mt-1">
                        {syncedAppointment?.patientName || completedBooking.patientName}
                      </h2>
                      <p className="text-sm text-[#1A1A1A] mt-3 capitalize">
                        {formatBookingMoment(completedBooking.booking.startTime)}
                      </p>
                      <p className="text-xs text-[#707060] mt-1">
                        {professional.name}{(syncedAppointment?.patientPhone || completedBooking.patientPhone)
                          ? ` - ${syncedAppointment?.patientPhone || completedBooking.patientPhone}`
                          : ""}
                      </p>
                    </div>

                    <div className="px-6 py-5 sm:px-10 flex flex-col gap-4">
                      <div className={`flex items-center gap-2 text-xs font-semibold ${
                        syncStatus === "synced" ? "text-green-700" : syncStatus === "delayed" ? "text-amber-800" : "text-[#707060]"
                      }`}>
                        {syncStatus === "syncing" && <LoaderCircle className="w-4 h-4 animate-spin" />}
                        {syncStatus === "synced" && <CheckCircle2 className="w-4 h-4" />}
                        {syncStatus === "delayed" && <RefreshCw className="w-4 h-4" />}
                        <span>
                          {syncStatus === "synced"
                            ? "Agendamento sincronizado com o painel."
                            : syncStatus === "delayed"
                              ? "O webhook ainda nao apareceu no painel."
                              : "Sincronizando com o painel..."}
                        </span>
                      </div>

                      <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                        <button
                          type="button"
                          onClick={onBackToDashboard}
                          className="inline-flex items-center justify-center gap-2 px-4 py-3 border border-[#D8D8C0] text-[#5A5A40] rounded-lg text-xs font-bold hover:bg-[#F5F5F0]"
                        >
                          <ArrowLeft className="w-4 h-4" />
                          Dashboard
                        </button>
                        <button
                          type="button"
                          onClick={() => syncedAppointment && onViewAppointment(syncedAppointment)}
                          disabled={!syncedAppointment}
                          className="inline-flex items-center justify-center gap-2 px-4 py-3 bg-[#5A5A40] text-white rounded-lg text-xs font-bold disabled:opacity-40"
                        >
                          <CalendarDays className="w-4 h-4" />
                          Ver agendamento
                        </button>
                        <button
                          type="button"
                          onClick={() => resetForNewBooking(professional.id)}
                          className="inline-flex items-center justify-center gap-2 px-4 py-3 border border-[#D8D8C0] text-[#5A5A40] rounded-lg text-xs font-bold hover:bg-[#F5F5F0]"
                        >
                          <RefreshCw className="w-4 h-4" />
                          Novo agendamento
                        </button>
                      </div>

                      {syncStatus === "delayed" && (
                        <button
                          type="button"
                          onClick={() => void syncBooking(completedBooking.booking)}
                          className="self-start text-xs font-bold text-[#5A5A40] underline underline-offset-4"
                        >
                          Tentar sincronizar novamente
                        </button>
                      )}
                    </div>
                  </div>
                ) : (
                  <CalInlineEmbed
                    professional={professional}
                    bookingContext={bookingContext}
                    bookingPatient={bookingPatient}
                    bookingContact={bookingContact}
                    instanceKey={embedInstanceKey}
                    onBookingSuccessful={handleBookingSuccessful}
                  />
                )}
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
