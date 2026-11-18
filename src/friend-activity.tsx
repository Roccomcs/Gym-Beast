import { useEffect, useState } from 'react'
import { api } from './store'

type Post = { id: string; handle: string; mine: boolean; cheered: boolean; cheers: number }
type Challenge = { id: string; handle: string; outgoing: boolean; accepted: boolean; expired: boolean;
  starts_on: string; ends_on: string; mine: number; theirs: number }
type Activity = { posts: Post[]; challenges: Challenge[] }

export function FriendActivity({ friends, sessions, online }: {
  friends: string[]; sessions: { id: string; title: string }[]; online: boolean
}) {
  const [data, setData] = useState<Activity>()
  const [status, setStatus] = useState('')
  const [busy, setBusy] = useState(false)
  useEffect(() => {
    if (!online || !api) return
    let live = true
    void api.rpc('friend_activity').then(result => {
      if (live && result.data) setData(result.data as Activity)
      if (live && result.error) setStatus('No se pudo cargar la actividad.')
    })
    return () => { live = false }
  }, [online])
  async function act(action: string, value: string) {
    if (!api || !online || busy) return
    setBusy(true); setStatus('')
    try {
      const result = await api.rpc('friend_activity', { p_action: action, p_value: value })
      if (result.error) setStatus(result.error.code === 'P0001' ? result.error.message : 'No se pudo guardar el cambio.')
      else { setData(result.data as Activity); setStatus('Cambio guardado.') }
    } catch { setStatus('No se pudo conectar.') }
    finally { setBusy(false) }
  }
  const disabled = !online || busy
  return <>
    {status && <p role="status">{status}</p>}
    <section className="panel"><h2>Actividad de amigos</h2>
      {!!sessions.length && <form onSubmit={event => {
        event.preventDefault()
        void act('publish', String(new FormData(event.currentTarget).get('session')))
      }}>
        <label>Sesión para compartir<select name="session">{sessions.map(session => <option key={session.id} value={session.id}>{session.title}</option>)}</select></label>
        <p>Tus amigos verán que completaste una sesión. El peso y los detalles quedan privados.</p>
        <button disabled={disabled}>Compartir sesión</button>
      </form>}
      {!data?.posts.length && <p>Todavía no hay entrenamientos compartidos.</p>}
      {data?.posts.map(post => <article className="my-routine" key={post.id}>
        <strong>@{post.handle}</strong><p>Completó un entrenamiento · {post.cheers} celebraciones</p>
        {post.mine ? <button className="secondary" disabled={disabled} onClick={() => void act('unpublish', post.id)}>Quitar publicación</button> :
          <button className="secondary" disabled={disabled} aria-pressed={post.cheered}
            onClick={() => void act(post.cheered ? 'uncheer' : 'cheer', post.id)}>{post.cheered ? 'Quitar celebración' : 'Celebrar'}</button>}
      </article>)}
    </section>
    <section className="panel"><h2>Desafíos cooperativos</h2>
      <p>Completen tres días de entrenamiento distintos cada uno durante los siete días a partir de la aceptación.</p>
      {!!friends.length && <form onSubmit={event => {
        event.preventDefault()
        void act('challenge', String(new FormData(event.currentTarget).get('friend')))
      }}><label>Invitar a<select name="friend">{friends.map(handle => <option key={handle}>{handle}</option>)}</select></label>
        <button disabled={disabled}>Enviar desafío</button>
      </form>}
      {!data?.challenges.length && <p>Todavía no hay desafíos.</p>}
      {data?.challenges.map(challenge => <article className="my-routine" key={challenge.id}>
        <strong>@{challenge.handle}</strong>
        {challenge.accepted ? <>
          <p>{challenge.mine >= 3 && challenge.theirs >= 3 ? 'Desafío completado' : challenge.expired ? 'Desafío cerrado' : 'En curso hasta ' + challenge.ends_on}</p>
          <p>Vos {Math.min(3, challenge.mine)} de 3 · @{challenge.handle} {Math.min(3, challenge.theirs)} de 3</p>
        </> : <><p>{challenge.expired ? 'Invitación vencida' : challenge.outgoing ? 'Invitación enviada' : 'Invitación recibida'}</p>
          {!challenge.outgoing && !challenge.expired && <div className="actions">
            <button disabled={disabled} onClick={() => void act('accept', challenge.id)}>Aceptar desafío</button>
            <button className="secondary" disabled={disabled} onClick={() => void act('decline', challenge.id)}>Rechazar</button>
          </div>}</>}
      </article>)}
    </section>
  </>
}
