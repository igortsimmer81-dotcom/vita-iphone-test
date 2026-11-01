// Isolated fixture-only transfer: no storage access, network or financial calculations.
export const sections=['projects','tasks','expenses','projectReturns','debts','debtPayments','notes','suppliers','supplierSales','supplierPayments'];
export function fakeSnapshot(){return {version:1,kind:'vita-transfer-FAKE',main:{projects:[{id:'fake-project',name:'Вымышленный проект'}],tasks:[{id:'fake-task',project:'fake-project'}],expenses:[{id:'fake-expense',project:'fake-project',amount:123}],projectReturns:[{id:'fake-return',project:'fake-project',amount:10}],debts:[{id:'fake-debt',amount:50}],debtPayments:[{id:'fake-debt-payment',debtId:'fake-debt',amount:5}],notes:[{id:'fake-note',text:'Вымышленная заметка'}],suppliers:[{id:'fake-supplier'}],supplierSales:[{id:'fake-sale',supplierId:'fake-supplier',saleAmount:20}],supplierPayments:[{id:'fake-payment',supplierId:'fake-supplier',amount:10,allocations:[{saleId:'fake-sale',amount:10}]}]},savings:[{id:'fake-saving',ops:[{id:'fake-operation',date:'2026-11-01',amount:456}]}]};}
const check=(x,message='Файл не поддерживается')=>{if(!x)throw Error(message);};
const clone=x=>structuredClone(x);
export function validate(snapshot){
 // Deliberately accept exactly the complete public fixture, never personal backups.
 check(JSON.stringify(snapshot)===JSON.stringify(fakeSnapshot()),'Нужен полный вымышленный набор этого теста');return snapshot;
}
export function inventory(snapshot){validate(snapshot);return Object.fromEntries([...sections.map(k=>[k,snapshot.main[k].map(x=>x.id)]),['savings',snapshot.savings.map(x=>x.id)],['savingOperations',snapshot.savings.flatMap(x=>x.ops.map(o=>o.id))]]);}
const enc=new TextEncoder(),dec=new TextDecoder('utf-8',{fatal:true});
const b64=x=>btoa(String.fromCharCode(...x));
function un64(x,size){check(typeof x==='string'&&x.length<30000&&/^[A-Za-z0-9+/]*={0,2}$/.test(x));const b=Uint8Array.from(atob(x),c=>c.charCodeAt(0));check(b64(b)===x&&(!size||b.length===size));return b;}
async function derive(pass,salt){check(typeof pass==='string'&&pass.length>=16&&pass.length<=1024,'Пароль: от 16 до 1024 символов');const material=await crypto.subtle.importKey('raw',enc.encode(pass),'PBKDF2',false,['deriveKey']);return crypto.subtle.deriveKey({name:'PBKDF2',hash:'SHA-256',salt,iterations:310000},material,{name:'AES-GCM',length:256},false,['encrypt','decrypt']);}
export async function fingerprint(snapshot){validate(snapshot);return b64(new Uint8Array(await crypto.subtle.digest('SHA-256',enc.encode(JSON.stringify(snapshot)))));}
export async function pack(pass){const snapshot=fakeSnapshot();validate(snapshot);const payload={snapshot,inventory:inventory(snapshot),fingerprint:await fingerprint(snapshot)};const salt=crypto.getRandomValues(new Uint8Array(16)),iv=crypto.getRandomValues(new Uint8Array(12));const ciphertext=new Uint8Array(await crypto.subtle.encrypt({name:'AES-GCM',iv},await derive(pass,salt),enc.encode(JSON.stringify(payload))));return JSON.stringify({kind:'vita-transfer-v3-encrypted-FAKE',version:1,iterations:310000,salt:b64(salt),iv:b64(iv),ciphertext:b64(ciphertext)});}
export async function unpack(text,pass){check(typeof text==='string'&&text.length<=40000);const e=JSON.parse(text);check(e.kind==='vita-transfer-v3-encrypted-FAKE'&&e.version===1&&e.iterations===310000);const salt=un64(e.salt,16),iv=un64(e.iv,12),ciphertext=un64(e.ciphertext);check(ciphertext.length>=16);const p=JSON.parse(dec.decode(await crypto.subtle.decrypt({name:'AES-GCM',iv},await derive(pass,salt),ciphertext)));validate(p.snapshot);check(p.fingerprint===await fingerprint(p.snapshot)&&JSON.stringify(p.inventory)===JSON.stringify(inventory(p.snapshot)));return clone(p);}
export function receiver(){
 let state={revision:0,current:null,history:[]},undoState=null;
 return {read:()=>clone(state),preview:payload=>({revision:state.revision,inventory:inventory(payload.snapshot)}),
 apply(payload,revision,{failBeforeCommit=false}={}){
  validate(payload.snapshot);check(revision===state.revision,'Состояние получателя изменилось');
  const identity=JSON.stringify(payload.snapshot);
  check(!state.history.includes(identity),'Эта копия уже перенесена');check(state.current===null,'Получатель не пуст: замена запрещена');
  check(JSON.stringify(payload.inventory)===JSON.stringify(inventory(payload.snapshot)));
  const next={revision:state.revision+1,current:clone(payload.snapshot),history:[...state.history,identity]};
  check(!failBeforeCommit,'Имитация сбоя: прежнее состояние сохранено');
  undoState=clone(state);state=next;
  check(JSON.stringify(inventory(state.current))===JSON.stringify(payload.inventory));return clone(state);
 },undo(){check(undoState,'Нет операции для отмены');const previous=undoState;state={...clone(previous),revision:state.revision+1,history:state.history};undoState=null;return clone(state);}};
}
