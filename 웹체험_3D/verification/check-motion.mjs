import assert from 'node:assert/strict';
import {ShakeMotion} from '../motion.mjs';
import {transitionVeil} from '../journey.mjs';
const m=new ShakeMotion();let t=0;
function run(seconds,position){for(let i=0;i<seconds*60;i++){t+=1/60;if(position){const [x,y]=position(t);m.sample(x,y,t);}m.update(1/60,t);}}
run(3,()=>[.5,.5]);assert.equal(m.energy,0,'stationary hand must not stir snow');
run(3,time=>[.5+Math.sin(time*2*Math.PI)*.001,.5]);assert.equal(m.burst,0,'tiny jitter must not trigger storm');assert.ok(m.energy<.01);
m.reset();run(2,time=>[.5+Math.sin(time*2*Math.PI*1.7)*.18,.5]);assert.ok(m.energy>.4,'real repeated waving should stir snow');assert.equal(m.cooldown,0,'two seconds must not enter city');run(2,time=>[.5+Math.sin(time*2*Math.PI*1.7)*.18,.5]);assert.equal(m.cooldown,0,'four seconds still leaves a brief music introduction');run(3,time=>[.5+Math.sin(time*2*Math.PI*1.7)*.18,.5]);assert.ok(m.cooldown>0,'sustained waving enters within seven seconds');const peak=m.energy;
run(8,null);assert.ok(m.energy<.01,'hand loss should settle the motion');assert.equal(m.burst,0);
m.sample(.1,.1,t+1);assert.equal(m.raw,0,'reacquiring hand must not register a shake');
m.sample(.9,.9,t+1.07);assert.equal(m.raw,0,'large tracking jump must be ignored');
m.reset();assert.equal(m.energy,0);assert.equal(m.last,null);
run(10,time=>[.5+Math.sin(time*2*Math.PI*.3)*.16,.5]);assert.equal(m.cooldown,0,'slow waving should lift snow without entering city');
m.reset();let fastTriggered=false;
for(let i=0;i<450;i++){t+=1/15;m.sample(.5+Math.sin(t*2*Math.PI*1.8)*.2,.5,t);m.update(1/15,t);if(m.burst>0)fastTriggered=true;}
assert.ok(fastTriggered,'fast broad waving sampled at camera rate must enter city');
m.reset();for(let i=0;i<10;i++){t+=1;m.sample(i%2?.8:.2,.5,t);m.update(.05,t);}assert.equal(m.cooldown,0,'separate reacquisitions must not accumulate a journey');
console.log(JSON.stringify({stationary:true,jitter:true,shakePeak:peak,storm:true,lossDecay:true,reacquire:true,reset:true,slowNoJourney:true,fastCameraRateJourney:true,noReacquireAccumulation:true}));
m.reset();run(2,time=>[.5+Math.sin(time*2*Math.PI*1.7)*.18,.5]);const enjoyed=m.playTime;m.release();run(5,null);assert.equal(m.playTime,enjoyed,'pauses preserve music play time without advancing it');
run(4,time=>[.5+Math.sin(time*2*Math.PI*1.7)*.18,.5]);assert.ok(m.burst>0,'resumed shaking can enter after the total enjoyment time');
m.reset();assert.equal(m.playTime,0);
for(const t of [.42,.44,.5,.55,.6,.67])assert.equal(transitionVeil(t),1,'all geometry switches must be fully covered');
assert.equal(transitionVeil(0),0);assert.equal(transitionVeil(1),0);
console.log('PASS: short enjoyment window, pauses/resume/reset, opaque transition cover');

for(const fps of [15,30,60])for(const direction of ['horizontal','vertical','circle']){
 const motion=new ShakeMotion();let enteredAt=null;
 for(let f=0;f<fps*8;f++){
  const time=f/fps,offset=.14*Math.sin(time*2*Math.PI*1.2);
  const x=direction==='vertical'?.5:.5+offset;
  const y=direction==='horizontal'?.5:direction==='vertical'?.5+offset:.5+.10*Math.cos(time*2*Math.PI*1.2);
  motion.sample(x,y,time);motion.update(1/fps,time);
  if(motion.burst>0){enteredAt=time;break;}
 }
 assert.ok(enteredAt>=5&&enteredAt<8,`${direction} moderate shaking at ${fps}fps should enter in 5–8s; got ${enteredAt}`);
 console.log('PASS moderate entry',{fps,direction,enteredAt});
}
