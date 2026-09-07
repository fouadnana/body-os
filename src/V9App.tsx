import { useEffect, useMemo, useState } from 'react'
import { Line, LineChart, ResponsiveContainer, XAxis, YAxis, Bar, BarChart } from 'recharts'
import './v9.css'
import FoodVision, { type FoodVisionPayload } from './FoodVision'

type Screen='today'|'workout'|'nutrition'|'progress'|'coach'|'plan'|'adaptive'
type WorkoutView='session'|'exercise'|'rest'|'history'

type Ingredient={name:string,qty:number,unit:string}
type Meal={name:string,time:string,kcal:number,img:string,details:string,protein:number,carbs:number,fat:number,ingredients:Ingredient[]}
const mealDetails=(ingredients:Ingredient[])=>ingredients.map(i=>`${i.name} ${i.qty}${i.unit}`).join(' · ')
const meals:Meal[]=[
 {name:'Petit déjeuner',time:'07:30',kcal:540,img:'/body-os/meal-breakfast-clean.webp',details:'',protein:42,carbs:64,fat:14,ingredients:[
  {name:'Skyr 0%',qty:250,unit:' g'},{name:'Flocons d’avoine',qty:50,unit:' g'},{name:'Myrtilles',qty:100,unit:' g'},{name:'Beurre de cacahuète',qty:24,unit:' g'}
 ]},
 {name:'Déjeuner',time:'12:30',kcal:680,img:'/body-os/meal-dinner-clean.webp',details:'',protein:45,carbs:70,fat:18,ingredients:[
  {name:'Saumon',qty:180,unit:' g'},{name:'Riz basmati cuit',qty:180,unit:' g'},{name:'Brocoli',qty:180,unit:' g'},{name:'Citron',qty:20,unit:' g'}
 ]},
 {name:'Goûter',time:'16:30',kcal:280,img:'/body-os/meal-preworkout-clean.webp',details:'',protein:25,carbs:36,fat:5,ingredients:[
  {name:'Skyr 0%',qty:200,unit:' g'},{name:'Fruits rouges',qty:100,unit:' g'},{name:'Miel',qty:10,unit:' g'},{name:'Amandes',qty:14,unit:' g'}
 ]},
 {name:'Dîner',time:'19:30',kcal:670,img:'/body-os/meal-dinner-clean.webp',details:'',protein:48,carbs:62,fat:24,ingredients:[
  {name:'Poulet grillé',qty:200,unit:' g'},{name:'Patate douce',qty:250,unit:' g'},{name:'Légumes verts',qty:250,unit:' g'},{name:'Huile d’olive',qty:5,unit:' g'}
 ]}
].map(m=>({...m,details:mealDetails(m.ingredients)}))

type Recipe={id:string,name:string,category:string,time:string,kcal:number,protein:number,carbs:number,fat:number,img:string,ingredients:Ingredient[],steps:string[]}
const recipes:Recipe[]=[
 {id:'r1',name:'Saumon citron & riz',category:'Déjeuner',time:'25 min',kcal:680,protein:45,carbs:70,fat:18,img:'/body-os/meal-dinner-clean.webp',ingredients:[{name:'Saumon',qty:180,unit:' g'},{name:'Riz basmati cuit',qty:180,unit:' g'},{name:'Brocoli',qty:180,unit:' g'},{name:'Citron',qty:20,unit:' g'}],steps:['Cuire le riz et le brocoli.','Saisir le saumon.','Ajouter le citron et assaisonner.']},
 {id:'r2',name:'Poulet patate douce',category:'Dîner',time:'30 min',kcal:670,protein:48,carbs:62,fat:24,img:'/body-os/meal-lunch-clean.webp',ingredients:[{name:'Poulet grillé',qty:200,unit:' g'},{name:'Patate douce',qty:250,unit:' g'},{name:'Légumes verts',qty:250,unit:' g'},{name:'Huile d’olive',qty:5,unit:' g'}],steps:['Rôtir la patate douce.','Griller le poulet.','Ajouter les légumes verts et l’huile.']},
 {id:'r3',name:'Bowl Skyr myrtilles',category:'Petit déjeuner',time:'5 min',kcal:540,protein:42,carbs:64,fat:14,img:'/body-os/meal-breakfast-clean.webp',ingredients:[{name:'Skyr 0%',qty:250,unit:' g'},{name:'Flocons d’avoine',qty:50,unit:' g'},{name:'Myrtilles',qty:100,unit:' g'},{name:'Beurre de cacahuète',qty:24,unit:' g'}],steps:['Verser le Skyr.','Ajouter avoine et myrtilles.','Terminer par le beurre de cacahuète.']},
 {id:'r4',name:'Skyr fruits rouges',category:'Goûter',time:'4 min',kcal:280,protein:25,carbs:36,fat:5,img:'/body-os/meal-preworkout-clean.webp',ingredients:[{name:'Skyr 0%',qty:200,unit:' g'},{name:'Fruits rouges',qty:100,unit:' g'},{name:'Miel',qty:10,unit:' g'},{name:'Amandes',qty:14,unit:' g'}],steps:['Mélanger le Skyr et les fruits.','Ajouter miel et amandes.']},
 {id:'r5',name:'Poulet riz légumes',category:'Déjeuner',time:'20 min',kcal:610,protein:52,carbs:67,fat:13,img:'/body-os/meal-lunch-clean.webp',ingredients:[{name:'Poulet',qty:190,unit:' g'},{name:'Riz cuit',qty:180,unit:' g'},{name:'Légumes',qty:200,unit:' g'}],steps:['Cuire le poulet.','Réchauffer le riz.','Assembler avec les légumes.']},
 {id:'r6',name:'Omelette protéinée',category:'Petit déjeuner',time:'12 min',kcal:495,protein:44,carbs:38,fat:18,img:'/body-os/meal-breakfast-clean.webp',ingredients:[{name:'Œufs',qty:3,unit:''},{name:'Blancs d’œufs',qty:150,unit:' g'},{name:'Pain complet',qty:70,unit:' g'},{name:'Tomates',qty:120,unit:' g'}],steps:['Cuire les œufs et blancs.','Griller le pain.','Servir avec les tomates.']}
]

