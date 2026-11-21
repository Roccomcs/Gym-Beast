# Etapa 11 · Capacidad, publicación y documentación

19/11/2026. **Trabajo local implementado y comprobado; publicación y aceptación alojada/física pendientes.** No se habilitó facturación, no se crearon cuentas remotas ni se publicó una versión sin conexión real.

## Completado

- Ensayo reproducible de 100 propietarios con 52 semanas, cinco entrenamientos semanales y veinte series por entrenamiento: **26.000 sesiones, 520.000 series y 650.200 UUID de operaciones**. Identificadores de tamaño UUID, una foto de rutina y un avatar por cuenta, tres compras y 52 publicaciones por persona, con relaciones/reacciones sintéticas. Las fotos son cargas aleatorias del tamaño permitido, no fotografías renderizadas.
- Migraciones 017–020: respuestas idempotentes compactas, diario sin duplicación de snapshots, cursor de las series en su propia fila, compresión de JSONB nuevo, consulta privada de almacenamiento y compactación administrativa. Se conservan identidad/huella de cada operación, tombstones, historial y ledger. No se aplica retención temporal a entrenamientos ni premios.
- Generación global de recuperación: después de restaurar todo el proyecto, los dispositivos actualizados pueden descartar su copia confirmada anterior y descargar nuevamente, conservando cambios pendientes y conflictos. Ensayado un cursor local mayor que el servidor y una edición pendiente durante otra recuperación.
- Comandos de administración para consultar espacio, compactar y reconciliar recuperación global. Se mantienen invitaciones, recuperación de clave, respaldo/restauración de cuenta y eliminación con confirmación.
- Control de salida de publicación: manifest/íconos, navegación, archivos y límites, referencias administrativas y configuración pública de cuentas. La salida real tiene **246 archivos, 138,81 MB y máximo de 1,75 MB por archivo**. La publicación con cuentas requiere el modo `--accounts`; no se marca lista con un build local sin Supabase.
- Herramienta de comprobación HTTPS/CORS, encabezados de publicación, Node fijado, guía de despliegue, respaldo global y recuperación/rollback. Documentación activa actualizada a usuario/contraseña, 2D, Obsidiana dorada y accesorios retirados. Avisos de licencia de las 22 dependencias de producción generados sin archivos de licencia ausentes.

## Capacidad medida

La base es PostgreSQL embebido en PGlite con las migraciones reales. Se carga un año ya consolidado mediante importación masiva: no representa 100 conexiones HTTP simultáneas ni el funcionamiento de Auth real. Se desactiva la reproducción de premios durante esa carga y se incorpora su ledger conocido; después se prueba una sesión real mediante `sync_push`, con sus veinte series y finalización.

| Dato | Resultado |
|---|---:|
| Tablas/índices de la app antes del mantenimiento | 498.262.016 bytes |
| Tablas/índices después del mantenimiento | **447.889.408 bytes** |
| Margen frente al presupuesto conservador de 500 MB | 52.110.592 bytes |
| Diario adicional de cambios | 52.200 filas; las series llevan revisión propia |
| Movimientos de monedero | 26.300 |
| Primera página de sincronización, cinco consultas | 11,9–17,1 ms; 424.122 bytes |
| Primera descarga completa de una cuenta | 2.068.566 bytes, 23 páginas |
| Respaldo de una cuenta completa | 1.922.317 bytes; 728,5 ms |
| Subir una sesión completa con veinte series | 667,3 ms |
| Reintentar exactamente ese lote | 1,6 ms; misma respuesta y un solo premio |

Los tamaños se toman antes de esa sesión de comprobación. El tiempo de servidor del lote completo no es el tiempo de registrar una serie local de etapa 10. Las duraciones corresponden a este equipo y no son garantías de Supabase ni del teléfono.

El mantenimiento del ensayo fue `VACUUM FULL sync_heads` y reconstrucción de índices de training_items/training_operations. PGlite no tiene autovacuum en segundo plano. Se informa el tamaño anterior para no esconder la condición: **sin mantenimiento no queda margen para Auth**. Incluso después, 52 MB es un margen ajustado para Auth, tablas administradas y crecimiento. La aserción local reserva 50 MB adicionales a las tablas públicas; ese presupuesto no demuestra cuánto ocupará Auth alojado. El escenario de diez amigos también se ejecutó: 2.600 sesiones y 52.000 series, 45.481.984 bytes públicos después del mantenimiento (50.741.248 antes). El piloto abre con ese grupo; ampliar a cien requiere medir el proyecto completo y mantener margen real.

