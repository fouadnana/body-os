import { useEffect, useState } from 'react'

export type VisionFood={id:string,name:string,qty:number,unit:string,kcal:number,protein:number,carbs:number,fat:number,confidence:number}
export type FoodVisionResult={foods:VisionFood[],kcal:number,protein:number,carbs:number,fat:number,confidence:number,mode:'ai'|'local',note:string}
export type FoodVisionPayload={target:string,result:FoodVisionResult}

const FOOD_DB:Record<string,{kcal:number,protein:number,carbs:number,fat:number}>={
 'Poulet grillé':{kcal:165,protein:31,carbs:0,fat:3.6},'Saumon':{kcal:208,protein:20,carbs:0,fat:13},'Riz basmati cuit':{kcal:130,protein:2.7,carbs:28,fat:.3},'Patate douce':{kcal:86,protein:1.6,carbs:20,fat:.1},'Brocoli':{kcal:35,protein:2.4,carbs:7,fat:.4},'Légumes verts':{kcal:32,protein:2,carbs:5.5,fat:.3},'Skyr 0%':{kcal:60,protein:11,carbs:4,fat:.2},'Flocons d’avoine':{kcal:389,protein:16.9,carbs:66.3,fat:6.9},'Œufs':{kcal:143,protein:13,carbs:.7,fat:9.5},'Pain complet':{kcal:247,protein:13,carbs:41,fat:4.2},'Avocat':{kcal:160,protein:2,carbs:8.5,fat:14.7},'Huile d’olive':{kcal:884,protein:0,carbs:0,fat:100}
}
const calc=(name:string,qty:number,confidence=.72):VisionFood=>{const b=FOOD_DB[name]||{kcal:120,protein:8,carbs:12,fat:4},f=qty/100;return{id:`vf-${Date.now()}-${Math.random()}`,name,qty,unit:' g',kcal:Math.round(b.kcal*f),protein:Math.round(b.protein*f*10)/10,carbs:Math.round(b.carbs*f*10)/10,fat:Math.round(b.fat*f*10)/10,confidence}}
const totals=(foods:VisionFood[])=>({kcal:Math.round(foods.reduce((s,f)=>s+f.kcal,0)),protein:Math.round(foods.reduce((s,f)=>s+f.protein,0)),carbs:Math.round(foods.reduce((s,f)=>s+f.carbs,0)),fat:Math.round(foods.reduce((s,f)=>s+f.fat,0))})

async function analyse(file:File):Promise<FoodVisionResult>{
 const endpoint=(import.meta as any).env?.VITE_FOOD_VISION_ENDPOINT
 if(endpoint){try{const form=new FormData();form.append('image',file);const res=await fetch(endpoint,{method:'POST',body:form});if(!res.ok){let detail='';try{detail=(await res.json())?.detail||''}catch{};throw new Error(detail||`HTTP ${res.status}`)};const d=await res.json();const foods:VisionFood[]=(d.foods||[]).map((f:any)=>({id:`vf-${Date.now()}-${Math.random()}`,name:String(f.name||'Aliment'),qty:Number(f.qty||100),unit:f.unit||' g',kcal:Number(f.kcal||0),protein:Number(f.protein||0),carbs:Number(f.carbs||0),fat:Number(f.fat||0),confidence:Number(f.confidence??d.confidence??.7)}));return{...totals(foods),foods,confidence:Number(d.confidence??.78),mode:'ai',note:(d.warnings?.length?`Analyse IA — ${d.warnings.join(' · ')}`:'Analyse IA — vérifie aliments et portions avant validation.')}}catch(err){throw new Error(err instanceof Error?err.message:'Le moteur Food Vision est indisponible.')}}
 const foods=[calc('Poulet grillé',180,.58),calc('Riz basmati cuit',170,.55),calc('Brocoli',150,.61)]
 return{...totals(foods),foods,confidence:.58,mode:'local',note:'Mode local de démonstration — corrige les aliments et portions avant validation.'}
}

