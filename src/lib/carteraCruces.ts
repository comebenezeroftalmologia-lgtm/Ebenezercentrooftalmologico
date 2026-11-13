/**
 * Cruces determinísticos y homologación oficial de Cartera, Facturación y Glosas (Ebenezer + SISMA).
 *
 * REGLA ESTRICTA DE INTEGRIDAD DE DATOS:
 * - Jamás se inventan, suponen ni deducen nombres de pacientes, médicos, municipios o NITs.
 * - Si una factura contable histórica no tiene desglose clínico (CUPS / paciente / médico)
 *   en las fuentes reales (SISMA / cf_pendientes_facturar / cf_facturas), se expone vacío ("")
 *   y la interfaz lo rotula explícitamente como "Factura contable / Sin detalle clínico en fuente".
 * - Regla oficial de Sedes Ebenezer (alineada con src/lib/ventaDelDia.ts y Frecuencias):
 *   Sede 2 corresponde a Mutual Ser; Sede 1 corresponde al resto de convenios (PyP, Prepagadas,
 *   Pólizas, EPS Contributivas, Régimen Especial Ecopetrol y Particulares). Cuando la atención
 *   corresponde a Cirugía, se identifica explícitamente Quirófano conservando su Sede base.
 */

export type TipoAtencionGrupo = "CONSULTA" | "CIRUGIA" | "AYUDA_DX" | "SIN_DETALLE";
export type SedeGrupo = "SEDE_1" | "SEDE_2";

export type InfoEmpresaOrigen = {
  nit: string;
  empresaCorta: string;
  empresaHomologada: string;
  esMutual: boolean;
  esParticular: boolean;
  regimenConvenio: string;
  municipio: string;
  deDondeEs: string;
};

export type InfoAtencionSede = {
  tipoGrupo: TipoAtencionGrupo;
  tipoAtencion: string;
  sedeGrupo: SedeGrupo;
  sede: string;
  sedeCorta: string;
  esQuirurgico: boolean;
};

export type CruceClinicoFactura = {
  factura: string;
  pacienteNombre: string;
  pacienteDoc: string;
  pacientesCount: number;
  medicoNombre: string;
  cups: string;
  servicioDescripcion: string;
  contrato: string;
  unidadFuncional: string;
  municipio: string;
};

const REEMPLAZOS_MOJIBAKE: [string, string][] = [
  ["Ã\u0091", "Ñ"],
  ["Ã±", "ñ"],
  ["Ã\u0081", "Á"],
  ["Ã¡", "á"],
  ["Ã\u0089", "É"],
  ["Ã©", "é"],
  ["Ã\u008d", "Í"],
  ["Ã­", "í"],
  ["Ã\u0093", "Ó"],
  ["Ã³", "ó"],
  ["Ã\u009a", "Ú"],
  ["Ãº", "ú"],
  ["Ã\u009c", "Ü"],
  ["Ã¼", "ü"],
];

export function limpiarTextoUtf8(raw?: string | null): string {
  if (!raw) return "";
  let s = String(raw);
  for (const [mal, bien] of REEMPLAZOS_MOJIBAKE) {
    if (s.includes(mal)) s = s.split(mal).join(bien);
  }
  return s.replace(/\s+/g, " ").trim();
}

function sinAcentosUpper(raw?: string | null): string {
  return limpiarTextoUtf8(raw)
    .toUpperCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "");
}

/** Normaliza el código de factura FCOE para cruce exacto entre SISMA, Glosas, Anuladas y Pendientes. */
export function claveFacturaNorm(factura?: string | null): string {
  const s = limpiarTextoUtf8(factura)
    .toUpperCase()
    .replace(/[^A-Z0-9]/g, "");
  if (!s) return "";
  const m = /^FCOE0*(\d{4,})$/.exec(s);
  if (m) return `FCOE${m[1]}`;
  return s;
}

