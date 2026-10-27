-- Migracion 020: modulo Ayuda (Centro de Conocimiento + Reporte de Fallas).
-- Todo se lee y escribe desde el servidor con la llave de servicio; las
-- tablas tienen RLS activado y SIN politicas, asi que nadie accede directo.

-- Permiso aparte para quien carga y publica documentos de conocimiento.
alter table app_users
  add column if not exists es_gestor_conocimiento boolean not null default false;

-- Opcional: la coordinadora de calidad como gestora (descomenta si aplica).
-- update app_users set es_gestor_conocimiento = true
--   where email = 'coord.calidad@ebenezeroftalmologia.com';

-- Quita tildes para que "configuracion" y "configuración" se encuentren entre si.
-- (translate es IMMUTABLE, asi que sirve en columnas generadas; no requiere extensiones.)
create or replace function f_unaccent(t text)
returns text
language sql
immutable
parallel safe
as $$ select translate(t, 'áéíóúüñÁÉÍÓÚÜÑ', 'aeiouunAEIOUUN') $$;

-- Documentos de la base de conocimiento -------------------------------
create table if not exists conocimiento_documentos (
  id uuid primary key default gen_random_uuid(),
  titulo text not null check (length(btrim(titulo)) > 0),
  descripcion text,
  proceso text,                          -- proceso o area al que pertenece
  codigo text,                           -- p. ej. COD-FT-012
  version text,                          -- p. ej. 3
  es_formato boolean not null default false,  -- formato descargable (plantilla)
  estado text not null default 'borrador'
    check (estado in ('borrador', 'publicado', 'obsoleto')),
  storage_path text not null,
  nombre_archivo text not null,
  mime text,
  tamano_bytes bigint,
  texto_extraido boolean not null default false,
  created_by uuid references app_users(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  publicado_at timestamptz
);

create index if not exists conocimiento_documentos_estado_idx on conocimiento_documentos (estado);
create index if not exists conocimiento_documentos_codigo_idx on conocimiento_documentos (codigo);

-- Fragmentos de texto (lo que se busca y se entrega a la IA) ----------
create table if not exists conocimiento_fragmentos (
  id uuid primary key default gen_random_uuid(),
  documento_id uuid not null references conocimiento_documentos(id) on delete cascade,
  orden int not null,
  texto text not null,
  tsv tsvector generated always as (to_tsvector('spanish', f_unaccent(texto))) stored
);

create index if not exists conocimiento_fragmentos_documento_idx on conocimiento_fragmentos (documento_id, orden);
create index if not exists conocimiento_fragmentos_tsv_idx on conocimiento_fragmentos using gin (tsv);

-- Busqueda: solo documentos PUBLICADOS. Cualquier palabra de la pregunta
-- suma (OR), ordenado por relevancia; ademas el titulo/codigo/descripcion
-- del documento cuentan como contexto.
create or replace function buscar_conocimiento(q text, n int default 8)
returns table (
  fragmento_id uuid,
  documento_id uuid,
  titulo text,
  codigo text,
  version text,
  es_formato boolean,
  texto text,
  rank real
)
language plpgsql
stable
as $$
declare
  tsq tsquery;
  plano text;
begin
  plano := plainto_tsquery('spanish', f_unaccent(q))::text;
  if plano is null or plano = '' then
    return;
  end if;
  tsq := replace(plano, '&', '|')::tsquery;

  return query
  select f.id, d.id, d.titulo, d.codigo, d.version, d.es_formato, f.texto,
         ts_rank(f.tsv, tsq) as rank
  from conocimiento_fragmentos f
  join conocimiento_documentos d on d.id = f.documento_id
  where d.estado = 'publicado' and f.tsv @@ tsq
  order by rank desc, f.orden asc
  limit n;
end;
$$;

-- Registro de consultas a la IA: limite por usuario y reporte de preguntas
-- sin respuesta (para que Calidad sepa que documentar).
create table if not exists ayuda_consultas (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references app_users(id) on delete cascade,
  pregunta text not null,
  respondida boolean not null default false,
  n_fragmentos int not null default 0,
  uso_ia boolean not null default false,
  created_at timestamptz not null default now()
);
create index if not exists ayuda_consultas_user_idx on ayuda_consultas (user_id, created_at desc);
create index if not exists ayuda_consultas_sin_respuesta_idx on ayuda_consultas (respondida, created_at desc);

-- Reporte de fallas ---------------------------------------------------
create table if not exists fallas_reportes (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references app_users(id) on delete cascade,
  titulo text not null check (length(btrim(titulo)) > 0),
  descripcion text not null check (length(btrim(descripcion)) > 0),
  modulo text,
  gravedad text not null default 'media' check (gravedad in ('baja', 'media', 'alta')),
  estado text not null default 'nuevo'
    check (estado in ('nuevo', 'en_revision', 'resuelto', 'descartado')),
  nota_desarrollador text,
  created_at timestamptz not null default now(),
  resuelto_at timestamptz
);
create index if not exists fallas_reportes_estado_idx on fallas_reportes (estado, created_at desc);
create index if not exists fallas_reportes_user_idx on fallas_reportes (user_id, created_at desc);

alter table conocimiento_documentos enable row level security;
alter table conocimiento_fragmentos enable row level security;
alter table ayuda_consultas enable row level security;
alter table fallas_reportes enable row level security;

-- Bucket privado para los archivos originales (se entregan con URL firmada).
insert into storage.buckets (id, name, public)
values ('conocimiento', 'conocimiento', false)
on conflict (id) do nothing;
