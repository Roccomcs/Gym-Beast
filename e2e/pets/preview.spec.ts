import { expect, test } from '@playwright/test'
import { companions, petSources } from '../../src/pet-species'

test('cinco ejercicios principales en las cinco edades de cada especie', async ({ page }, info) => {
  await page.emulateMedia({ reducedMotion: 'reduce' })
  await page.setViewportSize({ width: 1500, height: 520 })
  for (const name of companions) for (let stage = 1; stage <= 5; stage++) {
    await page.goto('/')
    await page.evaluate(async ({ name, stage }) => {
      const path = '/tests/training-preview.tsx'; const fixture = await import(path)
      fixture.previewTrainingSheet(name, stage)
    }, { name, stage })
    const demos = page.locator('#training-sheet .pet-training')
    await expect(demos).toHaveCount(5)
    for (const demo of await demos.all()) {
      await expect(demo).toHaveAttribute('data-companion', name)
      await expect(demo).toHaveAttribute('data-form', String(stage))
    }
    await page.locator('#training-sheet').screenshot({ path: info.outputPath(petSources[name] + '-' + stage + '-initial.png') })
    for (const demo of await demos.all()) await demo.getByRole('button', { name: 'Ver posición final' }).click()
    await page.locator('#training-sheet').screenshot({ path: info.outputPath(petSources[name] + '-' + stage + '-final.png') })
  }
})

test('los hábitats y familiares reaccionan y respetan movimiento reducido', async ({ page }) => {
  for (const name of companions) for (let stage = 0; stage <= 5; stage++) {
    await page.goto('/')
    await page.evaluate(async ({ name, stage }) => {
      const path = '/tests/training-preview.tsx'; const fixture = await import(path)
      fixture.previewHabitat(name, stage, 'slime-buddy')
    }, { name, stage })
    const pet = page.getByRole('button', { name: 'Jugar con ' + name, exact: true })
    await pet.click()
    await expect(page.locator('.pet-play')).toBeVisible()
    expect(await page.locator('.pet-play').evaluate(el => getComputedStyle(el).animationName)).not.toBe('none')
    const buddy = page.getByRole('button', { name: 'Jugar con Mini slime de bolsillo' })
    await buddy.press('Enter')
    await expect(buddy.locator('[data-played=true]')).toBeVisible()
    expect(await buddy.evaluate(el => getComputedStyle(el).animationName)).not.toBe('none')
    await page.emulateMedia({ reducedMotion: 'reduce' })
    expect(await page.locator('.pet-play').evaluate(el => getComputedStyle(el).animationName)).toBe('none')
    expect(await buddy.evaluate(el => getComputedStyle(el).animationName)).toBe('none')
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true)
    await page.emulateMedia({ reducedMotion: 'no-preference' })
  }
})

test('el premio tardío muestra evolución una vez y no repite al reabrir', async ({ page }) => {
  const show = async () => {
    await page.goto('/')
    await page.evaluate(async () => {
      const path = '/tests/training-preview.tsx'; const fixture = await import(path); fixture.previewLateReward()
    })
  }
  await show()
  await expect(page.locator('.pet-celebration')).toHaveAttribute('data-celebrate', 'true')
  await page.getByRole('button', { name: 'Confirmar premio' }).click()
  await expect(page.getByRole('status')).toHaveText('¡Tu compañero evolucionó!')
  await show()
  await page.getByRole('button', { name: 'Confirmar premio' }).click()
  await expect(page.locator('.pet-celebration')).toHaveAttribute('data-celebrate', 'false')
  await expect(page.getByText('¡Tu compañero evolucionó!')).toHaveCount(0)
})

test('las demostraciones pausan el movimiento al ocultar la aplicación', async ({ page }) => {
  await page.goto('/')
  await page.evaluate(async () => {
    const path = '/tests/training-preview.tsx'; const fixture = await import(path)
    fixture.previewTraining('Dragón', 300, 'squat')
  })
  const frame = page.locator('.demo-frame-0')
  await expect(frame).toBeAttached()
  await page.evaluate(() => {
    Object.defineProperty(document, 'visibilityState', { configurable: true, value: 'hidden' })
    document.dispatchEvent(new Event('visibilitychange'))
  })
  await expect(frame).toHaveCSS('animation-play-state', 'paused')
  await page.evaluate(() => {
    Object.defineProperty(document, 'visibilityState', { configurable: true, value: 'visible' })
    document.dispatchEvent(new Event('visibilitychange'))
  })
  await expect(frame).toHaveCSS('animation-play-state', 'running')
})
