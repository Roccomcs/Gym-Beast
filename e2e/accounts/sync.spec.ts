import {selectLegacyProgram} from '../legacy-program'
import { expect, test, type Browser, type BrowserContext, type Page } from '@playwright/test'
import type { PGlite } from '@electric-sql/pglite'
import { createSyncDatabase } from '../../tests/sync-database'
import { parseRoutine } from '../../src/domain'

const first = '00000000-0000-0000-0000-000000000301'
const second = '00000000-0000-0000-0000-000000000302'
let db: PGlite
let queue: Promise<unknown> = Promise.resolve()
let contexts: BrowserContext[] = []
test.beforeEach(async () => { db = await createSyncDatabase([first, second]); queue = Promise.resolve(); contexts = [] })
test.afterEach(async () => { await Promise.all(contexts.map(context => context.close())); await queue; await db.close() })
function serial<T>(run: () => Promise<T>) {
  const result = queue.then(run)
  queue = result.catch(() => undefined)
  return result
}
async function query<T extends Record<string, unknown>>(sql: string, values: unknown[] = []) {
  return serial(async () => { await db.exec('reset role'); return (await db.query<T>(sql, values)).rows })
}
function session(handle: string) {
  const id = handle === 'rocco' ? first : second
  const metadata = { provider: 'email', providers: ['email'], gymbeast_registration: { handle } }
  const now = Math.floor(Date.now() / 1000)
  const payload = { sub: id, aud: 'authenticated', role: 'authenticated', exp: now + 3600, iat: now, app_metadata: metadata }
  const access_token = Buffer.from('{"alg":"HS256","typ":"JWT"}').toString('base64url') + '.' +
    Buffer.from(JSON.stringify(payload)).toString('base64url') + '.' + Buffer.from('test').toString('base64url')
  return { access_token, refresh_token: 'test-refresh', expires_in: 3600, token_type: 'bearer',
    user: { id, email: 'u.' + handle + '@accounts.gymbeast.invalid', aud: 'authenticated', role: 'authenticated', app_metadata: metadata, user_metadata: {}, created_at: '2026-11-18T00:00:00Z' } }
}

async function device(browser: Browser, handle = 'rocco', legacy?: { items: object[]; operations: object[] }) {
  const context = await browser.newContext({ baseURL: 'http://127.0.0.1:4175', viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true, serviceWorkers:test.info().project.use.serviceWorkers??'allow' })
  contexts.push(context)
  const current = session(handle)
  const page = await context.newPage()
  let dropNext = false
  const cursors: number[] = []
  await context.route('http://127.0.0.1:54321/**', async route => {
    const request = route.request()
    const name = new URL(request.url()).pathname.split('/').pop()!
    const headers = { 'Access-Control-Allow-Origin': '*' }
    if (request.method() === 'OPTIONS') return route.fulfill({ status: 204, headers: { ...headers, 'Access-Control-Allow-Headers': '*', 'Access-Control-Allow-Methods': '*' } })
    if (name === 'accounts' || name === 'token') return route.fulfill({ headers, json: name === 'accounts' ? { session: current } : current })
    if (name === 'user') {
      const exists = (await query('select id from auth.users where id=$1', [current.user.id])).length > 0
      return route.fulfill({ status: exists ? 200 : 403, headers,
        json: exists ? current.user : { error_code: 'user_not_found', msg: 'User not found' } })
    }
    if (name === 'logout') return route.fulfill({ status: 204, headers })
    const args = request.postDataJSON() ?? {}
    const inputs: Record<string, unknown[]> = {
      sync_push: [args.p_operations], sync_pull: [args.p_cursor, args.p_limit], sync_record: [args.p_kind, args.p_id],
    }
    if (!(name in inputs)) return route.fulfill({ status: 400, headers, json: { message: 'Unexpected test endpoint' } })
    try {
      if (name === 'sync_pull') cursors.push(args.p_cursor)
      const result = await serial(async () => {
        await db.exec('set role authenticated')
        await db.query("select set_config('request.jwt.claim.sub',$1,false)", [current.user.id])
        const values = inputs[name]
        return (await db.query<{ result: unknown }>('select public.' + name + '(' + values.map((_, index) => '$' + (index + 1)).join(',') + ') as result', values)).rows[0].result
      })
      if (name === 'sync_push' && dropNext) { dropNext = false; return route.abort('failed') }
      return route.fulfill({ headers, json: result })
    } catch (error) { return route.fulfill({ status: 400, headers, json: { code: 'P0001', message: String(error) } }) }
  })
  if (legacy) {
    await page.route('**/legacy-seed', route => route.fulfill({ contentType: 'text/html', body: '<!doctype html><title>Legacy fixture</title>' }))
    await page.goto('/legacy-seed')
    await page.evaluate(async seed => {
      const database = await new Promise<IDBDatabase>((resolve, reject) => {
        // Dexie stores version 3 as native IndexedDB version 30.
        const request = indexedDB.open('gymbeast', 30)
        request.onupgradeneeded = () => {
          const db = request.result
          const items = db.createObjectStore('items', { keyPath: ['owner', 'kind', 'id'] })
          items.createIndex('owner', 'owner'); items.createIndex('[owner+kind]', ['owner', 'kind'])
          const operations = db.createObjectStore('operations', { keyPath: 'op' })
          operations.createIndex('owner', 'owner'); operations.createIndex('[owner+kind+id]', ['owner', 'kind', 'id'])
          db.createObjectStore('rewards', { keyPath: ['owner', 'session_id'] }).createIndex('owner', 'owner')
          db.createObjectStore('onboarding', { keyPath: 'owner' })
        }
        request.onsuccess = () => resolve(request.result); request.onerror = () => reject(request.error)
      })
      await new Promise<void>((resolve, reject) => {
        const transaction = database.transaction(['items', 'operations'], 'readwrite')
        for (const row of seed.items) transaction.objectStore('items').put(row)
        for (const row of seed.operations) transaction.objectStore('operations').put(row)
        transaction.oncomplete = () => resolve(); transaction.onerror = () => reject(transaction.error)
      })
      database.close()
    }, legacy)
  }
  await page.goto('/')
  await page.getByLabel('Usuario', { exact: true }).fill(handle)
  await page.getByLabel('Contraseña', { exact: true }).fill('mi-clave-segura')
  await page.getByRole('button', { name: 'Iniciar sesión' }).click()
  return { page, context, cursors, loseNextResponse: () => { dropNext = true } }
}

