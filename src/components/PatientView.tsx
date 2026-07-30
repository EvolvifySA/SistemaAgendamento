import React, { useState } from "react";
import { Patient, Appointment, PatientAddress } from "../types";
import { lookupCep } from "../services/cep";
import {
  Users,
  Search,
  UserPlus,
  Calendar,
  Phone,
  Clock,
  AlertTriangle,
  Sparkles,
  Plus,
  Info,
  ChevronRight,
  ClipboardList,
  Trash2,
  MapPin,
  Loader2,
  Pencil
} from "lucide-react";

const formatCpf = (value: string) => {
  const digits = value.replace(/\D/g, "").slice(0, 11);
  return digits
    .replace(/(\d{3})(\d)/, "$1.$2")
    .replace(/(\d{3})(\d)/, "$1.$2")
    .replace(/(\d{3})(\d{1,2})$/, "$1-$2");
};

const formatCep = (value: string) => {
  const digits = value.replace(/\D/g, "").slice(0, 8);
  return digits.replace(/(\d{5})(\d)/, "$1-$2");
};

const formatDateAndCompleteTime = (dateStr: string, timeStr: string, endTimeStr?: string) => {
  const parts = dateStr.split("-");
  const formattedDate = parts.length === 3 ? `${parts[2]}/${parts[1]}/${parts[0]}` : dateStr;
  return `${formattedDate}, ${timeStr}–${endTimeStr || timeStr}`;
};

interface PatientViewProps {
  patients: Patient[];
  appointments: Appointment[];
  onAddPatient: (patient: Omit<Patient, "id" | "absencesCount" | "history">) => void;
  onEditPatient: (patient: Patient) => void;
  onOpenNewAppointmentForPatient: (patientId: string) => void;
  onOpenReturnForPatient: (patientId: string) => void;
  onDeletePatient: (patientId: string) => void;
}

