import { useEffect, useMemo, useRef, useState } from 'react'
import { Line, LineChart, ResponsiveContainer, XAxis, YAxis, Bar, BarChart, ReferenceLine } from 'recharts'
import './v9.css'
import FoodVision, { type FoodVisionPayload } from './FoodVision'
import type {
 DailyEntry, DayPlan, EvolutionPhoto, ExerciseItem, Ingredient, LibraryEntry, Meal, MuscleGroup,
 NutritionDaily, ProgressionSuggestion, Recipe, SessionGroup, SetDraft, WorkoutHistoryEntry, WorkoutTemplate,
} from './v9/types'
import {
 ACTIVE_TEMPLATE_KEY, DAILY_LOG_KEY, DEFAULT_TEMPLATE_ID, NUTRITION_DAILY_KEY, NUTRITION_MEALS_KEY,
 NUTRITION_SETTINGS_KEY, RECIPE_FAVORITES_KEY, SCHEDULE_KEY, TEMPLATES_KEY, WORKOUT_DONE_KEY,
 WORKOUT_HISTORY_KEY, WORKOUT_LOG_KEY, WORKOUT_OVERRIDES_KEY,
 deleteWorkoutSet, logWorkoutSet, muscleMeasurementSeries, newSetId, newTemplateId, readActiveTemplates,
 readDailyLog, readJSON, readNutritionDaily, readTemplates, readWorkoutHistory, todayISO, upsertDailyEntry,
 writeActiveTemplates, writeJSON, writeTemplates,
} from './v9/storage'
import {
 computeMacros, dayIcon, estimate1RM, estimateExerciseSeconds, estimateSessionMinutes, fmt1, fmtDelta,
 fmtHistoryDate, isRappelDay, mealDetails, mondayIndex, NUTRITION_DB, padDone, parseRestSeconds,
 suggestProgression, thumbFallback,
} from './v9/utils'
import {
 DEFAULT_EVOLUTION_PHOTOS, DEFAULT_NUTRITION_SETTINGS, DEFAULT_SCHEDULE, exerciseLibrary,
 exportProgressData, libraryEquipments, meals, muscleGroups, readSchedule, recipes,
 resolveBaseExercises, sessionData, sessionGroups, WEEKDAYS,
} from './v9/data'
import { BottomNav, InfoSheet, OptionsSheet, ProgramSheet, Toast } from './v9/components/Shared'
import { MeasurementsSheet, Today } from './v9/screens/Today'
import { Workout } from './v9/screens/Workout'

type Screen='today'|'workout'|'nutrition'|'progress'|'coach'|'plan'|'adaptive'|'plus'|'library'|'templates'
type WorkoutView='session'|'exercise'|'history'

function QuickAddMealSheet({close,onAdd}:{close:()=>void,onAdd:(meal:Meal)=>void}){
 const [name,setName]=useState('')
 const [kcal,setKcal]=useState('')
 const [protein,setProtein]=useState('')
 const [carbs,setCarbs]=useState('')
 const [fat,setFat]=useState('')
 const num=(v:string)=>Math.round(parseFloat(v.replace(',','.'))||0)
 const canSave=kcal.trim()!==''&&!isNaN(parseFloat(kcal.replace(',','.')))
 const save=()=>{
  if(!canSave) return
  onAdd({
   name:name.trim()||'Repas rapide',
   time:new Date().toLocaleTimeString('fr-FR',{hour:'2-digit',minute:'2-digit'}),
   kcal:num(kcal),
   img:'/body-os/meal-breakfast-clean.webp',
   details:'Ajout rapide',
   protein:num(protein),
   carbs:num(carbs),
   fat:num(fat),
   ingredients:[],
  })
  close()
 }
 return <div className="v9SheetBack" onClick={close}><section className="v103Sheet" onClick={e=>e.stopPropagation()}>
  <header><button onClick={close}>×</button><div><b>AJOUT RAPIDE</b><small>Repas ou collation hors programme</small></div><span></span></header>
  <label>NOM — optionnel<input value={name} onChange={e=>setName(e.target.value)} placeholder="ex. Collation"/></label>
  <label>CALORIES (KCAL)<input inputMode="numeric" value={kcal} onChange={e=>setKcal(e.target.value)} placeholder="ex. 250"/></label>
  <label>PROTÉINES (G) — optionnel<input inputMode="decimal" value={protein} onChange={e=>setProtein(e.target.value)} placeholder="ex. 20"/></label>
  <label>GLUCIDES (G) — optionnel<input inputMode="decimal" value={carbs} onChange={e=>setCarbs(e.target.value)} placeholder="ex. 25"/></label>
  <label>LIPIDES (G) — optionnel<input inputMode="decimal" value={fat} onChange={e=>setFat(e.target.value)} placeholder="ex. 8"/></label>
  <button className="v9Primary" onClick={save} disabled={!canSave}>AJOUTER</button>
 </section></div>
}

