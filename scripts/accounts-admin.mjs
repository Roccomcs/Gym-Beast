import { createClient } from '@supabase/supabase-js'
import { randomBytes, createHash } from 'node:crypto'
import { readFile, writeFile, stat } from 'node:fs/promises'
import { createInterface } from 'node:readline/promises'

const [command, value = '', file, operationId] = process.argv.slice(2)
const commands = ['invite', 'revoke', 'reset', 'backup', 'restore', 'delete']
if (!commands.includes(command)) {
  console.log('Uso: npm run accounts:admin -- invite [cantidad] | revoke <código> | reset <usuario> | backup <usuario> <archivo> | restore <usuario> <archivo> [UUID] | delete <usuario>')
  process.exit(1)
}
const url = process.env.GYMBEAST_ADMIN_URL
const key = process.env.GYMBEAST_ADMIN_SECRET
if (!url || !key) {
  console.error('Configurá GYMBEAST_ADMIN_URL y GYMBEAST_ADMIN_SECRET en esta terminal. El secreto se usa solo para administrar cuentas.')
  process.exit(1)
}
const api = createClient(url, key, { auth: { persistSession: false, autoRefreshToken: false } })
const hash = code => createHash('sha256').update(code).digest('hex')
const check = result => { if (result.error) throw new Error(result.error.message); return result.data }
async function account() {
  const username = value.trim().toLowerCase()
  if (!/^[a-z0-9_]{3,24}$/.test(username)) throw new Error('Usuario inválido.')
  const result = check(await api.from('account_logins').select('owner').eq('handle', username).maybeSingle())
  if (!result) throw new Error('Usuario no encontrado.')
  return { ...result, username }
}
async function confirm(expected, message) {
  if (!process.stdin.isTTY) throw new Error('Esta operación requiere confirmación en una terminal interactiva.')
  const input = createInterface({ input: process.stdin, output: process.stdout })
  try {
    if (await input.question(message + '\nEscribí ' + expected + ' para confirmar: ') !== expected) throw new Error('Operación cancelada.')
  } finally { input.close() }
}

try {
  if (command === 'invite') {
    const count = Number(value || 1)
    if (!Number.isInteger(count) || count < 1 || count > 100) throw new Error('Elegí entre 1 y 100 invitaciones.')
    const codes = Array.from({ length: count }, () => randomBytes(32).toString('base64url'))
    check(await api.from('account_invitations').insert(codes.map(code => ({ code_hash: hash(code) }))))
    console.log('Invitaciones de un solo uso, válidas por siete días. Guardalas ahora.')
    for (const code of codes) console.log(code)
  }
  if (command === 'revoke') {
    if (!/^[A-Za-z0-9_-]{32,100}$/.test(value)) throw new Error('Código inválido.')
    const result = check(await api.from('account_invitations').update({ revoked_at: new Date().toISOString() })
      .eq('code_hash', hash(value)).is('consumed_at', null).select('code_hash'))
    console.log(result.length ? 'Invitación revocada.' : 'El código no existe o ya fue utilizado.')
  }
  if (command === 'reset') {
    const { owner, username } = await account()
    const { user } = check(await api.auth.admin.getUserById(owner))
    const password = randomBytes(18).toString('base64url')
    check(await api.auth.admin.updateUserById(owner, {
      password, app_metadata: { ...user.app_metadata, temporary_password_required: true },
    }))
    console.log('Acceso restablecido para @' + username + '. Compartí esta contraseña temporal por un canal privado.')
    console.log(password)
    console.log('Debe cambiarla para volver a usar sus datos. Cerrá esta terminal al terminar.')
  }
  if (command === 'backup') {
    if (!file) throw new Error('Indicá un archivo nuevo para el respaldo.')
    const { owner, username } = await account()
    const backup = check(await api.rpc('export_account_backup', { p_owner: owner }))
    if (!backup) throw new Error('No se encontró la cuenta.')
    await writeFile(file, JSON.stringify(backup, null, 2), { flag: 'wx', mode: 0o600 })
    console.log('Respaldo de @' + username + ' guardado en ' + file + '. Conservá el archivo en un lugar privado.')
  }
  if (command === 'restore') {
    if (!file || (await stat(file)).size > 50 * 1024 * 1024) throw new Error('Indicá un respaldo de hasta 50 MB.')
    const { owner, username } = await account()
    const backup = JSON.parse(await readFile(file, 'utf8'))
    if (backup.format !== 'gymbeast-account' || backup.version !== 1 || backup.payload?.owner !== owner) throw new Error('El respaldo no corresponde a esta cuenta.')
    const operation = operationId ?? crypto.randomUUID()
    if (!/^[0-9a-f]{8}-(?:[0-9a-f]{4}-){3}[0-9a-f]{12}$/i.test(operation)) throw new Error('UUID de restauración inválido.')
    await confirm(username, 'La restauración reemplazará los entrenamientos y el monedero de @' + username + '.')
    console.log('Operación de restauración: ' + operation + '. Reutilizá este UUID si se corta la respuesta.')
    check(await api.rpc('restore_account_backup', { p_owner: owner, p_operation: operation, p_backup: backup }))
    console.log('Restauración confirmada. Los dispositivos recibirán los cambios al sincronizar.')
  }
  if (command === 'delete') {
    const { owner, username } = await account()
    await confirm('ELIMINAR ' + username, 'Se eliminarán la cuenta, sus entrenamientos, compras y vínculos sociales. Guardá un respaldo antes si lo necesitás.')
    check(await api.auth.admin.deleteUser(owner))
    console.log('Cuenta eliminada.')
  }
} catch (error) {
  console.error(error instanceof Error ? error.message : 'No se pudo completar la operación.')
  process.exitCode = 1
}
