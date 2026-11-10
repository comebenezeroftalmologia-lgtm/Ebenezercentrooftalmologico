-- ============================================================================
-- Migración 032: causales de glosa según la Resolución 2284 de 2023
-- ============================================================================
-- Aditiva. Crea el catalogo de causales del Manual Unico de Devoluciones,
-- Glosas y Respuestas (Anexo Tecnico 3) y agrega cf_glosas.motivo_codigo.
--
-- QUE CAMBIA EN EL MODELO
--
-- Hasta ahora el motivo era texto libre: 165 redacciones distintas para 389
-- glosas. Asi no se puede medir por causal, que es justo lo que la EPS pide
-- y lo que permitiria saber por que nos glosan.
--
-- El texto NO se reemplaza: motivo_texto se conserva intacto y pasa a ser la
-- observacion del motivo. El codigo es un campo nuevo al lado.
--
-- EL MAPEO NO INVENTA
--
-- Solo se asigna codigo cuando el texto lo dice sin ambiguedad: porque ya
-- traia el codigo, o porque la redaccion es la del manual. 172 de 389.
-- Las otras 217 quedan en null, visibles, para que Facturacion las clasifique
-- desde la pantalla. Un codigo inventado es peor que un campo vacio: el vacio
-- se ve, el inventado no.
--
-- Caso tipico sin mapear: 'TARIFA MAYOR A LA PACTADA', 22 veces. Dice la
-- familia (TA) pero no de que servicio, y el manual exige el servicio.
-- ============================================================================