El primer ensayo exploratorio ocupaba 650 MB y fallaba el presupuesto, incluso con IDs cortos. Se guarda como `capacity-100-before.json`; usa una carga distinta y no se presenta como una comparación porcentual exacta con la final. `capacity-100-intermediate.json` conserva la iteración anterior con UUID. El informe vigente es **`qa/etapa-11/capacity-100.json`**.

Repetir: `npm run test:capacity`. Para diez cuentas, en PowerShell: `$env:GYMBEAST_CAPACITY_ACCOUNTS='10'; npm run test:capacity; Remove-Item Env:\GYMBEAST_CAPACITY_ACCOUNTS`. La base es descartable y no usa claves ni proyectos reales. La prueba requiere memoria adicional y tarda alrededor de 75 segundos para cien cuentas.

## Tráfico, fotos y cuotas

Una descarga inicial medida por cada una de cien cuentas suma unos **207 MB de JSON**, sin sumar transporte/Auth. Veintidós sesiones mensuales para cien personas producen unos 19,3 MB de **subida** de operaciones en esta carga; la subida no se confunde con la cuota de salida. Fotos, publicaciones, comparaciones, renovaciones de sesión, descargas repetidas y encabezados requieren medición alojada. El modelo no valida el tráfico social de cien personas ni ofrece capacidad ilimitada.

Las fotos se procesan hasta 380 px y menos de 90.000 caracteres por imagen. El ensayo incluye dos por cuenta; más rutinas con foto y versiones aumentarán el tamaño. Las ilustraciones de entrenamiento, unos 139 MB de salida estática total, se sirven desde Pages y se cachean a demanda. Las cuotas oficiales consultadas el 19/11/2026 se registran en [operación](operacion.md): [Supabase Free](https://supabase.com/pricing), [salida Supabase](https://supabase.com/docs/guides/platform/manage-your-usage/egress) y [Pages Free](https://developers.cloudflare.com/pages/platform/limits/). Verificar el Dashboard y mantener Free, sin facturación.

## Comprobaciones

- Compilación de producción local y variante de cuentas correctas.
- 232 pruebas de dominio, SQL, permisos, actualización desde la migración 016 y controles de publicación.
- 15 recorridos de cuentas/sincronización con Auth simulado, incluyendo recuperación global, cambios pendientes, reintentos y aislamiento. El nuevo recorrido de recuperación también pasó en WebKit; `npm run test:recovery` lo repite con la API simulada y service worker bloqueado para interceptar su transporte.
- 25 recorridos generales de navegador, más la evidencia móvil Chromium/WebKit de etapa 10. No se repite ni se presenta esa evidencia como teléfonos físicos.
- Función accounts comprobada con Deno. Script de respaldo global revisado sintácticamente; no ejecutado contra un proyecto.
- Seis recorridos finales de reapertura offline pasaron en Chromium/WebKit a 320/390/430 px después de incorporar los avisos de licencia a la caché.
- Salida estática comprobada con `npm run check:release`. La conexión publicada queda deliberadamente en falso; no había variables de Supabase/Cloudflare ni proyectos conectados. El chequeo HTTPS real no se ejecutó.

Resumen estructurado y condiciones restantes: `qa/etapa-11/results.json`.

## Segunda revisión de pendientes

Se resolvieron localmente el exceso inicial de almacenamiento, los datos repetidos del diario, la respuesta de reintentos, la recuperación con cursor adelantado, la conservación de cambios pendientes y los controles de publicación. Se agregó evidencia de migración de datos existentes, permisos administrativos y operación de un lote real después de cargar el año de historial.

No se puede sustituir por una simulación lo que falta: permisos del proyecto Supabase/Pages del titular, CLI Supabase y motor Docker para el respaldo global, Auth y HTTP reales, y los teléfonos. Las guías quedan listas para ejecutar, pero una guía no equivale a un ensayo aprobado.

## Tercera revisión contra el pedido

El flujo mantiene acceso sencillo, sesión persistente, sincronización automática, perfil privado, entrenamiento offline y premios confirmados por servidor. Se preservan ropa actual, mascotas 2D y la interfaz elegida. No se reintroducen correo, 3D, accesorios retirados ni controles eliminados. La documentación distingue la medición de cien cuentas de la apertura inicial a diez amigos y no promete almacenamiento ilimitado.

**Falta para abrir el piloto:** aplicar migraciones y desplegar accounts/Pages, comprobar dos cuentas reales y compras/premios/conflictos, ensayar dumps/restauración global y rollback, medir tamaño completo y cuotas alojadas, y completar iPhone/Android con lectores de pantalla. Los pasos están en [publicación](publicacion.md), [operación](operacion.md), [guía física](prueba-en-telefono.md) y [cierre final](cierre-final.md). El piloto continúa marcado como no listo.
