import { expect, test } from '@playwright/test'
import { writeFile, readFile } from 'node:fs/promises'
import { companions } from '../../src/pet-species'
import { companionStages } from '../../src/pet-progress'
import type { ShopGood } from '../../src/shop-catalog'
import type { WardrobeCase } from '../../tests/wardrobe-preview'

test('inventario y muestra de calce sobre los sprites de la aplicación', async ({ page, request }, info) => {
  test.setTimeout(120000)
  const goods = JSON.parse(await readFile('src/shop-catalog.json', 'utf8')) as ShopGood[]
  const wearable = goods.filter(item => ['top', 'bottom', 'head', 'wrist'].includes(item.slot))
  const matrix = companions.flatMap(name => companionStages.flatMap((stage, index) => wearable.map(item => ({
    species: name, stage: stage.name, item: item.id, visible: index > 0, status: 'pendiente de aprobación visual',
  }))))
  await writeFile(info.outputPath('matriz-ropa.json'), JSON.stringify(matrix, null, 2))
  const sources = ['dragon', 'crocodile', 'bear', 'wolf', 'fox', 'axolotl', 'tiger', 'phoenix']
  for (const species of sources) for (const directory of ['jerseys', 'garments/hoodie', 'garments/tank', 'garments/pants', 'garments/shorts']) {
    for (const suffix of ['.webp', '-fabric.png']) {
      const response = await request.get('/' + directory + '/' + species + suffix)
      expect(response.ok()).toBe(true)
      expect(response.headers()['content-type']).toMatch(/^image\/(png|webp)/)
    }
  }
  await page.goto('/')
  await page.emulateMedia({ reducedMotion: 'reduce' })
  const show = async (cases: WardrobeCase[]) => {
    await page.evaluate(async cases => {
      const path = '/tests/wardrobe-preview.tsx'
      const { showWardrobeReview } = await import(path)
      showWardrobeReview(cases)
    }, cases)
    await page.evaluate(() => document.fonts.ready)
  }
  await show(companions.flatMap((name, species) => companionStages.map((_, stage) => ({
    id: species + '-' + stage, name, stage, outfit: ['hoodie', 'jogger', 'gym-cap', 'watch'],
  }))))
  await expect(page.locator('[data-dressed-sprite="hoodie"]')).toHaveCount(40)
  await page.locator('.wardrobe-sheet').screenshot({ path: info.outputPath('base-48-etapas.png'), scale: 'css' })
  await show([{ id: 'dragon-watch', name: 'Dragón', stage: 2, outfit: ['hoodie', 'watch'] }])
  await expect(page.locator('[data-dressed-sprite="hoodie"]')).toHaveCount(1)
  await expect(page.locator('[data-dressed-sprite="hoodie"]')).toHaveCSS('background-image', /dragon-cria-hoodie-watch-v2\.png/)
  await page.locator('.wardrobe-character .dragon-stage').screenshot({ path: info.outputPath('dragon-buzo-reloj.png'), omitBackground: true, scale: 'css' })
  await show([{ id: 'dragon-watch-scene', name: 'Dragón', stage: 2, outfit: ['hoodie', 'watch'], scene: true }])
  await expect(page.locator('.habitat [data-dressed-sprite="hoodie"]')).toBeVisible()
  await page.locator('.habitat-scene').screenshot({ path: info.outputPath('muestra-en-habitat.png'), scale: 'css' })
})
