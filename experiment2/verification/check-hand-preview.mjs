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
const source=(await readFile(new URL('../experience-guide.js',import.meta.url),'utf8')).replace(/^import .*?;\r?\n/gm,'').replaceAll('export function','function');
const ctx=vm.createContext({document:{getElementById:element,createElementNS:()=>({setAttribute(){}})},MIN_PLAY_SECONDS:3});vm.runInContext(source,ctx);
ctx.options={mode:'camera',phase:'globe',hand:null,handPreview:{hand:frontHand,delayed:true},handControllable:false,point:[.5,.5]};vm.runInContext('updateGuide(options)',ctx);
assert.equal(element('tracking-state').textContent,'● 카메라 연결됨');assert.equal(element('motion-title').textContent,'손바닥을 화면에 향하게 해주세요');
console.log('PASS: delayed white-hand preview without control, expiry, no/rear hands, no anchor mutation, session reset and waiting guide');

ctx.options={mode:'camera',phase:'city',hand:null,progress:0,point:[.5,.5]};vm.runInContext('updateGuide(options)',ctx);
assert.match(element('motion-help').textContent,/고개를 돌려/,'city keeps head-look instructions alongside snow collection');

ctx.options={mode:'camera',phase:'globe',hand:frontHand,handControllable:true,palmReady:false,held:false,point:[.5,.5]};vm.runInContext('updateGuide(options)',ctx);
assert.equal(element('motion-title').textContent,'손바닥을 화면에 향하게 해주세요');
ctx.options.palmReady=true;vm.runInContext('updateGuide(options)',ctx);
assert.equal(element('motion-title').textContent,'손가락을 살짝 오므려 스노우볼을 잡아주세요');
ctx.options.held=true;vm.runInContext('updateGuide(options)',ctx);
assert.equal(element('motion-title').textContent,'빨리 흔들면 음악이 빨라져요');
assert.equal(element('motion-help').textContent,'빨리 흔들면 음악이 빨라져요 · 천천히 흔들면 느려져요');
console.log('PASS: palm preparation, curl and music-speed guidance');

for(const held of [false,true])for(const delayed of [false,true,false,true]){
 ctx.options={mode:'camera',phase:'globe',hand:frontHand,handPreview:{hand:frontHand,delayed},handControllable:!delayed,palmReady:true,held,point:[.5,.5]};vm.runInContext('updateGuide(options)',ctx);
 assert.equal(element('tracking-state').textContent,'● 카메라 연결됨');
 assert.equal(element('motion-title').textContent,held?'빨리 흔들면 음악이 빨라져요':'손가락을 살짝 오므려 스노우볼을 잡아주세요','tracking delays must not replace the action guide');
}
console.log('PASS: action guidance stays stable across delayed and accepted hand samples');
