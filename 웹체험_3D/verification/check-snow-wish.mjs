import assert from 'node:assert/strict';
import {SnowCatch,SnowCollection,RaisedHandHold,isReceivingSnow,nextWish,WINTER_WISHES} from '../snow-wish.mjs';
function hand(closed){
 const points=Array.from({length:21},()=>({x:0,y:0,z:0}));
 for(const [i,b]of [5,9,13,17].entries()){
  points[b]={x:(i-1.5)*.2,y:-1,z:0};points[b+1]={x:(i-1.5)*.2,y:-1.5,z:0};points[b+3]={x:(i-1.5)*.2+.12,y:closed?-.8:-2,z:0};
 }
 points[4]={x:-.15,y:-.75,z:0};return points;
}
const detector=new SnowCatch(),open=hand(false),fist=hand(true);
for(let i=0;i<12;i++)assert.equal(detector.update(fist,i*.12),false,'arriving with a fist cannot trigger');
detector.reset();for(const t of [0,.13,.26])assert.equal(detector.update(open,t),false);
assert.equal(detector.armed,true);
assert.equal(detector.update(fist,.39),false);assert.equal(detector.update(fist,.52),false);assert.equal(detector.update(fist,.65),true);
for(const t of [.78,.91,1.04])assert.equal(detector.update(fist,t),false,'held grip cannot repeat');
detector.reset();for(const t of [0,.13,.26])detector.update(open,t);detector.update(null,.3);
for(const t of [.4,.53,.66])assert.equal(detector.update(fist,t),false,'occlusion cannot become a catch');
detector.reset();for(const t of [0,.13,.26])detector.update(open,t);
assert.equal(detector.update(fist,1.5),false,'sparse detections reset the gesture');
const invalid=hand(false);invalid[8].x=NaN;assert.equal(detector.update(invalid,1.6),false);
for(let previous=-1;previous<WINTER_WISHES.length;previous++)for(const random of [0,.5,.999999]){const next=nextWish(previous,()=>random);assert.ok(next>=0&&next<WINTER_WISHES.length);assert.notEqual(next,previous);}
console.log('PASS: open-to-catch, no held-grip repeats, tracking loss, stale samples, invalid points, random message exclusion');

const collection=new SnowCollection();
for(const size of [.3,.08]){
 const body={y:.4,size};
 const raised=open.map(p=>({x:.5+p.x*size*.1,y:.4+p.y*size*.1}));
 const lowered=raised.map(p=>({...p,y:p.y+size*2}));
 assert.ok(isReceivingSnow(raised,body),'raised hand catches at near and far scales without depth or handedness');
 assert.ok(isReceivingSnow(raised.map(p=>({...p,x:1-p.x})),body),'either hand orientation catches');
 const raisedFist=fist.map(p=>({x:.5+p.x*size*.1,y:.4+p.y*size*.1}));
 assert.ok(isReceivingSnow(raisedFist,body),'finger pose is not required in the city');
 assert.equal(isReceivingSnow(lowered,body),false,'lowered hand does not catch');
 assert.equal(isReceivingSnow(null,body),false,'missing hand does not catch');
 assert.equal(isReceivingSnow(invalid,body),false,'invalid landmarks do not catch');
 assert.equal(isReceivingSnow(raised,null),false,'no selected person does not catch');
}
for(let i=0;i<40;i++)assert.equal(collection.update(true,i*.1),false);
assert.ok(collection.update(true,4.1));
collection.reset();collection.update(true,0);collection.update(true,.1);const before=collection.progress;
collection.update(true,10);assert.equal(collection.progress,before,'no progress across stalled frames');
for(let i=0;i<50;i++)collection.update(false,10+i*.1);
assert.equal(collection.progress,0,'lost hands cannot finish and snow drains');
collection.reset();collection.update(true,0);collection.update(true,.1);collection.update(false,.2);collection.update(true,.3);
assert.equal(collection.progress,.025,'reacquiring does not credit time without a palm');
console.log('PASS: four-second snow accumulation, raised hand, invalid tracking, stalled frames, loss and reacquisition');

for(const size of [.3,.08]){
 const body={y:.4,size},hold=new RaisedHandHold();
 const raised=fist.map(p=>({x:.5+p.x*size*.1,y:.4+p.y*size*.1}));
 const shifted=amount=>raised.map(p=>({...p,x:p.x+size*amount}));
 assert.equal(hold.update(raised,body,0),false);
 assert.equal(hold.update(shifted(.02),body,.1),false);
 assert.equal(hold.update(shifted(-.02),body,.21),true,'brief stable raised fist works at both distances');
 assert.equal(hold.update(shifted(.3),body,.3),false,'large movement restarts hold');
 assert.equal(hold.update(shifted(.3),body,.51),true);
 assert.equal(hold.update(null,body,.6),false);
 assert.equal(hold.update(raised,body,.7),false,'tracking loss requires a fresh hold');
 assert.equal(hold.update(raised,body,.91),true);
 assert.equal(hold.update(raised,body,2),false,'stalled samples cannot count as holding still');
 assert.equal(hold.update(raised.map(p=>({...p,y:p.y+size*2})),body,2.1),false,'lowering resets hold');
 assert.equal(hold.update(raised,body,2.2),false);
 assert.equal(hold.update(raised,body,2.41),true);
 assert.equal(hold.update(raised,null,2.5),false);
 assert.equal(hold.update(invalid,body,2.6),false);
}
console.log('PASS: raised stable hold at near/far scales, fist, jitter, movement, lowering and tracking gaps');
