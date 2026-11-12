import assert from 'node:assert/strict';
import {SnowEntry} from '../snow-entry.mjs';
import {ShakeMotion} from '../motion.mjs';
const entry=new SnowEntry();
for(let i=0;i<600;i++)assert.equal(entry.update(1/60,{ready:false,strong:true,fill:1}),false,'early shaking cannot enter');
for(let i=0;i<600;i++)assert.equal(entry.update(1/60,{ready:true,strong:false,fill:1}),false,'old full snow and elapsed time cannot enter');
for(let i=0;i<6;i++)assert.equal(entry.update(1/60,{ready:true,strong:true}),false,'one brief tracking spike cannot enter');
for(let i=0;i<120;i++)entry.update(1/60,{ready:true,strong:false});
assert.equal(entry.strongTime,0);
for(let i=0;i<60;i++)assert.equal(entry.update(1/60,{ready:true,strong:true}),false,'one second of shaking is not enough');
let transitions=0;for(let i=0;i<180;i++)transitions+=Number(entry.update(1/60,{ready:true,strong:true}));
assert.equal(transitions,1);entry.reset();assert.equal(entry.entered,false);
for(const frequency of [1.5,10]){
 const motion=new ShakeMotion(),gate=new SnowEntry();motion.keepHeld=true;let enteredAt=null;
 for(let f=0;f<600;f++){
  const time=f/60;motion.sample(.5+.18*Math.sin(time*frequency),.5,time);motion.update(1/60,time);
  if(gate.update(1/60,{ready:time>=3,strong:motion.raw>.55&&motion.entrySpan>.12})){enteredAt=time;break;}
 }
 if(frequency===1.5)assert.equal(enteredAt,null,'gentle shaking waits');
 else assert.ok(enteredAt>5&&enteredAt<10,'sustained strong shaking after prompt enters');
}
console.log('PASS: no automatic entry, no credit for early shakes, spike rejection, strong gesture and reset');
