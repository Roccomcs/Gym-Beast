# Ampliación del catálogo de gimnasio · 19/11/2026

## Resultado

Se agregaron 48 ejercicios: 28 de fuerza, 14 de cardio/acondicionamiento y seis de movilidad. El catálogo pasa de 68 a 116 sin cambiar las tres rutinas de Explorar ni las rutinas propias. Todos se pueden elegir desde el nuevo buscador del editor manual, con filtros de tipo y músculo, y por nombre, sinónimos y equipo. La biblioteca también permite filtrar Fuerza, Cardio y Movilidad.

Cada opción incorpora identificador estable, sinónimos en español/inglés, equipo, músculos principales/secundarios y dos poses originales pixel art. Las demostraciones alternan las dos poses y permiten cambiarlas manualmente con movimiento reducido. No se agregaron animaciones de mascota para estos 48 movimientos; se conserva la selección compatible o preparación existente.

## Registro e importación

El cardio y la movilidad se anotan por segundos en lugar de repeticiones; el editor permite elegir Calentamiento o Cardio/finalización. Las actividades pueden colocarse al principio o al final del día. Las asistencias de dominadas y fondos se identifican como asistencia, sin premios por aumentar esa carga.

El importador acepta `Bicicleta 20 min`, `Soga 3x30s`, `Elíptica 2,5 min`, `Remo cardio 1x5 minutos` y `Calentamiento: Bici 5 min`. Convierte minutos a segundos y conserva el texto original. Los valores sin una unidad temporal quedan señalados para revisión, sin inferir kg. Las actividades por tiempo no generan volumen de fuerza, e1RM, sugerencias de subir peso ni bonus de carga. El tiempo se conserva usando el campo existente de series junto a `measure: seconds`; no se convierte a repeticiones al sincronizar o restaurar.

La migración `202611190021_timed_activities.sql` admite 1–86400 segundos solo si el ejercicio de la sesión de la misma cuenta está marcado por tiempo. El límite de fuerza sigue siendo 1–1000 repeticiones. Las comprobaciones de propiedad, compras y relación serie/sesión permanecen activas.

No se incorporaron mediciones de distancia, calorías, velocidad, inclinación ni conexión Bluetooth a máquinas. Son mejoras futuras, separadas de este catálogo y del registro por tiempo ya implementado.

## Fuentes consultadas

- Boostcamp, biblioteca pública: https://www.boostcamp.app/exercises — complementó faltantes como face pull, búlgara, swing, dominada supina y cruces de poleas. Su web publica 30 guías y anuncia una biblioteca mayor dentro de la app; no se extrajo esa biblioteca privada.
- Boostcamp PHUL: https://www.boostcamp.app/programs/phul-4-day-split — referencia adicional de variantes utilizadas en programas.
- NASM: https://www.nasm.org/resource-center/exercise-library — contraste de movimientos y movilidad.
- Concept2: https://www.concept2.com/training/rowing-technique — secuencia piernas/cadera/brazos y regreso inverso del remo ergómetro.

Las fuentes se usaron como referencia; no se redistribuyen videos ni imágenes de Boostcamp. Las ilustraciones son originales generadas con OpenAI. Prompts, rutas y revisión de transparencia: propuestas/rutinas/gym-exercise-art.json. Recursos finales: public/exercise-poses/gym-expansion-1.webp a gym-expansion-12.webp, WebP sin pérdida. Se revisaron las doce láminas y se corrigió el fondo semitransparente de la octava mediante la herramienta de imágenes.

## Verificación y pendientes

- 296 pruebas de dominio y PostgreSQL de prueba aprobadas; incluyen identidad/sinónimos de las 48 incorporaciones, músculos/poses, minutos con coma, intervalos, duraciones inválidas, límites del servidor, aislamiento de cuentas y premio único de una sesión con cardio.
- Dos recorridos nuevos aprobados en Chromium y cuatro en WebKit (320/390 px): crear desde el catálogo, editar duración/uso, guardar, registrar, recargar offline, conservar valores/ilustraciones y finalizar. Se decodificaron las doce láminas en el navegador.
- Los otros 27 recorridos de la batería principal también pasaron. El selector de la prueba nueva se corrigió para usar el nombre accesible del desplegable, y luego pasaron ambos casos nuevos.
- Compilación y comprobación local de publicación aprobadas. Recursos cargados bajo demanda; solo las láminas de la rutina activa se preparan offline. Los doce WebP ocupan aproximadamente 11 MB; no se incorporan todos al arranque.
- Evidencia móvil: qa/catalogo-gimnasio. Pendiente aplicar la migración en el proyecto público y comprobar teléfonos físicos, porque no se dispone de esos entornos. No se marca el piloto público como listo.