async function onboard(page: Page, name = 'Rocco') {
  await page.getByLabel('Tu nombre').fill(name)
  await page.getByRole('button', { name: /Dragón/ }).click()
  await page.getByRole('button', { name: 'Confirmar compañero' }).click()
  await expect(page.getByRole('heading', { name: 'Hola, ' + name })).toBeVisible()
  await expect.poll(async () => (await query('select id from public.training_items where owner=$1 and kind=\'profile\'', [name === 'Rocco' ? first : second])).length).toBe(1)
}
async function start(page: Page) {
  await page.getByRole('link', { name: 'Rutinas', exact: true }).click()
  await selectLegacyProgram(page)
  await page.getByRole('button', { name: 'Usar rutina', exact: true }).click()
  await page.getByRole('button', { name: 'Empezar', exact: true }).click()
  await expect(page.locator('.exercise-session')).toHaveCount(3)
  await expect.poll(async () => (await query("select id from public.training_items where owner=$1 and kind='session'", [first])).length).toBe(1)
  await page.waitForFunction(() => !!navigator.serviceWorker.controller)
}
async function pending(page: Page) {
  return page.evaluate(async () => {
    const database = await new Promise<IDBDatabase>(resolve => { const request = indexedDB.open('gymbeast'); request.onsuccess = () => resolve(request.result) })
    const count = await new Promise<number>(resolve => { const request = database.transaction('operations').objectStore('operations').count(); request.onsuccess = () => resolve(request.result) })
    database.close(); return count
  })
}
async function focus(page: Page) { await page.evaluate(() => window.dispatchEvent(new Event('focus'))) }

