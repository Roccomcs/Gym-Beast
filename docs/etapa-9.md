# Etapa 9 · Amigos, perfiles y comparación

Entrega del 19 de noviembre de 2026. Se conservan Obsidiana dorada, mascotas 2D, ropa, navegación y las eliminaciones anteriores.

## Implementado

- Desde Amigos se puede abrir el perfil de cada amistad aceptada. Incluye foto, nombre, mascota con su hábitat y atuendo actual, vida, EXP propia de mascota, EXP de cuenta, constancia, récords y rutinas que eligió compartir.
- La etapa y la vida del compañero se reconstruyen con las reglas de etapa 8. No se dibuja una etapa ficticia sumando toda la EXP histórica: los castigos y descensos se conservan. La fecha de cuidado usa la zona horaria de cada cuenta.
- Comparación visual de los últimos 7, 28 o 90 días: días entrenados, sesiones confirmadas, EXP de entrenamientos y máximas cargas del período. Ambas personas se comparan en el mismo intervalo de fechas, con cierre en la zona horaria del visitante. La EXP de entrenamientos del intervalo no incluye los hitos generales de cuenta.
- Las cargas solo se comparan cuando coincide el identificador de ejercicio y su modalidad total/por lado. Se convierten desde kg canónicos a la unidad de quien mira. Variantes distintas y ejercicios propios con UUID diferentes no se mezclan; asistencia, peso corporal, calentamientos y series inválidas no se presentan como récords de carga externa.
- Las rutinas son privadas por defecto. En Amigos, cada persona elige qué rutinas propias pueden ver y copiar sus amigos aceptados. La ficha muestra portada/foto, días, ejercicios ilustrados, músculos y prescripción.
- Compartir muestra la versión actual del programa, sin pesos personales, notas, texto importado, historial de versiones ni campos privados adicionales. Retirar la selección, archivar o borrar el original lo quita de las consultas siguientes. No elimina una copia independiente que otra persona ya hubiera guardado.
- Copiar revalida la amistad y que la rutina siga compartida antes de crear una copia propia con nuevos identificadores de rutina, días, ejercicios y grupos de superserie. Conserva las clasificaciones de ejercicios propios y las series/repeticiones; permite editarla y usarla desde Mis rutinas. El guardado usa la cola durable habitual de la cuenta.
- El feed conserva la publicación voluntaria y permite quitarla. Muestra foto, usuario y EXP de la sesión, sin cargas ni notas. Celebrar/quitar celebración es idempotente. Los desafíos cooperativos muestran avance de ambos, aceptación y finalización por tres días distintos en la ventana compartida; las fechas futuras no adelantan el desafío y las correcciones recalculan su avance. Cada desafío conserva la zona de quien lo creó y cuenta el inicio de ambas sesiones en ese calendario común, también al aceptar o vencer; la ciudad se indica en la ficha.
- El bloqueo o la eliminación de amistad cortan la siguiente lectura de perfil, rutinas, feed, reacciones y desafíos. Desbloquear no vuelve a aceptar la amistad automáticamente. Al recuperar foco se actualizan los permisos y se cierra un perfil que dejó de estar disponible. Sin conexión se oculta el detalle del perfil hasta poder volver a verificarlo.
- La selección de rutinas responde al toque y muestra cuándo falta confirmar el cambio. La sincronización agrupa una pasada posterior cuando una escritura llega durante otra descarga, para no anunciar como confirmado un cambio que todavía no se envió.

## Datos y privacidad

La migración 202611190016_friend_profiles.sql agrega friend_profile y helpers privados con respuestas construidas mediante listas de campos permitidos. No habilita lecturas cruzadas de training_items. Peso corporal, notas, títulos privados de sesiones y rutinas no compartidas permanecen fuera de la respuesta. Las fotos compartidas son JPEG compactos embebidos; no se admiten URLs de seguimiento en las copias. Los identificadores privados de sesiones/turnos se sustituyen por tokens en el historial mínimo necesario para reconstruir constancia y vida.

Los identificadores de rutinas compartidas se guardan en el perfil, por lo que entran en el respaldo/restauración existentes. Solo se devuelven rutinas pertenecientes a esa cuenta y no archivadas. No se creó una segunda colección de programas fuera del respaldo.

## Comprobado

- Compilación correcta y 226 pruebas de dominio/SQL aprobadas.
- Tres cuentas SQL: pendiente/aceptada/tercero, aislamiento, helpers inaccesibles, datos privados ausentes de la respuesta, copia válida, retiro/archivo, bloqueo y desbloqueo sin amistad automática.
- Etapa efectiva después de descenso distinta de la etapa que sugeriría la EXP histórica; consistencia con el cálculo del dueño.
- Comparación por variante/modalidad y conversión kg/lb; copia con IDs propios, superseries y eliminación de notas/pesos/historial.
- Celebraciones repetidas sin duplicados; desafío completado con tres fechas distintas por persona, retroceso al corregir una sesión, exclusión de fechas futuras y dos entrenamientos que cruzan medianoche UTC contados en su calendario común.
- Catorce recorridos de cuentas/sincronización aprobados, además de los 25 recorridos generales de entrenamiento, offline, ropa, tienda y gamificación.
- Cuatro recorridos sociales en Chromium a 320 px y WebKit a 390 px: dos cuentas, solicitud/aceptación, foto, perfil, comparación, compartir/copiar, feed, celebración, desafío, bloqueo con perfil abierto y confirmación de una escritura recibida durante una descarga.

Reproducción: npm test; npm run build; npm run test:accounts; npx playwright test --config playwright.social.config.ts --workers=1; npm run test:e2e -- --workers=1.

Evidencia conservada: [perfil a 320 px](qa/etapa-9/perfil-320-chromium.png), [perfil a 390 px](qa/etapa-9/perfil-390-webkit.png) y [actividad/desafío](qa/etapa-9/actividad-390-webkit.png). Los perfiles usan cuentas ficticias de QA, no amistades reales del titular.

La prueba social usa las funciones reales en PostgreSQL embebido y un transporte Auth/HTTP simulado. Deshabilita el service worker en esos contextos porque WebKit puede sacar peticiones del interceptor de pruebas al activarlo. Esto no prueba CORS ni Auth alojados. La PWA y su modo offline se comprueban por separado en las suites existentes.

## Pendientes para el cierre final

- Aplicar la migración 016 en Supabase del titular y verificar los recorridos con cuentas reales, HTTPS, Auth y conexiones independientes. Actualmente Amigos requiere una cuenta configurada; el modo local no inventa amistades ni perfiles reales.
- Medir carga y consultas con el historial de 100 cuentas, en especial la reconstrucción de vida/constancia y las respuestas de comparación. Medir la compilación con cuentas habilitadas, además de la versión sin configuración de backend.
- Revisar dispositivos físicos, VoiceOver/TalkBack, teclado, 430 px y rendimiento en etapa 10. Las capturas de navegadores no se presentan como pruebas físicas.
- Completar publicación, capacidad, cuotas y operación en etapa 11. No se inició ninguna de esas etapas en esta entrega.
