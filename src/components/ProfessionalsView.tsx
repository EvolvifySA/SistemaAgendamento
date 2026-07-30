import React, { useState } from "react";
import { Professional, SystemUser } from "../types";
import { 
  Plus, 
  Edit2, 
  Mail, 
  Phone, 
  Clock, 
  Calendar, 
  Check, 
  AlertCircle, 
  User, 
  Sparkles,
  Search,
  CheckCircle2,
  XCircle
} from "lucide-react";

interface ProfessionalsViewProps {
  currentUser: SystemUser;
  professionals: Professional[];
  onAddProfessional: (newProf: Omit<Professional, "id">) => void;
  onUpdateProfessional: (updatedProf: Professional) => void;
}

export function ProfessionalsView({ 
  currentUser, 
  professionals, 
  onAddProfessional, 
  onUpdateProfessional 
}: ProfessionalsViewProps) {
  const isAdm = currentUser.role === "Administrador";

  const [searchTerm, setSearchTerm] = useState("");
  const [showModal, setShowModal] = useState(false);
  const [editingProf, setEditingProf] = useState<Professional | null>(null);

  // Form states
  const [name, setName] = useState("");
  const [specialty, setSpecialty] = useState("");
  const [phone, setPhone] = useState("");
  const [email, setEmail] = useState("");
  const [color, setColor] = useState("#5A5A40");
  const [active, setActive] = useState(true);
  const [workingHoursStart, setWorkingHoursStart] = useState("08:00");
  const [workingHoursEnd, setWorkingHoursEnd] = useState("18:00");
  const [workingDays, setWorkingDays] = useState<number[]>([1, 2, 3, 4, 5]);
  const [defaultDuration, setDefaultDuration] = useState(30);
  const [notes, setNotes] = useState("");

  const WEEK_DAYS = [
    { label: "Dom", value: 0 },
    { label: "Seg", value: 1 },
    { label: "Ter", value: 2 },
    { label: "Qua", value: 3 },
    { label: "Qui", value: 4 },
    { label: "Sex", value: 5 },
    { label: "Sáb", value: 6 }
  ];

  const PRESET_COLORS = [
    "#5A5A40", // Olive/Sage
    "#C17A63", // Coral/Terracotta
    "#4B6584", // Steel Blue
    "#778CA3", // Slate Gray
    "#20BF6B", // Emerald
    "#A55EEA", // Amethyst
    "#D1D8E0", // Light Sand
    "#B33939"  // Red Earth
  ];

  const handleOpenAdd = () => {
    setEditingProf(null);
    setName("");
    setSpecialty("");
    setPhone("");
    setEmail("");
    setColor("#5A5A40");
    setActive(true);
    setWorkingHoursStart("08:00");
    setWorkingHoursEnd("18:00");
    setWorkingDays([1, 2, 3, 4, 5]);
    setDefaultDuration(30);
    setNotes("");
    setShowModal(true);
  };

  const handleOpenEdit = (prof: Professional) => {
    setEditingProf(prof);
    setName(prof.name);
    setSpecialty(prof.specialty);
    setPhone(prof.phone || "");
    setEmail(prof.email || "");
    setColor(prof.color);
    setActive(prof.active);
    setWorkingHoursStart(prof.workingHoursStart);
    setWorkingHoursEnd(prof.workingHoursEnd);
    setWorkingDays(prof.workingDays);
    setDefaultDuration(prof.defaultDuration);
    setNotes(prof.notes || "");
    setShowModal(true);
  };

  const toggleDay = (dayValue: number) => {
    if (workingDays.includes(dayValue)) {
      setWorkingDays(workingDays.filter(d => d !== dayValue));
    } else {
      setWorkingDays([...workingDays, dayValue].sort());
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name || !specialty) {
      alert("Por favor, preencha o nome completo e a especialidade.");
      return;
    }

    const payload = {
      name,
      specialty,
      phone: phone || undefined,
      email: email || undefined,
      color,
      active,
      workingHoursStart,
      workingHoursEnd,
      workingDays,
      defaultDuration,
      notes: notes || undefined
    };

    if (editingProf) {
      onUpdateProfessional({ ...payload, id: editingProf.id });
      alert("✨ Profissional atualizada com sucesso!");
    } else {
      onAddProfessional(payload);
      alert("✨ Nova profissional cadastrada com sucesso!");
    }
    setShowModal(false);
  };

  const filteredProfs = professionals.filter(p => 
    p.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    p.specialty.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="space-y-6">
      
      {/* Header and Add Button */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <span className="text-[10px] font-extrabold text-[#C17A63] uppercase tracking-widest block mb-1">
            Gestão do Corpo Clínico
          </span>
          <h1 className="text-3xl font-serif italic text-[#5A5A40] font-semibold">
            Profissionais & Especialistas
          </h1>
          <p className="text-xs text-[#707060] mt-1">
            Configure as dentistas ativas, especialidades, horários de atendimento próprio e durações padrões de consultas.
          </p>
        </div>

        {isAdm && (
          <button
            onClick={handleOpenAdd}
            className="self-start md:self-auto bg-[#5A5A40] hover:bg-[#484833] text-white font-semibold text-xs px-5 py-3 rounded-2xl flex items-center gap-2 transition-all shadow-md active:scale-95"
          >
            <Plus className="w-4 h-4" />
            <span>Cadastrar Dentista</span>
          </button>
        )}
      </div>

      {/* Warning if not administrator */}
      {!isAdm && (
        <div className="bg-[#FBFBFA] border border-[#E5E5D8] rounded-2xl p-4 flex items-start gap-3">
          <AlertCircle className="w-5 h-5 text-[#C17A63] shrink-0 mt-0.5" />
          <div className="text-xs text-[#707060] leading-relaxed">
            <span className="font-bold text-[#1A1A1A]">Modo de Visualização:</span> Como membro da recepção ou corpo clínico, você pode visualizar e conferir os dados cadastrais, horários e cores de cada dentista. Alterações e novos cadastros requerem privilégios de <strong className="text-[#5A5A40]">Administrador</strong>.
          </div>
        </div>
      )}

      {/* Filter bar */}
      <div className="bg-white border border-[#E5E5E0] rounded-2xl p-4 shadow-sm flex items-center gap-3">
        <Search className="w-4 h-4 text-[#A0A090]" />
        <input
          type="text"
          placeholder="Buscar por nome ou especialidade..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="flex-1 bg-transparent border-0 outline-none placeholder-[#A0A090] text-xs"
        />
      </div>

      {/* Grid listing */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {filteredProfs.map(prof => (
          <div 
            key={prof.id}
            className="bg-white border border-[#E5E5E0] rounded-3xl p-6 shadow-sm hover:shadow-md transition-all relative overflow-hidden flex flex-col justify-between"
          >
            {/* Color Accent Indicator Strip */}
            <div 
              className="absolute top-0 left-0 right-0 h-1.5" 
              style={{ backgroundColor: prof.color }}
            />

            <div>
              {/* Top Row with Profile Avatar representation and Status Badge */}
              <div className="flex items-start justify-between gap-4">
                <div className="flex items-center gap-3">
                  <div 
                    className="w-12 h-12 rounded-full flex items-center justify-center font-serif italic text-white text-lg font-bold"
                    style={{ backgroundColor: prof.color }}
                  >
                    {prof.name.split(" ").filter(Boolean).map(n => n[0]).join("").slice(0, 2).toUpperCase()}
                  </div>
                  <div>
                    <h3 className="font-serif italic text-lg font-semibold text-[#1A1A1A] flex items-center gap-2">
                      {prof.name}
                    </h3>
                    <p className="text-xs text-[#C17A63] font-semibold">{prof.specialty}</p>
                  </div>
                </div>

                <div className="flex flex-col items-end gap-1.5">
                  <span className={`text-[9px] font-bold px-2 py-1 rounded-full uppercase tracking-wider ${
                    prof.active 
                      ? "bg-[#E2EBE5] text-[#2D5A27] border border-[#C5DAC9]" 
                      : "bg-[#F3EBEB] text-[#8C1D1D] border border-[#E9C3C3]"
                  }`}>
                    {prof.active ? "Ativa" : "Inativa"}
                  </span>
                  
                  <span className="text-[10px] text-[#A0A090] font-mono">
                    Duração: {prof.defaultDuration} min
                  </span>
                </div>
              </div>

              {/* Contact and schedule details */}
              <div className="mt-6 space-y-3.5 border-t border-[#F5F5F0] pt-4 text-xs text-[#707060]">
                {/* Contact items */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                  <div className="flex items-center gap-2">
                    <Mail className="w-3.5 h-3.5 text-[#A0A090]" />
                    <span className="truncate">{prof.email || "Não informado"}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Phone className="w-3.5 h-3.5 text-[#A0A090]" />
                    <span>{prof.phone || "Não informado"}</span>
                  </div>
                </div>

                {/* Hours and Days */}
                <div className="bg-[#FBFBFA] rounded-2xl p-3.5 border border-[#F0F0E8] space-y-2.5">
                  <div className="flex items-center gap-2 text-[#5A5A40]">
                    <Clock className="w-4 h-4" />
                    <span className="font-bold">Horário de Atendimento:</span>
                    <span className="font-mono bg-white px-2 py-0.5 rounded-md border border-[#E5E5D8] font-bold text-[11px]">
                      {prof.workingHoursStart} às {prof.workingHoursEnd}
                    </span>
                  </div>

                  <div className="flex items-center gap-2">
                    <Calendar className="w-4 h-4 text-[#A0A090]" />
                    <span className="font-semibold text-[#5A5A40]">Dias:</span>
                    <div className="flex gap-1 flex-wrap">
                      {WEEK_DAYS.map(day => {
                        const isWorking = prof.workingDays.includes(day.value);
                        return (
                          <span 
                            key={day.value}
                            className={`text-[9px] font-bold px-2 py-0.5 rounded ${
                              isWorking 
                                ? "bg-[#5A5A40] text-white" 
                                : "bg-[#E5E5E0] text-[#A0A090] line-through decoration-1"
                            }`}
                          >
                            {day.label}
                          </span>
                        );
                      })}
                    </div>
                  </div>
                </div>

                {/* Internal observations */}
                {prof.notes && (
                  <div className="mt-2 text-[11px] bg-[#FFFBF0] border border-[#F5EAD0] p-3 rounded-2xl italic leading-relaxed text-[#806B3E]">
                    <strong>Nota interna:</strong> {prof.notes}
                  </div>
                )}
              </div>
            </div>

            {/* Edit actions bottom row */}
            {isAdm && (
              <div className="mt-6 pt-4 border-t border-[#F5F5F0] flex justify-end">
                <button
                  onClick={() => handleOpenEdit(prof)}
                  className="bg-[#F5F5F0] hover:bg-[#EAEADF] text-[#5A5A40] text-xs font-bold px-4 py-2.5 rounded-xl flex items-center gap-1.5 transition-all"
                >
                  <Edit2 className="w-3.5 h-3.5" />
                  <span>Editar Perfil</span>
                </button>
              </div>
            )}
          </div>
        ))}

        {filteredProfs.length === 0 && (
          <div className="col-span-full bg-white border border-dashed border-[#E5E5E0] rounded-3xl p-12 text-center text-[#A0A090]">
            <Sparkles className="w-8 h-8 mx-auto mb-3 opacity-60" />
            <p className="text-xs font-semibold">Nenhuma profissional atende aos critérios de busca informados.</p>
          </div>
        )}
      </div>

      {/* ADD / EDIT MODAL */}
      {showModal && (
        <div className="fixed inset-0 bg-[#1A1A1A]/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl border border-[#E5E5E0] max-w-lg w-full max-h-[90vh] overflow-y-auto p-6 md:p-8 shadow-2xl space-y-6">
            
            {/* Modal Header */}
            <div>
              <div className="flex items-center justify-between">
                <span className="text-[9px] font-extrabold text-[#C17A63] uppercase tracking-widest block">
                  {editingProf ? "Atualizar Dentista" : "Novo Cadastro"}
                </span>
                <button 
                  onClick={() => setShowModal(false)}
                  className="text-[#A0A090] hover:text-[#5A5A40] text-xs font-semibold px-2 py-1 rounded-lg hover:bg-[#F2F2E9]"
                >
                  Fechar
                </button>
              </div>
              <h2 className="text-2xl font-serif italic text-[#5A5A40] font-semibold mt-1">
                {editingProf ? "Editar Profissional" : "Cadastrar Nova Profissional"}
              </h2>
            </div>

            {/* Form */}
            <form onSubmit={handleSubmit} className="space-y-4">
              
              {/* Name */}
              <div>
                <label className="block text-[10px] font-bold text-[#707060] uppercase tracking-wider mb-1">
                  Nome Completo *
                </label>
                <input
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="w-full bg-[#F5F5F0] border border-[#E5E5E0] rounded-2xl px-4 py-3 text-xs focus:border-[#5A5A40] focus:ring-1 focus:ring-[#5A5A40] outline-none transition-all font-semibold text-[#1A1A1A]"
                  placeholder="Ex: Dra. Juliana Menezes"
                  required
                />
              </div>

              {/* Specialty & Color */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-[10px] font-bold text-[#707060] uppercase tracking-wider mb-1">
                    Especialidade *
                  </label>
                  <input
                    type="text"
                    value={specialty}
                    onChange={(e) => setSpecialty(e.target.value)}
                    className="w-full bg-[#F5F5F0] border border-[#E5E5E0] rounded-2xl px-4 py-3 text-xs focus:border-[#5A5A40] focus:ring-1 focus:ring-[#5A5A40] outline-none transition-all font-semibold text-[#1A1A1A]"
                    placeholder="Ex: Dermatologia"
                    required
                  />
                </div>

                <div>
                  <label className="block text-[10px] font-bold text-[#707060] uppercase tracking-wider mb-1">
                    Cor na Agenda
                  </label>
                  <div className="flex gap-2 flex-wrap items-center mt-1.5">
                    {PRESET_COLORS.map(c => (
                      <button
                        key={c}
                        type="button"
                        onClick={() => setColor(c)}
                        className={`w-6 h-6 rounded-full border transition-all ${
                          color === c 
                            ? "ring-2 ring-offset-2 ring-[#5A5A40] scale-110" 
                            : "opacity-80 hover:opacity-100"
                        }`}
                        style={{ backgroundColor: c }}
                        title={c}
                      />
                    ))}
                    <input
                      type="color"
                      value={color}
                      onChange={(e) => setColor(e.target.value)}
                      className="w-8 h-8 rounded border-0 outline-none cursor-pointer p-0"
                    />
                  </div>
                </div>
              </div>

              {/* Phone & Email */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-[10px] font-bold text-[#707060] uppercase tracking-wider mb-1">
                    Telefone
                  </label>
                  <input
                    type="text"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    className="w-full bg-[#F5F5F0] border border-[#E5E5E0] rounded-2xl px-4 py-3 text-xs focus:border-[#5A5A40] focus:ring-1 focus:ring-[#5A5A40] outline-none transition-all"
                    placeholder="(11) 99999-9999"
                  />
                </div>

                <div>
                  <label className="block text-[10px] font-bold text-[#707060] uppercase tracking-wider mb-1">
                    E-mail
                  </label>
                  <input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="w-full bg-[#F5F5F0] border border-[#E5E5E0] rounded-2xl px-4 py-3 text-xs focus:border-[#5A5A40] focus:ring-1 focus:ring-[#5A5A40] outline-none transition-all"
                    placeholder="email@clinica.com"
                  />
                </div>
              </div>

              {/* Working Hours & Duration */}
              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className="block text-[9px] font-bold text-[#707060] uppercase tracking-wider mb-1">
                    Entrada
                  </label>
                  <input
                    type="time"
                    value={workingHoursStart}
                    onChange={(e) => setWorkingHoursStart(e.target.value)}
                    className="w-full bg-[#F5F5F0] border border-[#E5E5E0] rounded-2xl px-3 py-2.5 text-xs font-mono"
                    required
                  />
                </div>

                <div>
                  <label className="block text-[9px] font-bold text-[#707060] uppercase tracking-wider mb-1">
                    Saída
                  </label>
                  <input
                    type="time"
                    value={workingHoursEnd}
                    onChange={(e) => setWorkingHoursEnd(e.target.value)}
                    className="w-full bg-[#F5F5F0] border border-[#E5E5E0] rounded-2xl px-3 py-2.5 text-xs font-mono"
                    required
                  />
                </div>

                <div>
                  <label className="block text-[9px] font-bold text-[#707060] uppercase tracking-wider mb-1">
                    Duração Padrão
                  </label>
                  <select
                    value={defaultDuration}
                    onChange={(e) => setDefaultDuration(Number(e.target.value))}
                    className="w-full bg-[#F5F5F0] border border-[#E5E5E0] rounded-2xl px-3 py-2.5 text-xs font-semibold"
                  >
                    <option value={20}>20m</option>
                    <option value={30}>30m</option>
                    <option value={45}>45m</option>
                    <option value={60}>60m</option>
                    <option value={90}>90m</option>
                  </select>
                </div>
              </div>

              {/* Working Days Selector */}
              <div>
                <label className="block text-[10px] font-bold text-[#707060] uppercase tracking-wider mb-1">
                  Dias de Atendimento na Semana
                </label>
                <div className="flex gap-1.5 flex-wrap mt-1">
                  {WEEK_DAYS.map(day => {
                    const isSelected = workingDays.includes(day.value);
                    return (
                      <button
                        key={day.value}
                        type="button"
                        onClick={() => toggleDay(day.value)}
                        className={`text-xs font-semibold px-3 py-2 rounded-xl transition-all border ${
                          isSelected 
                            ? "bg-[#5A5A40] border-[#5A5A40] text-white shadow-sm" 
                            : "bg-[#F5F5F0] border-[#E5E5E0] text-[#707060] hover:bg-[#EAEADF]"
                        }`}
                      >
                        {day.label}
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Inativo / Ativo Toggle */}
              <div className="flex items-center gap-2 py-1">
                <input
                  type="checkbox"
                  id="activeToggle"
                  checked={active}
                  onChange={(e) => setActive(e.target.checked)}
                  className="w-4 h-4 text-[#5A5A40] border-[#E5E5E0] rounded focus:ring-[#5A5A40] cursor-pointer"
                />
                <label htmlFor="activeToggle" className="text-xs font-bold text-[#1A1A1A] cursor-pointer selection:bg-transparent">
                  Profissional ativa (disponível para agendamentos)
                </label>
              </div>

              {/* Internal notes */}
              <div>
                <label className="block text-[10px] font-bold text-[#707060] uppercase tracking-wider mb-1">
                  Observações Internas (Restrições, Notas de Agenda, etc.)
                </label>
                <textarea
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  className="w-full bg-[#F5F5F0] border border-[#E5E5E0] rounded-2xl px-4 py-3 text-xs outline-none focus:border-[#5A5A40] transition-all min-h-[70px] text-[#1A1A1A]"
                  placeholder="Instruções para a recepção sobre agendamentos desta dentista..."
                />
              </div>

              {/* Submit Buttons */}
              <div className="flex gap-3 justify-end pt-4 border-t border-[#F5F5F0]">
                <button
                  type="button"
                  onClick={() => setShowModal(false)}
                  className="bg-transparent hover:bg-[#F5F5F0] text-[#707060] font-semibold text-xs px-5 py-3 rounded-2xl transition-all"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="bg-[#5A5A40] hover:bg-[#484833] text-white font-semibold text-xs px-6 py-3 rounded-2xl transition-all shadow-md"
                >
                  {editingProf ? "Salvar Alterações" : "Cadastrar Dentista"}
                </button>
              </div>

            </form>

          </div>
        </div>
      )}

    </div>
  );
}
