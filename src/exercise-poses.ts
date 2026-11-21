import crops from './pet-training-atlases.json'
import type { CSSProperties } from 'react'
import {artSource} from './art-source'
import {gymExercise} from './gym-exercises'
import {programExercises} from './program-exercises'
type Crop = { width: number; height: number; rows: number[][]; columns: number[][][] }
export type ExercisePose = { image: string; columns: number; rows: number; x: number; y: number; crop?: Crop; aspect?:number }
const additions = ['overhead-press', 'romanian-deadlift', 'inverted-row', 'push-up', 'bodyweight-squat']
const atlases = [
  ['bench-smith', 'bench-dumbbell', 'incline-dumbbell', 'fly'],
  ['dip', 'pushdown', 'pull-up', 'barbell-row'],
  ['pulldown', 'curl', 'squat', 'smith-squat'],
  ['deadlift', 'lateral-raise', 'calf-raise', 'hip-thrust'],
  ['leg-curl', 'plank', 'wide-pulldown', 'close-pulldown'],
  ['t-row', 'pullover', 'rear-delt-machine', 'incline-curl'],
  ['barbell-curl', 'hammer-curl', 'glute-press', 'lying-curl'],
  ['pec-deck', 'front-raise', 'french-press', 'leg-extension'],
  ['abductor', 'low-row', 'overhead-extension', 'walk'],
]

const correctedCrop: Crop = {
  width: 1086, height: 1448,
  rows: [[0, 320], [320, 700], [700, 1060], [1060, 1448]],
  columns: Array.from({ length: 4 }, () => [[0, 543], [543, 1086]]),
}

export function exercisePoses(id: string, phase: 0 | 1): ExercisePose | undefined {
  const fullBodyRow = ['overhead-extension', 'walk'].indexOf(id)
  if (fullBodyRow >= 0) return { image: '/exercise-poses/full-body-corrections.png', columns: 2, rows: 2, x: phase, y: fullBodyRow, aspect: 1 }
  const correctedRow = ['hip-thrust', 'leg-curl', 'rear-delt-machine', 'hammer-curl'].indexOf(id)
  if (correctedRow >= 0) return { image: '/exercise-poses/form-corrections.png', columns: 2, rows: 4, x: phase, y: correctedRow, crop: correctedCrop }
  const pulldownRow = ['pulldown', 'wide-pulldown', 'close-pulldown'].indexOf(id)
  if (pulldownRow >= 0) return { image: '/exercise-poses/pulldown-front-v2.png', columns: 2, rows: 3, x: phase, y: pulldownRow, aspect: 1.43 }
  if (id === 'supported-t-row') return { image: '/exercise-poses/supported-t-row.png', columns: 2, rows: 1, x: phase, y: 0, aspect: 1 }
  if (id === 'seated-triceps-extension') return { image: '/exercise-poses/seated-triceps-extension.png', columns: 2, rows: 1, x: phase, y: 0, aspect: 1 }
  if (id === 'pec-deck') return { image: '/exercise-poses/pec-deck-front.png', columns: 2, rows: 1, x: phase, y: 0, aspect: 1 }
  if (id === 'standing-single-leg-curl') return { image: '/exercise-poses/standing-single-leg-curl-v2.png', columns: 2, rows: 1, x: phase, y: 0, aspect: 1 }
  const gym=gymExercise(id)
  if(gym?.sheet===13)return {image:'/exercise-poses/core-basics.png',columns:2,rows:4,x:phase,y:gym.row,aspect:1.5}
  if(gym)return {image:'/exercise-poses/gym-expansion-'+gym.sheet+'.webp',columns:2,rows:4,x:phase,y:gym.row,aspect:4/3}
  const added=programExercises.find(exercise=>exercise.id===id)
  if(added)return {image:'/exercise-poses/program-expansion-'+added.sheet+'.png',columns:2,rows:4,x:phase,y:added.row,aspect:4/3}
  if (id === 'french-press') return { image:'/exercise-poses/french-press-lying.png',columns:2,rows:1,x:phase,y:0 }
  const extra = additions.indexOf(id)
  if (extra >= 0) return { image: '/exercise-poses/program-basics.png', columns: 2, rows: 5, x: phase, y: extra,
    crop: (crops as Record<string, Crop>)['/exercise-poses/program-basics.png'] }
  if (id === 'leg-press' || id === 'quad-press') {
    return { image: '/leg-press-poses.webp', columns: 2, rows: 1, x: phase, y: 0 }
  }
  if (id === 'bench-barbell' || id === 'long-lunge' || id === 'walking-lunge') {
    return { image: '/exercise-poses/basics.webp', columns: 2, rows: 2, x: phase, y: id === 'bench-barbell' ? 0 : 1 }
  }
  const atlas = atlases.findIndex(entries => entries.includes(id))
  if (atlas < 0) return
  const index = atlases[atlas].indexOf(id)
  return { image: '/exercise-poses/atlas-' + (atlas + 1) + '.webp', columns: 4, rows: 2,
    x: index % 2 * 2 + phase, y: Math.floor(index / 2) }
}

export function poseStyle(art: ExercisePose): CSSProperties {
  if (!art.crop) return { backgroundImage: 'url(' + artSource(art.image) + ')', backgroundSize: art.columns * 100 + '% ' + art.rows * 100 + '%',
    backgroundPosition: art.x * 100 / (art.columns - 1) + '% ' + (art.rows === 1 ? 0 : art.y * 100 / (art.rows - 1)) + '%' }
  const crop = art.crop
  const [top, bottom] = crop.rows[art.y], [left, right] = crop.columns[art.y][art.x]
  const half = crop.width / 2, padding = Math.abs(crop.columns[art.y][0][1] - half), viewWidth = half + 2 * padding
  return { left: (left - art.x * half + padding) / viewWidth * 100 + '%', right:'auto', width:(right-left)/viewWidth*100+'%',
    backgroundImage: 'url(' + artSource(art.image) + ')', backgroundSize: crop.width / (right - left) * 100 + '% ' + crop.height / (bottom - top) * 100 + '%',
    backgroundPosition: left / (crop.width - right + left) * 100 + '% ' + top / (crop.height - bottom + top) * 100 + '%' }
}
export function poseAspect(art: ExercisePose) {
  const crop = art.crop
  if (!crop) return art.aspect
  const [top,bottom] = crop.rows[art.y]
  return (crop.width / 2 + 2 * Math.abs(crop.columns[art.y][0][1] - crop.width / 2)) / (bottom-top)
}

