import { PetTraining } from './pet-training'
import { technique } from './exercise-technique'
import { memo, useState, type ReactNode } from 'react'
import { exercisePoses, poseStyle, poseAspect } from './exercise-poses'
const families: [string[], number[][], number[][]][] = [
  [['long-lunge','walking-lunge'], [[49,17],[49,29],[48,51],[62,63],[73,84],[54,43],[55,61]], [[48,27],[48,39],[48,63],[68,62],[73,84],[54,52],[55,70]]],
  [['hip-thrust'], [[23,54],[34,60],[54,76],[70,67],[76,86],[43,64],[53,73]], [[23,52],[35,56],[55,59],[70,61],[76,86],[45,56],[55,56]]],
  [['pull-up'], [[50,37],[50,48],[50,69],[54,78],[54,89],[65,27],[62,14]], [[50,13],[50,25],[50,47],[54,57],[54,68],[66,38],[62,14]]],
  [['leg-extension'], [[33,23],[35,35],[39,60],[62,60],[64,85],[39,48],[46,60]], [[33,23],[35,35],[39,60],[62,60],[84,58],[39,48],[46,60]]],
  [['leg-curl'], [[33,23],[35,35],[39,60],[62,60],[84,60],[39,48],[46,60]], [[33,23],[35,35],[39,60],[62,60],[57,83],[39,48],[46,60]]],
  [['lying-curl'], [[22,48],[35,52],[57,57],[72,58],[90,57],[32,65],[23,65]], [[22,48],[35,52],[57,57],[72,58],[72,37],[32,65],[23,65]]],
  [['abductor'], [[50,19],[50,32],[50,60],[57,70],[57,87],[60,47],[61,65]], [[50,19],[50,32],[50,60],[72,66],[75,84],[60,47],[61,65]]],
  [['squat','smith-squat'], [[43,13],[45,25],[43,49],[45,66],[45,85],[54,32],[55,45]], [[33,31],[39,41],[45,60],[66,65],[51,85],[51,44],[63,50]]],
  [['deadlift'], [[45,14],[46,26],[46,50],[50,68],[48,85],[52,41],[54,57]], [[66,38],[60,43],[38,54],[55,69],[48,85],[60,55],[61,73]]],
  [['pulldown','wide-pulldown','close-pulldown'], [[51,35],[50,47],[50,68],[66,71],[69,86],[65,32],[64,15]], [[51,35],[50,47],[50,68],[66,71],[69,86],[69,59],[64,44]]],
  [['bench-barbell','bench-smith','bench-dumbbell','incline-dumbbell','fly','pec-deck','french-press','pullover'], [[20,54],[32,58],[63,64],[75,67],[75,85],[38,42],[42,28]], [[20,54],[32,58],[63,64],[75,67],[75,85],[38,64],[49,52]]],
  [['leg-press','glute-press','quad-press'], [[34,26],[41,38],[48,64],[67,59],[82,48],[48,47],[55,64]], [[34,26],[41,38],[48,64],[65,70],[73,86],[48,47],[55,64]]],
  [['rear-delt-machine','lateral-raise','front-raise'], [[48,16],[49,29],[49,55],[50,70],[52,86],[57,45],[58,61]], [[48,16],[49,29],[49,55],[50,70],[52,86],[67,33],[83,34]]],
  [['curl','incline-curl','barbell-curl','hammer-curl'], [[48,16],[49,29],[49,55],[50,70],[52,86],[56,44],[72,49]], [[48,16],[49,29],[49,55],[50,70],[52,86],[56,44],[57,29]]],
  [['pushdown'], [[46,15],[47,28],[47,54],[46,68],[48,85],[55,42],[67,34]], [[46,15],[47,28],[47,54],[46,68],[48,85],[55,42],[57,63]]],
  [['overhead-extension'], [[46,15],[47,29],[47,55],[46,69],[48,85],[49,11],[42,20]], [[46,15],[47,29],[47,55],[46,69],[48,85],[49,11],[50,3]]],
  [['low-row','t-row','barbell-row'], [[43,25],[47,37],[39,60],[61,62],[78,78],[63,48],[79,52]], [[41,25],[45,37],[39,60],[61,62],[78,78],[37,51],[53,53]]],
  [['dip'], [[45,16],[46,28],[47,53],[53,67],[58,77],[47,43],[49,56]], [[45,28],[46,40],[47,65],[53,76],[58,84],[35,51],[49,56]]],
  [['plank'], [[73,62],[65,69],[41,72],[26,77],[13,84],[65,84],[79,84]], [[73,62],[65,69],[41,70],[26,76],[13,84],[65,84],[79,84]]],
  [['calf-raise','walk'], [[47,15],[47,28],[48,53],[44,67],[39,85],[54,42],[59,54]], [[47,11],[47,24],[48,49],[50,66],[58,84],[43,41],[39,54]]],
]
const links = [[1,2],[2,3],[3,4],[1,5],[5,6]]
const petPalette: Record<string, string> = {
  Dragón:'#ab65e5', Cocodrilo:'#7ac361', Oso:'#b17952', Lobo:'#b6c9ea',
  Zorro:'#ee9240', Ajolote:'#ee9bbc', Tigre:'#efa02f', Fénix:'#ed6551',
}