function Nutrition({setScreen}:{setScreen:(s:Screen)=>void}){
 const [open,setOpen]=useState<Meal|null>(null)
 const [tab,setTab]=useState<'day'|'week'|'month'>('day')
 const [mode,setMode]=useState<'programme'|'recipes'>('programme')
 const [recipeOpen,setRecipeOpen]=useState<Recipe|null>(null)
 const [toast,setToast]=useState('')
 const [settingsOpen,setSettingsOpen]=useState(false)
 const [visionOpen,setVisionOpen]=useState(false)
 const [quickAddOpen,setQuickAddOpen]=useState(false)
 const [recipeFilter,setRecipeFilter]=useState<'toutes'|'rapides'|'proteinees'|'favoris'>('toutes')
 const [favorites,setFavoritesState]=useState<string[]>(()=>readJSON(RECIPE_FAVORITES_KEY,[]))
 const setFavorites=(next:string[])=>{setFavoritesState(next);writeJSON(RECIPE_FAVORITES_KEY,next)}
 const toggleFavorite=(id:string)=>setFavorites(favorites.includes(id)?favorites.filter(x=>x!==id):[...favorites,id])
 const parseMinutes=(t:string)=>Number(t.match(/\d+/)?.[0]??0)
 const filteredRecipes=recipes.filter(r=>
  recipeFilter==='toutes'||
  (recipeFilter==='rapides'&&parseMinutes(r.time)<=15)||
  (recipeFilter==='proteinees'&&r.protein>=40)||
  (recipeFilter==='favoris'&&favorites.includes(r.id))
 )
 const [mealState,setMealState]=useState<Meal[]>(()=>readJSON(NUTRITION_MEALS_KEY,meals))
 const [settings,setSettings]=useState(()=>readJSON(NUTRITION_SETTINGS_KEY,DEFAULT_NUTRITION_SETTINGS))
 const [draft,setDraft]=useState(settings)
 const [dailyNutrition,setDailyNutrition]=useState<Record<string,NutritionDaily>>(()=>readNutritionDaily())

 useEffect(()=>{
  writeJSON(NUTRITION_MEALS_KEY,mealState)
  const totals=mealState.reduce((acc,m)=>({kcal:acc.kcal+m.kcal,protein:acc.protein+m.protein,carbs:acc.carbs+m.carbs,fat:acc.fat+m.fat}),{kcal:0,protein:0,carbs:0,fat:0})
  const daily={...readNutritionDaily(),[todayISO()]:totals}
  writeJSON(NUTRITION_DAILY_KEY,daily)
  setDailyNutrition(daily)
 },[mealState])
 useEffect(()=>{writeJSON(NUTRITION_SETTINGS_KEY,settings)},[settings])

 const dailyDates=Object.keys(dailyNutrition).sort()
 const trendPoints=(n:number)=>dailyDates.slice(-n).map(d=>({d:fmtHistoryDate(d).slice(0,5),kcal:dailyNutrition[d].kcal,protein:dailyNutrition[d].protein}))
 const weekPoints=trendPoints(7)
 const monthPoints=trendPoints(30)
 const trendForTab=tab==='week'?weekPoints:monthPoints
 const avgKcal=trendForTab.length?Math.round(trendForTab.reduce((s,p)=>s+p.kcal,0)/trendForTab.length):null
 const avgDeltaVsTarget=avgKcal!=null?avgKcal-settings.calories:null

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
 const addQuickMeal=(meal:Meal)=>{
   let finalName=meal.name
   if(mealState.some(m=>m.name===finalName)) finalName=`${finalName} (${meal.time})`
   setMealState(prev=>[...prev,{...meal,name:finalName}])
   setToast('Repas ajouté'); window.setTimeout(()=>setToast(''),1800)
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

   {tab==='day'?<section className="v9MealList">
    <h3>REPAS DU JOUR</h3>
    {mealState.map(m=><button key={m.name} onClick={()=>setOpen(m)}>
     <span className="v95MealText"><small>{m.name}</small><b>{mealDetails(m.ingredients)}</b><em>{m.time}</em></span>
     <img src={m.img}/><strong>{m.kcal} kcal</strong>
    </button>)}
   </section>:<section className="v9HistoryChart v9NutritionTrend">
    <h3>{tab==='week'?'APERÇU SEMAINE':'TENDANCE DU MOIS'}</h3>
    {trendForTab.length?<>
     <ResponsiveContainer width="100%" height={180}><LineChart data={trendForTab}>
      <Line dataKey="kcal" stroke="#75eef0" strokeWidth={3} dot={{r:3,fill:'#d8fcff'}}/>
      <ReferenceLine y={settings.calories} stroke="#b6ef49" strokeDasharray="4 4"/>
      <XAxis dataKey="d" tick={{fill:'#90a8b2',fontSize:9}} axisLine={false}/>
      <YAxis hide domain={['dataMin - 100','dataMax + 100']}/>
     </LineChart></ResponsiveContainer>
     <div className="v94PerfStats">
      <span><small>MOYENNE</small><b>{avgKcal} kcal/j</b></span>
      <span><small>JOURS SUIVIS</small><b>{trendForTab.length}</b></span>
      <span><small>ÉCART VS OBJECTIF</small><b>{avgDeltaVsTarget!=null?`${avgDeltaVsTarget>0?'+':''}${avgDeltaVsTarget} kcal`:'—'}</b></span>
     </div>
    </>:<p className="v94NoData">Pas encore assez de jours suivis. Reviens demain pour voir ta tendance {tab==='week'?'hebdomadaire':'mensuelle'}.</p>}
   </section>}
   {tab==='day'&&<button className="v9Fab" onClick={()=>setQuickAddOpen(true)}>＋</button>}
  </>:<>
   <section className="v97Recipes">
    <div className="v97RecipeHead"><div><small>RECETTES INTELLIGENTES</small><b>Compatibles avec ta sèche</b></div><span>{filteredRecipes.length} recette{filteredRecipes.length>1?'s':''}</span></div>
    <div className="v97RecipeFilters">
     <button className={recipeFilter==='toutes'?'active':''} onClick={()=>setRecipeFilter('toutes')}>TOUTES</button>
     <button className={recipeFilter==='rapides'?'active':''} onClick={()=>setRecipeFilter('rapides')}>RAPIDES</button>
     <button className={recipeFilter==='proteinees'?'active':''} onClick={()=>setRecipeFilter('proteinees')}>PROTÉINÉES</button>
     <button className={recipeFilter==='favoris'?'active':''} onClick={()=>setRecipeFilter('favoris')}>FAVORIS</button>
    </div>
    <div className="v97RecipeGrid">{filteredRecipes.map(r=><button key={r.id} onClick={()=>setRecipeOpen(r)}>
     <img src={r.img}/><span><small>{r.category} · {r.time}</small><b>{r.name}</b><em>{r.kcal} kcal · P {r.protein} g</em></span>
    </button>)}</div>
    {filteredRecipes.length===0&&<p className="v94NoData">{recipeFilter==='favoris'?"Pas encore de recette favorite — touche ♡ dans une fiche recette.":'Aucune recette ne correspond à ce filtre.'}</p>}
   </section>
  </>}

  {open&&<MealSheet meal={open} close={()=>setOpen(null)} save={saveMeal}/>}
  {recipeOpen&&<RecipeSheet recipe={recipeOpen} close={()=>setRecipeOpen(null)} add={()=>addRecipeToPlan(recipeOpen)} isFavorite={favorites.includes(recipeOpen.id)} onToggleFavorite={()=>toggleFavorite(recipeOpen.id)}/>}
  {quickAddOpen&&<QuickAddMealSheet close={()=>setQuickAddOpen(false)} onAdd={addQuickMeal}/>}
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
 const withMacros=(ingredients:Ingredient[])=>({ingredients,...computeMacros(ingredients)})
 const updateQty=(idx:number,delta:number)=>setDraft(d=>({...d,...withMacros(d.ingredients.map((x,i)=>i===idx?{...x,qty:Math.max(0,Math.round((x.qty+delta)*10)/10)}:x))}))
 const removeIngredient=(idx:number)=>setDraft(d=>({...d,...withMacros(d.ingredients.filter((_,i)=>i!==idx))}))
 const addIngredient=(name:string)=>setDraft(d=>({...d,...withMacros([...d.ingredients,{name,qty:100,unit:' g'}])}))
 const persist=()=>{const next={...draft,details:mealDetails(draft.ingredients)};save(next);setDraft(next);setEdit(false)}
 return <div className="v9SheetBack" onClick={close}><section className="v9MealSheet v97MealSheet" onClick={e=>e.stopPropagation()}>
  <header><button onClick={close}>‹</button><b>{meal.name.toUpperCase()}</b><button onClick={()=>setEdit(!edit)}>{edit?'OK':'•••'}</button></header>
  <img className="v9FoodHero" src={draft.img}/>
  <div className="v9MealInfo">
   <h2>{draft.name}</h2><p className="v96PortionLabel">PORTIONS CIBLES</p>
   <div className="v97IngredientList">{draft.ingredients.map((ing,i)=><div key={ing.name+i}>
    <span><b>{ing.name}</b><small>{ing.qty}{ing.unit}</small></span>
    {edit&&<div className="v97IngredientActions"><button onClick={()=>updateQty(i,-10)}>−</button><input type="number" value={ing.qty} onChange={e=>setDraft(d=>({...d,...withMacros(d.ingredients.map((x,j)=>j===i?{...x,qty:+e.target.value}:x))}))}/><button onClick={()=>updateQty(i,10)}>+</button><button className="remove" onClick={()=>removeIngredient(i)}>×</button></div>}
   </div>)}</div>
   {edit&&<div className="v97AddFood"><small>AJOUTER UN ALIMENT</small><div>{foodBank.filter(f=>!draft.ingredients.some(i=>i.name===f)).slice(0,8).map(f=><button key={f} onClick={()=>addIngredient(f)}>＋ {f}</button>)}</div></div>}
   <b>{draft.kcal} <small>kcal</small></b>
   <div><span><i>◖</i><b>{draft.protein} g</b><small>Protéines</small></span><span><i>G</i><b>{draft.carbs} g</b><small>Glucides</small></span><span><i>L</i><b>{draft.fat} g</b><small>Lipides</small></span></div>
   <button className="v9Primary" onClick={()=>edit?persist():setEdit(true)}>{edit?'ENREGISTRER LE REPAS':'MODIFIER LE REPAS'}</button>
   <h3>ALTERNATIVES</h3><div className="v9Alternatives">{recipes.slice(0,3).map(r=><button onClick={()=>setDraft(d=>({...d,img:r.img,kcal:r.kcal,protein:r.protein,carbs:r.carbs,fat:r.fat,ingredients:r.ingredients.map(i=>({...i}))}))} key={r.id}><img src={r.img}/><small>{r.kcal} kcal</small></button>)}</div>
  </div>
 </section></div>
}

