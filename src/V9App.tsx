import { useEffect, useMemo, useRef, useState } from 'react'
import { Line, LineChart, ResponsiveContainer, XAxis, YAxis, Bar, BarChart, ReferenceLine } from 'recharts'
import './v9.css'
import FoodVision, { type FoodVisionPayload } from './FoodVision'
import type {
 DailyEntry, DayPlan, EvolutionPhoto, ExerciseItem, Ingredient, LibraryEntry, Meal, MuscleGroup,
 NutritionDaily, ProgressionSuggestion, Recipe, SessionGroup, SetDraft, WorkoutHistoryEntry, WorkoutTemplate,
} from './v9/types'
import {
 ACTIVE_TEMPLATE_KEY, DAILY_LOG_KEY, DEFAULT_TEMPLATE_ID, NUTRITION_DAILY_KEY, NUTRITION_MEALS_KEY,
 NUTRITION_SETTINGS_KEY, RECIPE_FAVORITES_KEY, SCHEDULE_KEY, TEMPLATES_KEY, WORKOUT_DONE_KEY,
 WORKOUT_HISTORY_KEY, WORKOUT_LOG_KEY, WORKOUT_OVERRIDES_KEY,
 deleteWorkoutSet, logWorkoutSet, muscleMeasurementSeries, newSetId, newTemplateId, readActiveTemplates,
 readDailyLog, readJSON, readNutritionDaily, readTemplates, readWorkoutHistory, todayISO, upsertDailyEntry,
 writeActiveTemplates, writeJSON, writeTemplates,
} from './v9/storage'
import {
 computeMacros, dayIcon, estimate1RM, estimateExerciseSeconds, estimateSessionMinutes, fmt1, fmtDelta,
 fmtHistoryDate, isRappelDay, mealDetails, mondayIndex, NUTRITION_DB, padDone, parseRestSeconds,
 suggestProgression, thumbFallback,
} from './v9/utils'
import {
 DEFAULT_EVOLUTION_PHOTOS, DEFAULT_NUTRITION_SETTINGS, DEFAULT_SCHEDULE, exerciseLibrary,
 exportProgressData, libraryEquipments, meals, muscleGroups, readSchedule, recipes,
 resolveBaseExercises, sessionData, sessionGroups, WEEKDAYS,
} from './v9/data'
import { BottomNav, InfoSheet, OptionsSheet, ProgramSheet, Toast } from './v9/components/Shared'
import { Today } from './v9/screens/Today'
import { Workout } from './v9/screens/Workout'
import { Nutrition } from './v9/screens/Nutrition'
import { Progress } from './v9/screens/Progress'

type Screen='today'|'workout'|'nutrition'|'progress'|'coach'|'plan'|'adaptive'|'plus'|'library'|'templates'
type WorkoutView='session'|'exercise'|'history'

