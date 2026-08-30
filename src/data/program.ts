export type MuscleGroup =
  | 'upper-chest' | 'chest' | 'front-delts' | 'side-delts' | 'rear-delts'
  | 'triceps' | 'lats' | 'mid-back' | 'traps' | 'biceps' | 'forearms'
  | 'quads' | 'hamstrings' | 'glutes' | 'calves' | 'core';

export type PrescribedSet = { weight?: string; reps: string; rir: string };
export type ExerciseRole = 'BASE' | 'ISOLATION' | 'CORE';

export type ExerciseMedia = {
  demoKind: 'photo' | 'video';
  demoAsset?: string;
  anatomyAsset?: string;
  anatomyView: 'front' | 'back' | 'legs-front' | 'legs-back';
  primaryMuscles: MuscleGroup[];
  secondaryMuscles?: MuscleGroup[];
};

export type Exercise = {
  id:string; name:string; sets:number; reps:string; rir:string; rest:number;
  area:string; cue:string; backRisk?:'low'|'medium'|'high';
  media:ExerciseMedia; prescription?:PrescribedSet[];
  role?:ExerciseRole; optional?:boolean;
};

export type Session={id:string;day:string;title:string;subtitle:string;exercises:Exercise[]};

const anatomyViewFor=(primary:MuscleGroup[]):ExerciseMedia['anatomyView']=>{
  if(primary.some(x=>['quads','glutes','hamstrings','calves'].includes(x))) return primary.some(x=>['hamstrings','glutes','calves'].includes(x))?'legs-back':'legs-front'
  if(primary.some(x=>['lats','mid-back','traps','rear-delts'].includes(x))) return 'back'
  return 'front'
};

const anatomyAssetFor=(id:string)=>`/body-os/anatomy-${id}.svg`;
const demoAssetFor=(id:string)=>`/body-os/demo-${id}.svg`;

const makeExercise=(
  id:string,name:string,area:string,sets:number,reps:string,rir:string,rest:number,cue:string,
  primaryMuscles:MuscleGroup[],secondaryMuscles:MuscleGroup[]=[],lowBackRisk=false,
  demoAsset?:string,role:ExerciseRole='BASE',optional=false,prescription?:PrescribedSet[]
):Exercise=>({
  id,name,sets,reps,rir,rest,area,cue,
  backRisk:lowBackRisk?'medium':'low',role,optional,prescription,
  media:{
    demoKind:'photo',demoAsset:demoAsset||demoAssetFor(id),anatomyAsset:anatomyAssetFor(id),
    anatomyView:anatomyViewFor(primaryMuscles),primaryMuscles,secondaryMuscles
  }
});

const m=(id:string,name:string,area:string,sets:number,reps:string,rir:string,rest:number,cue:string,primary:MuscleGroup[],secondary:MuscleGroup[]=[],lowBackRisk=false,demoAsset?:string,role:ExerciseRole='BASE',optional=false,prescription?:PrescribedSet[])=>
  makeExercise(id,name,area,sets,reps,rir,rest,cue,primary,secondary,lowBackRisk,demoAsset,role,optional,prescription);

const iso=(id:string,name:string,area:string,sets:number,reps:string,rir:string,rest:number,cue:string,primary:MuscleGroup[],secondary:MuscleGroup[]=[],optional=true)=>
  makeExercise(id,name,area,sets,reps,rir,rest,cue,primary,secondary,false,undefined,'ISOLATION',optional);

const core=(id:string,name:string,area:string,sets:number,reps:string,rir:string,rest:number,cue:string,primary:MuscleGroup[]=['core'],optional=true)=>
  makeExercise(id,name,area,sets,reps,rir,rest,cue,primary,[],true,undefined,'CORE',optional);

const inclinePrescription:PrescribedSet[]=[
  {weight:'80',reps:'10',rir:'2'},
  {weight:'80',reps:'10',rir:'2'},
  {weight:'80',reps:'9',rir:'2'},
  {weight:'80',reps:'8',rir:'2'}
];