function RecipeSheet({recipe,close,add,isFavorite,onToggleFavorite}:{recipe:Recipe,close:()=>void,add:()=>void,isFavorite:boolean,onToggleFavorite:()=>void}){
 return <div className="v9SheetBack" onClick={close}><section className="v9MealSheet v97RecipeSheet" onClick={e=>e.stopPropagation()}>
  <header><button onClick={close}>‹</button><b>RECETTE</b><button className={`v97FavoriteToggle${isFavorite?' active':''}`} onClick={onToggleFavorite} aria-label={isFavorite?'Retirer des favoris':'Ajouter aux favoris'}>{isFavorite?'♥':'♡'}</button></header>
  <img className="v9FoodHero" src={recipe.img}/>
  <div className="v9MealInfo"><small>{recipe.category} · {recipe.time}</small><h2>{recipe.name}</h2><b>{recipe.kcal} <small>kcal</small></b>
   <div><span><i>◖</i><b>{recipe.protein} g</b><small>Protéines</small></span><span><i>G</i><b>{recipe.carbs} g</b><small>Glucides</small></span><span><i>L</i><b>{recipe.fat} g</b><small>Lipides</small></span></div>
   <h3>INGRÉDIENTS</h3><div className="v97RecipeIngredients">{recipe.ingredients.map(i=><div key={i.name}><span>{i.name}</span><b>{i.qty}{i.unit}</b></div>)}</div>
   <h3>PRÉPARATION</h3><ol className="v97Steps">{recipe.steps.map((s,i)=><li key={i}>{s}</li>)}</ol>
   <button className="v9Primary" onClick={add}>AJOUTER AU PROGRAMME</button>
  </div>
 </section></div>
}



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
 const [optionsOpen,setOptionsOpen]=useState(false)
 const [evolutionPhotos,setEvolutionPhotos]=useState<EvolutionPhoto[]>(()=>{
  try{
   const raw=localStorage.getItem('body-os-evolution-photos-v1')
   return raw?JSON.parse(raw):DEFAULT_EVOLUTION_PHOTOS
  }catch{return DEFAULT_EVOLUTION_PHOTOS}
 })
 useEffect(()=>{
  try{localStorage.setItem('body-os-evolution-photos-v1',JSON.stringify(evolutionPhotos))}catch{}
 },[evolutionPhotos])
 const [measureOpen,setMeasureOpen]=useState(false)
 const workoutHistory=readWorkoutHistory()
 const muscleHistory=workoutHistory.filter(h=>h.group===muscle)
 const bestByDate=new Map<string,number>()
 muscleHistory.forEach(h=>bestByDate.set(h.date,Math.max(h.weight,bestByDate.get(h.date)??0)))
 const perfPoints=[...bestByDate.entries()].sort((a,b)=>a[0].localeCompare(b[0])).slice(-10).map(([date,v])=>({d:fmtHistoryDate(date).slice(0,5),v}))
 const perfChangePct=perfPoints.length>=2&&perfPoints[0].v>0?(perfPoints.at(-1)!.v-perfPoints[0].v)/perfPoints[0].v*100:null
 const perfLabel=perfChangePct==null?'EN ATTENTE':perfChangePct>1?'EN PROGRÈS':perfChangePct<-1?'EN BAISSE':'STABLE'
 const weekAgo=Date.now()-7*86400000
 const volumeThisWeek=workoutHistory.filter(h=>h.group===muscle&&new Date(h.date).getTime()>=weekAgo).length
 const bestWeightEver=muscleHistory.length?Math.max(...muscleHistory.map(h=>h.weight)):null
 const sessionsLogged=bestByDate.size
 const [dailyLog,setDailyLog]=useState(()=>readDailyLog())
 const latestDay=dailyLog.at(-1); const previousDay=dailyLog.at(-2)
 const weightPoints=dailyLog.filter(e=>e.weight!=null).slice(-14).map(e=>({d:fmtHistoryDate(e.date).slice(0,5),w:e.weight!}))
 const weightWeekDelta=latestDay?.weight!=null?fmtDelta(latestDay.weight,previousDay?.weight,'kg'):null
 const waistDelta=latestDay?.waist!=null?fmtDelta(latestDay.waist,previousDay?.waist,'cm'):null
 const bodyFatDelta=latestDay?.bodyFat!=null?fmtDelta(latestDay.bodyFat,previousDay?.bodyFat,'%'):null
 const nutritionSettings=readJSON(NUTRITION_SETTINGS_KEY,DEFAULT_NUTRITION_SETTINGS)
 const weighedDays=dailyLog.filter(e=>e.weight!=null)
 const spanDays=weighedDays.length>=2?(new Date(weighedDays.at(-1)!.date).getTime()-new Date(weighedDays[0].date).getTime())/86400000:0
 const realWeeklyRate=spanDays>=3?(weighedDays.at(-1)!.weight!-weighedDays[0].weight!)/spanDays*7:null
 const measurementSeries=muscleMeasurementSeries(dailyLog,muscle)
 const latestMeasurement=measurementSeries.at(-1)
 const previousMeasurement=measurementSeries.length>=2?measurementSeries[measurementSeries.length-2]:undefined
 const measureDelta=latestMeasurement?fmtDelta(latestMeasurement.value,previousMeasurement?.value,'cm'):null
 const muscleTrend=measurementSeries.slice(-10).map(p=>({d:fmtHistoryDate(p.date).slice(0,5),v:p.value}))
 const latestByMuscle=Object.fromEntries(muscleGroups.map(g=>[g,muscleMeasurementSeries(dailyLog,g).at(-1)?.value])) as Partial<Record<MuscleGroup,number>>
 const overlayFor=(g:MuscleGroup)=>g==='Pectoraux'?'chest':g==='Dos'?'back':g==='Épaules'?'shoulders':g==='Jambes'?'legs':'arms'
 const saveMeasurements=(patch:Partial<Record<MuscleGroup,number>>)=>{upsertDailyEntry({measurements:patch});setDailyLog(readDailyLog());setMeasureOpen(false)}
 return <main className="v9Page v94Progress"><header className="v9TitleBar"><button onClick={()=>setScreen('today')}>‹</button><div><b>PROGRESS</b></div><button className="v93Dots" onClick={()=>setOptionsOpen(true)}>☷</button></header>
  <div className="v9Segments v94MainSegments"><button className={tab==='cut'?'active':''} onClick={()=>setTab('cut')}>SÈCHE</button><button className={tab==='physique'?'active':''} onClick={()=>setTab('physique')}>PHYSIQUE</button><button className={tab==='perf'?'active':''} onClick={()=>setTab('perf')}>PERF.</button></div>
  {tab==='cut'&&<div className="v9TabFade"><section className="v9WeightCard"><div><small>POIDS</small>{weightWeekDelta&&<strong>{weightWeekDelta}</strong>}<i>vs mesure précédente</i><b>{latestDay?.weight!=null?fmt1(latestDay.weight):'—'} <em>kg</em></b></div>{weightPoints.length?<ResponsiveContainer width="100%" height={180}><LineChart data={weightPoints}><Line dataKey="w" stroke="#75eef0" strokeWidth={3} dot={{r:4,fill:'#d8fcff'}}/><XAxis dataKey="d" tick={{fill:'#90a8b2',fontSize:9}} axisLine={false}/><YAxis domain={['dataMin - 1','dataMax + 1']} tick={{fill:'#90a8b2',fontSize:9}} axisLine={false}/></LineChart></ResponsiveContainer>:<p className="v94NoData">Pas encore de mesure. Ajoute ton poids depuis Today pour voir ta courbe.</p>}</section><div className="v9ProgressGrid"><article><small>TOUR DE TAILLE</small><b>{latestDay?.waist!=null?latestDay.waist:'—'} <em>cm</em></b>{waistDelta&&<strong>{waistDelta}</strong>}</article><article><small>MASSE GRASSE</small><b>{latestDay?.bodyFat!=null?latestDay.bodyFat:'—'} <em>%</em></b>{bodyFatDelta&&<strong>{bodyFatDelta}</strong>}</article><article onClick={()=>setPhotos(true)}><small>PHOTOS</small><b>Voir</b><div className="v94PhotoPair"><img src={evolutionPhotos[0]?.src||"/body-os/v9-progress-athlete.png"}/><img src={evolutionPhotos.at(-1)?.src||"/body-os/v9-progress-athlete.png"}/></div></article></div><section className="v94RateCard"><div><small>RYTHME DE PERTE RÉEL</small><b>{realWeeklyRate!=null?`${realWeeklyRate>0?'+':''}${realWeeklyRate.toFixed(2).replace('.',',')} kg/sem`:'—'}</b></div><span>Objectif {String(nutritionSettings.weeklyRate).replace('.',',')} kg/sem · {weighedDays.length} mesure{weighedDays.length>1?'s':''}</span></section></div>}
  {tab==='physique'&&<div className="v9TabFade"><section className="v94Photos v982ProgressPhotos"><h3>PHOTOS D'ÉVOLUTION <button onClick={()=>setPhotos(true)}>＋ AJOUTER</button></h3><div>{evolutionPhotos.slice(-4).map((p,i)=><button key={p.id} onClick={()=>setPhotos(true)}><img src={p.src}/><small>{i===evolutionPhotos.slice(-4).length-1?'Aujourd’hui':p.label}</small></button>)}</div></section><section className="v9Impact"><span><small>DERNIÈRE MESURE</small><b>{latestMeasurement?`${latestMeasurement.value} cm`:'—'}</b>{measureDelta&&<strong>{measureDelta}</strong>}<em>{latestMeasurement?fmtHistoryDate(latestMeasurement.date):`${muscle} — pas encore mesuré`}</em></span><div className={'v94AthleteMini '+overlayFor(muscle)}><img src="/body-os/v9-progress-athlete.png"/><i></i><i></i></div></section><h3 className="v94Sub">ÉVOLUTION PAR MUSCLE <button onClick={()=>setMeasureOpen(true)}>＋ MESURER</button></h3><div className="v94MuscleChips">{muscleGroups.map(g=><button className={muscle===g?'active':''} onClick={()=>setMuscle(g)} key={g}>{g}</button>)}</div><section className="v94MuscleDetail"><div><small>{muscle.toUpperCase()}</small><b>{latestMeasurement?`${latestMeasurement.value} cm`:'—'}</b>{measureDelta&&<strong>{measureDelta}</strong>}<em>vs mesure précédente</em></div>{muscleTrend.length?<ResponsiveContainer width="100%" height={115}><LineChart data={muscleTrend}><Line dataKey="v" stroke="#78eff0" strokeWidth={2} dot={{r:3,fill:'#baffff'}}/><XAxis dataKey="d" tick={{fill:'#8ba6ad',fontSize:7}} axisLine={false}/><YAxis hide domain={['dataMin - 1','dataMax + 1']}/></LineChart></ResponsiveContainer>:<p className="v94NoData">Pas encore de mesure pour {muscle}. Touche ＋ MESURER pour commencer.</p>}</section></div>}
  {tab==='perf'&&<div className="v9TabFade"><section className="v94PerfHero"><small>PERFORMANCE EN SÈCHE</small><b>{perfLabel}</b>{perfChangePct!=null&&<strong>{perfChangePct>0?'+':''}{perfChangePct.toFixed(1).replace('.',',')} %</strong>}<p>{perfPoints.length>=2?'La force est maintenue malgré le déficit : bon signal pour la préservation musculaire.':'Enregistre des séries sur ce muscle pour voir ta progression réelle.'}</p></section><div className="v94MuscleChips">{muscleGroups.map(g=><button className={muscle===g?'active':''} onClick={()=>setMuscle(g)} key={g}>{g}</button>)}</div><section className="v9HistoryChart">{perfPoints.length?<ResponsiveContainer width="100%" height={210}><BarChart data={perfPoints}><Bar dataKey="v" fill="#8feef0" radius={[4,4,0,0]}/><YAxis hide domain={['dataMin - 5','dataMax + 5']}/><XAxis hide/></BarChart></ResponsiveContainer>:<p className="v94NoData">Pas encore de série enregistrée sur {muscle}.</p>}</section><section className="v94PerfStats"><span><small>VOLUME (7J)</small><b>{volumeThisWeek} série{volumeThisWeek>1?'s':''}</b></span><span><small>MEILLEUR POIDS</small><b>{bestWeightEver!=null?`${bestWeightEver} kg`:'—'}</b></span><span><small>SÉANCES</small><b>{sessionsLogged}</b></span></section></div>}
  {photos&&<EvolutionPhotosSheet photos={evolutionPhotos} close={()=>setPhotos(false)} onChange={setEvolutionPhotos}/>}
  {measureOpen&&<MeasurementsSheet latestByMuscle={latestByMuscle} close={()=>setMeasureOpen(false)} onSave={saveMeasurements}/>}
  {optionsOpen&&<OptionsSheet title="OPTIONS PROGRÈS" close={()=>setOptionsOpen(false)} options={[{label:'Exporter mes données (JSON)',onClick:exportProgressData}]}/>}
 </main>
}


