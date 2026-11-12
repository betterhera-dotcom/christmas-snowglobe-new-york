import assert from 'node:assert/strict';
import fs from 'node:fs';
import {GlobeSnow} from '../snow3d.mjs';
const boxes=JSON.parse(fs.readFileSync(new URL('../assets/3d/colliders.json',import.meta.url)));
function create(count,options){const s=new GlobeSnow(count,Math.random,options);s.boxes=boxes;s.surface={size:128,min:-1.5,max:1.5,heights:new Float32Array(128*128).fill(.875)};s.reset();return s;}
for(const dt of [1/60,1/30,.05]){
 const results=[];
 for(const [name,count,options]of [['original',12000,{}],['lite',3000,{maxSubsteps:2}]]){
  const snow=create(count,options),samples=[];
  for(let i=0;i<100;i++){const begin=performance.now();snow.update(dt,i*dt,[Math.sin(i*.3),.3,0]);if(i>20)samples.push(performance.now()-begin);}
  assert.ok(snow.p.every(Number.isFinite));assert.ok(snow.v.every(Number.isFinite));assert.ok(snow.stats().globeFill>=0&&snow.stats().globeFill<=1);
  samples.sort((a,b)=>a-b);results.push({name,medianMs:+samples[Math.floor(samples.length/2)].toFixed(2),p95Ms:+samples[Math.floor(samples.length*.95)].toFixed(2)});
 }
 console.log(JSON.stringify({dt,...Object.fromEntries(results.map(r=>[r.name,r]))}));
}
console.log('PASS: bounded lite physics stays finite at 60/30/20fps; timings are local CPU-only measurements');
