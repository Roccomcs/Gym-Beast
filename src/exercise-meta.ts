export const muscleGroups = ['Pecho', 'Espalda', 'Hombros', 'Bíceps', 'Tríceps', 'Abdominales', 'Glúteos', 'Cuádriceps', 'Isquiotibiales', 'Aductores', 'Abductores', 'Gemelos', 'Cuerpo completo'] as const
export const equipmentKinds = ['Barra', 'Mancuernas', 'Máquina', 'Polea', 'Disco', 'Peso corporal', 'Cinta', 'Otro'] as const
export type Muscle = typeof muscleGroups[number]
export type Gear = typeof equipmentKinds[number]
