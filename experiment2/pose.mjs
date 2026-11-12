import {HandTargetBridge} from './hand-target-bridge.mjs';
export class HeldPose{
 constructor({responsive=true,expanded=true}={}){this.responsive=responsive;this.expanded=expanded;this.reset();}
 reset(){this.bridge=new HandTargetBridge();this.held=false;this.anchor=null;this.gripRevision=0;this.position=[0,0,0];this.velocity=[0,0,0];this.rotation=[0,0,0];this.target=[0,0,0];}
 update(dt,m){
  const held=!!m.keepHeld;
  const revision=m.gripRevision||0;
  if(held&&(!this.held||revision!==this.gripRevision)){const base=[...this.position];if(this.held)base[1]-=.22;this.anchor={x:m.x,y:m.y,base};this.bridge.reset();}
  this.gripRevision=revision;
  this.held=held;
  const gain=m.followHand&&Number.isFinite(m.cameraScale)&&m.cameraScale>0?m.cameraScale:1;
  this.target=held?[Math.max(-1.25,Math.min(1.25,this.anchor.base[0]+(m.x-this.anchor.x)*gain*4)),m.followHand&&Number.isFinite(m.lift)?m.lift:Math.max(.12,Math.min(1.1,this.anchor.base[1]+.22+(this.anchor.y-m.y)*gain*3)),0]:[0,0,0];
  if(held&&m.followHand&&this.expanded){
   // Relative to the pickup point: shoulder re-estimation cannot move the globe.
   this.target[0]=Math.max(-1.8,Math.min(1.8,this.anchor.base[0]+(m.x-this.anchor.x)*gain*4));
   this.target[1]=Math.max(.08,Math.min(1.6,this.anchor.base[1]+.22+(this.anchor.y-m.y)*gain*3));
  }
  if(!held)this.bridge.reset();
  const steps=Math.max(1,Math.ceil(dt/.008)),h=dt/steps;
  // Camera tracking follows fast arm motion more closely, while slow movement
  // retains gentle damping. Pointer behaviour stays unchanged.
  const follow=held&&m.followHand?20+12*Math.min(1,(m.inputSpeed||0)/1.6):10;
  if(held&&m.followHand&&this.responsive){
   const displayTarget=this.bridge.update(this.target,m.last,dt);
   const alpha=1-Math.exp(-dt*40);
   for(let i=0;i<3;i++){const delta=(displayTarget[i]-this.position[i])*alpha;this.position[i]+=delta;this.velocity[i]=dt>0?delta/dt:0;}
  }else for(let n=0;n<steps;n++)for(let i=0;i<3;i++){this.velocity[i]+=(follow*follow*(this.target[i]-this.position[i])-2*follow*this.velocity[i])*h;this.position[i]+=this.velocity[i]*h;}
  const goal=held?[Math.max(-.20,Math.min(.20,(m.pitch||0)*.25)),Math.max(-.12,Math.min(.12,(m.x-this.anchor.x)*gain*.3)),Math.max(-.14,Math.min(.14,(m.wristRoll||0)*.22))]:[0,0,0];
  for(let i=0;i<3;i++)this.rotation[i]+=(goal[i]-this.rotation[i])*(1-Math.exp(-dt*9));
  return this;
 }
}
