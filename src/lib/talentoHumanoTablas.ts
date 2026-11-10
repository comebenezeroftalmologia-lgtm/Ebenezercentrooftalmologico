/* ---------------------------------------------------------------------
   LAS OCHO TABLAS DE TALENTO HUMANO, DESCRITAS UNA SOLA VEZ
   Escrito el 08-11-2026.

   Esta es la unica descripcion de que se puede guardar y de que tipo es
   cada cosa. La usan las tres partes:
     · la ruta del servidor, para saber que columnas acepta
     · el formulario, para saber que campos pintar
     · la lista, para saber que columnas mostrar

   Esta aqui y no repartida por ahi a proposito. Si manana se agrega un
   campo, se agrega en UN sitio y aparece en los tres. La alternativa
   -- una lista de columnas en la ruta y otra en el formulario -- se
   desincroniza el dia que alguien toque solo una, y entonces el
   formulario pide algo que el servidor tira a la basura sin avisar.

   REGLA DE SEGURIDAD: la ruta solo escribe en tablas que esten en este
   archivo y solo en las columnas que aqui aparezcan. Lo que llegue de
   mas se ignora. Asi un campo inventado en el navegador no puede tocar
   una columna que no deba.
   --------------------------------------------------------------------- */

export type TipoCampo = "texto" | "textarea" | "numero" | "dinero" | "fecha" | "siNo" | "area";

export type Campo = {
  col: string;
  etiqueta: string;
  tipo: TipoCampo;
  obligatorio?: boolean;
  /** Se ve en la lista (si no, solo en el formulario). */
  enLista?: boolean;
  ayuda?: string;
};

export type TablaTH = {
  slug: string;
  tabla: string;
  titulo: string;
  singular: string;
  descripcion: string;
  /** Por donde se ordena al listar. */
  orden: { col: string; asc: boolean };
  campos: Campo[];
};

