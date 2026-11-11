// Persistance (localStorage) — clés, lecture/écriture JSON, migrations et
// helpers de lecture/écriture par domaine. Extrait de V9App.tsx (Phase 6).
import type { DailyEntry, MuscleGroup, NutritionDaily, WorkoutHistoryEntry, WorkoutTemplate } from './types'

export const NUTRITION_SETTINGS_KEY='bodyos.nutrition.settings.v1'
export const NUTRITION_MEALS_KEY='bodyos.nutrition.meals.v1'
export const RECIPE_FAVORITES_KEY='bodyos.recipes.favorites.v1'
export const EXERCISE_FAVORITES_KEY='bodyos.exercises.favorites.v1'
export const NUTRITION_DAILY_KEY='bodyos.nutrition.daily.v1'
export const WORKOUT_DONE_KEY='bodyos.workout.done.v1'
export const WORKOUT_LOG_KEY='bodyos.workout.log.v1'
export const WORKOUT_OVERRIDES_KEY='bodyos.workout.overrides.v1'
export const TEMPLATES_KEY='bodyos.templates.v1'
export const ACTIVE_TEMPLATE_KEY='bodyos.templates.active.v1'
export const DAILY_LOG_KEY='bodyos.daily.log.v1'
export const SCHEDULE_KEY='bodyos.schedule.v1'

export const SCHEMA_VERSION=2
export const SCHEMA_VERSION_KEY='bodyos.schema.version'
export const readJSON=<T,>(key:string,fallback:T):T=>{
 try{
  const raw=localStorage.getItem(key)
  return raw?JSON.parse(raw):fallback
 }catch{
  try{
   const raw=localStorage.getItem(key)
   if(raw) localStorage.setItem(`${key}.corrupted.${Date.now()}`,raw)
  }catch{}
  return fallback
 }
}
export const writeJSON=(key:string,value:unknown)=>{try{localStorage.setItem(key,JSON.stringify(value))}catch{}}
export function runMigrations(){
 try{
  const stored=Number(localStorage.getItem(SCHEMA_VERSION_KEY)||'0')
  if(stored>=SCHEMA_VERSION) return
  // v0→v1 : aucune transformation de données n'est nécessaire — c'est le
  // premier point de version.
  if(stored<2){
   // v1→v2 : les templates passaient d'un groupe musculaire unique
   // ({group,exerciseNames}) à une liste d'exercices transversale
   // ({exercises:[{group,name}]}) — une séance s'ouvre maintenant par un
   // template ("Haut du corps"), plus par un groupe musculaire. On convertit
   // les templates personnalisés existants plutôt que de les perdre.
   // Le planning hebdo (schedule) n'est pas touché : une ancienne valeur
   // (nom de groupe) ne correspond à aucun id de template, donc chaque
   // écran qui lit le planning retombe déjà sur un repli honnête (premier
   // template disponible / libellé générique "Séance") sans qu'il soit
   // nécessaire — ni souhaitable — d'effacer la donnée existante.
   try{
    const raw=localStorage.getItem(TEMPLATES_KEY)
    if(raw){
     const old=JSON.parse(raw) as Array<{id:string,name:string,group?:string,exerciseNames?:string[],exercises?:unknown}>
     const migrated=old.map(t=>t.exercises?t:{id:t.id,name:t.name,exercises:(t.exerciseNames??[]).map(name=>({group:t.group,name}))})
     localStorage.setItem(TEMPLATES_KEY,JSON.stringify(migrated))
    }
   }catch{}
   localStorage.removeItem(ACTIVE_TEMPLATE_KEY)
  }
  localStorage.setItem(SCHEMA_VERSION_KEY,String(SCHEMA_VERSION))
 }catch{}
}
runMigrations()

export const WORKOUT_HISTORY_KEY='bodyos.workout.history.v1'
export const readWorkoutHistory=()=>readJSON<WorkoutHistoryEntry[]>(WORKOUT_HISTORY_KEY,[])
export const newSetId=()=>typeof crypto!=='undefined'&&crypto.randomUUID?crypto.randomUUID():`${Date.now()}-${Math.random().toString(36).slice(2)}`
export const logWorkoutSet=(entry:WorkoutHistoryEntry)=>{
 const log=readWorkoutHistory()
 log.push({...entry,id:entry.id??newSetId()})
 writeJSON(WORKOUT_HISTORY_KEY,log.slice(-500))
}
export const deleteWorkoutSet=(id:string)=>writeJSON(WORKOUT_HISTORY_KEY,readWorkoutHistory().filter(e=>e.id!==id))
export const todayISO=()=>new Date().toISOString().slice(0,10)

export const readDailyLog=()=>readJSON<DailyEntry[]>(DAILY_LOG_KEY,[]).slice().sort((a,b)=>a.date.localeCompare(b.date))
export const upsertDailyEntry=(patch:Partial<DailyEntry>)=>{
 const log=readDailyLog(); const date=todayISO()
 const idx=log.findIndex(e=>e.date===date)
 // measurements est fusionné muscle par muscle (pas remplacé) : mesurer un
 // seul muscle aujourd'hui ne doit pas effacer ceux déjà saisis le même jour.
 const mergedMeasurements=patch.measurements&&idx!==-1?{...log[idx].measurements,...patch.measurements}:patch.measurements
 const mergedPatch=mergedMeasurements?{...patch,measurements:mergedMeasurements}:patch
 if(idx===-1) log.push({date,...mergedPatch}); else log[idx]={...log[idx],...mergedPatch}
 writeJSON(DAILY_LOG_KEY,log); return log
}
export const muscleMeasurementSeries=(log:DailyEntry[],muscle:MuscleGroup)=>
 log.filter(e=>e.measurements?.[muscle]!=null).map(e=>({date:e.date,value:e.measurements![muscle]!}))

export const readNutritionDaily=()=>readJSON<Record<string,NutritionDaily>>(NUTRITION_DAILY_KEY,{})

export const readTemplates=():WorkoutTemplate[]=>readJSON(TEMPLATES_KEY,[])
export const writeTemplates=(t:WorkoutTemplate[])=>writeJSON(TEMPLATES_KEY,t)

export const newTemplateId=()=>`tpl_${Date.now()}_${Math.random().toString(36).slice(2,8)}`
