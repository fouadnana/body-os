// Écran "Bibliothèque" d'exercices + sa "Fiche exercice" (détail plein écran,
// V3). Extrait de V9App.tsx (Phase 6), étendu en Phase V3.
import { useState } from 'react'
import type { LibraryEntry, Screen, SessionGroup, SetDraft } from '../types'
import { exerciseLibrary, libraryEquipments, sessionGroups } from '../data'
import { EXERCISE_FAVORITES_KEY, readJSON, readWorkoutHistory, WORKOUT_LOG_KEY, writeJSON } from '../storage'
import { fmtHistoryDate, suggestProgression, thumbFallback } from '../utils'
import { Toast } from '../components/Shared'

const favoriteId=(e:{group:SessionGroup,name:string})=>`${e.group}::${e.name}`

function FicheExercice({entry,isFavorite,onToggleFavorite,close}:{entry:LibraryEntry,isFavorite:boolean,onToggleFavorite:()=>void,close:()=>void}){
 const [tab,setTab]=useState<'infos'|'muscles'|'historique'>('infos')
 const [editing,setEditing]=useState(false)
 const [toast,setToast]=useState('')
 const openVideo=()=>window.open(entry.video,'_blank','noopener,noreferrer')
 const logKey=`${entry.group}::${entry.name}`
 const targetRir=Number(String(entry.rir).match(/\d+/)?.[0] ?? 2)
 const history=readWorkoutHistory().filter(h=>h.group===entry.group&&h.exercise===entry.name)
 const lastPast=history.at(-1)
 const progression=lastPast?suggestProgression(entry.reps,targetRir,lastPast):null
 const [draft,setDraft]=useState<SetDraft>(()=>progression?{weight:progression.weight,reps:progression.reps,rir:progression.rir}:{weight:lastPast?.weight??0,reps:lastPast?.reps??10,rir:targetRir})

 const applySuggestion=(d:SetDraft)=>{
  writeJSON(WORKOUT_LOG_KEY,{...readJSON(WORKOUT_LOG_KEY,{}),[logKey]:d})
  setEditing(false)
  setToast('Suggestion appliquée ✓ — reprise à ta prochaine séance')
  setTimeout(()=>setToast(''),2300)
 }

 return <main className="v9Page v106Fiche" aria-label={`Fiche exercice — ${entry.name}`}>
  <header className="v9TitleBar"><button onClick={close}>‹</button><div><b>{entry.name}</b></div><button className={`v97FavoriteToggle${isFavorite?' active':''}`} onClick={onToggleFavorite} aria-label={isFavorite?'Retirer des favoris':'Ajouter aux favoris'}>{isFavorite?'★':'☆'}</button></header>
  <section className="v9Media v93VideoMedia v98Media" onClick={openVideo} role="button" tabIndex={0} onKeyDown={e=>e.key==='Enter'&&openVideo()}>
   <img src={entry.img} onError={thumbFallback} draggable={false}/>
   <button onClick={e=>{e.stopPropagation();openVideo()}}>▶</button>
  </section>
  <div className="v106FicheTags"><span>{entry.group}</span><span>{entry.equipment}</span></div>
  <div className="v9Segments">
   <button className={tab==='infos'?'active':''} onClick={()=>setTab('infos')}>INFOS</button>
   <button className={tab==='muscles'?'active':''} onClick={()=>setTab('muscles')}>MUSCLES</button>
   <button className={tab==='historique'?'active':''} onClick={()=>setTab('historique')}>HISTORIQUE</button>
  </div>

  {tab==='infos'&&<div className="v106FicheTab">
   <div className="v106Prescription"><span><small>ZONE REPS</small><b>{entry.reps}</b></span><span><small>RIR CIBLE</small><b>{entry.rir}</b></span><span><small>REPOS</small><b>{entry.rest}</b></span></div>

   <section className="v106Progression">
    <header><b>PROGRESSION (SUGGESTION)</b></header>
    {!lastPast
     ?<p className="v94NoData">Pas encore de série enregistrée pour cet exercice — ta première séance servira de référence.</p>
     :!progression
      ?<p className="v94NoData">Exercice chronométré ou sans fourchette de reps claire : pas de suggestion automatique.</p>
      :!editing?<>
       <p><small>DERNIÈRE FOIS</small> {lastPast.weight} kg × {lastPast.reps} {lastPast.rir!=null?`(RIR ${lastPast.rir})`:''} → <small>SUGGESTION</small> <b>{progression.weight} kg × {progression.reps}</b></p>
       <p className="v9ProgressionNote">💡 {progression.reason}</p>
       <div className="v106FicheActions"><button className="v9Primary" onClick={()=>applySuggestion({weight:progression.weight,reps:progression.reps,rir:progression.rir})}>APPLIQUER</button><button className="v9Outline" onClick={()=>{setDraft({weight:progression.weight,reps:progression.reps,rir:progression.rir});setEditing(true)}}>MODIFIER</button></div>
      </>:<>
       <div className="v9Load"><button onClick={()=>setDraft(d=>({...d,weight:Math.max(0,d.weight-2.5)}))}>−</button><b>{draft.weight}</b><em>KG</em><button onClick={()=>setDraft(d=>({...d,weight:d.weight+2.5}))}>+</button></div>
       <div className="v9SetMeta"><span><small>RÉPÉTITIONS</small><div className="v9RirStepper"><button onClick={()=>setDraft(d=>({...d,reps:Math.max(1,d.reps-1)}))}>−</button><b>{draft.reps}</b><button onClick={()=>setDraft(d=>({...d,reps:d.reps+1}))}>+</button></div></span><span><small>RIR</small><div className="v9RirStepper"><button onClick={()=>setDraft(d=>({...d,rir:Math.max(0,d.rir-1)}))}>−</button><b>{draft.rir}</b><button onClick={()=>setDraft(d=>({...d,rir:Math.min(5,d.rir+1)}))}>+</button></div></span></div>
       <div className="v106FicheActions"><button className="v9Primary" onClick={()=>applySuggestion(draft)}>APPLIQUER</button><button onClick={()=>setEditing(false)}>ANNULER</button></div>
      </>}
   </section>

   {entry.target&&<section className="v106Execution">
    <header><b>EXÉCUTION</b></header>
    <ol><li><span>1</span>Installe-toi en position stable, amplitude complète sur {entry.equipment.toLowerCase()}.</li><li><span>2</span>Descends/engage en contrôlant la charge jusqu'à l'étirement cible sur {entry.target.toLowerCase()}.</li><li><span>3</span>Pousse/tire de façon explosive sans perdre la tension, jusqu'à {entry.reps} répétitions, RIR {entry.rir}.</li></ol>
   </section>}
  </div>}

  {tab==='muscles'&&<div className="v106FicheTab v106FicheMuscles">
   <p><b>Cible</b> {entry.target}</p>
   <p><b>Secondaire</b> {entry.secondary}</p>
  </div>}

  {tab==='historique'&&<div className="v106FicheTab">
   {history.length===0
    ?<p className="v94NoData">Aucune série enregistrée pour cet exercice.</p>
    :<div className="v9HistoryRows">{history.slice(-20).reverse().map((h,i)=><div className={i===0?'active':''} key={h.id??i}><b>{fmtHistoryDate(h.date)}</b><span>{h.weight} kg × {h.reps}</span><em>RIR {h.rir??'—'}</em></div>)}</div>}
  </div>}
  {toast&&<Toast text={toast}/>}
 </main>
}

