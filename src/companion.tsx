export const companions = ['Dragón', 'Cocodrilo', 'Oso', 'Lobo'] as const
export const dragonStages = [
  { name: 'Huevo', xp: 0 }, { name: 'Bebé', xp: 25 }, { name: 'Cría', xp: 100 },
  { name: 'Adolescente', xp: 200 }, { name: 'Adulto', xp: 300 }, { name: 'Titán', xp: 600 },
]
const otherStages = [{ name: 'Huevo', xp: 0 }, { name: 'Bebé', xp: 25 }, { name: 'Joven', xp: 100 }, { name: 'Adulta', xp: 300 }]

export function companionStage(name: string, xp: number) {
  const stages = name === 'Dragón' ? dragonStages : otherStages
  const index = stages.reduce((latest, stage, position) => xp >= stage.xp ? position : latest, 0)
  return { index, stage: stages[index], next: stages[index + 1] }
}

export function Companion({ name, xp, stage = 'adulta' }: { name: string; xp?: number; stage?: 'bebé' | 'joven' | 'adulta' }) {
  const phase = xp === undefined ? undefined : companionStage(name, xp).index
  if (name === 'Dragón') {
    const cell = phase ?? (stage === 'bebé' ? 1 : stage === 'joven' ? 2 : 4)
    return <span aria-hidden="true" className="dragon-stage" data-companion={name} data-form={cell} style={{
      backgroundPosition: (cell % 3) * 50 + '% ' + (cell >= 3 ? '100%' : '0%'),
    }}/>
  }
  const index = companions.findIndex(companion => companion === name)
  if (phase === 0) return <span className={'egg egg-' + index} data-companion={name} data-form={phase} aria-hidden="true"/>
  return <span aria-hidden="true" className="companion-sprite" data-companion={name} data-form={phase}
    data-stage={phase === undefined ? stage : phase === 1 ? 'bebé' : phase === 2 ? 'joven' : 'adulta'} style={{
      backgroundPosition: (index === 1 || index === 3 ? '100%' : '0%') + ' ' + (index >= 2 ? '100%' : '0%'),
    }} />
}
