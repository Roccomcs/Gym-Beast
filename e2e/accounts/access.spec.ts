import { expect, test, type Page } from '@playwright/test'

const owner = '00000000-0000-0000-0000-000000000123'
const email = 'u.rocco@accounts.gymbeast.invalid'
function session(temporary = false, handle = 'rocco') {
  const now = Math.floor(Date.now() / 1000)
  const id = handle === 'rocco' ? owner : '00000000-0000-0000-0000-000000000124'
  const metadata = { provider: 'email', providers: ['email'],
    gymbeast_registration: { handle }, temporary_password_required: temporary }
  const user = { id, email: handle === 'rocco' ? email : 'u.' + handle + '@accounts.gymbeast.invalid', aud: 'authenticated', role: 'authenticated', app_metadata: metadata,
    user_metadata: {}, created_at: '2026-11-18T12:00:00Z' }
  const payload = { sub: id, iss: 'http://127.0.0.1:54321/auth/v1', aud: 'authenticated', role: 'authenticated', iat: now, exp: now + 3600, app_metadata: metadata }
  const token = Buffer.from(JSON.stringify({ alg: 'HS256', typ: 'JWT' })).toString('base64url') + '.' +
    Buffer.from(JSON.stringify(payload)).toString('base64url') + '.' + Buffer.from('browser-test-signature').toString('base64url')
  return { access_token: token, refresh_token: 'browser-test-refresh', token_type: 'bearer', expires_in: 3600, expires_at: now + 3600, user }
}

async function mockServer(page: Page, temporary = false, waitForFirstSync?: Promise<void>) {
  let current = session(temporary)
  const calls: Record<string, string>[] = []
  await page.route('http://127.0.0.1:54321/**', async route => {
    const request = route.request()
    const path = new URL(request.url()).pathname
    if (request.method() === 'OPTIONS') return route.fulfill({ status: 204, headers: {
      'Access-Control-Allow-Origin': '*', 'Access-Control-Allow-Headers': '*', 'Access-Control-Allow-Methods': '*',
    } })
    const headers = { 'Access-Control-Allow-Origin': '*' }
    if (path.endsWith('/functions/v1/accounts')) {
      const body = request.postDataJSON()
      calls.push(body)
      if (current.user.app_metadata.gymbeast_registration.handle !== body.username) current = session(temporary, body.username)
      if (body.password === 'incorrecta') return route.fulfill({ status: 401, headers, json: { error: 'Usuario o contraseña incorrectos.' } })
      if (body.action === 'password') current = session(false)
      return route.fulfill({ headers, json: { session: current } })
    }
    if (path.endsWith('/auth/v1/user')) return route.fulfill({ headers, json: current.user })
    if (path.endsWith('/auth/v1/token')) return route.fulfill({ headers, json: current })
    if (path.endsWith('/auth/v1/logout')) return route.fulfill({ status: 204, headers })
    if (path.endsWith('/rpc/sync_push')) return route.fulfill({ headers, json:
      request.postDataJSON().p_operations.map((operation: { op: string }) => ({ op: operation.op, status: 'applied' })) })
    if (path.endsWith('/rpc/sync_pull')) {
      await waitForFirstSync
      return route.fulfill({ headers, json: { changes: [], cursor: request.postDataJSON().p_cursor, more: false } })
    }
    if (path.includes('/rpc/')) return route.fulfill({ headers, json: { status: 'applied' } })
    return route.fulfill({ headers, json: [] })
  })
  return { calls, resetPassword: () => { current = session(true) } }
}