const weightData=[{d:'08/05',w:109.5},{d:'22/05',w:108.7},{d:'05/06',w:108.0},{d:'19/06',w:106.8},{d:'02/07',w:105.5},{d:'',w:104.8}]
const strengthData=[92.5,95,95,97.5,100,100,97.5,100,102.5,105].map((v,i)=>({i,v}))
type MuscleGroup='Pectoraux'|'Dos'|'Épaules'|'Jambes'|'Bras'
type ExerciseItem={name:string,equipment:string,sets:string,img:string,video:string,target:string,secondary:string,reps:string,rir:string,rest:string,anatomy:string}
const muscleGroups:MuscleGroup[]=['Pectoraux','Dos','Épaules','Jambes','Bras']
const sessionData:Record<MuscleGroup,ExerciseItem[]>={
 Pectoraux:[
  {name:'Développé incliné',equipment:'Haltères',sets:'3 séries',img:'https://img.youtube.com/vi/5CECBjd7HLQ/hqdefault.jpg',video:'https://www.youtube.com/watch?v=5CECBjd7HLQ',target:'Haut des pectoraux',secondary:'Triceps · Deltoïdes ant.',reps:'6–10',rir:'1–2',rest:'2:30–3:00',anatomy:'/body-os/anatomy-incline-db.svg'},
  {name:'Développé couché',equipment:'Barre',sets:'3 séries',img:'/body-os/v981-golden-bench-media.jpg',video:'https://www.youtube.com/watch?v=A0NBCkpYatQ',target:'Pectoraux',secondary:'Triceps · Deltoïdes ant.',reps:'5–8',rir:'1–2',rest:'2:30–3:30',anatomy:'/body-os/anatomy-chest-press.svg'},
  {name:'Écartés couchés',equipment:'Haltères',sets:'3 séries',img:'https://img.youtube.com/vi/_LwuS1PdbdM/hqdefault.jpg',video:'https://www.youtube.com/watch?v=_LwuS1PdbdM',target:'Pectoraux',secondary:'Deltoïdes ant.',reps:'10–15',rir:'1–2',rest:'1:30–2:00',anatomy:'/body-os/anatomy-cable-fly.svg'},
  {name:'Dips',equipment:'Poids du corps',sets:'3 séries',img:'https://img.youtube.com/vi/yN6Q1UI_xkE/hqdefault.jpg',video:'https://www.youtube.com/watch?v=yN6Q1UI_xkE',target:'Pectoraux · Triceps',secondary:'Deltoïdes ant.',reps:'6–12',rir:'1–2',rest:'2:00–3:00',anatomy:'/body-os/anatomy-triceps.svg'},
  {name:'Extension triceps',equipment:'Poulie corde',sets:'3 séries',img:'https://img.youtube.com/vi/ADRve8qqC1U/hqdefault.jpg',video:'https://www.youtube.com/watch?v=ADRve8qqC1U',target:'Triceps',secondary:'—',reps:'10–15',rir:'1–2',rest:'1:30–2:00',anatomy:'/body-os/anatomy-rope-pushdown.svg'},
 ],
 Dos:[
  {name:'Tirage vertical',equipment:'Poulie',sets:'3 séries',img:'https://img.youtube.com/vi/VXKfH6ciEBI/hqdefault.jpg',video:'https://www.youtube.com/watch?v=VXKfH6ciEBI',target:'Grand dorsal',secondary:'Biceps',reps:'6–10',rir:'1–2',rest:'2:00–3:00',anatomy:'/body-os/anatomy-lat-pulldown.svg'},
  {name:'Rowing machine',equipment:'Machine',sets:'3 séries',img:'https://s3.amazonaws.com/prod.skimble/assets/1212063/image_iphone.jpg',video:'https://www.youtube.com/watch?v=TeFo51Q_Nsc',target:'Dos moyen',secondary:'Biceps · Deltoïdes post.',reps:'8–12',rir:'1–2',rest:'2:00–3:00',anatomy:'/body-os/anatomy-machine-row.svg'},
  {name:'Rowing poitrine',equipment:'Machine',sets:'2 séries',img:'https://img.youtube.com/vi/0UBRfiO4zDs/hqdefault.jpg',video:'https://www.youtube.com/watch?v=0UBRfiO4zDs',target:'Rhomboïdes · Trapèzes',secondary:'Biceps',reps:'8–12',rir:'1–2',rest:'2:00',anatomy:'/body-os/anatomy-chest-row.svg'},
  {name:'Pulldown unilatéral',equipment:'Poulie',sets:'2 séries',img:'https://img.youtube.com/vi/iVfZB4YmLRM/hqdefault.jpg',video:'https://www.youtube.com/watch?v=iVfZB4YmLRM',target:'Grand dorsal',secondary:'Biceps',reps:'10–15',rir:'1–2',rest:'1:30',anatomy:'/body-os/anatomy-one-arm-cable.svg'},
  {name:'Reverse fly',equipment:'Poulie',sets:'3 séries',img:'https://shopbuilder.eu/images/bbcomment/files/175397378_l.jpg',video:'https://www.youtube.com/results?search_query=reverse+fly+rear+delt+exercise+tutorial',target:'Deltoïdes post.',secondary:'Haut du dos',reps:'12–20',rir:'1–2',rest:'1:30',anatomy:'/body-os/anatomy-reverse-fly.svg'},
 ],
 Épaules:[
  {name:'Développé épaules',equipment:'Machine',sets:'3 séries',img:'https://img.youtube.com/vi/WvLMauqrnK8/hqdefault.jpg',video:'https://www.youtube.com/watch?v=WvLMauqrnK8',target:'Deltoïdes ant. · moyen',secondary:'Triceps',reps:'6–10',rir:'1–2',rest:'2:00–3:00',anatomy:'/body-os/anatomy-shoulder-press.svg'},
  {name:'Élévations latérales',equipment:'Haltères',sets:'4 séries',img:'/body-os/demo-lat-raise-approved.jpg',video:'https://www.youtube.com/results?search_query=lateral+raise+technique+renaissance+periodization',target:'Deltoïde moyen',secondary:'—',reps:'10–20',rir:'1–2',rest:'1:15–1:45',anatomy:'/body-os/anatomy-lat-raise.svg'},
  {name:'Élévations poulie',equipment:'Poulie',sets:'3 séries',img:'https://builderbody.ru/wp-content/uploads/2011/02/1-15.jpg',video:'https://www.youtube.com/results?search_query=cable+lateral+raise+exercise+tutorial',target:'Deltoïde moyen',secondary:'—',reps:'12–20',rir:'1–2',rest:'1:15',anatomy:'/body-os/anatomy-lat-raise-2.svg'},
  {name:'Reverse pec deck',equipment:'Machine',sets:'3 séries',img:'https://img.youtube.com/vi/Z84HkxGCBqQ/hqdefault.jpg',video:'https://www.youtube.com/watch?v=Z84HkxGCBqQ',target:'Deltoïdes post.',secondary:'Haut du dos',reps:'12–20',rir:'1–2',rest:'1:30',anatomy:'/body-os/anatomy-reverse-pec.svg'},
  {name:'Élévation frontale',equipment:'Poulie',sets:'2 séries',img:'https://bodymaster.ru/media/medialibrary/iblock/eff/eff88f5dcad41aa853ca89670d063362.jpg',video:'https://www.youtube.com/results?search_query=cable+front+raise+exercise+tutorial',target:'Deltoïde ant.',secondary:'—',reps:'10–15',rir:'2',rest:'1:30',anatomy:'/body-os/anatomy-single-press.svg'},
 ],
 Jambes:[
  {name:'Hack squat',equipment:'Machine',sets:'3 séries',img:'https://http2.mlstatic.com/D_NQ_NP_680346-MEC110766514119_042026-O.webp',video:'https://www.youtube.com/watch?v=scs5XcsZuc8',target:'Quadriceps',secondary:'Fessiers',reps:'6–10',rir:'1–2',rest:'2:30–3:30',anatomy:'/body-os/anatomy-hack-squat.svg'},
  {name:'Leg press',equipment:'Machine',sets:'3 séries',img:'https://levelfyc.com/wp-content/uploads/2024/10/lich-tap-gym-3-ngay-1-tuan-cho-nam-11.jpg',video:'https://www.youtube.com/results?search_query=leg+press+exercise+tutorial',target:'Quadriceps · Fessiers',secondary:'Ischios',reps:'8–12',rir:'1–2',rest:'2:30–3:00',anatomy:'/body-os/anatomy-leg-press.svg'},
  {name:'Leg curl',equipment:'Machine',sets:'3 séries',img:'https://cdn.corenutrition.fi/images/artiklar/sittande%20l%C3%A5rcurl-4-892.jpg',video:'https://www.youtube.com/results?search_query=seated+leg+curl+exercise+tutorial',target:'Ischio-jambiers',secondary:'—',reps:'8–15',rir:'1–2',rest:'1:30–2:00',anatomy:'/body-os/anatomy-leg-curl.svg'},
  {name:'Leg extension',equipment:'Machine',sets:'3 séries',img:'https://images.surferseo.art/8bbc18c1-a93f-4d65-ac69-dcc6beef7d08.png',video:'https://www.youtube.com/watch?v=m0FOpMEgero',target:'Quadriceps',secondary:'—',reps:'10–15',rir:'1–2',rest:'1:30–2:00',anatomy:'/body-os/anatomy-leg-extension.svg'},
  {name:'Mollets',equipment:'Machine',sets:'4 séries',img:'https://primary.jwwb.nl/public/t/y/m/temp-opfgypihlwatynrocmva/diferencia-entre-gemelos-y-soleo-standard.png',video:'https://www.youtube.com/results?search_query=standing+calf+raise+exercise+tutorial',target:'Mollets',secondary:'—',reps:'8–15',rir:'1–2',rest:'1:30',anatomy:'/body-os/anatomy-calf.svg'},
 ],
 Bras:[
  {name:'Curl incliné',equipment:'Haltères',sets:'3 séries',img:'https://hips.hearstapps.com/hmg-prod/images/bb6-67cb1bfd4a840.png',video:'https://www.youtube.com/watch?v=HhHHBj3qTJ4',target:'Biceps',secondary:'Brachial',reps:'8–12',rir:'1–2',rest:'1:30–2:00',anatomy:'/body-os/anatomy-incline-curl.svg'},
  {name:'Curl poulie',equipment:'Poulie',sets:'3 séries',img:'https://i0.wp.com/www.muscleandfitness.com/wp-content/uploads/2019/12/standing-cable-curl2.jpg?quality=80&strip=all',video:'https://www.youtube.com/results?search_query=standing+cable+curl+exercise+tutorial',target:'Biceps',secondary:'Brachial',reps:'10–15',rir:'1–2',rest:'1:30',anatomy:'/body-os/anatomy-cable-curl.svg'},
  {name:'Curl assis',equipment:'Haltères',sets:'2 séries',img:'https://irp.cdn-website.com/5dcbaf2a/dms3rep/multi/Strength_HR-75423fa0-4f520c7a.jpg',video:'https://www.youtube.com/results?search_query=seated+dumbbell+curl+exercise+tutorial',target:'Biceps',secondary:'Avant-bras',reps:'10–15',rir:'1–2',rest:'1:30',anatomy:'/body-os/anatomy-seated-curl.svg'},
  {name:'Extension triceps',equipment:'Poulie corde',sets:'3 séries',img:'/body-os/demo-rope-pushdown-approved.jpg',video:'https://www.youtube.com/watch?v=ADRve8qqC1U',target:'Triceps',secondary:'—',reps:'10–15',rir:'1–2',rest:'1:30',anatomy:'/body-os/anatomy-rope-pushdown.svg'},
  {name:'Extension au-dessus tête',equipment:'Poulie',sets:'3 séries',img:'https://shopbuilder.hu/images/bbcomment/files/fej-folott-kotel.jpg',video:'https://www.youtube.com/results?search_query=overhead+cable+triceps+extension+exercise+tutorial',target:'Triceps long chef',secondary:'—',reps:'10–15',rir:'1–2',rest:'1:30',anatomy:'/body-os/anatomy-triceps.svg'},
 ]
}
const progressMuscles:Record<MuscleGroup,{delta:string,score:number,measure:string,unit:string,overlay:string}>={
 Pectoraux:{delta:'+0,6 %',score:78,measure:'106',unit:'cm',overlay:'chest'},
 Dos:{delta:'+0,4 %',score:75,measure:'121',unit:'cm',overlay:'back'},
 Épaules:{delta:'+0,5 %',score:81,measure:'126',unit:'cm',overlay:'shoulders'},
 Jambes:{delta:'+0,3 %',score:72,measure:'62',unit:'cm',overlay:'legs'},
 Bras:{delta:'+0,4 %',score:79,measure:'34',unit:'cm',overlay:'arms'},
}

