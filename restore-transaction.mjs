// Fixture-only prototype. The adapter stores one complete state atomically;
// no Vita storage keys or browser persistence are accessed here.
import {validateSnapshot} from './restore-lab.mjs';
const copy=value=>structuredClone(value);
function validateState(state){
 if(!state||!Number.isSafeInteger(state.revision)||state.revision<0)throw Error('Invalid state');
 for(const value of [state.current,state.previous])if(value!==null)validateSnapshot(value);
 return state;
}
export function memoryAdapter(){
 let state={revision:0,current:null,previous:null};
 return {read:()=>copy(state),compareAndSwap(expected,next){
  if(state.revision!==expected)throw Error('State changed');
  validateState(next);if(next.revision!==expected+1)throw Error('Invalid revision');
  state=copy(next);
 }};
}
export function restoration(adapter){
 let active=false;
 function change(snapshot,undo=false){
  if(active)throw Error('Restore already running');active=true;
  try{
   const before=copy(validateState(adapter.read()));
   if(!undo)validateSnapshot(snapshot);
   if(undo&&before.current===null)throw Error('Nothing to undo');
   const next={revision:before.revision+1,current:copy(undo?before.previous:snapshot),previous:copy(undo?null:before.current)};
   try{adapter.compareAndSwap(before.revision,next);}catch(error){
    // A response can fail after the atomic commit. Inspect rather than retry
    // blindly or overwrite a newer revision from another controller.
    if(JSON.stringify(adapter.read())!==JSON.stringify(next))throw error;
   }
   if(JSON.stringify(adapter.read())!==JSON.stringify(next))throw Error('Restore could not be confirmed');
   return copy(next);
  }finally{active=false;}
 }
 return {read:()=>copy(validateState(adapter.read())),apply:snapshot=>change(snapshot),undo:()=>change(null,true)};
}
