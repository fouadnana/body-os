// Écran "Today" (accueil) + ses sheets de saisie (mesure du jour, mesures
// corporelles). Extrait de V9App.tsx (Phase 6).
import { useMemo, useState } from 'react'
import type { DailyEntry, DayPlan, Meal, MuscleGroup, Screen } from '../types'
import { DEFAULT_NUTRITION_SETTINGS, meals, muscleGroups, readSchedule } from '../data'
import {
 NUTRITION_MEALS_KEY, NUTRITION_SETTINGS_KEY, SCHEDULE_KEY,
 readDailyLog, readJSON, upsertDailyEntry, writeJSON,
} from '../storage'
import { fmt1, fmtDelta, isRappelDay, mondayIndex } from '../utils'
import { BottomNav, InfoSheet, ProgramSheet } from '../components/Shared'

export function QuickLogSheet({latest,close,onSave}:{latest:DailyEntry|undefined,close:()=>void,onSave:(patch:Partial<DailyEntry>)=>void}){
 const [weight,setWeight]=useState(latest?.weight!=null?String(latest.weight):'')
 const [waist,setWaist]=useState(latest?.waist!=null?String(latest.waist):'')
 const [steps,setSteps]=useState(latest?.steps!=null?String(latest.steps):'')
 const [bodyFat,setBodyFat]=useState(latest?.bodyFat!=null?String(latest.bodyFat):'')
 const save=()=>{
  const patch:Partial<DailyEntry>={}
  if(weight.trim()) patch.weight=Math.round(parseFloat(weight.replace(',','.'))*10)/10
  if(waist.trim()) patch.waist=Math.round(parseFloat(waist.replace(',','.'))*10)/10
  if(steps.trim()) patch.steps=Math.round(parseFloat(steps.replace(',','.')))
  if(bodyFat.trim()) patch.bodyFat=Math.round(parseFloat(bodyFat.replace(',','.'))*10)/10
  onSave(patch); close()
 }
 return <div className="v9SheetBack" onClick={close}><section className="v103Sheet" onClick={e=>e.stopPropagation()}>
  <header><button onClick={close}>×</button><div><b>MESURE DU JOUR</b><small>Les données restent modifiables</small></div><span></span></header>
  <label>POIDS (KG)<input inputMode="decimal" value={weight} onChange={e=>setWeight(e.target.value)} placeholder="ex. 107,0"/></label>
  <label>TOUR DE TAILLE (CM)<input inputMode="decimal" value={waist} onChange={e=>setWaist(e.target.value)} placeholder="ex. 97"/></label>
  <label>MASSE GRASSE (%) — optionnel<input inputMode="decimal" value={bodyFat} onChange={e=>setBodyFat(e.target.value)} placeholder="ex. 18,5"/></label>
  <label>PAS<input inputMode="numeric" value={steps} onChange={e=>setSteps(e.target.value)} placeholder="ex. 8000"/></label>
  <button className="v9Primary" onClick={save}>ENREGISTRER</button>
 </section></div>
}

export function MeasurementsSheet({latestByMuscle,close,onSave}:{latestByMuscle:Partial<Record<MuscleGroup,number>>,close:()=>void,onSave:(patch:Partial<Record<MuscleGroup,number>>)=>void}){
 const [draft,setDraft]=useState<Record<MuscleGroup,string>>(()=>Object.fromEntries(muscleGroups.map(g=>[g,''])) as Record<MuscleGroup,string>)
 const save=()=>{
  const patch:Partial<Record<MuscleGroup,number>>={}
  muscleGroups.forEach(g=>{
   const v=draft[g].trim()
   if(v) patch[g]=Math.round(parseFloat(v.replace(',','.'))*10)/10
  })
  if(Object.keys(patch).length) onSave(patch)
  close()
 }
 return <div className="v9SheetBack" onClick={close}><section className="v103Sheet" onClick={e=>e.stopPropagation()}>
  <header><button onClick={close}>×</button><div><b>MESURES CORPORELLES</b><small>Laisse vide ce que tu ne mesures pas aujourd'hui</small></div><span></span></header>
  {muscleGroups.map(g=><label key={g}>{g.toUpperCase()} (CM)<input inputMode="decimal" value={draft[g]} onChange={e=>setDraft({...draft,[g]:e.target.value})} placeholder={latestByMuscle[g]!=null?`dernière : ${latestByMuscle[g]} cm`:'ex. 106'}/></label>)}
  <button className="v9Primary" onClick={save}>ENREGISTRER</button>
 </section></div>
}

