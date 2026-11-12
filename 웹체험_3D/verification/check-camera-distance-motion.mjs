import assert from 'node:assert/strict';
import {ShakeMotion} from '../motion.mjs';
import {HeldPose} from '../pose.mjs';
import {cameraMotionScale} from '../audience.mjs';
function simulate(scale,compensated,amplitude=.18){
 const m=new ShakeMotion();m.followHand=compensated;m.cameraScale=cameraMotionScale(.35*scale);
 let entered=null,peak=0;
 for(let f=0;f<60*12;f++){
  const t=f/60;m.sample(.5+amplitude*scale*Math.sin(t*Math.PI*2*1.7),.5,t);m.update(1/60,t);
  peak=Math.max(peak,m.energy);if(m.burst>0&&entered===null)entered=t;
 }
 return {entered,peak};
}
for(const scale of [2,1,.65,.4,.15,.08]){
 const before=simulate(scale,false),after=simulate(scale,true);
 assert.ok(after.entered>4.5&&after.entered<7,'same physical shake must trigger across projected sizes');
 assert.ok(Math.abs(after.peak-simulate(1,true).peak)<.001,'compensated energy matches');
 assert.equal(simulate(scale,true,.001).entered,null,'small tracking jitter cannot trigger a journey');
 console.log({projectedScale:scale,before,after});
}
assert.ok(Math.abs(cameraMotionScale(.035)-10)<1e-10,'small detected bodies are not limited to 3x');
assert.equal(cameraMotionScale(0),1);
// Verify the actual globe travel and velocity passed to snow, not only the meter.
function poseTrace(scale){
 const motion=new ShakeMotion(),pose=new HeldPose();motion.followHand=true;motion.keepHeld=true;motion.cameraScale=cameraMotionScale(.35*scale);const result=[];
 for(let f=0;f<360;f++){
  const t=f/60;motion.sample(.5+.18*scale*Math.sin(t*8),.5+.08*scale*Math.sin(t*6),t);motion.update(1/60,t);pose.update(1/60,motion);
  result.push([...pose.position,...pose.velocity,...pose.rotation]);
 }
 return result;
}
const reference=poseTrace(1);
for(const scale of [2,.65,.4,.15,.08]){
 const trace=poseTrace(scale);
 for(let f=0;f<trace.length;f++)for(let i=0;i<9;i++)assert.ok(Math.abs(trace[f][i]-reference[f][i])<1e-9,'same physical gesture produces the same globe movement and snow impulse');
}
console.log('PASS: near/far gesture energy, visible globe movement, snow velocity and jitter rejection');
