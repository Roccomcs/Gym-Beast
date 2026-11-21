export const usernamePattern = /^[a-z0-9_]{3,24}$/
export const registrationUsernameProblem = (handle: string) => /^[a-z]{3,24}$/.test(handle)
  ? '' : 'El usuario debe tener entre 3 y 24 letras, sin números ni símbolos.'
export const normalizeUsername = (value: string) => value.trim().toLowerCase()
export const accountEmail = (handle: string) => 'u.' + handle + '@accounts.gymbeast.invalid'
export const passwordProblem = (value: string) => Array.from(value).length < 8
  ? 'Usá una contraseña de al menos 8 caracteres.'
  : new TextEncoder().encode(value).length > 72
    ? 'La contraseña es demasiado larga. Probá una más corta.' : ''
export const validPassword = (value: string) => !passwordProblem(value)

export type AccountTokens = { access_token: string; refresh_token: string }