const Icon=({children}:{children:string})=><span className="v9Icon">{children}</span>

function StatusBar(){
 return <div className="v91Status"><b>9:41</b><span>▮▮▮  ◔  ▰</span></div>
}

function Toast({text}:{text:string}){ return <div className="v93Toast">{text}</div> }
function InfoSheet({title,children,close}:{title:string,children:any,close:()=>void}){
 return <div className="v9SheetBack" onClick={close}><section className="v93InfoSheet" onClick={e=>e.stopPropagation()}>
  <header><button onClick={close}>×</button><b>{title}</b><span></span></header><div>{children}</div>
 </section></div>
}

function BottomNav({screen,setScreen}:{screen:Screen,setScreen:(s:Screen)=>void}){
 const items:[Screen,string,string][]=[['today','◇','Today'],['nutrition','♜','Nutrition'],['workout','✣','Workout'],['progress','▥','Progress'],['coach','◉','Coach']]
 return <nav className="v9Bottom">{items.map(([id,ic,l])=><button key={id} className={screen===id?'active':''} onClick={()=>setScreen(id)}><Icon>{ic}</Icon><small>{l}</small></button>)}</nav>
}

function Today({setScreen}:{setScreen:(s:Screen)=>void}){
 return <main className="v104Today" aria-label="BODY OS Today">
   <header className="v104Top">
    <div className="v104Brand"><i></i><span><b>BODY OS</b><small>TON CORPS. TON SYSTÈME.</small></span></div>
    <button aria-label="Adaptive Sèche" onClick={()=>setScreen('adaptive')}>S7</button>
   </header>

   <section className="v104Hero">
    <div className="v104Mode"><b>SÈCHE <i></i></b><small>JOUR 38</small></div>
    <div className="v104HeroArt"><img src="/body-os/v104-today-athlete-hero.jpg" alt="Athlète BODY OS"/></div>
    <div className="v104Metric v104Weight"><small>POIDS</small><b>107,0 <em>kg</em></b><strong>−0,4 kg</strong><span>vs hier</span></div>
    <div className="v104Metric v104Waist"><small>TOUR DE TAILLE</small><b>97 <em>cm</em></b><strong>−1,2 cm</strong><span>vs hier</span></div>
    <button className="v104Trajectory" onClick={()=>setScreen('adaptive')}><span>TRAJECTOIRE</span><i></i><b>OPTIMALE</b><strong>›</strong></button>
   </section>

   <section className="v104TodayBlock">
    <h2>AUJOURD'HUI</h2>
    <div className="v104Kpis">
     <article><i className="fire">♨</i><small>CALORIES</small><b>2 510</b><span>kcal</span></article>
     <article><i className="protein">◯</i><small>PROTÉINES</small><b>180</b><span>g sur 180 g</span></article>
     <button onClick={()=>setScreen('workout')}><i className="train">✣</i><small>ENTRAÎNEMENT</small><b>Pectoraux<br/>Triceps</b></button>
     <article><i className="steps">♧</i><small>ACTIVITÉ</small><b>8 000</b><span>pas</span></article>
    </div>
   </section>

   <button className="v104AdaptiveCard" onClick={()=>setScreen('adaptive')}>
    <span className="brain">✦</span><span><b>Adaptive Sèche</b><small>Analyse de ta progression</small></span><strong>›</strong>
   </button>

   <BottomNav screen="today" setScreen={setScreen}/>
 </main>
}

