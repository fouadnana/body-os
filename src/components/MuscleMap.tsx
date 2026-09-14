export type MuscleZone=
 |'chestUpper'|'chestLower'|'frontDelt'|'sideDelt'|'rearDelt'|'lats'|'traps'
 |'biceps'|'triceps'|'forearm'|'abs'|'quads'|'hamstrings'|'glutes'|'calves'

type ZoneDef={id:MuscleZone,view:'front'|'back'|'both',shape:'path'|'ellipse',d?:string,cx?:number,cy?:number,rx?:number,ry?:number,mirror?:boolean}

const ZONES:ZoneDef[]=[
 {id:'chestUpper',view:'front',shape:'path',d:'M85 85 Q120 73 155 85 L150 114 Q120 128 90 114Z'},
 {id:'chestLower',view:'front',shape:'path',d:'M90 116 Q120 130 150 116 L146 148 Q120 160 94 148Z'},
 {id:'abs',view:'front',shape:'path',d:'M98 152 Q120 162 142 152 L138 202 Q120 212 102 202Z'},
 {id:'traps',view:'back',shape:'path',d:'M87 80 Q120 96 153 80 L148 106 Q120 118 92 106Z'},
 {id:'lats',view:'back',shape:'path',d:'M79 108 Q88 148 100 178 L84 182 Q73 142 75 112Z',mirror:true},
 {id:'glutes',view:'back',shape:'path',d:'M98 200 Q120 212 142 200 L138 226 Q120 236 102 226Z'},
 {id:'frontDelt',view:'front',shape:'ellipse',cx:68,cy:90,rx:15,ry:14,mirror:true},
 {id:'sideDelt',view:'front',shape:'ellipse',cx:57,cy:101,rx:10,ry:13,mirror:true},
 {id:'rearDelt',view:'back',shape:'ellipse',cx:68,cy:90,rx:15,ry:14,mirror:true},
 {id:'biceps',view:'front',shape:'ellipse',cx:55,cy:132,rx:12,ry:18,mirror:true},
 {id:'triceps',view:'back',shape:'ellipse',cx:55,cy:132,rx:12,ry:18,mirror:true},
 {id:'forearm',view:'both',shape:'ellipse',cx:68,cy:157,rx:9,ry:15,mirror:true},
 {id:'quads',view:'front',shape:'ellipse',cx:104,cy:263,rx:16,ry:40,mirror:true},
 {id:'hamstrings',view:'back',shape:'ellipse',cx:104,cy:263,rx:15,ry:38,mirror:true},
 {id:'calves',view:'both',shape:'ellipse',cx:104,cy:312,rx:12,ry:22,mirror:true},
]

const mirrorX=(x:number)=>240-x

function Zone({z,side,state}:{z:ZoneDef,side:'l'|'r',state:'primary'|'secondary'|'off'}){
 const flip=side==='r'
 const fill=state==='primary'?'#8ff7f4':state==='secondary'?'#3d8f93':'transparent'
 const opacity=state==='primary'?0.85:state==='secondary'?0.42:0
 const stroke=state==='off'?'transparent':state==='primary'?'#eafffe':'#6fd7d4'
 const filterAttr=state==='primary'?'url(#zoneGlowStrong)':state==='secondary'?'url(#zoneGlowSoft)':undefined
 if(state==='off') return null
 if(z.shape==='ellipse'){
  const cx=flip&&z.mirror?mirrorX(z.cx!):z.cx!
  return <ellipse cx={cx} cy={z.cy} rx={z.rx} ry={z.ry} fill={fill} fillOpacity={opacity} stroke={stroke} strokeWidth={1} strokeOpacity={opacity} filter={filterAttr}/>
 }
 const d=flip&&z.mirror?z.d!.replace(/(-?\d+(?:\.\d+)?)/g,(n)=>String(mirrorX(parseFloat(n)))):z.d!
 return <path d={d} fill={fill} fillOpacity={opacity} stroke={stroke} strokeWidth={0.8} strokeOpacity={opacity} filter={filterAttr}/>
}

export function MuscleMap({view,primary,secondary,label}:{view:'front'|'back',primary:MuscleZone[],secondary?:MuscleZone[],label?:string}){
 const sec=secondary||[]
 const stateOf=(id:MuscleZone)=>primary.includes(id)?'primary':sec.includes(id)?'secondary':'off'
 const visible=ZONES.filter(z=>z.view===view||z.view==='both')
 return <svg className="v9MuscleMap" viewBox="0 0 240 360" aria-hidden>
  <defs>
   <radialGradient id="mapHalo" cx="50%" cy="34%">
    <stop offset="0" stopColor="#4df4ef" stopOpacity=".22"/>
    <stop offset=".6" stopColor="#173a44" stopOpacity=".1"/>
    <stop offset="1" stopColor="#05070b" stopOpacity="0"/>
   </radialGradient>
   <linearGradient id="mapSkin" x1="0" x2="1">
    <stop stopColor="#42565f"/><stop offset=".5" stopColor="#283640"/><stop offset="1" stopColor="#161f26"/>
   </linearGradient>
   <filter id="zoneGlowStrong" x="-60%" y="-60%" width="220%" height="220%"><feGaussianBlur stdDeviation="4.2" result="b"/><feMerge><feMergeNode in="b"/><feMergeNode in="b"/><feMergeNode in="SourceGraphic"/></feMerge></filter>
   <filter id="zoneGlowSoft" x="-60%" y="-60%" width="220%" height="220%"><feGaussianBlur stdDeviation="3" result="b"/><feMerge><feMergeNode in="b"/><feMergeNode in="SourceGraphic"/></feMerge></filter>
  </defs>
  <ellipse cx="120" cy="180" rx="118" ry="172" fill="url(#mapHalo)"/>
  <g opacity=".16" stroke="#4df4ef">
   <line x1="0" y1="90" x2="240" y2="90"/><line x1="0" y1="180" x2="240" y2="180"/><line x1="0" y1="270" x2="240" y2="270"/>
   <line x1="60" y1="0" x2="60" y2="360"/><line x1="180" y1="0" x2="180" y2="360"/>
  </g>
  <path d="M75 76 L42 145 L52 162 L88 115 M165 76 L198 145 L188 162 L152 115" fill="none" stroke="#37464e" strokeWidth="19" strokeLinecap="round"/>
  <path d="M112 205 L96 325 M128 205 L144 325" fill="none" stroke="#37464e" strokeWidth="23" strokeLinecap="round"/>
  <path d="M75 68 Q120 54 165 68 L152 148 Q146 182 132 208 L128 320 H112 L108 208 Q94 182 88 148Z" fill="url(#mapSkin)" stroke="#4c6a72" strokeWidth="1.3"/>
  <circle cx="120" cy="36" r="15" fill="url(#mapSkin)" stroke="#4c6a72" strokeWidth="1.2"/>
  {visible.map(z=><g key={z.id}><Zone z={z} side="l" state={stateOf(z.id)}/>{z.mirror&&<Zone z={z} side="r" state={stateOf(z.id)}/>}</g>)}
  {label&&<text x="120" y="352" textAnchor="middle" fill="#8ff7f4" fontSize="11" fontWeight="700" letterSpacing="1">{label.toUpperCase()}</text>}
 </svg>
}
