// Process fresh frames only. Hands get the frequent slots; faces still refresh
// before the audience ownership guard expires. Never run both models per tick.
export class TrackingSchedule{
 constructor(){this.reset();}
 reset(){this.videoTime=-1;this.lastHand=-Infinity;this.lastFace=-Infinity;this.handTimes=[];}
 next(now,videoTime,{allowed,phase='globe',calibrating=false}){
  if(videoTime===this.videoTime)return null;
  const faceInterval=calibrating||!allowed||phase==='city'?100:200;
  let kind=null;
  if(now-this.lastFace>=faceInterval-1)kind='face';
  else if(allowed&&!calibrating&&now-this.lastHand>=1000/30-1)kind='hand';
  if(!kind)return null;
  this.videoTime=videoTime;
  if(kind==='face')this.lastFace=now;
  else this.lastHand=now;
  return kind;
 }
 recordHand(now){this.handTimes.push(now);this.handTimes=this.handTimes.filter(t=>now-t<1000);}
 handHz(now){return this.handTimes.filter(t=>now-t<1000).length;}
}