export const sessions:Session[]=[
  {
    id:'push',day:'J1',title:'PUSH',subtitle:'Pectoraux • Épaules • Triceps',
    exercises:[
      m('incline-machine','Développé incliné machine','HAUT PEC',4,'6–10','2–3',150,'Omoplates fixées, trajectoire contrôlée.',['upper-chest'],['front-delts','triceps'],true,'/body-os/workout-incline-demo-golden.jpg','BASE',false,inclinePrescription),
      m('chest-press','Chest press machine','PECTORAUX',3,'8–12','2',120,'Poitrine haute, amplitude sans décoller les épaules.',['chest'],['triceps','front-delts'],false,'/body-os/demo-chest-press-approved.jpg','BASE'),
      iso('cable-fly','Écartés câble','PECTORAUX',3,'12–15','1–2',75,'Cherche l’adduction du bras, pas la charge.',['chest'],['upper-chest'],false),
      iso('low-high-fly-push','Écartés câble bas→haut','HAUT PEC',2,'12–15','1–2',75,'Conduis les mains vers le haut du sternum.',['upper-chest'],['chest']),
      iso('lat-raise','Élévations latérales câble','DELTOÏDE LATÉRAL',4,'12–20','1–2',60,'Monte avec le coude, épaules basses.',['side-delts'],[],false),
      m('shoulder-press','Shoulder press machine','ÉPAULES',2,'8–12','2',120,'Dos plaqué, pas d’hyperextension lombaire.',['front-delts'],['side-delts','triceps'],true,'/body-os/demo-shoulder-press-approved.jpg','BASE'),
      iso('rear-delt-cable','Oiseau câble unilatéral','ARRIÈRE ÉPAULE',3,'15–20','1–2',60,'Bras légèrement fléchi, ouvre sans tourner le buste.',['rear-delts'],['mid-back']),
      iso('overhead-triceps','Extension triceps au-dessus de la tête','TRICEPS LONGUE PORTION',3,'10–15','1–2',75,'Coudes serrés, étirement complet derrière la tête.',['triceps']),
      iso('rope-pushdown','Extension triceps corde','TRICEPS',3,'10–15','1–2',75,'Verrouille les coudes, écarte la corde en bas.',['triceps'],[],false),
    ]
  },
  {
    id:'pull',day:'J2',title:'PULL',subtitle:'Dos • Arrière épaules • Biceps',
    exercises:[
      m('lat-pulldown','Tirage vertical neutre','DORSAUX',4,'8–12','2',120,'Amène les coudes vers les hanches.',['lats'],['biceps']),
      m('chest-row','Rowing poitrine supportée','ÉPAISSEUR DOS',4,'8–12','2',120,'Poitrine collée au support, tire avec les coudes.',['mid-back'],['lats','biceps']),
      m('one-arm-cable','Tirage unilatéral câble','DORSAUX',3,'10–14','2',90,'Laisse l’omoplate avancer puis ramène le coude vers la hanche.',['lats'],['mid-back','biceps']),
      iso('straight-arm-pulldown','Pullover câble bras tendus','DORSAUX',3,'12–15','1–2',75,'Garde les bras presque tendus et ferme les aisselles.',['lats']),
      iso('reverse-pec','Reverse pec-deck','ARRIÈRE ÉPAULE',3,'12–20','1–2',60,'Écarte sans hausser les épaules.',['rear-delts'],['mid-back']),
      iso('cable-shrug','Shrug câble','TRAPÈZES',3,'10–15','1–2',75,'Monte les épaules verticalement, marque une pause.',['traps']),
      iso('incline-curl','Curl incliné','BICEPS ÉTIRÉ',3,'8–12','1–2',75,'Épaules en arrière, extension complète en bas.',['biceps']),
      iso('hammer-curl','Curl marteau','BRACHIAL / AVANT-BRAS',3,'10–14','1–2',75,'Poignets neutres, sans balancer.',['biceps','forearms']),
      iso('cable-curl','Curl câble','BICEPS',2,'12–15','1',60,'Tension continue, serre en haut.',['biceps']),
    ]
  },
  {
    id:'legsA',day:'J3',title:'LEGS A',subtitle:'Quadriceps • Ischios • Fessiers • Mollets',
    exercises:[
      m('hack-squat','Hack squat','QUADRICEPS',4,'6–10','2–3',150,'Amplitude tolérée, bassin plaqué.',['quads'],['glutes'],true),
      m('leg-press','Presse à cuisses','QUADRICEPS',3,'10–15','2',120,'Descends sans arrondir le bas du dos.',['quads'],['glutes'],true),
      m('bulgarian','Bulgarian split squat','UNILATÉRAL',3,'8–12 / jambe','2',120,'Buste stable, contrôle du genou.',['quads','glutes'],['hamstrings'],true),
      iso('leg-extension','Leg extension','QUADRICEPS',3,'12–18','1–2',75,'Contracte fort en haut, contrôle la descente.',['quads']),
      iso('seated-curl','Leg curl assis','ISCHIOS ÉTIRÉS',4,'10–15','1–2',75,'Garde les hanches plaquées, contrôle l’étirement.',['hamstrings']),
      iso('hip-abduction','Abduction machine','MOYEN FESSIER',3,'15–25','1–2',60,'Ouvre les genoux sans rebond.',['glutes']),
      iso('calf','Mollets debout / presse','MOLLETS',4,'8–15','1–2',60,'Pause en bas et contraction complète en haut.',['calves']),
      core('dead-bug','Dead bug','CORE',3,'8–12 / côté','3',60,'Plaque les lombaires, souffle en allongeant.', ['core']),
    ]
  },
  {
    id:'upper',day:'J4',title:'UPPER',subtitle:'Haut du corps complet',
    exercises:[
      m('incline-db','Développé incliné haltères','HAUT PEC',3,'8–12','2',120,'Contrôle la descente et garde les omoplates stables.',['upper-chest'],['front-delts','triceps'],true),
      m('pulldown-2','Tirage vertical','DORSAUX',3,'8–12','2',120,'Tire les coudes vers les côtes.',['lats'],['biceps']),
      m('machine-row','Rowing machine','DOS',3,'8–12','2',120,'Poitrine fixée, rapproche les omoplates.',['mid-back'],['lats','biceps']),
      iso('low-high-fly','Écartés câble bas→haut','HAUT PEC',3,'12–15','1–2',75,'Conduis vers le haut du sternum.',['upper-chest'],['chest']),
      iso('lat-raise-2','Élévations latérales','DELTOÏDE LATÉRAL',4,'12–20','1–2',60,'Conserve la tension sur le côté de l’épaule.',['side-delts']),
      iso('reverse-fly','Reverse fly','ARRIÈRE ÉPAULE',3,'15–20','1–2',60,'Ouvre les bras avec contrôle.',['rear-delts'],['mid-back']),
      iso('preacher-curl','Curl pupitre / machine','BICEPS',3,'10–15','1–2',75,'Bras fixé, pas d’élan.',['biceps']),
      iso('single-arm-pushdown','Pushdown unilatéral','TRICEPS',3,'10–15','1–2',75,'Épaule fixe, extension complète.',['triceps']),
      iso('forearm-curl','Flexion / extension poignets','AVANT-BRAS',2,'15–20','1–2',60,'Amplitude contrôlée, sans douleur.',['forearms']),
    ]
  },
  {
    id:'lowerarms',day:'J5',title:'LOWER + BRAS',subtitle:'Bas du corps • Bras • Core',
    exercises:[
      m('single-press','Presse unilatérale','QUADRICEPS',3,'10–15 / jambe','2',120,'Bassin stable, amplitude confortable.',['quads'],['glutes'],true),
      iso('leg-curl','Leg curl','ISCHIOS',4,'10–15','1–2',75,'Contrôle la phase excentrique.',['hamstrings']),
      m('step-up','Split squat / step-up','FESSIERS / QUADS',3,'8–12 / jambe','2',120,'Pousse dans le pied avant et reste gainé.',['glutes','quads'],['hamstrings'],true),
      iso('leg-extension-2','Leg extension','QUADRICEPS',3,'12–18','1–2',75,'Contraction maximale sans verrouiller brutalement.',['quads']),
      iso('glute-kickback','Kickback câble','FESSIERS',3,'12–20','1–2',60,'Bassin fixe, extension de hanche sans cambrer.',['glutes']),
      iso('calf-2','Mollets assis','MOLLETS',4,'12–20','1–2',60,'Pause étirée en bas, montée complète.',['calves']),
      iso('curl','Curl câble / machine','BICEPS',3,'8–12','1–2',75,'Pas d’élan, serre en haut.',['biceps']),
      iso('triceps','Extension triceps','TRICEPS',3,'10–15','1–2',75,'Coude fixe, extension complète.',['triceps']),
      iso('hammer-cross','Curl marteau croisé','BRACHIAL / AVANT-BRAS',2,'12–15','1–2',60,'Poignet neutre, mouvement propre.',['biceps','forearms']),
      core('pallof-press','Pallof press','CORE ANTI-ROTATION',3,'10–15 / côté','3',60,'Résiste à la rotation, bassin et cage alignés.', ['core']),
    ]
  }
]