create table if not exists cf_causales (
  codigo text primary key,
  familia text not null,
  nombre text not null,
  activo boolean not null default true,
  created_at timestamptz not null default now()
);
alter table cf_causales enable row level security;
comment on table cf_causales is 'Manual Unico de Devoluciones, Glosas y Respuestas - Anexo Tecnico 3, Resolucion 2284 de 2023. Codigos de grupo.';
insert into cf_causales (codigo, familia, nombre) values
  ('DE16','Devoluciones','Persona corresponde a otro responsable de pago'),
  ('DE44','Devoluciones','El prestador que factura no hace parte de la red de la entidad responsable de pago'),
  ('DE50','Devoluciones','Factura ya pagada o en trámite'),
  ('DE56','Devoluciones','No radicación de soportes dentro de los 22 días hábiles'),
  ('FA01','Facturación','Estancia u observación de urgencias'),
  ('FA02','Facturación','Consultas, interconsultas y atenciones (visitas) domiciliarias'),
  ('FA03','Facturación','Honorarios profesionales en procedimientos'),
  ('FA05','Facturación','Derechos de sala'),
  ('FA06','Facturación','Dispositivos médicos'),
  ('FA07','Facturación','Medicamentos y APME'),
  ('FA08','Facturación','Apoyo diagnóstico'),
  ('FA13','Facturación','Factura incluye servicios de diferentes coberturas'),
  ('FA16','Facturación','Persona o servicio de otro responsable de pago al momento de la prestación'),
  ('FA19','Facturación','Error en descuento pactado'),
  ('FA20','Facturación','Pago compartido'),
  ('FA23','Facturación','Otros procedimientos no quirúrgicos'),
  ('FA27','Facturación','Servicio o tecnología ya facturado'),
  ('FA28','Facturación','Servicio o tecnología ya pagado al prestador'),
  ('FA38','Facturación','Traslado asistencial de pacientes'),
  ('FA51','Facturación','Servicio prestado por un prestador distinto al de la atención agrupada'),
  ('FA52','Facturación','Disminución de personas en modalidad de pago prospectiva'),
  ('FA57','Facturación','Apoyo terapéutico'),
  ('FA58','Facturación','Procedimientos quirúrgicos e intervencionistas'),
  ('FA59','Facturación','Transporte no asistencial ambulatorio de la persona'),
  ('TA01','Tarifas','Estancia u observación de urgencias'),
  ('TA02','Tarifas','Consultas, interconsultas y atenciones (visitas) domiciliarias'),
  ('TA03','Tarifas','Honorarios profesionales en procedimientos'),
  ('TA04','Tarifas','Honorarios de otro talento humano que interviene en la atención'),
  ('TA05','Tarifas','Derechos de sala'),
  ('TA06','Tarifas','Dispositivos médicos'),
  ('TA07','Tarifas','Medicamentos y APME'),
  ('TA08','Tarifas','Apoyo diagnóstico'),
  ('TA09','Tarifas','Atención agrupada'),
  ('TA23','Tarifas','Otros procedimientos no quirúrgicos'),
  ('TA29','Tarifas','Recargos no pactados'),
  ('TA38','Tarifas','Traslado asistencial de pacientes'),
  ('TA57','Tarifas','Apoyo terapéutico'),
  ('TA58','Tarifas','Procedimientos quirúrgicos e intervencionistas'),
  ('TA59','Tarifas','Transporte no asistencial ambulatorio de las personas'),
  ('SO01','Soportes','Estancia u observación de urgencias'),
  ('SO02','Soportes','Consultas, interconsultas y atenciones (visitas) domiciliarias'),
  ('SO03','Soportes','Honorarios profesionales en procedimientos'),
  ('SO04','Soportes','Honorarios otro talento humano que interviene en la atención'),
  ('SO06','Soportes','Dispositivos médicos'),
  ('SO07','Soportes','Medicamentos y APME'),
  ('SO08','Soportes','Apoyo diagnóstico'),
  ('SO21','Soportes','Número de autorización'),
  ('SO23','Soportes','Otros procedimientos no quirúrgicos'),
  ('SO34','Soportes','Resumen de atención, epicrisis u hoja de atención de urgencias'),
  ('SO36','Soportes','Copia de la factura expedida a la aseguradora del SOAT o la ADRES'),
  ('SO37','Soportes','Orden o prescripción facultativa del profesional tratante'),
  ('SO38','Soportes','Traslado asistencial de pacientes'),
  ('SO39','Soportes','Comprobante de recibido del usuario'),
  ('SO40','Soportes','Registro de anestesia'),
  ('SO41','Soportes','Descripción quirúrgica'),
  ('SO42','Soportes','Lista de precios'),
  ('SO47','Soportes','Faltan soportes de recobros a cargo de la ADRES o de la ARL'),
  ('SO48','Soportes','Evidencia del envío del trámite respectivo'),
  ('SO57','Soportes','Apoyo terapéutico'),
  ('SO58','Soportes','Procedimientos quirúrgicos e intervencionistas'),
  ('SO59','Soportes','Transporte no asistencial ambulatorio de las personas'),
  ('SO61','Soportes','Registro Individual de Prestaciones de Servicios de Salud (RIPS)'),
  ('AU01','Autorizaciones','Estancia'),
  ('AU02','Autorizaciones','Consultas, interconsultas y atenciones (visitas) domiciliarias'),
  ('AU03','Autorizaciones','Honorarios profesionales en procedimientos'),
  ('AU06','Autorizaciones','Dispositivos médicos'),
  ('AU07','Autorizaciones','Medicamentos y APME'),
  ('AU08','Autorizaciones','Apoyo diagnóstico'),
  ('AU21','Autorizaciones','Número de autorización'),
  ('AU23','Autorizaciones','Otros procedimientos no quirúrgicos'),
  ('AU38','Autorizaciones','Traslado asistencial de pacientes'),
  ('AU43','Autorizaciones','Orden o autorización vencida al momento de su dispensación'),
  ('AU57','Autorizaciones','Apoyo terapéutico'),
  ('AU58','Autorizaciones','Procedimientos quirúrgicos e intervencionistas'),
  ('AU59','Autorizaciones','Transporte no asistencial ambulatorio de las personas'),
  ('CO01','Cobertura','Estancia u observación de urgencias'),
  ('CO02','Cobertura','Consultas, interconsultas y atenciones (visitas) domiciliarias'),
  ('CO03','Cobertura','Honorarios profesionales en procedimientos'),
  ('CO04','Cobertura','Honorarios otro talento humano que interviene en la atención'),
  ('CO06','Cobertura','Dispositivos médicos'),
  ('CO07','Cobertura','Medicamentos y APME'),
  ('CO08','Cobertura','Apoyo diagnóstico'),
  ('CO23','Cobertura','Otros procedimientos no quirúrgicos'),
  ('CO38','Cobertura','Traslado asistencial de pacientes'),
  ('CO46','Cobertura','Cobertura sin agotar en la póliza del SOAT o la ADRES'),
  ('CO57','Cobertura','Apoyo terapéutico'),
  ('CO58','Cobertura','Procedimientos quirúrgicos e intervencionistas'),
  ('CO59','Cobertura','Transporte no asistencial ambulatorio de las personas'),
  ('CL01','Calidad','Estancia u observación de urgencias'),
  ('CL02','Calidad','Consultas, interconsultas y atenciones (visitas) domiciliarias'),
  ('CL03','Calidad','Honorarios profesionales en procedimientos'),
  ('CL06','Calidad','Dispositivos médicos'),
  ('CL07','Calidad','Medicamentos y APME'),
  ('CL08','Calidad','Apoyo diagnóstico'),
  ('CL23','Calidad','Otros procedimientos no quirúrgicos'),
  ('CL38','Calidad','Traslado asistencial de pacientes'),
  ('CL53','Calidad','Atención de urgencia'),
  ('CL57','Calidad','Apoyo terapéutico'),
  ('CL58','Calidad','Procedimientos quirúrgicos e intervencionistas'),
  ('CL59','Calidad','Transporte no asistencial ambulatorio de las personas'),
  ('SA54','Seguimiento a los acuerdos','Incumplimiento de indicadores de seguimiento'),
  ('SA55','Seguimiento a los acuerdos','Ajuste frente a la desviación de la nota técnica'),
  ('SA56','Seguimiento a los acuerdos','Incumplimiento de indicadores de calidad, gestión y resultados'),
  ('RE22','Respuestas','Respuesta a devolución y glosa extemporánea'),
  ('RE95','Respuestas','Glosa o devolución extemporánea'),
  ('RE96','Respuestas','Glosa o devolución injustificada'),
  ('RE97','Respuestas','Glosa o devolución totalmente aceptada'),
  ('RE98','Respuestas','Glosa parcialmente aceptada y subsanada parcialmente'),
  ('RE99','Respuestas','Glosa no aceptada y subsanada en su totalidad')
