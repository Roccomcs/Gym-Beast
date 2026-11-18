import { expect, test } from '@playwright/test'
import { companions, petSources } from '../../src/pet-species'

test('referencias limpias de las cinco etapas para ilustraciones de entrenamiento', async ({ page }, info) => {
  await page.setViewportSize({ width: 1800, height: 500 })
  await page.goto('/')
  await page.emulateMedia({ reducedMotion: 'reduce' })
  for (const name of companions) {
    await page.evaluate(async name => {
      const path = '/tests/wardrobe-preview.tsx'
      const { showWardrobeReview } = await import(path)
      showWardrobeReview([1, 2, 3, 4, 5].map(stage => ({ id: name + stage, name, stage, outfit: [] })))
      await document.fonts.ready
      await Promise.all(Array.from(document.querySelectorAll('#wardrobe-review .dragon-stage')).map(async element => {
        const url = getComputedStyle(element).backgroundImage.slice(5, -2)
        const image = new Image(); image.src = url; await image.decode()
      }))
    }, name)
    await expect(page.locator('#wardrobe-review .dragon-stage')).toHaveCount(5)
    await page.locator('.wardrobe-sheet').screenshot({ path: info.outputPath(petSources[name] + '-reference.png'), scale: 'css' })
  }
})
