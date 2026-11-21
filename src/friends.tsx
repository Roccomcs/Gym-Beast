import { useEffect, useRef, useState } from 'react'
import { UserRound,RefreshCw } from 'lucide-react'
import { FriendProfile } from './friend-profile'
import {useScreenFocus} from './mobile-behavior'
import type { Profile } from './domain'
import { FriendActivity } from './friend-activity'
import { compactPhoto } from './photo'
import { api, local, db,save,sync,type Item } from './store'

type Relationship = { handle: string; status: 'pending' | 'accepted' | 'blocked'; outgoing: boolean; avatar?: string | null }
type Social = { handle: string | null; avatar: string | null; relationships: Relationship[] }

export function Friends({ owner, sessions,profile,routines }: { owner: string; sessions: { id: string; title: string }[];profile:Profile;routines:Item<'routine'>[] }) {
  const [data, setData] = useState<Social>()
  const [message, setMessage] = useState('')
  const [busy, setBusy] = useState(false)
  const [loginHandle, setLoginHandle] = useState('')
  const [online, setOnline] = useState(navigator.onLine)
  const [selected,select]=useState(''),[revision,refresh]=useState(0)
  useScreenFocus('friends:'+selected,'')
  const sharing=useRef(false)
  const [shareDraft,setShareDraft]=useState<string[]>()
  useEffect(()=>{
    const update=()=>{if(document.visibilityState==='visible')refresh(n=>n+1)}
    window.addEventListener('focus',update);document.addEventListener('visibilitychange',update)
    return()=>{window.removeEventListener('focus',update);document.removeEventListener('visibilitychange',update)}
  },[])
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
    void api.auth.getSession().then(({ data }) => {
      if (active) setLoginHandle(data.session?.user.app_metadata.gymbeast_registration?.handle ?? '')
    })
    void api.rpc('social_action', { p_action: 'list' }).then(result => {
      if (!active) return
      if (result.error) setMessage('No pudimos cargar Amigos.')
      else {
        const next=result.data as Social
        setData(next)
        select(current=>next.relationships.some(entry=>entry.handle===current&&entry.status==='accepted')?current:'')
      }
    })
    return () => { active = false }
  }, [owner, online,revision])
  async function share(id:string,enabled:boolean){
    if(sharing.current||!online)return
    sharing.current=true;setBusy(true);setMessage('')
    const anticipated=new Set(profile.sharedRoutineIds??[])
    if(enabled)anticipated.add(id);else anticipated.delete(id)
    setShareDraft([...anticipated])
    try{
      const current=await db.items.get([owner,'profile','self'])
      if(!current||current.kind!=='profile')throw new Error('Missing profile')
      const value=current.data as Profile
      const ids=new Set(value.sharedRoutineIds??[])
      if(enabled)ids.add(id);else ids.delete(id)
      await save(owner,'profile','self',{...value,sharedRoutineIds:[...ids]})
      setMessage('Confirmando el cambio…')
      try {
        await sync(owner)
        const pending=await db.operations.where('[owner+kind+id]').equals([owner,'profile','self']).count()
        setMessage(pending?'El cambio sigue pendiente. Revisá los avisos de sincronización.':enabled?'Rutina compartida con tus amigos.':'La rutina dejó de estar compartida.')
      }
      catch{setMessage('Cambio guardado en este dispositivo. Falta confirmar la sincronización.')}
    }catch{setMessage('No se pudo actualizar la rutina compartida.')}
    finally{sharing.current=false;setBusy(false);setShareDraft(undefined)}
  }
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
  if(selected)return <FriendProfile key={selected} owner={owner} handle={selected} unit={profile.unit} online={online} close={()=>{select('');window.scrollTo(0,0)}}/>
  return <><div className="page-heading"><h1>Amigos</h1><button type="button" className="secondary" disabled={busy||!online} aria-label="Actualizar amigos" onClick={()=>refresh(n=>n+1)}><RefreshCw size={18}/></button></div>
    {!online && <p role="status">Conectate para actualizar tu lista.</p>}
    {message && <p role="status">{message}</p>}
    {data && <><details className="social-identity"><summary>Tu foto y usuario</summary><form className="panel" onSubmit={event => {
      event.preventDefault()
      void action('handle', String(new FormData(event.currentTarget).get('handle')))
    }}><h2>Tu usuario</h2><label>Nombre de usuario<input key={data.handle} name="handle" required minLength={3} maxLength={24} readOnly={!!loginHandle}
      pattern="[a-zA-Z0-9_]+" autoCapitalize="none" defaultValue={data.handle ?? ''}/></label>
      {!loginHandle && <button disabled={busy || !online}>Guardar usuario</button>}</form>
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
    </section>}</details>
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
          {entry.status==='accepted'&&<button disabled={busy||!online} onClick={()=>{select(entry.handle);window.scrollTo(0,0)}} aria-label={'Ver perfil de @'+entry.handle}>Ver perfil</button>}
          {entry.status === 'pending' && !entry.outgoing && <button disabled={busy || !online} onClick={() => void action('accept', entry.handle)}>Aceptar</button>}
          {entry.status !== 'blocked' && <button className="secondary" disabled={busy || !online} onClick={() => void action('remove', entry.handle)}>Quitar</button>}
          <button className="secondary" disabled={busy || !online}
            onClick={() => void action(entry.status === 'blocked' ? 'unblock' : 'block', entry.handle)}>
            {entry.status === 'blocked' ? 'Desbloquear' : 'Bloquear'}
          </button>
        </div>
      </article>)}
    </section>
    {!!routines.filter(item=>!item.data.archived).length&&<section className="panel"><h2>Tus rutinas compartidas</h2>
      <p>Elegí cuáles pueden ver y copiar tus amigos. Se comparte la versión actual, sin pesos ni notas personales.</p>
      {routines.filter(item=>!item.data.archived).map(item=><label className="share-routine-toggle" key={item.id}>
        <input type="checkbox" checked={(shareDraft??profile.sharedRoutineIds??[]).includes(item.id)} disabled={busy||!online} onChange={event=>void share(item.id,event.target.checked)}/>
        <span>{item.data.name}</span>
      </label>)}
    </section>}
    {data.handle && <FriendActivity key={data.relationships.filter(entry => entry.status === 'accepted').map(entry => entry.handle).join(',')+revision} online={online} sessions={sessions} onProfile={handle=>{select(handle);window.scrollTo(0,0)}}
      friends={data.relationships.filter(entry => entry.status === 'accepted').map(entry => entry.handle)}/>}</>}
  </>
}
