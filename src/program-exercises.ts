import type {Gear,Muscle} from './exercise-meta'
type AddedExercise={id:string;name:string;aliases:string;equipment:Gear;primary:Muscle;secondary:readonly Muscle[];steps:readonly [string,string];sheet:number;row:number}
export const programExercises=[
  {
    "id": "goblet-squat",
    "name": "Sentadilla goblet",
    "aliases": "sentadilla copa|goblet squat",
    "equipment": "Mancuernas",
    "primary": "Cuádriceps",
    "secondary": [
      "Glúteos",
      "Aductores",
      "Abdominales"
    ],
    "steps": [
      "Sostené la mancuerna contra el pecho con los pies firmes.",
      "Bajá flexionando caderas y rodillas; conservá los talones apoyados y subí."
    ],
    "sheet": 1,
    "row": 0
  },
  {
    "id": "incline-barbell",
    "name": "Press inclinado con barra",
    "aliases": "incline bench press barbell|press inclinado barra",
    "equipment": "Barra",
    "primary": "Pecho",
    "secondary": [
      "Hombros",
      "Tríceps"
    ],
    "steps": [
      "Apoyate en un banco inclinado unos 30 grados y tomá la barra con ambas manos.",
      "Bajá hacia la parte alta del pecho y empujá manteniendo los pies apoyados."
    ],
    "sheet": 1,
    "row": 1
  },
  {
    "id": "dumbbell-row",
    "name": "Remo unilateral con mancuerna",
    "aliases": "single arm row|one arm dumbbell row|remo mancuerna",
    "equipment": "Mancuernas",
    "primary": "Espalda",
    "secondary": [
      "Bíceps"
    ],
    "steps": [
      "Apoyá una mano y la rodilla del mismo lado en el banco, con la espalda estable.",
      "Llevá la mancuerna hacia la cadera sin girar el torso y bajala con control."
    ],
    "sheet": 1,
    "row": 2
  },
  {
    "id": "front-squat",
    "name": "Sentadilla frontal",
    "aliases": "front squat",
    "equipment": "Barra",
    "primary": "Cuádriceps",
    "secondary": [
      "Glúteos",
      "Aductores",
      "Abdominales"
    ],
    "steps": [
      "Apoyá la barra delante de los hombros y mantené los codos elevados.",
      "Flexioná caderas y rodillas sin despegar los talones y volvé a subir."
    ],
    "sheet": 1,
    "row": 3
  },
  {
    "id": "barbell-lunge",
    "name": "Estocadas con barra",
    "aliases": "barbell lunge|zancada con barra",
    "equipment": "Barra",
    "primary": "Cuádriceps",
    "secondary": [
      "Glúteos",
      "Aductores"
    ],
    "steps": [
      "Sostené la barra sobre la espalda alta con ambas manos.",
      "Da un paso, bajá ambas rodillas y empujá para volver. Hacé las repeticiones de cada lado."
    ],
    "sheet": 2,
    "row": 0
  },
  {
    "id": "seated-calf-raise",
    "name": "Gemelos sentado en máquina",
    "aliases": "seated calf raise|gemelos sentado|gemelos en maquina",
    "equipment": "Máquina",
    "primary": "Gemelos",
    "secondary": [],
    "steps": [
      "Sentate con las rodillas bajo la almohadilla y el antepié en la plataforma.",
      "Bajá y elevá los talones sin rebotar ni despegar el antepié."
    ],
    "sheet": 2,
    "row": 1
  },
  {
    "id": "standing-calf-raise",
    "name": "Gemelos de pie en máquina",
    "aliases": "standing calf raise|gemelos de pie",
    "equipment": "Máquina",
    "primary": "Gemelos",
    "secondary": [],
    "steps": [
      "Ubicá los hombros bajo las almohadillas y los antepiés sobre el escalón.",
      "Bajá y elevá los talones manteniendo el cuerpo estable y las rodillas suaves."
    ],
    "sheet": 2,
    "row": 2
  },
  {
    "id": "lying-ez-triceps",
    "name": "Tríceps acostado con barra EZ",
    "aliases": "skull crusher|chambered bar tricep extension|cambered bar triceps extension|press frances barra",
    "equipment": "Barra",
    "primary": "Tríceps",
    "secondary": [],
    "steps": [
      "Acostate en un banco con la barra EZ sobre los hombros y ambas manos bien separadas.",
      "Flexioná los codos acercando la barra a la frente y extendelos sin mover los brazos superiores."
    ],
    "sheet": 2,
    "row": 3
  },
  {
    "id": "weighted-pull-up",
    "name": "Dominadas con lastre",
    "aliases": "weighted pull up|weighted pull-up",
    "equipment": "Peso corporal",
    "primary": "Espalda",
    "secondary": [
      "Bíceps"
    ],
    "steps": [
      "Sujetá el cinturón de lastre y colgate de la barra con ambas manos.",
      "Subí sin balancearte y descendé con control. Registrá únicamente los kg de lastre añadido."
    ],
    "sheet": 3,
    "row": 0
  },
  {
    "id": "weighted-dip",
    "name": "Fondos con lastre",
    "aliases": "weighted dip|weighted dips",
    "equipment": "Peso corporal",
    "primary": "Tríceps",
    "secondary": [
      "Pecho",
      "Hombros"
    ],
    "steps": [
      "Sujetá el lastre al cinturón y sostenete sobre las paralelas.",
      "Bajá flexionando los codos hasta un rango cómodo y empujá. Los kg corresponden al lastre añadido."
    ],
    "sheet": 3,
    "row": 1
  },
  {
    "id": "chest-supported-row",
    "name": "Remo en máquina con pecho apoyado",
    "aliases": "chest supported row|chest supported row machine|remo en maquina con discos|remo hammer con apoyo de pecho",
    "equipment": "Máquina",
    "primary": "Espalda",
    "secondary": [
      "Bíceps"
    ],
    "steps": [
      "Ajustá el asiento y apoyá el pecho en la almohadilla, con los pies firmes.",
      "Llevá los agarres hacia las costillas sin separar el pecho y estirá los brazos con control."
    ],
    "sheet": 3,
    "row": 2
  },
  {
    "id": "pendlay-row",
    "name": "Remo Pendlay",
    "aliases": "pendlay row",
    "equipment": "Barra",
    "primary": "Espalda",
    "secondary": [
      "Bíceps",
      "Abdominales"
    ],
    "steps": [
      "Flexioná suavemente las rodillas e incliná el torso casi paralelo al piso.",
      "Remá la barra desde el piso hacia el pecho sin levantar el torso y apoyala entre repeticiones."
    ],
    "sheet": 3,
    "row": 3
  },
  {
    "id": "seated-dumbbell-press",
    "name": "Press de hombros sentado con mancuernas",
    "aliases": "seated dumbbell shoulder press|press hombros sentado",
    "equipment": "Mancuernas",
    "primary": "Hombros",
    "secondary": [
      "Tríceps"
    ],
    "steps": [
      "Sentate con la espalda apoyada y las mancuernas a la altura de los hombros.",
      "Empujá hacia arriba sin arquear la espalda y bajá con control."
    ],
    "sheet": 4,
    "row": 0
  },
  {
    "id": "hack-squat",
    "name": "Sentadilla hack en máquina",
    "aliases": "hack squat|sentadilla hack",
    "equipment": "Máquina",
    "primary": "Cuádriceps",
    "secondary": [
      "Glúteos",
      "Aductores"
    ],
    "steps": [
      "Apoyá la espalda en el trineo, los hombros bajo las almohadillas y los pies en la plataforma.",
      "Bajá el trineo hasta un rango cómodo y empujá sin bloquear las rodillas."
    ],
    "sheet": 4,
    "row": 1
  },
  {
    "id": "stiff-leg-deadlift",
    "name": "Peso muerto con piernas semirrígidas",
    "aliases": "stiff leg deadlift|stiff-legged deadlift",
    "equipment": "Barra",
    "primary": "Isquiotibiales",
    "secondary": [
      "Glúteos",
      "Espalda"
    ],
    "steps": [
      "Sostené la barra cerca de los muslos y mantené las rodillas suavemente flexionadas.",
      "Llevá la cadera atrás y bajá cerca de las piernas sin redondear la espalda; volvé extendiendo la cadera."
    ],
    "sheet": 4,
    "row": 2
  },
  {
    "id": "upright-row-dumbbell",
    "name": "Remo al mentón con mancuernas",
    "aliases": "upright row dumbbell|remo vertical mancuernas",
    "equipment": "Mancuernas",
    "primary": "Hombros",
    "secondary": [
      "Espalda"
    ],
    "steps": [
      "Sostené las mancuernas delante de los muslos, con el torso estable.",
      "Elevá los codos hacia afuera sin superar los hombros; recorré un rango cómodo y bajá con control."
    ],
    "sheet": 4,
    "row": 3
  },
  {
    "id": "donkey-calf-raise",
    "name": "Gemelos burro en máquina",
    "aliases": "donkey calf raise|gemelos burro",
    "equipment": "Máquina",
    "primary": "Gemelos",
    "secondary": [],
    "steps": [
      "Apoyá los antebrazos, flexioná la cadera y ajustá la almohadilla de carga sobre las caderas.",
      "Con los antepiés en el escalón, bajá y elevá los talones sin cambiar la posición del torso."
    ],
    "sheet": 5,
    "row": 0
  },
  {
    "id": "incline-cable-fly",
    "name": "Aperturas inclinadas en polea",
    "aliases": "incline cable fly|apertura inclinada polea",
    "equipment": "Polea",
    "primary": "Pecho",
    "secondary": [
      "Hombros"
    ],
    "steps": [
      "Ubicá un banco inclinado entre dos poleas bajas y tomá un agarre con cada mano.",
      "Acercá las manos sobre la parte alta del pecho con los codos suaves y abrí con control."
    ],
    "sheet": 5,
    "row": 1
  },
  {
    "id": "preacher-curl",
    "name": "Curl predicador con barra EZ",
    "aliases": "preacher curl|preacher curl barbell|curl scott",
    "equipment": "Barra",
    "primary": "Bíceps",
    "secondary": [],
    "steps": [
      "Apoyá los brazos en el banco predicador y sostené la barra EZ.",
      "Flexioná los codos sin despegar los brazos y bajá sin forzar el bloqueo del codo."
    ],
    "sheet": 5,
    "row": 2
  },
  {
    "id": "concentration-curl",
    "name": "Curl concentrado",
    "aliases": "concentration curl",
    "equipment": "Mancuernas",
    "primary": "Bíceps",
    "secondary": [],
    "steps": [
      "Sentate con las piernas separadas y apoyá el codo contra la cara interna del muslo.",
      "Subí la mancuerna flexionando el codo y bajá despacio. Repetí el trabajo del otro lado."
    ],
    "sheet": 5,
    "row": 3
  },
  {
    "id": "spider-curl",
    "name": "Curl araña con mancuernas",
    "aliases": "spider curl",
    "equipment": "Mancuernas",
    "primary": "Bíceps",
    "secondary": [],
    "steps": [
      "Apoyá el pecho boca abajo en un banco inclinado, con ambos brazos colgando.",
      "Flexioná los codos sin mover los brazos superiores y bajá con control."
    ],
    "sheet": 6,
    "row": 0
  },
  {
    "id": "cable-kickback",
    "name": "Patada de tríceps en polea",
    "aliases": "cable kickback|triceps cable kickback",
    "equipment": "Polea",
    "primary": "Tríceps",
    "secondary": [],
    "steps": [
      "Inclinate con una mano apoyada y el brazo de trabajo junto al torso, conectado a una polea baja.",
      "Extendé el codo llevando la mano atrás sin mover el hombro y regresá con control."
    ],
    "sheet": 6,
    "row": 1
  }
] as const satisfies readonly AddedExercise[]
export const programExerciseIds=new Set<string>(programExercises.map(exercise=>exercise.id))
export const programAnatomy=Object.fromEntries(programExercises.map(exercise=>[exercise.id,[exercise.equipment,exercise.primary,...exercise.secondary] as [Gear,Muscle,...Muscle[]]])) as Record<typeof programExercises[number]['id'],[Gear,Muscle,...Muscle[]]>
export const programTechnique=Object.fromEntries(programExercises.map(exercise=>[exercise.id,[...exercise.steps]])) as Record<typeof programExercises[number]['id'],[string,string]>

