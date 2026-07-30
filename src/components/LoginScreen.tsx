import React, { useState } from "react";
import { SystemUser } from "../types";
import { Lock, Mail, Eye, EyeOff, ShieldCheck } from "lucide-react";

interface LoginScreenProps {
  users: SystemUser[];
  onLoginSuccess: (user: SystemUser) => void;
  onUpdateUser: (updatedUser: SystemUser) => void;
}

export const LoginScreen: React.FC<LoginScreenProps> = ({ users, onLoginSuccess, onUpdateUser }) => {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState("");
  const [infoMessage, setInfoMessage] = useState("");

  // Force password change state
  const [changingUser, setChangingUser] = useState<SystemUser | null>(null);
  const [currentPass, setCurrentPass] = useState("");
  const [newPass, setNewPass] = useState("");
  const [confirmNewPass, setConfirmNewPass] = useState("");

  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setInfoMessage("");

    if (!email || !password) {
      setError("Por favor, preencha todos os campos.");
      return;
    }

    // Try to find the user in our mock database
    const foundUser = users.find(u => u.email.toLowerCase() === email.toLowerCase());

    if (!foundUser) {
      setError("Usuário não encontrado em nossa base de dados clínica.");
      return;
    }

    if (!foundUser.active) {
      setError("Esta conta foi desativada pelo administrador.");
      return;
    }

    // Check force password change scenario
    // We mock that if password is "123" and they have needsPasswordChange set to true:
    if (foundUser.needsPasswordChange && password === "123") {
      setChangingUser(foundUser);
      return;
    }

    // Default successful logins (any other password works for this high-fidelity mock)
    onLoginSuccess(foundUser);
  };

  const handleChangePassword = (e: React.FormEvent) => {
    e.preventDefault();
    setError("");

    if (!currentPass || !newPass || !confirmNewPass) {
      setError("Preencha todos os campos para alterar a senha.");
      return;
    }

    if (currentPass !== "123") {
      setError("A senha atual temporária está incorreta.");
      return;
    }

    if (newPass.length < 6) {
      setError("A nova senha deve possuir pelo menos 6 caracteres por segurança.");
      return;
    }

    if (newPass !== confirmNewPass) {
      setError("A confirmação da senha não coincide com a nova senha.");
      return;
    }

    if (changingUser) {
      const updated = { ...changingUser, needsPasswordChange: false };
      onUpdateUser(updated);
      setChangingUser(null);
      setEmail(updated.email);
      setPassword(newPass);
      setInfoMessage("Senha alterada com sucesso! Entre agora com sua nova credencial.");
      setCurrentPass("");
      setNewPass("");
      setConfirmNewPass("");
    }
  };

  const handleForgotPassword = () => {
    setInfoMessage("Instruções de redefinição enviadas para a administração da clínica.");
  };

  if (changingUser) {
    return (
      <div className="min-h-screen bg-[#F5F5F0] flex items-center justify-center p-4">
        <div className="w-full max-w-md bg-white rounded-[32px] shadow-xl border border-[#E5E5E0] p-8 md:p-10 space-y-6 animate-fade-in">
          <div className="text-center space-y-2">
            <div className="mx-auto w-12 h-12 rounded-full bg-[#F2F2E9] flex items-center justify-center text-[#5A5A40]">
              <Lock className="w-6 h-6" />
            </div>
            <h2 className="text-2xl font-serif text-[#1A1A1A]">Troca Obrigatória de Senha</h2>
            <p className="text-xs text-[#707060] leading-relaxed">
              Por segurança, crie uma nova senha para acessar o sistema.
            </p>
          </div>

          <form onSubmit={handleChangePassword} className="space-y-4">
            {error && (
              <div className="p-3 bg-red-50 border border-red-200 text-red-800 rounded-2xl text-xs text-center">
                {error}
              </div>
            )}

            <div>
              <label className="block text-[11px] font-bold text-[#707060] uppercase tracking-wider mb-1">
                Senha Atual Temporária
              </label>
              <input
                type="password"
                value={currentPass}
                onChange={(e) => setCurrentPass(e.target.value)}
                placeholder="Insira a senha temporária (ex: 123)"
                className="w-full bg-[#F5F5F0] border border-[#E5E5E0] rounded-2xl px-4 py-3 text-sm focus:border-[#5A5A40] focus:ring-1 focus:ring-[#5A5A40] outline-none transition-all"
              />
            </div>

            <div>
              <label className="block text-[11px] font-bold text-[#707060] uppercase tracking-wider mb-1">
                Nova Senha
              </label>
              <input
                type="password"
                value={newPass}
                onChange={(e) => setNewPass(e.target.value)}
                placeholder="Mínimo de 6 caracteres"
                className="w-full bg-[#F5F5F0] border border-[#E5E5E0] rounded-2xl px-4 py-3 text-sm focus:border-[#5A5A40] focus:ring-1 focus:ring-[#5A5A40] outline-none transition-all"
              />
            </div>

            <div>
              <label className="block text-[11px] font-bold text-[#707060] uppercase tracking-wider mb-1">
                Confirmar Nova Senha
              </label>
              <input
                type="password"
                value={confirmNewPass}
                onChange={(e) => setConfirmNewPass(e.target.value)}
                placeholder="Repita a nova senha"
                className="w-full bg-[#F5F5F0] border border-[#E5E5E0] rounded-2xl px-4 py-3 text-sm focus:border-[#5A5A40] focus:ring-1 focus:ring-[#5A5A40] outline-none transition-all"
              />
            </div>

            <button
              type="submit"
              className="w-full bg-[#5A5A40] text-white py-3.5 rounded-2xl font-semibold text-sm hover:bg-[#474732] active:scale-98 transition-all shadow-md mt-4"
            >
              Salvar nova senha
            </button>
          </form>
          
          <button
            onClick={() => setChangingUser(null)}
            className="w-full text-center text-xs text-[#707060] hover:underline"
          >
            Voltar para o Login
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#F5F5F0] flex items-center justify-center p-4">
      <div className="w-full max-w-md bg-white rounded-[32px] shadow-xl border border-[#E5E5E0] p-8 md:p-10 space-y-8 relative overflow-hidden">
        
        {/* Decorative subtle gold botanical accent */}
        <div className="absolute top-0 right-0 w-32 h-32 bg-[#C17A63]/5 rounded-full blur-2xl -mr-10 -mt-10"></div>

        <div className="text-center space-y-3">
          <h1 className="text-3xl font-serif italic text-[#5A5A40] leading-tight tracking-wide">
            Francisca &amp; Márcia
          </h1>
          <p className="text-[10px] uppercase tracking-[0.2em] text-[#C17A63] font-bold">
            Consultório Odontológico
          </p>
          <div className="h-[1px] w-12 bg-[#D8D8C0] mx-auto my-4"></div>
          <p className="text-xs text-[#707060]">
            Acesse o sistema para gerenciar a agenda digital do consultório
          </p>
        </div>

        <form onSubmit={handleLogin} className="space-y-4">
          {error && (
            <div className="p-3 bg-red-50 border border-red-200 text-red-800 rounded-2xl text-xs text-center">
              {error}
            </div>
          )}

          {infoMessage && (
            <div className="p-3 bg-green-50 border border-green-200 text-green-800 rounded-2xl text-xs text-center">
              {infoMessage}
            </div>
          )}

          <div className="space-y-1">
            <label className="block text-[11px] font-bold text-[#707060] uppercase tracking-wider">
              Usuário / E-mail
            </label>
            <div className="relative">
              <Mail className="w-4 h-4 text-[#A0A090] absolute left-4 top-1/2 -translate-y-1/2" />
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="nome@franciscaemarcia.com.br"
                className="w-full bg-[#F5F5F0] border border-[#E5E5E0] rounded-2xl pl-11 pr-4 py-3.5 text-sm focus:border-[#5A5A40] focus:ring-1 focus:ring-[#5A5A40] outline-none transition-all"
              />
            </div>
          </div>

          <div className="space-y-1">
            <div className="flex justify-between items-center">
              <label className="block text-[11px] font-bold text-[#707060] uppercase tracking-wider">
                Senha
              </label>
              <button
                type="button"
                onClick={handleForgotPassword}
                className="text-[11px] text-[#C17A63] hover:underline"
              >
                Esqueci minha senha
              </button>
            </div>
            <div className="relative">
              <Lock className="w-4 h-4 text-[#A0A090] absolute left-4 top-1/2 -translate-y-1/2" />
              <input
                type={showPassword ? "text" : "password"}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Sua senha de acesso"
                className="w-full bg-[#F5F5F0] border border-[#E5E5E0] rounded-2xl pl-11 pr-12 py-3.5 text-sm focus:border-[#5A5A40] focus:ring-1 focus:ring-[#5A5A40] outline-none transition-all"
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-4 top-1/2 -translate-y-1/2 text-[#A0A090] hover:text-[#5A5A40]"
              >
                {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
          </div>

          <button
            type="submit"
            className="w-full bg-[#5A5A40] text-white py-3.5 rounded-2xl font-semibold text-sm hover:bg-[#474732] active:scale-98 transition-all shadow-md mt-6"
          >
            Entrar no Sistema
          </button>
        </form>

        {/* Informative credentials shortcut helpful for clinical sandbox environment */}
        <div className="bg-[#F9F9F5] rounded-2xl p-4 border border-[#E5E5E0] space-y-2">
          <p className="text-[11px] font-semibold text-[#5A5A40] uppercase tracking-wider flex items-center gap-1">
            <ShieldCheck className="w-3.5 h-3.5 text-[#C17A63]" />
            Acesso Rápido para Teste:
          </p>
          <div className="grid grid-cols-1 gap-1 text-[10px] text-[#707060]">
            <div>• <strong>Dra. Márcia:</strong> marciaodonto@yahoo.com.br <span className="text-[#C17A63] font-bold">(senha temporária: 123)</span></div>
            <div>• <strong>Dra. Francisca:</strong> fran_ramalho@yahoo.com.br <span className="text-[#C17A63] font-bold">(senha temporária: 123)</span></div>
            <div>• <strong>Admin:</strong> admin@franciscaemarcia.com.br <span className="opacity-60">(senha: qualquer)</span></div>
            <div>• <strong>Recepção:</strong> recepcao@franciscaemarcia.com.br <span className="opacity-60">(senha: qualquer)</span></div>
          </div>
        </div>
      </div>
    </div>
  );
};
