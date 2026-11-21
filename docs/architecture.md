# Arquitectura vigente · 19/11/2026

GymBeast es una PWA React y TypeScript estricto sobre Vite. Tailwind/CSS define la interfaz pixel art; los controles usan HTML accesible y React Router organiza pantallas móviles. Zod valida entradas y Dexie/IndexedDB conserva datos por cuenta. Se prioriza el flujo observable local: no se añadieron TanStack Query ni React Hook Form, previstos inicialmente, porque el estado visible procede de IndexedDB y las operaciones remotas usan la cola durable.

Supabase Auth gestiona contraseñas y renovación de sesión. La función accounts convierte un usuario único en una identidad técnica, valida invitación y permite recuperación administrativa. No hay Google, correo/SMTP ni credenciales administrativas en el frontend. Mantener acceso restringido por invitación y permisos por cuenta aunque el piloto sea entre amigos.

Cada edición y su operación UUID se guardan juntas localmente. Las RPC autenticadas validan revisiones, propiedad y relaciones, conservan huellas de operaciones y descargan cambios por cursor. Las series independientes se fusionan; los conflictos conservan versiones local/remota hasta resolver. Premios y compras se confirman mediante transacciones y un monedero auditable.

Las tablas de entrenamiento mantienen agregados JSONB validados y referencias de propiedad: no se implementó una tabla tipada por cada campo del modelo inicial. Las series son entidades independientes con FK a su sesión e identidad de ejercicio en la instantánea. La migración 020 lleva su revisión de sincronización en la propia fila; el diario restante guarda claves y obtiene el estado vigente al leer. No se usa ese diario como historial de versiones de cada serie ni como respaldo: las instantáneas y el ledger tienen ese propósito específico.

Una generación global de recuperación permite reiniciar descargas después de restaurar todo el servidor sin eliminar la cola pendiente. Las respuestas anteriores de operaciones conservan su identidad y versión en formato compacto. No se podan UUID de operaciones, ledger ni tombstones por antigüedad.

El service worker precarga módulos y fuentes; las ilustraciones se cachean a demanda. Entrenar indica cuándo la rutina activa está lista sin conexión. Las rutas secundarias se cargan separadas; las láminas WebP preservan píxeles. Las mascotas son exclusivamente 2D, con movimiento propio, interacción y respaldo de movimiento reducido. No hay GLB ni renderizador 3D.

Cloudflare Pages sirve la salida estática por HTTPS; Supabase contiene datos privados y RPC. Las ilustraciones no consumen Storage de Supabase. La configuración, actualizaciones y recuperación están en [publicación](publicacion.md) y [operación](operacion.md). La medición local y las dependencias externas están en [etapa 11](etapa-11.md).
