import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {GlobeSnow} from '../snow3d.mjs';
function random(){let seed=13;return ()=>((seed=(seed*1664525+1013904223)>>>0)/4294967296);}
for(const fps of [30,60]){
 const snow=new GlobeSnow(350,random()),dt=1/fps;
 for(let i=0;i<fps*5;i++)snow.update(dt,i*dt,[0,0,0]);
 assert.equal(snow.stats().airborne,0,'resting globe must stay still');
 let lifted=0;
 for(let i=0;i<fps*8;i++){
  const t=i*dt;snow.update(dt,t,[2*Math.cos(t*9),1.3*Math.cos(t*7),.3*Math.sin(t*6)]);
  lifted=Math.max(lifted,snow.stats().airborne);
  for(let k=0;k<snow.p.length;k+=3){
   assert.ok(Number.isFinite(snow.p[k]+snow.p[k+1]+snow.p[k+2]));
   assert.ok(Math.hypot(snow.p[k],snow.p[k+1]-1.78,snow.p[k+2])<=1.481,'inside glass');
   assert.ok(snow.p[k+1]>=.8749,'above floor');
  }
 }
 assert.ok(lifted>250,'shaking suspends settled snow');
 const positions=snow.p.slice();for(let i=0;i<fps;i++)snow.update(dt,8+i*dt,[0,0,0]);
 assert.ok(snow.p.some((v,i)=>Math.abs(v-positions[i])>.03),'liquid continues to move briefly after shaking');
 for(let i=0;i<fps*80;i++)snow.update(dt,9+i*dt,[0,0,0]);
 assert.equal(snow.stats().airborne,0,'snow eventually settles');
 snow.reset();assert.equal(snow.stats().airborne,0);assert.deepEqual(snow.spin,[0,0,0]);
}
const neighbours=new GlobeSnow(2,random());neighbours.p.set([.2,1.6,.2,.201,1.601,.201]);neighbours.depth.fill(.5);
neighbours.update(1/60,0,[1,.4,.2]);
assert.ok(Math.hypot(...[0,1,2].map(i=>neighbours.v[i]-neighbours.v[i+3]))<.005,'nearby flakes share the same current');
console.log('PASS: liquid currents, nearby particle coherence, rest, residual flow, settling, glass/floor bounds at 30/60 fps');
// Gravity alone would pass a position-change test: check horizontal afterflow
// separately, and compare the same four-second shake at different frame rates.
const profiles=[];
for(const fps of [30,60,120]){
 const snow=new GlobeSnow(350,random());
 for(let f=0;f<fps*4;f++){const t=f/fps;snow.update(1/fps,t,[1.8*Math.cos(t*8),1.1*Math.sin(t*6),.35*Math.sin(t*7)]);}
 const means=[];
 for(let f=0;f<fps*12;f++){
  snow.update(1/fps,4+f/fps,[0,0,0]);
  if(f===fps||f===fps*6){
   let horizontal=0,height=0;for(let k=0;k<snow.p.length;k+=3){horizontal+=Math.hypot(snow.v[k],snow.v[k+2]);height+=snow.p[k+1];}
   means.push({horizontal:horizontal/snow.count,height:height/snow.count});
  }
 }
 assert.ok(means[0].horizontal>.05,'water still moves sideways one second after release');
 assert.ok(means[1].horizontal<means[0].horizontal*.4,'residual water movement decays');
 profiles.push(means);
}
for(let i=1;i<profiles.length;i++)for(let t=0;t<2;t++)assert.ok(Math.abs(profiles[0][t].height-profiles[i][t].height)<.12,'settling does not depend on display refresh rate');
const sizes=new GlobeSnow(2,random());sizes.depth.set([0,1]);sizes.angle.fill(0);sizes.p.set([-.1,2.5,0,.1,2.5,0]);
for(let f=0;f<60*8;f++)sizes.update(1/60,f/60,[0,0,0]);
assert.ok(sizes.p[1]-sizes.p[4]>.4,'small flakes remain suspended longer than large flakes');
for(let f=0;f<60*80;f++)sizes.update(1/60,8+f/60,[0,0,0]);
const settledAngles=sizes.angle.slice();for(let f=0;f<60;f++)sizes.update(1/60,88+f/60,[0,0,0]);
assert.deepEqual(sizes.angle,settledAngles,'settled flakes stop tumbling');
const stableSizes=sizes.depth.slice();sizes.reset();assert.deepEqual(sizes.depth,stableSizes,'reset keeps rendered size and settling speed aligned');
// A roof intercepts falling snow, which must stay on it until disturbed again.
const roof=new GlobeSnow(1,random());roof.boxes=[{min:[-.3,.875,-.3],max:[.3,1.4,.3]}];roof.p.set([0,1.6,0]);
for(let f=0;f<60*20;f++)roof.update(1/60,f/60,[0,0,0]);
assert.ok(roof.p[1]>=1.4&&roof.p[1]<1.41,'flakes settle on a building roof');
console.log('PASS: lateral afterflow decay, 30/60/120 fps agreement, size-dependent settling, tumbling rest, roof contact');
const glb=readFileSync(new URL('../assets/3d/liquid.glb',import.meta.url));
assert.equal(glb.toString('utf8',0,4),'glTF');assert.equal(glb.readUInt32LE(8),glb.length);
const asset=JSON.parse(glb.subarray(20,20+glb.readUInt32LE(12))),optics=asset.materials[0].extensions;
assert.ok(Math.abs(optics.KHR_materials_ior.ior-1.333)<.001);
assert.ok(optics.KHR_materials_volume.thicknessFactor>.1);
assert.ok(optics.KHR_materials_volume.attenuationDistance>30);
assert.equal(optics.KHR_materials_transmission.transmissionFactor,1);
console.log('PASS: Blender GLB water IOR, optical thickness, transmission and attenuation preserved');
