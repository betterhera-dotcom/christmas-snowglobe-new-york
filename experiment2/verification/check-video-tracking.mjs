import assert from 'node:assert/strict';
import vm from 'node:vm';
import {readFile} from 'node:fs/promises';
const calls=[],messages=[];
const task=name=>({createFromOptions:async(_vision,options)=>{
 calls.push([name,'create',options.runningMode]);
 return {detect:()=>{calls.push([name,'image']);return {landmarks:[]};},detectForVideo:(_image,t)=>{calls.push([name,'video',t]);return {landmarks:[]};},setOptions:async o=>calls.push([name,'mode',o.runningMode]),close(){}};
}});
const self={location:{href:'http://localhost/tracking-worker.js'},postMessage:data=>messages.push(data)};
const source=(await readFile(new URL('../tracking-worker.js',import.meta.url),'utf8')).replace("await import('./vendor/mediapipe/vision_bundle.mjs')",'tasks');
vm.runInNewContext(source,{self,URL,performance,OffscreenCanvas:class{getContext(){return {fillRect(){}};}},tasks:{FilesetResolver:{forVisionTasks:async()=>({})},HandLandmarker:task('hand'),PoseLandmarker:task('body'),FaceLandmarker:task('face')}});
await self.onmessage({data:{type:'init'}});
assert.ok(messages.some(m=>m.type==='ready'));
assert.ok(calls.some(c=>c[0]==='hand'&&c[1]==='create'&&c[2]==='VIDEO'));
let closed=0;
async function frame(timestamp,regionKey='full',epoch=0,kind='hand'){
 await self.onmessage({data:{type:'frame',id:timestamp,timestamp,regionKey,epoch,kind,image:{close(){closed++;}}}});
 assert.notEqual(messages.at(-1).type,'error');
}
await frame(10);await frame(10);await frame(9);
assert.deepEqual(calls.filter(c=>c[0]==='hand'&&c[1]==='video').map(c=>c[2]),[0,10,11,12]);
assert.equal(calls.filter(c=>c[1]==='mode').length,0,'stable crop keeps tracker history');
const before=calls.filter(c=>c[1]==='video').length;await frame(13,'crop');assert.equal(calls.filter(c=>c[1]==='video').length,before+2,'new crop flushes old tracks with an empty observation');
await frame(14,'crop',1);assert.equal(calls.filter(c=>c[1]==='video').length,before+4,'new session flushes old tracks');assert.equal(calls.filter(c=>c[1]==='mode').length,0,'never recompile the GPU graph during a frame request');
await frame(15,'full',1,'body');assert.equal(closed,6,'every transferred image is released');
assert.equal(calls.filter(c=>c[0]==='hand'&&c[1]==='image').length,0);
console.log('PASS: VIDEO hands, strictly increasing timestamps, stable crop reuse, crop/session invalidation, IMAGE bodies, image cleanup');
