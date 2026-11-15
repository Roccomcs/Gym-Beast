export const companions = ['Dragón', 'Cocodrilo', 'Oso', 'Lobo'] as const

export function Companion({ name }: { name: string }) {
  const index = companions.findIndex(companion => companion === name)
  return <span aria-hidden="true" className="companion-sprite" style={{
    backgroundPosition: (index === 1 || index === 3 ? '100%' : '0%') + ' ' + (index >= 2 ? '100%' : '0%'),
  }} />
}
