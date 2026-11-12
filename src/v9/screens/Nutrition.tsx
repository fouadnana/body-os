// Écran "Nutrition" (programme/recettes, tendance, réglages) + ses sheets
// (ajout rapide, détail repas, détail recette). Extrait de V9App.tsx (Phase 6).
import { useEffect, useState } from 'react'
import { Line, LineChart, ReferenceLine, ResponsiveContainer, XAxis, YAxis } from 'recharts'
import FoodVision, { type FoodVisionPayload } from '../../FoodVision'
import type { Ingredient, Meal, NutritionDaily, Recipe, Screen } from '../types'
import { DEFAULT_NUTRITION_SETTINGS, meals, recipes } from '../data'
import {
 NUTRITION_DAILY_KEY, NUTRITION_MEALS_KEY, NUTRITION_SETTINGS_KEY, RECIPE_FAVORITES_KEY,
 readJSON, readNutritionDaily, todayISO, writeJSON,
} from '../storage'
import { computeMacros, fmtHistoryDate, mealDetails } from '../utils'
import { Toast } from '../components/Shared'

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

export function Nutrition({setScreen}:{setScreen:(s:Screen)=>void}){
 const [open,setOpen]=useState<Meal|null>(null)
 // V3 : REPAS/ALIMENTS/MACROS (remplace PROGRAMME/RECETTES + le segment
 // AUJOURD'HUI/SEMAINE/MOIS) — l'anneau calories/macros devient un en-tête
 // permanent (plus seulement visible sous REPAS), et SEMAINE/MOIS devient
 // un sous-réglage de l'onglet MACROS plutôt qu'un 3e onglet de même niveau.
 const [tab,setTab]=useState<'meals'|'foods'|'macros'>('meals')
 const [trendRange,setTrendRange]=useState<'week'|'month'>('week')
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
 const trendForTab=trendRange==='week'?weekPoints:monthPoints
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
   setRecipeOpen(null); setTab('meals'); setToast(`${r.name} ajouté au programme`)
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

  <section className="v9NutritionHero">
   <div className="v9MacroRing"><b>{settings.calories.toLocaleString('fr-FR')}</b><small>kcal cibles</small></div>
   <div className="v9MacroLegend">
    <p><i></i><span>PROTÉINES</span><b>{settings.protein} g</b></p>
    <p><i></i><span>GLUCIDES</span><b>{settings.carbs} g</b></p>
    <p><i></i><span>LIPIDES</span><b>{settings.fat} g</b></p>
   </div>
  </section>

  <div className="v97ModeTabs">
   <button className={tab==='meals'?'active':''} onClick={()=>setTab('meals')}>REPAS</button>
   <button className={tab==='foods'?'active':''} onClick={()=>setTab('foods')}>ALIMENTS</button>
   <button className={tab==='macros'?'active':''} onClick={()=>setTab('macros')}>MACROS</button>
  </div>

  {tab==='meals'?<>
   <button className="v99VisionCTA" onClick={()=>setVisionOpen(true)}><span>✦</span><div><small>AI FOOD VISION</small><b>ANALYSER MON REPAS</b></div><em>PHOTO → MACROS</em></button>
   <section className="v9MealList">
    <h3>REPAS DU JOUR</h3>
    {mealState.map(m=><button key={m.name} onClick={()=>setOpen(m)}>
     <span className="v95MealText"><small>{m.name}</small><b>{mealDetails(m.ingredients)}</b><em>{m.time}</em></span>
     <img src={m.img}/><strong>{m.kcal} kcal</strong>
    </button>)}
   </section>
   <button className="v9Fab" onClick={()=>setQuickAddOpen(true)}>＋</button>
  </>:tab==='macros'?<section className="v9HistoryChart v9NutritionTrend">
   <div className="v9Segments v97Segments2">
    <button className={trendRange==='week'?'active':''} onClick={()=>setTrendRange('week')}>SEMAINE</button>
    <button className={trendRange==='month'?'active':''} onClick={()=>setTrendRange('month')}>MOIS</button>
   </div>
   <h3>{trendRange==='week'?'APERÇU SEMAINE':'TENDANCE DU MOIS'}</h3>
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
   </>:<p className="v94NoData">Pas encore assez de jours suivis. Reviens demain pour voir ta tendance {trendRange==='week'?'hebdomadaire':'mensuelle'}.</p>}
  </section>:<>
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
