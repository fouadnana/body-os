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
  const consumed={calories:latest?.calories??2180,protein:latest?.protein??152,fat:68,carbs:241}
  const remaining={calories:Math.max(0,target.calories-consumed.calories),protein:Math.max(0,target.protein-consumed.protein),fat:Math.max(0,target.fat-consumed.fat),carbs:Math.max(0,target.carbs-consumed.carbs)}
  const nutritionScore=Math.round(((Math.min(consumed.protein/target.protein,1)*.45)+(Math.min(consumed.calories/target.calories,1)*.35)+.20)*100)
  const exercise=current.exercises[activeEx]??current.exercises[0]
  const sets=exercise?(workout[exercise.id]??prescribedSets(exercise)):[]
  const demoAsset=exercise?.media.demoAsset || todayAnatomy
  const hasExerciseDemo=Boolean(exercise?.media.demoAsset)
  const anatomyAsset=exercise?.media.anatomyAsset || todayAnatomy
  const primaryMuscles=exercise?.media.primaryMuscles??[]
  const secondaryMuscles=exercise?.media.secondaryMuscles??[]

  function setDay(n:number){setDayState(n);store.setDay(n);setActiveEx(0)}
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

        <div className="sessionRail" aria-label="Choisir une séance">
          {sessions.map((s,i)=><button key={s.id} className={i===day%sessions.length?'active':''} onClick={()=>setDay(i)}>
            <small>{s.day}</small><b>{s.title}</b>
          </button>)}
        </div>

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
              <img src={anatomyAsset} alt={`Carte anatomique : ${exercise.area}`}/>
              <div className="muscleMapLegend">
                {primaryMuscles.slice(0,2).map(m=><span className="primaryMuscle" key={m}>{muscleLabels[m]}</span>)}
              </div>
            </div>}
          </div>

          <div className="exerciseMetaStrip">
            <article>
              <small>MUSCLES CIBLES</small>
              <b>{primaryMuscles.map(m=>muscleLabels[m]).join(' • ')}</b>
            </article>
            <article className={`risk-${exercise.backRisk||'low'}`}>
              <small>RISQUE DOS</small>
              <b>{exercise.backRisk==='high'?'ÉLEVÉ':exercise.backRisk==='medium'?'MODÉRÉ':'FAIBLE'}</b>
            </article>
            <article>
              <small>REPOS</small>
              <b>{exercise.rest}s</b>
            </article>
          </div>

          <div className="exerciseProgress">
            <span><i style={{width:`${Math.round(((activeEx+1)/current.exercises.length)*100)}%`}}/></span>
            <small>{activeEx+1}/{current.exercises.length}</small>
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
          <div className="nextThumb"><img src={current.exercises[activeEx+1].media.demoAsset || todayAnatomy} alt="Exercice suivant"/></div>
          <div><small>EXERCICE SUIVANT</small><b>{current.exercises[activeEx+1].name}</b><span>{current.exercises[activeEx+1].sets} séries</span></div>
          <strong>›</strong>
        </button>}


        <details className="mockupCatalog glass">
          <summary><span>MAQUETTES DE LA SÉANCE</span><b>{current.exercises.length}/{current.exercises.length}</b></summary>
          <div className="mockupGrid">
            {current.exercises.map((ex,i)=><button key={ex.id} className={i===activeEx?'active':''} onClick={()=>setActiveEx(i)}>
              <img src={ex.media.demoAsset || todayAnatomy} alt=""/>
              <span><small>{i+1}. {ex.area}</small><b>{ex.name}</b></span>
            </button>)}
          </div>
        </details>

        {rest>0&&<div className="rest"><small>REPOS</small><b>{Math.floor(rest/60)}:{String(rest%60).padStart(2,'0')}</b><button onClick={()=>setRest(0)}>PASSER</button></div>}

        {demoOpen&&<div className="demoModal" role="dialog" aria-modal="true" aria-label="Démonstration exercice">
          <button className="demoClose" onClick={()=>setDemoOpen(false)}>×</button>
          <div className="demoVisual">
            <img src={demoAsset} alt={`Démonstration : ${exercise.name}`}/>
            {exercise.id!=='incline-machine'&&<img className="demoAnatomy" src={anatomyAsset} alt={`Anatomie : ${exercise.area}`}/>}
          </div>
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

      {tab==='nutrition'&&<main className="screen nutritionScreen">
        <header className="moduleHeader">
          <div><small>BODY OS / AI CUT</small><h1>NUTRITION</h1><p>Déficit contrôlé • performance préservée</p></div>
          <div className="miniScore"><b>{nutritionScore}%</b><span>JOUR</span></div>
        </header>

        <section className="nutritionHero glass">
          <div className="calorieRing" style={{'--nutrition':`${Math.min(consumed.calories/target.calories,1)*360}deg`} as React.CSSProperties}>
            <div><b>{consumed.calories}</b><small>/ {target.calories} kcal</small></div>
          </div>
          <div className="nutritionHeroCopy">
            <small>RESTANT AUJOURD’HUI</small>
            <b>{remaining.calories} kcal</b>
            <p>Priorité : atteindre les protéines sans dépasser la cible calorique.</p>
          </div>
        </section>

        <p className="sectionLabel">MACROS DU JOUR</p>
        <section className="macroProgress glass">
          {[
            ['PROTÉINES',consumed.protein,target.protein,'g','protein'],
            ['GLUCIDES',consumed.carbs,target.carbs,'g','carbs'],
            ['LIPIDES',consumed.fat,target.fat,'g','fat']
          ].map(([label,value,goal,unit,cls])=><div className="macroLine" key={String(label)}>
            <div><b>{label}</b><span>{value} / {goal} {unit}</span></div>
            <div className="macroTrack"><i className={String(cls)} style={{width:`${Math.min(Number(value)/Number(goal),1)*100}%`}}/></div>
          </div>)}
        </section>

        <p className="sectionLabel">REPAS</p>
        <section className="mealList">
          {[
            ['PETIT-DÉJEUNER','520 kcal','38 g prot.','✓'],
            ['DÉJEUNER','760 kcal','56 g prot.','✓'],
            ['COLLATION','310 kcal','28 g prot.','✓'],
            ['DÎNER','590 kcal','30 g prot.','+']
          ].map(([name,kcal,prot,status])=><article className="mealCard glass" key={name}>
            <div className="mealIcon">{status==='✓'?'✓':'+'}</div>
            <div><b>{name}</b><span>{kcal} • {prot}</span></div>
            <strong>›</strong>
          </article>)}
        </section>

        <section className="nutritionFooterGrid">
          <article className="glass"><small>EAU</small><b>2,1 L</b><span>/ 3,0 L</span><div className="tinyTrack"><i style={{width:'70%'}}/></div></article>
          <article className="glass"><small>ADHÉRENCE</small><b>5 / 7</b><span>jours dans la cible</span><div className="tinyTrack purple"><i style={{width:'71%'}}/></div></article>
        </section>
      </main>}

      {tab==='progress'&&<main className="screen progressScreen">
        <header className="moduleHeader">
          <div><small>BODY OS / AI CUT</small><h1>PROGRESS</h1><p>Poids • taille • photos • performances</p></div>
          <div className="trendBadge">↘ <b>-2,5 kg</b><span>30 J</span></div>
        </header>

        <section className="progressKpis">
          <article className="glass"><small>POIDS</small><b>{weight.toFixed(1)} kg</b><span>Objectif 100 kg</span></article>
          <article className="glass"><small>TOUR DE TAILLE</small><b>{waist.toFixed(1)} cm</b><span>↘ -1,1 cm</span></article>
        </section>

        <p className="sectionLabel">ÉVOLUTION 7 JOURS</p>
        <section className="progressChartCard glass">
          <div className="chartHeadline"><div><small>TENDANCE</small><b>-0,6 kg</b></div><span>Bonne trajectoire</span></div>
          <div className="progressChart">
            <ResponsiveContainer width="100%" height={150}>
              <LineChart data={trendData} margin={{top:10,right:10,bottom:4,left:0}}>
                <XAxis dataKey="day" tick={{fontSize:8,fill:'#7f8998'}} axisLine={false} tickLine={false}/>
                <YAxis hide domain={['dataMin - .7','dataMax + .7']}/>
                <Tooltip contentStyle={{background:'#090e15',border:'1px solid #202a38',borderRadius:8,fontSize:9}}/>
                <Line type="monotone" dataKey="weight" stroke="#8a67ff" strokeWidth={3} dot={{r:3,fill:'#a287ff',stroke:'#d6ccff',strokeWidth:1}}/>
              </LineChart>
            </ResponsiveContainer>
          </div>
        </section>

        <p className="sectionLabel">PHOTOS DE PROGRESSION</p>
        <section className="photoStrip">
          {['FACE','PROFIL','DOS'].map((x,i)=><article className="photoSlot glass" key={x}><div className="silhouette">{i===1?'◐':'◉'}</div><b>{x}</b><span>AJOUTER PHOTO</span></article>)}
        </section>

        <details className="logDetails glass">
          <summary>ENREGISTRER LES MESURES <span>+</span></summary>
          <form className="form progressForm" onSubmit={e=>{e.preventDefault();addDaily(e.currentTarget)}}>
            <div className="twoCols"><input name="weight" type="number" step=".1" placeholder="Poids kg"/><input name="waist" type="number" step=".1" placeholder="Tour de taille cm"/></div>
            <div className="twoCols"><input name="steps" type="number" placeholder="Pas"/><input name="calories" type="number" placeholder="Calories"/></div>
            <input name="protein" type="number" placeholder="Protéines g"/>
            <button className="primary">ENREGISTRER</button>
          </form>
        </details>
      </main>}

      {tab==='coach'&&<main className="screen coachScreen">
        <header className="coachHero goldenCoachHero">
          <div><small>BODY OS / AI CUT</small><h1>AI COACH</h1><p>Décision hebdomadaire guidée par tes données</p></div>
          <div className="orb"><span>AI</span></div>
        </header>

        <section className="checkinProgress glass">
          <div><small>CHECK-IN HEBDOMADAIRE</small><b>4 / 7 données complètes</b></div>
          <span>57%</span>
          <div className="checkTrack"><i style={{width:'57%'}}/></div>
        </section>

        <form className="coachForm goldenCoachForm" onSubmit={e=>{e.preventDefault();addCheck(e.currentTarget)}}>
          <p className="sectionLabel noMargin">ÉTAT DE LA SEMAINE</p>
          {[
            ['fatigue','FATIGUE GÉNÉRALE',3,'Faible','Élevée'],
            ['recovery','RÉCUPÉRATION / SOMMEIL',4,'Faible','Excellente'],
            ['hunger','FAIM / APPÉTIT',3,'Faible','Élevée'],
            ['performance','PERFORMANCES',4,'En baisse','En hausse'],
            ['adherence','ADHÉRENCE NUTRITION',5,'Faible','Parfaite'],
            ['back','ÉTAT DU DOS L5-S1',4,'Sensible','Très bon']
          ].map(([name,label,val,left,right])=><label className="sliderCard coachSlider" key={String(name)}>
            <div><b>{label}</b><span>{val}/5</span></div>
            <input name={String(name)} type="range" min="1" max="5" defaultValue={Number(val)}/>
            <small><span>{left}</span><span>{right}</span></small>
          </label>)}

          <label className="note coachNote"><span>NOTE LIBRE</span><textarea name="note" defaultValue="Bonne énergie cette semaine. Sommeil correct. Motivé."/></label>
          <button className="primary full coachSubmit">ANALYSER MON CHECK-IN</button>
        </form>

        <p className="sectionLabel">DÉCISION AI COACH</p>
        <section className={`coachDecision glass ${decision.cls}`}>
          <div className="decisionPulse">AI</div>
          <div><small>RECOMMANDATION</small><b>{decision.type}</b><p>{decision.text}</p></div>
          <span>›</span>
        </section>
      </main>}
      <nav className="bottomNav">
        {nav.map(([id,icon,label])=><button key={id} onClick={()=>setTab(id)} className={tab===id?'active':''}><span>{icon}</span><small>{label}</small></button>)}
      </nav>
    </div>
  </div>
}