function Workout({view,setView,setScreen}:{view:WorkoutView,setView:(v:WorkoutView)=>void,setScreen:(s:Screen)=>void}){
 const [group,setGroup]=useState<MuscleGroup>('Pectoraux'); const [selected,setSelected]=useState(0)
 const [done,setDone]=useState<Record<MuscleGroup,boolean[]>>({Pectoraux:Array(5).fill(false),Dos:Array(5).fill(false),Épaules:Array(5).fill(false),Jambes:Array(5).fill(false),Bras:Array(5).fill(false)})
 const [toast,setToast]=useState(''); const exercises=sessionData[group]
 if(view==='exercise') return <Exercise item={exercises[selected]} index={selected} total={exercises.length} group={group} setView={setView} onDone={()=>setDone({...done,[group]:done[group].map((x,i)=>i===selected?true:x)})}/>
 if(view==='rest') return <Rest setView={setView}/>
 if(view==='history') return <History setView={setView}/>
 const changeGroup=(g:MuscleGroup)=>{setGroup(g);setSelected(0)}
 const finish=()=>{const count=done[group].filter(Boolean).length;setToast(count===exercises.length?'Séance enregistrée ✓':`${count}/${exercises.length} exercices validés — progression conservée`);setTimeout(()=>setToast(''),2300)}
 return <main className="v9Page"><header className="v9TitleBar"><button onClick={()=>setScreen('today')}>‹</button><div className="v982SessionHeading"><b>SÉANCE</b><small>{group==='Pectoraux'?'Pectoraux · Triceps':group}</small><em>5 exercices · ~ 32 min</em></div><button className="v93Dots" onClick={()=>setToast('Options de séance')}>•••</button></header>
  <div className="v94MuscleTabs">{muscleGroups.map(g=><button key={g} className={g===group?'active':''} onClick={()=>changeGroup(g)}><span>{g==='Pectoraux'?'♜':g==='Dos'?'♙':g==='Épaules'?'✣':g==='Jambes'?'♧':'◉'}</span><small>{g}</small></button>)}</div>
  <section className="v9ExerciseList">{exercises.map((e,i)=><button key={e.name} onClick={()=>{setSelected(i);setView('exercise')}} className={done[group][i]?'done':''}><div className="v93Thumb"><img src={e.img} onError={ev=>{(ev.currentTarget as HTMLImageElement).src='/body-os/workout-incline-demo-golden.jpg'}}/><i>▶</i></div><span><small>{i+1}</small><b>{e.name}</b><em>{e.equipment} · {e.reps} · RIR {e.rir}</em></span><strong>{e.sets}</strong><i>{done[group][i]?'✓':'○'}</i></button>)}</section>
  <button className="v9Primary" onClick={finish}>TERMINER LA SÉANCE</button><div className="v9Remaining"><small>Temps estimé restant</small><i><span></span></i><b>32 min</b></div>{toast&&<Toast text={toast}/>} </main>
}

function Exercise({item,index,total,group,setView,onDone}:{item:ExerciseItem,index:number,total:number,group:MuscleGroup,setView:(v:WorkoutView)=>void,onDone:()=>void}){
 const [reps,setReps]=useState(index===1?8:10); const [weight,setWeight]=useState(index===3?0:100); const [toast,setToast]=useState('')
 const openVideo=()=>window.open(item.video,'_blank','noopener,noreferrer')
 const validate=()=>{onDone();setToast('Série validée ✓');setTimeout(()=>{setToast('');setView('rest')},650)}
 return <main className="v9Page v9Exercise"><header className="v9TitleBar"><button onClick={()=>setView('session')}>‹</button><div><b>{group.toUpperCase()}</b><small>SÉANCE EN COURS</small></div><button className="v93Dots" onClick={()=>setToast('Options exercice')}>•••</button></header>
  <div className="v9ExerciseHead"><span><small>EXERCICE {index+1}/{total}</small><b>{item.name}</b><em>{item.equipment.toUpperCase()} · {group.toUpperCase()}</em></span><img src={item.anatomy}/></div>
  <section className="v9Media v93VideoMedia v98Media" onClick={openVideo} role="button" tabIndex={0} onKeyDown={e=>e.key==='Enter'&&openVideo()}><img src={item.img} onError={ev=>{(ev.currentTarget as HTMLImageElement).src='/body-os/workout-incline-demo-golden.jpg'}}/><button onClick={e=>{e.stopPropagation();openVideo()}}>▶</button><div><span>CIBLE&nbsp; {item.target}</span><span>SECONDAIRE&nbsp; {item.secondary}</span></div></section>
  <section className="v93Prescription"><span><small>ZONE REPS</small><b>{item.reps}</b></span><span><small>RIR CIBLE</small><b>{item.rir}</b></span><span><small>REPOS</small><b>{item.rest}</b></span></section>
  <section className="v9SetPanel"><small>SÉRIE EN COURS</small><div className="v9Load"><button onClick={()=>setWeight(Math.max(0,weight-2.5))}>−</button><b>{weight}</b><em>KG</em><button onClick={()=>setWeight(weight+2.5)}>+</button></div><div className="v9RepLine"><span>6</span><span>7</span><strong>{reps}</strong><span>9</span><span>10</span></div><input type="range" min="5" max="15" value={reps} onChange={e=>setReps(+e.target.value)}/><div className="v9SetMeta"><span><small>RÉPÉTITIONS</small><b>{reps} REPS</b></span><span><small>RIR</small><b>2</b></span></div></section>
  <button className="v9LastSet" onClick={()=>setView('history')}><span><small>DERNIÈRE SÉRIE</small><b>95 kg × 8 reps</b></span><em>RIR 2</em><strong>↗</strong></button>
  <div className="v9ExerciseActions"><button onClick={()=>setView('session')}>ANNULER</button><button className="pulse" onClick={validate}>✓</button><button onClick={()=>{onDone();setView('session')}}>TERMINER<br/>EXERCICE</button></div>
  {toast&&<Toast text={toast}/>}
 </main>
}

function Rest({setView}:{setView:(v:WorkoutView)=>void}){
 const [sec,setSec]=useState(45)
 return <main className="v9Page v9Rest"><header className="v9TitleBar"><button onClick={()=>setView('exercise')}>‹</button><div><b>REPOS</b><small>&nbsp;</small></div><button onClick={()=>setView('exercise')}>Passer</button></header><section className="v9Timer"><div><b>00:{String(sec).padStart(2,'0')}</b><small>Reprends pour ta prochaine<br/>série</small></div></section><div className="v93TimerControls"><button onClick={()=>setSec(Math.max(0,sec-15))}>−15 s</button><button onClick={()=>setSec(sec+15)}>+15 s</button></div><button className="v9NextSet" onClick={()=>setView('exercise')}><span><small>SÉRIE SUIVANTE</small><b>Reprendre l'exercice</b></span><em>RIR 1–2</em><strong>›</strong></button><button className="v9Outline" onClick={()=>setView('history')}>VOIR HISTORIQUE</button></main>
}

function History({setView}:{setView:(v:WorkoutView)=>void}){
 return <main className="v9Page"><header className="v9TitleBar"><button onClick={()=>setView('exercise')}>‹</button><div><b>HISTORIQUE EXERCICE</b><small>Développé couché · Barre</small></div><span>•••</span></header><div className="v9Segments"><b>CHARGE</b><span>VOLUME</span><span>1RM</span></div><section className="v9HistoryChart"><ResponsiveContainer width="100%" height={210}><BarChart data={strengthData}><Bar dataKey="v" fill="#bdeff2" radius={[4,4,0,0]}/><YAxis hide domain={[80,120]}/><XAxis hide/></BarChart></ResponsiveContainer></section><div className="v9HistoryRows">{[['02/07/25','100 kg × 8','RIR 2'],['19/06/25','97,5 kg × 8','RIR 2'],['05/06/25','95 kg × 8','RIR 2'],['22/05/25','95 kg × 7','RIR 2'],['08/05/25','92,5 kg × 6','RIR 2']].map((r,i)=><div className={i===0?'active':''} key={r[0]}><b>{r[0]}</b><span>{r[1]}</span><em>{r[2]}</em><strong>›</strong></div>)}</div></main>
}

