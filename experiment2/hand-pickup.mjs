import {Grip,isCGrip,openFingers} from './grip.mjs';
// A raised open palm acquires the globe; the app releases when the hand lowers.
// Keep a C-shaped hand usable too, and tolerate brief missed observations.
export class HandPickup extends Grip {
 update(hand,time){
  const valid=hand?.length===21&&hand.every(p=>p&&Number.isFinite(p.x+p.y+(p.z??0)));
  if(!valid){
   if(time-this.lastSeen>2.5)this.reset();
   return this.closed;
  }
  this.lastSeen=time;
  if(!this.closed&&(openFingers(hand)>=3||isCGrip(hand)))this.closed=true;
  return this.closed;
 }
}
