// Verificación del nombre dicho por teléfono contra el nombre registrado del afiliado.
// El reconocimiento de voz se equivoca con frecuencia, así que se compara por sonido
// (sin tildes, b/v, s/z/c, ll/y, h muda) y se tolera 1 letra de diferencia en palabras de 4 a 7
// letras y 2 en palabras de 8 o más.

const RELLENO = new Set([
  "de", "del", "la", "las", "los", "y", "e", "mi", "nombre", "es", "soy", "me", "llamo", "el", "se", "completo",
  "senor", "senora", "doctor", "doctora", "don", "dona", "hola", "buenas", "tardes", "dias", "noches",
]);

/** Pasa a minúsculas sin tildes ni signos y unifica letras que suenan igual en español. */
export function fonetico(texto: string): string {
  let s = texto
    .toLowerCase()
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/[^a-z\s]/g, " ");
  s = s
    .replace(/qu(?=[ei])/g, "k")
    .replace(/gu(?=[ei])/g, "g")
    .replace(/c(?=[ei])/g, "s")
    .replace(/[cq]/g, "k")
    .replace(/z/g, "s")
    .replace(/v/g, "b")
    .replace(/w/g, "u")
    .replace(/ll/g, "y")
    .replace(/x/g, "ks")
    .replace(/h/g, "")
    .replace(/(.)\1+/g, "$1");
  return s.replace(/\s+/g, " ").trim();
}

function distancia(a: string, b: string): number {
  if (a === b) return 0;
  const m = a.length;
  const n = b.length;
  let prev = Array.from({ length: n + 1 }, (_, j) => j);
  for (let i = 1; i <= m; i++) {
    const cur = [i];
    for (let j = 1; j <= n; j++) {
      cur[j] = Math.min(prev[j] + 1, cur[j - 1] + 1, prev[j - 1] + (a[i - 1] === b[j - 1] ? 0 : 1));
    }
    prev = cur;
  }
  return prev[n];
}

function palabrasSignificativas(texto: string): string[] {
  return fonetico(texto)
    .split(" ")
    .filter((p) => p && !RELLENO.has(p));
}

function palabraCoincide(registrada: string, dichas: string[]): boolean {
  const tol = registrada.length >= 8 ? 2 : registrada.length >= 4 ? 1 : 0;
  return dichas.some((d) => distancia(registrada, d) <= tol);
}

/** Un campo (p. ej. "DE LA CRUZ") coincide si todas sus palabras significativas aparecen en lo dicho. */
function campoCoincide(campo: string | null | undefined, dichas: string[]): boolean | null {
  const palabras = palabrasSignificativas(campo ?? "");
  if (palabras.length === 0) return null; // campo vacío: no cuenta
  return palabras.every((p) => palabraCoincide(p, dichas));
}

export type RegistroNombre = {
  primer_nombre: string | null;
  segundo_nombre: string | null;
  primer_apellido: string | null;
  segundo_apellido: string | null;
};

export type Verificacion = "coincide" | "parcial" | "no_coincide";

/**
 * Regla: el documento ya coincide (se buscó por él). Además debe coincidir AL MENOS UNO de los
 * nombres (primero o segundo) y TODOS los apellidos registrados (primero y, si existe, segundo).
 * "parcial" = coincide algo pero no lo suficiente (se vuelve a preguntar); "no_coincide" = nada.
 */
export function verificarNombre(hablado: string, reg: RegistroNombre): Verificacion {
  const dichas = palabrasSignificativas(hablado);
  if (dichas.length === 0) return "no_coincide";

  const nombres = [campoCoincide(reg.primer_nombre, dichas), campoCoincide(reg.segundo_nombre, dichas)].filter(
    (x): x is boolean => x !== null,
  );
  const apellidos = [campoCoincide(reg.primer_apellido, dichas), campoCoincide(reg.segundo_apellido, dichas)].filter(
    (x): x is boolean => x !== null,
  );

  const nombreOk = nombres.length === 0 ? true : nombres.some(Boolean);
  const apellidosOk = apellidos.length === 0 ? true : apellidos.every(Boolean);
  if (nombreOk && apellidosOk) return "coincide";

  const algo = nombres.some(Boolean) || apellidos.some(Boolean);
  return algo ? "parcial" : "no_coincide";
}
