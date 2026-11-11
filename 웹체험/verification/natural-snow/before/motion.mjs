// Camera coordinates and pointer coordinates both use a mirrored 0..1 input space.
export class ShakeMotion {
  constructor(){this.reset();}
  reset(){this.last=null;this.raw=0;this.energy=0;this.strokes=0;this.direction=0;this.extreme=0;this.lastStroke=-10;this.firstStroke=0;this.burst=0;this.cooldown=0;this.x=.5;this.y=.5;}
  sample(x,y,time){
    if(!Number.isFinite(x+y+time))return;
    x=Math.max(0,Math.min(1,x));y=Math.max(0,Math.min(1,y));
    if(!this.last||time-this.last.t>.3){this.last={x,y,t:time};this.extreme=x;this.direction=0;this.strokes=0;this.raw=0;this.x=x;this.y=y;return;}
    const dt=time-this.last.t;if(dt<.008)return;
    const dx=x-this.last.x,dy=y-this.last.y;
    // Reject tracking swaps/jumps; reacquisition must never launch a snowstorm.
    if(Math.hypot(dx,dy)>.45){this.last=null;this.raw=0;this.strokes=0;return;}
    const speed=Math.hypot(dx,dy*.7)/dt;
    this.raw=Math.min(1,Math.max(0,(speed-.12)/1.8));
    this.x=x;this.y=y;
    const displacement=x-this.extreme;
    if(!this.direction&&Math.abs(displacement)>.035){this.direction=Math.sign(displacement);this.extreme=x;}
    else if(this.direction){
      if((x-this.extreme)*this.direction>0)this.extreme=x;
      else if(Math.abs(displacement)>.085&&speed>.55){
        if(time-this.lastStroke<.85)this.strokes++;else {this.strokes=1;this.firstStroke=time;}
        this.lastStroke=time;this.direction*=-1;this.extreme=x;
        if(this.strokes>=20&&time-this.firstStroke>=7&&this.energy>.45&&this.cooldown<=0){this.burst=1;this.cooldown=7;this.strokes=0;}
      }
    }
    this.last={x,y,t:time};
  }
  update(dt,time){
    if(!this.last||time-this.last.t>.16)this.raw=0;
    this.energy+=(this.raw-this.energy)*(1-Math.exp(-dt/(this.raw>this.energy?.16:1.35)));
    this.burst=Math.max(0,this.burst-dt*.3);this.cooldown=Math.max(0,this.cooldown-dt);
    if(time-this.lastStroke>.85)this.strokes=0;
    return this.energy;
  }
}
