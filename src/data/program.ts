export type MuscleGroup =
  | 'upper-chest' | 'chest' | 'front-delts' | 'side-delts' | 'rear-delts'
  | 'triceps' | 'lats' | 'mid-back' | 'biceps'
  | 'quads' | 'hamstrings' | 'glutes' | 'calves' | 'core';

export type PrescribedSet = { weight?: string; reps: string; rir: string };

export type ExerciseMedia = {
  demoKind: 'photo' | 'video';
  demoAsset?: string;
  anatomyView: 'front' | 'back' | 'legs-front' | 'legs-back';
  primaryMuscles: MuscleGroup[];
  secondaryMuscles?: MuscleGroup[];
};

export type Exercise = {
  id:string; name:string; sets:number; reps:string; rir:string; rest:number;
  area:string; cue:string; backRisk?:'low'|'medium'|'high';
  media:ExerciseMedia; prescription?:PrescribedSet[];
};

export type Session={id:string;day:string;title:string;subtitle:string;exercises:Exercise[]};

const m=(demoAsset:string|undefined,anatomyView:ExerciseMedia['anatomyView'],primaryMuscles:MuscleGroup[],secondaryMuscles:MuscleGroup[]=[]):ExerciseMedia=>({
  demoKind:'photo',demoAsset,anatomyView,primaryMuscles,secondaryMuscles
});

const e=(id:string,name:string,sets:number,reps:string,rir:string,rest:number,area:string,cue:string,media:ExerciseMedia,backRisk:'low'|'medium'|'high'='low',prescription?:PrescribedSet[]):Exercise=>({
  id,name,sets,reps,rir,rest,area,cue,media,backRisk,prescription
});

const inclinePrescription:PrescribedSet[]=[
  {weight:'80',reps:'10',rir:'2'},
  {weight:'80',reps:'10',rir:'2'},
  {weight:'80',reps:'9',rir:'2'},
  {weight:'80',reps:'8',rir:'2'}
];

