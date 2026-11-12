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
