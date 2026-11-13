import assert from 'node:assert/strict';
import {HandPickup} from '../hand-pickup.mjs';
import {HeldPose} from '../pose.mjs';
import {ShakeMotion} from '../motion.mjs';
function gesture(closed,angle=0){const h=Array.from({length:21},()=>({x:0,y:0,z:0}));for(const [i,b] of [5,9,13,17].entries()){h[b]={x:(i-1.5)*.2,y:-1,z:0};h[b+1]={x:(i-1.5)*.2,y:-1.5,z:0};h[b+3]={x:(i-1.5)*.2+(closed?.35:.12),y:closed?-1.6:-2,z:closed?.1:0};}h[4]={x:-.15,y:-.75,z:0};return h.map(p=>({x:p.x*Math.cos(angle)-p.y*Math.sin(angle),y:p.x*Math.sin(angle)+p.y*Math.cos(angle),z:p.z}));}
const grip=new HandPickup();
for(let t=0;t<1;t+=.1)assert.equal(grip.update(gesture(false),t,true),false,'open palm must not acquire');
assert.equal(grip.ready,true,'open palm prepares pickup');
assert.equal(grip.update(gesture(true),1),false,'one curled sample must not acquire');
assert.equal(grip.update(gesture(true),1.1),true,'curl after palm acquires');
for(let t=1.2;t<2.4;t+=.1)grip.update(gesture(false),t,true);
assert.equal(grip.closed,false,'deliberately opening releases');
const motion=new ShakeMotion(),pose=new HeldPose();motion.followHand=true;motion.cameraScale=1;motion.keepHeld=true;
for(let i=0;i<60;i++){motion.sample(.5,.5,i/60);motion.update(1/60,i/60);pose.update(1/60,motion);}
const initial=pose.position[1];
for(let i=60;i<120;i++){motion.sample(.5,.35,i/60);motion.update(1/60,i/60);pose.update(1/60,motion);}
assert.ok(pose.position[1]>initial+.3,'raising the hand raises the globe');
function energy(amplitude){const m=new ShakeMotion();m.followHand=true;for(let i=0;i<180;i++){const t=i/60;m.sample(.5+amplitude*Math.sin(t*8),.5,t);m.update(1/60,t);}return m.energy;}
assert.ok(energy(.15)>energy(.02)*2,'strong movement produces stronger response');
console.log('PASS: open palm preparation, curl pickup, open release, hand height and shake strength');

const {handLift}=await import('../hand-height.mjs');
for(const size of [.2,.08]){const body={size,y:.3};assert.equal(handLift(.3+size,body),0,'low hand cannot lift');assert.ok(handLift(.3,body)>.8,'raised hand lifts at either distance');}

// The new gesture must be a transition, not a static curled hand or tracking jitter.
for(const mirror of [-1,1])for(const scale of [.05,1,3])for(const angle of [0,.7,2]){
 const transform=h=>h.map(p=>({x:p.x*mirror*scale,y:p.y*scale,z:p.z*scale}));
 const open=transform(gesture(false,angle)),closed=transform(gesture(true,angle));
 const gentle=open.map((p,i)=>({x:p.x+(closed[i].x-p.x)*.55,y:p.y+(closed[i].y-p.y)*.55,z:p.z+(closed[i].z-p.z)*.55}));
 const g=new HandPickup();
 assert.equal(g.update(closed,0),false,'curl alone cannot acquire');
 assert.equal(g.update(closed,.2),false,'curl held without open palm cannot acquire');
 assert.equal(g.update(open,.3),false);assert.equal(g.ready,true);
 const jitter=open.map(p=>({...p,x:p.x+scale*.002}));
 for(const t of [.4,.5,.6])assert.equal(g.update(jitter,t),false,'small jitter cannot acquire');
 assert.equal(g.update(gentle,.7),false);assert.equal(g.update(gentle,.8),true,'gentle curl works for either hand, size and rotation');
 assert.equal(g.update(null,1),true,'brief loss holds');
 assert.equal(g.update(null,3.4),false,'long loss releases');assert.equal(g.ready,false);
 assert.equal(g.update(gentle,3.5),false,'loss requires a new open palm');
 g.reset();assert.equal(g.ready,false);assert.equal(g.closed,false);
}
console.log('PASS: palm-first transition, gentle curl, both hands, scale/rotation, jitter, tracking loss and reset');
