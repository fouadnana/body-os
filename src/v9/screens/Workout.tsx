// Écran "Séance" (liste d'exercices, détail d'un exercice, repos,
// historique d'un exercice). Extrait de V9App.tsx (Phase 6).
import { useEffect, useRef, useState } from 'react'
import { Bar, BarChart, ResponsiveContainer, XAxis, YAxis } from 'recharts'
import type { ExerciseItem, Screen, SessionGroup, SetDraft, WorkoutView } from '../types'
import { exerciseLibrary, resolveBaseExercises, sessionGroups } from '../data'
import {
 WORKOUT_DONE_KEY, WORKOUT_LOG_KEY, WORKOUT_OVERRIDES_KEY,
 deleteWorkoutSet, logWorkoutSet, readJSON, readWorkoutHistory, todayISO, writeJSON,
} from '../storage'
import { estimate1RM, estimateSessionMinutes, fmtHistoryDate, padDone, suggestProgression, thumbFallback } from '../utils'
import { OptionsSheet, Toast } from '../components/Shared'

export function Workout({view,setView,setScreen,initialGroup}:{view:WorkoutView,setView:(v:WorkoutView)=>void,setScreen:(s:Screen)=>void,initialGroup:SessionGroup}){
 const [group,setGroup]=useState<SessionGroup>(initialGroup); const [selected,setSelected]=useState(0)
 const [doneRaw,setDoneRawState]=useState<Record<string,boolean[]>>(()=>readJSON(WORKOUT_DONE_KEY,{}))
 const setDoneRaw=(next:Record<string,boolean[]>)=>{setDoneRawState(next);writeJSON(WORKOUT_DONE_KEY,next)}
 const [overrides,setOverridesState]=useState<Record<string,Record<number,string>>>(()=>readJSON(WORKOUT_OVERRIDES_KEY,{}))
 const setOverrides=(next:Record<string,Record<number,string>>)=>{setOverridesState(next);writeJSON(WORKOUT_OVERRIDES_KEY,next)}
 const [toast,setToast]=useState('')
 const exercises=resolveBaseExercises(group).map((e,i)=>{
  const replName=overrides[group]?.[i]
  if(!replName) return e
  return exerciseLibrary.find(x=>x.group===group&&x.name===replName)??e
 })
 const done=padDone(doneRaw[group],exercises.length)
 const setDone=(next:boolean[])=>setDoneRaw({...doneRaw,[group]:next})
 const replaceExercise=(i:number,name:string)=>setOverrides({...overrides,[group]:{...overrides[group],[i]:name}})
 const restoreExercise=(i:number)=>{const g={...overrides[group]};delete g[i];setOverrides({...overrides,[group]:g})}
 const [optionsOpen,setOptionsOpen]=useState(false)
 if(view==='exercise') return <Exercise key={`${group}-${selected}-${exercises[selected].name}`} item={exercises[selected]} index={selected} total={exercises.length} group={group} setView={setView} onDone={()=>setDone(done.map((x,i)=>i===selected?true:x))} onSwipe={delta=>setSelected(s=>Math.max(0,Math.min(exercises.length-1,s+delta)))} isReplaced={!!overrides[group]?.[selected]} onReplace={name=>replaceExercise(selected,name)} onRestore={()=>restoreExercise(selected)}/>
 if(view==='history') return <History setView={setView} item={exercises[selected]} group={group}/>
 const changeGroup=(g:SessionGroup)=>{setGroup(g);setSelected(0)}
 const finish=()=>{const count=done.filter(Boolean).length;setToast(count===exercises.length?'Séance enregistrée ✓':`${count}/${exercises.length} exercices validés — progression conservée`);setTimeout(()=>setToast(''),2300)}
 const resetProgress=()=>{setDone(Array(exercises.length).fill(false));setToast('Progression réinitialisée')}
 const totalEstimateMin=estimateSessionMinutes(exercises)
 const remainingEstimateMin=estimateSessionMinutes(exercises.filter((_,i)=>!done[i]))
 const doneCount=done.filter(Boolean).length
 const remainingPct=exercises.length?Math.round((doneCount/exercises.length)*100):0
 return <main className="v9Page"><header className="v9TitleBar"><button onClick={()=>setScreen('today')}>‹</button><div className="v982SessionHeading"><b>SÉANCE</b><small>{group==='Pectoraux'?'Pectoraux · Triceps':group}</small><em>{exercises.length} exercices · ~ {totalEstimateMin} min</em></div><button className="v93Dots" onClick={()=>setOptionsOpen(true)}>•••</button></header>
  <div className="v94MuscleTabs">{sessionGroups.map(g=><button key={g} className={g===group?'active':''} onClick={()=>changeGroup(g)}><span>{g==='Pectoraux'?'♜':g==='Dos'?'♙':g==='Épaules'?'✣':g==='Jambes'?'♧':g==='Bras'?'◉':'⚕'}</span><small>{g}</small></button>)}</div>
  <section className="v9ExerciseList">{exercises.map((e,i)=><button key={e.name} onClick={()=>{setSelected(i);setView('exercise')}} className={done[i]?'done':''}><div className="v93Thumb"><img src={e.img} onError={thumbFallback}/><i>▶</i></div><span><small>{i+1}</small><b>{e.name}</b><em>{e.equipment} · {e.reps} · RIR {e.rir}</em></span><strong>{e.sets}</strong><i>{done[i]?'✓':'○'}</i></button>)}</section>
  <button className="v9Primary" onClick={finish}>TERMINER LA SÉANCE</button><div className="v9Remaining"><small>Temps estimé restant</small><i><span style={{width:`${remainingPct}%`}}></span></i><b>{remainingEstimateMin} min</b></div>{toast&&<Toast text={toast}/>}
  {optionsOpen&&<OptionsSheet title="OPTIONS DE SÉANCE" close={()=>setOptionsOpen(false)} options={[{label:'Réinitialiser la progression',onClick:resetProgress,danger:true}]}/>}
 </main>
}

