import assert from 'node:assert/strict';
import {HandPickup} from '../hand-pickup.mjs';
import {HeldPose} from '../pose.mjs';
import {ShakeMotion} from '../motion.mjs';
function gesture(closed,angle=0){const h=Array.from({length:21},()=>({x:0,y:0,z:0}));for(const [i,b] of [5,9,13,17].entries()){h[b]={x:(i-1.5)*.2,y:-1,z:0};h[b+1]={x:(i-1.5)*.2,y:-1.5,z:0};h[b+3]={x:(i-1.5)*.2+(closed?.35:.12),y:closed?-1.6:-2,z:closed?.1:0};}h[4]={x:-.15,y:-.75,z:0};return h.map(p=>({x:p.x*Math.cos(angle)-p.y*Math.sin(angle),y:p.x*Math.sin(angle)+p.y*Math.cos(angle),z:p.z}));}
const grip=new HandPickup();
for(let t=0;t<1;t+=.1)assert.equal(grip.update(gesture(false),t,true),false,'open palm must not acquire');
assert.equal(grip.update(gesture(true),1,true),true,'C grip starts without calibration wait');
for(let t=1.1;t<2.2;t+=.1)grip.update(gesture(false),t,true);
assert.equal(grip.closed,false,'deliberately opening releases');
const motion=new ShakeMotion(),pose=new HeldPose();motion.followHand=true;motion.cameraScale=1;motion.keepHeld=true;
for(let i=0;i<60;i++){motion.sample(.5,.5,i/60);motion.update(1/60,i/60);pose.update(1/60,motion);}
const initial=pose.position[1];
for(let i=60;i<120;i++){motion.sample(.5,.35,i/60);motion.update(1/60,i/60);pose.update(1/60,motion);}
assert.ok(pose.position[1]>initial+.3,'raising the hand raises the globe');
function energy(amplitude){const m=new ShakeMotion();m.followHand=true;for(let i=0;i<180;i++){const t=i/60;m.sample(.5+amplitude*Math.sin(t*8),.5,t);m.update(1/60,t);}return m.energy;}
assert.ok(energy(.15)>energy(.02)*2,'strong movement produces stronger response');
console.log('PASS: open palm ignored, immediate C grip, open release, hand height and shake strength');
