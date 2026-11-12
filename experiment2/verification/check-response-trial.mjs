import assert from 'node:assert/strict';
import {HeldPose} from '../pose.mjs';
import {TrackingSchedule} from '../tracking-schedule.mjs';
for(const fps of [30,60,120]){
 const times=[];
 for(const responsive of [false,true]){
  const p=new HeldPose({responsive,expanded:false}),m={keepHeld:true,followHand:true,x:.5,y:.5,lift:.4,inputSpeed:0};
  p.update(1/fps,m);m.x=.75;let time=null;
  for(let f=1;f<=fps;f++){p.update(1/fps,m);assert.ok(p.position[0]<=1+1e-10);if(time===null&&p.position[0]>=.9)time=f/fps;}
  times.push(time);assert.ok(p.position.every(Number.isFinite));
 }
 assert.ok(times[1]<=.1&&times[1]<times[0]);console.log('step90 ms',fps,times.map(x=>Math.round(x*1000)));
}
const expanded=new HeldPose(),old=new HeldPose({expanded:false});
const m={keepHeld:true,followHand:true,x:.5,y:.5,lift:.4};expanded.update(1/60,m);old.update(1/60,m);
m.x=.9;m.y=.1;for(let f=0;f<120;f++){expanded.update(1/60,m);old.update(1/60,m);}
assert.ok(expanded.position[0]>old.position[0]+.3);assert.ok(expanded.position[1]>old.position[1]+.9);
const before=expanded.target[1];m.lift=.9;expanded.update(1/60,m);assert.equal(expanded.target[1],before,'shoulder height changes cannot displace a stationary hand');
for(const fps of [30,60])for(const delay of [35,70]){
 const counts=[];
 for(const receivingPriority of [false,true]){
  const s=new TrackingSchedule({receivingPriority}),c={hand:0,face:0,body:0};let busyUntil=0;
  for(let f=0;f<fps*10;f++){const now=f*1000/fps;if(now<busyUntil)continue;const k=s.next(now,f/fps,{allowed:true,phase:'city',faceReady:true,handTracked:true,receiving:true});if(k){c[k]++;busyUntil=now+delay;}}
  counts.push(c);
 }
 assert.ok(counts[1].hand>counts[0].hand);assert.ok(counts[1].face>0&&counts[1].face<counts[0].face);assert.ok(counts[1].body>=7);console.log('receiving schedule',fps,delay,counts);
}
// Pointer path must remain identical to the baseline, including release.
const a=new HeldPose(),b=new HeldPose({responsive:false,expanded:false});
for(let f=0;f<600;f++){const m={keepHeld:f<400,followHand:false,x:.5+.2*Math.sin(f/10),y:.5+.1*Math.cos(f/8)};a.update(1/60,m);b.update(1/60,m);assert.deepEqual(a.position,b.position);assert.deepEqual(a.velocity,b.velocity);}
console.log('PASS response trial: faster step, extended range, stable anchor, receiving priority, unchanged pointer');
