import assert from 'node:assert/strict';
import {HandPickup} from '../hand-pickup.mjs';
import {ShakeMotion} from '../motion.mjs';
import {SnowCollection} from '../snow-wish.mjs';
import {AudienceGate} from '../audience.mjs';
import {body,hand} from './body-fixture.mjs';
function gesture(closed,angle=0){const h=Array.from({length:21},()=>({x:0,y:0,z:0}));for(const [i,b] of [5,9,13,17].entries()){h[b]={x:(i-1.5)*.2,y:-1,z:0};h[b+1]={x:(i-1.5)*.2,y:-1.5,z:0};h[b+3]={x:(i-1.5)*.2+(closed?.35:.12),y:closed?-1.6:-2,z:closed?.1:0};}h[4]={x:-.15,y:-.75,z:0};return h.map(p=>({x:p.x*Math.cos(angle)-p.y*Math.sin(angle),y:p.x*Math.sin(angle)+p.y*Math.cos(angle),z:p.z}));}
const gate=new AudienceGate(),pickup=new HandPickup(),motion=new ShakeMotion();motion.followHand=true;
gate.update([body()],0);
let held=false;
for(const t of [.4,1.1]){assert.equal(gate.handIndex([hand(.38)],t),0);held=pickup.update(gesture(true),t,true);}
assert.equal(held,true,'two slow but valid observations can pick up the globe');
motion.sample(.4,.5,.4,1);motion.sample(.65,.5,1.1,1.7);motion.update(1/60,1.72);
assert.ok(motion.inputSpeed>0&&motion.raw>0,'slow inference has fresh input on arrival; speed uses capture intervals');
motion.update(.05,2.1);assert.equal(motion.raw,0,'old sample stops injecting force after arrival grace');
gate.update([],2.2);assert.equal(gate.handIndex([hand(.38)],2.2),-1);
motion.release();motion.sample(.2,.5,4,4.6);assert.equal(motion.inputSpeed,0,'reacquisition does not create a jump');
console.log('PASS: slow body/hand pipeline picks up and moves, then expires without invented force');

const snow=new SnowCollection();snow.maxGap=1.5;for(let t=0;t<4.3;t+=.7)snow.update(true,t);assert.equal(snow.progress,1,'consecutive slow palm samples can finish the city');snow.reset();snow.update(true,0);snow.update(true,2);assert.equal(snow.progress,0,'unobserved long gaps add no snow');snow.update(false,2.1);snow.update(true,2.7);assert.equal(snow.progress,0,'explicit hand loss breaks accumulation');