function Exercise({item,index,total,group,setView,onDone,onSwipe,isReplaced,onReplace,onRestore}:{item:ExerciseItem,index:number,total:number,group:SessionGroup,setView:(v:WorkoutView)=>void,onDone:()=>void,onSwipe:(delta:number)=>void,isReplaced:boolean,onReplace:(name:string)=>void,onRestore:()=>void}){
 const [optionsOpen,setOptionsOpen]=useState(false)
 const [pickerOpen,setPickerOpen]=useState(false)
 const logKey=`${group}::${item.name}`
 const targetRir=Number(String(item.rir).match(/\d+/)?.[0] ?? 2)
 const [todaysSets,setTodaysSets]=useState(()=>readWorkoutHistory().filter(h=>h.group===group&&h.exercise===item.name&&h.date===todayISO()))
 const lastPast=readWorkoutHistory().filter(h=>h.group===group&&h.exercise===item.name&&h.date!==todayISO()).at(-1)
 const progression=lastPast?suggestProgression(item.reps,targetRir,lastPast):null
 const draftDefaults=():SetDraft=>{
  const draft=readJSON<Record<string,SetDraft>>(WORKOUT_LOG_KEY,{})[logKey]
  if(draft) return draft
  const lastToday=todaysSets.at(-1)
  if(lastToday) return {weight:lastToday.weight,reps:lastToday.reps,rir:lastToday.rir??targetRir}
  if(progression) return {weight:progression.weight,reps:progression.reps,rir:progression.rir}
  if(lastPast) return {weight:lastPast.weight,reps:lastPast.reps,rir:lastPast.rir??targetRir}
  return {weight:index===3?0:100,reps:index===1?8:10,rir:targetRir}
 }
 const [draft,setDraftState]=useState<SetDraft>(draftDefaults)
 const {weight,reps,rir}=draft
 const persist=(d:SetDraft)=>{setDraftState(d);writeJSON(WORKOUT_LOG_KEY,{...readJSON(WORKOUT_LOG_KEY,{}),[logKey]:d})}
 const setWeight=(v:number)=>persist({...draft,weight:v})
 const setReps=(v:number)=>persist({...draft,reps:v})
 const setRir=(v:number)=>persist({...draft,rir:v})
 const [toast,setToast]=useState('')
 const [submitting,setSubmitting]=useState(false)
 const [resting,setResting]=useState(()=>Number(localStorage.getItem(REST_DEADLINE_KEY)||'0')>Date.now())
 const lastSet=readWorkoutHistory().filter(h=>h.group===group&&h.exercise===item.name).at(-1)
 const openVideo=()=>window.open(item.video,'_blank','noopener,noreferrer')
 // Glisser horizontalement sur l'en-tête/média passe à l'exercice suivant
 // ou précédent sans repasser par la liste de la séance.
 const pointerStart=useRef<{x:number,y:number}|null>(null)
 const onSwipeStart=(e:React.PointerEvent)=>{pointerStart.current={x:e.clientX,y:e.clientY}}
 const onSwipeEnd=(e:React.PointerEvent)=>{
  const start=pointerStart.current; pointerStart.current=null
  if(!start) return
  const dx=e.clientX-start.x,dy=e.clientY-start.y
  if(Math.abs(dx)<60||Math.abs(dy)>50) return
  if(dx<0&&index<total-1) onSwipe(1)
  else if(dx>0&&index>0) onSwipe(-1)
 }
 const validate=()=>{
  if(submitting) return
  setSubmitting(true)
  onDone()
  logWorkoutSet({date:todayISO(),group,exercise:item.name,weight,reps,rir})
  setTodaysSets(readWorkoutHistory().filter(h=>h.group===group&&h.exercise===item.name&&h.date===todayISO()))
  setToast('Série validée ✓');setTimeout(()=>{setToast('');setSubmitting(false);setResting(true)},650)
 }
 const removeSet=(id?:string)=>{
  if(!id) return
  deleteWorkoutSet(id)
  setTodaysSets(readWorkoutHistory().filter(h=>h.group===group&&h.exercise===item.name&&h.date===todayISO()))
 }
 return <main className="v9Page v9Exercise"><header className="v9TitleBar"><button onClick={()=>setView('session')}>‹</button><div><b>{group.toUpperCase()}</b><small>SÉANCE EN COURS</small></div><button className="v93Dots" onClick={()=>setOptionsOpen(true)}>•••</button></header>
  <div className="v9SwipeZone" onPointerDown={onSwipeStart} onPointerUp={onSwipeEnd} onDragStart={e=>e.preventDefault()}>
  <div className="v9ExerciseHead"><span><small>EXERCICE {index+1}/{total}</small><b>{item.name}</b><em>{item.equipment.toUpperCase()} · {group.toUpperCase()}</em></span></div>
  <section className="v9Media v93VideoMedia v98Media" onClick={openVideo} role="button" tabIndex={0} onKeyDown={e=>e.key==='Enter'&&openVideo()}><img src={item.img} onError={thumbFallback} draggable={false}/><button onClick={e=>{e.stopPropagation();openVideo()}}>▶</button><div><span>CIBLE&nbsp; {item.target}</span><span>SECONDAIRE&nbsp; {item.secondary}</span></div></section>
  </div>
  <section className="v93Prescription"><span><small>ZONE REPS</small><b>{item.reps}</b></span><span><small>RIR CIBLE</small><b>{item.rir}</b></span><span><small>REPOS</small><b>{item.rest}</b></span></section>
  {todaysSets.length>0&&<section className="v9TodaySets"><small>SÉRIES D'AUJOURD'HUI</small>{todaysSets.map((s,i)=><div key={s.id??i}><b>#{i+1}</b><span>{s.weight} kg × {s.reps}</span><em>RIR {s.rir??'—'}</em><button onClick={()=>removeSet(s.id)} aria-label="Supprimer cette série">×</button></div>)}</section>}
  <section className="v9SetPanel"><small>SÉRIE {todaysSets.length+1}</small><div className="v9Load"><button onClick={()=>setWeight(Math.max(0,weight-2.5))}>−</button><b>{weight}</b><em>KG</em><button onClick={()=>setWeight(weight+2.5)}>+</button></div><div className="v9RepLine"><span>6</span><span>7</span><strong>{reps}</strong><span>9</span><span>10</span></div><input type="range" min="5" max="15" value={reps} onChange={e=>setReps(+e.target.value)}/><div className="v9SetMeta"><span><small>RÉPÉTITIONS</small><b>{reps} REPS</b></span><span><small>RIR</small><div className="v9RirStepper"><button onClick={()=>setRir(Math.max(0,rir-1))}>−</button><b>{rir}</b><button onClick={()=>setRir(Math.min(5,rir+1))}>+</button></div></span></div>
   {progression&&todaysSets.length===0&&<p className="v9ProgressionNote">💡 {progression.reason}</p>}
  </section>
  <button className="v9LastSet" onClick={()=>setView('history')}><span><small>DERNIÈRE SÉRIE</small><b>{lastSet?`${lastSet.weight} kg × ${lastSet.reps} reps`:'Pas encore de série enregistrée'}</b></span>{lastSet&&<em>{lastSet.date}</em>}<strong>↗</strong></button>
  <div className="v9ExerciseActions"><button onClick={()=>setView('session')}>ANNULER</button><button className="pulse" onClick={validate} disabled={submitting}>✓</button><button onClick={()=>{onDone();setView('session')}}>TERMINER<br/>EXERCICE</button></div>
  {toast&&<Toast text={toast}/>}
  {resting&&<RestOverlay onLeave={()=>setResting(false)} onHistory={()=>{setResting(false);setView('history')}}/>}
  {optionsOpen&&<OptionsSheet title="OPTIONS EXERCICE" close={()=>setOptionsOpen(false)} options={[
   {label:'Remplacer l\'exercice',onClick:()=>setPickerOpen(true)},
   ...(isReplaced?[{label:'Revenir à l\'exercice original',onClick:onRestore}]:[]),
  ]}/>}
  {pickerOpen&&<ExercisePickerSheet group={group} exclude={item.name} close={()=>setPickerOpen(false)} onPick={name=>{onReplace(name);setPickerOpen(false)}}/>}
 </main>
}

function ExercisePickerSheet({group,exclude,close,onPick}:{group:SessionGroup,exclude:string,close:()=>void,onPick:(name:string)=>void}){
 const options=exerciseLibrary.filter(e=>e.group===group&&e.name!==exclude)
 return <div className="v9SheetBack" onClick={close}><section className="v9MealSheet" onClick={e=>e.stopPropagation()}>
  <header><button onClick={close}>×</button><b>REMPLACER PAR…</b><span></span></header>
  <section className="v9ExerciseList v9LibList v9PickerList">
   {options.map(e=><button key={e.name} onClick={()=>onPick(e.name)}><div className="v93Thumb"><img src={e.img} onError={thumbFallback}/><i>▶</i></div><span><b>{e.name}</b><em>{e.equipment} · {e.target}</em></span><i>›</i></button>)}
  </section>
  {options.length===0&&<p className="v9LibEmpty">Aucun autre exercice disponible pour ce groupe.</p>}
 </section></div>
}

const REST_DEADLINE_KEY='bodyos.rest.deadline.v1'
const REST_DEFAULT_MS=45000
function RestOverlay({onLeave,onHistory}:{onLeave:()=>void,onHistory:()=>void}){
 // Minuteur à base d'échéance (timestamp absolu), pas d'un simple compteur
 // décrémenté : setInterval est throttled/suspendu en arrière-plan sur iOS,
 // mais recalculer (échéance − maintenant) à chaque tick reste correct même
 // après une longue pause. L'échéance est aussi persistée pour survivre à un
 // rechargement de page pendant le repos. Rendu en bandeau superposé à
 // l'écran Exercice (plutôt qu'une navigation vers un écran séparé) pour
 // garder le contexte de la série en cours et rester fluide.
 const [deadlineAt,setDeadlineAt]=useState(()=>{
  const stored=Number(localStorage.getItem(REST_DEADLINE_KEY)||'0')
  if(stored>Date.now()) return stored
  const d=Date.now()+REST_DEFAULT_MS
  localStorage.setItem(REST_DEADLINE_KEY,String(d))
  return d
 })
 const [now,setNow]=useState(Date.now())
 useEffect(()=>{
  const id=setInterval(()=>setNow(Date.now()),250)
  return ()=>clearInterval(id)
 },[])
 const sec=Math.max(0,Math.round((deadlineAt-now)/1000))
 const fmtTimer=(s:number)=>`${String(Math.floor(s/60)).padStart(2,'0')}:${String(s%60).padStart(2,'0')}`
 const adjust=(deltaMs:number)=>{
  const d=Math.max(now,deadlineAt+deltaMs)
  setDeadlineAt(d)
  localStorage.setItem(REST_DEADLINE_KEY,String(d))
 }
 const leave=()=>{localStorage.removeItem(REST_DEADLINE_KEY);onLeave()}
 const goHistory=()=>{localStorage.removeItem(REST_DEADLINE_KEY);onHistory()}
 return <div className="v9SheetBack"><div className="v9RestSheet v9Rest"><header className="v9TitleBar"><button onClick={leave}>‹</button><div><b>REPOS</b><small>&nbsp;</small></div><button onClick={leave}>Passer</button></header><section className="v9Timer"><div><b>{fmtTimer(sec)}</b><small>Reprends pour ta prochaine<br/>série</small></div></section><div className="v93TimerControls"><button onClick={()=>adjust(-15000)}>−15 s</button><button onClick={()=>adjust(15000)}>+15 s</button></div><button className="v9NextSet" onClick={leave}><span><small>SÉRIE SUIVANTE</small><b>Reprendre l'exercice</b></span><em>RIR 1–2</em><strong>›</strong></button><button className="v9Outline" onClick={goHistory}>VOIR HISTORIQUE</button></div></div>
}

function History({setView,item,group}:{setView:(v:WorkoutView)=>void,item:ExerciseItem,group:SessionGroup}){
 const [tab,setTab]=useState<'charge'|'volume'|'1rm'>('charge')
 const entries=readWorkoutHistory().filter(h=>h.group===group&&h.exercise===item.name).slice(-20)
 const metricFor=(e:{weight:number,reps:number})=>tab==='charge'?e.weight:tab==='volume'?e.weight*e.reps:estimate1RM(e.weight,e.reps)
 const chartData=entries.map((e,i)=>({i,v:metricFor(e)}))
 const rows=entries.slice().reverse()
 return <main className="v9Page"><header className="v9TitleBar"><button onClick={()=>setView('exercise')}>‹</button><div><b>HISTORIQUE EXERCICE</b><small>{item.name} · {item.equipment}</small></div><span>•••</span></header>
  <div className="v9Segments"><button className={tab==='charge'?'active':''} onClick={()=>setTab('charge')}>CHARGE</button><button className={tab==='volume'?'active':''} onClick={()=>setTab('volume')}>VOLUME</button><button className={tab==='1rm'?'active':''} onClick={()=>setTab('1rm')}>1RM</button></div>
  {entries.length?<section className="v9HistoryChart"><ResponsiveContainer width="100%" height={210}><BarChart data={chartData}><Bar dataKey="v" fill="#bdeff2" radius={[4,4,0,0]} maxBarSize={32}/><YAxis hide domain={['dataMin - 5','dataMax + 5']}/><XAxis hide/></BarChart></ResponsiveContainer></section>
  :<section className="v9HistoryChart v9HistoryEmpty"><p>Aucune série enregistrée pour cet exercice.<br/>Valide une série pendant ta séance pour commencer l'historique.</p></section>}
  <div className="v9HistoryRows">{rows.map((r,i)=><div className={i===0?'active':''} key={r.date+i}><b>{fmtHistoryDate(r.date)}</b><span>{tab==='charge'?`${r.weight} kg × ${r.reps}`:tab==='volume'?`${r.weight*r.reps} kg vol.`:`${estimate1RM(r.weight,r.reps)} kg (est.)`}</span><em>RIR {item.rir}</em><strong>›</strong></div>)}</div>
 </main>
}
