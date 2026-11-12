export class HeldPose{
 constructor(){this.reset();}
 reset(){this.held=false;this.anchor=null;this.gripRevision=0;this.position=[0,0,0];this.velocity=[0,0,0];this.rotation=[0,0,0];this.target=[0,0,0];}
 update(dt,m){
  const held=!!m.keepHeld;
  const revision=m.gripRevision||0;
  if(held&&(!this.held||revision!==this.gripRevision)){const base=[...this.position];if(this.held)base[1]-=.22;this.anchor={x:m.x,y:m.y,base};}
  this.gripRevision=revision;
  this.held=held;
  const gain=m.followHand&&Number.isFinite(m.cameraScale)&&m.cameraScale>0?m.cameraScale:1;
  this.target=held?[Math.max(-1.25,Math.min(1.25,this.anchor.base[0]+(m.x-this.anchor.x)*gain*4)),m.followHand&&Number.isFinite(m.lift)?m.lift:Math.max(.12,Math.min(1.1,this.anchor.base[1]+.22+(this.anchor.y-m.y)*gain*3)),0]:[0,0,0];
  const steps=Math.max(1,Math.ceil(dt/.008)),h=dt/steps;
  // Camera tracking follows fast arm motion more closely, while slow movement
  // retains gentle damping. Pointer behaviour stays unchanged.
  const follow=held&&m.followHand?20+12*Math.min(1,(m.inputSpeed||0)/1.6):10;
  for(let n=0;n<steps;n++)for(let i=0;i<3;i++){this.velocity[i]+=(follow*follow*(this.target[i]-this.position[i])-2*follow*this.velocity[i])*h;this.position[i]+=this.velocity[i]*h;}
  const goal=held?[Math.max(-.20,Math.min(.20,(m.pitch||0)*.25)),Math.max(-.12,Math.min(.12,(m.x-this.anchor.x)*gain*.3)),Math.max(-.14,Math.min(.14,(m.wristRoll||0)*.22))]:[0,0,0];
  for(let i=0;i<3;i++)this.rotation[i]+=(goal[i]-this.rotation[i])*(1-Math.exp(-dt*9));
  return this;
 }
}
