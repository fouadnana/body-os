import { useMemo, useRef, useState } from 'react'
import { Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts'
import { sessions } from './data/program'
import { store, type SetLog, type CoachCheckin } from './lib/storage'
import { PremiumAnatomy } from './components/PremiumAnatomy'

type Tab = 'today'|'workout'|'nutrition'|'progress'|'coach'
const target={calories:2800,protein:190,fat:85,carbs:319,steps:8000}

const nav:[Tab,string,string][]=[
  ['today','⌂','TODAY'],['workout','⚡','WORKOUT'],['nutrition','◉','NUTRITION'],['progress','▥','PROGRESS'],['coach','◌','AI COACH']
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

  return <div className="appShell">
    <div className="appFrame">
      {tab==='today'&&<main className="screen todayScreen">
        <header className="appHeader"><div className="brand">BODY OS<span>AI CUT</span></div><button>♧</button></header>

        <section className="helloCard glass">
          <div><h3>Bonjour Fouad <span>🔥 7</span></h3><p>Discipline aujourd’hui, liberté demain.</p></div>
          <div className="scoreRing" style={{'--score':`${score*3.6}deg`} as React.CSSProperties}><b>{score}%</b><small>SCORE</small></div>
        </section>

        <div className="todayGrid">
          <div className="todayMain">
            <p className="label">MISSION DU JOUR</p>
            <section className="mission glass">
              <div className="missionCopy"><h1>{current.title}</h1><p>{current.subtitle}</p><button className="primary" onClick={()=>setTab('workout')}>DÉMARRER LA SÉANCE <b>›</b></button></div>
              <PremiumAnatomy/>
            </section>

            <p className="label">APERÇU DU JOUR</p>
            <div className="kpis">
              <article><span>🔥</span><small>CALORIES</small><b>{target.calories}</b><em>kcal</em></article>
              <article><span>🍀</span><small>PROTÉINES</small><b>{target.protein}</b><em>g</em></article>
              <article><span>⚡</span><small>PAS</small><b>{latest?.steps??8124}</b><em>/ {target.steps}</em></article>
            </div>

            <section className="l5Card glass">
              <div className="l5Figure"><PremiumAnatomy mode="back" small/></div>
              <div><b>L5-S1</b><small>NIVEAU 2</small><div className="bar"><i style={{width:'50%'}}/></div></div>
              <span>Prochain : J6</span>
            </section>
          </div>

          <aside className="todaySide">
            <p className="label">POIDS & TAILLE (7 JOURS)</p>
            <section className="trend glass">
              <div className="trendTop"><div><small>POIDS MOYEN</small><b>{weight.toFixed(1)} kg</b><em>↓ -0,6 kg</em></div><div><small>TOUR DE TAILLE</small><b>{waist.toFixed(1)} cm</b><em>↓ -1,1 cm</em></div></div>
              <div className="chartMini"><ResponsiveContainer width="100%" height={170}><LineChart data={daily.slice(-7)}><XAxis dataKey="date" hide/><YAxis hide domain={['dataMin - 1','dataMax + 1']}/><Tooltip/><Line type="monotone" dataKey="weight" stroke="#8a67ff" strokeWidth={3} dot={{r:3,fill:'#8a67ff'}}/></LineChart></ResponsiveContainer></div>
            </section>

            <p className="label">AI COACH</p>
            <section className={`aiMini glass ${decision.cls}`}><small>Dernière décision</small><b>{decision.type}</b><p>{decision.text}</p><div className="brainOrbMini">AI</div></section>
          </aside>
        </div>
      </main>}

      {tab==='workout'&&<main className="screen workoutScreen">
        <header className="workoutHead"><button onClick={()=>setTab('today')}>‹</button><div><h2>{current.title}</h2><p>{current.subtitle}</p></div><button>⋮</button></header>
        <div className="stepper">{current.exercises.map((_:any,i:number)=><button onClick={()=>setActiveEx(i)} className={i===activeEx?'active':''} key={i}>{i+1}</button>)}</div>
        <div className="workoutLayout">
          <section className="exercisePanel glass">
            <p className="label">Exercice {activeEx+1}/{current.exercises.length}</p>
            <div className="exerciseTitle"><h2>{exercise.name}</h2><span>{exercise.area}</span></div>
            <div className="exerciseMedia"><div className="mediaGlow"><PremiumAnatomy/><button className="play">▶</button></div></div>
            <div className="cue"><small>CONSIGNES</small><p>{exercise.cue}</p></div>
          </section>
          <section className="setsPanel glass">
            <div className="setTable">
              <div className="setRow header"><span>SÉRIE</span><span>POIDS</span><span>REPS</span><span>RIR</span><span>✓</span></div>
              {sets.map((s:any,i:number)=><div className="setRow" key={i}>
                <b>{i+1}</b><input value={s.weight} onChange={e=>updateSet(exercise,i,{weight:e.target.value})}/><input value={s.reps} onChange={e=>updateSet(exercise,i,{reps:e.target.value})}/><input value={s.rir} onChange={e=>updateSet(exercise,i,{rir:e.target.value})}/><button className={s.done?'done':''} onClick={()=>{updateSet(exercise,i,{done:!s.done});if(!s.done)startTimer(exercise.rest)}}>{s.done?'✓':'○'}</button>
              </div>)}
            </div>
            <div className="dual"><button className="secondary">AJOUTER SÉRIE</button><button className="primary" onClick={()=>setActiveEx(Math.min(activeEx+1,current.exercises.length-1))}>TERMINER EXERCICE ✓</button></div>
            {activeEx<current.exercises.length-1&&<div className="nextBox"><div><small>EXERCICE SUIVANT</small><b>{current.exercises[activeEx+1].name}</b></div><span>›</span></div>}
          </section>
        </div>
        {rest>0&&<div className="rest"><small>REPOS</small><b>{Math.floor(rest/60)}:{String(rest%60).padStart(2,'0')}</b><button onClick={()=>setRest(0)}>PASSER</button></div>}
      </main>}

      {tab==='nutrition'&&<main className="screen"><header className="pageTitle"><h1>NUTRITION</h1><p>Déficit contrôlé • performance préservée</p></header><div className="macroGrid">{[['CALORIES',2800,'kcal'],['PROTÉINES',190,'g'],['LIPIDES',85,'g'],['GLUCIDES',319,'g']].map(x=><article key={String(x[0])}><small>{x[0]}</small><b>{x[1]}</b><span>{x[2]}</span></article>)}</div><section className="panel glass"><h3>STRUCTURE DU JOUR</h3>{[['Petit-déjeuner','Œufs + skyr/fromage blanc + avoine + fruit'],['Déjeuner','Protéine maigre + riz/pommes de terre + légumes'],['Pré / post training','Banane + skyr/whey + glucides'],['Dîner','Poisson/poulet/viande maigre + féculent + légumes']].map(([a,b])=><div className="meal" key={a}><b>{a}</b><p>{b}</p></div>)}</section></main>}

      {tab==='progress'&&<main className="screen"><header className="pageTitle"><h1>PROGRESS</h1><p>Poids • taille • photos • performances</p></header><div className="desktopProgress"><form className="panel glass form" onSubmit={e=>{e.preventDefault();addDaily(e.currentTarget)}}><input name="weight" type="number" step=".1" placeholder="Poids kg"/><input name="waist" type="number" step=".1" placeholder="Tour de taille cm"/><input name="steps" type="number" placeholder="Pas"/><input name="calories" type="number" placeholder="Calories"/><input name="protein" type="number" placeholder="Protéines"/><button className="primary">ENREGISTRER</button></form><section className="panel glass"><h3>POIDS</h3><ResponsiveContainer width="100%" height={280}><LineChart data={daily}><XAxis dataKey="date" hide/><YAxis width={42} domain={['dataMin - 1','dataMax + 1']}/><Tooltip/><Line type="monotone" dataKey="weight" stroke="#8b6cff" strokeWidth={3}/></LineChart></ResponsiveContainer></section></div></main>}

      {tab==='coach'&&<main className="screen coachScreen">
        <header className="coachHero"><div><h1>AI COACH</h1><p>Ton coach intelligent</p></div><div className="orb">AI</div></header>
        <div className="progressLine"><span>CHECK-IN HEBDOMADAIRE</span><b>Étape 6/6</b><i/></div>
        <div className="coachLayout">
          <form className="coachForm" onSubmit={e=>{e.preventDefault();addCheck(e.currentTarget)}}>
            <p className="label">COMMENT TE SENS-TU ?</p>
            {[['fatigue','FATIGUE GÉNÉRALE',3],['recovery','RÉCUPÉRATION / SOMMEIL',5],['hunger','Faim / Appétit',3],['performance','PERFORMANCES À L’ENTRAÎNEMENT',5],['adherence','ADHÉRENCE NUTRITION',5],['back','ÉTAT DU DOS (L5-S1)',5]].map(([name,label,val])=><label className="sliderCard" key={String(name)}><div><b>{label}</b><span>{val}/5</span></div><input name={String(name)} type="range" min="1" max="5" defaultValue={Number(val)}/></label>)}
            <label className="note"><span>COMMENTAIRES (OPTIONNEL)</span><textarea name="note" defaultValue="Bonne énergie cette semaine. Sommeil correct. Motivé."/></label><button className="primary full">ENVOYER LE CHECK-IN</button>
          </form>
          <aside><p className="label">DERNIÈRE DÉCISION IA</p><section className={`decisionCard glass ${decision.cls}`}><h2>{decision.type}</h2><p>{decision.text}</p><div className="brainOrbMini">AI</div></section></aside>
        </div>
      </main>}

      <nav className="bottomNav">{nav.map(([id,icon,label])=><button key={id} onClick={()=>setTab(id)} className={tab===id?'active':''}><span>{icon}</span><small>{label}</small></button>)}</nav>
    </div>
  </div>
}
