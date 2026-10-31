import {createBackup,readBackup,fixture,validateSnapshot} from './restore-lab.mjs';
const assert=value=>{if(!value)throw Error('Assertion failed');};
async function rejects(action){let failed=false;try{await action();}catch{failed=true;}assert(failed);}
const pass='fixture-password-1234',first=await createBackup(pass),second=await createBackup(pass);
assert(first!==second);assert(JSON.stringify(await readBackup(first,pass))===JSON.stringify(fixture));assert(!first.includes('Вымышленный'));
await rejects(()=>readBackup(first,'incorrect-password'));
const envelope=JSON.parse(first);envelope.ciphertext=(envelope.ciphertext[0]==='A'?'B':'A')+envelope.ciphertext.slice(1);await rejects(()=>readBackup(JSON.stringify(envelope),pass));
for(const patch of [{version:2},{iterations:2000000},{salt:'AAAA'},{iv:null},{ciphertext:'!'}])await rejects(()=>readBackup(JSON.stringify({...JSON.parse(first),...patch}),pass));
await rejects(()=>readBackup('x'.repeat(20001),pass));await rejects(()=>readBackup('{}',pass));await rejects(()=>createBackup('short'));
await rejects(()=>validateSnapshot({...fixture,savings:[]}));await rejects(()=>validateSnapshot({...fixture,expenses:[{id:'fake',projectId:'missing'}]}));
console.log('PASS: fixture round trip, unique envelope, wrong password, tampering, limits, version, missing savings and broken references');
