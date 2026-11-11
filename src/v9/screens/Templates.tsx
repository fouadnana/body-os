// Écran "Mes séances" (V3 — templates transversaux aux groupes musculaires,
// réordonnables par glisser-déposer). Une séance s'ouvre désormais par un
// template ("Haut du corps"), pas par un groupe musculaire : voir
// src/v9/data.ts pour le modèle (BUILTIN_TEMPLATES, resolveTemplateExercises).
import { useRef, useState } from 'react'
import type { Screen, SessionGroup, TemplateExerciseRef, WorkoutTemplate } from '../types'
import { estimateTemplateMinutes, exerciseLibrary, sessionGroups } from '../data'
import { newTemplateId, readTemplates, writeTemplates } from '../storage'
import { thumbFallback } from '../utils'

function ExercisePickerSheet({exclude,close,onPick}:{exclude:TemplateExerciseRef[],close:()=>void,onPick:(ref:TemplateExerciseRef)=>void}){
 const [group,setGroup]=useState<SessionGroup|'Tous'>('Tous')
 const excluded=new Set(exclude.map(e=>`${e.group}::${e.name}`))
 const options=exerciseLibrary.filter(e=>(group==='Tous'||e.group===group)&&!excluded.has(`${e.group}::${e.name}`))
 return <div className="v9SheetBack" onClick={close}><section className="v9MealSheet" onClick={e=>e.stopPropagation()}>
  <header><button onClick={close}>×</button><b>AJOUTER UN EXERCICE</b><span></span></header>
  <div className="v94MuscleTabs v9LibTabs"><button className={group==='Tous'?'active':''} onClick={()=>setGroup('Tous')}><small>Tous</small></button>{sessionGroups.map(g=><button key={g} className={g===group?'active':''} onClick={()=>setGroup(g)}><small>{g}</small></button>)}</div>
  <section className="v9ExerciseList v9LibList v9PickerList">
   {options.map(e=><button key={`${e.group}::${e.name}`} onClick={()=>onPick({group:e.group,name:e.name})}><div className="v93Thumb"><img src={e.img} onError={thumbFallback}/><i>▶</i></div><span><small>{e.group}</small><b>{e.name}</b><em>{e.equipment}</em></span><i>›</i></button>)}
  </section>
  {options.length===0&&<p className="v9LibEmpty">Tous les exercices de ce groupe sont déjà dans le template.</p>}
 </section></div>
}

function RenameSheet({initial,title,placeholder,confirmLabel,close,onSave}:{initial:string,title:string,placeholder:string,confirmLabel:string,close:()=>void,onSave:(name:string)=>void}){
 const [name,setName]=useState(initial)
 const save=()=>{if(!name.trim()) return;onSave(name.trim());close()}
 return <div className="v9SheetBack" onClick={close}><section className="v9MealSheet" onClick={e=>e.stopPropagation()}>
  <header><button onClick={close}>×</button><b>{title}</b><span></span></header>
  <div className="v9TemplateBuilder">
   <label className="v9TemplateNameLabel">NOM<input value={name} onChange={e=>setName(e.target.value)} placeholder={placeholder} autoFocus/></label>
   <button className="v9Primary" onClick={save} disabled={!name.trim()}>{confirmLabel}</button>
  </div>
 </section></div>
}

function TemplateEditor({tpl,close,onRename,onReorder,onRemoveExercise,onAddExercise}:{
 tpl:WorkoutTemplate
 close:()=>void
 onRename:(name:string)=>void
 onReorder:(from:number,to:number)=>void
 onRemoveExercise:(index:number)=>void
 onAddExercise:(ref:TemplateExerciseRef)=>void
}){
 const [pickerOpen,setPickerOpen]=useState(false)
 const [renaming,setRenaming]=useState(false)
 const [dragIndex,setDragIndex]=useState<number|null>(null)
 const listRef=useRef<HTMLDivElement>(null)
 const dragRowsRef=useRef<{top:number,height:number}[]>([])
 const resolved=tpl.exercises.map(r=>exerciseLibrary.find(e=>e.group===r.group&&e.name===r.name))

 // Glisser-déposer par position (pas par bibliothèque drag-and-drop externe) :
 // au pointerdown sur la poignée, on capture le pointeur (pour continuer à
 // recevoir move/up même hors du bouton) et on fige les positions Y des
 // rangées une bonne fois — les recalculer à chaque move réordonnerait le DOM
 // en direct, ce qui change les positions ET les closures (dragIndex) en
 // pleine rafale d'événements, pouvant faire "gagner" un calcul basé sur un
 // état déjà périmé. On ne commet qu'au relâchement, contre ces positions
 // figées : robuste, quitte à perdre l'aperçu de réordonnancement en direct.
 const onHandleDown=(index:number,e:React.PointerEvent<HTMLButtonElement>)=>{
  e.currentTarget.setPointerCapture(e.pointerId)
  if(listRef.current){
   dragRowsRef.current=Array.from(listRef.current.querySelectorAll<HTMLElement>('[data-row]')).map(row=>{
    const rect=row.getBoundingClientRect()
    return {top:rect.top,height:rect.height}
   })
  }
  setDragIndex(index)
 }
 const targetFromY=(y:number)=>{
  let target=0
  dragRowsRef.current.forEach((r,i)=>{ if(y>r.top+r.height/2) target=i })
  return target
 }
 const onHandleUp=(e:React.PointerEvent<HTMLButtonElement>)=>{
  if(dragIndex!=null){
   const target=targetFromY(e.clientY)
   if(target!==dragIndex) onReorder(dragIndex,target)
  }
  setDragIndex(null)
 }

 return <main className="v9Page" aria-label="Éditer le template">
  <header className="v9TitleBar"><button onClick={close}>‹</button><div><b>ÉDITER LE TEMPLATE</b><small>{tpl.name}</small></div><button className="v93Dots" onClick={()=>setRenaming(true)} aria-label="Renommer le template">✎</button></header>
  <div className="v106EditorList" ref={listRef}>
   {tpl.exercises.map((r,i)=><div key={`${r.group}::${r.name}`} data-row className={`v106ExerciseRow${dragIndex===i?' dragging':''}`}>
    <button className="v106Handle" aria-label={`Réordonner ${r.name}`} onPointerDown={e=>onHandleDown(i,e)} onPointerUp={onHandleUp} onPointerCancel={onHandleUp}>⠿</button>
    <span><b>{r.name}</b><em>{resolved[i]?`${resolved[i]!.sets} · ${resolved[i]!.reps} reps`:r.group}</em></span>
    <button className="v106RemoveExercise" aria-label={`Retirer ${r.name}`} onClick={()=>onRemoveExercise(i)}>×</button>
   </div>)}
  </div>
  {tpl.exercises.length===0&&<p className="v9LibEmpty">Aucun exercice. Touche "+ Ajouter un exercice" pour commencer.</p>}
  <button className="v9Outline" onClick={()=>setPickerOpen(true)}>+ AJOUTER UN EXERCICE</button>
  {pickerOpen&&<ExercisePickerSheet exclude={tpl.exercises} close={()=>setPickerOpen(false)} onPick={ref=>{onAddExercise(ref);setPickerOpen(false)}}/>}
  {renaming&&<RenameSheet initial={tpl.name} title="RENOMMER LE TEMPLATE" placeholder="ex. Haut du corps — variante" confirmLabel="ENREGISTRER" close={()=>setRenaming(false)} onSave={onRename}/>}
 </main>
}

