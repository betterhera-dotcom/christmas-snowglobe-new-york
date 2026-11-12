// Pick up by placing a recognised palm over the globe, independent of hand pose.
export class HandPickup {
 constructor(){this.reset();}
 reset(){this.closed=false;this.since=null;this.lastSeen=-Infinity;}
 update(hand,time,overGlobe=false){
  if(!hand||hand.length!==21||hand.some(p=>!p||!Number.isFinite(p.x+p.y+(p.z||0)))){
   this.since=null;if(time-this.lastSeen>2.5)this.closed=false;return this.closed;
  }
  if(time-this.lastSeen>.35)this.since=null;
  this.lastSeen=time;
  if(!this.closed){
   if(overGlobe){if(this.since===null)this.since=time;if(time-this.since>=.25)this.closed=true;}
   else this.since=null;
  }
  return this.closed;
 }
}