function AdaptiveIntelligence({setScreen}:{setScreen:(s:Screen)=>void}){
 const [checkinOpen,setCheckinOpen]=useState(false)
 const [decisionOpen,setDecisionOpen]=useState(false)
 const [dailyLog,setDailyLog]=useState(readDailyLog())
 const latestDaily=dailyLog.at(-1)
 const [checkin,setCheckin]=useState({weight:latestDaily?.weight!=null?String(latestDaily.weight):'',waist:latestDaily?.waist!=null?String(latestDaily.waist):'',sleep:7,energy:4,hunger:3,recovery:4})
 const saveCheckin=()=>{
  const patch:Partial<DailyEntry>={}
  if(checkin.weight.trim()) patch.weight=Math.round(parseFloat(checkin.weight.replace(',','.'))*10)/10
  if(checkin.waist.trim()) patch.waist=Math.round(parseFloat(checkin.waist.replace(',','.'))*10)/10
  upsertDailyEntry(patch); setDailyLog(readDailyLog()); setCheckinOpen(false)
 }
 const weightPoints=dailyLog.filter(e=>e.weight!=null).slice(-14).map(e=>({d:fmtHistoryDate(e.date).slice(0,5),w:e.weight!}))
 const weighedDays=dailyLog.filter(e=>e.weight!=null)
 const latestWeight=weighedDays.at(-1)?.weight
 const previousWeight=weighedDays.length>=2?weighedDays[weighedDays.length-2].weight:undefined
 const trendStatus=latestWeight!=null&&previousWeight!=null?(latestWeight<=previousWeight?'OPTIMALE':'À SURVEILLER'):'EN ATTENTE'
 const spanDays=weighedDays.length>=2?(new Date(weighedDays.at(-1)!.date).getTime()-new Date(weighedDays[0].date).getTime())/86400000:0
 const realWeeklyRate=spanDays>=3?(weighedDays.at(-1)!.weight!-weighedDays[0].weight!)/spanDays*7:null
 const nutritionSettings=readJSON(NUTRITION_SETTINGS_KEY,DEFAULT_NUTRITION_SETTINGS)
 const preservation=94
 // Adhérence nutrition réelle sur les 7 derniers jours calendaires, à partir
 // du même journal quotidien que l'onglet SEMAINE/MOIS de Nutrition : un
 // jour est "dans la cible" si kcal/protéines sont à ±10% de l'objectif
 // configuré. Remplace les 91%/87%/94%/6-7 auparavant figés.
 const dailyNutrition=readNutritionDaily()
 const within=(val:number,target:number,tolerance=.1)=>target>0&&Math.abs(val-target)/target<=tolerance
 const last7Dates=Array.from({length:7},(_,i)=>{const d=new Date();d.setDate(d.getDate()-i);return d.toISOString().slice(0,10)})
 const loggedDays=last7Dates.filter(d=>dailyNutrition[d]!=null)
 const caloriesOnTarget=loggedDays.filter(d=>within(dailyNutrition[d].kcal,nutritionSettings.calories)).length
 const proteinOnTarget=loggedDays.filter(d=>within(dailyNutrition[d].protein,nutritionSettings.protein)).length
 const caloriesAdherencePct=loggedDays.length?Math.round(caloriesOnTarget/loggedDays.length*100):0
 const proteinAdherencePct=loggedDays.length?Math.round(proteinOnTarget/loggedDays.length*100):0
 const adherence=loggedDays.length?Math.round((caloriesAdherencePct+proteinAdherencePct)/2):0
 const adherenceLabel=loggedDays.length===0?'EN ATTENTE':adherence>=85?'TRÈS BON':adherence>=65?'BON':adherence>=40?'MOYEN':'À AMÉLIORER'
 // Numéro de semaine réel depuis la toute première donnée suivie (poids/taille
 // ou séance), plutôt qu'un "SEMAINE 7" figé sans rapport avec l'usage réel.
 const allTrackedDates=[...dailyLog.map(e=>e.date),...readWorkoutHistory().map(h=>h.date)]
 const earliestTrackedDate=allTrackedDates.length?allTrackedDates.slice().sort()[0]:todayISO()
 const daysSinceStart=Math.max(0,Math.floor((Date.now()-new Date(earliestTrackedDate+'T00:00:00').getTime())/86400000))
 const weekNumber=Math.floor(daysSinceStart/7)+1
 return <main className="v9Page v103Adaptive">
  <header className="v9TitleBar"><button onClick={()=>setScreen('today')}>‹</button><div><b>ADAPTIVE SÈCHE</b><small>INTELLIGENCE · SEMAINE {weekNumber}</small></div><span className="v103Live">● ACTIF</span></header>

  <section className="v103Decision">
   <div className="v103DecisionTop"><span><small>DÉCISION DE LA SEMAINE</small><b>MAINTENIR</b></span><strong>✓</strong></div>
   <p>La trajectoire est cohérente : poids et taille diminuent, performances stables et adhérence élevée.</p>
   <div className="v103DecisionMetrics"><span><small>POIDS 7J</small><b>−0,48 kg</b></span><span><small>TAILLE</small><b>−0,7 cm</b></span><span><small>PERF.</small><b>STABLE</b></span></div>
   <button onClick={()=>setDecisionOpen(true)}>{nutritionSettings.calories.toLocaleString('fr-FR')} KCAL MAINTENUES <b>›</b></button>
  </section>

  <section className="v103Trend">
   <header><div><small>TRAJECTOIRE 14 JOURS</small><b>{latestWeight!=null?`${fmt1(latestWeight)} kg`:'—'}</b></div><span>{trendStatus}</span></header>
   {weightPoints.length?<ResponsiveContainer width="100%" height={180}><LineChart data={weightPoints}><Line type="monotone" dataKey="w" stroke="#77eff0" strokeWidth={3} dot={{r:4,fill:'#d9ffff'}}/><XAxis dataKey="d" tick={{fill:'#829ca7',fontSize:9}} axisLine={false}/><YAxis domain={['dataMin - 1','dataMax + 1']} hide/></LineChart></ResponsiveContainer>:<p className="v94NoData">Pas encore de mesure. Complète le check-in pour voir ta courbe.</p>}
   <div className="v103Trajectory"><span>RÉEL {realWeeklyRate!=null?`${realWeeklyRate>0?'+':''}${realWeeklyRate.toFixed(2).replace('.',',')} kg/sem`:''}</span><i></i><span>OBJECTIF {String(nutritionSettings.weeklyRate).replace('.',',')} kg/sem.</span></div>
  </section>

  <div className="v103ScoreGrid">
   <section><small>MUSCLE PRESERVATION</small><div className="v103Ring"><b>{preservation}</b><em>/100</em></div><strong>EXCELLENT</strong><p>Force stable · protéines hautes · rythme de perte maîtrisé.</p></section>
   <section><small>ADHÉRENCE NUTRITION</small><div className="v103Ring"><b>{adherence}</b><em>%</em></div><strong>{adherenceLabel}</strong><p>{loggedDays.length?`Calories ${caloriesAdherencePct}% · protéines ${proteinAdherencePct}% · repas enregistrés ${loggedDays.length}/7.`:'Pas encore de repas enregistrés cette semaine.'}</p></section>
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
   {[['SOMMEIL','sleep'],['ÉNERGIE','energy'],['FAIM','hunger'],['RÉCUPÉRATION','recovery']].map(([label,key])=><div className="v103Scale" key={key}><small>{label}</small><span>{[1,2,3,4,5].map(n=><button className={(checkin as any)[key]===n?'active':''} onClick={()=>setCheckin({...checkin,[key]:n})} key={n}>{n}</button>)}</span></div>)}
   <button className="v9Primary" onClick={saveCheckin}>ENREGISTRER LE CHECK-IN</button>
  </section></div>}

  {decisionOpen&&<InfoSheet title="POURQUOI MAINTENIR ?" close={()=>setDecisionOpen(false)}>
   <div className="v103Why"><b>Décision proposée : maintenir {nutritionSettings.calories.toLocaleString('fr-FR')} kcal</b><p>La moyenne de poids baisse au rythme cible, le tour de taille diminue et les performances restent stables. Réduire davantage les calories n'apporte pas de bénéfice évident aujourd'hui.</p><small>CONFIANCE DU MOTEUR</small><strong>ÉLEVÉE · 92%</strong><p>Cette recommandation est une aide à la décision, pas un diagnostic médical.</p></div>
  </InfoSheet>}
 </main>
}

