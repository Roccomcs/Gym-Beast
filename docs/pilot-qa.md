# Revisión del piloto

## 1. Cierre de implementación

| Requisito | Estado | Evidencia o brecha |
|---|---|---|
| Prompt maestro 1–4 · Investigación, costo y stack | Parcial | Referencias de programas y créditos de ilustraciones. Falta completar matriz práctica, confirmar cuotas en el entorno real y cerrar decisiones del stack. |
| 5–6 · Instalación y cuenta | Parcial | PWA y alta local con nombre, peso opcional, unidad y huevo. Borrador persistente. OAuth, correo, nombre de usuario y validación en teléfonos pendientes. |
| 7–8 · Rutinas e importación | Parcial | Pestaña, diez programas con portadas originales, Día 1, avance, reordenamiento simple, editor manual e importador. La rutina real se guarda y vuelve a abrir con 31 ejercicios. Faltan compartir, versiones recuperables y edición completa de superseries y variantes. |
| 9 · Catálogo visual | Parcial | Mapas musculares y cuatro movimientos ilustrados. Faltan dos poses por movimiento, técnica por ficha y catálogo personalizado persistente. |
| 10 · Entrenamiento | Parcial | Registro durable local, omisiones, RPE/RIR, notas, descanso y resumen. La sesión permite agregar, reemplazar y reordenar ejercicios, y duplicar y recuperar series. Hay aviso visual de fin de descanso. Faltan avisos sonoros y aplicar la edición a la plantilla. |
| 11–12 · Progresión | Parcial | Historial, gráfico básico, volumen, récord de carga y e1RM excluyendo calentamientos. El calendario de actividad muestra frecuencia y volumen semanal. Faltan volumen muscular, comparaciones y progresión doble integrada. |
| 13–14 · Mascotas y economía | Parcial | EXP, oro, tienda, crecimiento a 100 y 300 EXP, 12 GLB originales y 2D alternativo. Faltan rachas, misiones, logros, eclosión 3D y transición de evolución en la celebración. |
| 15 · Amigos | Pendiente | Acceso desde Perfil. Faltan relaciones, permisos sociales, feed, desafíos y rankings. |
| 16–17 · UX | Parcial | Barra reorganizada, Entrenar enfocado, portadas y sprites. Faltan revisión visual completa, VoiceOver, TalkBack y todos los estados de errores y conflictos. |
| 18–20 · Datos y seguridad | Parcial | Validación estructural inicial y aislamiento SQL, deduplicación, compra transaccional y cambios rechazados con reintento. Falta normalizar el núcleo JSONB, validar todas las relaciones de entrenamiento, registrar compensaciones en una bitácora, restauración en cuentas, descarga incremental y sincronización por lotes. |
| 21–23 · Notificaciones, rendimiento y calidad | Parcial | Visor 3D diferido y 2D por movimiento reducido. Faltan recordatorios, mediciones físicas, lint y cierre de avisos de desarrollo. |
| 24–30 · Pruebas y salida | Bloqueado para publicación | Pruebas locales y de PostgreSQL embebido. Se necesitan un proyecto Supabase, cliente OAuth y proyecto Cloudflare Pages del titular para validar el entorno público, e iPhone y Android físicos para instalación, accesibilidad y rendimiento. |

## 2. Revisión de pendientes realizables localmente

- Los modelos 3D se generaron por código con Three.js. Los 12 GLB se incluyen en el repositorio. Chromium cargó y dibujó el modelo de bebé.
- Se probó la compra del accesorio y su persistencia, el ascenso a joven, el saldo insuficiente, la deduplicación de una compra y el aislamiento entre dos identidades SQL.
- Las ilustraciones restantes requieren un lote por movimiento con revisión del agarre, equipo y poses. El catálogo sigue abierto.
- La simulación SQL usa PostgreSQL embebido. No cubre OAuth, caída de red durante una compra real, dos instalaciones ni reglas sociales todavía pendientes.

## 3. Revisión contra el pedido

- El alta conserva nombre, peso opcional, unidad y compañero. No hay campo de nacimiento.
- Entrenar muestra Crear rutina arriba, con dos opciones al abrir. Rutinas es una pestaña separada con diez portadas y fichas. El calendario tiene acceso aparte.
- La prueba principal inicia en Día 1, registra offline, recarga y termina con un premio único y Día 2. Otra prueba recorre cuatro días y conserva el accesorio equipado al recargar.
- El entorno local puede usarse desde el README. La salida del piloto depende del QA hospedado y físico, además de los pendientes funcionales de esta tabla.

La restauración local valida el respaldo y se aplica en una transacción. Requiere un espacio sin rutinas ni sesiones. La tienda dibuja la bandana y la medalla equipadas en el visor 3D.
