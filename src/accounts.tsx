import { useState, type FormEvent } from 'react'
import { Eye, EyeOff, LogOut, LockKeyhole } from 'lucide-react'
import { api } from './store'
import { normalizeUsername, registrationUsernameProblem, validPassword, passwordProblem } from '../supabase/functions/_shared/account-rules'

type Credentials = {
  action: 'login' | 'register' | 'password'; username: string; password: string;
  operation?: string; newPassword?: string;
}

async function authenticate(input: Credentials) {
  if (!api || !navigator.onLine) throw new Error('Conectate para entrar o cambiar la contraseña.')
  const { data, error } = await api.functions.invoke('accounts', { body: input })
  if (error) {
    let message = 'No pudimos conectar. Probá de nuevo.'
    if ('context' in error && error.context instanceof Response) {
      try { message = (await error.context.json()).error ?? message } catch { /* Keep the connection message. */ }
    }
    throw new Error(message)
  }
  if (!data?.session?.access_token || !data.session.refresh_token) throw new Error('No pudimos abrir la sesión. Volvé a entrar.')
  const result = await api.auth.setSession(data.session)
  if (result.error) throw new Error('No pudimos guardar la sesión. Volvé a entrar.')
}

function PasswordField({ label, name, autoComplete, disabled }: {
  label: string; name: string; autoComplete: string; disabled: boolean
}) {
  const [visible, setVisible] = useState(false)
  return <label>{label}<span className="account-password">
    <input name={name} type={visible ? 'text' : 'password'} placeholder="••••••••••" required
      maxLength={128} autoComplete={autoComplete} disabled={disabled}/>
    <button type="button" className="secondary" aria-label={(visible ? 'Ocultar ' : 'Mostrar ') + label.toLowerCase()}
      onClick={() => setVisible(!visible)}>{visible ? <EyeOff size={18} aria-hidden="true"/> : <Eye size={18} aria-hidden="true"/>}</button>
  </span></label>
}

export function AccountForm() {
  const [register, setRegister] = useState(false)
  const [busy, setBusy] = useState(false)
  const [message, setMessage] = useState('')
  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (busy) return
    const fields = new FormData(event.currentTarget)
    const username = normalizeUsername(String(fields.get('username')))
    const password = String(fields.get('password'))
    if (register) {
      const problem = registrationUsernameProblem(username) || passwordProblem(password)
        || (password !== fields.get('confirm-password') ? 'Las contraseñas deben coincidir.' : '')
      if (problem) { setMessage(problem); return }
    }
    setBusy(true); setMessage('')
    try {
      const key = 'gymbeast-registration-' + username
      const operation = sessionStorage.getItem(key) ?? crypto.randomUUID()
      if (register) sessionStorage.setItem(key, operation)
      await authenticate({ action: register ? 'register' : 'login', username, password,
        operation: register ? operation : undefined,
      })
      sessionStorage.removeItem(key)
    } catch (error) { setMessage(error instanceof Error ? error.message : 'No pudimos entrar.') }
    finally { setBusy(false) }
  }
  return <section className="panel account-access">
    <div className="tabs" role="group" aria-label="Acceso a GymBeast">
      <button type="button" className={register ? 'secondary' : undefined} aria-pressed={!register}
        disabled={busy} onClick={() => { setRegister(false); setMessage('') }}>Entrar</button>
      <button type="button" className={register ? undefined : 'secondary'} aria-pressed={register}
        disabled={busy} onClick={() => { setRegister(true); setMessage('') }}>Crear cuenta</button>
    </div>
    <form key={String(register)} onSubmit={submit} noValidate={register}>
      <label>Usuario<input name="username" placeholder="Tu usuario" required minLength={3} maxLength={24} pattern="[a-zA-Z0-9_]{3,24}"
        autoComplete="username" autoCapitalize="none" autoCorrect="off" spellCheck={false} disabled={busy}/></label>
      <PasswordField label="Contraseña" name="password" autoComplete={register ? 'new-password' : 'current-password'} disabled={busy}/>
      {register && <PasswordField label="Repetir contraseña" name="confirm-password" autoComplete="new-password" disabled={busy}/>}
      <button disabled={busy || !api}>{busy ? 'Un momento…' : register ? 'Crear mi cuenta' : 'Iniciar sesión'}</button>
      {message && <p className="account-error" role="alert">{message}</p>}
    </form>
  </section>
}