test('una recuperación global vuelve a descargar datos aunque el cursor local sea mayor',async({browser})=>{
  const a=await device(browser);await onboard(a.page)
  await expect.poll(()=>pending(a.page)).toBe(0)
  // A restored project can have lower versions and cursor than a phone.
  await query("update training_items set version=1,data=jsonb_set(data,'{name}','\"Restaurado\"') where owner=$1 and kind='profile'",[first])
  await query('select begin_recovery_epoch()')
  await a.page.evaluate(async owner=>{
    const database=await new Promise<IDBDatabase>(resolve=>{const request=indexedDB.open('gymbeast');request.onsuccess=()=>resolve(request.result)})
    await new Promise<void>((resolve,reject)=>{const tx=database.transaction('syncState','readwrite'),store=tx.objectStore('syncState'),get=store.get(owner)
      get.onsuccess=()=>store.put({...get.result,cursor:999999});tx.oncomplete=()=>resolve();tx.onerror=()=>reject(tx.error)})
    database.close()
  },first)
  await focus(a.page)
  await expect(a.page.getByRole('heading',{name:'Hola, Restaurado',exact:true})).toBeVisible()
  await a.page.reload()
  await expect(a.page.getByRole('heading',{name:'Hola, Restaurado',exact:true})).toBeVisible()
  await a.context.setOffline(true)
  await a.page.getByRole('link',{name:'Perfil',exact:true}).click()
  await a.page.getByLabel('Peso (kg)',{exact:true}).fill('80')
  await expect.poll(()=>pending(a.page)).toBe(1)
  await query("update training_items set version=100,data=jsonb_set(data,'{name}','\"Servidor\"') where owner=$1 and kind='profile'",[first])
  await query('select begin_recovery_epoch()')
  await a.context.setOffline(false);await focus(a.page)
  await expect(a.page.getByRole('heading',{name:'Elegí qué versión conservar'})).toBeVisible()
  expect(await pending(a.page)).toBe(1)
  await expect(a.page.getByLabel('Peso (kg)',{exact:true})).toHaveValue('80')
  await a.page.getByRole('button',{name:'Usar versión sincronizada',exact:true}).click()
  await expect.poll(()=>pending(a.page)).toBe(0)
  await a.page.goto('/')
  await expect(a.page.getByRole('heading',{name:'Hola, Servidor',exact:true})).toBeVisible()
})

test('confirma el premio de carga offline una sola vez y descarga su desglose en otro teléfono',async({browser})=>{
  test.setTimeout(60000)
  const a=await device(browser)
  await onboard(a.page);await start(a.page)
  await expect.poll(()=>pending(a.page)).toBe(0)
  const current=(await query<{id:string;data:any}>("select id,data from public.training_items where owner=$1 and kind='session'",[first]))[0]
  const reference={...current.data,cycleId:'reference-cycle',dayId:'reference-day',started:current.data.started-20000,ended:current.data.started-10000}
  await query("insert into public.training_items(owner,kind,id,version,data) values($1,'session','reference',1,$2)",[first,reference])
  for(const e of reference.exercises)await query("insert into public.training_items(owner,kind,id,version,data) values($1,'set',$2,1,$3)",
    [first,'reference-'+e.id,{sessionId:'reference',exerciseId:e.id,kg:60,reps:10,done:true,created:reference.started+1000,type:'work'}])
  await focus(a.page)
  await a.context.setOffline(true)
  for(const exercise of await a.page.locator('.exercise-session').all()){
    await exercise.locator('input[name="load"]').first().fill('65')
    await exercise.locator('input[name="reps"]').first().fill('5')
    await exercise.getByRole('button',{name:'Registrar serie 1',exact:true}).click()
  }
  await a.page.getByRole('button',{name:'Finalizar entrenamiento'}).click()
  await expect(a.page.getByText('Recompensa pendiente de sincronizar.',{exact:true})).toBeVisible()
  await a.page.reload()
  await expect(a.page.getByText('Recompensa pendiente de sincronizar.',{exact:true})).toBeVisible()
  a.loseNextResponse()
  await a.context.setOffline(false);await focus(a.page)
  await expect.poll(async()=>(await query('select xp,gold from public.session_rewards where owner=$1 and session_id=$2',[first,current.id]))[0])
    .toEqual({xp:40,gold:35})
  await focus(a.page)
  await expect.poll(()=>pending(a.page)).toBe(0)
  await expect(a.page.getByRole('status',{name:'+40 EXP · +35 de oro'})).toBeVisible()
  const b=await device(browser)
  await expect(b.page.getByRole('heading',{name:'Hola, Rocco'})).toBeVisible()
  await b.page.goto('/sesion/'+current.id)
  await expect(b.page.locator('.load-bonus-summary li')).toHaveCount(3)
  await expect(b.page.getByRole('status',{name:'+40 EXP · +35 de oro'})).toBeVisible()
  await b.page.getByRole('link',{name:'Tienda',exact:true}).click()
  await expect(b.page.getByTestId('shop-balance')).toHaveText('Saldo: 55 de oro')
  expect((await query('select count(*)::int as count from public.session_rewards where owner=$1 and session_id=$2',[first,current.id]))[0].count).toBe(1)
})

