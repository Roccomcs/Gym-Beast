import {exerciseCategory} from './gym-exercises'
import {useState} from 'react'
import {catalog} from './domain'
import {anatomy,ExerciseArt,MuscleMap} from './library'
import {muscleGroups as groups} from './exercise-meta'
import {Technique} from './movement'

const searchText = (text: string) => text.toLowerCase().normalize('NFD').replace(/\p{Diacritic}/gu, '').trim()

export function Library() {
  const [query, search] = useState('')
  const [muscle, filter] = useState('')
  const [gear, equipment] = useState('')
  const [category, setCategory] = useState('')
  const results = catalog.filter(([id, name, aliases]) => {
    const [required, ...targets] = anatomy[id]
    return searchText(name + ' ' + aliases).includes(searchText(query))
      && (!category||exerciseCategory(id)===category) && (!muscle || targets.some(target => target === muscle)) && (!gear || required === gear)
  })
  return <section className="panel" id="biblioteca">
    <h2>Biblioteca</h2>
    <div className="catalog-categories" role="group" aria-label="Tipo de ejercicio">{['','Fuerza','Cardio','Movilidad'].map(value=><button key={value} type="button" className="secondary" aria-pressed={value===category} onClick={()=>setCategory(value)}>{value||'Todos'}</button>)}</div>
    <p className="muted">{results.length} ejercicios disponibles</p>
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
        <div className="exercise-visual"><ExerciseArt id={id} /><MuscleMap primary={primary} secondary={secondary} /></div><Technique id={id} poses/>
        <p>{required} · Principal: {primary}{secondary.length > 0 && ' · Secundarios: ' + secondary.join(', ')}</p>
      </details>
    })}
  </section>
}
