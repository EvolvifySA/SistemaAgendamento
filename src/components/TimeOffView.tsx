import React, { useMemo, useState } from "react";
import { Professional, SystemUser, TimeOffEntry } from "../types";
import { CalendarOff, Plus, Trash2 } from "lucide-react";

interface TimeOffViewProps {
  currentUser: SystemUser;
  professionals: Professional[];
  timeOff: TimeOffEntry[];
  onSaveTimeOff: (entry: Omit<TimeOffEntry, "id" | "source"> | TimeOffEntry) => void;
  onDeleteTimeOff: (entry: TimeOffEntry) => void;
}

export const TimeOffView: React.FC<TimeOffViewProps> = ({
  currentUser,
  professionals,
  timeOff,
  onSaveTimeOff,
  onDeleteTimeOff
}) => {
  const visibleProfessionals = useMemo(() => {
    if (currentUser.role !== "Doutora") return professionals;
    const own = professionals.find(professional => professional.email === currentUser.email);
    return own ? [own] : [];
  }, [currentUser, professionals]);

  const [professionalId, setProfessionalId] = useState(visibleProfessionals[0]?.id || "");
  const [start, setStart] = useState("");
  const [end, setEnd] = useState("");
  const [reason, setReason] = useState<TimeOffEntry["reason"]>("vacation");
  const [notes, setNotes] = useState("");
  const selectedProfessional = visibleProfessionals.find(professional => professional.id === professionalId);
  const calReady = Boolean(
    selectedProfessional?.calAccountType === "individual"
      ? selectedProfessional.calApiKeyEnvVar
      : selectedProfessional?.calUserId && (selectedProfessional.calTeamId || selectedProfessional.calOrgId)
  );

  const handleSubmit = (event: React.FormEvent) => {
    event.preventDefault();
    if (!professionalId || !start || !end || !calReady) return;
    onSaveTimeOff({
      professionalId,
      start: new Date(start).toISOString(),
      end: new Date(end).toISOString(),
      reason,
      notes
    });
    setStart("");
    setEnd("");
    setNotes("");
  };

  return (
    <div className="space-y-6 animate-fade-in">
      <div>
        <span className="text-[10px] font-extrabold text-[#C17A63] uppercase tracking-widest block mb-1">
          Disponibilidade Cal.com
        </span>
        <h1 className="text-3xl font-serif italic text-[#5A5A40] font-semibold">Folgas / Bloqueios</h1>
        <p className="text-xs text-[#707060] mt-1">Bloqueios criados aqui são enviados ao Out-of-Office do Cal.com quando a dentista está conectada.</p>
      </div>

      {selectedProfessional && !calReady && (
        <div className="bg-amber-50 border border-amber-200 text-amber-900 rounded-2xl p-4 text-xs leading-relaxed">
          <strong>Cal.com nao conectado para folgas:</strong> no modo individual, informe em Profissionais a variavel de ambiente da API key da dentista. Em Team/Org, preencha Cal User ID + Cal Team ID ou Cal Org ID antes de criar bloqueios reais.
        </div>
      )}

      <form onSubmit={handleSubmit} className="bg-white border border-[#E5E5E0] rounded-3xl p-6 shadow-sm grid grid-cols-1 md:grid-cols-5 gap-4 items-end">
        <div>
          <label className="block text-[10px] font-bold text-[#707060] uppercase tracking-wider mb-1">Dentista</label>
          <select value={professionalId} onChange={(e) => setProfessionalId(e.target.value)} className="w-full bg-[#F5F5F0] border border-[#E5E5E0] rounded-2xl px-3 py-3 text-xs font-bold">
            {visibleProfessionals.map(professional => (
              <option key={professional.id} value={professional.id}>{professional.name}</option>
            ))}
          </select>
        </div>
        <div>
          <label className="block text-[10px] font-bold text-[#707060] uppercase tracking-wider mb-1">Início</label>
          <input type="datetime-local" value={start} onChange={(e) => setStart(e.target.value)} className="w-full bg-[#F5F5F0] border border-[#E5E5E0] rounded-2xl px-3 py-3 text-xs" required />
        </div>
        <div>
          <label className="block text-[10px] font-bold text-[#707060] uppercase tracking-wider mb-1">Fim</label>
          <input type="datetime-local" value={end} onChange={(e) => setEnd(e.target.value)} className="w-full bg-[#F5F5F0] border border-[#E5E5E0] rounded-2xl px-3 py-3 text-xs" required />
        </div>
        <div>
          <label className="block text-[10px] font-bold text-[#707060] uppercase tracking-wider mb-1">Motivo</label>
          <select value={reason} onChange={(e) => setReason(e.target.value as TimeOffEntry["reason"])} className="w-full bg-[#F5F5F0] border border-[#E5E5E0] rounded-2xl px-3 py-3 text-xs">
            <option value="vacation">Folga/Férias</option>
            <option value="sick">Saúde</option>
            <option value="travel">Viagem</option>
            <option value="public_holiday">Feriado</option>
            <option value="unspecified">Outro</option>
          </select>
        </div>
        <button type="submit" disabled={!calReady} className="bg-[#5A5A40] hover:bg-[#484833] disabled:bg-[#D8D8C0] disabled:cursor-not-allowed text-white font-bold text-xs px-5 py-3 rounded-2xl flex items-center justify-center gap-2 shadow-md">
          <Plus className="w-4 h-4" />
          Criar bloqueio
        </button>
        <textarea value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="Observações internas" className="md:col-span-5 bg-[#F5F5F0] border border-[#E5E5E0] rounded-2xl px-4 py-3 text-xs" />
      </form>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {timeOff.map(entry => {
          const professional = professionals.find(item => item.id === entry.professionalId);
          return (
            <div key={entry.id} className="bg-white border border-[#E5E5E0] rounded-3xl p-5 shadow-sm flex items-center justify-between gap-4">
              <div className="flex items-start gap-3">
                <div className="w-10 h-10 rounded-full bg-[#F2F2E9] text-[#5A5A40] flex items-center justify-center">
                  <CalendarOff className="w-5 h-5" />
                </div>
                <div>
                  <p className="font-bold text-sm text-[#1A1A1A]">{professional?.name || "Dentista"}</p>
                  <p className="text-xs text-[#707060]">{new Date(entry.start).toLocaleString()} - {new Date(entry.end).toLocaleString()}</p>
                  <p className="text-[10px] text-[#C17A63] uppercase font-bold mt-1">{entry.source === "cal.com" ? "Sincronizado com Cal.com" : "Pendente/local"}</p>
                  {entry.notes && <p className="text-[11px] text-[#707060] italic mt-1">"{entry.notes}"</p>}
                </div>
              </div>
              <button onClick={() => onDeleteTimeOff(entry)} className="p-2 text-red-600 hover:bg-red-50 rounded-xl">
                <Trash2 className="w-4 h-4" />
              </button>
            </div>
          );
        })}
      </div>
    </div>
  );
};