export const TABLAS_TH: TablaTH[] = [
  {
    slug: "empleados",
    tabla: "th_empleados",
    titulo: "Empleados",
    singular: "empleado",
    descripcion: "La planta. El resto de las tablas se cuelga de aqui por el numero de documento.",
    orden: { col: "nombre_completo", asc: true },
    campos: [
      { col: "nombre_completo", etiqueta: "Nombre completo", tipo: "texto", obligatorio: true, enLista: true },
      { col: "num_documento", etiqueta: "Documento", tipo: "texto", obligatorio: true, enLista: true,
        ayuda: "Es la llave: con este numero cuadran retiros, ausentismos y cursos. No se puede repetir." },
      { col: "area_id", etiqueta: "Área / proceso", tipo: "area", enLista: true },
      { col: "cargo", etiqueta: "Cargo", tipo: "texto", enLista: true },
      { col: "sede", etiqueta: "Sede", tipo: "texto", enLista: true },
      { col: "tipo_contrato", etiqueta: "Tipo de contrato", tipo: "texto", enLista: true },
      { col: "fecha_ingreso", etiqueta: "Fecha de ingreso", tipo: "fecha", enLista: true },
      { col: "salario", etiqueta: "Salario", tipo: "dinero", enLista: true },
      { col: "auxilio_vivienda", etiqueta: "Auxilio de vivienda", tipo: "dinero", enLista: true,
        ayuda: "El TOTAL no se guarda: se calcula sumando estos dos, para que nunca haya dos cifras distintas." },
      { col: "fecha_nacimiento", etiqueta: "Fecha de nacimiento", tipo: "fecha" },
      { col: "sexo", etiqueta: "Sexo", tipo: "texto" },
      { col: "estado_civil", etiqueta: "Estado civil", tipo: "texto" },
      { col: "tiene_hijos", etiqueta: "Tiene hijos", tipo: "siNo" },
      { col: "num_hijos", etiqueta: "Cuántos hijos", tipo: "numero" },
      { col: "direccion", etiqueta: "Dirección", tipo: "texto" },
      { col: "telefono", etiqueta: "Teléfono", tipo: "texto" },
      { col: "email", etiqueta: "Correo", tipo: "texto" },
      { col: "grado_estudio", etiqueta: "Grado de estudio", tipo: "texto" },
      { col: "profesion", etiqueta: "Profesión", tipo: "texto" },
      { col: "banco_cuenta", etiqueta: "Banco", tipo: "texto" },
      { col: "fondo_pension", etiqueta: "Fondo de pensión", tipo: "texto" },
      { col: "fondo_cesantias", etiqueta: "Fondo de cesantías", tipo: "texto" },
      { col: "eps", etiqueta: "EPS", tipo: "texto" },
      { col: "medio_transporte", etiqueta: "Medio de transporte", tipo: "texto" },
      { col: "tiempo_llegada", etiqueta: "Tiempo en llegar", tipo: "texto" },
      { col: "plan_complementario", etiqueta: "Plan complementario", tipo: "siNo" },
      { col: "valor_plan", etiqueta: "Valor del plan", tipo: "dinero" },
      { col: "contacto_emergencia", etiqueta: "Contacto de emergencia", tipo: "texto" },
      { col: "telefono_emergencia", etiqueta: "Teléfono de emergencia", tipo: "texto" },
      { col: "parentesco_emergencia", etiqueta: "Parentesco", tipo: "texto" },
      { col: "activo", etiqueta: "Activo", tipo: "siNo", enLista: true,
        ayuda: "Se apaga solo cuando se registra el retiro." },
    ],
  },
  {
    slug: "retiros",
    tabla: "th_retiros",
    titulo: "Retiros",
    singular: "retiro",
    descripcion: "Quien se fue, cuando y por que. Al guardarlo, el empleado queda inactivo.",
    orden: { col: "fecha_retiro", asc: false },
    campos: [
      { col: "nombre_completo", etiqueta: "Nombre completo", tipo: "texto", obligatorio: true, enLista: true },
      { col: "num_documento", etiqueta: "Documento", tipo: "texto", obligatorio: true, enLista: true },
      { col: "cargo", etiqueta: "Cargo", tipo: "texto", enLista: true },
      { col: "fecha_retiro", etiqueta: "Fecha de retiro", tipo: "fecha", obligatorio: true, enLista: true },
      { col: "motivo", etiqueta: "Motivo", tipo: "texto", enLista: true },
    ],
  },
  {
    slug: "ausentismos",
    tabla: "th_ausentismos",
    titulo: "Ausentismos",
    singular: "ausentismo",
    descripcion: "La incapacidad tal como la vive la clinica: quien falto, cuantos dias y por que.",
    orden: { col: "fecha_inicio", asc: false },
    campos: [
      { col: "nombre_completo", etiqueta: "Nombre completo", tipo: "texto", obligatorio: true, enLista: true },
      { col: "num_documento", etiqueta: "Documento", tipo: "texto", obligatorio: true, enLista: true },
      { col: "area", etiqueta: "Área", tipo: "texto", enLista: true },
      { col: "fecha_inicio", etiqueta: "Fecha de inicio", tipo: "fecha", obligatorio: true, enLista: true },
      { col: "fecha_fin", etiqueta: "Fecha de fin", tipo: "fecha", enLista: true },
      { col: "numero_dias", etiqueta: "Número de días", tipo: "numero", enLista: true,
        ayuda: "Si no cuadra con las fechas, la lista lo marca. A veces la EPS cuenta distinto; por eso se guarda tal cual." },
      { col: "motivo", etiqueta: "Motivo", tipo: "texto", enLista: true },
      { col: "eps", etiqueta: "EPS", tipo: "texto", enLista: true },
    ],
  },
  {
    slug: "incapacidades",
    tabla: "th_incapacidades",
    titulo: "Incapacidades (cobro)",
    singular: "incapacidad",
    descripcion: "El cobro de esas incapacidades a la EPS: radicado, valor, estado y pago.",
    orden: { col: "fecha_inicio", asc: false },
    campos: [
      { col: "nombre_completo", etiqueta: "Nombre completo", tipo: "texto", obligatorio: true, enLista: true },
      { col: "num_documento", etiqueta: "Documento", tipo: "texto", obligatorio: true, enLista: true },
      { col: "fondo_salud", etiqueta: "Fondo de salud", tipo: "texto", enLista: true },
      { col: "tipo_incapacidad", etiqueta: "Tipo", tipo: "texto", enLista: true },
      { col: "numero_dias", etiqueta: "Días", tipo: "numero", enLista: true },
      { col: "fecha_inicio", etiqueta: "Fecha de inicio", tipo: "fecha", enLista: true },
      { col: "fecha_fin", etiqueta: "Fecha de fin", tipo: "fecha" },
      { col: "radicado", etiqueta: "Radicado", tipo: "texto", enLista: true },
      { col: "valor", etiqueta: "Valor", tipo: "dinero", enLista: true },
      { col: "estado", etiqueta: "Estado", tipo: "texto", enLista: true },
      { col: "fecha_pago", etiqueta: "Fecha de pago", tipo: "fecha", enLista: true },
      { col: "comentario", etiqueta: "Comentario", tipo: "textarea" },
    ],
  },
  {
    slug: "accidentes",
    tabla: "th_accidentes",
    titulo: "Accidentes",
    singular: "mes de accidentalidad",
    descripcion: "Un registro por mes, aunque no haya pasado nada: un mes sin fila es un mes sin revisar.",
    orden: { col: "anio", asc: false },
    campos: [
      { col: "anio", etiqueta: "Año", tipo: "numero", obligatorio: true, enLista: true },
      { col: "mes", etiqueta: "Mes (1-12)", tipo: "numero", obligatorio: true, enLista: true },
      { col: "hubo_accidente", etiqueta: "¿Hubo accidente?", tipo: "siNo", enLista: true },
      { col: "num_accidentes", etiqueta: "Cuántos", tipo: "numero", enLista: true },
      { col: "tipo_accidente", etiqueta: "Tipo", tipo: "texto", enLista: true },
      { col: "area", etiqueta: "Área", tipo: "texto", enLista: true },
      { col: "dias_incapacidad", etiqueta: "Días de incapacidad", tipo: "numero", enLista: true },
      { col: "observaciones", etiqueta: "Observaciones", tipo: "textarea" },
    ],
  },
  {
    slug: "cursos",
    tabla: "th_cursos",
    titulo: "Cursos y pólizas",
    singular: "registro de cursos",
    descripcion: "Fechas de VENCIMIENTO, no de realizacion. Se marcan en rojo faltando 60 dias.",
    orden: { col: "nombre_completo", asc: true },
    campos: [
      { col: "nombre_completo", etiqueta: "Nombre completo", tipo: "texto", obligatorio: true, enLista: true },
      { col: "num_documento", etiqueta: "Documento", tipo: "texto", obligatorio: true, enLista: true },
      { col: "cargo", etiqueta: "Cargo", tipo: "texto", enLista: true },
      { col: "tipo_contrato", etiqueta: "Tipo de contrato", tipo: "texto" },
      { col: "vence_bls", etiqueta: "Vence BLS", tipo: "fecha", enLista: true },
      { col: "vence_violencia", etiqueta: "Vence violencia sexual", tipo: "fecha", enLista: true },
      { col: "vence_poliza", etiqueta: "Vence póliza", tipo: "fecha", enLista: true },
    ],
  },
  {
    slug: "capacitaciones",
    tabla: "th_capacitaciones",
    titulo: "Capacitaciones",
    singular: "capacitación",
    descripcion: "El plan del año y si se ejecutó.",
    orden: { col: "fecha_programada", asc: false },
    campos: [
      { col: "nombre", etiqueta: "Nombre", tipo: "texto", obligatorio: true, enLista: true },
      { col: "publico_objetivo", etiqueta: "Público objetivo", tipo: "texto", enLista: true },
      { col: "responsable", etiqueta: "Responsable", tipo: "texto", enLista: true },
      { col: "facilitador", etiqueta: "Facilitador", tipo: "texto", enLista: true },
      { col: "mes_programado", etiqueta: "Mes programado", tipo: "texto", enLista: true },
      { col: "fecha_programada", etiqueta: "Fecha programada", tipo: "fecha", enLista: true },
      { col: "fecha_ejecutada", etiqueta: "Fecha ejecutada", tipo: "fecha", enLista: true },
      { col: "estado", etiqueta: "Estado", tipo: "texto", enLista: true },
      { col: "se_realizo", etiqueta: "¿Se realizó?", tipo: "siNo", enLista: true },
      { col: "numero_asistentes", etiqueta: "Asistentes", tipo: "numero", enLista: true },
    ],
  },
  {
    slug: "areas",
    tabla: "th_areas",
    titulo: "Áreas",
    singular: "área",
    descripcion: "Los procesos de la clinica. Cambiar uno aqui lo cambia en todos los empleados.",
    orden: { col: "nombre", asc: true },
    campos: [
      { col: "nombre", etiqueta: "Nombre del área", tipo: "texto", obligatorio: true, enLista: true },
      { col: "activa", etiqueta: "Activa", tipo: "siNo", enLista: true },
    ],
  },
];

export function tablaPorSlug(slug: string): TablaTH | undefined {
  return TABLAS_TH.find((t) => t.slug === slug);
}