export const muscleLabels:Record<MuscleGroup,string>={
'upper-chest':'Haut pecs','chest':'Pectoraux','front-delts':'Deltoïdes antérieurs',
'side-delts':'Deltoïdes latéraux','rear-delts':'Deltoïdes postérieurs','triceps':'Triceps',
'lats':'Dorsaux','mid-back':'Milieu du dos','traps':'Trapèzes','biceps':'Biceps','forearms':'Avant-bras',
'quads':'Quadriceps','hamstrings':'Ischios','glutes':'Fessiers','calves':'Mollets','core':'Core'
};

export const backLevels=[
{level:1,title:'Contrôle / reprise',color:'#25d66d',exercises:['Bascule du bassin','Dead bug débutant','Bird dog débutant','Pont fessier','Planche genoux','Sphinx optionnel']},
{level:2,title:'Renforcement intermédiaire',color:'#3b8cff',exercises:['Dead bug complet','Bird dog avancé','Pont une jambe','Planche complète','Side plank','Pallof press']},
{level:3,title:'Force fonctionnelle',color:'#ff9a36',exercises:['Hip hinge','Romanian deadlift léger','Goblet squat','Rowing','Suitcase carry','Pallof press renforcé']},
{level:4,title:'Capacité avancée',color:'#9b74ff',exercises:['Deadlift progressif','Squat chargé','Bulgarian split squat','Farmer carry','Side plank + abduction','Rollout']}
];