/** Extrae todas las facturas FCOE mencionadas en un texto u observación (p. ej. "FACTURADO _FCOE92208_09/10/2026"). */
export function extraerFacturasFcoe(texto?: string | null): string[] {
  if (!texto) return [];
  const s = limpiarTextoUtf8(texto).toUpperCase();
  const re = /(?:^|[^A-Z0-9])(FCOE\s*\d+)/gi;
  const halladas = new Set<string>();
  let match: RegExpExecArray | null;
  while ((match = re.exec(s)) !== null) {
    const limpia = match[1].replace(/\s+/g, "").toUpperCase();
    if (limpia) halladas.add(claveFacturaNorm(limpia));
  }
  return Array.from(halladas);
}

/** Limpia nombres reales de personas (paciente o médico); nunca devuelve placeholders como nombres. */
export function limpiarNombrePersona(raw?: string | null): string {
  const limpio = limpiarTextoUtf8(raw);
  if (!limpio) return "";
  const up = sinAcentosUpper(limpio);
  if (
    up === "-" ||
    up === "N/A" ||
    up === "NA" ||
    up === "NULL" ||
    up === "UNDEFINED" ||
    up === "SIN ASIGNAR" ||
    up === "POR ASIGNAR" ||
    up === "SIN DATO" ||
    up === "PENDIENTE"
  ) {
    return "";
  }
  return limpio;
}

