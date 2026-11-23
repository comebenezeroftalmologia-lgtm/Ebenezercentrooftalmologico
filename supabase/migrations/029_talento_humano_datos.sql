-- ---------------------------------------------------------------------
-- 029 · Talento Humano: los datos se ingresan en la plataforma
--
-- SOLO CREA. Ni un drop, ni un delete, ni un alter sobre nada existente.
--
-- POR QUE EXISTE
--
-- Hasta hoy el tablero de Talento Humano leia un Excel ("NUEVA BASE.xlsx")
-- que alguien tenia que mantener y volver a subir. Decision de Faber:
-- los datos se meten y se editan AQUI; el Excel deja de ser la fuente.
--
-- Son ocho tablas, una por cada hoja que de verdad se diligencia:
--   th_areas          · los 20 procesos de la clinica (catalogo)
--   th_empleados      · la planta (114 personas)
--   th_retiros        · quien se fue, cuando y por que
--   th_ausentismos    · incapacidades por persona y fechas
--   th_incapacidades  · el cobro de esas incapacidades a la EPS
--   th_accidentes     · accidentalidad mes a mes
--   th_cursos         · BLS, violencia sexual y poliza, con vencimiento
--   th_capacitaciones · el plan anual y su ejecucion
--
-- CLIMA y EVALUACION DE DESEMPENO NO entran aqui a proposito: llegan de
-- fuera ya consolidadas (un promedio y un porcentaje), no se diligencian
-- persona por persona. Esas siguen por archivo.
-- CUMPLEANOS tampoco: sale de la fecha de nacimiento de cada empleado.
--
-- SOBRE LO QUE GUARDA
-- Aqui hay nombres, cedulas, salarios, cuentas, diagnosticos y contactos
-- de emergencia. Por eso:
--   · RLS prendida y politica que NIEGA el acceso directo por la API
--     publica de Supabase. Todo entra por rutas del servidor que primero
--     validan el modulo "talento_humano", que se asigna persona por
--     persona.
--   · cada tabla deja rastro de quien la toco y cuando.
-- ---------------------------------------------------------------------

-- 1 · AREAS (procesos) ------------------------------------------------
create table if not exists th_areas (
  id          bigserial primary key,
  nombre      text        not null unique,
  activa      boolean     not null default true,
  creado_at   timestamptz not null default now()
);

comment on table th_areas is
  'Procesos/areas de la clinica. Catalogo: los empleados apuntan aqui.';

-- 2 · EMPLEADOS --------------------------------------------------------
create table if not exists th_empleados (
  id                      bigserial primary key,
  area_id                 bigint      references th_areas(id) on delete set null,
  cargo                   text,
  sede                    text,
  nombre_completo         text        not null,
  num_documento           text        not null unique,
  fecha_nacimiento        date,
  sexo                    text,
  estado_civil            text,
  tiene_hijos             boolean,
  num_hijos               smallint,
  direccion               text,
  telefono                text,
  grado_estudio           text,
  profesion               text,
  email                   text,
  tipo_contrato           text,
  fecha_ingreso           date,
  salario                 bigint,
  auxilio_vivienda        bigint,
  -- TOTAL SALARIO no se guarda: en el Excel era una columna aparte que
  -- podia quedar desfasada de salario + auxilio. Aqui se calcula al
  -- mostrarlo, asi nunca hay dos verdades para la misma cifra.
  banco_cuenta            text,
  fondo_pension           text,
  fondo_cesantias         text,
  eps                     text,
  medio_transporte        text,
  tiempo_llegada          text,
  plan_complementario     boolean,
  valor_plan              bigint,
  contacto_emergencia     text,
  telefono_emergencia     text,
  parentesco_emergencia   text,
  activo                  boolean     not null default true,
  creado_at               timestamptz not null default now(),
  actualizado_at          timestamptz not null default now(),
  actualizado_por         uuid        references app_users(id) on delete set null
);

create index if not exists idx_th_empleados_area on th_empleados (area_id);
create index if not exists idx_th_empleados_activo on th_empleados (activo);

comment on column th_empleados.num_documento is
  'Unico: es la llave con la que cuadran retiros, ausentismos y cursos.';

-- 3 · RETIROS ----------------------------------------------------------
create table if not exists th_retiros (
  id              bigserial primary key,
  empleado_id     bigint      references th_empleados(id) on delete set null,
  -- Se guarda tambien el documento y el nombre porque hay retiros de
  -- gente que ya no esta en la planta: si el empleado se borra, el
  -- retiro tiene que seguir contando en las estadisticas del ano.
  num_documento   text        not null,
  nombre_completo text        not null,
  cargo           text,
  fecha_retiro    date        not null,
  motivo          text,
  creado_at       timestamptz not null default now(),
  actualizado_por uuid        references app_users(id) on delete set null
);

