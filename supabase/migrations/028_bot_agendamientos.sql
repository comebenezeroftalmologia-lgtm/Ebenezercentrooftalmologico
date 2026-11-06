-- 028 · Bitácora de agendamientos del bot de citas (María)
-- Cada intento de agendar queda registrado para la doble revisión del equipo
-- (también se copia a una hoja de Google). Solo el servidor (service role) escribe y lee.

create table if not exists public.bot_agendamientos (
  id                 bigserial primary key,
  created_at         timestamptz not null default now(),
  documento          text not null,
  nombre             text,
  celular            text,
  direccion          text,
  barrio             text,
  paciente_nuevo     boolean,
  fecha_cita         date,
  hora_cita          text,
  cod_medico         integer,
  resultado          text not null,
  motivo             text,
  datos_por_verificar text,
  detalle            jsonb,
  revisado_por       text,
  observaciones      text
);
create index if not exists bot_agendamientos_created_idx on public.bot_agendamientos (created_at desc);
create index if not exists bot_agendamientos_doc_idx on public.bot_agendamientos (documento);
alter table public.bot_agendamientos enable row level security;

select count(*) as filas from public.bot_agendamientos;
