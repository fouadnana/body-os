// Écran "Bibliothèque" d'exercices + sa sheet de détail. Extrait de
// V9App.tsx (Phase 6).
import { useState } from 'react'
import type { LibraryEntry, Screen, SessionGroup } from '../types'
import { exerciseLibrary, libraryEquipments, sessionGroups } from '../data'
import { thumbFallback } from '../utils'

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

export function Bibliotheque({setScreen}:{setScreen:(s:Screen)=>void}){
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
