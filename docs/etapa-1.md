# Etapa 1 · Base comprobable

Revisión del 18 de noviembre de 2026. Entrega preparada para aprobación.

## Resultados ejecutados

| Comprobación | Resultado |
|---|---|
| npm ls --depth=0 | Dependencias directas presentes, sin faltantes reportados. |
| npm run build | TypeScript, Vite y generación del service worker correctos. |
| npm test | 78 pruebas aprobadas, en tres archivos. Incluye dominio, importador, vida y PostgreSQL embebido. |
| npm run test:e2e -- --workers=1 | 17 recorridos existentes aprobados en Chromium, 1,3 minutos. |
| npm run demo | Una demostración adicional aprobada en Chromium, a 390 × 844 px. |

El error anterior de minipass y los ejecutables ausentes no se reprodujeron.
No fue necesario cambiar versiones de dependencias ni volver a instalar para esta entrega.
Las pruebas SQL se ejecutan en PGlite con roles y usuarios simulados.
No se ejecutaron pruebas en Supabase alojado ni teléfonos físicos.

## Demostración reproducible

Ejecutar npm run build y luego npm run demo.
El comando abre un contexto de navegador aislado y genera capturas y un archivo de respaldo en demo-results.
El proceso finaliza al terminar las comprobaciones.

Los datos de tests/pilot-fixture.ts usan fecha fija del 18 de noviembre de 2026, rutina Rocco con cinco días y 31 ejercicios, 25 sesiones completas en cinco semanas y series con incremento semanal.
La mascota es un dragón Cría, con camiseta de Boca y gorra, 625 EXP y 100 de vida.
El monedero queda en 335 de oro después de ambas compras. No se usa el crédito artificial de 10.000 de oro.
Se genera gymbeast-demo.json con formato de respaldo versión 1.
La rutina de demostración completa series/repeticiones ausentes y usa 20 kg como peso de muestra cuando falta una carga externa. Estos valores pertenecen únicamente a la demostración.

La demostración genera inicio.png, entrenar.png, tienda.png y progreso.png.
El conjunto se inserta únicamente en el contexto nuevo de Playwright.
No modifica el espacio local que el titular usa en su navegador.

Para Amigos, pilotFriends fija dos identidades SQL (gabi y leo).
La prueba social de tests/supabase.test.ts usa esas identidades para registrar usuarios, enviar y aceptar una solicitud, compartir una sesión, reaccionar, aceptar un desafío y bloquear.
El tercero sin vínculo queda sin acceso a la actividad.
Esto prepara el escenario reproducible de base de datos. La demostración visual de comparación entre amigos corresponde a la etapa 9.

## Cobertura y brechas

Los recorridos existentes comprueban entrenamiento offline con recarga, premio único, avance del ciclo, importación Rocco, foto y versiones, compra y equipamiento, 48 variantes de mascota, recursos de 41 ejercicios, precarga de series, preferencias y descanso.
La ejecución satisfactoria no acredita revisión visual de todas las prendas ni corrección anatómica de cada ilustración.

No se encontraron fallos que bloquearan esos recorridos.
Permanecen el aviso de tamaño del archivo principal y el caché inicial de aproximadamente 19 MiB.
El trabajo de rendimiento y las comprobaciones físicas están asignados a las etapas 10 y 11.
El inventario vigente está en pendientes.md.
