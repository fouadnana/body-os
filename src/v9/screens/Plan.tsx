// Écran "Plan — Semaine" (programme de la semaine). Extrait de V9App.tsx
// (Phase 6).
import { useMemo, useState } from 'react'
import type { DayPlan, Screen } from '../types'
import { DEFAULT_NUTRITION_SETTINGS, readSchedule, WEEKDAYS } from '../data'
import { NUTRITION_SETTINGS_KEY, readDailyLog, readJSON, readNutritionDaily, SCHEDULE_KEY, writeJSON } from '../storage'
import { computeNutritionAdherence, decideWeeklyVerdict, estimateWeeklyRate, isRappelDay, mondayIndex } from '../utils'
import { ProgramSheet } from '../components/Shared'

export function Plan({setScreen}:{setScreen:(s:Screen)=>void}){
 const [selected,setSelected]=useState(mondayIndex())
 const [schedule,setSchedule]=useState<DayPlan[]>(()=>readSchedule())
 const [programOpen,setProgramOpen]=useState(false)
 const monday=useMemo(()=>{const d=new Date();d.setDate(d.getDate()-mondayIndex());return d},[])
 const fmtDate=(d:Date)=>`${String(d.getDate()).padStart(2,'0')}/${String(d.getMonth()+1).padStart(2,'0')}`
 const sunday=useMemo(()=>{const d=new Date(monday);d.setDate(d.getDate()+6);return d},[monday])
 const saveSchedule=(s:DayPlan[])=>{writeJSON(SCHEDULE_KEY,s);setSchedule(s)}
 const dailyLog=readDailyLog()
 const stepsByDate=Object.fromEntries(dailyLog.filter(e=>e.steps!=null).map(e=>[e.date,e.steps!]))
 const days=WEEKDAYS.map((w,i)=>{
  const d=new Date(monday); d.setDate(monday.getDate()+i)
  const iso=d.toISOString().slice(0,10)
  const plan=schedule[i]
  const kind=plan==='Repos'?'Repos':plan==='Cardio'?'Cardio':plan==='L5-S1'?'Renforcement':isRappelDay(schedule,i)?'Rappel':'Musculation'
  return {abbr:w.slice(0,3).toUpperCase(),date:d.getDate(),plan,kind,steps:stepsByDate[iso]}
 })

 // Bloc latéral : même logique de décision que Adaptive Sèche (verdict +
 // adhérence nutrition réelle), pour un résumé cohérent entre les deux
 // écrans plutôt qu'un "92% / progrès excellents" figé.
 const nutritionSettings=readJSON(NUTRITION_SETTINGS_KEY,DEFAULT_NUTRITION_SETTINGS)
 const realWeeklyRate=estimateWeeklyRate(dailyLog)
 const verdict=decideWeeklyVerdict(realWeeklyRate,nutritionSettings.weeklyRate)
 const {loggedDays,adherencePct}=computeNutritionAdherence(readNutritionDaily(),nutritionSettings)
 const hasData=realWeeklyRate!=null||loggedDays>0
 const progressQualifier=adherencePct>=85?'excellents':adherencePct>=65?'bons':adherencePct>=40?'corrects':'à surveiller'
 const verdictNote=verdict==='MAINTENIR'
  ?'Aucun ajustement calorique nécessaire cette semaine.'
  :verdict==='RÉDUIRE'
  ?'Réduire légèrement les calories pourrait relancer la perte.'
  :'Remonter légèrement les calories protégerait le muscle.'
 const asideHeadline=hasData?`Tes progrès sont ${progressQualifier}.`:'Pas encore assez de données pour juger tes progrès.'

 return <main className="v9Page"><header className="v9TitleBar"><button onClick={()=>setScreen('plus')}>‹</button><div><b>PLAN — SEMAINE</b><small>{fmtDate(monday)} – {fmtDate(sunday)}</small></div><button className="v93Dots" onClick={()=>setProgramOpen(true)} aria-label="Modifier mon programme">◫</button></header><section className="v9Week">{days.map((d,i)=><article onClick={()=>setSelected(i)} className={i===selected?'active':''} key={d.abbr}><b>{d.abbr}</b><strong>{d.date}</strong><span><i>{d.plan}</i></span><em><i>{d.kind}</i></em><small>◌ {d.steps!=null?`${d.steps.toLocaleString('fr-FR')} pas`:'— pas'}</small></article>)}</section><section className="v9WeekGoal"><div><small>OBJECTIF DE LA SEMAINE</small><p>Continuer la sèche en préservant le muscle.<br/>Déficit modéré.<br/>Protéines hautes.<br/>Performances stables.</p></div><aside><b>{asideHeadline}</b><span>{hasData?verdictNote:'Complète ton suivi pour une recommandation fiable.'}</span><strong>{hasData?`${adherencePct}%`:'—'}</strong></aside></section>
  {programOpen&&<ProgramSheet schedule={schedule} close={()=>setProgramOpen(false)} onSave={saveSchedule}/>}
 </main>
}
