import assert from 'node:assert/strict';
import {TrackingClient} from '../tracking-client.mjs';
class WorkerDouble{
 constructor(){this.frames=[];}
 postMessage(data){if(data.type==='init')queueMicrotask(()=>this.onmessage({data:{type:'ready',delegates:{hand:'GPU',face:'GPU'}}}));else this.frames.push(data);}
 respond(){const frame=this.frames.shift();frame.image.close();this.onmessage({data:{type:'result',id:frame.id,result:{landmarks:[]},inferenceMs:12}});}
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
for(const [kind,age,accepted] of [['face',350,true],['hand',220,true],['hand',350,false],['face',650,false]]){
 job=client.detect(kind,{},performance.now()-age);await Promise.resolve();worker.respond();assert.equal(!!(await job),accepted,`${kind} latency policy at ${age}ms`);
}
globalThis.createImageBitmap=async()=>{throw Error('capture failed');};await assert.rejects(client.detect('hand',{},performance.now()),/capture failed/);assert.equal(client.busy,false);
globalThis.createImageBitmap=async()=>({close(){closed++;}});
job=client.detect('hand',{},performance.now());await Promise.resolve();client.close();await assert.rejects(job,/손 분석 종료/);assert.equal(worker.terminated,true);assert.equal(client.busy,false);
assert.equal(await client.detect('hand',{},performance.now()),null);assert.ok(closed>=3);
console.log('PASS: single image in flight, no backlog, stale/session result rejection, capture recovery and close');
