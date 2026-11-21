import {expect,test} from 'vitest'
import {existsSync} from 'node:fs'
import {routineArtResources} from '../src/offline-art'
import {companions} from '../src/pet-species'
import {trainingMovements} from '../src/training-selection'
import {mobileItems} from './mobile-fixture'
import type {Exercise} from '../src/domain'

test('el material offline resuelve todas las especies y movimientos a archivos existentes',()=>{
  const template=mobileItems().find(row=>row.kind==='routine')!.data as any
  const exercise=template.days[0].exercises[0] as Exercise
  const days=Object.values(trainingMovements).flatMap(ids=>ids.map(catalogId=>({exercises:[{...exercise,catalogId}]})))
  for(const companion of companions){
    const paths=routineArtResources(companion,days)
    expect(new Set(paths).size).toBe(paths.length)
    for(const path of paths){
      expect(existsSync('public'+path.split('?')[0]),path).toBe(true)
      if(path.startsWith('/pet-training/'))expect(path).toMatch(/\.webp\?v=/)
    }
  }
})
