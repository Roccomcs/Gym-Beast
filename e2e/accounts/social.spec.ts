import {selectLegacyProgram} from '../legacy-program'
import { expect, test, type Browser, type BrowserContext, type Page } from '@playwright/test'
import type { PGlite } from '@electric-sql/pglite'
import { createSyncDatabase } from '../../tests/sync-database'
import { parseRoutine } from '../../src/domain'
import AxeBuilder from '@axe-core/playwright'

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
  // API routing must stay outside WebKit's service worker. Offline PWA coverage is in the other suites.
  const context = await browser.newContext({ baseURL: 'http://127.0.0.1:4175', viewport: test.info().project.use.viewport??{ width: 390, height: 844 }, isMobile: true, hasTouch: true,serviceWorkers:'block' })
  contexts.push(context)
  const current = session(handle)
  const page = await context.newPage()
  let dropNext = false
  const cursors: number[] = []
  await context.route('http://127.0.0.1:54321/**', async route => {
    const request = route.request()
    const name = new URL(request.url()).pathname.split('/').pop()!
    const headers = { 'Access-Control-Allow-Origin': request.headers()['origin']??'http://127.0.0.1:4175', 'Access-Control-Allow-Credentials':'true' }
    if (request.method() === 'OPTIONS') return route.fulfill({ status: 204, headers: { ...headers,
      'Access-Control-Allow-Headers':request.headers()['access-control-request-headers']??'authorization,apikey,content-type,x-client-info,x-supabase-api-version,prefer,accept-profile,content-profile',
      'Access-Control-Allow-Methods': 'GET,POST,PATCH,DELETE,OPTIONS' } })
    if (name === 'accounts' || name === 'token') return route.fulfill({ headers, json: name === 'accounts' ? { session: current } : current })
    if (name === 'user') {
      const exists = (await query('select id from auth.users where id=$1', [current.user.id])).length > 0
      return route.fulfill({ status: exists ? 200 : 403, headers,
        json: exists ? current.user : { error_code: 'user_not_found', msg: 'User not found' } })
    }
    if (name === 'logout') return route.fulfill({ status: 204, headers })
    const args = request.postDataJSON() ?? {}
    const inputs: Record<string, unknown[]> = {
      friend_profile:[args.p_handle,args.p_days??28], social_action:[args.p_action??'list',args.p_handle??null,args.p_avatar??null], friend_activity:[args.p_action??'list',args.p_value??null],
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
  await focus(page)
  await expect.poll(async () => (await query("select id from public.training_items where owner=$1 and kind='profile'", [name === 'Rocco' ? first : second])).length,{timeout:15000}).toBe(1)
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

test('compartir durante una descarga confirma también la escritura que llegó después',async({browser})=>{
  await query('insert into social_profiles(owner,handle) values($1,$2)',[first,'rocco'])
  await query("insert into training_items(owner,kind,id,version,data) values($1,'profile','self',1,$2)",
    [first,{name:'Rocco',onboarded:true,timezone:'UTC',companion:'Dragón',starter:'Dragón',unit:'kg',theme:'dark',weekStart:1}])
  await query("insert into training_items(owner,kind,id,version,data) values($1,'routine','r',1,$2)",
    [first,{name:'Rutina propia',version:1,source:'',days:parseRoutine('Día 1\nPress banca 3x10 60')}])
  const a=await device(browser)
  await expect(a.page.getByRole('heading',{name:'Hola, Rocco'})).toBeVisible()
  await a.page.goto('/amigos')
  await expect(a.page.getByLabel('Rutina propia',{exact:true})).toBeVisible()
  let release!:()=>void,arrived!:()=>void
  const held=new Promise<void>(resolve=>release=resolve),seen=new Promise<void>(resolve=>arrived=resolve)
  let firstPull=true
  await a.context.route('**/rest/v1/rpc/sync_pull',async route=>{
    if(firstPull){firstPull=false;arrived();await held}
    await route.fallback()
  })
  await focus(a.page);await seen
  try{
    await a.page.getByLabel('Rutina propia',{exact:true}).check()
    await expect(a.page.getByText('Confirmando el cambio…',{exact:true})).toBeVisible()
    // Keep the pull open beyond the 150 ms autosync debounce so both callers
    // must join the in-flight pass before it is released.
    await a.page.waitForTimeout(250)
  }finally{release()}
  await expect(a.page.getByText('Rutina compartida con tus amigos.',{exact:true})).toBeVisible()
  expect((await query<{ids:string[]}>("select data->'sharedRoutineIds' as ids from training_items where owner=$1 and kind='profile'",[first]))[0].ids).toEqual(['r'])
})

test('amigos aceptan, comparan, copian una rutina, celebran, completan un desafío y bloquean',async({browser},info)=>{
  test.setTimeout(90000)
  for(const [owner,handle]of [[first,'rocco'],[second,'gabi']])await query('insert into social_profiles(owner,handle) values($1,$2)',[owner,handle])
  const today=(await query<{date:string}>("select (now() at time zone 'UTC')::date::text as date"))[0].date
  const exercise={...parseRoutine('Día 1\nPress banca 3x10 65')[0].exercises[0],id:'bench',notes:'SECRET_NOTE',original:'SECRET_ORIGINAL'}
  await query("insert into training_items(owner,kind,id,version,data) values($1,'routine','gabi-routine',1,$2)",
    [second,{name:'Torso de Gabi',version:1,source:'SECRET_SOURCE',days:[{id:'day',title:'Torso',exercises:[exercise]}],cover:0}])
  await query("insert into training_items(owner,kind,id,version,data) values($1,'profile','self',1,$2)",
    [second,{name:'Gabi',onboarded:true,timezone:'UTC',companion:'Lobo',starter:'Lobo',unit:'kg',theme:'dark',weekStart:1,weightKg:123,notes:'SECRET_BODY',petPlans:[],sharedRoutineIds:[]}])
  for(const [owner,count,kg,companion]of [[first,3,50,'Dragón'],[second,12,65,'Lobo']] as const){
    for(let i=0;i<count;i++){
      const date=new Date(Date.parse(today+'T12:00:00Z')-i*86400000),id='social'+i,started=date.getTime()
      await query("insert into training_items(owner,kind,id,version,data) values($1,'session',$2,1,$3)",
        [owner,id,{title:'Entrenamiento '+i,date:date.toISOString().slice(0,10),started,ended:started+60000,cycleId:'social-cycle',dayId:id,companion,exercises:[exercise]}])
      await query("insert into training_items(owner,kind,id,version,data) values($1,'set',$2,1,$3)",
        [owner,id,{sessionId:id,exerciseId:'bench',kg,reps:10,done:true,created:started,type:'work'}])
    }
  }
  const a=await device(browser);await onboard(a.page)
  await a.page.setViewportSize(info.project.use.viewport??{width:info.project.name.includes('320')?320:390,height:844})
  await a.page.goto('/amigos')
  await a.page.getByLabel('Usuario de tu amigo').fill('gabi')
  await a.page.getByRole('button',{name:'Enviar solicitud',exact:true}).click()
  await expect(a.page.getByText('Solicitud enviada',{exact:true})).toBeVisible()
  const b=await device(browser,'gabi')
  await expect(b.page.getByRole('heading',{name:'Hola, Gabi'})).toBeVisible()
  await b.page.goto('/amigos')
  await b.page.getByRole('button',{name:'Aceptar',exact:true}).click()
  await b.page.getByText('Tu foto y usuario',{exact:true}).click()
  await b.page.getByLabel('Foto para tus amigos').setInputFiles('public/icon-512.png')
  await expect(b.page.getByRole('img',{name:'Tu foto',exact:true})).toBeVisible()
  await b.page.getByText('Tu foto y usuario',{exact:true}).click()
  await a.page.getByRole('button',{name:'Actualizar amigos'}).click()
  await a.page.getByRole('button',{name:'Ver perfil de @gabi'}).click()
  await expect(a.page.getByRole('heading',{name:'@gabi',exact:true})).toBeVisible()
  await expect(a.page.getByText('375 EXP de cuenta',{exact:true})).toBeVisible()
  await expect(a.page.getByRole('img',{name:'Foto de gabi',exact:true})).toBeVisible()
  await expect(a.page.getByRole('heading',{name:'Lobo',exact:true})).toBeVisible()
  await expect(a.page.getByText('No compartió rutinas todavía.',{exact:true})).toBeVisible()
  await a.context.setOffline(true)
  await expect(a.page.getByText('Conectate para consultar el perfil y confirmar sus permisos.',{exact:true})).toBeVisible()
  await expect(a.page.locator('.comparison-panel')).toHaveCount(0)
  await a.context.setOffline(false)
  await expect(a.page.locator('.comparison-panel')).toBeVisible()
  await a.page.getByRole('button',{name:'7 días',exact:true}).click()
  await expect(a.page.locator('.comparison-loads')).toContainText('50 kg')
  await expect(a.page.locator('.comparison-loads')).toContainText('65 kg')
  await expect(a.page.getByRole('button',{name:'7 días',exact:true})).toHaveAttribute('aria-pressed','true')
  await b.page.getByLabel('Torso de Gabi',{exact:true}).check()
  await expect(b.page.getByText('Rutina compartida con tus amigos.',{exact:true})).toBeVisible()
  await a.page.getByRole('button',{name:'Actualizar perfil'}).click()
  await expect(a.page.getByRole('heading',{name:'Torso de Gabi',exact:true})).toBeVisible()
  await a.page.getByText('Ver ejercicios',{exact:true}).click()
  if(info.project.metadata.mobileAccessibility)expect((await new AxeBuilder({page:a.page}).withTags(['wcag2a','wcag2aa','wcag21aa']).analyze()).violations).toEqual([])
  expect(await a.page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBe(true)
  await a.page.screenshot({path:info.outputPath('perfil-comparacion.png'),fullPage:true})
  await a.page.getByRole('button',{name:'Copiar a Mis rutinas',exact:true}).click()
  await expect(a.page.getByText('Rutina guardada en Mis rutinas. Ya podés editarla y usarla.',{exact:true})).toBeVisible()
  await expect.poll(async()=>(await query("select data from training_items where owner=$1 and kind='routine'",[first])).length).toBe(1)
  expect(JSON.stringify(await query("select data from training_items where owner=$1 and kind='routine'",[first]))).not.toContain('SECRET_')
  await a.page.getByRole('link',{name:'Rutinas',exact:true}).click()
  await a.page.getByRole('button',{name:'Mis rutinas',exact:true}).click()
  await expect(a.page.getByText('Torso de Gabi',{exact:true})).toBeVisible()
  await b.page.getByRole('button',{name:'Compartir sesión',exact:true}).click()
  await a.page.goto('/amigos')
  const post=a.page.locator('.social-post').filter({hasText:'@gabi'})
  await post.getByRole('button',{name:'Celebrar',exact:true}).click()
  await expect(post).toContainText('1 celebración')
  await a.page.getByRole('button',{name:'Enviar desafío',exact:true}).click()
  await b.page.getByRole('button',{name:'Actualizar amigos'}).click()
  await b.page.getByRole('button',{name:'Aceptar desafío',exact:true}).click()
  // Simulate three elapsed training dates in the agreed challenge window, not future workouts.
  await query("update friend_challenges set starts_on=$1::date-2,ends_on=$1::date+4",[today])
  await b.page.getByRole('button',{name:'Actualizar amigos'}).click()
  await expect(b.page.getByText('Desafío completado',{exact:true})).toBeVisible()
  await expect(b.page.getByLabel('Tu avance en el desafío')).toHaveAttribute('value','3')
  await b.page.screenshot({path:info.outputPath('desafio-feed.png'),fullPage:true})
  if(info.project.metadata.mobileAccessibility)expect((await new AxeBuilder({page:b.page}).withTags(['wcag2a','wcag2aa','wcag21aa']).analyze()).violations).toEqual([])
  await a.page.getByRole('button',{name:'Ver perfil de @gabi'}).click()
  await expect(a.page.locator('.comparison-panel')).toBeVisible()
  await b.page.getByRole('button',{name:'Bloquear',exact:true}).click()
  await focus(a.page)
  await expect(a.page.getByRole('heading',{name:'Amigos',exact:true})).toBeVisible()
  await expect(a.page.getByRole('button',{name:'Ver perfil de @gabi'})).toHaveCount(0)
  await expect(a.page.locator('.social-post')).toHaveCount(0)
  await expect(a.page.locator('.social-challenge')).toHaveCount(0)
})

