// Écran "Progress" (sèche, physique, perf) + ses sheets (photos
// d'évolution). Extrait de V9App.tsx (Phase 6).
import { useEffect, useState } from 'react'
import { Bar, BarChart, Line, LineChart, ResponsiveContainer, XAxis, YAxis } from 'recharts'
import type { EvolutionPhoto, MuscleGroup, Screen } from '../types'
import { DEFAULT_EVOLUTION_PHOTOS, DEFAULT_NUTRITION_SETTINGS, exportProgressData, muscleGroups } from '../data'
import { NUTRITION_SETTINGS_KEY, muscleMeasurementSeries, readDailyLog, readJSON, readWorkoutHistory, upsertDailyEntry } from '../storage'
import { fmt1, fmtDelta, fmtHistoryDate } from '../utils'
import { OptionsSheet } from '../components/Shared'
import { MeasurementsSheet } from './Today'

function compressEvolutionPhoto(file:File):Promise<string>{
 return new Promise((resolve,reject)=>{
  const reader=new FileReader()
  reader.onerror=()=>reject(new Error('Lecture impossible'))
  reader.onload=()=>{
   const image=new Image()
   image.onerror=()=>reject(new Error('Image invalide'))
   image.onload=()=>{
    const maxW=900,maxH=1200
    const ratio=Math.min(1,maxW/image.width,maxH/image.height)
    const canvas=document.createElement('canvas')
    canvas.width=Math.max(1,Math.round(image.width*ratio))
    canvas.height=Math.max(1,Math.round(image.height*ratio))
    const ctx=canvas.getContext('2d')
    if(!ctx){reject(new Error('Canvas indisponible'));return}
    ctx.drawImage(image,0,0,canvas.width,canvas.height)
    resolve(canvas.toDataURL('image/jpeg',.82))
   }
   image.src=String(reader.result)
  }
  reader.readAsDataURL(file)
 })
}

function EvolutionPhotosSheet({
 photos,
 close,
 onChange
}:{
 photos:EvolutionPhoto[]
 close:()=>void
 onChange:(photos:EvolutionPhoto[])=>void
}){
 const [selected,setSelected]=useState(photos.length?photos.length-1:0)
 const [busy,setBusy]=useState(false)
 const active=photos[selected]

 const addFiles=async(files:FileList|null)=>{
  if(!files?.length)return
  setBusy(true)
  try{
   const next=[...photos]
   for(const file of Array.from(files).slice(0,4)){
    if(!file.type.startsWith('image/'))continue
    const src=await compressEvolutionPhoto(file)
    const now=new Date()
    const date=now.toISOString().slice(0,10)
    const label=now.toLocaleDateString('fr-FR',{day:'2-digit',month:'2-digit'})
    next.push({id:`photo-${Date.now()}-${Math.random()}`,src,date,label})
   }
   const limited=next.slice(-8)
   onChange(limited)
   setSelected(Math.max(0,limited.length-1))
  } finally {setBusy(false)}
 }

 const replacePhoto=async(files:FileList|null)=>{
  if(!files?.[0]||!active)return
  setBusy(true)
  try{
   const src=await compressEvolutionPhoto(files[0])
   const next=photos.map((p,i)=>i===selected?{...p,src}:p)
   onChange(next)
  } finally {setBusy(false)}
 }

 const updateDate=(value:string)=>{
  const date=new Date(value+'T12:00:00')
  const label=Number.isNaN(date.getTime())?value:date.toLocaleDateString('fr-FR',{day:'2-digit',month:'2-digit'})
  onChange(photos.map((p,i)=>i===selected?{...p,date:value,label}:p))
 }

 const remove=()=>{
  if(!active)return
  const next=photos.filter((_,i)=>i!==selected)
  onChange(next)
  setSelected(Math.max(0,Math.min(selected,next.length-1)))
 }

 return <div className="v9SheetBack" onClick={close}>
  <section className="v982PhotoSheet" onClick={e=>e.stopPropagation()}>
   <header>
    <button onClick={close}>×</button>
    <div><small>PROGRESS</small><b>PHOTOS D’ÉVOLUTION</b></div>
    <label className="v982AddTop">＋<input type="file" accept="image/*" multiple onChange={e=>addFiles(e.target.files)}/></label>
   </header>

   <div className="v982PhotoHero">
    {active?<img src={active.src}/>:<div className="v982EmptyPhoto"><b>Aucune photo</b><small>Ajoute ta première photo d’évolution</small></div>}
    {active&&<span>{active.label}</span>}
   </div>

   <div className="v982PhotoTimeline">
    {photos.map((p,i)=><button key={p.id} className={i===selected?'active':''} onClick={()=>setSelected(i)}>
     <img src={p.src}/><small>{p.label}</small>
    </button>)}
    <label className="v982PhotoAddCard"><b>＋</b><small>Ajouter</small><input type="file" accept="image/*" multiple onChange={e=>addFiles(e.target.files)}/></label>
   </div>

   {active&&<div className="v982PhotoActions">
    <label>REMPLACER<input type="file" accept="image/*" onChange={e=>replacePhoto(e.target.files)}/></label>
    <label className="date">DATE<input type="date" value={active.date} onChange={e=>updateDate(e.target.value)}/></label>
    <button onClick={remove}>SUPPRIMER</button>
   </div>}

   <section className="v982Compare">
    <div><small>AVANT</small>{photos[0]?<img src={photos[0].src}/>:<i/>}</div>
    <span>→</span>
    <div><small>MAINTENANT</small>{photos.at(-1)?<img src={photos.at(-1)!.src}/>:<i/>}</div>
   </section>

   <p>Pour une comparaison fiable : même cadrage, même lumière, même distance et posture similaire.</p>
   {busy&&<div className="v982PhotoBusy">Préparation de la photo…</div>}
  </section>
 </div>
}

