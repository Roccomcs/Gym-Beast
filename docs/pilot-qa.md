# Registro histórico de QA

El cierre vigente del 19 de noviembre de 2026 está en [Etapa 11](etapa-11.md), [calidad móvil](etapa-10.md), [cierre final](cierre-final.md) y [Pendientes](pendientes.md). Las secciones siguientes conservan resultados de entregas anteriores y pueden mencionar funciones retiradas o reemplazadas.


## 1. Cierre de implementación

| Requisito | Estado | Evidencia o brecha |
|---|---|---|
| Prompt maestro 1–4 · Investigación, costo y stack | Parcial | Referencias de programas y créditos de ilustraciones. Falta completar matriz práctica, confirmar cuotas en el entorno real y cerrar decisiones del stack. |
| 5–6 · Instalación y cuenta | Parcial | PWA y alta local con nombre, peso opcional, unidad y huevo. Borrador persistente. OAuth, correo, nombre de usuario y validación en teléfonos pendientes. |
| 7–8 · Rutinas e importación | Parcial | Pestaña, diez programas con portadas originales, Día 1, avance, reordenamiento simple, editor manual e importador. La rutina real se guarda y vuelve a abrir con 31 ejercicios. Faltan compartir, versiones recuperables y edición completa de superseries y variantes. |
| 9 · Catálogo visual | Parcial | Mapas musculares y cuatro movimientos ilustrados. Faltan dos poses por movimiento, técnica por ficha y catálogo personalizado persistente. |
| 10 · Entrenamiento | Parcial | Registro durable local, omisiones, RPE/RIR, notas, descanso y resumen. La sesión permite agregar, reemplazar y reordenar ejercicios, y duplicar y recuperar series. Hay aviso visual de fin de descanso. Faltan avisos sonoros y aplicar la edición a la plantilla. |
| 11–12 · Progresión | Parcial | Historial, gráfico básico, volumen, récord de carga y e1RM excluyendo calentamientos. El calendario de actividad muestra frecuencia y volumen semanal. Faltan volumen muscular, comparaciones y progresión doble integrada. |
| 13–14 · Mascotas y economía | Parcial | EXP, oro, tienda, crecimiento a 100 y 300 EXP, mascotas 2D. Faltan rachas, misiones, logros y transición de evolución en la celebración. |
| 15 · Amigos | Pendiente | Acceso desde Perfil. Faltan relaciones, permisos sociales, feed, desafíos y rankings. |
| 16–17 · UX | Parcial | Barra reorganizada, Entrenar enfocado, portadas y sprites. Faltan revisión visual completa, VoiceOver, TalkBack y todos los estados de errores y conflictos. |
| 18–20 · Datos y seguridad | Parcial | Validación estructural inicial y aislamiento SQL, deduplicación, compra transaccional y cambios rechazados con reintento. Falta normalizar el núcleo JSONB, validar todas las relaciones de entrenamiento, registrar compensaciones en una bitácora, restauración en cuentas, descarga incremental y sincronización por lotes. |
| 21–23 · Notificaciones, rendimiento y calidad | Parcial | Animación 2D de Inicio con soporte para movimiento reducido. Faltan recordatorios, mediciones físicas, lint y cierre de avisos de desarrollo. |
| 24–30 · Pruebas y salida | Bloqueado para publicación | Pruebas locales y de PostgreSQL embebido. Se necesitan un proyecto Supabase, cliente OAuth y proyecto Cloudflare Pages del titular para validar el entorno público, e iPhone y Android físicos para instalación, accesibilidad y rendimiento. |

## 2. Revisión de pendientes realizables localmente

- Se probó la compra del accesorio y su persistencia, el ascenso a joven, el saldo insuficiente, la deduplicación de una compra y el aislamiento entre dos identidades SQL.
- Las ilustraciones restantes requieren un lote por movimiento con revisión del agarre, equipo y poses. El catálogo sigue abierto.
- La simulación SQL usa PostgreSQL embebido. No cubre OAuth, caída de red durante una compra real, dos instalaciones ni reglas sociales todavía pendientes.

