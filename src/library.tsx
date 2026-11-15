import { useState } from 'react'
import { Dumbbell } from 'lucide-react'
import { catalog } from './domain'

const groups = ['Pecho', 'Espalda', 'Hombros', 'Bíceps', 'Tríceps', 'Abdominales', 'Glúteos', 'Cuádriceps', 'Isquiotibiales', 'Aductores', 'Abductores', 'Gemelos', 'Cuerpo completo'] as const
type Muscle = typeof groups[number]
type Gear = 'Barra' | 'Mancuernas' | 'Máquina' | 'Polea' | 'Disco' | 'Peso corporal' | 'Cinta'
const anatomy: Record<typeof catalog[number][0], [Gear, Muscle, ...Muscle[]]> = {
  'bench-barbell': ['Barra', 'Pecho', 'Tríceps', 'Hombros'],
  'bench-smith': ['Máquina', 'Pecho', 'Tríceps', 'Hombros'],
  'bench-dumbbell': ['Mancuernas', 'Pecho', 'Tríceps', 'Hombros'],
  'incline-dumbbell': ['Mancuernas', 'Pecho', 'Hombros', 'Tríceps'],
  fly: ['Mancuernas', 'Pecho', 'Hombros'],
  dip: ['Peso corporal', 'Tríceps', 'Pecho', 'Hombros'],
  pushdown: ['Polea', 'Tríceps'],
  'pull-up': ['Peso corporal', 'Espalda', 'Bíceps'],
  'barbell-row': ['Barra', 'Espalda', 'Bíceps'],
  pulldown: ['Polea', 'Espalda', 'Bíceps'],
  curl: ['Mancuernas', 'Bíceps'],
  squat: ['Barra', 'Cuádriceps', 'Glúteos', 'Aductores'],
  'smith-squat': ['Máquina', 'Cuádriceps', 'Glúteos', 'Aductores'],
  deadlift: ['Barra', 'Glúteos', 'Isquiotibiales', 'Espalda'],
  'leg-press': ['Máquina', 'Cuádriceps', 'Glúteos'],
  'lateral-raise': ['Mancuernas', 'Hombros'],
  'calf-raise': ['Peso corporal', 'Gemelos'],
  'hip-thrust': ['Barra', 'Glúteos', 'Isquiotibiales'],
  'leg-curl': ['Máquina', 'Isquiotibiales'],
  plank: ['Peso corporal', 'Abdominales', 'Hombros'],
  walk: ['Cinta', 'Cuerpo completo'],
  'wide-pulldown': ['Polea', 'Espalda', 'Bíceps'],
  'close-pulldown': ['Polea', 'Espalda', 'Bíceps'],
  't-row': ['Barra', 'Espalda', 'Bíceps'],
  pullover: ['Mancuernas', 'Espalda', 'Pecho'],
  'rear-delt-machine': ['Máquina', 'Hombros', 'Espalda'],
  'incline-curl': ['Mancuernas', 'Bíceps'],
  'barbell-curl': ['Barra', 'Bíceps'],
  'hammer-curl': ['Mancuernas', 'Bíceps'],
  'glute-press': ['Máquina', 'Glúteos', 'Cuádriceps'],
  'long-lunge': ['Mancuernas', 'Glúteos', 'Cuádriceps'],
  'walking-lunge': ['Mancuernas', 'Cuádriceps', 'Glúteos'],
  'lying-curl': ['Máquina', 'Isquiotibiales'],
  'pec-deck': ['Máquina', 'Pecho', 'Hombros'],
  'front-raise': ['Disco', 'Hombros'],
  'french-press': ['Mancuernas', 'Tríceps'],
  'leg-extension': ['Máquina', 'Cuádriceps'],
  abductor: ['Máquina', 'Abductores', 'Glúteos'],
  'low-row': ['Polea', 'Espalda', 'Bíceps'],
  'overhead-extension': ['Mancuernas', 'Tríceps'],
  'quad-press': ['Máquina', 'Cuádriceps', 'Glúteos'],
}
const illustrations: Record<string, number> = {
  'bench-barbell': 0, squat: 1, 'wide-pulldown': 2, 'barbell-row': 3,
}

export function ExerciseArt({ id }: { id: string | null }) {
  const index = id ? illustrations[id] : undefined
  if (index === undefined) return <span className="exercise-placeholder" aria-hidden="true"><Dumbbell /></span>
  return <span className="exercise-sprite" aria-hidden="true"
    style={{ backgroundPosition: (index % 2 ? '100%' : '0%') + ' ' + (index >= 2 ? '100%' : '0%') }} />
}

