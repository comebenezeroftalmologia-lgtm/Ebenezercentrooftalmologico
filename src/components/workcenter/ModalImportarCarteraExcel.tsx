"use client";

import React, { useMemo, useState } from "react";
import {
  AlertTriangle,
  Check,
  Download,
  FileSpreadsheet,
  Loader2,
  Upload,
  X,
} from "lucide-react";
import {
  type DestinoHojaCartera,
  type HojaExcelDetectada,
  leerArchivoExcelOCsv,
  leerTextoCsvOPegado,
  mapearFilasSegunDestino,
} from "@/lib/carteraExcelImport";

const formatPesos = (v: number | null | undefined) => {
  if (v === null || v === undefined || Number.isNaN(v)) return "—";
  return "$" + Math.round(v).toLocaleString("es-CO");
};

const ETIQUETA_DESTINO: Record<DestinoHojaCartera, string> = {
  glosas: "Glosas y Defensa (cf_glosas)",
  pendientes: "Servicios / Pendientes (Consulta y Cirugía)",
  anuladas: "Facturas Anuladas / Legalizadas (cf_facturas)",
  omitir: "Omitir esta hoja",
};

export function ModalImportarCarteraExcel({
  onCerrar,
  onImportado,
}: {
  onCerrar: () => void;
  onImportado: (mensaje: string) => void;
}) {
  const [archivoNombre, setArchivoNombre] = useState<string>("");
  const [hojas, setHojas] = useState<HojaExcelDetectada[]>([]);
  const [hojaVistaIdx, setHojaVistaIdx] = useState<number>(0);
  const [textoPegado, setTextoPegado] = useState<string>("");
  const [leyendo, setLeyendo] = useState<boolean>(false);
  const [subiendo, setSubiendo] = useState<boolean>(false);
  const [errorMsg, setErrorMsg] = useState<string>("");
  const [arrastrando, setArrastrando] = useState<boolean>(false);

  const resumenTotales = useMemo(() => {
    let glosas = 0;
    let pendientes = 0;
    let anuladas = 0;
    let hojasActivas = 0;
    for (const h of hojas) {
      if (h.destinoSeleccionado === "omitir") continue;
      const n =
        h.destinoSeleccionado === "glosas"
          ? h.glosas.length
          : h.destinoSeleccionado === "pendientes"
          ? h.pendientes.length
          : h.anuladas.length;
      if (n > 0) hojasActivas++;
      glosas += h.glosas.length;
      pendientes += h.pendientes.length;
      anuladas += h.anuladas.length;
    }
    return {
      glosas,
      pendientes,
      anuladas,
      total: glosas + pendientes + anuladas,
      hojasActivas,
    };
  }, [hojas]);

  const procesarArchivo = async (file: File) => {
    setErrorMsg("");
    setLeyendo(true);
    try {
      const detectadas = await leerArchivoExcelOCsv(file);
      if (detectadas.length === 0) {
        setErrorMsg(
          "No se encontraron filas con datos en el archivo. Verifica que tenga encabezados en las primeras filas."
        );
        setHojas([]);
        return;
      }
      setArchivoNombre(file.name);
      setHojas(detectadas);
      const primeraActiva = detectadas.findIndex((d) => d.destinoSeleccionado !== "omitir");
      setHojaVistaIdx(primeraActiva >= 0 ? primeraActiva : 0);
    } catch (err) {
      setErrorMsg(
        err instanceof Error
          ? err.message
          : "No se pudo leer el libro Excel. Verifica que sea un archivo .xlsx o .csv válido."
      );
    } finally {
      setLeyendo(false);
    }
  };

  const procesarPegado = (txt: string) => {
    setTextoPegado(txt);
    setErrorMsg("");
    if (!txt.trim()) {
      if (!archivoNombre) setHojas([]);
      return;
    }
    const detectadas = leerTextoCsvOPegado(txt, "Celdas pegadas desde Excel");
    setArchivoNombre("Pegado directo Excel");
    setHojas(detectadas);
    setHojaVistaIdx(0);
  };

  const cambiarDestinoHoja = (idx: number, nuevoDestino: DestinoHojaCartera) => {
    setHojas((prev) =>
      prev.map((h, i) => {
        if (i !== idx) return h;
        const remapeo = mapearFilasSegunDestino(
          h.nombreHoja,
          h.encabezados,
          h.filasCrudas,
          h.filaEncabezado1Based,
          nuevoDestino
        );
        return {
          ...h,
          destinoSeleccionado: nuevoDestino,
          ...remapeo,
        };
      })
    );
  };

  const descargarPlantillaCsv = () => {
    const cab = [
      "Factura",
      "Empresa",
      "Fecha Factura",
      "Fecha Radicación",
      "Fecha Notificación Glosa",
      "Valor Facturado",
      "Valor Glosado",
      "Valor Aceptado",
      "Código Causal",
      "Motivo Glosa",
      "Nota Crédito",
      "Facturador",
      "Responsable Respuesta Glosa",
      "Estado",
      "Observación Interna",
    ].join(";");
    const blob = new Blob(["\uFEFF" + cab + "\r\n"], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "plantilla_cartera_glosas_ebenezer.csv";
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const confirmarAlmacenamiento = async () => {
    if (resumenTotales.total === 0) return;
    setSubiendo(true);
    setErrorMsg("");
    try {
      const payloadGlosas = hojas.flatMap((h) =>
        h.destinoSeleccionado === "glosas"
          ? h.glosas.map((g) => ({ ...g, hojaExcel: h.nombreHoja }))
          : []
      );
      const payloadPendientes = hojas.flatMap((h) =>
        h.destinoSeleccionado === "pendientes"
          ? h.pendientes.map((p) => ({ ...p, hojaExcel: h.nombreHoja }))
          : []
      );
      const payloadAnuladas = hojas.flatMap((h) =>
        h.destinoSeleccionado === "anuladas"
          ? h.anuladas.map((a) => ({ ...a, hojaExcel: h.nombreHoja }))
          : []
      );

      const res = await fetch("/api/cartera/registros", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          entidad: "importar-excel",
          accion: "IMPORTAR",
          archivoNombre: archivoNombre || "carga_excel.xlsx",
          glosas: payloadGlosas,
          pendientes: payloadPendientes,
          anuladas: payloadAnuladas,
        }),
      });
      const json = await res.json();
      if (!res.ok || !json?.ok) {
        setErrorMsg(json?.error || "No se pudo guardar el archivo en la base de datos.");
        return;
      }
      const r = json.resumen || {};
      const partes: string[] = [];
      if (r.glosasProcesadas) partes.push(`${r.glosasProcesadas} glosas`);
      if (r.pendientesProcesados) partes.push(`${r.pendientesProcesados} servicios/pendientes`);
      if (r.anuladasProcesadas) partes.push(`${r.anuladasProcesadas} anuladas/legalizadas`);
      const detalleTxt = partes.length > 0 ? partes.join(" · ") : `${resumenTotales.total} registros`;
      onImportado(
        `Excel almacenado en BD (${detalleTxt} — ${r.creados ?? 0} nuevos, ${r.actualizados ?? 0} actualizados sin duplicar).`
      );
    } catch {
      setErrorMsg("Error de red al guardar el archivo Excel en la base de datos.");
    } finally {
      setSubiendo(false);
    }
  };

  const hojaActiva = hojas[hojaVistaIdx] || null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-[#0E245E]/45 p-3 sm:p-5"
      role="dialog"
      aria-label="Subir y almacenar Excel en Cartera"
    >
      <div className="max-h-[92vh] w-full max-w-[980px] overflow-y-auto rounded-2xl border border-[#DCE8FA] bg-white shadow-[0_24px_60px_rgba(14,36,94,0.22)]">
        {/* ENCABEZADO */}
        <div className="flex items-start justify-between gap-3 border-b border-[#E2EBF8] px-5 py-4">
          <div>
            <h3 className="flex items-center gap-2 text-[15.5px] font-extrabold text-[#0E245E]">
              <FileSpreadsheet className="h-4.5 w-4.5 text-[#1D58D8]" />
              Subir Excel (.xlsx / .csv) y Almacenar en Base de Datos Compartida
            </h3>
            <p className="mt-0.5 text-[11.5px] text-[#64748B]">
              Reconoce automáticamente hojas de <strong>Glosas</strong>,{" "}
              <strong>Servicios / Pendientes (Paciente, Médico, CUPS, Sede)</strong> y{" "}
              <strong>Facturas Anuladas / Reemplazadas</strong>. Alimenta al instante{" "}
              <strong>WorkCenter</strong> y <strong>/cartera</strong> sin duplicar registros.
            </p>
          </div>
          <button
            type="button"
            onClick={onCerrar}
            aria-label="Cerrar"
            className="rounded-lg p-1.5 text-[#47597A] transition hover:bg-[#F1F5F9] cursor-pointer"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* CUERPO */}
        <div className="space-y-4 px-5 py-4">
          {/* ZONA DE ARRASTRE O SELECCIÓN DE ARCHIVO .XLSX / .CSV */}
          <div className="grid grid-cols-1 lg:grid-cols-[1.2fr_1fr] gap-3">
            <label
              onDragOver={(e) => {
                e.preventDefault();
                setArrastrando(true);
              }}
              onDragLeave={() => setArrastrando(false)}
              onDrop={(e) => {
                e.preventDefault();
                setArrastrando(false);
                const f = e.dataTransfer.files?.[0];
                if (f) void procesarArchivo(f);
              }}
              className={`flex flex-col items-center justify-center rounded-xl border-2 border-dashed p-4 text-center transition cursor-pointer ${
                arrastrando
                  ? "border-[#1D58D8] bg-[#EFF6FF]"
                  : "border-[#CBD5E1] bg-[#F8FAFC] hover:border-[#1D58D8] hover:bg-[#F0F7FF]"
              }`}
            >
              <Upload className="h-6 w-6 text-[#1D58D8] mb-1.5" />
              <span className="text-[12.5px] font-extrabold text-[#0E245E]">
                {leyendo
                  ? "Leyendo libro Excel…"
                  : archivoNombre
                  ? `Archivo cargado: ${archivoNombre}`
                  : "Haz clic aquí o arrastra tu archivo Excel (.xlsx o .csv)"}
              </span>
              <span className="mt-0.5 text-[11px] text-[#64748B]">
                Soporta libros .xlsx de una o varias hojas, archivos .csv/.txt y caracteres UTF-8 (Ñ, tildes)
              </span>
              <input
                type="file"
                accept=".xlsx,.csv,.tsv,.txt,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet,text/csv"
                className="hidden"
                onChange={(e) => {
                  const f = e.target.files?.[0];
                  if (f) void procesarArchivo(f);
                }}
              />
            </label>

            <div className="flex flex-col justify-between rounded-xl border border-[#E2EBF8] bg-[#FAFCFF] p-3">
              <div>
                <div className="flex items-center justify-between gap-2 mb-1">
                  <span className="text-[11px] font-bold uppercase tracking-wider text-[#47597A]">
                    O pega celdas directo desde Excel
                  </span>
                  <button
                    type="button"
                    onClick={descargarPlantillaCsv}
                    className="inline-flex items-center gap-1 text-[11px] font-bold text-[#1D58D8] hover:underline cursor-pointer"
                  >
                    <Download className="h-3 w-3" /> Plantilla guía
                  </button>
                </div>
                <textarea
                  rows={3}
                  value={textoPegado}
                  onChange={(e) => procesarPegado(e.target.value)}
                  placeholder="Copia el rango con encabezados en Excel (Ctrl+C) y pégalo aquí (Ctrl+V)…"
                  className="w-full rounded-lg border border-[#DCE8FA] bg-white p-2 font-mono text-[11px] text-[#0E245E] outline-none focus:border-[#1D58D8]"
                />
              </div>
            </div>
          </div>

          {errorMsg && (
            <div className="flex items-start gap-2 rounded-xl border border-[#FECDD3] bg-[#FFF1F2] p-3 text-[12px] font-semibold text-[#BE123C]">
              <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
              <span>{errorMsg}</span>
            </div>
          )}

          {/* TARJETAS DE HOJAS DETECTADAS */}
          {hojas.length > 0 && (
            <div className="space-y-3">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div className="flex items-center gap-2 text-[12px] font-bold text-[#0E245E]">
                  <Check className="h-4 w-4 text-[#059669]" />
                  <span>
                    {hojas.length} {hojas.length === 1 ? "hoja leída" : "hojas leídas"} —{" "}
                    <strong className="text-[#1D58D8]">
                      {resumenTotales.total.toLocaleString("es-CO")} registros reconocidos
                    </strong>{" "}
                    listos para guardar
                  </span>
                </div>
                <div className="flex flex-wrap gap-1.5 text-[11px] font-mono">
                  {resumenTotales.glosas > 0 && (
                    <span className="rounded-full bg-[#EFF6FF] px-2.5 py-0.5 font-bold text-[#1D4ED8]">
                      Glosas: {resumenTotales.glosas}
                    </span>
                  )}
                  {resumenTotales.pendientes > 0 && (
                    <span className="rounded-full bg-[#ECFDF5] px-2.5 py-0.5 font-bold text-[#047857]">
                      Servicios/Pendientes: {resumenTotales.pendientes}
                    </span>
                  )}
                  {resumenTotales.anuladas > 0 && (
                    <span className="rounded-full bg-[#FFF1F2] px-2.5 py-0.5 font-bold text-[#BE123C]">
                      Anuladas/Legalizadas: {resumenTotales.anuladas}
                    </span>
                  )}
                </div>
              </div>

              {/* SELECTOR POR HOJA */}
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2.5">
                {hojas.map((h, idx) => {
                  const activa = idx === hojaVistaIdx;
                  const cantMapeada =
                    h.destinoSeleccionado === "glosas"
                      ? h.glosas.length
                      : h.destinoSeleccionado === "pendientes"
                      ? h.pendientes.length
                      : h.destinoSeleccionado === "anuladas"
                      ? h.anuladas.length
                      : 0;
                  return (
                    <div
                      key={`${h.nombreHoja}-${idx}`}
                      onClick={() => setHojaVistaIdx(idx)}
                      className={`rounded-xl border p-3 transition cursor-pointer ${
                        activa
                          ? "border-[#1D58D8] bg-[#EFF6FF]/70 shadow-xs"
                          : "border-[#E2EBF8] bg-white hover:bg-[#F8FAFC]"
                      }`}
                    >
                      <div className="flex items-center justify-between gap-2">
                        <span className="truncate text-[12.5px] font-extrabold text-[#0E245E]">
                          📄 {h.nombreHoja}
                        </span>
                        <span className="shrink-0 rounded-full bg-slate-100 px-2 py-0.5 font-mono text-[10.5px] font-bold text-[#334155]">
                          {cantMapeada} / {h.filasCrudas.length} filas
                        </span>
                      </div>
                      <p className="mt-1 text-[10.5px] text-[#64748B] truncate" title={h.motivoDeteccion}>
                        {h.motivoDeteccion}
                      </p>
                      <div className="mt-2" onClick={(e) => e.stopPropagation()}>
                        <select
                          value={h.destinoSeleccionado}
                          onChange={(e) =>
                            cambiarDestinoHoja(idx, e.target.value as DestinoHojaCartera)
                          }
                          className="w-full rounded-lg border border-[#CBD5E1] bg-white px-2 py-1 text-[11px] font-bold text-[#0E245E] outline-none focus:border-[#1D58D8]"
                        >
                          {(["glosas", "pendientes", "anuladas", "omitir"] as const).map((op) => (
                            <option key={op} value={op}>
                              {ETIQUETA_DESTINO[op]}
                            </option>
                          ))}
                        </select>
                      </div>
                    </div>
                  );
                })}
              </div>

              {/* VISTA PREVIA CRUZADA DE LA HOJA SELECCIONADA */}
              {hojaActiva && hojaActiva.destinoSeleccionado !== "omitir" && (
                <div className="overflow-x-auto rounded-xl border border-[#E2EBF8]">
                  {hojaActiva.destinoSeleccionado === "glosas" && (
                    <table className="w-full border-collapse text-[11.5px]">
                      <thead>
                        <tr className="bg-[#0E245E] text-left text-white">
                          <th className="p-2 font-bold">Factura · Fecha</th>
                          <th className="p-2 font-bold">Sede</th>
                          <th className="p-2 font-bold">Consulta / Cirugía</th>
                          <th className="p-2 font-bold">Empresa Homologada (NIT)</th>
                          <th className="p-2 font-bold">De dónde es</th>
                          <th className="p-2 font-bold">Responsables</th>
                          <th className="p-2 text-right font-bold">Facturado</th>
                          <th className="p-2 text-right font-bold">Glosado</th>
                          <th className="p-2 font-bold">NC · Estado</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-[#F1F5F9]">
                        {hojaActiva.glosas.slice(0, 12).map((g, i) => (
                          <tr key={`${g.factura}-${i}`} className="hover:bg-[#F8FAFC]">
                            <td className="p-2 font-mono">
                              <div className="font-bold text-[#0E245E]">{g.factura}</div>
                              <div className="text-[10px] text-[#64748B]">{g.fechaFactura || "—"}</div>
                            </td>
                            <td className="p-2 font-semibold text-[#047857]">{g.sede}</td>
                            <td className="p-2 text-[#334155]">{g.tipoAtencion}</td>
                            <td className="p-2">
                              <div className="font-bold text-[#0E245E]">{g.empresaHomologada}</div>
                              {g.nit && <div className="font-mono text-[10px] text-[#64748B]">NIT {g.nit}</div>}
                            </td>
                            <td className="p-2 text-[#334155]">{g.deDondeEs}</td>
                            <td className="p-2 text-[10.5px] text-[#47597A]">
                              {g.responsableRespuesta || g.facturador || "—"}
                            </td>
                            <td className="p-2 text-right font-mono">{formatPesos(g.valorFacturado)}</td>
                            <td className="p-2 text-right font-mono font-bold text-[#BE123C]">
                              {formatPesos(g.valorGlosado)}
                            </td>
                            <td className="p-2 font-mono text-[10.5px]">
                              <span className="font-bold text-[#0E245E]">{g.estado}</span>
                              <div className="text-[#64748B]">NC: {g.notaCredito || "Pendiente"}</div>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  )}

                  {hojaActiva.destinoSeleccionado === "pendientes" && (
                    <table className="w-full border-collapse text-[11.5px]">
                      <thead>
                        <tr className="bg-[#0E245E] text-left text-white">
                          <th className="p-2 font-bold">Fecha · Factura</th>
                          <th className="p-2 font-bold">Sede</th>
                          <th className="p-2 font-bold">Consulta / Cirugía</th>
                          <th className="p-2 font-bold">Empresa Homologada</th>
                          <th className="p-2 font-bold">Paciente · Médico</th>
                          <th className="p-2 font-bold">CUPS · Servicio</th>
                          <th className="p-2 text-right font-bold">Valor</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-[#F1F5F9]">
                        {hojaActiva.pendientes.slice(0, 12).map((p, i) => (
                          <tr key={`${p.filaExcel}-${i}`} className="hover:bg-[#F8FAFC]">
                            <td className="p-2 font-mono">
                              <div className="font-bold text-[#0E245E]">{p.fechaServicio || "—"}</div>
                              {p.facturaAsociada && (
                                <div className="text-[10px] font-bold text-[#1D58D8]">{p.facturaAsociada}</div>
                              )}
                            </td>
                            <td className="p-2 font-semibold text-[#047857]">{p.sede}</td>
                            <td className="p-2 font-semibold text-[#1D4ED8]">{p.tipoAtencion}</td>
                            <td className="p-2">
                              <div className="font-bold text-[#0E245E]">{p.empresaHomologada}</div>
                              <div className="text-[10px] text-[#64748B]">{p.deDondeEs}</div>
                            </td>
                            <td className="p-2 text-[10.5px]">
                              {p.pacienteNombre && (
                                <div className="font-bold text-[#0E245E]">Pac: {p.pacienteNombre}</div>
                              )}
                              {p.medico && <div className="text-[#334155]">Dr(a): {p.medico}</div>}
                            </td>
                            <td className="p-2 max-w-[240px] truncate">
                              {p.cups && <strong className="font-mono mr-1">[{p.cups}]</strong>}
                              {p.descripcion || "—"}
                            </td>
                            <td className="p-2 text-right font-mono font-bold text-[#0E245E]">
                              {formatPesos(p.valorServicio)}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  )}

                  {hojaActiva.destinoSeleccionado === "anuladas" && (
                    <table className="w-full border-collapse text-[11.5px]">
                      <thead>
                        <tr className="bg-[#0E245E] text-left text-white">
                          <th className="p-2 font-bold">Factura</th>
                          <th className="p-2 font-bold">Sede</th>
                          <th className="p-2 font-bold">Empresa Homologada (NIT)</th>
                          <th className="p-2 font-bold">Fecha Factura / Anulación</th>
                          <th className="p-2 text-right font-bold">Valor</th>
                          <th className="p-2 font-bold">Reemplazo</th>
                          <th className="p-2 font-bold">Motivo · Estado</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-[#F1F5F9]">
                        {hojaActiva.anuladas.slice(0, 12).map((a, i) => (
                          <tr key={`${a.factura}-${i}`} className="hover:bg-[#F8FAFC]">
                            <td className="p-2 font-mono font-bold text-[#0E245E]">{a.factura}</td>
                            <td className="p-2 font-semibold text-[#047857]">{a.sede}</td>
                            <td className="p-2">
                              <div className="font-bold text-[#0E245E]">{a.empresaHomologada}</div>
                              {a.nit && <div className="font-mono text-[10px] text-[#64748B]">NIT {a.nit}</div>}
                            </td>
                            <td className="p-2 font-mono text-[10.5px] text-[#47597A]">
                              F: {a.fechaFactura || "—"} · Anul: {a.fechaAnulacion || "—"}
                            </td>
                            <td className="p-2 text-right font-mono font-bold text-[#0E245E]">
                              {formatPesos(a.valorRadicado)}
                            </td>
                            <td className="p-2 font-mono font-bold text-[#1D58D8]">
                              {a.facturaReemplaza || "—"}
                            </td>
                            <td className="p-2 max-w-[240px] truncate" title={a.motivo}>
                              <span className="font-bold text-[#BE123C] mr-1">[{a.estadoGestion}]</span>
                              {a.motivo || "—"}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  )}
                </div>
              )}
            </div>
          )}
        </div>

        {/* PIE DE ACCIÓN */}
        <div className="flex flex-wrap items-center justify-between gap-3 border-t border-[#E2EBF8] bg-[#F8FAFC] px-5 py-3.5">
          <span className="text-[11.5px] text-[#47597A]">
            {resumenTotales.total > 0
              ? `Se guardarán ${resumenTotales.total.toLocaleString("es-CO")} registros en Supabase (actualiza existentes sin duplicar y alimenta ambos tableros).`
              : "Selecciona un archivo .xlsx o .csv, o pega las celdas desde Excel para previsualizar."}
          </span>
          <div className="flex items-center gap-2.5">
            <button
              type="button"
              onClick={onCerrar}
              className="rounded-xl border border-[#CBD5E1] bg-white px-4 py-2 text-[12.5px] font-bold text-[#47597A] transition hover:bg-slate-50 cursor-pointer"
            >
              Cancelar
            </button>
            <button
              type="button"
              disabled={resumenTotales.total === 0 || subiendo || leyendo}
              onClick={confirmarAlmacenamiento}
              className="inline-flex items-center gap-1.5 rounded-xl bg-[#1D58D8] px-4 py-2 text-[12.5px] font-extrabold text-white transition hover:bg-[#1747B0] disabled:cursor-not-allowed disabled:bg-[#CBD5E1] cursor-pointer"
            >
              {subiendo && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
              Almacenar en BD y Sincronizar {resumenTotales.total > 0 ? `(${resumenTotales.total})` : ""}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
