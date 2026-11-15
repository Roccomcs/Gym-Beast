import { parseRoutine } from './domain'

const a = 'Sentadilla libre 3x5\nPress banca 3x5\nRemo barra 3x8'
const b = 'Peso muerto 2x5\nPress inclinado mancuernas 3x8\nJalón al pecho 3x10'
const upper = 'Press banca 3x8-12\nRemo bajo 3x8-12\nElevaciones laterales 3x12'
const lower = 'Prensa 3x10-12\nCamilla de isquios 3x10\nGemelos 3x15'
const push = 'Press inclinado mancuernas 3x10\nVuelos laterales 3x12\nTríceps polea 3x12'
const pull = 'Jalón al pecho abierto 3x8\nRemo T 3x10\nCurl martillo 3x12'
const body = 'Dominadas 3x5-8\nFondos 3x5-8\nEstocadas largas 3x10\nPlancha'
const boostcamp = 'https://www.boostcamp.app/coaches/programs'
const stronglifts = 'https://support.stronglifts.com/article/179-switch-program'

export const programs = [
  { name: 'Fuerza base', reference: 'StrongLifts 5×5', goal: 'Aprendé los básicos de cuerpo completo.', level: 'Inicial', equipment: 'Barra', progression: 'Subí el mínimo disponible cuando completes las series con control.', days: [a, b, a], source: stronglifts },
  { name: 'Cuerpo completo ondulante', reference: 'Madcow 5×5', goal: 'Alterná sesiones moderadas, livianas y exigentes.', level: 'Intermedio', equipment: 'Barra', progression: 'Compará el día exigente con el de la semana anterior.', days: [a, b, 'Sentadilla libre 4x4\nPress banca 4x4\nRemo barra 3x6'], source: stronglifts },
  { name: 'Fuerza por niveles', reference: 'GZCLP', goal: 'Organizá el trabajo en básico, secundario y accesorios.', level: 'Inicial', equipment: 'Barra y polea', progression: 'Ajustá cada nivel por separado al alcanzar su objetivo.', days: ['Sentadilla libre 5x3\nPress banca 3x8\nJalón al pecho 3x12', 'Peso muerto 5x3\nPress inclinado mancuernas 3x8\nCurl martillo 3x12', 'Press banca 5x3\nRemo barra 3x8\nPrensa 3x12'], source: boostcamp },
  { name: 'Fuerza y volumen', reference: 'PHUL', goal: 'Combiná fuerza e hipertrofia en torso y pierna.', level: 'Intermedio', equipment: 'Gimnasio completo', progression: 'Priorizá carga en los días de fuerza y rango en los de volumen.', days: [a.split('\n').slice(1).join('\n'), b.split('\n')[0] + '\nSentadilla libre 3x6', upper, lower], source: boostcamp },
  { name: 'Bloque de básicos', reference: '5/3/1 Boring But Big', goal: 'Practicá un básico por día y sumá trabajo complementario.', level: 'Intermedio', equipment: 'Barra y mancuernas', progression: 'Empezá con cargas conservadoras y revisalas al cerrar el bloque.', days: ['Sentadilla libre 3x5\nPrensa 4x10', 'Press banca 3x5\nPress banca mancuernas 4x10', 'Peso muerto 3x5\nCamilla de isquios 4x10', 'Press inclinado mancuernas 3x6\nTríceps polea 4x12'], source: boostcamp },
  { name: 'Empuje, tirón y pierna', reference: 'Reddit PPL', goal: 'Distribuí el volumen en dos vueltas de tres días.', level: 'Intermedio', equipment: 'Gimnasio completo', progression: 'Alcanzá el extremo superior del rango antes de subir carga.', days: [push, pull, lower, push, pull, lower], source: boostcamp },
  { name: 'Torso y pierna', reference: 'Alberto Nuñez Upper Lower', goal: 'Alterná énfasis muscular sin perder frecuencia.', level: 'Intermedio', equipment: 'Gimnasio completo', progression: 'Compará repeticiones con el día equivalente del ciclo anterior.', days: [upper, lower, pull + '\nPress inclinado mancuernas 3x10', 'Hip thrust 3x10\nPrensa de glúteos 3x12\nGemelos 3x15'], source: boostcamp },
  { name: 'Fuerza con volumen avanzado', reference: 'nSuns 5/3/1', goal: 'Practicá los levantamientos básicos con más series.', level: 'Avanzado', equipment: 'Barra y polea', progression: 'Aumentá carga solo al completar el objetivo sin degradar la técnica.', days: ['Press banca 5x5\nRemo barra 4x8', 'Sentadilla libre 5x5\nPeso muerto 3x5', 'Press banca 4x4\nJalón al pecho 4x8', 'Peso muerto 5x3\nPrensa 4x10'], source: boostcamp },
  { name: 'Potencia e hipertrofia', reference: 'PHAT', goal: 'Separá días de fuerza y trabajo por grupos musculares.', level: 'Avanzado', equipment: 'Gimnasio completo', progression: 'Mantené el volumen estable mientras mejoran las repeticiones.', days: [upper, b.split('\n')[0] + '\nSentadilla libre 3x6', pull, lower, push], source: boostcamp },
  { name: 'Fuerza corporal', reference: 'Reddit Bodyweight Recommended Routine', goal: 'Entrená con peso corporal, barra y paralelas.', level: 'Inicial', equipment: 'Barra fija y paralelas', progression: 'Primero sumá repeticiones con control y luego elegí una variante más exigente.', days: [body, body, body], source: boostcamp },
] as const

export function programSource(program: typeof programs[number]) {
  return program.days.map((day, index) => 'Día ' + (index + 1) + '\n' + day).join('\n')
}
export function programRoutine(program: typeof programs[number]) {
  const source = programSource(program)
  return { name: program.name, version: 1, source, days: parseRoutine(source) }
}
