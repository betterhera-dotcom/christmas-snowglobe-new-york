import assert from 'node:assert/strict';
import {SnowPhysics,boundedRoll} from '../../snow-physics.mjs';
const p=new SnowPhysics(),flakes=Array.from({length:650},(_,i)=>({x:.2+(i%50)/50*.6,y:.70,z:(i%17)/17,vx:0,vy:0,seed:i/650,floor:.70+(i%9)*.003,angle:0}));
let high=0,left=0,right=0;
for(let i=0;i<720;i++){
 const t=i/120;p.step(flakes,1/120,t,Math.sin(t*10)*.17,Math.cos(t*8)*.10,0);
 high=Math.max(high,flakes.filter(f=>f.y<.3).length);left=Math.max(left,flakes.filter(f=>f.x<.3).length);right=Math.max(right,flakes.filter(f=>f.x>.7).length);
 for(const f of flakes)assert.ok(Math.hypot((f.x-.5)/.375,(f.y-.391)/.35)<1.002,'inside glass');
}
for(let i=0;i<7200;i++)p.step(flakes,1/120,6+i/120,p.x,p.y,0);
const resting=flakes.filter(f=>f.y>.65).length;
assert.ok(high>30,'snow reaches upper globe');assert.ok(left>30&&right>30,'snow spreads both sides');assert.ok(resting>600,'snow settles after stopping');assert.equal(boundedRoll(Math.PI),.14);assert.equal(boundedRoll(-Math.PI),-.14);
console.log({high,left,right,resting,rotationLimitDegrees:.14*180/Math.PI});
