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

export function exercisePoses(id: string, phase: 0 | 1) {
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
