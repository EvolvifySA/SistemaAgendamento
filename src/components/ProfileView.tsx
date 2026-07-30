import React, { useState } from "react";
import { SystemUser } from "../types";
import { User, Lock, Mail, Shield, CheckCircle2 } from "lucide-react";

interface ProfileViewProps {
  currentUser: SystemUser;
  onUpdateUser: (updatedUser: SystemUser) => void;
}

export const ProfileView: React.FC<ProfileViewProps> = ({ currentUser, onUpdateUser }) => {
  const [showPasswordChange, setShowPasswordChange] = useState(false);
  const [oldPassword, setOldPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [error, setError] = useState("");
  const [success, setSuccess] = useState(false);

  const handlePasswordChangeSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setSuccess(false);

    if (!oldPassword || !newPassword || !confirmPassword) {
      setError("Todos os campos de senha devem ser preenchidos.");
      return;
    }

    if (newPassword.length < 6) {
      setError("A nova senha deve ter no mínimo 6 caracteres por segurança.");
      return;
    }

    if (newPassword !== confirmPassword) {
      setError("A confirmação da nova senha não confere.");
      return;
    }

    // Success simulation
    setSuccess(true);
    setOldPassword("");
    setNewPassword("");
    setConfirmPassword("");
    setTimeout(() => {
      setShowPasswordChange(false);
      setSuccess(false);
    }, 3000);
  };

  return (
    <div className="space-y-8 animate-fade-in max-w-2xl">
      
      <div className="border-b border-[#E5E5E0] pb-6">
        <h2 className="text-3xl font-serif text-[#1A1A1A]">Minha Conta</h2>
        <p className="text-xs text-[#707060] mt-0.5">Visualize seus dados cadastrais e gerencie sua credencial de acesso</p>
      </div>

      <div className="bg-white rounded-[32px] border border-[#E5E5E0] shadow-sm overflow-hidden">
        
        {/* Profile Card Header */}
        <div className="bg-[#FBFBFA] px-8 py-8 border-b border-[#F0F0E8] flex items-center gap-5">
          <div className="w-16 h-16 rounded-full bg-[#5A5A40] text-white flex items-center justify-center font-serif text-3xl italic font-bold">
            {currentUser.name.charAt(0)}
          </div>
          <div className="space-y-1">
            <h3 className="font-semibold text-lg text-[#1A1A1A]">{currentUser.name}</h3>
            <p className="text-xs text-[#707060] flex items-center gap-1">
              <Mail className="w-3.5 h-3.5 text-[#A0A090]" /> {currentUser.email}
            </p>
          </div>
        </div>

        {/* Info Grid */}
        <div className="p-8 space-y-6">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 text-xs">
            <div>
              <p className="text-[10px] uppercase text-[#A0A090] font-bold tracking-wider">Perfil no Sistema</p>
              <div className="flex items-center gap-2 mt-1.5">
                <span className="bg-[#F2F2E9] text-[#5A5A40] border border-[#D8D8C0] px-3 py-1 rounded-full font-bold uppercase tracking-wider text-[10px]">
                  {currentUser.role}
                </span>
              </div>
            </div>
            <div>
              <p className="text-[10px] uppercase text-[#A0A090] font-bold tracking-wider">Status da Credencial</p>
              <p className="font-semibold text-[#5A5A40] mt-2 flex items-center gap-1 text-sm">
                <span className="w-2 h-2 rounded-full bg-green-600 inline-block"></span> Ativo & Verificado
              </p>
            </div>
          </div>

          <div className="h-[1px] bg-[#F5F5F0]"></div>

          {/* Change Password utility */}
          {!showPasswordChange ? (
            <button
              onClick={() => setShowPasswordChange(true)}
              className="px-6 py-3.5 border border-[#D8D8C0] text-[#5A5A40] font-semibold rounded-2xl text-xs hover:bg-[#F5F5F0] transition-all"
            >
              Alterar senha de acesso
            </button>
          ) : (
            <form onSubmit={handlePasswordChangeSubmit} className="space-y-4 animate-scale-up border border-[#F0F0E8] p-6 rounded-2xl bg-[#FBFBFA]">
              <h4 className="font-semibold text-sm text-[#5A5A40] flex items-center gap-1.5 mb-2">
                <Lock className="w-4 h-4 text-[#C17A63]" />
                Alteração Segura de Senha
              </h4>

              {error && (
                <div className="p-3 bg-red-50 border border-red-200 text-red-800 rounded-xl text-xs">
                  {error}
                </div>
              )}

              {success && (
                <div className="p-3 bg-[#DDE6DD] border border-green-200 text-[#3E523E] rounded-xl text-xs font-bold flex items-center gap-1">
                  <CheckCircle2 className="w-4 h-4 text-green-700" />
                  <span>Sua senha foi redefinida com sucesso para os próximos acessos!</span>
                </div>
              )}

              <div className="grid grid-cols-1 gap-4">
                <div>
                  <label className="block text-[11px] font-bold text-[#707060] uppercase tracking-wider mb-1">
                    Senha Atual
                  </label>
                  <input
                    type="password"
                    value={oldPassword}
                    onChange={(e) => setOldPassword(e.target.value)}
                    placeholder="Sua senha atual"
                    className="w-full bg-white border border-[#E5E5E0] rounded-2xl px-4 py-3 text-xs focus:border-[#5A5A40] focus:ring-1 focus:ring-[#5A5A40] outline-none transition-all"
                    required
                  />
                </div>
                
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-[11px] font-bold text-[#707060] uppercase tracking-wider mb-1">
                      Nova Senha
                    </label>
                    <input
                      type="password"
                      value={newPassword}
                      onChange={(e) => setNewPassword(e.target.value)}
                      placeholder="Mínimo 6 dígitos"
                      className="w-full bg-white border border-[#E5E5E0] rounded-2xl px-4 py-3 text-xs focus:border-[#5A5A40] focus:ring-1 focus:ring-[#5A5A40] outline-none transition-all"
                      required
                    />
                  </div>
                  <div>
                    <label className="block text-[11px] font-bold text-[#707060] uppercase tracking-wider mb-1">
                      Confirmar Nova Senha
                    </label>
                    <input
                      type="password"
                      value={confirmPassword}
                      onChange={(e) => setConfirmPassword(e.target.value)}
                      placeholder="Repita a nova senha"
                      className="w-full bg-white border border-[#E5E5E0] rounded-2xl px-4 py-3 text-xs focus:border-[#5A5A40] focus:ring-1 focus:ring-[#5A5A40] outline-none transition-all"
                      required
                    />
                  </div>
                </div>
              </div>

              <div className="flex gap-2.5 pt-2 justify-end">
                <button
                  type="button"
                  onClick={() => setShowPasswordChange(false)}
                  className="px-4 py-2 bg-white border border-[#E5E5E0] text-[#707060] font-semibold rounded-xl text-xs hover:bg-[#F5F5F0]"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="px-5 py-2.5 bg-[#5A5A40] text-white font-bold rounded-xl text-xs hover:bg-[#474732] shadow-sm"
                >
                  Salvar Nova Senha
                </button>
              </div>

            </form>
          )}

        </div>

      </div>

    </div>
  );
};