function Coach({setScreen}:{setScreen:(s:Screen)=>void}){
 const [answer,setAnswer]=useState(''); const [q,setQ]=useState('')
 const ask=(kind:string)=>{if(kind==='progression'){setScreen('adaptive');return} setAnswer(kind==='progression'?'Trajectoire cohérente : conserve les calories et vise la stabilité de tes performances.':kind==='adjust'?'Aucun ajustement majeur aujourd’hui. Priorité : protéines, sommeil et performance sur les mouvements de base.':'Conseil récupération : garde 1–2 RIR sur la majorité des séries et évite d’augmenter simultanément cardio et volume musculation.')}
 return <main className="v9Page v9Coach"><header className="v9TitleBar"><button onClick={()=>setScreen('plus')}>‹</button><div><b>AI COACH</b></div><span className="v9Online">● DÉMO</span></header><div className="v9Orb"><i></i><i></i><b>✦</b></div><section className="v9CoachHello"><b>Salut Fouad 👋</b><span>Que veux-tu optimiser aujourd'hui ?</span></section><div className="v9CoachPrompts"><button onClick={()=>ask('progression')}>◉ <span>Analyse de ma progression</span>›</button><button onClick={()=>ask('adjust')}>◎ <span>Que dois-je ajuster ?</span>›</button><button onClick={()=>setScreen('plan')}>◌ <span>Planifie ma semaine</span>›</button><button onClick={()=>ask('recovery')}>♙ <span>Conseil récupération</span>›</button></div>{answer&&<div className="v93CoachAnswer">{answer}</div>}<label className="v9Ask"><input value={q} onChange={e=>setQ(e.target.value)} placeholder="Pose une question…"/><button onClick={()=>{if(q.trim()){setAnswer('Mode démo : ta question est enregistrée. Le moteur LLM sera branché séparément.');setQ('')}}}>➤</button></label><div className="v9CoachNote">Mode démo : moteur BODY OS local. Aucun token OpenAI requis.</div></main>
}

