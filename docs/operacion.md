# Operación del piloto

Fecha: 19/11/2026. Responsable: titular del proyecto. Acceso por usuario/contraseña con invitación; sesión persistente. El grupo inicial es de diez amigos. Ampliar solo después de medir las cuotas reales.

## Administración

En una terminal privada configurar `GYMBEAST_ADMIN_URL` y `GYMBEAST_ADMIN_SECRET` con la URL y la clave administrativa de Supabase. No usar prefijo `VITE_`, guardar en Git ni compartir capturas de esa terminal. Los comandos no funcionan hasta conectar el proyecto.

| Acción | Comando |
|---|---|
| Consultar almacenamiento | `npm run accounts:admin -- status` |
| Crear diez invitaciones de un uso | `npm run accounts:admin -- invite 10` |
| Revocar una invitación | `npm run accounts:admin -- revoke CODIGO` |
| Recuperar acceso | `npm run accounts:admin -- reset USUARIO` |
| Respaldar cuenta | `npm run accounts:admin -- backup USUARIO RUTA-NUEVA.json` |
| Restaurar cuenta | `npm run accounts:admin -- restore USUARIO RUTA.json UUID-OPERACION` |
| Eliminar cuenta | `npm run accounts:admin -- delete USUARIO` |
| Compactar eventos reemplazados | `npm run accounts:admin -- compact` |
| Reconciliar tras restauración global | `npm run accounts:admin -- recover-sync` |

La clave temporal se comparte en privado y debe cambiarse al entrar. Restauración, eliminación y recuperación global requieren confirmación en terminal interactiva. Para reintentar una restauración, conservar el mismo UUID. El respaldo por cuenta incluye entrenamiento, premios, compras y monedero; no recrea una identidad Auth eliminada ni reemplaza las decisiones sociales actuales.

## Respaldo

Antes de migraciones y durante el piloto, crear respaldos por cuenta y un respaldo global fuera del proyecto publicado. Objetivo operativo inicial: respaldo diario y antes de cambios; conservar siete diarios y cuatro semanales en almacenamiento privado con espacio comprobado. Es una tarea del operador, **no hay un respaldo alojado automático configurado**. Ensayar recuperación periódicamente; comprobar archivos vacíos y hashes.

Con la CLI instalada, proyecto correctamente vinculado y Docker en ejecución:

`powershell -File scripts/backup-project.ps1 -Destination C:\RUTA-PRIVADA\GymBeast-2026-11-19`

La carpeta debe ser nueva. El script genera roles, esquema, datos y SHA-256; deja `INCOMPLETE.txt` si falla. Estos archivos contienen datos privados e identidades: cifrar y guardar fuera del repositorio. Confirmar que el dump incluya `auth.users`, identidades y las tablas de la app. El esquema administrado de Auth/Storage y sus personalizaciones requieren el procedimiento compatible con la versión de CLI/proyecto. Los archivos de Storage, secretos de funciones y configuración de Auth no se recuperan solo con SQL; guardar su inventario por separado. Las fotos actuales de GymBeast son datos compactados dentro de PostgreSQL.

Supabase recomienda exportaciones propias para proyectos Free; no se presupone respaldo diario administrado ni PITR. Seguir su [procedimiento oficial de respaldo y restauración](https://supabase.com/docs/guides/platform/migrating-within-supabase/backup-restore), consultado el 19/11/2026. Este entorno no tenía Docker iniciado, CLI Supabase ni proyecto conectado: el respaldo global **no se ejecutó ni se declaró restaurable**.

## Recuperar todo el proyecto

1. Usar un proyecto de prueba vacío y una ventana de mantenimiento. Detener escrituras del servicio durante la recuperación. Conservar otra copia del estado actual y verificar SHA-256 del respaldo.
2. Restaurar roles/esquema/datos siguiendo el procedimiento oficial para Supabase, con parada ante el primer error; no pegar SQL de restauración sobre producción sin ensayo. Recuperar también Auth, secretos/configuración y archivos externos que existan.
3. Comprobar las migraciones y restricciones. Reaplicar únicamente las posteriores a la copia. Verificar UUID, perfiles, sesiones, premios, compras, monedero y bloqueo con dos cuentas.
4. Ejecutar `recover-sync` **después** de restaurar la base. Cambia una generación global. Los clientes actualizados detectan el cambio aunque su cursor/versión sea mayor que el del respaldo, limpian su copia confirmada y descargan nuevamente. Conservan operaciones pendientes para reintento/conflicto; no prometer que los datos confirmados posteriores al respaldo existan en la copia recuperada.
5. Revisar cambios pendientes que hagan referencia a sesiones ausentes del respaldo. No descartarlos sin inspección. Clientes antiguos sin soporte de generación deben actualizar antes de volver a sincronizar.
6. Probar entrada real, otra instalación y reconexión. Solo entonces reabrir el grupo. Se probó localmente cursor adelantado, recarga y conflicto pendiente; Auth global real y recuperación desde dumps siguen pendientes.

## Cuotas y mantenimiento

Revisar semanalmente Dashboard de Supabase y `status`, y antes de cada tanda de invitaciones. Umbrales de acción: 350 MB revisar crecimiento; 400 MB reducir nuevas altas/fotos y respaldar; 450 MB detener nuevas invitaciones hasta recuperar margen. Se refieren al **tamaño completo real del proyecto**, no solo a tablas de GymBeast. No borrar sesiones, UUID de operaciones, monedero o marcas de eliminación por antigüedad.

`compact` elimina exclusivamente eventos sustituidos del mismo registro y ventanas vencidas del limitador de acceso. Conserva el último evento para que un teléfono atrasado pueda recuperar el estado actual. Las series llevan su cursor en la misma fila y no duplican su payload en el diario. La compactación libera filas, pero puede no devolver espacio físico al instante.

En una ventana de mantenimiento, tras respaldo y medición, el administrador PostgreSQL puede recuperar espacio con estas instrucciones **separadas, fuera de una transacción**:

```sql
VACUUM (FULL, ANALYZE) public.sync_heads;
REINDEX TABLE public.training_items;
REINDEX TABLE public.training_operations;
```

Bloquean tablas y necesitan espacio temporal. No se ejecutan automáticamente en producción ni desde una RPC. Autovacuum ayuda a reutilizar espacio, pero no garantiza reducir el archivo. Las mediciones locales de 100 cuentas dependen de este mantenimiento; antes de él el margen era insuficiente para Auth. Para un proyecto existente, las migraciones no reescriben mágicamente todas las filas: medir y planificar una reescritura/compactación con respaldo antes de ampliar el grupo.

Presupuesto conservador Free: 500 MB de base y 5 GB mensuales de salida no cacheada. Las imágenes públicas se sirven en Pages, no en Supabase Storage. Auth, funciones, fotos y respuestas sociales también consumen cuotas; observar invocaciones, usuarios activos y salida en el Dashboard, no solo el modelo de laboratorio. No agregar facturación para resolver una alerta. [Precios Supabase](https://supabase.com/pricing) · [Uso de salida](https://supabase.com/docs/guides/platform/manage-your-usage/egress).


## Datos anteriores a las restricciones

Antes de validar la FK histórica, auditar series cuyo padre no exista en la misma cuenta y ejercicios ausentes de su instantánea. Conservar un respaldo antes de corregir; no asignarles una sesión de otra cuenta para hacer pasar la validación. Después de resolver los casos, el administrador puede ejecutar `ALTER TABLE public.training_items VALIDATE CONSTRAINT owned_session_parent;`. Si no se dispone del proyecto real, esa auditoría permanece pendiente; los nuevos registros siguen sujetos a las restricciones.