const CATALOGO_EMPRESAS_SISMA: {
  match: (t: string, nit: string) => boolean;
  nit: string;
  corta: string;
  homologada: string;
  regimenBase: string;
}[] = [
  {
    match: (t, nit) => t.includes("MUTUAL") || nit.startsWith("806008394"),
    nit: "806008394",
    corta: "MUTUAL SER",
    homologada: "Mutual Ser EPS",
    regimenBase: "Mutual Ser · EPS",
  },
  {
    match: (t, nit) => t.includes("ECOPETROL") || nit.startsWith("899999068"),
    nit: "899999068",
    corta: "ECOPETROL",
    homologada: "Ecopetrol S.A.",
    regimenBase: "Régimen Especial · Ecopetrol",
  },
  {
    match: (t, nit) =>
      nit.startsWith("890903790") ||
      t.includes("SEGUROS DE VIDA SURAMERICANA") ||
      (t.includes("SURA") && (t.includes("POLIZA") || t.includes("SEGURO"))),
    nit: "890903790",
    corta: "SURA POLIZA",
    homologada: "Sura Póliza",
    regimenBase: "Póliza / Aseguradora (PyP)",
  },
  {
    match: (t, nit) =>
      nit.startsWith("800149384") || t.includes("SUSALUD"),
    nit: "800149384",
    corta: "SUSALUD PREPAGADA",
    homologada: "Susalud Prepagada",
    regimenBase: "Medicina Prepagada (PyP)",
  },
  {
    match: (t, nit) =>
      nit.startsWith("800088702") || t.includes("SURAMERICANA") || t.includes("EPS SURA") || t === "SURA",
    nit: "800088702",
    corta: "EPS SURA",
    homologada: "EPS Suramericana",
    regimenBase: "EPS Contributivo",
  },
  {
    match: (t, nit) =>
      nit.startsWith("900178724") || t.includes("MEDPLUS") || t.includes("MED PLUS"),
    nit: "900178724",
    corta: "MEDPLUS",
    homologada: "Medplus Prepagada",
    regimenBase: "Medicina Prepagada (PyP)",
  },
  {
    match: (t) => t.includes("MEDISANITAS"),
    nit: "800149387",
    corta: "MEDISANITAS",
    homologada: "Medisanitas Prepagada",
    regimenBase: "Medicina Prepagada (PyP)",
  },
  {
    match: (t, nit) => nit.startsWith("860078828") || t.includes("COLSANITAS"),
    nit: "860078828",
    corta: "COLSANITAS",
    homologada: "Colsanitas Prepagada",
    regimenBase: "Medicina Prepagada (PyP)",
  },
  {
    match: (t, nit) => nit.startsWith("800251440") || t.includes("SANITAS"),
    nit: "800251440",
    corta: "SANITAS EPS",
    homologada: "Sanitas EPS",
    regimenBase: "EPS Contributivo",
  },
  {
    match: (t, nit) => nit.startsWith("800106339") || t.includes("COLMEDICA"),
    nit: "800106339",
    corta: "COLMEDICA",
    homologada: "Colmédica Prepagada",
    regimenBase: "Medicina Prepagada (PyP)",
  },
  {
    match: (t, nit) => nit.startsWith("805009741") || t.includes("COOMEVA"),
    nit: "805009741",
    corta: "COOMEVA",
    homologada: "Coomeva Prepagada",
    regimenBase: "Medicina Prepagada (PyP)",
  },
  {
    match: (t, nit) => nit.startsWith("860002503") || t.includes("BOLIVAR"),
    nit: "860002503",
    corta: "SEGUROS BOLIVAR",
    homologada: "Seguros Bolívar",
    regimenBase: "Póliza / Aseguradora (PyP)",
  },
  {
    match: (t, nit) => nit.startsWith("860027404") || t.includes("ALLIANZ"),
    nit: "860027404",
    corta: "ALLIANZ",
    homologada: "Allianz Seguros",
    regimenBase: "Póliza / Aseguradora (PyP)",
  },
  {
    match: (t, nit) =>
      nit.startsWith("900640334") ||
      ((t.includes("COLPATRIA") || t.includes("AXA")) &&
        !t.includes("SEGURO") &&
        !t.includes("VIDA") &&
        !t.includes("ARL") &&
        !t.includes("SOAT")),
    nit: "900640334",
    corta: "AXA COLPATRIA PREPAGADA",
    homologada: "Axa Colpatria Prepagada",
    regimenBase: "Medicina Prepagada (PyP)",
  },
  {
    match: (t, nit) =>
      nit.startsWith("860002183") || t.includes("COLPATRIA") || t.includes("AXA"),
    nit: "860002183",
    corta: "AXA COLPATRIA SEGUROS",
    homologada: "Axa Colpatria Seguros",
    regimenBase: "Póliza / Aseguradora (PyP)",
  },
  {
    match: (t, nit) => nit.startsWith("860039988") || t.includes("HDI"),
    nit: "860039988",
    corta: "HDI SEGUROS",
    homologada: "HDI Seguros",
    regimenBase: "Póliza / Aseguradora (PyP)",
  },
  {
    match: (t, nit) => nit.startsWith("890480023") || t.includes("COMFENALCO"),
    nit: "890480023",
    corta: "COMFENALCO CARTAGENA",
    homologada: "Comfenalco Cartagena",
    regimenBase: "EPS / Caja Compensación",
  },
  {
    match: (t, nit) => nit.startsWith("800130907") || t.includes("SALUD TOTAL"),
    nit: "800130907",
    corta: "SALUD TOTAL",
    homologada: "Salud Total EPS",
    regimenBase: "EPS Contributivo",
  },
  {
    match: (t) => t.includes("PAN AMERICAN"),
    nit: "",
    corta: "PAN AMERICAN LIFE",
    homologada: "Pan American Life",
    regimenBase: "Póliza Internacional (PyP)",
  },
  {
    match: (t) => t.includes("BMI COLOMBIA") || t.includes("BMI "),
    nit: "",
    corta: "BMI COLOMBIA",
    homologada: "BMI Colombia",
    regimenBase: "Póliza Internacional (PyP)",
  },
  {
    match: (t, nit) => nit.startsWith("860002400") || t.includes("MUNDIAL DE SEGUROS") || t.includes("MUNDIAL SEGUROS"),
    nit: "860002400",
    corta: "MUNDIAL SEGUROS",
    homologada: "Mundial de Seguros",
    regimenBase: "Póliza / Aseguradora (PyP)",
  },
  {
    match: (t, nit) => nit.startsWith("899999034") || t.includes("SERVICIO NACIONAL") || /\bSENA\b/.test(t),
    nit: "899999034",
    corta: "SENA",
    homologada: "SENA · Servicio Médico",
    regimenBase: "Convenio Institucional",
  },
  {
    match: (t) => t.includes("MEXICHEM"),
    nit: "",
    corta: "MEXICHEM",
    homologada: "Mexichem (Convenio)",
    regimenBase: "Convenio Empresarial",
  },
  {
    match: (t) => t.includes("CENTRO DE ATENCION") || t.includes("CENTRO ATENCION VISUAL"),
    nit: "",
    corta: "CENTRO ATENCION VISUAL",
    homologada: "Centro Atención Visual",
    regimenBase: "Convenio Aliado",
  },
  {
    match: (t) => t.includes("INVERSIONES MAR"),
    nit: "",
    corta: "INVERSIONES MAR",
    homologada: "Inversiones Mar & Cía.",
    regimenBase: "Convenio Empresarial",
  },
  {
    match: (t) => t.includes("AGENCIA DE ADUANAS") || t.includes("AGENCIA ADUANAS"),
    nit: "",
    corta: "AGENCIA ADUANAS",
    homologada: "Agencia de Aduanas",
    regimenBase: "Convenio Empresarial",
  },
  {
    match: (t) => t.includes("ISLAS"),
    nit: "",
    corta: "HOTEL LAS ISLAS",
    homologada: "Hotel Las Islas",
    regimenBase: "Convenio Empresarial",
  },
  {
    match: (t) => t.includes("PROGEMA"),
    nit: "",
    corta: "PROGEMA",
    homologada: "Progema",
    regimenBase: "Convenio Empresarial",
  },
  {
    match: (t) => t.includes("MILENA ROMERO"),
    nit: "",
    corta: "CONVENIO DRA MILENA ROMERO",
    homologada: "Convenio Dra. Milena Romero",
    regimenBase: "Convenio Especialista",
  },
  {
    match: (t) => t.includes("PARTICULAR"),
    nit: "",
    corta: "PARTICULAR",
    homologada: "Particular",
    regimenBase: "Particular (PyP)",
  },
];

