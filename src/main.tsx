import { useMotionVisibility } from './motion'
import {useMobileViewport,useScreenFocus,useOfflineRoutineArt} from './mobile-behavior'
import { Suspense, lazy, useEffect, useMemo, useRef, useState, type ReactNode } from 'react'
import { createRoot } from 'react-dom/client'
import { BrowserRouter, Navigate, NavLink, Route, Routes, useLocation, useNavigate, useSearchParams } from 'react-router-dom'
import { Activity, CalendarDays, Dumbbell, House, UserRound, BookOpen, ShoppingBag } from 'lucide-react'
import { useLiveQuery } from 'dexie-react-hooks'
import { registerSW } from 'virtual:pwa-register'
import { api, clearAccount, db, list, local, save, sessionKey, sync } from './store'
import { dateKey, weekDates, uid, type Profile, type Routine } from './domain'
import { initialVitals, petProgress } from './pet-progress'
import { recordPetPlan } from './weekly-plan'
import { HomePets } from './home-pets'
import {Onboarding} from './onboarding'
import { ProfileSettings } from './profile-settings'
import { SyncIssue } from './sync-issues'
import { AccountForm, AccountSettings, PasswordForm } from './accounts'
import {localRewards} from './local-rewards'
import '@fontsource/press-start-2p/latin-400.css'
import '@fontsource-variable/atkinson-hyperlegible-next'
import './style.css'

const Train=lazy(()=>import('./journey').then(module=>({default:module.Train})))
const ProgramLibrary=lazy(()=>import('./journey').then(module=>({default:module.ProgramLibrary})))
const RoutineBuilder=lazy(()=>import('./routine-builder').then(module=>({default:module.RoutineBuilder})))
const Routines=lazy(()=>import('./routines').then(module=>({default:module.Routines})))
const Workout=lazy(()=>import('./workout').then(module=>({default:module.Workout})))
const Progress=lazy(()=>import('./progress').then(module=>({default:module.Progress})))
const Friends=lazy(()=>import('./friends').then(module=>({default:module.Friends})))
const Library=lazy(()=>import('./exercise-library').then(module=>({default:module.Library})))
const PetShop=lazy(()=>import('./economy').then(module=>({default:module.PetShop})))

const update = registerSW({
  onNeedRefresh() {
    window.dispatchEvent(new Event('gymbeast-update'))
  },
})

const defaults: Profile = {
  name: '', theme: 'dark', unit: 'kg', weekStart: 1,
  timezone: Intl.DateTimeFormat().resolvedOptions().timeZone, companion: 'Dragón',
}

function AccessScreen({ children }: { children: ReactNode }) {
  return <main className="welcome">
    <header className="access-heading">
      <h1>Gym<span>Beast</span></h1>
      <img className="access-flight" src="/access-titans-flight.webp" alt="Dragón y fénix Titán en vuelo"/>
    </header>
    {children}
    <div className="access-hero">
      <img className="access-ground" src="/access-titans-ground.webp" alt="Lobo, oso y cocodrilo Titán en el patio"/>
    </div>
  </main>
}

