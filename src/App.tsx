import { useEffect, useMemo, useRef, useState } from 'react'
import { Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts'
import { sessions, muscleLabels, type Exercise } from './data/program'
import { store, type SetLog, type CoachCheckin } from './lib/storage'
const todayAnatomy = '/body-os/today-anatomy-premium.png'
const l5Spine = '/body-os/l5-spine.svg'
const workoutInclineDemo = '/body-os/workout-incline-demo.jpg'
const appRead=<T,>(key:string,fallback:T):T=>{try{const raw=localStorage.getItem(key);return raw?JSON.parse(raw) as T:fallback}catch{return fallback}}
const appWrite=(key:string,value:unknown)=>localStorage.setItem(key,JSON.stringify(value))

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
  status?:'consumed'|'partial'|'skipped'|'manual'
  source?:'programme'|'manual'
  foods?:{name:string;plannedQty:string;actualQty:string}[]
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


type WeeklyMealTemplate={
  title:string; slot:'breakfast'|'lunch'|'snack'|'dinner'; kcal:number;p:number;c:number;f:number;
  foods:{name:string;qty:string}[]
}
type WeeklyMenuProfile={
  session:string; mode:string; kcal:number;protein:number;carbs:number;fat:number; why:string[];
  pools:Record<'breakfast'|'lunch'|'snack'|'dinner',WeeklyMealTemplate[]>
}

const weeklyMenuProfiles:Record<string,WeeklyMenuProfile>={
  PUSH:{
    session:'PUSH',mode:'TRAINING DAY',kcal:2800,protein:190,carbs:319,fat:85,
    why:["Glucides répartis autour du PUSH.","Protéines élevées pour préserver la masse musculaire.","Rotation hebdomadaire anti-répétition."],
    pools:{
      breakfast:[
        {slot:'breakfast',title:'PETIT-DÉJEUNER',kcal:650,p:45,c:75,f:18,foods:[{name:"Flocons d’avoine",qty:"80 g"},{name:"Skyr 0%",qty:"250 g"},{name:"Banane",qty:"120 g"},{name:"Œufs",qty:"2 pièces"},{name:"Amandes",qty:"15 g"}]},
        {slot:'breakfast',title:'PETIT-DÉJEUNER',kcal:640,p:44,c:72,f:18,foods:[{name:"Pain complet",qty:"110 g"},{name:"Fromage blanc 0%",qty:"300 g"},{name:"Kiwi",qty:"150 g"},{name:"Œufs",qty:"2 pièces"},{name:"Beurre de cacahuète",qty:"12 g"}]},
        {slot:'breakfast',title:'PETIT-DÉJEUNER',kcal:660,p:46,c:78,f:17,foods:[{name:"Muesli sans sucre",qty:"85 g"},{name:"Skyr 0%",qty:"250 g"},{name:"Myrtilles",qty:"120 g"},{name:"Œufs",qty:"2 pièces"}]},
      ],
      lunch:[
        {slot:'lunch',title:'DÉJEUNER',kcal:800,p:55,c:95,f:22,foods:[{name:"Poulet",qty:"180 g"},{name:"Riz basmati (cru)",qty:"90 g"},{name:"Légumes",qty:"200 g"},{name:"Huile d’olive",qty:"10 g"}]},
        {slot:'lunch',title:'DÉJEUNER',kcal:810,p:56,c:94,f:23,foods:[{name:"Dinde",qty:"190 g"},{name:"Semoule (crue)",qty:"95 g"},{name:"Courgettes",qty:"220 g"},{name:"Huile d’olive",qty:"10 g"}]},
        {slot:'lunch',title:'DÉJEUNER',kcal:790,p:54,c:92,f:21,foods:[{name:"Steak 5%",qty:"170 g"},{name:"Pommes de terre",qty:"360 g"},{name:"Haricots verts",qty:"220 g"},{name:"Huile d’olive",qty:"8 g"}]},
      ],
      snack:[
        {slot:'snack',title:'PRE-WORKOUT',kcal:450,p:35,c:50,f:12,foods:[{name:"Skyr 0%",qty:"200 g"},{name:"Myrtilles",qty:"100 g"},{name:"Beurre de cacahuète",qty:"15 g"},{name:"Miel",qty:"10 g"}]},
        {slot:'snack',title:'PRE-WORKOUT',kcal:460,p:34,c:56,f:10,foods:[{name:"Fromage blanc 0%",qty:"250 g"},{name:"Banane",qty:"120 g"},{name:"Galettes de riz",qty:"4 pièces"},{name:"Miel",qty:"12 g"}]},
        {slot:'snack',title:'PRE-WORKOUT',kcal:440,p:35,c:48,f:11,foods:[{name:"Skyr 0%",qty:"220 g"},{name:"Pomme",qty:"180 g"},{name:"Pain complet",qty:"60 g"},{name:"Purée d’amandes",qty:"12 g"}]},
      ],
      dinner:[
        {slot:'dinner',title:'DÎNER',kcal:900,p:55,c:99,f:33,foods:[{name:"Saumon",qty:"180 g"},{name:"Patate douce",qty:"250 g"},{name:"Brocolis",qty:"200 g"},{name:"Huile d’olive",qty:"10 g"},{name:"Avocat",qty:"70 g"}]},
        {slot:'dinner',title:'DÎNER',kcal:890,p:56,c:96,f:31,foods:[{name:"Cabillaud",qty:"220 g"},{name:"Riz basmati (cru)",qty:"95 g"},{name:"Brocolis",qty:"200 g"},{name:"Avocat",qty:"80 g"},{name:"Huile d’olive",qty:"10 g"}]},
        {slot:'dinner',title:'DÎNER',kcal:910,p:55,c:101,f:32,foods:[{name:"Bœuf 5%",qty:"180 g"},{name:"Pâtes complètes (crues)",qty:"100 g"},{name:"Épinards",qty:"200 g"},{name:"Huile d’olive",qty:"10 g"}]},
      ]
    }
  }
}
weeklyMenuProfiles.PULL={...weeklyMenuProfiles.PUSH,session:'PULL',why:["Glucides réguliers pour soutenir le volume de tirage.","Protéines élevées pour récupération dos/biceps.","Menu renouvelé chaque semaine."]}
weeklyMenuProfiles.LEGS={...weeklyMenuProfiles.PUSH,session:'LEGS',why:["Plus de glucides autour de la séance jambes.","Répartition énergétique pensée pour l’effort le plus coûteux.","Menu renouvelé chaque semaine."]}
weeklyMenuProfiles.UPPER={...weeklyMenuProfiles.PUSH,session:'UPPER',why:["Apport équilibré pour séance haut du corps.","Protéines stables sur la journée.","Menu renouvelé chaque semaine."]}
weeklyMenuProfiles.LOWER={...weeklyMenuProfiles.PUSH,session:'LOWER + BRAS',why:["Glucides ciblés autour du lower.","Protéines stables pour jambes et bras.","Menu renouvelé chaque semaine."]}
weeklyMenuProfiles.RECOVERY={...weeklyMenuProfiles.PUSH,session:'REPOS',mode:'RECOVERY DAY',why:["Énergie contrôlée le jour de repos.","Protéines maintenues pour la récupération.","Menu renouvelé chaque semaine."]}

function seededPick<T>(arr:T[],seed:number,offset:number){
  return arr[Math.abs(seed+offset)%arr.length]
}
function buildWeeklyProtocol(sessionKey:string,weekSeed:number){
  const profile=weeklyMenuProfiles[sessionKey]||weeklyMenuProfiles.PUSH
  const times=['07:00','12:30','16:30','20:00']
  const slots:['breakfast','lunch','snack','dinner']=['breakfast','lunch','snack','dinner']
  const sessionOffsets:Record<string,number>={PUSH:0,PULL:1,LEGS:2,UPPER:2,LOWER:1,RECOVERY:0}
  const familyOffset=sessionOffsets[sessionKey]??0
  const meals=slots.map((slot,i)=>({time:times[i],...seededPick(profile.pools[slot],weekSeed+familyOffset,i+familyOffset)}))
  return {day:'WEEKLY',mode:profile.mode,session:profile.session,kcal:profile.kcal,protein:profile.protein,carbs:profile.carbs,fat:profile.fat,score:86,meals,why:profile.why}
}


type RecipeCategory='PETIT-DÉJEUNER'|'PLAT'|'DESSERT'|'RAPIDE'|'HIGH PROTEIN'
type RecipeIngredient={name:string;qty:number;unit:string;category:'PROTÉINES'|'FÉCULENTS'|'FRUITS & LÉGUMES'|'PRODUITS LAITIERS'|'ÉPICERIE'}
type MacroVector={kcal:number;protein:number;carbs:number;fat:number}
type Recipe={id:string;title:string;category:RecipeCategory;prep:number;kcal:number;protein:number;carbs:number;fat:number;emoji:string;ingredients:RecipeIngredient[];steps:string[];tags?:string[]}

const recipes:Recipe[]=[
  {
    id:'protein-pancakes',title:'Pancakes protéinés',category:'PETIT-DÉJEUNER',prep:12,kcal:520,protein:42,carbs:61,fat:12,emoji:'🥞',
    ingredients:[
      {name:'Flocons d’avoine',qty:70,unit:'g',category:'FÉCULENTS'},
      {name:'Skyr 0%',qty:180,unit:'g',category:'PRODUITS LAITIERS'},
      {name:'Œufs',qty:2,unit:'pièces',category:'PROTÉINES'},
      {name:'Banane',qty:100,unit:'g',category:'FRUITS & LÉGUMES'},
      {name:'Levure chimique',qty:4,unit:'g',category:'ÉPICERIE'}
    ],
    steps:['Mixer les flocons, le skyr, les œufs et la banane.','Ajouter la levure puis mélanger.','Cuire en petites portions 2 à 3 minutes par face.']
  },
  {
    id:'chicken-bowl',title:'Chicken bowl',category:'PLAT',prep:20,kcal:690,protein:55,carbs:78,fat:18,emoji:'🥗',
    ingredients:[
      {name:'Blanc de poulet',qty:180,unit:'g',category:'PROTÉINES'},
      {name:'Riz basmati cru',qty:90,unit:'g',category:'FÉCULENTS'},
      {name:'Poivrons',qty:150,unit:'g',category:'FRUITS & LÉGUMES'},
      {name:'Courgette',qty:150,unit:'g',category:'FRUITS & LÉGUMES'},
      {name:'Huile d’olive',qty:10,unit:'g',category:'ÉPICERIE'}
    ],
    steps:['Cuire le riz.','Saisir le poulet assaisonné.','Ajouter les légumes puis assembler le bowl avec l’huile d’olive.']
  },
  {
    id:'skyr-cheesecake',title:'Cheesecake skyr',category:'DESSERT',prep:8,kcal:280,protein:26,carbs:31,fat:7,emoji:'🍰',
    ingredients:[
      {name:'Skyr 0%',qty:250,unit:'g',category:'PRODUITS LAITIERS'},
      {name:'Fromage frais léger',qty:60,unit:'g',category:'PRODUITS LAITIERS'},
      {name:'Fruits rouges',qty:100,unit:'g',category:'FRUITS & LÉGUMES'},
      {name:'Biscuits avoine',qty:25,unit:'g',category:'FÉCULENTS'}
    ],
    steps:['Mélanger le skyr et le fromage frais.','Émietter les biscuits au fond du récipient.','Ajouter la crème puis les fruits rouges et réserver au frais.']
  },
  {
    id:'turkey-wrap',title:'Wrap dinde express',category:'RAPIDE',prep:8,kcal:510,protein:46,carbs:49,fat:15,emoji:'🌯',
    ingredients:[
      {name:'Escalope de dinde',qty:150,unit:'g',category:'PROTÉINES'},
      {name:'Wrap complet',qty:1,unit:'pièce',category:'FÉCULENTS'},
      {name:'Salade',qty:80,unit:'g',category:'FRUITS & LÉGUMES'},
      {name:'Tomate',qty:100,unit:'g',category:'FRUITS & LÉGUMES'},
      {name:'Skyr 0%',qty:50,unit:'g',category:'PRODUITS LAITIERS'}
    ],
    steps:['Cuire la dinde puis la trancher.','Mélanger le skyr avec les épices pour la sauce.','Garnir le wrap avec dinde, salade, tomate et sauce.']
  },
  {
    id:'beef-pasta',title:'Pasta bœuf high protein',category:'HIGH PROTEIN',prep:22,kcal:760,protein:60,carbs:86,fat:20,emoji:'🍝',
    ingredients:[
      {name:'Bœuf 5%',qty:180,unit:'g',category:'PROTÉINES'},
      {name:'Pâtes complètes crues',qty:100,unit:'g',category:'FÉCULENTS'},
      {name:'Coulis de tomate',qty:180,unit:'g',category:'FRUITS & LÉGUMES'},
      {name:'Épinards',qty:150,unit:'g',category:'FRUITS & LÉGUMES'},
      {name:'Parmesan',qty:15,unit:'g',category:'PRODUITS LAITIERS'}
    ],
    steps:['Cuire les pâtes.','Cuire le bœuf avec le coulis de tomate.','Ajouter les épinards, mélanger aux pâtes puis terminer avec le parmesan.']
  }
,
{"id": "meal-01", "title": "Bowl poulet & riz basmati", "category": "HIGH PROTEIN", "prep": 10, "kcal": 560, "protein": 42, "carbs": 55, "fat": 12, "emoji": "🍲", "ingredients": [{"name": "Poulet", "qty": 180, "unit": "g", "category": "PROTÉINES"}, {"name": "Riz basmati cru", "qty": 90, "unit": "g", "category": "FÉCULENTS"}, {"name": "Brocoli", "qty": 200, "unit": "g", "category": "FRUITS & LÉGUMES"}, {"name": "Huile d’olive", "qty": 8, "unit": "g", "category": "ÉPICERIE"}], "steps": ["Cuire la source de féculents.", "Cuire la protéine avec les épices.", "Ajouter les légumes puis assembler."], "tags": ["meal-prep", "training-day"]},
{"id": "meal-02", "title": "Poêlée dinde & semoulee", "category": "PLAT", "prep": 15, "kcal": 595, "protein": 45, "carbs": 60, "fat": 15, "emoji": "🍲", "ingredients": [{"name": "Dinde", "qty": 180, "unit": "g", "category": "PROTÉINES"}, {"name": "Semoule crue", "qty": 95, "unit": "g", "category": "FÉCULENTS"}, {"name": "Haricots verts", "qty": 250, "unit": "g", "category": "FRUITS & LÉGUMES"}, {"name": "Huile d’olive", "qty": 10, "unit": "g", "category": "ÉPICERIE"}], "steps": ["Cuire la source de féculents.", "Cuire la protéine avec les épices.", "Ajouter les légumes puis assembler."], "tags": ["meal-prep", "training-day"]},
{"id": "meal-03", "title": "Assiette bœuf 5% & quinoa", "category": "PLAT", "prep": 20, "kcal": 630, "protein": 48, "carbs": 65, "fat": 18, "emoji": "🍲", "ingredients": [{"name": "Bœuf 5%", "qty": 170, "unit": "g", "category": "PROTÉINES"}, {"name": "Quinoa cru", "qty": 90, "unit": "g", "category": "FÉCULENTS"}, {"name": "Brocoli", "qty": 300, "unit": "g", "category": "FRUITS & LÉGUMES"}, {"name": "Huile d’olive", "qty": 12, "unit": "g", "category": "ÉPICERIE"}], "steps": ["Cuire la source de féculents.", "Cuire la protéine avec les épices.", "Ajouter les légumes puis assembler."], "tags": ["meal-prep", "training-day"]},
{"id": "meal-04", "title": "Meal prep saumon & patate douce", "category": "PLAT", "prep": 25, "kcal": 665, "protein": 51, "carbs": 70, "fat": 21, "emoji": "🍲", "ingredients": [{"name": "Saumon", "qty": 160, "unit": "g", "category": "PROTÉINES"}, {"name": "Patate douce", "qty": 320, "unit": "g", "category": "FÉCULENTS"}, {"name": "Haricots verts", "qty": 200, "unit": "g", "category": "FRUITS & LÉGUMES"}, {"name": "Huile d’olive", "qty": 8, "unit": "g", "category": "ÉPICERIE"}], "steps": ["Cuire la source de féculents.", "Cuire la protéine avec les épices.", "Ajouter les légumes puis assembler."], "tags": ["meal-prep", "training-day"]},
{"id": "meal-05", "title": "One-pan cabillaud & pommes de terre", "category": "RAPIDE", "prep": 30, "kcal": 700, "protein": 54, "carbs": 75, "fat": 24, "emoji": "🍲", "ingredients": [{"name": "Cabillaud", "qty": 200, "unit": "g", "category": "PROTÉINES"}, {"name": "Pommes de terre", "qty": 350, "unit": "g", "category": "FÉCULENTS"}, {"name": "Brocoli", "qty": 250, "unit": "g", "category": "FRUITS & LÉGUMES"}, {"name": "Huile d’olive", "qty": 10, "unit": "g", "category": "ÉPICERIE"}], "steps": ["Cuire la source de féculents.", "Cuire la protéine avec les épices.", "Ajouter les légumes puis assembler."], "tags": ["meal-prep", "training-day"]},
{"id": "meal-06", "title": "Salade chaude thon au naturel & pâtes complèteses", "category": "PLAT", "prep": 10, "kcal": 735, "protein": 57, "carbs": 80, "fat": 12, "emoji": "🍲", "ingredients": [{"name": "Thon au naturel", "qty": 160, "unit": "g", "category": "PROTÉINES"}, {"name": "Pâtes complètes crues", "qty": 100, "unit": "g", "category": "FÉCULENTS"}, {"name": "Haricots verts", "qty": 300, "unit": "g", "category": "FRUITS & LÉGUMES"}, {"name": "Huile d’olive", "qty": 12, "unit": "g", "category": "ÉPICERIE"}], "steps": ["Cuire la source de féculents.", "Cuire la protéine avec les épices.", "Ajouter les légumes puis assembler."], "tags": ["meal-prep", "training-day"]},
{"id": "meal-07", "title": "Bowl poulet & riz basmati", "category": "PLAT", "prep": 15, "kcal": 770, "protein": 42, "carbs": 85, "fat": 15, "emoji": "🍲", "ingredients": [{"name": "Poulet", "qty": 180, "unit": "g", "category": "PROTÉINES"}, {"name": "Riz basmati cru", "qty": 90, "unit": "g", "category": "FÉCULENTS"}, {"name": "Brocoli", "qty": 200, "unit": "g", "category": "FRUITS & LÉGUMES"}, {"name": "Huile d’olive", "qty": 8, "unit": "g", "category": "ÉPICERIE"}], "steps": ["Cuire la source de féculents.", "Cuire la protéine avec les épices.", "Ajouter les légumes puis assembler."], "tags": ["meal-prep", "training-day"]},
{"id": "meal-08", "title": "Poêlée dinde & semoulee", "category": "PLAT", "prep": 20, "kcal": 560, "protein": 45, "carbs": 90, "fat": 18, "emoji": "🍲", "ingredients": [{"name": "Dinde", "qty": 180, "unit": "g", "category": "PROTÉINES"}, {"name": "Semoule crue", "qty": 95, "unit": "g", "category": "FÉCULENTS"}, {"name": "Haricots verts", "qty": 250, "unit": "g", "category": "FRUITS & LÉGUMES"}, {"name": "Huile d’olive", "qty": 10, "unit": "g", "category": "ÉPICERIE"}], "steps": ["Cuire la source de féculents.", "Cuire la protéine avec les épices.", "Ajouter les légumes puis assembler."], "tags": ["meal-prep", "training-day"]},
{"id": "meal-09", "title": "Assiette bœuf 5% & quinoa", "category": "HIGH PROTEIN", "prep": 25, "kcal": 595, "protein": 48, "carbs": 55, "fat": 21, "emoji": "🍲", "ingredients": [{"name": "Bœuf 5%", "qty": 170, "unit": "g", "category": "PROTÉINES"}, {"name": "Quinoa cru", "qty": 90, "unit": "g", "category": "FÉCULENTS"}, {"name": "Brocoli", "qty": 300, "unit": "g", "category": "FRUITS & LÉGUMES"}, {"name": "Huile d’olive", "qty": 12, "unit": "g", "category": "ÉPICERIE"}], "steps": ["Cuire la source de féculents.", "Cuire la protéine avec les épices.", "Ajouter les légumes puis assembler."], "tags": ["meal-prep", "training-day"]},
{"id": "meal-10", "title": "Meal prep saumon & patate douce", "category": "PLAT", "prep": 30, "kcal": 630, "protein": 51, "carbs": 60, "fat": 24, "emoji": "🍲", "ingredients": [{"name": "Saumon", "qty": 160, "unit": "g", "category": "PROTÉINES"}, {"name": "Patate douce", "qty": 320, "unit": "g", "category": "FÉCULENTS"}, {"name": "Haricots verts", "qty": 200, "unit": "g", "category": "FRUITS & LÉGUMES"}, {"name": "Huile d’olive", "qty": 8, "unit": "g", "category": "ÉPICERIE"}], "steps": ["Cuire la source de féculents.", "Cuire la protéine avec les épices.", "Ajouter les légumes puis assembler."], "tags": ["meal-prep", "training-day"]},
{"id": "meal-11", "title": "One-pan cabillaud & pommes de terre", "category": "RAPIDE", "prep": 10, "kcal": 665, "protein": 54, "carbs": 65, "fat": 12, "emoji": "🍲", "ingredients": [{"name": "Cabillaud", "qty": 200, "unit": "g", "category": "PROTÉINES"}, {"name": "Pommes de terre", "qty": 350, "unit": "g", "category": "FÉCULENTS"}, {"name": "Brocoli", "qty": 250, "unit": "g", "category": "FRUITS & LÉGUMES"}, {"name": "Huile d’olive", "qty": 10, "unit": "g", "category": "ÉPICERIE"}], "steps": ["Cuire la source de féculents.", "Cuire la protéine avec les épices.", "Ajouter les légumes puis assembler."], "tags": ["meal-prep", "training-day"]},
{"id": "meal-12", "title": "Salade chaude thon au naturel & pâtes complèteses", "category": "PLAT", "prep": 15, "kcal": 700, "protein": 57, "carbs": 70, "fat": 15, "emoji": "🍲", "ingredients": [{"name": "Thon au naturel", "qty": 160, "unit": "g", "category": "PROTÉINES"}, {"name": "Pâtes complètes crues", "qty": 100, "unit": "g", "category": "FÉCULENTS"}, {"name": "Haricots verts", "qty": 300, "unit": "g", "category": "FRUITS & LÉGUMES"}, {"name": "Huile d’olive", "qty": 12, "unit": "g", "category": "ÉPICERIE"}], "steps": ["Cuire la source de féculents.", "Cuire la protéine avec les épices.", "Ajouter les légumes puis assembler."], "tags": ["meal-prep", "training-day"]},
{"id": "meal-13", "title": "Bowl poulet & riz basmati", "category": "HIGH PROTEIN", "prep": 20, "kcal": 735, "protein": 42, "carbs": 75, "fat": 18, "emoji": "🍲", "ingredients": [{"name": "Poulet", "qty": 180, "unit": "g", "category": "PROTÉINES"}, {"name": "Riz basmati cru", "qty": 90, "unit": "g", "category": "FÉCULENTS"}, {"name": "Brocoli", "qty": 200, "unit": "g", "category": "FRUITS & LÉGUMES"}, {"name": "Huile d’olive", "qty": 8, "unit": "g", "category": "ÉPICERIE"}], "steps": ["Cuire la source de féculents.", "Cuire la protéine avec les épices.", "Ajouter les légumes puis assembler."], "tags": ["meal-prep", "training-day"]},
{"id": "meal-14", "title": "Poêlée dinde & semoulee", "category": "PLAT", "prep": 25, "kcal": 770, "protein": 45, "carbs": 80, "fat": 21, "emoji": "🍲", "ingredients": [{"name": "Dinde", "qty": 180, "unit": "g", "category": "PROTÉINES"}, {"name": "Semoule crue", "qty": 95, "unit": "g", "category": "FÉCULENTS"}, {"name": "Haricots verts", "qty": 250, "unit": "g", "category": "FRUITS & LÉGUMES"}, {"name": "Huile d’olive", "qty": 10, "unit": "g", "category": "ÉPICERIE"}], "steps": ["Cuire la source de féculents.", "Cuire la protéine avec les épices.", "Ajouter les légumes puis assembler."], "tags": ["meal-prep", "training-day"]},
{"id": "meal-15", "title": "Assiette bœuf 5% & quinoa", "category": "PLAT", "prep": 30, "kcal": 560, "protein": 48, "carbs": 85, "fat": 24, "emoji": "🍲", "ingredients": [{"name": "Bœuf 5%", "qty": 170, "unit": "g", "category": "PROTÉINES"}, {"name": "Quinoa cru", "qty": 90, "unit": "g", "category": "FÉCULENTS"}, {"name": "Brocoli", "qty": 300, "unit": "g", "category": "FRUITS & LÉGUMES"}, {"name": "Huile d’olive", "qty": 12, "unit": "g", "category": "ÉPICERIE"}], "steps": ["Cuire la source de féculents.", "Cuire la protéine avec les épices.", "Ajouter les légumes puis assembler."], "tags": ["meal-prep", "training-day"]},
{"id": "meal-16", "title": "Meal prep saumon & patate douce", "category": "PLAT", "prep": 10, "kcal": 595, "protein": 51, "carbs": 90, "fat": 12, "emoji": "🍲", "ingredients": [{"name": "Saumon", "qty": 160, "unit": "g", "category": "PROTÉINES"}, {"name": "Patate douce", "qty": 320, "unit": "g", "category": "FÉCULENTS"}, {"name": "Haricots verts", "qty": 200, "unit": "g", "category": "FRUITS & LÉGUMES"}, {"name": "Huile d’olive", "qty": 8, "unit": "g", "category": "ÉPICERIE"}], "steps": ["Cuire la source de féculents.", "Cuire la protéine avec les épices.", "Ajouter les légumes puis assembler."], "tags": ["meal-prep", "training-day"]},
{"id": "meal-17", "title": "One-pan cabillaud & pommes de terre", "category": "RAPIDE", "prep": 15, "kcal": 630, "protein": 54, "carbs": 55, "fat": 15, "emoji": "🍲", "ingredients": [{"name": "Cabillaud", "qty": 200, "unit": "g", "category": "PROTÉINES"}, {"name": "Pommes de terre", "qty": 350, "unit": "g", "category": "FÉCULENTS"}, {"name": "Brocoli", "qty": 250, "unit": "g", "category": "FRUITS & LÉGUMES"}, {"name": "Huile d’olive", "qty": 10, "unit": "g", "category": "ÉPICERIE"}], "steps": ["Cuire la source de féculents.", "Cuire la protéine avec les épices.", "Ajouter les légumes puis assembler."], "tags": ["meal-prep", "training-day"]},
{"id": "meal-18", "title": "Salade chaude thon au naturel & pâtes complèteses", "category": "PLAT", "prep": 20, "kcal": 665, "protein": 57, "carbs": 60, "fat": 18, "emoji": "🍲", "ingredients": [{"name": "Thon au naturel", "qty": 160, "unit": "g", "category": "PROTÉINES"}, {"name": "Pâtes complètes crues", "qty": 100, "unit": "g", "category": "FÉCULENTS"}, {"name": "Haricots verts", "qty": 300, "unit": "g", "category": "FRUITS & LÉGUMES"}, {"name": "Huile d’olive", "qty": 12, "unit": "g", "category": "ÉPICERIE"}], "steps": ["Cuire la source de féculents.", "Cuire la protéine avec les épices.", "Ajouter les légumes puis assembler."], "tags": ["meal-prep", "training-day"]},
{"id": "meal-19", "title": "Bowl poulet & riz basmati", "category": "PLAT", "prep": 25, "kcal": 700, "protein": 42, "carbs": 65, "fat": 21, "emoji": "🍲", "ingredients": [{"name": "Poulet", "qty": 180, "unit": "g", "category": "PROTÉINES"}, {"name": "Riz basmati cru", "qty": 90, "unit": "g", "category": "FÉCULENTS"}, {"name": "Brocoli", "qty": 200, "unit": "g", "category": "FRUITS & LÉGUMES"}, {"name": "Huile d’olive", "qty": 8, "unit": "g", "category": "ÉPICERIE"}], "steps": ["Cuire la source de féculents.", "Cuire la protéine avec les épices.", "Ajouter les légumes puis assembler."], "tags": ["meal-prep", "training-day"]},
{"id": "meal-20", "title": "Poêlée dinde & semoulee", "category": "PLAT", "prep": 30, "kcal": 735, "protein": 45, "carbs": 70, "fat": 24, "emoji": "🍲", "ingredients": [{"name": "Dinde", "qty": 180, "unit": "g", "category": "PROTÉINES"}, {"name": "Semoule crue", "qty": 95, "unit": "g", "category": "FÉCULENTS"}, {"name": "Haricots verts", "qty": 250, "unit": "g", "category": "FRUITS & LÉGUMES"}, {"name": "Huile d’olive", "qty": 10, "unit": "g", "category": "ÉPICERIE"}], "steps": ["Cuire la source de féculents.", "Cuire la protéine avec les épices.", "Ajouter les légumes puis assembler."], "tags": ["meal-prep", "training-day"]},
{"id": "meal-21", "title": "Assiette bœuf 5% & quinoa", "category": "HIGH PROTEIN", "prep": 10, "kcal": 770, "protein": 48, "carbs": 75, "fat": 12, "emoji": "🍲", "ingredients": [{"name": "Bœuf 5%", "qty": 170, "unit": "g", "category": "PROTÉINES"}, {"name": "Quinoa cru", "qty": 90, "unit": "g", "category": "FÉCULENTS"}, {"name": "Brocoli", "qty": 300, "unit": "g", "category": "FRUITS & LÉGUMES"}, {"name": "Huile d’olive", "qty": 12, "unit": "g", "category": "ÉPICERIE"}], "steps": ["Cuire la source de féculents.", "Cuire la protéine avec les épices.", "Ajouter les légumes puis assembler."], "tags": ["meal-prep", "training-day"]},
{"id": "meal-22", "title": "Meal prep saumon & patate douce", "category": "PLAT", "prep": 15, "kcal": 560, "protein": 51, "carbs": 80, "fat": 15, "emoji": "🍲", "ingredients": [{"name": "Saumon", "qty": 160, "unit": "g", "category": "PROTÉINES"}, {"name": "Patate douce", "qty": 320, "unit": "g", "category": "FÉCULENTS"}, {"name": "Haricots verts", "qty": 200, "unit": "g", "category": "FRUITS & LÉGUMES"}, {"name": "Huile d’olive", "qty": 8, "unit": "g", "category": "ÉPICERIE"}], "steps": ["Cuire la source de féculents.", "Cuire la protéine avec les épices.", "Ajouter les légumes puis assembler."], "tags": ["meal-prep", "training-day"]},
{"id": "meal-23", "title": "One-pan cabillaud & pommes de terre", "category": "RAPIDE", "prep": 20, "kcal": 595, "protein": 54, "carbs": 85, "fat": 18, "emoji": "🍲", "ingredients": [{"name": "Cabillaud", "qty": 200, "unit": "g", "category": "PROTÉINES"}, {"name": "Pommes de terre", "qty": 350, "unit": "g", "category": "FÉCULENTS"}, {"name": "Brocoli", "qty": 250, "unit": "g", "category": "FRUITS & LÉGUMES"}, {"name": "Huile d’olive", "qty": 10, "unit": "g", "category": "ÉPICERIE"}], "steps": ["Cuire la source de féculents.", "Cuire la protéine avec les épices.", "Ajouter les légumes puis assembler."], "tags": ["meal-prep", "training-day"]},
{"id": "meal-24", "title": "Salade chaude thon au naturel & pâtes complèteses", "category": "PLAT", "prep": 25, "kcal": 630, "protein": 57, "carbs": 90, "fat": 21, "emoji": "🍲", "ingredients": [{"name": "Thon au naturel", "qty": 160, "unit": "g", "category": "PROTÉINES"}, {"name": "Pâtes complètes crues", "qty": 100, "unit": "g", "category": "FÉCULENTS"}, {"name": "Haricots verts", "qty": 300, "unit": "g", "category": "FRUITS & LÉGUMES"}, {"name": "Huile d’olive", "qty": 12, "unit": "g", "category": "ÉPICERIE"}], "steps": ["Cuire la source de féculents.", "Cuire la protéine avec les épices.", "Ajouter les légumes puis assembler."], "tags": ["meal-prep", "training-day"]},
{"id": "meal-25", "title": "Bowl poulet & riz basmati", "category": "HIGH PROTEIN", "prep": 30, "kcal": 665, "protein": 42, "carbs": 55, "fat": 24, "emoji": "🍲", "ingredients": [{"name": "Poulet", "qty": 180, "unit": "g", "category": "PROTÉINES"}, {"name": "Riz basmati cru", "qty": 90, "unit": "g", "category": "FÉCULENTS"}, {"name": "Brocoli", "qty": 200, "unit": "g", "category": "FRUITS & LÉGUMES"}, {"name": "Huile d’olive", "qty": 8, "unit": "g", "category": "ÉPICERIE"}], "steps": ["Cuire la source de féculents.", "Cuire la protéine avec les épices.", "Ajouter les légumes puis assembler."], "tags": ["meal-prep", "training-day"]},
{"id": "meal-26", "title": "Poêlée dinde & semoulee", "category": "PLAT", "prep": 10, "kcal": 700, "protein": 45, "carbs": 60, "fat": 12, "emoji": "🍲", "ingredients": [{"name": "Dinde", "qty": 180, "unit": "g", "category": "PROTÉINES"}, {"name": "Semoule crue", "qty": 95, "unit": "g", "category": "FÉCULENTS"}, {"name": "Haricots verts", "qty": 250, "unit": "g", "category": "FRUITS & LÉGUMES"}, {"name": "Huile d’olive", "qty": 10, "unit": "g", "category": "ÉPICERIE"}], "steps": ["Cuire la source de féculents.", "Cuire la protéine avec les épices.", "Ajouter les légumes puis assembler."], "tags": ["meal-prep", "training-day"]},
{"id": "meal-27", "title": "Assiette bœuf 5% & quinoa", "category": "PLAT", "prep": 15, "kcal": 735, "protein": 48, "carbs": 65, "fat": 15, "emoji": "🍲", "ingredients": [{"name": "Bœuf 5%", "qty": 170, "unit": "g", "category": "PROTÉINES"}, {"name": "Quinoa cru", "qty": 90, "unit": "g", "category": "FÉCULENTS"}, {"name": "Brocoli", "qty": 300, "unit": "g", "category": "FRUITS & LÉGUMES"}, {"name": "Huile d’olive", "qty": 12, "unit": "g", "category": "ÉPICERIE"}], "steps": ["Cuire la source de féculents.", "Cuire la protéine avec les épices.", "Ajouter les légumes puis assembler."], "tags": ["meal-prep", "training-day"]},
{"id": "meal-28", "title": "Meal prep saumon & patate douce", "category": "PLAT", "prep": 20, "kcal": 770, "protein": 51, "carbs": 70, "fat": 18, "emoji": "🍲", "ingredients": [{"name": "Saumon", "qty": 160, "unit": "g", "category": "PROTÉINES"}, {"name": "Patate douce", "qty": 320, "unit": "g", "category": "FÉCULENTS"}, {"name": "Haricots verts", "qty": 200, "unit": "g", "category": "FRUITS & LÉGUMES"}, {"name": "Huile d’olive", "qty": 8, "unit": "g", "category": "ÉPICERIE"}], "steps": ["Cuire la source de féculents.", "Cuire la protéine avec les épices.", "Ajouter les légumes puis assembler."], "tags": ["meal-prep", "training-day"]},
{"id": "meal-29", "title": "One-pan cabillaud & pommes de terre", "category": "RAPIDE", "prep": 25, "kcal": 560, "protein": 54, "carbs": 75, "fat": 21, "emoji": "🍲", "ingredients": [{"name": "Cabillaud", "qty": 200, "unit": "g", "category": "PROTÉINES"}, {"name": "Pommes de terre", "qty": 350, "unit": "g", "category": "FÉCULENTS"}, {"name": "Brocoli", "qty": 250, "unit": "g", "category": "FRUITS & LÉGUMES"}, {"name": "Huile d’olive", "qty": 10, "unit": "g", "category": "ÉPICERIE"}], "steps": ["Cuire la source de féculents.", "Cuire la protéine avec les épices.", "Ajouter les légumes puis assembler."], "tags": ["meal-prep", "training-day"]},
{"id": "meal-30", "title": "Salade chaude thon au naturel & pâtes complèteses", "category": "PLAT", "prep": 30, "kcal": 595, "protein": 57, "carbs": 80, "fat": 24, "emoji": "🍲", "ingredients": [{"name": "Thon au naturel", "qty": 160, "unit": "g", "category": "PROTÉINES"}, {"name": "Pâtes complètes crues", "qty": 100, "unit": "g", "category": "FÉCULENTS"}, {"name": "Haricots verts", "qty": 300, "unit": "g", "category": "FRUITS & LÉGUMES"}, {"name": "Huile d’olive", "qty": 12, "unit": "g", "category": "ÉPICERIE"}], "steps": ["Cuire la source de féculents.", "Cuire la protéine avec les épices.", "Ajouter les légumes puis assembler."], "tags": ["meal-prep", "training-day"]},
{"id": "meal-31", "title": "Bowl poulet & riz basmati", "category": "PLAT", "prep": 10, "kcal": 630, "protein": 42, "carbs": 85, "fat": 12, "emoji": "🍲", "ingredients": [{"name": "Poulet", "qty": 180, "unit": "g", "category": "PROTÉINES"}, {"name": "Riz basmati cru", "qty": 90, "unit": "g", "category": "FÉCULENTS"}, {"name": "Brocoli", "qty": 200, "unit": "g", "category": "FRUITS & LÉGUMES"}, {"name": "Huile d’olive", "qty": 8, "unit": "g", "category": "ÉPICERIE"}], "steps": ["Cuire la source de féculents.", "Cuire la protéine avec les épices.", "Ajouter les légumes puis assembler."], "tags": ["meal-prep", "training-day"]},
{"id": "meal-32", "title": "Poêlée dinde & semoulee", "category": "PLAT", "prep": 15, "kcal": 665, "protein": 45, "carbs": 90, "fat": 15, "emoji": "🍲", "ingredients": [{"name": "Dinde", "qty": 180, "unit": "g", "category": "PROTÉINES"}, {"name": "Semoule crue", "qty": 95, "unit": "g", "category": "FÉCULENTS"}, {"name": "Haricots verts", "qty": 250, "unit": "g", "category": "FRUITS & LÉGUMES"}, {"name": "Huile d’olive", "qty": 10, "unit": "g", "category": "ÉPICERIE"}], "steps": ["Cuire la source de féculents.", "Cuire la protéine avec les épices.", "Ajouter les légumes puis assembler."], "tags": ["meal-prep", "training-day"]},
{"id": "meal-33", "title": "Assiette bœuf 5% & quinoa", "category": "HIGH PROTEIN", "prep": 20, "kcal": 700, "protein": 48, "carbs": 55, "fat": 18, "emoji": "🍲", "ingredients": [{"name": "Bœuf 5%", "qty": 170, "unit": "g", "category": "PROTÉINES"}, {"name": "Quinoa cru", "qty": 90, "unit": "g", "category": "FÉCULENTS"}, {"name": "Brocoli", "qty": 300, "unit": "g", "category": "FRUITS & LÉGUMES"}, {"name": "Huile d’olive", "qty": 12, "unit": "g", "category": "ÉPICERIE"}], "steps": ["Cuire la source de féculents.", "Cuire la protéine avec les épices.", "Ajouter les légumes puis assembler."], "tags": ["meal-prep", "training-day"]},
{"id": "meal-34", "title": "Meal prep saumon & patate douce", "category": "PLAT", "prep": 25, "kcal": 735, "protein": 51, "carbs": 60, "fat": 21, "emoji": "🍲", "ingredients": [{"name": "Saumon", "qty": 160, "unit": "g", "category": "PROTÉINES"}, {"name": "Patate douce", "qty": 320, "unit": "g", "category": "FÉCULENTS"}, {"name": "Haricots verts", "qty": 200, "unit": "g", "category": "FRUITS & LÉGUMES"}, {"name": "Huile d’olive", "qty": 8, "unit": "g", "category": "ÉPICERIE"}], "steps": ["Cuire la source de féculents.", "Cuire la protéine avec les épices.", "Ajouter les légumes puis assembler."], "tags": ["meal-prep", "training-day"]},
{"id": "meal-35", "title": "One-pan cabillaud & pommes de terre", "category": "RAPIDE", "prep": 30, "kcal": 770, "protein": 54, "carbs": 65, "fat": 24, "emoji": "🍲", "ingredients": [{"name": "Cabillaud", "qty": 200, "unit": "g", "category": "PROTÉINES"}, {"name": "Pommes de terre", "qty": 350, "unit": "g", "category": "FÉCULENTS"}, {"name": "Brocoli", "qty": 250, "unit": "g", "category": "FRUITS & LÉGUMES"}, {"name": "Huile d’olive", "qty": 10, "unit": "g", "category": "ÉPICERIE"}], "steps": ["Cuire la source de féculents.", "Cuire la protéine avec les épices.", "Ajouter les légumes puis assembler."], "tags": ["meal-prep", "training-day"]},
{"id": "meal-36", "title": "Salade chaude thon au naturel & pâtes complèteses", "category": "PLAT", "prep": 10, "kcal": 560, "protein": 57, "carbs": 70, "fat": 12, "emoji": "🍲", "ingredients": [{"name": "Thon au naturel", "qty": 160, "unit": "g", "category": "PROTÉINES"}, {"name": "Pâtes complètes crues", "qty": 100, "unit": "g", "category": "FÉCULENTS"}, {"name": "Haricots verts", "qty": 300, "unit": "g", "category": "FRUITS & LÉGUMES"}, {"name": "Huile d’olive", "qty": 12, "unit": "g", "category": "ÉPICERIE"}], "steps": ["Cuire la source de féculents.", "Cuire la protéine avec les épices.", "Ajouter les légumes puis assembler."], "tags": ["meal-prep", "training-day"]},
{"id": "breakfast-01", "title": "Bowl skyr avoine fruits rouges", "category": "PETIT-DÉJEUNER", "prep": 6, "kcal": 430, "protein": 32, "carbs": 48, "fat": 9, "emoji": "🥣", "ingredients": [{"name": "Skyr 0%", "qty": 250, "unit": "g", "category": "PRODUITS LAITIERS"}, {"name": "Flocons d’avoine", "qty": 70, "unit": "g", "category": "FÉCULENTS"}, {"name": "Fruits rouges", "qty": 120, "unit": "g", "category": "FRUITS & LÉGUMES"}], "steps": ["Peser les ingrédients.", "Assembler ou cuire selon la recette.", "Servir ou préparer la veille."], "tags": ["petit-déjeuner", "high-protein"]},
{"id": "breakfast-02", "title": "Omelette protéinée & toast", "category": "PETIT-DÉJEUNER", "prep": 9, "kcal": 465, "protein": 35, "carbs": 53, "fat": 11, "emoji": "🍳", "ingredients": [{"name": "Skyr 0%", "qty": 250, "unit": "g", "category": "PRODUITS LAITIERS"}, {"name": "Flocons d’avoine", "qty": 75, "unit": "g", "category": "FÉCULENTS"}, {"name": "Banane", "qty": 120, "unit": "g", "category": "FRUITS & LÉGUMES"}], "steps": ["Peser les ingrédients.", "Assembler ou cuire selon la recette.", "Servir ou préparer la veille."], "tags": ["petit-déjeuner", "high-protein"]},
{"id": "breakfast-03", "title": "Overnight oats banane", "category": "PETIT-DÉJEUNER", "prep": 12, "kcal": 500, "protein": 38, "carbs": 58, "fat": 13, "emoji": "🥣", "ingredients": [{"name": "Skyr 0%", "qty": 250, "unit": "g", "category": "PRODUITS LAITIERS"}, {"name": "Flocons d’avoine", "qty": 80, "unit": "g", "category": "FÉCULENTS"}, {"name": "Fruits rouges", "qty": 120, "unit": "g", "category": "FRUITS & LÉGUMES"}], "steps": ["Peser les ingrédients.", "Assembler ou cuire selon la recette.", "Servir ou préparer la veille."], "tags": ["petit-déjeuner", "high-protein"]},
{"id": "breakfast-04", "title": "French toast high protein", "category": "PETIT-DÉJEUNER", "prep": 15, "kcal": 535, "protein": 41, "carbs": 63, "fat": 15, "emoji": "🍞", "ingredients": [{"name": "Skyr 0%", "qty": 250, "unit": "g", "category": "PRODUITS LAITIERS"}, {"name": "Flocons d’avoine", "qty": 70, "unit": "g", "category": "FÉCULENTS"}, {"name": "Banane", "qty": 120, "unit": "g", "category": "FRUITS & LÉGUMES"}], "steps": ["Peser les ingrédients.", "Assembler ou cuire selon la recette.", "Servir ou préparer la veille."], "tags": ["petit-déjeuner", "high-protein"]},
{"id": "breakfast-05", "title": "Bowl fromage blanc kiwi", "category": "PETIT-DÉJEUNER", "prep": 6, "kcal": 570, "protein": 44, "carbs": 68, "fat": 9, "emoji": "🥝", "ingredients": [{"name": "Skyr 0%", "qty": 250, "unit": "g", "category": "PRODUITS LAITIERS"}, {"name": "Flocons d’avoine", "qty": 75, "unit": "g", "category": "FÉCULENTS"}, {"name": "Fruits rouges", "qty": 120, "unit": "g", "category": "FRUITS & LÉGUMES"}], "steps": ["Peser les ingrédients.", "Assembler ou cuire selon la recette.", "Servir ou préparer la veille."], "tags": ["petit-déjeuner", "high-protein"]},
{"id": "breakfast-06", "title": "Porridge pomme cannelle", "category": "PETIT-DÉJEUNER", "prep": 9, "kcal": 430, "protein": 32, "carbs": 73, "fat": 11, "emoji": "🍎", "ingredients": [{"name": "Skyr 0%", "qty": 250, "unit": "g", "category": "PRODUITS LAITIERS"}, {"name": "Flocons d’avoine", "qty": 80, "unit": "g", "category": "FÉCULENTS"}, {"name": "Banane", "qty": 120, "unit": "g", "category": "FRUITS & LÉGUMES"}], "steps": ["Peser les ingrédients.", "Assembler ou cuire selon la recette.", "Servir ou préparer la veille."], "tags": ["petit-déjeuner", "high-protein"]},
{"id": "breakfast-07", "title": "Bowl skyr avoine fruits rouges #2", "category": "PETIT-DÉJEUNER", "prep": 12, "kcal": 465, "protein": 35, "carbs": 48, "fat": 13, "emoji": "🥣", "ingredients": [{"name": "Skyr 0%", "qty": 250, "unit": "g", "category": "PRODUITS LAITIERS"}, {"name": "Flocons d’avoine", "qty": 70, "unit": "g", "category": "FÉCULENTS"}, {"name": "Fruits rouges", "qty": 120, "unit": "g", "category": "FRUITS & LÉGUMES"}], "steps": ["Peser les ingrédients.", "Assembler ou cuire selon la recette.", "Servir ou préparer la veille."], "tags": ["petit-déjeuner", "high-protein"]},
{"id": "breakfast-08", "title": "Omelette protéinée & toast #2", "category": "PETIT-DÉJEUNER", "prep": 15, "kcal": 500, "protein": 38, "carbs": 53, "fat": 15, "emoji": "🍳", "ingredients": [{"name": "Skyr 0%", "qty": 250, "unit": "g", "category": "PRODUITS LAITIERS"}, {"name": "Flocons d’avoine", "qty": 75, "unit": "g", "category": "FÉCULENTS"}, {"name": "Banane", "qty": 120, "unit": "g", "category": "FRUITS & LÉGUMES"}], "steps": ["Peser les ingrédients.", "Assembler ou cuire selon la recette.", "Servir ou préparer la veille."], "tags": ["petit-déjeuner", "high-protein"]},
{"id": "breakfast-09", "title": "Overnight oats banane #2", "category": "PETIT-DÉJEUNER", "prep": 6, "kcal": 535, "protein": 41, "carbs": 58, "fat": 9, "emoji": "🥣", "ingredients": [{"name": "Skyr 0%", "qty": 250, "unit": "g", "category": "PRODUITS LAITIERS"}, {"name": "Flocons d’avoine", "qty": 80, "unit": "g", "category": "FÉCULENTS"}, {"name": "Fruits rouges", "qty": 120, "unit": "g", "category": "FRUITS & LÉGUMES"}], "steps": ["Peser les ingrédients.", "Assembler ou cuire selon la recette.", "Servir ou préparer la veille."], "tags": ["petit-déjeuner", "high-protein"]},
{"id": "breakfast-10", "title": "French toast high protein #2", "category": "PETIT-DÉJEUNER", "prep": 9, "kcal": 570, "protein": 44, "carbs": 63, "fat": 11, "emoji": "🍞", "ingredients": [{"name": "Skyr 0%", "qty": 250, "unit": "g", "category": "PRODUITS LAITIERS"}, {"name": "Flocons d’avoine", "qty": 70, "unit": "g", "category": "FÉCULENTS"}, {"name": "Banane", "qty": 120, "unit": "g", "category": "FRUITS & LÉGUMES"}], "steps": ["Peser les ingrédients.", "Assembler ou cuire selon la recette.", "Servir ou préparer la veille."], "tags": ["petit-déjeuner", "high-protein"]},
{"id": "breakfast-11", "title": "Bowl fromage blanc kiwi #2", "category": "PETIT-DÉJEUNER", "prep": 12, "kcal": 430, "protein": 32, "carbs": 68, "fat": 13, "emoji": "🥝", "ingredients": [{"name": "Skyr 0%", "qty": 250, "unit": "g", "category": "PRODUITS LAITIERS"}, {"name": "Flocons d’avoine", "qty": 75, "unit": "g", "category": "FÉCULENTS"}, {"name": "Fruits rouges", "qty": 120, "unit": "g", "category": "FRUITS & LÉGUMES"}], "steps": ["Peser les ingrédients.", "Assembler ou cuire selon la recette.", "Servir ou préparer la veille."], "tags": ["petit-déjeuner", "high-protein"]},
{"id": "breakfast-12", "title": "Porridge pomme cannelle #2", "category": "PETIT-DÉJEUNER", "prep": 15, "kcal": 465, "protein": 35, "carbs": 73, "fat": 15, "emoji": "🍎", "ingredients": [{"name": "Skyr 0%", "qty": 250, "unit": "g", "category": "PRODUITS LAITIERS"}, {"name": "Flocons d’avoine", "qty": 80, "unit": "g", "category": "FÉCULENTS"}, {"name": "Banane", "qty": 120, "unit": "g", "category": "FRUITS & LÉGUMES"}], "steps": ["Peser les ingrédients.", "Assembler ou cuire selon la recette.", "Servir ou préparer la veille."], "tags": ["petit-déjeuner", "high-protein"]},
{"id": "breakfast-13", "title": "Bowl skyr avoine fruits rouges #3", "category": "PETIT-DÉJEUNER", "prep": 6, "kcal": 500, "protein": 38, "carbs": 48, "fat": 9, "emoji": "🥣", "ingredients": [{"name": "Skyr 0%", "qty": 250, "unit": "g", "category": "PRODUITS LAITIERS"}, {"name": "Flocons d’avoine", "qty": 70, "unit": "g", "category": "FÉCULENTS"}, {"name": "Fruits rouges", "qty": 120, "unit": "g", "category": "FRUITS & LÉGUMES"}], "steps": ["Peser les ingrédients.", "Assembler ou cuire selon la recette.", "Servir ou préparer la veille."], "tags": ["petit-déjeuner", "high-protein"]},
{"id": "breakfast-14", "title": "Omelette protéinée & toast #3", "category": "PETIT-DÉJEUNER", "prep": 9, "kcal": 535, "protein": 41, "carbs": 53, "fat": 11, "emoji": "🍳", "ingredients": [{"name": "Skyr 0%", "qty": 250, "unit": "g", "category": "PRODUITS LAITIERS"}, {"name": "Flocons d’avoine", "qty": 75, "unit": "g", "category": "FÉCULENTS"}, {"name": "Banane", "qty": 120, "unit": "g", "category": "FRUITS & LÉGUMES"}], "steps": ["Peser les ingrédients.", "Assembler ou cuire selon la recette.", "Servir ou préparer la veille."], "tags": ["petit-déjeuner", "high-protein"]},
{"id": "breakfast-15", "title": "Overnight oats banane #3", "category": "PETIT-DÉJEUNER", "prep": 12, "kcal": 570, "protein": 44, "carbs": 58, "fat": 13, "emoji": "🥣", "ingredients": [{"name": "Skyr 0%", "qty": 250, "unit": "g", "category": "PRODUITS LAITIERS"}, {"name": "Flocons d’avoine", "qty": 80, "unit": "g", "category": "FÉCULENTS"}, {"name": "Fruits rouges", "qty": 120, "unit": "g", "category": "FRUITS & LÉGUMES"}], "steps": ["Peser les ingrédients.", "Assembler ou cuire selon la recette.", "Servir ou préparer la veille."], "tags": ["petit-déjeuner", "high-protein"]},
{"id": "breakfast-16", "title": "French toast high protein #3", "category": "PETIT-DÉJEUNER", "prep": 15, "kcal": 430, "protein": 32, "carbs": 63, "fat": 15, "emoji": "🍞", "ingredients": [{"name": "Skyr 0%", "qty": 250, "unit": "g", "category": "PRODUITS LAITIERS"}, {"name": "Flocons d’avoine", "qty": 70, "unit": "g", "category": "FÉCULENTS"}, {"name": "Banane", "qty": 120, "unit": "g", "category": "FRUITS & LÉGUMES"}], "steps": ["Peser les ingrédients.", "Assembler ou cuire selon la recette.", "Servir ou préparer la veille."], "tags": ["petit-déjeuner", "high-protein"]},
{"id": "breakfast-17", "title": "Bowl fromage blanc kiwi #3", "category": "PETIT-DÉJEUNER", "prep": 6, "kcal": 465, "protein": 35, "carbs": 68, "fat": 9, "emoji": "🥝", "ingredients": [{"name": "Skyr 0%", "qty": 250, "unit": "g", "category": "PRODUITS LAITIERS"}, {"name": "Flocons d’avoine", "qty": 75, "unit": "g", "category": "FÉCULENTS"}, {"name": "Fruits rouges", "qty": 120, "unit": "g", "category": "FRUITS & LÉGUMES"}], "steps": ["Peser les ingrédients.", "Assembler ou cuire selon la recette.", "Servir ou préparer la veille."], "tags": ["petit-déjeuner", "high-protein"]},
{"id": "breakfast-18", "title": "Porridge pomme cannelle #3", "category": "PETIT-DÉJEUNER", "prep": 9, "kcal": 500, "protein": 38, "carbs": 73, "fat": 11, "emoji": "🍎", "ingredients": [{"name": "Skyr 0%", "qty": 250, "unit": "g", "category": "PRODUITS LAITIERS"}, {"name": "Flocons d’avoine", "qty": 80, "unit": "g", "category": "FÉCULENTS"}, {"name": "Banane", "qty": 120, "unit": "g", "category": "FRUITS & LÉGUMES"}], "steps": ["Peser les ingrédients.", "Assembler ou cuire selon la recette.", "Servir ou préparer la veille."], "tags": ["petit-déjeuner", "high-protein"]},
{"id": "dessert-01", "title": "Mousse skyr cacao", "category": "DESSERT", "prep": 5, "kcal": 220, "protein": 22, "carbs": 24, "fat": 4, "emoji": "🍫", "ingredients": [{"name": "Skyr 0%", "qty": 220, "unit": "g", "category": "PRODUITS LAITIERS"}, {"name": "Fruits rouges", "qty": 100, "unit": "g", "category": "FRUITS & LÉGUMES"}, {"name": "Flocons d’avoine", "qty": 20, "unit": "g", "category": "FÉCULENTS"}], "steps": ["Mélanger les ingrédients.", "Ajouter le topping.", "Réserver au frais si nécessaire."], "tags": ["dessert", "high-protein"]},
{"id": "dessert-02", "title": "Tiramisu protéiné", "category": "DESSERT", "prep": 8, "kcal": 245, "protein": 24, "carbs": 28, "fat": 6, "emoji": "☕", "ingredients": [{"name": "Skyr 0%", "qty": 250, "unit": "g", "category": "PRODUITS LAITIERS"}, {"name": "Banane", "qty": 120, "unit": "g", "category": "FRUITS & LÉGUMES"}, {"name": "Flocons d’avoine", "qty": 25, "unit": "g", "category": "FÉCULENTS"}], "steps": ["Mélanger les ingrédients.", "Ajouter le topping.", "Réserver au frais si nécessaire."], "tags": ["dessert", "high-protein"]},
{"id": "dessert-03", "title": "Bowl fruits rouges", "category": "DESSERT", "prep": 11, "kcal": 270, "protein": 26, "carbs": 32, "fat": 8, "emoji": "🫐", "ingredients": [{"name": "Skyr 0%", "qty": 280, "unit": "g", "category": "PRODUITS LAITIERS"}, {"name": "Fruits rouges", "qty": 140, "unit": "g", "category": "FRUITS & LÉGUMES"}, {"name": "Flocons d’avoine", "qty": 30, "unit": "g", "category": "FÉCULENTS"}], "steps": ["Mélanger les ingrédients.", "Ajouter le topping.", "Réserver au frais si nécessaire."], "tags": ["dessert", "high-protein"]},
{"id": "dessert-04", "title": "Crème vanille protéinée", "category": "DESSERT", "prep": 14, "kcal": 295, "protein": 28, "carbs": 36, "fat": 10, "emoji": "🍮", "ingredients": [{"name": "Skyr 0%", "qty": 220, "unit": "g", "category": "PRODUITS LAITIERS"}, {"name": "Banane", "qty": 100, "unit": "g", "category": "FRUITS & LÉGUMES"}, {"name": "Flocons d’avoine", "qty": 20, "unit": "g", "category": "FÉCULENTS"}], "steps": ["Mélanger les ingrédients.", "Ajouter le topping.", "Réserver au frais si nécessaire."], "tags": ["dessert", "high-protein"]},
{"id": "dessert-05", "title": "Cookie bowl avoine", "category": "DESSERT", "prep": 5, "kcal": 320, "protein": 30, "carbs": 40, "fat": 4, "emoji": "🍪", "ingredients": [{"name": "Skyr 0%", "qty": 250, "unit": "g", "category": "PRODUITS LAITIERS"}, {"name": "Fruits rouges", "qty": 120, "unit": "g", "category": "FRUITS & LÉGUMES"}, {"name": "Flocons d’avoine", "qty": 25, "unit": "g", "category": "FÉCULENTS"}], "steps": ["Mélanger les ingrédients.", "Ajouter le topping.", "Réserver au frais si nécessaire."], "tags": ["dessert", "high-protein"]},
{"id": "dessert-06", "title": "Frozen skyr banane", "category": "DESSERT", "prep": 8, "kcal": 220, "protein": 22, "carbs": 24, "fat": 6, "emoji": "🍌", "ingredients": [{"name": "Skyr 0%", "qty": 280, "unit": "g", "category": "PRODUITS LAITIERS"}, {"name": "Banane", "qty": 140, "unit": "g", "category": "FRUITS & LÉGUMES"}, {"name": "Flocons d’avoine", "qty": 30, "unit": "g", "category": "FÉCULENTS"}], "steps": ["Mélanger les ingrédients.", "Ajouter le topping.", "Réserver au frais si nécessaire."], "tags": ["dessert", "high-protein"]},
{"id": "dessert-07", "title": "Mousse skyr cacao #2", "category": "DESSERT", "prep": 11, "kcal": 245, "protein": 24, "carbs": 28, "fat": 8, "emoji": "🍫", "ingredients": [{"name": "Skyr 0%", "qty": 220, "unit": "g", "category": "PRODUITS LAITIERS"}, {"name": "Fruits rouges", "qty": 100, "unit": "g", "category": "FRUITS & LÉGUMES"}, {"name": "Flocons d’avoine", "qty": 20, "unit": "g", "category": "FÉCULENTS"}], "steps": ["Mélanger les ingrédients.", "Ajouter le topping.", "Réserver au frais si nécessaire."], "tags": ["dessert", "high-protein"]},
{"id": "dessert-08", "title": "Tiramisu protéiné #2", "category": "DESSERT", "prep": 14, "kcal": 270, "protein": 26, "carbs": 32, "fat": 10, "emoji": "☕", "ingredients": [{"name": "Skyr 0%", "qty": 250, "unit": "g", "category": "PRODUITS LAITIERS"}, {"name": "Banane", "qty": 120, "unit": "g", "category": "FRUITS & LÉGUMES"}, {"name": "Flocons d’avoine", "qty": 25, "unit": "g", "category": "FÉCULENTS"}], "steps": ["Mélanger les ingrédients.", "Ajouter le topping.", "Réserver au frais si nécessaire."], "tags": ["dessert", "high-protein"]},
{"id": "dessert-09", "title": "Bowl fruits rouges #2", "category": "DESSERT", "prep": 5, "kcal": 295, "protein": 28, "carbs": 36, "fat": 4, "emoji": "🫐", "ingredients": [{"name": "Skyr 0%", "qty": 280, "unit": "g", "category": "PRODUITS LAITIERS"}, {"name": "Fruits rouges", "qty": 140, "unit": "g", "category": "FRUITS & LÉGUMES"}, {"name": "Flocons d’avoine", "qty": 30, "unit": "g", "category": "FÉCULENTS"}], "steps": ["Mélanger les ingrédients.", "Ajouter le topping.", "Réserver au frais si nécessaire."], "tags": ["dessert", "high-protein"]},
{"id": "dessert-10", "title": "Crème vanille protéinée #2", "category": "DESSERT", "prep": 8, "kcal": 320, "protein": 30, "carbs": 40, "fat": 6, "emoji": "🍮", "ingredients": [{"name": "Skyr 0%", "qty": 220, "unit": "g", "category": "PRODUITS LAITIERS"}, {"name": "Banane", "qty": 100, "unit": "g", "category": "FRUITS & LÉGUMES"}, {"name": "Flocons d’avoine", "qty": 20, "unit": "g", "category": "FÉCULENTS"}], "steps": ["Mélanger les ingrédients.", "Ajouter le topping.", "Réserver au frais si nécessaire."], "tags": ["dessert", "high-protein"]},
{"id": "dessert-11", "title": "Cookie bowl avoine #2", "category": "DESSERT", "prep": 11, "kcal": 220, "protein": 22, "carbs": 24, "fat": 8, "emoji": "🍪", "ingredients": [{"name": "Skyr 0%", "qty": 250, "unit": "g", "category": "PRODUITS LAITIERS"}, {"name": "Fruits rouges", "qty": 120, "unit": "g", "category": "FRUITS & LÉGUMES"}, {"name": "Flocons d’avoine", "qty": 25, "unit": "g", "category": "FÉCULENTS"}], "steps": ["Mélanger les ingrédients.", "Ajouter le topping.", "Réserver au frais si nécessaire."], "tags": ["dessert", "high-protein"]},
{"id": "dessert-12", "title": "Frozen skyr banane #2", "category": "DESSERT", "prep": 14, "kcal": 245, "protein": 24, "carbs": 28, "fat": 10, "emoji": "🍌", "ingredients": [{"name": "Skyr 0%", "qty": 280, "unit": "g", "category": "PRODUITS LAITIERS"}, {"name": "Banane", "qty": 140, "unit": "g", "category": "FRUITS & LÉGUMES"}, {"name": "Flocons d’avoine", "qty": 30, "unit": "g", "category": "FÉCULENTS"}], "steps": ["Mélanger les ingrédients.", "Ajouter le topping.", "Réserver au frais si nécessaire."], "tags": ["dessert", "high-protein"]},
{"id": "dessert-13", "title": "Mousse skyr cacao #3", "category": "DESSERT", "prep": 5, "kcal": 270, "protein": 26, "carbs": 32, "fat": 4, "emoji": "🍫", "ingredients": [{"name": "Skyr 0%", "qty": 220, "unit": "g", "category": "PRODUITS LAITIERS"}, {"name": "Fruits rouges", "qty": 100, "unit": "g", "category": "FRUITS & LÉGUMES"}, {"name": "Flocons d’avoine", "qty": 20, "unit": "g", "category": "FÉCULENTS"}], "steps": ["Mélanger les ingrédients.", "Ajouter le topping.", "Réserver au frais si nécessaire."], "tags": ["dessert", "high-protein"]},
{"id": "dessert-14", "title": "Tiramisu protéiné #3", "category": "DESSERT", "prep": 8, "kcal": 295, "protein": 28, "carbs": 36, "fat": 6, "emoji": "☕", "ingredients": [{"name": "Skyr 0%", "qty": 250, "unit": "g", "category": "PRODUITS LAITIERS"}, {"name": "Banane", "qty": 120, "unit": "g", "category": "FRUITS & LÉGUMES"}, {"name": "Flocons d’avoine", "qty": 25, "unit": "g", "category": "FÉCULENTS"}], "steps": ["Mélanger les ingrédients.", "Ajouter le topping.", "Réserver au frais si nécessaire."], "tags": ["dessert", "high-protein"]},
{"id": "dessert-15", "title": "Bowl fruits rouges #3", "category": "DESSERT", "prep": 11, "kcal": 320, "protein": 30, "carbs": 40, "fat": 8, "emoji": "🫐", "ingredients": [{"name": "Skyr 0%", "qty": 280, "unit": "g", "category": "PRODUITS LAITIERS"}, {"name": "Fruits rouges", "qty": 140, "unit": "g", "category": "FRUITS & LÉGUMES"}, {"name": "Flocons d’avoine", "qty": 30, "unit": "g", "category": "FÉCULENTS"}], "steps": ["Mélanger les ingrédients.", "Ajouter le topping.", "Réserver au frais si nécessaire."], "tags": ["dessert", "high-protein"]},
{"id": "dessert-16", "title": "Crème vanille protéinée #3", "category": "DESSERT", "prep": 14, "kcal": 220, "protein": 22, "carbs": 24, "fat": 10, "emoji": "🍮", "ingredients": [{"name": "Skyr 0%", "qty": 220, "unit": "g", "category": "PRODUITS LAITIERS"}, {"name": "Banane", "qty": 100, "unit": "g", "category": "FRUITS & LÉGUMES"}, {"name": "Flocons d’avoine", "qty": 20, "unit": "g", "category": "FÉCULENTS"}], "steps": ["Mélanger les ingrédients.", "Ajouter le topping.", "Réserver au frais si nécessaire."], "tags": ["dessert", "high-protein"]},
{"id": "dessert-17", "title": "Cookie bowl avoine #3", "category": "DESSERT", "prep": 5, "kcal": 245, "protein": 24, "carbs": 28, "fat": 4, "emoji": "🍪", "ingredients": [{"name": "Skyr 0%", "qty": 250, "unit": "g", "category": "PRODUITS LAITIERS"}, {"name": "Fruits rouges", "qty": 120, "unit": "g", "category": "FRUITS & LÉGUMES"}, {"name": "Flocons d’avoine", "qty": 25, "unit": "g", "category": "FÉCULENTS"}], "steps": ["Mélanger les ingrédients.", "Ajouter le topping.", "Réserver au frais si nécessaire."], "tags": ["dessert", "high-protein"]},
{"id": "dessert-18", "title": "Frozen skyr banane #3", "category": "DESSERT", "prep": 8, "kcal": 270, "protein": 26, "carbs": 32, "fat": 6, "emoji": "🍌", "ingredients": [{"name": "Skyr 0%", "qty": 280, "unit": "g", "category": "PRODUITS LAITIERS"}, {"name": "Banane", "qty": 140, "unit": "g", "category": "FRUITS & LÉGUMES"}, {"name": "Flocons d’avoine", "qty": 30, "unit": "g", "category": "FÉCULENTS"}], "steps": ["Mélanger les ingrédients.", "Ajouter le topping.", "Réserver au frais si nécessaire."], "tags": ["dessert", "high-protein"]}]


const ingredientNutrition:Record<string,{basis:number;kcal:number;p:number;c:number;f:number}>={
  'flocons d’avoine':{basis:100,kcal:372,p:13,c:60,f:7},
  'skyr 0%':{basis:100,kcal:59,p:10,c:4,f:.2},
  'œufs':{basis:1,kcal:72,p:6.3,c:.4,f:4.8},
  'banane':{basis:100,kcal:89,p:1.1,c:23,f:.3},
  'levure chimique':{basis:100,kcal:53,p:0,c:28,f:0},
  'blanc de poulet':{basis:100,kcal:110,p:23,c:0,f:1.5},
  'riz basmati cru':{basis:100,kcal:350,p:8,c:77,f:1},
  'poivrons':{basis:100,kcal:31,p:1,c:6,f:.3},
  'courgette':{basis:100,kcal:17,p:1.2,c:3.1,f:.3},
  'huile d’olive':{basis:100,kcal:884,p:0,c:0,f:100},
  'fromage frais léger':{basis:100,kcal:120,p:8,c:5,f:7},
  'fruits rouges':{basis:100,kcal:45,p:1,c:8,f:.5},
  'biscuits avoine':{basis:100,kcal:430,p:8,c:67,f:14},
  'escalope de dinde':{basis:100,kcal:110,p:24,c:0,f:1.2},
  'wrap complet':{basis:1,kcal:210,p:7,c:35,f:5},
  'salade':{basis:100,kcal:15,p:1.4,c:2.9,f:.2},
  'tomate':{basis:100,kcal:18,p:.9,c:3.9,f:.2},
  'bœuf 5%':{basis:100,kcal:137,p:21,c:0,f:5},
  'pâtes complètes crues':{basis:100,kcal:350,p:13,c:67,f:2.5},
  'coulis de tomate':{basis:100,kcal:29,p:1.4,c:5,f:.2},
  'épinards':{basis:100,kcal:23,p:2.9,c:3.6,f:.4},
  'parmesan':{basis:100,kcal:392,p:35.8,c:3.2,f:25.8}
}
const normIngredient=(name:string)=>name.toLowerCase().trim()
const ingredientMacros=(ingredient:RecipeIngredient,qty=ingredient.qty):MacroVector=>{
  const n=ingredientNutrition[normIngredient(ingredient.name)]
  if(!n){
    const ratio=qty/Math.max(1,ingredient.qty)
    return {kcal:0,protein:0,carbs:0,fat:0}
  }
  const factor=qty/n.basis
  return {kcal:n.kcal*factor,protein:n.p*factor,carbs:n.c*factor,fat:n.f*factor}
}
const sumMacros=(ingredients:RecipeIngredient[]):MacroVector=>ingredients.reduce((a,i)=>{
  const m=ingredientMacros(i)
  return {kcal:a.kcal+m.kcal,protein:a.protein+m.protein,carbs:a.carbs+m.carbs,fat:a.fat+m.fat}
},{kcal:0,protein:0,carbs:0,fat:0})
const macroDistance=(m:MacroVector,target:MacroVector)=>{
  const dK=(m.kcal-target.kcal)/Math.max(150,target.kcal)
  const dP=(m.protein-target.protein)/Math.max(15,target.protein)
  const dC=(m.carbs-target.carbs)/Math.max(20,target.carbs)
  const dF=(m.fat-target.fat)/Math.max(8,target.fat)
  return dK*dK*.25+dP*dP*.32+dC*dC*.25+dF*dF*.18
}
const fitRecipeToMeal=(recipe:Recipe,target:MacroVector)=>{
  let q=recipe.ingredients.map(i=>i.qty)
  const mins=recipe.ingredients.map(i=>i.qty*.55)
  const maxs=recipe.ingredients.map(i=>i.qty*1.65)
  const rounded=(i:number,v:number)=>{
    const unit=recipe.ingredients[i].unit.toLowerCase()
    const step=unit.startsWith('pièce')?1:5
    return Math.max(mins[i],Math.min(maxs[i],Math.round(v/step)*step))
  }
  const evaluate=(vals:number[])=>{
    const ingredients=recipe.ingredients.map((i,j)=>({...i,qty:vals[j]}))
    return {ingredients,macros:sumMacros(ingredients)}
  }
  let best=evaluate(q)
  let bestScore=macroDistance(best.macros,target)
  for(let pass=0;pass<18;pass++){
    let improved=false
    for(let i=0;i<q.length;i++){
      const unit=recipe.ingredients[i].unit.toLowerCase()
      const step=unit.startsWith('pièce')?1:5
      for(const dir of [-1,1]){
        const next=[...q]
        next[i]=rounded(i,next[i]+dir*step)
        const ev=evaluate(next)
        const score=macroDistance(ev.macros,target)
        if(score+1e-8<bestScore){
          q=next;best=ev;bestScore=score;improved=true
        }
      }
    }
    if(!improved) break
  }
  return {
    ...recipe,
    ingredients:best.ingredients,
    kcal:Math.round(best.macros.kcal),
    protein:Math.round(best.macros.protein),
    carbs:Math.round(best.macros.carbs),
    fat:Math.round(best.macros.fat),
    fitScore:Math.max(0,Math.round((1-Math.min(1,bestScore))*100))
  }
}
const recipeTargetDistance=(recipe:Recipe,target:MacroVector)=>{
  const base=sumMacros(recipe.ingredients)
  return macroDistance(base,target)
}
const weeklySessionPlan=['PUSH','PULL','LEGS','UPPER','LOWER','RECOVERY','RECOVERY'] as const
const ingredientCategory=(name:string):RecipeIngredient['category']=>{
  const n=name.toLowerCase()
  if(/poulet|dinde|boeuf|bœuf|oeuf|œuf|thon|saumon|jambon|steak/.test(n)) return 'PROTÉINES'
  if(/riz|pâte|avoine|muesli|pain|wrap|pomme de terre|patate|quinoa|semoule|biscuit/.test(n)) return 'FÉCULENTS'
  if(/skyr|yaourt|fromage|lait|parmesan/.test(n)) return 'PRODUITS LAITIERS'
  if(/huile|amande|noix|beurre|épice|sauce|levure/.test(n)) return 'ÉPICERIE'
  return 'FRUITS & LÉGUMES'
}
const parseFoodQty=(qty:string|number)=>{
  if(typeof qty==='number') return {qty,unit:'g'}
  const raw=String(qty)
  const num=Number((raw.match(/[\d,.]+/)?.[0]||'1').replace(',','.'))
  const unit=(raw.match(/kg|ml|cl|l|g|pièces?|pièce|tranches?|portion/i)?.[0]||'g')
  return {qty:Number.isFinite(num)?num:1,unit}
}
const shoppingKey=(dayKey:string,session:string)=>`bodyos:shopping:${dayKey}:${session}`

function NutritionScreen({activeDay,onSessionChange}:{activeDay:number;onSessionChange:(day:number)=>void}){
  type Nv8Tab='dashboard'|'programme'|'journal'|'recipes'|'shopping'
  type Goal='CUT'|'RECOMP'|'MAINTAIN'|'GAIN'
  type Profile={weight:number;targetWeight:number;heightCm:number;age:number;sex:'male'|'female';activity:'low'|'moderate'|'high';goal:Goal;weeklyTargetKg:number;currentCalories:number;proteinTarget:number;fatTarget:number}
  type WeightPoint={date:string;weight:number}
  type EditableFood={name:string;qty:number;unit:string}
  type MacroMini={kcal:number;p:number;c:number;f:number}
  const defaultProfile:Profile={weight:105,targetWeight:100,heightCm:180,age:32,sex:'male',activity:'moderate',goal:'CUT',weeklyTargetKg:-0.5,currentCalories:2800,proteinTarget:190,fatTarget:78}
  const [tab,setTab]=useState<Nv8Tab>('dashboard')
  const [programmeView,setProgrammeView]=useState<'meals'|'overview'>('meals')
  const [profile,setProfile]=useState<Profile>(()=>appRead<Profile>('bodyos:adaptive-profile',defaultProfile))
  const [profileDraft,setProfileDraft]=useState<Profile>(()=>appRead<Profile>('bodyos:adaptive-profile',defaultProfile))
  const [showProfile,setShowProfile]=useState(false)
  const [weightHistory,setWeightHistory]=useState<WeightPoint[]>(()=>appRead<WeightPoint[]>('bodyos:weight-history',[
    {date:'2026-08-18',weight:105.8},{date:'2026-08-21',weight:105.4},{date:'2026-08-24',weight:105.1},{date:'2026-08-27',weight:104.8},{date:'2026-08-30',weight:104.6}
  ]))
  const [showAdaptive,setShowAdaptive]=useState(false)
  const [showCalorieExplain,setShowCalorieExplain]=useState(false)
  const [showRecipe,setShowRecipe]=useState<Recipe|null>(null)
  const [adjusting,setAdjusting]=useState<DailyMeal|null>(null)
  const [adjustScale,setAdjustScale]=useState(1)
  const [recipeSearch,setRecipeSearch]=useState('')
  const [recipeFilter,setRecipeFilter]=useState<RecipeCategory|'TOUT'>('TOUT')
  const [favorites,setFavorites]=useState<string[]>(()=>appRead<string[]>('bodyos:recipe-favorites',[]))
  const [refresh,setRefresh]=useState(0)
  const [mealEditor,setMealEditor]=useState<DailyMeal|null>(null)
  const [mealDraft,setMealDraft]=useState<EditableFood[]>([])
  const [replaceFoodIndex,setReplaceFoodIndex]=useState<number|null>(null)

  const now=new Date()
  const dayKey=`${now.getFullYear()}-${String(now.getMonth()+1).padStart(2,'0')}-${String(now.getDate()).padStart(2,'0')}`
  const entries=useMemo(()=>appRead<NutritionEntry[]>(`bodyos:nutrition:${dayKey}`,[]),[dayKey,refresh])
  const totals=entries.reduce((a,e)=>({kcal:a.kcal+e.kcal,protein:a.protein+e.protein,carbs:a.carbs+e.carbs,fat:a.fat+e.fat}),{kcal:0,protein:0,carbs:0,fat:0})
  const session=sessions[activeDay%sessions.length]
  const raw=(session?.title||'PUSH').toUpperCase()
  const sid=(session?.id||'push').toUpperCase()
  const sessionKey=sid.includes('PULL')||raw.includes('PULL')?'PULL':sid.includes('LEG')||raw.includes('LEG')?'LEGS':sid.includes('UPPER')||raw.includes('UPPER')?'UPPER':sid.includes('LOWER')||raw.includes('LOWER')?'LOWER':'PUSH'
  const weekSeed=Math.floor(now.getTime()/(86400000*7))
  const protocol=buildWeeklyProtocol(sessionKey,weekSeed)
  const carbsTarget=Math.max(0,Math.round((profile.currentCalories-profile.proteinTarget*4-profile.fatTarget*9)/4))
  const remaining=Math.max(0,profile.currentCalories-totals.kcal)
  const pct=Math.min(100,Math.max(0,totals.kcal/profile.currentCalories*100))
  const trend=(()=>{if(weightHistory.length<2)return 0;const p=[...weightHistory].sort((a,b)=>a.date.localeCompare(b.date));const days=Math.max(1,(new Date(p[p.length-1].date).getTime()-new Date(p[0].date).getTime())/86400000);return (p[p.length-1].weight-p[0].weight)/(days/7)})()
  const targetTrend=profile.goal==='CUT'?-0.5:profile.goal==='GAIN'?0.25:0
  const delta=profile.goal==='CUT'?(trend>-0.30?-120:trend<-0.75?120:0):profile.goal==='GAIN'?(trend<0.1?120:trend>0.4?-120:0):0
  const recommended=Math.max(1600,profile.currentCalories+delta)
  const bmr=Math.round(profile.sex==='male'
    ? 10*profile.weight+6.25*profile.heightCm-5*profile.age+5
    : 10*profile.weight+6.25*profile.heightCm-5*profile.age-161)
  const activityFactor=profile.activity==='low'?1.35:profile.activity==='high'?1.7:1.5
  const weeklyEnergyPerKg=7700
  const goalWeeklyKg=(goal:Goal)=>goal==='CUT'?-0.5:goal==='GAIN'?0.25:0
  const calcBaseCalories=(p:Profile)=>{
    const b=Math.round(p.sex==='male'
      ? 10*p.weight+6.25*p.heightCm-5*p.age+5
      : 10*p.weight+6.25*p.heightCm-5*p.age-161)
    const af=p.activity==='low'?1.35:p.activity==='high'?1.7:1.5
    const tdee=Math.round(b*af)
    const weeklyKg=goalWeeklyKg(p.goal)
    const dailyAdjustment=Math.round((weeklyKg*weeklyEnergyPerKg)/7)
    const target=Math.max(1600,Math.round((tdee+dailyAdjustment)/10)*10)
    return {bmr:b,activityFactor:af,tdee,weeklyKg,dailyAdjustment,target}
  }
  const calculatedProfileTarget=calcBaseCalories(profileDraft)
  const maintenance=Math.round(bmr*activityFactor)
  const targetWeeklyKg=goalWeeklyKg(profile.goal)
  const goalAdjustment=Math.round((targetWeeklyKg*weeklyEnergyPerKg)/7)
  const calculatedInitial=Math.max(1600,Math.round((maintenance+goalAdjustment)/10)*10)
  const goalLabel:Record<Goal,string>={CUT:'SÈCHE',RECOMP:'RECOMPOSITION',MAINTAIN:'MAINTIEN',GAIN:'PRISE DE MASSE'}
  const fmt=(v:number)=>Number.isInteger(v)?String(v):v.toFixed(1).replace('.',',')
  const score=Math.round(Math.max(0,Math.min(100,87-Math.abs(profile.currentCalories-totals.kcal)/Math.max(1,profile.currentCalories)*18)))
  const linePoints=weightHistory.slice(-7).map((p,i)=>({i,weight:p.weight}))

  const saveProfile=()=>{
    const normalized={...profileDraft,weight:Number(profileDraft.weight),targetWeight:Number(profileDraft.targetWeight)}
    const calc=calcBaseCalories(normalized)
    const next={...normalized,currentCalories:calc.target,weeklyTargetKg:calc.weeklyKg}
    setProfile(next)
    setProfileDraft(next)
    appWrite('bodyos:adaptive-profile',next)
    const history=[...weightHistory.filter(p=>p.date!==dayKey),{date:dayKey,weight:next.weight}].sort((a,b)=>a.date.localeCompare(b.date)).slice(-30)
    setWeightHistory(history);appWrite('bodyos:weight-history',history)
    setShowProfile(false)
  }
  const saveMeal=(meal:DailyMeal,status:'consumed'|'skipped',scale=1)=>{
    const next=entries.filter(e=>e.id!==`programme:${dayKey}:${meal.time}`)
    const plannedFoods=meal.foods.map(parseEditableFood)
    const currentFoods=foodsFor(meal)
    const currentMacros=mealMacros(currentFoods)
    const factor=status==='skipped'?0:scale
    const entry:NutritionEntry={
      id:`programme:${dayKey}:${meal.time}`,meal:meal.title,title:meal.title,time:meal.time,
      kcal:Math.round(currentMacros.kcal*factor),protein:Math.round(currentMacros.p*factor*10)/10,carbs:Math.round(currentMacros.c*factor*10)/10,fat:Math.round(currentMacros.f*factor*10)/10,
      status:status==='skipped'?'skipped':scale===1?'consumed':'partial',source:'programme',
      foods:currentFoods.map((f,i)=>({name:f.name,plannedQty:plannedFoods[i]?`${fmt(plannedFoods[i].qty)} ${plannedFoods[i].unit}`:'—',actualQty:status==='skipped'?'0':`${fmt(Math.round(f.qty*factor*10)/10)} ${f.unit}`}))
    }
    next.push(entry);appWrite(`bodyos:nutrition:${dayKey}`,next);setRefresh(x=>x+1)
  }
  const saveAdjustment=()=>{if(adjusting){saveMeal(adjusting,'consumed',adjustScale);setAdjusting(null);setAdjustScale(1)}}
  const deleteEntry=(id:string)=>{appWrite(`bodyos:nutrition:${dayKey}`,entries.filter(e=>e.id!==id));setRefresh(x=>x+1)}
  const toggleFavorite=(id:string)=>{const next=favorites.includes(id)?favorites.filter(x=>x!==id):[...favorites,id];setFavorites(next);appWrite('bodyos:recipe-favorites',next)}
  const filteredRecipes=recipes.filter(r=>(recipeFilter==='TOUT'||r.category===recipeFilter)&&(!recipeSearch||`${r.title} ${r.category}`.toLowerCase().includes(recipeSearch.toLowerCase())))
  const photoFor=(i:number)=>['/body-os/meal-breakfast-clean.webp','/body-os/meal-lunch-clean.webp','/body-os/meal-preworkout-clean.webp','/body-os/meal-dinner-clean.webp'][i%4]
  const parseEditableFood=(f:DailyFood):EditableFood=>{
    const raw=String(f.qty)
    const gramMatches=[...raw.matchAll(/([\d.,]+)\s*g/g)]
    const numeric=gramMatches.length?Number(gramMatches[gramMatches.length-1][1].replace(',','.')):Number((raw.match(/[\d.,]+/)?.[0]||'1').replace(',','.'))
    const unit=raw.includes('g')?'g':raw.toLowerCase().includes('pièce')?'pièce':'g'
    return {name:f.name,qty:Number.isFinite(numeric)?numeric:1,unit}
  }
  const nutritionDb:Record<string,MacroMini>={
    'flocons d’avoine':{kcal:370,p:13,c:60,f:7},'skyr 0%':{kcal:59,p:10.3,c:3.6,f:.2},
    'fromage blanc':{kcal:55,p:8,c:4,f:1},'fromage blanc 0%':{kcal:45,p:8,c:4,f:.2},
    'yaourt grec 0%':{kcal:59,p:10,c:3.6,f:.4},'œufs':{kcal:143,p:13,c:1.1,f:10},
    'œufs entiers':{kcal:143,p:13,c:1.1,f:10},'banane':{kcal:89,p:1.1,c:23,f:.3},
    'amandes':{kcal:579,p:21,c:22,f:50},'poulet':{kcal:165,p:31,c:0,f:3.6},
    'blanc de poulet':{kcal:165,p:31,c:0,f:3.6},'dinde':{kcal:135,p:29,c:0,f:1.5},
    'steak haché 5%':{kcal:137,p:21,c:0,f:5},'saumon':{kcal:208,p:20,c:0,f:13},
    'cabillaud':{kcal:82,p:18,c:0,f:.7},'poisson blanc':{kcal:90,p:19,c:0,f:1},
    'riz basmati (cru)':{kcal:350,p:7.5,c:78,f:.8},'quinoa (cru)':{kcal:368,p:14,c:64,f:6},
    'pommes de terre':{kcal:77,p:2,c:17,f:.1},'patate douce':{kcal:86,p:1.6,c:20,f:.1},
    'pain complet':{kcal:247,p:13,c:41,f:4.2},'galettes de riz':{kcal:387,p:8,c:81,f:3},
    'brocolis':{kcal:34,p:2.8,c:7,f:.4},'haricots verts':{kcal:31,p:1.8,c:7,f:.2},
    'légumes':{kcal:35,p:2,c:6,f:.3},'légumes verts':{kcal:30,p:2,c:5,f:.3},
    'myrtilles':{kcal:57,p:.7,c:14,f:.3},'fruits rouges':{kcal:50,p:1,c:12,f:.4},
    'pomme':{kcal:52,p:.3,c:14,f:.2},'kiwi':{kcal:61,p:1.1,c:15,f:.5},
    'huile d’olive':{kcal:884,p:0,c:0,f:100},'beurre de cacahuète':{kcal:588,p:25,c:20,f:50},
    'miel':{kcal:304,p:.3,c:82,f:0},'avocat':{kcal:160,p:2,c:9,f:15}
  }
  const normalizeFood=(n:string)=>n.toLowerCase().trim()
  const macroOf=(food:EditableFood):MacroMini=>{
    const base=nutritionDb[normalizeFood(food.name)]||{kcal:100,p:5,c:10,f:3}
    const factor=food.unit==='pièce'?food.qty:food.qty/100
    return {kcal:base.kcal*factor,p:base.p*factor,c:base.c*factor,f:base.f*factor}
  }
  const mealMacros=(foods:EditableFood[])=>foods.reduce((a,f)=>{const m=macroOf(f);return{kcal:a.kcal+m.kcal,p:a.p+m.p,c:a.c+m.c,f:a.f+m.f}},{kcal:0,p:0,c:0,f:0})
  const substituteMap:Record<string,string[]>={
    'skyr 0%':['Fromage blanc 0%','Yaourt grec 0%'],
    'fromage blanc 0%':['Skyr 0%','Yaourt grec 0%'],
    'fromage blanc':['Skyr 0%','Fromage blanc 0%','Yaourt grec 0%'],
    'flocons d’avoine':['Pain complet','Galettes de riz'],
    'riz basmati (cru)':['Quinoa (cru)','Pommes de terre','Patate douce'],
    'quinoa (cru)':['Riz basmati (cru)','Pommes de terre'],
    'pommes de terre':['Riz basmati (cru)','Patate douce','Quinoa (cru)'],
    'patate douce':['Pommes de terre','Riz basmati (cru)'],
    'poulet':['Dinde','Steak haché 5%','Poisson blanc'],
    'blanc de poulet':['Dinde','Steak haché 5%','Poisson blanc'],
    'cabillaud':['Poisson blanc','Poulet','Saumon'],
    'poisson blanc':['Cabillaud','Poulet','Saumon'],
    'saumon':['Cabillaud','Poisson blanc','Poulet'],
    'banane':['Pomme','Kiwi','Fruits rouges'],
    'myrtilles':['Fruits rouges','Pomme','Kiwi'],
    'fruits rouges':['Myrtilles','Pomme','Kiwi'],
    'brocolis':['Haricots verts','Légumes verts'],
    'haricots verts':['Brocolis','Légumes verts']
  }
  const substitutesFor=(name:string)=>substituteMap[normalizeFood(name)]||['Skyr 0%','Fromage blanc 0%','Poulet','Riz basmati (cru)','Pommes de terre']
  const overrideKey=(meal:DailyMeal)=>`bodyos:meal-override:${dayKey}:${sessionKey}:${meal.time}`
  const foodsFor=(meal:DailyMeal)=>appRead<EditableFood[]>(overrideKey(meal),meal.foods.map(parseEditableFood))
  const openMealEditor=(meal:DailyMeal)=>{setMealEditor(meal);setMealDraft(foodsFor(meal));setReplaceFoodIndex(null)}
  const setFoodQty=(idx:number,qty:number)=>setMealDraft(v=>v.map((f,i)=>i===idx?{...f,qty:Math.max(f.unit==='pièce'?1:5,Math.round(qty*10)/10)}:f))
  const removeFood=(idx:number)=>setMealDraft(v=>v.filter((_,i)=>i!==idx))
  const replaceFood=(idx:number,nextName:string)=>{
    setMealDraft(v=>v.map((f,i)=>{
      if(i!==idx)return f
      const oldM=macroOf(f),base=nutritionDb[normalizeFood(nextName)]||{kcal:100,p:5,c:10,f:3}
      const nextQty=f.unit==='pièce'?f.qty:Math.max(5,Math.round((oldM.kcal/Math.max(1,base.kcal))*100/5)*5)
      return {name:nextName,qty:nextQty,unit:'g'}
    }))
    setReplaceFoodIndex(null)
  }
  const saveMealComposition=()=>{
    if(!mealEditor)return
    appWrite(overrideKey(mealEditor),mealDraft)
    setRefresh(x=>x+1)
    setMealEditor(null)
  }
  const shopping=useMemo(()=>{
    const m=new Map<string,{qty:number;unit:string;category:string}>()
    for(const meal of protocol.meals)for(const f of meal.foods){
      const rawQty=String(f.qty),qty=Number((rawQty.match(/[\d.,]+/)?.[0]||'1').replace(',','.')),unit=rawQty.replace(/[\d.,\s]/g,'')||'g',n=f.name.toLowerCase()
      const category=n.match(/poulet|dinde|steak|saumon|cabillaud|œuf|thon/)?'PROTÉINES':n.match(/riz|pâte|pain|avoine|semoule|patate|galette|muesli/)?'GLUCIDES':n.match(/skyr|fromage|yaourt/)?'PRODUITS LAITIERS':n.match(/huile|miel|amande|cacahu/)?'ÉPICERIE':'FRUITS & LÉGUMES'
      const hit=m.get(f.name);if(hit)hit.qty+=qty;else m.set(f.name,{qty,unit,category})
    }
    return [...m.entries()]
  },[protocol])
  const categories=['PROTÉINES','GLUCIDES','FRUITS & LÉGUMES','PRODUITS LAITIERS','ÉPICERIE']

  const subnav=<nav className="nv8Subnav">
    <button className={tab==='dashboard'?'active':''} onClick={()=>setTab('dashboard')}>AUJOURD'HUI</button>
    <button className={tab==='programme'?'active':''} onClick={()=>setTab('programme')}>PROGRAMME</button>
    <button className={tab==='journal'?'active':''} onClick={()=>setTab('journal')}>JOURNAL</button>
    <button className={tab==='recipes'?'active':''} onClick={()=>setTab('recipes')}>RECETTES</button>
    <button className={tab==='shopping'?'active':''} onClick={()=>setTab('shopping')}>COURSES</button>
  </nav>

  return <main className="nutritionV8">
    <header className="nv8Header">
      <div><small>9:41</small><h1>{tab==='dashboard'?"Aujourd'hui":tab==='programme'?'Programme':tab==='journal'?'Journal':tab==='recipes'?'Recettes':'Courses'}</h1></div>
      <button onClick={()=>{setProfileDraft(profile);setShowProfile(true)}} aria-label="modifier profil">◎</button>
    </header>
    {subnav}

    {tab==='dashboard'&&<>
      <section className="nv8GoalCard" onClick={()=>{setProfileDraft(profile);setShowProfile(true)}}>
        <div className="nv8GoalIcon">◎</div>
        <div className="nv8GoalText"><small>OBJECTIF</small><strong>{goalLabel[profile.goal]}</strong></div>
        <div className="nv8Weight"><b>{fmt(profile.weight)} kg</b><span>→</span><b>{fmt(profile.targetWeight)} kg</b><small>Modifier ›</small></div>
      </section>

      <section className="nv8Calories">
        <div className="nv8CalCopy"><small>CIBLE CALORIQUE DU JOUR</small><h2>{profile.currentCalories.toLocaleString('fr-FR')} <em>kcal</em></h2><span className={delta===0?'optimal':'adjust'}>{delta===0?'✓ Trajectoire optimale':'✦ Ajustement recommandé'}</span></div>
        <div className="nv8Ring" style={{background:`conic-gradient(#31e8a2 ${pct}%,rgba(76,100,119,.28) 0)`}}><div><b>{Math.round(totals.kcal)}</b><small>consommées</small><strong>{Math.round(remaining)}</strong><small>restantes</small></div></div>
      </section>

      <section className="nv8MacroGrid">
        <article><span>Protéines</span><b>{Math.round(totals.protein)}<small> / {profile.proteinTarget} g</small></b><i><u style={{width:`${Math.min(100,totals.protein/profile.proteinTarget*100)}%`}}/></i></article>
        <article><span>Glucides</span><b>{Math.round(totals.carbs)}<small> / {carbsTarget} g</small></b><i><u style={{width:`${Math.min(100,totals.carbs/Math.max(1,carbsTarget)*100)}%`}}/></i></article>
        <article><span>Lipides</span><b>{Math.round(totals.fat)}<small> / {profile.fatTarget} g</small></b><i><u style={{width:`${Math.min(100,totals.fat/profile.fatTarget*100)}%`}}/></i></article>
      </section>

      <button className="nv8AdaptiveCard" onClick={()=>setShowAdaptive(true)}>
        <header><div><span>ADAPTIVE CALORIE ENGINE</span><i>ⓘ</i></div><b>Détails ›</b></header>
        <div className="nv8Trend">
          <div className="nv8Spark">
            {linePoints.map((p,i)=>{const min=Math.min(...linePoints.map(x=>x.weight)),max=Math.max(...linePoints.map(x=>x.weight));const y=46-((p.weight-min)/Math.max(.1,max-min))*26;return <span key={i} style={{left:`${8+i*(84/Math.max(1,linePoints.length-1))}%`,top:`${y}%`}}/>})}
            <i/>
          </div>
          <div><small>Tendance 14 jours</small><strong>{trend>0?'+':''}{trend.toFixed(1).replace('.',',')} kg / semaine</strong><small>Trajectoire de sèche cible</small><b>{targetTrend.toFixed(1).replace('.',',')} kg / semaine</b><em>{delta===0?'✓ Dans la zone optimale':'✦ À optimiser'}</em></div>
        </div>
      </button>

      <section className="nv8BottomCards">
        <article className="nv8Hydration"><header><span>💧 HYDRATATION</span><b>›</b></header><div><span>▰ ▰ ▰ ▰ ▱</span><small>1,8 / 2,5 L</small><button>＋</button></div></article>
        <article className="nv8Score"><span>SCORE DU JOUR</span><div><b>{score}</b><small>{score>=85?'Excellent':'Bien'}</small></div></article>
      </section>

      <section className="nv8Launchers">
        <button onClick={()=>setTab('programme')}><span>01</span><div><b>Programme nutritionnel</b><small>Ton plan, clair et flexible</small></div><em>›</em></button>
        <button onClick={()=>setTab('journal')}><span>02</span><div><b>Journal nutritionnel</b><small>Saisis, visualise, comprends</small></div><em>›</em></button>
        <button onClick={()=>setTab('recipes')}><span>03</span><div><b>Recettes intelligentes</b><small>Adaptées à tes macros</small></div><em>›</em></button>
        <button onClick={()=>setTab('shopping')}><span>04</span><div><b>Courses automatiques</b><small>Générées depuis ton plan</small></div><em>›</em></button>
      </section>
    </>}

    {tab==='programme'&&<section className="nv8Page">
      <div className="nv8PageTop"><div className="nv8Modes">
        <button className={programmeView==='meals'?'active':''} onClick={()=>setProgrammeView('meals')}>Repas</button>
        <button className={programmeView==='overview'?'active':''} onClick={()=>setProgrammeView('overview')}>Vue d'ensemble</button>
        <button onClick={()=>{setProfileDraft(profile);setShowProfile(true)}}>Réglages</button>
      </div></div>
      <button className="nv8DayBanner" onClick={()=>setTab('dashboard')}><div><small>JOUR TYPE • ENTRAÎNEMENT</small><b>{profile.currentCalories} kcal · {profile.proteinTarget}P / {carbsTarget}G / {profile.fatTarget}L</b></div><span>›</span></button>
      <div className="nv82InfoStrip"><span>✦</span><p><b>Programme prescrit</b><small>Tu peux modifier chaque quantité ou remplacer un aliment. BODY OS recalcule le repas.</small></p></div>
      {programmeView==='meals'?<>
      <div className="nv8MealList">{protocol.meals.map((meal,idx)=>{
        const entry=entries.find(e=>e.id===`programme:${dayKey}:${meal.time}`)
        const foods=foodsFor(meal)
        const mm=mealMacros(foods)
        return <article className="nv8MealRow nv82MealRow" key={meal.time}>
          <button className="nv82MealImage" onClick={()=>openMealEditor(meal)}><img src={photoFor(idx)} alt=""/><span>MODIFIER</span></button>
          <div className="nv8MealMain"><div className="nv8MealTitleBlock"><small>{mealMoment(meal.time).label} • {meal.time}</small><h3>{meal.title}</h3><span>{Math.round(mm.kcal)} kcal</span></div><div className="nv8MealNumbers"><b>{Math.round(mm.p)}P</b><small>{Math.round(mm.c)}G · {Math.round(mm.f)}L</small></div></div>
          <div className="nv82FoodPreview">
            {foods.map((f,fi)=><button key={`${f.name}-${fi}`} onClick={()=>openMealEditor(meal)}><span>{foodIcon(f.name)}</span><div><b>{f.name}</b><small>{fmt(f.qty)} {f.unit}</small></div><em>›</em></button>)}
          </div>
          <div className="nv8MealButtons"><button aria-label="Marquer comme consommé" className={entry?.status==='consumed'?'done':''} onClick={()=>saveMeal(meal,'consumed')}>✓</button><button className="adjust" onClick={()=>openMealEditor(meal)}>AJUSTER LE REPAS</button><button aria-label="Marquer comme non consommé" onClick={()=>saveMeal(meal,'skipped')}>×</button></div>
        </article>
      })}</div>
      </>:<section className="nv84Overview">
        <div className="nv84OverviewHero">
          <div><small>VUE D'ENSEMBLE</small><h3>{profile.currentCalories} kcal</h3><span>{profile.proteinTarget}P · {carbsTarget}G · {profile.fatTarget}L</span></div>
          <div className="nv84OverviewBadge"><b>{protocol.meals.length}</b><small>repas</small></div>
        </div>
        <div className="nv84OverviewGrid">
          {protocol.meals.map((meal,idx)=>{
            const foods=foodsFor(meal)
            const mm=mealMacros(foods)
            return <button key={meal.time} onClick={()=>{setProgrammeView('meals');setTimeout(()=>openMealEditor(meal),0)}}>
              <img src={photoFor(idx)} alt=""/>
              <div className="nv84OverviewCopy">
                <small>{mealMoment(meal.time).label} • {meal.time}</small>
                <b>{meal.title}</b>
                <span>{foods.slice(0,4).map(f=>`${f.name} ${fmt(f.qty)}${f.unit}`).join(' · ')}</span>
              </div>
              <div className="nv84OverviewMacros"><b>{Math.round(mm.kcal)} kcal</b><small>{Math.round(mm.p)}P · {Math.round(mm.c)}G · {Math.round(mm.f)}L</small></div>
              <em>›</em>
            </button>
          })}
        </div>
      </section>}
      <button className="nv8Primary">＋ Ajouter un repas</button>
    </section>}

    {tab==='journal'&&<section className="nv8Page">
      <div className="nv8JournalTop"><article><b>{Math.round(totals.kcal)}</b><small>kcal consommées</small></article><article><b>{Math.round(remaining)}</b><small>restantes</small></article><article><b>{score}</b><small>score</small></article></div>
      <div className="nv8JournalTimeline">{entries.length===0?<div className="nv8Empty">Aucun repas enregistré aujourd'hui.</div>:entries.sort((a,b)=>a.time.localeCompare(b.time)).map((e,i)=><article key={e.id}>
        <div className="nv8JournalLine"><span>{i+1}</span></div><img src={photoFor(i)} alt=""/><div><small>{e.time}</small><h3>{e.meal}</h3><p>{Math.round(e.kcal)} kcal · {Math.round(e.protein)}P · {Math.round(e.carbs)}G · {Math.round(e.fat)}L</p></div><button onClick={()=>deleteEntry(e.id)}>•••</button>
      </article>)}</div>
      <button className="nv8FreeEntry"><div><span>⌁</span><p><b>Saisie libre</b><small>Ajouter un aliment ou un repas</small></p></div><strong>＋</strong></button>
    </section>}

    {tab==='recipes'&&<section className="nv8Page">
      <div className="nv8RecipeSearch"><span>⌕</span><input value={recipeSearch} onChange={e=>setRecipeSearch(e.target.value)} placeholder="Rechercher une recette…"/></div>
      <div className="nv8RecipeFilters">{(['TOUT','PETIT-DÉJEUNER','PLAT','DESSERT','RAPIDE','HIGH PROTEIN'] as const).map(f=><button key={f} className={recipeFilter===f?'active':''} onClick={()=>setRecipeFilter(f)}>{f}</button>)}</div>
      <div className="nv8RecipeGrid">{filteredRecipes.slice(0,40).map((r,i)=><article key={r.id} onClick={()=>setShowRecipe(r)}><div className="nv8RecipePhoto"><img src={photoFor(i)} alt=""/><button onClick={e=>{e.stopPropagation();toggleFavorite(r.id)}}>{favorites.includes(r.id)?'♥':'♡'}</button></div><div className="nv8RecipeCopy"><small>{r.prep} min · {r.category}</small><h3>{r.title}</h3><p><b>{r.kcal} kcal</b><span>{r.protein}P · {r.carbs}G · {r.fat}L</span></p></div></article>)}</div>
    </section>}

    {tab==='shopping'&&<section className="nv8Page">
      <div className="nv8ShopSummary"><div><small>CETTE SEMAINE</small><h2>{shopping.length} / {shopping.length+12} <span>articles</span></h2></div><div className="nv8ShopRing">67%</div></div>
      <div className="nv8ShopModes"><button className="active">Par catégories</button><button>Par recettes</button></div>
      {categories.map(cat=>{const its=shopping.filter(([,v])=>v.category===cat);return its.length?<section className="nv8ShopCat" key={cat}><header><div><h3>{cat}</h3><small>{its.length} articles</small></div><span>⌃</span></header>{its.map(([name,v])=><label key={name}><input type="checkbox"/><span>{name}</span><b>{fmt(v.qty)} {v.unit}</b></label>)}</section>:null})}
      <button className="nv8Primary">↗ Partager la liste</button>
    </section>}

    {showProfile&&<div className="nv87Overlay" onClick={()=>setShowProfile(false)}>
      <section className="nv87Sheet" onClick={e=>e.stopPropagation()}>
        <header className="nv87Header">
          <button onClick={()=>setShowProfile(false)} aria-label="Fermer">×</button>
          <div><small>PROFIL & OBJECTIF</small><b>Adapte BODY OS à toi.</b></div>
          <span/>
        </header>
        <div className="nv87Body">
          <div className="nv87GoalChoices">{(['CUT','RECOMP','MAINTAIN','GAIN'] as Goal[]).map(g=><button className={profileDraft.goal===g?'active':''} onClick={()=>setProfileDraft({...profileDraft,goal:g,weeklyTargetKg:g==='CUT'?-0.5:g==='GAIN'?0.25:0})} key={g}>{goalLabel[g]}</button>)}</div>
          {profileDraft.goal==='CUT'&&<section className="nv89SecheIntent">
            <span>OBJECTIF SÈCHE</span>
            <b>Réduire la masse grasse en préservant au maximum les muscles et les performances.</b>
            <small>BODY OS pilotera la progression avec le poids, le tour de taille, la performance, la récupération et l'adhérence alimentaire.</small>
          </section>}
          <label className="nv87Field"><span>Poids actuel</span><div><input type="number" step="0.1" value={profileDraft.weight} onChange={e=>setProfileDraft({...profileDraft,weight:Number(e.target.value)})}/><b>kg</b></div></label>
          <label className="nv87Field"><span>Poids cible</span><div><input type="number" step="0.1" value={profileDraft.targetWeight} onChange={e=>setProfileDraft({...profileDraft,targetWeight:Number(e.target.value)})}/><b>kg</b></div></label>
          <label className="nv87Field nv881Derived"><span>Cible calorique calculée</span><div><input type="number" readOnly value={calculatedProfileTarget.target}/><b>kcal</b></div></label>
          <div className="nv881CalcPreview"><span>Poids {fmt(profileDraft.weight)} kg</span><span>{profileDraft.activity==='low'?'activité faible':profileDraft.activity==='high'?'activité élevée':'activité modérée'}</span><span>{goalLabel[profileDraft.goal]}</span></div>
          <button className="nv88WhyButton" onClick={()=>setShowCalorieExplain(true)}>ⓘ Pourquoi {calculatedProfileTarget.target} kcal ?</button>
          <p className="nv87Hint">Le poids enregistré aujourd'hui alimente la tendance utilisée par l'Adaptive Calorie Engine.</p>
        </div>
        <footer className="nv87Footer">
          <button onClick={()=>setShowProfile(false)}>ANNULER</button>
          <button className="primary" onClick={saveProfile}>ENREGISTRER</button>
        </footer>
      </section>
    </div>}

    {showCalorieExplain&&<div className="nv88Overlay" onClick={()=>setShowCalorieExplain(false)}>
      <section className="nv88Sheet" onClick={e=>e.stopPropagation()}>
        <header className="nv88Header">
          <button onClick={()=>setShowCalorieExplain(false)} aria-label="Fermer">×</button>
          <div><small>TA CIBLE EXPLIQUÉE</small><b>Pourquoi {calculatedInitial} kcal ?</b></div>
          <span/>
        </header>

        <div className="nv88Body">
          <section className="nv88Hero">
            <small>CIBLE ACTUELLE</small>
            <strong>{calculatedInitial.toLocaleString('fr-FR')} kcal</strong>
            <span>{goalLabel[profile.goal]} · {fmt(profile.weight)} kg → {fmt(profile.targetWeight)} kg</span>
          </section>

          <section className="nv88Calc">
            <h3>1. Estimation de départ</h3>
            <div><span>Métabolisme de base</span><b>{bmr.toLocaleString('fr-FR')} kcal</b></div>
            <small>Mifflin-St Jeor · {profile.sex==='male'?'homme':'femme'} · {profile.age} ans · {profile.heightCm} cm · {fmt(profile.weight)} kg</small>
            <div><span>Facteur d'activité</span><b>× {activityFactor.toFixed(2).replace('.',',')}</b></div>
            <small>{profile.activity==='low'?'activité faible':profile.activity==='high'?'activité élevée':'activité modérée'}</small>
            <div className="total"><span>Dépense quotidienne estimée</span><b>{maintenance.toLocaleString('fr-FR')} kcal</b></div>
          </section>

          <section className="nv88Calc">
            <h3>2. Ajustement selon l'objectif de sèche</h3>
            <div><span>Objectif</span><b>{goalLabel[profile.goal]}</b></div>
            <div><span>{profile.goal==='CUT'?'Déficit de sèche appliqué':profile.goal==='GAIN'?'Surplus appliqué':'Ajustement'}</span><b>{goalAdjustment>0?'+ ':goalAdjustment<0?'− ':''}{Math.abs(goalAdjustment)} kcal</b></div>
            <small>Basé sur {Math.abs(targetWeeklyKg).toFixed(2).replace('.',',')} kg / semaine</small>
            <div className="total"><span>Cible initiale calculée</span><b>{calculatedInitial.toLocaleString('fr-FR')} kcal</b></div>
          </section>

          <section className="nv88Calc">
            <h3>3. Validation par tes données réelles</h3>
            <div><span>Tendance observée</span><b>{trend>0?'+':''}{trend.toFixed(2).replace('.',',')} kg / semaine</b></div>
            <div><span>Trajectoire de sèche cible</span><b>{targetTrend.toFixed(2).replace('.',',')} kg / semaine</b></div>
            <div className={delta===0?'nv88Status ok':'nv88Status adjust'}>
              <span>{delta===0?'✓':'✦'}</span>
              <div><b>{delta===0?'Trajectoire cohérente':'Ajustement recommandé'}</b><small>{delta===0?`${calculatedInitial} kcal calculées pour ce profil`:`Nouvelle cible proposée : ${recommended} kcal`}</small></div>
            </div>
          </section>

          <section className="nv88Method">
            <h3>Méthode BODY OS</h3>
            <p>La formule sert seulement de point de départ. BODY OS réévalue ensuite la cible avec la tendance réelle du poids afin d'éviter de figer une estimation théorique.</p>
          </section>
        </div>

        <footer className="nv88Footer">
          <button onClick={()=>setShowCalorieExplain(false)}>FERMER</button>
          {delta!==0&&<button className="primary" onClick={()=>{const next={...profile,currentCalories:recommended};setProfile(next);setProfileDraft(next);appWrite('bodyos:adaptive-profile',next);setShowCalorieExplain(false)}}>APPLIQUER {recommended} KCAL</button>}
        </footer>
      </section>
    </div>}

    {showAdaptive&&<div className="nv87Overlay" onClick={()=>setShowAdaptive(false)}>
      <section className="nv87Sheet" onClick={e=>e.stopPropagation()}>
        <header className="nv87Header">
          <button onClick={()=>setShowAdaptive(false)} aria-label="Fermer">×</button>
          <div><small>ADAPTIVE CALORIE ENGINE</small><b>{delta===0?'Tout est sous contrôle':'BODY OS recommande'}</b></div>
          <span/>
        </header>
        <div className="nv87Body">
          {delta===0?<div className="nv87Ok">✓ Aucune modification nécessaire</div>:<>
            <div className="nv87Recommendation"><small>NOUVELLE CIBLE</small><b>{recommended.toLocaleString('fr-FR')} kcal</b><span>{delta>0?'+':''}{delta} kcal / jour</span></div>
            <p className="nv87Hint">La tendance observée s'écarte de la trajectoire de sèche visée.</p>
            <div className="nv87Compare"><div><span>Tendance actuelle</span><b>{trend.toFixed(2).replace('.',',')} kg / semaine</b></div><div><span>Trajectoire de sèche cible</span><b>{targetTrend.toFixed(2).replace('.',',')} kg / semaine</b></div></div>
          </>}
          <div className="nv87Impact"><h3>Impact de ce changement</h3><div><span>Calories</span><b>{profile.currentCalories} → {recommended} kcal</b></div><div><span>Protéines</span><b>{profile.proteinTarget} g</b></div><div><span>Menus & recettes</span><b>recalculés</b></div></div>
        </div>
        <footer className="nv87Footer">
          <button onClick={()=>setShowAdaptive(false)}>{delta===0?'FERMER':'PLUS TARD'}</button>
          {delta!==0&&<button className="primary" onClick={()=>{const next={...profile,currentCalories:recommended};setProfile(next);setProfileDraft(next);appWrite('bodyos:adaptive-profile',next);setShowAdaptive(false)}}>APPLIQUER</button>}
        </footer>
      </section>
    </div>}

    {mealEditor&&<div className="nv86Overlay" onClick={()=>setMealEditor(null)}>
      <section className="nv86Sheet nv86MealSheet" onClick={e=>e.stopPropagation()}>
        <header className="nv86Header">
          <button onClick={()=>setMealEditor(null)} aria-label="Fermer">×</button>
          <div><small>COMPOSITION DU REPAS</small><b>{mealEditor.title}</b></div>
          <span/>
        </header>

        <div className="nv86Body">
          <div className="nv86MealSummary">{(()=>{const m=mealMacros(mealDraft);return <>
            <article><b>{Math.round(m.kcal)}</b><small>kcal</small></article>
            <article><b>{Math.round(m.p)}P</b><small>protéines</small></article>
            <article><b>{Math.round(m.c)}G</b><small>glucides</small></article>
            <article><b>{Math.round(m.f)}L</b><small>lipides</small></article>
          </>})()}</div>

          <p className="nv86Hint">Modifie une quantité, remplace un aliment ou supprime-le. Les calories et macros sont recalculées immédiatement.</p>

          <div className="nv86FoodList">
            {mealDraft.map((f,i)=><article key={`${f.name}-${i}`} className="nv86FoodCard">
              <div className="nv86FoodTop">
                <span className="nv86FoodIcon">{foodIcon(f.name)}</span>
                <div><b>{f.name}</b><small>{Math.round(macroOf(f).kcal)} kcal</small></div>
                <button className="nv86More" aria-label="Options">•••</button>
              </div>

              <div className="nv86Qty">
                <button onClick={()=>setFoodQty(i,f.qty-(f.unit==='pièce'?1:5))}>−</button>
                <div><b>{fmt(f.qty)}</b><small>{f.unit}</small></div>
                <button onClick={()=>setFoodQty(i,f.qty+(f.unit==='pièce'?1:5))}>＋</button>
              </div>

              <div className="nv86FoodActions">
                <button onClick={()=>setReplaceFoodIndex(i)}>REMPLACER</button>
                <button className="danger" onClick={()=>removeFood(i)}>SUPPRIMER</button>
              </div>
            </article>)}
          </div>
        </div>

        <footer className="nv86Footer">
          <button onClick={()=>setMealEditor(null)}>ANNULER</button>
          <button className="primary" onClick={saveMealComposition}>ENREGISTRER LES MODIFICATIONS</button>
        </footer>
      </section>
    </div>}

    {mealEditor&&replaceFoodIndex!==null&&mealDraft[replaceFoodIndex]&&<div className="nv86Overlay nv86OverlayFront" onClick={()=>setReplaceFoodIndex(null)}>
      <section className="nv86Sheet nv86ReplaceSheet" onClick={e=>e.stopPropagation()}>
        <header className="nv86Header">
          <button onClick={()=>setReplaceFoodIndex(null)} aria-label="Retour">‹</button>
          <div><small>REMPLACER</small><b>{mealDraft[replaceFoodIndex].name}</b></div>
          <span/>
        </header>
        <div className="nv86Body">
          <p className="nv86Hint">BODY OS propose une quantité proche des calories de l'aliment remplacé.</p>
          <div className="nv86Search"><span>⌕</span><input placeholder="Rechercher un aliment ou un équivalent…"/></div>
          <div className="nv86SubList">{substitutesFor(mealDraft[replaceFoodIndex].name).map(name=>{
            const old=mealDraft[replaceFoodIndex],oldM=macroOf(old),base=nutritionDb[normalizeFood(name)]||{kcal:100,p:5,c:10,f:3}
            const qty=Math.max(5,Math.round((oldM.kcal/Math.max(1,base.kcal))*100/5)*5)
            return <button key={name} onClick={()=>replaceFood(replaceFoodIndex,name)}>
              <span>{foodIcon(name)}</span>
              <div><b>{name}</b><small>{qty} g ≈ {Math.round(base.kcal*qty/100)} kcal</small></div>
              <em>CHOISIR</em>
            </button>
          })}</div>
        </div>
        <footer className="nv86Footer single">
          <button onClick={()=>setReplaceFoodIndex(null)}>ANNULER</button>
        </footer>
      </section>
    </div>}

    {showRecipe&&<div className="nv85RecipeOverlay" onClick={()=>setShowRecipe(null)}>
      <section className="nv85RecipeSheet" onClick={e=>e.stopPropagation()}>
        <header className="nv85RecipeHeader">
          <button onClick={()=>setShowRecipe(null)} aria-label="Fermer">×</button>
          <div><small>RECETTE INTELLIGENTE</small><b>{showRecipe.category}</b></div>
          <button aria-label="Favori" onClick={()=>toggleFavorite(showRecipe.id)}>{favorites.includes(showRecipe.id)?'♥':'♡'}</button>
        </header>
        <img className="nv85RecipeHero" src={photoFor(recipes.findIndex(r=>r.id===showRecipe.id))} alt=""/>
        <div className="nv85RecipeBody">
          <small>{showRecipe.prep} min · {showRecipe.category}</small>
          <h2>{showRecipe.title}</h2>
          <div className="nv85RecipeMacros"><b>{showRecipe.kcal}<small>kcal</small></b><span>{showRecipe.protein}P</span><span>{showRecipe.carbs}G</span><span>{showRecipe.fat}L</span></div>
          <section className="nv85RecipeSection"><h3>Ingrédients</h3>{showRecipe.ingredients.map(i=><div className="nv8Ingredient" key={i.name}><span>{i.name}</span><b>{fmt(i.qty)} {i.unit}</b></div>)}</section>
          <section className="nv85RecipeSection"><h3>Préparation</h3>{showRecipe.steps.map((st,i)=><p key={i}><b>{i+1}</b><span>{st}</span></p>)}</section>
        </div>
        <div className="nv85RecipeActions"><button>REMPLACER UN REPAS</button><button className="primary">AJOUTER AU PROGRAMME</button></div>
      </section>
    </div>}
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

      {tab==='nutrition'&&<NutritionScreen activeDay={day} onSessionChange={setDay}/>}

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
