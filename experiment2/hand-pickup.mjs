import {openFingers} from './grip.mjs';
const distance=(a,b)=>Math.hypot(a.x-b.x,a.y-b.y,(a.z??0)-(b.z??0));
const reach=hand=>[5,9,13,17].map(base=>distance(hand[base+3],hand[0])/Math.max(1e-6,distance(hand[base],hand[0])));
// Remember an open palm, then accept a small contraction of at least two fingers.
// Ratios are independent of hand size, wrist rotation and left/right handedness.
export class HandPickup {
 constructor(){this.reset();}
 reset(){this.closed=false;this.ready=false;this.baseline=null;this.since=null;this.lastSeen=-Infinity;this.openSince=null;this.openFrames=0;}
 update(hand,time=performance.now()/1000){
  if(time-this.lastSeen>2.5)this.reset();
  const valid=hand?.length===21&&hand.every(p=>p&&Number.isFinite(p.x+p.y+(p.z??0)));
  if(!valid){this.since=this.openSince=null;this.openFrames=0;return this.closed;}
  const continuous=time-this.lastSeen<=.25;
  this.lastSeen=time;
  const fingers=reach(hand),open=openFingers(hand);
  const curled=this.baseline&&fingers.filter((value,i)=>this.baseline[i]-value>=.12).length>=2;
  if(this.closed){
   if(open===4&&!curled){
    if(this.openSince===null||!continuous){this.openSince=time;this.openFrames=0;}
    this.openFrames++;
    if(time-this.openSince>=.8&&this.openFrames>=6){this.closed=false;this.baseline=fingers;this.ready=true;this.since=null;}
   }else{this.openSince=null;this.openFrames=0;}
  }else if(this.ready&&curled){
   if(this.since===null)this.since=time;
   if(time-this.since>=.08){this.closed=true;this.openSince=null;this.openFrames=0;}
  }else{
   this.since=null;
   if(open>=3&&!this.ready){this.ready=true;this.baseline=fingers;}
  }
  return this.closed;
 }
}
