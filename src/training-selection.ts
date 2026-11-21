import atlasData from './pet-training-atlases.json'
import { petSources } from './pet-species'

export const trainingMovements = {
  bench: ['bench-barbell', 'bench-smith'], lunge: ['long-lunge', 'walking-lunge'],
  squat: ['squat', 'smith-squat'], deadlift: ['deadlift'], 'romanian-deadlift': ['romanian-deadlift'],
  'overhead-press': ['overhead-press'], 'inverted-row': ['inverted-row'],
  'push-up': ['push-up'], 'bodyweight-squat': ['bodyweight-squat'],
  pulldown: ['pulldown', 'wide-pulldown', 'close-pulldown'], curl: ['curl'],
  'hip-thrust': ['hip-thrust'], 'leg-press': ['leg-press', 'glute-press', 'quad-press'],
  'pull-up': ['pull-up'], 'dumbbell-press': ['bench-dumbbell', 'incline-dumbbell'],
  row: ['barbell-row'], 'seated-row': ['low-row'], 't-row': ['t-row'], fly: ['fly'],
  'pec-deck': ['pec-deck'], pullover: ['pullover'], 'rear-delt': ['rear-delt-machine'],
  'lateral-raise': ['lateral-raise'], 'front-raise': ['front-raise'], 'calf-raise': ['calf-raise'],
  'leg-curl': ['leg-curl'], 'lying-curl': ['lying-curl'], 'leg-extension': ['leg-extension'],
  abductor: ['abductor'], dip: ['dip'], pushdown: ['pushdown'], 'french-press': ['french-press'],
  'overhead-extension': ['overhead-extension'], 'barbell-curl': ['barbell-curl'],
  'incline-curl': ['incline-curl'], 'hammer-curl': ['hammer-curl'], plank: ['plank'], walk: ['walk'],
} as const
export const principalMovements = ['bench', 'pulldown', 'squat', 'curl', 'leg-press'] as const
export const trainingMovement = (id: string | null) => Object.entries(trainingMovements)
  .find(([, ids]) => id && (ids as readonly string[]).includes(id))?.[0]

export function ownTrainingSource(name: string, id: string | null) {
  const movement = trainingMovement(id)
  const path = '/pet-training/' + petSources[name] + '/' + movement + '.png'
  return movement && path in atlasData ? path : undefined
}

export function petTrainingSource(name: string, id: string | null) {
  return ownTrainingSource(name, id) ?? ownTrainingSource('Dragón', id)
}

// Search the current day before using a dragon demonstration. This never changes
// the active companion or which companion receives the session's EXP.
export function selectPetTraining(name: string, exercises: (string | null)[]) {
  const principal = exercises.map(id => {
    const curlVariant = ['barbell-curl', 'incline-curl', 'hammer-curl'].includes(id ?? '')
    const movement = curlVariant ? 'curl' : trainingMovement(id)
    if (!principalMovements.includes(movement as typeof principalMovements[number])) return null
    if (ownTrainingSource(name, id)) return id
    // The illustration is explicitly labelled Curl bíceps when demonstrating
    // the general family; the routine's actual exercise and equipment stay intact.
    return curlVariant && ownTrainingSource(name, 'curl') ? 'curl' : null
  }).find(id => id !== null)
  const own = principal ?? exercises.find(id => ownTrainingSource(name, id))
  const exercise = own ?? exercises.find(id => ownTrainingSource('Dragón', id)) ?? null
  const companion = own || !exercise ? name : 'Dragón'
  return { companion, exercise, fallback: companion !== name }
}