function Equipment({ id, hand }: { id: string; hand: number[] }) {
  const [x, y] = hand
  if (/bench|incline|fly|pullover|french/.test(id)) return <g stroke="#829798" strokeWidth="3" fill="none">
    <path d="M19 65h51m-43 0v24m34-24v24"/>
    {/barbell|smith/.test(id) ? <path d={'M' + (x - 14) + ' ' + y + 'h28m-25-4v8m23-8v8'} /> :
      <path d={'M' + (x - 7) + ' ' + y + 'h14m-13-3v6m12-6v6'}/>}
  </g>
  if (/pulldown|pushdown|row|pull-up/.test(id)) return <g stroke="#829798" strokeWidth="2.5" fill="none">
    <path d="M82 87V13H62m18 28H72v27h8"/>
    <path d={'M64 13L' + x + ' ' + y + 'm-7 0h14'}/>
  </g>
  if (/press|curl|squat|deadlift|lunge|raise|extension/.test(id)) return <g stroke="#829798" strokeWidth="2.5" fill="none">
    <path d={'M' + (x - 8) + ' ' + y + 'h16m-15-4v8m14-8v8'}/>
  </g>
  return null
}

export function Movement({ id, phase, pet }: { id: string | null; phase?: 0 | 1; pet?: string }) {
  const family = id ? families.find(([ids]) => ids.includes(id)) : undefined
  if (!family) return null
  const [, first, end] = family
  const start = phase === 1 ? end : first
  const tint = pet ? petPalette[pet] ?? '#ab65e5' : '#e4b494'
  return <svg className={phase === undefined ? "movement-loop" : "movement-loop movement-still"} viewBox="0 0 100 100" aria-label={phase === undefined ? "Esquema animado del movimiento" : phase === 0 ? "Posición inicial" : "Posición final"} role="img">
    <rect width="100" height="100" fill="#151e1f"/>
    <path d="M0 89h100m-79 0-6 11m34-11v11m30-11 6 11" stroke="#506663" strokeWidth="1"/>
    {phase !== undefined && <Equipment id={id!} hand={start[6]}/>}
    {!pet && <circle cx={start[0][0]} cy={start[0][1]} r="6" fill={tint}>
      {phase === undefined && <animate attributeName="cx" values={[start[0][0],end[0][0],start[0][0]].join(';')} dur="2.4s" repeatCount="indefinite"/>}
      {phase === undefined && <animate attributeName="cy" values={[start[0][1],end[0][1],start[0][1]].join(';')} dur="2.4s" repeatCount="indefinite"/>}
    </circle>}
    {links.map(([a,b]) => <line key={a + ':' + b} x1={start[a][0]} y1={start[a][1]} x2={start[b][0]} y2={start[b][1]}
      stroke={a === 1 && b === 2 ? '#c5e84a' : tint} strokeWidth={a === 1 && b === 2 ? 11 : 6} strokeLinecap="round">
      {phase === undefined && ([['x1',a,0],['y1',a,1],['x2',b,0],['y2',b,1]] as const).map(([attribute,joint,axis]) =>
        <animate key={attribute} attributeName={attribute} values={[start[joint][axis],end[joint][axis],start[joint][axis]].join(';')}
          dur="2.4s" repeatCount="indefinite" />)}
    </line>)}
    {pet && <g transform={`translate(${start[0][0]} ${start[0][1]})`} stroke="#11181b" strokeWidth="1">
      <path d="M-8-4l-2-6 6 2 4-2 4 2 5-2-1 7 4 3v4l-5 4H-4l-5-4z" fill={tint}/>
      <path d="M2 2h9v3L6 7H1z" fill="#ead9b8"/>
      <path d="M0-3h4v4H0z" fill="#fff"/>
      <path d="M2-2h2v3H2z" fill="#223b32"/>
    </g>}
  </svg>
}

