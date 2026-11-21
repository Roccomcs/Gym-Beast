import { expect, test } from '@playwright/test'
import { pilotDate, pilotItems } from '../tests/pilot-fixture'

test('la demostración del dragón queda offline sin cambiar la mascota de la sesión', async ({ page, context }) => {
  await page.clock.setFixedTime(new Date(pilotDate))
  await page.goto('/')
  await page.evaluate(() => localStorage.setItem('gymbeast-active-account', 'local'))
  await page.reload()
  const rows = pilotItems()
  for (const row of rows) {
    if (row.kind === 'profile') {
      row.data.companion = 'Lobo'; row.data.starter = 'Lobo'
      row.data.petPlans = row.data.petPlans?.map(plan => ({ ...plan, companion: 'Lobo' }))
    }
    if (row.kind === 'session') row.data.companion = 'Lobo'
    if (row.kind === 'routine') row.data.days[0].exercises = [{
      ...row.data.days[0].exercises[0], catalogId: 'deadlift', name: 'Peso muerto', sets: 1,
    }]
  }
  await page.evaluate(async rows => {
    const database = await new Promise<IDBDatabase>((resolve, reject) => {
      const request = indexedDB.open('gymbeast')
      request.onsuccess = () => resolve(request.result); request.onerror = () => reject(request.error)
    })
    await new Promise<void>((resolve, reject) => {
      const transaction = database.transaction('items', 'readwrite')
      for (const row of rows) transaction.objectStore('items').put(row)
      transaction.oncomplete = () => resolve(); transaction.onerror = () => reject(transaction.error)
    })
    database.close()
  }, rows)
  await page.reload()
  await page.waitForFunction(() => !!navigator.serviceWorker.controller)
  await page.getByRole('link', { name: 'Entrenar', exact: true }).click()
  const demo = page.locator('.quest-demo .pet-training')
  await expect(demo).toHaveAttribute('data-companion', 'Dragón')
  await expect(demo).toHaveAttribute('data-pet-training', 'deadlift')
  await page.waitForFunction(async () => {
    const cache = await caches.open('gymbeast-pet-training-v2')
    return (await cache.keys()).some(request => request.url.includes('/dragon/deadlift.webp?v='))
  })
  await context.setOffline(true)
  await page.reload()
  await expect(demo).toHaveAttribute('data-companion', 'Dragón')
  await expect(demo).toHaveAttribute('data-pet-training', 'deadlift')
  await page.getByRole('button', { name: 'Empezar', exact: true }).click()
  await page.getByRole('button', { name: 'Registrar serie 1', exact: true }).click()
  await page.getByRole('button', { name: 'Finalizar entrenamiento' }).click()
  await expect(page.getByRole('status', { name: '+25 EXP · +20 de oro' })).toBeVisible()
  await expect(page.locator('.pet-celebration')).toHaveAttribute('data-species', 'wolf')
  await page.reload()
  await expect(page.locator('.pet-celebration')).toHaveAttribute('data-species', 'wolf')
  await expect(page.locator('.pet-celebration')).toHaveAttribute('data-celebrate', 'false')
})
