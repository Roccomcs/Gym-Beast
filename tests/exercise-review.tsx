import {createRoot} from 'react-dom/client'
import {catalog} from '../src/domain'
import {ExerciseArt} from '../src/library'
import {ExerciseDemonstration} from '../src/movement'
import '../src/routine-builder.css'
export function showExerciseReview(){
 const node=document.createElement('div');document.body.replaceChildren(node)
 createRoot(node).render(<div className="art-review" style={{display:'grid',gridTemplateColumns:'repeat(2,minmax(0,1fr))',gap:8,padding:8}}>
 {catalog.map(([id,name])=><article key={id} data-exercise={id} style={{minWidth:0,background:'#242429',padding:8}}>
 <p style={{fontSize:12}}>{name}</p><div className="builder-art"><ExerciseArt id={id}/></div>
 <ExerciseDemonstration id={id}/></article>)}</div>)
}
