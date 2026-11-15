import { expect, test } from '@playwright/test'

test('importa y conserva un entrenamiento al recargar offline', async ({ page, context }) => {
  await page.goto('/')
  await page.getByRole('button', { name: 'Probar en este dispositivo' }).click()
  await page.getByRole('link', { name: 'Entrenar' }).click()
  await page.getByLabel('Nombre de la rutina').fill('Plan inicial')
  await page.getByLabel('Importar desde texto').fill('Día 1 — Torso\nPress banca 3x10 70kg')
  await page.getByRole('button', { name: 'Preparar vista previa' }).click()
  await page.getByLabel('Carga', { exact: true }).fill('72.5')
  await page.getByRole('button', { name: 'Guardar rutina' }).click()
  await page.getByRole('button', { name: 'Asignar día' }).click()
  await page.getByRole('button', { name: 'Empezar', exact: true }).click()
  await page.evaluate(async () => {
    await navigator.serviceWorker.ready
    if (!navigator.serviceWorker.controller) {
      await new Promise<void>(resolve => navigator.serviceWorker.addEventListener('controllerchange', () => resolve(), { once: true }))
    }
  })
  await context.setOffline(true)
  await page.getByRole('button', { name: 'Registrar serie' }).click()
  await expect(page.getByText('1 de 3 series')).toBeVisible()
  await page.reload()
  await expect(page.getByText('1 de 3 series')).toBeVisible()
  await page.getByRole('button', { name: 'Finalizar entrenamiento' }).click()
  await page.getByRole('link', { name: 'Volver a progreso' }).click()
  await expect(page.locator('main').getByText('Press banca · 725 kg de volumen', { exact: false })).toBeVisible()
})


test('usa una plantilla y explora el catálogo ilustrado', async ({ page }) => {
  await page.goto('/')
  await page.getByRole('button', { name: 'Probar en este dispositivo' }).click()
  await page.getByRole('link', { name: 'Entrenar' }).click()
  await page.getByRole('link', { name: 'División de cinco días' }).click()
  await expect(page.getByText('5 días · 11 ejercicios')).toBeVisible()
  await page.getByRole('button', { name: 'Guardar rutina' }).click()
  await page.getByRole('button', { name: 'Asignar semana completa' }).click()
  await expect(page.getByRole('button', { name: 'Empezar', exact: true })).toHaveCount(5)
  await page.getByRole('searchbox', { name: 'Buscar ejercicio' }).fill('banco plano c barra')
  await page.locator('#biblioteca summary').getByText('Press banca', { exact: true }).click()
  await expect(page.getByText('Principal: Pecho', { exact: false })).toBeVisible()
  await expect(page.locator('#biblioteca .exercise-sprite')).toBeVisible()
  await page.getByRole('link', { name: 'Perfil' }).click()
  await page.getByRole('button', { name: 'Cocodrilo' }).click()
  await expect(page.getByRole('button', { name: 'Cocodrilo' })).toHaveAttribute('aria-pressed', 'true')
  await page.reload()
  await expect(page.getByRole('button', { name: 'Cocodrilo' })).toHaveAttribute('aria-pressed', 'true')
})
