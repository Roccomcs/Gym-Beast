import { useEffect, useState } from 'react'
import { UserRound } from 'lucide-react'
import { FriendActivity } from './friend-activity'
import { compactPhoto } from './photo'
import { api, local } from './store'

type Relationship = { handle: string; status: 'pending' | 'accepted' | 'blocked'; outgoing: boolean; avatar?: string | null }
type Social = { handle: string | null; avatar: string | null; relationships: Relationship[] }

export function Friends({ owner, sessions }: { owner: string; sessions: { id: string; title: string }[] }) {
  const [data, setData] = useState<Social>()
  const [message, setMessage] = useState('')
  const [busy, setBusy] = useState(false)
  const [online, setOnline] = useState(navigator.onLine)
  useEffect(() => {
    const refresh = () => setOnline(navigator.onLine)
    window.addEventListener('online', refresh)
    window.addEventListener('offline', refresh)
    return () => {
      window.removeEventListener('online', refresh)
      window.removeEventListener('offline', refresh)
    }
  }, [])
  useEffect(() => {
    if (owner === local || !api || !online) return
    let active = true
    void api.rpc('social_action', { p_action: 'list' }).then(result => {
      if (!active) return
      if (result.error) setMessage('No pudimos cargar Amigos.')
      else setData(result.data as Social)
    })
    return () => { active = false }
  }, [owner, online])
  async function action(name: string, handle: string, avatar?: string | null) {
    if (!api || busy || !online) return
    setBusy(true); setMessage('')
    try {
      const result = await api.rpc('social_action', { p_action: name, p_handle: handle, p_avatar: avatar ?? null })
      if (result.error) {
        setMessage(result.error.code === '23505' ? 'Ese nombre de usuario ya está en uso.' :
          result.error.code === 'P0001' ? result.error.message : 'No pudimos guardar el cambio.')
      } else { setData(result.data as Social); setMessage('Cambio guardado.') }
    } catch { setMessage('No pudimos conectar con Amigos.') }
    finally { setBusy(false) }
  }
  if (owner === local || !api) return <><h1>Amigos</h1><section className="panel friends-empty">
    <span className="friend-avatar" aria-hidden="true"><UserRound/></span><h2>Tu círculo</h2>
    <p>Entrá con una cuenta sincronizada para agregar amigos.</p>
  </section></>
  return <><h1>Amigos</h1>
    {!online && <p role="status">Conectate para actualizar tu lista.</p>}
    {message && <p role="status">{message}</p>}
    {data && <><form className="panel" onSubmit={event => {
      event.preventDefault()
      void action('handle', String(new FormData(event.currentTarget).get('handle')))
    }}><h2>Tu usuario</h2><label>Nombre de usuario<input key={data.handle} name="handle" required minLength={3} maxLength={24}
      pattern="[a-zA-Z0-9_]+" autoCapitalize="none" defaultValue={data.handle ?? ''}/></label>
      <button disabled={busy || !online}>Guardar usuario</button></form>
    {data.handle && <section className="panel">
      <h2>Tu foto</h2>
      {data.avatar && <img className="friend-avatar" src={data.avatar} alt="Tu foto"/>}
      <label>Foto para tus amigos<input type="file" accept="image/*" disabled={busy || !online} onChange={async event => {
        const file = event.currentTarget.files?.[0]
        if (!file) return
        try { await action('avatar', '', await compactPhoto(file)) }
        catch { setMessage('No pudimos leer la foto.') }
      }}/></label>
      {data.avatar && <button className="secondary" disabled={busy || !online} onClick={() => void action('avatar', '', null)}>Quitar foto</button>}
    </section>}
    {data.handle && <form className="panel" onSubmit={event => {
      event.preventDefault()
      void action('request', String(new FormData(event.currentTarget).get('friend')))
    }}><h2>Agregar amigo</h2><label>Usuario de tu amigo<input name="friend" required autoCapitalize="none"/></label>
      <button disabled={busy || !online}>Enviar solicitud</button></form>}
    <section className="panel"><h2>Tu círculo</h2>
      {!data.relationships.length && <p>Todavía no hay amigos en tu lista.</p>}
      {data.relationships.map(entry => <article className="my-routine" key={entry.handle}>
        <div className="friends-link">{entry.avatar ? <img className="friend-avatar" src={entry.avatar} alt=""/> :
          <span className="friend-avatar" aria-hidden="true">{entry.handle.slice(0,2).toUpperCase()}</span>}
          <div><strong>@{entry.handle}</strong><small>{entry.status === 'accepted' ? 'Amigo' : entry.status === 'blocked' ? 'Bloqueado' : entry.outgoing ? 'Solicitud enviada' : 'Solicitud recibida'}</small></div></div>
        <div className="actions">
          {entry.status === 'pending' && !entry.outgoing && <button disabled={busy || !online} onClick={() => void action('accept', entry.handle)}>Aceptar</button>}
          {entry.status !== 'blocked' && <button className="secondary" disabled={busy || !online} onClick={() => void action('remove', entry.handle)}>Quitar</button>}
          <button className="secondary" disabled={busy || !online}
            onClick={() => void action(entry.status === 'blocked' ? 'unblock' : 'block', entry.handle)}>
            {entry.status === 'blocked' ? 'Desbloquear' : 'Bloquear'}
          </button>
        </div>
      </article>)}
    </section>{data.handle && <FriendActivity key={data.relationships.filter(entry => entry.status === 'accepted').map(entry => entry.handle).join(',')} online={online} sessions={sessions}
      friends={data.relationships.filter(entry => entry.status === 'accepted').map(entry => entry.handle)}/>}</>}
  </>
}