function Nutrition(){
 const [open,setOpen]=useState<Meal|null>(null)
 const [tab,setTab]=useState<'day'|'week'|'month'>('day')
 const [mode,setMode]=useState<'programme'|'recipes'>('programme')
 const [recipeOpen,setRecipeOpen]=useState<Recipe|null>(null)
 const [toast,setToast]=useState('')
 const [settingsOpen,setSettingsOpen]=useState(false)
 const [visionOpen,setVisionOpen]=useState(false)
 const [mealState,setMealState]=useState<Meal[]>(meals)
 const [settings,setSettings]=useState({goal:'SÈCHE',calories:2510,protein:180,carbs:210,fat:70,water:2.5,weeklyRate:-0.5})
 const [draft,setDraft]=useState(settings)

 const saveSettings=()=>{
   setSettings(draft); setSettingsOpen(false); setToast('Réglages enregistrés')
   window.setTimeout(()=>setToast(''),1800)
 }
 const saveMeal=(updated:Meal)=>{
   setMealState(prev=>prev.map(m=>m.name===updated.name?updated:m))
   setOpen(updated); setToast('Repas mis à jour')
   window.setTimeout(()=>setToast(''),1600)
 }
 const addRecipeToPlan=(r:Recipe)=>{
   const target=mealState.find(m=>m.name===r.category)||mealState[1]
   const updated:Meal={...target,kcal:r.kcal,img:r.img,protein:r.protein,carbs:r.carbs,fat:r.fat,ingredients:r.ingredients,details:mealDetails(r.ingredients)}
   setMealState(prev=>prev.map(m=>m.name===target.name?updated:m))
   setRecipeOpen(null); setMode('programme'); setToast(`${r.name} ajouté au programme`)
   window.setTimeout(()=>setToast(''),1800)
 }
 const addVisionToMeal=({target,result}:FoodVisionPayload)=>{
   setMealState(prev=>prev.map(m=>{
    if(m.name!==target)return m
    const ingredients=result.foods.map(f=>({name:f.name,qty:f.qty,unit:' g'}))
    return {...m,kcal:result.kcal,protein:result.protein,carbs:result.carbs,fat:result.fat,ingredients,details:mealDetails(ingredients)}
   }))
   setVisionOpen(false); setToast('Repas analysé ajouté'); window.setTimeout(()=>setToast(''),1800)
 }

 return <main className="v9Page">
  <header className="v9TitleBar">
   <button onClick={()=>history.back()}>‹</button>
   <div><b>NUTRITION</b></div>
   <button className="v93Dots" onClick={()=>{setDraft(settings);setSettingsOpen(true)}}>•••</button>
  </header>

  <div className="v97ModeTabs">
   <button className={mode==='programme'?'active':''} onClick={()=>setMode('programme')}>PROGRAMME</button>
   <button className={mode==='recipes'?'active':''} onClick={()=>setMode('recipes')}>RECETTES</button>
  </div>

  <button className="v99VisionCTA" onClick={()=>setVisionOpen(true)}><span>✦</span><div><small>AI FOOD VISION</small><b>ANALYSER MON REPAS</b></div><em>PHOTO → MACROS</em></button>

  {mode==='programme'?<>
   <div className="v9Segments">
    <button className={tab==='day'?'active':''} onClick={()=>setTab('day')}>AUJOURD'HUI</button>
    <button className={tab==='week'?'active':''} onClick={()=>setTab('week')}>SEMAINE</button>
    <button className={tab==='month'?'active':''} onClick={()=>setTab('month')}>MOIS</button>
   </div>

   <section className="v9NutritionHero">
    <div className="v9MacroRing"><b>{settings.calories.toLocaleString('fr-FR')}</b><small>kcal cibles</small></div>
    <div className="v9MacroLegend">
     <p><i></i><span>PROTÉINES</span><b>{settings.protein} g</b></p>
     <p><i></i><span>GLUCIDES</span><b>{settings.carbs} g</b></p>
     <p><i></i><span>LIPIDES</span><b>{settings.fat} g</b></p>
    </div>
   </section>

   <section className="v9MealList">
    <h3>{tab==='day'?'REPAS DU JOUR':tab==='week'?'APERÇU SEMAINE':'TENDANCE DU MOIS'}</h3>
    {mealState.map(m=><button key={m.name} onClick={()=>setOpen(m)}>
     <span className="v95MealText"><small>{m.name}</small><b>{mealDetails(m.ingredients)}</b><em>{m.time}</em></span>
     <img src={m.img}/><strong>{m.kcal} kcal</strong>
    </button>)}
   </section>
   <button className="v9Fab" onClick={()=>{setToast('Ajout rapide prêt');window.setTimeout(()=>setToast(''),1800)}}>＋</button>
  </>:<>
   <section className="v97Recipes">
    <div className="v97RecipeHead"><div><small>RECETTES INTELLIGENTES</small><b>Compatibles avec ta sèche</b></div><span>{recipes.length} recettes</span></div>
    <div className="v97RecipeFilters"><button className="active">TOUTES</button><button>RAPIDES</button><button>PROTÉINÉES</button><button>FAVORIS</button></div>
    <div className="v97RecipeGrid">{recipes.map(r=><button key={r.id} onClick={()=>setRecipeOpen(r)}>
     <img src={r.img}/><span><small>{r.category} · {r.time}</small><b>{r.name}</b><em>{r.kcal} kcal · P {r.protein} g</em></span>
    </button>)}</div>
   </section>
  </>}

  {open&&<MealSheet meal={open} close={()=>setOpen(null)} save={saveMeal}/>}
  {recipeOpen&&<RecipeSheet recipe={recipeOpen} close={()=>setRecipeOpen(null)} add={()=>addRecipeToPlan(recipeOpen)}/>}
  {settingsOpen&&<div className="v9SheetBack" onClick={()=>setSettingsOpen(false)}>
   <section className="v96NutritionSettings" onClick={e=>e.stopPropagation()}>
    <header><button onClick={()=>setSettingsOpen(false)}>×</button><div><small>RÉGLAGES NUTRITION</small><b>Adapter la sèche</b></div><span></span></header>
    <div className="v96SettingsBody">
     <label><span>Objectif</span><select value={draft.goal} onChange={e=>setDraft({...draft,goal:e.target.value})}><option>SÈCHE</option><option>RECOMPOSITION</option><option>MAINTIEN</option><option>PRISE DE MASSE</option></select></label>
     <label><span>Calories cibles</span><div><input type="number" value={draft.calories} onChange={e=>setDraft({...draft,calories:+e.target.value})}/><em>kcal</em></div></label>
     <label><span>Protéines</span><div><input type="number" value={draft.protein} onChange={e=>setDraft({...draft,protein:+e.target.value})}/><em>g</em></div></label>
     <label><span>Glucides</span><div><input type="number" value={draft.carbs} onChange={e=>setDraft({...draft,carbs:+e.target.value})}/><em>g</em></div></label>
     <label><span>Lipides</span><div><input type="number" value={draft.fat} onChange={e=>setDraft({...draft,fat:+e.target.value})}/><em>g</em></div></label>
     <label><span>Hydratation</span><div><input type="number" step="0.1" value={draft.water} onChange={e=>setDraft({...draft,water:+e.target.value})}/><em>L</em></div></label>
     <label><span>Rythme cible</span><div><input type="number" step="0.1" value={draft.weeklyRate} onChange={e=>setDraft({...draft,weeklyRate:+e.target.value})}/><em>kg/sem</em></div></label>
     <div className="v96SettingsInfo"><b>BODY OS adapte ensuite les portions</b><small>Les portions restent ajustables repas par repas.</small></div>
    </div>
    <footer><button onClick={()=>setSettingsOpen(false)}>ANNULER</button><button className="primary" onClick={saveSettings}>ENREGISTRER</button></footer>
   </section>
  </div>}
  {visionOpen&&<FoodVision close={()=>setVisionOpen(false)} onAdd={addVisionToMeal}/>}
  {toast&&<Toast text={toast}/>}
 </main>
}

