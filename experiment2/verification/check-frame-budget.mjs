import assert from 'node:assert/strict';
import {FrameCadence,ShadowRefresh} from '../frame-budget.mjs';
for(const hz of [30,60,120,144,240]){
 const c=new FrameCadence();let rendered=0,elapsed=0;
 for(let i=0;i<hz*10;i++){const dt=c.take(i*1000/hz);if(dt!==null){rendered++;elapsed+=dt;}}
 assert.ok(Math.abs(rendered-Math.min(hz,60)*10)<=1,`${hz}Hz: ${rendered} renders`);
 assert.ok(Math.abs(elapsed-10)<.06,'visual time must not slow down at high refresh');
 console.log({hz,rendered,elapsed});
 c.reset();assert.equal(c.take(100000),1/60);
}
const shadow=new ShadowRefresh(),still=[0,1.5,0,0,0,0];
assert.equal(shadow.take(0,still,0),true);
for(let t=1;t<1000;t++)assert.equal(shadow.take(t,still,0),false,'static shadow reuses its map');
assert.equal(shadow.take(1000,[.1,1.5,0,0,0,0],0),true);
assert.equal(shadow.take(1010,[.2,1.5,0,0,0,0],0,true,100),false);
assert.equal(shadow.take(1101,[.2,1.5,0,0,0,0],0,true,100),true);
assert.equal(shadow.take(1102,still,1,false),true,'phase changes always redraw');
assert.equal(shadow.take(1103,[.3,1.5,0,0,0,0],1,false),false,'city keeps the shadow map');
shadow.reset();assert.equal(shadow.take(1200,still,0),true,'reset redraws even with identical transform');
console.log('PASS: 60fps cap without time drift, static/moving/phase/reset shadows');
