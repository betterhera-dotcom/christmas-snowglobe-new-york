import assert from 'node:assert/strict';
import {TrackingSchedule} from '../tracking-schedule.mjs';
import {Grip} from '../grip.mjs';
import {ShakeMotion} from '../motion.mjs';
import {HeldPose} from '../pose.mjs';

for(const fps of [30,60])for(const phase of ['globe','city']){
 const schedule=new TrackingSchedule(),count={body:0,face:0,hand:0};let lastBody=0,maxBodyGap=0,lastFace=0,maxFaceGap=0,lastHand=0,maxHandGap=0;
 for(let f=0;f<fps*3;f++){
  const now=f*1000/fps,kind=schedule.next(now,f/fps,{allowed:true,phase,faceReady:true});
  if(kind){count[kind]++;assert.equal(schedule.next(now+1,f/fps,{allowed:true,phase}),null);}
  if(kind==='face'){maxFaceGap=Math.max(maxFaceGap,now-lastFace);lastFace=now;}
  if(kind==='hand'){maxHandGap=Math.max(maxHandGap,now-lastHand);lastHand=now;}
  if(kind==='body'){maxBodyGap=Math.max(maxBodyGap,now-lastBody);lastBody=now;}
 }
 assert.ok(count.hand>=(phase==='city'?45:75)&&count.hand<=90);assert.ok(maxBodyGap<(phase==='globe'?1100:800),'700ms body refresh allows the intervening face/hand turns');
 assert.ok(count.face>=(phase==='city'?20:2),'face analysis runs from the globe and continues in the city');
 if(phase==='city'){assert.ok(maxFaceGap<=201,'city face targets update within 200ms on a responsive worker');assert.ok(maxHandGap<=101,'frequent face scans leave hands responsive');}
 console.log('PASS scheduling',{fps,phase,...count});
}
for(const options of [{allowed:false}]){
 const schedule=new TrackingSchedule();for(let f=0;f<120;f++)assert.notEqual(schedule.next(f*1000/60,f/60,options),'hand');
}
for(const interval of [220,600]){
 const schedule=new TrackingSchedule(),kinds=[];
 for(let now=0;now<6000;now+=interval)kinds.push(schedule.next(now,now/1000,{allowed:true,phase:'city',faceReady:true}));
 assert.ok(kinds.filter(k=>k==='hand').length>=4);assert.ok(kinds.includes('body'));
 for(let i=1;i<kinds.length;i++)if(kinds[i-1]!=='hand')assert.equal(kinds[i],'hand','expensive models cannot starve hands');
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

// Optional globe face scans cannot occupy the first two hand opportunities.
for(const interval of [33,100,220,600]){
 const schedule=new TrackingSchedule();let handsSinceFace=0,faces=0,bodies=0;
 for(let now=0;now<12000;now+=interval){
  const kind=schedule.next(now,now/1000,{allowed:true,phase:'globe',faceReady:true});
  if(kind==='hand')handsSinceFace++;
  if(kind==='body')bodies++;
  if(kind==='face'){assert.ok(handsSinceFace>=2,'globe gives at least two hand samples before each face scan');handsSinceFace=0;faces++;}
 }
 assert.ok(faces>0&&bodies>0,'face outlines and body ownership still update on slow workers');
}
// Measure the camera pose step response independently of camera inference latency.
for(const fps of [30,60]){
 const camera=new HeldPose();
 const input={keepHeld:true,followHand:true,lift:.4,x:.5,y:.5,inputSpeed:0};
 camera.update(1/fps,input);
 input.x=.7;let reached=null;
 for(let f=1;f<=fps;f++){
  camera.update(1/fps,input);
  assert.ok(camera.position[0]<=camera.target[0]+.001,'camera follow must not overshoot');
  if(reached===null&&camera.position[0]>=camera.target[0]*.9)reached=f/fps;
 }
 assert.ok(reached<=.2334,'camera follows 90% of a new hand target within 234ms');
 console.log('PASS camera follow response',{fps,reached});
}
