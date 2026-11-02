// Écran "Plus" (menu secondaire). Extrait de V9App.tsx (Phase 6).
import type { Screen } from '../types'

export function Plus({setScreen}:{setScreen:(s:Screen)=>void}){
 return <main className="v9Page"><header className="v9TitleBar"><button onClick={()=>setScreen('today')}>‹</button><div><b>PLUS</b></div><span></span></header><div className="v9CoachPrompts"><button onClick={()=>setScreen('library')}>▤ <span>Bibliothèque d'exercices</span>›</button><button onClick={()=>setScreen('templates')}>◧ <span>Mes séances</span>›</button><button onClick={()=>setScreen('coach')}>✦ <span>AI Coach</span>›</button><button onClick={()=>setScreen('plan')}>◫ <span>Plan — Semaine</span>›</button></div></main>
}