test('entra con usuario, conserva la sesión y reabre offline sin pedir contraseña', async ({ page, context }, info) => {
  await page.setViewportSize({ width: 320, height: 740 })
  const { calls } = await mockServer(page)
  await page.goto('/')
  await expect(page.getByLabel('Usuario', { exact: true })).toBeVisible()
  await page.screenshot({ path: info.outputPath('acceso-320.png'), scale: 'css', fullPage: true })
  await page.getByLabel('Usuario', { exact: true }).fill('Rocco')
  await page.getByLabel('Contraseña', { exact: true }).fill('mi-clave-segura')
  await page.getByRole('button', { name: 'Iniciar sesión' }).click()
  await page.getByLabel('Tu nombre').fill('Rocco')
  await page.getByRole('button', { name: /Dragón/ }).click()
  await page.getByRole('button', { name: 'Confirmar compañero' }).click()
  await expect(page.getByRole('heading', { name: 'Hola, Rocco' })).toBeVisible()
  expect(calls[0]).toMatchObject({ action: 'login', username: 'rocco' })
  expect(await page.evaluate(() => JSON.stringify(localStorage) + JSON.stringify(sessionStorage))).not.toContain('mi-clave-segura')
  await page.reload()
  await expect(page.getByRole('heading', { name: 'Hola, Rocco' })).toBeVisible()
  // Cached data is opened without issuing another login request.
  await page.waitForFunction(() => !!navigator.serviceWorker.controller)
  await context.setOffline(true)
  await page.reload()
  await expect(page.getByRole('heading', { name: 'Hola, Rocco' })).toBeVisible()
  expect(calls.filter(call => call.action === 'login')).toHaveLength(1)
})

test('muestra errores y permite registrarse sin invitación', async ({ page }) => {
  const firstSync = Promise.withResolvers<void>()
  const { calls } = await mockServer(page, false, firstSync.promise)
  await page.goto('/perfil')
  await page.getByLabel('Usuario', { exact: true }).fill('rocco')
  await page.getByLabel('Contraseña', { exact: true }).fill('incorrecta')
  await page.getByRole('button', { name: 'Iniciar sesión' }).click()
  await expect(page.getByRole('alert')).toHaveText('Usuario o contraseña incorrectos.')
  await page.getByRole('button', { name: 'Crear cuenta', exact: true }).click()
  await page.getByLabel('Usuario', { exact: true }).fill('rocco1')
  await page.getByRole('button', { name: 'Crear mi cuenta' }).click()
  await expect(page.getByRole('alert')).toContainText('entre 3 y 24 letras')
  await page.getByLabel('Usuario', { exact: true }).fill('rocco')
  await page.getByLabel('Contraseña', { exact: true }).fill('1234567')
  await page.getByRole('button', { name: 'Crear mi cuenta' }).click()
  await expect(page.getByRole('alert')).toContainText('al menos 8 caracteres')
  await page.getByLabel('Contraseña', { exact: true }).fill('12345678')
  await page.getByRole('button', { name: 'Mostrar contraseña', exact: true }).click()
  await expect(page.getByLabel('Contraseña', { exact: true })).toHaveAttribute('type', 'text')
  await page.getByRole('button', { name: 'Ocultar contraseña', exact: true }).click()
  await page.getByLabel('Repetir contraseña', { exact: true }).fill('12345679')
  await page.getByRole('button', { name: 'Mostrar repetir contraseña', exact: true }).click()
  await expect(page.getByLabel('Repetir contraseña', { exact: true })).toHaveAttribute('type', 'text')
  await page.getByRole('button', { name: 'Crear mi cuenta' }).click()
  await expect(page.getByRole('alert')).toContainText('deben coincidir')
  await page.getByLabel('Repetir contraseña', { exact: true }).fill('12345678')
  await expect(page.getByLabel('Código de invitación')).toHaveCount(0)
  await page.getByRole('button', { name: 'Crear mi cuenta' }).click()
  try {
    await expect(page.getByRole('status')).toHaveText('Abriendo tu cuenta…')
    await expect(page.getByRole('heading', { name: 'GymBeast' })).toBeVisible()
    await expect(page.getByRole('button', { name: 'Reintentar' })).toHaveCount(0)
    await expect(page).toHaveURL(/\/$/)
  } finally {
    firstSync.resolve()
  }
  await expect(page.getByLabel('Tu nombre')).toBeVisible()
  const registrations = calls.filter(call => call.action === 'register')
  expect(registrations).toHaveLength(1)
  expect(registrations[0]).not.toHaveProperty('invitation')
})

