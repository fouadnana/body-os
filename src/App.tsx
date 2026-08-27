
import { useMemo, useRef, useState } from 'react'
import { Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts'
import { sessions } from './data/program'
import { store, type SetLog, type CoachCheckin } from './lib/storage'

type Tab = 'today'|'workout'|'nutrition'|'progress'|'coach'
const target = {calories:2800, protein:190, fat:85, carbs:319, steps:8000}

function Nav({tab,setTab}:{tab:Tab,setTab:(t:Tab)=>void}) {
  const items:[Tab,string,string][] = [
    ['today','⌂','TODAY'],['workout','⚡','WORKOUT'],['nutrition','◉','NUTRITION'],['progress','▥','PROGRESS'],['coach','◌','AI COACH']
  ]
  return <nav className="bottomNav">
    {items.map(([id,ic,lab])=><button key={id} onClick={()=>setTab(id)} className={tab===id?'active':''}><span>{ic}</span><small>{lab}</small></button>)}
  </nav>
}

function BodyVisual({small=false}:{small?:boolean}) {
  return <div className={small?'bodyVisual small':'bodyVisual'}>
    <div className="head"/>
    <div className="torso"/>
    <div className="arm l"/><div className="arm r"/>
    <div className="leg l"/><div className="leg r"/>
    <div className="spine"/>
    <div className="pec p1"/><div className="pec p2"/>
  </div>
}

function App() {
  const [tab,setTab] = useState<Tab>('today')
  const [day,setDayState] = useState(store.getDay())
  const [workout,setWorkout] = useState(store.getWorkout())
  const [daily,setDaily] = useState(store.getDaily())
  const [checkins,setCheckins] = useState(store.getCheckins())
  const [activeEx,setActiveEx] = useState(0)
  const [rest,setRest] = useState(0)
  const timerRef = useRef<number|undefined>(undefined)

  const current = sessions[day % sessions.length]
  const latest = daily.at(-1)
  const weight = latest?.weight ?? 105
  const waist = latest?.waist ?? 102.2
  const latestCheck = checkins.at(-1)

  const decision = useMemo(()=>{
    if(!latestCheck) return {type:'KEEP',cls:'keep',text:'Tout est sous contrôle. Continue comme ça.'}
    if(latestCheck.back<=2 || latestCheck.recovery<=2) return {type:'RECOVER',cls:'recover',text:'Récupère, réduis le volume et protège le dos.'}
    if(latestCheck.performance>=4 && latestCheck.recovery>=4) return {type:'PROGRESS',cls:'progress',text:'Excellente progression : augmente prudemment la charge.'}
    if(latestCheck.adherence>=4 && latestCheck.performance<=2) return {type:'ADJUST',cls:'adjust',text:'Ajuste légèrement calories ou activité.'}
    return {type:'KEEP',cls:'keep',text:'Tout est sous contrôle. Continue comme ça.'}
  },[latestCheck])

  const score = latestCheck ? Math.round(((6-latestCheck.fatigue)+latestCheck.recovery+(6-latestCheck.hunger)+latestCheck.performance+latestCheck.adherence+latestCheck.back)/30*100) : 82

  function setDay(n:number){setDayState(n);store.setDay(n)}
  function getSets(ex:any){return workout[ex.id] ?? Array.from({length:ex.sets},()=>({weight:'',reps:'',rir:'2',done:false}))}
  function updateSet(ex:any,i:number,patch:Partial<SetLog>){
    const old=getSets(ex); const nextSets=old.map((s:any,idx:number)=>idx===i?{...s,...patch}:s)
    const next={...workout,[ex.id]:nextSets}; setWorkout(next); store.setWorkout(next)
  }
  function startTimer(sec:number){
    if(timerRef.current) clearInterval(timerRef.current)
    setRest(sec)
    timerRef.current=window.setInterval(()=>setRest(v=>{if(v<=1){if(timerRef.current)clearInterval(timerRef.current);return 0}return v-1}),1000)
  }
  function addDaily(form:HTMLFormElement){
    const fd=new FormData(form); const w=Number(fd.get('weight')); if(!w)return
    const log={date:new Date().toISOString().slice(0,10),weight:w,waist:Number(fd.get('waist'))||undefined,steps:Number(fd.get('steps'))||undefined,calories:Number(fd.get('calories'))||undefined,protein:Number(fd.get('protein'))||undefined}
    const next=[...daily.filter(x=>x.date!==log.date),log]; setDaily(next); store.setDaily(next)
  }
  function addCheck(form:HTMLFormElement){
    const fd=new FormData(form)
    const c:CoachCheckin={date:new Date().toISOString().slice(0,10),fatigue:Number(fd.get('fatigue')),recovery:Number(fd.get('recovery')),hunger:Number(fd.get('hunger')),performance:Number(fd.get('performance')),adherence:Number(fd.get('adherence')),back:Number(fd.get('back')),note:String(fd.get('note')||'')}
    const next=[...checkins.filter(x=>x.date!==c.date),c]; setCheckins(next); store.setCheckins(next)
  }

  const exercise=current.exercises[activeEx] ?? current.exercises[0]
  const sets=exercise?getSets(exercise):[]

  return <div className="app">
    {tab==='today' && <section className="screen todayScreen">
      <header className="miniHeader"><div className="brand">BODY OS<span>AI CUT</span></div><button>♧</button></header>

      <div className="helloCard glass">
        <div><h3>Bonjour Fouad <span>🔥 7</span></h3><p>Discipline aujourd’hui, liberté demain.</p></div>
        <div className="scoreRing" style={{'--score':`${score*3.6}deg`} as React.CSSProperties}><b>{score}%</b><small>SCORE</small></div>
      </div>

      <p className="label">MISSION DU JOUR</p>
      <div className="mission glass">
        <div><h1>{current.title}</h1><p>{current.subtitle.replace(' • ','\n')}</p><button className="primary" onClick={()=>setTab('workout')}>DÉMARRER LA SÉANCE <b>›</b></button></div>
        <BodyVisual/>
      </div>

      <p className="label">APERÇU DU JOUR</p>
      <div className="kpis">
        <article><span>🔥</span><small>CALORIES</small><b>{target.calories}</b><em>kcal</em></article>
        <article><span>🍀</span><small>PROTÉINES</small><b>{target.protein}</b><em>g</em></article>
        <article><span>⚡</span><small>PAS</small><b>{latest?.steps ?? 8124}</b><em>/ {target.steps}</em></article>
      </div>

      <div className="l5Card glass">
        <div className="l5Icon"><BodyVisual small/></div>
        <div><b>L5-S1</b><small>NIVEAU 2</small><div className="bar"><i style={{width:'50%'}}/></div></div>
        <span>Prochain : J6</span>
      </div>

      <p className="label">POIDS & TAILLE (7 JOURS)</p>
      <div className="trend glass">
        <div className="trendTop"><div><small>POIDS MOYEN</small><b>{weight.toFixed(1)} kg</b><em>↓ -0,6 kg</em></div><div><small>TOUR DE TAILLE</small><b>{waist.toFixed(1)} cm</b><em>↓ -1,1 cm</em></div></div>
        <div className="chartMini"><ResponsiveContainer width="100%" height={110}><LineChart data={daily.slice(-7)}><XAxis dataKey="date" hide/><YAxis hide domain={['dataMin - 1','dataMax + 1']}/><Line type="monotone" dataKey="weight" stroke="#8b6cff" strokeWidth={3} dot={{r:3,fill:'#8b6cff'}}/></LineChart></ResponsiveContainer></div>
      </div>

      <p className="label">AI COACH</p>
      <div className={`aiMini glass ${decision.cls}`}><small>Dernière décision</small><b>{decision.type}</b><p>{decision.text}</p><div className="brainDot"/></div>
    </section>}

    {tab==='workout' && <section className="screen workoutScreen">
      <header className="workoutHead"><button onClick={()=>setTab('today')}>‹</button><div><h2>{current.title}</h2><p>{current.subtitle}</p></div><button>⋮</button></header>
      <div className="stepper">{current.exercises.map((_:any,i:number)=><button onClick={()=>setActiveEx(i)} className={i===activeEx?'active':''} key={i}>{i+1}</button>)}</div>
      <p className="label">Exercice {activeEx+1}/{current.exercises.length}</p>
      {exercise && <article className="exercisePanel glass">
        <div className="exerciseTitle"><h2>{exercise.name}</h2><span>{exercise.area}</span></div>
        <div className="exerciseMedia">
          <div className="fakePhoto"><BodyVisual/><button className="play">▶</button></div>
        </div>
        <div className="cue"><small>CONSIGNES</small><p>{exercise.cue}</p></div>
        <div className="setTable">
          <div className="setRow header"><span>SÉRIE</span><span>POIDS (KG)</span><span>RÉPÉTITIONS</span><span>RIR</span><span>VALIDÉ</span></div>
          {sets.map((s:any,i:number)=><div className="setRow" key={i}>
            <b>{i+1}</b>
            <input value={s.weight} onChange={e=>updateSet(exercise,i,{weight:e.target.value})}/>
            <input value={s.reps} onChange={e=>updateSet(exercise,i,{reps:e.target.value})}/>
            <input value={s.rir} onChange={e=>updateSet(exercise,i,{rir:e.target.value})}/>
            <button className={s.done?'done':''} onClick={()=>{updateSet(exercise,i,{done:!s.done});if(!s.done)startTimer(exercise.rest)}}>{s.done?'✓':'○'}</button>
          </div>)}
        </div>
        <div className="dual"><button className="secondary">AJOUTER SÉRIE</button><button className="primary" onClick={()=>setActiveEx(Math.min(activeEx+1,current.exercises.length-1))}>TERMINER EXERCICE ✓</button></div>
        {activeEx<current.exercises.length-1 && <div className="nextBox"><small>EXERCICE SUIVANT</small><b>{current.exercises[activeEx+1].name}</b><span>›</span></div>}
      </article>}
      {rest>0 && <div className="rest"><small>REPOS</small><b>{Math.floor(rest/60)}:{String(rest%60).padStart(2,'0')}</b><button onClick={()=>setRest(0)}>PASSER</button></div>}
    </section>}

    {tab==='nutrition' && <section className="screen">
      <header className="pageTitle"><h1>NUTRITION</h1><p>Déficit contrôlé • performance préservée</p></header>
      <div className="macroGrid">{[['CALORIES',2800,'kcal'],['PROTÉINES',190,'g'],['LIPIDES',85,'g'],['GLUCIDES',319,'g']].map(x=><article key={String(x[0])}><small>{x[0]}</small><b>{x[1]}</b><span>{x[2]}</span></article>)}</div>
      <div className="panel glass"><h3>STRUCTURE DU JOUR</h3>{[['Petit-déjeuner','Œufs + skyr/fromage blanc + avoine + fruit'],['Déjeuner','Protéine maigre + riz/pommes de terre + légumes'],['Pré / post training','Banane + skyr/whey + glucides'],['Dîner','Poisson/poulet/viande maigre + féculent + légumes']].map(([a,b])=><div className="meal" key={a}><b>{a}</b><p>{b}</p></div>)}</div>
    </section>}

    {tab==='progress' && <section className="screen">
      <header className="pageTitle"><h1>PROGRESS</h1><p>Poids • taille • photos • performances</p></header>
      <form className="panel glass form" onSubmit={e=>{e.preventDefault();addDaily(e.currentTarget)}}><input name="weight" type="number" step=".1" placeholder="Poids kg"/><input name="waist" type="number" step=".1" placeholder="Tour de taille cm"/><input name="steps" type="number" placeholder="Pas"/><input name="calories" type="number" placeholder="Calories"/><input name="protein" type="number" placeholder="Protéines"/><button className="primary">ENREGISTRER</button></form>
      <div className="panel glass"><h3>POIDS</h3><ResponsiveContainer width="100%" height={240}><LineChart data={daily}><XAxis dataKey="date" hide/><YAxis width={42} domain={['dataMin - 1','dataMax + 1']}/><Tooltip/><Line type="monotone" dataKey="weight" stroke="#8b6cff" strokeWidth={3}/></LineChart></ResponsiveContainer></div>
    </section>}

    {tab==='coach' && <section className="screen coachScreen">
      <header className="coachHero"><div><h1>AI COACH</h1><p>Ton coach intelligent</p></div><div className="orb">AI</div></header>
      <div className="progressLine"><span>CHECK-IN HEBDOMADAIRE</span><b>Étape 6/6</b><i/></div>
      <p className="label">COMMENT TE SENS-TU ?</p>
      <form className="coachForm" onSubmit={e=>{e.preventDefault();addCheck(e.currentTarget)}}>
        {[
          ['fatigue','FATIGUE GÉNÉRALE',3],['recovery','RÉCUPÉRATION / SOMMEIL',5],['hunger','Faim / Appétit',3],['performance','PERFORMANCES À L’ENTRAÎNEMENT',5],['adherence','ADHÉRENCE NUTRITION',5],['back','ÉTAT DU DOS (L5-S1)',5]
        ].map(([name,label,val])=><label className="sliderCard" key={String(name)}><div><b>{label}</b><span>{val}/5</span></div><input name={String(name)} type="range" min="1" max="5" defaultValue={Number(val)}/></label>)}
        <label className="note"><span>COMMENTAIRES (OPTIONNEL)</span><textarea name="note" defaultValue="Bonne énergie cette semaine. Sommeil correct. Motivé."/></label>
        <button className="primary full">ENVOYER LE CHECK-IN</button>
      </form>
      <p className="label">DERNIÈRE DÉCISION IA</p>
      <div className={`decisionCard glass ${decision.cls}`}><h2>{decision.type}</h2><p>{decision.text}</p><div className="brainDot"/></div>
    </section>}

    <Nav tab={tab} setTab={setTab}/>
  </div>
}
export default App