/**
 * Homologa el nombre de la empresa por NIT real de SISMA y determina "De dónde es"
 * (Régimen / Convenio + Municipio cuando existe en SISMA).
 */
export function homologarEmpresaYOrigen(input: {
  empresa?: string | null;
  empresaOriginal?: string | null;
  contrato?: string | null;
  nit?: string | null;
  municipio?: string | null;
  descripcionCuenta?: string | null;
  tipoFactura?: string | null;
}): InfoEmpresaOrigen {
  const rawPrincipal = limpiarTextoUtf8(input.empresa);
  const rawOriginal = limpiarTextoUtf8(input.empresaOriginal);
  const rawContrato = limpiarTextoUtf8(input.contrato);
  const rawCuenta = limpiarTextoUtf8(input.descripcionCuenta);
  const rawTipoFact = limpiarTextoUtf8(input.tipoFactura);
  const municipioLimpio = limpiarNombrePersona(input.municipio);
  const nitEntrada = String(input.nit || "").replace(/[^0-9]/g, "");

  const textoBusqueda = sinAcentosUpper(
    `${rawPrincipal} ${rawOriginal} ${rawContrato}`
  );
  const textoRegimen = sinAcentosUpper(
    `${rawOriginal} ${rawContrato} ${rawCuenta} ${rawTipoFact} ${rawPrincipal}`
  );

  for (const cat of CATALOGO_EMPRESAS_SISMA) {
    if (cat.match(textoBusqueda, nitEntrada)) {
      const esMutual = cat.corta === "MUTUAL SER";
      const esParticular = cat.corta === "PARTICULAR";
      let regimenConvenio = cat.regimenBase;

      if (esMutual) {
        if (
          /MUTUAL\s*SER\s*-\s*S\b/.test(textoRegimen) ||
          textoRegimen.includes("SUBSIDIAD")
        ) {
          regimenConvenio = "Mutual Ser · Subsidiado";
        } else if (
          /MUTUAL\s*SER\s*-\s*C\b/.test(textoRegimen) ||
          textoRegimen.includes("CONTRIBUTIV")
        ) {
          regimenConvenio = "Mutual Ser · Contributivo";
        }
      }

      const nitFinal = nitEntrada || cat.nit;
      const deDondeEs = municipioLimpio
        ? `${regimenConvenio} · ${municipioLimpio}`
        : regimenConvenio;

      return {
        nit: esParticular ? nitEntrada : nitFinal,
        empresaCorta: cat.corta,
        empresaHomologada: cat.homologada,
        esMutual,
        esParticular,
        regimenConvenio,
        municipio: municipioLimpio,
        deDondeEs,
      };
    }
  }

  // Si no está en el catálogo corporativo fijo, conservar el nombre real limpio y el NIT real de SISMA
  const nombreReal = rawPrincipal || rawOriginal || "Sin entidad en fuente";
  const nombreFormateado =
    nombreReal === "Sin entidad en fuente"
      ? nombreReal
      : nombreReal.length > 42
      ? nombreReal
          .toLowerCase()
          .replace(/\b\w/g, (l) => l.toUpperCase())
          .slice(0, 42)
      : nombreReal;

  let regimenFallback = "Convenio / Tercero";
  if (textoRegimen.includes("PARTICULAR")) regimenFallback = "Particular (PyP)";
  else if (textoRegimen.includes("SUBSIDIAD")) regimenFallback = "Régimen Subsidiado";
  else if (textoRegimen.includes("CONTRIBUTIV")) regimenFallback = "Régimen Contributivo";
  else if (textoRegimen.includes("PREPAGAD")) regimenFallback = "Medicina Prepagada (PyP)";
  else if (textoRegimen.includes("POLIZA") || textoRegimen.includes("SEGURO")) {
    regimenFallback = "Póliza / Aseguradora (PyP)";
  }

  const deDondeEs = municipioLimpio
    ? `${regimenFallback} · ${municipioLimpio}`
    : regimenFallback;

  return {
    nit: nitEntrada,
    empresaCorta: sinAcentosUpper(rawPrincipal || rawOriginal) || "SIN ENTIDAD",
    empresaHomologada: nombreFormateado,
    esMutual: false,
    esParticular: textoRegimen.includes("PARTICULAR"),
    regimenConvenio: regimenFallback,
    municipio: municipioLimpio,
    deDondeEs,
  };
}

