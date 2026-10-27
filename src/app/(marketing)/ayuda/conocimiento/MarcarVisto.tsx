"use client";

import { useEffect } from "react";
import { marcarAyudaVistaAction } from "../../perfil/actions";

/** Al abrir el Centro de Conocimiento se apaga el globito rojo de Ayuda. */
export function MarcarVisto() {
  useEffect(() => {
    marcarAyudaVistaAction().then(() => window.dispatchEvent(new Event("eb:notificaciones")));
  }, []);
  return null;
}
