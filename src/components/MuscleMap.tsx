export type MuscleZone=
 |'chestUpper'|'chestLower'|'frontDelt'|'sideDelt'|'rearDelt'|'lats'|'traps'
 |'biceps'|'triceps'|'forearm'|'abs'|'quads'|'hamstrings'|'glutes'|'calves'

type ZoneDef={id:MuscleZone,view:'front'|'back'|'both',shape:'path'|'ellipse',d?:string,cx?:number,cy?:number,rx?:number,ry?:number,mirror?:boolean}

const ZONES:ZoneDef[]=[
 {id:'chestUpper',view:'front',shape:'path',d:'M90 90 Q120 79 150 90 L146 116 Q120 128 94 116Z'},
 {id:'chestLower',view:'front',shape:'path',d:'M94 118 Q120 130 146 118 L142 146 Q120 156 98 146Z'},
 {id:'abs',view:'front',shape:'path',d:'M100 150 Q120 158 140 150 L136 198 Q120 206 104 198Z'},
 {id:'traps',view:'back',shape:'path',d:'M92 82 Q120 96 148 82 L143 108 Q120 118 97 108Z'},
 {id:'lats',view:'back',shape:'path',d:'M83 108 Q92 148 104 175 L88 178 Q78 140 79 112Z',mirror:true},
 {id:'glutes',view:'back',shape:'path',d:'M99 196 Q120 206 141 196 L138 222 Q120 230 102 222Z'},
 {id:'frontDelt',view:'front',shape:'ellipse',cx:73,cy:95,rx:14,ry:13,mirror:true},
 {id:'sideDelt',view:'front',shape:'ellipse',cx:64,cy:104,rx:9,ry:12,mirror:true},
 {id:'rearDelt',view:'back',shape:'ellipse',cx:73,cy:95,rx:14,ry:13,mirror:true},
 {id:'biceps',view:'front',shape:'ellipse',cx:63,cy:130,rx:11,ry:17,mirror:true},
 {id:'triceps',view:'back',shape:'ellipse',cx:63,cy:130,rx:11,ry:17,mirror:true},
 {id:'forearm',view:'both',shape:'ellipse',cx:73,cy:150,rx:8,ry:14,mirror:true},
 {id:'quads',view:'front',shape:'ellipse',cx:105,cy:258,rx:15,ry:38,mirror:true},
 {id:'hamstrings',view:'back',shape:'ellipse',cx:105,cy:258,rx:14,ry:36,mirror:true},
 {id:'calves',view:'both',shape:'ellipse',cx:100,cy:308,rx:11,ry:22,mirror:true},
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
   <radialGradient id="mapHalo" cx="50%" cy="38%">
    <stop offset="0" stopColor="#4df4ef" stopOpacity=".22"/>
    <stop offset=".6" stopColor="#173a44" stopOpacity=".1"/>
    <stop offset="1" stopColor="#05070b" stopOpacity="0"/>
   </radialGradient>
   <linearGradient id="mapSkin" x1="0" x2="1">
    <stop stopColor="#3a4c56"/><stop offset=".5" stopColor="#243139"/><stop offset="1" stopColor="#141c22"/>
   </linearGradient>
   <filter id="zoneGlowStrong" x="-60%" y="-60%" width="220%" height="220%"><feGaussianBlur stdDeviation="4.2" result="b"/><feMerge><feMergeNode in="b"/><feMergeNode in="b"/><feMergeNode in="SourceGraphic"/></feMerge></filter>
   <filter id="zoneGlowSoft" x="-60%" y="-60%" width="220%" height="220%"><feGaussianBlur stdDeviation="3" result="b"/><feMerge><feMergeNode in="b"/><feMergeNode in="SourceGraphic"/></feMerge></filter>
  </defs>
  <ellipse cx="120" cy="180" rx="118" ry="172" fill="url(#mapHalo)"/>
  <g opacity=".16" stroke="#4df4ef">
   <line x1="0" y1="90" x2="240" y2="90"/><line x1="0" y1="180" x2="240" y2="180"/><line x1="0" y1="270" x2="240" y2="270"/>
   <line x1="60" y1="0" x2="60" y2="360"/><line x1="180" y1="0" x2="180" y2="360"/>
  </g>
  <circle cx="120" cy="42" r="22" fill="url(#mapSkin)" stroke="#4c6a72" strokeWidth="1.2"/>
  <path d="M89 73 Q120 61 151 73 L161 145 Q156 186 139 215 L135 317 H105 L101 215 Q84 186 79 145Z" fill="url(#mapSkin)" stroke="#4c6a72" strokeWidth="1.3"/>
  <path d="M88 81 L52 139 L61 155 L99 109 M152 81 L188 139 L179 155 L141 109" fill="none" stroke="#37464e" strokeWidth="17" strokeLinecap="round"/>
  <path d="M105 213 L89 324 M135 213 L151 324" fill="none" stroke="#37464e" strokeWidth="20" strokeLinecap="round"/>
  {visible.map(z=><g key={z.id}><Zone z={z} side="l" state={stateOf(z.id)}/>{z.mirror&&<Zone z={z} side="r" state={stateOf(z.id)}/>}</g>)}
  {label&&<text x="120" y="352" textAnchor="middle" fill="#8ff7f4" fontSize="11" fontWeight="700" letterSpacing="1">{label.toUpperCase()}</text>}
 </svg>
}
