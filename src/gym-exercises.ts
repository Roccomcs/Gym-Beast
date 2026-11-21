import type {Gear,Muscle} from './exercise-meta'

type GymExercise={id:string;name:string;aliases:string;equipment:Gear;primary:Muscle;secondary:readonly Muscle[];steps:readonly [string,string];sheet:number;row:number;category:'Cardio'|'Movilidad'|'Fuerza';measure:'seconds'|'reps';mode:'bodyweight'|'assisted'|'external';duration:number}
export const gymExercises=[
  {
    "id": "jump-rope",
    "name": "Saltar la soga",
    "aliases": "soga|saltar cuerda|jump rope|comba",
    "equipment": "Otro",
    "primary": "Gemelos",
    "secondary": [
      "Cuádriceps",
      "Hombros"
    ],
    "steps": [
      "Tomá un extremo de la soga por mano y mantené los codos cerca del cuerpo.",
      "Saltá bajo mientras girás la soga con las muñecas y aterrizá suave."
    ],
    "sheet": 1,
    "row": 0,
    "category": "Cardio",
    "measure": "seconds",
    "mode": "bodyweight",
    "duration": 300
  },
  {
    "id": "rowing-erg",
    "name": "Remo ergómetro",
    "aliases": "remo cardio|remo ergometro|rowing machine|rower|ergometro",
    "equipment": "Máquina",
    "primary": "Cuerpo completo",
    "secondary": [
      "Espalda",
      "Cuádriceps",
      "Isquiotibiales"
    ],
    "steps": [
      "Ajustá las correas de los pies; acercate al volante con brazos extendidos y rodillas flexionadas.",
      "Empujá con piernas, abrí la cadera y tirá al abdomen; volvé brazos, cadera y piernas."
    ],
    "sheet": 1,
    "row": 1,
    "category": "Cardio",
    "measure": "seconds",
    "mode": "bodyweight",
    "duration": 300
  },
  {
    "id": "treadmill-run",
    "name": "Correr en cinta",
    "aliases": "carrera cinta|treadmill run|trotar|correr",
    "equipment": "Cinta",
    "primary": "Cuerpo completo",
    "secondary": [
      "Cuádriceps",
      "Gemelos"
    ],
    "steps": [
      "Comenzá a velocidad baja y ubicá el seguro de la cinta.",
      "Aumentá progresivamente y corré en el centro con pasos controlados."
    ],
    "sheet": 1,
    "row": 2,
    "category": "Cardio",
    "measure": "seconds",
    "mode": "bodyweight",
    "duration": 300
  },
  {
    "id": "incline-walk",
    "name": "Caminata inclinada en cinta",
    "aliases": "cinta inclinada|incline walk|caminata en pendiente",
    "equipment": "Cinta",
    "primary": "Glúteos",
    "secondary": [
      "Gemelos",
      "Cuádriceps"
    ],
    "steps": [
      "Empezá caminando con velocidad e inclinación cómodas.",
      "Caminá erguido sin colgarte de las barandas; bajá intensidad antes de detenerte."
    ],
    "sheet": 1,
    "row": 3,
    "category": "Cardio",
    "measure": "seconds",
    "mode": "bodyweight",
    "duration": 300
  },
  {
    "id": "stationary-bike",
    "name": "Bicicleta fija",
    "aliases": "bicicleta|bici|bicicleta estatica|spinning|stationary bike",
    "equipment": "Máquina",
    "primary": "Cuádriceps",
    "secondary": [
      "Glúteos",
      "Isquiotibiales"
    ],
    "steps": [
      "Regulá el asiento para que quede una pequeña flexión de rodilla al extender la pierna.",
      "Pedaleá continuo con caderas estables y resistencia manejable."
    ],
    "sheet": 2,
    "row": 0,
    "category": "Cardio",
    "measure": "seconds",
    "mode": "bodyweight",
    "duration": 300
  },
  {
    "id": "recumbent-bike",
    "name": "Bicicleta reclinada",
    "aliases": "bici reclinada|recumbent bike",
    "equipment": "Máquina",
    "primary": "Cuádriceps",
    "secondary": [
      "Glúteos",
      "Isquiotibiales"
    ],
    "steps": [
      "Apoyá la espalda y ajustá la distancia a los pedales sin bloquear las rodillas.",
      "Pedaleá de forma continua manteniendo el apoyo del respaldo."
    ],
    "sheet": 2,
    "row": 1,
    "category": "Cardio",
    "measure": "seconds",
    "mode": "bodyweight",
    "duration": 300
  },
  {
    "id": "elliptical",
    "name": "Elíptica",
    "aliases": "eliptico|eliptica|elliptical|cross trainer",
    "equipment": "Máquina",
    "primary": "Cuerpo completo",
    "secondary": [
      "Cuádriceps",
      "Glúteos"
    ],
    "steps": [
      "Subí con la máquina quieta y apoyá ambos pies completos en los pedales.",
      "Alterná piernas y brazos siguiendo las guías sin levantar los pies."
    ],
    "sheet": 2,
    "row": 2,
    "category": "Cardio",
    "measure": "seconds",
    "mode": "bodyweight",
    "duration": 300
  },
  {
    "id": "stairmill",
    "name": "Escaladora de peldaños",
    "aliases": "escalera|escaladora|stairmaster|stairmill|escalera mecanica",
    "equipment": "Máquina",
    "primary": "Glúteos",
    "secondary": [
      "Cuádriceps",
      "Gemelos"
    ],
    "steps": [
      "Comenzá con los escalones lentos y un apoyo liviano en las barandas.",
      "Subí alternando pies con el torso erguido y sin descargar el peso en las manos."
    ],
    "sheet": 2,
    "row": 3,
    "category": "Cardio",
    "measure": "seconds",
    "mode": "bodyweight",
    "duration": 300
  },
  {
    "id": "stepper",
    "name": "Stepper de pedales",
    "aliases": "stepper|escalador de pedales",
    "equipment": "Máquina",
    "primary": "Glúteos",
    "secondary": [
      "Cuádriceps",
      "Gemelos"
    ],
    "steps": [
      "Apoyá los pies en los dos pedales independientes.",
      "Alterná el descenso de cada pedal con pasos controlados y torso estable."
    ],
    "sheet": 3,
    "row": 0,
    "category": "Cardio",
    "measure": "seconds",
    "mode": "bodyweight",
    "duration": 300
  },
  {
    "id": "air-bike",
    "name": "Bicicleta de aire",
    "aliases": "air bike|assault bike|bici de aire",
    "equipment": "Máquina",
    "primary": "Cuerpo completo",
    "secondary": [
      "Cuádriceps",
      "Hombros"
    ],
    "steps": [
      "Ajustá el asiento y sujetá los manillares móviles.",
      "Pedaleá mientras empujás y tirás alternando brazos; regulá el esfuerzo con el ritmo."
    ],
    "sheet": 3,
    "row": 1,
    "category": "Cardio",
    "measure": "seconds",
    "mode": "bodyweight",
    "duration": 300
  },
  {
    "id": "ski-erg",
    "name": "SkiErg",
    "aliases": "ski erg|esqui ergometro|esquiador",
    "equipment": "Máquina",
    "primary": "Espalda",
    "secondary": [
      "Tríceps",
      "Abdominales"
    ],
    "steps": [
      "Parate frente al aparato y sujetá los dos agarres elevados.",
      "Tirá hacia los muslos flexionando cadera y rodillas suavemente; dejá volver los agarres."
    ],
    "sheet": 3,
    "row": 2,
    "category": "Cardio",
    "measure": "seconds",
    "mode": "bodyweight",
    "duration": 300
  },
  {
    "id": "battle-ropes",
    "name": "Cuerdas de batalla",
    "aliases": "battle ropes|battle rope|sogas de batalla",
    "equipment": "Otro",
    "primary": "Hombros",
    "secondary": [
      "Abdominales",
      "Cuádriceps"
    ],
    "steps": [
      "Tomá ambas sogas con pies firmes y rodillas levemente flexionadas.",
      "Alterná los brazos creando ondas; mantené abdomen y caderas estables."
    ],
    "sheet": 3,
    "row": 3,
    "category": "Cardio",
    "measure": "seconds",
    "mode": "bodyweight",
    "duration": 300
  },
  {
    "id": "jumping-jack",
    "name": "Saltos de tijera",
    "aliases": "jumping jacks|jumping jack|saltos estrella",
    "equipment": "Peso corporal",
    "primary": "Cuerpo completo",
    "secondary": [
      "Hombros",
      "Gemelos"
    ],
    "steps": [
      "Parate con pies juntos y brazos a los lados.",
      "Saltá abriendo piernas y elevando brazos; volvé con un aterrizaje suave."
    ],
    "sheet": 4,
    "row": 0,
    "category": "Cardio",
    "measure": "seconds",
    "mode": "bodyweight",
    "duration": 30
  },
  {
    "id": "high-knees",
    "name": "Rodillas altas",
    "aliases": "high knees|skipping|rodillas al pecho de pie",
    "equipment": "Peso corporal",
    "primary": "Cuádriceps",
    "secondary": [
      "Abdominales",
      "Gemelos"
    ],
    "steps": [
      "Parate erguido con los brazos preparados para acompañar el paso.",
      "Alterná elevaciones de rodilla y brazos opuestos sin inclinarte atrás."
    ],
    "sheet": 4,
    "row": 1,
    "category": "Cardio",
    "measure": "seconds",
    "mode": "bodyweight",
    "duration": 30
  },
  {
    "id": "arm-circles",
    "name": "Círculos de brazos",
    "aliases": "arm circles|movilidad hombros|circulos de hombros",
    "equipment": "Peso corporal",
    "primary": "Hombros",
    "secondary": [],
    "steps": [
      "Extendé los brazos a los lados con hombros relajados.",
      "Hacé círculos cómodos y progresivos; cambiá de dirección a mitad del tiempo."
    ],
    "sheet": 4,
    "row": 2,
    "category": "Movilidad",
    "measure": "seconds",
    "mode": "bodyweight",
    "duration": 30
  },
  {
    "id": "leg-swings",
    "name": "Balanceos de pierna",
    "aliases": "leg swings|movilidad cadera|balanceo de piernas",
    "equipment": "Peso corporal",
    "primary": "Glúteos",
    "secondary": [
      "Isquiotibiales"
    ],
    "steps": [
      "Usá un apoyo firme con una mano y mantené el torso vertical.",
      "Balanceá una pierna adelante y atrás sin forzar; repetí con la otra."
    ],
    "sheet": 4,
    "row": 3,
    "category": "Movilidad",
    "measure": "seconds",
    "mode": "bodyweight",
    "duration": 30
  },
  {
    "id": "cat-cow",
    "name": "Gato y vaca",
    "aliases": "cat cow|gato vaca|movilidad columna",
    "equipment": "Peso corporal",
    "primary": "Abdominales",
    "secondary": [
      "Espalda"
    ],
    "steps": [
      "Apoyá manos debajo de hombros y rodillas debajo de caderas.",
      "Alterná redondear y extender suavemente la columna, acompañando con la respiración."
    ],
    "sheet": 5,
    "row": 0,
    "category": "Movilidad",
    "measure": "seconds",
    "mode": "bodyweight",
    "duration": 30
  },
  {
    "id": "hip-flexor-stretch",
    "name": "Estiramiento de flexores de cadera",
    "aliases": "hip flexor stretch|estirar cadera|estocada de movilidad",
    "equipment": "Peso corporal",
    "primary": "Cuádriceps",
    "secondary": [
      "Glúteos"
    ],
    "steps": [
      "Apoyá una rodilla en una colchoneta y el otro pie adelante.",
      "Llevá suavemente la pelvis adelante sin arquear la cintura; alterná lados."
    ],
    "sheet": 5,
    "row": 1,
    "category": "Movilidad",
    "measure": "seconds",
    "mode": "bodyweight",
    "duration": 30
  },
  {
    "id": "hamstring-stretch",
    "name": "Estiramiento de isquiotibiales",
    "aliases": "hamstring stretch|estirar isquios",
    "equipment": "Peso corporal",
    "primary": "Isquiotibiales",
    "secondary": [],
    "steps": [
      "Sentate con una pierna extendida y la otra cómoda.",
      "Inclinate desde la cadera hasta una tensión suave y sostené sin rebotes; cambiá de lado."
    ],
    "sheet": 5,
    "row": 2,
    "category": "Movilidad",
    "measure": "seconds",
    "mode": "bodyweight",
    "duration": 30
  },
  {
    "id": "child-pose",
    "name": "Postura del niño",
    "aliases": "child pose|childs pose|postura nino|estiramiento espalda",
    "equipment": "Peso corporal",
    "primary": "Espalda",
    "secondary": [
      "Hombros"
    ],
    "steps": [
      "Arrodillate sobre la colchoneta y llevá las caderas hacia los talones.",
      "Alargá los brazos adelante y respirá con calma dentro de un rango cómodo."
    ],
    "sheet": 5,
    "row": 3,
    "category": "Movilidad",
    "measure": "seconds",
    "mode": "bodyweight",
    "duration": 30
  },
  {
    "id": "face-pull",
    "name": "Face pull con cuerda",
    "aliases": "face pull|facepull|tiron a la cara",
    "equipment": "Polea",
    "primary": "Hombros",
    "secondary": [
      "Espalda"
    ],
    "steps": [
      "Ajustá la polea a la altura de la cara y tomá ambos extremos de la cuerda.",
      "Tirá hacia los lados de la cara con codos altos y volvé con control."
    ],
    "sheet": 6,
    "row": 0,
    "category": "Fuerza",
    "measure": "reps",
    "mode": "external",
    "duration": 30
  },
  {
    "id": "bulgarian-split-squat",
    "name": "Sentadilla búlgara con mancuernas",
    "aliases": "bulgara|sentadilla bulgara|bulgarian split squat",
    "equipment": "Mancuernas",
    "primary": "Cuádriceps",
    "secondary": [
      "Glúteos",
      "Aductores"
    ],
    "steps": [
      "Apoyá el empeine trasero en un banco y el pie delantero firme.",
      "Bajá doblando la rodilla delantera y subí sin impulsarte con el pie trasero; repetí por lado."
    ],
    "sheet": 6,
    "row": 1,
    "category": "Fuerza",
    "measure": "reps",
    "mode": "external",
    "duration": 30
  },
  {
    "id": "kettlebell-swing",
    "name": "Swing con kettlebell",
    "aliases": "kettlebell swing|swing pesa rusa|swing",
    "equipment": "Otro",
    "primary": "Glúteos",
    "secondary": [
      "Isquiotibiales",
      "Abdominales"
    ],
    "steps": [
      "Sujetá una pesa rusa con ambas manos y hacé una bisagra de cadera.",
      "Extendé la cadera para impulsar la pesa hasta el pecho; volvé a la bisagra sin levantar con brazos."
    ],
    "sheet": 6,
    "row": 2,
    "category": "Fuerza",
    "measure": "reps",
    "mode": "external",
    "duration": 30
  },
  {
    "id": "chin-up",
    "name": "Dominadas supinas",
    "aliases": "chin up|chin-up|dominada supina",
    "equipment": "Peso corporal",
    "primary": "Espalda",
    "secondary": [
      "Bíceps"
    ],
    "steps": [
      "Sujetá la barra con las palmas hacia vos y brazos extendidos.",
      "Subí acercando el pecho a la barra y bajá sin balancearte."
    ],
    "sheet": 6,
    "row": 3,
    "category": "Fuerza",
    "measure": "reps",
    "mode": "bodyweight",
    "duration": 30
  },
  {
    "id": "assisted-pull-up",
    "name": "Dominadas asistidas en máquina",
    "aliases": "dominadas asistidas|assisted pull up",
    "equipment": "Máquina",
    "primary": "Espalda",
    "secondary": [
      "Bíceps"
    ],
    "steps": [
      "Elegí la asistencia y apoyá las rodillas en la plataforma según la máquina.",
      "Tirá de los codos hacia abajo para subir y descendé con control. Más asistencia facilita el movimiento."
    ],
    "sheet": 7,
    "row": 0,
    "category": "Fuerza",
    "measure": "reps",
    "mode": "assisted",
    "duration": 30
  },
  {
    "id": "assisted-dip",
    "name": "Fondos asistidos en máquina",
    "aliases": "fondos asistidos|assisted dip",
    "equipment": "Máquina",
    "primary": "Tríceps",
    "secondary": [
      "Pecho",
      "Hombros"
    ],
    "steps": [
      "Elegí la asistencia, tomá las paralelas y apoyate en la plataforma indicada.",
      "Flexioná los codos para bajar y empujá para subir; más asistencia facilita el movimiento."
    ],
    "sheet": 7,
    "row": 1,
    "category": "Fuerza",
    "measure": "reps",
    "mode": "assisted",
    "duration": 30
  },
  {
    "id": "chest-press-machine",
    "name": "Press de pecho en máquina",
    "aliases": "chest press|press pecho maquina|press de pecho maquina",
    "equipment": "Máquina",
    "primary": "Pecho",
    "secondary": [
      "Tríceps",
      "Hombros"
    ],
    "steps": [
      "Regulá el asiento para que los agarres queden a la altura media del pecho.",
      "Empujá adelante sin despegar la espalda y dejá volver con control."
    ],
    "sheet": 7,
    "row": 2,
    "category": "Fuerza",
    "measure": "reps",
    "mode": "external",
    "duration": 30
  },
  {
    "id": "incline-chest-machine",
    "name": "Press inclinado en máquina",
    "aliases": "incline chest press machine|press inclinado maquina",
    "equipment": "Máquina",
    "primary": "Pecho",
    "secondary": [
      "Hombros",
      "Tríceps"
    ],
    "steps": [
      "Ajustá el respaldo inclinado y los agarres a la altura alta del pecho.",
      "Empujá siguiendo la guía y volvé sin despegar los hombros del respaldo."
    ],
    "sheet": 7,
    "row": 3,
    "category": "Fuerza",
    "measure": "reps",
    "mode": "external",
    "duration": 30
  },
  {
    "id": "shoulder-press-machine",
    "name": "Press de hombros en máquina",
    "aliases": "shoulder press machine|press hombro maquina",
    "equipment": "Máquina",
    "primary": "Hombros",
    "secondary": [
      "Tríceps"
    ],
    "steps": [
      "Ajustá el asiento con agarres al lado de la cabeza y espalda apoyada.",
      "Empujá hacia arriba y bajá con control dentro de un recorrido cómodo."
    ],
    "sheet": 8,
    "row": 0,
    "category": "Fuerza",
    "measure": "reps",
    "mode": "external",
    "duration": 30
  },
  {
    "id": "cable-crossover",
    "name": "Cruces de poleas",
    "aliases": "cable crossover|aperturas polea|cruces polea",
    "equipment": "Polea",
    "primary": "Pecho",
    "secondary": [
      "Hombros"
    ],
    "steps": [
      "Parate entre las poleas con un pie adelante y codos levemente flexionados.",
      "Juntá las manos delante del pecho en arco y abrí sin cambiar el ángulo del codo."
    ],
    "sheet": 8,
    "row": 1,
    "category": "Fuerza",
    "measure": "reps",
    "mode": "external",
    "duration": 30
  },
  {
    "id": "straight-arm-pulldown",
    "name": "Pullover en polea",
    "aliases": "straight arm pulldown|jalon brazos rectos|pullover polea|pull over con polea|pullover con polea|pullover en polea alta",
    "equipment": "Polea",
    "primary": "Espalda",
    "secondary": [
      "Tríceps"
    ],
    "steps": [
      "Sujetá una barra en polea alta con brazos casi extendidos y torso levemente inclinado.",
      "Llevá la barra hacia los muslos moviendo los hombros; regresá sin doblar mucho los codos."
    ],
    "sheet": 8,
    "row": 2,
    "category": "Fuerza",
    "measure": "reps",
    "mode": "external",
    "duration": 30
  },
  {
    "id": "single-arm-pulldown",
    "name": "Jalón unilateral en polea",
    "aliases": "single arm pulldown|jalon a una mano|jalon unilateral",
    "equipment": "Polea",
    "primary": "Espalda",
    "secondary": [
      "Bíceps"
    ],
    "steps": [
      "Arrodillate frente a una polea alta y tomá el agarre con una mano.",
      "Llevá el codo hacia el costado sin girar el torso; repetí por lado."
    ],
    "sheet": 8,
    "row": 3,
    "category": "Fuerza",
    "measure": "reps",
    "mode": "external",
    "duration": 30
  },
  {
    "id": "dumbbell-rdl",
    "name": "Peso muerto rumano con mancuernas",
    "aliases": "dumbbell rdl|rumano mancuernas|rdl mancuernas",
    "equipment": "Mancuernas",
    "primary": "Isquiotibiales",
    "secondary": [
      "Glúteos",
      "Espalda"
    ],
    "steps": [
      "Parate con dos mancuernas frente a los muslos y rodillas apenas flexionadas.",
      "Llevá la cadera atrás y bajá cerca de las piernas; volvé extendiendo caderas."
    ],
    "sheet": 9,
    "row": 0,
    "category": "Fuerza",
    "measure": "reps",
    "mode": "external",
    "duration": 30
  },
  {
    "id": "sumo-deadlift",
    "name": "Peso muerto sumo",
    "aliases": "sumo deadlift|sumo",
    "equipment": "Barra",
    "primary": "Glúteos",
    "secondary": [
      "Aductores",
      "Cuádriceps",
      "Espalda"
    ],
    "steps": [
      "Abrí los pies y sujetá la barra entre las rodillas.",
      "Empujá el suelo y extendé caderas con la barra cerca del cuerpo; bajá controlado."
    ],
    "sheet": 9,
    "row": 1,
    "category": "Fuerza",
    "measure": "reps",
    "mode": "external",
    "duration": 30
  },
  {
    "id": "trap-bar-deadlift",
    "name": "Peso muerto con barra hexagonal",
    "aliases": "trap bar deadlift|barra hexagonal|hex bar deadlift",
    "equipment": "Barra",
    "primary": "Cuádriceps",
    "secondary": [
      "Glúteos",
      "Isquiotibiales",
      "Espalda"
    ],
    "steps": [
      "Parate dentro de la barra hexagonal y tomá los agarres laterales.",
      "Empujá el suelo y ponete de pie sin arquear la espalda; bajá flexionando caderas y rodillas."
    ],
    "sheet": 9,
    "row": 2,
    "category": "Fuerza",
    "measure": "reps",
    "mode": "external",
    "duration": 30
  },
  {
    "id": "dumbbell-step-up",
    "name": "Subida al cajón con mancuernas",
    "aliases": "step up|step-up|subidas al banco|subida cajon",
    "equipment": "Mancuernas",
    "primary": "Cuádriceps",
    "secondary": [
      "Glúteos"
    ],
    "steps": [
      "Apoyá un pie completo sobre un cajón estable y sostené las mancuernas a los lados.",
      "Subí empujando con la pierna apoyada y bajá despacio; repetí por lado."
    ],
    "sheet": 9,
    "row": 3,
    "category": "Fuerza",
    "measure": "reps",
    "mode": "external",
    "duration": 30
  },
  {
    "id": "adductor-machine",
    "name": "Aductores en máquina",
    "aliases": "aductores|adductor machine|aductores maquina",
    "equipment": "Máquina",
    "primary": "Aductores",
    "secondary": [],
    "steps": [
      "Sentate con las almohadillas por dentro de los muslos y un rango cómodo.",
      "Acercá las rodillas y volvé a abrir lentamente sin soltar la carga."
    ],
    "sheet": 10,
    "row": 0,
    "category": "Fuerza",
    "measure": "reps",
    "mode": "external",
    "duration": 30
  },
  {
    "id": "cable-glute-kickback",
    "name": "Patada de glúteo en polea",
    "aliases": "glute kickback|patada gluteo|patada polea",
    "equipment": "Polea",
    "primary": "Glúteos",
    "secondary": [
      "Isquiotibiales"
    ],
    "steps": [
      "Sujetá la tobillera a una polea baja y apoyá las manos para equilibrarte.",
      "Llevá la pierna atrás desde la cadera sin arquear la cintura; repetí por lado."
    ],
    "sheet": 10,
    "row": 1,
    "category": "Fuerza",
    "measure": "reps",
    "mode": "external",
    "duration": 30
  },
  {
    "id": "back-extension",
    "name": "Extensión lumbar a 45 grados",
    "aliases": "back extension|hiperextensiones|banco romano|extension espalda",
    "equipment": "Máquina",
    "primary": "Espalda",
    "secondary": [
      "Glúteos",
      "Isquiotibiales"
    ],
    "steps": [
      "Ajustá el banco con apoyo debajo de la cadera y tobillos firmes.",
      "Bajá desde la cadera y subí hasta alinear el torso con las piernas, sin sobreextender."
    ],
    "sheet": 10,
    "row": 2,
    "category": "Fuerza",
    "measure": "reps",
    "mode": "external",
    "duration": 30
  },
  {
    "id": "dumbbell-shrug",
    "name": "Encogimientos con mancuernas",
    "aliases": "shrug|encogimientos|trapecios mancuernas",
    "equipment": "Mancuernas",
    "primary": "Espalda",
    "secondary": [
      "Hombros"
    ],
    "steps": [
      "Sostené dos mancuernas a los lados con brazos extendidos.",
      "Elevá los hombros hacia las orejas sin girarlos y bajá lentamente."
    ],
    "sheet": 10,
    "row": 3,
    "category": "Fuerza",
    "measure": "reps",
    "mode": "external",
    "duration": 30
  },
  {
    "id": "cable-lateral-raise",
    "name": "Elevación lateral en polea",
    "aliases": "cable lateral raise|vuelos laterales polea|lateral polea",
    "equipment": "Polea",
    "primary": "Hombros",
    "secondary": [],
    "steps": [
      "Tomá el agarre de una polea baja del lado contrario al brazo que trabaja.",
      "Elevá el brazo hacia el costado hasta una altura cómoda y bajá despacio; repetí por lado."
    ],
    "sheet": 11,
    "row": 0,
    "category": "Fuerza",
    "measure": "reps",
    "mode": "external",
    "duration": 30
  },
  {
    "id": "cable-curl",
    "name": "Curl de bíceps en polea",
    "aliases": "cable curl|curl polea|biceps polea",
    "equipment": "Polea",
    "primary": "Bíceps",
    "secondary": [],
    "steps": [
      "Parate frente a una polea baja y sujetá la barra con palmas hacia arriba.",
      "Flexioná codos sin mover los hombros y bajá con control."
    ],
    "sheet": 11,
    "row": 1,
    "category": "Fuerza",
    "measure": "reps",
    "mode": "external",
    "duration": 30
  },
  {
    "id": "reverse-curl",
    "name": "Curl inverso con barra EZ",
    "aliases": "reverse curl|curl inverso|curl pronado",
    "equipment": "Barra",
    "primary": "Bíceps",
    "secondary": [],
    "steps": [
      "Sostené la barra EZ con palmas hacia abajo y codos junto al torso.",
      "Flexioná codos manteniendo muñecas estables y bajá sin balancearte."
    ],
    "sheet": 11,
    "row": 2,
    "category": "Fuerza",
    "measure": "reps",
    "mode": "external",
    "duration": 30
  },
  {
    "id": "rope-pushdown",
    "name": "Tríceps con cuerda en polea",
    "aliases": "rope pushdown|triceps cuerda|extension triceps cuerda",
    "equipment": "Polea",
    "primary": "Tríceps",
    "secondary": [],
    "steps": [
      "Tomá ambos extremos de la cuerda en polea alta y fijá los codos al costado.",
      "Extendé los brazos separando los extremos cerca de los muslos y volvé con control."
    ],
    "sheet": 11,
    "row": 3,
    "category": "Fuerza",
    "measure": "reps",
    "mode": "external",
    "duration": 30
  },
  {
    "id": "cable-crunch",
    "name": "Crunch abdominal en polea",
    "aliases": "cable crunch|abdominales polea|crunch polea",
    "equipment": "Polea",
    "primary": "Abdominales",
    "secondary": [],
    "steps": [
      "Arrodillate frente a la polea alta con la cuerda al lado de la cabeza.",
      "Acercá costillas a pelvis flexionando el tronco sin tirar con los brazos."
    ],
    "sheet": 12,
    "row": 0,
    "category": "Fuerza",
    "measure": "reps",
    "mode": "external",
    "duration": 30
  },
  {
    "id": "hanging-knee-raise",
    "name": "Elevación de rodillas colgado",
    "aliases": "hanging knee raise|rodillas colgado|abdominales colgado",
    "equipment": "Peso corporal",
    "primary": "Abdominales",
    "secondary": [],
    "steps": [
      "Colgate de una barra estable con brazos extendidos y hombros activos.",
      "Elevá las rodillas hacia el pecho sin balanceo y bajalas lentamente."
    ],
    "sheet": 12,
    "row": 1,
    "category": "Fuerza",
    "measure": "reps",
    "mode": "bodyweight",
    "duration": 30
  },
  {
    "id": "ab-wheel",
    "name": "Rueda abdominal",
    "aliases": "ab wheel|ab rollout|rueda abs",
    "equipment": "Otro",
    "primary": "Abdominales",
    "secondary": [
      "Hombros"
    ],
    "steps": [
      "Arrodillate sobre una colchoneta y sujetá la rueda debajo de los hombros.",
      "Rodá adelante solo hasta donde controles la cintura; volvé manteniendo el abdomen firme."
    ],
    "sheet": 12,
    "row": 2,
    "category": "Fuerza",
    "measure": "reps",
    "mode": "bodyweight",
    "duration": 30
  },
  {
    "id": "side-plank",
    "name": "Plancha lateral",
    "aliases": "side plank|plancha de costado",
    "equipment": "Peso corporal",
    "primary": "Abdominales",
    "secondary": [
      "Hombros",
      "Glúteos"
    ],
    "steps": [
      "Apoyá el antebrazo debajo del hombro y los pies apilados o escalonados.",
      "Elevá la cadera y mantené cuerpo alineado respirando; repetí del otro lado."
    ],
    "sheet": 12,
    "row": 3,
    "category": "Fuerza",
    "measure": "seconds",
    "mode": "bodyweight",
    "duration": 30
  },
{
  "id": "sit-up",
  "name": "Abdominales largos",
  "aliases": "sit up|sit-up|abdominal largo",
  "equipment": "Peso corporal",
  "primary": "Abdominales",
  "secondary": [],
  "steps": [
    "Acostate con rodillas flexionadas y pies apoyados.",
    "Elevá el torso con control y volvé sin dejarte caer."
  ],
  "sheet": 13,
  "row": 0,
  "category": "Fuerza",
  "measure": "reps",
  "mode": "bodyweight",
  "duration": 30
},
{
  "id": "crunch",
  "name": "Abdominales cortos (crunch)",
  "aliases": "crunch|abdominales cortos|abdominal corto",
  "equipment": "Peso corporal",
  "primary": "Abdominales",
  "secondary": [],
  "steps": [
    "Acostate con rodillas flexionadas y la zona lumbar apoyada.",
    "Acercá las costillas a la pelvis elevando los hombros sin tirar del cuello."
  ],
  "sheet": 13,
  "row": 1,
  "category": "Fuerza",
  "measure": "reps",
  "mode": "bodyweight",
  "duration": 30
},
{
  "id": "reverse-crunch",
  "name": "Crunch inverso",
  "aliases": "reverse crunch|abdominal inverso",
  "equipment": "Peso corporal",
  "primary": "Abdominales",
  "secondary": [],
  "steps": [
    "Acostate y elevá las rodillas flexionadas sobre las caderas.",
    "Enrollá suavemente la pelvis hacia el pecho y bajá con control."
  ],
  "sheet": 13,
  "row": 2,
  "category": "Fuerza",
  "measure": "reps",
  "mode": "bodyweight",
  "duration": 30
},
{
  "id": "bicycle-crunch",
  "name": "Abdominales bicicleta",
  "aliases": "bicycle crunch|crunch bicicleta",
  "equipment": "Peso corporal",
  "primary": "Abdominales",
  "secondary": [],
  "steps": [
    "Acostate con las manos junto a la cabeza sin tirar del cuello.",
    "Alterná la rotación del torso hacia la rodilla contraria mientras extendés la otra pierna."
  ],
  "sheet": 13,
  "row": 3,
  "category": "Fuerza",
  "measure": "reps",
  "mode": "bodyweight",
  "duration": 30
}
] as const satisfies readonly GymExercise[]
export const gymExerciseIds=new Set<string>(gymExercises.map(e=>e.id))
export const gymExercise=(id:string|null)=>gymExercises.find(e=>e.id===id)
export const gymAnatomy=Object.fromEntries(gymExercises.map(e=>[e.id,[e.equipment,e.primary,...e.secondary] as [Gear,Muscle,...Muscle[]]])) as Record<typeof gymExercises[number]['id'],[Gear,Muscle,...Muscle[]]>
export const gymTechnique=Object.fromEntries(gymExercises.map(e=>[e.id,[...e.steps]])) as Record<typeof gymExercises[number]['id'],[string,string]>

export const exerciseCategory=(id:string)=>gymExercise(id)?.category??(id==='walk'?'Cardio':'Fuerza')
export const durationLabel=(seconds:number)=>seconds>=60 ? `${Math.floor(seconds/60)} min${seconds%60?` ${seconds%60} s`:''}` : `${seconds} s`