function Root() {
  const navigate = useNavigate()
  useMotionVisibility()
  useMobileViewport()
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
  if (!owner) return <AccessScreen><AccountForm onSuccess={() => navigate('/', { replace: true })}/></AccessScreen>
  return <Dashboard key={owner} owner={owner} exit={exit} />
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
  const [exitError, setExitError] = useState(false)
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
  const target = Math.min(7, routine?.days.length ?? 0)
  const petPlans = useMemo(() => profile.petPlans ?? (cycle?.startedOn && target
    ? [{ from: cycle.startedOn, target, companion: profile.companion }] : []),
  [profile.petPlans, cycle?.startedOn, target, profile.companion])
  const pets = useMemo(() => petProgress(date, profile.timezone, profile.companion, petPlans, sessions, schedules, rewards),
    [date, profile.timezone, profile.companion, petPlans, sessions, schedules, rewards])
  const { xp: petXp } = pets.get(profile.companion) ?? initialVitals
  const offlineArt=useOfflineRoutineArt(owner,profile,routine,active?.data)
  useScreenFocus(pathname+':'+!!profile.onboarded+':'+!!syncState?.initialized,hash)
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
        cycleId: scheduleId ? undefined : cycle?.id, dayId: scheduleId ? undefined : nextDay?.id, routineId: scheduleId ? undefined : cycle?.routineId, routineVersion: scheduleId ? undefined : routine?.version, weeklyTarget: routine?.days.length, companion: profile.companion, companionXpAtStart: petXp,
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
      petPlans: recordPetPlan(petPlans, { from: date, target: Math.min(7,routine.days.length), companion: profile.companion }),
    })
    navigate('/entrenar')
  }
  function changeCycle(next: Profile['cycle']) {
    void save(owner, 'profile', 'self', { ...profile, cycle: next }).catch(() => setStatus('No pudimos actualizar el ciclo.'))
  }
  if (!profiles || draft === undefined ||
    (owner !== local && !syncState?.initialized && (!profiles.length || (syncState?.cursor ?? 0) > 0))) {
    const blocked = status === 'Sin conexión' || status === 'Error de sincronización'
    return <AccessScreen><section className="panel account-access">
      <p role="status">{blocked
        ? status === 'Sin conexión' ? 'Necesitás conexión para abrir esta cuenta por primera vez.'
          : 'No pudimos cargar tu cuenta. Probá de nuevo.'
        : 'Abriendo tu cuenta…'}</p>
      {blocked && <div className="actions">
        <button className="secondary" onClick={() => {
          if (!navigator.onLine) return
          setStatus('Sincronizando')
          void sync(owner).catch(() => setStatus('Error de sincronización'))
        }}>Reintentar</button>
        <button className="secondary" onClick={() => void exit().catch(() => setExitError(true))}>Cerrar sesión</button>
      </div>}
      {blocked && exitError && <p className="account-error" role="alert">No pudimos cerrar la sesión. Probá de nuevo.</p>}
    </section></AccessScreen>
  }
  if (!profile.onboarded) return <main><Onboarding profile={draft?.profile ?? profile}
    checkpoint={next => { void db.onboarding.put({ owner, profile: next }).catch(() => undefined) }}
    save={async next => { await save(owner, 'profile', 'self', next); await db.onboarding.delete(owner); navigate('/') }} /></main>
  const editorProps = { owner, date, weekStart: 1, unit: profile.unit, start }
  return <>
    <main>
      {available && !active && <button className="secondary" onClick={() => void update(true)}>Actualizar GymBeast</button>}
      {operations.filter(item => item.rejected || item.conflict).map(item => <SyncIssue key={item.op} operation={item}/>)}
      <div className="route-enter" key={pathname}><Suspense fallback={<p role="status">Abriendo…</p>}><Routes>
        <Route index element={<>
          <p className="eyebrow"><CalendarDays size={16} /> {new Date(date + 'T12:00:00Z').toLocaleDateString('es-AR', { dateStyle: 'full', timeZone: 'UTC' })}</p>
          <h1>{profile.name ? 'Hola, ' + profile.name : 'Tu entrenamiento'}</h1>
          <HomePets profile={profile} pets={pets}/>
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
          offlineArt={offlineArt.status} retryArt={offlineArt.retry}
          companion={active?.data.companion ?? profile.companion} xp={active?.data.companionXpAtStart ?? petXp} activeExercises={active?.data.exercises.map(exercise => exercise.catalogId)} start={() => void start()}
          repeat={() => { if (cycle) void import('./routine-cycle').then(module=>module.repeatCycle(owner,cycle.id,date)).catch(() => setStatus('No pudimos repetir el ciclo.')) }} />} />
        <Route path="/rutinas" element={<ProgramLibrary routines={routines} activate={activate} updateCover={(id, routine) => save(owner, 'routine', id, routine)} />} />
        <Route path="/editor" element={<Navigate to="/editor/manual" replace/>} />
        <Route path="/editor/manual" element={<RoutineBuilder key={owner+':'+(params.get('rutina')??'new')} owner={owner} unit={profile.unit} editId={params.get('rutina') ?? undefined} />} />
        <Route path="/editor/importar" element={<Routines key="importar" {...editorProps} mode="importar" />} />
        <Route path="/calendario" element={<Routines key="calendar" {...editorProps} mode="calendar" />} />
        <Route path="/ejercicios" element={<Library />} />
        <Route path="/mascotas" element={<PetShop owner={owner} profile={profile} rewards={rewards} pets={pets} petPlans={petPlans} date={date} target={target} />} />
        <Route path="/tienda" element={<PetShop owner={owner} profile={profile} rewards={rewards} pets={pets} petPlans={petPlans} date={date} target={target} />} />
        <Route path="/sesion/:id" element={<Workout owner={owner} profile={profile} sessions={sessions} sets={sets} rewards={rewards} pets={pets} />} />
        <Route path="/progreso" element={<Progress sessions={completed} sets={sets} unit={profile.unit} today={date} weekStart={1} goal={routine?.days.length || 0} schedules={schedules} rewards={rewards} petPlans={petPlans} pending={owner!==local && operations.some(op=>op.kind==='session'||op.kind==='set')} />} />
        <Route path="/amigos" element={<Friends owner={owner} profile={profile} routines={routines} sessions={completed.filter(item => rewards.some(reward => reward.session_id === item.id && reward.occurrence))
          .slice(0, 15).map(item => ({ id: item.id, title: item.data.title + ' · ' + item.data.date }))}/>} />
        <Route path="/instalar" element={<Install />} />
        <Route path="/perfil" element={<><h1>Perfil</h1>
          <HomePets profile={profile} pets={pets} showStats={false}/>
          <ProfileSettings profile={profile} persist={next => save(owner, 'profile', 'self', next)} />
          <NavLink className="panel friends-link" to="/progreso"><Activity size={20}/> <strong>Progreso</strong></NavLink>
          <NavLink className="panel friends-link" to="/amigos"><span className="friend-avatar" aria-hidden="true"><UserRound/></span>
            <span><strong>Amigos</strong><small>Tu círculo de entrenamiento</small></span><span aria-hidden="true">›</span>
          </NavLink>
          <AccountSettings exit={exit} localMode={owner === local}/>
        </>} />
        <Route path="*" element={<p>Esta página no existe.</p>} />
      </Routes></Suspense></div>
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
