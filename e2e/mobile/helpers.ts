import {expect,type Page} from '@playwright/test'
import type {Item} from '../../src/store'
export async function seedMobile(page:Page,rows:Item[]){
  await page.route('**/mobile-seed',route=>route.fulfill({contentType:'text/html',body:'<!doctype html><title>QA fixture</title>'}))
  await page.goto('/mobile-seed')
  await page.evaluate(async rows=>{
    localStorage.setItem('gymbeast-active-account','local')
    const db=await new Promise<IDBDatabase>((resolve,reject)=>{
      const r=indexedDB.open('gymbeast',50)
      r.onupgradeneeded=()=>{
        const db=r.result
        const items=db.createObjectStore('items',{keyPath:['owner','kind','id']});items.createIndex('owner','owner');items.createIndex('[owner+kind]',['owner','kind'])
        const ops=db.createObjectStore('operations',{keyPath:'op'});ops.createIndex('owner','owner');ops.createIndex('[owner+kind+id]',['owner','kind','id'])
        db.createObjectStore('rewards',{keyPath:['owner','session_id']}).createIndex('owner','owner')
        db.createObjectStore('onboarding',{keyPath:'owner'})
        db.createObjectStore('syncState',{keyPath:'owner'})
        db.createObjectStore('tombstones',{keyPath:['owner','kind','id']}).createIndex('owner','owner')
        db.createObjectStore('presentations',{keyPath:['owner','session']}).createIndex('owner','owner')
      }
      r.onsuccess=()=>resolve(r.result);r.onerror=()=>reject(r.error)
    })
    await new Promise<void>((resolve,reject)=>{
      const tx=db.transaction('items','readwrite');for(const row of rows)tx.objectStore('items').put(row)
      tx.oncomplete=()=>resolve();tx.onerror=()=>reject(tx.error)
    });db.close()
  },rows)
}
export async function noOverflow(page:Page){expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBe(true)}
