# Etapa 6 · Ejercicios, programas e importación

Entrega local del 19/11/2026. Se conserva el acabado actual de ropa por decisión del titular. La siguiente entrega acordada es etapa 7; esta etapa no declara listo el piloto publicado.

## Implementado

- Catálogo ampliado de 41 a 46 identificadores estables. Se agregaron press militar, peso muerto rumano, remo invertido, flexiones y sentadilla sin peso para completar patrones que faltaban en los programas. Tienen dos poses, miniatura, equipo, músculos y descripción. La variante rumana mantiene identidad distinta al peso muerto convencional.
- Revisión ilustrada de las 46 variantes, ambas poses y mapas musculares en Chromium y WebKit. Se sustituyó el press francés sentado por una ilustración acostada coherente con la variante y sus instrucciones. Las fichas de la biblioteca ahora usan las poses ilustradas reales en lugar de la figura esquemática para las posiciones.
- Cinco demostraciones nuevas del dragón para acompañar los movimientos agregados. La selección propia/dragón de etapa 5 sigue vigente. Las otras mascotas conservan sus cinco movimientos principales.
- Diez adaptaciones revisadas y Rutina Rocco, cada una con objetivo, prescripción, descanso, recuperación, fuente y explicación de las diferencias con el programa de referencia. Las copias guardadas y las sesiones conservan sus instantáneas; la revisión se aplica a nuevas copias de Explorar.
- Fuerza base alterna A/B/A y B/A/B al repetir el ciclo. Guarda la nueva versión y el nuevo ciclo en una transacción local, evitando dobles repeticiones y conservando las sesiones previas. Al editarla como rutina propia se deja explícito que repetirá la división elegida.
- El importador reconoce abreviaturas como c/manc y decimales con coma; evita usar el descanso o el tempo como peso; conserva observaciones y texto original. Señala fragmentos sin interpretar y superseries incompletas.
- La vista previa propone 3×10 cuando faltan valores y dos series en las superseries de dos vueltas. Las sugerencias normales no exigen marcar treinta casillas. Las ambigüedades reales requieren confirmar la revisión antes de guardar.
- El texto exacto de Rocco da cinco días y 31 ejercicios, hip thrust 2×15 sin carga, banco con 55 e intento 60, estocadas de cuatro series con 10 kg, y dos vueltas de vuelos. Solo Curl unilateral queda sin variante asignada. Sin clasificar mantiene modo desconocido y mapa neutro, sin atribuirle músculos ni métricas por suposición.
- Los ejercicios propios guardan UUID de definición, músculos principales/secundarios, equipo y modalidad. Se reutilizan por nombre desde las rutinas de la cuenta y conservan identidad al copiar o renombrar. Sesiones, respaldo y sincronización preservan esos datos; los músculos aparecen al entrenar y en la distribución de progreso.
- Las planchas se registran en segundos. La duración no genera volumen ni e1RM calculados como si fueran repeticiones.
- Migración 202611190013_exercise_snapshots.sql: validación de prescripciones y metadatos propios en rutina, planificación y sesión; conserva compatibilidad con instantáneas anteriores.
- La prueba WebKit detectó un aviso de guardado anterior que podía seguir visible durante el siguiente guardado. Ahora se limpia, se indica Guardando y se evitan ediciones o envíos repetidos hasta confirmar la escritura.

## Fuentes y decisiones

Consultadas el 19/11/2026. Las fichas enlazan la referencia y describen la adaptación. Se escribieron textos propios y se usaron hechos de estructura; no se redistribuyen PDFs ni ilustraciones de las fuentes.

