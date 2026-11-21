import { db } from './store'

// Presentation receipts never grant or change rewards.
export async function claimCelebration(owner: string, session: string, evolvedStage: number) {
  return db.transaction('rw', db.presentations, async () => {
    const prior = await db.presentations.get([owner, session])
    const celebration = !prior?.celebrated
    const evolution = evolvedStage > (prior?.evolvedStage ?? 0)
    await db.presentations.put({ owner, session, celebrated: true,
      evolvedStage: Math.max(evolvedStage, prior?.evolvedStage ?? 0) })
    return { celebration, evolution }
  })
}
