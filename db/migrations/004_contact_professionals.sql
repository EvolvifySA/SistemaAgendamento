create table if not exists contact_professionals (
  "contactId" text not null references contacts(id) on delete cascade,
  "professionalId" text not null references professionals(id) on delete cascade,
  source text not null default 'manual',
  "createdAt" text not null default now()::text,
  "updatedAt" text not null default now()::text,
  primary key ("contactId", "professionalId")
);

create index if not exists idx_contact_professionals_professional
  on contact_professionals ("professionalId");
