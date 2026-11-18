import { useEffect, useMemo, useRef, useState } from 'react'
import { createRoot } from 'react-dom/client'
import { BrowserRouter, NavLink, Route, Routes, useLocation, useNavigate, useSearchParams } from 'react-router-dom'
import { Activity, CalendarDays, Dumbbell, House, UserRound, BookOpen, ShoppingBag } from 'lucide-react'
import { useLiveQuery } from 'dexie-react-hooks'
import { registerSW } from 'virtual:pwa-register'
import { api, clearAccount, db, list, local, save, sessionKey, sync } from './store'
import { dateKey, weekDates, uid, type Profile, type Routine } from './domain'
import { initialVitals, petProgress } from './pet-progress'
import { Routines } from './routines'
import { Workout } from './workout'
import { Progress } from './progress'
import { Companion } from './companion'
import { Habitat } from './habitat'
import { outfitFor } from './shop-catalog'
import { Onboarding, ProgramLibrary, Train, CreateRoutine } from './journey'
import { Library } from './library'
import { Friends } from './friends'
import { ProfileSettings } from './profile-settings'
import { SyncIssue } from './sync-issues'
import { AccountForm, AccountSettings, PasswordForm } from './accounts'
import { PetShop, LocalPetTools, localRewards } from './economy'
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
  const [passwordUser, setPasswordUser] = useState('')
  useEffect(() => {
    if (!api || !owner || owner === local) return
    let live = true
    const verify = () => {
      if (!navigator.onLine) return
      void api!.auth.getUser().then(async ({ data, error }) => {
        if (!live) return
        if (error?.code === 'user_not_found') {
          await clearAccount(owner)
          if (!live) return
          await api!.auth.signOut({ scope: 'local' })
          localStorage.removeItem(sessionKey)
          setOwner(''); setPasswordUser('')
          return
        }
        if (data.user) setPasswordUser(data.user.app_metadata.temporary_password_required
          ? data.user.app_metadata.gymbeast_registration?.handle ?? '' : '')
      }).catch(() => undefined)
    }
    verify()
    window.addEventListener('focus', verify)
    window.addEventListener('online', verify)
    return () => {
      live = false
      window.removeEventListener('focus', verify)
      window.removeEventListener('online', verify)
    }
  }, [owner])
  useEffect(() => {
    if (!api) return
    const { data } = api.auth.onAuthStateChange((event, session) => {
      if (session) {
        setPasswordUser(session.user.app_metadata.temporary_password_required
          ? session.user.app_metadata.gymbeast_registration?.handle ?? '' : '')
        localStorage.setItem(sessionKey, session.user.id)
        setOwner(session.user.id)
      } else if (event === 'SIGNED_OUT' || navigator.onLine) {
        setPasswordUser('')
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
  const exit = async () => {
    if (owner !== local && api) {
      const { error } = await api.auth.signOut({ scope: 'local' })
      if (error) throw error
    }
    localStorage.removeItem(sessionKey)
    setPasswordUser('')
    setOwner('')
  }
  if (!ready) return <main>Abriendo GymBeast…</main>
  if (passwordUser && owner !== local) return <main><PasswordForm username={passwordUser} forced onExit={exit}/></main>
  if (!owner) return <main className="welcome">
    <Logo /><Companion name="Dragón" /><p className="eyebrow">TU DIARIO DE FUERZA</p>
    <h1>Cada repetición cuenta.</h1>
    <p>Planificá tu semana, registrá tus series y seguí tu progreso.</p>
    <AccountForm />
    <button className="secondary" onClick={startLocal}>Probar en este dispositivo</button>
  </main>
  return <Dashboard key={owner} owner={owner} exit={exit} />
}

function Logo() {
  return <NavLink to="/" className="brand"><img className="brand-mark" src="/icon.svg" alt=""/>Gym<span className="lime">Beast</span></NavLink>
}

function Dashboard({ owner, exit }: { owner: string; exit: () => Promise<void> }) {
  const navigate = useNavigate()
  const [params] = useSearchParams()
  const { pathname, hash } = useLocation()
  useEffect(() => { if (!hash) window.scrollTo(0, 0) }, [pathname, hash])
  const draft = useLiveQuery(async () => (await db.onboarding.get(owner)) ?? null, [owner])
  const profiles = useLiveQuery(() => list(owner, 'profile'), [owner])
  const syncState = useLiveQuery(() => db.syncState.get(owner), [owner])
  const profile = profiles?.[0]?.data ?? defaults
  const routines = useLiveQuery(() => list(owner, 'routine'), [owner], [])
  const starting = useRef(false)
  const sessions = useLiveQuery(() => list(owner, 'session'), [owner], [])
  const schedules = useLiveQuery(() => list(owner, 'schedule'), [owner], [])
  const sets = useLiveQuery(() => list(owner, 'set'), [owner], [])
  const operations = useLiveQuery(() => db.operations.where('owner').equals(owner).toArray(), [owner], [])
  const remoteRewards = useLiveQuery(() => db.rewards.where('owner').equals(owner).toArray(), [owner], [])
  const rewards = useMemo(() => owner === local ? localRewards(sessions, sets) : remoteRewards, [owner, sessions, sets, remoteRewards])
  const [status, setStatus] = useState('')
  const [available, setAvailable] = useState(false)
  const [, refreshClock] = useState(0)
  const now = new Date()
  useEffect(() => {
    const refresh = () => refreshClock(tick => tick + 1)
    const interval = window.setInterval(refresh, 30000)
    window.addEventListener('focus', refresh)
    document.addEventListener('visibilitychange', refresh)
    return () => {
      window.clearInterval(interval)
      window.removeEventListener('focus', refresh)
      document.removeEventListener('visibilitychange', refresh)
    }
  }, [])
  const date = dateKey(now, profile.timezone)
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
  const week = weekDates(date, 1)
  const eligibleSessions = completed.filter(item => !item.data.incomplete)
  const weekCount = eligibleSessions.filter(item => week.includes(item.data.date)).length
  const completedToday = eligibleSessions.find(item => dateKey(new Date(item.data.ended!), profile.timezone) === date)
  const target = routine?.days.length ?? 0
  const petPlans = useMemo(() => profile.petPlans ?? (cycle?.startedOn && target
    ? [{ from: cycle.startedOn, target, companion: profile.companion }] : []),
  [profile.petPlans, cycle?.startedOn, target, profile.companion])
  const pets = useMemo(() => petProgress(date, profile.timezone, profile.companion, petPlans, sessions, schedules, rewards),
    [date, profile.timezone, profile.companion, petPlans, sessions, schedules, rewards])
  const { xp: petXp, health } = pets.get(profile.companion) ?? initialVitals
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
        cycleId: scheduleId ? undefined : cycle?.id, dayId: scheduleId ? undefined : nextDay?.id, routineId: scheduleId ? undefined : cycle?.routineId, routineVersion: scheduleId ? undefined : routine?.version, weeklyTarget: routine?.days.length, companion: profile.companion,
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
    await save(owner, 'profile', 'self', { ...profile,
      cycle: { id: uid(), routineId: id, skipped: [], startedOn: date },
      petPlans: [...petPlans.filter(plan => plan.from !== date), { from: date, target: routine.days.length, companion: profile.companion }],
    })
    navigate('/entrenar')
  }
  function changeCycle(next: Profile['cycle']) {
    void save(owner, 'profile', 'self', { ...profile, cycle: next }).catch(() => setStatus('No pudimos actualizar el ciclo.'))
  }
  if (!profiles || draft === undefined) return <main>Abriendo tu perfil…</main>
  if (owner !== local && !syncState?.initialized && (!profiles.length || (syncState?.cursor ?? 0) > 0)) {
    return <main><h1>Recuperando tus datos</h1>
      <p role="status">{status || 'Estamos abriendo tu cuenta.'}</p>
      <p>Para abrir esta cuenta por primera vez necesitás conexión.</p>
      <button className="secondary" onClick={() => void sync(owner).catch(() => setStatus('No pudimos conectar. Probá de nuevo.'))}>Reintentar</button>
      <button className="secondary" onClick={() => void exit().catch(() => setStatus('No pudimos cerrar la sesión.'))}>Cerrar sesión</button>
    </main>
  }
  if (!profile.onboarded) return <main><Onboarding profile={draft?.profile ?? profile}
    checkpoint={next => { void db.onboarding.put({ owner, profile: next }).catch(() => undefined) }}
    save={async next => { await save(owner, 'profile', 'self', next); await db.onboarding.delete(owner); navigate('/') }} /></main>
  const editorProps = { owner, date, weekStart: 1, unit: profile.unit, start }
  return <>
    <main>
      {available && !active && <button className="secondary" onClick={() => void update(true)}>Actualizar GymBeast</button>}
      {operations.filter(item => item.rejected || item.conflict).map(item => <SyncIssue key={item.op} operation={item}/>)}
      <div className="route-enter" key={pathname}><Routes>
        <Route index element={<>
          <p className="eyebrow"><CalendarDays size={16} /> {new Date(date + 'T12:00:00Z').toLocaleDateString('es-AR', { dateStyle: 'full', timeZone: 'UTC' })}</p>
          <h1>{profile.name ? 'Hola, ' + profile.name : 'Tu entrenamiento'}</h1>
          <Habitat name={profile.companion} xp={petXp} health={health} outfit={outfitFor(profile, profile.companion)}/>
          {completedToday && !active ? <section className="panel hero">
            <h2>¡Felicitaciones! Ya entrenaste hoy</h2>
            <p>Completaste {completedToday.data.title}.</p>
          </section> : <section className="panel hero"><div className="hero-icon"><Dumbbell size={30} /></div>
            <p className="eyebrow">{active ? 'EN CURSO' : 'PLAN DE HOY'}</p>
            <h2>{active?.data.title ?? nextDay?.title ?? today[0]?.data.title ?? 'Tu próximo entrenamiento'}</h2>
            {!active && !nextDay && !today.length && <p>Asigná una rutina al día de hoy para empezar.</p>}
            <button onClick={() => active ? navigate('/sesion/' + active.id) : nextDay ? void start() : today.length ? void start(today[0].id) : navigate('/entrenar')}>
              {active ? 'Continuar entrenamiento' : nextDay || today.length ? 'Empezar entrenamiento' : 'Preparar entrenamiento'}
            </button>
          </section>}
          <div className="stats"><section className="panel"><p>Sesiones esta semana</p><strong>{weekCount}</strong></section>
            <section className="panel"><p>Sesiones totales</p><strong>{completed.length}</strong></section></div>
        </>} />
        <Route path="/entrenar" element={<Train routine={routine} index={index} active={active?.data.title}
          companion={profile.companion} xp={petXp} start={() => void start()}
          repeat={() => { if (cycle) changeCycle({ id: uid(), routineId: cycle.routineId, skipped: [], startedOn: date }) }} />} />
        <Route path="/rutinas" element={<ProgramLibrary routines={routines} activate={activate} updateCover={(id, routine) => save(owner, 'routine', id, routine)} />} />
        <Route path="/editor" element={<CreateRoutine/>} />
        <Route path="/editor/manual" element={<Routines key="manual" {...editorProps} mode="manual" editId={params.get('rutina') ?? undefined} />} />
        <Route path="/editor/importar" element={<Routines key="importar" {...editorProps} mode="importar" />} />
        <Route path="/calendario" element={<Routines key="calendar" {...editorProps} mode="calendar" />} />
        <Route path="/ejercicios" element={<Library />} />
        <Route path="/mascotas" element={<PetShop owner={owner} profile={profile} rewards={rewards} pets={pets} petPlans={petPlans} date={date} target={target} />} />
        <Route path="/tienda" element={<PetShop owner={owner} profile={profile} rewards={rewards} pets={pets} petPlans={petPlans} date={date} target={target} />} />
        <Route path="/sesion/:id" element={<Workout owner={owner} profile={profile} sessions={sessions} sets={sets} rewards={rewards} pets={pets} />} />
        <Route path="/progreso" element={<Progress sessions={completed} sets={sets} unit={profile.unit} today={date} weekStart={1} goal={routine?.days.length || 0} schedules={schedules} rewards={rewards} />} />
        <Route path="/amigos" element={<Friends owner={owner} sessions={completed.filter(item => rewards.some(reward => reward.session_id === item.id && reward.occurrence))
          .slice(0, 15).map(item => ({ id: item.id, title: item.data.title + ' · ' + item.data.date }))}/>} />
        <Route path="/instalar" element={<Install />} />
        <Route path="/perfil" element={<><h1>Perfil</h1>
          <Logo /><span className="sync" role="status">{owner === local ? 'Modo local' : operations.length ? status + ' · ' + operations.length + ' pendientes' : status}</span>
          <section className="panel profile-banner"><div><p className="eyebrow">TU EQUIPO</p><h2>{profile.name || 'Atleta'}</h2>
            <p>{profile.companion} · {petXp} EXP de compañero</p><NavLink className="profile-shop-link" to="/tienda"><ShoppingBag size={17}/> Mascotas y tienda</NavLink></div>
            <Companion name={profile.companion} xp={petXp} outfit={outfitFor(profile, profile.companion)}/>
          </section>
          <ProfileSettings profile={profile} persist={next => save(owner, 'profile', 'self', next)} />
          {owner === local ? <LocalPetTools profile={profile} /> : <AccountSettings exit={exit}/>}
          <NavLink className="panel friends-link" to="/progreso"><Activity size={20}/> <strong>Progreso</strong></NavLink>
          <NavLink className="panel friends-link" to="/amigos"><span className="friend-avatar" aria-hidden="true"><UserRound/></span>
            <span><strong>Amigos</strong><small>Tu círculo de entrenamiento</small></span><span aria-hidden="true">›</span>
          </NavLink>
        </>} />
        <Route path="*" element={<p>Esta página no existe.</p>} />
      </Routes></div>
    </main>
    <nav aria-label="Navegación principal">
      <NavLink end to="/"><House />Inicio</NavLink><NavLink to="/entrenar"><Dumbbell />Entrenar</NavLink>
      <NavLink to="/rutinas"><BookOpen />Rutinas</NavLink><NavLink to="/tienda"><ShoppingBag />Tienda</NavLink>
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
