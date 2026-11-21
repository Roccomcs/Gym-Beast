import { expect, test } from '@playwright/test'

test('poses de mascotas, fallback y movimiento reducido', async ({ page }, info) => {
  await page.setViewportSize({ width: 390, height: 844 })
  for (const name of ['Dragón', 'Oso', 'Cocodrilo']) {
    for (const exercise of ['bench-barbell', 'walking-lunge']) {
      await page.goto('/')
      await page.evaluate(async ({ name, exercise }) => {
        const path = '/tests/training-preview.tsx'
        const { previewTraining } = await import(path)
        previewTraining(name, 300, exercise)
      }, { name, exercise })
      const demo = page.locator('[data-pet-training="' + exercise + '"]')
      await expect(demo).toBeVisible()
      await expect(demo).toHaveAttribute('data-companion', name)
      await expect(demo).toHaveAttribute('data-form', '2')
      expect(await demo.locator('.demo-frame-0').evaluate(element => getComputedStyle(element).animationName)).not.toBe('none')
      for (const width of [320, 390]) {
        await page.setViewportSize({ width, height: 844 })
        expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true)
      }
      await page.emulateMedia({ reducedMotion: 'reduce' })
      await demo.getByRole('button', { name: 'Ver posición final' }).click()
      await expect(demo).toHaveAttribute('data-phase', '1')
      await demo.screenshot({ path: info.outputPath(name + '-' + exercise + '.png') })
      await page.emulateMedia({ reducedMotion: 'no-preference' })
    }
  }
  await page.goto('/')
  await page.evaluate(async () => {
    const path = '/tests/training-preview.tsx'
    const { previewTraining } = await import(path)
    previewTraining('Lobo', 700, null)
  })
  await expect(page.getByText('Preparándose')).toBeVisible()
  await expect(page.locator('[data-pet-training]')).toHaveAttribute('data-companion', 'Lobo')
})

test('festejo y evolución terminan automáticamente', async ({ page }) => {
  await page.goto('/')
  await page.evaluate(async () => {
    const path = '/tests/training-preview.tsx'
    const { previewTraining } = await import(path)
    previewTraining('Dragón', 300, null, true)
  })
  const scene = page.locator('.pet-celebration')
  await expect(scene).toHaveAttribute('data-celebrate', 'true')
  await expect(page.getByRole('status')).toHaveText('¡Tu compañero evolucionó!')
  await expect(scene).toHaveAttribute('data-celebrate', 'false')
})
