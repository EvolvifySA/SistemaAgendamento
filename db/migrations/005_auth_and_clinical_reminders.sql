alter table users
  add column if not exists "passwordHash" text,
  add column if not exists "passwordUpdatedAt" text;

create table if not exists clinical_reminders (
  id text primary key,
  title text not null,
  description text not null default '',
  priority text not null default 'Media',
  status text not null default 'Aberto',
  "dueDate" text,
  "dueTime" text,
  "patientId" text references patients(id) on delete set null,
  "professionalId" text references professionals(id) on delete set null,
  "createdBy" text references users(id) on delete set null,
  "createdAt" text not null,
  "updatedAt" text not null,
  "completedAt" text
);
