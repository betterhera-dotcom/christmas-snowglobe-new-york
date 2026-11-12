// Enter from the visible snow distribution, not from a gesture strength timer.
export class SnowEntry {
 constructor(){this.reset();}
 reset(){this.fullTime=0;this.entered=false;}
 update(dt,{ready,fill}){
  if(this.entered)return false;
  this.fullTime=ready&&fill>=1?this.fullTime+Math.min(.1,Math.max(0,dt)):0;
  if(this.fullTime<.3)return false;
  this.entered=true;return true;
 }
}
