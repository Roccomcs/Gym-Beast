# Créditos visuales

- Las láminas transparentes de `public/exercise-poses` amplían las demostraciones de movimiento del catálogo. Las ilustraciones se generaron para GymBeast con OpenAI ImageGen.

- Las portadas y las poses ilustradas de press banca y estocadas del rediseño se generaron para GymBeast con OpenAI ImageGen. El emblema de la bestia usa geometría pixel art original y colores inspirados en la referencia de Black Sheep Canning.

- Las láminas de fútbol en `public/jerseys` se generaron para GymBeast con OpenAI ImageGen a partir de los sprites del juego. Las máscaras delimitan la tela para aplicar los diseños del catálogo sin modificar piel, pelo ni plumas.
- Las láminas de musculosas y buzos en `public/garments` se generaron con OpenAI ImageGen a partir de los sprites de fútbol. Cada prenda tiene una silueta propia, con máscaras para teñir la tela y sus remates.
- Los pantalones y shorts en `public/garments` se generaron con OpenAI ImageGen sobre las etapas existentes y se retocaron para las poses pequeñas. Las máscaras se usan para combinar la prenda con un top. Los accesorios equipados son ilustraciones vectoriales originales de GymBeast.

- Mascotas en public/companions.png. Sprites generados para GymBeast con OpenAI ImageGen.
- Ejercicios en public/exercise-sprites.png. Ilustraciones generadas para GymBeast con OpenAI ImageGen. Las cuatro imágenes representan variantes concretas y se muestran en sus fichas correspondientes.
- La biblioteca usa un diagrama vectorial original para distinguir regiones musculares.
- Press Start 2P y Atkinson Hyperlegible Next se sirven desde la aplicación. Sus respectivas licencias SIL Open Font License acompañan esta documentación.
- Los íconos de interfaz pertenecen a Lucide (ISC).
- Portadas en public/program-covers.jpg. Diez portadas originales generadas para GymBeast con OpenAI ImageGen.
- Hábitat en public/habitat.jpg, seis etapas del dragón en public/dragon-stages.webp y fichas del catálogo en public/exercise-atlas-*.jpg. Ilustraciones generadas para GymBeast con OpenAI ImageGen.
- Jalón al pecho en public/pulldown-front.jpg. Tres variantes con agarres frontales, ilustración generada para GymBeast con OpenAI ImageGen.
- Las láminas de evolución crocodile-stages.webp, bear-stages.webp y wolf-stages.webp son ilustraciones originales de GymBeast generadas con OpenAI ImageGen.
- Fondos en public/habitat-crocodile.webp, public/habitat-bear.webp y public/habitat-wolf.webp. Escenarios originales generados con OpenAI ImageGen para la laguna de mangles, el claro otoñal y el bosque nevado de noche.
- Tienda en public/magic-shop.webp, láminas public/{fox,axolotl,tiger,phoenix}-stages.webp y hábitats public/habitat-{fox,axolotl,tiger,phoenix}.webp. Escenario de bazar, sprites y fondos originales generados con OpenAI ImageGen. Las camisetas dibujadas en la app usan paletas inspiradas en sus equipos y no incorporan escudos, auspiciantes ni diseños oficiales.

- La muestra public/wardrobe/dragon-cria-hoodie-watch-v2.png se generó con OpenAI ImageGen el 18 de noviembre de 2026 usando el sprite vestido de GymBeast como referencia. Integra buzo y reloj ilustrado para el dragón Cría. Su aprobación visual está pendiente.

### Demostraciones de mascota · 18–19/11/2026

75 atlases PNG en public/pet-training/{species}/{movement}.png. Generados con la herramienta integrada de imágenes de OpenAI a partir de los compañeros existentes de GymBeast. Cada uno contiene cinco edades y dos poses con transparencia alfa. Los bancos corregidos usan además public/exercise-poses/basics.webp como referencia de postura. Se descartaron las generaciones previas sentadas. Recortes y revisión de contenido: src/pet-training-atlases.json. Prompts: docs/qa/etapa-5/prompts.json. Autoría/procedencia y limitaciones detalladas en docs/etapa-5.md. No se asigna licencia CC de terceros a estas generaciones. Mantener la revisión de las referencias de origen junto con el registro general.

### Incorporaciones de etapa 6 · 19/11/2026

Se agregan public/exercise-poses/program-basics.png (dos poses de cinco movimientos humanos), public/exercise-poses/french-press-lying.png (reemplazo de la variante acostada) y cinco láminas del dragón en public/pet-training/dragon: overhead-press, romanian-deadlift, inverted-row, push-up y bodyweight-squat. Generadas con la herramienta integrada de imágenes de OpenAI usando como referencias las ilustraciones existentes de GymBeast. Se descartó una primera salida de formato infografía; la app consume exclusivamente las láminas corregidas. La ropa equipada de las mascotas conserva el acabado previo. El conjunto de mascotas entrenando pasa a 80 láminas. La fuente de los programas y las diferencias de adaptación están en etapa-6.md.

### Formatos de etapa 10 · 19/11/2026

Las 80 láminas de mascotas entrenando y las dos PNG humanas de etapa 6 tienen copias WebP sin pérdida. Se verificó igualdad exacta de píxeles RGBA; no se crearon personajes ni cambió su autoría. Fuentes, huellas y tamaños: docs/qa/etapa-10/art-optimization.json. La salida publicada conserva solo las copias WebP con compatibilidad de URL; los PNG originales siguen en el repositorio. public/icon-maskable-512.png deriva del icono aprobado con margen de seguridad sobre carbón, sin ilustración nueva.

## Ampliación de Explorar · 19/11/2026

Tres insignias originales generadas con OpenAI y aprobadas por el titular, distribuidas en public/routine-covers/{basic,intermediate,advanced}.webp. Seis láminas originales de ejercicios con dos poses, generadas con OpenAI usando arte propio como referencia, en public/exercise-poses/program-expansion-1.png a program-expansion-6.png. No incorporan imágenes extraídas de las fuentes de programas. Prompts y procedencia: docs/propuestas/rutinas/README.md y exercise-art.json. No requieren atribución de un tercero incorporado. Las referencias PHUL y PHAT se acreditan en las fichas; son adaptaciones de series fijas, sin afiliación con sus autores.

## Catálogo ampliado de gimnasio · 19/11/2026

48 ejercicios ilustrados en doce láminas originales de dos poses, generadas con la herramienta integrada de OpenAI tomando como referencia el atleta propio existente. Recursos finales WebP sin pérdida: public/exercise-poses/gym-expansion-1.webp a gym-expansion-12.webp. El fondo de la lámina 8 se corrigió con la misma herramienta. Prompts y procedencia: docs/propuestas/rutinas/gym-exercise-art.json. No se copiaron imágenes ni videos de Boostcamp, NASM o Concept2; se consultaron como referencias de movimientos y se acreditan en catalogo-gimnasio.md.

## Rutina DEV · 19/11/2026

public/routine-covers/dev.svg: insignia original vectorial creada en el proyecto, sin recursos ni fuentes externas. Paleta azul/cian, barra, contorno escalonado y letras DEV trazadas como geometría. La rutina original se publica por instrucción explícita de su titular; la plantilla queda separada de las sesiones y datos privados.
