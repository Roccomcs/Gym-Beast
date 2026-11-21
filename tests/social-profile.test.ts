import {expect,test} from 'vitest'
import {comparableRecords,copySharedRoutine,type SocialSnapshot} from '../src/social-profile'
import {parseRoutine} from '../src/domain'
const snapshot=(records:SocialSnapshot['records'])=>({records} as SocialSnapshot)
test('compara solo igual variante y modalidad y convierte kg canónicos a lb',()=>{
  const record={movement:'bench-barbell',mode:'external',name:'Press banca',kg:45.359237,period_kg:45.359237}
  const a=snapshot([record]),b=snapshot([{...record,period_kg:50},{...record,movement:'bench-smith'},
    {...record,mode:'per-side'},{...record,movement:'curl',period_kg:null}])
  const comparison=comparableRecords(a,b,'lb')
  expect(comparison).toHaveLength(1);expect(comparison[0].mine).toBeCloseTo(100);expect(comparison[0].theirs).toBeCloseTo(110.231,2)
})
test('ejercicios propios con nombres iguales y UUID distintos no se comparan',()=>{
  const r={movement:'own-a',mode:'external',name:'Mi máquina',kg:50,period_kg:50}
  expect(comparableRecords(snapshot([r]),snapshot([{...r,movement:'own-b'}]),'kg')).toEqual([])
})
test('copiar conserva la prescripción y los grupos, pero separa IDs y elimina datos privados',()=>{
  const days=parseRoutine('Día 1\nSuperserie vuelos (2x)\nVuelos laterales 10\nVuelos frontales con disco 10')
  const source={name:'Compartida',version:5,source:'SECRET_SOURCE',days:days.map(day=>({...day,exercises:day.exercises.map(e=>({...e,notes:'SECRET_NOTE'}))})),history:[{secret:true}],photo:null}
  const copy=copySharedRoutine(source)
  expect(copy.version).toBe(1);expect(copy.source).toBe('');expect(copy.history).toBeUndefined()
  expect(copy.days[0].id).not.toBe(days[0].id)
  expect(copy.days[0].exercises.map(e=>e.load)).toEqual([null,null])
  expect(copy.days[0].exercises[0].superset?.id).toBe(copy.days[0].exercises[1].superset?.id)
  expect(copy.days[0].exercises[0].superset?.id).not.toBe(days[0].exercises[0].superset?.id)
  expect(JSON.stringify(copy)).not.toContain('SECRET_')
})
test('la copia rechaza fotos remotas y contenido mal formado antes de guardarse',()=>{
  const source={name:'Rutina',version:1,days:parseRoutine('Día 1\nPress banca 3x10 60')}
  expect(()=>copySharedRoutine({...source,photo:'https://example.com/tracking.jpg'})).toThrow()
  expect(()=>copySharedRoutine({...source,days:[]})).toThrow()
})