function MealSheet({meal,close,save}:{meal:Meal,close:()=>void,save:(m:Meal)=>void}){
 const [draft,setDraft]=useState<Meal>({...meal,ingredients:meal.ingredients.map(i=>({...i}))})
 const [edit,setEdit]=useState(false)
 const foodBank=['Skyr 0%','Flocons d’avoine','Myrtilles','Beurre de cacahuète','Saumon','Poulet grillé','Riz basmati cuit','Patate douce','Brocoli','Légumes verts','Fruits rouges','Amandes','Miel','Huile d’olive']
 const updateQty=(idx:number,delta:number)=>setDraft(d=>({...d,ingredients:d.ingredients.map((x,i)=>i===idx?{...x,qty:Math.max(0,Math.round((x.qty+delta)*10)/10)}:x)}))
 const removeIngredient=(idx:number)=>setDraft(d=>({...d,ingredients:d.ingredients.filter((_,i)=>i!==idx)}))
 const addIngredient=(name:string)=>setDraft(d=>({...d,ingredients:[...d.ingredients,{name,qty:100,unit:' g'}]}))
 const persist=()=>{const next={...draft,details:mealDetails(draft.ingredients)};save(next);setDraft(next);setEdit(false)}
 return <div className="v9SheetBack" onClick={close}><section className="v9MealSheet v97MealSheet" onClick={e=>e.stopPropagation()}>
  <header><button onClick={close}>‹</button><b>{meal.name.toUpperCase()}</b><button onClick={()=>setEdit(!edit)}>{edit?'OK':'•••'}</button></header>
  <img className="v9FoodHero" src={draft.img}/>
  <div className="v9MealInfo">
   <h2>{draft.name}</h2><p className="v96PortionLabel">PORTIONS CIBLES</p>
   <div className="v97IngredientList">{draft.ingredients.map((ing,i)=><div key={ing.name+i}>
    <span><b>{ing.name}</b><small>{ing.qty}{ing.unit}</small></span>
    {edit&&<div className="v97IngredientActions"><button onClick={()=>updateQty(i,-10)}>−</button><input type="number" value={ing.qty} onChange={e=>setDraft(d=>({...d,ingredients:d.ingredients.map((x,j)=>j===i?{...x,qty:+e.target.value}:x)}))}/><button onClick={()=>updateQty(i,10)}>+</button><button className="remove" onClick={()=>removeIngredient(i)}>×</button></div>}
   </div>)}</div>
   {edit&&<div className="v97AddFood"><small>AJOUTER UN ALIMENT</small><div>{foodBank.filter(f=>!draft.ingredients.some(i=>i.name===f)).slice(0,8).map(f=><button key={f} onClick={()=>addIngredient(f)}>＋ {f}</button>)}</div></div>}
   <b>{draft.kcal} <small>kcal</small></b>
   <div><span><i>◖</i><b>{draft.protein} g</b><small>Protéines</small></span><span><i>G</i><b>{draft.carbs} g</b><small>Glucides</small></span><span><i>L</i><b>{draft.fat} g</b><small>Lipides</small></span></div>
   <button className="v9Primary" onClick={()=>edit?persist():setEdit(true)}>{edit?'ENREGISTRER LE REPAS':'MODIFIER LE REPAS'}</button>
   <h3>ALTERNATIVES</h3><div className="v9Alternatives">{recipes.slice(0,3).map(r=><button onClick={()=>setDraft(d=>({...d,img:r.img,kcal:r.kcal,protein:r.protein,carbs:r.carbs,fat:r.fat,ingredients:r.ingredients.map(i=>({...i}))}))} key={r.id}><img src={r.img}/><small>{r.kcal} kcal</small></button>)}</div>
  </div>
 </section></div>
}

function RecipeSheet({recipe,close,add}:{recipe:Recipe,close:()=>void,add:()=>void}){
 return <div className="v9SheetBack" onClick={close}><section className="v9MealSheet v97RecipeSheet" onClick={e=>e.stopPropagation()}>
  <header><button onClick={close}>‹</button><b>RECETTE</b><span>♡</span></header>
  <img className="v9FoodHero" src={recipe.img}/>
  <div className="v9MealInfo"><small>{recipe.category} · {recipe.time}</small><h2>{recipe.name}</h2><b>{recipe.kcal} <small>kcal</small></b>
   <div><span><i>◖</i><b>{recipe.protein} g</b><small>Protéines</small></span><span><i>G</i><b>{recipe.carbs} g</b><small>Glucides</small></span><span><i>L</i><b>{recipe.fat} g</b><small>Lipides</small></span></div>
   <h3>INGRÉDIENTS</h3><div className="v97RecipeIngredients">{recipe.ingredients.map(i=><div key={i.name}><span>{i.name}</span><b>{i.qty}{i.unit}</b></div>)}</div>
   <h3>PRÉPARATION</h3><ol className="v97Steps">{recipe.steps.map((s,i)=><li key={i}>{s}</li>)}</ol>
   <button className="v9Primary" onClick={add}>AJOUTER AU PROGRAMME</button>
  </div>
 </section></div>
}


type EvolutionPhoto={
 id:string
 src:string
 date:string
 label:string
}

const DEFAULT_EVOLUTION_PHOTOS:EvolutionPhoto[]=[
 {id:'p1',src:'/body-os/v9-progress-athlete.png',date:'2026-05-08',label:'08/05'},
 {id:'p2',src:'/body-os/v9-progress-athlete.png',date:'2026-06-05',label:'05/06'},
 {id:'p3',src:'/body-os/v9-progress-athlete.png',date:'2026-07-02',label:'02/07'},
]

function compressEvolutionPhoto(file:File):Promise<string>{
 return new Promise((resolve,reject)=>{
  const reader=new FileReader()
  reader.onerror=()=>reject(new Error('Lecture impossible'))
  reader.onload=()=>{
   const image=new Image()
   image.onerror=()=>reject(new Error('Image invalide'))
   image.onload=()=>{
    const maxW=900,maxH=1200
    const ratio=Math.min(1,maxW/image.width,maxH/image.height)
    const canvas=document.createElement('canvas')
    canvas.width=Math.max(1,Math.round(image.width*ratio))
    canvas.height=Math.max(1,Math.round(image.height*ratio))
    const ctx=canvas.getContext('2d')
    if(!ctx){reject(new Error('Canvas indisponible'));return}
    ctx.drawImage(image,0,0,canvas.width,canvas.height)
    resolve(canvas.toDataURL('image/jpeg',.82))
   }
   image.src=String(reader.result)
  }
  reader.readAsDataURL(file)
 })
}

function EvolutionPhotosSheet({
 photos,
 close,
 onChange
}:{
 photos:EvolutionPhoto[]
 close:()=>void
 onChange:(photos:EvolutionPhoto[])=>void
}){
 const [selected,setSelected]=useState(photos.length?photos.length-1:0)
 const [busy,setBusy]=useState(false)
 const active=photos[selected]

 const addFiles=async(files:FileList|null)=>{
  if(!files?.length)return
  setBusy(true)
  try{
   const next=[...photos]
   for(const file of Array.from(files).slice(0,4)){
    if(!file.type.startsWith('image/'))continue
    const src=await compressEvolutionPhoto(file)
    const now=new Date()
    const date=now.toISOString().slice(0,10)
    const label=now.toLocaleDateString('fr-FR',{day:'2-digit',month:'2-digit'})
    next.push({id:`photo-${Date.now()}-${Math.random()}`,src,date,label})
   }
   const limited=next.slice(-8)
   onChange(limited)
   setSelected(Math.max(0,limited.length-1))
  } finally {setBusy(false)}
 }

 const replacePhoto=async(files:FileList|null)=>{
  if(!files?.[0]||!active)return
  setBusy(true)
  try{
   const src=await compressEvolutionPhoto(files[0])
   const next=photos.map((p,i)=>i===selected?{...p,src}:p)
   onChange(next)
  } finally {setBusy(false)}
 }

 const updateDate=(value:string)=>{
  const date=new Date(value+'T12:00:00')
  const label=Number.isNaN(date.getTime())?value:date.toLocaleDateString('fr-FR',{day:'2-digit',month:'2-digit'})
  onChange(photos.map((p,i)=>i===selected?{...p,date:value,label}:p))
 }

 const remove=()=>{
  if(!active)return
  const next=photos.filter((_,i)=>i!==selected)
  onChange(next)
  setSelected(Math.max(0,Math.min(selected,next.length-1)))
 }

 return <div className="v9SheetBack" onClick={close}>
  <section className="v982PhotoSheet" onClick={e=>e.stopPropagation()}>
   <header>
    <button onClick={close}>×</button>
    <div><small>PROGRESS</small><b>PHOTOS D’ÉVOLUTION</b></div>
    <label className="v982AddTop">＋<input type="file" accept="image/*" multiple onChange={e=>addFiles(e.target.files)}/></label>
   </header>

   <div className="v982PhotoHero">
    {active?<img src={active.src}/>:<div className="v982EmptyPhoto"><b>Aucune photo</b><small>Ajoute ta première photo d’évolution</small></div>}
    {active&&<span>{active.label}</span>}
   </div>

   <div className="v982PhotoTimeline">
    {photos.map((p,i)=><button key={p.id} className={i===selected?'active':''} onClick={()=>setSelected(i)}>
     <img src={p.src}/><small>{p.label}</small>
    </button>)}
    <label className="v982PhotoAddCard"><b>＋</b><small>Ajouter</small><input type="file" accept="image/*" multiple onChange={e=>addFiles(e.target.files)}/></label>
   </div>

   {active&&<div className="v982PhotoActions">
    <label>REMPLACER<input type="file" accept="image/*" onChange={e=>replacePhoto(e.target.files)}/></label>
    <label className="date">DATE<input type="date" value={active.date} onChange={e=>updateDate(e.target.value)}/></label>
    <button onClick={remove}>SUPPRIMER</button>
   </div>}

   <section className="v982Compare">
    <div><small>AVANT</small>{photos[0]?<img src={photos[0].src}/>:<i/>}</div>
    <span>→</span>
    <div><small>MAINTENANT</small>{photos.at(-1)?<img src={photos.at(-1)!.src}/>:<i/>}</div>
   </section>

   <p>Pour une comparaison fiable : même cadrage, même lumière, même distance et posture similaire.</p>
   {busy&&<div className="v982PhotoBusy">Préparation de la photo…</div>}
  </section>
 </div>
}

