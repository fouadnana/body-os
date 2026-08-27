import {useEffect,useMemo,useRef,useState} from 'react'
import {Line,LineChart,ResponsiveContainer,Tooltip,XAxis,YAxis} from 'recharts'
import {BottomNav,type Tab} from './components/BottomNav'
import {Anatomy} from './components/Anatomy'
import {sessions,backLevels,type Exercise} from './data/program'
import {store,type SetLog,type CoachCheckin,type WorkoutHistoryEntry} from './lib/storage'
import {latestPhotos,savePhoto,type PhotoSlot} from './lib/photoDb'

const target={calories:2800,protein:190,fat:85,carbs:319,steps:8000}
const todayISO=()=>new Date().toISOString().slice(0,10)
const avg=(v:number[])=>v.length?v.reduce((a,b)=>a+b,0)/v.length:0
const upperRep=(range:string)=>{const m=range.match(/(\d+)\D+(\d+)/);return m?Number(m[2]):Number(range.match(/\d+/)?.[0]||0)}

export default function App(){
  const[tab,setTab]=useState<Tab>('today')
  const[day,setDayState]=useState(store.getDay())
  const[workout,setWorkout]=useState(store.getWorkout())
  const[history,setHistory]=useState(store.getHistory())
  const[daily,setDaily]=useState(store.getDaily())
  const[checkins,setCheckins]=useState(store.getCheckins())
  const[backLevel,setBackLevelState]=useState(store.getBackLevel())
  const[activeExercise,setActiveExercise]=useState<number|null>(null)
  const[rest,setRest]=useState(0)
  const[photoUrls,setPhotoUrls]=useState<Record<PhotoSlot,string|undefined>>({front:undefined,side:undefined,back:undefined})
  const timerRef=useRef<number|undefined>(undefined)

  const current=sessions[day%sessions.length]
  const latest=daily.at(-1)
  const currentWeight=latest?.weight??105
  const latestWaist=latest?.waist??102.2
  const latestCheck=checkins.at(-1)

  useEffect(()=>{latestPhotos().then(p=>{
    const urls:Record<PhotoSlot,string|undefined>={front:undefined,side:undefined,back:undefined}
    ;(['front','side','back'] as PhotoSlot[]).forEach(k=>{if(p[k])urls[k]=URL.createObjectURL(p[k]!.blob)})
    setPhotoUrls(urls)
  }).catch(()=>{})},[])

  const decision=useMemo(()=>{
    if(!latestCheck)return{type:'KEEP',className:'keep',text:'Commence le plan et collecte 7–14 jours de données.'}
    if(latestCheck.back<=2||latestCheck.recovery<=2)return{type:'RECOVER',className:'recover',text:'Récupération prioritaire. Pas de progression de charge aujourd’hui.'}
    const d=daily.slice(-14)
    if(d.length>=10){
      const half=Math.floor(d.length/2),old=d.slice(0,half),recent=d.slice(half)
      const oldW=avg(old.map(x=>x.weight)),newW=avg(recent.map(x=>x.weight)),weeklyLoss=(oldW-newW)*(7/Math.max(1,recent.length))
      const oldWa=avg(old.map(x=>x.waist).filter((x):x is number=>x!==undefined)),newWa=avg(recent.map(x=>x.waist).filter((x):x is number=>x!==undefined))
      if(weeklyLoss>1)return{type:'RECOVER',className:'recover',text:'Perte rapide : protège performances et récupération.'}
      if(weeklyLoss<.15&&oldWa&&newWa&&newWa<oldWa-.4)return{type:'KEEP',className:'keep',text:'Poids lent mais taille en baisse : ne coupe pas davantage les calories.'}
      if(weeklyLoss<.15&&(!oldWa||!newWa||newWa>=oldWa-.2)&&latestCheck.adherence>=4)return{type:'ADJUST',className:'adjust',text:'Stagnation réelle + bonne adhérence : petit ajustement calories ou activité.'}
    }
    if(latestCheck.performance>=4&&latestCheck.recovery>=4&&latestCheck.back>=4)return{type:'PROGRESS',className:'progress',text:'Récupération et performances solides : progression autorisée sur les exercices validés.'}
    return{type:'KEEP',className:'keep',text:'Trajectoire acceptable : continue comme ça.'}
  },[latestCheck,daily])

  const score=latestCheck?Math.round(((6-latestCheck.fatigue)+latestCheck.recovery+(6-latestCheck.hunger)+latestCheck.performance+latestCheck.adherence+latestCheck.back)/30*100):82
  const blockedByBack=latestCheck?.back!==undefined&&latestCheck.back<=2
  const setDay=(n:number)=>{setDayState(n);store.setDay(n)}

  function getSets(ex:Exercise){return workout[ex.id]??Array.from({length:ex.sets},()=>({weight:'',reps:'',rir:'2',done:false}))}
  function updateSet(ex:Exercise,si:number,patch:Partial<SetLog>){
    const old=getSets(ex);const nextSets=old.map((s,i)=>i===si?{...s,...patch}:s);const next={...workout,[ex.id]:nextSets};setWorkout(next);store.setWorkout(next)
  }
  function startTimer(sec:number){if(timerRef.current)clearInterval(timerRef.current);setRest(sec);timerRef.current=window.setInterval(()=>setRest(v=>{if(v<=1){if(timerRef.current)clearInterval(timerRef.current);return 0}return v-1}),1000)}

  function exerciseAdvice(ex:Exercise){
    const previous=history.filter(h=>h.exerciseId===ex.id).at(-1)
    if(!previous)return'BASELINE — construis une première séance propre.'
    const max=upperRep(ex.reps)
    const done=previous.sets.filter(s=>s.done)
    if(done.length<ex.sets)return'KEEP — complète d’abord toutes les séries.'
    const reps=done.map(s=>Number(s.reps)||0),rirs=done.map(s=>Number(s.rir)||3)
    if(reps.every(r=>r>=max)&&avg(rirs)<=2)return'PROGRESS — ajoute ~2,5 à 5 % de charge la prochaine fois.'
    return'KEEP — garde la charge et essaie d’ajouter 1–2 répétitions totales.'
  }

  function finishSession(){
    const now=new Date().toISOString();const added:WorkoutHistoryEntry[]=[]
    current.exercises.forEach(ex=>{
      const sets=getSets(ex),done=sets.filter(s=>s.done);if(!done.length)return
      const volume=done.reduce((sum,s)=>sum+(Number(s.weight)||0)*(Number(s.reps)||0),0)
      added.push({id:`${now}-${ex.id}`,date:now,sessionId:current.id,exerciseId:ex.id,sets,volume})
    })
    if(!added.length)return
    const next=[...history,...added];setHistory(next);store.setHistory(next)
    const cleared={...workout};current.exercises.forEach(ex=>{cleared[ex.id]=getSets(ex).map(s=>({...s,done:false}))});setWorkout(cleared);store.setWorkout(cleared)
    setActiveExercise(null);setTab('today')
  }

  function addDaily(form:HTMLFormElement){
    const fd=new FormData(form),log={date:todayISO(),weight:Number(fd.get('weight')),waist:Number(fd.get('waist'))||undefined,steps:Number(fd.get('steps'))||undefined,calories:Number(fd.get('calories'))||undefined,protein:Number(fd.get('protein'))||undefined,carbs:Number(fd.get('carbs'))||undefined,fat:Number(fd.get('fat'))||undefined}
    if(!log.weight)return;const next=[...daily.filter(x=>x.date!==log.date),log];setDaily(next);store.setDaily(next)
  }
  function addCheckin(form:HTMLFormElement){
    const fd=new FormData(form),c:CoachCheckin={date:todayISO(),fatigue:Number(fd.get('fatigue')),recovery:Number(fd.get('recovery')),hunger:Number(fd.get('hunger')),performance:Number(fd.get('performance')),adherence:Number(fd.get('adherence')),back:Number(fd.get('back')),note:String(fd.get('note')||'')}
    const next=[...checkins.filter(x=>x.date!==c.date),c];setCheckins(next);store.setCheckins(next)
  }
  async function onPhoto(slot:PhotoSlot,file?:File){if(!file)return;await savePhoto(slot,file,todayISO());setPhotoUrls(v=>({...v,[slot]:URL.createObjectURL(file)}))}

  const last7=daily.slice(-7),avgWeight=last7.length?avg(last7.map(x=>x.weight)):currentWeight
  const completedThisSession=current.exercises.reduce((n,e)=>n+getSets(e).filter(s=>s.done).length,0)
  const totalSets=current.exercises.reduce((n,e)=>n+e.sets,0)

  return <div className="app"><header className="appHeader"><div><strong>BODY OS</strong><span>AI CUT</span></div><button className="iconBtn">♡</button></header><main>
  {tab==='today'&&<section className="screen">
    <div className="welcomeCard glass"><div><h2>Bonjour</h2><p>Discipline aujourd’hui, liberté demain.</p></div><div className="scoreRing" style={{'--score':`${score*3.6}deg`} as React.CSSProperties}><b>{score}%</b><small>SCORE</small></div></div>
    <h3 className="sectionTitle">MISSION DU JOUR</h3><div className="missionCard"><div><span className="pill">{current.title}</span><h1>{current.subtitle}</h1><button className="primary" onClick={()=>setTab('workout')}>DÉMARRER LA SÉANCE <span>›</span></button></div><Anatomy/></div>
    <h3 className="sectionTitle">APERÇU DU JOUR</h3><div className="kpiGrid"><article><span>🔥</span><small>CALORIES</small><b>{latest?.calories??target.calories}</b><em>kcal</em></article><article><span>🍀</span><small>PROTÉINES</small><b>{latest?.protein??target.protein}</b><em>g</em></article><article><span>⚡</span><small>PAS</small><b>{latest?.steps??8124}</b><em>/ {target.steps}</em></article></div>
    <div className="backMini glass"><Anatomy accent="#22d37a"/><div><b>L5-S1</b><span>NIVEAU {backLevel}</span><div className="miniProgress"><i style={{width:`${backLevel/4*100}%`}}/></div></div><small>{blockedByBack?'MODE PRUDENT':'OK'}</small></div>
    <div className="trendCard glass"><div className="trendHead"><div><small>POIDS MOYEN 7J</small><b>{avgWeight.toFixed(1)} kg</b><span>objectif 100</span></div><div><small>TOUR DE TAILLE</small><b>{latestWaist.toFixed(1)} cm</b></div></div><div className="miniChart"><ResponsiveContainer width="100%" height={120}><LineChart data={last7}><YAxis hide domain={['dataMin - 1','dataMax + 1']}/><Line type="monotone" dataKey="weight" stroke="#9670ff" strokeWidth={3}/></LineChart></ResponsiveContainer></div></div>
    <div className={`coachMini ${decision.className}`}><small>DERNIÈRE DÉCISION</small><b>{decision.type}</b><p>{decision.text}</p></div>
  </section>}

  {tab==='workout'&&<section className="screen"><div className="workoutTop"><button className="backBtn" onClick={()=>setTab('today')}>‹</button><div><h2>{current.title}</h2><p>{current.subtitle}</p></div><button className="iconBtn">⋮</button></div>
    <div className="dayStepper">{sessions.map((s,i)=><button key={s.id} onClick={()=>{setDay(i);setActiveExercise(null)}} className={i===day?'active':''}>{i+1}</button>)}</div>
    <div className="sessionProgress"><span><b>{completedThisSession}</b> / {totalSets} séries validées</span><div><i style={{width:`${totalSets?completedThisSession/totalSets*100:0}%`}}/></div></div>
    {(activeExercise===null?current.exercises.map((e,ei)=>({e,ei})):[{e:current.exercises[activeExercise],ei:activeExercise}]).map(({e,ei})=>{const sets=getSets(e),block=blockedByBack&&e.backRisk==='medium';return <article className={`exerciseCard ${block?'blocked':''}`} key={e.id}><div className="exerciseHeader"><div><span>EXERCICE {ei+1}/{current.exercises.length}</span><h2>{e.name}</h2><small className="areaTag">{e.area}</small></div><Anatomy accent={block?'#ff544f':'#4478ff'}/></div>{block&&<div className="blockWarning">⚠️ Check-in dos orange/rouge : charge et amplitude à réduire, ou exercice à remplacer.</div>}<div className="advice">{exerciseAdvice(e)}</div><div className="cue"><b>CONSIGNE</b><p>{e.cue}</p></div><div className="setTable"><div className="setRow header"><span>SÉRIE</span><span>POIDS</span><span>REPS</span><span>RIR</span><span>✓</span></div>{sets.map((s,si)=><div className="setRow" key={si}><b>{si+1}</b><input value={s.weight} disabled={block} onChange={x=>updateSet(e,si,{weight:x.target.value})} inputMode="decimal"/><input value={s.reps} disabled={block} onChange={x=>updateSet(e,si,{reps:x.target.value})} inputMode="numeric"/><input value={s.rir} disabled={block} onChange={x=>updateSet(e,si,{rir:x.target.value})} inputMode="numeric"/><button disabled={block} className={s.done?'done':''} onClick={()=>{updateSet(e,si,{done:!s.done});if(!s.done)startTimer(e.rest)}}>{s.done?'✓':'○'}</button></div>)}</div><div className="workoutActions"><button onClick={()=>setActiveExercise(null)} className="secondary">TOUS LES EXOS</button><button className="primary" onClick={()=>setActiveExercise(activeExercise!==null?null:ei)}>{activeExercise!==null?'TERMINER':'OUVRIR'}</button></div></article>})}
    <button className="finishSession" onClick={finishSession}>TERMINER LA SÉANCE</button>{rest>0&&<div className="restTimer"><small>REPOS</small><b>{Math.floor(rest/60)}:{String(rest%60).padStart(2,'0')}</b><button onClick={()=>setRest(0)}>PASSER</button></div>}
  </section>}

  {tab==='nutrition'&&<section className="screen"><div className="screenTitle"><h1>NUTRITION</h1><p>Déficit contrôlé • performance préservée</p></div><div className="macroGrid"><article><small>CALORIES</small><b>{target.calories}</b><span>kcal</span></article><article><small>PROTÉINES</small><b>{target.protein}</b><span>g</span></article><article><small>LIPIDES</small><b>{target.fat}</b><span>g</span></article><article><small>GLUCIDES</small><b>{target.carbs}</b><span>g</span></article></div>
    <form className="panel nutritionForm" onSubmit={x=>{x.preventDefault();addDaily(x.currentTarget)}}><h3>LOG DU JOUR</h3><label>Poids<input name="weight" type="number" step=".1" defaultValue={currentWeight}/></label><label>Calories<input name="calories" type="number" defaultValue={target.calories}/></label><label>Protéines<input name="protein" type="number" defaultValue={target.protein}/></label><label>Glucides<input name="carbs" type="number" defaultValue={target.carbs}/></label><label>Lipides<input name="fat" type="number" defaultValue={target.fat}/></label><label>Pas<input name="steps" type="number" defaultValue={target.steps}/></label><button className="primary">ENREGISTRER</button></form>
    <div className="panel"><h3>STRUCTURE DU JOUR</h3>{[['Petit-déjeuner','Œufs + skyr/fromage blanc + avoine + fruit'],['Déjeuner','Protéine maigre + riz/pommes de terre + légumes + huile d’olive'],['Pré / post training','Banane + skyr/whey + glucides selon tolérance'],['Dîner','Poisson/poulet/viande maigre + féculent + légumes + fruit']].map(([a,b])=><div className="meal" key={a}><b>{a}</b><p>{b}</p></div>)}</div><div className="panel"><h3>ACTIVITÉ</h3><p><b>{target.steps.toLocaleString('fr-FR')} pas/jour</b> + <b>2 × 25–30 min Zone 2</b> / semaine.</p></div>
  </section>}

  {tab==='progress'&&<section className="screen"><div className="screenTitle"><h1>PROGRESS</h1><p>Poids • taille • photos • historique</p></div><form className="panel progressForm" onSubmit={x=>{x.preventDefault();addDaily(x.currentTarget)}}><h3>MESURE DU JOUR</h3><label>Poids (kg)<input name="weight" type="number" step=".1" defaultValue={currentWeight}/></label><label>Tour de taille (cm)<input name="waist" type="number" step=".1" defaultValue={latestWaist}/></label><label>Pas<input name="steps" type="number" defaultValue={target.steps}/></label><label>Calories<input name="calories" type="number" defaultValue={target.calories}/></label><label>Protéines (g)<input name="protein" type="number" defaultValue={target.protein}/></label><button className="primary">ENREGISTRER</button></form>
    <div className="panel chartPanel"><h3>POIDS</h3><ResponsiveContainer width="100%" height={260}><LineChart data={daily}><XAxis dataKey="date" hide/><YAxis width={42} domain={['dataMin - 1','dataMax + 1']}/><Tooltip/><Line type="monotone" dataKey="weight" stroke="#9b74ff" strokeWidth={3}/></LineChart></ResponsiveContainer></div>
    <div className="panel"><h3>PROGRESS PHOTOS</h3><div className="photoGrid">{([['front','FACE'],['side','PROFIL'],['back','DOS']] as [PhotoSlot,string][]).map(([slot,label])=><label className="photoSlot" key={slot}>{photoUrls[slot]?<img src={photoUrls[slot]} alt={label}/>:label}<input type="file" accept="image/*" onChange={e=>onPhoto(slot,e.target.files?.[0])}/></label>)}</div><p className="micro">Les photos sont enregistrées localement sur l’appareil via IndexedDB.</p></div>
    <div className="panel"><h3>DERNIÈRES SÉANCES</h3>{history.slice(-8).reverse().map(h=><div className="historyRow" key={h.id}><b>{sessions.find(s=>s.id===h.sessionId)?.title} · {sessions.flatMap(s=>s.exercises).find(e=>e.id===h.exerciseId)?.name}</b><span>{new Date(h.date).toLocaleDateString('fr-FR')} · volume {Math.round(h.volume)} kg</span></div>)}{!history.length&&<p className="micro">Aucune séance archivée pour l’instant.</p>}</div>
  </section>}

  {tab==='coach'&&<section className="screen"><div className="coachHero"><div><h1>AI COACH</h1><p>Check-in & décisions</p></div><div className="brainOrb">AI</div></div><form className="coachForm" onSubmit={x=>{x.preventDefault();addCheckin(x.currentTarget)}}>{[['fatigue','FATIGUE GÉNÉRALE',3],['recovery','RÉCUPÉRATION / SOMMEIL',4],['hunger','FAIM / APPÉTIT',3],['performance','PERFORMANCES À L’ENTRAÎNEMENT',4],['adherence','ADHÉRENCE NUTRITION',5],['back','ÉTAT DU DOS (L5-S1)',5]].map(([name,label,val])=><label className="sliderCard" key={String(name)}><div><b>{label}</b><span>1 → 5</span></div><input name={String(name)} type="range" min="1" max="5" defaultValue={Number(val)}/></label>)}<label className="noteBox">COMMENTAIRES<textarea name="note" placeholder="Énergie, sommeil, motivation…"/></label><button className="primary">ENVOYER LE CHECK-IN</button></form><div className={`decisionCard ${decision.className}`}><small>DERNIÈRE DÉCISION IA</small><h2>{decision.type}</h2><p>{decision.text}</p></div><div className="backLevels"><h3>L5-S1 — NIVEAU ACTUEL</h3>{backLevels.map(l=><button key={l.level} onClick={()=>{setBackLevelState(l.level);store.setBackLevel(l.level)}} className={backLevel===l.level?'active':''}><span style={{background:l.color}}>{l.level}</span><div><b>{l.title}</b><small>{l.exercises.join(' • ')}</small></div></button>)}</div></section>}
  </main><BottomNav tab={tab} onChange={setTab}/></div>
}
