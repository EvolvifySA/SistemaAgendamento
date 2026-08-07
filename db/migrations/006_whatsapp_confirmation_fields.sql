alter table appointments_cache
  add column if not exists "confirmationStatus" text not null default 'pending',
  add column if not exists "confirmationAnswer" text,
  add column if not exists "confirmationAnsweredAt" text;
