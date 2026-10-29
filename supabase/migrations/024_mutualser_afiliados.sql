-- 024 · Afiliados activos de MutualSer (base que valida el bot de citas)
-- Fuente: consolidado de los TXT de MutualSer (corte 2026-10-05, 42.517 registros).
-- Solo guarda lo mínimo para validar derecho a la atención: NO guarda dirección ni correo.
-- Acceso solo con la llave de servicio (RLS activo y sin políticas: nadie con sesión de usuario la lee).

create table if not exists public.mutualser_afiliados (
  doc_beneficiario   text primary key,
  tipo_doc           text,
  primer_nombre      text,
  segundo_nombre     text,
  primer_apellido    text,
  segundo_apellido   text,
  fecha_nacimiento   date,
  sexo               text,
  regimen            text,                 -- Contributivo | Subsidiado
  estado             text,                 -- AC = activo
  cod_departamento   text,                 -- DANE, departamento de AFILIACIÓN (columnas DNP del archivo)
  cod_municipio      text,                 -- DANE, municipio de AFILIACIÓN: es el que decide la cobertura
  municipio_afiliacion text,               -- nombre, solo para los 11 municipios que atiende Ebenezer
  cod_departamento_atencion text,
  cod_municipio_atencion    text,
  celular            text,
  fecha_corte        date not null,
  cargado_at         timestamptz not null default now()
);

alter table public.mutualser_afiliados enable row level security;

create index if not exists mutualser_afiliados_estado_idx on public.mutualser_afiliados (estado);

-- Bitácora de consultas del bot (quién preguntó, cuándo, qué canal, si estaba activo).
create table if not exists public.mutualser_validaciones (
  id           bigserial primary key,
  documento    text not null,
  encontrado   boolean not null,
  activo       boolean,
  canal        text,
  created_at   timestamptz not null default now()
);

alter table public.mutualser_validaciones enable row level security;
create index if not exists mutualser_validaciones_created_idx on public.mutualser_validaciones (created_at desc);

select count(*) as afiliados_cargados from public.mutualser_afiliados;
