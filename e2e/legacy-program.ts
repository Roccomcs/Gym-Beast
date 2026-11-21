import {expect,type Page} from '@playwright/test'
import {programRoutine,programs} from '../src/programs'

// Preserve coverage of routines saved before the three-program library.
// They remain valid user data even though they are no longer in Explore.
export async function selectLegacyProgram(page:Page,index=0){
  await page.evaluate(async data=>{
    const owner=localStorage.getItem('gymbeast-active-account')??'local',id='legacy-'+data.name
    const db=await new Promise<IDBDatabase>((resolve,reject)=>{const r=indexedDB.open('gymbeast');r.onsuccess=()=>resolve(r.result);r.onerror=()=>reject(r.error)})
    await new Promise<void>((resolve,reject)=>{
      const tx=db.transaction(['items','operations','syncState'],'readwrite'),items=tx.objectStore('items'),found=items.get([owner,'routine',id])
      found.onsuccess=()=>{if(found.result)return;items.put({owner,kind:'routine',id,version:1,data})
        if(owner!=='local'){
          const stateStore=tx.objectStore('syncState'),get=stateStore.get(owner)
          get.onsuccess=()=>{const state=get.result??{owner,cursor:0,nextOperation:0};const sequence=state.nextOperation+1
            tx.objectStore('operations').put({owner,kind:'routine',id,base:0,op:crypto.randomUUID(),action:'put',data,sequence});stateStore.put({...state,nextOperation:sequence})}
        }
      }
      tx.oncomplete=()=>resolve();tx.onerror=()=>reject(tx.error)
    })
    db.close();window.dispatchEvent(new Event('gymbeast-save'))
  },programRoutine(programs[index]))
  // A fixture writes through native IndexedDB, outside Dexie's mutation bus.
  // Reopen the screen like a returning user so its live queries read the seed.
  await page.reload()
  await page.getByRole('button',{name:'Mis rutinas',exact:true}).click()
  await expect(page.getByText(programs[index].name,{exact:true})).toBeVisible()
}
