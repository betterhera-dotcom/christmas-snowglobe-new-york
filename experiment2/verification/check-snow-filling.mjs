import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {GlobeSnow} from '../snow3d.mjs';
import {HeldPose} from '../pose.mjs';
const boxes=JSON.parse(readFileSync(new URL('../assets/3d/colliders.json',import.meta.url)));
function shake(strength){
 let seed=13;const snow=new GlobeSnow(1400,()=>((seed=(seed*1664525+1013904223)>>>0)/4294967296)),pose=new HeldPose();snow.boxes=boxes;
 for(let f=0;f<480;f++){const t=f/60;pose.update(1/60,{keepHeld:true,x:.5+strength*.22*Math.sin(t*8),y:.5+strength*.15*Math.sin(t*6)});snow.update(1/60,t,pose.velocity);}
 return snow;
}
const gentle=shake(.15),strong=shake(1),octants=Array(8).fill(0);
for(let k=0;k<strong.p.length;k+=3)if(strong.p[k+1]>.98)octants[(strong.p[k]>0?1:0)+(strong.p[k+1]>1.8?2:0)+(strong.p[k+2]>0?4:0)]++;
assert.ok(strong.stats().upper>gentle.stats().upper+strong.count*.3,'strong repeated shaking fills the upper volume much more than gentle motion');
assert.ok(octants.every(n=>n>strong.count*.04),'snow occupies every front/back, left/right, upper/lower region rather than a narrow ribbon');
assert.ok(strong.stats().airborne>strong.count*.95,'strong shaking lifts almost all flakes');
const count=strong.p.length;
for(let f=0;f<60*80;f++)strong.update(1/60,8+f/60,[0,0,0]);
assert.equal(strong.p.length,count,'snow is redistributed, not spawned or teleported');
assert.equal(strong.stats().airborne,0,'full globe still settles after release');
console.log('PASS: strong/gentle contrast, full-volume distribution, conserved particles, complete settling',octants);

// Same travel distance, different tempo: speed must matter, not just amplitude.
function tempo(frequency){
 let seed=81;const s=new GlobeSnow(1000,()=>((seed=(seed*1664525+1013904223)>>>0)/4294967296)),p=new HeldPose();s.boxes=boxes;s.reset();
 const start=s.p.slice();let upper=0;
 for(let f=0;f<600;f++){const t=f/60;p.update(1/60,{keepHeld:true,x:.5+.20*Math.sin(t*frequency),y:.5+.13*Math.sin(t*frequency*.75)});s.update(1/60,t,p.velocity);if(f>=300)upper+=s.stats().upper;}
 return {upper:upper/300,start,s};
}
const slow=tempo(1.5),fast=tempo(10);
assert.ok(fast.upper>slow.upper+250,'fast motion fills the top much more than slow motion at the same distance');
assert.deepEqual(slow.start,fast.start,'both speeds start with the same deposit');
let roofSnow=0;
for(let k=0;k<slow.start.length;k+=3)if(slow.start[k+1]>1.4)roofSnow++;
assert.ok(roofSnow>250,'a substantial part of the initial snow coats buildings');
console.log('PASS: equal-distance slow/fast comparison and initial roof coverage',{slowUpper:slow.upper,fastUpper:fast.upper,roofSnow});
