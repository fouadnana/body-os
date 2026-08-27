import { useMemo, useRef, useState } from 'react'
import { Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts'
import { sessions } from './data/program'
import { store, type SetLog, type CoachCheckin } from './lib/storage'
const todayAnatomy = new URL('./assets/today-anatomy.jpg', import.meta.url).href
const l5Spine = new URL('./assets/l5-spine.jpg', import.meta.url).href

type Tab = 'today'|'workout'|'nutrition'|'progress'|'coach'
const target={calories:2800,protein:190,fat:85,carbs:319,steps:8000}

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
  const timerRef=useRef<number|undefined>(undefined)

  const current=sessions[day%sessions.length]
  const latest=daily.at(-1)
  const chartData=daily.slice(-7).length>=2 ? daily.slice(-7) : [
    {date:'L',weight:106.1},{date:'M',weight:105.7},{date:'M2',weight:104.9},{date:'J',weight:105.3},{date:'V',weight:104.6},{date:'S',weight:104.2},{date:'D',weight:103.9}
  ]
  const weight=latest?.weight??105
  const waist=latest?.waist??102.2
  const latestCheck=checkins.at(-1)

  const decision=useMemo(()=>{
    if(!latestCheck)return{type:'KEEP',cls:'keep',text:'Tout est sous contrôle. Continue comme ça.'}
    if(latestCheck.back<=2||latestCheck.recovery<=2)return{type:'RECOVER',cls:'recover',text:'On récupère, on ajuste le volume ou les calories.'}
    if(latestCheck.performance>=4&&latestCheck.recovery>=4)return{type:'PROGRESS',cls:'progress',text:'Excellente progression : tu peux pousser prudemment.'}
    if(latestCheck.adherence>=4&&latestCheck.performance<=2)return{type:'ADJUST',cls:'adjust',text:'Peu ou pas de progression malgré une bonne adhérence.'}
    return{type:'KEEP',cls:'keep',text:'Tout est sous contrôle. Continue comme ça.'}
  },[latestCheck])

  const score=latestCheck?Math.round(((6-latestCheck.fatigue)+latestCheck.recovery+(6-latestCheck.hunger)+latestCheck.performance+latestCheck.adherence+latestCheck.back)/30*100):82
  const exercise=current.exercises[activeEx]??current.exercises[0]
  const sets=exercise?(workout[exercise.id]??Array.from({length:exercise.sets},()=>({weight:'',reps:'',rir:'2',done:false}))):[]

  function setDay(n:number){setDayState(n);store.setDay(n)}
  function updateSet(ex:any,i:number,patch:Partial<SetLog>){
    const old=workout[ex.id]??Array.from({length:ex.sets},()=>({weight:'',reps:'',rir:'2',done:false}))
    const nextSets=old.map((s:any,idx:number)=>idx===i?{...s,...patch}:s)
    const next={...workout,[ex.id]:nextSets};setWorkout(next);store.setWorkout(next)
  }
  function startTimer(sec:number){
    if(timerRef.current)clearInterval(timerRef.current)
    setRest(sec)
    timerRef.current=window.setInterval(()=>setRest(v=>{if(v<=1){if(timerRef.current)clearInterval(timerRef.current);return 0}return v-1}),1000)
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
              <LineChart data={chartData}>
                <XAxis dataKey="date" tick={{fontSize:7,fill:'#7f8998'}} axisLine={false} tickLine={false}/>
                <YAxis hide domain={['dataMin - .6','dataMax + .6']}/>
                <Tooltip contentStyle={{background:'#090e15',border:'1px solid #202a38',borderRadius:8,fontSize:9}}/>
                <Line type="monotone" dataKey="weight" stroke="#8a67ff" strokeWidth={3} dot={{r:3,fill:'#8a67ff'}}/>
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

      {tab==='workout'&&<main className="screen">
        <header className="workoutHead"><button onClick={()=>setTab('today')}>‹</button><div><h2>{current.title}</h2><p>{current.subtitle}</p></div><button>⋮</button></header>
        <div className="stepper">{current.exercises.map((_:any,i:number)=><button onClick={()=>setActiveEx(i)} className={i===activeEx?'active':''} key={i}>{i+1}</button>)}</div>
        <section className="exercisePanel glass">
          <p className="sectionLabel noMargin">Exercice {activeEx+1}/{current.exercises.length}</p>
          <div className="exerciseTitle"><h2>{exercise.name}</h2><span>{exercise.area}</span></div>
          <div className="exerciseMedia"><img src={todayAnatomy} alt="Démonstration exercice"/><button className="play">▶</button></div>
          <div className="cue"><small>CONSIGNES</small><p>{exercise.cue}</p></div>
          <div className="setTable">
            <div className="setRow header"><span>SÉRIE</span><span>POIDS</span><span>REPS</span><span>RIR</span><span>✓</span></div>
            {sets.map((s:any,i:number)=><div className="setRow" key={i}>
              <b>{i+1}</b><input value={s.weight} onChange={e=>updateSet(exercise,i,{weight:e.target.value})}/><input value={s.reps} onChange={e=>updateSet(exercise,i,{reps:e.target.value})}/><input value={s.rir} onChange={e=>updateSet(exercise,i,{rir:e.target.value})}/><button className={s.done?'done':''} onClick={()=>{updateSet(exercise,i,{done:!s.done});if(!s.done)startTimer(exercise.rest)}}>{s.done?'✓':'○'}</button>
            </div>)}
          </div>
          <div className="dual"><button className="secondary">AJOUTER SÉRIE</button><button className="primary" onClick={()=>setActiveEx(Math.min(activeEx+1,current.exercises.length-1))}>TERMINER EXERCICE ✓</button></div>
        </section>
        {rest>0&&<div className="rest"><small>REPOS</small><b>{Math.floor(rest/60)}:{String(rest%60).padStart(2,'0')}</b><button onClick={()=>setRest(0)}>PASSER</button></div>}
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
