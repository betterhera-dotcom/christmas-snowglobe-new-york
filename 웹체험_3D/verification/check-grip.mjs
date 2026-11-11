import assert from 'node:assert/strict';
import {Grip,isCGrip} from '../grip.mjs';
import {ShakeMotion} from '../motion.mjs';
function hand(closed,angle=0){const h=Array.from({length:21},()=>({x:0,y:0,z:0}));for(const [i,b] of [5,9,13,17].entries()){h[b]={x:(i-1.5)*.2,y:-1,z:0};h[b+1]={x:(i-1.5)*.2,y:-1.5,z:0};h[b+3]={x:(i-1.5)*.2+(closed?.35:.12),y:closed?-1.6:-2,z:closed?.1:0};}h[4]={x:-.15,y:-.75,z:0};return h.map(p=>({x:p.x*Math.cos(angle)-p.y*Math.sin(angle),y:p.x*Math.sin(angle)+p.y*Math.cos(angle),z:p.z}));}
for(const a of [0,.7,1.57,3.14]){assert.equal(isCGrip(hand(true,a)),true);assert.equal(isCGrip(hand(false,a)),false);}
const fist=hand(true);for(const tip of [8,12,16,20])fist[tip].y=-.8;assert.equal(isCGrip(fist),false,'fist is not the requested C grip');
const pinch=hand(true);pinch[4]={...pinch[8]};assert.equal(isCGrip(pinch),false,'pinch is not a C grip');
const g=new Grip();assert.equal(g.update(hand(true),0),false);assert.equal(g.update(hand(true),.15),true);
assert.equal(g.update(hand(false),.2),true);assert.equal(g.update(hand(true),.3),true,'brief open misclassification must not drop');
assert.equal(g.update(null,.8),true,'short occlusion preserves grip');assert.equal(g.update(hand(true),.9),true);
assert.equal(g.update(null,2.9),true,'2 seconds of occlusion preserve grip');assert.equal(g.update(hand(true),3),true);
for(let i=0;i<7;i++)assert.equal(g.update(hand(false),3.1+i*.1),true,'brief open estimate must not release');
assert.equal(g.update(hand(true),3.8),true,'C grip cancels release');
for(let i=0;i<10;i++)g.update(hand(false),4+i*.1);
assert.equal(g.closed,false,'continuous explicit open releases');
g.update(hand(true),5);g.update(hand(true),5.2);assert.equal(g.update(null,7.5),true);assert.equal(g.update(null,7.8),false,'long loss still releases');
g.reset();g.update(hand(true),9);g.update(hand(true),9.2);g.update(hand(false),9.3);g.update(hand(false),10.4);assert.equal(g.update(hand(false),11.5),true,'sparse detections cannot count as continuous release');
for(let t=0;t<=1;t+=.025){const curved=hand(true),open=hand(false),candidate=curved.map((p,i)=>({x:p.x+(open[i].x-p.x)*t,y:p.y+(open[i].y-p.y)*t,z:p.z+(open[i].z-p.z)*t}));if(!isCGrip(candidate))continue;const held=new Grip();held.update(hand(true),0);held.update(hand(true),.15);for(let i=0;i<20;i++)assert.equal(held.update(candidate,.2+i/15),true,'C grip always has priority over open estimate');}
const bad=hand(true);bad[8].z=NaN;assert.equal(g.update(bad,11.6),true,'invalid coordinates use grace period');
for(const [name,path] of Object.entries({vertical:t=>[.5,.5+.18*Math.sin(t*10)],diagonal:t=>[.5+.14*Math.sin(t*10),.5+.14*Math.sin(t*10)],circle:t=>[.5+.17*Math.cos(t*9),.5+.17*Math.sin(t*9)]})){
 const m=new ShakeMotion();let entered=false;for(let i=0;i<180;i++){const t=i/15,[x,y]=path(t);m.sample(x,y,t);m.update(1/15,t);entered ||= m.burst>0;}assert.ok(entered,name);m.release();assert.equal(m.burst,0);assert.equal(m.last,null);assert.equal(m.strokes,0);
}
console.log('PASS: rotated C/open/fist/pinch, grip hysteresis, tracking loss, vertical/diagonal/circular journey, release clears trigger');
const {FistReturn}=await import('../grip.mjs');const r=new FistReturn();r.reset(0);
assert.equal(r.update(fist,1),false);assert.equal(r.update(hand(true),3),false,'C grip must not exit city');assert.equal(r.update(fist,4),false);assert.equal(r.update(null,4.4),false);assert.equal(r.update(fist,5),false);assert.equal(r.update(fist,5.9),true,'sustained fist returns');
console.log('PASS: arrival grace, C grip exclusion, brief loss, sustained fist return');
