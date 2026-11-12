import assert from 'node:assert/strict';
import {GlobeSnow} from '../snow3d.mjs';
import {HeldPose} from '../pose.mjs';
let seed=17;const random=()=>((seed=(seed*1664525+1013904223)>>>0)/4294967296);
const pose=new HeldPose();
for(let i=0;i<600;i++)pose.update(1/60,{keepHeld:true,x:.6,y:.4,pitch:2,wristRoll:3});
assert(Math.abs(pose.position[0])<.001,'grab anchors current hand position');
assert(Math.abs(pose.position[1]-.22)<.001,'held globe must not sink');
assert(Math.abs(pose.rotation[0])<=.20&&Math.abs(pose.rotation[2])<=.14,'bounded tilt');
for(let i=0;i<300;i++)pose.update(1/60,{keepHeld:false});
assert(Math.hypot(...pose.position)<.001,'release settles on counter');
const snow=new GlobeSnow(1400,random);let maxUpper=0,maxAirborne=0,maxRadius=0;
pose.reset();
for(let i=0;i<900;i++){const t=i/60;pose.update(1/60,{keepHeld:true,x:.5+.19*Math.sin(t*10),y:.5+.1*Math.cos(t*8)});snow.update(1/60,t,pose.velocity);const stats=snow.stats();maxUpper=Math.max(maxUpper,stats.upper);maxAirborne=Math.max(maxAirborne,stats.airborne);for(let j=0;j<snow.count;j++){const k=j*3;maxRadius=Math.max(maxRadius,Math.hypot(snow.p[k],snow.p[k+1]-1.78,snow.p[k+2]));}}
assert(maxUpper>200&&maxAirborne>1200,'snow spreads throughout the globe');assert(maxRadius<1.481,'snow stays inside glass');
for(let i=0;i<7200;i++)snow.update(1/60,15+i/60,[0,0,0]);assert.equal(snow.stats().airborne,0,'all snow settles after rest');
const collision=new GlobeSnow(1,random);collision.boxes=[{min:[-.2,1,-.2],max:[.2,1.5,.2]}];collision.p.set([0,1.48,0]);collision.update(1/60,0,[0,0,0]);assert(collision.p[1]>=1.5,'roof collision');
console.log(JSON.stringify({grabAnchor:true,heldNoDrop:true,boundedTilt:true,release:true,maxUpper,maxAirborne,maxRadius,settled:snow.stats(),roofCollision:true}));

const recovered=new HeldPose();for(let i=0;i<180;i++)recovered.update(1/60,{keepHeld:true,x:.5,y:.5});const heldHeight=recovered.position[1];for(let i=0;i<120;i++)recovered.update(1/60,{keepHeld:true,x:.8,y:.85,gripRevision:1});assert(Math.abs(recovered.position[1]-heldHeight)<.001,'reacquired hand must not pull globe down');assert(Math.abs(recovered.position[0])<.001,'reacquired hand must not snap sideways');console.log('PASS: reacquisition preserves held position');
