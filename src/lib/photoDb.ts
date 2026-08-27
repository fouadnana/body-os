export type PhotoSlot='front'|'side'|'back'
export type ProgressPhoto={id:string;slot:PhotoSlot;date:string;blob:Blob}
const DB='bodyos-photos', STORE='photos', VERSION=1

function openDb():Promise<IDBDatabase>{
  return new Promise((resolve,reject)=>{
    const req=indexedDB.open(DB,VERSION)
    req.onupgradeneeded=()=>{const db=req.result;if(!db.objectStoreNames.contains(STORE))db.createObjectStore(STORE,{keyPath:'id'})}
    req.onsuccess=()=>resolve(req.result); req.onerror=()=>reject(req.error)
  })
}
export async function savePhoto(slot:PhotoSlot,file:File,date:string){
  const db=await openDb(); const tx=db.transaction(STORE,'readwrite');
  tx.objectStore(STORE).put({id:`${date}-${slot}`,slot,date,blob:file})
  return new Promise<void>((res,rej)=>{tx.oncomplete=()=>res();tx.onerror=()=>rej(tx.error)})
}
export async function latestPhotos():Promise<Record<PhotoSlot,ProgressPhoto|null>>{
  const db=await openDb(); const tx=db.transaction(STORE,'readonly'); const req=tx.objectStore(STORE).getAll()
  const all=await new Promise<ProgressPhoto[]>((res,rej)=>{req.onsuccess=()=>res(req.result as ProgressPhoto[]);req.onerror=()=>rej(req.error)})
  const out:Record<PhotoSlot,ProgressPhoto|null>={front:null,side:null,back:null}
  for(const p of all.sort((a,b)=>a.date.localeCompare(b.date))) out[p.slot]=p
  return out
}
