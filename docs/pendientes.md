# Cierre de GymBeast por etapas

Estado revisado el 19 de noviembre de 2026. Este documento reemplaza el inventario anterior.
Cada etapa se entrega y espera la aprobación del titular antes de comenzar la siguiente.

## Decisiones vigentes

- Obsidiana dorada como única paleta, sin encabezado superior.
- Mascotas 2D. Permanecen retirados bandanas, medallas, cadenas, gafas y guantes.
- Navegación con Inicio, Entrenar, Rutinas, Tienda y Perfil. Progreso y Amigos desde Perfil.
- Acceso previsto por usuario y contraseña con invitación de un solo uso. Recuperación con ayuda del titular.
- Sesión persistente y sincronización automática. Datos privados por cuenta.
- Amigos aceptados podrán ver foto, mascota, EXP, constancia, récords y rutinas compartidas. Peso corporal y notas privados.
- Premio implementado por superar la mayor carga anterior, sin exigir las mismas repeticiones, de 5 EXP de cuenta, 5 EXP de mascota y 5 de oro por ejercicio. Máximo tres ejercicios por sesión.
- La EXP adicional acelerará la evolución. El premio base sigue siendo 25 EXP y 20 de oro.
- Diez amigos iniciales y objetivo de capacidad comprobada para 100 cuentas.

## Inventario por etapa

| Etapa | Estado | Implementación restante y condición de cierre |
|---|---|---|
| 1. Base comprobable | Completada, a revisión | Dependencias operativas, compilación, 78 pruebas de dominio/SQL, 17 recorridos existentes y una demostración reproducible aprobados. Ver etapa-1.md. |
| 2. Acceso e invitaciones | Implementada localmente, a revisión | Usuario y contraseña con invitación, sesión persistente, cambio y recuperación administrativa. 100 pruebas, seis recorridos de acceso y validación Deno. Falta desplegar y comprobar Auth real con el proyecto del titular. Ver etapa-2.md. |
| 3. Persistencia y respaldo | Implementada localmente, a revisión | Lotes, cursor incremental, eliminaciones versionadas, relaciones por cuenta, conflictos legibles, bitácora de premios/compras, respaldo, restauración y borrado administrativo. 112 pruebas y recorridos de dos dispositivos/pestañas. Falta la validación alojada y la auditoría histórica. Ver etapa-3.md y cierre-final.md. |
| 4. Ropa y accesorios | Acabado actual conservado por decisión del titular | El 19/11 se decidió seguir con la ropa existente. La ampliación de calce y revisión exhaustiva de la matriz no se continúa en este cierre; no se presenta esa auditoría como completada. Ver etapa-4.md. |
| 5. Mascota entrenando y animación | Cobertura revisada implementada | 75 láminas: cinco principales por especie y 41 ejercicios cubiertos por el dragón. Selección propia/dragón, galería local, festejo/evolución únicos, offline y movimiento reducido comprobados en Chromium/WebKit. Faltan ropa adaptada a las nuevas poses, dispositivos físicos y rendimiento real. Ver etapa-5.md. |
| 6. Ejercicios y rutinas | Implementada localmente, a revisión | 46 ejercicios ilustrados, diez adaptaciones revisadas y Rocco, importador con revisión explícita, ejercicios propios persistentes y alternancia A/B. Compilación, 162 pruebas y recorridos Chromium/WebKit/offline correctos. Falta aplicar la migración y comprobar el entorno publicado/físico. Ver etapa-6.md. |
| 7. Premio por carga | Implementada localmente, a revisión | Referencia histórica por variante/modalidad, máximo de tres mejoras, desglose y compensaciones transaccionales. Máximo 40 EXP y 35 de oro; probado offline y con dos navegadores. Falta aplicar la migración y comprobar el entorno alojado/físico. Ver etapa-7.md. |
| 8. Gamificación y vida | Implementada localmente, a revisión | Misiones semanales, insignias e historial, logros confirmados, reglas compartidas de racha/vida, descenso y recuperación al evolucionar. 214 pruebas, comparación local/SQL y recorridos Chromium/WebKit offline. Falta aplicar la migración 015 y comprobar servidor y teléfonos reales. Ver etapa-8.md. |
| 9. Amigos y comparación | Implementada localmente, a revisión | Perfil con foto/mascota y vida efectiva, comparación 7/28/90 días, cargas compatibles, compartir/copiar rutinas y recorrido de feed/desafíos/bloqueo con dos cuentas en Chromium/WebKit. 226 pruebas y nueva migración 016. Falta validar cuentas/HTTPS reales y teléfonos físicos. Ver etapa-9.md. |
| 10. Móvil y rendimiento | Implementada localmente; validación física pendiente | Chromium/WebKit a 320/390/430 px, contraste/foco, offline, descanso, errores de guardado, carga diferida, WebP sin pérdida y mediciones con 260 sesiones. Falta validar iPhone/Android físicos, lectores y servidor HTTPS. Ver etapa-10.md. |
| 11. Capacidad y publicación | Trabajo local terminado; salida alojada pendiente | 100 cuentas/año y 520.000 series medidas, 448 MB tras mantenimiento, migraciones 017–020, recuperación global, herramientas y guías de publicación/operación. Faltan proyectos del titular, Auth/HTTPS, ensayo global, cuotas reales y teléfonos. Ver etapa-11.md. |

