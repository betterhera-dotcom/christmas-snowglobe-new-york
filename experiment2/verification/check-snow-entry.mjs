import assert from 'node:assert/strict';
import {SnowEntry} from '../snow-entry.mjs';
import {ShakeMotion} from '../motion.mjs';
const entry=new SnowEntry();
for(let i=0;i<600;i++)assert.equal(entry.update(1/60,{ready:false,strong:true,fill:1}),false,'early shaking cannot enter');
for(let i=0;i<600;i++)assert.equal(entry.update(1/60,{ready:true,strong:false,fill:1}),false,'old full snow and elapsed time cannot enter');
for(let i=0;i<6;i++)assert.equal(entry.update(1/60,{ready:true,strong:true}),false,'one brief tracking spike cannot enter');
for(let i=0;i<120;i++)entry.update(1/60,{ready:true,strong:false});
assert.equal(entry.strongTime,0);
for(let i=0;i<24;i++)assert.equal(entry.update(1/60,{ready:true,strong:true}),false,'a short spike is not enough');
let transitions=0;for(let i=0;i<180;i++)transitions+=Number(entry.update(1/60,{ready:true,strong:true}));
assert.equal(transitions,1);entry.reset();assert.equal(entry.entered,false);
for(const frequency of [1.5,10]){
 const motion=new ShakeMotion(),gate=new SnowEntry();motion.keepHeld=true;let enteredAt=null;
 for(let f=0;f<600;f++){
  const time=f/60;motion.sample(.5+.18*Math.sin(time*frequency),.5,time);motion.update(1/60,time);
  if(gate.update(1/60,{ready:time>=3,strong:motion.raw>.55&&motion.entrySpan>.12})){enteredAt=time;break;}
 }
 if(frequency===1.5)assert.equal(enteredAt,null,'gentle shaking waits');
 else assert.ok(enteredAt>3.6&&enteredAt<7,'sustained strong shaking after prompt enters');
}
console.log('PASS: no automatic entry, no credit for early shakes, spike rejection, strong gesture and reset');

// Actual camera cadence: a deliberate moderate wave works even at 6Hz.
for(const hz of [6,9,15,30]){
 const motion=new ShakeMotion(),gate=new SnowEntry();motion.followHand=true;let nextSample=0,enteredAt=null;
 for(let f=0;f<600;f++){
  const time=f/60;
  if(time>=nextSample){motion.sample(.5+.18*Math.sin(time*6),.5,time);nextSample+=1/hz;}
  motion.update(1/60,time);
  if(gate.update(1/60,{ready:time>=3,strong:motion.raw>.35&&motion.entrySpan>.10&&time-(motion.last?.receivedAt??-Infinity)<.35})){enteredAt=time;break;}
 }
 assert.ok(enteredAt>3.6&&enteredAt<6,`moderate wave at ${hz}Hz enters in under 3 seconds after invitation`);
}
for(const kind of ['still','jitter','jump']){
 const motion=new ShakeMotion(),gate=new SnowEntry();motion.followHand=true;
 for(let f=0;f<600;f++){
  const t=f/60,x=kind==='still'?.5:kind==='jitter'?.5+.015*Math.sin(t*30):(f%2?.9:.1);
  motion.sample(x,.5,t);motion.update(1/60,t);
  assert.equal(gate.update(1/60,{ready:true,strong:motion.raw>.35&&motion.entrySpan>.10}),false,`${kind} must not enter`);
 }
}
console.log('PASS: 6/9/15/30Hz deliberate waves enter; still hands, jitter and tracking jumps do not');
