import {fixture} from './restore-lab.mjs';
import {memoryAdapter,restoration} from './restore-transaction.mjs';
const assert=(value,label)=>{if(!value)throw Error(label);};
const same=(a,b)=>JSON.stringify(a)===JSON.stringify(b);
function rejects(action){let failed=false;try{action();}catch{failed=true;}assert(failed,'Expected rejection');}
// Fail before commit: no section may change; reconstruct a controller to model reopening.
for(const point of ['before','after','none']){
 const base=memoryAdapter();let once=true;
 const adapter={read:base.read,compareAndSwap(revision,next){if(once&&point==='before'){once=false;throw Error('Quota / interrupted write');}base.compareAndSwap(revision,next);if(once&&point==='after'){once=false;throw Error('Lost completion');}}};
 const restore=restoration(adapter);
 if(point==='before')rejects(()=>restore.apply(fixture));else restore.apply(fixture);
 const reopened=restoration(base);assert(same(reopened.read().current,point==='before'?null:fixture),'Complete state after interruption');
 if(point!=='before'){reopened.undo();assert(reopened.read().current===null,'Undo restored empty state');}
}
const adapter=memoryAdapter(),restore=restoration(adapter);
rejects(()=>restore.apply({...fixture,savings:[]}));assert(restore.read().revision===0,'Invalid file did not mutate state');
restore.apply(fixture);const before=restore.read();
// Caller mutation cannot corrupt stored state or rollback copy.
before.current.savings.length=0;assert(restore.read().current.savings.length===1,'Defensive clone');
const stale=restore.read().revision;restore.apply(fixture);
rejects(()=>adapter.compareAndSwap(stale,{revision:stale+1,current:null,previous:null}));
restore.undo();assert(same(restore.read().current,fixture),'Undo preserves prior complete snapshot');
console.log('PASS: atomic fixture restore, pre-write failure, lost completion, reconstructed controller, invalid snapshot, defensive copies, stale writer, undo');
