import {readFile,readdir,writeFile} from 'node:fs/promises'
import {join} from 'node:path'
const lock=JSON.parse(await readFile('package-lock.json','utf8')),notices=[],missing=[]
for(const [path,entry]of Object.entries(lock.packages)){
  if(!path.startsWith('node_modules/')||entry.dev||entry.devOptional)continue
  const pkg=JSON.parse(await readFile(join(path,'package.json'),'utf8'))
  const files=(await readdir(path)).filter(name=>/^licen[cs]e(?:\..*)?$|^ofl(?:\..*)?$/i.test(name))
  if(!files.length)missing.push(pkg.name)
  notices.push(pkg.name+' '+pkg.version+' — '+(pkg.license??entry.license??'ver paquete')+'\n'+
    (await Promise.all(files.map(async name=>name+'\n'+await readFile(join(path,name),'utf8')))).join('\n'))
}
const output='Dependencias de producción de GymBeast\nGenerado desde package-lock.json. Las ilustraciones y sus referencias se documentan en assets-licenses.md del repositorio.\n\n'+notices.join('\n\n'+'='.repeat(72)+'\n\n')
await writeFile('docs/third-party-notices.txt',output)
await writeFile('public/third-party-notices.txt',output)
console.log(JSON.stringify({packages:notices.length,missingLicenseFiles:missing}))
