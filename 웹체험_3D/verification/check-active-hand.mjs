import assert from 'node:assert/strict';
import {AudienceGate} from '../audience.mjs';
import {TrackingSchedule} from '../tracking-schedule.mjs';
import {body,hand} from './body-fixture.mjs';
const gate=new AudienceGate();gate.update([body()],0);
assert.equal(gate.handIndex([hand(.38),hand(.62)],0,{prefer:i=>i===1,moving:true}),1,'palm over globe wins even when second in detector list');
assert.equal(gate.handIndex([hand(.62),hand(.38)],.1,{moving:true}),0,'order change retains the same physical hand');
const state=JSON.stringify(gate.activeHand);
gate.handIndex([hand(.38),hand(.62)],.15,{remember:false});
assert.equal(JSON.stringify(gate.activeHand),state,'display query never advances control history');
assert.equal(gate.handIndex([hand(.62)],.2,{moving:true}),0,'one detected hand works alone');
assert.equal(gate.handIndex([],.3,{moving:true}),-1,'zero hands cannot invent control');
gate.handIndex([hand(.38)],.4,{moving:true});assert.equal(gate.activeHand.changed,true,'reacquisition rebases movement');
gate.reset();gate.update([body()],1);
gate.handIndex([hand(.38),hand(.62)],1,{moving:true});
for(let i=1;i<10;i++){
 const still=hand(.38+(i%2?1:-1)*.0002),other=hand(.62+(i%2?-1:1)*.0002);
 assert.equal(gate.handIndex([still,other],1+i*.05,{moving:true}),0,'tiny jitter cannot steal control');
}
for(const interval of [220,400,600]){
 const schedule=new TrackingSchedule(),kinds=[];
 for(let now=0;now<6000;now+=interval)kinds.push(schedule.next(now,now/1000,{allowed:true,phase:'city',faceReady:true}));
 assert.ok(kinds.filter(k=>k==='face').length>=2,'body work cannot starve city face analysis');
 assert.ok(kinds.filter(k=>k==='body').length>=2);
 for(let i=1;i<kinds.length;i++)if(kinds[i-1]!=='hand')assert.equal(kinds[i],'hand','hands keep a turn after each other model');
}
console.log('PASS: either palm, detector order, read-only preview, one/no hands, jitter rejection and city face scheduling under slow inference');
