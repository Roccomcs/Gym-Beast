import {readFile,writeFile,stat,readdir} from 'node:fs/promises'
import {gzipSync} from 'node:zlib'
import {join} from 'node:path'
const output={}
for(const dir of ['dist','.auth-dist']){
  const html=await readFile(join(dir,'index.html'),'utf8')
  const paths=[...html.matchAll(/(?:src|href)="(\/assets\/[^"?]+)"/g)].map(match=>match[1])
  const initial=await Promise.all([...new Set(paths)].map(async path=>{const bytes=await readFile(join(dir,path));return {path,bytes:bytes.length,gzipBytes:gzipSync(bytes).length}}))
  const walk=async dir=>(await Promise.all((await readdir(dir,{withFileTypes:true})).map(async entry=>entry.isDirectory()?walk(join(dir,entry.name)):[join(dir,entry.name)]))).flat()
  const files=await walk(dir),sizes=await Promise.all(files.map(async path=>({path,bytes:(await stat(path)).size})))
  output[dir]={initial,initialBytes:initial.reduce((n,row)=>n+row.bytes,0),initialGzipBytes:initial.reduce((n,row)=>n+row.gzipBytes,0),publishedBytes:sizes.reduce((n,row)=>n+row.bytes,0),maxFile:sizes.sort((a,b)=>b.bytes-a.bytes)[0]}
}
await writeFile('docs/qa/etapa-10/build-report.json',JSON.stringify(output,null,2))
console.log(JSON.stringify(output,null,2))
