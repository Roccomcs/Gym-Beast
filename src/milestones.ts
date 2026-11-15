export const trainingMilestones = [
  { goal: 1, label: 'Primera sesión' },
  { goal: 5, label: 'Cinco sesiones' },
  { goal: 10, label: 'Diez sesiones' },
] as const

export const milestoneId = (goal: number) => 'mission:' + goal
