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




type NutritionEntry = {
  id:string
  meal:string
  title:string
  time:string
  kcal:number
  protein:number
  carbs:number
  fat:number
}

type DailyFood={name:string;qty:string;icon?:string}
type DailyMeal={time:string;title:string;kcal:number;p:number;c:number;f:number;foods:DailyFood[]}
type NutritionProtocol={day:string;mode:string;session:string;kcal:number;protein:number;carbs:number;fat:number;score:number;meals:DailyMeal[];why:string[]}


const foodIcon=(name:string)=>{
  const n=name.toLowerCase()
  if(n.includes('avoine')) return '🥣'
  if(n.includes('skyr')||n.includes('fromage blanc')) return '🥛'
  if(n.includes('œuf')) return '🥚'
  if(n.includes('banane')) return '🍌'
  if(n.includes('amande')) return '🌰'
  if(n.includes('poulet')) return '🍗'
  if(n.includes('riz')||n.includes('quinoa')) return '🍚'
  if(n.includes('légume')||n.includes('haricot')||n.includes('brocoli')) return '🥦'
  if(n.includes('huile')) return '🫒'
  if(n.includes('myrtil')||n.includes('fruit rouge')) return '🫐'
  if(n.includes('cacahu')) return '🥜'
  if(n.includes('miel')) return '🍯'
  if(n.includes('saumon')||n.includes('poisson')||n.includes('cabillaud')) return '🐟'
  if(n.includes('patate')||n.includes('pomme')) return '🥔'
  if(n.includes('avocat')) return '🥑'
  if(n.includes('pain')) return '🍞'
  if(n.includes('kiwi')) return '🥝'
  if(n.includes('steak')) return '🥩'
  if(n.includes('galette')) return '🍘'
  return '🍽️'
}
const mealMoment=(time:string)=>{
  const h=Number(time.split(':')[0])
  if(h<10) return {icon:'☀️',label:'MATIN',tone:'morning'}
  if(h<15) return {icon:'☀️',label:'MIDI',tone:'midday'}
  if(h<19) return {icon:'🌇',label:'SUNSET',tone:'sunset'}
  return {icon:'🌙',label:'NUIT',tone:'night'}
}

