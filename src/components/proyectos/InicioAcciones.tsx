"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Plus, Share2 } from "lucide-react";
import { BotonPrimario, BotonSecundario } from "@/components/proyectos/ui";
import { EspacioModal } from "@/components/proyectos/CrearEspacioModal";
import { CompartirModal } from "@/components/proyectos/CompartirModal";
import type { Espacio } from "@/lib/proyectos/types";

export function BotonNuevoEspacio({ texto = "Crear espacio" }: { texto?: string }) {
  const [abierto, setAbierto] = useState(false);
  const router = useRouter();
  return (
    <>
      <BotonPrimario onClick={() => setAbierto(true)}>
        <Plus className="h-4 w-4" /> {texto}
      </BotonPrimario>
      {abierto && <EspacioModal onCerrar={() => setAbierto(false)} onCreado={(id) => router.push(`/proyectos/espacio/${id}`)} />}
    </>
  );
}

export function BotonCompartirEspacio({ espacio, yoId }: { espacio: Espacio; yoId: string }) {
  const [abierto, setAbierto] = useState(false);
  return (
    <>
      <BotonSecundario onClick={() => setAbierto(true)}>
        <Share2 className="h-4 w-4" /> Compartir
      </BotonSecundario>
      {abierto && <CompartirModal espacio={espacio} yoId={yoId} onCerrar={() => setAbierto(false)} />}
    </>
  );
}