test('exige reemplazar la contraseña temporal antes de entrar', async ({ page }, info) => {
  const { calls } = await mockServer(page, true)
  await page.goto('/')
  await page.getByLabel('Usuario', { exact: true }).fill('rocco')
  await page.getByLabel('Contraseña', { exact: true }).fill('clave-temporal')
  await page.getByRole('button', { name: 'Iniciar sesión' }).click()
  await expect(page.getByRole('heading', { name: 'Elegí tu contraseña' })).toBeVisible()
  await expect(page.getByRole('navigation')).toHaveCount(0)
  await page.screenshot({ path: info.outputPath('recuperacion.png'), scale: 'css', fullPage: true })
  await page.getByLabel('Contraseña temporal').fill('clave-temporal')
  await page.getByLabel('Contraseña nueva', { exact: true }).fill('nueva-clave-segura')
  await page.getByLabel('Repetir contraseña nueva').fill('nueva-clave-segura')
  await page.getByRole('button', { name: 'Actualizar contraseña' }).click()
  await expect(page.getByLabel('Tu nombre')).toBeVisible()
  expect(calls.at(-1)).toMatchObject({ action: 'password', username: 'rocco', newPassword: 'nueva-clave-segura' })
})

test('permite cambiar la contraseña y cerrar sesión desde Perfil', async ({ page }) => {
  await mockServer(page)
  await page.goto('/')
  await page.getByLabel('Usuario', { exact: true }).fill('rocco')
  await page.getByLabel('Contraseña', { exact: true }).fill('mi-clave-segura')
  await page.getByRole('button', { name: 'Iniciar sesión' }).click()
  await page.getByLabel('Tu nombre').fill('Rocco')
  await page.getByRole('button', { name: /Dragón/ }).click()
  await page.getByRole('button', { name: 'Confirmar compañero' }).click()
  await page.getByRole('link', { name: 'Perfil', exact: true }).click()
  await page.getByRole('button', { name: 'Cambiar contraseña' }).click()
  await page.getByLabel('Contraseña actual').fill('mi-clave-segura')
  await page.getByLabel('Contraseña nueva', { exact: true }).fill('mi-nueva-clave')
  await page.getByLabel('Repetir contraseña nueva').fill('mi-nueva-clave')
  await page.getByRole('button', { name: 'Actualizar contraseña' }).click()
  await expect(page.getByRole('status').filter({ hasText: 'Contraseña actualizada.' })).toBeVisible()
  await page.getByRole('button', { name: 'Cerrar sesión' }).click()
  await expect(page.getByRole('button', { name: 'Iniciar sesión' })).toBeVisible()
})

test('separa los datos de dos cuentas en el mismo teléfono', async ({ page }) => {
  await mockServer(page)
  await page.goto('/')
  for (const [username, name] of [['rocco', 'Rocco'], ['gabi', 'Gabi']]) {
    await page.getByLabel('Usuario', { exact: true }).fill(username)
    await page.getByLabel('Contraseña', { exact: true }).fill('mi-clave-segura')
    await page.getByRole('button', { name: 'Iniciar sesión' }).click()
    await page.getByLabel('Tu nombre').fill(name)
    await page.getByRole('button', { name: /Dragón/ }).click()
    await page.getByRole('button', { name: 'Confirmar compañero' }).click()
    await expect(page.getByRole('heading', { name: 'Hola, ' + name })).toBeVisible()
    await page.getByRole('link', { name: 'Perfil', exact: true }).click()
    await page.getByRole('button', { name: 'Cerrar sesión' }).click()
  }
  await page.getByLabel('Usuario', { exact: true }).fill('rocco')
  await page.getByLabel('Contraseña', { exact: true }).fill('mi-clave-segura')
  await page.getByRole('button', { name: 'Iniciar sesión' }).click()
  await expect(page).toHaveURL(/\/$/)
  await expect(page.getByRole('heading', { name: 'Hola, Rocco' })).toBeVisible()
  await expect(page.getByRole('heading', { name: 'Hola, Gabi' })).toHaveCount(0)
})

test('detecta un restablecimiento administrativo al volver al primer plano', async ({ page }) => {
  const server = await mockServer(page)
  await page.goto('/')
  await page.getByLabel('Usuario', { exact: true }).fill('rocco')
  await page.getByLabel('Contraseña', { exact: true }).fill('mi-clave-segura')
  await page.getByRole('button', { name: 'Iniciar sesión' }).click()
  await expect(page.getByLabel('Tu nombre')).toBeVisible()
  server.resetPassword()
  await page.evaluate(() => window.dispatchEvent(new Event('focus')))
  await expect(page.getByRole('heading', { name: 'Elegí tu contraseña' })).toBeVisible()
  await page.getByRole('button', { name: 'Cerrar sesión' }).click()
  await expect(page.getByRole('button', { name: 'Iniciar sesión' })).toBeVisible()
})
