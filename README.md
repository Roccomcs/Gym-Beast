# GymBeast

PWA de registro de gimnasio con importación de rutinas, planificación, sesiones offline y un historial local. La primera entrega permite usar el flujo con datos reales en un navegador sin configurar servicios externos.

## Ejecutar

1. Instalá Node 24 y ejecutá `npm ci`.
2. Ejecutá `npm run dev` y abrí la dirección que muestra Vite.
3. Elegí **Probar en este dispositivo**. Para comprobar el service worker ejecutá `npm run build` y luego `npm run preview`.

El espacio local conserva datos en IndexedDB en ese navegador. Borrar los datos del sitio elimina ese espacio. Existe restauración local desde archivo en el código, pero su acceso no está visible en Perfil.

## Conectar cuentas y publicar

GymBeast usa usuario y contraseña con invitación de un solo uso. Conserva la sesión en el celular y permite recuperar el acceso con ayuda del administrador del grupo.
Sin un proyecto configurado, se puede usar Probar en este dispositivo.

1. Crear un proyecto Supabase y aplicar las migraciones en orden.
2. Configurar Auth, los orígenes permitidos y la función accounts según [la guía de cuentas](docs/etapa-2.md).
3. Copiar .env.example a .env.local y completar la URL y la clave publicable. Las claves administrativas se usan exclusivamente en el servidor y la herramienta del titular.
4. Generar invitaciones con npm run accounts:admin -- invite 10, después de configurar la herramienta.
5. En Cloudflare Pages, compilar con npm run build y publicar dist. Configurar las variables públicas del frontend y comprobar el flujo real antes de abrir el piloto.

En iPhone, abrir el sitio HTTPS en Safari y elegir Compartir → Agregar a inicio. En Android, usar instalar o agregar a la pantalla principal.
Abrir una vez con conexión para descargar los recursos antes del uso offline.

## Pruebas

- `npm test` ejecuta las pruebas del parser, del dominio y de PostgreSQL embebido. La suite SQL simula el rol y la identidad de Supabase para comprobar operaciones, RLS y recompensas.
- `npx playwright install chromium`, `npm run build` y `npm run test:e2e` permiten probar el flujo offline en un navegador con dimensiones móviles.
- npm run test:accounts comprueba los formularios y la sesión persistente con un servidor de Auth simulado.
- La autenticación hospedada, el despliegue de las migraciones en Supabase, la sincronización completa entre dos dispositivos y la validación en iPhone y Android físicos requieren verificación antes de abrir el piloto.

## Estado

El alta local permite elegir un compañero y activar una de diez rutinas ilustradas. El entrenamiento registra series sin conexión y conserva el avance del ciclo al recargar. La economía incluye EXP, oro, tienda y crecimiento, con recompensas locales de demostración y funciones PostgreSQL para cuentas.

Las ocho especies tienen seis etapas ilustradas en 2D, hábitats animados e interacción al tocarlas. La paleta es Obsidiana dorada y la app no tiene encabezado superior.

El piloto todavía requiere las validaciones alojadas y físicas. Consultá el [registro de QA](docs/pilot-qa.md) y los [créditos visuales](docs/assets-licenses.md).

## Entrega por etapas

La etapa 2 implementa acceso por usuario y contraseña con invitación y recuperación administrativa. Falta desplegarlo y validarlo contra Supabase real. Consultá [la guía de cuentas](docs/etapa-2.md).

La etapa 1 tiene compilación, 78 pruebas de dominio/SQL y 17 recorridos de navegador aprobados. Ejecutá npm run build y npm run demo para producir una demostración aislada con historial, ropa y mascota. Las capturas y el respaldo quedan en demo-results. El escenario social de prueba usa dos identidades fijas y roles simulados en PostgreSQL embebido.

Consultá [la entrega de etapa 1](docs/etapa-1.md) y [el inventario vigente](docs/pendientes.md). Cada etapa espera tu aprobación antes de pasar a la siguiente.

La etapa 3 incorpora sincronización por lotes, descarga incremental y recuperación administrativa. Consultá [la guía de persistencia](docs/etapa-3.md) y [las comprobaciones de cierre final](docs/cierre-final.md). Los comandos administrativos backup, restore y delete requieren las claves del titular, y las dos últimas operaciones piden confirmación.
