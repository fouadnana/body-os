// Types partagés — extraits de V9App.tsx (Phase 6, stabilisation)

export type Screen='today'|'workout'|'nutrition'|'progress'|'coach'|'plan'|'adaptive'|'plus'|'library'|'templates'
export type WorkoutView='session'|'exercise'|'history'

export type MuscleGroup='Pectoraux'|'Dos'|'Épaules'|'Jambes'|'Bras'
export type SessionGroup=MuscleGroup|'L5-S1'
export type ExerciseItem={name:string,equipment:string,sets:string,img:string,video:string,target:string,secondary:string,reps:string,rir:string,rest:string}
// Une séance s'ouvre désormais par un template (ex. "Haut du corps"), pas par
// un groupe musculaire : DayPlan référence l'id d'un WorkoutTemplate, ou
// 'Repos'/'Cardio'. `group` reste le tag muscle de CHAQUE exercice (pour les
// badges, l'historique et Progress), indépendant du template qui le contient.
export type DayPlan=string|'Repos'|'Cardio'

export type Ingredient={name:string,qty:number,unit:string}
export type Meal={name:string,time:string,kcal:number,img:string,details:string,protein:number,carbs:number,fat:number,ingredients:Ingredient[]}
export type Recipe={id:string,name:string,category:string,time:string,kcal:number,protein:number,carbs:number,fat:number,img:string,ingredients:Ingredient[],steps:string[]}

export type NutritionDaily={kcal:number,protein:number,carbs:number,fat:number}
export type DailyEntry={date:string,weight?:number,waist?:number,steps?:number,bodyFat?:number,measurements?:Partial<Record<MuscleGroup,number>>,sleep?:number,energy?:number,hunger?:number,recovery?:number}
export type WorkoutHistoryEntry={id?:string,date:string,group:string,exercise:string,weight:number,reps:number,rir?:number}
export type ProgressionSuggestion={weight:number,reps:number,rir:number,reason:string}
export type LibraryEntry=ExerciseItem&{group:SessionGroup}
export type TemplateExerciseRef={group:SessionGroup,name:string}
export type WorkoutTemplate={id:string,name:string,exercises:TemplateExerciseRef[]}
export type SetDraft={weight:number,reps:number,rir:number}

export type EvolutionPhoto={
 id:string
 src:string
 date:string
 label:string
}
