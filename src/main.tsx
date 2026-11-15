import { useEffect, useRef, useState, type FormEvent } from 'react'
import { createRoot } from 'react-dom/client'
import { BrowserRouter, NavLink, Route, Routes, useLocation, useNavigate, useSearchParams } from 'react-router-dom'
import { Activity, CalendarDays, Dumbbell, Flame, House, UserRound, BookOpen, Zap } from 'lucide-react'
import { useLiveQuery } from 'dexie-react-hooks'
import { registerSW } from 'virtual:pwa-register'
import { api, clearAccount, db, list, local, resolveConflict, retryOperation, save, sessionKey, sync } from './store'
import { dateKey, fromKg, toKg, weekDates, uid, type Profile, type Routine } from './domain'
import { Routines } from './routines'
import { Workout } from './workout'
import { Progress } from './progress'
import { Companion } from './companion'
import { Onboarding, ProgramLibrary, Train } from './journey'
import { Library } from './library'
import { RestoreBackup } from './backup'
import { PetShop, localRewards, stageFor } from './economy'
import '@fontsource/press-start-2p/latin-400.css'
import '@fontsource-variable/atkinson-hyperlegible-next'
import './style.css'

const update = registerSW({
  onNeedRefresh() {
    window.dispatchEvent(new Event('gymbeast-update'))
  },
})

const defaults: Profile = {
  name: '', theme: 'dark', unit: 'kg', weekStart: 1,
  timezone: Intl.DateTimeFormat().resolvedOptions().timeZone, companion: 'Dragón',
}

function Root() {
  const [owner, setOwner] = useState(() => localStorage.getItem(sessionKey) ?? '')
  const [ready, setReady] = useState(!api || !navigator.onLine)
  const [problem, setProblem] = useState('')
  const [recovery, setRecovery] = useState(false)
  useEffect(() => {
    if (!api) return
    const { data } = api.auth.onAuthStateChange((event, session) => {
      if (event === 'PASSWORD_RECOVERY') setRecovery(true)
      if (session) {
        localStorage.setItem(sessionKey, session.user.id)
        setOwner(session.user.id)
      } else if (event === 'SIGNED_OUT' || navigator.onLine) {
        setOwner(current => {
          if (current === local) return current
          localStorage.removeItem(sessionKey)
          return ''
        })
      }
      setReady(true)
    })
    return () => data.subscription.unsubscribe()
  }, [])
  const startLocal = () => { localStorage.setItem(sessionKey, local); setOwner(local) }
  if (!ready) return <main>Abriendo GymBeast…</main>
  if (recovery) return <main><h1>Nueva contraseña</h1><form onSubmit={async event => {
    event.preventDefault()
    const password = String(new FormData(event.currentTarget).get('password'))
    const result = await api?.auth.updateUser({ password })
    if (result?.error) setProblem(result.error.message)
    else { setRecovery(false); setProblem('') }
  }}><label>Contraseña nueva<input name="password" type="password" minLength={8} required /></label>
    <button>Guardar contraseña</button></form>{problem && <p role="alert">{problem}</p>}</main>
  if (!owner) return <main className="welcome">
    <Logo /><Companion name="Dragón" /><p className="eyebrow">TU DIARIO DE FUERZA</p>
    <h1>Cada repetición cuenta.</h1>
    <p>Planificá tu semana, registrá tus series y seguí tu progreso.</p>
    {api && <button onClick={async () => {
      if (!api) return
      const result = await api.auth.signInWithOAuth({ provider: 'google', options: { redirectTo: location.origin } })
      if (result.error) setProblem(result.error.message)
    }}>Continuar con Google</button>}
    {api && import.meta.env.VITE_ENABLE_EMAIL_AUTH === 'true' && <EmailForm />}
    <button className="secondary" onClick={startLocal}>Probar en este dispositivo</button>
    {problem && <p role="alert">{problem}</p>}
  </main>
  return <Dashboard key={owner} owner={owner} exit={async () => {
    if (owner !== local && api) {
      const { error } = await api.auth.signOut({ scope: 'local' })
      if (error) throw error
    }
    localStorage.removeItem(sessionKey)
    setOwner('')
  }} />
}

