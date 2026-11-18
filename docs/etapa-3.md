# Etapa 3 · Persistencia, sincronización y recuperación

Entrega local del 18 de noviembre de 2026. Pendiente de validación en el proyecto alojado del titular.

## Cambios implementados

- IndexedDB conserva datos por cuenta, una cola ordenada y el punto de descarga. La versión 4 migra las operaciones anteriores sin borrar los registros existentes.
- Cada guardado escribe el registro y su operación en una transacción. El registro de serie incluye el inicio del descanso en esa transacción.
- Los envíos usan hasta 50 operaciones por lote y aproximadamente 1 MB por solicitud. El servidor limita los lotes a 2 MB.
- Los reintentos conservan el UUID. El servidor guarda el resultado y una huella SHA-256 del pedido para detectar un UUID reutilizado con otros datos.
- Una operación inválida bloquea su registro y permite continuar con entidades independientes.
- La descarga usa páginas de hasta 250 eventos desde un cursor persistente. Aplica los datos y avanza el cursor en la misma transacción.
- El contador de eventos se bloquea por cuenta y forma parte de la transacción de escritura. Una transacción que revierte no adelanta el contador.
- Las eliminaciones viajan como eventos y conservan una revisión para impedir que una edición antigua resucite el registro.
- Dos series independientes se fusionan. Dos ediciones de la misma serie, rutina o perfil conservan la versión local pendiente y muestran la versión sincronizada.
- Los conflictos muestran resúmenes de ambas versiones y permiten examinar todos los campos. Los rechazos se pueden corregir y reenviar, o descartar con confirmación.
- Las pestañas usan Web Locks cuando está disponible. La idempotencia y las transacciones siguen siendo necesarias para dispositivos independientes.
- Al abrir una cuenta en un dispositivo nuevo se completa la primera descarga antes de ofrecer onboarding.
- Los cambios remotos de Perfil actualizan los campos visibles sin pisar un borrador que todavía se está escribiendo.
- Cuando Auth confirma user_not_found, se limpia el espacio descargado de esa cuenta y se vuelve al acceso. Una caída de conexión no borra datos.

El descanso es un estado del dispositivo. Se conserva offline y no genera conflictos entre series agregadas desde dos teléfonos.
Las sesiones, series, pesos, repeticiones y finalización sí se sincronizan.

## Restricciones y economía

La referencia de una serie a su sesión se materializa con columnas generadas y una clave foránea por cuenta.
El servidor comprueba que el ejercicio pertenezca a la instantánea de sesión, que el peso no sea negativo y que las referencias de rutina y planificación sean propias.
Las referencias históricas a una rutina o planificación eliminada se mantienen mediante sus revisiones de eliminación.
La clave foránea se incorpora como NOT VALID para conservar registros anteriores. Las escrituras nuevas sí se verifican. Auditar los datos históricos antes de validar la restricción completa está anotado en cierre-final.md.

La bitácora del monedero registra premios, compras y compensaciones. Su migración conserva el saldo confirmado anterior.
Al quitar la elegibilidad de una sesión se compensan EXP y oro, incluyendo los hitos iniciales que dejen de cumplirse.
Los clientes no pueden escribir en esa bitácora.
El saldo de cuentas sincronizadas se descarga desde el servidor y usa los precios pagados, evitando recalcular compras antiguas con los precios actuales del catálogo.
La EXP y oro adicionales por aumentar peso se implementarán en la etapa 7.

## Respaldo administrativo

Se conserva la herramienta npm run accounts:admin y sus variables GYMBEAST_ADMIN_URL y GYMBEAST_ADMIN_SECRET.
Los comandos nuevos son los siguientes.

- backup USUARIO ARCHIVO crea un archivo nuevo con registros, premios, compras y bitácora.
- restore USUARIO ARCHIVO [UUID] reemplaza esos datos después de confirmar el usuario en una terminal interactiva.
- delete USUARIO elimina identidad, entrenamientos, compras y vínculos después de escribir ELIMINAR seguido del usuario.

El respaldo se vincula al UUID de una cuenta existente. La restauración conserva IDs y eleva revisiones para que los dispositivos reciban el estado recuperado.
Una restauración fallida revierte todos los cambios.
El comando muestra el UUID de restauración antes de enviarla. Reutilizarlo al repetir una respuesta perdida evita volver a ejecutar la operación.
El archivo tiene versión 1, formato gymbeast-account y un checksum para detectar corrupción. Las cifras decimales se normalizan antes de calcularlo para conservarlo al pasar por JSON y JavaScript.
La restauración vuelve a comprobar el checksum, las relaciones y el saldo de la bitácora.
Los archivos admiten hasta 50 MB. Deben guardarse en una ubicación privada del administrador.

El respaldo por cuenta cubre entrenamiento y economía. Las relaciones sociales actuales permanecen durante una restauración, para respetar las decisiones vigentes de los demás usuarios.
La eliminación sí aplica las cascadas a los vínculos sociales.
La recuperación de una identidad que ya se eliminó y el respaldo global de Auth requieren el procedimiento de respaldo de todo PostgreSQL que se preparará en la salida del piloto.

## Despliegue

1. Aplicar 202611180012_durable_sync.sql después de las migraciones anteriores.
2. Publicar el frontend que usa sync_push, sync_pull y sync_record.
3. Mantener los proyectos y secretos configurados según etapa-2.md.
4. Comprobar dos dispositivos reales contra el mismo proyecto antes de abrir el piloto.

apply_change conserva su firma para los clientes anteriores. Para recibir eliminaciones y usar el cursor, esos clientes deben actualizar la PWA.
La descarga incremental conserva su historial completo en esta entrega. La capacidad y la política de retención se evaluarán en la etapa 11.

## Pruebas

- 112 pruebas de dominio, manejador de acceso y PostgreSQL embebido aprobadas.
- 18 recorridos generales aprobados en Chromium.
- Once recorridos de cuentas/sincronización. Los seis de acceso usan transporte simulado. Los cinco de sincronización ejecutan las RPC de las migraciones reales en PGlite mediante un transporte HTTP de prueba.
- Los escenarios nuevos recorren un día offline con recarga y respuesta perdida, recuperación desde otro dispositivo, aislamiento de otra cuenta, series independientes, conflicto de peso, eliminación remota, dos pestañas, borrado de cuenta y migración de IndexedDB versión 3 con operaciones pendientes.
- El servidor de Auth sigue simulado en esos recorridos. PGlite tiene una conexión; falta comprobar la concurrencia con conexiones reales de Supabase.
- Los escenarios SQL comprueban permisos, referencias cruzadas, migración de saldos, compensaciones, respaldo corrupto, restauración repetida y cascadas de eliminación.

Los pasos de cierre que necesitan servidor alojado, teléfonos y mediciones finales están en cierre-final.md.