function AdaptiveIntelligence({setScreen}:{setScreen:(s:Screen)=>void}){
 const [checkinOpen,setCheckinOpen]=useState(false)
 const [decisionOpen,setDecisionOpen]=useState(false)
 const [dailyLog,setDailyLog]=useState(readDailyLog())
 const latestDaily=dailyLog.at(-1)
 const [checkin,setCheckin]=useState({weight:latestDaily?.weight!=null?String(latestDaily.weight):'',waist:latestDaily?.waist!=null?String(latestDaily.waist):'',sleep:7,energy:4,hunger:3,recovery:4})
 const saveCheckin=()=>{
  const patch:Partial<DailyEntry>={}
  if(checkin.weight.trim()) patch.weight=Math.round(parseFloat(checkin.weight.replace(',','.'))*10)/10
  if(checkin.waist.trim()) patch.waist=Math.round(parseFloat(checkin.waist.replace(',','.'))*10)/10
  upsertDailyEntry(patch); setDailyLog(readDailyLog()); setCheckinOpen(false)
 }
 const weightPoints=dailyLog.filter(e=>e.weight!=null).slice(-14).map(e=>({d:fmtHistoryDate(e.date).slice(0,5),w:e.weight!}))
 const weighedDays=dailyLog.filter(e=>e.weight!=null)
 const latestWeight=weighedDays.at(-1)?.weight
 const previousWeight=weighedDays.length>=2?weighedDays[weighedDays.length-2].weight:undefined
 const trendStatus=latestWeight!=null&&previousWeight!=null?(latestWeight<=previousWeight?'OPTIMALE':'À SURVEILLER'):'EN ATTENTE'
 const spanDays=weighedDays.length>=2?(new Date(weighedDays.at(-1)!.date).getTime()-new Date(weighedDays[0].date).getTime())/86400000:0
 const realWeeklyRate=spanDays>=3?(weighedDays.at(-1)!.weight!-weighedDays[0].weight!)/spanDays*7:null
 const nutritionSettings=readJSON(NUTRITION_SETTINGS_KEY,DEFAULT_NUTRITION_SETTINGS)
 const preservation=94
 // Adhérence nutrition réelle sur les 7 derniers jours calendaires, à partir
 // du même journal quotidien que l'onglet SEMAINE/MOIS de Nutrition : un
 // jour est "dans la cible" si kcal/protéines sont à ±10% de l'objectif
 // configuré. Remplace les 91%/87%/94%/6-7 auparavant figés.
 const dailyNutrition=readNutritionDaily()
 const within=(val:number,target:number,tolerance=.1)=>target>0&&Math.abs(val-target)/target<=tolerance
 const last7Dates=Array.from({length:7},(_,i)=>{const d=new Date();d.setDate(d.getDate()-i);return d.toISOString().slice(0,10)})
 const loggedDays=last7Dates.filter(d=>dailyNutrition[d]!=null)
 const caloriesOnTarget=loggedDays.filter(d=>within(dailyNutrition[d].kcal,nutritionSettings.calories)).length
 const proteinOnTarget=loggedDays.filter(d=>within(dailyNutrition[d].protein,nutritionSettings.protein)).length
 const caloriesAdherencePct=loggedDays.length?Math.round(caloriesOnTarget/loggedDays.length*100):0
 const proteinAdherencePct=loggedDays.length?Math.round(proteinOnTarget/loggedDays.length*100):0
 const adherence=loggedDays.length?Math.round((caloriesAdherencePct+proteinAdherencePct)/2):0
 const adherenceLabel=loggedDays.length===0?'EN ATTENTE':adherence>=85?'TRÈS BON':adherence>=65?'BON':adherence>=40?'MOYEN':'À AMÉLIORER'
 // Numéro de semaine réel depuis la toute première donnée suivie (poids/taille
 // ou séance), plutôt qu'un "SEMAINE 7" figé sans rapport avec l'usage réel.
 const allTrackedDates=[...dailyLog.map(e=>e.date),...readWorkoutHistory().map(h=>h.date)]
 const earliestTrackedDate=allTrackedDates.length?allTrackedDates.slice().sort()[0]:todayISO()
 const daysSinceStart=Math.max(0,Math.floor((Date.now()-new Date(earliestTrackedDate+'T00:00:00').getTime())/86400000))
 const weekNumber=Math.floor(daysSinceStart/7)+1
 return <main className="v9Page v103Adaptive">
  <header className="v9TitleBar"><button onClick={()=>setScreen('today')}>‹</button><div><b>ADAPTIVE SÈCHE</b><small>INTELLIGENCE · SEMAINE {weekNumber}</small></div><span className="v103Live">● ACTIF</span></header>

  <section className="v103Decision">
   <div className="v103DecisionTop"><span><small>DÉCISION DE LA SEMAINE</small><b>MAINTENIR</b></span><strong>✓</strong></div>
   <p>La trajectoire est cohérente : poids et taille diminuent, performances stables et adhérence élevée.</p>
   <div className="v103DecisionMetrics"><span><small>POIDS 7J</small><b>−0,48 kg</b></span><span><small>TAILLE</small><b>−0,7 cm</b></span><span><small>PERF.</small><b>STABLE</b></span></div>
   <button onClick={()=>setDecisionOpen(true)}>{nutritionSettings.calories.toLocaleString('fr-FR')} KCAL MAINTENUES <b>›</b></button>
  </section>

  <section className="v103Trend">
   <header><div><small>TRAJECTOIRE 14 JOURS</small><b>{latestWeight!=null?`${fmt1(latestWeight)} kg`:'—'}</b></div><span>{trendStatus}</span></header>
   {weightPoints.length?<ResponsiveContainer width="100%" height={180}><LineChart data={weightPoints}><Line type="monotone" dataKey="w" stroke="#77eff0" strokeWidth={3} dot={{r:4,fill:'#d9ffff'}}/><XAxis dataKey="d" tick={{fill:'#829ca7',fontSize:9}} axisLine={false}/><YAxis domain={['dataMin - 1','dataMax + 1']} hide/></LineChart></ResponsiveContainer>:<p className="v94NoData">Pas encore de mesure. Complète le check-in pour voir ta courbe.</p>}
   <div className="v103Trajectory"><span>RÉEL {realWeeklyRate!=null?`${realWeeklyRate>0?'+':''}${realWeeklyRate.toFixed(2).replace('.',',')} kg/sem`:''}</span><i></i><span>OBJECTIF {String(nutritionSettings.weeklyRate).replace('.',',')} kg/sem.</span></div>
  </section>

  <div className="v103ScoreGrid">
   <section><small>MUSCLE PRESERVATION</small><div className="v103Ring"><b>{preservation}</b><em>/100</em></div><strong>EXCELLENT</strong><p>Force stable · protéines hautes · rythme de perte maîtrisé.</p></section>
   <section><small>ADHÉRENCE NUTRITION</small><div className="v103Ring"><b>{adherence}</b><em>%</em></div><strong>{adherenceLabel}</strong><p>{loggedDays.length?`Calories ${caloriesAdherencePct}% · protéines ${proteinAdherencePct}% · repas enregistrés ${loggedDays.length}/7.`:'Pas encore de repas enregistrés cette semaine.'}</p></section>
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
   <div className="v103Why"><b>Décision proposée : maintenir {nutritionSettings.calories.toLocaleString('fr-FR')} kcal</b><p>La moyenne de poids baisse au rythme cible, le tour de taille diminue et les performances restent stables. Réduire davantage les calories n'apporte pas de bénéfice évident aujourd'hui.</p><small>CONFIANCE DU MOTEUR</small><strong>ÉLEVÉE · 92%</strong><p>Cette recommandation est une aide à la décision, pas un diagnostic médical.</p></div>
  </InfoSheet>}
 </main>
}

