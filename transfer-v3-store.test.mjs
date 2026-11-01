// Runs against actual IndexedDB in a browser, in a separate fixture-only test DB.
import {openReceiver} from './transfer-v3-store.mjs';
import {pack,unpack} from './transfer-v3.mjs';
const assert=(x,label)=>{if(!x)throw Error(label);};
async function rejects(fn){let failed=false;try{await fn();}catch{failed=true;}assert(failed,'Expected rejection');}
export async function runStorageChecks(){
 const dbName='vita-transfer-v3-fixture-only-automated-check';
 const remove=()=>new Promise((resolve,reject)=>{const r=indexedDB.deleteDatabase(dbName);r.onsuccess=resolve;r.onerror=()=>reject(r.error);r.onblocked=()=>reject(Error('Test database blocked'));});
 await remove();const handles=[];const connect=async()=>{const r=await openReceiver({test:true});handles.push(r);return r;};
 try{
  const payload=await unpack(await pack('fixture-storage-password'),'fixture-storage-password');
  let r=await connect();await rejects(()=>r.apply(payload,0,{failBeforeCommit:true}));r.close();
  r=await connect();assert((await r.read()).revision===0,'Aborted write survived reopen unchanged');
  await r.apply(payload,0);r.close();r=await connect();
  assert((await r.read()).current.savings[0].ops.length===1,'Complete snapshot persisted');
  assert((await r.read()).canUndo,'Undo persisted');await rejects(()=>r.apply(payload,1));
  await r.undo();r.close();r=await connect();assert((await r.read()).current===null,'Undo survived reopen');
  await rejects(()=>r.apply(payload,2));assert((await r.read()).history.length===1,'Duplicate history persisted after undo');
 }finally{for(const r of handles)r.close();await remove();}
 await remove();let a,b;
 try{
  a=await openReceiver({test:true});b=await openReceiver({test:true});const p=await unpack(await pack('fixture-storage-password'),'fixture-storage-password');
  const results=await Promise.allSettled([a.apply(p,0),b.apply(p,0)]);
  assert(results.filter(x=>x.status==='fulfilled').length===1,'Only one concurrent writer committed');assert((await a.read()).history.length===1,'No duplicate');
 }finally{a?.close();b?.close();await remove();}
 return '✓ IndexedDB: запись, закрытие и повторное открытие, постоянная отмена, история повторов, прерывание и две вкладки — проверки пройдены.';
}
