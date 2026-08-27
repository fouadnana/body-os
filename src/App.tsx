import { useMemo, useRef, useState } from 'react'
import { Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts'
import { sessions, muscleLabels, type Exercise } from './data/program'
import { store, type SetLog, type CoachCheckin } from './lib/storage'
const todayAnatomy = '/body-os/today-anatomy-premium.png'
const l5Spine = '/body-os/l5-spine.svg'
const workoutInclineDemo = '/body-os/workout-incline-demo.jpg'

type Tab = 'today'|'workout'|'nutrition'|'progress'|'coach'
const target={calories:2800,protein:190,fat:85,carbs:319,steps:8000}
const fallbackTrendData=[
  {day:'L',weight:105.6},{day:'M',weight:105.0},{day:'M',weight:104.4},
  {day:'J',weight:104.9},{day:'V',weight:104.0},{day:'S',weight:103.5},{day:'D',weight:103.1}
]

function prescribedSets(ex:Exercise){
  if(ex.prescription?.length){
    return ex.prescription.map((s,i)=>({
      weight:s.weight??'',
      reps:s.reps,
      rir:s.rir,
      done:ex.id==='incline-machine' && i<3
    }))
  }
  const targetReps=String(ex.reps||'').match(/\d+/)?.[0]||''
  const targetRir=String(ex.rir||'2').match(/\d+/)?.[0]||'2'
  return Array.from({length:ex.sets},()=>({weight:'',reps:targetReps,rir:targetRir,done:false}))
}

const nav:[Tab,string,string][]=[
  ['today','⌂','TODAY'],
  ['workout','⚡','WORKOUT'],
  ['nutrition','◉','NUTRITION'],
  ['progress','▥','PROGRESS'],
  ['coach','◌','AI COACH']
]

export default function App(){
  const [tab,setTab]=useState<Tab>('today')
  const [day,setDayState]=useState(store.getDay())
  const [workout,setWorkout]=useState(store.getWorkout())
  const [daily,setDaily]=useState(store.getDaily())
  const [checkins,setCheckins]=useState(store.getCheckins())
  const [activeEx,setActiveEx]=useState(0)
  const [rest,setRest]=useState(0)
  const [demoOpen,setDemoOpen]=useState(false)
  const timerRef=useRef<number|undefined>(undefined)

  const current=sessions[day%sessions.length]
  const latest=daily.at(-1)
  const weight=latest?.weight??105
  const waist=latest?.waist??102.2
  const latestCheck=checkins.at(-1)
  const trendData=daily.length>=2
    ? daily.slice(-7).map((x:any,i:number)=>({day:['L','M','M','J','V','S','D'][Math.max(0,7-Math.min(7,daily.slice(-7).length)+i)]||'',weight:x.weight}))
    : fallbackTrendData

  const decision=useMemo(()=>{
    if(!latestCheck)return{type:'KEEP',cls:'keep',text:'Tout est sous contrôle. Continue comme ça.'}
    if(latestCheck.back<=2||latestCheck.recovery<=2)return{type:'RECOVER',cls:'recover',text:'On récupère, on ajuste le volume ou les calories.'}
    if(latestCheck.performance>=4&&latestCheck.recovery>=4)return{type:'PROGRESS',cls:'progress',text:'Excellente progression : tu peux pousser prudemment.'}
    if(latestCheck.adherence>=4&&latestCheck.performance<=2)return{type:'ADJUST',cls:'adjust',text:'Peu ou pas de progression malgré une bonne adhérence.'}
    return{type:'KEEP',cls:'keep',text:'Tout est sous contrôle. Continue comme ça.'}
  },[latestCheck])

  const score=latestCheck?Math.round(((6-latestCheck.fatigue)+latestCheck.recovery+(6-latestCheck.hunger)+latestCheck.performance+latestCheck.adherence+latestCheck.back)/30*100):82
  const exercise=current.exercises[activeEx]??current.exercises[0]
  const sets=exercise?(workout[exercise.id]??prescribedSets(exercise)):[]
  const demoAsset=exercise?.media.demoAsset || todayAnatomy
  const hasExerciseDemo=Boolean(exercise?.media.demoAsset)
  const primaryMuscles=exercise?.media.primaryMuscles??[]
  const secondaryMuscles=exercise?.media.secondaryMuscles??[]

  function setDay(n:number){setDayState(n);store.setDay(n)}
  function updateSet(ex:any,i:number,patch:Partial<SetLog>){
    const old=workout[ex.id]??prescribedSets(ex)
    const nextSets=old.map((s:any,idx:number)=>idx===i?{...s,...patch}:s)
    const next={...workout,[ex.id]:nextSets};setWorkout(next);store.setWorkout(next)
  }
  function startTimer(sec:number){
    if(timerRef.current)clearInterval(timerRef.current)
    setRest(sec)
    timerRef.current=window.setInterval(()=>setRest(v=>{if(v<=1){if(timerRef.current)clearInterval(timerRef.current);return 0}return v-1}),1000)
  }
  function addSet(ex:any){
    const old=workout[ex.id]??prescribedSets(ex)
    const next={...workout,[ex.id]:[...old,{weight:'',reps:'',rir:'2',done:false}]}
    setWorkout(next);store.setWorkout(next)
  }
  function finishExercise(){
    if(activeEx<current.exercises.length-1)setActiveEx(activeEx+1)
  }
  function addDaily(form:HTMLFormElement){
    const fd=new FormData(form),w=Number(fd.get('weight'));if(!w)return
    const log={date:new Date().toISOString().slice(0,10),weight:w,waist:Number(fd.get('waist'))||undefined,steps:Number(fd.get('steps'))||undefined,calories:Number(fd.get('calories'))||undefined,protein:Number(fd.get('protein'))||undefined}
    const next=[...daily.filter(x=>x.date!==log.date),log];setDaily(next);store.setDaily(next)
  }
  function addCheck(form:HTMLFormElement){
    const fd=new FormData(form)
    const c:CoachCheckin={date:new Date().toISOString().slice(0,10),fatigue:Number(fd.get('fatigue')),recovery:Number(fd.get('recovery')),hunger:Number(fd.get('hunger')),performance:Number(fd.get('performance')),adherence:Number(fd.get('adherence')),back:Number(fd.get('back')),note:String(fd.get('note')||'')}
    const next=[...checkins.filter(x=>x.date!==c.date),c];setCheckins(next);store.setCheckins(next)
  }

  return <div className="desktopStage">
    <div className="phoneApp">
      {tab==='today'&&<main className="screen todayScreen">
        <header className="appHeader">
          <div className="brand">BODY OS<span>AI CUT</span></div>
          <button aria-label="Notifications">♧</button>
        </header>

        <section className="helloCard glass">
          <div>
            <h3>Bonjour Fouad <span>🔥 7</span></h3>
            <p>Discipline aujourd’hui, liberté demain.</p>
          </div>
          <div className="scoreRing" style={{'--score':`${score*3.6}deg`} as React.CSSProperties}>
            <b>{score}%</b><small>SCORE</small>
          </div>
        </section>

        <p className="sectionLabel">MISSION DU JOUR</p>
        <section className="missionCard glass">
          <div className="missionCopy">
            <h1>{current.title}</h1>
            <p>Haut des pectoraux<br/>Épaules • Triceps</p>
            <button className="primary" onClick={()=>setTab('workout')}>DÉMARRER LA SÉANCE <b>›</b></button>
          </div>
          <div className="missionVisual">
            <img src={todayAnatomy} alt="Illustration anatomique haut du corps"/>
          </div>
        </section>

        <p className="sectionLabel">APERÇU DU JOUR</p>
        <div className="kpiGrid">
          <article><span>🔥</span><small>CALORIES</small><b>{target.calories}</b><em>kcal</em></article>
          <article><span>🍀</span><small>PROTÉINES</small><b>{target.protein}</b><em>g</em></article>
          <article><span>⚡</span><small>PAS</small><b>{latest?.steps??8124}</b><em>/ {target.steps}</em></article>
        </div>

        <section className="l5Card glass">
          <img src={l5Spine} alt="Colonne L5-S1"/>
          <div className="l5Content">
            <b>L5-S1</b>
            <small>NIVEAU 2</small>
            <div className="progressBar"><i style={{width:'50%'}}/></div>
          </div>
          <span>Prochain : J6</span>
        </section>

        <p className="sectionLabel">POIDS & TAILLE (7 JOURS)</p>
        <section className="trendCard glass">
          <div className="trendStats">
            <div><small>POIDS MOYEN</small><b>{weight.toFixed(1)} kg</b><em>↓ -0,6 kg</em></div>
            <div><small>TOUR DE TAILLE</small><b>{waist.toFixed(1)} cm</b><em>↓ -1,1 cm</em></div>
          </div>
          <div className="trendChart">
            <ResponsiveContainer width="100%" height={112}>
              <LineChart data={trendData} margin={{top:8,right:6,bottom:2,left:0}}>
                <XAxis dataKey="day" tick={{fontSize:8,fill:'#7f8998'}} axisLine={false} tickLine={false} interval={0}/>
                <YAxis hide domain={['dataMin - 1','dataMax + 1']}/>
                <Tooltip contentStyle={{background:'#090e15',border:'1px solid #202a38',borderRadius:8,fontSize:9}}/>
                <Line type="monotone" dataKey="weight" stroke="#8a67ff" strokeWidth={3} dot={{r:3,fill:'#a287ff',stroke:'#d6ccff',strokeWidth:1}} activeDot={{r:4}}/>
              </LineChart>
            </ResponsiveContainer>
          </div>
        </section>

        <p className="sectionLabel">AI COACH</p>
        <section className={`aiCoachCard glass ${decision.cls}`}>
          <small>Dernière décision</small>
          <b>{decision.type}</b>
          <p>{decision.text}</p>
          <div className="brainGlow">AI</div>
        </section>
      </main>}

      {tab==='workout'&&<main className="screen workoutScreen">
        <header className="workoutHead">
          <button aria-label="Retour" onClick={()=>setTab('today')}>‹</button>
          <div><h2>{current.title}</h2><p>{current.subtitle}</p></div>
          <button aria-label="Menu">⋮</button>
        </header>

        <div className="stepper" aria-label="Progression de la séance">
          {current.exercises.map((_:any,i:number)=><button
            onClick={()=>setActiveEx(i)}
            className={`${i===activeEx?'active ':''}${i<activeEx?'complete':''}`}
            key={i}>{i+1}</button>)}
        </div>

        <p className="workoutCounter">Exercice {activeEx+1}/{current.exercises.length}</p>

        <section className="exercisePanel glass">
          <div className="exerciseTitle">
            <h2>{exercise.name}</h2><span>{exercise.area}</span>
          </div>

          <div className="exerciseMedia">
            <div className="gymBackdrop">
              <img className={`workoutDemoPhoto ${hasExerciseDemo?'':'genericDemo'}`} src={demoAsset} alt={`Démonstration visuelle : ${exercise.name}`}/>
            </div>
            <button className={`play ${exercise.id==='incline-machine'?'goldenPlayHitbox':''}`} aria-label="Voir la démonstration" onClick={()=>setDemoOpen(true)}>{exercise.id==='incline-machine'?'':'▶'}</button>
            {!hasExerciseDemo&&<span className="mediaPending">DÉMO À PRODUIRE</span>}
            {exercise.id!=='incline-machine'&&<div className={`muscleMap ${exercise.media.anatomyView}`} aria-label="Muscles sollicités">
              <img src={todayAnatomy} alt="Carte anatomique"/>
              <div className="muscleMapLegend">
                {primaryMuscles.slice(0,2).map(m=><span className="primaryMuscle" key={m}>{muscleLabels[m]}</span>)}
              </div>
            </div>}
          </div>

          <div className="cue">
            <small>CONSIGNES</small>
            <p>{exercise.cue}</p>
          </div>

          <div className="setTable">
            <div className="setRow header">
              <span>SÉRIE</span><span>POIDS (KG)</span><span>RÉPÉTITIONS</span><span>RIR</span><span>VALIDÉ</span>
            </div>
            {sets.map((s:any,i:number)=><div className="setRow" key={i}>
              <b>{i+1}</b>
              <input inputMode="decimal" aria-label={`Poids série ${i+1}`} value={s.weight} onChange={e=>updateSet(exercise,i,{weight:e.target.value})}/>
              <input inputMode="numeric" aria-label={`Répétitions série ${i+1}`} value={s.reps} onChange={e=>updateSet(exercise,i,{reps:e.target.value})}/>
              <input inputMode="numeric" aria-label={`RIR série ${i+1}`} value={s.rir} onChange={e=>updateSet(exercise,i,{rir:e.target.value})}/>
              <button aria-label={`Valider série ${i+1}`} className={s.done?'done':''} onClick={()=>{updateSet(exercise,i,{done:!s.done});if(!s.done)startTimer(exercise.rest)}}>{s.done?'✓':'○'}</button>
            </div>)}
          </div>

          <div className="dual">
            <button className="secondary" onClick={()=>addSet(exercise)}>AJOUTER SÉRIE</button>
            <button className="primary" onClick={finishExercise}>TERMINER EXERCICE ✓</button>
          </div>
        </section>

        {activeEx<current.exercises.length-1&&<button className="nextExercise glass" onClick={()=>setActiveEx(activeEx+1)}>
          <div className="nextThumb"><img src={todayAnatomy} alt="Exercice suivant"/></div>
          <div><small>EXERCICE SUIVANT</small><b>{current.exercises[activeEx+1].name}</b><span>{current.exercises[activeEx+1].sets} séries</span></div>
          <strong>›</strong>
        </button>}

        {rest>0&&<div className="rest"><small>REPOS</small><b>{Math.floor(rest/60)}:{String(rest%60).padStart(2,'0')}</b><button onClick={()=>setRest(0)}>PASSER</button></div>}

        {demoOpen&&<div className="demoModal" role="dialog" aria-modal="true" aria-label="Démonstration exercice">
          <button className="demoClose" onClick={()=>setDemoOpen(false)}>×</button>
          <div className="demoVisual"><img src={demoAsset} alt={`Démonstration : ${exercise.name}`}/></div>
          <small>DÉMONSTRATION</small>
          <h3>{exercise.name}</h3>
          <p>{exercise.cue}</p>
          <div className="demoMeta"><span>{exercise.sets} séries</span><span>{exercise.reps} reps</span><span>RIR {exercise.rir}</span><span>{exercise.rest}s repos</span></div>
          <div className="muscleTags">
            {primaryMuscles.map(m=><span className="primaryMuscle" key={m}>{muscleLabels[m]}</span>)}
            {secondaryMuscles.map(m=><span className="secondaryMuscle" key={m}>{muscleLabels[m]}</span>)}
          </div>
          <button className="primary full" onClick={()=>setDemoOpen(false)}>J’AI COMPRIS</button>
        </div>}
      </main>}

      {tab==='nutrition'&&<main className="screen"><header className="pageTitle"><h1>NUTRITION</h1><p>Déficit contrôlé • performance préservée</p></header><div className="macroGrid">{[['CALORIES',2800,'kcal'],['PROTÉINES',190,'g'],['LIPIDES',85,'g'],['GLUCIDES',319,'g']].map(x=><article key={String(x[0])}><small>{x[0]}</small><b>{x[1]}</b><span>{x[2]}</span></article>)}</div></main>}

      {tab==='progress'&&<main className="screen"><header className="pageTitle"><h1>PROGRESS</h1><p>Poids • taille • photos • performances</p></header><form className="panel glass form" onSubmit={e=>{e.preventDefault();addDaily(e.currentTarget)}}><input name="weight" type="number" step=".1" placeholder="Poids kg"/><input name="waist" type="number" step=".1" placeholder="Tour de taille cm"/><input name="steps" type="number" placeholder="Pas"/><input name="calories" type="number" placeholder="Calories"/><input name="protein" type="number" placeholder="Protéines"/><button className="primary">ENREGISTRER</button></form></main>}

      {tab==='coach'&&<main className="screen">
        <header className="coachHero"><div><h1>AI COACH</h1><p>Ton coach intelligent</p></div><div className="orb">AI</div></header>
        <form className="coachForm" onSubmit={e=>{e.preventDefault();addCheck(e.currentTarget)}}>
          {[['fatigue','FATIGUE GÉNÉRALE',3],['recovery','RÉCUPÉRATION / SOMMEIL',5],['hunger','Faim / Appétit',3],['performance','PERFORMANCES À L’ENTRAÎNEMENT',5],['adherence','ADHÉRENCE NUTRITION',5],['back','ÉTAT DU DOS (L5-S1)',5]].map(([name,label,val])=><label className="sliderCard" key={String(name)}><div><b>{label}</b><span>{val}/5</span></div><input name={String(name)} type="range" min="1" max="5" defaultValue={Number(val)}/></label>)}
          <label className="note"><span>COMMENTAIRES</span><textarea name="note" defaultValue="Bonne énergie cette semaine. Sommeil correct. Motivé."/></label><button className="primary full">ENVOYER LE CHECK-IN</button>
        </form>
      </main>}

      <nav className="bottomNav">
        {nav.map(([id,icon,label])=><button key={id} onClick={()=>setTab(id)} className={tab===id?'active':''}><span>{icon}</span><small>{label}</small></button>)}
      </nav>
    </div>
  </div>
}
