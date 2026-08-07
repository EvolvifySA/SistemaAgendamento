alter table appointments_cache
  add column if not exists "cancellationReason" text,
  add column if not exists "cancelledAt" text,
  add column if not exists "cancelledByUserId" text;