test('sincroniza un día offline con respuesta perdida y lo recupera en otro dispositivo', async ({ browser }) => {
  test.setTimeout(60000)
  const a = await device(browser)
  await onboard(a.page); await start(a.page)
  await expect.poll(() => pending(a.page)).toBe(0)
  await a.context.setOffline(true)
  for (const exercise of await a.page.locator('.exercise-session').all()) {
    await exercise.locator('input[name="load"]').first().fill('60')
    await exercise.getByRole('button', { name: 'Registrar serie 1', exact: true }).click()
    await expect(exercise.locator('.quick-set-done')).toHaveCount(1)
  }
  await a.page.reload()
  await expect(a.page.locator('.quick-set-done')).toHaveCount(3)
  await a.page.getByRole('button', { name: 'Finalizar entrenamiento' }).click()
  a.loseNextResponse()
  await a.context.setOffline(false); await focus(a.page)
  await expect.poll(async () => (await query('select session_id from public.session_rewards where owner=$1 and occurrence is not null', [first])).length).toBe(1)
  await a.page.getByRole('link', { name: 'Perfil', exact: true }).click()
  await expect(a.page.getByRole('status').filter({ hasText: 'Error de sincronización' })).toBeVisible()
  await focus(a.page)
  await expect.poll(() => pending(a.page)).toBe(0)
  await a.page.getByRole('link', { name: 'Tienda', exact: true }).click()
  await expect(a.page.getByTestId('shop-balance')).toHaveText('Saldo: 20 de oro')
  const b = await device(browser)
  await expect(b.page.getByRole('heading', { name: 'Hola, Rocco' })).toBeVisible()
  await expect(b.page.getByRole('heading', { name: '¡Felicitaciones! Ya entrenaste hoy' })).toBeVisible()
  expect((await query('select count(*)::int as count from public.session_rewards where owner=$1 and occurrence is not null', [first]))[0].count).toBe(1)
  await focus(b.page)
  await expect.poll(() => b.cursors.some(cursor => cursor > 0)).toBe(true)
  const other = await device(browser, 'gabi')
  await onboard(other.page, 'Gabi')
  expect((await query("select count(*)::int as count from public.training_items where owner=$1 and kind='session'", [second]))[0].count).toBe(0)
  await Promise.all([a.context.close(), b.context.close(), other.context.close()])
})

test('fusiona series de dos dispositivos, resuelve su conflicto y descarga una eliminación', async ({ browser }, info) => {
  test.setTimeout(60000)
  const a = await device(browser)
  await onboard(a.page); await start(a.page)
  await expect.poll(() => pending(a.page)).toBe(0)
  const sessionPath = new URL(a.page.url()).pathname
  const b = await device(browser)
  await expect(b.page.getByRole('heading', { name: 'Hola, Rocco' })).toBeVisible()
  await b.page.goto(sessionPath)
  await expect(b.page.locator('.exercise-session')).toHaveCount(3)
  await b.page.waitForFunction(() => !!navigator.serviceWorker.controller)
  await Promise.all([a.context.setOffline(true), b.context.setOffline(true)])
  const exA = a.page.locator('.exercise-session').first()
  const exB = b.page.locator('.exercise-session').first()
  await exA.locator('input[name="load"]').first().fill('60')
  await exA.getByRole('button', { name: 'Registrar serie 1', exact: true }).click()
  await exB.locator('input[name="load"]').nth(1).fill('62.5')
  await exB.getByRole('button', { name: 'Registrar serie 2', exact: true }).click()
  await Promise.all([a.context.setOffline(false), b.context.setOffline(false)])
  await Promise.all([focus(a.page), focus(b.page)])
  await expect.poll(async () => (await query("select count(*)::int as count from public.training_items where owner=$1 and kind='set'", [first]))[0].count).toBe(2)
  await expect.poll(() => pending(a.page)).toBe(0)
  await expect.poll(() => pending(b.page)).toBe(0)
  await focus(b.page)
  await expect(exB.getByRole('button', { name: 'Guardar serie 1', exact: true })).toBeVisible()
  await b.context.setOffline(true)
  await exB.locator('input[name="load"]').first().fill('70')
  await exB.getByRole('button', { name: 'Guardar serie 1', exact: true }).click()
  await exA.locator('input[name="load"]').first().fill('65')
  await exA.getByRole('button', { name: 'Guardar serie 1', exact: true }).click()
  await expect.poll(() => pending(a.page)).toBe(0)
  await b.context.setOffline(false); await focus(b.page)
  await expect(b.page.getByRole('heading', { name: 'Elegí qué versión conservar' })).toBeVisible()
  await expect(b.page.locator('.sync-versions')).toContainText('70 kg')
  await expect(b.page.locator('.sync-versions')).toContainText('65 kg')
  await b.page.locator('.sync-issue').screenshot({ path: info.outputPath('conflicto-serie.png'), scale: 'css' })
  await b.page.getByRole('button', { name: 'Conservar este teléfono' }).click()
  await expect.poll(() => pending(b.page)).toBe(0)
  expect((await query("select data->>'kg' as kg from public.training_items where owner=$1 and kind='set' and data->>'slot'='0'", [first]))[0].kg).toBe('70')
  const [row] = await query<{ id: string; version: number }>("select id,version from public.training_items where owner=$1 and kind='session'", [first])
  await serial(async () => {
    await db.exec('set role authenticated')
    await db.query("select set_config('request.jwt.claim.sub',$1,false)", [first])
    await db.query('select public.sync_push($1)', [[{ op: crypto.randomUUID(), kind: 'session', id: row.id, base: row.version, action: 'delete', data: null }]])
  })
  await focus(b.page)
  await expect(b.page.locator('.exercise-session')).toHaveCount(0)
  await Promise.all([a.context.close(), b.context.close()])
})

