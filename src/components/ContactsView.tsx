import React, { useMemo, useState } from "react";
import { Contact, Patient } from "../types";
import { normalizePhone } from "../utils/phone";
import { CheckCircle2, Link2, MessageCircle, Plus, Search, UserPlus } from "lucide-react";

interface ContactsViewProps {
  contacts: Contact[];
  patients: Patient[];
  onAddContact: (contact: Omit<Contact, "id" | "normalizedPhone" | "createdAt" | "updatedAt">) => void;
  onUpdateContact: (contact: Contact) => void;
  onCreatePatientFromContact: (contact: Contact) => void;
  onNavigate: (viewId: string) => void;
}

export const ContactsView: React.FC<ContactsViewProps> = ({
  contacts,
  patients,
  onAddContact,
  onUpdateContact,
  onCreatePatientFromContact,
  onNavigate
}) => {
  const [search, setSearch] = useState("");
  const [showModal, setShowModal] = useState(false);
  const [editing, setEditing] = useState<Contact | null>(null);
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [email, setEmail] = useState("");
  const [tags, setTags] = useState("");
  const [notes, setNotes] = useState("");
  const [whatsappOptIn, setWhatsappOptIn] = useState(true);

  const patientsByPhone = useMemo(() => {
    const map = new Map<string, Patient>();
    patients.forEach(patient => map.set(patient.normalizedPhone || normalizePhone(patient.phone), patient));
    return map;
  }, [patients]);

  const filtered = contacts.filter(contact => {
    const term = search.toLowerCase();
    return (
      contact.name.toLowerCase().includes(term) ||
      contact.phone.includes(search) ||
      contact.normalizedPhone.includes(search.replace(/\D/g, "")) ||
      (contact.email || "").toLowerCase().includes(term)
    );
  });

  const openNew = () => {
    setEditing(null);
    setName("");
    setPhone("");
    setEmail("");
    setTags("");
    setNotes("");
    setWhatsappOptIn(true);
    setShowModal(true);
  };

  const openEdit = (contact: Contact) => {
    setEditing(contact);
    setName(contact.name);
    setPhone(contact.phone);
    setEmail(contact.email || "");
    setTags(contact.tags.join(", "));
    setNotes(contact.notes);
    setWhatsappOptIn(contact.whatsappOptIn);
    setShowModal(true);
  };

  const handleSubmit = (event: React.FormEvent) => {
    event.preventDefault();
    const payload = {
      name,
      phone,
      email: email || undefined,
      whatsappOptIn,
      patientId: editing?.patientId,
      tags: tags.split(",").map(tag => tag.trim()).filter(Boolean),
      notes,
      source: editing?.source || "manual" as const
    };

    if (editing) {
      onUpdateContact({
        ...editing,
        ...payload,
        normalizedPhone: normalizePhone(phone)
      });
    } else {
      onAddContact(payload);
    }

    setShowModal(false);
  };

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <span className="text-[10px] font-extrabold text-[#C17A63] uppercase tracking-widest block mb-1">
            WhatsApp & Relacionamento
          </span>
          <h1 className="text-3xl font-serif italic text-[#5A5A40] font-semibold">Contatos</h1>
          <p className="text-xs text-[#707060] mt-1">Lista operacional de telefones, leads e vínculos com fichas clínicas.</p>
        </div>
        <button onClick={openNew} className="self-start md:self-auto bg-[#5A5A40] hover:bg-[#484833] text-white font-semibold text-xs px-5 py-3 rounded-2xl flex items-center gap-2 shadow-md">
          <Plus className="w-4 h-4" />
          Novo Contato
        </button>
      </div>

      <div className="bg-white border border-[#E5E5E0] rounded-2xl p-4 shadow-sm flex items-center gap-3">
        <Search className="w-4 h-4 text-[#A0A090]" />
        <input
          type="text"
          placeholder="Buscar por nome, telefone ou e-mail..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="flex-1 bg-transparent border-0 outline-none placeholder-[#A0A090] text-xs"
        />
      </div>

      <div className="bg-white rounded-3xl border border-[#E5E5E0] shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-[#FBFBFA] border-b border-[#F0F0E8] text-[#707060] uppercase tracking-wider font-bold text-[10px]">
              <tr>
                <th className="px-6 py-4">Contato</th>
                <th className="px-6 py-4">WhatsApp</th>
                <th className="px-6 py-4">Tags</th>
                <th className="px-6 py-4">Ficha</th>
                <th className="px-6 py-4 text-right">Ações</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#F5F5F0]">
              {filtered.map(contact => {
                const matchedPatient = contact.patientId
                  ? patients.find(patient => patient.id === contact.patientId)
                  : patientsByPhone.get(contact.normalizedPhone);

                return (
                  <tr key={contact.id} className="hover:bg-[#FBFBFA]/70">
                    <td className="px-6 py-4">
                      <p className="font-bold text-sm text-[#1A1A1A]">{contact.name}</p>
                      <p className="text-[#707060]">{contact.email || "Sem e-mail"}</p>
                      {contact.notes && <p className="text-[10px] text-[#A0A090] mt-1 italic max-w-sm truncate">"{contact.notes}"</p>}
                    </td>
                    <td className="px-6 py-4">
                      <p className="font-mono font-bold text-[#5A5A40]">{contact.phone}</p>
                      <p className="text-[10px] text-[#707060] flex items-center gap-1 mt-1">
                        <MessageCircle className="w-3 h-3" />
                        {contact.whatsappOptIn ? "Pode receber mensagens" : "Não autorizado"}
                      </p>
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex flex-wrap gap-1">
                        {contact.tags.map(tag => (
                          <span key={tag} className="bg-[#F2F2E9] text-[#5A5A40] px-2 py-0.5 rounded-full text-[9px] font-bold uppercase">
                            {tag}
                          </span>
                        ))}
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      {matchedPatient ? (
                        <button onClick={() => onNavigate("pacientes")} className="inline-flex items-center gap-1.5 bg-green-50 text-green-800 border border-green-200 px-3 py-1 rounded-full text-[10px] font-bold">
                          <CheckCircle2 className="w-3 h-3" />
                          Tem ficha
                        </button>
                      ) : (
                        <span className="inline-flex items-center gap-1.5 bg-amber-50 text-amber-800 border border-amber-200 px-3 py-1 rounded-full text-[10px] font-bold">
                          Sem ficha
                        </span>
                      )}
                    </td>
                    <td className="px-6 py-4 text-right">
                      <button onClick={() => openEdit(contact)} className="px-3 py-2 text-[#5A5A40] hover:bg-[#F5F5F0] rounded-xl font-bold">Editar</button>
                      {!matchedPatient && (
                        <button onClick={() => onCreatePatientFromContact(contact)} className="ml-2 px-3 py-2 bg-[#5A5A40] text-white rounded-xl font-bold inline-flex items-center gap-1">
                          <UserPlus className="w-3 h-3" />
                          Criar ficha
                        </button>
                      )}
                      {matchedPatient && !contact.patientId && (
                        <button onClick={() => onUpdateContact({ ...contact, patientId: matchedPatient.id })} className="ml-2 px-3 py-2 bg-[#F2F2E9] text-[#5A5A40] rounded-xl font-bold inline-flex items-center gap-1">
                          <Link2 className="w-3 h-3" />
                          Vincular
                        </button>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {showModal && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl border border-[#E5E5E0] w-full max-w-lg p-8 shadow-2xl space-y-5">
            <div className="flex items-center justify-between border-b border-[#F5F5F0] pb-4">
              <h2 className="text-2xl font-serif italic text-[#5A5A40]">{editing ? "Editar Contato" : "Novo Contato"}</h2>
              <button onClick={() => setShowModal(false)} className="text-xs text-[#707060] font-bold">Fechar</button>
            </div>
            <form onSubmit={handleSubmit} className="space-y-4">
              <input value={name} onChange={(e) => setName(e.target.value)} placeholder="Nome" className="w-full bg-[#F5F5F0] border border-[#E5E5E0] rounded-2xl px-4 py-3 text-sm" required />
              <input value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="Telefone / WhatsApp" className="w-full bg-[#F5F5F0] border border-[#E5E5E0] rounded-2xl px-4 py-3 text-sm" required />
              <input value={email} onChange={(e) => setEmail(e.target.value)} placeholder="E-mail opcional" type="email" className="w-full bg-[#F5F5F0] border border-[#E5E5E0] rounded-2xl px-4 py-3 text-sm" />
              <input value={tags} onChange={(e) => setTags(e.target.value)} placeholder="Tags separadas por vírgula" className="w-full bg-[#F5F5F0] border border-[#E5E5E0] rounded-2xl px-4 py-3 text-sm" />
              <textarea value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="Observações" rows={3} className="w-full bg-[#F5F5F0] border border-[#E5E5E0] rounded-2xl px-4 py-3 text-sm" />
              <label className="flex items-center gap-2 text-xs font-bold text-[#5A5A40]">
                <input type="checkbox" checked={whatsappOptIn} onChange={(e) => setWhatsappOptIn(e.target.checked)} />
                Autorizado para mensagens no WhatsApp
              </label>
              <div className="flex justify-end gap-3 pt-3">
                <button type="button" onClick={() => setShowModal(false)} className="px-5 py-3 border border-[#D8D8C0] text-[#5A5A40] rounded-2xl text-xs font-bold">Cancelar</button>
                <button type="submit" className="px-6 py-3 bg-[#5A5A40] text-white rounded-2xl text-xs font-bold">Salvar</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

