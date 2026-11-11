// Écran "Adaptive Sèche" (intelligence adaptative). Extrait de V9App.tsx
// (Phase 6).
import { useState } from 'react'
import { Line, LineChart, ResponsiveContainer, XAxis, YAxis } from 'recharts'
import type { DailyEntry, Screen } from '../types'
import { DEFAULT_NUTRITION_SETTINGS } from '../data'
import { NUTRITION_SETTINGS_KEY, readDailyLog, readJSON, readNutritionDaily, readWorkoutHistory, upsertDailyEntry } from '../storage'
import { computeNutritionAdherence, computeWeekNumber, decideWeeklyVerdict, estimateWeeklyRate, fmt1, fmtDelta, fmtHistoryDate } from '../utils'
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
 // Adhérence nutrition réelle sur les 7 derniers jours calendaires, à partir
 // du même journal quotidien que l'onglet SEMAINE/MOIS de Nutrition : un
 // jour est "dans la cible" si kcal/protéines sont à ±10% de l'objectif
 // configuré. Remplace les 91%/87%/94%/6-7 auparavant figés.
 const {loggedDays,caloriesPct:caloriesAdherencePct,proteinPct:proteinAdherencePct,adherencePct:adherence}=computeNutritionAdherence(readNutritionDaily(),nutritionSettings)
 const adherenceLabel=loggedDays===0?'EN ATTENTE':adherence>=85?'TRÈS BON':adherence>=65?'BON':adherence>=40?'MOYEN':'À AMÉLIORER'
 // Numéro de semaine réel depuis la toute première donnée suivie (poids/taille
 // ou séance), plutôt qu'un "SEMAINE 7" figé sans rapport avec l'usage réel.
 const workoutHistory=readWorkoutHistory()
 const weekNumber=computeWeekNumber(dailyLog,workoutHistory)

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

 // Signaux du moteur : chaque signal vient d'une donnée déjà suivie par
 // l'app, pas d'un pourcentage choisi au hasard. `bar` (0–100) normalise
 // la valeur réelle pour la barre visuelle ; `value` est le chiffre réel
 // affiché, pas une version arrondie du score. Sans donnée suffisante, le
 // signal reste honnêtement vide ("—") plutôt que de garder un chiffre
 // par défaut flatteur.
 const perfBar=perfChangePct==null?null:Math.max(0,Math.min(100,80+perfChangePct*3))
 const perfValue=perfChangePct==null?'—':`${perfChangePct>0?'+':''}${Math.round(perfChangePct)}%`
 const perfDesc=perfChangePct==null
  ?"Pas encore assez de séries sur 7 jours glissants pour mesurer une tendance."
  :perfChangePct>=0
  ?`Charge moyenne stable ou en hausse (${perfValue}) sur les séries des 7 derniers jours.`
  :`Charge moyenne en baisse de ${Math.abs(Math.round(perfChangePct))}% sur 7 jours.`

 const hasVolumeData=recentSets.length>0||priorSets.length>0
 const volumeBar=hasVolumeData?Math.max(0,Math.min(100,recentSets.length/20*100)):null
 const volumeValue=hasVolumeData?`${recentSets.length} série${recentSets.length>1?'s':''}`:'—'
 const volumeDesc=!hasVolumeData
  ?"Aucune série enregistrée ces 14 derniers jours."
  :priorSets.length>0
  ?`${recentSets.length} série${recentSets.length>1?'s':''} cette semaine, contre ${priorSets.length} la semaine précédente.`
  :`${recentSets.length} série${recentSets.length>1?'s':''} enregistrée${recentSets.length>1?'s':''} cette semaine.`

 const proteinBar=loggedDays===0?null:proteinAdherencePct
 const proteinValue=loggedDays===0?'—':`${proteinAdherencePct}%`
 const proteinDesc=loggedDays===0
  ?"Pas encore de repas enregistrés cette semaine."
  :`Objectif protéines atteint ${proteinAdherencePct}% des ${loggedDays} jour${loggedDays>1?'s':''} suivi${loggedDays>1?'s':''}.`

 const rateCloseness=realWeeklyRate==null||nutritionSettings.weeklyRate===0?null:Math.max(0,100-Math.abs(realWeeklyRate/nutritionSettings.weeklyRate-1)*100)
 const rateValue=realWeeklyRate==null?'—':`${realWeeklyRate>0?'+':''}${realWeeklyRate.toFixed(2).replace('.',',')} kg/sem`
 const rateDesc=realWeeklyRate==null
  ?"Pas encore assez de pesées pour calculer un rythme fiable."
  :verdict==='MAINTENIR'
  ?"Rythme réel conforme à l'objectif configuré."
  :verdict==='RÉDUIRE'
  ?"Rythme plus lent que l'objectif."
  :"Rythme plus rapide que l'objectif — risque pour le muscle."

 const recoveryEntries=dailyLog.filter(e=>e.recovery!=null&&Date.now()-new Date(e.date).getTime()<7*dayMs)
 const recoveryAvg=recoveryEntries.length?recoveryEntries.reduce((s,e)=>s+e.recovery!,0)/recoveryEntries.length:null
 const recoveryBar=recoveryAvg==null?null:(recoveryAvg-1)/4*100
 const recoveryValue=recoveryAvg==null?'—':`${recoveryAvg.toFixed(1).replace('.',',')}/5`
 const recoveryDesc=recoveryAvg==null
  ?"Pas encore de check-in récupération cette semaine."
  :recoveryAvg>=4
  ?"Récupération perçue élevée, aucun signal de fatigue excessive."
  :recoveryAvg>=2.5
  ?"Récupération correcte, à surveiller."
  :"Récupération perçue faible — priorise repos et gestion du stress."

 const engineSignals=[
  {label:'PERFORMANCES',value:perfValue,bar:perfBar,desc:perfDesc,favorable:perfBar!=null&&perfBar>=60},
  {label:'VOLUME',value:volumeValue,bar:volumeBar,desc:volumeDesc,favorable:volumeBar!=null&&volumeBar>=50},
  {label:'PROTÉINES',value:proteinValue,bar:proteinBar,desc:proteinDesc,favorable:proteinBar!=null&&proteinBar>=60},
  {label:'VITESSE DE PERTE',value:rateValue,bar:rateCloseness,desc:rateDesc,favorable:verdict==='MAINTENIR'&&realWeeklyRate!=null},
  {label:'RÉCUPÉRATION',value:recoveryValue,bar:recoveryBar,desc:recoveryDesc,favorable:recoveryBar!=null&&recoveryBar>=60},
 ]
 const favorableCount=engineSignals.filter(s=>s.favorable).length

 // Score composite : moyenne des signaux directement liés à la préservation
 // musculaire pendant un déficit (force maintenue, protéines suffisantes,
 // rythme de perte pas trop agressif, récupération perçue) — pas le volume,
 // qui mesure l'activité plutôt que la préservation. Sans aucun de ces
 // signaux disponible, le score reste en attente plutôt que de garder une
 // valeur par défaut.
 const preservationInputs=[perfBar,proteinBar,rateCloseness,recoveryBar].filter((v):v is number=>v!=null)
 const preservation=preservationInputs.length?Math.round(preservationInputs.reduce((a,b)=>a+b,0)/preservationInputs.length):null
 const preservationLabel=preservation==null?'EN ATTENTE':preservation>=85?'EXCELLENT':preservation>=65?'BON':preservation>=40?'MOYEN':'À SURVEILLER'
 const preservationDesc=preservation==null
  ?"Complète ton check-in et enregistre quelques séries pour activer ce score."
  :`Force ${perfBar!=null&&perfBar>=60?'stable':'à surveiller'} · protéines ${proteinBar!=null&&proteinBar>=60?'hautes':'à ajuster'} · rythme ${rateCloseness!=null&&rateCloseness>=60?'maîtrisé':'à ajuster'}.`

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
   <section><small>MUSCLE PRESERVATION</small><div className="v103Ring"><b>{preservation??'—'}</b><em>/100</em></div><strong>{preservationLabel}</strong><p>{preservationDesc}</p></section>
   <section><small>ADHÉRENCE NUTRITION</small><div className="v103Ring"><b>{adherence}</b><em>%</em></div><strong>{adherenceLabel}</strong><p>{loggedDays?`Calories ${caloriesAdherencePct}% · protéines ${proteinAdherencePct}% · repas enregistrés ${loggedDays}/7.`:'Pas encore de repas enregistrés cette semaine.'}</p></section>
  </div>

  <section className="v103Signals"><header><b>SIGNAUX DU MOTEUR</b><span>{favorableCount}/5 FAVORABLES</span></header>
   {engineSignals.map(s=><div key={s.label}><span><small>{s.label}</small><em>{s.desc}</em></span><b>{s.value}</b><i><strong style={{width:(s.bar??0)+'%'}}></strong></i></div>)}
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
