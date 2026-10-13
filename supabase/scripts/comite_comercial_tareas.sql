-- Carga masiva (una sola vez): lista "Comité Comercial" + tareas del acta 08.10.2026.
--
-- Se pega y se ejecuta en Supabase → SQL Editor. Es seguro repetirlo: no duplica
-- la lista ni las tareas que ya existan con el mismo nombre.
--
--  · La lista se crea en el espacio llamado "Ebenezer…" (si no existe, lo crea).
--    Si ya tienes una lista "Comité Comercial", usa esa y solo agrega las tareas.
--  · Los responsables se asignan buscando el nombre de pila en app_users. "Juan"
--    es siempre el dueño del script (jmmondragonm@gmail.com). Si un nombre no
--    coincide con ningún usuario (o coincide con varios) no se asigna y el
--    aviso sale en la pestaña "Messages". El responsable del acta queda siempre
--    escrito en la descripción de la tarea.
--  · Requiere haber corrido antes 016_proyectos.sql.

do $$
declare
  v_owner    uuid;
  v_espacio  uuid;
  v_lista    uuid;
  v_tarea    uuid;
  v_nombre   text;
  v_resp     text[];
  v_nota     text;
  v_tok      text;
  v_uid      uuid;
  v_n        int;
  v_i        int := 0;
  v_texto    text;
  v_creadas  int := 0;
  v_omitidas int := 0;
  r record;