test('dos pestañas comparten la cola sin repetir ni perder los cambios del perfil', async ({ browser }) => {
  const a = await device(browser)
  await onboard(a.page)
  await a.page.getByRole('link', { name: 'Perfil', exact: true }).click()
  const b = await a.context.newPage()
  await b.goto('/perfil')
  await expect(b.getByLabel('Nombre visible')).toHaveValue('Rocco')
  await Promise.all([a.page.getByLabel('Nombre visible').fill('Rocco A'), b.getByLabel('Nombre visible').fill('Rocco B')])
  await expect.poll(async () => {
    const rows = await query<{ version: number }>("select version from public.training_items where owner=$1 and kind='profile'", [first])
    return rows[0]?.version
  }).toBeGreaterThanOrEqual(3)
  await expect.poll(() => pending(a.page)).toBe(0)
  const [row] = await query<{ name: string }>("select data->>'name' as name from public.training_items where owner=$1 and kind='profile'", [first])
  expect(['Rocco A', 'Rocco B']).toContain(row.name)
  await expect(a.page.getByLabel('Nombre visible')).toHaveValue(row.name)
  await expect(b.getByLabel('Nombre visible')).toHaveValue(row.name)
})

test('limpia el espacio descargado cuando se confirma que la cuenta fue eliminada', async ({ browser }) => {
  const a = await device(browser)
  await onboard(a.page)
  await query('delete from auth.users where id=$1', [first])
  await focus(a.page)
  await expect(a.page.getByRole('button', { name: 'Iniciar sesión' })).toBeVisible()
  expect(await pending(a.page)).toBe(0)
  await a.page.reload()
  await expect(a.page.getByRole('button', { name: 'Iniciar sesión' })).toBeVisible()
})

test('migra el espacio anterior y ordena la sesión antes de su serie pendiente', async ({ browser }) => {
  const profile = { name: 'Rocco', onboarded: true, unit: 'kg', theme: 'dark', weekStart: 1,
    timezone: 'America/Buenos_Aires', starter: 'Dragón', companion: 'Dragón' }
  await query("insert into public.training_items(owner,kind,id,version,data) values($1,'profile','self',1,$2)", [first, profile])
  const exercise = parseRoutine('Press banca 3x10 60kg')[0].exercises[0]
  const workout = { title: 'Sesión anterior', started: Date.now(), date: '2026-11-18', exercises: [exercise], companion: 'Dragón' }
  const set = { sessionId: 'legacy-session', exerciseId: exercise.id, reps: 10, kg: 60, done: true, created: Date.now(), slot: 0 }
  const a = await device(browser, 'rocco', {
    items: [{ owner: first, kind: 'profile', id: 'self', version: 1, data: profile },
      { owner: first, kind: 'session', id: 'legacy-session', version: 1, data: workout },
      { owner: first, kind: 'set', id: 'legacy-set', version: 1, data: set }],
    operations: [
      { owner: first, op: '00000000-0000-0000-0000-000000000001', kind: 'set', id: 'legacy-set', base: 0, data: set },
      { owner: first, op: 'ffffffff-ffff-ffff-ffff-ffffffffffff', kind: 'session', id: 'legacy-session', base: 0, data: workout },
    ],
  })
  await expect(a.page.getByRole('heading', { name: 'Hola, Rocco' })).toBeVisible()
  await expect.poll(() => pending(a.page)).toBe(0)
  expect((await query("select data->>'kg' as kg from public.training_items where owner=$1 and kind='set'", [first]))[0].kg).toBe('60')
  await a.page.reload()
  await expect(a.page.getByRole('heading', { name: 'Hola, Rocco' })).toBeVisible()
})