export function PasswordForm({ username, forced = false, onExit }: { username: string; forced?: boolean; onExit?: () => Promise<void> }) {
  const [busy, setBusy] = useState(false)
  const [message, setMessage] = useState('')
  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (busy) return
    const form = event.currentTarget
    const fields = new FormData(form)
    const next = String(fields.get('new-password'))
    if (!validPassword(next) || next !== fields.get('confirm-password')) {
      setMessage(passwordProblem(next) || 'Las contraseñas nuevas deben coincidir.'); return
    }
    setBusy(true); setMessage('')
    try {
      await authenticate({ action: 'password', username, password: String(fields.get('current-password')), newPassword: next })
      form.reset(); setMessage('Contraseña actualizada.')
    } catch (error) { setMessage(error instanceof Error ? error.message : 'No pudimos cambiar la contraseña.') }
    finally { setBusy(false) }
  }
  return <form className="panel account-password" onSubmit={submit}>
    <h2>{forced ? 'Elegí tu contraseña' : 'Cambiar contraseña'}</h2>
    <p>@{username}</p>
    {forced && <p>Tu acceso fue restablecido. Cambiá la contraseña temporal para continuar.</p>}
    <input className="sr-only" aria-label="Usuario de la cuenta" readOnly value={username} autoComplete="username"/>
    <label>{forced ? 'Contraseña temporal' : 'Contraseña actual'}<input name="current-password" type="password" required maxLength={128} autoComplete="current-password" disabled={busy}/></label>
    <label>Contraseña nueva<input name="new-password" type="password" required minLength={8} maxLength={128} autoComplete="new-password" disabled={busy}/></label>
    <label>Repetir contraseña nueva<input name="confirm-password" type="password" required minLength={8} maxLength={128} autoComplete="new-password" disabled={busy}/></label>
    <button disabled={busy}>{busy ? 'Guardando…' : 'Actualizar contraseña'}</button>
    {onExit && <button type="button" className="secondary" disabled={busy} onClick={async () => {
      setBusy(true); setMessage('')
      try { await onExit() } catch { setMessage('No pudimos cerrar la sesión. Probá de nuevo.') }
      finally { setBusy(false) }
    }}>Cerrar sesión</button>}
    {message && <p role="status">{message}</p>}
  </form>
}

export function AccountSettings({ exit, localMode = false }: { exit: () => Promise<void>; localMode?: boolean }) {
  const [message, setMessage] = useState('')
  const [busy, setBusy] = useState(false)
  const [open, setOpen] = useState(false)
  const [username, setUsername] = useState('')
  return <section className="panel">
    {!localMode && <h2>Tu cuenta</h2>}
    <div className="actions">
      {!localMode && <button className="secondary" disabled={busy} onClick={async () => {
        const { data } = await api!.auth.getSession()
        setUsername(data.session?.user.app_metadata.gymbeast_registration?.handle ?? '')
        setOpen(!open)
      }}><LockKeyhole size={17}/> Cambiar contraseña</button>}
      <button className="secondary" disabled={busy} onClick={async () => {
        setBusy(true); setMessage('')
        try { await exit() } catch { setMessage('No pudimos cerrar la sesión. Probá de nuevo.') }
        finally { setBusy(false) }
      }}><LogOut size={17}/> Cerrar sesión</button>
    </div>
    {open && (username ? <PasswordForm username={username}/> : <p>Pedile al administrador que habilite tu acceso por usuario.</p>)}
    {message && <p role="alert">{message}</p>}
  </section>
}
