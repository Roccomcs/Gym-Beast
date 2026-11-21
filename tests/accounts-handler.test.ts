import { beforeEach, expect, it, vi } from 'vitest'
import { accountHandler, type AccountBackend } from '../supabase/functions/_shared/account-handler'
import { accountEmail, validPassword } from '../supabase/functions/_shared/account-rules'

const tokens = { access_token: 'test-access', refresh_token: 'test-refresh' }
let backend: AccountBackend
const operation = '00000000-0000-0000-0000-000000000001'
beforeEach(() => {
  backend = {
    allowAttempt: vi.fn().mockResolvedValue(true), register: vi.fn().mockResolvedValue(true),
    matchesRegistration: vi.fn().mockResolvedValue(false),
    signIn: vi.fn().mockResolvedValue({ user: { id: 'person', app_metadata: {} }, tokens }),
    changePassword: vi.fn().mockResolvedValue(true),
  }
})
function request(input: object, origin = 'https://gymbeast.test') {
  return accountHandler(backend, ['https://gymbeast.test'])(new Request('https://server.test/accounts', {
    method: 'POST', headers: { origin, 'Content-Type': 'application/json' }, body: JSON.stringify(input),
  }))
}
const credentials = { username: ' Rocco ', password: 'mi-clave-segura', operation }

it('normaliza el usuario y crea sin invitación', async () => {
  const response = await request({ ...credentials, action: 'register' })
  expect(response.status).toBe(200)
  expect(await response.json()).toEqual({ session: tokens })
  expect(backend.register).toHaveBeenCalledWith({ email: accountEmail('rocco'), password: credentials.password,
    handle: 'rocco', operation })
})
it('recupera el mismo registro después de perder una respuesta', async () => {
  vi.mocked(backend.register).mockResolvedValue(false)
  vi.mocked(backend.matchesRegistration).mockResolvedValue(true)
  expect((await request({ ...credentials, action: 'register' })).status).toBe(200)
  expect(backend.matchesRegistration).toHaveBeenCalledWith('rocco', operation)
})
it('rechaza un usuario ocupado', async () => {
  vi.mocked(backend.register).mockResolvedValue(false)
  expect((await request({ ...credentials, action: 'register' })).status).toBe(409)
  expect(backend.signIn).not.toHaveBeenCalled()
})
it.each(['1234567', 'x'.repeat(129)])('valida la contraseña de alta %s', async password => {
  expect((await request({ ...credentials, password, action: 'register' })).status).toBe(400)
  expect(backend.register).not.toHaveBeenCalled()
})
it('rechaza acceso incorrecto con mensaje uniforme', async () => {
  vi.mocked(backend.signIn).mockResolvedValue(null)
  const response = await request({ ...credentials, action: 'login' })
  expect(response.status).toBe(401)
  expect(await response.json()).toEqual({ error: 'Usuario o contraseña incorrectos.' })
})
it('cambia la contraseña solo después de verificar la actual y devuelve sesión nueva', async () => {
  const response = await request({ ...credentials, action: 'password', newPassword: 'una-clave-distinta' })
  expect(response.status).toBe(200)
  expect(backend.changePassword).toHaveBeenCalledWith({ id: 'person', app_metadata: {} }, 'una-clave-distinta')
  expect(backend.signIn).toHaveBeenLastCalledWith(accountEmail('rocco'), 'una-clave-distinta')
})
it('no cambia la contraseña con credenciales inválidas', async () => {
  vi.mocked(backend.signIn).mockResolvedValue(null)
  expect((await request({ ...credentials, action: 'password', newPassword: 'una-clave-distinta' })).status).toBe(401)
  expect(backend.changePassword).not.toHaveBeenCalled()
})
it('permite reingresar cuando la contraseña cambió y se perdió la sesión de respuesta', async () => {
  vi.mocked(backend.signIn).mockResolvedValueOnce({ user: { id: 'person', app_metadata: {} }, tokens }).mockResolvedValueOnce(null)
  const response = await request({ ...credentials, action: 'password', newPassword: 'una-clave-distinta' })
  expect(response.status).toBe(503)
  expect(await response.json()).toEqual({ error: 'La contraseña cambió. Volvé a entrar con la nueva contraseña.' })
})
it('limita intentos sin verificar la contraseña', async () => {
  vi.mocked(backend.allowAttempt).mockResolvedValue(false)
  expect((await request({ ...credentials, action: 'login' })).status).toBe(429)
  expect(backend.signIn).not.toHaveBeenCalled()
})
it('restringe CORS al sitio configurado', async () => {
  expect((await request({ ...credentials, action: 'login' }, 'https://otro.test')).status).toBe(403)
  expect(backend.signIn).not.toHaveBeenCalled()
})
it('oculta los errores internos', async () => {
  vi.mocked(backend.register).mockRejectedValue(new Error('private server detail'))
  const response = await request({ ...credentials, action: 'register' })
  expect(response.status).toBe(503)
  expect(await response.text()).not.toContain('private server detail')
})

it('valida caracteres Unicode y el límite de bcrypt sin truncar la contraseña', () => {
  expect(validPassword('🐉'.repeat(7))).toBe(false)
  expect(validPassword('🐉'.repeat(18))).toBe(true)
  expect(validPassword('🐉'.repeat(19))).toBe(false)
  expect(validPassword('a'.repeat(72))).toBe(true)
  expect(validPassword('a'.repeat(73))).toBe(false)
})