function Progress({setScreen}:{setScreen:(s:Screen)=>void}){
 const [tab,setTab]=useState<'cut'|'physique'|'perf'>('cut'); const [muscle,setMuscle]=useState<MuscleGroup>('Pectoraux'); const [photos,setPhotos]=useState(false)
 const [evolutionPhotos,setEvolutionPhotos]=useState<EvolutionPhoto[]>(()=>{
  try{
   const raw=localStorage.getItem('body-os-evolution-photos-v1')
   return raw?JSON.parse(raw):DEFAULT_EVOLUTION_PHOTOS
  }catch{return DEFAULT_EVOLUTION_PHOTOS}
 })
 useEffect(()=>{
  try{localStorage.setItem('body-os-evolution-photos-v1',JSON.stringify(evolutionPhotos))}catch{}
 },[evolutionPhotos])
 const m=progressMuscles[muscle]; const muscleTrend=[0.1,0.5,0.2,0.4,-0.1].map((v,i)=>({d:['08/05','22/05','05/06','19/06','02/07'][i],v}))
 return <main className="v9Page v94Progress"><header className="v9TitleBar"><button onClick={()=>setScreen('today')}>‹</button><div><b>PROGRESS</b></div><button className="v93Dots">☷</button></header>
  <div className="v9Segments v94MainSegments"><button className={tab==='cut'?'active':''} onClick={()=>setTab('cut')}>SÈCHE</button><button className={tab==='physique'?'active':''} onClick={()=>setTab('physique')}>PHYSIQUE</button><button className={tab==='perf'?'active':''} onClick={()=>setTab('perf')}>PERF.</button></div>
  {tab==='cut'&&<><section className="v9WeightCard"><div><small>POIDS</small><strong>-0,4 kg</strong><i>vs semaine dernière</i><b>107,0 <em>kg</em></b></div><ResponsiveContainer width="100%" height={180}><LineChart data={weightData}><Line dataKey="w" stroke="#75eef0" strokeWidth={3} dot={{r:4,fill:'#d8fcff'}}/><XAxis dataKey="d" tick={{fill:'#90a8b2',fontSize:9}} axisLine={false}/><YAxis domain={[102,110]} tick={{fill:'#90a8b2',fontSize:9}} axisLine={false}/></LineChart></ResponsiveContainer></section><div className="v9ProgressGrid"><article><small>TOUR DE TAILLE</small><b>97 <em>cm</em></b><strong>-1,2 cm</strong></article><article><small>MASSE GRASSE</small><b>18,6 <em>%</em></b><strong>-0,7 %</strong></article><article onClick={()=>setPhotos(true)}><small>PHOTOS</small><b>Voir</b><div className="v94PhotoPair"><img src={evolutionPhotos[0]?.src||"/body-os/v9-progress-athlete.png"}/><img src={evolutionPhotos.at(-1)?.src||"/body-os/v9-progress-athlete.png"}/></div></article></div><section className="v9Impact"><span><small>IMPACT CORPS</small><b>74%</b><em>Déficit en moyenne</em><i><strong></strong></i></span><div className={'v94AthleteMini '+m.overlay}><img src="/body-os/v9-progress-athlete.png"/><i></i><i></i></div></section></>}
  {tab==='physique'&&<><section className="v94Photos v982ProgressPhotos"><h3>PHOTOS D'ÉVOLUTION <button onClick={()=>setPhotos(true)}>＋ AJOUTER</button></h3><div>{evolutionPhotos.slice(-4).map((p,i)=><button key={p.id} onClick={()=>setPhotos(true)}><img src={p.src}/><small>{i===evolutionPhotos.slice(-4).length-1?'Aujourd’hui':p.label}</small></button>)}</div></section><section className="v9Impact"><span><small>IMPACT CORPS</small><b>{m.score}%</b><em>{muscle} suivi</em><i><strong style={{width:m.score+'%'}}></strong></i></span><div className={'v94AthleteMini '+m.overlay}><img src="/body-os/v9-progress-athlete.png"/><i></i><i></i></div></section><h3 className="v94Sub">ÉVOLUTION PAR MUSCLE</h3><div className="v94MuscleChips">{muscleGroups.map(g=><button className={muscle===g?'active':''} onClick={()=>setMuscle(g)} key={g}>{g}</button>)}</div><section className="v94MuscleDetail"><div><small>{muscle.toUpperCase()}</small><b>{m.measure} {m.unit}</b><strong>{m.delta}</strong><em>vs semaine dernière</em></div><ResponsiveContainer width="100%" height={115}><LineChart data={muscleTrend}><Line dataKey="v" stroke="#78eff0" strokeWidth={2} dot={{r:3,fill:'#baffff'}}/><XAxis dataKey="d" tick={{fill:'#8ba6ad',fontSize:7}} axisLine={false}/><YAxis hide domain={[-1,1]}/></LineChart></ResponsiveContainer></section></>}
  {tab==='perf'&&<><section className="v94PerfHero"><small>PERFORMANCE EN SÈCHE</small><b>STABLE</b><strong>+2,8 %</strong><p>La force est maintenue malgré le déficit : bon signal pour la préservation musculaire.</p></section><div className="v94MuscleChips">{muscleGroups.map(g=><button className={muscle===g?'active':''} onClick={()=>setMuscle(g)} key={g}>{g}</button>)}</div><section className="v9HistoryChart"><ResponsiveContainer width="100%" height={210}><BarChart data={strengthData}><Bar dataKey="v" fill="#8feef0" radius={[4,4,0,0]}/><YAxis hide domain={[80,120]}/><XAxis hide/></BarChart></ResponsiveContainer></section><section className="v94PerfStats"><span><small>VOLUME</small><b>{muscle==='Jambes'?'12':'10'} séries</b></span><span><small>RIR MOYEN</small><b>1,7</b></span><span><small>ADHÉRENCE</small><b>94%</b></span></section></>}
  {photos&&<EvolutionPhotosSheet photos={evolutionPhotos} close={()=>setPhotos(false)} onChange={setEvolutionPhotos}/>}
 </main>
}


function AdaptiveIntelligence({setScreen}:{setScreen:(s:Screen)=>void}){
 const [checkinOpen,setCheckinOpen]=useState(false)
 const [decisionOpen,setDecisionOpen]=useState(false)
 const [checkin,setCheckin]=useState({weight:'107.0',waist:'97',sleep:7,energy:4,hunger:3,recovery:4})
 const trend=[{d:'J-13',w:108.2},{d:'J-11',w:108.0},{d:'J-9',w:107.8},{d:'J-7',w:107.6},{d:'J-5',w:107.5},{d:'J-3',w:107.2},{d:'Auj.',w:107.0}]
 const preservation=94
 const adherence=91
 return <main className="v9Page v103Adaptive">
  <header className="v9TitleBar"><button onClick={()=>setScreen('coach')}>‹</button><div><b>ADAPTIVE SÈCHE</b><small>INTELLIGENCE · SEMAINE 7</small></div><span className="v103Live">● ACTIF</span></header>

  <section className="v103Decision">
   <div className="v103DecisionTop"><span><small>DÉCISION DE LA SEMAINE</small><b>MAINTENIR</b></span><strong>✓</strong></div>
   <p>La trajectoire est cohérente : poids et taille diminuent, performances stables et adhérence élevée.</p>
   <div className="v103DecisionMetrics"><span><small>POIDS 7J</small><b>−0,48 kg</b></span><span><small>TAILLE</small><b>−0,7 cm</b></span><span><small>PERF.</small><b>STABLE</b></span></div>
   <button onClick={()=>setDecisionOpen(true)}>2 510 KCAL MAINTENUES <b>›</b></button>
  </section>

  <section className="v103Trend">
   <header><div><small>TRAJECTOIRE 14 JOURS</small><b>107,0 kg</b></div><span>OPTIMALE</span></header>
   <ResponsiveContainer width="100%" height={180}><LineChart data={trend}><Line type="monotone" dataKey="w" stroke="#77eff0" strokeWidth={3} dot={{r:4,fill:'#d9ffff'}}/><XAxis dataKey="d" tick={{fill:'#829ca7',fontSize:9}} axisLine={false}/><YAxis domain={[106.5,108.6]} hide/></LineChart></ResponsiveContainer>
   <div className="v103Trajectory"><span>RÉEL</span><i></i><span>OBJECTIF −0,5 kg/sem.</span></div>
  </section>

  <div className="v103ScoreGrid">
   <section><small>MUSCLE PRESERVATION</small><div className="v103Ring"><b>{preservation}</b><em>/100</em></div><strong>EXCELLENT</strong><p>Force stable · protéines hautes · rythme de perte maîtrisé.</p></section>
   <section><small>ADHÉRENCE NUTRITION</small><div className="v103Ring"><b>{adherence}</b><em>%</em></div><strong>TRÈS BON</strong><p>Calories 87% · protéines 94% · repas enregistrés 6/7.</p></section>
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
   <button className="v9Primary" onClick={()=>setCheckinOpen(false)}>ENREGISTRER LE CHECK-IN</button>
  </section></div>}

  {decisionOpen&&<InfoSheet title="POURQUOI MAINTENIR ?" close={()=>setDecisionOpen(false)}>
   <div className="v103Why"><b>Décision proposée : maintenir 2 510 kcal</b><p>La moyenne de poids baisse au rythme cible, le tour de taille diminue et les performances restent stables. Réduire davantage les calories n'apporte pas de bénéfice évident aujourd'hui.</p><small>CONFIANCE DU MOTEUR</small><strong>ÉLEVÉE · 92%</strong><p>Cette recommandation est une aide à la décision, pas un diagnostic médical.</p></div>
  </InfoSheet>}
 </main>
}

