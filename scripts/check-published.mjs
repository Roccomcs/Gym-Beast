const base=process.argv[2]
if(!base){console.error('Uso: npm run check:published -- https://tu-proyecto.pages.dev');process.exit(1)}
try{
  const url=new URL(base)
  if(url.protocol!=='https:')throw new Error('La prueba publicada requiere HTTPS')
  const get=async path=>{const response=await fetch(new URL(path,url),{signal:AbortSignal.timeout(20000),cache:'no-store'});if(!response.ok)throw new Error(path+': HTTP '+response.status);return response}
  for(const path of ['/','/entrenar','/perfil']){
    const response=await get(path)
    if(!(await response.text()).includes('<title>GymBeast</title>'))throw new Error('Falló navegación SPA: '+path)
    if(response.headers.get('x-content-type-options')!=='nosniff')throw new Error('Faltan encabezados de publicación')
  }
  const manifest=await(await get('/manifest.webmanifest')).json()
  if(manifest.display!=='standalone')throw new Error('Manifest incorrecto')
  for(const icon of manifest.icons)if(!(await get('/'+icon.src.replace(/^\//,''))).headers.get('content-type')?.startsWith('image/'))throw new Error('Ícono incorrecto')
  if(!(await(await get('/sw.js')).text()).includes('precacheAndRoute'))throw new Error('Service worker incorrecto')
  if(process.env.VITE_SUPABASE_URL){
    const response=await fetch(new URL('/functions/v1/accounts',process.env.VITE_SUPABASE_URL),{method:'OPTIONS',headers:{Origin:url.origin,'Access-Control-Request-Method':'POST'},signal:AbortSignal.timeout(20000)})
    if(response.status!==204||response.headers.get('access-control-allow-origin')!==url.origin)throw new Error('Origen de cuentas no autorizado')
  }
  console.log('HTTPS, navegación, manifest, íconos y service worker correctos. Falta recorrer altas, entrenamiento y sincronización con dos cuentas reales y teléfonos.')
}catch(error){console.error(error.message);process.exitCode=1}
