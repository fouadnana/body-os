// Fonctions pures (formatage, calculs, logique métier sans accès au
// stockage ni aux données statiques). Extrait de V9App.tsx (Phase 6).
import type { SyntheticEvent } from 'react'
import type { DayPlan, ExerciseItem, Ingredient, ProgressionSuggestion, WorkoutHistoryEntry } from './types'

export const mondayIndex=(d=new Date())=>(d.getDay()+6)%7
export const dayIcon=(d:DayPlan)=>d==='Pectoraux'?'♜':d==='Dos'?'♙':d==='Épaules'?'✣':d==='Jambes'?'♧':d==='Bras'?'◉':d==='L5-S1'?'⚕':d==='Cardio'?'◌':'☾'
export const isRappelDay=(schedule:DayPlan[],idx:number)=>{
 const g=schedule[idx]
 if(g==='Repos'||g==='Cardio') return false
 return schedule.indexOf(g)!==idx
}

export const fmt1=(n:number)=>n.toLocaleString('fr-FR',{minimumFractionDigits:1,maximumFractionDigits:1})
export const fmtDelta=(curr:number,prev:number|undefined,unit:string,decimals=1)=>{
 if(prev==null||prev===curr) return null
 const diff=Math.round((curr-prev)*Math.pow(10,decimals))/Math.pow(10,decimals)
 return `${diff>0?'+':''}${diff.toLocaleString('fr-FR',{minimumFractionDigits:decimals,maximumFractionDigits:decimals})} ${unit}`
}
export const fmtHistoryDate=(iso:string)=>new Date(iso+'T12:00:00').toLocaleDateString('fr-FR',{day:'2-digit',month:'2-digit',year:'2-digit'})
export const estimate1RM=(weight:number,reps:number)=>Math.round(weight*(1+reps/30))

export const mealDetails=(ingredients:Ingredient[])=>ingredients.map(i=>`${i.name} ${i.qty}${i.unit}`).join(' · ')

// Valeurs par gramme (par œuf pour "Œufs", vendu à l'unité)
export const NUTRITION_DB:Record<string,{kcal:number,protein:number,carbs:number,fat:number}>={
 'Skyr 0%':{kcal:.60,protein:.11,carbs:.04,fat:.002},
 'Flocons d’avoine':{kcal:3.75,protein:.13,carbs:.60,fat:.07},
 'Myrtilles':{kcal:.57,protein:.007,carbs:.14,fat:.003},
 'Beurre de cacahuète':{kcal:5.88,protein:.25,carbs:.20,fat:.50},
 'Saumon':{kcal:2.08,protein:.20,carbs:0,fat:.13},
 'Riz basmati cuit':{kcal:1.30,protein:.027,carbs:.28,fat:.003},
 'Riz cuit':{kcal:1.30,protein:.027,carbs:.28,fat:.003},
 'Brocoli':{kcal:.34,protein:.028,carbs:.07,fat:.004},
 'Citron':{kcal:.29,protein:.011,carbs:.09,fat:.003},
 'Fruits rouges':{kcal:.50,protein:.01,carbs:.12,fat:.003},
 'Miel':{kcal:3.04,protein:.003,carbs:.82,fat:0},
 'Amandes':{kcal:5.79,protein:.21,carbs:.22,fat:.50},
 'Poulet grillé':{kcal:1.65,protein:.31,carbs:0,fat:.036},
 'Poulet':{kcal:1.65,protein:.31,carbs:0,fat:.036},
 'Patate douce':{kcal:.90,protein:.02,carbs:.21,fat:.001},
 'Légumes verts':{kcal:.35,protein:.025,carbs:.06,fat:.003},
 'Légumes':{kcal:.35,protein:.025,carbs:.06,fat:.003},
 'Huile d’olive':{kcal:8.84,protein:0,carbs:0,fat:1.0},
 'Œufs':{kcal:78,protein:6.3,carbs:.6,fat:5.3},
 'Blancs d’œufs':{kcal:.52,protein:.11,carbs:.007,fat:.002},
 'Pain complet':{kcal:2.47,protein:.13,carbs:.41,fat:.034},
 'Tomates':{kcal:.18,protein:.009,carbs:.039,fat:.002},
}