export const PatientView: React.FC<PatientViewProps> = ({
  patients,
  appointments,
  onAddPatient,
  onEditPatient,
  onOpenNewAppointmentForPatient,
  onOpenReturnForPatient,
  onDeletePatient
}) => {
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedPatient, setSelectedPatient] = useState<Patient | null>(patients[0] || null);
  const [showAddModal, setShowAddModal] = useState(false);
  const [editingPatientId, setEditingPatientId] = useState<string | null>(null);
  const [deleteConfirmState, setDeleteConfirmState] = useState<{
    isOpen: boolean;
    patientId: string;
    patientName: string;
  } | null>(null);

  // Form states
  const [formName, setFormName] = useState("");
  const [formPhone, setFormPhone] = useState("");
  const [formBirth, setFormBirth] = useState("");
  const [formCpf, setFormCpf] = useState("");
  const [formEmail, setFormEmail] = useState("");
  const [formImportant, setFormImportant] = useState("");
  const [formQuick, setFormQuick] = useState("");

  // Address / CEP autofill states
  const [formCep, setFormCep] = useState("");
  const [formStreet, setFormStreet] = useState("");
  const [formNumber, setFormNumber] = useState("");
  const [formComplement, setFormComplement] = useState("");
  const [formNeighborhood, setFormNeighborhood] = useState("");
  const [formCity, setFormCity] = useState("");
  const [formState, setFormState] = useState("");
  const [cepLoading, setCepLoading] = useState(false);
  const [cepError, setCepError] = useState("");

  const resetAddressFields = () => {
    setFormCep("");
    setFormStreet("");
    setFormNumber("");
    setFormComplement("");
    setFormNeighborhood("");
    setFormCity("");
    setFormState("");
    setCepError("");
  };

  const resetForm = () => {
    setFormName("");
    setFormPhone("");
    setFormBirth("");
    setFormCpf("");
    setFormEmail("");
    resetAddressFields();
    setFormImportant("");
    setFormQuick("");
    setEditingPatientId(null);
  };

  const openEditModal = (patient: Patient) => {
    setFormName(patient.name);
    setFormPhone(patient.phone);
    setFormBirth(patient.birthdate || "");
    setFormCpf(patient.cpf || "");
    setFormEmail(patient.email || "");
    setFormCep(patient.address?.cep || "");
    setFormStreet(patient.address?.street || "");
    setFormNumber(patient.address?.number || "");
    setFormComplement(patient.address?.complement || "");
    setFormNeighborhood(patient.address?.neighborhood || "");
    setFormCity(patient.address?.city || "");
    setFormState(patient.address?.state || "");
    setCepError("");
    setFormImportant(patient.importantNotes || "");
    setFormQuick(patient.quickNotes || "");
    setEditingPatientId(patient.id);
    setShowAddModal(true);
  };

  const handleCepBlur = async () => {
    const digits = formCep.replace(/\D/g, "");
    if (digits.length !== 8) return;

    setCepLoading(true);
    setCepError("");
    const result = await lookupCep(digits);
    setCepLoading(false);

    if (result.error) {
      setCepError(result.error);
      return;
    }

    setFormStreet(result.address.street);
    setFormNeighborhood(result.address.neighborhood);
    setFormCity(result.address.city);
    setFormState(result.address.state);
  };

  // Search filter
  const filteredPatients = patients.filter(p => 
    p.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    p.phone.includes(searchQuery)
  );

  const handleCreatePatient = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formName || !formPhone) {
      alert("Por favor, preencha o nome e telefone do paciente.");
      return;
    }

    const hasAddress = formCep || formStreet || formNumber || formNeighborhood || formCity || formState;
    const address: PatientAddress | undefined = hasAddress
      ? {
          cep: formCep,
          street: formStreet,
          number: formNumber,
          complement: formComplement || undefined,
          neighborhood: formNeighborhood,
          city: formCity,
          state: formState
        }
      : undefined;

    if (editingPatientId) {
      const original = patients.find(p => p.id === editingPatientId);
      if (original) {
        onEditPatient({
          ...original,
          name: formName,
          phone: formPhone,
          birthdate: formBirth || undefined,
          cpf: formCpf || undefined,
          email: formEmail || undefined,
          address,
          importantNotes: formImportant,
          quickNotes: formQuick
        });
        if (selectedPatient?.id === editingPatientId) {
          setSelectedPatient({
            ...original,
            name: formName,
            phone: formPhone,
            birthdate: formBirth || undefined,
            cpf: formCpf || undefined,
            email: formEmail || undefined,
            address,
            importantNotes: formImportant,
            quickNotes: formQuick
          });
        }
      }
      setShowAddModal(false);
      resetForm();
      alert("✨ Ficha do paciente atualizada com sucesso!");
      return;
    }

    onAddPatient({
      name: formName,
      phone: formPhone,
      birthdate: formBirth || undefined,
      cpf: formCpf || undefined,
      email: formEmail || undefined,
      address,
      importantNotes: formImportant,
      quickNotes: formQuick
    });

    setShowAddModal(false);
    resetForm();
    alert("✨ Paciente cadastrado com sucesso! Já está disponível para consultas e buscas.");
  };

  // Get full historical appointments for the selected patient
  const patientAppointments = appointments.filter(a => a.patientId === selectedPatient?.id);

  return (
    <div className="space-y-8 animate-fade-in">
      
      {/* Top action block */}
      <div className="flex flex-col sm:flex-row justify-between sm:items-center gap-4">
        {/* Search */}
        <div className="relative w-full sm:w-80">
          <Search className="w-4 h-4 text-[#A0A090] absolute left-4 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder="Buscar paciente por nome ou telefone..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full bg-white border border-[#E5E5E0] rounded-2xl pl-11 pr-4 py-2.5 text-xs outline-none focus:border-[#5A5A40] focus:ring-1 focus:ring-[#5A5A40] transition-all"
          />
        </div>

        {/* Create patient button */}
        <button
          onClick={() => { resetForm(); setShowAddModal(true); }}
          className="flex items-center justify-center gap-2 px-5 py-2.5 bg-[#5A5A40] text-white rounded-full text-xs font-semibold shadow-md hover:bg-[#474732] active:scale-95 transition-all self-start sm:self-auto"
        >
          <UserPlus className="w-4 h-4" />
          <span>Novo Paciente</span>
        </button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        
        {/* Patients List (Screen 6) */}
        <div className="lg:col-span-6 bg-white rounded-[32px] border border-[#E5E5E0] p-6 space-y-4 shadow-sm flex flex-col">
          <h3 className="font-serif text-xl text-[#1A1A1A] px-2">Fichas Cadastrais</h3>

          <div className="space-y-3 max-h-[500px] overflow-y-auto pr-2 flex-1">
            {filteredPatients.length === 0 ? (
              <div className="text-center py-16 text-[#A0A090] italic text-xs">
                Nenhum paciente cadastrado corresponde aos termos buscados.
              </div>
            ) : (
              filteredPatients.map(p => {
                const isSelected = selectedPatient?.id === p.id;
                const lastApp = appointments
                  .filter(a => a.patientId === p.id && a.status === "Atendido")
                  .sort((a,b) => b.date.localeCompare(a.date))[0];

                return (
                  <div
                    key={p.id}
                    onClick={() => setSelectedPatient(p)}
                    className={`p-4 rounded-2xl border transition-all cursor-pointer flex items-center justify-between gap-4 ${
                      isSelected 
                        ? "bg-[#F2F2E9] border-[#5A5A40] shadow-sm" 
                        : "bg-[#FBFBFA] border-[#F0F0E8] hover:border-[#D8D8C0]"
                    }`}
                  >
                    <div className="min-w-0 space-y-1">
                      <div className="flex items-center gap-2">
                        <h4 className="font-semibold text-sm text-[#1A1A1A] truncate">{p.name}</h4>
                        {p.absencesCount >= 2 && (
                          <span className="bg-[#FBEBEB] text-[#802B2B] text-[9px] px-2 py-0.5 rounded-full font-bold uppercase tracking-wide border border-red-150 flex items-center gap-0.5">
                            <AlertTriangle className="w-2.5 h-2.5" />
                            {p.absencesCount} Faltas
                          </span>
                        )}
                      </div>
                      <p className="text-[11px] text-[#707060] flex items-center gap-1.5">
                        <span>{p.phone}</span>
                        <span>•</span>
                        <span>Nasc: {p.birthdate ? p.birthdate : "Não informado"}</span>
                      </p>

                      {/* Important Warning Alert visible on list */}
                      {p.importantNotes && (
                        <p className="text-[10px] text-amber-800 bg-amber-50/60 border border-amber-100 px-2 py-0.5 rounded-lg inline-block truncate max-w-xs font-semibold">
                          ⚠️ {p.importantNotes}
                        </p>
                      )}
                    </div>

                    <div className="shrink-0 text-right space-y-1">
                      <p className="text-[9px] uppercase tracking-wider text-[#A0A090] font-bold">Última Consulta</p>
                      <p className="text-[11px] font-semibold text-[#5A5A40]">
                        {lastApp ? lastApp.date : "Nenhuma"}
                      </p>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>

        {/* Patient Details & History Panel (Screen 8) */}
        <div className="lg:col-span-6">
          {selectedPatient ? (
            <div className="bg-white rounded-[32px] border border-[#E5E5E0] shadow-sm p-6 space-y-6 animate-fade-in">
              <div className="border-b border-[#F5F5F0] pb-4 space-y-1">
                <span className="text-[9px] uppercase text-[#C17A63] font-bold tracking-widest">Dossiê Odontológico / Histórico</span>
                <h3 className="font-serif text-2xl text-[#1A1A1A]">{selectedPatient.name}</h3>
              </div>

              {/* Patient details indicators */}
              <div className="grid grid-cols-2 gap-4 bg-[#FBFBFA] p-4 rounded-2xl border border-[#F0F0E8] text-xs">
                <div>
                  <p className="text-[10px] uppercase text-[#A0A090] font-bold">Telefone Principal</p>
                  <p className="font-semibold text-sm mt-0.5 flex items-center gap-1 text-[#5A5A40]">
                    <Phone className="w-3.5 h-3.5 text-[#C17A63]" /> {selectedPatient.phone}
                  </p>
                </div>
                <div>
                  <p className="text-[10px] uppercase text-[#A0A090] font-bold">Data de Nascimento</p>
                  <p className="font-semibold text-sm mt-0.5">
                    {selectedPatient.birthdate ? selectedPatient.birthdate : "Não informada"}
                  </p>
                </div>
                <div>
                  <p className="text-[10px] uppercase text-[#A0A090] font-bold">CPF</p>
                  <p className="font-semibold text-sm mt-0.5">
                    {selectedPatient.cpf || "Não informado"}
                  </p>
                </div>
                <div>
                  <p className="text-[10px] uppercase text-[#A0A090] font-bold">E-mail</p>
                  <p className="font-semibold text-sm mt-0.5 truncate">
                    {selectedPatient.email || "Não informado"}
                  </p>
                </div>
                <div className="col-span-2 pt-2 border-t border-[#E5E5E0]/40">
                  <p className="text-[10px] uppercase text-[#A0A090] font-bold flex items-center gap-1">
                    <MapPin className="w-3 h-3 text-[#C17A63]" /> Endereço
                  </p>
                  <p className="font-semibold text-sm mt-0.5 text-[#1A1A1A]">
                    {selectedPatient.address
                      ? `${selectedPatient.address.street}, ${selectedPatient.address.number}${selectedPatient.address.complement ? ` - ${selectedPatient.address.complement}` : ""} - ${selectedPatient.address.neighborhood}, ${selectedPatient.address.city}/${selectedPatient.address.state} - CEP ${selectedPatient.address.cep}`
                      : "Não informado"}
                  </p>
                </div>
                <div className="col-span-2 pt-2 border-t border-[#E5E5E0]/40">
                  <p className="text-[10px] uppercase text-[#A0A090] font-bold">Preferências & Observações Rápidas (PO)</p>
                  <p className="mt-1 text-[#707060] leading-relaxed italic text-[11px]">
                    "{selectedPatient.quickNotes || "Nenhuma preferência anotada pela recepção."}"
                  </p>
                </div>
              </div>

              {/* Danger/Alert highlight for clinical safety */}
              {selectedPatient.importantNotes && (
                <div className="p-4 bg-amber-50 border border-amber-200 text-amber-900 rounded-2xl text-xs space-y-1.5 shadow-sm">
                  <h5 className="font-bold text-amber-900 flex items-center gap-1.5 text-sm">
                    <Info className="w-4 h-4 text-[#C17A63]" /> Informações Clínicas Críticas:
                  </h5>
                  <p className="text-[11px] text-amber-800 leading-relaxed font-medium">
                    "{selectedPatient.importantNotes}"
                  </p>
                </div>
              )}

              {/* Absences Indicator Alert */}
              <div className="p-4 bg-white border border-[#E5E5E0] rounded-2xl flex items-center justify-between text-xs">
                <div>
                  <p className="font-bold text-[#1A1A1A]">Absenteísmo Recorrente</p>
                  <p className="text-[#707060] text-[11px] mt-0.5">Faltas não justificadas registradas pelo sistema.</p>
                </div>
                <div className="text-right">
                  <span className={`text-sm font-bold px-3 py-1 rounded-full ${
                    selectedPatient.absencesCount >= 2 
                      ? "bg-red-100 text-red-800" 
                      : "bg-green-100 text-green-800"
                  }`}>
                    {selectedPatient.absencesCount} {selectedPatient.absencesCount === 1 ? "falta" : "faltas"}
                  </span>
                </div>
              </div>

              {/* History Sub-grid */}
              <div className="space-y-3">
                <h4 className="font-serif text-lg text-[#5A5A40] flex items-center gap-1.5 border-b border-[#F5F5F0] pb-2">
                  <ClipboardList className="w-4 h-4 text-[#C17A63]" />
                  Histórico Linear de Atendimentos
                </h4>

                <div className="space-y-2 max-h-[220px] overflow-y-auto pr-2">
                  {patientAppointments.length === 0 ? (
                    <p className="text-xs text-[#A0A090] italic text-center py-6">Nenhum registro de consulta ativa.</p>
                  ) : (
                    patientAppointments.map(app => (
                      <div key={app.id} className="p-3 bg-[#FBFBFA] border border-[#F0F0E8] rounded-xl text-xs flex justify-between items-center gap-3">
                        <div>
                          <p className="font-bold text-[#1A1A1A]">{formatDateAndCompleteTime(app.date, app.time, app.endTime)}</p>
                          <p className="text-[10px] text-[#707060] mt-0.5">{app.type} • Status: <strong className="uppercase text-[9px]">{app.status}</strong></p>
                          {app.notes && <p className="text-[10px] text-[#A0A090] mt-1 italic">"{app.notes}"</p>}
                        </div>
                        <span className={`px-2 py-0.5 rounded-full text-[9px] font-bold ${
                          app.status === "Atendido" ? "bg-green-50 text-green-800 border border-green-200" : "bg-gray-100 text-gray-500"
                        }`}>
                          {app.status}
                        </span>
                      </div>
                    ))
                  )}
                </div>
              </div>

              {/* Fast Action shortcuts */}
              <div className="flex flex-col gap-2 pt-2 border-t border-[#F5F5F0]">
                <div className="flex gap-2.5">
                  <button
                    onClick={() => onOpenNewAppointmentForPatient(selectedPatient.id)}
                    className="flex-1 flex items-center justify-center gap-1.5 px-4 py-2.5 bg-[#5A5A40] text-white rounded-xl text-xs font-bold hover:bg-[#474732] active:scale-95 transition-all shadow-sm"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    <span>Novo Agendamento</span>
                  </button>
                  <button
                    onClick={() => onOpenReturnForPatient(selectedPatient.id)}
                    className="flex-1 flex items-center justify-center gap-1.5 px-4 py-2.5 bg-white text-[#5A5A40] border border-[#D8D8C0] rounded-xl text-xs font-bold hover:bg-[#F5F5F0] active:scale-95 transition-all"
                  >
                    <Sparkles className="w-3.5 h-3.5 text-[#C17A63]" />
                    <span>Agendar Retorno</span>
                  </button>
                </div>

                <button
                  onClick={() => openEditModal(selectedPatient)}
                  className="w-full flex items-center justify-center gap-1.5 px-4 py-2.5 bg-white text-[#5A5A40] border border-[#D8D8C0] rounded-xl text-xs font-bold hover:bg-[#F5F5F0] active:scale-95 transition-all"
                >
                  <Pencil className="w-3.5 h-3.5 text-[#C17A63]" />
                  <span>Editar Ficha Cadastral</span>
                </button>

                <button
                  onClick={() => setDeleteConfirmState({
                    isOpen: true,
                    patientId: selectedPatient.id,
                    patientName: selectedPatient.name
                  })}
                  className="w-full mt-1 py-2 bg-red-50 hover:bg-red-100 text-red-700 rounded-xl text-[10px] font-bold transition-all text-center flex items-center justify-center gap-1 border border-red-100"
                >
                  <Trash2 className="w-3 h-3" /> Excluir Ficha Cadastral do Paciente
                </button>
              </div>

            </div>
          ) : (
            <div className="bg-[#F5F5F0] border-2 border-dashed border-[#D8D8C0] rounded-[32px] p-12 text-center text-[#A0A090] italic text-xs h-full flex flex-col justify-center">
              <Users className="w-8 h-8 mx-auto text-[#D8D8C0] mb-3" />
              Selecione um paciente na lista para visualizar seu dossiê clínico, observações críticas e histórico completo de atendimentos.
            </div>
          )}
        </div>

      </div>

      {/* NEW PATIENT MODAL FORM (Screen 7) */}
      {showAddModal && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-[32px] border border-[#E5E5E0] shadow-2xl w-full max-w-lg p-8 space-y-6 animate-scale-up max-h-[90vh] overflow-y-auto">
            
            <div className="flex justify-between items-center border-b border-[#F5F5F0] pb-4">
              <h3 className="font-serif text-2xl text-[#5A5A40] italic font-semibold">
                {editingPatientId ? "Editar Ficha do Paciente" : "Ficha de Cadastro de Paciente"}
              </h3>
              <button
                onClick={() => { setShowAddModal(false); resetForm(); }}
                className="text-xs text-[#A0A090] hover:text-[#5A5A40] font-bold"
              >
                Voltar
              </button>
            </div>

            <form onSubmit={handleCreatePatient} className="space-y-4">
              
              {/* Name */}
              <div>
                <label className="block text-[11px] font-bold text-[#707060] uppercase tracking-wider mb-1">
                  Nome Completo *
                </label>
                <input
                  type="text"
                  value={formName}
                  onChange={(e) => setFormName(e.target.value)}
                  placeholder="Ex: Maria das Dores Silva"
                  className="w-full bg-[#F5F5F0] border border-[#E5E5E0] rounded-2xl px-4 py-3 text-sm focus:border-[#5A5A40] focus:ring-1 focus:ring-[#5A5A40] outline-none transition-all"
                  required
                />
              </div>

              {/* Phone / Whatsapp */}
              <div>
                <label className="block text-[11px] font-bold text-[#707060] uppercase tracking-wider mb-1">
                  Telefone / WhatsApp *
                </label>
                <input
                  type="text"
                  value={formPhone}
                  onChange={(e) => setFormPhone(e.target.value)}
                  placeholder="Ex: (11) 98765-4321"
                  className="w-full bg-[#F5F5F0] border border-[#E5E5E0] rounded-2xl px-4 py-3 text-sm focus:border-[#5A5A40] focus:ring-1 focus:ring-[#5A5A40] outline-none transition-all"
                  required
                />
              </div>

              {/* Birthdate optional */}
              <div>
                <label className="block text-[11px] font-bold text-[#707060] uppercase tracking-wider mb-1">
                  Data de Nascimento (Opcional)
                </label>
                <input
                  type="date"
                  value={formBirth}
                  onChange={(e) => setFormBirth(e.target.value)}
                  className="w-full bg-[#F5F5F0] border border-[#E5E5E0] rounded-2xl px-4 py-3 text-sm focus:border-[#5A5A40] focus:ring-1 focus:ring-[#5A5A40] outline-none transition-all"
                />
              </div>

              {/* CPF and Email */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[11px] font-bold text-[#707060] uppercase tracking-wider mb-1">
                    CPF
                  </label>
                  <input
                    type="text"
                    value={formCpf}
                    onChange={(e) => setFormCpf(formatCpf(e.target.value))}
                    placeholder="000.000.000-00"
                    inputMode="numeric"
                    maxLength={14}
                    className="w-full bg-[#F5F5F0] border border-[#E5E5E0] rounded-2xl px-4 py-3 text-sm focus:border-[#5A5A40] focus:ring-1 focus:ring-[#5A5A40] outline-none transition-all"
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-bold text-[#707060] uppercase tracking-wider mb-1">
                    E-mail
                  </label>
                  <input
                    type="email"
                    value={formEmail}
                    onChange={(e) => setFormEmail(e.target.value)}
                    placeholder="paciente@email.com"
                    className="w-full bg-[#F5F5F0] border border-[#E5E5E0] rounded-2xl px-4 py-3 text-sm focus:border-[#5A5A40] focus:ring-1 focus:ring-[#5A5A40] outline-none transition-all"
                  />
                </div>
              </div>

              {/* Address / CEP autofill */}
              <div className="space-y-3 p-4 bg-[#FBFBFA] border border-[#F0F0E8] rounded-2xl">
                <p className="text-[11px] font-bold text-[#5A5A40] uppercase tracking-wider flex items-center gap-1.5">
                  <MapPin className="w-3.5 h-3.5 text-[#C17A63]" />
                  Endereço
                </p>

                <div>
                  <label className="block text-[11px] font-bold text-[#707060] uppercase tracking-wider mb-1">
                    CEP
                  </label>
                  <div className="relative">
                    <input
                      type="text"
                      value={formCep}
                      onChange={(e) => setFormCep(formatCep(e.target.value))}
                      onBlur={handleCepBlur}
                      placeholder="00000-000"
                      inputMode="numeric"
                      maxLength={9}
                      className="w-full bg-white border border-[#E5E5E0] rounded-2xl px-4 py-3 text-sm focus:border-[#5A5A40] focus:ring-1 focus:ring-[#5A5A40] outline-none transition-all"
                    />
                    {cepLoading && (
                      <Loader2 className="w-4 h-4 text-[#A0A090] absolute right-4 top-1/2 -translate-y-1/2 animate-spin" />
                    )}
                  </div>
                  {cepError && <p className="text-[10px] text-red-600 mt-1 font-semibold">{cepError}</p>}
                </div>

                <div className="grid grid-cols-3 gap-3">
                  <div className="col-span-2">
                    <label className="block text-[11px] font-bold text-[#707060] uppercase tracking-wider mb-1">
                      Rua / Logradouro
                    </label>
                    <input
                      type="text"
                      value={formStreet}
                      onChange={(e) => setFormStreet(e.target.value)}
                      placeholder="Preenchido automaticamente pelo CEP"
                      className="w-full bg-white border border-[#E5E5E0] rounded-2xl px-4 py-3 text-sm focus:border-[#5A5A40] focus:ring-1 focus:ring-[#5A5A40] outline-none transition-all"
                    />
                  </div>
                  <div>
                    <label className="block text-[11px] font-bold text-[#707060] uppercase tracking-wider mb-1">
                      Número
                    </label>
                    <input
                      type="text"
                      value={formNumber}
                      onChange={(e) => setFormNumber(e.target.value)}
                      placeholder="Ex: 123"
                      className="w-full bg-white border border-[#E5E5E0] rounded-2xl px-4 py-3 text-sm focus:border-[#5A5A40] focus:ring-1 focus:ring-[#5A5A40] outline-none transition-all"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-[11px] font-bold text-[#707060] uppercase tracking-wider mb-1">
                      Complemento
                    </label>
                    <input
                      type="text"
                      value={formComplement}
                      onChange={(e) => setFormComplement(e.target.value)}
                      placeholder="Apto, bloco, etc (opcional)"
                      className="w-full bg-white border border-[#E5E5E0] rounded-2xl px-4 py-3 text-sm focus:border-[#5A5A40] focus:ring-1 focus:ring-[#5A5A40] outline-none transition-all"
                    />
                  </div>
                  <div>
                    <label className="block text-[11px] font-bold text-[#707060] uppercase tracking-wider mb-1">
                      Bairro
                    </label>
                    <input
                      type="text"
                      value={formNeighborhood}
                      onChange={(e) => setFormNeighborhood(e.target.value)}
                      placeholder="Preenchido automaticamente pelo CEP"
                      className="w-full bg-white border border-[#E5E5E0] rounded-2xl px-4 py-3 text-sm focus:border-[#5A5A40] focus:ring-1 focus:ring-[#5A5A40] outline-none transition-all"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-3 gap-3">
                  <div className="col-span-2">
                    <label className="block text-[11px] font-bold text-[#707060] uppercase tracking-wider mb-1">
                      Cidade
                    </label>
                    <input
                      type="text"
                      value={formCity}
                      onChange={(e) => setFormCity(e.target.value)}
                      placeholder="Preenchido automaticamente pelo CEP"
                      className="w-full bg-white border border-[#E5E5E0] rounded-2xl px-4 py-3 text-sm focus:border-[#5A5A40] focus:ring-1 focus:ring-[#5A5A40] outline-none transition-all"
                    />
                  </div>
                  <div>
                    <label className="block text-[11px] font-bold text-[#707060] uppercase tracking-wider mb-1">
                      UF
                    </label>
                    <input
                      type="text"
                      value={formState}
                      onChange={(e) => setFormState(e.target.value.toUpperCase().slice(0, 2))}
                      placeholder="Ex: PB"
                      maxLength={2}
                      className="w-full bg-white border border-[#E5E5E0] rounded-2xl px-4 py-3 text-sm focus:border-[#5A5A40] focus:ring-1 focus:ring-[#5A5A40] outline-none transition-all"
                    />
                  </div>
                </div>
              </div>

              {/* Important clinical notes */}
              <div>
                <label className="block text-[11px] font-bold text-[#707060] uppercase tracking-wider mb-1">
                  Informações Clínicas Importantes / Alergias
                </label>
                <textarea
                  value={formImportant}
                  onChange={(e) => setFormImportant(e.target.value)}
                  placeholder="Hipertensão, Diabetes, Alergias alimentares ou a medicamentos (Dipirona, etc)..."
                  rows={2}
                  className="w-full bg-[#F5F5F0] border border-[#E5E5E0] rounded-2xl px-4 py-3 text-xs leading-relaxed focus:border-[#5A5A40] focus:ring-1 focus:ring-[#5A5A40] outline-none transition-all"
                />
              </div>

              {/* Quick notes/preferences */}
              <div>
                <label className="block text-[11px] font-bold text-[#707060] uppercase tracking-wider mb-1">
                  Observações Rápidas de Comportamento
                </label>
                <textarea
                  value={formQuick}
                  onChange={(e) => setFormQuick(e.target.value)}
                  placeholder="Ex: Prefere atendimento pela manhã, só confirma pelo WhatsApp..."
                  rows={2}
                  className="w-full bg-[#F5F5F0] border border-[#E5E5E0] rounded-2xl px-4 py-3 text-xs leading-relaxed focus:border-[#5A5A40] focus:ring-1 focus:ring-[#5A5A40] outline-none transition-all"
                />
              </div>

              {/* Save */}
              <div className="flex gap-3 pt-4">
                <button
                  type="button"
                  onClick={() => { setShowAddModal(false); resetForm(); }}
                  className="flex-1 px-4 py-3 border border-[#D8D8C0] text-[#5A5A40] rounded-2xl text-xs font-semibold hover:bg-[#F5F5F0] transition-all"
                >
                  Voltar
                </button>
                <button
                  type="submit"
                  className="flex-1 px-4 py-3 bg-[#5A5A40] text-white rounded-2xl text-xs font-bold hover:bg-[#474732] shadow-md transition-all"
                >
                  {editingPatientId ? "Salvar alterações" : "Salvar paciente"}
                </button>
              </div>

            </form>
          </div>
        </div>
      )}

      {/* CUSTOM PREMIUM VISUAL CONFIRMATION FOR DELETING PATIENT (Requirement) */}
      {deleteConfirmState && deleteConfirmState.isOpen && (
        <div className="fixed inset-0 bg-[#1A1A1A]/40 backdrop-blur-xs z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-[32px] border border-[#E5E5E0] shadow-2xl w-full max-w-md p-8 space-y-6 animate-scale-up">
            
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-full bg-red-50 flex items-center justify-center text-red-600 border border-red-100">
                <AlertTriangle className="w-6 h-6 text-[#C17A63]" />
              </div>
              <div>
                <h4 className="font-serif text-lg text-[#1A1A1A] font-semibold leading-tight">
                  Excluir Paciente Definitivamente?
                </h4>
                <p className="text-[10px] text-red-600 uppercase tracking-wider font-bold mt-0.5">Ação Irreversível</p>
              </div>
            </div>

            <p className="text-xs text-[#707060] leading-relaxed">
              Tem certeza de que deseja EXCLUIR a ficha cadastral de <strong>{deleteConfirmState.patientName}</strong>? Esta ação apagará permanentemente todo o histórico clínico e cancelará qualquer consulta futura registrada.
            </p>

            <div className="flex gap-3 pt-2">
              <button
                type="button"
                onClick={() => setDeleteConfirmState(null)}
                className="flex-1 px-4 py-3 border border-[#D8D8C0] text-[#5A5A40] rounded-2xl text-xs font-semibold hover:bg-[#F5F5F0] transition-all"
              >
                Voltar
              </button>
              <button
                type="button"
                onClick={() => {
                  onDeletePatient(deleteConfirmState.patientId);
                  setSelectedPatient(null);
                  setDeleteConfirmState(null);
                }}
                className="flex-1 px-4 py-3 bg-red-600 hover:bg-red-700 text-white rounded-2xl text-xs font-bold shadow-md transition-all"
              >
                Excluir Cadastro
              </button>
            </div>

          </div>
        </div>
      )}

    </div>
  );
};
