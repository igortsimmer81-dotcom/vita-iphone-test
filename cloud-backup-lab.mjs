const BASE='https://pchaeocodmzxtfsnasdx.supabase.co';
export const fixture=Object.freeze({kind:'vita-cloud-lab-FAKE',version:1,expenses:[{id:'fake-001',amount:123,currency:'RUB',note:'Вымышленная запись'}]});
const enc=new TextEncoder(),dec=new TextDecoder();
const b64=bytes=>btoa(String.fromCharCode(...bytes));
const bytes=value=>Uint8Array.from(atob(value),c=>c.charCodeAt(0));
async function key(pass,salt,iterations){const material=await crypto.subtle.importKey('raw',enc.encode(pass),'PBKDF2',false,['deriveKey']);return crypto.subtle.deriveKey({name:'PBKDF2',hash:'SHA-256',salt,iterations},material,{name:'AES-GCM',length:256},false,['encrypt','decrypt']);}
export async function seal(pass){const salt=crypto.getRandomValues(new Uint8Array(16)),iv=crypto.getRandomValues(new Uint8Array(12)),iterations=310000;return {ciphertext:b64(new Uint8Array(await crypto.subtle.encrypt({name:'AES-GCM',iv},await key(pass,salt,iterations),enc.encode(JSON.stringify(fixture))))),salt:b64(salt),iv:b64(iv),iterations,format_version:1};}
export async function open(row,pass){if(row.format_version!==1||row.iterations!==310000||bytes(row.salt).length!==16||bytes(row.iv).length!==12)throw Error('Invalid envelope');return dec.decode(await crypto.subtle.decrypt({name:'AES-GCM',iv:bytes(row.iv)},await key(pass,bytes(row.salt),row.iterations),bytes(row.ciphertext)));}
const check=(value,message)=>{if(!value)throw Error(message);};
export async function runLab({apiKey,emailA,passwordA,emailB,passwordB,report=()=>{},request=fetch}){
 check(apiKey.startsWith('sb_publishable_')||apiKey.startsWith('eyJ'),'Publishable key required');
 check(emailA.trim().toLowerCase()!==emailB.trim().toLowerCase(),'Two accounts required');
 let owner,other,id,deleted=false;
 async function api(path,token,method='GET',body){const response=await request(BASE+path,{method,headers:{apikey:apiKey,...(token?{Authorization:'Bearer '+token}:{}),'Content-Type':'application/json',Prefer:'return=representation'},...(body?{body:JSON.stringify(body)}:{})});if(!response.ok)throw Error('Request failed: '+response.status);const text=await response.text();return text?JSON.parse(text):null;}
 const rowPath=()=>'/rest/v1/vita_encrypted_backups?id=eq.'+encodeURIComponent(id);
 try{
 report('Вход двух тестовых аккаунтов…');
 owner=await api('/auth/v1/token?grant_type=password',null,'POST',{email:emailA,password:passwordA});
 other=await api('/auth/v1/token?grant_type=password',null,'POST',{email:emailB,password:passwordB});
 check(owner.user.id!==other.user.id,'Accounts must differ');
 const pass=b64(crypto.getRandomValues(new Uint8Array(32))),envelope=await seal(pass);
 check(await open(envelope,pass)===JSON.stringify(fixture),'Local mismatch');
 for(const [candidate,p] of [[envelope,pass+'wrong'],[{...envelope,ciphertext:b64(Uint8Array.from(bytes(envelope.ciphertext),(v,i)=>i===0?v^1:v))},pass]]){let rejected=false;try{await open(candidate,p);}catch{rejected=true;}check(rejected,'Decryption should fail');}
 report('✅ Локальное восстановление, неверный пароль и подмена проверены.');
 // Client-generated ID remains available even if the INSERT response is lost.
 id=crypto.randomUUID();report('Тестовая запись: '+id);
 const inserted=await api('/rest/v1/vita_encrypted_backups',owner.access_token,'POST',{id,user_id:owner.user.id,...envelope});
 check(inserted?.length===1&&inserted[0].id===id,'Insert not confirmed');
 const rows=await api(rowPath(),owner.access_token);check(rows.length===1,'Own row missing');
 check(await open(rows[0],pass)===JSON.stringify(fixture),'Cloud mismatch');
 report('✅ Облачная копия восстановлена и точно совпала с вымышленным набором.');
 check((await api(rowPath(),other.access_token)).length===0,'Cross-user read allowed');
 check((await api(rowPath(),other.access_token,'DELETE')).length===0,'Cross-user delete allowed');
 check((await api(rowPath(),owner.access_token)).length===1,'Owner row lost');
 report('✅ Аккаунт B не может прочитать или удалить запись A.');
 }finally{
 if(id&&owner){try{await api(rowPath(),owner.access_token,'DELETE');check((await api(rowPath(),owner.access_token)).length===0,'Cleanup unconfirmed');deleted=true;report('✅ Тестовая запись удалена; отсутствие подтверждено.');}catch{report('❌ Не удалось подтвердить очистку. Сохраните ID: '+id);}}
 for(const session of [owner,other])if(session)try{await api('/auth/v1/logout?scope=local',session.access_token,'POST');}catch{report('Не удалось подтвердить завершение тестовой сессии.');}
 }
 check(deleted,'Cleanup required');report('✅ Все этапы завершены.');
}
