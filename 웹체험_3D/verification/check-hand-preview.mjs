import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import vm from 'node:vm';
import {AudienceGate} from '../audience.mjs';
import {TrackingClient} from '../tracking-client.mjs';
import {getHandPreview} from '../hand-preview.mjs';
import {body,hand} from './body-fixture.mjs';
const now=performance.now()+3000,gate=new AudienceGate(),frontHand=hand(.13);
gate.update([body(.75,.1),body(.25,.2)],now/1000);
const packet={kind:'hand',timestamp:now-800,stale:true,result:{landmarks:[hand(.69,.38),frontHand]}};
assert.equal(getHandPreview(packet,gate,now).hand,frontHand,'late result can show the front viewer position');
assert.equal(getHandPreview(packet,gate,now).delayed,true);
assert.equal(gate.handAnchor,null,'display lookup does not change controlled hand selection');
assert.equal(getHandPreview({...packet,timestamp:now-1600},gate,now),null,'expired positions disappear');
assert.equal(getHandPreview({...packet,result:{landmarks:[]}},gate,now),null,'explicit no-hand result hides the outline');
assert.equal(getHandPreview({...packet,result:{landmarks:[hand(.69,.38)]}},gate,now),null,'rear hand never becomes a position guide');
assert.equal(getHandPreview({...packet,timestamp:now-100,stale:false},gate,now).delayed,false);
gate.update([],now/1000);assert.equal(getHandPreview(packet,gate,now),null,'no selected body means no invented hand position');
class WorkerDouble{
 postMessage(data){if(data.type==='init')queueMicrotask(()=>this.onmessage({data:{type:'ready',delegates:{hand:'CPU',body:'CPU'}}}));else this.frame=data;}
 respond(){this.frame.image.close();this.onmessage({data:{type:'result',id:this.frame.id,result:{landmarks:[frontHand]},inferenceMs:800}});}
 terminate(){}
}
globalThis.createImageBitmap=async()=>({close(){}});
const worker=new WorkerDouble(),client=new TrackingClient(worker);await client.ready;let raw=null;
const job=client.detect('hand',{},performance.now()-800,p=>raw=p);await Promise.resolve();worker.respond();
assert.equal(await job,null,'800ms result still cannot drive the globe');
gate.update([body(.25,.2)],performance.now()/1000);
assert.ok(getHandPreview(raw,gate,performance.now()),'same dropped result remains eligible only for a position preview');
raw=null;const old=client.detect('hand',{},performance.now(),p=>raw=p);await Promise.resolve();client.reset();worker.respond();assert.equal(await old,null);assert.equal(raw,null,'old session cannot restore a ghost hand');client.close();
// Verify the real guide distinguishes a visible preview from working control.
const elements=new Map();const element=id=>{if(!elements.has(id))elements.set(id,{style:{},dataset:{},children:[],firstElementChild:{style:{}},setAttribute(){},append(v){this.children.push(v);},classList:{toggle(){}}});return elements.get(id);};
const source=(await readFile(new URL('../experience-guide.js',import.meta.url),'utf8')).replace(/^import .*?;\n/gm,'').replaceAll('export function','function');
const ctx=vm.createContext({document:{getElementById:element,createElementNS:()=>({setAttribute(){}})},MIN_PLAY_SECONDS:3});vm.runInContext(source,ctx);
ctx.options={mode:'camera',phase:'globe',hand:null,handPreview:{hand:frontHand,delayed:true},handControllable:false,point:[.5,.5]};vm.runInContext('updateGuide(options)',ctx);
assert.match(element('tracking-state').textContent,/손 위치 표시 · 조작 대기/);assert.match(element('motion-title').textContent,/분석이 늦어/);
console.log('PASS: delayed white-hand preview without control, expiry, no/rear hands, no anchor mutation, session reset and waiting guide');