export default function FoodVision({close,onAdd}:{close:()=>void,onAdd:(payload:FoodVisionPayload)=>void}){
 const [file,setFile]=useState<File|null>(null),[preview,setPreview]=useState(''),[result,setResult]=useState<FoodVisionResult|null>(null),[busy,setBusy]=useState(false),[error,setError]=useState(''),[target,setTarget]=useState('Déjeuner'),[newFood,setNewFood]=useState('Poulet grillé')
 useEffect(()=>{if(!file){setPreview('');return};const url=URL.createObjectURL(file);setPreview(url);return()=>URL.revokeObjectURL(url)},[file])
 const run=async()=>{if(!file)return;setBusy(true);setError('');try{setResult(await analyse(file))}catch(err){setError(err instanceof Error?err.message:'Analyse impossible')}finally{setBusy(false)}}
 const updateFoods=(foods:VisionFood[])=>result&&setResult({...result,...totals(foods),foods})
 const qty=(i:number,q:number)=>result&&updateFoods(result.foods.map((f,j)=>j===i?calc(f.name,Math.max(0,q),f.confidence):f))
 const rename=(i:number,n:string)=>result&&updateFoods(result.foods.map((f,j)=>j===i?calc(n,f.qty,f.confidence):f))
 return <div className="v9SheetBack" onClick={close}><section className="v99VisionSheet" onClick={e=>e.stopPropagation()}>
  <header><button onClick={close}>×</button><div><small>AI FOOD VISION</small><b>ANALYSER MON REPAS</b></div><span>✦</span></header>
  {!preview?<div className="v99Capture"><div className="v99Camera">⌁</div><b>Prends ton repas en photo</b><p>BODY OS estime aliments, portions et macros. Tu gardes toujours la validation finale.</p><div><label>📷 CAMÉRA<input type="file" accept="image/*" capture="environment" onChange={e=>setFile(e.target.files?.[0]||null)}/></label><label>▧ PHOTOTHÈQUE<input type="file" accept="image/*" onChange={e=>setFile(e.target.files?.[0]||null)}/></label></div></div>:<>
   <div className="v99PhotoPreview"><img src={preview}/><label>REMPLACER<input type="file" accept="image/*" onChange={e=>{setFile(e.target.files?.[0]||null);setResult(null)}}/></label></div>
   {!result?<div className="v99AnalyseBlock"><b>Photo prête</b><small>Une photo seule reste une estimation, notamment pour huiles, sauces et quantités cachées.</small><button disabled={busy} onClick={run}>{busy?'ANALYSE EN COURS…':'✦ ANALYSER LE REPAS'}</button>{error&&<p className="v100VisionError">{error}</p>}</div>:<>
    <div className="v99Confidence"><span><small>CONFIANCE</small><b>{Math.round(result.confidence*100)}%</b></span><i><em style={{width:`${result.confidence*100}%`}}/></i><p>{result.note}</p></div>
    <div className="v99MacroSummary"><span><small>ÉNERGIE</small><b>{result.kcal}</b><em>kcal</em></span><span><small>PROT.</small><b>{result.protein}</b><em>g</em></span><span><small>GLUC.</small><b>{result.carbs}</b><em>g</em></span><span><small>LIP.</small><b>{result.fat}</b><em>g</em></span></div>
    <section className="v99Detected"><div className="v99DetectedHead"><h3>ALIMENTS DÉTECTÉS</h3><small>À VALIDER</small></div>{result.foods.map((f,i)=><div className="v99FoodRow" key={f.id}><select value={f.name} onChange={e=>rename(i,e.target.value)}>{Object.keys(FOOD_DB).map(n=><option key={n}>{n}</option>)}</select><div className="v99Qty"><button onClick={()=>qty(i,f.qty-10)}>−</button><input type="number" value={f.qty} onChange={e=>qty(i,+e.target.value)}/><em>g</em><button onClick={()=>qty(i,f.qty+10)}>+</button></div><span><b>{f.kcal} kcal</b><small>P {Math.round(f.protein)} · G {Math.round(f.carbs)} · L {Math.round(f.fat)}</small></span><button className="remove" onClick={()=>updateFoods(result.foods.filter((_,j)=>j!==i))}>×</button></div>)}<div className="v99AddDetected"><select value={newFood} onChange={e=>setNewFood(e.target.value)}>{Object.keys(FOOD_DB).map(n=><option key={n}>{n}</option>)}</select><button onClick={()=>updateFoods([...result.foods,calc(newFood,100,.5)])}>＋ AJOUTER</button></div></section>
    <div className="v99Target"><label><small>AJOUTER À</small><select value={target} onChange={e=>setTarget(e.target.value)}><option>Petit déjeuner</option><option>Déjeuner</option><option>Goûter</option><option>Dîner</option></select></label></div>
    <button className="v99Validate" onClick={()=>onAdd({target,result})}>VALIDER ET AJOUTER AU REPAS</button>
   </>}
  </>}
 </section></div>
}
