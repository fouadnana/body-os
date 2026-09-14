import { useEffect, useMemo, useState } from 'react'
import { Line, LineChart, ResponsiveContainer, XAxis, YAxis, Bar, BarChart } from 'recharts'
import './v9.css'
import FoodVision, { type FoodVisionPayload } from './FoodVision'

type Screen='today'|'workout'|'nutrition'|'progress'|'coach'|'plan'|'adaptive'
type WorkoutView='session'|'exercise'|'rest'|'history'

const NUTRITION_SETTINGS_KEY='bodyos.nutrition.settings.v1'
const NUTRITION_MEALS_KEY='bodyos.nutrition.meals.v1'
const WORKOUT_DONE_KEY='bodyos.workout.done.v1'
const WORKOUT_LOG_KEY='bodyos.workout.log.v1'
const DAILY_LOG_KEY='bodyos.daily.log.v1'
const SCHEDULE_KEY='bodyos.schedule.v1'
const readJSON=<T,>(key:string,fallback:T):T=>{try{const raw=localStorage.getItem(key);return raw?JSON.parse(raw):fallback}catch{return fallback}}
const writeJSON=(key:string,value:unknown)=>{try{localStorage.setItem(key,JSON.stringify(value))}catch{}}

type DailyEntry={date:string,weight?:number,waist?:number,steps?:number,bodyFat?:number}
const WORKOUT_HISTORY_KEY='bodyos.workout.history.v1'
type WorkoutHistoryEntry={date:string,group:string,exercise:string,weight:number,reps:number}
const readWorkoutHistory=()=>readJSON<WorkoutHistoryEntry[]>(WORKOUT_HISTORY_KEY,[])
const logWorkoutSet=(entry:WorkoutHistoryEntry)=>{
 const log=readWorkoutHistory()
 log.push(entry)
 writeJSON(WORKOUT_HISTORY_KEY,log.slice(-500))
}
const todayISO=()=>new Date().toISOString().slice(0,10)
const mondayIndex=(d=new Date())=>(d.getDay()+6)%7
const readDailyLog=()=>readJSON<DailyEntry[]>(DAILY_LOG_KEY,[]).slice().sort((a,b)=>a.date.localeCompare(b.date))
const upsertDailyEntry=(patch:Partial<DailyEntry>)=>{
 const log=readDailyLog(); const date=todayISO()
 const idx=log.findIndex(e=>e.date===date)
 if(idx===-1) log.push({date,...patch}); else log[idx]={...log[idx],...patch}
 writeJSON(DAILY_LOG_KEY,log); return log
}

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