export function Progress({setScreen}:{setScreen:(s:Screen)=>void}){
 const [tab,setTab]=useState<'cut'|'physique'|'perf'>('cut'); const [muscle,setMuscle]=useState<MuscleGroup>('Pectoraux'); const [photos,setPhotos]=useState(false)
 const [optionsOpen,setOptionsOpen]=useState(false)
 const [evolutionPhotos,setEvolutionPhotos]=useState<EvolutionPhoto[]>(()=>{
  try{
   const raw=localStorage.getItem('body-os-evolution-photos-v1')
   return raw?JSON.parse(raw):DEFAULT_EVOLUTION_PHOTOS
  }catch{return DEFAULT_EVOLUTION_PHOTOS}
 })
 useEffect(()=>{
  try{localStorage.setItem('body-os-evolution-photos-v1',JSON.stringify(evolutionPhotos))}catch{}
 },[evolutionPhotos])
 const [measureOpen,setMeasureOpen]=useState(false)
 const workoutHistory=readWorkoutHistory()
 const muscleHistory=workoutHistory.filter(h=>h.group===muscle)
 const bestByDate=new Map<string,number>()
 muscleHistory.forEach(h=>bestByDate.set(h.date,Math.max(h.weight,bestByDate.get(h.date)??0)))
 const perfPoints=[...bestByDate.entries()].sort((a,b)=>a[0].localeCompare(b[0])).slice(-10).map(([date,v])=>({d:fmtHistoryDate(date).slice(0,5),v}))
 const perfChangePct=perfPoints.length>=2&&perfPoints[0].v>0?(perfPoints.at(-1)!.v-perfPoints[0].v)/perfPoints[0].v*100:null
 const perfLabel=perfChangePct==null?'EN ATTENTE':perfChangePct>1?'EN PROGRÈS':perfChangePct<-1?'EN BAISSE':'STABLE'
 const weekAgo=Date.now()-7*86400000
 const volumeThisWeek=workoutHistory.filter(h=>h.group===muscle&&new Date(h.date).getTime()>=weekAgo).length
 const bestWeightEver=muscleHistory.length?Math.max(...muscleHistory.map(h=>h.weight)):null
 const sessionsLogged=bestByDate.size
 const [dailyLog,setDailyLog]=useState(()=>readDailyLog())
 const latestDay=dailyLog.at(-1); const previousDay=dailyLog.at(-2)
 const weightPoints=dailyLog.filter(e=>e.weight!=null).slice(-14).map(e=>({d:fmtHistoryDate(e.date).slice(0,5),w:e.weight!}))
 const weightWeekDelta=latestDay?.weight!=null?fmtDelta(latestDay.weight,previousDay?.weight,'kg'):null
 const waistDelta=latestDay?.waist!=null?fmtDelta(latestDay.waist,previousDay?.waist,'cm'):null
 const bodyFatDelta=latestDay?.bodyFat!=null?fmtDelta(latestDay.bodyFat,previousDay?.bodyFat,'%'):null
 const nutritionSettings=readJSON(NUTRITION_SETTINGS_KEY,DEFAULT_NUTRITION_SETTINGS)
 const weighedDays=dailyLog.filter(e=>e.weight!=null)
 const spanDays=weighedDays.length>=2?(new Date(weighedDays.at(-1)!.date).getTime()-new Date(weighedDays[0].date).getTime())/86400000:0
 const realWeeklyRate=spanDays>=3?(weighedDays.at(-1)!.weight!-weighedDays[0].weight!)/spanDays*7:null
 const measurementSeries=muscleMeasurementSeries(dailyLog,muscle)
 const latestMeasurement=measurementSeries.at(-1)
 const previousMeasurement=measurementSeries.length>=2?measurementSeries[measurementSeries.length-2]:undefined
 const measureDelta=latestMeasurement?fmtDelta(latestMeasurement.value,previousMeasurement?.value,'cm'):null
 const muscleTrend=measurementSeries.slice(-10).map(p=>({d:fmtHistoryDate(p.date).slice(0,5),v:p.value}))
 const latestByMuscle=Object.fromEntries(muscleGroups.map(g=>[g,muscleMeasurementSeries(dailyLog,g).at(-1)?.value])) as Partial<Record<MuscleGroup,number>>
 const overlayFor=(g:MuscleGroup)=>g==='Pectoraux'?'chest':g==='Dos'?'back':g==='Épaules'?'shoulders':g==='Jambes'?'legs':'arms'
 const saveMeasurements=(patch:Partial<Record<MuscleGroup,number>>)=>{upsertDailyEntry({measurements:patch});setDailyLog(readDailyLog());setMeasureOpen(false)}
 return <main className="v9Page v94Progress"><header className="v9TitleBar"><button onClick={()=>setScreen('today')}>‹</button><div><b>PROGRESS</b></div><button className="v93Dots" onClick={()=>setOptionsOpen(true)}>☷</button></header>
  <div className="v9Segments v94MainSegments"><button className={tab==='cut'?'active':''} onClick={()=>setTab('cut')}>SÈCHE</button><button className={tab==='physique'?'active':''} onClick={()=>setTab('physique')}>PHYSIQUE</button><button className={tab==='perf'?'active':''} onClick={()=>setTab('perf')}>PERF.</button></div>
  {tab==='cut'&&<div className="v9TabFade"><section className="v9WeightCard"><div><small>POIDS</small>{weightWeekDelta&&<strong>{weightWeekDelta}</strong>}<i>vs mesure précédente</i><b>{latestDay?.weight!=null?fmt1(latestDay.weight):'—'} <em>kg</em></b></div>{weightPoints.length?<ResponsiveContainer width="100%" height={180}><LineChart data={weightPoints}><Line dataKey="w" stroke="#75eef0" strokeWidth={3} dot={{r:4,fill:'#d8fcff'}}/><XAxis dataKey="d" tick={{fill:'#90a8b2',fontSize:9}} axisLine={false}/><YAxis domain={['dataMin - 1','dataMax + 1']} tick={{fill:'#90a8b2',fontSize:9}} axisLine={false}/></LineChart></ResponsiveContainer>:<p className="v94NoData">Pas encore de mesure. Ajoute ton poids depuis Today pour voir ta courbe.</p>}</section><div className="v9ProgressGrid"><article><small>TOUR DE TAILLE</small><b>{latestDay?.waist!=null?latestDay.waist:'—'} <em>cm</em></b>{waistDelta&&<strong>{waistDelta}</strong>}</article><article><small>MASSE GRASSE</small><b>{latestDay?.bodyFat!=null?latestDay.bodyFat:'—'} <em>%</em></b>{bodyFatDelta&&<strong>{bodyFatDelta}</strong>}</article><article onClick={()=>setPhotos(true)}><small>PHOTOS</small><b>Voir</b><div className="v94PhotoPair"><img src={evolutionPhotos[0]?.src||"/body-os/v9-progress-athlete.png"}/><img src={evolutionPhotos.at(-1)?.src||"/body-os/v9-progress-athlete.png"}/></div></article></div><section className="v94RateCard"><div><small>RYTHME DE PERTE RÉEL</small><b>{realWeeklyRate!=null?`${realWeeklyRate>0?'+':''}${realWeeklyRate.toFixed(2).replace('.',',')} kg/sem`:'—'}</b></div><span>Objectif {String(nutritionSettings.weeklyRate).replace('.',',')} kg/sem · {weighedDays.length} mesure{weighedDays.length>1?'s':''}</span></section></div>}
  {tab==='physique'&&<div className="v9TabFade"><section className="v94Photos v982ProgressPhotos"><h3>PHOTOS D'ÉVOLUTION <button onClick={()=>setPhotos(true)}>＋ AJOUTER</button></h3><div>{evolutionPhotos.slice(-4).map((p,i)=><button key={p.id} onClick={()=>setPhotos(true)}><img src={p.src}/><small>{i===evolutionPhotos.slice(-4).length-1?'Aujourd’hui':p.label}</small></button>)}</div></section><section className="v9Impact"><span><small>DERNIÈRE MESURE</small><b>{latestMeasurement?`${latestMeasurement.value} cm`:'—'}</b>{measureDelta&&<strong>{measureDelta}</strong>}<em>{latestMeasurement?fmtHistoryDate(latestMeasurement.date):`${muscle} — pas encore mesuré`}</em></span><div className={'v94AthleteMini '+overlayFor(muscle)}><img src="/body-os/v9-progress-athlete.png"/><i></i><i></i></div></section><h3 className="v94Sub">ÉVOLUTION PAR MUSCLE <button onClick={()=>setMeasureOpen(true)}>＋ MESURER</button></h3><div className="v94MuscleChips">{muscleGroups.map(g=><button className={muscle===g?'active':''} onClick={()=>setMuscle(g)} key={g}>{g}</button>)}</div><section className="v94MuscleDetail"><div><small>{muscle.toUpperCase()}</small><b>{latestMeasurement?`${latestMeasurement.value} cm`:'—'}</b>{measureDelta&&<strong>{measureDelta}</strong>}<em>vs mesure précédente</em></div>{muscleTrend.length?<ResponsiveContainer width="100%" height={115}><LineChart data={muscleTrend}><Line dataKey="v" stroke="#78eff0" strokeWidth={2} dot={{r:3,fill:'#baffff'}}/><XAxis dataKey="d" tick={{fill:'#8ba6ad',fontSize:7}} axisLine={false}/><YAxis hide domain={['dataMin - 1','dataMax + 1']}/></LineChart></ResponsiveContainer>:<p className="v94NoData">Pas encore de mesure pour {muscle}. Touche ＋ MESURER pour commencer.</p>}</section></div>}
  {tab==='perf'&&<div className="v9TabFade"><section className="v94PerfHero"><small>PERFORMANCE EN SÈCHE</small><b>{perfLabel}</b>{perfChangePct!=null&&<strong>{perfChangePct>0?'+':''}{perfChangePct.toFixed(1).replace('.',',')} %</strong>}<p>{perfPoints.length>=2?'La force est maintenue malgré le déficit : bon signal pour la préservation musculaire.':'Enregistre des séries sur ce muscle pour voir ta progression réelle.'}</p></section><div className="v94MuscleChips">{muscleGroups.map(g=><button className={muscle===g?'active':''} onClick={()=>setMuscle(g)} key={g}>{g}</button>)}</div><section className="v9HistoryChart">{perfPoints.length?<ResponsiveContainer width="100%" height={210}><BarChart data={perfPoints}><Bar dataKey="v" fill="#8feef0" radius={[4,4,0,0]}/><YAxis hide domain={['dataMin - 5','dataMax + 5']}/><XAxis hide/></BarChart></ResponsiveContainer>:<p className="v94NoData">Pas encore de série enregistrée sur {muscle}.</p>}</section><section className="v94PerfStats"><span><small>VOLUME (7J)</small><b>{volumeThisWeek} série{volumeThisWeek>1?'s':''}</b></span><span><small>MEILLEUR POIDS</small><b>{bestWeightEver!=null?`${bestWeightEver} kg`:'—'}</b></span><span><small>SÉANCES</small><b>{sessionsLogged}</b></span></section></div>}
  {photos&&<EvolutionPhotosSheet photos={evolutionPhotos} close={()=>setPhotos(false)} onChange={setEvolutionPhotos}/>}
  {measureOpen&&<MeasurementsSheet latestByMuscle={latestByMuscle} close={()=>setMeasureOpen(false)} onSave={saveMeasurements}/>}
  {optionsOpen&&<OptionsSheet title="OPTIONS PROGRÈS" close={()=>setOptionsOpen(false)} options={[{label:'Exporter mes données (JSON)',onClick:exportProgressData}]}/>}
 </main>
}
