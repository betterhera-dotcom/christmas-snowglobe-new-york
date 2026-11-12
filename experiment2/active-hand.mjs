import {HAND_HOLD_SECONDS} from './tracking-policy.mjs';
const distance=(a,b)=>Math.hypot(a.x-b.x,a.y-b.y);
// Track the viewer's two eligible hands independently of detector array order.
export class ActiveHand {
 constructor(){this.reset();}
 reset(){this.tracks=[];this.nextId=0;this.active=null;this.challenger=null;this.since=0;this.time=-Infinity;this.changed=false;}
 select(candidates,time,{size=1,prefer=()=>false,moving=false}={}){
  const dt=time-this.time,previous=dt>0&&dt<=HAND_HOLD_SECONDS?this.tracks:[];
  // At most two hands: compare both one-to-one assignments, rather than
  // letting the same stationary wrist claim both detections.
  let matches=candidates.map(()=>null);
  if(previous.length===2&&candidates.length===2){
   const direct=distance(previous[0].wrist,candidates[0].wrist)+distance(previous[1].wrist,candidates[1].wrist);
   const crossed=distance(previous[1].wrist,candidates[0].wrist)+distance(previous[0].wrist,candidates[1].wrist);
   matches=direct<=crossed?previous:[previous[1],previous[0]];
  }else if(previous.length&&candidates.length){
   let best={cost:Infinity};
   for(const [i,c] of candidates.entries())for(const p of previous){const cost=distance(p.wrist,c.wrist);if(cost<best.cost)best={cost,i,p};}
   matches[best.i]=best.p;
  }
  const tracks=candidates.map((c,i)=>{
   const p=matches[i],speed=p?distance(p.wrist,c.wrist)/Math.max(.008,dt)/Math.max(.005,size):0;
   return {...c,id:p?.id??++this.nextId,speed:p?p.speed*.4+speed*.6:0};
  });
  const current=tracks.find(t=>t.id===this.active);
  const preferred=tracks.filter(t=>prefer(t.index));
  let chosen=preferred.find(t=>t.id===this.active)||preferred[0]||current||tracks[0];
  if(moving&&current&&!preferred.length){
   const fastest=tracks.reduce((best,t)=>!best||t.speed>best.speed?t:best,null);
   if(fastest&&fastest.id!==current.id&&fastest.speed>.35&&fastest.speed>current.speed*1.6+.25){
    if(this.challenger!==fastest.id){this.challenger=fastest.id;this.since=time;}
    if(time-this.since>=.12)chosen=fastest;
   }else this.challenger=null;
  }else this.challenger=null;
  this.changed=!!chosen&&chosen.id!==this.active;
  if(this.changed)this.challenger=null;
  this.active=chosen?.id??null;this.tracks=tracks;this.time=time;
  return chosen?.index??-1;
 }
}
