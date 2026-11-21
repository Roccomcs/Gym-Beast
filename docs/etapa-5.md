# Etapa 5 · Mascota entrenando y animaciones

Estado actualizado: 19/11/2026. La cobertura de demostraciones acordada en el último pedido está implementada. La etapa completa conserva pendientes de calce y validación física.

## Cierre de la cobertura revisada · 19/11/2026

El último pedido reemplaza la obligación de dibujar todos los ejercicios para las ocho especies: cada una tiene banco plano, jalón al pecho, sentadilla, curl de bíceps y prensa. El dragón cubre todo el catálogo de 41 identificadores mediante 33 grupos de movimiento. Se conservan las estocadas propias ya generadas para las otras especies.

- Total: 75 láminas transparentes, cinco edades y dos poses por edad: 750 poses. El huevo conserva su ilustración original.
- Selección del día: primer ejercicio principal propio disponible, luego otro ejercicio propio disponible, luego un ejercicio de ese día demostrado por el dragón. Los personalizados sin imagen muestran preparación; no se inventa una ejecución.
- La selección del ilustrador no cambia la mascota activa ni quién recibe EXP. Entrenar muestra el nombre del movimiento elegido y avisa cuando el demostrador es el dragón.
- Banco plano reemplazado para las ocho especies usando la postura humana de la lámina de ejercicios como referencia: espalda horizontal apoyada, brazos de hombros distintos y barra que baja al pecho. Se descartaron versiones sentadas y se conservan únicamente las correcciones en los archivos de la app.
- Los límites de cada fila y columna se miden por transparencia. Esto evita mostrar una parte del personaje vecino cuando la separación dibujada no cae exactamente en el centro de la lámina. No se modifica la anatomía con este recorte.
- Tres recursos del dragón se regeneraron para corregir márgenes o postura: fondos, curl femoral y press con mancuernas.
- Galería local en Perfil: selector Escena/Entrenamiento, especie, edad y cualquiera de los 41 ejercicios. Solo es una vista de prueba y no modifica inventario, perfil ni recompensas.
- Recibos de presentación por cuenta y sesión en IndexedDB: el festejo y la evolución no se repiten al reabrir un cierre. Un premio que llega tarde puede mostrar su evolución una sola vez. Estos recibos no conceden premios.
- Animaciones pausadas al ocultar la app. Movimiento reducido desactiva desplazamientos, reacciones y festejos; las poses se alternan manualmente.
- Caché independiente gymbeast-pet-training-v2, con revisión de contenido en la URL para reemplazar imágenes antiguas. Descarga bajo demanda y anticipación de los movimientos de la rutina activa; el resto no entra en la instalación inicial.

## Comprobaciones de la cobertura revisada

- Compilación correcta; 126 pruebas de dominio/SQL/regresión correctas, incluidas las nuevas decisiones de selección y cobertura completa de catálogo.
- Chromium y WebKit: cinco ejercicios principales de las ocho especies en las cinco edades, con cambio a ambas poses y capturas por estado.
- Chromium y WebKit: 48 hábitats con reacción, familiar independiente y movimiento reducido; premio tardío, evolución omitible, reapertura sin repetición y pausa en segundo plano.
- Navegador de producción con service worker: lobo acompañado por demostración del dragón, caché versionada, recarga offline, registro de una serie, premio +25 EXP/+20 oro y festejo del lobo al finalizar, conservado al reabrir.
- Auditoría de las 75 láminas: cinco filas identificadas, dos columnas por edad, transparencia y cero avisos de figuras tocando bordes. Informe: docs/qa/etapa-5/atlas-audit.json.
- Se revisaron visualmente las ocho especies en las capturas de los principales y se corrigieron los recortes encontrados. Las capturas no constituyen una validación profesional de técnica de ejercicio.
- El recorrido general conservó 19 casos correctos y detectó una expectativa vieja: movimiento reducido esperaba el antiguo destello. Se actualizó para exigir ausencia de animación, consistente con la revisión accesible nueva, y se volvió a comprobar ese caso.
- Ocho recorridos específicos de mascotas correctos (cuatro por motor), dos recorridos visuales de entrenamiento y once recorridos de cuentas/sincronización correctos. Las cuentas de estas pruebas siguen usando transporte simulado y PostgreSQL embebido, no el servidor publicado.
- Las variantes de bíceps pueden usar la demostración principal propia, rotulada Curl bíceps, si la especie no tiene la variante exacta. El dragón conserva las variantes específicas y esto no modifica el ejercicio de la rutina.

## Lo que permanece pendiente

- Decisión del titular del 19/11 al iniciar etapa 6: conservar la ropa actual. La ampliación de prendas sobre cada nueva pose deja de ser una condición de este cierre; la auditoría exhaustiva anterior no se declara completada.
- Validación en iPhone y Android físicos, memoria y rendimiento en equipos representativos, instalación real y sincronización con el servidor publicado. Chromium/WebKit locales y el servidor simulado no sustituyen esas pruebas.
- Los programas y la precisión anatómica de las demostraciones humanas pertenecen a la revisión de etapa 6. Las demostraciones de mascotas son ilustraciones motivacionales de dos poses, no animaciones anatómicas continuas.
- La compresión de estos originales PNG (156.775.339 bytes en total) y los presupuestos de descarga corresponden a etapa 10. El conjunto no se descarga completo: la caché de entrenamiento admite como máximo 16 láminas y la instalación base excluye esta carpeta.

