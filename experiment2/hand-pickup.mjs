import {Grip,isCGrip} from './grip.mjs';
// Only a C-shaped hand acquires the globe. No location or calibration wait.
// Keep the existing brief-loss/open-hand hysteresis to prevent tracking flicker.
export class HandPickup extends Grip {
 update(hand,time){
  const valid=hand?.length===21&&hand.every(p=>p&&Number.isFinite(p.x+p.y+(p.z??0)));
  if(!this.closed&&valid&&isCGrip(hand))this.closed=true;
  return super.update(hand,time);
 }
}
