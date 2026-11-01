import {validate,inventory,fingerprint} from './transfer-v3.mjs';
const DATABASE='vita-transfer-v3-fixture-only';
const empty=()=>({version:1,revision:0,current:null,previous:null,canUndo:false,history:[]});
function checked(s){
 if(!s||s.version!==1||!Number.isSafeInteger(s.revision)||s.revision<0||typeof s.canUndo!=='boolean'||!Array.isArray(s.history)||s.history.some(x=>typeof x!=='string'))throw Error('Тестовое хранилище повреждено');
 for(const x of [s.current,s.previous])if(x!==null)validate(x);
 return s;
}
export async function openReceiver({test=false}={}){
 const name=DATABASE+(test?'-automated-check':'');
 const db=await new Promise((resolve,reject)=>{const r=indexedDB.open(name,1);r.onupgradeneeded=()=>r.result.createObjectStore('state');r.onsuccess=()=>resolve(r.result);r.onerror=()=>reject(r.error);r.onblocked=()=>reject(Error('Закройте другие тестовые вкладки'));});
 db.onversionchange=()=>db.close();
 function transaction(mode,change){return new Promise((resolve,reject)=>{
  let result,failure;const tx=db.transaction('state',mode),store=tx.objectStore('state'),request=store.get('receiver');
  request.onsuccess=()=>{try{const state=structuredClone(checked(request.result??empty()));result=change?checked(change(state)):state;if(change)store.put(result,'receiver');}catch(e){failure=e;tx.abort();}};
  tx.oncomplete=()=>resolve(structuredClone(result));tx.onabort=()=>reject(failure||tx.error||Error('Запись отменена; состояние не изменено'));tx.onerror=()=>{};
 });}
 return {read:()=>transaction('readonly'),close:()=>db.close(),
 async apply(payload,revision,{failBeforeCommit=false}={}){
  validate(payload.snapshot);const id=await fingerprint(payload.snapshot);
  if(id!==payload.fingerprint||JSON.stringify(payload.inventory)!==JSON.stringify(inventory(payload.snapshot)))throw Error('Состав копии не совпадает');
  const snapshot=structuredClone(payload.snapshot);
  return transaction('readwrite',state=>{
   if(state.revision!==revision)throw Error('Состояние изменилось в другой вкладке. Проверьте копию заново');
   if(state.history.includes(id))throw Error('Эта копия уже перенесена');
   if(state.current!==null)throw Error('Получатель не пуст: замена запрещена');
   if(failBeforeCommit)throw Error('Имитация прерывания до фиксации');
   return {...state,revision:state.revision+1,current:snapshot,previous:state.current,canUndo:true,history:[...state.history,id]};
  });
 },undo:()=>transaction('readwrite',state=>{if(!state.canUndo)throw Error('Нет переноса для отмены');return {...state,revision:state.revision+1,current:state.previous,previous:null,canUndo:false};})};
}
