import React, { useState } from "react";
import { SystemUser, UserRole } from "../types";
import { Edit, Lock, Power, UserPlus, AlertTriangle, Trash2 } from "lucide-react";

interface UserAdminViewProps {
  currentUser: SystemUser;
  users: SystemUser[];
  onAddUser: (user: Omit<SystemUser, "id" | "needsPasswordChange"> & { password: string }) => Promise<void>;
  onUpdateUser: (updatedUser: SystemUser) => Promise<void>;
  onUpdateUserPassword: (userId: string, password: string) => Promise<void>;
  onDeleteUser: (userId: string) => Promise<void>;
}

export const UserAdminView: React.FC<UserAdminViewProps> = ({
  currentUser,
  users,
  onAddUser,
  onUpdateUser,
  onUpdateUserPassword,
  onDeleteUser
}) => {
  const [showAddModal, setShowAddModal] = useState(false);
  const [editingUser, setEditingUser] = useState<SystemUser | null>(null);
  const [deactivateConfirmUser, setDeactivateConfirmUser] = useState<SystemUser | null>(null);
  const [deleteConfirmUser, setDeleteConfirmUser] = useState<SystemUser | null>(null);
  const [formName, setFormName] = useState("");
  const [formEmail, setFormEmail] = useState("");
  const [formRole, setFormRole] = useState<UserRole>("Recepção");
  const [formPassword, setFormPassword] = useState("");
  const [submitting, setSubmitting] = useState(false);

  if (currentUser.role !== "Administrador") {
    return (
      <div className="p-8 bg-red-50 border border-red-200 text-red-800 rounded-3xl space-y-2 animate-fade-in">
        <h3 className="font-bold text-lg">Acesso Restrito ao Administrador</h3>
        <p className="text-sm">O gerenciamento de equipe esta restrito ao perfil de administrador.</p>
      </div>
    );
  }

  const resetForm = () => {
    setFormName("");
    setFormEmail("");
    setFormRole("Recepção");
    setFormPassword("");
  };

  const handleCreateUser = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formName || !formEmail || !formPassword) {
      alert("Preencha nome, e-mail e senha.");
      return;
    }
    if (formPassword.length < 6) {
      alert("A senha deve possuir pelo menos 6 caracteres.");
      return;
    }
    if (users.some(user => user.email.toLowerCase() === formEmail.toLowerCase())) {
      alert("Este e-mail ja esta cadastrado no sistema.");
      return;
    }

    try {
      setSubmitting(true);
      await onAddUser({
        name: formName,
        email: formEmail,
        role: formRole,
        active: true,
        password: formPassword
      });
      resetForm();
      setShowAddModal(false);
    } catch (error) {
      alert(error instanceof Error ? error.message : "Nao foi possivel criar o usuario.");
    } finally {
      setSubmitting(false);
    }
  };

  const handleSaveEdit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingUser) return;
    try {
      await onUpdateUser(editingUser);
      setEditingUser(null);
    } catch (error) {
      alert(error instanceof Error ? error.message : "Nao foi possivel atualizar o usuario.");
    }
  };

  const handleResetPassword = async (user: SystemUser) => {
    const password = window.prompt(`Digite a nova senha para ${user.name}. Minimo de 6 caracteres.`);
    if (password === null) return;
    if (password.length < 6) {
      alert("A senha deve possuir pelo menos 6 caracteres.");
      return;
    }
    try {
      await onUpdateUserPassword(user.id, password);
    } catch (error) {
      alert(error instanceof Error ? error.message : "Nao foi possivel redefinir a senha.");
    }
  };

  const toggleActive = async (user: SystemUser, active: boolean) => {
    if (user.id === currentUser.id && !active) {
      alert("Voce nao pode desativar sua propria conta.");
      return;
    }
    try {
      await onUpdateUser({ ...user, active });
    } catch (error) {
      alert(error instanceof Error ? error.message : "Nao foi possivel alterar o status do usuario.");
    }
  };

  const handleDeleteUser = async (user: SystemUser) => {
    if (user.id === currentUser.id) {
      alert("Voce nao pode excluir sua propria conta.");
      return;
    }
    try {
      await onDeleteUser(user.id);
      setDeleteConfirmUser(null);
    } catch (error) {
      alert(error instanceof Error ? error.message : "Nao foi possivel excluir o usuario.");
    }
  };

  return (
    <div className="space-y-8 animate-fade-in">
      <div className="flex flex-col sm:flex-row justify-between sm:items-center gap-4 border-b border-[#E5E5E0] pb-6">
        <div>
          <h2 className="text-3xl font-serif text-[#1A1A1A]">Administracao de Usuarios e Equipe</h2>
          <p className="text-xs text-[#707060] mt-0.5">Gerencie acessos, perfis, status e senhas da equipe.</p>
        </div>
        <button
          onClick={() => setShowAddModal(true)}
          className="flex items-center justify-center gap-2 px-5 py-2.5 bg-[#5A5A40] text-white rounded-full text-xs font-semibold shadow-md hover:bg-[#474732] active:scale-95 transition-all self-start sm:self-auto"
        >
          <UserPlus className="w-4 h-4" />
          <span>Novo Usuario</span>
        </button>
      </div>

      <div className="bg-white rounded-[32px] border border-[#E5E5E0] overflow-hidden shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className="bg-[#FBFBFA] border-b border-[#F0F0E8] text-[#707060] uppercase tracking-wider font-bold text-[10px]">
                <th className="px-6 py-4">Nome</th>
                <th className="px-6 py-4">E-mail</th>
                <th className="px-6 py-4">Perfil</th>
                <th className="px-6 py-4">Status</th>
                <th className="px-6 py-4 text-right">Acoes</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#F5F5F0]">
              {users.map(user => {
                const isSelf = user.id === currentUser.id;
                return (
                  <tr key={user.id} className="hover:bg-[#FBFBFA]/70">
                    <td className="px-6 py-4 font-semibold text-sm text-[#1A1A1A]">
                      {user.name}
                      {isSelf && <span className="ml-2 bg-[#F2F2E9] text-[#5A5A40] text-[9px] px-2 py-0.5 rounded-full font-bold uppercase">Voce</span>}
                    </td>
                    <td className="px-6 py-4 text-[#707060]">{user.email}</td>
                    <td className="px-6 py-4">
                      <span className="px-2.5 py-1 rounded-full font-bold text-[9px] uppercase tracking-wider bg-[#F2F2E9] text-[#5A5A40] border border-[#D8D8C0]">
                        {user.role}
                      </span>
                    </td>
                    <td className="px-6 py-4">
                      <span className={`font-bold uppercase text-[9px] tracking-wide ${user.active ? "text-green-700" : "text-red-600"}`}>
                        {user.active ? "Ativo" : "Inativo"}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-right space-x-1.5">
                      <button onClick={() => setEditingUser(user)} className="p-1.5 hover:bg-[#F5F5F0] rounded-lg text-[#5A5A40] inline-flex items-center gap-1 font-semibold">
                        <Edit className="w-3.5 h-3.5" />
                        <span className="text-[10px]">Editar</span>
                      </button>
                      <button onClick={() => handleResetPassword(user)} className="p-1.5 hover:bg-amber-50 rounded-lg text-[#C17A63] inline-flex items-center gap-1 font-semibold">
                        <Lock className="w-3.5 h-3.5" />
                        <span className="text-[10px]">Senha</span>
                      </button>
                      <button
                        onClick={() => user.active ? setDeactivateConfirmUser(user) : void toggleActive(user, true)}
                        disabled={isSelf}
                        className={`p-1.5 rounded-lg inline-flex items-center gap-1 font-semibold ${user.active ? "hover:bg-red-50 text-red-600" : "hover:bg-green-50 text-green-700"} disabled:opacity-40`}
                      >
                        <Power className="w-3.5 h-3.5" />
                        <span className="text-[10px]">{user.active ? "Bloquear" : "Ativar"}</span>
                      </button>
                      <button
                        onClick={() => setDeleteConfirmUser(user)}
                        disabled={isSelf}
                        className="p-1.5 hover:bg-red-50 rounded-lg text-red-700 inline-flex items-center gap-1 font-semibold disabled:opacity-40"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                        <span className="text-[10px]">Excluir</span>
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {showAddModal && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-[32px] border border-[#E5E5E0] shadow-2xl w-full max-w-md p-8 space-y-6 animate-scale-up">
            <div className="flex justify-between items-center border-b border-[#F5F5F0] pb-4">
              <h3 className="font-serif text-2xl text-[#5A5A40] italic font-semibold">Novo Membro de Equipe</h3>
              <button onClick={() => { setShowAddModal(false); resetForm(); }} className="text-xs text-[#A0A090] hover:text-[#5A5A40] font-bold">Voltar</button>
            </div>
            <form onSubmit={handleCreateUser} className="space-y-4">
              <input value={formName} onChange={(e) => setFormName(e.target.value)} placeholder="Nome completo" className="w-full bg-[#F5F5F0] border border-[#E5E5E0] rounded-2xl px-4 py-3 text-sm" required />
              <input type="email" value={formEmail} onChange={(e) => setFormEmail(e.target.value)} placeholder="E-mail" className="w-full bg-[#F5F5F0] border border-[#E5E5E0] rounded-2xl px-4 py-3 text-sm" required />
              <select value={formRole} onChange={(e) => setFormRole(e.target.value as UserRole)} className="w-full bg-[#F5F5F0] border border-[#E5E5E0] rounded-2xl px-4 py-3 text-sm">
                <option value="Administrador">Administrador</option>
                <option value="Doutora">Doutora</option>
                <option value="Recepção">Recepcao</option>
              </select>
              <input type="password" value={formPassword} onChange={(e) => setFormPassword(e.target.value)} placeholder="Senha final de acesso" className="w-full bg-[#F5F5F0] border border-[#E5E5E0] rounded-2xl px-4 py-3 text-sm" required />
              <p className="text-[10px] text-[#707060]">A senha definida aqui ja sera a senha valida do usuario.</p>
              <div className="flex gap-3 pt-4">
                <button type="button" onClick={() => { setShowAddModal(false); resetForm(); }} className="flex-1 px-4 py-3 border border-[#D8D8C0] text-[#5A5A40] rounded-2xl text-xs font-semibold">Voltar</button>
                <button type="submit" disabled={submitting} className="flex-1 px-4 py-3 bg-[#5A5A40] text-white rounded-2xl text-xs font-bold disabled:opacity-70">
                  {submitting ? "Criando..." : "Criar usuario"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {editingUser && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-[32px] border border-[#E5E5E0] shadow-2xl w-full max-w-md p-8 space-y-6 animate-scale-up">
            <div className="flex justify-between items-center border-b border-[#F5F5F0] pb-4">
              <h3 className="font-serif text-2xl text-[#5A5A40] italic font-semibold">Editar Usuario</h3>
              <button onClick={() => setEditingUser(null)} className="text-xs text-[#A0A090] hover:text-[#5A5A40] font-bold">Cancelar</button>
            </div>
            <form onSubmit={handleSaveEdit} className="space-y-4">
              <input value={editingUser.name} onChange={(e) => setEditingUser({ ...editingUser, name: e.target.value })} className="w-full bg-[#F5F5F0] border border-[#E5E5E0] rounded-2xl px-4 py-3 text-sm" required />
              <input type="email" value={editingUser.email} onChange={(e) => setEditingUser({ ...editingUser, email: e.target.value })} className="w-full bg-[#F5F5F0] border border-[#E5E5E0] rounded-2xl px-4 py-3 text-sm" required />
              <select value={editingUser.role} onChange={(e) => setEditingUser({ ...editingUser, role: e.target.value as UserRole })} className="w-full bg-[#F5F5F0] border border-[#E5E5E0] rounded-2xl px-4 py-3 text-sm">
                <option value="Administrador">Administrador</option>
                <option value="Doutora">Doutora</option>
                <option value="Recepção">Recepcao</option>
              </select>
              <div className="flex gap-3 pt-4">
                <button type="button" onClick={() => setEditingUser(null)} className="flex-1 px-4 py-3 border border-[#D8D8C0] text-[#5A5A40] rounded-2xl text-xs font-semibold">Cancelar</button>
                <button type="submit" className="flex-1 px-4 py-3 bg-[#5A5A40] text-white rounded-2xl text-xs font-bold">Salvar</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {deactivateConfirmUser && (
        <div className="fixed inset-0 bg-[#1A1A1A]/40 backdrop-blur-xs z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-[32px] border border-[#E5E5E0] shadow-2xl w-full max-w-md p-8 space-y-6 animate-scale-up">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-full bg-red-50 flex items-center justify-center text-red-600 border border-red-100">
                <AlertTriangle className="w-6 h-6 text-[#C17A63]" />
              </div>
              <div>
                <h4 className="font-serif text-lg text-[#1A1A1A] font-semibold leading-tight">Bloquear usuario?</h4>
                <p className="text-[10px] text-red-600 uppercase tracking-wider font-bold mt-0.5">Confirmacao de seguranca</p>
              </div>
            </div>
            <p className="text-xs text-[#707060] leading-relaxed">
              {deactivateConfirmUser.name} perdera o acesso ao sistema ate ser reativado por um administrador.
            </p>
            <div className="flex gap-3 pt-2">
              <button type="button" onClick={() => setDeactivateConfirmUser(null)} className="flex-1 px-4 py-3 border border-[#D8D8C0] text-[#5A5A40] rounded-2xl text-xs font-semibold">Voltar</button>
              <button
                type="button"
                onClick={() => {
                  void toggleActive(deactivateConfirmUser, false);
                  setDeactivateConfirmUser(null);
                }}
                className="flex-1 px-4 py-3 bg-red-600 hover:bg-red-700 text-white rounded-2xl text-xs font-bold shadow-md"
              >
                Bloquear
              </button>
            </div>
          </div>
        </div>
      )}

      {deleteConfirmUser && (
        <div className="fixed inset-0 bg-[#1A1A1A]/40 backdrop-blur-xs z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-[32px] border border-[#E5E5E0] shadow-2xl w-full max-w-md p-8 space-y-6 animate-scale-up">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-full bg-red-50 flex items-center justify-center border border-red-100">
                <Trash2 className="w-6 h-6 text-red-700" />
              </div>
              <div>
                <h4 className="font-serif text-lg text-[#1A1A1A] font-semibold leading-tight">Excluir conta?</h4>
                <p className="text-[10px] text-red-600 uppercase tracking-wider font-bold mt-0.5">Acao permanente</p>
              </div>
            </div>
            <p className="text-xs text-[#707060] leading-relaxed">
              A conta de {deleteConfirmUser.name} sera removida da equipe. Essa acao nao remove fichas, contatos ou agendamentos.
            </p>
            <div className="flex gap-3 pt-2">
              <button type="button" onClick={() => setDeleteConfirmUser(null)} className="flex-1 px-4 py-3 border border-[#D8D8C0] text-[#5A5A40] rounded-2xl text-xs font-semibold">Voltar</button>
              <button
                type="button"
                onClick={() => void handleDeleteUser(deleteConfirmUser)}
                className="flex-1 px-4 py-3 bg-red-600 hover:bg-red-700 text-white rounded-2xl text-xs font-bold shadow-md"
              >
                Excluir
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
