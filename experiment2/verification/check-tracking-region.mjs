import assert from 'node:assert/strict';
import {trackingRegion,restoreRegion,StableHandRegion} from '../tracking-region.mjs';
import {body} from './body-fixture.mjs';
const points=body();
for(const p of points){p.x=.5+(p.x-.5)*.4;p.y=.4+(p.y-.4)*.4;}
const viewer={points};
for(const kind of ['hand','face']){
 const roi=trackingRegion(kind,viewer,1280,720);
 assert.ok(roi.width<720,'distant viewer is enlarged before model resizing');
 assert.ok(roi.x>=0&&roi.y>=0&&roi.x+roi.width<=1280&&roi.y+roi.height<=720);
 const world=[[{x:.01,y:.02,z:.03}]],raw={landmarks:[[{x:.25,y:.75,z:-.1}]],faceLandmarks:[[{x:.5,y:.5,z:.2}]],worldLandmarks:world};
 const restored=restoreRegion(raw,roi);
 assert.equal(restored.worldLandmarks,world,'world metre coordinates must not be remapped');
 assert.equal(restored.landmarks[0][0].x,(roi.x+.25*roi.width)/1280);
 assert.equal(restored.landmarks[0][0].y,(roi.y+.75*roi.height)/720);
 assert.equal(restored.landmarks[0][0].z,-.1*roi.width/1280);
}
assert.equal(trackingRegion('hand',{points:body(.5,.4)},1280,720),null,'nearby spread arms retain the full wide camera image');
assert.equal(trackingRegion('body',viewer,1280,720),null);
assert.equal(trackingRegion('face',null,1280,720),null);
for(const p of points)p.x-=.5;
const edge=trackingRegion('hand',viewer,1280,720);assert.equal(edge.x,0);
console.log('PASS: distant crop, edge bounds, full-frame fallback, coordinate restoration including depth, untouched world landmarks');

const stable=new StableHandRegion(),small=body(.5,.08),person={points:small};
const first=stable.select(person,1280,720);
const jitter={points:small.map(p=>({...p,x:p.x+.002}))};
assert.equal(stable.select(jitter,1280,720),first,'body jitter must not move VIDEO crop');
const shifted={points:small.map(p=>({...p,x:p.x+.3}))};
assert.notEqual(stable.select(shifted,1280,720),first,'large movement reframes');
stable.reset();assert.equal(stable.region,undefined);
assert.equal(stable.select(null,1280,720),null,'unknown viewer uses full frame');
assert.equal(stable.select(person,1280,720),null,'full frame stays stable until session/viewer reset');
console.log('PASS: stable video crop, necessary reframe and reset');
