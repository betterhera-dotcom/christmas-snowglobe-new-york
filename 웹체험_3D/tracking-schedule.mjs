// One fresh frame at a time. A slow body/face scan must always give hands a turn.
export class TrackingSchedule{
 constructor(){this.reset();}
 reset(){this.videoTime=-1;this.lastHand=-Infinity;this.lastBody=-Infinity;this.lastFace=-Infinity;this.lastKind=null;this.handTimes=[];}
 next(now,videoTime,{allowed,phase='globe',diagnostics=false,faceReady=false}){
  if(videoTime===this.videoTime)return null;
  const bodyInterval=allowed?700:350;
  const bodyDue=now-this.lastBody>=bodyInterval-1;
  const faceDue=faceReady&&(allowed||diagnostics)&&now-this.lastFace>=(phase==='city'?300:600);
  let kind=null;
  if((allowed||diagnostics)&&this.lastKind!=='hand'&&this.lastKind!==null&&now-this.lastHand>=1000/30-1)kind='hand';
  else if(bodyDue&&(!faceDue||this.lastBody<=this.lastFace))kind='body';
  else if(faceDue)kind='face';
  else if((allowed||diagnostics)&&now-this.lastHand>=(allowed?1000/30-1:250))kind='hand';
  if(!kind)return null;
  this.videoTime=videoTime;this.lastKind=kind;
  if(kind==='body')this.lastBody=now;else if(kind==='face')this.lastFace=now;else this.lastHand=now;
  return kind;
 }
 recordHand(now){this.handTimes.push(now);this.handTimes=this.handTimes.filter(t=>now-t<1000);}
 handHz(now){return this.handTimes.filter(t=>now-t<1000).length;}
}
