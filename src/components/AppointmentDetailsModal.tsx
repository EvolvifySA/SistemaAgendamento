import React, { useEffect, useMemo, useState } from "react";
import {
  Ban,
  CalendarDays,
  CheckCircle2,
  Clock3,
  MessageCircle,
  Phone,
  UserRound,
  X
} from "lucide-react";
import { Appointment, Professional, SystemUser } from "../types";

interface AppointmentDetailsModalProps {
  appointment: Appointment | null;
  professionals: Professional[];
  currentUser: SystemUser;
  onClose: () => void;
  onCancel: (appointment: Appointment, cancellationReason: string) => Promise<Appointment>;
}

function displayDate(date: string) {
  const [year, month, day] = date.split("-");
  return year && month && day ? `${day}/${month}/${year}` : date;
}

export const AppointmentDetailsModal: React.FC<AppointmentDetailsModalProps> = ({
  appointment,
  professionals,
  currentUser,
  onClose,
  onCancel
}) => {
  const [showCancellation, setShowCancellation] = useState(false);
  const [cancellationReason, setCancellationReason] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    setShowCancellation(false);
    setCancellationReason("");
    setSubmitting(false);
    setError("");
  }, [appointment?.id]);

  useEffect(() => {
    if (!appointment) return;
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape" && !submitting) onClose();
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [appointment, onClose, submitting]);

  const professional = useMemo(
    () => professionals.find((item) => item.id === appointment?.professionalId),
    [appointment?.professionalId, professionals]
  );
  const currentProfessional = useMemo(
    () => professionals.find((item) => item.email?.toLowerCase() === currentUser.email.toLowerCase()),
    [currentUser.email, professionals]
  );
  const canCancelForRole = currentUser.role !== "Doutora" || currentProfessional?.id === appointment?.professionalId;
  const canCancel = Boolean(
    appointment?.calBookingUid &&
    appointment.status !== "Cancelado" &&
    canCancelForRole
  );

  if (!appointment) return null;

  const confirmationLabel = appointment.confirmationStatus === "confirmed"
    ? "Confirmado pelo WhatsApp"
    : appointment.confirmationStatus === "declined"
      ? "Paciente pediu reagendamento"
      : "Aguardando confirmacao";

  const handleConfirmCancellation = async () => {
    const reason = cancellationReason.trim();
    if (!reason) {
      setError("Informe o motivo do cancelamento.");
      return;
    }

    setSubmitting(true);
    setError("");
    try {
      await onCancel(appointment, reason);
      setShowCancellation(false);
      setCancellationReason("");
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : "Nao foi possivel cancelar o agendamento.");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div
      className="fixed inset-0 z-[70] bg-black/45 p-4 flex items-center justify-center"
      role="dialog"
      aria-modal="true"
      aria-labelledby="appointment-details-title"
      onMouseDown={(event) => {
        if (event.target === event.currentTarget && !submitting) onClose();
      }}
    >
      <div className="w-full max-w-xl max-h-[92vh] overflow-y-auto bg-white border border-[#E5E5E0] rounded-2xl shadow-2xl">
        <div className="px-6 py-5 border-b border-[#E5E5E0] flex items-start justify-between gap-4">
          <div>
            <p className="text-[10px] uppercase font-bold text-[#C17A63]">Detalhes do atendimento</p>
            <h2 id="appointment-details-title" className="font-serif text-2xl text-[#5A5A40] mt-1">
              {appointment.patientName}
            </h2>
          </div>
          <button
            type="button"
            onClick={onClose}
            disabled={submitting}
            className="w-9 h-9 inline-flex items-center justify-center border border-[#E5E5E0] rounded-lg text-[#707060] hover:bg-[#F5F5F0] disabled:opacity-50"
            title="Fechar"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="px-6 py-5 space-y-5">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-4 text-xs">
            <div className="flex gap-3">
              <CalendarDays className="w-4 h-4 text-[#C17A63] shrink-0" />
              <div><p className="text-[#707060]">Data</p><p className="font-bold mt-0.5">{displayDate(appointment.date)}</p></div>
            </div>
            <div className="flex gap-3">
              <Clock3 className="w-4 h-4 text-[#C17A63] shrink-0" />
              <div><p className="text-[#707060]">Horario</p><p className="font-bold mt-0.5">{appointment.time} - {appointment.endTime}</p></div>
            </div>
            <div className="flex gap-3">
              <UserRound className="w-4 h-4 text-[#C17A63] shrink-0" />
              <div><p className="text-[#707060]">Dentista</p><p className="font-bold mt-0.5">{professional?.name || "Nao identificada"}</p></div>
            </div>
            <div className="flex gap-3">
              <Phone className="w-4 h-4 text-[#C17A63] shrink-0" />
              <div><p className="text-[#707060]">Telefone</p><p className="font-bold mt-0.5">{appointment.patientPhone || "Nao informado"}</p></div>
            </div>
            <div className="flex gap-3">
              <CheckCircle2 className="w-4 h-4 text-[#C17A63] shrink-0" />
              <div><p className="text-[#707060]">Status</p><p className="font-bold mt-0.5">{appointment.status}</p></div>
            </div>
            <div className="flex gap-3">
              <MessageCircle className="w-4 h-4 text-[#C17A63] shrink-0" />
              <div><p className="text-[#707060]">WhatsApp</p><p className="font-bold mt-0.5">{confirmationLabel}</p></div>
            </div>
          </div>

          <div className="border-t border-[#E5E5E0] pt-4 text-xs">
            <p className="text-[#707060]">Tipo de atendimento</p>
            <p className="font-bold mt-1">{appointment.type}</p>
            {appointment.notes && <p className="text-[#707060] mt-2 leading-relaxed">{appointment.notes}</p>}
          </div>

          {appointment.status === "Cancelado" && (
            <div className="border border-red-200 bg-red-50 px-4 py-3 rounded-lg text-xs text-red-800">
              <p className="font-bold">Agendamento cancelado</p>
              <p className="mt-1">{appointment.cancellationReason || "Motivo nao informado."}</p>
            </div>
          )}

          {!canCancelForRole && appointment.status !== "Cancelado" && (
            <p className="text-xs text-amber-800 bg-amber-50 border border-amber-200 px-4 py-3 rounded-lg">
              Esta conta pode cancelar somente atendimentos da propria agenda.
            </p>
          )}

          {showCancellation && canCancel && (
            <div className="border-t border-[#E5E5E0] pt-5 space-y-3">
              <label htmlFor="cancellation-reason" className="text-xs font-bold text-[#1A1A1A]">
                Motivo do cancelamento
              </label>
              <textarea
                id="cancellation-reason"
                value={cancellationReason}
                onChange={(event) => setCancellationReason(event.target.value)}
                rows={3}
                disabled={submitting}
                placeholder="Ex.: paciente solicitou reagendamento"
                className="w-full bg-[#F5F5F0] border border-[#D8D8C0] rounded-lg px-4 py-3 text-sm outline-none focus:border-[#5A5A40] disabled:opacity-60"
              />
              {error && <p className="text-xs font-semibold text-red-700">{error}</p>}
              <div className="flex flex-col-reverse sm:flex-row sm:justify-end gap-2">
                <button
                  type="button"
                  onClick={() => { setShowCancellation(false); setError(""); }}
                  disabled={submitting}
                  className="px-4 py-2.5 border border-[#D8D8C0] text-[#5A5A40] rounded-lg text-xs font-bold disabled:opacity-50"
                >
                  Manter agendamento
                </button>
                <button
                  type="button"
                  onClick={() => void handleConfirmCancellation()}
                  disabled={submitting}
                  className="px-4 py-2.5 bg-red-700 text-white rounded-lg text-xs font-bold disabled:opacity-50"
                >
                  {submitting ? "Cancelando no Cal.com..." : "Confirmar cancelamento"}
                </button>
              </div>
            </div>
          )}
        </div>

        <div className="px-6 py-4 border-t border-[#E5E5E0] flex flex-col-reverse sm:flex-row sm:justify-between gap-2">
          <button
            type="button"
            onClick={onClose}
            disabled={submitting}
            className="px-4 py-2.5 border border-[#D8D8C0] text-[#5A5A40] rounded-lg text-xs font-bold disabled:opacity-50"
          >
            Fechar
          </button>
          {canCancel && !showCancellation && (
            <button
              type="button"
              onClick={() => setShowCancellation(true)}
              className="inline-flex items-center justify-center gap-2 px-4 py-2.5 bg-red-50 border border-red-200 text-red-800 rounded-lg text-xs font-bold"
            >
              <Ban className="w-4 h-4" />
              Cancelar agendamento
            </button>
          )}
        </div>
      </div>
    </div>
  );
};
