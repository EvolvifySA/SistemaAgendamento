import React, { useState } from "react";
import { AuthSession } from "../types";
import { apiClient } from "../services/apiClient";
import { Lock, Mail, Eye, EyeOff, ShieldCheck, Loader2 } from "lucide-react";
import loginBackground from "../utils/bg1.jpg";

interface LoginScreenProps {
  onLoginSuccess: (session: AuthSession) => Promise<void>;
}

export const LoginScreen: React.FC<LoginScreenProps> = ({ onLoginSuccess }) => {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState("");
  const [infoMessage, setInfoMessage] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setInfoMessage("");

    if (!email || !password) {
      setError("Por favor, preencha e-mail e senha.");
      return;
    }

    setSubmitting(true);
    try {
      const session = await apiClient.login(email, password);
      await onLoginSuccess(session);
    } catch (loginError) {
      setError(loginError instanceof Error ? loginError.message : "Nao foi possivel entrar no sistema.");
    } finally {
      setSubmitting(false);
    }
  };

  const handleForgotPassword = () => {
    setInfoMessage("Solicite a redefinicao de senha para um administrador da clinica.");
  };

  return (
    <div
      className="min-h-screen flex items-center justify-center p-4 bg-cover bg-center relative"
      style={{ backgroundImage: `url(${loginBackground})` }}
    >
      <div className="absolute inset-0 bg-[#F5F5F0]/72 backdrop-blur-[1px]" />
      <div className="w-full max-w-md bg-white rounded-[32px] shadow-xl border border-[#E5E5E0] p-8 md:p-10 space-y-8 relative overflow-hidden">
        <div className="absolute top-0 right-0 w-32 h-32 bg-[#C17A63]/5 rounded-full blur-2xl -mr-10 -mt-10"></div>

        <div className="text-center space-y-3">
          <h1 className="text-3xl font-serif italic text-[#5A5A40] leading-tight tracking-wide">
            Francisca &amp; Marcia
          </h1>
          <p className="text-[10px] uppercase tracking-[0.2em] text-[#C17A63] font-bold">
            Consultorio Odontologico
          </p>
          <div className="h-[1px] w-12 bg-[#D8D8C0] mx-auto my-4"></div>
          <p className="text-xs text-[#707060]">
            Acesse o sistema para gerenciar a agenda digital do consultorio
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
              Usuario / E-mail
            </label>
            <div className="relative">
              <Mail className="w-4 h-4 text-[#A0A090] absolute left-4 top-1/2 -translate-y-1/2" />
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="nome@evolvify.cloud"
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
            disabled={submitting}
            className="w-full bg-[#5A5A40] text-white py-3.5 rounded-2xl font-semibold text-sm hover:bg-[#474732] active:scale-98 transition-all shadow-md mt-6 disabled:opacity-70 flex items-center justify-center gap-2"
          >
            {submitting && <Loader2 className="w-4 h-4 animate-spin" />}
            <span>{submitting ? "Entrando..." : "Entrar no Sistema"}</span>
          </button>
        </form>

        <div className="bg-[#F9F9F5] rounded-2xl p-4 border border-[#E5E5E0] space-y-2">
          <p className="text-[11px] font-semibold text-[#5A5A40] uppercase tracking-wider flex items-center gap-1">
            <ShieldCheck className="w-3.5 h-3.5 text-[#C17A63]" />
            Acesso seguro
          </p>
          <p className="text-[10px] text-[#707060]">
            Usuarios antigos para acesso ao sistema devem solicitar a redefinicao de senha para um administrador da clinica.
          </p>
        </div>
      </div>
    </div>
  );
};
