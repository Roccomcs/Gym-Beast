import { useRef, useState } from 'react'
import type { Profile } from './domain'
import { initialVitals, type PetVitals } from './pet-progress'
import { companions } from './pet-species'
import { Habitat } from './habitat'
import { outfitFor } from './shop-catalog'

export function HomePets({ profile, pets, showStats = true }: { profile: Profile; pets: Map<string, PetVitals>; showStats?: boolean }) {
  const owned = [profile.companion, ...companions.filter(name => name !== profile.companion &&
    (name === profile.starter || profile.purchases?.includes('egg:' + name)))]
  const shelf = useRef<HTMLDivElement>(null)
  const [page, setPage] = useState(0)
  function select(index: number) {
    shelf.current?.scrollTo({ left: index * shelf.current.clientWidth, behavior: 'instant' })
    setPage(index)
  }
  const dots = owned.length > 1 && <div className="home-pet-dots" role="group" aria-label="Elegir mascota">
    {owned.map((name, index) => <button type="button" key={name}
      aria-label={'Ver ' + (profile.petNames?.[name] || name)}
      aria-current={page === index ? 'true' : undefined} onClick={() => select(index)}><span/></button>)}
  </div>
  return <section aria-label="Tus mascotas" className="home-pets">
    <div className="home-pet-pages" ref={shelf} onScroll={event => {
      const node = event.currentTarget
      if (node.clientWidth) setPage(Math.round(node.scrollLeft / node.clientWidth))
    }}>
      {owned.map((name, index) => {
        const vitals = pets.get(name) ?? initialVitals
        return <div className="home-pet-page" key={name}>
          <Habitat name={name} displayName={profile.petNames?.[name]} xp={vitals.xp}
            health={vitals.health} outfit={outfitFor(profile, name)} showStats={showStats} sceneFooter={page === index ? dots : undefined}/>
        </div>
      })}
    </div>
  </section>
}
