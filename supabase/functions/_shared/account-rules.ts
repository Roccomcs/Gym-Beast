export const usernamePattern = /^[a-z0-9_]{3,24}$/
export const normalizeUsername = (value: string) => value.trim().toLowerCase()
export const accountEmail = (handle: string) => 'u.' + handle + '@accounts.gymbeast.invalid'
export const passwordProblem = (value: string) => Array.from(value).length < 10
  ? 'Usá una contraseña de al menos 10 caracteres.'
  : new TextEncoder().encode(value).length > 72
    ? 'La contraseña es demasiado larga. Probá una más corta.' : ''
export const validPassword = (value: string) => !passwordProblem(value)

export type AccountTokens = { access_token: string; refresh_token: string }