| Adaptación | Referencia verificada | Aplicación en GymBeast |
|---|---|---|
| Fuerza base | [StrongLifts](https://stronglifts.com/stronglifts-5x5/workout-program/) | Cinco básicos, A/B, tres sesiones y alternancia entre ciclos. |
| Cuerpo completo ondulante | [Madcow](https://stronglifts.com/madcow-5x5/workout-guide/) | Días de distinta intensidad; rampas y ajustes de peso manuales. |
| Fuerza por niveles | [GZCLP, socio oficial del autor](https://www.boostcamp.app/programs/gzcl-program-gzclp) | Tres niveles y adaptación de tres días; sin automatizar cambios de fase. |
| Fuerza y volumen | [PHUL del autor en Muscle & Strength](https://www.muscleandstrength.com/workouts/phul-workout) | Cuatro sesiones de torso/pierna, fuerza y volumen. |
| Bloque de básicos | [Jim Wendler](https://www.jimwendler.com/blogs/jimwendler-com/101077382-boring-but-big) | Básico más 5×10; simplificación explícita, no motor 5/3/1. |
| Empuje, tirón y pierna | [Publicación original de Metallicadpa](https://www.reddit.com/r/Fitness/comments/37ylk5/a_linear_progression_based_ppl_program_for/) | Dos vueltas, principales alternados y accesorios; series fijas. |
| Torso y pierna | [Programa publicado por Nuñez](https://www.boostcamp.app/programs/alberto-nu-ez-upper-lower-program) | Cuatro días generalistas; no reproduce sus cuatro variantes. |
| Fuerza con volumen avanzado | [Wiki de la comunidad con referencia al autor](https://thefitness.wiki/routines/nsuns-lp/) | Versión de menor volumen, sin calcular porcentajes ni training max. |
| Potencia e hipertrofia | [PHAT publicado por su autor en Boostcamp](https://www.boostcamp.app/programs/phat), [Biolayne](https://biolayne.com/phat/) | Cinco días de fuerza/hipertrofia; simplifica accesorios y velocidad. |
| Fuerza corporal | [Wiki de r/bodyweightfitness](https://redditbwf.github.io/wiki/recommended_routine.html) | Empuje, tirón horizontal/vertical, pierna, puente y core; variantes manuales. |

El motor porcentual completo de Madcow, 5/3/1 y nSuns y las progresiones de habilidades del RR no se presentan como implementados. Las adaptaciones usan registro editable y progresión explícita en la ficha. Implementar esos motores sería una ampliación de producto, no una equivalencia que esta entrega prometa.

## Comprobado

- Compilación y 162 pruebas de dominio/SQL correctas, incluida la importación exacta, nuevos casos ambiguos, cobertura de programas y escrituras inválidas en PostgreSQL embebido.
- 23 recorridos generales correctos: creación con foto, importación, edición/versiones, entrenamiento offline, premios, tienda y persistencia.
- Seis recorridos específicos a 320 px: crear/reutilizar un ejercicio propio y reabrir offline, confirmar una ambigüedad y repetir el ciclo sin alterar historial; tres en Chromium y tres en WebKit.
- Dos recorridos de revisión de las 46 ilustraciones y músculos en ambos motores; capturas de ambas poses. La revisión visual es de producto, no una certificación profesional de técnica.
- Once recorridos de cuentas/sincronización correctos con la nueva migración en el PostgreSQL de prueba.
- Auditoría de recortes: 80 láminas de mascotas y la lámina humana adicional de cinco filas, sin errores de filas ni figuras recortadas. El press francés usa una lámina independiente de dos columnas.

Reproducción: npm test; npm run build; npm run test:e2e; npx playwright test --config playwright.stage-six.config.ts --workers=1; npm run test:pets -- --grep "46 variantes"; npm run test:accounts.

Las capturas completas se generan en pets-results y stage-six-results. Evidencia conservada y registro visual: docs/qa/etapa-6. Los recursos nuevos están en public/exercise-poses y public/pet-training/dragon, generados con la herramienta integrada de imágenes de OpenAI a partir de referencias de GymBeast. Créditos: assets-licenses.md.

## Pendientes posteriores

- Aplicar la migración en el proyecto del titular y repetir cuentas, aislamiento, respaldo y restauración en el servidor publicado.
- Pruebas físicas iPhone/Android, lectores de pantalla, rendimiento, compresión de recursos y capacidad siguen en etapas 10–11 y cierre-final.md.
- El premio adicional por subir peso corresponde a etapa 7 y todavía no está incluido.
- Las etapas 8–9 conservan sus pendientes de misiones, vida/evolución y comparación social.

La ropa actual se conserva. La ampliación de calce y prendas sobre cada pose queda fuera de este cierre por la última decisión del titular.
