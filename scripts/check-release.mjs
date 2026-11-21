import {readFile,readdir,stat,writeFile,mkdir} from 'node:fs/promises'
import {resolve,join} from 'node:path'
import {pathToFileURL} from 'node:url'
import {createHash} from 'node:crypto'

export async function inspectRelease(directory='dist',accounts=false){
  const root=resolve(directory),files=[]
  async function walk(dir){for(const entry of await readdir(dir,{withFileTypes:true})){
    if(entry.isSymbolicLink())throw new Error('La salida no debe contener enlaces externos')
    const path=join(dir,entry.name);if(entry.isDirectory())await walk(path);else files.push({path,bytes:(await stat(path)).size})
  }}
  await walk(root)
  if(files.length>20000||files.some(file=>file.bytes>25*1024*1024))throw new Error('Se superó un límite de archivos de Pages Free')
  if(files.some(file=>/\.(?:glb|gltf)$|(?:^|[/\\])\.env(?:\.|$)/i.test(file.path)))throw new Error('Hay recursos retirados o archivos de entorno en la salida')
  for(const path of ['index.html','sw.js','manifest.webmanifest','_redirects','_headers'])await stat(join(root,path))
  const manifest=JSON.parse(await readFile(join(root,'manifest.webmanifest'),'utf8'))
  if(manifest.display!=='standalone'||manifest.start_url!=='/'||!manifest.icons.some(icon=>icon.purpose==='maskable'))throw new Error('Manifest incompleto')
  for(const icon of manifest.icons)await stat(join(root,icon.src.replace(/^\//,'')))
  const redirects=await readFile(join(root,'_redirects'),'utf8')
  if(!redirects.includes('/* /index.html 200'))throw new Error('Falta navegación SPA')
  for(const file of files.filter(file=>file.path.endsWith('.js'))){
    const text=await readFile(file.path,'utf8')
    if(/sb_secret_[A-Za-z0-9_-]{20,}|GYMBEAST_ADMIN_SECRET|SUPABASE_SERVICE_ROLE_KEY/.test(text))throw new Error('Se encontró una referencia administrativa en el frontend')
  }
  if(accounts){
    const url=process.env.VITE_SUPABASE_URL,key=process.env.VITE_SUPABASE_PUBLISHABLE_KEY
    if(!url||!key||new URL(url).protocol!=='https:')throw new Error('Falta la conexión pública HTTPS de Supabase para compilar/publicar cuentas')
    const publicKey=key.startsWith('sb_publishable_')||(()=>{try{return JSON.parse(Buffer.from(key.split('.')[1],'base64url')).role==='anon'}catch{return false}})()
    if(!publicKey)throw new Error('La clave del frontend debe ser pública')
    const js=await Promise.all(files.filter(file=>file.path.endsWith('.js')).map(file=>readFile(file.path,'utf8')))
    if(!js.some(text=>text.includes(url)&&text.includes(key)))throw new Error('La salida no contiene la configuración de cuenta esperada: recompilá')
  }
  return {date:new Date().toISOString(),directory,files:files.length,totalBytes:files.reduce((n,file)=>n+file.bytes,0),
    largest:files.sort((a,b)=>b.bytes-a.bytes)[0].bytes,manifestSha256:createHash('sha256').update(JSON.stringify(manifest)).digest('hex'),accountsConfigurationVerified:accounts,
    publishedVerified:false,physicalPhonesVerified:false,pilotReady:false}
}
if(process.argv[1]&&pathToFileURL(resolve(process.argv[1])).href===import.meta.url){
  try{const result=await inspectRelease(process.argv.slice(2).find(arg=>!arg.startsWith('--'))??'dist',process.argv.includes('--accounts'))
    await mkdir('docs/qa/etapa-11',{recursive:true});await writeFile('docs/qa/etapa-11/release.json',JSON.stringify(result,null,2));console.log(JSON.stringify(result,null,2))
  }catch(error){console.error(error.message);process.exitCode=1}
}
