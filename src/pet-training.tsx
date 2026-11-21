import { useEffect, useState } from 'react'
import { Companion } from './companion'
import { stageIndex } from './pet-progress'
import atlasData from './pet-training-atlases.json'
import {artSource} from './art-source'

import { ownTrainingSource, petTrainingSource } from './training-selection'
export { petTrainingSource, trainingMovements } from './training-selection'

type Art = { url: string; source: string }
const loaded = new Map<string, Promise<Art>>()
function loadArt(url: string) {
  const prior = loaded.get(url)
  if (prior) return prior
  const image = new Image()
  const revision = atlasData[url as keyof typeof atlasData]?.revision
  const source = artSource(url) + (revision ? '?v=' + revision : '')
  image.src = source
  const result = image.decode().then(() => ({ url, source }))
    .catch(error => { loaded.delete(url); throw error })
  if (loaded.size >= 8) loaded.delete(loaded.keys().next().value!)
  loaded.set(url, result)
  return result
}

export function preloadPetTraining(name: string, ids: (string | null)[]) {
  const paths = new Set(ids.flatMap(id => { const url = petTrainingSource(name, id); return url ? [url] : [] }))
  return Promise.allSettled([...paths].map(loadArt))
}

export function PetTraining({ name, xp, exercise }: { name: string; xp: number; exercise: string | null }) {
  const stage = stageIndex(xp)
  const companion = ownTrainingSource(name, exercise) ? name : 'Dragón'
  const url = stage ? petTrainingSource(name, exercise) : undefined
  const [art, setArt] = useState<Art>()
  const [phase, setPhase] = useState<0 | 1>(0)
  useEffect(() => {
    let live = true
    setPhase(0)
    const load = () => { if (url) void loadArt(url).then(value => { if (live) setArt(value) }).catch(() => undefined) }
    load()
    window.addEventListener('online', load)
    return () => { live = false; window.removeEventListener('online', load) }
  }, [url])
  if (!url || art?.url !== url) return <div className="pet-training-ready" data-pet-training="preparing" data-companion={name} data-form={stage}>
    <Companion name={name} xp={xp}/>
    {stage > 0 && <span>Preparándose</span>}
  </div>
  const atlas = atlasData[url as keyof typeof atlasData]
  const [top, bottom] = atlas.rows[stage - 1]
  const height = bottom - top
  const columns = atlas.columns[stage - 1]
  const half = atlas.width / 2
  const padding = Math.abs(columns[0][1] - half)
  const viewWidth = half + 2 * padding
  return <div className="exercise-demonstration pet-training" data-phase={phase} data-pet-training={exercise} data-companion={companion} data-requested-companion={name} data-form={stage}>
    <div className="demo-frames pet-training-frames" style={{ aspectRatio: viewWidth / height }} role="img"
      aria-label={companion + ' entrenando · ' + (phase ? 'posición final' : 'dos posiciones del movimiento')}>
      {([0, 1] as const).map(pose => {
        const [left, right] = columns[pose]
        const width = right - left
        return <div key={pose} className={'demo-frame demo-frame-' + pose} aria-hidden="true">
          <span className="demo-illustration" style={{ left: (left - pose * half + padding) / viewWidth * 100 + '%',
            right: 'auto', width: width / viewWidth * 100 + '%', backgroundImage: 'url(' + art.source + ')',
            backgroundSize: atlas.width / width * 100 + '% ' + atlas.height / height * 100 + '%',
            backgroundPosition: left / (atlas.width - width) * 100 + '% ' + top / (atlas.height - height) * 100 + '%' }}/>
        </div>
      })}
    </div>
    {companion !== name && <span className="training-coach-label">Demostración de Dragón</span>}
    <button type="button" className="secondary demo-switch" onClick={() => setPhase(phase ? 0 : 1)}>
      {phase ? 'Ver posición inicial' : 'Ver posición final'}
    </button>
  </div>
}