## Incorporaciones

| Tipo | Ejercicio | Equipo | Principal |
|---|---|---|---|
| Cardio | Saltar la soga | Otro | Gemelos |
| Cardio | Remo ergómetro | Máquina | Cuerpo completo |
| Cardio | Correr en cinta | Cinta | Cuerpo completo |
| Cardio | Caminata inclinada en cinta | Cinta | Glúteos |
| Cardio | Bicicleta fija | Máquina | Cuádriceps |
| Cardio | Bicicleta reclinada | Máquina | Cuádriceps |
| Cardio | Elíptica | Máquina | Cuerpo completo |
| Cardio | Escaladora de peldaños | Máquina | Glúteos |
| Cardio | Stepper de pedales | Máquina | Glúteos |
| Cardio | Bicicleta de aire | Máquina | Cuerpo completo |
| Cardio | SkiErg | Máquina | Espalda |
| Cardio | Cuerdas de batalla | Otro | Hombros |
| Cardio | Saltos de tijera | Peso corporal | Cuerpo completo |
| Cardio | Rodillas altas | Peso corporal | Cuádriceps |
| Movilidad | Círculos de brazos | Peso corporal | Hombros |
| Movilidad | Balanceos de pierna | Peso corporal | Glúteos |
| Movilidad | Gato y vaca | Peso corporal | Abdominales |
| Movilidad | Estiramiento de flexores de cadera | Peso corporal | Cuádriceps |
| Movilidad | Estiramiento de isquiotibiales | Peso corporal | Isquiotibiales |
| Movilidad | Postura del niño | Peso corporal | Espalda |
| Fuerza | Face pull con cuerda | Polea | Hombros |
| Fuerza | Sentadilla búlgara con mancuernas | Mancuernas | Cuádriceps |
| Fuerza | Swing con kettlebell | Otro | Glúteos |
| Fuerza | Dominadas supinas | Peso corporal | Espalda |
| Fuerza | Dominadas asistidas en máquina | Máquina | Espalda |
| Fuerza | Fondos asistidos en máquina | Máquina | Tríceps |
| Fuerza | Press de pecho en máquina | Máquina | Pecho |
| Fuerza | Press inclinado en máquina | Máquina | Pecho |
| Fuerza | Press de hombros en máquina | Máquina | Hombros |
| Fuerza | Cruces de poleas | Polea | Pecho |
| Fuerza | Pullover en polea | Polea | Espalda |
| Fuerza | Jalón unilateral en polea | Polea | Espalda |
| Fuerza | Peso muerto rumano con mancuernas | Mancuernas | Isquiotibiales |
| Fuerza | Peso muerto sumo | Barra | Glúteos |
| Fuerza | Peso muerto con barra hexagonal | Barra | Cuádriceps |
| Fuerza | Subida al cajón con mancuernas | Mancuernas | Cuádriceps |
| Fuerza | Aductores en máquina | Máquina | Aductores |
| Fuerza | Patada de glúteo en polea | Polea | Glúteos |
| Fuerza | Extensión lumbar a 45 grados | Máquina | Espalda |
| Fuerza | Encogimientos con mancuernas | Mancuernas | Espalda |
| Fuerza | Elevación lateral en polea | Polea | Hombros |
| Fuerza | Curl de bíceps en polea | Polea | Bíceps |
| Fuerza | Curl inverso con barra EZ | Barra | Bíceps |
| Fuerza | Tríceps con cuerda en polea | Polea | Tríceps |
| Fuerza | Crunch abdominal en polea | Polea | Abdominales |
| Fuerza | Elevación de rodillas colgado | Peso corporal | Abdominales |
| Fuerza | Rueda abdominal | Otro | Abdominales |
| Fuerza | Plancha lateral | Peso corporal | Abdominales |
