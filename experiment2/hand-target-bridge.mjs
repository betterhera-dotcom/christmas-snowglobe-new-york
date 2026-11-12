// Bridge accepted camera samples across render frames without extrapolating unseen motion.
export class HandTargetBridge{
 constructor(){this.reset();}
 reset(){this.stamp=null;this.capture=null;this.duration=0;this.elapsed=0;this.from=[0,0,0];this.to=[0,0,0];this.value=[0,0,0];}
 update(target,packet,dt){
  const stamp=packet?.receivedAt??packet?.t;
  if(!Number.isFinite(stamp)){this.reset();return target;}
  if(this.stamp===null){this.value=[...target];this.from=[...target];this.to=[...target];this.stamp=stamp;this.capture=packet.t;return this.value;}
  if(stamp!==this.stamp){
   const gap=Math.max(0,stamp-this.stamp);
   this.from=[...this.value];this.to=[...target];this.elapsed=0;
   // Finish within 75ms, even if an inference frame took much longer.
   this.duration=Math.max(.02,Math.min(.075,gap*.8));this.stamp=stamp;this.capture=packet.t;
  }
  this.elapsed+=Math.max(0,dt);const blend=this.duration?Math.min(1,this.elapsed/this.duration):1;
  for(let i=0;i<3;i++)this.value[i]=this.from[i]+(this.to[i]-this.from[i])*blend;
  return this.value;
 }
}