function Plus({setScreen}:{setScreen:(s:Screen)=>void}){
 return <main className="v9Page"><header className="v9TitleBar"><button onClick={()=>setScreen('today')}>‹</button><div><b>PLUS</b></div><span></span></header><div className="v9CoachPrompts"><button onClick={()=>setScreen('library')}>▤ <span>Bibliothèque d'exercices</span>›</button><button onClick={()=>setScreen('templates')}>◧ <span>Mes séances</span>›</button><button onClick={()=>setScreen('coach')}>✦ <span>AI Coach</span>›</button><button onClick={()=>setScreen('plan')}>◫ <span>Plan — Semaine</span>›</button></div></main>
}

function LibraryDetailSheet({entry,close}:{entry:LibraryEntry,close:()=>void}){
 const openVideo=()=>window.open(entry.video,'_blank','noopener,noreferrer')
 return <div className="v9SheetBack" onClick={close}><section className="v93InfoSheet" onClick={e=>e.stopPropagation()}>
  <header><button onClick={close}>×</button><b>{entry.name}</b><span></span></header>
  <div>
   <img src={entry.img} onError={thumbFallback} className="v9LibDetailImg" onClick={openVideo} role="button" tabIndex={0} onKeyDown={e=>e.key==='Enter'&&openVideo()}/>
   <div className="v93Prescription"><span><small>ZONE REPS</small><b>{entry.reps}</b></span><span><small>RIR CIBLE</small><b>{entry.rir}</b></span><span><small>REPOS</small><b>{entry.rest}</b></span></div>
   <p><b>Groupe</b> {entry.group} · <b>Matériel</b> {entry.equipment}</p>
   <p><b>Cible</b> {entry.target}</p>
   <p><b>Secondaire</b> {entry.secondary}</p>
   <button className="v9Primary" onClick={openVideo}>VOIR LA VIDÉO</button>
  </div>
 </section></div>
}

