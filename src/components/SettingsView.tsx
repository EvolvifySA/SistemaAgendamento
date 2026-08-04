import React, { useState } from "react";
import { ClinicSettings, SystemUser } from "../types";
import {
  Building,
  CalendarDays,
  CheckCircle2,
  Link2,
  Mail,
  MapPin,
  Phone,
  Save
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
  const [timezone, setTimezone] = useState(settings.timezone || "America/Sao_Paulo");
  const [calAccountType, setCalAccountType] = useState<"individual" | "team" | "organization">(settings.calAccountType || "individual");
  const [calTeamId, setCalTeamId] = useState(settings.calTeamId ? String(settings.calTeamId) : "");
  const [calOrgId, setCalOrgId] = useState(settings.calOrgId ? String(settings.calOrgId) : "");
  const [n8nWebhookUrl, setN8nWebhookUrl] = useState(settings.n8nWebhookUrl || "");
  const [saved, setSaved] = useState(false);

  if (currentUser.role !== "Administrador") {
    return (
      <div className="p-8 bg-red-50 border border-red-200 text-red-800 rounded-3xl space-y-2 animate-fade-in">
        <h3 className="font-bold text-lg">Acesso Restrito ao Administrador</h3>
        <p className="text-sm">
          As configuracoes gerais da clinica estao restritas ao perfil de administrador.
        </p>
      </div>
    );
  }

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    onUpdateSettings({
      ...settings,
      clinicName,
      clinicPhone,
      clinicEmail,
      clinicAddress,
      timezone,
      calAccountType,
      calTeamId: calTeamId ? Number(calTeamId) : undefined,
      calOrgId: calOrgId ? Number(calOrgId) : undefined,
      n8nWebhookUrl: n8nWebhookUrl || undefined
    });

    setSaved(true);
    setTimeout(() => setSaved(false), 3000);
  };

  return (
    <div className="space-y-8 animate-fade-in max-w-4xl">
      <div className="border-b border-[#E5E5E0] pb-6 flex flex-col sm:flex-row justify-between sm:items-center gap-4">
        <div>
          <h2 className="text-3xl font-serif text-[#1A1A1A]">Configuracoes da Clinica</h2>
          <p className="text-xs text-[#707060] mt-0.5">
            Dados reais usados pelo painel, Cal.com e integracoes externas.
          </p>
        </div>
      </div>

      <form onSubmit={handleSave} className="space-y-8">
        {saved && (
          <div className="p-4 bg-[#DDE6DD] border border-green-200 text-[#3E523E] rounded-2xl text-xs font-bold flex items-center gap-2 animate-pulse">
            <CheckCircle2 className="w-4 h-4 text-green-700" />
            <span>Configuracoes atualizadas com sucesso.</span>
          </div>
        )}

        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
          <div className="bg-white p-6 rounded-[32px] border border-[#E5E5E0] shadow-sm space-y-6">
            <h3 className="font-serif text-lg text-[#5A5A40] flex items-center gap-2 border-b border-[#F5F5F0] pb-3">
              <Building className="w-5 h-5 text-[#C17A63]" />
              Dados da Clinica
            </h3>

            <div>
              <label className="block text-[11px] font-bold text-[#707060] uppercase tracking-wider mb-1">
                Nome de fantasia
              </label>
              <input
                type="text"
                value={clinicName}
                onChange={(e) => setClinicName(e.target.value)}
                className="w-full bg-[#F5F5F0] border border-[#E5E5E0] rounded-2xl px-4 py-3 text-xs focus:border-[#5A5A40] focus:ring-1 focus:ring-[#5A5A40] outline-none transition-all"
                required
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-[11px] font-bold text-[#707060] uppercase tracking-wider mb-1">
                  Telefone principal
                </label>
                <div className="relative">
                  <Phone className="w-3.5 h-3.5 text-[#A0A090] absolute left-3 top-1/2 -translate-y-1/2" />
                  <input
                    type="text"
                    value={clinicPhone}
                    onChange={(e) => setClinicPhone(e.target.value)}
                    className="w-full bg-[#F5F5F0] border border-[#E5E5E0] rounded-2xl pl-9 pr-4 py-3 text-xs focus:border-[#5A5A40] focus:ring-1 focus:ring-[#5A5A40] outline-none transition-all"
                    required
                  />
                </div>
              </div>
              <div>
                <label className="block text-[11px] font-bold text-[#707060] uppercase tracking-wider mb-1">
                  E-mail oficial
                </label>
                <div className="relative">
                  <Mail className="w-3.5 h-3.5 text-[#A0A090] absolute left-3 top-1/2 -translate-y-1/2" />
                  <input
                    type="email"
                    value={clinicEmail}
                    onChange={(e) => setClinicEmail(e.target.value)}
                    className="w-full bg-[#F5F5F0] border border-[#E5E5E0] rounded-2xl pl-9 pr-4 py-3 text-xs focus:border-[#5A5A40] focus:ring-1 focus:ring-[#5A5A40] outline-none transition-all"
                    required
                  />
                </div>
              </div>
            </div>

            <div>
              <label className="block text-[11px] font-bold text-[#707060] uppercase tracking-wider mb-1">
                Endereco fisico
              </label>
              <div className="relative">
                <MapPin className="w-3.5 h-3.5 text-[#A0A090] absolute left-3 top-3.5" />
                <textarea
                  value={clinicAddress}
                  onChange={(e) => setClinicAddress(e.target.value)}
                  rows={3}
                  className="w-full bg-[#F5F5F0] border border-[#E5E5E0] rounded-2xl pl-9 pr-4 py-3 text-xs leading-relaxed focus:border-[#5A5A40] focus:ring-1 focus:ring-[#5A5A40] outline-none transition-all"
                  required
                />
              </div>
            </div>
          </div>

          <div className="bg-white p-6 rounded-[32px] border border-[#E5E5E0] shadow-sm space-y-6">
            <h3 className="font-serif text-lg text-[#5A5A40] flex items-center gap-2 border-b border-[#F5F5F0] pb-3">
              <Link2 className="w-5 h-5 text-[#C17A63]" />
              Integracoes
            </h3>

            <div>
              <label className="block text-[11px] font-bold text-[#707060] uppercase tracking-wider mb-1">
                Timezone da clinica
              </label>
              <div className="relative">
                <CalendarDays className="w-3.5 h-3.5 text-[#A0A090] absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  value={timezone}
                  onChange={(e) => setTimezone(e.target.value)}
                  className="w-full bg-[#F5F5F0] border border-[#E5E5E0] rounded-2xl pl-9 pr-4 py-3 text-xs focus:border-[#5A5A40] focus:ring-1 focus:ring-[#5A5A40] outline-none transition-all"
                  placeholder="America/Sao_Paulo"
                  required
                />
              </div>
            </div>

            <div>
              <label className="block text-[11px] font-bold text-[#707060] uppercase tracking-wider mb-1">
                Tipo de conta Cal.com
              </label>
              <select
                value={calAccountType}
                onChange={(e) => setCalAccountType(e.target.value as "individual" | "team" | "organization")}
                className="w-full bg-[#F5F5F0] border border-[#E5E5E0] rounded-2xl px-4 py-3 text-xs focus:border-[#5A5A40] focus:ring-1 focus:ring-[#5A5A40] outline-none transition-all font-semibold"
              >
                <option value="individual">Individual por dentista</option>
                <option value="team">Team</option>
                <option value="organization">Organization</option>
              </select>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-[11px] font-bold text-[#707060] uppercase tracking-wider mb-1">
                  Team ID global
                </label>
                <input
                  type="number"
                  value={calTeamId}
                  onChange={(e) => setCalTeamId(e.target.value)}
                  className="w-full bg-[#F5F5F0] border border-[#E5E5E0] rounded-2xl px-4 py-3 text-xs focus:border-[#5A5A40] focus:ring-1 focus:ring-[#5A5A40] outline-none transition-all"
                  placeholder="Opcional"
                />
              </div>
              <div>
                <label className="block text-[11px] font-bold text-[#707060] uppercase tracking-wider mb-1">
                  Org ID global
                </label>
                <input
                  type="number"
                  value={calOrgId}
                  onChange={(e) => setCalOrgId(e.target.value)}
                  className="w-full bg-[#F5F5F0] border border-[#E5E5E0] rounded-2xl px-4 py-3 text-xs focus:border-[#5A5A40] focus:ring-1 focus:ring-[#5A5A40] outline-none transition-all"
                  placeholder="Opcional"
                />
              </div>
            </div>

            <div>
              <label className="block text-[11px] font-bold text-[#707060] uppercase tracking-wider mb-1">
                Webhook n8n
              </label>
              <input
                type="url"
                value={n8nWebhookUrl}
                onChange={(e) => setN8nWebhookUrl(e.target.value)}
                className="w-full bg-[#F5F5F0] border border-[#E5E5E0] rounded-2xl px-4 py-3 text-xs focus:border-[#5A5A40] focus:ring-1 focus:ring-[#5A5A40] outline-none transition-all"
                placeholder="https://..."
              />
              <p className="text-[10px] text-[#707060] mt-2 leading-relaxed">
                Duracao, intervalos e perguntas do formulario ficam no Cal.com. Esta tela guarda apenas configuracoes usadas pelo painel.
              </p>
            </div>
          </div>
        </div>

        <div className="flex justify-end pt-4">
          <button
            type="submit"
            className="flex items-center gap-2 px-8 py-4 bg-[#5A5A40] text-white rounded-2xl text-xs font-bold hover:bg-[#474732] active:scale-95 shadow-md transition-all"
          >
            <Save className="w-4 h-4" />
            <span>Salvar Configuracoes</span>
          </button>
        </div>
      </form>
    </div>
  );
};
