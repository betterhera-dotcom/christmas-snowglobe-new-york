import assert from 'node:assert/strict';
import {TrackingClient} from '../tracking-client.mjs';
class WorkerDouble{
 constructor(){this.frames=[];}
 postMessage(data){if(data.type==='init')queueMicrotask(()=>this.onmessage({data:{type:'ready',delegates:{hand:'GPU',face:'GPU'}}}));else this.frames.push(data);}
 respond(result={landmarks:[]}){const frame=this.frames.shift();frame.image.close();this.onmessage({data:{type:'result',id:frame.id,result,inferenceMs:12}});}
 terminate(){this.terminated=true;}
}
let closed=0;globalThis.createImageBitmap=async()=>({close(){closed++;}});
const worker=new WorkerDouble(),client=new TrackingClient(worker);await client.ready;
let job=client.detect('hand',{},performance.now());await Promise.resolve();
assert.equal(await client.detect('face',{},performance.now()),null,'busy pipeline never queues another image');
assert.equal(worker.frames.length,1);worker.respond();assert.ok(await job);assert.equal(client.busy,false);
let diagnostic=null;
job=client.detect('hand',{},performance.now(),raw=>diagnostic=raw);await Promise.resolve();client.reset();worker.respond();assert.equal(await job,null,'old viewer/mode result discarded after reset');assert.equal(diagnostic,null,'old session never reaches the overlay');
job=client.detect('face',{},performance.now()-600,raw=>diagnostic=raw);await Promise.resolve();worker.respond();assert.equal(await job,null,'old images cannot move the globe');assert.equal(client.metrics.dropped,1);
assert.equal(diagnostic.stale,true,'slow raw result remains available to diagnose a missing hand UI');assert.equal(diagnostic.kind,'face');
for(const [kind,age,accepted] of [['face',350,true],['hand',220,true],['hand',350,true],['hand',650,true],['hand',800,false],['body',1000,true],['body',1300,false],['face',650,false]]){
 job=client.detect(kind,{},performance.now()-age);await Promise.resolve();worker.respond();assert.equal(!!(await job),accepted,`${kind} latency policy at ${age}ms`);
}
let captureArgs;
globalThis.createImageBitmap=async(...args)=>{captureArgs=args;return {close(){closed++;}};};
const region={x:320,y:180,width:320,height:320,sourceWidth:1280,sourceHeight:720};
job=client.detect('hand',{videoWidth:1280,videoHeight:720},performance.now(),raw=>diagnostic=raw,region);await Promise.resolve();
assert.deepEqual(captureArgs.slice(1),[320,180,320,320,{resizeWidth:320,resizeHeight:320}]);
worker.respond({landmarks:[[{x:.5,y:.5,z:-.1}]]});
const cropped=await job;assert.equal(cropped.result.landmarks[0][0].x,.375);assert.equal(cropped.result.landmarks[0][0].y,340/720);
assert.equal(diagnostic.result,cropped.result,'overlay and control receive the same restored coordinates');assert.equal(diagnostic.region,region);
job=client.detect('body',{videoWidth:1280,videoHeight:720},performance.now());await Promise.resolve();
assert.deepEqual(captureArgs.slice(1),[{resizeWidth:640,resizeHeight:360}]);worker.respond();await job;
globalThis.createImageBitmap=async()=>{throw Error('capture failed');};await assert.rejects(client.detect('hand',{},performance.now()),/capture failed/);assert.equal(client.busy,false);
globalThis.createImageBitmap=async()=>({close(){closed++;}});
job=client.detect('hand',{},performance.now());await Promise.resolve();client.close();await assert.rejects(job,/손 분석 종료/);assert.equal(worker.terminated,true);assert.equal(client.busy,false);
assert.equal(await client.detect('hand',{},performance.now()),null);assert.ok(closed>=3);
console.log('PASS: single image in flight, no backlog, stale/session result rejection, capture recovery and close');
const initWorker=new WorkerDouble(),initializing=new TrackingClient(initWorker);await initializing.ready;delete initializing.delegates.face;
initializing.prepareFace();assert.equal(initializing.facePreparing,true);
assert.equal(await initializing.detect('hand',{},performance.now()),null,'no frame deadline runs during face model compilation');
assert.equal(initializing.pending,undefined);
initWorker.frames=[];initWorker.onmessage({data:{type:'face-ready',delegate:'GPU'}});assert.equal(initializing.facePreparing,false);
job=initializing.detect('hand',{},performance.now());await Promise.resolve();initWorker.respond();assert.ok(await job);initializing.close();
const failedWorker=new WorkerDouble(),failedFace=new TrackingClient(failedWorker);await failedFace.ready;delete failedFace.delegates.face;failedFace.prepareFace();
failedWorker.frames=[];failedWorker.onmessage({data:{type:'face-error',message:'unavailable'}});assert.equal(failedFace.facePreparing,false);
job=failedFace.detect('body',{},performance.now());await Promise.resolve();failedWorker.respond();assert.ok(await job,'optional face failure preserves body and hand inference');failedFace.close();
console.log('PASS: face preparation cannot trip the frame watchdog; success and optional failure both resume detection');
