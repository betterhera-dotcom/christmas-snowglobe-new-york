import assert from 'node:assert/strict';
import * as THREE from '../vendor/three.module.js';
import {sampleSnowSurface} from '../snow-surface.js';
import {GlobeSnow} from '../snow3d.mjs';
const model=new THREE.Group();model.position.set(2,-1.5,3);
const geometry=new THREE.BufferGeometry();geometry.setAttribute('position',new THREE.Float32BufferAttribute([-1,.84,-1,1,.94,-1,1,.94,1,-1,.84,1],3));geometry.setIndex([0,2,1,0,3,2]);
const material=new THREE.MeshBasicMaterial();material.name='Settled ground snow';model.add(new THREE.Mesh(geometry,material));
const snow=new GlobeSnow();snow.surface=sampleSnowSurface(model);
assert.equal(snow.count,7000);
assert.ok(Math.abs(snow.floorHeight(0,0)-.899)<.00001,'sample actual snow surface in model coordinates');
assert.ok(Math.abs(snow.floorHeight(-.5,0)-.874)<.00001,'low snow areas must not float over an arbitrary plane');
snow.p.set([.5,1.2,0]);for(let n=0;n<60*20;n++)snow.update(1/60,n/60,[0,0,0]);
assert.ok(Math.abs(snow.p[1]-snow.floorHeight(.5,0))<.001,'falling flake lands on the authored snow');
for(let n=0;n<60*4;n++){const t=n/60;snow.update(1/60,t,[2*Math.sin(t*8),Math.cos(t*6),0]);for(let i=0;i<snow.count;i++){const k=i*3;assert.ok(Math.hypot(snow.p[k],snow.p[k+1]-1.78,snow.p[k+2])<1.431,'leave space for the whole flake inside the glass');}}
console.log('PASS: 7000 flakes, transformed ground sampling, low/high ground contact and interior clearance');