function Bibliotheque({setScreen}:{setScreen:(s:Screen)=>void}){
 const [query,setQuery]=useState('')
 const [group,setGroup]=useState<SessionGroup|'Tous'>('Tous')
 const [equipment,setEquipment]=useState<string|'Tous'>('Tous')
 const [detail,setDetail]=useState<LibraryEntry|null>(null)
 const q=query.trim().toLowerCase()
 const results=exerciseLibrary.filter(e=>
  (group==='Tous'||e.group===group)&&
  (equipment==='Tous'||e.equipment===equipment)&&
  (q===''||e.name.toLowerCase().includes(q)||e.target.toLowerCase().includes(q)||e.equipment.toLowerCase().includes(q))
 )
 return <main className="v9Page" aria-label="Bibliothèque d'exercices">
  <header className="v9TitleBar"><button onClick={()=>setScreen('plus')}>‹</button><div><b>BIBLIOTHÈQUE</b><small>{exerciseLibrary.length} exercices</small></div><span></span></header>
  <div className="v9Ask v9LibSearch"><input value={query} onChange={e=>setQuery(e.target.value)} placeholder="Rechercher un exercice, un muscle, un matériel…" aria-label="Rechercher un exercice"/></div>
  <div className="v94MuscleTabs v9LibTabs"><button className={group==='Tous'?'active':''} onClick={()=>setGroup('Tous')}><small>Tous</small></button>{sessionGroups.map(g=><button key={g} className={g===group?'active':''} onClick={()=>setGroup(g)}><span>{g==='Pectoraux'?'♜':g==='Dos'?'♙':g==='Épaules'?'✣':g==='Jambes'?'♧':g==='Bras'?'◉':'⚕'}</span><small>{g}</small></button>)}</div>
  <div className="v9Segments v9LibEquip"><select value={equipment} onChange={e=>setEquipment(e.target.value)} aria-label="Filtrer par matériel"><option value="Tous">Tout matériel</option>{libraryEquipments.map(eq=><option key={eq} value={eq}>{eq}</option>)}</select></div>
  <section className="v9ExerciseList v9LibList">
   {results.map(e=><button key={`${e.group}::${e.name}`} onClick={()=>setDetail(e)}><div className="v93Thumb"><img src={e.img} onError={thumbFallback}/><i>▶</i></div><span><small>{e.group}</small><b>{e.name}</b><em>{e.equipment} · {e.target}</em></span><i>›</i></button>)}
  </section>
  {results.length===0&&<p className="v9LibEmpty">Aucun exercice ne correspond à cette recherche.</p>}
  {detail&&<LibraryDetailSheet entry={detail} close={()=>setDetail(null)}/>}
 </main>
}

function TemplateBuilderSheet({group,close,onSave}:{group:SessionGroup,close:()=>void,onSave:(name:string,exerciseNames:string[])=>void}){
 const [name,setName]=useState('')
 const [picked,setPicked]=useState<string[]>([])
 const options=exerciseLibrary.filter(e=>e.group===group)
 const toggle=(n:string)=>setPicked(p=>p.includes(n)?p.filter(x=>x!==n):[...p,n])
 const save=()=>{if(!name.trim()||picked.length===0) return;onSave(name.trim(),options.filter(e=>picked.includes(e.name)).map(e=>e.name));close()}
 return <div className="v9SheetBack" onClick={close}><section className="v9MealSheet" onClick={e=>e.stopPropagation()}>
  <header><button onClick={close}>×</button><b>NOUVELLE SÉANCE</b><span></span></header>
  <div className="v9TemplateBuilder">
   <label className="v9TemplateNameLabel">NOM<input value={name} onChange={e=>setName(e.target.value)} placeholder={`ex. ${group} — variante B`}/></label>
   <small className="v9TemplatePickHint">CHOISIR LES EXERCICES ({picked.length})</small>
   <div className="v9TemplatePickList">
    {options.map(e=><label key={e.name} className="v9TemplatePickRow"><input type="checkbox" checked={picked.includes(e.name)} onChange={()=>toggle(e.name)}/><span>{e.name}</span><em>{e.equipment}</em></label>)}
   </div>
   <button className="v9Primary" onClick={save} disabled={!name.trim()||picked.length===0}>CRÉER LA SÉANCE</button>
  </div>
 </section></div>
}