function Coach({setScreen}:{setScreen:(s:Screen)=>void}){
 const [answer,setAnswer]=useState(''); const [q,setQ]=useState('')
 const ask=(kind:string)=>{if(kind==='progression'){setScreen('adaptive');return} setAnswer(kind==='progression'?'Trajectoire cohérente : conserve les calories et vise la stabilité de tes performances.':kind==='adjust'?'Aucun ajustement majeur aujourd’hui. Priorité : protéines, sommeil et performance sur les mouvements de base.':'Conseil récupération : garde 1–2 RIR sur la majorité des séries et évite d’augmenter simultanément cardio et volume musculation.')}
 return <main className="v9Page v9Coach"><header className="v9TitleBar"><button onClick={()=>setScreen('plus')}>‹</button><div><b>AI COACH</b></div><span className="v9Online">● DÉMO</span></header><div className="v9Orb"><i></i><i></i><b>✦</b></div><section className="v9CoachHello"><b>Salut Fouad 👋</b><span>Que veux-tu optimiser aujourd'hui ?</span></section><div className="v9CoachPrompts"><button onClick={()=>ask('progression')}>◉ <span>Analyse de ma progression</span>›</button><button onClick={()=>ask('adjust')}>◎ <span>Que dois-je ajuster ?</span>›</button><button onClick={()=>setScreen('plan')}>◌ <span>Planifie ma semaine</span>›</button><button onClick={()=>ask('recovery')}>♙ <span>Conseil récupération</span>›</button></div>{answer&&<div className="v93CoachAnswer">{answer}</div>}<label className="v9Ask"><input value={q} onChange={e=>setQ(e.target.value)} placeholder="Pose une question…"/><button onClick={()=>{if(q.trim()){setAnswer('Mode démo : ta question est enregistrée. Le moteur LLM sera branché séparément.');setQ('')}}}>➤</button></label><div className="v9CoachNote">Mode démo : moteur BODY OS local. Aucun token OpenAI requis.</div></main>
}

