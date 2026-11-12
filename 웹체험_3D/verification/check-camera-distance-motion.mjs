import assert from 'node:assert/strict';
import {ShakeMotion} from '../motion.mjs';
import {cameraMotionScale} from '../audience.mjs';
function simulate(scale,compensated,amplitude=.18){
 const m=new ShakeMotion();m.followHand=compensated;m.cameraScale=cameraMotionScale(.22*scale);
 let entered=null,peak=0;
 for(let f=0;f<60*12;f++){
  const t=f/60;m.sample(.5+amplitude*scale*Math.sin(t*Math.PI*2*1.7),.5,t);m.update(1/60,t);
  peak=Math.max(peak,m.energy);if(m.burst>0&&entered===null)entered=t;
 }
 return {entered,peak};
}
for(const scale of [1,.65,.4]){
 const before=simulate(scale,false),after=simulate(scale,true);
 assert.ok(after.entered>4.5&&after.entered<7,'same physical shake must trigger across projected sizes');
 assert.ok(Math.abs(after.peak-simulate(1,true).peak)<.001,'compensated energy matches');
 assert.equal(simulate(scale,true,.001).entered,null,'small tracking jitter cannot trigger a journey');
 console.log({projectedScale:scale,before,after});
}
assert.equal(cameraMotionScale(.1,.1),2.3,'calibrated 2.3m gives 2.3x compensation');
assert.equal(cameraMotionScale(.001),3,'gain has an upper bound');
assert.equal(cameraMotionScale(0),1);
console.log('PASS: distance compensation, calibration, bounded gain and jitter rejection');
