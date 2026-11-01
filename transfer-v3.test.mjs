import {fakeSnapshot,inventory,validate,pack,unpack,receiver} from './transfer-v3.mjs';
const assert=x=>{if(!x)throw Error('Assertion failed');};
async function rejects(fn){let no=false;try{await fn();}catch{no=true;}assert(no);}
const password='fake-transfer-test-password';
// Network failures must not affect this local transfer.
const originalFetch=globalThis.fetch;globalThis.fetch=()=>{throw Error('Network unavailable');};
try{
 const file=await pack(password),payload=await unpack(file,password);assert(Object.keys(inventory(payload.snapshot)).length===12);
 assert(!file.includes('Вымышленная'));assert(file!==await pack(password));
 await rejects(()=>unpack(file,password+'wrong'));
 for(const changes of [{version:2},{iterations:2000000},{iv:'AAA='},{ciphertext:'AAAA'}])await rejects(()=>unpack(JSON.stringify({...JSON.parse(file),...changes}),password));
 for(const section of Object.keys(fakeSnapshot().main)){const x=fakeSnapshot();delete x.main[section];await rejects(()=>validate(x));}
 const noSavings=fakeSnapshot();noSavings.savings[0].ops=[];await rejects(()=>validate(noSavings));
 const r=receiver(),ticket=r.preview(payload);await rejects(()=>r.apply(payload,ticket.revision,{failBeforeCommit:true}));assert(r.read().current===null);
 r.apply(payload,ticket.revision);assert(JSON.stringify(r.read().current)===JSON.stringify(payload.snapshot));
 await rejects(()=>r.apply(payload,r.read().revision));await rejects(()=>r.apply(payload,ticket.revision));
 r.undo();assert(r.read().current===null);await rejects(()=>r.apply(payload,r.read().revision));
 const malformed=structuredClone(payload);malformed.inventory.savings=[];await rejects(()=>receiver().apply(malformed,0));
 console.log('PASS: full 12-group inventory, all sections required, savings operations, encryption, wrong password, malformed/version limits, offline transfer, preview, stale state, duplicate rejection, rollback');
}finally{globalThis.fetch=originalFetch;}
