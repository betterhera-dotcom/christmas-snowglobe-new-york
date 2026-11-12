// Only visual work is capped; camera scheduling runs before this gate.
export class FrameCadence {
 constructor(hz=60){this.interval=1000/hz;this.reset();}
 reset(){this.deadline=null;this.last=null;}
 take(now){
  if(this.deadline!==null&&now+.2<this.deadline)return null;
  const dt=this.last===null?this.interval/1000:Math.min(.05,Math.max(0,(now-this.last)/1000));
  this.last=now;
  this.deadline=this.deadline===null||now-this.deadline>this.interval?now+this.interval:this.deadline+this.interval;
  return dt;
 }
}
export class ShadowRefresh {
 constructor(){this.reset();}
 reset(){this.transform=null;this.phase=null;this.last=-Infinity;}
 take(now,transform,phase,enabled=true,interval=0){
  const phaseChanged=this.phase!==phase;
  const moved=!this.transform||transform.some((v,i)=>Math.abs(v-this.transform[i])>1e-4);
  if(!phaseChanged&&(!enabled||!moved||now-this.last<interval))return false;
  this.transform=[...transform];this.phase=phase;this.last=now;return true;
 }
}
