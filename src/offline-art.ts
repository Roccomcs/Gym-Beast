import {phoenixShortsArt} from './worn-garment'
import {exercisePoses} from './exercise-poses'
import {petTrainingSource,selectPetTraining} from './training-selection'
import atlasData from './pet-training-atlases.json'
import {artSource} from './art-source'
import {petSources} from './pet-species'
import type {Day} from './domain'
import type {ShopGood} from './shop-catalog'
import {rankCovers} from './routine-cover'

export function routineArtResources(companion:string,days:Pick<Day,'exercises'>[],outfit:ShopGood[]=[]){
  const species=petSources[companion]??'dragon'
  const paths=new Set(['/exercise-sprites.png','/exercise-poses/standing-single-leg-curl-v2.png','/pulldown-front.jpg','/program-covers-beast.webp',
    ...rankCovers,'/routine-covers/dev.svg',
    '/'+species+'-stages.webp',species==='dragon'?'/habitat.jpg':'/habitat-'+species+'.webp'])
  for(let i=1;i<=5;i++)paths.add('/exercise-atlas-'+i+'.jpg')
  for(const day of days){
    for(const exercise of day.exercises){const pose=exercise.catalogId?exercisePoses(exercise.catalogId,0):undefined;if(pose)paths.add(artSource(pose.image))}
    const selection=selectPetTraining(companion,day.exercises.map(e=>e.catalogId))
    const url=petTrainingSource(selection.companion,selection.exercise)
    if(url){const revision=atlasData[url as keyof typeof atlasData]?.revision;paths.add(artSource(url)+(revision?'?v='+revision:''))}
  }
  for(const item of outfit){
    if(item.slot==='top'||item.slot==='bottom'){
      const directory=item.art==='shirt'||item.art==='tee'?'/jerseys/':'/garments/'+item.art+'/'
      paths.add(directory+species+'.webp')
      if(item.id!=='boca')paths.add(directory+species+'-fabric.png')
      if(item.art==='pants'){paths.add('/garments/shorts/'+species+'.webp');paths.add('/garments/shorts/'+species+'-fabric.png')}
      if(item.id==='boca'&&species==='dragon')paths.add('/dragon-boca-cria.webp')
    }
    if(item.art==='fish')paths.add('/axolotl-stages.webp')
    if(item.art==='tiger')paths.add('/tiger-stages.webp')
  }
  if(species==='dragon'&&outfit.some(i=>i.id==='hoodie')&&outfit.some(i=>i.id==='watch'))paths.add('/wardrobe/dragon-cria-hoodie-watch-v2.png')
  if (species === 'phoenix' && outfit.some(item => item.art === 'shorts')) paths.add(phoenixShortsArt)
  return [...paths]
}

export async function cacheRoutineArt(paths:string[],signal?:AbortSignal){
  if(!('caches'in window))return false
  let ready=true,cursor=0
  await Promise.all(Array.from({length:3},async()=>{
    while(cursor<paths.length){
      if(signal?.aborted){ready=false;break}
      const path=paths[cursor++]
      try{
        const cache=await caches.open(path.startsWith('/pet-training/')?'gymbeast-pet-training-v2':'gymbeast-art-v1')
        if(signal?.aborted){ready=false;break}
        if(await cache.match(path))continue
        if(!navigator.onLine){ready=false;continue}
        // Let an in-flight image finish caching when changing screens. Aborting
        // its stream also interrupts Workbox's response copy in WebKit.
        if(signal?.aborted){ready=false;break}
        const response=await fetch(path)
        if(signal?.aborted){ready=false;break}
        if(!response.ok||!response.headers.get('content-type')?.startsWith('image/')){ready=false;continue}
        await cache.put(path,response)
      }catch{ready=false}
    }
  }))
  return ready
}