function Plus({setScreen}:{setScreen:(s:Screen)=>void}){
 return <main className="v9Page"><header className="v9TitleBar"><button onClick={()=>setScreen('today')}>‹</button><div><b>PLUS</b></div><span></span></header><div className="v9CoachPrompts"><button onClick={()=>setScreen('library')}>▤ <span>Bibliothèque d'exercices</span>›</button><button onClick={()=>setScreen('templates')}>◧ <span>Mes séances</span>›</button><button onClick={()=>setScreen('coach')}>✦ <span>AI Coach</span>›</button><button onClick={()=>setScreen('plan')}>◫ <span>Plan — Semaine</span>›</button></div></main>
}

function LibraryDetailSheet({entry,close}:{entry:LibraryEntry,close:()=>void}){
 const openVideo=()=>window.open(entry.video,'_blank','noopener,noreferrer')
 return <div className="v9SheetBack" onClick={close}><section className="v93InfoSheet" onClick={e=>e.stopPropagation()}>
  <header><button onClick={close}>×</button><b>{entry.name}</b><span></span></header>
  <div>
   <img src={entry.img} onError={thumbFallback} className="v9LibDetailImg" onClick={openVideo} role="button" tabIndex={0} onKeyDown={e=>e.key==='Enter'&&openVideo()}/>
   <div className="v93Prescription"><span><small>ZONE REPS</small><b>{entry.reps}</b></span><span><small>RIR CIBLE</small><b>{entry.rir}</b></span><span><small>REPOS</small><b>{entry.rest}</b></span></div>
   <p><b>Groupe</b> {entry.group} · <b>Matériel</b> {entry.equipment}</p>
   <p><b>Cible</b> {entry.target}</p>
   <p><b>Secondaire</b> {entry.secondary}</p>
   <button className="v9Primary" onClick={openVideo}>VOIR LA VIDÉO</button>
  </div>
 </section></div>
}