begin
  -- Dueño: tu usuario; si no existe, el primer admin.
  select id into v_owner from app_users where lower(email) = 'jmmondragonm@gmail.com' limit 1;
  if v_owner is null then
    select id into v_owner from app_users where is_admin order by created_at limit 1;
  end if;
  if v_owner is null then
    raise exception 'No encontré tu usuario en app_users. Entra una vez a la plataforma y vuelve a correr el script.';
  end if;

  -- Lista "Comité Comercial" existente (cualquier espacio)…
  select l.id, l.espacio_id into v_lista, v_espacio
  from proy_listas l
  where translate(lower(l.nombre), 'áéíóúü', 'aeiouu') like 'comite comercial%'
  order by l.created_at
  limit 1;

  -- …o la crea en el espacio "Ebenezer" (también lo crea si no existe).
  if v_lista is null then
    select id into v_espacio from proy_espacios
    where translate(lower(nombre), 'áéíóúü', 'aeiouu') like 'ebenezer%'
    order by created_at limit 1;

    if v_espacio is null then
      insert into proy_espacios (nombre, color, privado, orden, created_by)
      values ('Ebenezer', '#0F2FF3', true, extract(epoch from now()) * 1000, v_owner)
      returning id into v_espacio;
      raise notice 'Creé el espacio "Ebenezer" (privado). Compártelo con el equipo desde Proyectos → Compartir.';
    end if;

    insert into proy_listas (espacio_id, nombre, orden, created_by)
    values (v_espacio, 'Comité Comercial',
            coalesce((select max(orden) from proy_listas where espacio_id = v_espacio), 0) + 1000,
            v_owner)
    returning id into v_lista;
    raise notice 'Creé la lista "Comité Comercial".';
  else
    raise notice 'Usé la lista "Comité Comercial" que ya existía.';
  end if;

  for r in
    select * from (values
      ( 1, 'Entrega de Pagina Web con Fotos con IA',                                                                                                  array['Juan'],                       null),
      ( 2, 'Investigación Parrilla de Investigación',                                                                                                 array['Juan'],                       null),
      ( 3, 'Objetivos Estretgicos',                                                                                                                   array['Juan','Heydis'],              'Plazo indicado en el acta: Lunes.'),
      ( 4, 'ChatEbenezer IA - Base de Conocimientos',                                                                                                 array['Heydis'],                     null),
      ( 5, 'Key Visual',                                                                                                                              array['Juan'],                       null),
      ( 6, 'Dapta y Mutual - (Pendiente Zonaser y Sisma)',                                                                                            array['Juan'],                       null),
      ( 7, 'Tablero de Indicadores - Informe Contact y Tiempo de Espera por pasos Digiturno Sede 1',                                                  array['Pedro'],                      null),
      ( 8, 'Ajustar Flujo Mutual - Mensaje Amenazador',                                                                                               array['Juan','Felly'],               null),
      ( 9, 'Validar concepto Legal con Juridico de Ebenezer frente al contrato con medvision para desvincularse del contrato y si no se puede, que camino podemos tomar para cancelarlo.', array['Pedro'], null),
      (10, 'Liquidador de Honorarios, ajustarse al cronograma de facturación.',                                                                       array['Pedro'],                      null),
      (11, 'Mejoras del tablero: migrar glosario, productividad y frecuencia, ordenados vs. realizados por periodo.',                                 array['Pedro'],                      null),
      (12, 'Provedor Logistico de turismo - Paciente Internacional (Estucturar plan de turismo medico)',                                              array['Karina'],                     null),
      (13, 'Asistencia y Seguimiento - Cambiar Speech Comercial y bono de 1.000.000',                                                                 array['Juan'],                       null),
      (14, 'Informe de Gestion para hablar con Alfredo Ramirez',                                                                                      array['Felly'],                      null),
      (15, 'Eventos de Informe de Cifras para doctores',                                                                                              array['Karina','Javier'],            null),
      (16, 'Identificar con el Dr. Alfredro Ramirez cual es el entrenamiento que necesita sofia jacome para cumplir los estandares para Cx Refractiva - Cuales son las necesidades del servicio, en la valoración de optometría, ¿que necesita alfredo?', array['Felly'], null),
      (17, 'Hablar con Jennifer que es la Ingeniera Biomedica - Autofractómetro: pendiente cotización',                                               array['Felly'],                      null),
      (18, 'Que cuando se seleccione un ordenamiento se seleccione por contrato el cups internamiente mas rentable y sea homologable.',               array['Pedro','Erika','Juan'],       null),
      (19, 'Crear campaña de salud visual para los coelctivos de las prepagadas.',                                                                    array['Juan','Maria Cristiana'],     'Plazo indicado en el acta: Miércoles 3:00 pm.')
    ) as t(n, nombre, responsables, nota)
    order by n
  loop
    v_i := v_i + 1;
    v_nombre := r.nombre;
    v_resp := r.responsables;
    v_nota := r.nota;

    if exists (select 1 from proy_tareas where lista_id = v_lista and parent_id is null and nombre = v_nombre) then
      v_omitidas := v_omitidas + 1;
      continue;
    end if;

    v_texto := 'Responsable(s) según el acta del 08.10.2026: ' || array_to_string(v_resp, ', ') || '.';
    if v_nota is not null then
      v_texto := v_texto || ' ' || v_nota;
    end if;

    -- El estado se deja vacío: el trigger pone el primero de la lista (PENDIENTE).
    insert into proy_tareas (lista_id, nombre, descripcion, orden, created_by)
    values (
      v_lista, v_nombre,
      jsonb_build_object('type', 'doc', 'content', jsonb_build_array(
        jsonb_build_object('type', 'paragraph', 'content', jsonb_build_array(
          jsonb_build_object('type', 'text', 'text', v_texto))))),
      v_i * 1000,
      v_owner)
    returning id into v_tarea;
    v_creadas := v_creadas + 1;

    foreach v_tok in array v_resp loop
      if lower(v_tok) = 'juan' then
        v_uid := v_owner;
      else
        select count(*), min(id::text)::uuid into v_n, v_uid
        from app_users
        where activo
          and (translate(lower(nombre_completo), 'áéíóúü', 'aeiouu') || ' ')
              like translate(lower(v_tok), 'áéíóúü', 'aeiouu') || ' %';
        if v_n <> 1 then
          raise notice 'Sin asignar "%" en la tarea "%": % usuarios coinciden.', v_tok, left(v_nombre, 50), v_n;
          v_uid := null;
        end if;
      end if;

      if v_uid is not null then
        insert into proy_tarea_asignados (tarea_id, user_id) values (v_tarea, v_uid)
        on conflict do nothing;
      end if;
    end loop;
  end loop;

  raise notice 'Listo: % tareas creadas, % ya existían.', v_creadas, v_omitidas;
end $$;
