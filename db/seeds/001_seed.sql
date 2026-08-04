insert into users (id, name, email, role, active, "needsPasswordChange") values
  ('usr-1', 'Dra. Márcia', 'marciaodonto@yahoo.com.br', 'Doutora', true, true),
  ('usr-2', 'Lucas Vinícius (Admin)', 'admin@franciscaemarcia.com.br', 'Administrador', true, false),
  ('usr-3', 'Roberta Fernandes', 'recepcao@franciscaemarcia.com.br', 'Recepção', true, false),
  ('usr-4', 'Dra. Francisca', 'fran_ramalho@yahoo.com.br', 'Doutora', true, true)
on conflict (id) do nothing;

insert into professionals (
  id, name, specialty, phone, email, color, active,
  "workingHoursStart", "workingHoursEnd", "workingDays", "defaultDuration",
  notes, "calUsername", "calEventTypeId", "calAccountType", timezone, "calConnected"
) values
  (
    'prof-1', 'Dra. Márcia', 'Dentista', '+55 83 9364-7272', 'marciaodonto@yahoo.com.br',
    '#5A5A40', true, '08:00', '18:00', '[1,2,3,4,5]', 30,
    'Sócia-fundadora do consultório.', 'evolvify/30min', 5908980, 'team', 'America/Sao_Paulo', false
  ),
  (
    'prof-2', 'Dra. Francisca', 'Dentista', '+55 83 9987-0035', 'fran_ramalho@yahoo.com.br',
    '#C17A63', true, '09:00', '17:00', '[1,2,3,4,5]', 45,
    'Sócia-fundadora do consultório.', null, null, 'team', 'America/Sao_Paulo', false
  )
on conflict (id) do nothing;

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

update professionals
set
  "calEventTypeId" = 6546777,
  "calAccountType" = 'individual',
  "calApiKeyEnvVar" = 'CAL_API_KEY_MARCIA',
  "calUsername" = 'dramarciaodonto/30min',
  "calUserId" = 3074022,
  "calConnected" = true
where id = 'prof-1';

update professionals
set
  "calEventTypeId" = 6531418,
  "calAccountType" = 'individual',
  "calApiKeyEnvVar" = 'CAL_API_KEY_FRANCISCA',
  "calUsername" = 'drafrancisc/30min',
  "calUserId" = 3069015,
  "calConnected" = true
where id = 'prof-2';

insert into clinic_settings (
  id, "workingHoursStart", "workingHoursEnd", "workingDays", "defaultDuration", "gapDuration",
  "appointmentTypes", "clinicName", "clinicPhone", "clinicEmail", "clinicAddress", timezone, "calAccountType"
) values (
  'default', '08:00', '18:00', '[1,2,3,4,5]', 30, 15,
  '["Primeira Consulta","Retorno","Exame","Acompanhamento"]',
  'Francisca e Márcia Consultório Odontológico LTDA',
  '+55 83 9364-7272',
  'marciaodonto@yahoo.com.br',
  'Alameda das Flores, 450 - Sala 12 - Jardim Paulistano, São Paulo - SP',
  'America/Sao_Paulo',
  'individual'
)
on conflict (id) do nothing;

insert into patients (
  id, name, phone, "normalizedPhone", birthdate, cpf, email, address,
  "importantNotes", "quickNotes", "absencesCount", "lastAppointmentDate", history
) values
  (
    'pat-1', 'Maria das Dores Silva', '(11) 98765-4321', '5511987654321',
    '1964-08-12', '123.456.789-00', 'maria.silva@email.com',
    '{"cep":"01310-100","street":"Avenida Paulista","number":"1000","neighborhood":"Bela Vista","city":"São Paulo","state":"SP"}',
    'Diabética e Hipertensa. Alérgica a Dipirona.',
    'Prefere atendimento no primeiro horário da manhã.',
    0, null, '[]'
  )
on conflict (id) do nothing;

insert into contacts (
  id, name, phone, "normalizedPhone", email, "whatsappOptIn", "patientId",
  tags, notes, source, "createdAt", "updatedAt"
) values
  (
    'ctc-1', 'Maria das Dores Silva', '(11) 98765-4321', '5511987654321',
    'maria.silva@email.com', true, 'pat-1',
    '["paciente","whatsapp"]', 'Contato vinculado automaticamente pela ficha do paciente.',
    'manual', now()::text, now()::text
  )
on conflict (id) do nothing;
