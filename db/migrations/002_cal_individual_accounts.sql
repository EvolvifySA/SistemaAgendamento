alter table professionals add column if not exists "calApiKeyEnvVar" text;

update professionals
set
  "calAccountType" = 'individual',
  "calApiKeyEnvVar" = coalesce("calApiKeyEnvVar", 'CAL_API_KEY_MARCIA')
where id = 'prof-1';

update professionals
set
  "calAccountType" = 'individual',
  "calApiKeyEnvVar" = coalesce("calApiKeyEnvVar", 'CAL_API_KEY_FRANCISCA')
where id = 'prof-2';

update clinic_settings
set "calAccountType" = 'individual'
where id = 'default';
