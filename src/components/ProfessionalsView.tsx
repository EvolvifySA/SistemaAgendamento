import React, { useState } from "react";
import { Professional, SystemUser } from "../types";
import { apiClient } from "../services/apiClient";
import { 
  Plus, 
  Edit2, 
  Mail, 
  Phone, 
  AlertCircle, 
  User, 
  Sparkles,
  Search,
  CheckCircle2,
  XCircle,
  RefreshCw
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
  const [calUsername, setCalUsername] = useState("");
  const [calEventTypeId, setCalEventTypeId] = useState("");
  const [calUserId, setCalUserId] = useState("");
  const [calTeamId, setCalTeamId] = useState("");
  const [calOrgId, setCalOrgId] = useState("");
  const [calAccountType, setCalAccountType] = useState<"individual" | "team" | "organization">("individual");
  const [calApiKeyEnvVar, setCalApiKeyEnvVar] = useState("");
  const [syncingCal, setSyncingCal] = useState(false);

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
    setCalUsername("");
    setCalEventTypeId("");
    setCalUserId("");
    setCalTeamId("");
    setCalOrgId("");
    setCalAccountType("individual");
    setCalApiKeyEnvVar("");
    setSyncingCal(false);
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
    setCalUsername(prof.calUsername || "");
    setCalEventTypeId(prof.calEventTypeId ? String(prof.calEventTypeId) : "");
    setCalUserId(prof.calUserId ? String(prof.calUserId) : "");
    setCalTeamId(prof.calTeamId ? String(prof.calTeamId) : "");
    setCalOrgId(prof.calOrgId ? String(prof.calOrgId) : "");
    setCalAccountType(prof.calAccountType || "individual");
    setCalApiKeyEnvVar(prof.calApiKeyEnvVar || "");
    setSyncingCal(false);
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
      notes: notes || undefined,
      calUsername: calUsername.trim().replace(/^https?:\/\/(app\.)?cal\.com\//, "").replace(/^@/, "").replace(/\/$/, "") || undefined,
      calEventTypeId: calEventTypeId ? Number(calEventTypeId) : undefined,
      calUserId: calUserId ? Number(calUserId) : undefined,
      calTeamId: calTeamId ? Number(calTeamId) : undefined,
      calOrgId: calOrgId ? Number(calOrgId) : undefined,
      calAccountType,
      calApiKeyEnvVar: calApiKeyEnvVar.trim() || undefined
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

  const handleSyncCalEventType = async () => {
    if (!editingProf) {
      alert("Salve a dentista antes de sincronizar o Event Type do Cal.com.");
      return;
    }
    if (!calEventTypeId) {
      alert("Informe o Event Type ID antes de sincronizar.");
      return;
    }

    try {
      setSyncingCal(true);
      const updated = await apiClient.syncProfessionalEventType(editingProf.id, Number(calEventTypeId));
      setCalUsername(updated.calUsername || "");
      setCalEventTypeId(updated.calEventTypeId ? String(updated.calEventTypeId) : "");
      setCalAccountType(updated.calAccountType || "individual");
      setCalApiKeyEnvVar(updated.calApiKeyEnvVar || "");
      onUpdateProfessional(updated);
      alert("Cal.com sincronizado com sucesso.");
    } catch (error) {
      alert(error instanceof Error ? error.message : "Nao foi possivel sincronizar o Event Type do Cal.com.");
    } finally {
      setSyncingCal(false);
    }
  };

  const filteredProfs = professionals.filter(p => 
    p.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    p.specialty.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const hasTimeOffConnection = (prof: Professional) => {
    if ((prof.calAccountType || "individual") === "individual") {
      return Boolean(prof.calApiKeyEnvVar);
    }
    return Boolean(prof.calUserId && (prof.calTeamId || prof.calOrgId));
  };

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
            Configure dados cadastrais, status de ativo/folga e integração de calendario de cada dentista.
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
            <span className="font-bold text-[#1A1A1A]">Modo de Visualização:</span> Como membro da recepção ou corpo clínico, você pode visualizar os dados cadastrais e a conexão Cal.com de cada dentista. Alterações e novos cadastros requerem privilégios de <strong className="text-[#5A5A40]">Administrador</strong>.
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
                  
                  <span className={`text-[9px] font-bold px-2 py-1 rounded-full uppercase tracking-wider inline-flex items-center gap-1 ${
                    prof.calUsername && prof.calEventTypeId
                      ? "bg-[#E2EBE5] text-[#2D5A27] border border-[#C5DAC9]"
                      : "bg-[#F3EBEB] text-[#8C1D1D] border border-[#E9C3C3]"
                  }`}>
                    {prof.calUsername && prof.calEventTypeId ? <CheckCircle2 className="w-3 h-3" /> : <XCircle className="w-3 h-3" />}
                    Agendamento
                  </span>
                  <span className={`text-[9px] font-bold px-2 py-1 rounded-full uppercase tracking-wider inline-flex items-center gap-1 ${
                    hasTimeOffConnection(prof)
                      ? "bg-[#E2EBE5] text-[#2D5A27] border border-[#C5DAC9]"
                      : "bg-[#F3EBEB] text-[#8C1D1D] border border-[#E9C3C3]"
                  }`}>
                    {hasTimeOffConnection(prof) ? <CheckCircle2 className="w-3 h-3" /> : <XCircle className="w-3 h-3" />}
                    Folgas
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

                <div className="bg-[#FBFBFA] rounded-2xl p-3.5 border border-[#F0F0E8] space-y-2.5">
                  <div className="flex flex-col sm:flex-row sm:items-center gap-2 text-[#5A5A40]">
                    <span className="font-bold">Agenda oficial:</span>
                    <span className="font-mono bg-white px-2 py-0.5 rounded-md border border-[#E5E5D8] font-bold text-[11px]">
                      {prof.calUsername ? `cal.com/${prof.calUsername}` : "Cal.com não conectado"}
                    </span>
                  </div>
                  <p className="text-[10px] text-[#707060] leading-relaxed">
                    O status ativa/inativa controla a exibição desta dentista no painel. Disponibilidade, duração e dias de atendimento continuam sendo configurados no Cal.com.
                  </p>
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

              <div className="bg-[#FBFBFA] border border-[#F0F0E8] rounded-2xl p-4 space-y-4">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="text-[10px] font-bold text-[#C17A63] uppercase tracking-wider">Integração Cal.com</p>
                    <p className="text-[11px] text-[#707060] mt-1">
                      Link e Event Type liberam o embed. Folgas usam API key individual ou IDs Team/Org.
                    </p>
                  </div>
                  <div className="flex flex-col items-end gap-1">
                    <span className={`text-[9px] font-bold px-2 py-1 rounded-full uppercase tracking-wider ${
                      calUsername && calEventTypeId
                        ? "bg-[#E2EBE5] text-[#2D5A27] border border-[#C5DAC9]"
                        : "bg-[#F3EBEB] text-[#8C1D1D] border border-[#E9C3C3]"
                    }`}>
                      {calUsername && calEventTypeId ? "Agendamento conectado" : "Agendamento pendente"}
                    </span>
                    <span className={`text-[9px] font-bold px-2 py-1 rounded-full uppercase tracking-wider ${
                      calAccountType === "individual" ? calApiKeyEnvVar : calUserId && (calTeamId || calOrgId)
                        ? "bg-[#E2EBE5] text-[#2D5A27] border border-[#C5DAC9]"
                        : "bg-[#F3EBEB] text-[#8C1D1D] border border-[#E9C3C3]"
                    }`}>
                      {(calAccountType === "individual" ? calApiKeyEnvVar : calUserId && (calTeamId || calOrgId)) ? "Folgas conectadas" : "Folgas pendentes"}
                    </span>
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-[10px] font-bold text-[#707060] uppercase tracking-wider mb-1">
                      Link público Cal.com
                    </label>
                    <input
                      type="text"
                      value={calUsername}
                      onChange={(e) => setCalUsername(e.target.value)}
                      className="w-full bg-white border border-[#E5E5E0] rounded-2xl px-4 py-3 text-xs focus:border-[#5A5A40] focus:ring-1 focus:ring-[#5A5A40] outline-none transition-all"
                      placeholder="evolvify/30min"
                    />
                  </div>

                  <div>
                    <label className="block text-[10px] font-bold text-[#707060] uppercase tracking-wider mb-1">
                      Event Type ID
                    </label>
                    <div className="flex gap-2">
                      <input
                        type="number"
                        value={calEventTypeId}
                        onChange={(e) => setCalEventTypeId(e.target.value)}
                        className="min-w-0 flex-1 bg-white border border-[#E5E5E0] rounded-2xl px-4 py-3 text-xs focus:border-[#5A5A40] focus:ring-1 focus:ring-[#5A5A40] outline-none transition-all"
                        placeholder="6546777"
                      />
                      <button
                        type="button"
                        onClick={handleSyncCalEventType}
                        disabled={!editingProf || !calEventTypeId || syncingCal}
                        className="px-3 py-2 bg-[#5A5A40] disabled:bg-[#D8D8C0] text-white rounded-2xl text-[10px] font-bold inline-flex items-center gap-1.5 transition-all"
                        title="Sincronizar Event Type"
                      >
                        <RefreshCw className={`w-3.5 h-3.5 ${syncingCal ? "animate-spin" : ""}`} />
                        Sync
                      </button>
                    </div>
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                  <div>
                    <label className="block text-[10px] font-bold text-[#707060] uppercase tracking-wider mb-1">
                      Cal User ID
                    </label>
                    <input
                      type="number"
                      value={calUserId}
                      onChange={(e) => setCalUserId(e.target.value)}
                      className="w-full bg-white border border-[#E5E5E0] rounded-2xl px-4 py-3 text-xs focus:border-[#5A5A40] focus:ring-1 focus:ring-[#5A5A40] outline-none transition-all"
                    />
                  </div>

                  <div>
                    <label className="block text-[10px] font-bold text-[#707060] uppercase tracking-wider mb-1">
                      Cal Team ID
                    </label>
                    <input
                      type="number"
                      value={calTeamId}
                      onChange={(e) => setCalTeamId(e.target.value)}
                      className="w-full bg-white border border-[#E5E5E0] rounded-2xl px-4 py-3 text-xs focus:border-[#5A5A40] focus:ring-1 focus:ring-[#5A5A40] outline-none transition-all"
                    />
                  </div>

                  <div>
                    <label className="block text-[10px] font-bold text-[#707060] uppercase tracking-wider mb-1">
                      Cal Org ID
                    </label>
                    <input
                      type="number"
                      value={calOrgId}
                      onChange={(e) => setCalOrgId(e.target.value)}
                      className="w-full bg-white border border-[#E5E5E0] rounded-2xl px-4 py-3 text-xs focus:border-[#5A5A40] focus:ring-1 focus:ring-[#5A5A40] outline-none transition-all"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-[10px] font-bold text-[#707060] uppercase tracking-wider mb-1">
                    Tipo de conta Cal.com
                  </label>
                  <select
                    value={calAccountType}
                    onChange={(e) => setCalAccountType(e.target.value as "individual" | "team" | "organization")}
                    className="w-full bg-white border border-[#E5E5E0] rounded-2xl px-4 py-3 text-xs focus:border-[#5A5A40] focus:ring-1 focus:ring-[#5A5A40] outline-none transition-all font-semibold"
                  >
                    <option value="individual">Individual</option>
                    <option value="team">Team</option>
                    <option value="organization">Organization</option>
                  </select>
                </div>
                <div>
                  <label className="block text-[10px] font-bold text-[#707060] uppercase tracking-wider mb-1">
                    VariÃ¡vel da API key no .env
                  </label>
                  <input
                    type="text"
                    value={calApiKeyEnvVar}
                    onChange={(e) => setCalApiKeyEnvVar(e.target.value)}
                    className="w-full bg-white border border-[#E5E5E0] rounded-2xl px-4 py-3 text-xs focus:border-[#5A5A40] focus:ring-1 focus:ring-[#5A5A40] outline-none transition-all font-mono"
                    placeholder="CAL_API_KEY_MARCIA"
                  />
                  <p className="text-[10px] text-[#707060] mt-1">
                    A chave real fica apenas na .env; aqui salve somente o nome da variÃ¡vel.
                  </p>
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
                  Dentista ativa no painel (não altera disponibilidade no Cal.com)
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
