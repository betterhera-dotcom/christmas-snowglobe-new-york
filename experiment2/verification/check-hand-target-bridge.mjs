import assert from 'node:assert/strict';
import {HandTargetBridge} from '../hand-target-bridge.mjs';
const b=new HandTargetBridge();b.update([0,0,0],{t:0,receivedAt:0},1/60);
const packet={t:.1,receivedAt:.13};let previous=0;
for(let i=0;i<6;i++){const v=b.update([1,0,0],packet,1/60);assert.ok(v[0]>=previous&&v[0]<=1);if(i===0)assert.ok(v[0]<.3,'a delayed result cannot teleport the display');previous=v[0];}
assert.equal(previous,1,'target reached within 100ms');
for(let i=0;i<120;i++)assert.equal(b.update([1,0,0],packet,1/60)[0],1,'no invented movement on absent results');
b.reset();assert.deepEqual(b.update([-1,.3,0],{t:2,receivedAt:2.2},1/60),[-1,.3,0],'new viewer/session never blends an old hand');
// Compare abrupt frame-to-frame changes under a 10Hz staircase input.
function trace(bridge){let x=0,v=0,peakAcceleration=0;const b=new HandTargetBridge();
 for(let f=0;f<120;f++){const sample=Math.floor(f/6),target=[sample*.05,0,0],packet={t:sample*.1,receivedAt:sample*.1};const aim=bridge?b.update(target,packet,1/60):target;const next=x+(aim[0]-x)*(1-Math.exp(-40/60)),nextV=(next-x)*60;if(f>12)peakAcceleration=Math.max(peakAcceleration,Math.abs(nextV-v)*60);x=next;v=nextV;}return peakAcceleration;}
const baseline=trace(false),smoothed=trace(true);assert.ok(smoothed<baseline*.5);console.log('PASS bounded sample bridge, no extrapolation, session reset, peak acceleration',{baseline,smoothed});