export const sessions:Session[]=[
{id:'push',day:'J1',title:'PUSH',subtitle:'Haut des pectoraux • Épaules • Triceps',exercises:[
e('incline-machine','Développé incliné machine',4,'6–10','2–3',150,'HAUT PEC','Poitrine haute, omoplates stables.',m('/body-os/workout-incline-demo-golden.jpg','front',['upper-chest'],['front-delts','triceps']),'low',inclinePrescription),
e('chest-press','Chest press machine',3,'8–12','2',120,'PECTORAUX','Amplitude contrôlée, pas de rebond.',m(undefined,'front',['chest'],['front-delts','triceps'])),
e('cable-fly','Écartés câble',3,'12–15','2',75,'PECTORAUX','Étirement contrôlé.',m(undefined,'front',['chest'],['front-delts'])),
e('lat-raise','Élévations latérales câble',4,'12–20','1–2',60,'DELTOÏDES','Monte sans élan.',m(undefined,'front',['side-delts'],['front-delts'])),
e('shoulder-press','Shoulder press machine',2,'8–12','2',120,'ÉPAULES','Dos soutenu.',m(undefined,'front',['front-delts','side-delts'],['triceps'])),
e('rope-pushdown','Extension triceps corde',3,'10–15','1–2',75,'TRICEPS','Coudes fixes.',m(undefined,'front',['triceps']))
]},
{id:'pull',day:'J2',title:'PULL',subtitle:'Largeur • Épaisseur • Arrière épaules • Biceps',exercises:[
e('lat-pulldown','Tirage vertical neutre',4,'6–10','2',120,'DORSAUX','Coudes vers les côtes.',m(undefined,'back',['lats'],['biceps','rear-delts'])),
e('chest-row','Rowing poitrine supportée',4,'8–12','2',120,'DOS','Poitrine collée au support.',m(undefined,'back',['mid-back'],['lats','rear-delts','biceps'])),
e('one-arm-cable','Tirage unilatéral câble',3,'10–15','2',90,'DORSAUX','Trajectoire vers la hanche.',m(undefined,'back',['lats'],['mid-back','biceps'])),
e('reverse-pec','Reverse pec-deck',4,'12–20','1–2',60,'ARRIÈRE ÉPAULE','Sans hausser les épaules.',m(undefined,'back',['rear-delts'],['mid-back'])),
e('incline-curl','Curl incliné',3,'8–12','1–2',75,'BICEPS','Pas d’élan.',m(undefined,'front',['biceps'])),
e('cable-curl','Curl câble',2,'12–15','1–2',60,'BICEPS','Tension continue.',m(undefined,'front',['biceps']))
]},
{id:'legsA',day:'J3',title:'LEGS A',subtitle:'Quadriceps • Fessiers • Ischios • Mollets',exercises:[
e('hack-squat','Hack squat — si bien toléré',3,'6–10','2–3',150,'QUADRICEPS','Amplitude contrôlée.',m(undefined,'legs-front',['quads'],['glutes','hamstrings']),'medium'),
e('leg-press','Presse à cuisses',3,'10–15','2',120,'JAMBES','Ne décolle pas le bassin.',m(undefined,'legs-front',['quads'],['glutes','hamstrings']),'medium'),
e('bulgarian','Bulgarian split squat',3,'8–12/côté','2',105,'JAMBES','Contrôle du bassin.',m(undefined,'legs-front',['quads','glutes'],['hamstrings']),'medium'),
e('leg-extension','Leg extension',3,'12–15','1–2',75,'QUADRICEPS','Verrouillage contrôlé.',m(undefined,'legs-front',['quads'])),
e('seated-curl','Leg curl assis',4,'10–15','1–2',75,'ISCHIOS','Bassin plaqué.',m(undefined,'legs-back',['hamstrings'])),
e('calf','Mollets',4,'10–15','1–2',60,'MOLLETS','Amplitude complète.',m(undefined,'legs-back',['calves']))
]},
{id:'upper',day:'J4',title:'UPPER',subtitle:'Esthétique • Épaules • Haut pecs • Dorsaux',exercises:[
e('incline-db','Développé incliné haltères',3,'8–12','2',120,'HAUT PEC','Trajectoire convergente.',m(undefined,'front',['upper-chest'],['front-delts','triceps'])),
e('pulldown-2','Tirage vertical',3,'8–12','2',120,'DORSAUX','Cage haute.',m(undefined,'back',['lats'],['biceps'])),
e('machine-row','Rowing machine',3,'10–15','2',90,'DOS','Pas d’élan lombaire.',m(undefined,'back',['mid-back'],['lats','rear-delts','biceps'])),
e('low-high-fly','Écartés câble bas→haut',3,'12–15','1–2',75,'HAUT PEC','Vers la ligne claviculaire.',m(undefined,'front',['upper-chest'],['front-delts'])),
e('lat-raise-2','Élévations latérales',5,'12–20','1–2',60,'DELTOÏDES','Tension constante.',m(undefined,'front',['side-delts'])),
e('reverse-fly','Reverse fly',3,'15–20','1–2',60,'ARRIÈRE ÉPAULE','Mouvement léger.',m(undefined,'back',['rear-delts'],['mid-back']))
]},
{id:'lowerarms',day:'J5',title:'LOWER + BRAS',subtitle:'Jambes • Chaîne postérieure progressive • Bras',exercises:[
e('single-press','Presse unilatérale',3,'10–15/côté','2',90,'JAMBES','Bassin fixe.',m(undefined,'legs-front',['quads','glutes'],['hamstrings']),'medium'),
e('leg-curl','Leg curl',4,'8–12','1–2',75,'ISCHIOS','Contrôle excentrique.',m(undefined,'legs-back',['hamstrings'])),
e('step-up','Split squat / step-up',3,'10/côté','2',105,'JAMBES','Pousse dans le talon.',m(undefined,'legs-front',['quads','glutes'],['hamstrings']),'medium'),
e('leg-extension-2','Leg extension',2,'15','1–2',60,'QUADRICEPS','Contrôle.',m(undefined,'legs-front',['quads'])),
e('calf-2','Mollets',3,'12–20','1–2',60,'MOLLETS','Amplitude complète.',m(undefined,'legs-back',['calves'])),
e('curl','Curl',3,'10–15','1–2',60,'BICEPS','Pas d’élan.',m(undefined,'front',['biceps'])),
e('triceps','Triceps',3,'10–15','1–2',60,'TRICEPS','Coudes fixes.',m(undefined,'front',['triceps']))
]}
];

export const muscleLabels:Record<MuscleGroup,string>={
'upper-chest':'Haut pecs','chest':'Pectoraux','front-delts':'Deltoïdes antérieurs',
'side-delts':'Deltoïdes latéraux','rear-delts':'Deltoïdes postérieurs','triceps':'Triceps',
'lats':'Dorsaux','mid-back':'Milieu du dos','biceps':'Biceps','quads':'Quadriceps',
'hamstrings':'Ischios','glutes':'Fessiers','calves':'Mollets','core':'Core'
};

export const backLevels=[
{level:1,title:'Contrôle / reprise',color:'#25d66d',exercises:['Bascule du bassin','Dead bug débutant','Bird dog débutant','Pont fessier','Planche genoux','Sphinx optionnel']},
{level:2,title:'Renforcement intermédiaire',color:'#3b8cff',exercises:['Dead bug complet','Bird dog avancé','Pont une jambe','Planche complète','Side plank','Pallof press']},
{level:3,title:'Force fonctionnelle',color:'#ff9a36',exercises:['Hip hinge','Romanian deadlift léger','Goblet squat','Rowing','Suitcase carry','Pallof press renforcé']},
{level:4,title:'Capacité avancée',color:'#9b74ff',exercises:['Deadlift progressif','Squat chargé','Bulgarian split squat','Farmer carry','Side plank + abduction','Rollout']}
];
