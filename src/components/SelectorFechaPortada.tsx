"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { useTransition } from "react";
import { Calendar } from "lucide-react";

/* ---------------------------------------------------------------------
   ELEGIR EL DIA QUE SE QUIERE VER.

   La portada abre en el ULTIMO DIA CERRADO, no en hoy. No es un detalle:
   el 21-10-2026 a las 8:50 de la manana la tarjeta de asistencia marcaba
   "19%" —104 atendidos de 548 agendados— y se leia como un desplome,
   cuando lo unico que pasaba era que la jornada llevaba hora y media.

   El motor ya habia aprendido esto y lo dejo escrito en dashboard.py:
   "NUNCA se muestra el dia en curso... el dia apenas iba empezando, pero
   en rojo y en grande parecia una caida". Aqui se respeta la misma regla.

   Quien quiera ver el dia de hoy puede: lo elige, y entonces la pantalla
   avisa que la jornada va corriendo y deja de mostrar porcentajes de
   cumplimiento, que es lo unico que no se puede leer a media manana.
   --------------------------------------------------------------------- */
export function SelectorFechaPortada({
  fecha,
  maximo,
}: {
  /** Fecha activa, AAAA-MM-DD. */
  fecha: string;
  /** Hasta que dia se puede elegir (hoy). */
  maximo: string;
}) {
  const router = useRouter();
  const params = useSearchParams();
  const [pendiente, empezar] = useTransition();

  const cambiar = (nueva: string) => {
    if (!nueva) return;
    const p = new URLSearchParams(params.toString());
    p.set("fecha", nueva);
    empezar(() => router.push(`/?${p.toString()}`));
  };

  const esHoy = fecha === maximo;

  return (
    <div className="flex items-center gap-2">
      {esHoy ? (
        <span className="hidden sm:inline-flex items-center rounded-full border border-[#FDE68A] bg-[#FFFBEB] px-2.5 py-1 text-[11px] font-semibold text-[#92400E]">
          Jornada en curso
        </span>
      ) : null}
      <label className="relative inline-flex items-center">
        <Calendar
          className="pointer-events-none absolute left-2.5 h-3.5 w-3.5 text-[#3B4F8D]"
          strokeWidth={1.9}
        />
        <input
          type="date"
          value={fecha}
          max={maximo}
          onChange={(e) => cambiar(e.target.value)}
          aria-label="Día que se muestra"
          className={`h-[32px] rounded-[8px] border border-[#DCE5F2] bg-white pl-8 pr-2.5 text-[12px] font-medium text-[#0E245E] outline-none transition focus:border-[#1D58D8] ${
            pendiente ? "opacity-60" : ""
          }`}
        />
      </label>
    </div>
  );
}