function MesSeances({setScreen}:{setScreen:(s:Screen)=>void}){
 const [activeGroup,setActiveGroup]=useState<SessionGroup|null>(null)
 const [active,setActiveState]=useState<Record<string,string>>(()=>readActiveTemplates())
 const [templates,setTemplatesState]=useState<WorkoutTemplate[]>(()=>readTemplates())
 const [builderOpen,setBuilderOpen]=useState(false)
 const setActive=(next:Record<string,string>)=>{setActiveState(next);writeActiveTemplates(next)}
 const setTemplates=(next:WorkoutTemplate[])=>{setTemplatesState(next);writeTemplates(next)}
 const activate=(group:SessionGroup,id:string)=>setActive({...active,[group]:id})
 const createTemplate=(group:SessionGroup,name:string,exerciseNames:string[])=>{
  const tpl:WorkoutTemplate={id:newTemplateId(),name,group,exerciseNames}
  setTemplates([...templates,tpl])
  activate(group,tpl.id)
 }
 const deleteTemplate=(id:string)=>{
  setTemplates(templates.filter(t=>t.id!==id))
  const group=templates.find(t=>t.id===id)?.group
  if(group&&active[group]===id) activate(group,DEFAULT_TEMPLATE_ID)
 }
 if(activeGroup){
  const groupTemplates=templates.filter(t=>t.group===activeGroup)
  const activeId=active[activeGroup]??DEFAULT_TEMPLATE_ID
  return <main className="v9Page" aria-label="Mes séances">
   <header className="v9TitleBar"><button onClick={()=>setActiveGroup(null)}>‹</button><div><b>{activeGroup.toUpperCase()}</b><small>Mes séances</small></div><span></span></header>
   <section className="v9TemplateList">
    <div className="v9TemplateRow">
     <button className={`v9TemplateSelect${activeId===DEFAULT_TEMPLATE_ID?' active':''}`} onClick={()=>activate(activeGroup,DEFAULT_TEMPLATE_ID)}>
      <span><b>Séance standard</b><em>{sessionData[activeGroup].length} exercices · intégrée</em></span>
      <i>{activeId===DEFAULT_TEMPLATE_ID?'✓':'○'}</i>
     </button>
    </div>
    {groupTemplates.map(t=><div key={t.id} className="v9TemplateRow">
     <button className={`v9TemplateSelect${activeId===t.id?' active':''}`} onClick={()=>activate(activeGroup,t.id)}>
      <span><b>{t.name}</b><em>{t.exerciseNames.length} exercices · personnalisée</em></span>
      <i>{activeId===t.id?'✓':'○'}</i>
     </button>
     <button className="v9TemplateDelete" aria-label={`Supprimer ${t.name}`} onClick={()=>deleteTemplate(t.id)}>×</button>
    </div>)}
   </section>
   <button className="v9Outline" onClick={()=>setBuilderOpen(true)}>+ CRÉER UNE SÉANCE</button>
   {builderOpen&&<TemplateBuilderSheet group={activeGroup} close={()=>setBuilderOpen(false)} onSave={(name,names)=>createTemplate(activeGroup,name,names)}/>}
  </main>
 }
 return <main className="v9Page" aria-label="Mes séances">
  <header className="v9TitleBar"><button onClick={()=>setScreen('plus')}>‹</button><div><b>MES SÉANCES</b></div><span></span></header>
  <section className="v9TemplateGroupList">
   {sessionGroups.map(g=>{
    const activeId=active[g]??DEFAULT_TEMPLATE_ID
    const tplName=activeId===DEFAULT_TEMPLATE_ID?'Séance standard':templates.find(t=>t.id===activeId)?.name??'Séance standard'
    return <button key={g} onClick={()=>setActiveGroup(g)}><i className="v9TemplateGroupIcon">{g==='Pectoraux'?'♜':g==='Dos'?'♙':g==='Épaules'?'✣':g==='Jambes'?'♧':g==='Bras'?'◉':'⚕'}</i><span><b>{g}</b><em>{tplName}</em></span><strong>›</strong></button>
   })}
  </section>
 </main>
}

