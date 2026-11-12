// Only deliberate shaking after the invitation can begin the city journey.
export class SnowEntry {
 constructor(){this.reset();}
 reset(){this.armed=false;this.strongTime=0;this.entered=false;}
 update(dt,{ready,strong=false}){
  if(this.entered)return false;
  if(!ready){this.armed=false;this.strongTime=0;return false;}
  // Show the invitation before counting any movement.
  if(!this.armed){this.armed=true;return false;}
  const step=Math.min(.1,Math.max(0,dt));
  this.strongTime=strong?this.strongTime+step:Math.max(0,this.strongTime-step);
  if(this.strongTime<.6)return false;
  this.entered=true;return true;
 }
}
