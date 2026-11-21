# GymBeast

PWA de entrenamiento pensada para celular, con rutinas editables, registro offline, progreso, compañeros 2D y tienda con oro. Español rioplatense, paleta Obsidiana dorada y navegación sin encabezado superior.

## Iniciar

Node 24.14.0 y npm. Ejecutar `npm ci` y `npm run dev`. Para cuentas, copiar `.env.example` a `.env.local`, completar únicamente la conexión pública del proyecto y reiniciar/recompilar. No se necesita correo: el acceso es por usuario y contraseña con registro abierto y sesión persistente.

El modo local guarda datos solo en ese navegador; no es un respaldo remoto. La sincronización de cuentas conserva el entrenamiento offline y confirma premios al reconectar. No borrar almacenamiento ni desinstalar con cambios pendientes.

## Comprobar

```text
npm test
npm run build
npm run check:release
npx playwright install chromium webkit
npm run test:e2e -- --workers=2
npm run test:accounts
npm run test:mobile
npm run test:mobile-social
npm run test:performance
npm run test:capacity
```

La prueba de capacidad crea una base embebida descartable con 100 cuentas sintéticas, 26.000 sesiones y 520.000 series. Tarda alrededor de 75 segundos y requiere memoria adicional. No escribe en Supabase. Las pruebas de cuentas usan Auth simulado y PostgreSQL embebido; no prueban credenciales de producción.

## Estado vigente

Las etapas 1–11 tienen implementación y herramientas locales; **el piloto publicado todavía no está habilitado**. Faltan los proyectos del titular, ensayo con Auth/HTTPS reales y validación física en iPhone/Android. La auditoría exhaustiva de ropa quedó fuera del cierre por decisión de conservar el acabado actual.

La capacidad de 100 cuentas entra en la medición local después del mantenimiento, con margen ajustado. No garantiza que un proyecto Supabase real soporte ese volumen sin medir Auth, fotos, actividad y crecimiento. El grupo inicial es de diez amigos.

- [Etapa 11: resultados y pendientes](docs/etapa-11.md)
- [Publicación en Supabase y Cloudflare Free](docs/publicacion.md)
- [Invitaciones, recuperación, respaldo y cuotas](docs/operacion.md)
- [Prueba física en el celular](docs/prueba-en-telefono.md)
- [Calidad móvil y rendimiento](docs/etapa-10.md)
- [Inventario vigente](docs/pendientes.md) y [cierre final](docs/cierre-final.md)
- [Arquitectura](docs/architecture.md), [datos](docs/database.md) y [diseño](docs/design-system.md)
- [Créditos visuales](docs/assets-licenses.md) y [avisos de dependencias](docs/third-party-notices.txt)

Los informes anteriores documentan entregas históricas. Las decisiones actuales reemplazan Google, correo, 3D, temas alternativos y accesorios retirados. No se requiere Meshy, SMTP ni Web Push.

### Crear rutinas

Crear rutina abre directamente el catálogo del Día 1. Elegí varias imágenes, ajustá los valores, guardá el día y agregá los siguientes desde el resumen. El nombre y la insignia se asignan por cantidad de días y se pueden editar después de crearla. Los borradores se conservan en el dispositivo. Detalle y QA: [docs/crear-rutina.md](docs/crear-rutina.md).
