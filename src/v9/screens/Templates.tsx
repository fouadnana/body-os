// Écran "Mes séances" (templates personnalisés) + sa sheet de création.
// Extrait de V9App.tsx (Phase 6).
import { useState } from 'react'
import type { Screen, SessionGroup, WorkoutTemplate } from '../types'
import { exerciseLibrary, sessionData, sessionGroups } from '../data'
import { DEFAULT_TEMPLATE_ID, newTemplateId, readActiveTemplates, readTemplates, writeActiveTemplates, writeTemplates } from '../storage'

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

export function MesSeances({setScreen}:{setScreen:(s:Screen)=>void}){
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
