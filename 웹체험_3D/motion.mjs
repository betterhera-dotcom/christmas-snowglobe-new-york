// Camera coordinates and pointer coordinates both use a mirrored 0..1 input space.
import {MIN_PLAY_SECONDS} from './journey.mjs';
export class ShakeMotion {
  constructor(){this.reset();}
  reset(){this.last=null;this.raw=0;this.energy=0;this.inputSpeed=0;this.strokes=0;this.direction=0;this.extreme=0;this.lastStroke=-10;this.firstStroke=0;this.burst=0;this.cooldown=0;this.x=.5;this.y=.5;this.anchor=null;this.vector=null;this.turn=0;this.playTime=0;}
  release(){this.last=null;this.raw=0;this.inputSpeed=0;this.strokes=0;this.burst=0;this.anchor=null;this.vector=null;this.turn=0;}
  sample(x,y,time){
    if(!Number.isFinite(x+y+time))return;
    x=Math.max(0,Math.min(1,x));y=Math.max(0,Math.min(1,y));
    if(!this.last||time-this.last.t>.3){this.last={x,y,t:time};this.extreme=x;this.direction=0;this.strokes=0;this.raw=0;this.inputSpeed=0;this.x=x;this.y=y;this.anchor={x,y};this.vector=null;this.turn=0;return;}
    const dt=time-this.last.t;if(dt<.008)return;
    const dx=x-this.last.x,dy=y-this.last.y;
    // Reject tracking swaps/jumps; reacquisition must never launch a snowstorm.
    if(Math.hypot(dx,dy)>.45){this.last=null;this.raw=0;this.inputSpeed=0;this.strokes=0;return;}
    const speed=Math.hypot(dx,dy)/dt;
    this.inputSpeed+=(speed-this.inputSpeed)*(1-Math.exp(-dt/.05));
    this.raw=Math.min(1,Math.max(0,(speed-.12)/1.8));
    this.x=x;this.y=y;
    // Accumulate changes of travel direction in the whole image plane.
    const ax=x-this.anchor.x,ay=y-this.anchor.y,length=Math.hypot(ax,ay);
    if(length>.035&&speed>.42){
      const next={x:ax/length,y:ay/length};
      if(this.vector){
        const angle=Math.acos(Math.max(-1,Math.min(1,next.x*this.vector.x+next.y*this.vector.y)));
        if(angle>.08){
          if(time-this.lastStroke>1.35){this.turn=0;this.firstStroke=time;}
          this.turn+=angle;this.strokes=Math.floor(this.turn/Math.PI);this.lastStroke=time;
          if(this.playTime>=MIN_PLAY_SECONDS&&this.turn>=Math.PI*4&&time-this.firstStroke>=1.5&&this.energy>.28&&this.cooldown<=0){this.burst=1;this.cooldown=7;this.turn=0;this.strokes=0;}
        }
      }
      this.vector=next;this.anchor={x,y};
    }
    this.last={x,y,t:time};
  }
  update(dt,time){
    if(!this.last||time-this.last.t>.16){this.raw=0;this.inputSpeed*=Math.exp(-dt/.12);}
    this.energy+=(this.raw-this.energy)*(1-Math.exp(-dt/(this.raw>this.energy?.16:1.35)));
    if(this.last&&time-this.last.t<.3&&this.energy>.03)this.playTime+=Math.min(dt,.1);
    this.burst=Math.max(0,this.burst-dt*.3);this.cooldown=Math.max(0,this.cooldown-dt);
    if(time-this.lastStroke>1.35){this.strokes=0;this.turn=0;}
    return this.energy;
  }
}
