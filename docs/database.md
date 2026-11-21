# Datos vigentes · 19/11/2026

- training_items: entidades versionadas por cuenta y tipo (perfil, rutina, planificación, sesión, serie), JSONB validado, referencia propia de serie a sesión e instantáneas de ejercicios. Las sesiones conservan modalidad, variante y compañero de inicio.
- training_operations: UUID por cuenta, huella de petición y versión aplicada. Reutilizar un UUID con otra petición falla; reintentar la misma operación conserva respuesta. No contiene la contraseña ni se elimina por antigüedad.
- sync_heads: contador por propietario. Las series guardan sync_revision en su fila; sync_changes conserva claves de otros cambios y eliminaciones, sin copiar el payload. sync_pull hidrata estado/versiones coherentes dentro de una lectura PostgreSQL.
- training_tombstones: versiones de eliminaciones para evitar resurrecciones por dispositivos atrasados. pilot_sync_epoch: generación de reconciliación tras recuperar todo el proyecto.
- session_rewards, pet_purchases y wallet_ledger: premios únicos, compras y movimientos compensatorios. La mascota recibe la EXP de las sesiones que acompañó. El saldo se reconstruye del ledger.
- account_invitations, account_logins y account_attempts: invitación de un uso, usuario normalizado e intentos limitados. Las contraseñas pertenecen a Supabase Auth.
- social_profiles, social_relationships, friend_posts, friend_cheers y friend_challenges: perfil aceptado, bloqueo, publicaciones voluntarias y desafíos. Peso corporal y notas privadas no se exponen en perfiles compartidos.

Las tablas expuestas tienen RLS y los helpers administrativos quedan fuera de anon/authenticated. UUID, restricciones, límites y validación se versionan en las migraciones 001–020. La cola durable local conserva operaciones rechazadas y conflictos sin bloquear entidades independientes.

La migración 019 cambia la política de compresión de nuevas filas JSONB. No reescribe los datos existentes. Una migración aplicada tampoco reduce automáticamente el archivo físico: medir y preparar mantenimiento antes de ampliar capacidad. La FK histórica owned_session_parent se agregó NOT VALID para conservar registros previos; auditar y validar datos antiguos en el proyecto real antes de darlo por cerrado.

[Capacidad medida](etapa-11.md) · [Respaldo y recuperación](operacion.md). No se presenta el esquema agregado como normalización completa a tablas por campo del prompt inicial.
