import { accountEmail, normalizeUsername, usernamePattern, registrationUsernameProblem, validPassword, passwordProblem, type AccountTokens } from './account-rules.ts'

type Identity = { id: string; app_metadata: Record<string, unknown> }
export type AccountBackend = {
  allowAttempt: (bucket: string) => Promise<boolean>
  register: (input: { email: string; password: string; handle: string; operation: string }) => Promise<boolean | 'weak_password'>
  matchesRegistration: (handle: string, operation: string) => Promise<boolean>
  signIn: (email: string, password: string) => Promise<{ user: Identity; tokens: AccountTokens } | null>
  changePassword: (user: Identity, password: string) => Promise<boolean>
}

export async function sha256(value: string) {
  const bytes = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(value))
  return Array.from(new Uint8Array(bytes), byte => byte.toString(16).padStart(2, '0')).join('')
}

export function accountHandler(backend: AccountBackend, origins: string[]) {
  return async (request: Request): Promise<Response> => {
    const origin = request.headers.get('origin')
    const headers: Record<string, string> = {
      'Content-Type': 'application/json', 'Cache-Control': 'no-store', Vary: 'Origin',
      'Access-Control-Allow-Headers': 'authorization, apikey, content-type, x-client-info',
      'Access-Control-Allow-Methods': 'POST, OPTIONS',
    }
    if (origin && origins.includes(origin)) headers['Access-Control-Allow-Origin'] = origin
    const reply = (status: number, data: object) => new Response(JSON.stringify(data), { status, headers })
    if (origin && !origins.includes(origin)) return reply(403, { error: 'Origen no permitido.' })
    if (request.method === 'OPTIONS') return new Response(null, { status: 204, headers })
    if (request.method !== 'POST') return reply(405, { error: 'Método no permitido.' })
    try {
      const text = await request.text()
      if (text.length > 8192) return reply(413, { error: 'La solicitud es demasiado larga.' })
      let input: Record<string, unknown>
      try { input = JSON.parse(text) } catch { return reply(400, { error: 'Solicitud inválida.' }) }
      if (!input || Array.isArray(input) || typeof input !== 'object') return reply(400, { error: 'Solicitud inválida.' })
      const handle = normalizeUsername(typeof input.username === 'string' ? input.username : '')
      const password = typeof input.password === 'string' ? input.password : ''
      if (input.action === 'register') {
        const problem = registrationUsernameProblem(handle) || passwordProblem(password)
        if (problem) return reply(400, { error: problem })
      }
      if (!usernamePattern.test(handle) || !password || password.length > 128) {
        return reply(400, { error: 'Revisá el usuario y la contraseña.' })
      }
      if (!['login', 'register', 'password'].includes(String(input.action))) return reply(400, { error: 'Acción inválida.' })
      if (!await backend.allowAttempt(await sha256(handle))) {
        return reply(429, { error: 'Hubo muchos intentos. Probá de nuevo en 15 minutos.' })
      }
      const email = accountEmail(handle)
      if (input.action === 'register') {
        const operation = typeof input.operation === 'string' ? input.operation : ''
        if (!/^[0-9a-f]{8}-(?:[0-9a-f]{4}-){3}[0-9a-f]{12}$/i.test(operation)) {
          return reply(400, { error: 'Volvé a intentar crear la cuenta.' })
        }
        const created = await backend.register({ email, password, handle, operation })
        if (created === 'weak_password') return reply(400, { error: 'Elegí una contraseña más segura.' })
        if (!created && !await backend.matchesRegistration(handle, operation)) {
          return reply(409, { error: 'Ese usuario ya está ocupado. Elegí otro.' })
        }
      }
      const signedIn = await backend.signIn(email, password)
      if (!signedIn) return reply(401, { error: 'Usuario o contraseña incorrectos.' })
      if (input.action === 'password') {
        const next = typeof input.newPassword === 'string' ? input.newPassword : ''
        if (!validPassword(next)) return reply(400, { error: passwordProblem(next) })
        if (next === password) return reply(400, { error: 'Elegí una contraseña distinta de la actual.' })
        if (!await backend.changePassword(signedIn.user, next)) return reply(503, { error: 'No pudimos cambiar la contraseña. Probá de nuevo.' })
        const updated = await backend.signIn(email, next)
        if (!updated) return reply(503, { error: 'La contraseña cambió. Volvé a entrar con la nueva contraseña.' })
        return reply(200, { session: updated.tokens })
      }
      return reply(200, { session: signedIn.tokens })
    } catch {
      return reply(503, { error: 'El servicio de cuentas no está disponible en este momento. Probá de nuevo.' })
    }
  }
}
