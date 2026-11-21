# Etapa 7 · Premio por aumentar el peso

Entrega del 19 de noviembre de 2026. La ropa y los accesorios actuales se conservan.

## Implementado

- Una sesión elegible conserva sus 25 EXP de cuenta, 25 EXP de mascota y 20 de oro de base.
- Cada ejercicio que supera su mayor carga válida histórica agrega 5 EXP de cuenta, 5 EXP a la mascota que acompañó la sesión y 5 de oro. Máximo tres movimientos distintos: 40 EXP y 35 de oro por sesión, también en la cuarta sesión del día.
- La primera carga registrada establece la referencia. Las repeticiones pueden ser distintas. Se comparan kilogramos canónicos, no las cifras mostradas en kg o lb.
- Se separan variante y modalidad. El catálogo usa su identificador estable; los ejercicios propios usan su UUID incluso al renombrarse. Los registros antiguos sin UUID usan el nombre exacto normalizado.
- Calentamientos, series sin repeticiones válidas o sin peso, sesiones abiertas/incompletas, duraciones, carga desconocida, peso corporal y asistencia quedan fuera del bonus. Se comparan cargas externas totales o por lado; aumentar asistencia no es una mejora.
- La referencia solo toma sesiones terminadas antes de empezar la actual. Una sesión simultánea no se convierte en referencia retroactiva.
- La pantalla final muestra el total, el premio base y hasta tres ejercicios mejorados con carga anterior/nueva y premio individual. La EXP extra participa del crecimiento existente de la mascota.
- En cuentas offline se conserva el estado de recompensa pendiente hasta recibir confirmación. No se acredita saldo provisional para comprar.
- El servidor conserva una fila por sesión y una identidad única por ocurrencia. Un reintento sin cambios no genera movimientos adicionales en el monedero. Las correcciones actualizan el premio y la bitácora agrega solo la diferencia.
- Una corrección histórica, eliminación o carga offline tardía recalcula las sesiones posteriores afectadas. En local se deriva el saldo del historial actual; en cuentas se registran ajustes transaccionales. Si una corrección reduce el saldo, no permite nuevas compras sin fondos ni vuelve a comprar artículos ya adquiridos.
- La migración recupera bonos de sesiones anteriores elegibles sin duplicar sus premios. Los respaldos de cuenta conservan el desglose y recalculan también los respaldos anteriores sin ese campo al restaurarlos.

## Comprobaciones

- Compilación correcta y 194 pruebas de dominio/SQL aprobadas.
- Los 24 recorridos generales de navegador aprobaron, incluidos importación, rutinas, ropa, tienda, historial y entrenamiento offline.
- Casos nuevos: menos repeticiones, máximo histórico, cambio de unidad, cuatro mejoras, calentamiento, variantes/modalidades, UUID propio, corrección de referencia y reintentos por ocurrencia.
- PostgreSQL embebido: compensaciones del monedero, referencia recibida tarde, eliminación de series, cambio de inicio de una sesión histórica, cuarta sesión del día, aislamiento, permisos de escritura, respaldo y restauración idempotente.
- Compatibilidad con instantáneas antiguas sin clasificación: conservan el premio base y no rompen la app. El cálculo local indexa las series una sola vez por actualización, evitando recorrerlas de nuevo para cada ejercicio histórico.
- Chromium a 320 px y WebKit a 390 px: registrar cuatro mejoras, finalizar offline, ver tres bonos, recargar y comprobar saldo sin duplicados. Capturas en docs/qa/etapa-7.
- Los once recorridos de acceso/sincronización existentes aprobaron. Un recorrido adicional usa el servidor SQL de prueba para finalizar offline, perder una respuesta, reintentar y descargar el premio y sus tres mejoras en un segundo navegador.

Para repetir: npm test; npm run build; npx playwright test --config playwright.stage-seven.config.ts --workers=1; npm run test:accounts.

Evidencia: [premio a 320 px](qa/etapa-7/premio-320-chromium.png) y [premio a 390 px](qa/etapa-7/premio-390-webkit.png).

## Pendientes para el cierre final

- Aplicar 202611190014_load_bonus.sql después de las migraciones anteriores en Supabase del titular. Repetir allí la sincronización, correcciones, compras y restauración con conexiones independientes.
- Probar el recorrido en iPhone y Android físicos. Chromium/WebKit y el transporte de prueba no equivalen a dispositivos reales ni a Supabase Auth alojado.
- Medir el costo de reconciliar historiales extensos en las etapas de rendimiento/capacidad. Las ediciones normales recalculan la sesión afectada y las posteriores; migración, restauración y eliminación de una sesión pueden recorrer el historial completo.
- La compilación mantiene el aviso de tamaño del archivo principal, reservado para etapa 10. No se amplió el alcance a misiones, vida/evolución o comparación social de etapas 8–9.