/**
 * Clasifica estrictamente con base en CUPS, unidad funcional, programación quirúrgica y descripción
 * si el registro corresponde a `Consulta`, `Cirugía`, `Ayuda Dx / Proc.` o `Sin detalle CUPS en factura`,
 * y determina la Sede oficial en Ebenezer (`Sede 1` vs `Sede 2` + `Quirófano`).
 */
export function clasificarAtencionYSede(input: {
  esMutual: boolean;
  cups?: string | null;
  unidadFuncional?: string | null;
  descripcion?: string | null;
  contrato?: string | null;
  cuentaContable?: string | null;
  descripcionCuenta?: string | null;
  tipoFactura?: string | null;
  motivoTexto?: string | null;
  quirofano?: string | null;
}): InfoAtencionSede {
  const cupsLimpio = limpiarTextoUtf8(input.cups)
    .toUpperCase()
    .replace(/[^A-Z0-9]/g, "");
  const ufUp = sinAcentosUpper(input.unidadFuncional);
  const qxUp = sinAcentosUpper(input.quirofano);
  const descUp = sinAcentosUpper(input.descripcion);
  const contratoUp = sinAcentosUpper(input.contrato);
  const cuentaUp = sinAcentosUpper(input.descripcionCuenta);
  const motivoUp = sinAcentosUpper(input.motivoTexto);
  const textoClinico = `${descUp} ${cuentaUp} ${motivoUp}`;

  let tipoGrupo: TipoAtencionGrupo = "SIN_DETALLE";

  // 1. Reglas determinísticas por código CUPS oficial de salud en Colombia
  if (cupsLimpio) {
    if (/^(08|09|10|11|12|13|14|15|16)\d{4}/.test(cupsLimpio)) {
      tipoGrupo = "CIRUGIA";
    } else if (/^890[123467]\d{2}/.test(cupsLimpio)) {
      tipoGrupo = "CONSULTA";
    } else if (/^(95|88|87|99|N86)/.test(cupsLimpio)) {
      tipoGrupo = "AYUDA_DX";
    }
  }

  // 2. Si no hubo CUPS concluyente, evaluar unidad funcional / quirófano / descripción clínica explícita
  if (tipoGrupo === "SIN_DETALLE") {
    const esTextoQx =
      qxUp.length > 0 ||
      ufUp.includes("CIRUG") ||
      ufUp.includes("QUIROF") ||
      ufUp.includes("SALA DE") ||
      /\b(FACOEMULSIFICACION|EXTRACAPSULAR|VITRECTOMIA|PTERIGION|TRABECULECTOMIA|BLEFAROPLASTIA|CHALAZION|DACRIOCISTO|QUERATOPLASTIA|CROSSLINKING|LENTE INTRAOCULAR|DERECHOS DE SALA|QUIROFANO|CIRUGIA|ANESTESIA|MATERIALES DE SUTURA|VISCOELASTICO)\b/.test(
        textoClinico
      );

    const esTextoAyudaDx =
      /\b(TERAPIA ORTOPTICA|TERAPIAS ORTOPTICAS|EVALUACION ORTOPTICA|CAMPIMETRIA|BIOMETRIA|TOMOGRAFIA|PAQUIMETRIA|TOPOGRAFIA|ECOGRAFIA|ANGIOGRAFIA|RECUENTO ENDOTELIAL|CAPSULOTOMIA|IRIDOTOMIA|FOTOCOAGULACION|INTRAVITREA|AVASTIN|AFLIBERCEPT|RANIBIZUMAB|PROTESIS OCULAR)\b/.test(
        textoClinico
      ) || /\bOCT\b/.test(textoClinico);

    const esTextoConsulta =
      /\b(CONSULTA DE PRIMERA VEZ|CONSULTA DE CONTROL|CONSULTA EXTERNA|CONSULTA OPTOMETRIA|CONSULTA OFTALMOLOGIA|VALORACION POR OFTALMOLOGIA|INTERCONSULTA)\b/.test(
        textoClinico
      );

    if (esTextoQx) {
      tipoGrupo = "CIRUGIA";
    } else if (esTextoAyudaDx) {
      tipoGrupo = "AYUDA_DX";
    } else if (esTextoConsulta) {
      tipoGrupo = "CONSULTA";
    } else if (ufUp.includes("CONSULTA") || ufUp.includes("CONSULTORIO")) {
      tipoGrupo = "CONSULTA";
    } else if (
      contratoUp.includes("CIRUGIA") &&
      !contratoUp.includes("CONSULTA") &&
      !contratoUp.includes("CE")
    ) {
      tipoGrupo = "CIRUGIA";
    } else if (
      (contratoUp.includes("CONSULTA") || /\bCE\b/.test(contratoUp)) &&
      !contratoUp.includes("DX") &&
      !contratoUp.includes("AY.")
    ) {
      tipoGrupo = "CONSULTA";
    }
  }

  const etiquetasTipo: Record<TipoAtencionGrupo, string> = {
    CONSULTA: "Consulta",
    CIRUGIA: "Cirugía",
    AYUDA_DX: "Ayuda Dx / Proc.",
    SIN_DETALLE: "Sin CUPS en factura",
  };

  const sedeGrupo: SedeGrupo = input.esMutual ? "SEDE_2" : "SEDE_1";
  const sedeCorta = input.esMutual ? "Sede 2" : "Sede 1";
  const esQuirurgico = tipoGrupo === "CIRUGIA";

  const sede = esQuirurgico
    ? input.esMutual
      ? "Sede 2 · Quirófano"
      : "Sede 1 · Quirófano"
    : input.esMutual
    ? "Sede 2 · Consultorios"
    : "Sede 1 · Principal";

  return {
    tipoGrupo,
    tipoAtencion: etiquetasTipo[tipoGrupo],
    sedeGrupo,
    sede,
    sedeCorta,
    esQuirurgico,
  };
}