## 3. Revisión contra el pedido

- El alta conserva nombre, peso opcional, unidad y compañero. No hay campo de nacimiento.
- Entrenar muestra Crear rutina arriba, con dos opciones al abrir. Rutinas es una pestaña separada con diez portadas y fichas. El calendario tiene acceso aparte.
- La prueba principal inicia en Día 1, registra offline, recarga y termina con un premio único y Día 2. Otra prueba recorre cuatro días y conserva el accesorio equipado al recargar.
- El entorno local puede usarse desde el README. La salida del piloto depende del QA hospedado y físico, además de los pendientes funcionales de esta tabla.

La restauración local valida el respaldo y se aplica en una transacción. Requiere un espacio sin rutinas ni sesiones. La ficha de la mascota indica el accesorio equipado.

## Seguimiento

- Mis rutinas permite compartir un texto reutilizable con ejercicios, series, repeticiones y descansos. La copia omite cargas y notas.
- Las sesiones iniciadas desde la rutina activa pueden actualizar su día de plantilla. Se conserva una versión anterior y se rechaza la actualización si ya cambió la versión de la plantilla.
- La progresión doble inicial propone un aumento solo si las series válidas alcanzaron el máximo del rango. El aumento es voluntario y usa 2,5 kg o 5 lb. Falta configurar los incrementos y registrar fatiga o descarga.
- Progreso muestra una racha semanal de actividad y tres hitos de sesiones. Falta la racha de cumplimiento del plan, las misiones configurables y su reflejo en recompensas del servidor.
Las misiones de 1, 5 y 10 sesiones válidas otorgan 25 EXP de cuenta cada una. En modo local se derivan del historial elegible. En cuentas, PostgreSQL las registra una sola vez. Falta verificar la migración sobre Supabase alojado.

El hábitat de Inicio muestra huevo, bebé, cría, adolescente, adulto y titán para el dragón. La vida refleja únicamente el incumplimiento de la última semana cerrada y recupera puntos con las sesiones de la semana actual. Las 41 fichas del catálogo tienen una pose ilustrada y mapas de músculos. Sigue pendiente una segunda pose de inicio o fin por ejercicio.

## Revisión visual de Inicio, Entrenar, Progreso y Perfil

- El sprite de cada acompañante se obtiene de la misma selección de especie y EXP en Inicio, Entrenar, Perfil, tienda y cierre.
- Se comprobó la entrada animada de Inicio, el foco al pasar al ejercicio siguiente, la aparición del cierre y el detalle desplegable. Las láminas se muestran más grandes en la rutina y durante la sesión.
- Progreso presenta métricas, mapa corporal y tendencia de carga. Se inspeccionaron capturas de Progreso y Perfil a 390 px y se comprobó el ancho del flujo a 320 px.
- Se revisó la disponibilidad de las ilustraciones de los 41 ejercicios. Se probó el catálogo de compras disponible para una cuenta con dragón inicial en PostgreSQL embebido, incluyendo reintentos y saldo insuficiente. Sigue pendiente validar la tienda alojada y el comportamiento en iPhone y Android físicos.

## Registro simplificado y perfil

Las filas de peso y repeticiones se reutilizan por ejercicio desde el historial y solo cuentan al marcarlas. El cierre muestra el resultado y dos tarjetas animadas de recompensa. El equipo, la lámina y el mapa muscular se muestran en la sesión. El esquema animado ilustra familias de movimiento y la lámina permite distinguir la variante. Mis rutinas admite fotos y las portadas del catálogo. Perfil guarda automáticamente y muestra el acceso a Amigos con estado vacío. El calendario y la constancia se enfocan en el plan activo. La tienda y la sincronización alojadas siguen pendientes de prueba.
El estado actualizado de las entregas y sus pendientes está en [Seguimiento de pendientes](pendientes.md).
