import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {MIN_PLAY_SECONDS} from '../journey.mjs';
import {SnowEntry} from '../snow-entry.mjs';
import {GlobeSnow} from '../snow3d.mjs';
import {HeldPose} from '../pose.mjs';
const entry=new SnowEntry();
for(let i=0;i<MIN_PLAY_SECONDS*60;i++)assert.equal(entry.update(1/60,{ready:false,fill:1}),false,'intro blocks even a full globe');
for(let i=0;i<600;i++)assert.equal(entry.update(1/60,{ready:true,fill:.99}),false,'gesture duration alone cannot enter');
for(let i=0;i<10;i++)assert.equal(entry.update(1/60,{ready:true,fill:1}),false,'one brief full-frame flash cannot enter');
entry.update(1/60,{ready:true,fill:.8});let transitions=0;
for(let i=0;i<60;i++)transitions+=Number(entry.update(1/60,{ready:true,fill:1}));
assert.equal(transitions,1,'full globe enters once');entry.reset();assert.equal(entry.entered,false);
const boxes=JSON.parse(readFileSync(new URL('../assets/3d/colliders.json',import.meta.url)));
function simulate(frequency){
 let seed=81;const snow=new GlobeSnow(1000,()=>((seed=(seed*1664525+1013904223)>>>0)/4294967296)),pose=new HeldPose(),gate=new SnowEntry();snow.boxes=boxes;snow.reset();
 assert.equal(snow.stats().globeFill,0,'resting roof snow is not a full globe');let enteredAt=null;
 for(let f=0;f<600;f++){
  const time=f/60;pose.update(1/60,{keepHeld:true,x:.5+.20*Math.sin(time*frequency),y:.5+.13*Math.sin(time*frequency*.75)});snow.update(1/60,time,pose.velocity);
  if(gate.update(1/60,{ready:time>=MIN_PLAY_SECONDS,fill:snow.stats().globeFill})){enteredAt=time;break;}
 }
 return enteredAt;
}
assert.equal(simulate(1.5),null,'a low, slow cloud does not fill the globe');
for(const frequency of [6,10]){const enteredAt=simulate(frequency);assert.ok(enteredAt>=MIN_PLAY_SECONDS&&enteredAt<10,'real strong particle distribution can enter');console.log({frequency,enteredAt});}
console.log('PASS: visible fill, intro, debounce, reset');
