import assert from 'node:assert/strict';
import {HeadLook} from '../head-look.mjs';
const h=new HeadLook();
function face(angle,shift=0){const f=Array.from({length:478},()=>({x:0,y:0,z:0}));f[33]={x:.4+shift,y:.4,z:-Math.sin(angle)*.1};f[263]={x:.4+shift+Math.cos(angle)*.2,y:.4,z:Math.sin(angle)*.1};return f;}
assert.equal(h.update(face(0)),.5);
assert.ok(h.update(face(.3))>.7,'the second valid frame already responds, without a 12-frame wait');
assert.equal(h.update(face(0,.1)),.5,'translation must not pan');assert.ok(h.update(face(.3))>.7);assert.ok(h.update(face(-.3))<.3);assert.equal(h.update(face(.02)),.5);assert.equal(h.update(null),.5);h.reset();assert.equal(h.samples,0);
console.log('PASS: front calibration, left/right yaw, dead zone, translation invariance, lost face and reset');

function pitched(angle){const f=face(0);f[10]={x:.5,y:.2,z:-Math.sin(angle)*.15};f[152]={x:.5,y:.2+Math.cos(angle)*.3,z:Math.sin(angle)*.15};return f;}
h.reset();for(let i=0;i<12;i++)h.update(pitched(0));h.update(pitched(.3));assert.ok(h.vertical>.8);h.update(pitched(-.3));assert.ok(h.vertical<.2);h.update(null);assert.equal(h.vertical,.5);console.log('PASS: vertical head tilt, neutral calibration and face loss');

h.reset();assert.equal(h.update([{x:NaN}]),.5);assert.equal(h.samples,0,'invalid face must not establish neutral');
