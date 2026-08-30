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
type Recipe={id:string;title:string;category:RecipeCategory;prep:number;kcal:number;protein:number;carbs:number;fat:number;emoji:string;ingredients:RecipeIngredient[];steps:string[]}

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
]


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
  const now=new Date()
  const dayKey=`${now.getFullYear()}-${String(now.getMonth()+1).padStart(2,'0')}-${String(now.getDate()).padStart(2,'0')}`
  const weekSeed=Math.floor(new Date(now.getFullYear(),now.getMonth(),now.getDate()).getTime()/(86400000*7))
  const weekKey=`${now.getFullYear()}-W${String(weekSeed%52+1).padStart(2,'0')}`
  const currentSession=sessions[activeDay%sessions.length]
  const rawSession=(currentSession?.title||'PUSH').toUpperCase()
  const sessionId=(currentSession?.id||'push').toUpperCase()
  const sessionKey=sessionId.includes('PULL')||rawSession.includes('PULL')?'PULL'
    :sessionId.includes('LEG')||rawSession.includes('LEG')?'LEGS'
    :sessionId.includes('UPPER')||rawSession.includes('UPPER')?'UPPER'
    :sessionId.includes('LOWER')||rawSession.includes('LOWER')?'LOWER'
    :rawSession.includes('REPOS')||rawSession.includes('REST')?'RECOVERY':'PUSH'

  const [nutritionView,setNutritionView]=useState<'program'|'journal'|'recipes'|'shopping'>('program')
  const consumedKey=`bodyos:nutrition:consumed:${dayKey}`
  type MealState='planned'|'consumed'|'partial'|'skipped'
  const [consumedMeals,setConsumedMeals]=useState<Record<string,MealState>>(()=>{try{return JSON.parse(localStorage.getItem(consumedKey)||'{}')}catch{return{}}})
  const [dayClosed,setDayClosed]=useState(()=>localStorage.getItem(`bodyos:nutrition:closed:${dayKey}`)==='1')
  const overrideKey=`bodyos:nutrition:weekly-override:${weekKey}:${sessionKey}`
  const [regen,setRegen]=useState(()=>Number(localStorage.getItem(overrideKey)||0))
  const targets={kcal:2800,protein:190,fat:85,carbs:319,water:3.0}
  const journalKey=`bodyos:nutrition:${dayKey}`
  const [entries,setEntries]=useState<NutritionEntry[]>(()=>{try{return JSON.parse(localStorage.getItem(journalKey)||'[]')}catch{return[]}})
  const [water,setWater]=useState(()=>Number(localStorage.getItem(`bodyos:water:${dayKey}`)||0))
  const [editorOpen,setEditorOpen]=useState(false)
  const [editingId,setEditingId]=useState<string|null>(null)
  const [adjustingMeal,setAdjustingMeal]=useState<DailyMeal|null>(null)
  const [selectedRecipe,setSelectedRecipe]=useState<Recipe|null>(null)
  const [recipeFilter,setRecipeFilter]=useState<'TOUT'|RecipeCategory>('TOUT')
  const [shoppingTick,setShoppingTick]=useState(0)


  useEffect(()=>{
    setRegen(Number(localStorage.getItem(overrideKey)||0))
  },[overrideKey])

  const protocolRaw=buildWeeklyProtocol(sessionKey,weekSeed+regen)
  const protocol:NutritionProtocol={
    ...protocolRaw,day:dayKey,
    meals:protocolRaw.meals.map(m=>({...m,foods:m.foods.map(f=>({...f,icon:foodIcon(f.name)}))}))
  }

  const persistEntries=(next:NutritionEntry[])=>{
    setEntries(next)
    localStorage.setItem(journalKey,JSON.stringify(next))
  }
  const upsertProgrammeEntry=(meal:DailyMeal,status:'consumed'|'partial'|'skipped',foods:{name:string;plannedQty:string;actualQty:string}[],ratio=1)=>{
    const id=`programme:${dayKey}:${meal.time}`
    const factor=status==='skipped'?0:Math.max(0,Math.min(1.5,ratio))
    const entry:NutritionEntry={
      id,meal:meal.title,title:`${meal.title} • ${protocol.session}`,time:meal.time,
      kcal:Math.round(meal.kcal*factor),
      protein:Number((meal.p*factor).toFixed(1)),
      carbs:Number((meal.c*factor).toFixed(1)),
      fat:Number((meal.f*factor).toFixed(1)),
      status,source:'programme',foods
    }
    const exists=entries.some(e=>e.id===id)
    persistEntries(exists?entries.map(e=>e.id===id?entry:e):[...entries,entry])
  }
  const plannedFoods=(meal:DailyMeal)=>meal.foods.map(f=>({name:f.name,plannedQty:f.qty,actualQty:f.qty}))
  const setMealState=(meal:DailyMeal,state:MealState)=>{
    if(state==='partial'){ setAdjustingMeal(meal); return }
    const next={...consumedMeals,[meal.time]:state}
    setConsumedMeals(next);localStorage.setItem(consumedKey,JSON.stringify(next))
    if(state==='consumed') upsertProgrammeEntry(meal,'consumed',plannedFoods(meal),1)
    if(state==='skipped') upsertProgrammeEntry(meal,'skipped',meal.foods.map(f=>({name:f.name,plannedQty:f.qty,actualQty:'0'})),0)
  }
  const numberFromQty=(value:string)=>Number((value.replace(',','.').match(/\d+(?:\.\d+)?/)||['0'])[0])
  const saveAdjustedMeal=(form:HTMLFormElement)=>{
    if(!adjustingMeal)return
    const fd=new FormData(form)
    const foods=adjustingMeal.foods.map((f,i)=>({
      name:f.name,plannedQty:f.qty,actualQty:String(fd.get(`actual-${i}`)||'0')
    }))
    const ratios=foods.map(f=>{
      const planned=numberFromQty(f.plannedQty), actual=numberFromQty(f.actualQty)
      return planned>0?Math.max(0,Math.min(1.5,actual/planned)):0
    })
    const ratio=ratios.length?ratios.reduce((a,b)=>a+b,0)/ratios.length:0
    const next={...consumedMeals,[adjustingMeal.time]:'partial' as MealState}
    setConsumedMeals(next);localStorage.setItem(consumedKey,JSON.stringify(next))
    upsertProgrammeEntry(adjustingMeal,'partial',foods,ratio)
    setAdjustingMeal(null)
    setNutritionView('journal')
  }

  const totals=entries.reduce((a,e)=>({kcal:a.kcal+e.kcal,protein:a.protein+e.protein,carbs:a.carbs+e.carbs,fat:a.fat+e.fat}),{kcal:0,protein:0,carbs:0,fat:0})
  const saveEntry=(form:HTMLFormElement)=>{
    const fd=new FormData(form); const n=(k:string)=>Number(fd.get(k)||0)
    const entry:NutritionEntry={id:editingId||crypto.randomUUID(),meal:String(fd.get('meal')||'Repas'),title:String(fd.get('title')||'Aliment'),time:String(fd.get('time')||''),kcal:n('kcal'),protein:n('protein'),carbs:n('carbs'),fat:n('fat'),status:'manual',source:'manual'}
    const next=editingId?entries.map(e=>e.id===editingId?entry:e):[...entries,entry]
    persistEntries(next);setEditorOpen(false);setEditingId(null)
  }
  const removeEntry=(id:string)=>persistEntries(entries.filter(e=>e.id!==id))
  const changeWater=(d:number)=>{const n=Math.max(0,water+d);setWater(n);localStorage.setItem(`bodyos:water:${dayKey}`,String(n))}
  const regenerate=()=>{const n=regen+1;setRegen(n);localStorage.setItem(overrideKey,String(n))}
  const resolvedCount=protocol.meals.filter(m=>consumedMeals[m.time]&&consumedMeals[m.time]!=='planned').length
  const closeDay=()=>{
    if(resolvedCount<protocol.meals.length){
      alert(`Renseigne les ${protocol.meals.length-resolvedCount} repas restants avant de clôturer la journée.`); return
    }
    localStorage.setItem(`bodyos:nutrition:closed:${dayKey}`,'1');setDayClosed(true)
  }
  const statusLabel=(s?:NutritionEntry['status'])=>s==='consumed'?'CONSOMMÉ':s==='partial'?'AJUSTÉ':s==='skipped'?'NON CONSOMMÉ':'SAISIE MANUELLE'
  const pct=(value:number,max:number)=>Math.max(0,Math.min(100,Math.round(value/max*100)))
  const plannedLoggedKcal=entries.filter(e=>e.source==='programme').reduce((sum,e)=>{
    const planned=protocol.meals.find(m=>m.time===e.time)
    return sum+(planned?.kcal||0)
  },0)
  const programmeActualKcal=entries.filter(e=>e.source==='programme').reduce((sum,e)=>sum+e.kcal,0)
  const kcalDelta=Math.round(programmeActualKcal-plannedLoggedKcal)
  const calorieScore=Math.max(0,100-Math.round(Math.abs(targets.kcal-totals.kcal)/targets.kcal*100))
  const proteinScore=pct(totals.protein,targets.protein)
  const hydrationScore=pct(water,targets.water)
  const adherenceScore=Math.round(resolvedCount/protocol.meals.length*100)
  const timingScore=resolvedCount?Math.min(100,78+resolvedCount*5):0
  const nutritionScore=Math.round(calorieScore*.3+proteinScore*.3+timingScore*.15+hydrationScore*.1+adherenceScore*.15)
  const sessionChoices=sessions.map((session,i)=>({i,label:session.title.replace(' A','').replace(' + BRAS','')}))

  const weeklyProtocols=useMemo(()=>weeklySessionPlan.map((session,i)=>({
    dayIndex:i,
    session,
    protocol:buildWeeklyProtocol(session,weekSeed+i)
  })),[weekSeed])

  const generatedShopping=useMemo(()=>{
    const map=new Map<string,{name:string;qty:number;unit:string;category:RecipeIngredient['category'];days:Set<number>}>()
    const add=(name:string,qty:number,unit:string,category:RecipeIngredient['category'],dayIndex:number)=>{
      const k=`${name}|${unit}`
      const prev=map.get(k)
      if(prev){prev.qty+=qty;prev.days.add(dayIndex)}
      else map.set(k,{name,qty,unit,category,days:new Set([dayIndex])})
    }
    weeklyProtocols.forEach(({dayIndex,session,protocol:weekProtocol})=>{
      weekProtocol.meals.forEach(meal=>{
        const currentDayReplacement=dayIndex===0?entries.find(e=>e.source==='programme'&&e.time===meal.time&&e.foods?.length):undefined
        if(currentDayReplacement?.foods?.length){
          currentDayReplacement.foods.forEach(food=>{
            const parsed=parseFoodQty(food.actualQty||food.plannedQty||'0 g')
            add(food.name,parsed.qty,parsed.unit,ingredientCategory(food.name),dayIndex)
          })
        }else{
          meal.foods.forEach(food=>{
            const parsed=parseFoodQty(food.qty)
            add(food.name,parsed.qty,parsed.unit,ingredientCategory(food.name),dayIndex)
          })
        }
      })
    })
    return Array.from(map.values()).map(i=>({...i,days:Array.from(i.days).sort()}))
  },[weeklyProtocols,entries])

  const shoppingState=appRead<Record<string,'todo'|'home'|'bought'>>(`bodyos:shopping:week:${weekSeed}`,{})
  const setShoppingStatus=(name:string,status:'todo'|'home'|'bought')=>{
    const next={...shoppingState,[name]:status}
    appWrite(`bodyos:shopping:week:${weekSeed}`,next)
    setShoppingTick(v=>v+1)
  }

  const replaceMealWithRecipe=(recipe:Recipe)=>{
    const candidates=protocol.meals.map(m=>{
      const target={kcal:m.kcal,protein:m.p,carbs:m.c,fat:m.f}
      const fitted=fitRecipeToMeal(recipe,target)
      return {meal:m,fitted,score:macroDistance({kcal:fitted.kcal,protein:fitted.protein,carbs:fitted.carbs,fat:fitted.fat},target)}
    }).sort((a,b)=>a.score-b.score)
    const {meal:candidate,fitted}=candidates[0]
    const entry: NutritionEntry={
      id:`recipe:${dayKey}:${candidate.time}`,
      meal:candidate.title,
      time:candidate.time,
      title:fitted.title,
      kcal:fitted.kcal,protein:fitted.protein,carbs:fitted.carbs,fat:fitted.fat,
      status:'partial',source:'programme',
      foods:fitted.ingredients.map(i=>({name:i.name,plannedQty:`${i.qty} ${i.unit}`,actualQty:`${i.qty} ${i.unit}`}))
    }
    const without=entries.filter(e=>!(e.source==='programme'&&e.time===candidate.time))
    const next=[...without,entry]
    setEntries(next)
    appWrite(`bodyos:nutrition:${dayKey}`,next)
    localStorage.setItem(`bodyos:recipe-fit:${dayKey}:${candidate.time}`,JSON.stringify({
      recipeId:fitted.id,fitScore:fitted.fitScore,target:{kcal:candidate.kcal,p:candidate.p,c:candidate.c,f:candidate.f},
      actual:{kcal:fitted.kcal,p:fitted.protein,c:fitted.carbs,f:fitted.fat}
    }))
    setSelectedRecipe(null)
    setNutritionView('journal')
  }


  return <main className="screen nutritionScreen adaptiveNutrition">
    <header className="nutritionTopbar"><button aria-label="Menu">☰</button><div><h1>NUTRITION</h1><p>Adaptive Nutrition Engine</p></div><button aria-label="Réglages">☷</button></header>
    <div className="nutritionTabs nutritionTabsFour">
      <button className={nutritionView==='program'?'active':''} onClick={()=>setNutritionView('program')}>PROGRAMME</button>
      <button className={nutritionView==='journal'?'active':''} onClick={()=>setNutritionView('journal')}>JOURNAL</button>
      <button className={nutritionView==='recipes'?'active':''} onClick={()=>setNutritionView('recipes')}>RECETTES</button>
      <button className={nutritionView==='shopping'?'active':''} onClick={()=>setNutritionView('shopping')}>COURSES</button>
    </div>
    <section className="nutritionSessionSwitch glass">
      <div><small>SÉANCE DU JOUR</small><b>{protocol.session}</b></div>
      <div className="nutritionSessionChoices">
        {sessionChoices.map(choice=><button key={choice.i} className={choice.i===activeDay%sessions.length?'active':''} onClick={()=>onSessionChange(choice.i)}>{choice.label}</button>)}
      </div>
    </section>

    {nutritionView==='program'&&<>
      <section className="protocolHero glass">
        <div><small>✦ TODAY'S NUTRITION PROTOCOL</small><strong>2 800 <em>KCAL</em></strong><b>{protocol.mode} • {protocol.session}</b><span>Rotation hebdo • {weekKey}</span></div>
        <div className="adaptColumn"><div className="adaptScore"><i>{protocol.score}</i><small>OPTIMAL</small></div><div className="adaptSignals"><span>⚡ ÉNERGIE <b>✓</b></span><span>▥ MACROS <b>✓</b></span><span>◷ TIMING <b>✓</b></span></div></div>
      </section>
      <section className="macroStrip glass">
        <div><b>2 800</b><small>KCAL</small></div><div><b>190 g</b><small>PROTÉINES</small></div><div><b>319 g</b><small>GLUCIDES</small></div><div><b>85 g</b><small>LIPIDES</small></div>
      </section>
      <section className="mealTimeline">
        {protocol.meals.map((m,i)=>{const moment=mealMoment(m.time);return <article className={`adaptiveMeal glass ${moment.tone}`} key={m.time}>
          <div className="mealMoment"><strong>{m.time}</strong><i>{moment.icon}</i><small>{moment.label==='SUNSET'?'SOIR':moment.label}</small></div>
          <div className="mealBody"><header><b>0{i+1} • {m.title}</b><span>≈ {m.kcal} kcal</span></header>
          <div className="mealStateBar">
            <button className={consumedMeals[m.time]==='consumed'?'active consumed':''} onClick={()=>setMealState(m,'consumed')}>✓ CONSOMMÉ</button>
            <button className={consumedMeals[m.time]==='partial'?'active partial':''} onClick={()=>setMealState(m,'partial')}>✎ AJUSTER</button>
            <button className={consumedMeals[m.time]==='skipped'?'active skipped':''} onClick={()=>setMealState(m,'skipped')}>× NON CONSOMMÉ</button>
          </div>
          <div className="mealContent"><div className="foodList">{m.foods.map(f=><div className="foodRow" key={f.name}><span className="foodThumb">{f.icon}</span><span className="foodName">{f.name}</span><b>{f.qty}</b></div>)}</div>
          <div className="mealMacroViz"><div className="macroDonut"></div><span>P <b>{m.p}g</b></span><span>G <b>{m.c}g</b></span><span>L <b>{m.f}g</b></span></div></div>
          </div>
        </article>})}
      </section>
      <section className="dailyMemory glass">
        <div><small>DAILY MEMORY</small><b>{resolvedCount}/{protocol.meals.length} repas renseignés</b><span>{dayClosed?'Journée clôturée ✓':'Tous les repas doivent être qualifiés'}</span></div>
        <button disabled={dayClosed} onClick={closeDay}>{dayClosed?'ARCHIVÉE ✓':'CLÔTURER LA JOURNÉE'}</button>
      </section>
      <section className="whyPlan glass"><header><b>◈ POURQUOI CE PLAN AUJOURD'HUI ?</b><span>AI RATIONALE</span></header><div>{protocol.why.map((w,i)=><article key={w}>{i===0?'🏋️':i===1?'📈':'🧠'} <b>{i===0?`Séance ${protocol.session}`:i===1?'Objectif cut':'Rotation'}</b><small>{w}</small></article>)}</div></section>
      <section className="recipeIdeas glass">
        <header><div><small>✦ INSPIRATION DU JOUR</small><b>RECETTES PROTÉINÉES</b></div><button onClick={()=>setNutritionView('recipes')}>VOIR TOUT</button></header>
        <div className="recipeCards">
          <article><div className="recipeVisual">🥞</div><small>PETIT-DÉJEUNER</small><b>Pancakes protéinés</b><span>≈ 520 kcal • P 42 g</span><button onClick={()=>setSelectedRecipe(recipes.find(r=>r.id==='protein-pancakes')||null)}>VOIR LA RECETTE</button></article>
          <article><div className="recipeVisual">🍲</div><small>PLAT</small><b>Chicken bowl</b><span>≈ 690 kcal • P 55 g</span><button onClick={()=>setSelectedRecipe(recipes.find(r=>r.id==='chicken-bowl')||null)}>VOIR LA RECETTE</button></article>
          <article><div className="recipeVisual">🍰</div><small>DESSERT</small><b>Cheesecake skyr</b><span>≈ 280 kcal • P 26 g</span><button onClick={()=>setSelectedRecipe(recipes.find(r=>r.id==='skyr-cheesecake')||null)}>VOIR LA RECETTE</button></article>
        </div>
      </section>
      <div className="nutritionActions"><button onClick={regenerate}>↻ AUTRE MENU POUR {protocol.session}</button><button onClick={()=>setNutritionView('journal')}>✓ OUVRIR LE JOURNAL</button></div>
    </>}

    {nutritionView==='journal'&&<>
      <section className="journalCockpit glass">
        <div className="journalCalorieRing" style={{'--journal-pct':`${pct(totals.kcal,targets.kcal)*3.6}deg`} as React.CSSProperties}>
          <div><strong>{Math.round(totals.kcal)}</strong><span>/ {targets.kcal}</span><small>kcal</small></div>
        </div>
        <div className="journalCalorieCopy"><small>CALORIES</small><b>{Math.round(totals.kcal)} <span>kcal consommées</span></b><strong>{Math.max(0,targets.kcal-Math.round(totals.kcal))} <span>kcal restantes</span></strong></div>
        <div className="journalMacroBars">
          {[
            ['PROTÉINES',totals.protein,targets.protein,'#9a75ff'],
            ['GLUCIDES',totals.carbs,targets.carbs,'#46a8ff'],
            ['LIPIDES',totals.fat,targets.fat,'#f5ad43']
          ].map(([label,value,max,color])=><div key={String(label)}><small>{label}</small><b>{Math.round(Number(value))} / {max} g <em>{pct(Number(value),Number(max))}%</em></b><i><span style={{width:`${pct(Number(value),Number(max))}%`,background:String(color)}}/></i></div>)}
        </div>
      </section>

      <button className="nutritionAddPrimary" onClick={()=>{setEditingId(null);setEditorOpen(true)}}>＋ SAISIR UN REPAS / ALIMENT</button>

      <section className="journalTimeline">
        <div className="journalTodayLabel">✦ AUJOURD'HUI</div>
        {protocol.meals.map((meal,i)=>{
          const entry=entries.find(e=>e.source==='programme'&&e.time===meal.time)
          const moment=mealMoment(meal.time)
          const actual=entry?.kcal
          const delta=entry?Math.round(entry.kcal-meal.kcal):0
          return <article className={`journalTimelineRow ${entry?.status||'planned'}`} key={meal.time}>
            <div className="journalTimeRail"><span>{meal.time}</span><i>{moment.icon}</i></div>
            <div className="journalMealCard glass">
              <header><div><b>{meal.title} • {protocol.session}</b><small>{entry?`${meal.time} • enregistré`:`Planifié • ≈ ${meal.kcal} kcal`}</small></div><span>{entry?`${actual} kcal`:'— kcal'}</span></header>
              <div className={`journalStatus ${entry?.status||'planned'}`}>{entry?statusLabel(entry.status):'À RENSEIGNER'}</div>
              {entry?<div className="plannedActualGrid">
                <div><small>PRÉVU</small><b>{meal.kcal} kcal</b><span>P {meal.p} g</span><span>G {meal.c} g</span><span>L {meal.f} g</span></div>
                <div><small>RÉEL</small><b>{entry.kcal} kcal</b><span>P {entry.protein} g</span><span>G {entry.carbs} g</span><span>L {entry.fat} g</span></div>
                <div className={delta>0?'positiveDelta':delta<0?'negativeDelta':''}><small>ÉCART</small><b>{delta>0?'+':''}{delta} kcal</b><span>{entry.protein-meal.p>=0?'+':''}{Math.round(entry.protein-meal.p)} g P</span><span>{entry.carbs-meal.c>=0?'+':''}{Math.round(entry.carbs-meal.c)} g G</span><span>{entry.fat-meal.f>=0?'+':''}{Math.round(entry.fat-meal.f)} g L</span></div>
              </div>:<div className="plannedMealPreview">{meal.foods.map(food=><span key={food.name}><i>{food.icon}</i><b>{food.name}</b></span>)}</div>}
              {entry?.foods&&<div className="journalFoodThumbs">{entry.foods.map(food=><span key={food.name}><i>{foodIcon(food.name)}</i><small>{food.actualQty}</small></span>)}</div>}
            </div>
          </article>
        })}
      </section>

      {kcalDelta!==0&&<section className="nutritionAdaptation glass">
        <div><small>ADAPTATION DISPONIBLE</small><b>{kcalDelta>0?`+${kcalDelta}`:kcalDelta} kcal vs protocole enregistré</b><span>BODY OS peut tenir compte de cet écart pour le reste de la journée sans modifier les repas déjà consommés.</span></div>
        <button onClick={()=>alert(`Écart actuel : ${kcalDelta>0?'+':''}${kcalDelta} kcal. Le moteur d'adaptation alimentaire complet arrive dans la prochaine couche fonctionnelle.`)}>ADAPTER LE RESTE DE MA JOURNÉE ›</button>
      </section>}

      <section className="journalBottomGrid">
        <section className="glass hydrationCard compactHydration"><div><small>HYDRATATION</small><b>{water.toFixed(2)} L / {targets.water.toFixed(1)} L</b></div><div className="waterActions"><button onClick={()=>changeWater(-.25)}>− 250 ml</button><button onClick={()=>changeWater(.25)}>+ 250 ml</button></div></section>
        <section className="glass nutritionScoreCard"><div className="nutritionScoreRing" style={{'--score-pct':`${nutritionScore*3.6}deg`} as React.CSSProperties}><b>{nutritionScore}</b></div><div><small>NUTRITION SCORE</small><span><i/>Calories <b>{calorieScore}</b></span><span><i/>Protéines <b>{proteinScore}</b></span><span><i/>Timing <b>{timingScore}</b></span><span><i/>Hydratation <b>{hydrationScore}</b></span><span><i/>Adhérence <b>{adherenceScore}</b></span></div></section>
      </section>
    </>}


    {nutritionView==='recipes'&&<>
      <section className="recipeHero glass">
        <div><small>BODY OS RECIPE ENGINE</small><h2>Recettes compatibles avec ton protocole</h2><p>Choisis une recette selon ton envie. BODY OS te montre ses macros et peut la rattacher au repas du jour le plus proche.</p></div>
        <div className="recipeHeroScore"><b>{protocol.session}</b><span>{protocol.kcal} kcal</span></div>
      </section>
      <div className="recipeFilters">
        {(['TOUT','PETIT-DÉJEUNER','PLAT','DESSERT','RAPIDE','HIGH PROTEIN'] as const).map(f=><button key={f} className={recipeFilter===f?'active':''} onClick={()=>setRecipeFilter(f)}>{f}</button>)}
      </div>
      <section className="recipeCatalog">
        {recipes.filter(r=>recipeFilter==='TOUT'||r.category===recipeFilter).map(recipe=><article className="recipeCatalogCard glass" key={recipe.id}>
          <div className="recipeVisual">{recipe.emoji}</div>
          <div className="recipeCatalogContent">
            <small>{recipe.category}</small><h3>{recipe.title}</h3>
            <p>⏱ {recipe.prep} min · {recipe.kcal} kcal · P {recipe.protein} g</p>
            <div className="recipeMacroMini"><span>G {recipe.carbs} g</span><span>L {recipe.fat} g</span></div>
            <button onClick={()=>setSelectedRecipe(recipe)}>VOIR LA RECETTE ›</button>
          </div>
        </article>)}
      </section>
    </>}

    {nutritionView==='shopping'&&<>
      <section className="shoppingHero glass">
        <div><small>LISTE DE COURSES</small><h2>Courses • semaine complète</h2><p>7 jours agrégés : PUSH, PULL, LEGS, UPPER, LOWER + 2 jours récupération. La journée en cours tient compte des recettes remplacées.</p></div>
        <div><b>{generatedShopping.length}</b><span>articles / 7 j</span></div>
      </section>
      <section className="shoppingProgress glass">
        <div><small>PROGRESSION</small><b>{generatedShopping.filter(i=>shoppingState[i.name]==='bought'||shoppingState[i.name]==='home').length} / {generatedShopping.length} couverts</b></div>
        <i><span style={{width:`${generatedShopping.length?Math.round(generatedShopping.filter(i=>shoppingState[i.name]==='bought'||shoppingState[i.name]==='home').length/generatedShopping.length*100):0}%`}}/></i>
      </section>
      <section className="shoppingGroups">
        {(['PROTÉINES','FÉCULENTS','FRUITS & LÉGUMES','PRODUITS LAITIERS','ÉPICERIE'] as const).map(cat=>{
          const items=generatedShopping.filter(i=>i.category===cat)
          if(!items.length)return null
          return <article className="shoppingGroup glass" key={cat}>
            <header><b>{cat}</b><span>{items.length}</span></header>
            {items.map(item=>{
              const state=shoppingState[item.name]||'todo'
              return <div className={`shoppingRow ${state}`} key={`${item.name}-${shoppingTick}`}>
                <div><b>{item.name}</b><small>{Math.round(item.qty*10)/10} {item.unit} · {item.days.length} j</small><em className="shoppingDayDots">{item.days.map(d=><i key={d}>{['L','M','M','J','V','S','D'][d]}</i>)}</em></div>
                <div className="shoppingActions">
                  <button className={state==='home'?'active':''} onClick={()=>setShoppingStatus(item.name,'home')}>MAISON</button>
                  <button className={state==='bought'?'active':''} onClick={()=>setShoppingStatus(item.name,'bought')}>ACHETÉ</button>
                  {(state==='home'||state==='bought')&&<button onClick={()=>setShoppingStatus(item.name,'todo')}>↺</button>}
                </div>
              </div>
            })}
          </article>
        })}
      </section>
    </>}

    {selectedRecipe&&<div className="recipeModalBackdrop" onClick={()=>setSelectedRecipe(null)}>
      <section className="recipeModal glass" onClick={e=>e.stopPropagation()}>
        <button className="recipeClose" onClick={()=>setSelectedRecipe(null)}>×</button>
        <div className="recipeModalVisual">{selectedRecipe.emoji}</div>
        <small>{selectedRecipe.category}</small>
        <h2>{selectedRecipe.title}</h2>
        <div className="recipeStats">
          <span><b>{selectedRecipe.prep}</b><small>min</small></span>
          <span><b>{selectedRecipe.kcal}</b><small>kcal</small></span>
          <span><b>{selectedRecipe.protein}</b><small>P g</small></span>
          <span><b>{selectedRecipe.carbs}</b><small>G g</small></span>
          <span><b>{selectedRecipe.fat}</b><small>L g</small></span>
        </div>
        <div className="recipeFitInfo">
          <b>MACRO FIT</b>
          <span>BODY OS ajuste les quantités ingrédient par ingrédient puis choisit le repas du jour offrant la meilleure correspondance calories / protéines / glucides / lipides.</span>
        </div>
        <h3>INGRÉDIENTS</h3>
        <div className="recipeIngredients">
          {selectedRecipe.ingredients.map(i=><div key={i.name}><span>{i.name}</span><b>{i.qty} {i.unit}</b></div>)}
        </div>
        <h3>PRÉPARATION</h3>
        <ol className="recipeSteps">{selectedRecipe.steps.map((step,i)=><li key={step}><span>{i+1}</span>{step}</li>)}</ol>
        <button className="recipeReplace" onClick={()=>replaceMealWithRecipe(selectedRecipe)}>ADAPTER LA RECETTE AUX MACROS DU REPAS</button>
      </section>
    </div>}

    {adjustingMeal&&<div className="nutritionEditorBackdrop"><form className="nutritionEditor glass adjustMealEditor" onSubmit={e=>{e.preventDefault();saveAdjustedMeal(e.currentTarget)}}>
      <header><div><b>AJUSTER LE REPAS</b><small>{adjustingMeal.time} • {adjustingMeal.title}</small></div><button type="button" onClick={()=>setAdjustingMeal(null)}>×</button></header>
      <p className="adjustHelp">Indique précisément ce que tu as réellement consommé. Les macros du journal seront recalculées proportionnellement aux quantités déclarées.</p>
      <div className="adjustFoodList">{adjustingMeal.foods.map((f,i)=><label key={f.name}><span><b>{f.name}</b><small>Prévu : {f.qty}</small></span><input name={`actual-${i}`} defaultValue={f.qty}/></label>)}</div>
      <div className="nutritionEditorActions"><button type="button" onClick={()=>setAdjustingMeal(null)}>ANNULER</button><button type="submit" className="primary">ENREGISTRER DANS JOURNAL</button></div>
    </form></div>}

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


const weeklyVolume=()=>{
  const out:Record<string,{direct:number;secondary:number}>= {}
  sessions.forEach(session=>session.exercises.forEach(ex=>{
    const roleFactor = ex.optional ? 0.85 : 1
    ex.media.primaryMuscles.forEach(m=>{
      out[m] ||= {direct:0,secondary:0}
      out[m].direct += ex.sets*roleFactor
    })
    ;(ex.media.secondaryMuscles??[]).forEach(m=>{
      out[m] ||= {direct:0,secondary:0}
      out[m].secondary += ex.sets*.5
    })
  }))
  return out
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
