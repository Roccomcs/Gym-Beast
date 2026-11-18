import { useState } from 'react'
import { useLiveQuery } from 'dexie-react-hooks'
import { db, resolveConflict, retryOperation, type Operation, type Values } from './store'

const labels = { routine: 'Rutina', session: 'Entrenamiento', schedule: 'Planificación', set: 'Serie', profile: 'Perfil' }
function summary(data: Values[keyof Values] | null | undefined) {
  if (!data) return 'Registro eliminado'
  if ('reps' in data) return (data.kg === null ? 'Sin peso externo' : data.kg + ' kg') + ' · ' + data.reps + ' repeticiones'
  if ('title' in data) return data.title + ('date' in data ? ' · ' + data.date : '')
  return data.name || 'Sin nombre'
}

export function SyncIssue({ operation }: { operation: Operation }) {
  const local = useLiveQuery(() => db.items.get([operation.owner, operation.kind, operation.id]), [operation.op])
  const [busy, setBusy] = useState(false)
  const [message, setMessage] = useState('')
  async function choose(local: boolean) {
    if (busy) return
    setBusy(true); setMessage('')
    try {
      if (operation.conflict) await resolveConflict(operation, local)
      else await retryOperation(operation, local)
    } catch { setMessage('No pudimos resolver el cambio. Revisá la conexión y probá de nuevo.') }
    finally { setBusy(false) }
  }
  return <section className="panel sync-issue">
    <p className="eyebrow">{labels[operation.kind]}</p>
    <h2>{operation.conflict ? 'Elegí qué versión conservar' : 'Revisá este cambio'}</h2>
    {operation.rejected && <p>{operation.rejected}</p>}
    {operation.rejected && <p>Corregí el registro y reenviá, o descartá sus cambios pendientes.</p>}
    <div className="sync-versions">
      <div><strong>Este teléfono</strong><p>{summary(local?.data)}</p>
        <details><summary>Ver datos</summary><pre>{JSON.stringify(local?.data ?? null, null, 2)}</pre></details></div>
      {operation.conflict && <div><strong>Versión sincronizada</strong><p>{summary(operation.conflict.data)}</p>
        <details><summary>Ver datos</summary><pre>{JSON.stringify(operation.conflict.data, null, 2)}</pre></details></div>}
    </div>
    <div className="actions"><button disabled={busy} onClick={() => void choose(true)}>
      {operation.conflict ? 'Conservar este teléfono' : 'Enviar versión corregida'}</button>
      {operation.conflict && <button className="secondary" disabled={busy} onClick={() => void choose(false)}>Usar versión sincronizada</button>}
      {operation.rejected && <button className="secondary" disabled={busy} onClick={() => {
        if (confirm('¿Descartar todos los cambios pendientes de este registro y recuperar su versión sincronizada?')) void choose(false)
      }}>Descartar cambios de este registro</button>}
    </div>
    {message && <p role="alert">{message}</p>}
  </section>
}