## Recursos, prompts y reproducción

Recursos finales: public/pet-training/{species}/{movement}.png. Recortes y revisiones: src/pet-training-atlases.json. Generación: herramienta integrada de imágenes de OpenAI, sin modelos 3D ni imágenes externas de Google. Referencias de identidad: los compañeros existentes de GymBeast. Postura de banca: public/exercise-poses/basics.webp. Prompts finales y restricciones: docs/qa/etapa-5/prompts.json.

Reindexar metadatos con Python y Pillow: python scripts/index-pet-training.py. Esta herramienta solo lee píxeles para producir el informe y los recortes; no edita las imágenes.

Comprobar comportamiento: npm test, npm run build, npm run test:e2e y npm run test:pets. Las capturas completas de Chromium/WebKit quedan en pets-results; los ejemplos conservados para revisión están en docs/qa/etapa-5.

## Registro histórico · primera entrega

El contenido siguiente describe la entrega parcial del 18/11. Sus pendientes de cobertura quedan reemplazados por el cierre anterior; se conserva para distinguir la evidencia de cada entrega.

## Implementado en esta entrega

- Seis láminas originales: dragón, oso y cocodrilo haciendo press banca y estocadas. Cada lámina contiene dos poses de las cinco edades posteriores al huevo: 60 poses en total.
- Se conserva el personaje de cada especie, en lugar de mostrar una figura genérica coloreada. Huevo, especies y movimientos aún sin lámina muestran el compañero original preparándose.
- Selección por identificador del ejercicio: banca con barra/Smith y estocadas largas/ida y vuelta. El resto del mapa de movimientos es una clasificación futura; no implica arte terminado.
- Recortes por filas medidos mediante el canal alfa. La revisión en navegador detectó fragmentos de la fila siguiente en dos láminas; se corrigieron con límites explícitos en pet-training-atlases.json.
- Ilustraciones bajo demanda y caché separada de hasta 16 láminas. Al entrar en Entrenar se anticipan las demostraciones disponibles de la rutina activa. Si no se descargaron, se mantiene la mascota original; no se promete la demostración offline antes de descargarla.
- La nueva sesión conserva la EXP de su compañero al empezar. Entrenar retoma especie, etapa y primer ejercicio de esa sesión; no toma los de otra mascota elegida después.
- Festejo de sesiones elegibles incluso mientras el premio sincronizado está pendiente. Incluye movimientos diferenciados por especie, aviso de evolución al cruzar un umbral y opción de omitir. Los premios siguen visibles al omitir.
- Movimiento reducido: poses fijas y botón para alternarlas. Festejo sin movimiento.

## Evidencia ejecutada

- npm run build: correcto. Persiste el aviso de tamaño del JavaScript principal; optimización pendiente de etapa 10.
- npm test: 112 casos correctos.
- npm run test:e2e: 19 recorridos correctos (Chromium, entorno local).
- npx playwright test --config playwright.wardrobe.config.ts e2e/wardrobe/training.spec.ts --workers=1: 2 recorridos correctos; seis combinaciones revisadas a 320/390 px, movimiento reducido, preparación y festejo/evolución omitible.
- Capturas de las seis combinaciones inspeccionadas; ejemplos conservados en docs/qa/etapa-5/demostraciones.
- La inspección visual de esta entrega corresponde a Cría. Las otras edades están incorporadas en las láminas, pero requieren revisión visual individual de todas las poses antes de aprobarlas.

## Pendientes de la etapa

- Completar press banca y estocadas para lobo, zorro, ajolote, tigre y fénix.
- Completar sentadilla, peso muerto, jalones, hip thrust, prensa, dominadas y press con mancuernas para las ocho especies. La cobertura prevista de los primeros ejercicios es 72 láminas; hay 6.
- Revisar individualmente las 60 poses actuales y las futuras: agarre, rango, escala, identidad y ausencia de recortes. Las dos poses son alternadas; aún no hay interpolación anatómica ni cuadros intermedios.
- La demostración no incorpora ropa equipada. La ropa de la escena y del festejo sigue el sistema existente y la revisión pendiente de etapa 4.
- Revisar sistemáticamente movimiento autónomo, interacción, familiares y fondos en las 48 combinaciones de especie/etapa. Esta entrega no certifica ese conjunto.
- Evitar repetir presentación de evolución al volver a abrir un cierre histórico; comprobar la llegada tardía de premios reales desde el servidor.
- Probar caché de las nuevas láminas en una PWA instalada, memoria y pausa de animaciones en segundo plano.
- Validar en WebKit y teléfonos físicos. No se ejecutaron esas pruebas en esta entrega.

## Autoría de recursos

Las seis imágenes de public/pet-training fueron generadas con la herramienta de imágenes de OpenAI a partir de referencias de los compañeros existentes de GymBeast, el 18/11/2026. No se incorporaron imágenes encontradas en Google ni modelos 3D. Las referencias originales conservan su registro de procedencia existente. No se asigna una licencia externa CC a estas generaciones.
