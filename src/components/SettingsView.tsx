import React, { useState } from "react";
import { ClinicSettings, SystemUser } from "../types";
import { 
  Settings, 
  Clock, 
  Calendar, 
  MapPin, 
  Phone, 
  Mail, 
  Building,
  CheckCircle2,
  Save,
  Trash2,
  Plus
} from "lucide-react";

interface SettingsViewProps {
  currentUser: SystemUser;
  settings: ClinicSettings;
  onUpdateSettings: (newSettings: ClinicSettings) => void;
}

export const SettingsView: React.FC<SettingsViewProps> = ({
  currentUser,
  settings,
  onUpdateSettings
}) => {
  const [clinicName, setClinicName] = useState(settings.clinicName);
  const [clinicPhone, setClinicPhone] = useState(settings.clinicPhone);
  const [clinicEmail, setClinicEmail] = useState(settings.clinicEmail);
  const [clinicAddress, setClinicAddress] = useState(settings.clinicAddress);
  
  const [workingHoursStart, setWorkingHoursStart] = useState(settings.workingHoursStart);
  const [workingHoursEnd, setWorkingHoursEnd] = useState(settings.workingHoursEnd);
  const [workingDays, setWorkingDays] = useState<number[]>(settings.workingDays);
  
  const [defaultDuration, setDefaultDuration] = useState(settings.defaultDuration);
  const [gapDuration, setGapDuration] = useState(settings.gapDuration);
  
  const [appointmentTypes, setAppointmentTypes] = useState<string[]>(settings.appointmentTypes);
  const [newType, setNewType] = useState("");

  const [saved, setSaved] = useState(false);

  // Security layer
  if (currentUser.role !== "Administrador") {
    return (
      <div className="p-8 bg-red-50 border border-red-200 text-red-800 rounded-3xl space-y-2 animate-fade-in">
        <h3 className="font-bold text-lg">Acesso Restrito ao Administrador</h3>
        <p className="text-sm">
          Desculpe, as configurações gerais e estruturais da clínica estão restritas exclusivamente ao perfil de administrador.
        </p>
      </div>
    );
  }

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    onUpdateSettings({
      clinicName,
      clinicPhone,
      clinicEmail,
      clinicAddress,
      workingHoursStart,
      workingHoursEnd,
      workingDays,
      defaultDuration,
      gapDuration,
      appointmentTypes
    });

    setSaved(true);
    setTimeout(() => setSaved(false), 3000);
  };

  const toggleDay = (day: number) => {
    if (workingDays.includes(day)) {
      setWorkingDays(workingDays.filter(d => d !== day));
    } else {
      setWorkingDays([...workingDays, day].sort());
    }
  };

  const handleAddType = () => {
    if (newType.trim() && !appointmentTypes.includes(newType.trim())) {
      setAppointmentTypes([...appointmentTypes, newType.trim()]);
      setNewType("");
    }
  };

  const handleRemoveType = (typeToRemove: string) => {
    setAppointmentTypes(appointmentTypes.filter(t => t !== typeToRemove));
  };

  const DAYS_OF_WEEK = [
    { value: 1, label: "Seg" },
    { value: 2, label: "Ter" },
    { value: 3, label: "Qua" },
    { value: 4, label: "Qui" },
    { value: 5, label: "Sex" },
    { value: 6, label: "Sáb" },
    { value: 0, label: "Dom" }
  ];

  return (
    <div className="space-y-8 animate-fade-in max-w-4xl">
      
      <div className="border-b border-[#E5E5E0] pb-6 flex flex-col sm:flex-row justify-between sm:items-center gap-4">
        <div>
          <h2 className="text-3xl font-serif text-[#1A1A1A]">Configurações da Clínica</h2>
          <p className="text-xs text-[#707060] mt-0.5">Gerencie os parâmetros globais da agenda digital e dados cadastrais públicos</p>
        </div>
      </div>

      <form onSubmit={handleSave} className="space-y-8">
        
        {/* Saved Toast notification */}
        {saved && (
          <div className="p-4 bg-[#DDE6DD] border border-green-200 text-[#3E523E] rounded-2xl text-xs font-bold flex items-center gap-2 animate-pulse">
            <CheckCircle2 className="w-4 h-4 text-green-700" />
            <span>Configurações atualizadas com sucesso! Os parâmetros já foram carregados na agenda.</span>
          </div>
        )}

        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
          
          {/* Section 1: Business Parameters */}
          <div className="bg-white p-6 rounded-[32px] border border-[#E5E5E0] shadow-sm space-y-6">
            <h3 className="font-serif text-lg text-[#5A5A40] flex items-center gap-2 border-b border-[#F5F5F0] pb-3">
              <Clock className="w-5 h-5 text-[#C17A63]" />
              Estrutura da Agenda
            </h3>

            {/* Hours */}
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-[11px] font-bold text-[#707060] uppercase tracking-wider mb-1">
                  Início do Expediente
                </label>
                <input
                  type="time"
                  value={workingHoursStart}
                  onChange={(e) => setWorkingHoursStart(e.target.value)}
                  className="w-full bg-[#F5F5F0] border border-[#E5E5E0] rounded-2xl px-4 py-3 text-xs focus:border-[#5A5A40] focus:ring-1 focus:ring-[#5A5A40] outline-none transition-all"
                  required
                />
              </div>
              <div>
                <label className="block text-[11px] font-bold text-[#707060] uppercase tracking-wider mb-1">
                  Fim do Expediente
                </label>
                <input
                  type="time"
                  value={workingHoursEnd}
                  onChange={(e) => setWorkingHoursEnd(e.target.value)}
                  className="w-full bg-[#F5F5F0] border border-[#E5E5E0] rounded-2xl px-4 py-3 text-xs focus:border-[#5A5A40] focus:ring-1 focus:ring-[#5A5A40] outline-none transition-all"
                  required
                />
              </div>
            </div>

            {/* Working days */}
            <div>
              <label className="block text-[11px] font-bold text-[#707060] uppercase tracking-wider mb-2">
                Dias Úteis de Funcionamento
              </label>
              <div className="flex flex-wrap gap-1.5">
                {DAYS_OF_WEEK.map(day => {
                  const isActive = workingDays.includes(day.value);
                  return (
                    <button
                      key={day.value}
                      type="button"
                      onClick={() => toggleDay(day.value)}
                      className={`w-11 h-11 rounded-xl text-xs font-semibold flex items-center justify-center border transition-all ${
                        isActive 
                          ? "bg-[#5A5A40] text-white border-[#5A5A40]" 
                          : "bg-white text-[#707060] border-[#E5E5E0] hover:bg-[#F5F5F0]"
                      }`}
                    >
                      {day.label}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Durations */}
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-[11px] font-bold text-[#707060] uppercase tracking-wider mb-1">
                  Duração da Consulta (min)
                </label>
                <input
                  type="number"
                  value={defaultDuration}
                  onChange={(e) => setDefaultDuration(Number(e.target.value))}
                  className="w-full bg-[#F5F5F0] border border-[#E5E5E0] rounded-2xl px-4 py-3 text-xs focus:border-[#5A5A40] focus:ring-1 focus:ring-[#5A5A40] outline-none transition-all"
                  min={15}
                  max={120}
                  step={15}
                  required
                />
              </div>
              <div>
                <label className="block text-[11px] font-bold text-[#707060] uppercase tracking-wider mb-1">
                  Intervalo entre Consultas (min)
                </label>
                <input
                  type="number"
                  value={gapDuration}
                  onChange={(e) => setGapDuration(Number(e.target.value))}
                  className="w-full bg-[#F5F5F0] border border-[#E5E5E0] rounded-2xl px-4 py-3 text-xs focus:border-[#5A5A40] focus:ring-1 focus:ring-[#5A5A40] outline-none transition-all"
                  min={0}
                  max={60}
                  step={5}
                  required
                />
              </div>
            </div>

            {/* Appointment Types */}
            <div>
              <label className="block text-[11px] font-bold text-[#707060] uppercase tracking-wider mb-1.5">
                Tipos de Atendimento Permitidos
              </label>
              <div className="space-y-2">
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={newType}
                    onChange={(e) => setNewType(e.target.value)}
                    placeholder="Adicionar tipo (ex: Consulta Preventiva)"
                    className="flex-1 bg-[#F5F5F0] border border-[#E5E5E0] rounded-xl px-3 py-2 text-xs outline-none focus:border-[#5A5A40]"
                  />
                  <button
                    type="button"
                    onClick={handleAddType}
                    className="p-2 bg-[#5A5A40] text-white rounded-xl hover:bg-[#474732] active:scale-95 transition-all"
                  >
                    <Plus className="w-4 h-4" />
                  </button>
                </div>
                <div className="flex flex-wrap gap-1.5 pt-1">
                  {appointmentTypes.map(type => (
                    <span 
                      key={type}
                      className="inline-flex items-center gap-1 bg-[#F2F2E9] border border-[#D8D8C0]/80 text-[#5A5A40] text-[10px] font-bold px-2.5 py-1 rounded-full"
                    >
                      <span>{type}</span>
                      <button 
                        type="button" 
                        onClick={() => handleRemoveType(type)}
                        className="text-[#C17A63] hover:text-red-700"
                      >
                        <Trash2 className="w-3 h-3" />
                      </button>
                    </span>
                  ))}
                </div>
              </div>
            </div>

          </div>

          {/* Section 2: Clinic Public Information */}
          <div className="bg-white p-6 rounded-[32px] border border-[#E5E5E0] shadow-sm space-y-6">
            <h3 className="font-serif text-lg text-[#5A5A40] flex items-center gap-2 border-b border-[#F5F5F0] pb-3">
              <Building className="w-5 h-5 text-[#C17A63]" />
              Dados da Clínica
            </h3>

            {/* Name */}
            <div>
              <label className="block text-[11px] font-bold text-[#707060] uppercase tracking-wider mb-1">
                Nome de Fantasia / Razão Social
              </label>
              <input
                type="text"
                value={clinicName}
                onChange={(e) => setClinicName(e.target.value)}
                className="w-full bg-[#F5F5F0] border border-[#E5E5E0] rounded-2xl px-4 py-3 text-xs focus:border-[#5A5A40] focus:ring-1 focus:ring-[#5A5A40] outline-none transition-all"
                required
              />
            </div>

            {/* Phone & Email */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-[11px] font-bold text-[#707060] uppercase tracking-wider mb-1">
                  Telefone Principal
                </label>
                <input
                  type="text"
                  value={clinicPhone}
                  onChange={(e) => setClinicPhone(e.target.value)}
                  className="w-full bg-[#F5F5F0] border border-[#E5E5E0] rounded-2xl px-4 py-3 text-xs focus:border-[#5A5A40] focus:ring-1 focus:ring-[#5A5A40] outline-none transition-all"
                  required
                />
              </div>
              <div>
                <label className="block text-[11px] font-bold text-[#707060] uppercase tracking-wider mb-1">
                  E-mail Oficial
                </label>
                <input
                  type="email"
                  value={clinicEmail}
                  onChange={(e) => setClinicEmail(e.target.value)}
                  className="w-full bg-[#F5F5F0] border border-[#E5E5E0] rounded-2xl px-4 py-3 text-xs focus:border-[#5A5A40] focus:ring-1 focus:ring-[#5A5A40] outline-none transition-all"
                  required
                />
              </div>
            </div>

            {/* Address */}
            <div>
              <label className="block text-[11px] font-bold text-[#707060] uppercase tracking-wider mb-1">
                Endereço Físico Completo
              </label>
              <textarea
                value={clinicAddress}
                onChange={(e) => setClinicAddress(e.target.value)}
                rows={3}
                className="w-full bg-[#F5F5F0] border border-[#E5E5E0] rounded-2xl px-4 py-3 text-xs leading-relaxed focus:border-[#5A5A40] focus:ring-1 focus:ring-[#5A5A40] outline-none transition-all"
                required
              />
            </div>

            <div className="bg-[#FBFBFA] p-4 rounded-2xl border border-[#F0F0E8] space-y-1.5 text-xs">
              <p className="font-bold text-[#5A5A40]">Integrações de Lembretes Clínicos</p>
              <p className="text-[#707060] text-[11px] leading-relaxed">
                As mensagens enviadas por WhatsApp serão remetidas de forma semi-automática utilizando o telefone público registrado acima.
              </p>
            </div>

          </div>

        </div>

        {/* Submit */}
        <div className="flex justify-end pt-4">
          <button
            type="submit"
            className="flex items-center gap-2 px-8 py-4 bg-[#5A5A40] text-white rounded-2xl text-xs font-bold hover:bg-[#474732] active:scale-95 shadow-md transition-all"
          >
            <Save className="w-4 h-4" />
            <span>Salvar Todas as Configurações</span>
          </button>
        </div>

      </form>
    </div>
  );
};