const nutritionVariants=[
  {
    mode:'TRAINING DAY', session:'PUSH',
    meals:[
      ['07:00','PETIT-DÉJEUNER',650,45,75,18,[['Flocons d’avoine','80 g'],['Skyr 0%','250 g'],['Œufs entiers','2 pièces (100 g)'],['Banane','120 g'],['Amandes','15 g']]],
      ['12:30','DÉJEUNER',800,55,95,22,[['Blanc de poulet','180 g'],['Riz basmati (cru)','90 g'],['Légumes verts','200 g'],['Huile d’olive','10 g']]],
      ['16:30','COLLATION',450,35,50,12,[['Skyr 0%','200 g'],['Myrtilles','100 g'],['Beurre de cacahuète','15 g'],['Miel','10 g']]],
      ['20:00','DÎNER',900,55,99,33,[['Saumon','180 g'],['Patate douce','250 g'],['Brocolis','200 g'],['Huile d’olive','10 g'],['Avocat','70 g']]]
    ]
  },
  {
    mode:'TRAINING DAY', session:'PULL',
    meals:[
      ['07:30','PETIT-DÉJEUNER',640,45,70,19,[['Pain complet','100 g'],['Œufs entiers','3 pièces'],['Skyr 0%','200 g'],['Kiwi','2 pièces']]],
      ['12:30','DÉJEUNER',810,55,100,20,[['Steak haché 5%','180 g'],['Pommes de terre','400 g'],['Haricots verts','200 g'],['Huile d’olive','10 g']]],
      ['16:30','COLLATION',440,35,54,10,[['Fromage blanc 0%','250 g'],['Banane','120 g'],['Flocons d’avoine','40 g']]],
      ['20:30','DÎNER',910,55,95,36,[['Cabillaud','220 g'],['Riz basmati (cru)','90 g'],['Légumes','250 g'],['Avocat','80 g'],['Huile d’olive','10 g']]]
    ]
  },
  {
    mode:'TRAINING DAY', session:'LEGS',
    meals:[
      ['07:00','PETIT-DÉJEUNER',680,45,85,18,[['Flocons d’avoine','90 g'],['Skyr 0%','250 g'],['Banane','150 g'],['Œufs','2 pièces']]],
      ['12:00','DÉJEUNER',840,55,110,20,[['Poulet','180 g'],['Riz basmati (cru)','105 g'],['Légumes','200 g'],['Huile d’olive','10 g']]],
      ['16:00','PRE-WORKOUT',480,35,65,9,[['Skyr 0%','200 g'],['Banane','120 g'],['Galettes de riz','4 pièces'],['Miel','15 g']]],
      ['20:30','DÎNER',800,55,59,38,[['Saumon','200 g'],['Pommes de terre','300 g'],['Brocolis','200 g'],['Avocat','70 g']]]
    ]
  },
  {
    mode:'RECOVERY DAY', session:'REPOS',
    meals:[
      ['08:00','PETIT-DÉJEUNER',620,48,55,22,[['Œufs','3 pièces'],['Skyr 0%','250 g'],['Flocons d’avoine','60 g'],['Fruits rouges','100 g']]],
      ['12:30','DÉJEUNER',790,55,80,27,[['Poulet','200 g'],['Quinoa (cru)','80 g'],['Légumes','250 g'],['Huile d’olive','15 g']]],
      ['16:30','COLLATION',420,35,40,14,[['Fromage blanc','250 g'],['Pomme','1 pièce'],['Amandes','20 g']]],
      ['20:00','DÎNER',970,52,94,22,[['Poisson blanc','220 g'],['Patate douce','300 g'],['Légumes','250 g'],['Avocat','80 g']]]
    ]
  }
]

