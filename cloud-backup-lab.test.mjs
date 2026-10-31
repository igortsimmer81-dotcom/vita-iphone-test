import {seal,open,fixture,runLab} from './cloud-backup-lab.mjs';
const assert=(v)=>{if(!v)throw Error('Assertion failed');};
const envelope=await seal('fixture-pass');
assert(await open(envelope,'fixture-pass')===JSON.stringify(fixture));
for(const [row,pass] of [[envelope,'wrong'],[{...envelope,ciphertext:(envelope.ciphertext[0]==='A'?'B':'A')+envelope.ciphertext.slice(1)},'fixture-pass']]){
 let rejected=false;try{await open(row,pass);}catch{rejected=true;}assert(rejected);
}
for(const failAfterInsert of [false,true]){
 const records=new Map();let creates=0;
 const request=async(url,options)=>{
  assert(url.startsWith('https://pchaeocodmzxtfsnasdx.supabase.co/'));
  const body=options.body?JSON.parse(options.body):null;let result;
  if(url.includes('/token?'))result={user:{id:body.email},access_token:body.email};
  else if(url.includes('/logout'))result=null;
  else if(options.method==='POST'){
   assert(body.ciphertext&&!JSON.stringify(body).includes('Вымышленная'));
   records.set(body.id,body);creates++;
   if(failAfterInsert)throw Error('Simulated lost INSERT response');
   result=[body];
  }else{
   const id=new URL(url).searchParams.get('id').slice(3);assert(id);
   const row=records.get(id);result=row&&options.headers.Authorization==='Bearer '+row.user_id?[row]:[];
   if(options.method==='DELETE'&&result.length)records.delete(id);
  }
  return new Response(JSON.stringify(result));
 };
 let failed=false;
 try{await runLab({apiKey:'sb_publishable_fixture',emailA:'a@example.invalid',emailB:'b@example.invalid',passwordA:'fake-a',passwordB:'fake-b',request});}catch{failed=true;}
 assert(failed===failAfterInsert);assert(creates===1);assert(records.size===0);
}
console.log('PASS: crypto, mock round trip, cross-user isolation, cleanup after lost INSERT response');