function Bibliotheque({setScreen}:{setScreen:(s:Screen)=>void}){
 const [query,setQuery]=useState('')
 const [group,setGroup]=useState<SessionGroup|'Tous'>('Tous')
 const [equipment,setEquipment]=useState<string|'Tous'>('Tous')
 const [detail,setDetail]=useState<LibraryEntry|null>(null)
 const q=query.trim().toLowerCase()
 const results=exerciseLibrary.filter(e=>
  (group==='Tous'||e.group===group)&&
  (equipment==='Tous'||e.equipment===equipment)&&
  (q===''||e.name.toLowerCase().includes(q)||e.target.toLowerCase().includes(q)||e.equipment.toLowerCase().includes(q))
 )
 return <main className="v9Page" aria-label="Bibliothèque d'exercices">
  <header className="v9TitleBar"><button onClick={()=>setScreen('plus')}>‹</button><div><b>BIBLIOTHÈQUE</b><small>{exerciseLibrary.length} exercices</small></div><span></span></header>
  <div className="v9Ask v9LibSearch"><input value={query} onChange={e=>setQuery(e.target.value)} placeholder="Rechercher un exercice, un muscle, un matériel…" aria-label="Rechercher un exercice"/></div>
  <div className="v94MuscleTabs v9LibTabs"><button className={group==='Tous'?'active':''} onClick={()=>setGroup('Tous')}><small>Tous</small></button>{sessionGroups.map(g=><button key={g} className={g===group?'active':''} onClick={()=>setGroup(g)}><span>{g==='Pectoraux'?'♜':g==='Dos'?'♙':g==='Épaules'?'✣':g==='Jambes'?'♧':g==='Bras'?'◉':'⚕'}</span><small>{g}</small></button>)}</div>
  <div className="v9Segments v9LibEquip"><select value={equipment} onChange={e=>setEquipment(e.target.value)} aria-label="Filtrer par matériel"><option value="Tous">Tout matériel</option>{libraryEquipments.map(eq=><option key={eq} value={eq}>{eq}</option>)}</select></div>
  <section className="v9ExerciseList v9LibList">
   {results.map(e=><button key={`${e.group}::${e.name}`} onClick={()=>setDetail(e)}><div className="v93Thumb"><img src={e.img} onError={thumbFallback}/><i>▶</i></div><span><small>{e.group}</small><b>{e.name}</b><em>{e.equipment} · {e.target}</em></span><i>›</i></button>)}
  </section>
  {results.length===0&&<p className="v9LibEmpty">Aucun exercice ne correspond à cette recherche.</p>}
  {detail&&<LibraryDetailSheet entry={detail} close={()=>setDetail(null)}/>}
 </main>
}

function TemplateBuilderSheet({group,close,onSave}:{group:SessionGroup,close:()=>void,onSave:(name:string,exerciseNames:string[])=>void}){
 const [name,setName]=useState('')
 const [picked,setPicked]=useState<string[]>([])
 const options=exerciseLibrary.filter(e=>e.group===group)
 const toggle=(n:string)=>setPicked(p=>p.includes(n)?p.filter(x=>x!==n):[...p,n])
 const save=()=>{if(!name.trim()||picked.length===0) return;onSave(name.trim(),options.filter(e=>picked.includes(e.name)).map(e=>e.name));close()}
 return <div className="v9SheetBack" onClick={close}><section className="v9MealSheet" onClick={e=>e.stopPropagation()}>
  <header><button onClick={close}>×</button><b>NOUVELLE SÉANCE</b><span></span></header>
  <div className="v9TemplateBuilder">
   <label className="v9TemplateNameLabel">NOM<input value={name} onChange={e=>setName(e.target.value)} placeholder={`ex. ${group} — variante B`}/></label>
   <small className="v9TemplatePickHint">CHOISIR LES EXERCICES ({picked.length})</small>
   <div className="v9TemplatePickList">
    {options.map(e=><label key={e.name} className="v9TemplatePickRow"><input type="checkbox" checked={picked.includes(e.name)} onChange={()=>toggle(e.name)}/><span>{e.name}</span><em>{e.equipment}</em></label>)}
   </div>
   <button className="v9Primary" onClick={save} disabled={!name.trim()||picked.length===0}>CRÉER LA SÉANCE</button>
  </div>
 </section></div>
}

