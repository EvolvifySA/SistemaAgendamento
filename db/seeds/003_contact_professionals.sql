-- Backfill inicial da separacao de contatos por dentista.
-- O seed 002 preserva a lista global de contatos, mas perdeu a origem por agenda
-- de WhatsApp. Aqui inferimos a dentista somente quando existe agendamento
-- vinculado ao paciente.

insert into contact_professionals (
  "contactId", "professionalId", source, "createdAt", "updatedAt"
)
select distinct
  contacts.id,
  appointments_cache."professionalId",
  'agenda-inference',
  now()::text,
  now()::text
from contacts
join appointments_cache
  on appointments_cache."patientId" = contacts."patientId"
where contacts."patientId" is not null
  and appointments_cache."professionalId" is not null
on conflict ("contactId", "professionalId") do nothing;
