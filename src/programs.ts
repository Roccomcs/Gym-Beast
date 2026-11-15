import { fiveDayRoutine } from './rocco-routine'
import { parseRoutine } from './domain'

const a = 'Sentadilla libre 5x5 descanso 180s\nPress banca 5x5 descanso 180s\nRemo barra 5x5 descanso 120s'
const b = 'Sentadilla libre 5x5 descanso 180s\nPress inclinado mancuernas 5x5 descanso 120s\nPeso muerto 1x5 descanso 180s'
const upper = 'Press banca 3x8-12\nRemo bajo 3x8-12\nJalón al pecho 3x10-12\nElevaciones laterales 3x12-15'
const lower = 'Prensa 3x10-12\nCamilla de isquios 3x10-15\nEstocadas largas 3x8-12\nGemelos 3x15'
const push = 'Press banca 3x6-10\nPress inclinado mancuernas 3x8-12\nAperturas en máquina 2x12-15\nVuelos laterales 3x12-20\nTríceps polea 3x10-15'
const pull = 'Jalón al pecho abierto 3x8-12\nRemo T 3x8-12\nPosteriores en máquina 3x12-20\nCurl con barra 3x8-12\nCurl martillo 2x10-15'
const body = 'Dominadas 3x5-8 descanso 90s\nFondos 3x5-8 descanso 90s\nEstocadas largas 3x8-12\nGemelos 3x12-15\nPlancha'
const boostcamp = 'https://www.boostcamp.app/coaches/programs'
const stronglifts = 'https://support.stronglifts.com/article/179-switch-program'

