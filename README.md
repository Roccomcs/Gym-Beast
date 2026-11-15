# GymBeast

PWA de registro de gimnasio con importación de rutinas, planificación, sesiones offline y un historial local. La primera entrega permite usar el flujo con datos reales en un navegador sin configurar servicios externos.

## Ejecutar

1. Instalá Node 24 y ejecutá `npm ci`.
2. Ejecutá `npm run dev` y abrí la dirección que muestra Vite.
3. Elegí **Probar en este dispositivo**. Para comprobar el service worker ejecutá `npm run build` y luego `npm run preview`.

El espacio local conserva datos en IndexedDB en ese navegador. Exportá una copia desde Perfil antes de borrar datos del sitio. La restauración desde archivo todavía está pendiente.

## Conectar cuentas y publicar

1. Creá un proyecto Supabase Free y aplicá la migración en `supabase/migrations` desde el SQL Editor o con Supabase CLI.
2. Configurá Google en Auth Providers. En Google Cloud, creá un cliente OAuth web con la URL de callback que indica Supabase. Definí la URL HTTPS de GymBeast como Site URL de Supabase y agregá la URL local a las redirecciones permitidas para desarrollo.
3. Copiá `.env.example` a `.env.local` y configurá la URL y la clave publicable del proyecto. Guardá los secretos OAuth en Supabase. Email y contraseña requieren SMTP de prueba o un remitente gratuito verificado. Habilitalos con `VITE_ENABLE_EMAIL_AUTH=true`.
4. En Cloudflare Pages, usá `npm run build` y publicá `dist`. Configurá allí las mismas variables públicas. Revisá el tamaño de la base y las cuotas antes de ampliar el piloto. Conservá exportaciones privadas y respaldos de PostgreSQL en un lugar seguro.

En iPhone abrí el sitio HTTPS en Safari y elegí **Compartir → Agregar a inicio**. En Android o Samsung Internet usá el menú del navegador y elegí instalar o agregar a la pantalla principal. En ambos casos, abrí la app una vez con conexión antes de usarla offline.

## Pruebas

- `npm test` ejecuta las pruebas del parser y del dominio.
- `npx playwright install chromium`, `npm run build` y `npm run test:e2e` permiten probar el flujo offline en un navegador con dimensiones móviles.
- La autenticación hospedada, migraciones, permisos con dos cuentas, conflictos entre dispositivos y validación en iPhone y Android físicos requieren verificación antes de abrir el piloto.

## Estado

La edición de rutinas usa versiones en los documentos y guarda una copia de la planificación al iniciar cada sesión. La primera migración guarda agregados versionados en JSONB. Todavía están pendientes la normalización completa, la validación de agregado en servidor, gráficos adicionales y recomendaciones, economía de recompensas, mascotas originales, amigos, restauración y notificaciones. Iconografía de interfaz de Lucide (ISC). El icono de la app se creó para GymBeast.
