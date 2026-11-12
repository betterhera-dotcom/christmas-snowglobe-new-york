import assert from 'node:assert/strict';
import {TrackingSchedule} from '../tracking-schedule.mjs';
import {Grip} from '../grip.mjs';
import {ShakeMotion} from '../motion.mjs';
import {HeldPose} from '../pose.mjs';

for(const fps of [30,60])for(const phase of ['globe','city']){
 const schedule=new TrackingSchedule(),count={face:0,hand:0};let lastFace=0,maxFaceGap=0;
 for(let f=0;f<fps*3;f++){
  const now=f*1000/fps,kind=schedule.next(now,f/fps,{allowed:true,phase});
  if(kind){count[kind]++;assert.equal(schedule.next(now+1,f/fps,{allowed:true,phase}),null,'never process a stale video frame');}
  if(kind==='face'){maxFaceGap=Math.max(maxFaceGap,now-lastFace);lastFace=now;}
 }
 assert.ok(count.hand>=3*(phase==='city'?20:25),'hands get frequent updates even on 30 fps cameras');
 assert.ok(count.hand<=90,'hand inference capped at 30 per second');
 assert.ok(maxFaceGap<250,'face ownership refresh stays inside 350ms safety timeout');
 console.log('PASS scheduling', {fps,phase,handHz:count.hand/3,faceHz:count.face/3});
}
for(const options of [{allowed:false},{allowed:true,calibrating:true}]){
 const schedule=new TrackingSchedule();for(let f=0;f<120;f++)assert.notEqual(schedule.next(f*1000/60,f/60,options),'hand','no hand control without a valid viewer or while calibrating');
}
function cHand(x,y){
 const h=Array.from({length:21},()=>({x:0,y:0,z:0}));
 for(const [i,b] of [5,9,13,17].entries()){h[b]={x:(i-1.5)*.2,y:-1,z:0};h[b+1]={x:(i-1.5)*.2,y:-1.5,z:0};h[b+3]={x:(i-1.5)*.2+.35,y:-1.6,z:.1};}
 h[4]={x:-.15,y:-.75,z:0};return h.map(p=>({x:x+p.x*.08,y:y+p.y*.08,z:p.z*.08}));
}
const grip=new Grip(),motion=new ShakeMotion(),fast=new HeldPose(),old=new HeldPose();
let fastError=0,oldError=0,maxSpeed=0;
for(let f=0;f<600;f++){
 const t=f/60,x=.5+.18*Math.sin(t*10),y=.5+.08*Math.sin(t*8);
 if(f%2===0){const held=grip.update(f%62===0?null:cHand(x,y),t);motion.keepHeld=held;if(held)motion.sample(x,y,t);if(t>1)assert.equal(held,true,'fast moving C grip and a missed frame keep the globe held');}
 motion.update(1/60,t);motion.followHand=true;fast.update(1/60,motion);old.update(1/60,{...motion,followHand:false});
 maxSpeed=Math.max(maxSpeed,motion.inputSpeed);
 if(t>1){fastError+=Math.abs(fast.position[0]-fast.target[0]);oldError+=Math.abs(old.position[0]-old.target[0]);}
 assert.ok(fast.position.every(Number.isFinite),'fast following stays stable');
}
assert.ok(maxSpeed>1,'speed comes from translated hand positions');
assert.ok(fastError<oldError*.7,'camera globe follows fast movement with substantially less lag');
const last=motion.last;motion.sample(.99,.99,last.t+.02);assert.equal(motion.inputSpeed,0,'a tracking jump clears speed instead of launching the globe');
motion.release();assert.equal(motion.inputSpeed,0,'release clears speed');
console.log('PASS: fast C grip, brief loss, measured movement speed and reduced following lag',{errorRatio:fastError/oldError,maxSpeed});