function EmailForm() {
  const [message, setMessage] = useState('')
  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (!api) return
    const fields = new FormData(event.currentTarget)
    const action = (event.nativeEvent as SubmitEvent).submitter?.getAttribute('value')
    const email = String(fields.get('email'))
    const password = String(fields.get('password'))
    if (action !== 'reset' && password.length < 8) {
      setMessage('Ingresá al menos 8 caracteres de contraseña.')
      return
    }
    const result = action === 'reset' ? await api.auth.resetPasswordForEmail(email, { redirectTo: location.origin })
      : action === 'register' ? await api.auth.signUp({ email, password, options: { emailRedirectTo: location.origin } })
      : await api.auth.signInWithPassword({ email, password })
    setMessage(result.error?.message ?? 'Si el flujo requiere verificación, revisá tu correo.')
  }
  return <form onSubmit={submit}>
    <label>Email<input type="email" name="email" required autoComplete="email" /></label>
    <label>Contraseña<input type="password" name="password" /></label>
    <div className="actions"><button value="login">Entrar</button><button value="register" className="secondary">Crear cuenta</button>
      <button value="reset" className="secondary">Recuperar</button></div>
    {message && <p role="status">{message}</p>}
  </form>
}

function Logo() {
  return <NavLink to="/" className="brand"><span><Zap size={20} fill="currentColor" /></span>Gym<span className="lime">Beast</span></NavLink>
}

