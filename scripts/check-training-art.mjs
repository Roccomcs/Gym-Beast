import {readFile} from 'node:fs/promises'
import {createHash} from 'node:crypto'
const report=JSON.parse(await readFile(new URL('../docs/qa/etapa-10/art-optimization.json',import.meta.url),'utf8'))
for(const entry of report.entries){
  for(const [path,hash]of [[entry.source,entry.sourceSha256],[entry.output,entry.outputSha256]]){
    const bytes=await readFile(new URL('../'+path,import.meta.url))
    if(createHash('sha256').update(bytes).digest('hex')!==hash)throw new Error('Regenerá las ilustraciones optimizadas: python scripts/optimize-training-art.py ('+path+')')
  }
}
console.log(report.entries.length+' ilustraciones optimizadas verificadas.')
