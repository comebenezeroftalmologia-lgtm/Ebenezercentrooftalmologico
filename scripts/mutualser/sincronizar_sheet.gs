/**
 * Sincroniza la hoja de afiliados de MutualSer con la plataforma de Ebenezer.
 * La hoja es la fuente: quien la edite, el bot lo ve en la siguiente sincronización.
 *
 * INSTALACIÓN (una sola vez, en el Google Sheets nativo "afiliados_mutual"):
 *  1. Extensiones > Apps Script. Pegue este archivo completo y guarde.
 *  2. Configuración del proyecto (engranaje) > Propiedades del script > agregar:
 *       MUTUAL_SYNC_KEY = (la misma llave que está en Vercel como MUTUAL_SYNC_KEY)
 *  3. Ejecute una vez "crearDisparadorDiario" (autorice los permisos) para que sincronice sola cada noche.
 *  4. Recargue la hoja: aparece el menú "Bot de citas > Sincronizar ahora".
 */
const URL_SYNC = 'https://www.ebenezer-app.com/api/bot/mutual/sincronizar';
const NOMBRE_HOJA = 'Consolidado';
const TAM_LOTE = 1500;
const COLUMNAS = [
  'TIPO DOC BENEFICIARIO', 'DOC BENEFICIARIO', 'PRIMER APELLIDO', 'SEGUNDO APELLIDO',
  'PRIMER NOMBRE', 'SEGUNDO NOMBRE', 'FECHA NACIMIENTO', 'SEXO', 'REGIMEN (por archivo)',
  'ESTADO', 'CODI DEPARTAMENTO DNP', 'CODI MUNICIPIO DNP',
  'CODI DEPARTAMENTO ATENCION', 'CODI MUNICIPIO ATENCION', 'FECHA BASE DE DATOS'
];

function onOpen() {
  SpreadsheetApp.getUi().createMenu('Bot de citas').addItem('Sincronizar ahora', 'sincronizarManual').addToUi();
}

function sincronizarManual() {
  const r = sincronizar();
  SpreadsheetApp.getUi().alert('Sincronización lista: ' + r.afiliados + ' afiliados en el bot (' + r.eliminados + ' eliminados).');
}

function crearDisparadorDiario() {
  ScriptApp.getProjectTriggers().filter(function (t) { return t.getHandlerFunction() === 'sincronizar'; })
    .forEach(function (t) { ScriptApp.deleteTrigger(t); });
  ScriptApp.newTrigger('sincronizar').timeBased().everyDays(1).atHour(2).create();
}

function llamar_(cuerpo) {
  const llave = PropertiesService.getScriptProperties().getProperty('MUTUAL_SYNC_KEY');
  if (!llave) throw new Error('Falta la propiedad MUTUAL_SYNC_KEY del script.');
  const resp = UrlFetchApp.fetch(URL_SYNC, {
    method: 'post', contentType: 'application/json', headers: { 'x-sync-key': llave },
    payload: JSON.stringify(cuerpo), muteHttpExceptions: true
  });
  if (resp.getResponseCode() !== 200) {
    throw new Error('El servidor respondió ' + resp.getResponseCode() + ': ' + resp.getContentText().slice(0, 300));
  }
  return JSON.parse(resp.getContentText());
}

function sincronizar() {
  const hoja = SpreadsheetApp.getActive().getSheetByName(NOMBRE_HOJA);
  if (!hoja) throw new Error('No existe la hoja "' + NOMBRE_HOJA + '".');
  const valores = hoja.getDataRange().getValues();
  const encabezados = valores[0].map(function (h) { return String(h).trim(); });
  const idx = {};
  COLUMNAS.forEach(function (c) { idx[c] = encabezados.indexOf(c); });
  if (idx['DOC BENEFICIARIO'] < 0 || idx['ESTADO'] < 0) {
    throw new Error('Faltan las columnas "DOC BENEFICIARIO" o "ESTADO" en la fila 1.');
  }
  const tz = Session.getScriptTimeZone();
  const vistos = {};
  const filas = [];
  for (let i = 1; i < valores.length; i++) {
    const doc = String(valores[i][idx['DOC BENEFICIARIO']]).replace(/[^0-9A-Za-z]/g, '').toUpperCase();
    if (!doc || vistos[doc]) continue; // sin documento o repetido: se omite
    vistos[doc] = true;
    const o = {};
    COLUMNAS.forEach(function (c) {
      if (idx[c] < 0) return;
      let v = valores[i][idx[c]];
      if (v instanceof Date) v = Utilities.formatDate(v, tz, 'yyyy-MM-dd');
      o[c] = (v === null || v === undefined) ? '' : String(v);
    });
    filas.push(o);
  }
  const syncId = Utilities.formatDate(new Date(), 'America/Bogota', 'yyyyMMdd-HHmmss');
  const fechaCorte = filas.length && filas[0]['FECHA BASE DE DATOS'] ? filas[0]['FECHA BASE DE DATOS'] : '';
  let omitidas = 0; // filas que el servidor descarta (documento inválido o sin ESTADO)
  for (let k = 0; k < filas.length; k += TAM_LOTE) {
    const r = llamar_({ sync_id: syncId, fecha_corte: fechaCorte, filas: filas.slice(k, k + TAM_LOTE) });
    omitidas += (r && r.omitidas) || 0;
  }
  return llamar_({ sync_id: syncId, finalizar: true, esperadas: filas.length - omitidas });
}