function NutritionScreen(){
  const now=new Date()
  const dayKey=`${now.getFullYear()}-${String(now.getMonth()+1).padStart(2,'0')}-${String(now.getDate()).padStart(2,'0')}`
  const [nutritionView,setNutritionView]=useState<'program'|'journal'>('program')
  const weekSeed=Math.floor(new Date(now.getFullYear(),now.getMonth(),now.getDate()).getTime()/(86400000*7))
  const consumedKey=`bodyos:nutrition:consumed:${dayKey}`
  const [consumedMeals,setConsumedMeals]=useState<Record<string,boolean>>(()=>{try{return JSON.parse(localStorage.getItem(consumedKey)||'{}')}catch{return{}}})
  const [dayClosed,setDayClosed]=useState(()=>localStorage.getItem(`bodyos:nutrition:closed:${dayKey}`)==='1')
  const [regen,setRegen]=useState(()=>Number(localStorage.getItem(`bodyos:nutrition:variant:${dayKey}`)||0))
  const targets={kcal:2800,protein:190,fat:85,carbs:319,water:3.0}
  const [entries,setEntries]=useState<NutritionEntry[]>(()=>{try{return JSON.parse(localStorage.getItem(`bodyos:nutrition:${dayKey}`)||'[]')}catch{return[]}})
  const [water,setWater]=useState(()=>Number(localStorage.getItem(`bodyos:water:${dayKey}`)||0))
  const [editorOpen,setEditorOpen]=useState(false)
  const [editingId,setEditingId]=useState<string|null>(null)

  // Deterministic daily protocol: changes with calendar day, not on every render.
  const baseIndex=weekSeed%nutritionVariants.length
  const variant=nutritionVariants[(baseIndex+regen)%nutritionVariants.length]
  const meals:DailyMeal[]=variant.meals.map((m:any)=>({time:m[0],title:m[1],kcal:m[2],p:m[3],c:m[4],f:m[5],foods:m[6].map((x:any)=>({name:x[0],qty:x[1],icon:foodIcon(x[0])}))}))
  const protocol:NutritionProtocol={day:dayKey,mode:variant.mode,session:variant.session,kcal:targets.kcal,protein:targets.protein,carbs:targets.carbs,fat:targets.fat,score:86,meals,why:[`Journée ${variant.session}`,'Cible cut maintenue','Répartition adaptée à la séance']}

  const totals=entries.reduce((a,e)=>({kcal:a.kcal+e.kcal,protein:a.protein+e.protein,carbs:a.carbs+e.carbs,fat:a.fat+e.fat}),{kcal:0,protein:0,carbs:0,fat:0})
  const saveEntry=(form:HTMLFormElement)=>{
    const fd=new FormData(form); const n=(k:string)=>Number(fd.get(k)||0)
    const entry:NutritionEntry={id:editingId||crypto.randomUUID(),meal:String(fd.get('meal')||'Repas'),title:String(fd.get('title')||'Aliment'),time:String(fd.get('time')||''),kcal:n('kcal'),protein:n('protein'),carbs:n('carbs'),fat:n('fat')}
    const next=editingId?entries.map(e=>e.id===editingId?entry:e):[...entries,entry]
    setEntries(next);localStorage.setItem(`bodyos:nutrition:${dayKey}`,JSON.stringify(next));setEditorOpen(false);setEditingId(null)
  }
  const removeEntry=(id:string)=>{const next=entries.filter(e=>e.id!==id);setEntries(next);localStorage.setItem(`bodyos:nutrition:${dayKey}`,JSON.stringify(next))}
  const changeWater=(d:number)=>{const n=Math.max(0,water+d);setWater(n);localStorage.setItem(`bodyos:water:${dayKey}`,String(n))}
  const regenerate=()=>{const n=(regen+1)%nutritionVariants.length;setRegen(n);localStorage.setItem(`bodyos:nutrition:variant:${dayKey}`,String(n))}

  const toggleConsumed=(time:string)=>{
    const next={...consumedMeals,[time]:!consumedMeals[time]}
    setConsumedMeals(next);localStorage.setItem(consumedKey,JSON.stringify(next))
  }
  const consumedCount=protocol.meals.filter(m=>consumedMeals[m.time]).length
  const closeDay=()=>{
    if(consumedCount<protocol.meals.length&&!confirm(`${consumedCount}/${protocol.meals.length} repas sont renseignés. Clôturer quand même ?`)) return
    localStorage.setItem(`bodyos:nutrition:closed:${dayKey}`,'1');setDayClosed(true)
  }

  return <main className="screen nutritionScreen adaptiveNutrition">
    <header className="nutritionTopbar"><button aria-label="Menu">☰</button><div><h1>NUTRITION</h1><p>Adaptive Nutrition Engine</p></div><button aria-label="Réglages">☷</button></header>
    <div className="nutritionTabs"><button className={nutritionView==='program'?'active':''} onClick={()=>setNutritionView('program')}>PROGRAMME</button><button className={nutritionView==='journal'?'active':''} onClick={()=>setNutritionView('journal')}>JOURNAL</button></div>

    {nutritionView==='program'&&<>
      <section className="protocolHero glass">
        <div><small>✦ TODAY'S NUTRITION PROTOCOL</small><strong>2 800 <em>KCAL</em></strong><b>{protocol.mode} • {protocol.session}</b><span>Weekly rotation • W{weekSeed%52+1} • {dayKey}</span></div>
        <div className="adaptColumn"><div className="adaptScore"><i>{protocol.score}</i><small>OPTIMAL</small></div><div className="adaptSignals"><span>⚡ ÉNERGIE <b>✓</b></span><span>▥ MACROS <b>✓</b></span><span>◷ TIMING <b>✓</b></span></div></div>
      </section>
      <section className="macroStrip glass">
        <div><b>2 800</b><small>KCAL</small></div><div><b>190 g</b><small>PROTÉINES</small></div><div><b>319 g</b><small>GLUCIDES</small></div><div><b>85 g</b><small>LIPIDES</small></div>
      </section>
      <section className="mealTimeline">
        {protocol.meals.map((m,i)=>{const moment=mealMoment(m.time);return <article className={`adaptiveMeal glass ${moment.tone}`} key={m.time}>
          <div className="mealMoment"><strong>{m.time}</strong><i>{moment.icon}</i><small>{moment.label}</small></div>
          <div className="mealBody"><header><b>0{i+1} • {m.title}</b><span>≈ {m.kcal} kcal</span></header>
          <button className={`mealConsumed ${consumedMeals[m.time]?'yes':''}`} onClick={()=>toggleConsumed(m.time)}>{consumedMeals[m.time]?'✓ CONSOMMÉ':'MARQUER CONSOMMÉ'}</button>
          <div className="mealContent"><div className="foodList">{m.foods.map(f=><div className="foodRow" key={f.name}><span className="foodThumb">{f.icon}</span><span className="foodName">{f.name}</span><b>{f.qty}</b></div>)}</div>
          <div className="mealMacroViz"><div className="macroDonut"></div><span>P <b>{m.p}g</b></span><span>G <b>{m.c}g</b></span><span>L <b>{m.f}g</b></span></div></div>
          </div>
        </article>})}
      </section>
      <section className="dailyMemory glass">
        <div><small>DAILY MEMORY</small><b>{consumedCount}/{protocol.meals.length} repas enregistrés</b><span>{dayClosed?'Journée clôturée ✓':'À clôturer avant archivage'}</span></div>
        <button disabled={dayClosed} onClick={closeDay}>{dayClosed?'ARCHIVÉE ✓':'CLÔTURER LA JOURNÉE'}</button>
      </section>
      <section className="whyPlan glass"><header><b>◈ POURQUOI CE PLAN AUJOURD'HUI ?</b><span>AI RATIONALE</span></header><div><article>🏋️ <b>Séance {protocol.session}</b><small>Glucides répartis autour de l'entraînement.</small></article><article>📈 <b>Objectif cut</b><small>Énergie maintenue à 2 800 kcal aujourd'hui.</small></article><article>🧠 <b>Adaptation</b><small>Plan journalier stable, réévaluable demain.</small></article></div></section>
      <div className="nutritionActions"><button onClick={regenerate}>↻ REGENERATE DAY</button><button onClick={()=>setNutritionView('journal')}>✓ LOG MEAL</button></div>
    </>}

    {nutritionView==='journal'&&<>
      <section className="journalSummary glass"><div><small>CONSOMMÉ</small><strong>{Math.round(totals.kcal)} kcal</strong></div><div><small>RESTANT</small><strong>{Math.max(0,targets.kcal-Math.round(totals.kcal))} kcal</strong></div></section>
      <button className="nutritionAddPrimary" onClick={()=>{setEditingId(null);setEditorOpen(true)}}>＋ SAISIR UN REPAS / ALIMENT</button>
      <section className="macroProgressGrid glass"><div><b>{Math.round(totals.protein)} / {targets.protein} g</b><small>PROTÉINES</small></div><div><b>{Math.round(totals.carbs)} / {targets.carbs} g</b><small>GLUCIDES</small></div><div><b>{Math.round(totals.fat)} / {targets.fat} g</b><small>LIPIDES</small></div></section>
      <section className="nutritionEntries">{entries.length===0?<div className="glass emptyNutrition">Aucun repas saisi aujourd’hui.</div>:entries.map(e=><article className="glass nutritionEntry" key={e.id} onClick={()=>{setEditingId(e.id);setEditorOpen(true)}}><div><b>{e.title}</b><small>{e.meal} • {e.time}</small></div><span>{e.kcal} kcal</span></article>)}</section>
      <section className="glass hydrationCard"><div><small>HYDRATATION</small><b>{water.toFixed(2)} L / {targets.water.toFixed(1)} L</b></div><div className="waterActions"><button onClick={()=>changeWater(-.25)}>−250</button><button onClick={()=>changeWater(.25)}>+250</button></div></section>
    </>}

    {editorOpen&&<div className="nutritionEditorBackdrop"><form className="nutritionEditor glass" onSubmit={e=>{e.preventDefault();saveEntry(e.currentTarget)}}>
      <header><b>{editingId?'MODIFIER':'AJOUTER'} LE REPAS</b><button type="button" onClick={()=>setEditorOpen(false)}>×</button></header>
      <label>Repas<input name="meal" defaultValue={editingId?entries.find(e=>e.id===editingId)?.meal:'Déjeuner'}/></label>
      <label>Aliment / repas<input name="title" required defaultValue={editingId?entries.find(e=>e.id===editingId)?.title:''}/></label>
      <label>Heure<input name="time" type="time" defaultValue={editingId?entries.find(e=>e.id===editingId)?.time:'12:30'}/></label>
      <div className="nutritionEditorGrid"><label>Kcal<input name="kcal" type="number" min="0" required defaultValue={editingId?entries.find(e=>e.id===editingId)?.kcal:''}/></label><label>Protéines<input name="protein" type="number" min="0" step=".1" defaultValue={editingId?entries.find(e=>e.id===editingId)?.protein:''}/></label><label>Glucides<input name="carbs" type="number" min="0" step=".1" defaultValue={editingId?entries.find(e=>e.id===editingId)?.carbs:''}/></label><label>Lipides<input name="fat" type="number" min="0" step=".1" defaultValue={editingId?entries.find(e=>e.id===editingId)?.fat:''}/></label></div>
      <div className="nutritionEditorActions">{editingId&&<button type="button" className="danger" onClick={()=>{removeEntry(editingId);setEditorOpen(false)}}>SUPPRIMER</button>}<button type="submit" className="primary">ENREGISTRER</button></div>
    </form></div>}
  </main>
}

