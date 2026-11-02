// Composants partagés entre plusieurs écrans (icône, sheets génériques,
// navigation du bas, éditeur de programme). Extrait de V9App.tsx (Phase 6).
import { useState } from 'react'
import type { DayPlan, Screen } from '../types'
import { sessionGroups, WEEKDAYS } from '../data'

export const Icon=({children}:{children:string})=><span className="v9Icon">{children}</span>

export function Toast({text}:{text:string}){ return <div className="v93Toast">{text}</div> }
export function InfoSheet({title,children,close}:{title:string,children:any,close:()=>void}){
 return <div className="v9SheetBack" onClick={close}><section className="v93InfoSheet" onClick={e=>e.stopPropagation()}>
  <header><button onClick={close}>×</button><b>{title}</b><span></span></header><div>{children}</div>
 </section></div>
}

export function OptionsSheet({title,options,close}:{title:string,options:{label:string,onClick:()=>void,danger?:boolean}[],close:()=>void}){
 return <div className="v9SheetBack" onClick={close}><section className="v105Options" onClick={e=>e.stopPropagation()}>
  <header><b>{title}</b></header>
  <div className="v105OptionsList">{options.map(o=><button key={o.label} className={o.danger?'danger':''} onClick={()=>{o.onClick();close()}}>{o.label}</button>)}</div>
  <button className="v105OptionsCancel" onClick={close}>ANNULER</button>
 </section></div>
}

export function BottomNav({screen,setScreen}:{screen:Screen,setScreen:(s:Screen)=>void}){
 const items:[Screen,string,string][]=[['today','◇','Today'],['workout','✣','Séance'],['nutrition','♜','Nutrition'],['progress','▥','Progrès'],['plus','☰','Plus']]
 return <nav className="v9Bottom">{items.map(([id,ic,l])=><button key={id} className={screen===id?'active':''} onClick={()=>setScreen(id)}><Icon>{ic}</Icon><small>{l}</small></button>)}</nav>
}

export function ProgramSheet({schedule,close,onSave}:{schedule:DayPlan[],close:()=>void,onSave:(s:DayPlan[])=>void}){
 const [draft,setDraft]=useState<DayPlan[]>(schedule)
 const options:DayPlan[]=['Repos','Cardio',...sessionGroups]
 const setDay=(i:number,v:DayPlan)=>setDraft(d=>d.map((x,j)=>j===i?v:x))
 return <div className="v9SheetBack" onClick={close}><section className="v96NutritionSettings" onClick={e=>e.stopPropagation()}>
  <header><button onClick={close}>×</button><div><small>MON PROGRAMME</small><b>Séance par jour</b></div><span></span></header>
  <div className="v96SettingsBody">
   {WEEKDAYS.map((w,i)=><label key={w}><span>{w}</span><select value={draft[i]} onChange={e=>setDay(i,e.target.value as DayPlan)}>{options.map(o=><option key={o} value={o}>{o}</option>)}</select></label>)}
  </div>
  <footer><button onClick={close}>ANNULER</button><button className="primary" onClick={()=>{onSave(draft);close()}}>ENREGISTRER</button></footer>
 </section></div>
}
