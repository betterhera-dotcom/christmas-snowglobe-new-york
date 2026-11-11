export class HeldPose{
 constructor(){this.reset();}
 reset(){this.held=false;this.anchor=null;this.position=[0,0,0];this.velocity=[0,0,0];this.rotation=[0,0,0];this.target=[0,0,0];}
 update(dt,m){
  const held=!!m.keepHeld;
  if(held&&!this.held)this.anchor={x:m.x,y:m.y,base:[...this.position]};
  this.held=held;
  this.target=held?[Math.max(-1.25,Math.min(1.25,this.anchor.base[0]+(m.x-this.anchor.x)*4)),Math.max(.12,Math.min(1.1,this.anchor.base[1]+.22+(this.anchor.y-m.y)*3)),0]:[0,0,0];
  const steps=Math.max(1,Math.ceil(dt/.008)),h=dt/steps;
  for(let n=0;n<steps;n++)for(let i=0;i<3;i++){this.velocity[i]+=(100*(this.target[i]-this.position[i])-20*this.velocity[i])*h;this.position[i]+=this.velocity[i]*h;}
  const goal=held?[Math.max(-.20,Math.min(.20,(m.pitch||0)*.25)),Math.max(-.12,Math.min(.12,(m.x-this.anchor.x)*.3)),Math.max(-.14,Math.min(.14,(m.wristRoll||0)*.22))]:[0,0,0];
  for(let i=0;i<3;i++)this.rotation[i]+=(goal[i]-this.rotation[i])*(1-Math.exp(-dt*9));
  return this;
 }
}