export default function App(){
  const [tab,setTab]=useState<Tab>('today')
  const [day,setDayState]=useState(store.getDay())
  const [workout,setWorkout]=useState(store.getWorkout())
  const [daily,setDaily]=useState(store.getDaily())
  const [checkins,setCheckins]=useState(store.getCheckins())
  const [activeEx,setActiveEx]=useState(0)
  const [rest,setRest]=useState(0)
  const [demoOpen,setDemoOpen]=useState(false)
  const [cardioDone,setCardioDone]=useState(false)
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

  function setDay(n:number){setDayState(n);store.setDay(n);setActiveEx(0);setCardioDone(false)}
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
            
            {exercise.id!=='incline-machine'&&<div className={`muscleMap ${exercise.media.anatomyView}`} aria-label="Muscles sollicités">
              <img src={anatomyAsset} alt={`Carte anatomique : ${exercise.area}`} onError={e=>{e.currentTarget.style.display="none"}}/>
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

        <section className={`cardioFinisher glass ${cardioDone?'done':''}`}>
          <div className="cardioHead"><div><small>FIN DE SÉANCE</small><h3>CARDIO • ZONE 2</h3></div><span>25–30 MIN</span></div>
          <div className="cardioGrid">
            <article><small>MODALITÉ</small><b>Vélo / marche inclinée</b></article>
            <article><small>INTENSITÉ</small><b>RPE 4–5 / 10</b></article>
            <article><small>REPÈRE</small><b>Conversation possible</b></article>
          </div>
          <p>Augmenter la dépense sans dégrader la récupération ni la qualité de la musculation.</p>
          <button onClick={()=>setCardioDone(v=>!v)}>{cardioDone?'CARDIO VALIDÉ ✓':'VALIDER LE CARDIO'}</button>
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
            {exercise.id!=='incline-machine'&&<img className="demoAnatomy" src={anatomyAsset} alt={`Anatomie : ${exercise.area}`} onError={e=>{e.currentTarget.style.display="none"}}/>}
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

      {tab==='nutrition'&&<NutritionScreen/>}

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