function ExerciseDemonstrationView({ id, pet, petXp = 0, illustration }: { id: string | null; pet?: string; petXp?: number; illustration?: ReactNode }) {
  const [phase, setPhase] = useState<0 | 1>(0)
  if (pet) return <PetTraining name={pet} xp={petXp} exercise={id}/>
  const illustrated = id ? exercisePoses(id, 0) : undefined
  const press = !!illustrated && illustrated.image === '/leg-press-poses.webp'
  if (illustration && !illustrated) return illustration
  if (!id || (!illustrated && !families.some(([ids]) => ids.includes(id)))) return illustration ?? null
  return <div className="exercise-demonstration" data-phase={phase}>
    <div className={'demo-frames' + (illustrated ? ' demo-frames-cutout' : '')} style={{aspectRatio:illustrated ? poseAspect(illustrated) : undefined}} role="img" aria-label="Demostración del movimiento">
      {([0, 1] as const).map(pose => {
        const art = illustrated ? exercisePoses(id, pose) : undefined
        return <div key={pose} className={'demo-frame demo-frame-' + pose} aria-hidden="true">
          {art ? <span className={'demo-illustration' + (press ? ' demo-leg-press' : '')} style={poseStyle(art)}/>
          : <Movement id={id} phase={pose}/>}
        </div>
      })}
    </div>
    <button type="button" className="secondary demo-switch" onClick={() => setPhase(phase === 0 ? 1 : 0)}>
      {phase ? 'Ver posición inicial' : 'Ver posición final'}
    </button>
  </div>
}

export const ExerciseDemonstration = memo(ExerciseDemonstrationView,(before,after)=>before.id===after.id && before.pet===after.pet && before.petXp===after.petXp &&
  (before.illustration===after.illustration || !!before.id && !!exercisePoses(before.id,0)))

export function Technique({ id, poses = false }: { id: string | null; poses?: boolean }) {
  const instructions = id ? technique[id as keyof typeof technique] : undefined
  if (!instructions) return null
  return <div className="technique-steps">
    {instructions.map((instruction, index) => <div key={instruction}>
      {poses && (() => {
        const art = exercisePoses(id!, index === 0 ? 0 : 1)
        return art ? <div className="technique-pose" role="img" aria-label={index === 0 ? 'Posición inicial' : 'Posición final'} style={{aspectRatio:poseAspect(art) ?? 1}}>
          <span className="demo-illustration" style={poseStyle(art)}/>
        </div> : <Movement id={id} phase={index === 0 ? 0 : 1}/>
      })()}
      <strong>{index === 0 ? 'Inicio' : 'Movimiento'}</strong><p>{instruction}</p>
    </div>)}
  </div>
}