function MesSeances({setScreen}:{setScreen:(s:Screen)=>void}){
 const [activeGroup,setActiveGroup]=useState<SessionGroup|null>(null)
 const [active,setActiveState]=useState<Record<string,string>>(()=>readActiveTemplates())
 const [templates,setTemplatesState]=useState<WorkoutTemplate[]>(()=>readTemplates())
 const [builderOpen,setBuilderOpen]=useState(false)
 const setActive=(next:Record<string,string>)=>{setActiveState(next);writeActiveTemplates(next)}
 const setTemplates=(next:WorkoutTemplate[])=>{setTemplatesState(next);writeTemplates(next)}
 const activate=(group:SessionGroup,id:string)=>setActive({...active,[group]:id})
 const createTemplate=(group:SessionGroup,name:string,exerciseNames:string[])=>{
  const tpl:WorkoutTemplate={id:newTemplateId(),name,group,exerciseNames}
  setTemplates([...templates,tpl])
  activate(group,tpl.id)
 }
 const deleteTemplate=(id:string)=>{
  setTemplates(templates.filter(t=>t.id!==id))
  const group=templates.find(t=>t.id===id)?.group
  if(group&&active[group]===id) activate(group,DEFAULT_TEMPLATE_ID)
 }
 if(activeGroup){
  const groupTemplates=templates.filter(t=>t.group===activeGroup)
  const activeId=active[activeGroup]??DEFAULT_TEMPLATE_ID
  return <main className="v9Page" aria-label="Mes séances">
   <header className="v9TitleBar"><button onClick={()=>setActiveGroup(null)}>‹</button><div><b>{activeGroup.toUpperCase()}</b><small>Mes séances</small></div><span></span></header>
   <section className="v9TemplateList">
    <div className="v9TemplateRow">
     <button className={`v9TemplateSelect${activeId===DEFAULT_TEMPLATE_ID?' active':''}`} onClick={()=>activate(activeGroup,DEFAULT_TEMPLATE_ID)}>
      <span><b>Séance standard</b><em>{sessionData[activeGroup].length} exercices · intégrée</em></span>
      <i>{activeId===DEFAULT_TEMPLATE_ID?'✓':'○'}</i>
     </button>
    </div>
    {groupTemplates.map(t=><div key={t.id} className="v9TemplateRow">
     <button className={`v9TemplateSelect${activeId===t.id?' active':''}`} onClick={()=>activate(activeGroup,t.id)}>
      <span><b>{t.name}</b><em>{t.exerciseNames.length} exercices · personnalisée</em></span>
      <i>{activeId===t.id?'✓':'○'}</i>
     </button>
     <button className="v9TemplateDelete" aria-label={`Supprimer ${t.name}`} onClick={()=>deleteTemplate(t.id)}>×</button>
    </div>)}
   </section>
   <button className="v9Outline" onClick={()=>setBuilderOpen(true)}>+ CRÉER UNE SÉANCE</button>
   {builderOpen&&<TemplateBuilderSheet group={activeGroup} close={()=>setBuilderOpen(false)} onSave={(name,names)=>createTemplate(activeGroup,name,names)}/>}
  </main>
 }
 return <main className="v9Page" aria-label="Mes séances">
  <header className="v9TitleBar"><button onClick={()=>setScreen('plus')}>‹</button><div><b>MES SÉANCES</b></div><span></span></header>
  <section className="v9TemplateGroupList">
   {sessionGroups.map(g=>{
    const activeId=active[g]??DEFAULT_TEMPLATE_ID
    const tplName=activeId===DEFAULT_TEMPLATE_ID?'Séance standard':templates.find(t=>t.id===activeId)?.name??'Séance standard'
    return <button key={g} onClick={()=>setActiveGroup(g)}><i className="v9TemplateGroupIcon">{g==='Pectoraux'?'♜':g==='Dos'?'♙':g==='Épaules'?'✣':g==='Jambes'?'♧':g==='Bras'?'◉':'⚕'}</i><span><b>{g}</b><em>{tplName}</em></span><strong>›</strong></button>
   })}
  </section>
 </main>
}

function Plan({setScreen}:{setScreen:(s:Screen)=>void}){
 const [selected,setSelected]=useState(mondayIndex())
 const [schedule,setSchedule]=useState<DayPlan[]>(()=>readSchedule())
 const [programOpen,setProgramOpen]=useState(false)
 const monday=useMemo(()=>{const d=new Date();d.setDate(d.getDate()-mondayIndex());return d},[])
 const fmtDate=(d:Date)=>`${String(d.getDate()).padStart(2,'0')}/${String(d.getMonth()+1).padStart(2,'0')}`
 const sunday=useMemo(()=>{const d=new Date(monday);d.setDate(d.getDate()+6);return d},[monday])
 const saveSchedule=(s:DayPlan[])=>{writeJSON(SCHEDULE_KEY,s);setSchedule(s)}
 const days=WEEKDAYS.map((w,i)=>{
  const d=new Date(monday); d.setDate(monday.getDate()+i)
  const plan=schedule[i]
  const kind=plan==='Repos'?'Repos':plan==='Cardio'?'Cardio':plan==='L5-S1'?'Renforcement':isRappelDay(schedule,i)?'Rappel':'Musculation'
  return {abbr:w.slice(0,3).toUpperCase(),date:d.getDate(),plan,kind}
 })
 return <main className="v9Page"><header className="v9TitleBar"><button onClick={()=>setScreen('plus')}>‹</button><div><b>PLAN — SEMAINE</b><small>{fmtDate(monday)} – {fmtDate(sunday)}</small></div><button className="v93Dots" onClick={()=>setProgramOpen(true)} aria-label="Modifier mon programme">◫</button></header><section className="v9Week">{days.map((d,i)=><article onClick={()=>setSelected(i)} className={i===selected?'active':''} key={d.abbr}><b>{d.abbr}</b><strong>{d.date}</strong><span><i>{d.plan}</i></span><em><i>{d.kind}</i></em><small>◌ 10 000 pas</small></article>)}</section><section className="v9WeekGoal"><div><small>OBJECTIF DE LA SEMAINE</small><p>Continuer la sèche en préservant le muscle.<br/>Déficit modéré.<br/>Protéines hautes.<br/>Performances stables.</p></div><aside><b>Tes progrès sont excellents.</b><span>Aucun ajustement calorique nécessaire cette semaine.</span><strong>92%</strong></aside></section>
  {programOpen&&<ProgramSheet schedule={schedule} close={()=>setProgramOpen(false)} onSave={saveSchedule}/>}
 </main>
}

export default function V9App(){
 const [screen,setScreen]=useState<Screen>('today'); const [workoutView,setWorkoutView]=useState<WorkoutView>('session')
 const todayPlan=readSchedule()[mondayIndex()]
 const initialGroup=(sessionGroups as string[]).includes(todayPlan)?todayPlan as SessionGroup:'Pectoraux'
 const page=useMemo(()=>screen==='today'?<Today setScreen={setScreen}/>:screen==='workout'?<Workout view={workoutView} setView={setWorkoutView} setScreen={setScreen} initialGroup={initialGroup}/>:screen==='nutrition'?<Nutrition setScreen={setScreen}/>:screen==='progress'?<Progress setScreen={setScreen}/>:screen==='coach'?<Coach setScreen={setScreen}/>:screen==='adaptive'?<AdaptiveIntelligence setScreen={setScreen}/>:screen==='plus'?<Plus setScreen={setScreen}/>:screen==='library'?<Bibliotheque setScreen={setScreen}/>:screen==='templates'?<MesSeances setScreen={setScreen}/>:<Plan setScreen={setScreen}/>,[screen,workoutView])
 const showNav=screen==='nutrition'||screen==='progress'||screen==='plus'||screen==='library'||screen==='templates'
 return <div className="v9Shell"><div className="v9Phone">{page}{showNav&&<BottomNav screen={screen} setScreen={s=>{setScreen(s);if(s==='workout')setWorkoutView('session')}}/>}</div></div>
}
