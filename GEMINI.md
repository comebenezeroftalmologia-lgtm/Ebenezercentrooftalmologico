# REGLAS GENERALES OBLIGATORIAS DEL USUARIO (CUMPLIMIENTO ESTRICTO E INCONDICIONAL)

Estas reglas tienen máxima prioridad sobre cualquier comportamiento por defecto del agente y son de cumplimiento obligatorio en cada turno:

## 1. CONTESTAR PRIMERO, HACER DESPUÉS
- **PROHIBIDO** ejecutar herramientas (`view_file`, `run_command`, `replace_file_content`, `write_to_file`, etc.) en silencio sin antes responderle al usuario en texto claro, directo y en español.
- Siempre se debe contestar primero a la pregunta, observación o instrucción del usuario antes de realizar cualquier acción técnica.

## 2. NADA SIN APROBACIÓN PREVIA (PROHIBIDO HACER LO QUE AL AGENTE LE DÉ LA GANA)
- **PROHIBIDO** inventar cambios, hacer "unificaciones" no solicitadas o tocar vistas/módulos que el usuario no haya pedido modificar explícitamente.
- **FLUJO OBLIGATORIO:** Primero mostrar o explicar exactamente la propuesta para la vista solicitada -> Esperar la aprobación explícita del usuario -> Solo cuando el usuario apruebe, aplicar exactamente lo aprobado en el código.

## 3. CERO PERMISOS MÚLTIPLES Y CERO ENTREGAS A MEDIAS
- **PROHIBIDO** pedir múltiples autorizaciones seguidas para leer archivos o hacer cambios parciales ("a medias").
- Cuando el usuario autorice ejecutar un cambio, debe aplicarse completo en **un solo comando** (en Windows PowerShell mantener `CommandLine < 9000` caracteres y nunca usar alias reservados de PowerShell como `R`).

## 4. IDENTIDAD DE CADA VISTA EN EBENEZER
- Cada vista (`Inicio /`, `Resumen Analytics /analytics`, `Clientes Potenciales`, `Quirúrgicos`, `No Quirúrgicos`, `Redes Sociales`, `Frecuencias`, `Venta del Día`, `Procesos`, `Proyectos`, `Usuarios`, `Perfil`) debe mostrar únicamente el diseño específico aprobado por el usuario para esa hoja, nunca repetir la misma pantalla entre `Inicio` y `Analytics` ni alterar hojas sin instrucción expresa.

## 5. REVISAR Y VERIFICAR QUE TODO FUNCIONE ANTES DE ENTREGAR
- **PROHIBIDO** decir "Listo" o entregar un cambio sin haber verificado antes que:
  1. Todos los `import`, tipos, llaves y componentes existen y no tienen variables sin usar ni errores de compilación.
  2. El despliegue en producción (`https://www.ebenezer-app.com`) o la compilación local pasó sin errores y responde correctamente.
  3. El cambio cumple al 100 % lo pedido por el usuario sin romper ninguna otra vista.