export function MesSeances({setScreen}:{setScreen:(s:Screen)=>void}){
 const [templates,setTemplatesState]=useState<WorkoutTemplate[]>(()=>readTemplates())
 const [editingId,setEditingId]=useState<string|null>(null)
 const [creating,setCreating]=useState(false)
 const setTemplates=(next:WorkoutTemplate[])=>{setTemplatesState(next);writeTemplates(next)}

 const createTemplate=(name:string)=>{
  const tpl:WorkoutTemplate={id:newTemplateId(),name,exercises:[]}
  setTemplates([...templates,tpl])
  setEditingId(tpl.id)
 }
 const deleteTemplate=(id:string)=>{setTemplates(templates.filter(t=>t.id!==id));if(editingId===id) setEditingId(null)}
 const renameTemplate=(id:string,name:string)=>setTemplates(templates.map(t=>t.id===id?{...t,name}:t))
 const addExercise=(id:string,ref:TemplateExerciseRef)=>setTemplates(templates.map(t=>t.id===id?{...t,exercises:[...t.exercises,ref]}:t))
 const removeExercise=(id:string,index:number)=>setTemplates(templates.map(t=>t.id===id?{...t,exercises:t.exercises.filter((_,i)=>i!==index)}:t))
 const reorderExercise=(id:string,from:number,to:number)=>setTemplates(templates.map(t=>{
  if(t.id!==id) return t
  const exercises=t.exercises.slice()
  const [moved]=exercises.splice(from,1)
  exercises.splice(to,0,moved)
  return {...t,exercises}
 }))

 const editing=editingId?templates.find(t=>t.id===editingId):undefined
 if(editing) return <TemplateEditor
  tpl={editing}
  close={()=>setEditingId(null)}
  onRename={name=>renameTemplate(editing.id,name)}
  onReorder={(from,to)=>reorderExercise(editing.id,from,to)}
  onRemoveExercise={i=>removeExercise(editing.id,i)}
  onAddExercise={ref=>addExercise(editing.id,ref)}
 />

 return <main className="v9Page" aria-label="Mes séances">
  <header className="v9TitleBar"><button onClick={()=>setScreen('plus')}>‹</button><div><b>MES SÉANCES</b></div><button className="v93Dots" onClick={()=>setCreating(true)} aria-label="Créer un template">＋</button></header>
  <section className="v9TemplateList">
   {templates.map(t=><div key={t.id} className="v9TemplateRow">
    <button className="v9TemplateSelect" onClick={()=>setEditingId(t.id)}>
     <span><b>{t.name}</b><em>{t.exercises.length} exercice{t.exercises.length>1?'s':''} · ~{estimateTemplateMinutes(t)} min</em></span>
     <i>›</i>
    </button>
    <button className="v9TemplateDelete" aria-label={`Supprimer ${t.name}`} onClick={()=>deleteTemplate(t.id)}>×</button>
   </div>)}
  </section>
  {templates.length===0&&<p className="v9LibEmpty">Aucun template. Touche ＋ pour en créer un.</p>}
  {creating&&<RenameSheet initial="" title="NOUVEAU TEMPLATE" placeholder="ex. Haut du corps — variante" confirmLabel="CRÉER LE TEMPLATE" close={()=>setCreating(false)} onSave={createTemplate}/>}
 </main>
}