export function Today({setScreen}:{setScreen:(s:Screen)=>void}){
 const [log,setLog]=useState<DailyEntry[]>(()=>readDailyLog())
 const [schedule,setSchedule]=useState<DayPlan[]>(()=>readSchedule())
 const [logOpen,setLogOpen]=useState(false)
 const [programOpen,setProgramOpen]=useState(false)
 const [cardioOpen,setCardioOpen]=useState(false)
 const nutrition=useMemo(()=>({
  meals:readJSON<Meal[]>(NUTRITION_MEALS_KEY,meals),
  settings:readJSON(NUTRITION_SETTINGS_KEY,DEFAULT_NUTRITION_SETTINGS)
 }),[])
 const consumedKcal=nutrition.meals.reduce((s,m)=>s+m.kcal,0)
 const consumedProtein=Math.round(nutrition.meals.reduce((s,m)=>s+m.protein,0))
 const latest=log.at(-1); const previous=log.at(-2)
 const weightDelta=latest?.weight!=null?fmtDelta(latest.weight,previous?.weight,'kg'):null
 const waistDelta=latest?.waist!=null?fmtDelta(latest.waist,previous?.waist,'cm'):null
 const plan=schedule[mondayIndex()]
 const planIsRappel=isRappelDay(schedule,mondayIndex())
 const saveLog=(patch:Partial<DailyEntry>)=>setLog(upsertDailyEntry(patch))
 const saveSchedule=(s:DayPlan[])=>{writeJSON(SCHEDULE_KEY,s);setSchedule(s)}
 return <main className="v104Today" aria-label="BODY OS Today">
   <header className="v104Top">
    <div className="v104Brand"><i></i><span><b>BODY OS</b><small>TON CORPS. TON SYSTÈME.</small></span></div>
    <button aria-label="Modifier mon programme" onClick={()=>setProgramOpen(true)}>⚙</button>
   </header>

   <section className="v104Hero">
    <div className="v104Mode"><b>{nutrition.settings.goal} <i></i></b><small>{log.length} mesure{log.length>1?'s':''} enregistrée{log.length>1?'s':''}</small></div>
    <div className="v104HeroArt"><img src="/body-os/v9-progress-athlete.png" alt="Athlète BODY OS"/></div>
    <button className="v104Metric v104Weight" onClick={()=>setLogOpen(true)}><small>POIDS</small><b>{latest?.weight!=null?fmt1(latest.weight):'—'} <em>kg</em></b>{weightDelta&&<strong>{weightDelta}</strong>}<span>{latest?.weight!=null?'toucher pour mettre à jour':'ajouter une mesure'}</span></button>
    <button className="v104Metric v104Waist" onClick={()=>setLogOpen(true)}><small>TOUR DE TAILLE</small><b>{latest?.waist!=null?latest.waist:'—'} <em>cm</em></b>{waistDelta&&<strong>{waistDelta}</strong>}<span>{latest?.waist!=null?'toucher pour mettre à jour':'ajouter une mesure'}</span></button>
    <button className="v104Trajectory" onClick={()=>setScreen('adaptive')}><span>TRAJECTOIRE</span><i></i><b>{previous&&latest&&latest.weight!=null&&previous.weight!=null?(latest.weight<=previous.weight?'OPTIMALE':'À SURVEILLER'):'EN ATTENTE'}</b><strong>›</strong></button>
   </section>

   <section className="v104TodayBlock">
    <h2>AUJOURD'HUI</h2>
    <div className="v104Kpis">
     <button onClick={()=>setScreen('nutrition')}><i className="fire">♨</i><small>CALORIES</small><b>{consumedKcal}</b><span>sur {nutrition.settings.calories} kcal</span></button>
     <button onClick={()=>setScreen('nutrition')}><i className="protein">◯</i><small>PROTÉINES</small><b>{consumedProtein}</b><span>g sur {nutrition.settings.protein} g</span></button>
     <button className="v104Train" onClick={()=>plan==='Cardio'?setCardioOpen(true):setScreen('workout')}><i className="train">✣</i><small>ENTRAÎNEMENT</small><b>{plan}</b>{planIsRappel&&<span className="v104Rappel">RAPPEL</span>}</button>
     <button onClick={()=>setLogOpen(true)}><i className="steps">♧</i><small>ACTIVITÉ</small><b>{latest?.steps!=null?latest.steps.toLocaleString('fr-FR'):'—'}</b><span>pas</span></button>
    </div>
   </section>

   <button className="v104AdaptiveCard" onClick={()=>setScreen('adaptive')}>
    <span className="brain">✦</span><span><b>Adaptive Sèche</b><small>Analyse de ta progression</small></span><strong>›</strong>
   </button>

   <BottomNav screen="today" setScreen={setScreen}/>
   {logOpen&&<QuickLogSheet latest={latest} close={()=>setLogOpen(false)} onSave={saveLog}/>}
   {programOpen&&<ProgramSheet schedule={schedule} close={()=>setProgramOpen(false)} onSave={saveSchedule}/>}
   {cardioOpen&&<InfoSheet title="CARDIO DU JOUR" close={()=>setCardioOpen(false)}>
    <div className="v103Why">
     <b>25 à 35 minutes en endurance légère (LISS)</b>
     <p>Marche rapide/inclinée, vélo ou rameur, à une intensité où tu peux encore parler sans être essoufflé (zone 2). Pas de fractionné/HIIT pendant la sèche : ça tape trop dans la récupération et entre en compétition avec la musculation.</p>
     <small>POURQUOI CE JOUR-LÀ</small>
     <strong>Récupération active</strong>
     <p>Le déficit calorique vient de l'alimentation, pas du cardio — ce n'est pas obligatoire. Fais-le si tu en as envie, si ton rythme de perte réel (Progress) est en dessous de l'objectif, ou simplement pour la santé cardiovasculaire.</p>
    </div>
   </InfoSheet>}
 </main>
}