function Plan({setScreen}:{setScreen:(s:Screen)=>void}){
 const [selected,setSelected]=useState(mondayIndex())
 const [schedule,setSchedule]=useState<DayPlan[]>(()=>readSchedule())
 const [programOpen,setProgramOpen]=useState(false)
 const monday=useMemo(()=>{const d=new Date();d.setDate(d.getDate()-mondayIndex());return d},[])
 const fmtDate=(d:Date)=>`${String(d.getDate()).padStart(2,'0')}/${String(d.getMonth()+1).padStart(2,'0')}`
 const sunday=useMemo(()=>{const d=new Date(monday);d.setDate(d.getDate()+6);return d},[monday])
 const saveSchedule=(s:DayPlan[])=>{writeJSON(SCHEDULE_KEY,s);setSchedule(s)}
 const days=WEEKDAYS.map((w,i)=>{
  const d=new Date(monday); d.setDate(monday.getDate()+i)
  const plan=schedule[i]
  const kind=plan==='Repos'?'Repos':plan==='Cardio'?'Cardio':plan==='L5-S1'?'Renforcement':isRappelDay(schedule,i)?'Rappel':'Musculation'
  return {abbr:w.slice(0,3).toUpperCase(),date:d.getDate(),plan,kind}
 })
 return <main className="v9Page"><header className="v9TitleBar"><button onClick={()=>setScreen('plus')}>‹</button><div><b>PLAN — SEMAINE</b><small>{fmtDate(monday)} – {fmtDate(sunday)}</small></div><button className="v93Dots" onClick={()=>setProgramOpen(true)} aria-label="Modifier mon programme">◫</button></header><section className="v9Week">{days.map((d,i)=><article onClick={()=>setSelected(i)} className={i===selected?'active':''} key={d.abbr}><b>{d.abbr}</b><strong>{d.date}</strong><span><i>{d.plan}</i></span><em><i>{d.kind}</i></em><small>◌ 10 000 pas</small></article>)}</section><section className="v9WeekGoal"><div><small>OBJECTIF DE LA SEMAINE</small><p>Continuer la sèche en préservant le muscle.<br/>Déficit modéré.<br/>Protéines hautes.<br/>Performances stables.</p></div><aside><b>Tes progrès sont excellents.</b><span>Aucun ajustement calorique nécessaire cette semaine.</span><strong>92%</strong></aside></section>
  {programOpen&&<ProgramSheet schedule={schedule} close={()=>setProgramOpen(false)} onSave={saveSchedule}/>}
 </main>
}

export default function V9App(){
 const [screen,setScreen]=useState<Screen>('today'); const [workoutView,setWorkoutView]=useState<WorkoutView>('session')
 const todayPlan=readSchedule()[mondayIndex()]
 const initialGroup=(sessionGroups as string[]).includes(todayPlan)?todayPlan as SessionGroup:'Pectoraux'
 const page=useMemo(()=>screen==='today'?<Today setScreen={setScreen}/>:screen==='workout'?<Workout view={workoutView} setView={setWorkoutView} setScreen={setScreen} initialGroup={initialGroup}/>:screen==='nutrition'?<Nutrition setScreen={setScreen}/>:screen==='progress'?<Progress setScreen={setScreen}/>:screen==='coach'?<Coach setScreen={setScreen}/>:screen==='adaptive'?<AdaptiveIntelligence setScreen={setScreen}/>:screen==='plus'?<Plus setScreen={setScreen}/>:screen==='library'?<Bibliotheque setScreen={setScreen}/>:screen==='templates'?<MesSeances setScreen={setScreen}/>:<Plan setScreen={setScreen}/>,[screen,workoutView])
 const showNav=screen==='nutrition'||screen==='progress'||screen==='plus'||screen==='library'||screen==='templates'
 return <div className="v9Shell"><div className="v9Phone">{page}{showNav&&<BottomNav screen={screen} setScreen={s=>{setScreen(s);if(s==='workout')setWorkoutView('session')}}/>}</div></div>
}