on conflict (codigo) do update set familia=excluded.familia, nombre=excluded.nombre;

alter table cf_glosas add column if not exists motivo_codigo text references cf_causales(codigo) on delete set null;
comment on column cf_glosas.motivo_codigo is 'Causal segun Resolucion 2284. null = sin clasificar todavia.';
comment on column cf_glosas.motivo_texto is 'Observacion del motivo: el texto tal como lo escribio Facturacion. No se reemplaza por el codigo, se conserva.';
create index if not exists idx_cf_glosas_motivo_codigo on cf_glosas(motivo_codigo);

-- Mapeo automatico: solo los textos que no dejan duda. El resto queda null.
update cf_glosas g set motivo_codigo=v.cod from (values
  ('La factura corresponde a una persona que pertenecía a otro responsable de pago en el momento de la atención','DE16'),
  ('Los cargos por atencion agrupada que vienen relacionados o justificados en los soportes de cobro presentan diferencias con los valores pactados','TA09'),
  ('Los cargos por otros procedimientos no quirúrgicos quevienen relacionados o justificados en los soportes de cobropresentan diferencias con los valores pactados o establecidos porla norma','TA23'),
  ('Glosa totalmente aceptada por el prestador','RE97'),
  ('SE LEGALIZA GLOSA MEDIANTE ACTA DE CONCILIACION MS-ACG-0000001361 CON RADICADO DE ALFANET 1486309','RE97'),
  ('Factura ya pagada o en trámite (Solicitar nueva autorizacion)','DE50'),
  ('El Prestador de Servicios de Salud que factura no hace parte de la red de la Entidad Responsable de Pago','DE44'),
  ('Persona corresponde a otro responsable de pago','DE16'),
  ('SE ACEPTA GLOSA, COPAGO MAL RECAUDADO','FA20'),
  ('COPAGO MAL RECAUDADO - ACEPTACION DE GLOSA, POR FALTA DE SOPORTES','FA20'),
  ('COPAGO MAL RECAUDADO - ACEPTACION DE GLOSA','FA20'),
  ('ERROR DE SISMA, NO SE DESCONTO UN COPAGO','FA20'),
  ('La consulta, interconsulta o atencion (visita) domiciliaria relacionada en los soportes de cobro no esta incluida en la respectiva cobertura','CO02'),
  ('El cargo por consulta, interconsulta o atencion (visita) domiciliaria que viene relacionado o justificado en los soportes de cobro, presenta diferencias con los valores pactados o establecidos por la norma','TA02'),
  ('Los recaudos efectivos de pagos compartidos o copagos y cuotas moderadoras, que por acuerdo de voluntades efectuo el prestador de servicios de salud o proveedor de tecnologias en salud, no corresponden a lo informado por la entidad responsable de pago para la liquidacion del pago compartido','FA20'),
  ('Pago compartido','FA20'),
  ('Los cargos por apoyo diagnostico que vienen relacionados o justificados en los soportes de cobro presentan diferencias con los valores pactados o establecidos por la norma','TA08'),
  ('Los cargos por procedimientos quirurgicos o intervencionistas que vienen relacionados o justificados en los soportes de cobro presentan diferencias con los valores pactados o establecidos por la norma','TA58'),
  ('Los cargos por derechos de sala que vienen relacionados o justificados en los soportes de cobro presentan diferencias con los valores pactados o establecidos por la norma','TA05'),
  ('DE5601-EL PRESTADOR DE LOS SERVICIOS DE SALUD O PROVEEDOR DE TECNOLOGIAS EN SALUD NO RADICA LOS SOPORTES DENTRO DE LOSVEINTIDOS (22)DIAS HABILES SIGUIENTES A LA FECHA DE EXPEDICIÓN DE LA FACTURA. CONFORME AL ARTICULO 5 DE LA RESOLUCIÓN 510 DE 2022 O LAQUE LA MODIFIQUE O SUSTITUYA.EN LA FACTURA DEBEN ESTAR RELACIONADOS TRES CAMPOS DE LA TRANSACCIÓN:VALOR BRUTO-DESCUENTOS(COPAGOS O MODERADORAS)=VALOR NETO Y SE EVIDENCIA DOBLE COBRO, LO CUAL ESTA GENERANDO ERROR.SE REALIZA DEVOLUCION DE LAFACTURA, DEBIDO A QUE LA CUENTA ESTA REFLEJANDO DOS VALORES DIFERENTES POR CUOTA MODERADORA Y COPAGO LO CUAL NO SE VE REFLEJADA EN LA DEDUCCION DEL VALOR NETO - ERROR DE SISMA','DE56'),
  ('SERVICIOS YA COBRADOS EN OTRO DOCUMENTO / FACTURA','DE50'),
  ('de5601a-el prestador de servicios de salud o proveedor de tecnologÃ-as en salud no radica los soportes dentro de los veintidÃ³s (22) dÃ-as hÃ¡biles posterior a la fecha del recibido del xml ( fecha de recepciÃ³n xml 31/3/2025 fecha de recibidos soportes 23/12/2025 (periodo facturado 03/2025) para facturar los servicios se debe generar nueva factura vigente','DE56'),
  ('El tiempo de radicación del documento excede los 22 días del ingreso de la Factura electrónica registrada en el sistema - REFACTURAR','DE56'),
  ('Radiciacion posterior a los 22 días habiles, se debe refactura','DE56'),
  ('POR SOLICITUD DE CLIENTE FACTURA SE ANULA Y REFACTURA PARA REALIZAR RADICACION, RADICACION ANTERIOR SE REALIZO POSTERIOR A LOS 22 DIAS','DE56'),
  ('POR SOLICITUD DE CLIENTE FACTURA SE ANULA Y REFACTURA PARA REALIZAR RADICACION, RADICACION ANTERIOR SE REALIZO POSTERIOR A LOS 22 DIAS - esta en gestion la autorización por parte de Colmedica KIT DE LENTES','DE56'),
  ('FACTURA RADICADA POSTERIOR A LOS 22 DIAS (NO SE SUBIERON TODOS LOS SOPORTES AL PORTAL)','DE56'),
  ('FACTURA RADICADA POSTERIOR A LOS 22 DIAS','DE56'),
  ('RADICACION POSTERIOR A LOS 22 DIAS','DE56'),
  ('refacturar por que cuota moderadora en el xml esta saliendo como copago','FA20'),
  ('La autorizacion relacionada en el RIPS se encuentre en estado 5-EN PROCESO DE AUDITORIA en la factura FCOE73557','SO61'),
  ('La autorizacion relacionada en el RIPS se encuentre en estado 5-EN PROCESO DE AUDITORIA en la factura FCOE75675','SO61'),
  ('La autorizacion relacionada en el RIPS se encuentre en estado 5-EN PROCESO DE AUDITORIA en la factura FCOE76102','SO61'),
  ('La autorizacion relacionada en el RIPS se encuentre en estado 5-EN PROCESO DE AUDITORIA en la factura FCOE76204','SO61'),
  ('La autorizacion relacionada en el RIPS se encuentre en estado 5-EN PROCESO DE AUDITORIA en la factura FCOE76481','SO61'),
  ('850-1. SERVICIOS YA CANCELADOS POR LA ENTIDAD RESPONSABLE DE PAGO : LA ORDEN 139610 - 3247600 SE ENCUENTRA ASOCIADA CON LA CUENTA MEDICA CON PRESTADOR NI-900042824 FACTURA: FCOE - 62225','DE50'),
  ('ERROR EN EL DESCUENTO DE COPAGO/CUOTA MODERADORA','FA20'),
  ('Realizando las validaciones se evidencia que efectivamente no hay soporte de radicación ante la entidad, solicito anular estas facturas para refacturar y poder radicar nuevamente.','DE56'),
  ('RADICADA CON ANTERIORIDAD - EN EL PORTAL ERRADO','DE50'),
  ('DEVUELTA POR ESTRUCTURA RIPS - CONTIENE UN PACIENTE DEL 2021 (ANTES DE LA RESOLUCION JSON)','SO61'),
  ('ERROR DE SISMA NO DESCONTO COPAGO','FA20'),
  ('TA2301. Los cargos por otros procedimientos no quirúrgicos que vienen relacionados o justificados en los soportes de cobro presentan diferencias con los valores pactados o establecidos por la norma','TA23'),
  ('SO6101. En el caso de que uno o varios campos de RIPS presente inconsistencias con la atención prestada','SO61'),
  ('TA0701. Los cargos por medicamentos o APME que vienen relacionados o justificados en los soportes de cobro, presentan diferencias con los valores pactados o establecidos por la norma','TA07')
) as v(txt,cod) where regexp_replace(btrim(coalesce(g.motivo_texto,'')),'\s+',' ','g')=v.txt and g.motivo_codigo is null;

select (select count(*) from cf_causales) causales, (select count(*) from cf_glosas where motivo_codigo is not null) clasificadas, (select count(*) from cf_glosas where motivo_codigo is null) sin_clasificar;