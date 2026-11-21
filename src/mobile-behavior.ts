import {useEffect,useState} from 'react'
import {outfitFor} from './shop-catalog'
import type {Profile,Routine,Session} from './domain'

export function useMobileViewport(){
  useEffect(()=>{
    const viewport=window.visualViewport
    const update=()=>{
      const editing=document.activeElement instanceof HTMLInputElement||document.activeElement instanceof HTMLTextAreaElement
      const open=!!viewport&&editing&&window.innerHeight-viewport.height>120
      document.documentElement.dataset.keyboard=open?'open':'closed'
      document.documentElement.style.setProperty('--navigation-bottom',
        Math.max(0,window.innerHeight-(viewport?.height??window.innerHeight)-(viewport?.offsetTop??0))+'px')
      document.documentElement.style.setProperty('--keyboard-inset',open?Math.max(0,window.innerHeight-viewport!.height-viewport!.offsetTop)+'px':'0px')
      if(open)(document.activeElement as HTMLElement)?.scrollIntoView({block:'nearest',behavior:'instant'})
    }
    viewport?.addEventListener('resize',update);viewport?.addEventListener('scroll',update);window.addEventListener('resize',update);window.addEventListener('focusin',update);window.addEventListener('focusout',update)
    update()
    return()=>{viewport?.removeEventListener('resize',update);viewport?.removeEventListener('scroll',update);document.documentElement.style.removeProperty('--keyboard-inset');document.documentElement.style.removeProperty('--navigation-bottom');window.removeEventListener('resize',update);window.removeEventListener('focusin',update);window.removeEventListener('focusout',update);delete document.documentElement.dataset.keyboard}
  },[])
}

export function useScreenFocus(key:string,hash:string){
  useEffect(()=>{
    if(hash)return
    const main=document.querySelector('main')
    if(!main)return
    const focus=()=>{
      const heading=main.querySelector('h1')
      if(!heading)return false
      heading.setAttribute('tabindex','-1');heading.focus({preventScroll:true});return true
    }
    if(focus())return
    const observer=new MutationObserver(()=>{if(focus())observer.disconnect()})
    observer.observe(main,{subtree:true,childList:true})
    return()=>observer.disconnect()
  },[key,hash])
}

export function useOfflineRoutineArt(owner:string,profile:Profile,routine?:Routine,active?:Session){
  const [status,setStatus]=useState<'preparing'|'ready'|'unavailable'>('preparing')
  const [retry,setRetry]=useState(0)
  const key=JSON.stringify([owner,profile.companion,routine?.days.map(day=>day.exercises.map(e=>e.catalogId)),
    active?.companion,active?.exercises.map(e=>e.catalogId),profile.petOutfits,profile.equipped,profile.petGear])
  useEffect(()=>{
    if(!routine&&!active)return
    let live=true
    const controller=new AbortController()
    const leave=()=>controller.abort()
    window.addEventListener('pagehide',leave)
    setStatus('preparing')
    const timer=setTimeout(()=>{
      void import('./offline-art').then(async module=>{
        const paths=module.routineArtResources(profile.companion,routine?.days??[],outfitFor(profile,profile.companion))
        if(active)paths.push(...module.routineArtResources(active.companion??profile.companion,[{exercises:active.exercises}],outfitFor(profile,active.companion??profile.companion)))
        const ready=await module.cacheRoutineArt([...new Set(paths)],controller.signal)
        if(live)setStatus(ready?'ready':'unavailable')
      }).catch(()=>{if(live)setStatus('unavailable')})
    },600)
    return()=>{live=false;clearTimeout(timer);controller.abort();window.removeEventListener('pagehide',leave)}
  },[key,retry])
  useEffect(()=>{const refresh=()=>setRetry(n=>n+1);const restore=(event:PageTransitionEvent)=>{if(event.persisted)refresh()};window.addEventListener('online',refresh);window.addEventListener('pageshow',restore);return()=>{window.removeEventListener('online',refresh);window.removeEventListener('pageshow',restore)}},[])
  return {status,retry:()=>setRetry(n=>n+1)}
}