## Dependencias externas

No se encontraron variables de conexión locales configuradas durante esta revisión, solo .env.example.
Para la validación alojada hacen falta Supabase y Cloudflare del titular.
Las pruebas físicas requieren iPhone y Android disponibles para la comprobación.
La simulación de identidad en PGlite prueba permisos SQL, pero no valida tokens, OAuth ni la red del servidor alojado.

## Avisos abiertos de la base

- Etapa 10: carga inicial JS/CSS de aproximadamente 584 kB (180 kB gzip) sin cuentas configuradas y 806 kB (236 kB gzip) con SDK de cuentas. Desglose reproducible en qa/etapa-10/build-report.json; no incluye fuentes ni imágenes a demanda.
- Etapa 10: caché inicial de 34 entradas / 773 KiB; ilustraciones de la rutina a demanda con estado visible. Falta comprobar cuotas y actualización de recursos alojados en etapa 11.
- El acceso visible ya usa usuario y contraseña. Habilitarlo requiere configurar el proyecto y desplegar accounts. La migración conserva cuentas antiguas, pero su vinculación a un usuario requiere planificación si existen en el proyecto.
- La restauración local existe en código pero no tiene acceso visible en Perfil.
- Los informes anteriores de pilot-qa.md son históricos y pueden describir requisitos reemplazados.

## Cierre después de las once etapas

Las comprobaciones alojadas, físicas y operativas que deben retomarse al terminar están en [Cierre final](cierre-final.md). Este registro se actualizará en las siguientes entregas.

## Avance de etapa 5 · 19/11/2026

La cobertura revisada pedida está implementada: 75 láminas, cinco principales propios para cada especie y todo el catálogo para el dragón. Banco plano corregido, selección propia/dragón, galería local y persistencia de festejo/evolución. Se comprobaron hábitats, familiares, ambas poses y movimiento reducido en Chromium y WebKit, además de una sesión offline con demostrador distinto al compañero. Faltan ropa adaptada a las nuevas poses, compresión/rendimiento real y validación alojada/física. La muestra de ropa de etapa 4 conserva su revisión pendiente. Evidencia en etapa-5.md.

## Actualización de Explorar · 19/11/2026

Implementados tres programas seleccionados, tres insignias y 22 ejercicios nuevos (68 en total), con dos poses humanas por variante y mapas musculares. Se conservan los programas antiguos guardados. La cobertura anterior de mascotas no equivale a 68 animaciones propias: las variantes nuevas usan la selección compatible del día o preparación. Ver rutinas-explorar.md para comprobaciones y límites. Publicación y teléfonos físicos siguen pendientes.

## Catálogo ampliado · 19/11/2026

Completado: 116 ejercicios disponibles, buscador en el editor, 48 incorporaciones con dos poses y mapas musculares, cardio y movilidad por tiempo, importación en minutos/segundos, calentamiento/finalización y validación SQL de duraciones. Pruebas y evidencia en catalogo-gimnasio.md. Pendientes externos: migración 202611190021 en el proyecto alojado y teléfonos físicos. Distancia/calorías/telemetría de máquinas y nuevas demostraciones de mascotas para estas variantes quedan fuera de esta ampliación.

## Rediseño de creación · 19/11/2026

Completado: acceso directo al editor, Día 1 inicial, catálogo visual de selección múltiple, categorías, valores compactos, resumen/edición por día, identidad automática por días y nombre/foto editables después de crear. Borradores separados por cuenta en IndexedDB, versiones y ejercicios propios conservados. Comprobaciones y evidencia: crear-rutina.md. La pantalla de opciones de /editor fue eliminada; la URL anterior redirige. Pendientes externos: teléfonos físicos y entorno publicado.

## Rutina DEV · 19/11/2026

Completado: rutina original de Rocco en Explorar para todas las cuentas, con nombre Rutina DEV, cinco días y 31 ejercicios, tarjeta destacada azul, portada propia y copia personal al usarla. Mantiene cargas/observaciones; completa valores ausentes con sugerencias. Portada compatible con respaldo, compartir y offline. Pendiente: publicar esta versión en el entorno del titular para que el cambio llegue a los usuarios del sitio público.

## Ajuste de prendas · 19/11/2026

Corregida la composición de pantalones y shorts sobre el cuerpo, con molde redondeado para bebés y adaptación a las proporciones del dibujo vestido. Revisadas 25 prendas en ocho especies y cinco etapas, 4.360 renderizados y láminas visuales, además de combinaciones con gorros, coronas y relojes. Evidencia y límites: ropa-ajustada.md. Siguen pendientes publicación, teléfonos físicos y ropa en las ilustraciones separadas de entrenamiento.

## Equipamiento exclusivo por mascota
Cada objeto tiene un único usuario en la vista y en la tienda. Las asignaciones antiguas duplicadas se resuelven con prioridad del compañero inicial y luego orden estable de especies. La siguiente edición de equipo guarda el inventario normalizado. Migración 202611190022 preparada para validar exclusividad en PostgreSQL, pendiente de aplicar y probar en el proyecto alojado.