const front: [Muscle, string][] = [
  ['Hombros', '19,24 29,20 29,34 18,39'], ['Hombros','51,20 61,24 62,39 51,34'],
  ['Pecho','30,21 50,21 53,35 42,39 38,39 27,35'],
  ['Abdominales','31,39 49,39 48,59 32,59'],
  ['Bíceps','17,40 28,37 24,53 13,56'], ['Bíceps','52,37 63,40 67,56 56,53'],
  ['Cuádriceps','27,62 38,63 37,91 26,92'], ['Cuádriceps','42,63 53,62 54,92 43,91'],
  ['Aductores','36,60 44,60 42,76 38,76'], ['Abductores','25,56 31,57 31,67 24,66'], ['Abductores','49,57 55,56 56,66 49,67'],
]
const back: [Muscle, string][] = [
  ['Hombros','18,25 30,20 27,37 17,39'], ['Hombros','50,20 62,25 63,39 53,37'],
  ['Espalda','30,20 50,20 53,36 46,54 34,54 27,36'],
  ['Tríceps','17,40 27,37 23,53 13,57'], ['Tríceps','53,37 63,40 67,57 57,53'],
  ['Glúteos','28,55 52,55 55,65 44,71 40,66 36,71 25,65'],
  ['Isquiotibiales','26,69 36,73 37,91 26,92'], ['Isquiotibiales','44,73 54,69 54,92 43,91'],
  ['Gemelos','26,94 36,94 34,111 26,111'], ['Gemelos','44,94 54,94 54,111 46,111'],
  ['Abductores','23,55 28,56 27,65 23,65'], ['Abductores','52,56 57,55 57,65 53,65'],
]

function MuscleMap({ primary, secondary }: { primary: Muscle; secondary: Muscle[] }) {
  return <div className="muscle-map" aria-hidden="true">
    {[front, back].map((regions, index) => <svg key={index} viewBox="8 0 64 122">
      <path className="body-silhouette" d="M34 3H46V7H50V17H46V20L62 24L71 59H65L57 42L54 56L57 76L54 110L59 115V120H44L40 76L36 120H21V115L26 110L23 76L26 56L23 42L15 59H9L18 24L34 20V17H30V7H34Z"/>
      {regions.map(([group, shape]) => <polygon key={shape} points={shape}
        className={group === primary || primary === 'Cuerpo completo' ? 'primary-muscle' : secondary.includes(group) ? 'secondary-muscle' : 'inactive-muscle'} />)}
    </svg>)}
  </div>
}

const searchText = (text: string) => text.toLowerCase().normalize('NFD').replace(/\p{Diacritic}/gu, '').trim()

export function Library() {
  const [query, search] = useState('')
  const [muscle, filter] = useState('')
  const [gear, equipment] = useState('')
  const results = catalog.filter(([id, name, aliases]) => {
    const [required, ...targets] = anatomy[id]
    return searchText(name + ' ' + aliases).includes(searchText(query))
      && (!muscle || targets.some(target => target === muscle)) && (!gear || required === gear)
  })
  return <section className="panel" id="biblioteca">
    <h2>Biblioteca</h2>
    <div className="input-grid library-filters">
      <label>Buscar ejercicio<input type="search" value={query} onChange={event => search(event.target.value)} /></label>
      <label>Músculo<select value={muscle} onChange={event => filter(event.target.value)}>
        <option value="">Todos</option>{groups.map(group => <option key={group}>{group}</option>)}
      </select></label>
      <label>Equipo<select value={gear} onChange={event => equipment(event.target.value)}>
        <option value="">Todos</option>{[...new Set(Object.values(anatomy).map(entry => entry[0]))].map(entry => <option key={entry}>{entry}</option>)}
      </select></label>
    </div>
    {!results.length && <p>No encontramos ejercicios con esos filtros.</p>}
    {results.map(([id, name]) => {
      const [required, primary, ...secondary] = anatomy[id]
      return <details className="exercise-card" key={id}><summary>{name}</summary>
        <div className="exercise-visual"><ExerciseArt id={id} /><MuscleMap primary={primary} secondary={secondary} /></div>
        <p>{required} · Principal: {primary}{secondary.length > 0 && ' · Secundarios: ' + secondary.join(', ')}</p>
      </details>
    })}
  </section>
}
