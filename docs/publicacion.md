# Publicar GymBeast

Guía vigente: usuario y contraseña, invitación, mascotas 2D, Obsidiana dorada. No requiere Google OAuth, SMTP, Meshy ni Web Push. Los documentos de etapas anteriores conservan evidencia histórica.

## Lo que falta del titular

Un proyecto **Supabase Free**, un proyecto **Cloudflare Pages Free**, sus permisos de administración y la dirección HTTPS elegida. No hay conexión real configurada en esta carpeta. No pegar secretos en el chat ni en archivos públicos. Mantener ambos proyectos en Free, sin agregar servicios de pago ni habilitar facturación.

## Supabase

1. Instalar la CLI oficial e iniciar sesión en la cuenta del titular. Vincular esta carpeta con `supabase link --project-ref REFERENCIA`. Revisar el proyecto elegido antes de cualquier escritura.
2. Si ya tiene datos, crear un respaldo y ensayar la actualización en otro proyecto. Revisar `supabase migration list`. Aplicar **todas** las migraciones en orden con `supabase db push`, hasta `202611190020_set_revision_storage.sql`. No ejecutar solo el último archivo: dependen de los anteriores.
3. Mantener deshabilitado el registro directo de Auth (`enable_signup=false`) y contraseña mínima de diez caracteres. El alta de GymBeast pasa por la función `accounts`, que crea identidades técnicas verificadas mediante invitación. La configuración versionada está en `supabase/config.toml`; comprobar también el estado del proyecto remoto.
4. Configurar `GYMBEAST_ALLOWED_ORIGINS` como secreto de `accounts`: orígenes exactos separados por coma, sin rutas ni barra final. Incluir el dominio de producción y únicamente los previews que se vayan a probar. No usar comodín.
5. Desplegar `supabase functions deploy accounts --project-ref REFERENCIA`. `verify_jwt=false` permite acceder al formulario; el manejador valida credenciales/invitación. Las claves administrativas de Supabase se usan exclusivamente en esa función y en la terminal privada del titular.
6. Copiar solo la URL y la clave pública al frontend: `VITE_SUPABASE_URL` y `VITE_SUPABASE_PUBLISHABLE_KEY`. Nunca usar `service_role` o `sb_secret` en variables `VITE_`.
7. Consultar tamaño inicial con `npm run accounts:admin -- status`, configurando las variables privadas de [operación](operacion.md). Crear diez invitaciones para el primer grupo. Si existen cuentas antiguas, no recrear sus UUID: vincularlas antes de cambiar su acceso.

## Cloudflare Pages

Usar Node **24.14.0**, registrado en `.node-version`, y el lockfile con `npm ci`. En el proyecto Pages:

- Comando de compilación: `npm run build && npm run check:release -- --accounts`.
- Carpeta publicada: `dist`.
- Variables: únicamente las dos públicas de Supabase para producción, con valores distintos si se usa un proyecto de pruebas.
- Publicar primero un preview conectado al entorno de prueba. No habilitar automáticamente un preview nuevo como origen de cuentas de producción.

El control de salida comprueba tamaño/cantidad de archivos, manifest, íconos, navegación y referencias administrativas. El modo `--accounts` falla si falta conexión pública HTTPS o si la salida no contiene esa configuración. No certifica el servidor ni las cuentas. El build prepara `_headers` y `_redirects`, incluidas las URL antiguas de ilustraciones. La salida tiene 246 archivos y alrededor de 139 MB; el mayor es de 1,75 MB. Los límites Free consultados el 19/11/2026 son 20.000 archivos, 25 MiB por archivo y 500 builds mensuales. [Límites oficiales de Pages](https://developers.cloudflare.com/pages/platform/limits/).

## Aceptación en HTTPS

Ejecutar `npm run check:published -- https://TU-PROYECTO.pages.dev` con la URL pública de Supabase disponible en la terminal para revisar también CORS de `accounts`. Este chequeo es de lectura: no crea usuarios. Después hacer con dos cuentas reales:

1. Invitación, alta, entrada, reapertura y recuperación de contraseña temporal.
2. Importar Rocco, activar, terminar offline, reconectar y comprobar una sesión y un premio en otro navegador.
3. Editar simultáneamente, resolver conflicto, comprar, revisar saldo y equipamiento después de reabrir.
4. Solicitud, aceptación, perfil, comparación, compartir/copiar rutina, feed, desafío y bloqueo.
5. Respaldar/restaurar una cuenta de prueba y comprobar descarga de la restauración. Ensayar recuperación global en un proyecto separado.
6. Seguir la [guía de teléfonos](prueba-en-telefono.md) en iPhone y Android. Registrar resultados, versiones y fallos.

No abrir el piloto hasta pasar esos pasos. Un build correcto y las cuentas simuladas no los sustituyen.

## Actualización y rollback

Guardar la versión anterior, los identificadores de despliegue, el respaldo y la lista de migraciones. Probar primero migraciones compatibles con el cliente anterior; después publicar el frontend. La PWA ofrece actualizar cuando no hay una sesión activa: terminar/sincronizar antes de aceptar. No pedir que borren datos locales para resolver una actualización.

Si falla el frontend, usar Deployments → Rollback en Pages sobre un despliegue de producción válido; el cliente instalado todavía debe recibir la actualización. Un rollback de Pages **no revierte PostgreSQL**. No deshacer migraciones con datos sin un ensayo de restauración. Las comprobaciones de actualización instalada y rollback publicado permanecen pendientes. [Rollback oficial](https://developers.cloudflare.com/pages/configuration/rollbacks/).
