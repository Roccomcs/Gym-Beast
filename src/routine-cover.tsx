export const rankCovers=['/routine-covers/basic.webp','/routine-covers/intermediate.webp','/routine-covers/advanced.webp'] as const
const legacyRanks=[0,1,0,1,1,1,1,2,2,0,1]
export function RoutineCover({index=11}:{index?:number}){
  const source=index===14?rankCovers[2]:rankCovers[index>=11?index-11:legacyRanks[index]??0]??rankCovers[0]
  return <span className="program-cover rank-cover" aria-hidden="true" style={{filter:index===14?'hue-rotate(165deg)':undefined,backgroundImage:'url('+source+')',backgroundSize:'contain',backgroundPosition:'center',backgroundRepeat:'no-repeat',backgroundColor:'#0b0b0d'}}/>
}