function Coach({setScreen}:{setScreen:(s:Screen)=>void}){
 const [answer,setAnswer]=useState(''); const [q,setQ]=useState('')
 const ask=(kind:string)=>{if(kind==='progression'){setScreen('adaptive');return} setAnswer(kind==='progression'?'Trajectoire cohérente : conserve les calories et vise la stabilité de tes performances.':kind==='adjust'?'Aucun ajustement majeur aujourd’hui. Priorité : protéines, sommeil et performance sur les mouvements de base.':'Conseil récupération : garde 1–2 RIR sur la majorité des séries et évite d’augmenter simultanément cardio et volume musculation.')}
 return <main className="v9Page v9Coach"><header className="v9TitleBar"><button onClick={()=>setScreen('today')}>‹</button><div><b>AI COACH</b></div><span className="v9Online">● DÉMO</span></header><div className="v9Orb"><i></i><i></i><b>✦</b></div><section className="v9CoachHello"><b>Salut Fouad 👋</b><span>Que veux-tu optimiser aujourd'hui ?</span></section><div className="v9CoachPrompts"><button onClick={()=>ask('progression')}>◉ <span>Analyse de ma progression</span>›</button><button onClick={()=>ask('adjust')}>◎ <span>Que dois-je ajuster ?</span>›</button><button onClick={()=>setScreen('plan')}>◌ <span>Planifie ma semaine</span>›</button><button onClick={()=>ask('recovery')}>♙ <span>Conseil récupération</span>›</button></div>{answer&&<div className="v93CoachAnswer">{answer}</div>}<label className="v9Ask"><input value={q} onChange={e=>setQ(e.target.value)} placeholder="Pose une question…"/><button onClick={()=>{if(q.trim()){setAnswer('Mode démo : ta question est enregistrée. Le moteur LLM sera branché séparément.');setQ('')}}}>➤</button></label><div className="v9CoachNote">Mode démo : moteur BODY OS local. Aucun token OpenAI requis.</div></main>
}

function Plan(){
 const [selected,setSelected]=useState(0)
 const days=[['LUN','7','Pectoraux\nTriceps','Musculation\n45 min'],['MAR','8','Cardio LISS\nZone 2','45 min'],['MER','9','Dos\nBiceps','Musculation\n50 min'],['JEU','10','Repos actif\nMobilité','20 min'],['VEN','11','Épaules\nAbdos','Musculation\n45 min'],['SAM','12','Cardio HIIT','45 min'],['DIM','13','Jambes\nMollets','Musculation\n50 min']]
 return <main className="v9Page"><header className="v9TitleBar"><button onClick={()=>history.back()}>‹</button><div><b>PLAN IA — SEMAINE</b><small>07 – 13 JUILLET</small></div><span>◫</span></header><section className="v9Week">{days.map((d,i)=><article onClick={()=>setSelected(i)} className={i===selected?'active':''} key={d[0]}><b>{d[0]}</b><strong>{d[1]}</strong><span>{d[2].split('\n').map(x=><i key={x}>{x}</i>)}</span><em>{d[3].split('\n').map(x=><i key={x}>{x}</i>)}</em><small>◌ 10 000 pas</small></article>)}</section><section className="v9WeekGoal"><div><small>OBJECTIF DE LA SEMAINE</small><p>Continuer la sèche en préservant le muscle.<br/>Déficit modéré.<br/>Protéines hautes.<br/>Performances stables.</p></div><aside><b>Tes progrès sont excellents.</b><span>Aucun ajustement calorique nécessaire cette semaine.</span><strong>92%</strong></aside></section></main>
}

export default function V9App(){
 const [screen,setScreen]=useState<Screen>('today'); const [workoutView,setWorkoutView]=useState<WorkoutView>('session')
 const page=useMemo(()=>screen==='today'?<Today setScreen={setScreen}/>:screen==='workout'?<Workout view={workoutView} setView={setWorkoutView} setScreen={setScreen}/>:screen==='nutrition'?<Nutrition/>:screen==='progress'?<Progress setScreen={setScreen}/>:screen==='coach'?<Coach setScreen={setScreen}/>:screen==='adaptive'?<AdaptiveIntelligence setScreen={setScreen}/>:<Plan/>,[screen,workoutView])
 const showNav=screen==='nutrition'||screen==='progress'
 return <div className="v9Shell"><div className="v9Phone">{screen!=='today'&&<StatusBar/>}{page}{showNav&&<BottomNav screen={screen} setScreen={s=>{setScreen(s);if(s==='workout')setWorkoutView('session')}}/>}</div></div>
}
