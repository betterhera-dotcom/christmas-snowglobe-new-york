// One fresh frame at a time. A slow body/face scan must always give hands a turn.
export class TrackingSchedule{
 constructor({receivingPriority=true}={}){this.receivingPriority=receivingPriority;this.reset();}
 reset(){this.videoTime=-1;this.lastHand=-Infinity;this.lastBody=-Infinity;this.lastFace=-Infinity;this.lastKind=null;this.handsSinceFace=0;this.handTimes=[];}
 next(now,videoTime,{allowed,phase='globe',diagnostics=false,faceReady=false,handTracked=true,receiving=false}){
  if(videoTime===this.videoTime)return null;
  const bodyInterval=allowed&&handTracked?1200:350;
  const bodyDue=now-this.lastBody>=bodyInterval-1;
  // The globe needs body ownership and hands only. Face scans start in the city.
  const faceDue=faceReady&&phase==='city'&&(allowed||diagnostics)&&now-this.lastFace>=(this.receivingPriority&&receiving?350:100);
  let kind=null;
  if((allowed||diagnostics)&&this.lastKind!=='hand'&&this.lastKind!==null&&now-this.lastHand>=1000/30-1)kind='hand';
  else if(bodyDue&&(!faceDue||this.lastBody<=this.lastFace))kind='body';
  else if(faceDue)kind='face';
  else if((allowed||diagnostics)&&now-this.lastHand>=(allowed?1000/30-1:250))kind='hand';
  if(!kind)return null;
  this.videoTime=videoTime;this.lastKind=kind;
  if(kind==='body')this.lastBody=now;else if(kind==='face'){this.lastFace=now;this.handsSinceFace=0;}else{this.lastHand=now;this.handsSinceFace++;}
  return kind;
 }
 recordHand(now){this.handTimes.push(now);this.handTimes=this.handTimes.filter(t=>now-t<1000);}
 handHz(now){return this.handTimes.filter(t=>now-t<1000).length;}
}
