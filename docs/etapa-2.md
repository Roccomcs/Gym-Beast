# Etapa 2 · Usuario, contraseña e invitaciones

Entrega local del 18 de noviembre de 2026. Pendiente de habilitación y comprobación en el proyecto Supabase del titular.

## Comportamiento implementado

- Entrar por usuario y contraseña o crear cuenta con invitación.
- Usuario normalizado a minúsculas, de 3 a 24 letras ASCII, números o guion bajo.
- Contraseña de al menos diez caracteres. Se respeta el máximo de 72 bytes UTF-8 de bcrypt y se rechazan los excesos sin truncarlos.
- Invitaciones aleatorias de 32 bytes, de un solo uso, revocables y válidas durante siete días.
- Una transacción de PostgreSQL crea la identidad, reserva el usuario social y consume la invitación. Si falla, se revierte todo.
- El navegador conserva un UUID de operación por usuario durante el alta para reintentar una respuesta perdida. No guarda contraseñas ni códigos de invitación en el almacenamiento de la aplicación.
- Supabase Auth conserva y renueva la sesión. El espacio descargado puede abrirse offline.
- Cambio de contraseña y cierre de sesión desde Perfil para cuentas sincronizadas.
- Recuperación por el administrador, con contraseña temporal y reemplazo obligatorio antes de acceder a los datos.
- Las políticas de lectura y las RPC consultan el indicador actual del servidor, por lo que una sesión anterior tampoco puede esquivar el restablecimiento.
- El usuario social de las cuentas nuevas coincide con el acceso y permanece fijo. El nombre visible se sigue editando en Perfil.
- El modo local queda disponible. Sin conexión configurada, se muestra que el acceso por cuenta todavía no está habilitado.

## Instalación en Supabase

1. Aplicar en orden todas las migraciones, incluida 202611180011_username_accounts.sql.
2. En Auth, mantener habilitado el proveedor de email/contraseña, deshabilitar registros públicos y acceso anónimo, y establecer diez caracteres como longitud mínima de contraseña. La función de registro usa la API administrativa para crear cuentas confirmadas.
3. Configurar VITE_SUPABASE_URL y VITE_SUPABASE_PUBLISHABLE_KEY en el frontend y recompilar.
4. Configurar el secreto GYMBEAST_ALLOWED_ORIGINS para la función accounts. Usar orígenes exactos separados por coma, por ejemplo https://gymbeast.pages.dev,http://localhost:5173,http://localhost:4173. No incluir rutas ni barra final.
5. Publicar con supabase functions deploy accounts --project-ref REFERENCIA_DEL_PROYECTO. La configuración de verify_jwt=false permite llegar al formulario antes de tener una sesión. Cada acción verifica credenciales o invitación.
6. SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY y SUPABASE_ANON_KEY se leen exclusivamente dentro de la función. La plataforma proporciona estos valores. No poner el secreto administrativo en variables VITE.
7. Crear una invitación y verificar alta, entrada, cierre, reapertura, renovación, cambio de contraseña y recuperación con dos usuarios reales.

Internamente se usa una dirección técnica u.USUARIO@accounts.gymbeast.invalid para Supabase Auth. Nadie necesita una casilla ni se envían correos. Las contraseñas las verifica Supabase Auth.

Los usuarios de Auth anteriores a esta migración se conservan. La nueva pantalla solo admite las identidades creadas mediante invitación. En este entorno no había cuentas alojadas configuradas. Si un proyecto ya tiene usuarios de Google o email, hay que planificar su vinculación antes de sustituir el acceso en ese proyecto.

Las decisiones siguen la documentación oficial de [creación administrativa de usuarios](https://supabase.com/docs/reference/javascript/auth-admin-createuser), [triggers de usuario](https://supabase.com/docs/guides/auth/managing-user-data), [configuración de funciones](https://supabase.com/docs/guides/functions/function-configuration) y [validación de contraseñas de Auth](https://github.com/supabase/auth/blob/master/internal/api/password.go).

## Administración del grupo

La herramienta scripts/accounts-admin.mjs se ejecuta en la computadora del administrador.
Configurar en esa terminal GYMBEAST_ADMIN_URL y GYMBEAST_ADMIN_SECRET con la URL y la clave administrativa del proyecto.
No guardar estos valores en el repositorio ni compartirlos con los usuarios.

- npm run accounts:admin -- invite 10 genera diez invitaciones. Los códigos se muestran una vez en esa ejecución y la base conserva únicamente sus hashes.
- npm run accounts:admin -- revoke CODIGO revoca una invitación que aún no se usó.
- npm run accounts:admin -- reset USUARIO verifica el usuario, genera una clave temporal y activa la obligación de cambiarla.
- Verificar quién pide la recuperación antes de ejecutar reset. Compartir la clave temporal con esa persona por un canal privado.
- La clave temporal aparece en la terminal para poder entregarla. Cerrar esa terminal después de terminar.

Diez solicitudes por usuario en quince minutos se permiten en la pasarela, incluyendo login, alta y cambio de contraseña.
El límite es transaccional y compartido entre instancias. Después se informa cuándo volver a intentar.
También permanecen los límites del servicio de Auth.

## Comprobaciones ejecutadas

- npm run build comprueba TypeScript, Vite y el service worker.
- npm test ejecuta cien casos. Las pruebas nuevas cubren normalización, reintentos del alta, validación, invitaciones usadas/vencidas/revocadas, rollback, usuario inmutable, dos cuentas, restricciones de lectura y RPC durante un reset, y límite de intentos.
- npm run test:accounts ejecuta seis recorridos a dimensiones móviles. Usa Supabase simulado para el transporte y el SDK real en el cliente. Comprueba sesión persistente, reapertura offline, errores, alta, recuperación, cambio de contraseña, cierre y separación de dos cuentas.
- Las capturas de acceso y recuperación se generan en accounts-results.
- npx --yes deno check supabase/functions/accounts/index.ts valida tipos e importaciones del servidor.
- Los dieciocho recorridos generales de la aplicación también pasaron durante esta entrega.

La construcción de pruebas de acceso se genera en .auth-dist con URL y clave ficticias. No altera dist ni configura un proyecto externo.
Las pruebas SQL ejecutan todas las migraciones en PGlite, con roles e identidades de prueba. Las pruebas del manejador aíslan el transporte de Auth con dobles controlados.

## Verificación pendiente

No se desplegó la función ni se ejecutó Auth real. Faltan las credenciales del proyecto del titular.
Docker Desktop no tenía su motor disponible, por lo que tampoco se ejecutó un Supabase Auth local completo.
No se probaron teléfonos físicos en esta etapa.
La etapa 3 se ocupa de sincronización por lotes, conflictos, respaldo y recuperación de datos.
