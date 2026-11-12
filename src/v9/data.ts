// Données statiques (repas, recettes, bibliothèque d'exercices, planning par
// défaut) et helpers qui en dépendent. Extrait de V9App.tsx (Phase 6).
import { estimateSessionMinutes, mealDetails } from './utils'
import {
 NUTRITION_MEALS_KEY, NUTRITION_SETTINGS_KEY, SCHEDULE_KEY,
 readDailyLog, readJSON, readTemplates, readWorkoutHistory, todayISO, writeTemplates,
} from './storage'
import type {
 DayPlan, EvolutionPhoto, ExerciseItem, LibraryEntry, Meal, MuscleGroup, Recipe, SessionGroup, WorkoutTemplate,
} from './types'

export const meals:Meal[]=[
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

export const recipes:Recipe[]=[
 {id:'r1',name:'Saumon citron & riz',category:'Déjeuner',time:'25 min',kcal:680,protein:45,carbs:70,fat:18,img:'/body-os/meal-dinner-clean.webp',ingredients:[{name:'Saumon',qty:180,unit:' g'},{name:'Riz basmati cuit',qty:180,unit:' g'},{name:'Brocoli',qty:180,unit:' g'},{name:'Citron',qty:20,unit:' g'}],steps:['Cuire le riz et le brocoli.','Saisir le saumon.','Ajouter le citron et assaisonner.']},
 {id:'r2',name:'Poulet patate douce',category:'Dîner',time:'30 min',kcal:670,protein:48,carbs:62,fat:24,img:'/body-os/meal-lunch-clean.webp',ingredients:[{name:'Poulet grillé',qty:200,unit:' g'},{name:'Patate douce',qty:250,unit:' g'},{name:'Légumes verts',qty:250,unit:' g'},{name:'Huile d’olive',qty:5,unit:' g'}],steps:['Rôtir la patate douce.','Griller le poulet.','Ajouter les légumes verts et l’huile.']},
 {id:'r3',name:'Bowl Skyr myrtilles',category:'Petit déjeuner',time:'5 min',kcal:540,protein:42,carbs:64,fat:14,img:'/body-os/meal-breakfast-clean.webp',ingredients:[{name:'Skyr 0%',qty:250,unit:' g'},{name:'Flocons d’avoine',qty:50,unit:' g'},{name:'Myrtilles',qty:100,unit:' g'},{name:'Beurre de cacahuète',qty:24,unit:' g'}],steps:['Verser le Skyr.','Ajouter avoine et myrtilles.','Terminer par le beurre de cacahuète.']},
 {id:'r4',name:'Skyr fruits rouges',category:'Goûter',time:'4 min',kcal:280,protein:25,carbs:36,fat:5,img:'/body-os/meal-preworkout-clean.webp',ingredients:[{name:'Skyr 0%',qty:200,unit:' g'},{name:'Fruits rouges',qty:100,unit:' g'},{name:'Miel',qty:10,unit:' g'},{name:'Amandes',qty:14,unit:' g'}],steps:['Mélanger le Skyr et les fruits.','Ajouter miel et amandes.']},
 {id:'r5',name:'Poulet riz légumes',category:'Déjeuner',time:'20 min',kcal:610,protein:52,carbs:67,fat:13,img:'/body-os/meal-lunch-clean.webp',ingredients:[{name:'Poulet',qty:190,unit:' g'},{name:'Riz cuit',qty:180,unit:' g'},{name:'Légumes',qty:200,unit:' g'}],steps:['Cuire le poulet.','Réchauffer le riz.','Assembler avec les légumes.']},
 {id:'r6',name:'Omelette protéinée',category:'Petit déjeuner',time:'12 min',kcal:495,protein:44,carbs:38,fat:18,img:'/body-os/meal-breakfast-clean.webp',ingredients:[{name:'Œufs',qty:3,unit:''},{name:'Blancs d’œufs',qty:150,unit:' g'},{name:'Pain complet',qty:70,unit:' g'},{name:'Tomates',qty:120,unit:' g'}],steps:['Cuire les œufs et blancs.','Griller le pain.','Servir avec les tomates.']}
]

export const muscleGroups:MuscleGroup[]=['Pectoraux','Dos','Épaules','Jambes','Bras']
export const sessionGroups:SessionGroup[]=[...muscleGroups,'L5-S1']
export const WEEKDAYS=['Lundi','Mardi','Mercredi','Jeudi','Vendredi','Samedi','Dimanche']
export const DEFAULT_NUTRITION_SETTINGS={goal:'SÈCHE',calories:2600,protein:200,carbs:280,fat:75,water:3,weeklyRate:-0.55}
export const sessionData:Record<SessionGroup,ExerciseItem[]>={
 Pectoraux:[
  {name:'Développé incliné',equipment:'Haltères',sets:'4 séries',img:'https://img.youtube.com/vi/5CECBjd7HLQ/maxresdefault.jpg',video:'https://www.youtube.com/watch?v=5CECBjd7HLQ',target:'Haut des pectoraux',secondary:'Triceps · Deltoïdes ant.',reps:'6–10',rir:'1–2',rest:'2:30–3:00'},
  {name:'Écarté poulie bas→haut',equipment:'Poulie',sets:'4 séries',img:'https://img.youtube.com/vi/aoP0s_MjN-g/maxresdefault.jpg',video:'https://www.youtube.com/watch?v=aoP0s_MjN-g',target:'Haut des pectoraux',secondary:'Deltoïdes ant.',reps:'12–15',rir:'1–2',rest:'1:30'},
  {name:'Développé couché',equipment:'Barre',sets:'3 séries',img:'https://img.youtube.com/vi/RsobeWfbBcY/maxresdefault.jpg',video:'https://www.youtube.com/watch?v=RsobeWfbBcY',target:'Pectoraux',secondary:'Triceps · Deltoïdes ant.',reps:'5–8',rir:'1–2',rest:'2:30–3:30'},
  {name:'Dips',equipment:'Poids du corps',sets:'3 séries',img:'https://img.youtube.com/vi/4la6BkUBLgo/maxresdefault.jpg',video:'https://www.youtube.com/watch?v=4la6BkUBLgo',target:'Pectoraux · Triceps',secondary:'Deltoïdes ant.',reps:'6–12',rir:'1–2',rest:'2:00–3:00'},
  {name:'Écartés couchés',equipment:'Haltères',sets:'3 séries',img:'https://img.youtube.com/vi/QwuUZ5wgQOk/maxresdefault.jpg',video:'https://www.youtube.com/watch?v=QwuUZ5wgQOk',target:'Pectoraux',secondary:'Deltoïdes ant.',reps:'10–15',rir:'1–2',rest:'1:30–2:00'},
  {name:'Développé poitrine (machine)',equipment:'Machine',sets:'3 séries',img:'/body-os/demo-chest-press-approved.jpg',video:'https://www.youtube.com/results?search_query=chest+press+machine+technique',target:'Pectoraux',secondary:'Triceps · Deltoïdes ant.',reps:'8–12',rir:'1–2',rest:'2:00'},
  {name:'Pompes',equipment:'Poids du corps',sets:'3 séries',img:'/body-os/anatomy-chest-press.svg',video:'https://www.youtube.com/results?search_query=pompes+technique+pectoraux',target:'Pectoraux',secondary:'Triceps · Deltoïdes ant. · Gainage',reps:'10–20',rir:'1–2',rest:'1:30–2:00'},
 ],
 Dos:[
  {name:'Tirage vertical',equipment:'Poulie',sets:'3 séries',img:'https://img.youtube.com/vi/VXKfH6ciEBI/maxresdefault.jpg',video:'https://www.youtube.com/watch?v=VXKfH6ciEBI',target:'Grand dorsal',secondary:'Biceps',reps:'6–10',rir:'1–2',rest:'2:00–3:00'},
  {name:'Rowing machine',equipment:'Machine',sets:'3 séries',img:'https://img.youtube.com/vi/TeFo51Q_Nsc/maxresdefault.jpg',video:'https://www.youtube.com/watch?v=TeFo51Q_Nsc',target:'Dos moyen',secondary:'Biceps · Deltoïdes post.',reps:'8–12',rir:'1–2',rest:'2:00–3:00'},
  {name:'Rowing poitrine',equipment:'Machine',sets:'2 séries',img:'https://img.youtube.com/vi/0UBRfiO4zDs/maxresdefault.jpg',video:'https://www.youtube.com/watch?v=0UBRfiO4zDs',target:'Rhomboïdes · Trapèzes',secondary:'Biceps',reps:'8–12',rir:'1–2',rest:'2:00'},
  {name:'Pulldown unilatéral',equipment:'Poulie',sets:'2 séries',img:'https://img.youtube.com/vi/iVfZB4YmLRM/maxresdefault.jpg',video:'https://www.youtube.com/watch?v=iVfZB4YmLRM',target:'Grand dorsal',secondary:'Biceps',reps:'10–15',rir:'1–2',rest:'1:30'},
  {name:'Reverse fly',equipment:'Poulie',sets:'3 séries',img:'https://img.youtube.com/vi/buuYPLVXsJg/maxresdefault.jpg',video:'https://www.youtube.com/watch?v=buuYPLVXsJg',target:'Deltoïdes post.',secondary:'Haut du dos',reps:'12–20',rir:'1–2',rest:'1:30'},
  {name:'Tractions',equipment:'Poids du corps',sets:'3 séries',img:'/body-os/demo-lat-pulldown.svg',video:'https://www.youtube.com/results?search_query=tractions+pull+up+technique',target:'Grand dorsal',secondary:'Biceps · Avant-bras',reps:'5–10',rir:'1–2',rest:'2:00–2:30'},
  {name:'Rowing unilatéral poulie basse',equipment:'Poulie',sets:'3 séries',img:'/body-os/demo-one-arm-cable.svg',video:'https://www.youtube.com/results?search_query=one+arm+cable+row+technique',target:'Dos moyen',secondary:'Biceps · Deltoïdes post.',reps:'10–12 / bras',rir:'1–2',rest:'1:30–2:00'},
 ],
 Épaules:[
  {name:'Développé épaules',equipment:'Machine',sets:'3 séries',img:'https://img.youtube.com/vi/WvLMauqrnK8/maxresdefault.jpg',video:'https://www.youtube.com/watch?v=WvLMauqrnK8',target:'Deltoïdes ant. · moyen',secondary:'Triceps',reps:'6–10',rir:'1–2',rest:'2:00–3:00'},
  {name:'Élévations latérales',equipment:'Haltères',sets:'4 séries',img:'/body-os/demo-lat-raise-approved.jpg',video:'https://www.youtube.com/results?search_query=lateral+raise+technique+renaissance+periodization',target:'Deltoïde moyen',secondary:'—',reps:'10–20',rir:'1–2',rest:'1:15–1:45'},
  {name:'Élévations poulie',equipment:'Poulie',sets:'3 séries',img:'https://img.youtube.com/vi/zpbm-xRHB6k/maxresdefault.jpg',video:'https://www.youtube.com/watch?v=zpbm-xRHB6k',target:'Deltoïde moyen',secondary:'—',reps:'12–20',rir:'1–2',rest:'1:15'},
  {name:'Reverse pec deck',equipment:'Machine',sets:'3 séries',img:'https://img.youtube.com/vi/Z84HkxGCBqQ/maxresdefault.jpg',video:'https://www.youtube.com/watch?v=Z84HkxGCBqQ',target:'Deltoïdes post.',secondary:'Haut du dos',reps:'12–20',rir:'1–2',rest:'1:30'},
  {name:'Élévation frontale',equipment:'Poulie',sets:'2 séries',img:'https://img.youtube.com/vi/KjqHI59JizY/maxresdefault.jpg',video:'https://www.youtube.com/watch?v=KjqHI59JizY',target:'Deltoïde ant.',secondary:'—',reps:'10–15',rir:'2',rest:'1:30'},
  {name:'Développé militaire',equipment:'Barre',sets:'4 séries',img:'/body-os/anatomy-shoulder-press.svg',video:'https://www.youtube.com/results?search_query=overhead+press+barbell+technique',target:'Deltoïdes ant.',secondary:'Triceps · Trapèzes',reps:'5–8',rir:'1–2',rest:'2:30–3:00'},
  {name:'Face pull',equipment:'Poulie',sets:'3 séries',img:'/body-os/anatomy-reverse-pec.svg',video:'https://www.youtube.com/results?search_query=face+pull+technique',target:'Deltoïdes post. · Rotateurs externes',secondary:'Trapèzes moyens',reps:'12–20',rir:'1–2',rest:'1:30'},
 ],
 Jambes:[
  {name:'Hack squat',equipment:'Machine',sets:'4 séries',img:'https://img.youtube.com/vi/scs5XcsZuc8/maxresdefault.jpg',video:'https://www.youtube.com/watch?v=scs5XcsZuc8',target:'Quadriceps',secondary:'Fessiers',reps:'6–10',rir:'1–2',rest:'2:30–3:30'},
  {name:'Fentes bulgares',equipment:'Haltères',sets:'4 séries',img:'https://img.youtube.com/vi/SkNsa3eBwLA/maxresdefault.jpg',video:'https://www.youtube.com/watch?v=SkNsa3eBwLA',target:'Quadriceps · Fessiers',secondary:'Ischios',reps:'8–12 / jambe',rir:'1–2',rest:'2:00–2:30'},
  {name:'Leg curl',equipment:'Machine',sets:'3 séries',img:'https://img.youtube.com/vi/IOufFLwNOTU/maxresdefault.jpg',video:'https://www.youtube.com/watch?v=IOufFLwNOTU',target:'Ischio-jambiers',secondary:'—',reps:'8–15',rir:'1–2',rest:'1:30–2:00'},
  {name:'Leg extension',equipment:'Machine',sets:'3 séries',img:'https://img.youtube.com/vi/m0FOpMEgero/maxresdefault.jpg',video:'https://www.youtube.com/watch?v=m0FOpMEgero',target:'Quadriceps',secondary:'—',reps:'10–15',rir:'1–2',rest:'1:30–2:00'},
  {name:'Mollets',equipment:'Machine',sets:'4 séries',img:'https://img.youtube.com/vi/GAQ-oohMhog/maxresdefault.jpg',video:'https://www.youtube.com/watch?v=GAQ-oohMhog',target:'Mollets',secondary:'—',reps:'8–15',rir:'1–2',rest:'1:30'},
  {name:'Presse à cuisses',equipment:'Machine',sets:'4 séries',img:'/body-os/demo-leg-press.svg',video:'https://www.youtube.com/results?search_query=leg+press+technique',target:'Quadriceps',secondary:'Fessiers · Ischios',reps:'8–12',rir:'1–2',rest:'2:00–2:30'},
  {name:'Presse à cuisses unilatérale',equipment:'Machine',sets:'3 séries',img:'/body-os/demo-single-press.svg',video:'https://www.youtube.com/results?search_query=single+leg+press+technique',target:'Quadriceps',secondary:'Fessiers',reps:'8–12 / jambe',rir:'1–2',rest:'2:00'},
  {name:'Step-up',equipment:'Haltères',sets:'3 séries',img:'/body-os/demo-step-up.svg',video:'https://www.youtube.com/results?search_query=step+up+exercise+technique',target:'Quadriceps · Fessiers',secondary:'Ischios',reps:'8–12 / jambe',rir:'1–2',rest:'1:30–2:00'},
  {name:'Leg curl assis',equipment:'Machine',sets:'3 séries',img:'/body-os/demo-seated-curl.svg',video:'https://www.youtube.com/results?search_query=seated+leg+curl+technique',target:'Ischio-jambiers',secondary:'—',reps:'10–15',rir:'1–2',rest:'1:30'},
 ],
 Bras:[
  {name:'Curl incliné',equipment:'Haltères',sets:'4 séries',img:'https://img.youtube.com/vi/HhHHBj3qTJ4/maxresdefault.jpg',video:'https://www.youtube.com/watch?v=HhHHBj3qTJ4',target:'Biceps',secondary:'Brachial',reps:'8–12',rir:'1–2',rest:'1:30–2:00'},
  {name:'Curl poulie',equipment:'Poulie',sets:'3 séries',img:'https://img.youtube.com/vi/aLRv0hRiXhc/maxresdefault.jpg',video:'https://www.youtube.com/watch?v=aLRv0hRiXhc',target:'Biceps',secondary:'Brachial',reps:'10–15',rir:'1–2',rest:'1:30'},
  {name:'Curl assis',equipment:'Haltères',sets:'2 séries',img:'https://img.youtube.com/vi/HHq-wRiFDh0/maxresdefault.jpg',video:'https://www.youtube.com/watch?v=HHq-wRiFDh0',target:'Biceps',secondary:'Avant-bras',reps:'10–15',rir:'1–2',rest:'1:30'},
  {name:'Extension au-dessus tête',equipment:'Poulie',sets:'4 séries',img:'https://img.youtube.com/vi/w3iAESGWK6M/maxresdefault.jpg',video:'https://www.youtube.com/watch?v=w3iAESGWK6M',target:'Triceps long chef',secondary:'—',reps:'10–15',rir:'1–2',rest:'1:30'},
  {name:'Extension triceps',equipment:'Poulie corde',sets:'3 séries',img:'/body-os/demo-rope-pushdown-approved.jpg',video:'https://www.youtube.com/watch?v=ADRve8qqC1U',target:'Triceps',secondary:'—',reps:'10–15',rir:'1–2',rest:'1:30'},
  {name:'Extension triceps haltère',equipment:'Haltères',sets:'3 séries',img:'/body-os/demo-triceps.svg',video:'https://www.youtube.com/results?search_query=dumbbell+overhead+triceps+extension+technique',target:'Triceps',secondary:'—',reps:'10–15',rir:'1–2',rest:'1:30'},
  {name:'Curl marteau',equipment:'Haltères',sets:'3 séries',img:'/body-os/anatomy-curl.svg',video:'https://www.youtube.com/results?search_query=hammer+curl+technique',target:'Biceps · Brachial',secondary:'Avant-bras',reps:'8–12',rir:'1–2',rest:'1:30'},
 ],
 'L5-S1':[
  {name:'Bird dog',equipment:'Poids du corps',sets:'3 séries',img:'https://img.youtube.com/vi/dia-fydN7rE/maxresdefault.jpg',video:'https://www.youtube.com/watch?v=dia-fydN7rE',target:'Gainage profond',secondary:'Fessiers',reps:'8–12 / côté',rir:'—',rest:'45–60 s'},
  {name:'Planche latérale',equipment:'Poids du corps',sets:'3 séries',img:'https://img.youtube.com/vi/iNbH7_edNI8/maxresdefault.jpg',video:'https://www.youtube.com/watch?v=iNbH7_edNI8',target:'Obliques · Carré des lombes',secondary:'Épaules',reps:'20–30 s / côté',rir:'—',rest:'45 s'},
  {name:'Pont fessier',equipment:'Poids du corps',sets:'3 séries',img:'https://img.youtube.com/vi/n6JiF2jp2Ns/maxresdefault.jpg',video:'https://www.youtube.com/watch?v=n6JiF2jp2Ns',target:'Fessiers · Chaîne postérieure',secondary:'Ischios',reps:'12–15',rir:'—',rest:'45 s'},
  {name:'Dead bug',equipment:'Poids du corps',sets:'3 séries',img:'https://img.youtube.com/vi/pxql0kTdmEs/maxresdefault.jpg',video:'https://www.youtube.com/watch?v=pxql0kTdmEs',target:'Gainage profond',secondary:'Hanches',reps:'8–10 / côté',rir:'—',rest:'45 s'},
  {name:'Gainage ventral',equipment:'Poids du corps',sets:'3 séries',img:'https://img.youtube.com/vi/GQE8ASRA7t0/maxresdefault.jpg',video:'https://www.youtube.com/watch?v=GQE8ASRA7t0',target:'Gainage global',secondary:'Épaules',reps:'20–40 s',rir:'—',rest:'45–60 s'},
  {name:'Superman',equipment:'Poids du corps',sets:'3 séries',img:'/body-os/l5-spine.svg',video:'https://www.youtube.com/results?search_query=superman+exercise+lower+back+technique',target:'Érecteurs du rachis (lombaires)',secondary:'Fessiers',reps:'10–15',rir:'—',rest:'45 s'},
  {name:'Clamshell',equipment:'Poids du corps',sets:'3 séries',img:'/body-os/l5-spine.svg',video:'https://www.youtube.com/results?search_query=clamshell+exercise+glute+technique',target:'Moyen fessier',secondary:'Stabilité du bassin',reps:'12–15 / côté',rir:'—',rest:'45 s'},
 ]
}
export const exerciseLibrary:LibraryEntry[]=sessionGroups.flatMap(g=>sessionData[g].map(e=>({...e,group:g})))
export const libraryEquipments=Array.from(new Set(exerciseLibrary.map(e=>e.equipment))).sort((a,b)=>a.localeCompare(b,'fr'))
const ref=(group:SessionGroup,name:string)=>({group,name})

// Templates intégrés : une séance (V3) est transversale aux groupes
// musculaires ("Haut du corps" mélange Pectoraux/Dos/Épaules/Bras), plus
// verrouillée sur un seul groupe comme l'ancien "Séance standard". Ce sont
// des templates ordinaires (éditables/supprimables depuis Mes séances), pas
// une catégorie à part — seedés une fois dans TEMPLATES_KEY au premier
// chargement pour donner un point de départ à un nouvel utilisateur.
export const BUILTIN_TEMPLATES:WorkoutTemplate[]=[
 {id:'tpl_upper',name:'Haut du corps',exercises:[
  ref('Pectoraux','Développé couché'),ref('Dos','Tirage vertical'),ref('Épaules','Développé épaules'),
  ref('Dos','Rowing machine'),ref('Bras','Curl incliné'),ref('Bras','Extension triceps'),
 ]},
 {id:'tpl_lower',name:'Bas du corps',exercises:[
  ref('Jambes','Hack squat'),ref('Jambes','Fentes bulgares'),ref('Jambes','Leg curl'),
  ref('Jambes','Leg extension'),ref('Jambes','Mollets'),ref('L5-S1','Pont fessier'),
 ]},
 {id:'tpl_push',name:'Push (Pecs/Épaules/Triceps)',exercises:[
  ref('Pectoraux','Développé couché'),ref('Pectoraux','Écarté poulie bas→haut'),ref('Épaules','Développé épaules'),
  ref('Épaules','Élévations latérales'),ref('Bras','Extension triceps'),
 ]},
 {id:'tpl_pull',name:'Pull (Dos/Biceps)',exercises:[
  ref('Dos','Tirage vertical'),ref('Dos','Rowing machine'),ref('Dos','Rowing poitrine'),
  ref('Dos','Reverse fly'),ref('Bras','Curl incliné'),
 ]},
 {id:'tpl_full',name:'Full Body',exercises:[
  ref('Pectoraux','Développé couché'),ref('Dos','Tirage vertical'),ref('Jambes','Hack squat'),
  ref('Épaules','Développé épaules'),ref('Bras','Curl incliné'),ref('Bras','Extension triceps'),
  ref('L5-S1','Dead bug'),ref('Jambes','Fentes bulgares'),
 ]},
 {id:'tpl_l5s1',name:'L5-S1 (renforcement)',exercises:sessionData['L5-S1'].map(e=>ref('L5-S1',e.name))},
]

export const DEFAULT_SCHEDULE:DayPlan[]=['tpl_upper','tpl_lower','tpl_push','tpl_pull','tpl_full','tpl_l5s1','Repos']
export const readSchedule=():DayPlan[]=>{const s=readJSON<DayPlan[]>(SCHEDULE_KEY,DEFAULT_SCHEDULE);return s.length===7?s:DEFAULT_SCHEDULE}

// Garantit qu'un nouvel utilisateur (TEMPLATES_KEY vide) démarre avec les
// templates intégrés plutôt qu'une bibliothèque "Mes séances" vide — appelé
// une fois au chargement de l'app (voir V9App.tsx).
export const ensureBuiltinTemplates=()=>{
 const existing=readTemplates()
 if(existing.length===0) writeTemplates(BUILTIN_TEMPLATES)
}
ensureBuiltinTemplates()

export const findTemplate=(id:string):WorkoutTemplate|undefined=>readTemplates().find(t=>t.id===id)

// Résout la liste d'exercices d'un template (dans l'ordre), en tolérant un
// exercice renommé/supprimé de la bibliothèque (ignoré plutôt que de casser
// toute la séance).
export const resolveTemplateExercises=(tpl:WorkoutTemplate):LibraryEntry[]=>
 tpl.exercises.map(r=>exerciseLibrary.find(e=>e.group===r.group&&e.name===r.name)).filter((e):e is LibraryEntry=>!!e)

export const estimateTemplateMinutes=(tpl:WorkoutTemplate):number=>estimateSessionMinutes(resolveTemplateExercises(tpl))

// Avant la première photo réelle, la sheet et l'onglet PHYSIQUE affichent
// un état vide honnête plutôt que 3 "photos" figées (même image placeholder,
// dates inventées) qui donnaient l'illusion d'une évolution déjà suivie.
export const DEFAULT_EVOLUTION_PHOTOS:EvolutionPhoto[]=[]

export const exportProgressData=()=>{
 const payload={
  exportedAt:new Date().toISOString(),
  dailyLog:readDailyLog(),
  workoutHistory:readWorkoutHistory(),
  nutritionMeals:readJSON(NUTRITION_MEALS_KEY,meals),
  nutritionSettings:readJSON(NUTRITION_SETTINGS_KEY,DEFAULT_NUTRITION_SETTINGS),
 }
 const blob=new Blob([JSON.stringify(payload,null,2)],{type:'application/json'})
 const url=URL.createObjectURL(blob)
 const a=document.createElement('a')
 a.href=url; a.download=`body-os-export-${todayISO()}.json`
 document.body.appendChild(a); a.click(); document.body.removeChild(a)
 URL.revokeObjectURL(url)
}
