-- ---------------------------------------------------------------------
-- 029 · Módulo Clínico → Agenda y recordatorios de citas
--
--  · agenda_citas            espejo de la agenda de SISMA (próximos días)
--  · agenda_sincronizaciones bitácora de cada sincronización
--  · recordatorio_reglas     configuración de los recordatorios (parametrizable)
--  · recordatorio_envios     bitácora de cada llamada / WhatsApp
--
-- Estas tablas traen nombre, documento y celular de pacientes: RLS activada
-- y SIN políticas. Solo el servidor (service role) lee y escribe, después de
-- validar el permiso del módulo (clinico_agenda / clinico_recordatorios).
-- ---------------------------------------------------------------------

-- Permisos nuevos. El check de modulo_accesos es una lista cerrada: si el
-- slug no está aquí, la asignación falla en la base (ver 024_talento_humano).
alter table modulo_accesos drop constraint if exists modulo_accesos_modulo_check;
alter table modulo_accesos add constraint modulo_accesos_modulo_check
  check (modulo in (
    'leads', 'no_quirurgicos', 'quirurgicos', 'redes_sociales',
    'frecuencias', 'venta_del_dia', 'procesos', 'proyectos',
    'talento_humano', 'cartera',
    'clinico_agenda', 'clinico_recordatorios'
  ));

-- ---------------------------------------------------------------- agenda
create table if not exists public.agenda_citas (
  id_cita            bigint primary key,            -- idCita de SISMA
  fecha              date not null,
  hora               text,                          -- 'HH:mm'
  fecha_hora         timestamptz,                   -- fecha + hora en hora de Colombia
  estado             text,                          -- P (pendiente) / CC (confirmada)
  estado_descripcion text,
  asunto             text,
  id_sede            integer,
  paciente_autoid    bigint,
  tipo_id            text,
  num_id             text,
  paciente_nombre    text,
  contrato_nombre    text,
  celular            text,                          -- 10 dígitos, null si SISMA no lo tiene
  cod_medico         integer,
  medico_nombre      text,
  especialidad       text,
  vigente            boolean not null default true, -- false: salió de la agenda (cancelada, atendida o reagendada)
  vigente_hasta      timestamptz,
  crudo              jsonb,                         -- respuesta de SISMA tal cual, para auditar campos
  primera_vez_at     timestamptz not null default now(),
  sincronizada_at    timestamptz not null default now()
);
create index if not exists agenda_citas_fecha_idx on public.agenda_citas (fecha, hora);
create index if not exists agenda_citas_fecha_hora_idx on public.agenda_citas (fecha_hora) where vigente;
create index if not exists agenda_citas_medico_idx on public.agenda_citas (cod_medico, fecha);
create index if not exists agenda_citas_paciente_idx on public.agenda_citas (paciente_autoid);
alter table public.agenda_citas enable row level security;

create table if not exists public.agenda_sincronizaciones (
  id          bigserial primary key,
  iniciada_at timestamptz not null default now(),
  terminada_at timestamptz,
  origen      text not null default 'cron',         -- cron | manual
  dias        integer,
  citas       integer,
  nuevas      integer,
  retiradas   integer,
  sin_celular integer,
  ok          boolean,
  error       text
);
create index if not exists agenda_sync_iniciada_idx on public.agenda_sincronizaciones (iniciada_at desc);
alter table public.agenda_sincronizaciones enable row level security;

-- --------------------------------------------------------- recordatorios
create table if not exists public.recordatorio_reglas (
  id                  uuid primary key default gen_random_uuid(),
  nombre              text not null,
  activa              boolean not null default true,
  canal               text not null check (canal in ('llamada', 'whatsapp')),
  anticipacion_minutos integer not null check (anticipacion_minutos between 30 and 20160),
  -- Ventana en la que se permite enviar (hora de Colombia) y días de la semana (1 = lunes … 7 = domingo).
  ventana_desde       time not null default '07:00',
  ventana_hasta       time not null default '19:00',
  dias_semana         integer[] not null default '{1,2,3,4,5,6}',
  -- Filtros: null o vacío = todos.
  sedes               integer[],
  medicos             integer[],
  especialidades      text[],
  asuntos             text[],
  estados             text[] not null default '{P,CC}',
  -- Si el recordatorio ya "venció" por más de esto (ej. la cita se agendó tarde), no se envía.
  max_retraso_minutos integer not null default 720,
  -- No avisar cuando falta menos de esto para la cita.
  min_antelacion_minutos integer not null default 60,
  max_intentos        integer not null default 1 check (max_intentos between 1 and 5),
  reintento_minutos   integer not null default 120,
  plantilla           text not null default '',
  created_by          uuid references app_users(id) on delete set null,
  updated_by          uuid references app_users(id) on delete set null,
  created_at          timestamptz not null default now(),
  updated_at          timestamptz not null default now()
);
alter table public.recordatorio_reglas enable row level security;

create table if not exists public.recordatorio_envios (
  id             bigserial primary key,
  regla_id       uuid not null references recordatorio_reglas(id) on delete cascade,
  id_cita        bigint not null references agenda_citas(id_cita) on delete cascade,
  canal          text not null,
  intento        integer not null default 1,
  estado         text not null check (estado in ('enviando', 'enviado', 'fallido', 'omitido', 'simulado')),
  motivo         text,
  celular        text,
  programado_para timestamptz,
  mensaje        text,
  solicitud      jsonb,
  respuesta      jsonb,
  -- Lo que reporta Dapta al terminar (confirmó, canceló, no contestó…).
  resultado      text,
  resultado_at   timestamptz,
  resultado_detalle text,
  created_at     timestamptz not null default now(),
  enviado_at     timestamptz,
  unique (regla_id, id_cita, intento)
);
create index if not exists recordatorio_envios_cita_idx on public.recordatorio_envios (id_cita);
create index if not exists recordatorio_envios_created_idx on public.recordatorio_envios (created_at desc);
alter table public.recordatorio_envios enable row level security;

-- Reglas de partida (apagadas): el equipo las revisa y las activa desde la pantalla.
insert into public.recordatorio_reglas (nombre, activa, canal, anticipacion_minutos, plantilla)
select * from (values
  ('WhatsApp 48 horas antes', false, 'whatsapp', 2880,
   'Hola {primer_nombre}, le recordamos su cita en el Centro Oftalmológico Ebenezer el {fecha} a las {hora} con {medico}. Responda 1 para confirmar o 2 si necesita reprogramar.'),
  ('Llamada 24 horas antes', false, 'llamada', 1440,
   'Recordatorio de cita de {nombre} el {fecha} a las {hora} con {medico}.')
) as v(nombre, activa, canal, anticipacion_minutos, plantilla)
where not exists (select 1 from public.recordatorio_reglas);

select count(*) as reglas from public.recordatorio_reglas;
