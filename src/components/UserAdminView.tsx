import React, { useState } from "react";
import { SystemUser, UserRole } from "../types";
import { 
  Users, 
  UserPlus, 
  Edit, 
  Lock, 
  Power, 
  Shield, 
  Check, 
  X,
  UserCheck,
  AlertTriangle
} from "lucide-react";

interface UserAdminViewProps {
  currentUser: SystemUser;
  users: SystemUser[];
  onAddUser: (user: Omit<SystemUser, "id">) => void;
  onUpdateUser: (updatedUser: SystemUser) => void;
}

export const UserAdminView: React.FC<UserAdminViewProps> = ({
  currentUser,
  users,
  onAddUser,
  onUpdateUser
}) => {
  const [showAddModal, setShowAddModal] = useState(false);
  const [editingUser, setEditingUser] = useState<SystemUser | null>(null);
  const [deactivateConfirmUser, setDeactivateConfirmUser] = useState<SystemUser | null>(null);

  // New user form state
  const [formName, setFormName] = useState("");
  const [formEmail, setFormEmail] = useState("");
  const [formRole, setFormRole] = useState<UserRole>("Recepção");
  const [formTempPassword, setFormTempPassword] = useState("123");
  const [formForceChange, setFormForceChange] = useState(true);

  // Security layer block just in case
  if (currentUser.role !== "Administrador") {
    return (
      <div className="p-8 bg-red-50 border border-red-200 text-red-800 rounded-3xl space-y-2 animate-fade-in">
        <h3 className="font-bold text-lg">Acesso Restrito ao Administrador</h3>
        <p className="text-sm">
          Desculpe, a visualização de gerenciamento de equipe está restrita exclusivamente ao perfil de administrador.
        </p>
      </div>
    );
  }

  const handleCreateUser = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formName || !formEmail) {
      alert("Por favor, preencha todos os campos obrigatórios.");
      return;
    }

    // Email check
    const exists = users.find(u => u.email.toLowerCase() === formEmail.toLowerCase());
    if (exists) {
      alert("Este e-mail/usuário já está cadastrado no sistema.");
      return;
    }

    onAddUser({
      name: formName,
      email: formEmail,
      role: formRole,
      active: true,
      needsPasswordChange: formForceChange
    });

    setShowAddModal(false);
    // Reset
    setFormName("");
    setFormEmail("");
    setFormRole("Recepção");
    setFormTempPassword("123");
    setFormForceChange(true);
    alert(`✨ Usuário criado com sucesso! Senha temporária configurada para o primeiro login.`);
  };

  const handleToggleActive = (user: SystemUser) => {
    // Prevent self-deactivation
    if (user.id === currentUser.id) {
      alert("Operação bloqueada: Você não pode desativar sua própria conta de administrador ativa.");
      return;
    }

    if (user.active) {
      setDeactivateConfirmUser(user);
    } else {
      onUpdateUser({
        ...user,
        active: true
      });
      alert(`✨ Usuário ${user.name} reativado com sucesso.`);
    }
  };

  const handleResetPassword = (user: SystemUser) => {
    const confirmAction = window.confirm(`Deseja redefinir a senha do usuário ${user.name} para a senha padrão temporária "123"? Isso forçará a troca de senha no próximo acesso.`);
    if (confirmAction) {
      onUpdateUser({
        ...user,
        needsPasswordChange: true
      });
      alert(`🔑 Senha do usuário ${user.name} redefinida com sucesso para "123". Ele precisará trocá-la no próximo login.`);
    }
  };

  const handleStartEdit = (user: SystemUser) => {
    setEditingUser(user);
  };

  const handleSaveEdit = (e: React.FormEvent) => {
    e.preventDefault();
    if (editingUser) {
      onUpdateUser(editingUser);
      setEditingUser(null);
      alert("Membro da equipe atualizado com sucesso!");
    }
  };

  return (
    <div className="space-y-8 animate-fade-in">
      
      {/* Top Banner with Quick statistics and action shortcut */}
      <div className="flex flex-col sm:flex-row justify-between sm:items-center gap-4 border-b border-[#E5E5E0] pb-6">
        <div>
          <h2 className="text-3xl font-serif text-[#1A1A1A]">Administração de Usuários e Equipe</h2>
          <p className="text-xs text-[#707060] mt-0.5">Gerencie os acessos, permissões e status dos profissionais da clínica</p>
        </div>
        
        <button
          onClick={() => setShowAddModal(true)}
          className="flex items-center justify-center gap-2 px-5 py-2.5 bg-[#5A5A40] text-white rounded-full text-xs font-semibold shadow-md hover:bg-[#474732] active:scale-95 transition-all self-start sm:self-auto"
        >
          <UserPlus className="w-4 h-4" />
          <span>Novo Usuário</span>
        </button>
      </div>

      {/* Users Grid Table */}
      <div className="bg-white rounded-[32px] border border-[#E5E5E0] overflow-hidden shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className="bg-[#FBFBFA] border-b border-[#F0F0E8] text-[#707060] uppercase tracking-wider font-bold text-[10px]">
                <th className="px-6 py-4">Nome Completo</th>
                <th className="px-6 py-4">Usuário / E-mail</th>
                <th className="px-6 py-4">Perfil / Permissões</th>
                <th className="px-6 py-4">Status de Acesso</th>
                <th className="px-6 py-4 text-right">Ações Rápidas</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#F5F5F0]">
              {users.map(u => {
                const isSelf = u.id === currentUser.id;
                
                return (
                  <tr key={u.id} className="hover:bg-[#FBFBFA]/60 transition-all">
                    <td className="px-6 py-4 font-semibold text-sm text-[#1A1A1A]">
                      <div className="flex items-center gap-2">
                        <span>{u.name}</span>
                        {isSelf && (
                          <span className="bg-[#F2F2E9] text-[#5A5A40] text-[9px] px-2 py-0.5 rounded-full font-bold uppercase tracking-wider border border-[#D8D8C0]">
                            Você
                          </span>
                        )}
                      </div>
                    </td>
                    <td className="px-6 py-4 text-[#707060]">{u.email}</td>
                    <td className="px-6 py-4">
                      <span className={`px-2.5 py-1 rounded-full font-bold text-[9px] uppercase tracking-wider ${
                        u.role === "Administrador" 
                          ? "bg-[#F2F2E9] text-[#5A5A40] border border-[#D8D8C0]" 
                          : u.role === "Doutora"
                          ? "bg-[#E6EEF4] text-[#2C4A63]"
                          : "bg-orange-50 text-orange-800"
                      }`}>
                        {u.role}
                      </span>
                    </td>
                    <td className="px-6 py-4">
                      <span className={`flex items-center gap-1.5 font-bold uppercase text-[9px] tracking-wide ${
                        u.active ? "text-green-700" : "text-red-600"
                      }`}>
                        <span className={`w-1.5 h-1.5 rounded-full ${u.active ? "bg-green-600" : "bg-red-600"}`}></span>
                        {u.active ? "Ativo" : "Inativo / Desativado"}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-right space-x-1.5">
                      {/* Edit */}
                      <button
                        onClick={() => handleStartEdit(u)}
                        className="p-1.5 hover:bg-[#F5F5F0] rounded-lg text-[#5A5A40] inline-flex items-center gap-1 font-semibold"
                        title="Editar Informações"
                      >
                        <Edit className="w-3.5 h-3.5" />
                        <span className="sr-only sm:not-sr-only text-[10px]">Editar</span>
                      </button>

                      {/* Reset Password */}
                      <button
                        onClick={() => handleResetPassword(u)}
                        className="p-1.5 hover:bg-amber-50 rounded-lg text-[#C17A63] inline-flex items-center gap-1 font-semibold"
                        title="Redefinir Senha"
                      >
                        <Lock className="w-3.5 h-3.5" />
                        <span className="sr-only sm:not-sr-only text-[10px]">Redefinir</span>
                      </button>

                      {/* Deactivate / Toggle */}
                      <button
                        onClick={() => handleToggleActive(u)}
                        className={`p-1.5 rounded-lg inline-flex items-center gap-1 font-semibold ${
                          u.active 
                            ? "hover:bg-red-50 text-red-600" 
                            : "hover:bg-green-50 text-green-700"
                        }`}
                        title={u.active ? "Desativar Usuário" : "Ativar Usuário"}
                        disabled={isSelf}
                      >
                        <Power className="w-3.5 h-3.5" />
                        <span className="sr-only sm:not-sr-only text-[10px]">
                          {u.active ? "Bloquear" : "Ativar"}
                        </span>
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* NEW USER MODAL (Screen 12) */}
      {showAddModal && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-[32px] border border-[#E5E5E0] shadow-2xl w-full max-w-md p-8 space-y-6 animate-scale-up">
            
            <div className="flex justify-between items-center border-b border-[#F5F5F0] pb-4">
              <h3 className="font-serif text-2xl text-[#5A5A40] italic font-semibold">Novo Membro de Equipe</h3>
              <button 
                onClick={() => setShowAddModal(false)}
                className="text-xs text-[#A0A090] hover:text-[#5A5A40] font-bold"
              >
                Voltar
              </button>
            </div>

            <form onSubmit={handleCreateUser} className="space-y-4">
              
              {/* Full Name */}
              <div>
                <label className="block text-[11px] font-bold text-[#707060] uppercase tracking-wider mb-1">
                  Nome Completo *
                </label>
                <input
                  type="text"
                  value={formName}
                  onChange={(e) => setFormName(e.target.value)}
                  placeholder="Ex: Dra. Márcia Oliveira"
                  className="w-full bg-[#F5F5F0] border border-[#E5E5E0] rounded-2xl px-4 py-3 text-sm focus:border-[#5A5A40] focus:ring-1 focus:ring-[#5A5A40] outline-none transition-all"
                  required
                />
              </div>

              {/* Email / Username */}
              <div>
                <label className="block text-[11px] font-bold text-[#707060] uppercase tracking-wider mb-1">
                  E-mail / Nome de Usuário *
                </label>
                <input
                  type="email"
                  value={formEmail}
                  onChange={(e) => setFormEmail(e.target.value)}
                  placeholder="exemplo@franciscaemarcia.com.br"
                  className="w-full bg-[#F5F5F0] border border-[#E5E5E0] rounded-2xl px-4 py-3 text-sm focus:border-[#5A5A40] focus:ring-1 focus:ring-[#5A5A40] outline-none transition-all"
                  required
                />
              </div>

              {/* Profile role selection */}
              <div>
                <label className="block text-[11px] font-bold text-[#707060] uppercase tracking-wider mb-1">
                  Perfil de Acesso
                </label>
                <select
                  value={formRole}
                  onChange={(e) => setFormRole(e.target.value as UserRole)}
                  className="w-full bg-[#F5F5F0] border border-[#E5E5E0] rounded-2xl px-4 py-3 text-sm focus:border-[#5A5A40] focus:ring-1 focus:ring-[#5A5A40] outline-none transition-all"
                >
                  <option value="Administrador">Administrador (Gestor)</option>
                  <option value="Doutora">Doutora / Profissional de Saúde</option>
                  <option value="Recepção">Recepção / Secretariado</option>
                </select>
              </div>

              {/* Temporary password display */}
              <div className="bg-[#FBFBFA] p-3.5 rounded-2xl border border-[#F0F0E8] space-y-1 text-xs">
                <p className="font-bold text-[#5A5A40]">Chave Temporária de Acesso</p>
                <p className="text-[#707060] leading-relaxed">
                  A senha padrão temporária inicial de segurança será: <strong className="text-[#C17A63]">"123"</strong>.
                </p>
              </div>

              {/* Force password change check */}
              <div className="flex items-center gap-2.5 pt-2">
                <input
                  type="checkbox"
                  id="forceChange"
                  checked={formForceChange}
                  onChange={(e) => setFormForceChange(e.target.checked)}
                  className="w-4 h-4 rounded border-[#E5E5E0] text-[#5A5A40] focus:ring-[#5A5A40]"
                />
                <label htmlFor="forceChange" className="text-xs text-[#707060] font-semibold select-none cursor-pointer">
                  Obrigar troca de senha no primeiro login
                </label>
              </div>

              {/* Submit / Cancel */}
              <div className="flex gap-3 pt-4">
                <button
                  type="button"
                  onClick={() => setShowAddModal(false)}
                  className="flex-1 px-4 py-3 border border-[#D8D8C0] text-[#5A5A40] rounded-2xl text-xs font-semibold hover:bg-[#F5F5F0] transition-all"
                >
                  Voltar
                </button>
                <button
                  type="submit"
                  className="flex-1 px-4 py-3 bg-[#5A5A40] text-white rounded-2xl text-xs font-bold hover:bg-[#474732] shadow-md transition-all"
                >
                  Criar usuário
                </button>
              </div>

            </form>
          </div>
        </div>
      )}

      {/* EDIT USER INFO MODAL */}
      {editingUser && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-[32px] border border-[#E5E5E0] shadow-2xl w-full max-w-md p-8 space-y-6 animate-scale-up">
            
            <div className="flex justify-between items-center border-b border-[#F5F5F0] pb-4">
              <h3 className="font-serif text-2xl text-[#5A5A40] italic font-semibold">Editar Dados de Usuário</h3>
              <button 
                onClick={() => setEditingUser(null)}
                className="text-xs text-[#A0A090] hover:text-[#5A5A40] font-bold"
              >
                Cancelar
              </button>
            </div>

            <form onSubmit={handleSaveEdit} className="space-y-4">
              
              <div>
                <label className="block text-[11px] font-bold text-[#707060] uppercase tracking-wider mb-1">
                  Nome Completo
                </label>
                <input
                  type="text"
                  value={editingUser.name}
                  onChange={(e) => setEditingUser({ ...editingUser, name: e.target.value })}
                  className="w-full bg-[#F5F5F0] border border-[#E5E5E0] rounded-2xl px-4 py-3 text-sm focus:border-[#5A5A40] focus:ring-1 focus:ring-[#5A5A40] outline-none transition-all"
                  required
                />
              </div>

              <div>
                <label className="block text-[11px] font-bold text-[#707060] uppercase tracking-wider mb-1">
                  Usuário / E-mail
                </label>
                <input
                  type="email"
                  value={editingUser.email}
                  onChange={(e) => setEditingUser({ ...editingUser, email: e.target.value })}
                  className="w-full bg-[#F5F5F0] border border-[#E5E5E0] rounded-2xl px-4 py-3 text-sm focus:border-[#5A5A40] focus:ring-1 focus:ring-[#5A5A40] outline-none transition-all"
                  required
                />
              </div>

              <div>
                <label className="block text-[11px] font-bold text-[#707060] uppercase tracking-wider mb-1">
                  Perfil de Acesso
                </label>
                <select
                  value={editingUser.role}
                  onChange={(e) => setEditingUser({ ...editingUser, role: e.target.value as UserRole })}
                  className="w-full bg-[#F5F5F0] border border-[#E5E5E0] rounded-2xl px-4 py-3 text-sm focus:border-[#5A5A40] focus:ring-1 focus:ring-[#5A5A40] outline-none transition-all"
                >
                  <option value="Administrador">Administrador (Gestor)</option>
                  <option value="Doutora">Doutora / Profissional de Saúde</option>
                  <option value="Recepção">Recepção / Secretariado</option>
                </select>
              </div>

              {/* Submit */}
              <div className="flex gap-3 pt-4">
                <button
                  type="button"
                  onClick={() => setEditingUser(null)}
                  className="flex-1 px-4 py-3 border border-[#D8D8C0] text-[#5A5A40] rounded-2xl text-xs font-semibold hover:bg-[#F5F5F0] transition-all"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="flex-1 px-4 py-3 bg-[#5A5A40] text-white rounded-2xl text-xs font-bold hover:bg-[#474732] shadow-md transition-all"
                >
                  Salvar Alterações
                </button>
              </div>

            </form>
          </div>
        </div>
      )}

      {/* CUSTOM VISUAL CONFIRMATION FOR DEACTIVATING USER (Requirement) */}
      {deactivateConfirmUser && (
        <div className="fixed inset-0 bg-[#1A1A1A]/40 backdrop-blur-xs z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-[32px] border border-[#E5E5E0] shadow-2xl w-full max-w-md p-8 space-y-6 animate-scale-up">
            
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-full bg-red-50 flex items-center justify-center text-red-600 border border-red-100">
                <AlertTriangle className="w-6 h-6 text-[#C17A63]" />
              </div>
              <div>
                <h4 className="font-serif text-lg text-[#1A1A1A] font-semibold leading-tight">
                  Bloquear / Desativar Usuário?
                </h4>
                <p className="text-[10px] text-red-600 uppercase tracking-wider font-bold mt-0.5">Confirmação de Segurança</p>
              </div>
            </div>

            <p className="text-xs text-[#707060] leading-relaxed">
              Tem certeza de que deseja DESATIVAR a conta de acesso de <strong>{deactivateConfirmUser.name}</strong>? Este usuário perderá instantaneamente todo acesso operacional ao sistema da clínica.
            </p>

            <div className="flex gap-3 pt-2">
              <button
                type="button"
                onClick={() => setDeactivateConfirmUser(null)}
                className="flex-1 px-4 py-3 border border-[#D8D8C0] text-[#5A5A40] rounded-2xl text-xs font-semibold hover:bg-[#F5F5F0] transition-all"
              >
                Voltar
              </button>
              <button
                type="button"
                onClick={() => {
                  onUpdateUser({
                    ...deactivateConfirmUser,
                    active: false
                  });
                  setDeactivateConfirmUser(null);
                }}
                className="flex-1 px-4 py-3 bg-red-600 hover:bg-red-700 text-white rounded-2xl text-xs font-bold shadow-md transition-all"
              >
                Bloquear Usuário
              </button>
            </div>

          </div>
        </div>
      )}

    </div>
  );
};