create index if not exists idx_th_retiros_fecha on th_retiros (fecha_retiro);

-- 4 · AUSENTISMOS ------------------------------------------------------
create table if not exists th_ausentismos (
  id              bigserial primary key,
  empleado_id     bigint      references th_empleados(id) on delete set null,
  num_documento   text        not null,
  nombre_completo text        not null,
  area            text,
  fecha_inicio    date        not null,
  fecha_fin       date,
  -- NUMERO DE DIAS venia escrito a mano en el Excel y podia no cuadrar
  -- con las fechas. Se guarda igual porque a veces el dato oficial de la
  -- EPS no es la resta exacta, pero la pantalla avisa cuando difieren.
  numero_dias     smallint,
  motivo          text,
  eps             text,
  creado_at       timestamptz not null default now(),
  actualizado_por uuid        references app_users(id) on delete set null
);

create index if not exists idx_th_ausent_fecha on th_ausentismos (fecha_inicio);
create index if not exists idx_th_ausent_doc on th_ausentismos (num_documento);

-- 5 · INCAPACIDADES (el cobro a la EPS) --------------------------------
create table if not exists th_incapacidades (
  id               bigserial primary key,
  empleado_id      bigint      references th_empleados(id) on delete set null,
  num_documento    text        not null,
  nombre_completo  text        not null,
  fondo_salud      text,
  tipo_incapacidad text,
  numero_dias      smallint,
  fecha_inicio     date,
  fecha_fin        date,
  radicado         text,
  valor            bigint,
  estado           text,
  fecha_pago       date,
  comentario       text,
  creado_at        timestamptz not null default now(),
  actualizado_por  uuid        references app_users(id) on delete set null
);

create index if not exists idx_th_incap_estado on th_incapacidades (estado);

-- 6 · ACCIDENTES -------------------------------------------------------
create table if not exists th_accidentes (
  id                  bigserial primary key,
  anio                smallint    not null,
  mes                 smallint    not null check (mes between 1 and 12),
  hubo_accidente      boolean     not null default false,
  num_accidentes      smallint    not null default 0,
  tipo_accidente      text,
  area                text,
  dias_incapacidad    smallint    not null default 0,
  observaciones       text,
  creado_at           timestamptz not null default now(),
  actualizado_por     uuid        references app_users(id) on delete set null,
  unique (anio, mes)
);

-- 7 · CURSOS Y POLIZA --------------------------------------------------
create table if not exists th_cursos (
  id                bigserial primary key,
  empleado_id       bigint      references th_empleados(id) on delete set null,
  num_documento     text        not null,
  nombre_completo   text        not null,
  cargo             text,
  tipo_contrato     text,
  -- Son fechas de VENCIMIENTO, no de realizacion. La pantalla las pinta
  -- en rojo cuando faltan menos de 60 dias.
  vence_bls         date,
  vence_violencia   date,
  vence_poliza      date,
  creado_at         timestamptz not null default now(),
  actualizado_por   uuid        references app_users(id) on delete set null,
  unique (num_documento)
);

-- 8 · CAPACITACIONES ---------------------------------------------------
create table if not exists th_capacitaciones (
  id                  bigserial primary key,
  nombre              text        not null,
  publico_objetivo    text,
  responsable         text,
  facilitador         text,
  mes_programado      text,
  fecha_programada    date,
  fecha_ejecutada     date,
  estado              text,
  se_realizo          boolean,
  numero_asistentes   smallint,
  creado_at           timestamptz not null default now(),
  actualizado_por     uuid        references app_users(id) on delete set null
);

-- ---------------------------------------------------------------------
-- CERROJO: nadie entra por la API publica.
-- Todo pasa por rutas del servidor que validan el modulo primero.
-- ---------------------------------------------------------------------
do $$
declare t text;
begin
  foreach t in array array[
    'th_areas','th_empleados','th_retiros','th_ausentismos',
    'th_incapacidades','th_accidentes','th_cursos','th_capacitaciones'
  ] loop
    execute format('alter table %I enable row level security', t);
    if not exists (
      select 1 from pg_policies
      where schemaname = 'public' and tablename = t
        and policyname = t || '_sin_acceso_directo'
    ) then
      execute format(
        'create policy %I on %I for select using (false)',
        t || '_sin_acceso_directo', t);
    end if;
  end loop;
end $$;
