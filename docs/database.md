# Datos

La implementación de persistencia del 18 de noviembre de 2026 se detalla en [Etapa 3](etapa-3.md). Incluye la migración 202611180012_durable_sync.sql, lotes, cursor por cuenta, eliminaciones, clave foránea de sesiones y bitácora del monedero. Las secciones siguientes conservan la base de arquitectura anterior.

El catálogo tiene identificadores estables. La rutina tiene versiones y el plan semanal lleva una copia de su versión. Las sesiones conservan nombres, series objetivo y datos registrados de su propia copia. Las series realizadas se guardan independientemente, lo que permite fusionar altas en dispositivos diferentes.

La primera migración implementa filas versionadas por cuenta y una bitácora de operaciones, agrupadas por tipo de agregado. La estructura interna usa JSONB validado en el cliente. La normalización y validación completas de entidades en el servidor corresponden a las siguientes entregas.
