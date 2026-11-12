// Process fresh frames only. Hands get the frequent slots; faces still refresh
// before the audience ownership guard expires. Never run both models per tick.
export class TrackingSchedule{
 constructor(){this.reset();}
 reset(){this.videoTime=-1;this.lastHand=-Infinity;this.lastFace=-Infinity;this.lastKind=null;this.handTimes=[];}
 next(now,videoTime,{allowed,phase='globe',calibrating=false,diagnostics=false,prioritizeHands=false}){
  if(videoTime===this.videoTime)return null;
  const faceInterval=calibrating||!allowed?100:prioritizeHands?(phase==='city'?300:450):phase==='city'?100:200;
  let kind=null;
  // Diagnostic hands remain visible without a selected face. Alternate overdue
  // models on slower devices so repeated face checks cannot starve hand checks.
  if(diagnostics&&!calibrating&&this.lastKind==='face'&&now-this.lastHand>=(allowed?1000/30-1:250))kind='hand';
  else if(now-this.lastFace>=faceInterval-1)kind='face';
  else if(allowed&&!calibrating&&now-this.lastHand>=1000/30-1)kind='hand';
  if(!kind)return null;
  this.videoTime=videoTime;
  this.lastKind=kind;
  if(kind==='face')this.lastFace=now;
  else this.lastHand=now;
  return kind;
 }
 recordHand(now){this.handTimes.push(now);this.handTimes=this.handTimes.filter(t=>now-t<1000);}
 handHz(now){return this.handTimes.filter(t=>now-t<1000).length;}
}
