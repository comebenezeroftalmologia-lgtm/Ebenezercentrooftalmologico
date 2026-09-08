-- =========================================================
-- Migración 002: campos de reporting para los 4 módulos
-- =========================================================
-- 1) opportunities.contact_name: nombre del contacto asociado a la
--    oportunidad, para el drill-down (Nombre, Etapa, Servicio, Valor).
-- 2) opportunities.next_appointment_date: "Fecha de Próxima Cita"
--    (custom field de Clientify, solo pipeline Campañas), usada para
--    el cálculo de Tiempo Promedio de Cierre del módulo Generación
--    de Clientes Potenciales (en vez de closed_at).
-- 3) social_posts: contenido individual de Instagram (y otras redes
--    a futuro) con sus métricas, para el ranking Top 5 de contenidos.

alter table opportunities
  add column if not exists contact_name text,
  add column if not exists next_appointment_date date;

create index if not exists idx_opportunities_next_appt
  on opportunities(next_appointment_date);

create table if not exists social_posts (
  media_id text primary key,
  platform text not null,
  media_type text,
  caption text,
  permalink text,
  posted_at timestamptz,
  likes bigint default 0,
  comments bigint default 0,
  shares bigint default 0,
  saved bigint default 0,
  reach bigint default 0,
  views bigint,
  total_interactions bigint default 0,
  synced_at timestamptz not null default now()
);

create index if not exists idx_social_posts_platform on social_posts(platform);
create index if not exists idx_social_posts_posted_at on social_posts(posted_at);
create index if not exists idx_social_posts_interactions on social_posts(total_interactions desc);

alter table social_posts enable row level security;
