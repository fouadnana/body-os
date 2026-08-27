export type SetLog={weight:string;reps:string;rir:string;done:boolean}
export type WorkoutLog=Record<string,SetLog[]>
export type WorkoutHistoryEntry={id:string;date:string;sessionId:string;exerciseId:string;sets:SetLog[];volume:number}
export type DailyLog={date:string;weight:number;waist?:number;steps?:number;calories?:number;protein?:number;carbs?:number;fat?:number}
export type CoachCheckin={date:string;fatigue:number;recovery:number;hunger:number;performance:number;adherence:number;back:number;note:string}

const read=<T,>(k:string,f:T):T=>{try{return JSON.parse(localStorage.getItem(k)||'') as T}catch{return f}}
const write=(k:string,v:unknown)=>localStorage.setItem(k,JSON.stringify(v))

export const store={
  getWorkout:()=>read<WorkoutLog>('bodyos.workout',{}),
  setWorkout:(v:WorkoutLog)=>write('bodyos.workout',v),
  getHistory:()=>read<WorkoutHistoryEntry[]>('bodyos.history',[]),
  setHistory:(v:WorkoutHistoryEntry[])=>write('bodyos.history',v),
  getDaily:()=>read<DailyLog[]>('bodyos.daily',[]),
  setDaily:(v:DailyLog[])=>write('bodyos.daily',v),
  getCheckins:()=>read<CoachCheckin[]>('bodyos.checkins',[]),
  setCheckins:(v:CoachCheckin[])=>write('bodyos.checkins',v),
  getDay:()=>read<number>('bodyos.day',0),
  setDay:(v:number)=>write('bodyos.day',v),
  getBackLevel:()=>read<number>('bodyos.backLevel',1),
  setBackLevel:(v:number)=>write('bodyos.backLevel',v)
}
