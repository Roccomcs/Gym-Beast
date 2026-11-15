const families: [string[], number[][], number[][]][] = [
  [['squat','smith-squat','long-lunge','walking-lunge'], [[43,13],[45,25],[43,49],[45,66],[45,85],[54,32],[55,45]], [[33,31],[39,41],[45,60],[66,65],[51,85],[51,44],[63,50]]],
  [['deadlift','hip-thrust'], [[45,14],[46,26],[46,50],[50,68],[48,85],[52,41],[54,57]], [[66,38],[60,43],[38,54],[55,69],[48,85],[60,55],[61,73]]],
  [['pulldown','wide-pulldown','close-pulldown','pull-up'], [[51,35],[50,47],[50,68],[66,71],[69,86],[65,32],[64,15]], [[51,35],[50,47],[50,68],[66,71],[69,86],[69,59],[64,44]]],
  [['bench-barbell','bench-smith','bench-dumbbell','incline-dumbbell','fly','pec-deck','french-press','pullover'], [[20,54],[32,58],[63,64],[75,67],[75,85],[38,42],[42,28]], [[20,54],[32,58],[63,64],[75,67],[75,85],[38,64],[49,52]]],
  [['leg-press','glute-press','quad-press','leg-extension','leg-curl','lying-curl','abductor'], [[34,26],[41,38],[48,64],[67,59],[82,48],[48,47],[55,64]], [[34,26],[41,38],[48,64],[65,70],[73,86],[48,47],[55,64]]],
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

export function Movement({ id }: { id: string | null }) {
  const family = id ? families.find(([ids]) => ids.includes(id)) : undefined
  if (!family) return null
  const [, start, end] = family
  return <svg className="movement-loop" viewBox="0 0 100 100" aria-label="Esquema animado del movimiento" role="img">
    <path d="M10 88h80" stroke="#735a9a" strokeWidth="2" />
    <circle cx={start[0][0]} cy={start[0][1]} r="6" fill="#f3c9aa">
      <animate attributeName="cx" values={[start[0][0],end[0][0],start[0][0]].join(';')} dur="2.4s" repeatCount="indefinite"/>
      <animate attributeName="cy" values={[start[0][1],end[0][1],start[0][1]].join(';')} dur="2.4s" repeatCount="indefinite"/>
    </circle>
    {links.map(([a,b]) => <line key={a + ':' + b} x1={start[a][0]} y1={start[a][1]} x2={start[b][0]} y2={start[b][1]}
      stroke={a === 1 && b === 2 ? '#c68af6' : '#a8ff65'} strokeWidth={a === 1 && b === 2 ? 8 : 5} strokeLinecap="square">
      {([['x1',a,0],['y1',a,1],['x2',b,0],['y2',b,1]] as const).map(([attribute,joint,axis]) =>
        <animate key={attribute} attributeName={attribute} values={[start[joint][axis],end[joint][axis],start[joint][axis]].join(';')}
          dur="2.4s" repeatCount="indefinite" />)}
    </line>)}
  </svg>
}