const strengthData=[92.5,95,95,97.5,100,100,97.5,100,102.5,105].map((v,i)=>({i,v}))
type MuscleGroup='Pectoraux'|'Dos'|'Épaules'|'Jambes'|'Bras'
type SessionGroup=MuscleGroup|'L5-S1'
type ExerciseItem={name:string,equipment:string,sets:string,img:string,video:string,target:string,secondary:string,reps:string,rir:string,rest:string}
const muscleGroups:MuscleGroup[]=['Pectoraux','Dos','Épaules','Jambes','Bras']
const sessionGroups:SessionGroup[]=[...muscleGroups,'L5-S1']
type DayPlan=SessionGroup|'Repos'|'Cardio'
const WEEKDAYS=['Lundi','Mardi','Mercredi','Jeudi','Vendredi','Samedi','Dimanche']
const DEFAULT_SCHEDULE:DayPlan[]=['Pectoraux','Dos','Jambes','Épaules','Bras','Bras','Repos']
const readSchedule=():DayPlan[]=>{const s=readJSON<DayPlan[]>(SCHEDULE_KEY,DEFAULT_SCHEDULE);return s.length===7?s:DEFAULT_SCHEDULE}
const dayIcon=(d:DayPlan)=>d==='Pectoraux'?'♜':d==='Dos'?'♙':d==='Épaules'?'✣':d==='Jambes'?'♧':d==='Bras'?'◉':d==='L5-S1'?'⚕':d==='Cardio'?'◌':'☾'
const isRappelDay=(schedule:DayPlan[],idx:number)=>{
 const g=schedule[idx]
 if(g==='Repos'||g==='Cardio') return false
 return schedule.indexOf(g)!==idx
}
const DEFAULT_NUTRITION_SETTINGS={goal:'SÈCHE',calories:2600,protein:200,carbs:280,fat:75,water:3,weeklyRate:-0.55}
const sessionData:Record<SessionGroup,ExerciseItem[]>={
 Pectoraux:[
  {name:'Développé incliné',equipment:'Haltères',sets:'3 séries',img:'https://img.youtube.com/vi/5CECBjd7HLQ/hqdefault.jpg',video:'https://www.youtube.com/watch?v=5CECBjd7HLQ',target:'Haut des pectoraux',secondary:'Triceps · Deltoïdes ant.',reps:'6–10',rir:'1–2',rest:'2:30–3:00'},
  {name:'Développé couché',equipment:'Barre',sets:'3 séries',img:'https://img.youtube.com/vi/A0NBCkpYatQ/hqdefault.jpg',video:'https://www.youtube.com/watch?v=A0NBCkpYatQ',target:'Pectoraux',secondary:'Triceps · Deltoïdes ant.',reps:'5–8',rir:'1–2',rest:'2:30–3:30'},
  {name:'Écartés couchés',equipment:'Haltères',sets:'3 séries',img:'https://img.youtube.com/vi/_LwuS1PdbdM/hqdefault.jpg',video:'https://www.youtube.com/watch?v=_LwuS1PdbdM',target:'Pectoraux',secondary:'Deltoïdes ant.',reps:'10–15',rir:'1–2',rest:'1:30–2:00'},
  {name:'Dips',equipment:'Poids du corps',sets:'3 séries',img:'https://img.youtube.com/vi/yN6Q1UI_xkE/hqdefault.jpg',video:'https://www.youtube.com/watch?v=yN6Q1UI_xkE',target:'Pectoraux · Triceps',secondary:'Deltoïdes ant.',reps:'6–12',rir:'1–2',rest:'2:00–3:00'},
  {name:'Écarté poulie bas→haut',equipment:'Poulie',sets:'3 séries',img:'https://img.youtube.com/vi/eQ_NBB6OBH4/hqdefault.jpg',video:'https://www.youtube.com/watch?v=eQ_NBB6OBH4',target:'Haut des pectoraux',secondary:'Deltoïdes ant.',reps:'12–15',rir:'1–2',rest:'1:30'},
 ],
 Dos:[
  {name:'Tirage vertical',equipment:'Poulie',sets:'3 séries',img:'https://img.youtube.com/vi/VXKfH6ciEBI/hqdefault.jpg',video:'https://www.youtube.com/watch?v=VXKfH6ciEBI',target:'Grand dorsal',secondary:'Biceps',reps:'6–10',rir:'1–2',rest:'2:00–3:00'},
  {name:'Rowing machine',equipment:'Machine',sets:'3 séries',img:'https://img.youtube.com/vi/TeFo51Q_Nsc/hqdefault.jpg',video:'https://www.youtube.com/watch?v=TeFo51Q_Nsc',target:'Dos moyen',secondary:'Biceps · Deltoïdes post.',reps:'8–12',rir:'1–2',rest:'2:00–3:00'},
  {name:'Rowing poitrine',equipment:'Machine',sets:'2 séries',img:'https://img.youtube.com/vi/0UBRfiO4zDs/hqdefault.jpg',video:'https://www.youtube.com/watch?v=0UBRfiO4zDs',target:'Rhomboïdes · Trapèzes',secondary:'Biceps',reps:'8–12',rir:'1–2',rest:'2:00'},
  {name:'Pulldown unilatéral',equipment:'Poulie',sets:'2 séries',img:'https://img.youtube.com/vi/iVfZB4YmLRM/hqdefault.jpg',video:'https://www.youtube.com/watch?v=iVfZB4YmLRM',target:'Grand dorsal',secondary:'Biceps',reps:'10–15',rir:'1–2',rest:'1:30'},
  {name:'Reverse fly',equipment:'Poulie',sets:'3 séries',img:'https://img.youtube.com/vi/buuYPLVXsJg/hqdefault.jpg',video:'https://www.youtube.com/watch?v=buuYPLVXsJg',target:'Deltoïdes post.',secondary:'Haut du dos',reps:'12–20',rir:'1–2',rest:'1:30'},
 ],
 Épaules:[
  {name:'Développé épaules',equipment:'Machine',sets:'3 séries',img:'https://img.youtube.com/vi/WvLMauqrnK8/hqdefault.jpg',video:'https://www.youtube.com/watch?v=WvLMauqrnK8',target:'Deltoïdes ant. · moyen',secondary:'Triceps',reps:'6–10',rir:'1–2',rest:'2:00–3:00'},
  {name:'Élévations latérales',equipment:'Haltères',sets:'4 séries',img:'/body-os/demo-lat-raise-approved.jpg',video:'https://www.youtube.com/results?search_query=lateral+raise+technique+renaissance+periodization',target:'Deltoïde moyen',secondary:'—',reps:'10–20',rir:'1–2',rest:'1:15–1:45'},
  {name:'Élévations poulie',equipment:'Poulie',sets:'3 séries',img:'https://img.youtube.com/vi/zpbm-xRHB6k/hqdefault.jpg',video:'https://www.youtube.com/watch?v=zpbm-xRHB6k',target:'Deltoïde moyen',secondary:'—',reps:'12–20',rir:'1–2',rest:'1:15'},
  {name:'Reverse pec deck',equipment:'Machine',sets:'3 séries',img:'https://img.youtube.com/vi/Z84HkxGCBqQ/hqdefault.jpg',video:'https://www.youtube.com/watch?v=Z84HkxGCBqQ',target:'Deltoïdes post.',secondary:'Haut du dos',reps:'12–20',rir:'1–2',rest:'1:30'},
  {name:'Élévation frontale',equipment:'Poulie',sets:'2 séries',img:'https://img.youtube.com/vi/KjqHI59JizY/hqdefault.jpg',video:'https://www.youtube.com/watch?v=KjqHI59JizY',target:'Deltoïde ant.',secondary:'—',reps:'10–15',rir:'2',rest:'1:30'},
 ],
 Jambes:[
  {name:'Hack squat',equipment:'Machine',sets:'3 séries',img:'https://img.youtube.com/vi/scs5XcsZuc8/hqdefault.jpg',video:'https://www.youtube.com/watch?v=scs5XcsZuc8',target:'Quadriceps',secondary:'Fessiers',reps:'6–10',rir:'1–2',rest:'2:30–3:30'},
  {name:'Fentes bulgares',equipment:'Haltères',sets:'3 séries',img:'https://img.youtube.com/vi/SkNsa3eBwLA/hqdefault.jpg',video:'https://www.youtube.com/watch?v=SkNsa3eBwLA',target:'Quadriceps · Fessiers',secondary:'Ischios',reps:'8–12 / jambe',rir:'1–2',rest:'2:00–2:30'},
  {name:'Leg curl',equipment:'Machine',sets:'3 séries',img:'https://img.youtube.com/vi/IOufFLwNOTU/hqdefault.jpg',video:'https://www.youtube.com/watch?v=IOufFLwNOTU',target:'Ischio-jambiers',secondary:'—',reps:'8–15',rir:'1–2',rest:'1:30–2:00'},
  {name:'Leg extension',equipment:'Machine',sets:'3 séries',img:'https://img.youtube.com/vi/m0FOpMEgero/hqdefault.jpg',video:'https://www.youtube.com/watch?v=m0FOpMEgero',target:'Quadriceps',secondary:'—',reps:'10–15',rir:'1–2',rest:'1:30–2:00'},
  {name:'Mollets',equipment:'Machine',sets:'4 séries',img:'https://img.youtube.com/vi/GAQ-oohMhog/hqdefault.jpg',video:'https://www.youtube.com/watch?v=GAQ-oohMhog',target:'Mollets',secondary:'—',reps:'8–15',rir:'1–2',rest:'1:30'},
 ],
 Bras:[
  {name:'Curl incliné',equipment:'Haltères',sets:'3 séries',img:'https://img.youtube.com/vi/HhHHBj3qTJ4/hqdefault.jpg',video:'https://www.youtube.com/watch?v=HhHHBj3qTJ4',target:'Biceps',secondary:'Brachial',reps:'8–12',rir:'1–2',rest:'1:30–2:00'},
  {name:'Curl poulie',equipment:'Poulie',sets:'3 séries',img:'https://img.youtube.com/vi/aLRv0hRiXhc/hqdefault.jpg',video:'https://www.youtube.com/watch?v=aLRv0hRiXhc',target:'Biceps',secondary:'Brachial',reps:'10–15',rir:'1–2',rest:'1:30'},
  {name:'Curl assis',equipment:'Haltères',sets:'2 séries',img:'https://img.youtube.com/vi/HHq-wRiFDh0/hqdefault.jpg',video:'https://www.youtube.com/watch?v=HHq-wRiFDh0',target:'Biceps',secondary:'Avant-bras',reps:'10–15',rir:'1–2',rest:'1:30'},
  {name:'Extension triceps',equipment:'Poulie corde',sets:'3 séries',img:'/body-os/demo-rope-pushdown-approved.jpg',video:'https://www.youtube.com/watch?v=ADRve8qqC1U',target:'Triceps',secondary:'—',reps:'10–15',rir:'1–2',rest:'1:30'},
  {name:'Extension au-dessus tête',equipment:'Poulie',sets:'3 séries',img:'https://img.youtube.com/vi/w3iAESGWK6M/hqdefault.jpg',video:'https://www.youtube.com/watch?v=w3iAESGWK6M',target:'Triceps long chef',secondary:'—',reps:'10–15',rir:'1–2',rest:'1:30'},
 ],
 'L5-S1':[
  {name:'Bird dog',equipment:'Poids du corps',sets:'3 séries',img:'https://img.youtube.com/vi/dia-fydN7rE/hqdefault.jpg',video:'https://www.youtube.com/watch?v=dia-fydN7rE',target:'Gainage profond',secondary:'Fessiers',reps:'8–12 / côté',rir:'—',rest:'45–60 s'},
  {name:'Planche latérale',equipment:'Poids du corps',sets:'3 séries',img:'https://img.youtube.com/vi/iNbH7_edNI8/hqdefault.jpg',video:'https://www.youtube.com/watch?v=iNbH7_edNI8',target:'Obliques · Carré des lombes',secondary:'Épaules',reps:'20–30 s / côté',rir:'—',rest:'45 s'},
  {name:'Pont fessier',equipment:'Poids du corps',sets:'3 séries',img:'https://img.youtube.com/vi/n6JiF2jp2Ns/hqdefault.jpg',video:'https://www.youtube.com/watch?v=n6JiF2jp2Ns',target:'Fessiers · Chaîne postérieure',secondary:'Ischios',reps:'12–15',rir:'—',rest:'45 s'},
  {name:'Dead bug',equipment:'Poids du corps',sets:'3 séries',img:'https://img.youtube.com/vi/pxql0kTdmEs/hqdefault.jpg',video:'https://www.youtube.com/watch?v=pxql0kTdmEs',target:'Gainage profond',secondary:'Hanches',reps:'8–10 / côté',rir:'—',rest:'45 s'},
  {name:'Gainage ventral',equipment:'Poids du corps',sets:'3 séries',img:'https://img.youtube.com/vi/GQE8ASRA7t0/hqdefault.jpg',video:'https://www.youtube.com/watch?v=GQE8ASRA7t0',target:'Gainage global',secondary:'Épaules',reps:'20–40 s',rir:'—',rest:'45–60 s'},
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

const fmt1=(n:number)=>n.toLocaleString('fr-FR',{minimumFractionDigits:1,maximumFractionDigits:1})
const fmtDelta=(curr:number,prev:number|undefined,unit:string,decimals=1)=>{
 if(prev==null||prev===curr) return null
 const diff=Math.round((curr-prev)*Math.pow(10,decimals))/Math.pow(10,decimals)
 return `${diff>0?'+':''}${diff.toLocaleString('fr-FR',{minimumFractionDigits:decimals,maximumFractionDigits:decimals})} ${unit}`
}

function QuickLogSheet({latest,close,onSave}:{latest:DailyEntry|undefined,close:()=>void,onSave:(patch:Partial<DailyEntry>)=>void}){
 const [weight,setWeight]=useState(latest?.weight!=null?String(latest.weight):'')
 const [waist,setWaist]=useState(latest?.waist!=null?String(latest.waist):'')
 const [steps,setSteps]=useState(latest?.steps!=null?String(latest.steps):'')
 const [bodyFat,setBodyFat]=useState(latest?.bodyFat!=null?String(latest.bodyFat):'')
 const save=()=>{
  const patch:Partial<DailyEntry>={}
  if(weight.trim()) patch.weight=Math.round(parseFloat(weight.replace(',','.'))*10)/10
  if(waist.trim()) patch.waist=Math.round(parseFloat(waist.replace(',','.'))*10)/10
  if(steps.trim()) patch.steps=Math.round(parseFloat(steps.replace(',','.')))
  if(bodyFat.trim()) patch.bodyFat=Math.round(parseFloat(bodyFat.replace(',','.'))*10)/10
  onSave(patch); close()
 }
 return <div className="v9SheetBack" onClick={close}><section className="v103Sheet" onClick={e=>e.stopPropagation()}>
  <header><button onClick={close}>×</button><div><b>MESURE DU JOUR</b><small>Les données restent modifiables</small></div><span></span></header>
  <label>POIDS (KG)<input inputMode="decimal" value={weight} onChange={e=>setWeight(e.target.value)} placeholder="ex. 107,0"/></label>
  <label>TOUR DE TAILLE (CM)<input inputMode="decimal" value={waist} onChange={e=>setWaist(e.target.value)} placeholder="ex. 97"/></label>
  <label>MASSE GRASSE (%) — optionnel<input inputMode="decimal" value={bodyFat} onChange={e=>setBodyFat(e.target.value)} placeholder="ex. 18,5"/></label>
  <label>PAS<input inputMode="numeric" value={steps} onChange={e=>setSteps(e.target.value)} placeholder="ex. 8000"/></label>
  <button className="v9Primary" onClick={save}>ENREGISTRER</button>
 </section></div>
}

function ProgramSheet({schedule,close,onSave}:{schedule:DayPlan[],close:()=>void,onSave:(s:DayPlan[])=>void}){
 const [draft,setDraft]=useState<DayPlan[]>(schedule)
 const options:DayPlan[]=['Repos','Cardio',...sessionGroups]
 const setDay=(i:number,v:DayPlan)=>setDraft(d=>d.map((x,j)=>j===i?v:x))
 return <div className="v9SheetBack" onClick={close}><section className="v96NutritionSettings" onClick={e=>e.stopPropagation()}>
  <header><button onClick={close}>×</button><div><small>MON PROGRAMME</small><b>Séance par jour</b></div><span></span></header>
  <div className="v96SettingsBody">
   {WEEKDAYS.map((w,i)=><label key={w}><span>{w}</span><select value={draft[i]} onChange={e=>setDay(i,e.target.value as DayPlan)}>{options.map(o=><option key={o} value={o}>{o}</option>)}</select></label>)}
  </div>
  <footer><button onClick={close}>ANNULER</button><button className="primary" onClick={()=>{onSave(draft);close()}}>ENREGISTRER</button></footer>
 </section></div>
}

function Today({setScreen}:{setScreen:(s:Screen)=>void}){
 const [log,setLog]=useState<DailyEntry[]>(()=>readDailyLog())
 const [schedule,setSchedule]=useState<DayPlan[]>(()=>readSchedule())
 const [logOpen,setLogOpen]=useState(false)
 const [programOpen,setProgramOpen]=useState(false)
 const [cardioOpen,setCardioOpen]=useState(false)
 const nutrition=useMemo(()=>({
  meals:readJSON<Meal[]>(NUTRITION_MEALS_KEY,meals),
  settings:readJSON(NUTRITION_SETTINGS_KEY,DEFAULT_NUTRITION_SETTINGS)
 }),[])
 const consumedKcal=nutrition.meals.reduce((s,m)=>s+m.kcal,0)
 const consumedProtein=Math.round(nutrition.meals.reduce((s,m)=>s+m.protein,0))
 const latest=log.at(-1); const previous=log.at(-2)
 const weightDelta=latest?.weight!=null?fmtDelta(latest.weight,previous?.weight,'kg'):null
 const waistDelta=latest?.waist!=null?fmtDelta(latest.waist,previous?.waist,'cm'):null
 const plan=schedule[mondayIndex()]
 const planIsRappel=isRappelDay(schedule,mondayIndex())
 const saveLog=(patch:Partial<DailyEntry>)=>setLog(upsertDailyEntry(patch))
 const saveSchedule=(s:DayPlan[])=>{writeJSON(SCHEDULE_KEY,s);setSchedule(s)}
 return <main className="v104Today" aria-label="BODY OS Today">
   <header className="v104Top">
    <div className="v104Brand"><i></i><span><b>BODY OS</b><small>TON CORPS. TON SYSTÈME.</small></span></div>
    <button aria-label="Modifier mon programme" onClick={()=>setProgramOpen(true)}>⚙</button>
   </header>

   <section className="v104Hero">
    <div className="v104Mode"><b>{nutrition.settings.goal} <i></i></b><small>{log.length} mesure{log.length>1?'s':''} enregistrée{log.length>1?'s':''}</small></div>
    <div className="v104HeroArt"><img src="/body-os/v9-progress-athlete.png" alt="Athlète BODY OS"/></div>
    <button className="v104Metric v104Weight" onClick={()=>setLogOpen(true)}><small>POIDS</small><b>{latest?.weight!=null?fmt1(latest.weight):'—'} <em>kg</em></b>{weightDelta&&<strong>{weightDelta}</strong>}<span>{latest?.weight!=null?'toucher pour mettre à jour':'ajouter une mesure'}</span></button>
    <button className="v104Metric v104Waist" onClick={()=>setLogOpen(true)}><small>TOUR DE TAILLE</small><b>{latest?.waist!=null?latest.waist:'—'} <em>cm</em></b>{waistDelta&&<strong>{waistDelta}</strong>}<span>{latest?.waist!=null?'toucher pour mettre à jour':'ajouter une mesure'}</span></button>
    <button className="v104Trajectory" onClick={()=>setScreen('adaptive')}><span>TRAJECTOIRE</span><i></i><b>{previous&&latest&&latest.weight!=null&&previous.weight!=null?(latest.weight<=previous.weight?'OPTIMALE':'À SURVEILLER'):'EN ATTENTE'}</b><strong>›</strong></button>
   </section>

   <section className="v104TodayBlock">
    <h2>AUJOURD'HUI</h2>
    <div className="v104Kpis">
     <button onClick={()=>setScreen('nutrition')}><i className="fire">♨</i><small>CALORIES</small><b>{consumedKcal}</b><span>sur {nutrition.settings.calories} kcal</span></button>
     <button onClick={()=>setScreen('nutrition')}><i className="protein">◯</i><small>PROTÉINES</small><b>{consumedProtein}</b><span>g sur {nutrition.settings.protein} g</span></button>
     <button className="v104Train" onClick={()=>plan==='Cardio'?setCardioOpen(true):setScreen('workout')}><i className="train">✣</i><small>ENTRAÎNEMENT</small><b>{plan}</b>{planIsRappel&&<span className="v104Rappel">RAPPEL</span>}</button>
     <button onClick={()=>setLogOpen(true)}><i className="steps">♧</i><small>ACTIVITÉ</small><b>{latest?.steps!=null?latest.steps.toLocaleString('fr-FR'):'—'}</b><span>pas</span></button>
    </div>
   </section>

   <button className="v104AdaptiveCard" onClick={()=>setScreen('adaptive')}>
    <span className="brain">✦</span><span><b>Adaptive Sèche</b><small>Analyse de ta progression</small></span><strong>›</strong>
   </button>

   <BottomNav screen="today" setScreen={setScreen}/>
   {logOpen&&<QuickLogSheet latest={latest} close={()=>setLogOpen(false)} onSave={saveLog}/>}
   {programOpen&&<ProgramSheet schedule={schedule} close={()=>setProgramOpen(false)} onSave={saveSchedule}/>}
   {cardioOpen&&<InfoSheet title="CARDIO DU JOUR" close={()=>setCardioOpen(false)}>
    <div className="v103Why">
     <b>25 à 35 minutes en endurance légère (LISS)</b>
     <p>Marche rapide/inclinée, vélo ou rameur, à une intensité où tu peux encore parler sans être essoufflé (zone 2). Pas de fractionné/HIIT pendant la sèche : ça tape trop dans la récupération et entre en compétition avec la musculation.</p>
     <small>POURQUOI CE JOUR-LÀ</small>
     <strong>Récupération active</strong>
     <p>Le déficit calorique vient de l'alimentation, pas du cardio — ce n'est pas obligatoire. Fais-le si tu en as envie, si ton rythme de perte réel (Progress) est en dessous de l'objectif, ou simplement pour la santé cardiovasculaire.</p>
    </div>
   </InfoSheet>}
 </main>
}

function Workout({view,setView,setScreen,initialGroup}:{view:WorkoutView,setView:(v:WorkoutView)=>void,setScreen:(s:Screen)=>void,initialGroup:SessionGroup}){
 const doneDefault=Object.fromEntries(sessionGroups.map(g=>[g,Array(sessionData[g].length).fill(false)])) as Record<SessionGroup,boolean[]>
 const [group,setGroup]=useState<SessionGroup>(initialGroup); const [selected,setSelected]=useState(0)
 const [done,setDoneState]=useState<Record<SessionGroup,boolean[]>>(()=>({...doneDefault,...readJSON(WORKOUT_DONE_KEY,{})}))
 const setDone=(next:Record<SessionGroup,boolean[]>)=>{setDoneState(next);writeJSON(WORKOUT_DONE_KEY,next)}
 const [toast,setToast]=useState(''); const exercises=sessionData[group]
 if(view==='exercise') return <Exercise item={exercises[selected]} index={selected} total={exercises.length} group={group} setView={setView} onDone={()=>setDone({...done,[group]:done[group].map((x,i)=>i===selected?true:x)})}/>
 if(view==='rest') return <Rest setView={setView}/>
 if(view==='history') return <History setView={setView} item={exercises[selected]} group={group}/>
 const changeGroup=(g:SessionGroup)=>{setGroup(g);setSelected(0)}
 const finish=()=>{const count=done[group].filter(Boolean).length;setToast(count===exercises.length?'Séance enregistrée ✓':`${count}/${exercises.length} exercices validés — progression conservée`);setTimeout(()=>setToast(''),2300)}
 return <main className="v9Page"><header className="v9TitleBar"><button onClick={()=>setScreen('today')}>‹</button><div className="v982SessionHeading"><b>SÉANCE</b><small>{group==='Pectoraux'?'Pectoraux · Triceps':group}</small><em>{exercises.length} exercices · ~ 32 min</em></div><button className="v93Dots" onClick={()=>setToast('Options de séance')}>•••</button></header>
  <div className="v94MuscleTabs">{sessionGroups.map(g=><button key={g} className={g===group?'active':''} onClick={()=>changeGroup(g)}><span>{g==='Pectoraux'?'♜':g==='Dos'?'♙':g==='Épaules'?'✣':g==='Jambes'?'♧':g==='Bras'?'◉':'⚕'}</span><small>{g}</small></button>)}</div>
  <section className="v9ExerciseList">{exercises.map((e,i)=><button key={e.name} onClick={()=>{setSelected(i);setView('exercise')}} className={done[group][i]?'done':''}><div className="v93Thumb"><img src={e.img} onError={ev=>{(ev.currentTarget as HTMLImageElement).src='/body-os/demo-chest-press-approved.jpg'}}/><i>▶</i></div><span><small>{i+1}</small><b>{e.name}</b><em>{e.equipment} · {e.reps} · RIR {e.rir}</em></span><strong>{e.sets}</strong><i>{done[group][i]?'✓':'○'}</i></button>)}</section>
  <button className="v9Primary" onClick={finish}>TERMINER LA SÉANCE</button><div className="v9Remaining"><small>Temps estimé restant</small><i><span></span></i><b>32 min</b></div>{toast&&<Toast text={toast}/>} </main>
}

function Exercise({item,index,total,group,setView,onDone}:{item:ExerciseItem,index:number,total:number,group:SessionGroup,setView:(v:WorkoutView)=>void,onDone:()=>void}){
 const logKey=`${group}::${item.name}`
 const [reps,setRepsState]=useState(()=>readJSON<Record<string,{weight:number,reps:number}>>(WORKOUT_LOG_KEY,{})[logKey]?.reps ?? (index===1?8:10))
 const [weight,setWeightState]=useState(()=>readJSON<Record<string,{weight:number,reps:number}>>(WORKOUT_LOG_KEY,{})[logKey]?.weight ?? (index===3?0:100))
 const persistSet=(w:number,r:number)=>writeJSON(WORKOUT_LOG_KEY,{...readJSON(WORKOUT_LOG_KEY,{}),[logKey]:{weight:w,reps:r}})
 const setReps=(v:number)=>{setRepsState(v);persistSet(weight,v)}
 const setWeight=(v:number)=>{setWeightState(v);persistSet(v,reps)}
 const [toast,setToast]=useState('')
 const lastSet=readWorkoutHistory().filter(h=>h.group===group&&h.exercise===item.name).at(-1)
 const openVideo=()=>window.open(item.video,'_blank','noopener,noreferrer')
 const validate=()=>{
  onDone()
  logWorkoutSet({date:todayISO(),group,exercise:item.name,weight,reps})
  setToast('Série validée ✓');setTimeout(()=>{setToast('');setView('rest')},650)
 }
 return <main className="v9Page v9Exercise"><header className="v9TitleBar"><button onClick={()=>setView('session')}>‹</button><div><b>{group.toUpperCase()}</b><small>SÉANCE EN COURS</small></div><button className="v93Dots" onClick={()=>setToast('Options exercice')}>•••</button></header>
  <div className="v9ExerciseHead"><span><small>EXERCICE {index+1}/{total}</small><b>{item.name}</b><em>{item.equipment.toUpperCase()} · {group.toUpperCase()}</em></span></div>
  <section className="v9Media v93VideoMedia v98Media" onClick={openVideo} role="button" tabIndex={0} onKeyDown={e=>e.key==='Enter'&&openVideo()}><img src={item.img} onError={ev=>{(ev.currentTarget as HTMLImageElement).src='/body-os/demo-chest-press-approved.jpg'}}/><button onClick={e=>{e.stopPropagation();openVideo()}}>▶</button><div><span>CIBLE&nbsp; {item.target}</span><span>SECONDAIRE&nbsp; {item.secondary}</span></div></section>
  <section className="v93Prescription"><span><small>ZONE REPS</small><b>{item.reps}</b></span><span><small>RIR CIBLE</small><b>{item.rir}</b></span><span><small>REPOS</small><b>{item.rest}</b></span></section>
  <section className="v9SetPanel"><small>SÉRIE EN COURS</small><div className="v9Load"><button onClick={()=>setWeight(Math.max(0,weight-2.5))}>−</button><b>{weight}</b><em>KG</em><button onClick={()=>setWeight(weight+2.5)}>+</button></div><div className="v9RepLine"><span>6</span><span>7</span><strong>{reps}</strong><span>9</span><span>10</span></div><input type="range" min="5" max="15" value={reps} onChange={e=>setReps(+e.target.value)}/><div className="v9SetMeta"><span><small>RÉPÉTITIONS</small><b>{reps} REPS</b></span><span><small>RIR</small><b>2</b></span></div></section>
  <button className="v9LastSet" onClick={()=>setView('history')}><span><small>DERNIÈRE SÉRIE</small><b>{lastSet?`${lastSet.weight} kg × ${lastSet.reps} reps`:'Pas encore de série enregistrée'}</b></span>{lastSet&&<em>{lastSet.date}</em>}<strong>↗</strong></button>
  <div className="v9ExerciseActions"><button onClick={()=>setView('session')}>ANNULER</button><button className="pulse" onClick={validate}>✓</button><button onClick={()=>{onDone();setView('session')}}>TERMINER<br/>EXERCICE</button></div>
  {toast&&<Toast text={toast}/>}
 </main>
}

function Rest({setView}:{setView:(v:WorkoutView)=>void}){
 const [sec,setSec]=useState(45)
 return <main className="v9Page v9Rest"><header className="v9TitleBar"><button onClick={()=>setView('exercise')}>‹</button><div><b>REPOS</b><small>&nbsp;</small></div><button onClick={()=>setView('exercise')}>Passer</button></header><section className="v9Timer"><div><b>00:{String(sec).padStart(2,'0')}</b><small>Reprends pour ta prochaine<br/>série</small></div></section><div className="v93TimerControls"><button onClick={()=>setSec(Math.max(0,sec-15))}>−15 s</button><button onClick={()=>setSec(sec+15)}>+15 s</button></div><button className="v9NextSet" onClick={()=>setView('exercise')}><span><small>SÉRIE SUIVANTE</small><b>Reprendre l'exercice</b></span><em>RIR 1–2</em><strong>›</strong></button><button className="v9Outline" onClick={()=>setView('history')}>VOIR HISTORIQUE</button></main>
}

const fmtHistoryDate=(iso:string)=>new Date(iso+'T12:00:00').toLocaleDateString('fr-FR',{day:'2-digit',month:'2-digit',year:'2-digit'})

function History({setView,item,group}:{setView:(v:WorkoutView)=>void,item:ExerciseItem,group:SessionGroup}){
 const entries=readWorkoutHistory().filter(h=>h.group===group&&h.exercise===item.name).slice(-20)
 const chartData=entries.map((e,i)=>({i,v:e.weight}))
 const rows=entries.slice().reverse()
 return <main className="v9Page"><header className="v9TitleBar"><button onClick={()=>setView('exercise')}>‹</button><div><b>HISTORIQUE EXERCICE</b><small>{item.name} · {item.equipment}</small></div><span>•••</span></header>
  <div className="v9Segments"><b>CHARGE</b><span>VOLUME</span><span>1RM</span></div>
  {entries.length?<section className="v9HistoryChart"><ResponsiveContainer width="100%" height={210}><BarChart data={chartData}><Bar dataKey="v" fill="#bdeff2" radius={[4,4,0,0]} maxBarSize={32}/><YAxis hide domain={['dataMin - 5','dataMax + 5']}/><XAxis hide/></BarChart></ResponsiveContainer></section>
  :<section className="v9HistoryChart v9HistoryEmpty"><p>Aucune série enregistrée pour cet exercice.<br/>Valide une série pendant ta séance pour commencer l'historique.</p></section>}
  <div className="v9HistoryRows">{rows.map((r,i)=><div className={i===0?'active':''} key={r.date+i}><b>{fmtHistoryDate(r.date)}</b><span>{r.weight} kg × {r.reps}</span><em>RIR {item.rir}</em><strong>›</strong></div>)}</div>
 </main>
}

function Nutrition({setScreen}:{setScreen:(s:Screen)=>void}){
 const [open,setOpen]=useState<Meal|null>(null)
 const [tab,setTab]=useState<'day'|'week'|'month'>('day')
 const [mode,setMode]=useState<'programme'|'recipes'>('programme')
 const [recipeOpen,setRecipeOpen]=useState<Recipe|null>(null)
 const [toast,setToast]=useState('')
 const [settingsOpen,setSettingsOpen]=useState(false)
 const [visionOpen,setVisionOpen]=useState(false)
 const [mealState,setMealState]=useState<Meal[]>(()=>readJSON(NUTRITION_MEALS_KEY,meals))
 const [settings,setSettings]=useState(()=>readJSON(NUTRITION_SETTINGS_KEY,DEFAULT_NUTRITION_SETTINGS))
 const [draft,setDraft]=useState(settings)

 useEffect(()=>{writeJSON(NUTRITION_MEALS_KEY,mealState)},[mealState])
 useEffect(()=>{writeJSON(NUTRITION_SETTINGS_KEY,settings)},[settings])

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
   <button onClick={()=>setScreen('today')}>‹</button>
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
 const dailyLog=readDailyLog()
 const latestDay=dailyLog.at(-1); const previousDay=dailyLog.at(-2)
 const weightPoints=dailyLog.filter(e=>e.weight!=null).slice(-14).map(e=>({d:fmtHistoryDate(e.date).slice(0,5),w:e.weight!}))
 const weightWeekDelta=latestDay?.weight!=null?fmtDelta(latestDay.weight,previousDay?.weight,'kg'):null
 const waistDelta=latestDay?.waist!=null?fmtDelta(latestDay.waist,previousDay?.waist,'cm'):null
 const bodyFatDelta=latestDay?.bodyFat!=null?fmtDelta(latestDay.bodyFat,previousDay?.bodyFat,'%'):null
 const nutritionSettings=readJSON(NUTRITION_SETTINGS_KEY,DEFAULT_NUTRITION_SETTINGS)
 const weighedDays=dailyLog.filter(e=>e.weight!=null)
 const spanDays=weighedDays.length>=2?(new Date(weighedDays.at(-1)!.date).getTime()-new Date(weighedDays[0].date).getTime())/86400000:0
 const realWeeklyRate=spanDays>=3?(weighedDays.at(-1)!.weight!-weighedDays[0].weight!)/spanDays*7:null
 return <main className="v9Page v94Progress"><header className="v9TitleBar"><button onClick={()=>setScreen('today')}>‹</button><div><b>PROGRESS</b></div><button className="v93Dots">☷</button></header>
  <div className="v9Segments v94MainSegments"><button className={tab==='cut'?'active':''} onClick={()=>setTab('cut')}>SÈCHE</button><button className={tab==='physique'?'active':''} onClick={()=>setTab('physique')}>PHYSIQUE</button><button className={tab==='perf'?'active':''} onClick={()=>setTab('perf')}>PERF.</button></div>
  {tab==='cut'&&<><section className="v9WeightCard"><div><small>POIDS</small>{weightWeekDelta&&<strong>{weightWeekDelta}</strong>}<i>vs mesure précédente</i><b>{latestDay?.weight!=null?fmt1(latestDay.weight):'—'} <em>kg</em></b></div>{weightPoints.length?<ResponsiveContainer width="100%" height={180}><LineChart data={weightPoints}><Line dataKey="w" stroke="#75eef0" strokeWidth={3} dot={{r:4,fill:'#d8fcff'}}/><XAxis dataKey="d" tick={{fill:'#90a8b2',fontSize:9}} axisLine={false}/><YAxis domain={['dataMin - 1','dataMax + 1']} tick={{fill:'#90a8b2',fontSize:9}} axisLine={false}/></LineChart></ResponsiveContainer>:<p className="v94NoData">Pas encore de mesure. Ajoute ton poids depuis Today pour voir ta courbe.</p>}</section><div className="v9ProgressGrid"><article><small>TOUR DE TAILLE</small><b>{latestDay?.waist!=null?latestDay.waist:'—'} <em>cm</em></b>{waistDelta&&<strong>{waistDelta}</strong>}</article><article><small>MASSE GRASSE</small><b>{latestDay?.bodyFat!=null?latestDay.bodyFat:'—'} <em>%</em></b>{bodyFatDelta&&<strong>{bodyFatDelta}</strong>}</article><article onClick={()=>setPhotos(true)}><small>PHOTOS</small><b>Voir</b><div className="v94PhotoPair"><img src={evolutionPhotos[0]?.src||"/body-os/v9-progress-athlete.png"}/><img src={evolutionPhotos.at(-1)?.src||"/body-os/v9-progress-athlete.png"}/></div></article></div><section className="v94RateCard"><div><small>RYTHME DE PERTE RÉEL</small><b>{realWeeklyRate!=null?`${realWeeklyRate>0?'+':''}${realWeeklyRate.toFixed(2).replace('.',',')} kg/sem`:'—'}</b></div><span>Objectif {String(nutritionSettings.weeklyRate).replace('.',',')} kg/sem · {weighedDays.length} mesure{weighedDays.length>1?'s':''}</span></section></>}
  {tab==='physique'&&<><section className="v94Photos v982ProgressPhotos"><h3>PHOTOS D'ÉVOLUTION <button onClick={()=>setPhotos(true)}>＋ AJOUTER</button></h3><div>{evolutionPhotos.slice(-4).map((p,i)=><button key={p.id} onClick={()=>setPhotos(true)}><img src={p.src}/><small>{i===evolutionPhotos.slice(-4).length-1?'Aujourd’hui':p.label}</small></button>)}</div></section><section className="v9Impact"><span><small>IMPACT CORPS</small><b>{m.score}%</b><em>{muscle} suivi</em><i><strong style={{width:m.score+'%'}}></strong></i></span><div className={'v94AthleteMini '+m.overlay}><img src="/body-os/v9-progress-athlete.png"/><i></i><i></i></div></section><h3 className="v94Sub">ÉVOLUTION PAR MUSCLE</h3><div className="v94MuscleChips">{muscleGroups.map(g=><button className={muscle===g?'active':''} onClick={()=>setMuscle(g)} key={g}>{g}</button>)}</div><section className="v94MuscleDetail"><div><small>{muscle.toUpperCase()}</small><b>{m.measure} {m.unit}</b><strong>{m.delta}</strong><em>vs semaine dernière</em></div><ResponsiveContainer width="100%" height={115}><LineChart data={muscleTrend}><Line dataKey="v" stroke="#78eff0" strokeWidth={2} dot={{r:3,fill:'#baffff'}}/><XAxis dataKey="d" tick={{fill:'#8ba6ad',fontSize:7}} axisLine={false}/><YAxis hide domain={[-1,1]}/></LineChart></ResponsiveContainer></section></>}
  {tab==='perf'&&<><section className="v94PerfHero"><small>PERFORMANCE EN SÈCHE</small><b>STABLE</b><strong>+2,8 %</strong><p>La force est maintenue malgré le déficit : bon signal pour la préservation musculaire.</p></section><div className="v94MuscleChips">{muscleGroups.map(g=><button className={muscle===g?'active':''} onClick={()=>setMuscle(g)} key={g}>{g}</button>)}</div><section className="v9HistoryChart"><ResponsiveContainer width="100%" height={210}><BarChart data={strengthData}><Bar dataKey="v" fill="#8feef0" radius={[4,4,0,0]}/><YAxis hide domain={[80,120]}/><XAxis hide/></BarChart></ResponsiveContainer></section><section className="v94PerfStats"><span><small>VOLUME</small><b>{muscle==='Jambes'?'12':'10'} séries</b></span><span><small>RIR MOYEN</small><b>1,7</b></span><span><small>ADHÉRENCE</small><b>94%</b></span></section></>}
  {photos&&<EvolutionPhotosSheet photos={evolutionPhotos} close={()=>setPhotos(false)} onChange={setEvolutionPhotos}/>}
 </main>
}


function AdaptiveIntelligence({setScreen}:{setScreen:(s:Screen)=>void}){
 const [checkinOpen,setCheckinOpen]=useState(false)
 const [decisionOpen,setDecisionOpen]=useState(false)
 const latestDaily=readDailyLog().at(-1)
 const [checkin,setCheckin]=useState({weight:latestDaily?.weight!=null?String(latestDaily.weight):'',waist:latestDaily?.waist!=null?String(latestDaily.waist):'',sleep:7,energy:4,hunger:3,recovery:4})
 const saveCheckin=()=>{
  const patch:Partial<DailyEntry>={}
  if(checkin.weight.trim()) patch.weight=Math.round(parseFloat(checkin.weight.replace(',','.'))*10)/10
  if(checkin.waist.trim()) patch.waist=Math.round(parseFloat(checkin.waist.replace(',','.'))*10)/10
  upsertDailyEntry(patch); setCheckinOpen(false)
 }
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
   <button className="v9Primary" onClick={saveCheckin}>ENREGISTRER LE CHECK-IN</button>
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

function Plan({setScreen}:{setScreen:(s:Screen)=>void}){
 const [selected,setSelected]=useState(mondayIndex())
 const schedule=readSchedule()
 const monday=useMemo(()=>{const d=new Date();d.setDate(d.getDate()-mondayIndex());return d},[])
 const fmtDate=(d:Date)=>`${String(d.getDate()).padStart(2,'0')}/${String(d.getMonth()+1).padStart(2,'0')}`
 const sunday=useMemo(()=>{const d=new Date(monday);d.setDate(d.getDate()+6);return d},[monday])
 const days=WEEKDAYS.map((w,i)=>{
  const d=new Date(monday); d.setDate(monday.getDate()+i)
  const plan=schedule[i]
  const kind=plan==='Repos'?'Repos':plan==='Cardio'?'Cardio':plan==='L5-S1'?'Renforcement':isRappelDay(schedule,i)?'Rappel':'Musculation'
  return {abbr:w.slice(0,3).toUpperCase(),date:d.getDate(),plan,kind}
 })
 return <main className="v9Page"><header className="v9TitleBar"><button onClick={()=>setScreen('coach')}>‹</button><div><b>PLAN — SEMAINE</b><small>{fmtDate(monday)} – {fmtDate(sunday)}</small></div><span>◫</span></header><section className="v9Week">{days.map((d,i)=><article onClick={()=>setSelected(i)} className={i===selected?'active':''} key={d.abbr}><b>{d.abbr}</b><strong>{d.date}</strong><span><i>{d.plan}</i></span><em><i>{d.kind}</i></em><small>◌ 10 000 pas</small></article>)}</section><section className="v9WeekGoal"><div><small>OBJECTIF DE LA SEMAINE</small><p>Continuer la sèche en préservant le muscle.<br/>Déficit modéré.<br/>Protéines hautes.<br/>Performances stables.</p></div><aside><b>Tes progrès sont excellents.</b><span>Aucun ajustement calorique nécessaire cette semaine.</span><strong>92%</strong></aside></section></main>
}

export default function V9App(){
 const [screen,setScreen]=useState<Screen>('today'); const [workoutView,setWorkoutView]=useState<WorkoutView>('session')
 const todayPlan=readSchedule()[mondayIndex()]
 const initialGroup=(sessionGroups as string[]).includes(todayPlan)?todayPlan as SessionGroup:'Pectoraux'
 const page=useMemo(()=>screen==='today'?<Today setScreen={setScreen}/>:screen==='workout'?<Workout view={workoutView} setView={setWorkoutView} setScreen={setScreen} initialGroup={initialGroup}/>:screen==='nutrition'?<Nutrition setScreen={setScreen}/>:screen==='progress'?<Progress setScreen={setScreen}/>:screen==='coach'?<Coach setScreen={setScreen}/>:screen==='adaptive'?<AdaptiveIntelligence setScreen={setScreen}/>:<Plan setScreen={setScreen}/>,[screen,workoutView])
 const showNav=screen==='nutrition'||screen==='progress'
 return <div className="v9Shell"><div className="v9Phone">{screen!=='today'&&<StatusBar/>}{page}{showNav&&<BottomNav screen={screen} setScreen={s=>{setScreen(s);if(s==='workout')setWorkoutView('session')}}/>}</div></div>
}
