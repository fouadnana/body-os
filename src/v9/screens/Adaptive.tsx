// Écran "Adaptive Sèche" (intelligence adaptative). Extrait de V9App.tsx
// (Phase 6).
import { useState } from 'react'
import { Line, LineChart, ResponsiveContainer, XAxis, YAxis } from 'recharts'
import type { DailyEntry, Screen } from '../types'
import { DEFAULT_NUTRITION_SETTINGS } from '../data'
import { NUTRITION_SETTINGS_KEY, readDailyLog, readJSON, readNutritionDaily, readWorkoutHistory, todayISO, upsertDailyEntry } from '../storage'
import { computeNutritionAdherence, decideWeeklyVerdict, estimateWeeklyRate, fmt1, fmtDelta, fmtHistoryDate } from '../utils'
import { InfoSheet } from '../components/Shared'

export function AdaptiveIntelligence({setScreen}:{setScreen:(s:Screen)=>void}){
 const [checkinOpen,setCheckinOpen]=useState(false)
 const [decisionOpen,setDecisionOpen]=useState(false)
 const [dailyLog,setDailyLog]=useState(readDailyLog())
 const latestDaily=dailyLog.at(-1)
 const [checkin,setCheckin]=useState({
  weight:latestDaily?.weight!=null?String(latestDaily.weight):'',
  waist:latestDaily?.waist!=null?String(latestDaily.waist):'',
  sleep:latestDaily?.sleep??7,
  energy:latestDaily?.energy??4,
  hunger:latestDaily?.hunger??3,
  recovery:latestDaily?.recovery??4,
 })
 const saveCheckin=()=>{
  // Sommeil/énergie/faim/récupération étaient saisis mais jamais sauvegardés
  // (seuls poids/taille étaient persistés) — perdus à la fermeture de la
  // sheet sans que rien ne le signale.
  const patch:Partial<DailyEntry>={sleep:checkin.sleep,energy:checkin.energy,hunger:checkin.hunger,recovery:checkin.recovery}
  if(checkin.weight.trim()) patch.weight=Math.round(parseFloat(checkin.weight.replace(',','.'))*10)/10
  if(checkin.waist.trim()) patch.waist=Math.round(parseFloat(checkin.waist.replace(',','.'))*10)/10
  upsertDailyEntry(patch); setDailyLog(readDailyLog()); setCheckinOpen(false)
 }
 const weightPoints=dailyLog.filter(e=>e.weight!=null).slice(-14).map(e=>({d:fmtHistoryDate(e.date).slice(0,5),w:e.weight!}))
 const weighedDays=dailyLog.filter(e=>e.weight!=null)
 const latestWeight=weighedDays.at(-1)?.weight
 const previousWeight=weighedDays.length>=2?weighedDays[weighedDays.length-2].weight:undefined
 const trendStatus=latestWeight!=null&&previousWeight!=null?(latestWeight<=previousWeight?'OPTIMALE':'À SURVEILLER'):'EN ATTENTE'
 const realWeeklyRate=estimateWeeklyRate(dailyLog)
 const nutritionSettings=readJSON(NUTRITION_SETTINGS_KEY,DEFAULT_NUTRITION_SETTINGS)
 const preservation=94
 // Adhérence nutrition réelle sur les 7 derniers jours calendaires, à partir
 // du même journal quotidien que l'onglet SEMAINE/MOIS de Nutrition : un
 // jour est "dans la cible" si kcal/protéines sont à ±10% de l'objectif
 // configuré. Remplace les 91%/87%/94%/6-7 auparavant figés.
 const {loggedDays,caloriesPct:caloriesAdherencePct,proteinPct:proteinAdherencePct,adherencePct:adherence}=computeNutritionAdherence(readNutritionDaily(),nutritionSettings)
 const adherenceLabel=loggedDays===0?'EN ATTENTE':adherence>=85?'TRÈS BON':adherence>=65?'BON':adherence>=40?'MOYEN':'À AMÉLIORER'
 // Numéro de semaine réel depuis la toute première donnée suivie (poids/taille
 // ou séance), plutôt qu'un "SEMAINE 7" figé sans rapport avec l'usage réel.
 const workoutHistory=readWorkoutHistory()
 const allTrackedDates=[...dailyLog.map(e=>e.date),...workoutHistory.map(h=>h.date)]
 const earliestTrackedDate=allTrackedDates.length?allTrackedDates.slice().sort()[0]:todayISO()
 const daysSinceStart=Math.max(0,Math.floor((Date.now()-new Date(earliestTrackedDate+'T00:00:00').getTime())/86400000))
 const weekNumber=Math.floor(daysSinceStart/7)+1

 // Décision de la semaine : calculée à partir des vraies données plutôt que
 // figée sur "MAINTENIR". Par défaut (données insuffisantes), le moteur ne
 // suggère rien — cohérent avec le garde-fou "aucun changement automatique".
 // Il ne bascule vers RÉDUIRE/AUGMENTER que si le rythme de perte réel
 // (déjà calculé ci-dessus) s'écarte clairement de l'objectif configuré.
 const findWeekAgoEntry=(field:'weight'|'waist')=>{
  const withField=dailyLog.filter(e=>e[field]!=null)
  const latest=withField.at(-1)
  if(!latest) return {latest:undefined,weekAgo:undefined}
  const cutoff=new Date(latest.date).getTime()-7*86400000
  const weekAgo=withField.filter(e=>new Date(e.date).getTime()<=cutoff).at(-1)
  return {latest,weekAgo}
 }
 const weekDeltaText=(curr:number|undefined,prev:number|undefined,unit:string)=>{
  if(curr==null||prev==null) return '—'
  return fmtDelta(curr,prev,unit) ?? `0,0 ${unit}`
 }
 const weightWeek=findWeekAgoEntry('weight')
 const waistWeek=findWeekAgoEntry('waist')
 const weight7dText=weekDeltaText(weightWeek.latest?.weight,weightWeek.weekAgo?.weight,'kg')
 const waist7dText=weekDeltaText(waistWeek.latest?.waist,waistWeek.weekAgo?.waist,'cm')

 const dayMs=86400000
 const recentSets=workoutHistory.filter(h=>Date.now()-new Date(h.date).getTime()<7*dayMs)
 const priorSets=workoutHistory.filter(h=>{const age=Date.now()-new Date(h.date).getTime();return age>=7*dayMs&&age<14*dayMs})
 const avgWeight=(sets:typeof workoutHistory)=>sets.length?sets.reduce((s,x)=>s+x.weight,0)/sets.length:null
 const recentAvgWeight=avgWeight(recentSets)
 const priorAvgWeight=avgWeight(priorSets)
 const perfChangePct=recentAvgWeight!=null&&priorAvgWeight!=null&&priorAvgWeight>0?(recentAvgWeight-priorAvgWeight)/priorAvgWeight*100:null
 const perfLabel=perfChangePct==null?'EN ATTENTE':perfChangePct>3?'EN HAUSSE':perfChangePct<-5?'EN BAISSE':'STABLE'

 const verdict=decideWeeklyVerdict(realWeeklyRate,nutritionSettings.weeklyRate)
 const verdictIcon=verdict==='MAINTENIR'?'✓':verdict==='RÉDUIRE'?'↓':'↑'
 const verdictVerb=verdict==='MAINTENIR'?'maintenir':verdict==='RÉDUIRE'?'réduire à':'augmenter à'
 const calorieStep=150
 const displayCalories=verdict==='MAINTENIR'?nutritionSettings.calories:verdict==='RÉDUIRE'?nutritionSettings.calories-calorieStep:nutritionSettings.calories+calorieStep
 const targetRateText=String(nutritionSettings.weeklyRate).replace('.',',')

 const decisionFacts:string[]=[]
 if(weight7dText!=='—') decisionFacts.push(`poids ${weight7dText} sur 7 jours`)
 if(waist7dText!=='—') decisionFacts.push(`tour de taille ${waist7dText}`)
 if(perfLabel!=='EN ATTENTE') decisionFacts.push(`performances ${perfLabel.toLowerCase()}`)
 if(loggedDays>0) decisionFacts.push(`adhérence ${adherenceLabel.toLowerCase()}`)
 const decisionSummary=decisionFacts.length
  ?`Cette semaine : ${decisionFacts.join(', ')}.`
  :'Pas encore assez de données cette semaine : complète ton check-in pour affiner la recommandation.'
 const verdictLead=verdict==='MAINTENIR'
  ?'La trajectoire est cohérente avec ton objectif.'
  :verdict==='RÉDUIRE'
  ?'Le rythme de perte est plus lent que ton objectif.'
  :'Le rythme de perte dépasse ton objectif — mieux vaut remonter un peu pour préserver le muscle.'

 const explainBody=realWeeklyRate==null
  ?"Pas encore assez de pesées pour calculer un rythme de perte fiable — le moteur ne propose rien tant qu'il n'a pas de tendance sur plusieurs jours."
  :verdict==='MAINTENIR'
  ?`Ton rythme de perte réel (${realWeeklyRate>0?'+':''}${realWeeklyRate.toFixed(2).replace('.',',')} kg/sem) est proche de ton objectif (${targetRateText} kg/sem). Pas de raison évidente de changer les calories pour l'instant.`
  :verdict==='RÉDUIRE'
  ?`Ton rythme de perte réel (${realWeeklyRate.toFixed(2).replace('.',',')} kg/sem) est plus lent que ton objectif (${targetRateText} kg/sem). Réduire légèrement les calories devrait relancer la perte sans à-coup.`
  :`Ton rythme de perte réel (${realWeeklyRate>0?'+':''}${realWeeklyRate.toFixed(2).replace('.',',')} kg/sem) dépasse ton objectif (${targetRateText} kg/sem). Remonter légèrement les calories protège la masse musculaire.`

 const confidenceSignals=[realWeeklyRate!=null,waist7dText!=='—',perfChangePct!=null,loggedDays>0].filter(Boolean).length
 const confidencePct=Math.round(confidenceSignals/4*100)
 const confidenceLabel=confidencePct>=75?'ÉLEVÉE':confidencePct>=50?'MODÉRÉE':confidencePct>0?'LIMITÉE':'INSUFFISANTE'
 return <main className="v9Page v103Adaptive">
  <header className="v9TitleBar"><button onClick={()=>setScreen('today')}>‹</button><div><b>ADAPTIVE SÈCHE</b><small>INTELLIGENCE · SEMAINE {weekNumber}</small></div><span className="v103Live">● ACTIF</span></header>

  <section className="v103Decision">
   <div className="v103DecisionTop"><span><small>DÉCISION DE LA SEMAINE</small><b>{verdict}</b></span><strong>{verdictIcon}</strong></div>
   <p>{verdictLead} {decisionSummary}</p>
   <div className="v103DecisionMetrics"><span><small>POIDS 7J</small><b>{weight7dText}</b></span><span><small>TAILLE</small><b>{waist7dText}</b></span><span><small>PERF.</small><b>{perfLabel}</b></span></div>
   <button onClick={()=>setDecisionOpen(true)}>{displayCalories.toLocaleString('fr-FR')} KCAL {verdict==='MAINTENIR'?'MAINTENUES':'SUGGÉRÉS'} <b>›</b></button>
  </section>

  <section className="v103Trend">
   <header><div><small>TRAJECTOIRE 14 JOURS</small><b>{latestWeight!=null?`${fmt1(latestWeight)} kg`:'—'}</b></div><span>{trendStatus}</span></header>
   {weightPoints.length?<ResponsiveContainer width="100%" height={180}><LineChart data={weightPoints}><Line type="monotone" dataKey="w" stroke="#77eff0" strokeWidth={3} dot={{r:4,fill:'#d9ffff'}}/><XAxis dataKey="d" tick={{fill:'#829ca7',fontSize:9}} axisLine={false}/><YAxis domain={['dataMin - 1','dataMax + 1']} hide/></LineChart></ResponsiveContainer>:<p className="v94NoData">Pas encore de mesure. Complète le check-in pour voir ta courbe.</p>}
   <div className="v103Trajectory"><span>RÉEL {realWeeklyRate!=null?`${realWeeklyRate>0?'+':''}${realWeeklyRate.toFixed(2).replace('.',',')} kg/sem`:''}</span><i></i><span>OBJECTIF {String(nutritionSettings.weeklyRate).replace('.',',')} kg/sem.</span></div>
  </section>

  <div className="v103ScoreGrid">
   <section><small>MUSCLE PRESERVATION</small><div className="v103Ring"><b>{preservation}</b><em>/100</em></div><strong>EXCELLENT</strong><p>Force stable · protéines hautes · rythme de perte maîtrisé.</p></section>
   <section><small>ADHÉRENCE NUTRITION</small><div className="v103Ring"><b>{adherence}</b><em>%</em></div><strong>{adherenceLabel}</strong><p>{loggedDays?`Calories ${caloriesAdherencePct}% · protéines ${proteinAdherencePct}% · repas enregistrés ${loggedDays}/7.`:'Pas encore de repas enregistrés cette semaine.'}</p></section>
  </div>

  <section className="v103Signals"><header><b>SIGNAUX DU MOTEUR</b><span>5/5 FAVORABLES</span></header>
   {[['PERFORMANCES','92','Stable sur les mouvements repères'],['VOLUME','90','Volume hebdomadaire maintenu'],['PROTÉINES','96','Objectif presque toujours atteint'],['VITESSE DE PERTE','88','Dans la zone cible'],['RÉCUPÉRATION','91','Aucun signal de fatigue excessive']].map(x=><div key={x[0]}><span><small>{x[0]}</small><em>{x[2]}</em></span><b>{x[1]}</b><i><strong style={{width:x[1]+'%'}}></strong></i></div>)}
  </section>

  <section className="v103Checkin"><div><small>CHECK-IN DU JOUR</small><b>2 minutes pour fiabiliser la décision</b><p>Poids · taille · sommeil · énergie · faim · récupération</p></div><button onClick={()=>setCheckinOpen(true)}>COMPLÉTER</button></section>

  <section className="v103Guard"><b>GARDE-FOU BODY OS</b><p>Aucun changement de calories ou d'entraînement n'est appliqué automatiquement. Le moteur propose, explique et attend ta validation.</p></section>

  {checkinOpen&&<div className="v9SheetBack" onClick={()=>setCheckinOpen(false)}><section className="v103Sheet" onClick={e=>e.stopPropagation()}>
   <header><button onClick={()=>setCheckinOpen(false)}>×</button><div><b>CHECK-IN DU JOUR</b><small>Les données restent modifiables</small></div><span></span></header>
   <label>POIDS (KG)<input value={checkin.weight} onChange={e=>setCheckin({...checkin,weight:e.target.value})}/></label>
   <label>TOUR DE TAILLE (CM)<input value={checkin.waist} onChange={e=>setCheckin({...checkin,waist:e.target.value})}/></label>
   {([['SOMMEIL','sleep'],['ÉNERGIE','energy'],['FAIM','hunger'],['RÉCUPÉRATION','recovery']] as const).map(([label,key])=><div className="v103Scale" key={key}><small>{label}</small><span>{[1,2,3,4,5].map(n=><button className={checkin[key]===n?'active':''} onClick={()=>setCheckin({...checkin,[key]:n})} key={n}>{n}</button>)}</span></div>)}
   <button className="v9Primary" onClick={saveCheckin}>ENREGISTRER LE CHECK-IN</button>
  </section></div>}

  {decisionOpen&&<InfoSheet title={`POURQUOI ${verdict} ?`} close={()=>setDecisionOpen(false)}>
   <div className="v103Why"><b>Décision proposée : {verdictVerb} {displayCalories.toLocaleString('fr-FR')} kcal</b><p>{explainBody}</p><small>CONFIANCE DU MOTEUR</small><strong>{confidenceLabel} · {confidencePct}%</strong><p>Cette recommandation est une aide à la décision, pas un diagnostic médical.</p></div>
  </InfoSheet>}
 </main>
}