export const programs = [
  { name: 'Fuerza base', reference: 'StrongLifts 5×5', goal: 'Aprendé los básicos de cuerpo completo.', level: 'Inicial', equipment: 'Barra', progression: 'Subí el mínimo disponible cuando completes las series con control.', days: [a, b, a], source: stronglifts },
  { name: 'Cuerpo completo ondulante', reference: 'Madcow 5×5', goal: 'Alterná sesiones moderadas, livianas y exigentes.', level: 'Intermedio', equipment: 'Barra', progression: 'Compará el día exigente con el de la semana anterior.', days: ['Sentadilla libre 5x5\nPress banca 5x5\nRemo barra 5x5\nCurl con barra 2x10', 'Sentadilla libre 4x5\nPress inclinado mancuernas 4x5\nPeso muerto 4x5\nPlancha', 'Sentadilla libre 4x5\nSentadilla libre 1x3\nPress banca 4x5\nPress banca 1x3\nRemo barra 4x5'], source: stronglifts },
  { name: 'Fuerza por niveles', reference: 'GZCLP', goal: 'Organizá el trabajo en básico, secundario y accesorios.', level: 'Inicial', equipment: 'Barra y polea', progression: 'Ajustá cada nivel por separado al alcanzar su objetivo.', days: ['Sentadilla libre 5x3\nPress banca 3x8\nJalón al pecho 3x12', 'Peso muerto 5x3\nPress inclinado mancuernas 3x8\nCurl martillo 3x12', 'Press banca 5x3\nRemo barra 3x8\nPrensa 3x12'], source: boostcamp },
  { name: 'Fuerza y volumen', reference: 'PHUL', goal: 'Combiná fuerza e hipertrofia en torso y pierna.', level: 'Intermedio', equipment: 'Gimnasio completo', progression: 'Priorizá carga en los días de fuerza y rango en los de volumen.', days: ['Press banca 4x4-6\nRemo barra 4x4-6\nPress inclinado mancuernas 3x8\nJalón al pecho 3x8\nTríceps polea 2x12', 'Sentadilla libre 4x4-6\nPeso muerto 3x4-6\nPrensa 3x8\nCamilla de isquios 3x10\nGemelos 3x12', upper + '\nCurl martillo 3x12\nExtensión de tríceps con mancuerna 3x12', lower + '\nSillón de cuádriceps 3x12-15'], source: boostcamp },
  { name: 'Bloque de básicos', reference: '5/3/1 Boring But Big', goal: 'Practicá un básico por día y sumá trabajo complementario.', level: 'Intermedio', equipment: 'Barra y mancuernas', progression: 'Empezá con cargas conservadoras y revisalas al cerrar el bloque.', days: ['Sentadilla libre 3x5\nSentadilla libre 5x10\nCamilla de isquios 3x12\nPlancha', 'Press banca 3x5\nPress banca 5x10\nRemo bajo 4x10\nTríceps polea 3x12', 'Peso muerto 3x5\nPeso muerto 5x10\nEstocadas largas 3x10\nGemelos 3x15', 'Press inclinado mancuernas 3x6\nPress inclinado mancuernas 5x10\nJalón al pecho 4x10\nElevaciones laterales 3x15'], source: boostcamp },
  { name: 'Empuje, tirón y pierna', reference: 'Reddit PPL', goal: 'Distribuí el volumen en dos vueltas de tres días.', level: 'Intermedio', equipment: 'Gimnasio completo', progression: 'Alcanzá el extremo superior del rango antes de subir carga.', days: [push, pull, lower, push.replace('Press banca 3x6-10','Press banca mancuernas 4x8-12'), pull.replace('Remo T 3x8-12','Remo bajo 4x8-12'), lower + '\nHip thrust 3x10-12'], source: boostcamp },
  { name: 'Torso y pierna', reference: 'Alberto Nuñez Upper Lower', goal: 'Alterná énfasis muscular sin perder frecuencia.', level: 'Intermedio', equipment: 'Gimnasio completo', progression: 'Compará repeticiones con el día equivalente del ciclo anterior.', days: [upper + '\nCurl con barra 3x12\nTríceps polea 3x12', lower + '\nHip thrust 3x10', pull + '\nPress inclinado mancuernas 3x10\nPosteriores en máquina 3x15', 'Hip thrust 3x10\nPrensa de glúteos 3x12\nCamilla de isquios 3x12\nGemelos 3x15'], source: boostcamp },
  { name: 'Fuerza con volumen avanzado', reference: 'nSuns 5/3/1', goal: 'Practicá los levantamientos básicos con más series.', level: 'Avanzado', equipment: 'Barra y polea', progression: 'Aumentá carga solo al completar el objetivo sin degradar la técnica.', days: ['Press banca 6x5\nPress inclinado mancuernas 4x8\nRemo barra 4x8\nTríceps polea 3x12', 'Sentadilla libre 6x5\nPeso muerto 4x5\nCamilla de isquios 3x12\nGemelos 3x15', 'Press banca 6x4\nPress banca mancuernas 4x8\nJalón al pecho 4x8\nElevaciones laterales 3x15', 'Peso muerto 6x3\nSentadilla libre 4x6\nPrensa 4x10\nPlancha'], source: boostcamp },
  { name: 'Potencia e hipertrofia', reference: 'PHAT', goal: 'Separá días de fuerza y trabajo por grupos musculares.', level: 'Avanzado', equipment: 'Gimnasio completo', progression: 'Mantené el volumen estable mientras mejoran las repeticiones.', days: [upper, b.split('\n')[0] + '\nSentadilla libre 3x6', pull, lower, push], source: boostcamp },
  { name: 'Fuerza corporal', reference: 'Reddit Bodyweight Recommended Routine', goal: 'Entrená con peso corporal, barra y paralelas.', level: 'Inicial', equipment: 'Barra fija y paralelas', progression: 'Primero sumá repeticiones con control y luego elegí una variante más exigente.', days: [body, body, body], source: boostcamp },
  { name: 'Rutina Rocco', reference: 'Rutina de Rocco', goal: 'Cinco días de gimnasio con foco por grupo muscular.', level: 'Intermedio', equipment: 'Gimnasio completo', progression: 'Las cargas de la rutina son referencias personales editables. Confirmá las series y repeticiones que quedaron abiertas.', days: ['', '', '', '', ''], source: '' },
] as const

export function programSource(program: typeof programs[number]) {
  if (program.name === 'Rutina Rocco') return fiveDayRoutine
  return program.days.map((day, index) => 'Día ' + (index + 1) + '\n' + day).join('\n')
}
export function programRoutine(program: typeof programs[number]) {
  const source = programSource(program)
  return { name: program.name, version: 1, source, days: parseRoutine(source), cover: programs.indexOf(program) % 10 }
}