function Dashboard({ owner, exit }: { owner: string; exit: () => Promise<void> }) {
  const navigate = useNavigate()
  const [params] = useSearchParams()
  const { pathname, hash } = useLocation()
  useEffect(() => { if (!hash) window.scrollTo(0, 0) }, [pathname, hash])
  const draft = useLiveQuery(async () => (await db.onboarding.get(owner)) ?? null, [owner])
  const profiles = useLiveQuery(() => list(owner, 'profile'), [owner])
  const profile = profiles?.[0]?.data ?? defaults
  const routines = useLiveQuery(() => list(owner, 'routine'), [owner], [])
  const starting = useRef(false)
  const sessions = useLiveQuery(() => list(owner, 'session'), [owner], [])
  const schedules = useLiveQuery(() => list(owner, 'schedule'), [owner], [])
  const sets = useLiveQuery(() => list(owner, 'set'), [owner], [])
  const operations = useLiveQuery(() => db.operations.where('owner').equals(owner).toArray(), [owner], [])
  const remoteRewards = useLiveQuery(() => db.rewards.where('owner').equals(owner).toArray(), [owner], [])
  const rewards = owner === local ? localRewards(sessions, sets) : remoteRewards
  const petXp = rewards.filter(reward => reward.companion === profile.companion).reduce((sum, reward) => sum + reward.xp, 0)
  const xp = rewards.reduce((total, reward) => total + reward.xp, 0)
  const [status, setStatus] = useState('')
  const [available, setAvailable] = useState(false)
  const date = dateKey(new Date(), profile.timezone)
  const today = schedules.filter(item => item.data.date === date && !item.data.skipped)
  const active = sessions.find(item => !item.data.ended)
  const completed = sessions.filter(item => item.data.ended).sort((a, b) => b.data.started - a.data.started)
  const cycle = profile.cycle
  const original = routines.find(item => item.id === cycle?.routineId)?.data
  const routine = original && cycle?.order ? {
    ...original, days: [...original.days].sort((a, b) => cycle.order!.indexOf(a.id) - cycle.order!.indexOf(b.id)),
  } : original
  const index = routine?.days.findIndex(day => !cycle?.skipped.includes(day.id) &&
    !completed.some(item => item.data.cycleId === cycle?.id && item.data.dayId === day.id && !item.data.incomplete)) ?? -1
  const nextDay = routine?.days[index]
  const week = weekDates(date, profile.weekStart)
  const weekCount = completed.filter(item => week.includes(item.data.date)).length
  const conflicts = operations.filter(item => item.conflict)
  useEffect(() => {
    document.documentElement.dataset.theme = profile.theme
  }, [profile.theme])
  useEffect(() => {
    const refresh = () => setAvailable(true)
    window.addEventListener('gymbeast-update', refresh)
    return () => window.removeEventListener('gymbeast-update', refresh)
  }, [])
  useEffect(() => {
    if (owner === local) return
    let timer: ReturnType<typeof setTimeout>
    const refresh = () => {
      clearTimeout(timer)
      timer = setTimeout(() => {
        if (!navigator.onLine) { setStatus('Sin conexión'); return }
        setStatus('Sincronizando')
        void sync(owner).then(() => setStatus('Sincronizado'), () => setStatus('Error de sincronización'))
      }, 150)
    }
    refresh()
    const retry = setInterval(refresh, 60000)
    const events = ['online', 'offline', 'focus', 'gymbeast-save']
    events.forEach(event => window.addEventListener(event, refresh))
    document.addEventListener('visibilitychange', refresh)
    return () => {
      clearInterval(retry)
      clearTimeout(timer)
      events.forEach(event => window.removeEventListener(event, refresh))
      document.removeEventListener('visibilitychange', refresh)
    }
  }, [owner, operations.length])
  async function start(scheduleId?: string) {
    if (active) { navigate('/sesion/' + active.id); return }
    if (starting.current) return
    const schedule = scheduleId ? schedules.find(item => item.id === scheduleId)?.data : undefined
    const day = scheduleId ? schedule : nextDay
    if (!day) return
    if (scheduleId && completed.some(item => item.data.scheduleId === scheduleId && !item.data.incomplete)) {
      setStatus('Este turno ya está completado.')
      return
    }
    starting.current = true
    try {
      const id = uid()
      await save(owner, 'session', id, {
        title: day.title, exercises: day.exercises, started: Date.now(), date: schedule?.date ?? date, scheduleId,
        cycleId: scheduleId ? undefined : cycle?.id, dayId: scheduleId ? undefined : nextDay?.id, companion: profile.companion,
      })
      navigate('/sesion/' + id)
    } catch { setStatus('No pudimos iniciar el entrenamiento.') }
    finally { starting.current = false }
  }
  async function activate(routine: Routine, existing?: string) {
    if (active && !confirm('¿Guardar la sesión actual como incompleta y cambiar de rutina?')) {
      navigate('/sesion/' + active.id)
      return
    }
    if (active) await save(owner, 'session', active.id, { ...active.data, ended: Date.now(), incomplete: true })
    const id = existing ?? uid()
    if (!existing) await save(owner, 'routine', id, routine)
    await save(owner, 'profile', 'self', { ...profile, cycle: { id: uid(), routineId: id, skipped: [] } })
    navigate('/entrenar')
  }
  function changeCycle(next: Profile['cycle']) {
    void save(owner, 'profile', 'self', { ...profile, cycle: next }).catch(() => setStatus('No pudimos actualizar el ciclo.'))
  }
  if (!profiles || draft === undefined) return <main>Abriendo tu perfil…</main>
  if (!profile.onboarded) return <main><Onboarding profile={draft?.profile ?? profile}
    checkpoint={next => { void db.onboarding.put({ owner, profile: next }).catch(() => undefined) }}
    save={async next => { await save(owner, 'profile', 'self', next); await db.onboarding.delete(owner); navigate('/') }} /></main>
  const editorProps = { owner, date, weekStart: profile.weekStart, unit: profile.unit, start }
  return <>
    <header><Logo /><span className="sync" role="status">{owner === local ? 'Modo local' : operations.length ? status + ' · ' + operations.length + ' pendientes' : status}</span></header>
    <main>
      {available && !active && <button className="secondary" onClick={() => void update(true)}>Actualizar GymBeast</button>}
      {operations.filter(item => item.rejected).map(item => <section key={item.op} className="panel">
        <h2>Un cambio requiere revisión</h2><p>{item.rejected}</p>
        <button className="secondary" onClick={() => void retryOperation(item)}>Reintentar cambio</button>
      </section>)}
      {conflicts.map(item => <section key={item.op} className="panel">
        <h2>Hay dos versiones de este registro</h2>
        <details><summary>Revisar ambas versiones</summary><p>En el servidor</p><pre>{JSON.stringify(item.conflict?.data, null, 2)}</pre>
          <p>En este dispositivo</p><pre>{JSON.stringify(item.data, null, 2)}</pre></details>
        <div className="actions"><button onClick={() => void resolveConflict(item, true)}>Conservar local</button>
          <button className="secondary" onClick={() => void resolveConflict(item, false)}>Usar servidor</button></div>
      </section>)}
      <Routes>
        <Route index element={<>
          <p className="eyebrow"><CalendarDays size={16} /> {new Date(date + 'T12:00:00Z').toLocaleDateString('es-AR', { dateStyle: 'full', timeZone: 'UTC' })}</p>
          <h1>{profile.name ? 'Hola, ' + profile.name : 'Tu entrenamiento'}</h1>
          <section className="panel hero"><div className="hero-icon"><Dumbbell size={30} /></div>
            <p className="eyebrow">{active ? 'EN CURSO' : 'PLAN DE HOY'}</p>
            <h2>{active?.data.title ?? nextDay?.title ?? today[0]?.data.title ?? 'Tu próximo entrenamiento'}</h2>
            {!active && !nextDay && !today.length && <p>Asigná una rutina al día de hoy para empezar.</p>}
            <button onClick={() => active ? navigate('/sesion/' + active.id) : nextDay ? void start() : today.length ? void start(today[0].id) : navigate('/entrenar')}>
              {active ? 'Continuar entrenamiento' : nextDay || today.length ? 'Empezar entrenamiento' : 'Preparar entrenamiento'}
            </button>
          </section>
          <section className="panel companion-card"><Companion name={profile.companion} stage={stageFor(petXp)} /><div><h2>{profile.companion}</h2>{<><p>Nivel {1 + Math.floor(xp / 100)} · {xp} XP</p><progress className="xp-meter" value={xp % 100} max={100} aria-label="Experiencia hacia el próximo nivel" /></>}<NavLink to="/mascotas">Ver compañero</NavLink></div></section>
          <div className="stats"><section className="panel"><Flame className="lime" /><p>Sesiones esta semana</p><strong>{weekCount}</strong></section>
            <section className="panel"><Activity className="lime" /><p>Sesiones totales</p><strong>{completed.length}</strong></section></div>
        </>} />
        <Route path="/entrenar" element={<Train routine={routine} index={index} active={active?.data.title}
          companion={profile.companion} stage={stageFor(petXp)} start={() => void start()}
          skip={() => { if (cycle && nextDay) changeCycle({ ...cycle, skipped: [...cycle.skipped, nextDay.id] }) }}
          delay={() => { if (cycle && nextDay && routine) changeCycle({ ...cycle, order: [...routine.days.filter(day => day.id !== nextDay.id).map(day => day.id), nextDay.id] }) }}
          repeat={() => { if (cycle) changeCycle({ id: uid(), routineId: cycle.routineId, skipped: [] }) }} />} />
        <Route path="/rutinas" element={<ProgramLibrary routines={routines} activate={activate} />} />
        <Route path="/editor/manual" element={<Routines key="manual" {...editorProps} mode="manual" editId={params.get('rutina') ?? undefined} />} />
        <Route path="/editor/importar" element={<Routines key="importar" {...editorProps} mode="importar" />} />
        <Route path="/calendario" element={<Routines key="calendar" {...editorProps} mode="calendar" />} />
        <Route path="/ejercicios" element={<Library />} />
        <Route path="/mascotas" element={<PetShop owner={owner} profile={profile} rewards={rewards} />} />
        <Route path="/sesion/:id" element={<Workout owner={owner} profile={profile} sessions={sessions} sets={sets} rewards={rewards} />} />
        <Route path="/progreso" element={<Progress sessions={completed} sets={sets} unit={profile.unit} today={date} weekStart={profile.weekStart} />} />
        <Route path="/amigos" element={<><h1>Amigos</h1><p>Las funciones sociales todavía no están disponibles.</p></>} />
        <Route path="/instalar" element={<Install />} />
        <Route path="/perfil" element={<><h1>Perfil</h1>
          <form className="panel" onSubmit={event => {
            event.preventDefault()
            const fields = new FormData(event.currentTarget)
            void save(owner, 'profile', 'self', {
              ...profile, name: String(fields.get('name')).trim(), unit: fields.get('unit') === 'lb' ? 'lb' : 'kg',
              weightKg: fields.get('weight') ? toKg(Number(fields.get('weight')), profile.unit) : undefined,
              theme: fields.get('theme') === 'light' ? 'light' : 'dark', weekStart: Number(fields.get('weekStart')),
            }).then(() => setStatus('Preferencias guardadas'))
          }} key={JSON.stringify(profile)}>
            <label>Nombre visible<input name="name" defaultValue={profile.name} maxLength={60} /></label>
            <label>Peso ({profile.unit})<input name="weight" type="number" min="1" step="any" defaultValue={profile.weightKg ? fromKg(profile.weightKg, profile.unit) : ''} /></label>
            <label>Unidad<select name="unit" defaultValue={profile.unit}><option>kg</option><option>lb</option></select></label>
            <label>Tema<select name="theme" defaultValue={profile.theme}><option value="dark">Oscuro</option><option value="light">Claro</option></select></label>
            <label>Inicio de semana<select name="weekStart" defaultValue={profile.weekStart}>
              {['Domingo','Lunes','Martes','Miércoles','Jueves','Viernes','Sábado'].map((day, index) => <option key={day} value={index}>{day}</option>)}</select></label>
            <button>Guardar preferencias</button>
          </form>
          <section className="panel actions"><NavLink to="/mascotas">Mascotas y tienda</NavLink>
            <NavLink to="/amigos">Amigos</NavLink><NavLink to="/instalar">Instalar GymBeast</NavLink>
            <details><summary>Privacidad</summary><p>Tu peso, tus rutinas y tu historial son privados.</p></details>
          </section>
          {owner === local && <RestoreBackup />}
          <section className="panel actions">
            <button className="secondary" onClick={async () => {
              const items = await db.items.where('owner').equals(owner).toArray()
              const url = URL.createObjectURL(new Blob([JSON.stringify({ version: 1, items }, null, 2)], { type: 'application/json' }))
              const link = document.createElement('a')
              link.href = url; link.download = 'gymbeast.json'; link.click()
              setTimeout(() => URL.revokeObjectURL(url), 1000)
            }}>Exportar datos</button>
            <button className="secondary" onClick={() => void exit().catch(() => setStatus('No se pudo cerrar sesión'))}>Salir</button>
            <button className="danger" onClick={async () => {
              if (!confirm('¿Eliminar permanentemente tus datos y salir?')) return
              if (owner !== local) {
                const result = await api?.rpc('delete_account')
                if (!result || result.error) { setStatus('No se pudo eliminar la cuenta'); return }
              }
              await clearAccount(owner)
              await exit()
            }}>Eliminar {owner === local ? 'datos locales' : 'cuenta'}</button>
          </section>
        </>} />
        <Route path="*" element={<p>Esta página no existe.</p>} />
      </Routes>
    </main>
    <nav aria-label="Navegación principal">
      <NavLink end to="/"><House />Inicio</NavLink><NavLink to="/entrenar"><Dumbbell />Entrenar</NavLink>
      <NavLink to="/rutinas"><BookOpen />Rutinas</NavLink><NavLink to="/progreso"><Activity />Progreso</NavLink>
      <NavLink to="/perfil"><UserRound />Perfil</NavLink>
    </nav>
  </>
}

type InstallEvent = Event & { prompt: () => Promise<unknown> }
let installPrompt: InstallEvent | undefined
window.addEventListener('beforeinstallprompt', event => {
  event.preventDefault()
  installPrompt = event as InstallEvent
  window.dispatchEvent(new Event('gymbeast-install'))
})
function Install() {
  const [prompt, setPrompt] = useState(installPrompt)
  useEffect(() => {
    const refresh = () => setPrompt(installPrompt)
    window.addEventListener('gymbeast-install', refresh)
    return () => window.removeEventListener('gymbeast-install', refresh)
  }, [])
  return <><h1>Instalar GymBeast</h1><section className="panel">
    {prompt && <button onClick={async () => { await prompt.prompt(); installPrompt = undefined; setPrompt(undefined) }}>Instalar</button>}
    <h2>iPhone</h2><p>Abrí GymBeast en Safari, tocá Compartir, elegí Agregar a inicio y confirmá.</p>
    <h2>Android</h2><p>Abrí el menú del navegador, elegí Instalar aplicación o Agregar a pantalla principal y confirmá.</p>
  </section></>
}

createRoot(document.getElementById('root')!).render(<BrowserRouter><Root /></BrowserRouter>)
