import { useMemo, useState } from 'react'
import './v9.css'
import { readSchedule } from './v9/data'
import { readTemplates } from './v9/storage'
import { mondayIndex } from './v9/utils'
import { BottomNav } from './v9/components/Shared'
import { Today } from './v9/screens/Today'
import { Workout } from './v9/screens/Workout'
import { Nutrition } from './v9/screens/Nutrition'
import { Progress } from './v9/screens/Progress'
import { AdaptiveIntelligence } from './v9/screens/Adaptive'
import { Coach } from './v9/screens/Coach'
import { Plus } from './v9/screens/Plus'
import { Bibliotheque } from './v9/screens/Library'
import { MesSeances } from './v9/screens/Templates'
import { Plan } from './v9/screens/Plan'

export type Screen='today'|'workout'|'nutrition'|'progress'|'coach'|'plan'|'adaptive'|'plus'|'library'|'templates'
export type WorkoutView='session'|'exercise'|'history'

export default function V9App(){
 const [screen,setScreen]=useState<Screen>('today'); const [workoutView,setWorkoutView]=useState<WorkoutView>('session')
 const todayPlan=readSchedule()[mondayIndex()]
 // Une séance s'ouvre par le template prévu au planning du jour ; si le jour
 // est Repos/Cardio ou que le template a été supprimé depuis, on retombe sur
 // le premier template disponible (jamais un groupe musculaire figé).
 const templates=readTemplates()
 const templateId=templates.some(t=>t.id===todayPlan)?todayPlan:templates[0]?.id
 const page=useMemo(()=>screen==='today'?<Today setScreen={setScreen}/>:screen==='workout'?<Workout view={workoutView} setView={setWorkoutView} setScreen={setScreen} templateId={templateId}/>:screen==='nutrition'?<Nutrition setScreen={setScreen}/>:screen==='progress'?<Progress setScreen={setScreen}/>:screen==='coach'?<Coach setScreen={setScreen}/>:screen==='adaptive'?<AdaptiveIntelligence setScreen={setScreen}/>:screen==='plus'?<Plus setScreen={setScreen}/>:screen==='library'?<Bibliotheque setScreen={setScreen}/>:screen==='templates'?<MesSeances setScreen={setScreen}/>:<Plan setScreen={setScreen}/>,[screen,workoutView,templateId])
 const showNav=screen==='nutrition'||screen==='progress'||screen==='plus'||screen==='library'||screen==='templates'
 return <div className="v9Shell"><div className="v9Phone">{page}{showNav&&<BottomNav screen={screen} setScreen={s=>{setScreen(s);if(s==='workout')setWorkoutView('session')}}/>}</div></div>
}
