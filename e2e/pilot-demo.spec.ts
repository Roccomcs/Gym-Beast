import { writeFile } from 'node:fs/promises'
import { expect, test } from '@playwright/test'
import { pilotDate, pilotItems } from '../tests/pilot-fixture'

test('demostración reproducible de rutina, ropa, mascota e historial', async ({ page }, info) => {
  await page.setViewportSize({ width: 390, height: 844 })
  await page.clock.setFixedTime(new Date(pilotDate))
  await page.goto('/')
  await page.getByRole('button', { name: 'Probar en este dispositivo' }).click()
  const items = pilotItems()
  await page.evaluate(async rows => {
    const database = await new Promise<IDBDatabase>((resolve, reject) => {
      const request = indexedDB.open('gymbeast')
      request.onsuccess = () => resolve(request.result)
      request.onerror = () => reject(request.error)
    })
    await new Promise<void>((resolve, reject) => {
      const transaction = database.transaction('items', 'readwrite')
      for (const row of rows) transaction.objectStore('items').put(row)
      transaction.oncomplete = () => resolve()
      transaction.onerror = () => reject(transaction.error)
    })
    database.close()
  }, items)
  await writeFile(info.outputPath('gymbeast-demo.json'), JSON.stringify({ version: 1, items }, null, 2))
  await page.reload()
  await page.emulateMedia({ reducedMotion: 'reduce' })
  await expect(page.getByRole('heading', { name: 'Hola, Rocco Demo' })).toBeVisible()
  await expect(page.locator('[data-dressed-sprite="boca"]')).toBeVisible()
  await expect(page.getByLabel('Progreso hacia la siguiente evolución')).toHaveAttribute('value', '81.25')
  await page.screenshot({ path: info.outputPath('inicio.png'), fullPage: true, scale: 'css' })
  await page.getByRole('link', { name: 'Entrenar', exact: true }).click()
  await expect(page.getByText('DÍA 1 DE 5')).toBeVisible()
  await page.screenshot({ path: info.outputPath('entrenar.png'), fullPage: true, scale: 'css' })
  await page.getByRole('link', { name: 'Tienda', exact: true }).click()
  await expect(page.getByTestId('shop-balance')).toContainText('335')
  await page.screenshot({ path: info.outputPath('tienda.png'), fullPage: true, scale: 'css' })
  await page.getByRole('link', { name: 'Perfil', exact: true }).click()
  await page.getByRole('link', { name: 'Progreso', exact: true }).click()
  await expect(page.getByRole('heading', { name: 'Progreso', exact: true })).toBeVisible()
  await page.screenshot({ path: info.outputPath('progreso.png'), fullPage: true, scale: 'css' })
})
