import { createRoot } from 'react-dom/client'
import { PetTraining } from '../src/pet-training'
import { PetCelebration } from '../src/pet-celebration'
import { companionStages } from '../src/pet-progress'
import { useMotionVisibility } from '../src/motion'
import { Habitat } from '../src/habitat'
import { goods } from '../src/shop-catalog'
import { useState } from 'react'
import { ExerciseDemonstration } from '../src/movement'
import { ExerciseTargets } from '../src/library'
import { catalog } from '../src/domain'

export function previewExercises(ids: string[]) {
  const element = document.createElement('div'); document.body.replaceChildren(element)
  createRoot(element).render(<div id="exercise-sheet" style={{display:'grid',gridTemplateColumns:'repeat(4,1fr)',gap:12,padding:12}}>
    {ids.map(id=><section key={id} className="review-exercise" style={{border:'1px solid #57534a',padding:8,minWidth:0}}>
      <p>{catalog.find(entry=>entry[0]===id)?.[1]}</p><ExerciseDemonstration id={id}/><ExerciseTargets id={id}/>
    </section>)}
  </div>)
}

function LateReward() {
  const [confirmed, confirm] = useState(false)
  useMotionVisibility()
  return <><button onClick={() => confirm(true)}>Confirmar premio</button>
    <PetCelebration owner="preview" sessionId="late-reward" name="Dragón" xp={confirmed ? 300 : 275}
      before={275} eligible confirmed={confirmed} outfit={[]}/></>
}

export function previewLateReward() {
  const element = document.createElement('div'); document.body.replaceChildren(element)
  createRoot(element).render(<LateReward/>)
}

export function previewTrainingSheet(name: string, stage: number) {
  const element = document.createElement('div'); document.body.replaceChildren(element)
  createRoot(element).render(<div id="training-sheet" style={{ display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)', gap: 8, padding: 12 }}>
    {['bench-barbell', 'pulldown', 'squat', 'curl', 'leg-press'].map(exercise => <div key={exercise}>
      <p>{name} · {companionStages[stage].name} · {exercise}</p>
      <PetTraining name={name} xp={companionStages[stage].xp} exercise={exercise}/>
    </div>)}
  </div>)
}

export function previewHabitat(name: string, stage: number, buddy?: string) {
  const element = document.createElement('div'); document.body.replaceChildren(element)
  createRoot(element).render(<main style={{ maxWidth: 390 }}><Habitat name={name} xp={companionStages[stage].xp}
    health={100} outfit={goods.filter(good => good.id === buddy)}/></main>)
}
export function previewTraining(name: string, xp: number, exercise: string | null, celebrate = false) {
  const element = document.createElement('div')
  document.body.replaceChildren(element)
  createRoot(element).render(<main style={{ width: '100%', maxWidth: 390, padding: 16 }}>
    {celebrate ? <PetCelebration owner="preview" sessionId="test-session" confirmed name={name} xp={xp} before={xp - 25} eligible outfit={[]}/>
      : <PetTraining name={name} xp={xp} exercise={exercise}/>}
  </main>)
}