export const computeMacros=(ingredients:Ingredient[])=>{
 const totals=ingredients.reduce((acc,i)=>{
  const db=NUTRITION_DB[i.name]
  if(!db) return acc
  return {kcal:acc.kcal+i.qty*db.kcal,protein:acc.protein+i.qty*db.protein,carbs:acc.carbs+i.qty*db.carbs,fat:acc.fat+i.qty*db.fat}
 },{kcal:0,protein:0,carbs:0,fat:0})
 return {kcal:Math.round(totals.kcal),protein:Math.round(totals.protein),carbs:Math.round(totals.carbs),fat:Math.round(totals.fat)}
}

export const thumbFallback=(ev:SyntheticEvent<HTMLImageElement>)=>{
 const img=ev.currentTarget
 if(img.src.includes('maxresdefault')) img.src=img.src.replace('maxresdefault','sddefault')
 else if(img.src.includes('sddefault')) img.src=img.src.replace('sddefault','hqdefault')
 else img.src='/body-os/demo-chest-press-approved.jpg'
}

export const padDone=(arr:boolean[]|undefined,len:number)=>Array.from({length:len},(_,i)=>arr?.[i]??false)
// Estimation du temps de séance dérivée des vraies séries/repos de chaque
// exercice, plutôt qu'un "~32 min" figé identique quel que soit le nombre
// d'exercices (visible notamment sur un template personnalisé à 2 exercices
// affichant la même estimation qu'une séance standard à 5).
export const parseRestSeconds=(rest:string):number=>{
 const toSeconds=(p:string)=>p.includes(':')?(([m,s])=>m*60+(s||0))(p.split(':').map(Number)):Number(p.replace(/[^\d.]/g,''))||0
 const vals=rest.split('–').map(p=>toSeconds(p.trim())).filter(v=>v>0)
 return vals.length?vals.reduce((a,b)=>a+b,0)/vals.length:60
}
export const estimateExerciseSeconds=(item:ExerciseItem):number=>{
 const setsCount=Number(item.sets.match(/\d+/)?.[0] ?? 3)
 return setsCount*(35+parseRestSeconds(item.rest))
}
export const estimateSessionMinutes=(items:ExerciseItem[]):number=>items.length===0?0:Math.max(1,Math.round(items.reduce((s,e)=>s+estimateExerciseSeconds(e),0)/60))

// Progression double classique, basée sur la dernière séance passée de cet
// exercice : si la fourchette de reps cible a été atteinte, on augmente la
// charge et on repart en bas de fourchette ; sinon on vise +1 répétition à
// charge égale. Ignore les exercices chronométrés (ex. "20–30 s") où ces
// nombres ne sont pas des répétitions.
export const suggestProgression=(repsRange:string,targetRir:number,lastPast:WorkoutHistoryEntry):ProgressionSuggestion|null=>{
 if(/\d\s*s\b/i.test(repsRange)) return null
 const match=repsRange.match(/(\d+)\D+(\d+)/)
 if(!match) return null
 const targetMin=Number(match[1]),targetMax=Number(match[2])
 if(lastPast.reps>=targetMax) return {
  weight:lastPast.weight+2.5,reps:targetMin,rir:targetRir,
  reason:`Haut de fourchette atteint (${targetMax} reps la dernière fois) — charge +2,5 kg, reps repartent à ${targetMin}.`
 }
 const nextReps=Math.min(lastPast.reps+1,targetMax)
 return {weight:lastPast.weight,reps:nextReps,rir:targetRir,reason:`Objectif : ${nextReps} reps (+1 vs dernière séance), même charge.`}
}