export function Bibliotheque({setScreen}:{setScreen:(s:Screen)=>void}){
 const [query,setQuery]=useState('')
 const [group,setGroup]=useState<SessionGroup|'Tous'>('Tous')
 const [equipment,setEquipment]=useState<string|'Tous'>('Tous')
 const [favoritesOnly,setFavoritesOnly]=useState(false)
 const [view,setView]=useState<'list'|'grid'>('list')
 const [detail,setDetail]=useState<LibraryEntry|null>(null)
 const [favorites,setFavoritesState]=useState<string[]>(()=>readJSON(EXERCISE_FAVORITES_KEY,[]))
 const setFavorites=(next:string[])=>{setFavoritesState(next);writeJSON(EXERCISE_FAVORITES_KEY,next)}
 const toggleFavorite=(id:string)=>setFavorites(favorites.includes(id)?favorites.filter(x=>x!==id):[...favorites,id])

 if(detail) return <FicheExercice entry={detail} isFavorite={favorites.includes(favoriteId(detail))} onToggleFavorite={()=>toggleFavorite(favoriteId(detail))} close={()=>setDetail(null)}/>

 const q=query.trim().toLowerCase()
 const results=exerciseLibrary.filter(e=>
  (group==='Tous'||e.group===group)&&
  (equipment==='Tous'||e.equipment===equipment)&&
  (!favoritesOnly||favorites.includes(favoriteId(e)))&&
  (q===''||e.name.toLowerCase().includes(q)||e.target.toLowerCase().includes(q)||e.equipment.toLowerCase().includes(q))
 )
 return <main className="v9Page" aria-label="Bibliothèque d'exercices">
  <header className="v9TitleBar"><button onClick={()=>setScreen('plus')}>‹</button><div><b>BIBLIOTHÈQUE</b><small>{exerciseLibrary.length} exercices</small></div><span></span></header>
  <div className="v9Ask v9LibSearch"><input value={query} onChange={e=>setQuery(e.target.value)} placeholder="Rechercher un exercice, un muscle, un matériel…" aria-label="Rechercher un exercice"/></div>
  <div className="v94MuscleTabs v9LibTabs"><button className={group==='Tous'?'active':''} onClick={()=>setGroup('Tous')}><small>Tous</small></button>{sessionGroups.map(g=><button key={g} className={g===group?'active':''} onClick={()=>setGroup(g)}><span>{g==='Pectoraux'?'♜':g==='Dos'?'♙':g==='Épaules'?'✣':g==='Jambes'?'♧':g==='Bras'?'◉':'⚕'}</span><small>{g}</small></button>)}</div>
  <div className="v9Segments v9LibEquip"><select value={equipment} onChange={e=>setEquipment(e.target.value)} aria-label="Filtrer par matériel"><option value="Tous">Tout matériel</option>{libraryEquipments.map(eq=><option key={eq} value={eq}>{eq}</option>)}</select></div>
  <div className="v9LibToolbar">
   <button className={`v9LibFavFilter${favoritesOnly?' active':''}`} onClick={()=>setFavoritesOnly(f=>!f)} aria-pressed={favoritesOnly}>★ FAVORIS</button>
   <span className="v9LibCount">{results.length} résultat{results.length>1?'s':''}</span>
   <div className="v9LibViewToggle">
    <button className={view==='list'?'active':''} onClick={()=>setView('list')} aria-label="Vue liste">☰</button>
    <button className={view==='grid'?'active':''} onClick={()=>setView('grid')} aria-label="Vue grille">⊞</button>
   </div>
  </div>
  {view==='list'
   ?<section className="v9ExerciseList v9LibList">
    {results.map(e=>{const fav=favorites.includes(favoriteId(e));return <button key={favoriteId(e)} onClick={()=>setDetail(e)}><div className="v93Thumb"><img src={e.img} onError={thumbFallback}/><i>▶</i></div><span><small>{e.group}</small><b>{e.name}</b><em>{e.equipment} · {e.target}</em></span><i className={`v9LibStar${fav?' active':''}`} onClick={ev=>{ev.stopPropagation();toggleFavorite(favoriteId(e))}} role="button" aria-label={fav?'Retirer des favoris':'Ajouter aux favoris'}>{fav?'★':'☆'}</i></button>})}
   </section>
   :<section className="v9LibGrid">
    {results.map(e=>{const fav=favorites.includes(favoriteId(e));return <button key={favoriteId(e)} onClick={()=>setDetail(e)}><div className="v93Thumb"><img src={e.img} onError={thumbFallback}/><i>▶</i><em className={`v9LibStar${fav?' active':''}`} onClick={ev=>{ev.stopPropagation();toggleFavorite(favoriteId(e))}} role="button" aria-label={fav?'Retirer des favoris':'Ajouter aux favoris'}>{fav?'★':'☆'}</em></div><small>{e.group}</small><b>{e.name}</b></button>})}
   </section>}
  {results.length===0&&<p className="v9LibEmpty">{favoritesOnly?'Aucun favori ne correspond à ces filtres.':'Aucun exercice ne correspond à cette recherche.'}</p>}
 </main>
}
