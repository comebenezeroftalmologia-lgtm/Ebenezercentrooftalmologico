import { redirect } from "next/navigation";

export default function Home() {
  // Redirigir directamente a Procesos, para que sea la pantalla principal de la aplicación.
  redirect("/procesos");
}
