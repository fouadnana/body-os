export function PremiumAnatomy({mode='front',small=false}:{mode?:'front'|'back',small?:boolean}) {
  return <svg className={small ? "premiumAnatomy small" : "premiumAnatomy"} viewBox="0 0 240 360" aria-hidden>
    <defs>
      <radialGradient id="halo" cx="50%" cy="42%">
        <stop offset="0" stopColor="#386cff" stopOpacity=".42"/>
        <stop offset=".65" stopColor="#173568" stopOpacity=".14"/>
        <stop offset="1" stopColor="#05070b" stopOpacity="0"/>
      </radialGradient>
      <linearGradient id="skin" x1="0" x2="1">
        <stop stopColor="#aeb5c1"/><stop offset=".42" stopColor="#4b5566"/><stop offset="1" stopColor="#1b2330"/>
      </linearGradient>
      <linearGradient id="muscle" x1="0" x2="1">
        <stop stopColor="#254dff"/><stop offset=".55" stopColor="#4d7dff"/><stop offset="1" stopColor="#1436a2"/>
      </linearGradient>
      <filter id="glow"><feGaussianBlur stdDeviation="5" result="b"/><feMerge><feMergeNode in="b"/><feMergeNode in="SourceGraphic"/></feMerge></filter>
    </defs>
    <ellipse cx="120" cy="178" rx="110" ry="168" fill="url(#halo)"/>
    <circle cx="120" cy="42" r="22" fill="url(#skin)"/>
    <path d="M89 73 Q120 61 151 73 L161 145 Q156 186 139 215 L135 317 H105 L101 215 Q84 186 79 145Z" fill="url(#skin)" stroke="#6f7b8d" strokeWidth="1.3"/>
    <path d="M88 81 L52 139 L61 155 L99 109 M152 81 L188 139 L179 155 L141 109" fill="none" stroke="#4e5c70" strokeWidth="17" strokeLinecap="round"/>
    <path d="M105 213 L89 324 M135 213 L151 324" fill="none" stroke="#4c5a70" strokeWidth="20" strokeLinecap="round"/>
    {mode==='front' ? <>
      <path d="M87 93 Q102 78 118 92 L118 123 Q102 132 88 116Z" fill="url(#muscle)" opacity=".9"/>
      <path d="M153 93 Q138 78 122 92 L122 123 Q138 132 152 116Z" fill="url(#muscle)" opacity=".9"/>
      <path d="M96 128 Q120 142 144 128 L143 153 Q120 164 97 153Z" fill="#275cff" opacity=".72"/>
      <path d="M96 157 Q120 169 144 157" fill="none" stroke="#3b79ff" strokeWidth="8" strokeLinecap="round"/>
      <path d="M92 178 Q105 172 113 184 M148 178 Q135 172 127 184" fill="none" stroke="#2f61ff" strokeWidth="7" strokeLinecap="round"/>
    </> : <>
      <path d="M91 87 Q120 104 149 87 L145 130 Q120 145 95 130Z" fill="url(#muscle)" opacity=".88"/>
      <path d="M92 137 Q120 153 148 137 L143 166 Q120 181 97 166Z" fill="#285dff" opacity=".7"/>
      <path d="M120 78 L120 210" stroke="#39c9ff" strokeWidth="5" strokeLinecap="round" filter="url(#glow)"/>
    </>}
    <path d="M120 88 L120 203" stroke="#31c7ff" strokeOpacity=".8" strokeWidth="3" strokeLinecap="round" filter="url(#glow)"/>
  </svg>
}
