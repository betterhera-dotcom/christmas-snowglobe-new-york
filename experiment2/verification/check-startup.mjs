import {FrameCadence} from '../frame-budget.mjs';
import {citySnowReady,GLOBE_PLAY_MS,CITY_TITLE_MS,WISH_DURATION_MS,WISH_FADE_MS,advanceGlobeEnjoy} from '../journey.mjs';
import {handLift} from '../hand-height.mjs';
// Execute the real app orchestration with controlled browser/scene/model promises.
import assert from 'node:assert/strict';
import vm from 'node:vm';
import {readFile} from 'node:fs/promises';
import {AudienceGate,cameraMotionScale} from '../audience.mjs';
import {getHandPreview} from '../hand-preview.mjs';
import {TrackingSchedule} from '../tracking-schedule.mjs';
import {ShakeMotion} from '../motion.mjs';
import {HandPickup} from '../hand-pickup.mjs';
import {HeadLook} from '../head-look.mjs';
import {SnowCollection,RaisedHandHold,isReceivingSnow} from '../snow-wish.mjs';
import {body,hand} from './body-fixture.mjs';
import {BODY_HOLD_SECONDS,HAND_HOLD_SECONDS} from '../tracking-policy.mjs';
const html=await readFile(new URL('../index.html',import.meta.url),'utf8');
assert.doesNotMatch(html,/id="(?:distance-limit|calibrate-distance|viewer-distance|viewer-calibration)"/,'range and calibration controls removed');
const source=(await readFile(new URL('../app.js',import.meta.url),'utf8')).replace(/^import .*?;\n/gm,'');
const deferred=()=>{let resolve,reject;const promise=new Promise((a,b)=>{resolve=a;reject=b;});return {promise,resolve,reject};};
const tick=()=>new Promise(r=>setImmediate(r));
function setup(){
 const art=deferred(),permission=deferred(),model=deferred(),audio=deferred(),nodes=new Map(),events=[],documentEvents=new Map();let ready=false,models=0;const timers=new Map();let timerId=0;
 function element(id){if(nodes.has(id))return nodes.get(id);const classes=new Set();const e={id,hidden:false,disabled:false,dataset:{},style:{setProperty(){}},children:[],firstElementChild:{style:{}},classList:{add:c=>classes.add(c),remove:c=>classes.delete(c),contains:c=>classes.has(c),toggle(){}},addEventListener(type,fn){this[type]=fn;},setAttribute(){},removeAttribute(){},getContext:()=>({clearRect(){}}),play:()=>Promise.resolve(),querySelector:()=>element(id+' child'),focus(){}};nodes.set(id,e);return e;}
 class Noop{prepareFace(){} reset(){} pause(){} close(){} mute(){} update(){} startIntro(){return audio.promise;}unlockTrack(){return audio.promise;}resume(){return audio.promise;}effect(){} }
 class FakeTracker extends Noop{constructor(){super();models++;this.ready=model.promise;}prepareFace(){events.push('face-prepare');} }
 const looks=[];
 const scene={ready:art.promise,stats:()=>({artLoaded:ready}),reset(){},resumeTiming(){},handOverGlobe:()=>false,lookAt:(x,y)=>looks.push([x,y])};
 const context=vm.createContext({FrameCadence,console:{warn(){},error(){}},performance,URLSearchParams,location:{search:'?muted=1'},document:{getElementById:element,querySelector:element,addEventListener(type,fn){documentEvents.set(type,fn);},body:element('body')},window:{addEventListener(){}},navigator:{mediaDevices:{getUserMedia(){events.push('permission');return permission.promise;}}},localStorage:{getItem(){throw Error('removed range settings must not be read');}},requestAnimationFrame(){},setTimeout(fn,ms){const id=++timerId;timers.set(id,{fn,ms});return id;},clearTimeout(id){timers.delete(id);},innerWidth:1280,innerHeight:720,advanceGlobeEnjoy,citySnowReady,GLOBE_PLAY_MS,CITY_TITLE_MS,WISH_DURATION_MS,WISH_FADE_MS,handLift,AudienceGate,cameraMotionScale,TrackingSchedule,getHandPreview,ShakeMotion,HandPickup,BODY_HOLD_SECONDS,HAND_HOLD_SECONDS,TrackingClient:FakeTracker,HeadLook,SnowCollection,RaisedHandHold,isReceivingSnow,SnowEntry:Noop,Carol:Noop,WebcamDebug:Noop,createHandRenderer:()=>()=>{},showIntro(){},openIntro(){events.push('curtain');},createScene:()=>scene});
 vm.runInContext(source,context);
 return {context,art,permission,model,events,element,documentEvents,fire(ms){for(const [id,timer]of [...timers])if(timer.ms===ms){timers.delete(id);timer.fn();}},scene,looks,get models(){return models;},loadArt(){ready=true;art.resolve(true);},run:code=>vm.runInContext(code,context)};
}
function cameraStream(){let stopped=false;const track={stop(){stopped=true;},getSettings:()=>({deviceId:'test',width:640,height:480}),addEventListener(){}};return {get stopped(){return stopped;},getTracks:()=>[track],getVideoTracks:()=>[track]};}
{
 const t=setup(),stream=cameraStream();
 t.element('webcam').play=()=>{
  assert.equal(t.element('camera-preview').dataset.active,'true','preview is visible before requesting playback');
  assert.match(html,/<aside id="camera-preview"/,'video stays in a non-collapsible camera panel');
  assert.equal(t.element('webcam').muted,true);
  assert.equal(t.element('webcam').playsInline,true);
  return Promise.resolve();
 };
 const job=t.run('startCamera()');t.permission.resolve(stream);t.model.resolve();t.loadArt();await job;
 assert.equal(t.run('mode'),'camera');
 assert.ok(!t.events.includes('face-prepare'),'starting globe does not compile a face model');
 t.run('enterCity()');assert.ok(t.events.includes('face-prepare'),'city transition prepares the face');
}
{
 const t=setup();t.run("beginExperience('camera')");assert.deepEqual(t.events,['permission','curtain'],'request and curtain happen with 3D/audio/model all unresolved');assert.equal(t.models,1,'models prepare in parallel with the already requested camera');
 const pointer=t.run('startPointer()'),stream=cameraStream();t.permission.resolve(stream);await tick();assert.equal(stream.stopped,true,'late permission grant after cancellation stops its tracks');t.loadArt();await pointer;assert.equal(t.run('mode'),'pointer');
}
{
 const t=setup();t.run("beginExperience('camera')");t.permission.reject(Object.assign(Error('denied'),{name:'NotAllowedError'}));await tick();assert.match(t.element('error').textContent,/사이트 설정/);assert.equal(t.element('camera').disabled,false);assert.equal(t.models,1);
 const request=t.run('startPointer()');t.loadArt();await request;assert.equal(t.run('mode'),'pointer','denial allows mouse without waiting on audio');
}
{
 const t=setup(),stream=cameraStream();t.run("beginExperience('camera')");t.permission.resolve(stream);await tick();assert.equal(t.models,1);assert.equal(t.element('webcam').srcObject,stream,'video connects before 3D/model readiness');assert.equal(t.run('mode'),'idle');
 t.model.resolve();t.loadArt();await tick();assert.equal(t.run('mode'),'camera');assert.equal(t.run('audience.allowed'),false);assert.equal(t.element('camera').disabled,false);t.run('resetExperience()');assert.equal(stream.stopped,true);
}
{
 const t=setup(),stream=cameraStream();const job=t.run('startCamera()');t.permission.resolve(stream);await tick();t.model.reject(Error('bad model'));await job;assert.equal(stream.stopped,true);assert.equal(t.element('camera').disabled,false);assert.match(t.element('error').textContent,/몸과 손/);
}
{
 const t=setup();t.loadArt();await tick();const job=t.run('startCamera()');
 assert.equal(t.element('loading').hidden,true);assert.equal(t.element('camera-startup').hidden,false,'camera guidance is independent from completed art loading');
 assert.match(t.element('camera-start-status').textContent,/1 \/ 3/);
 t.fire(5000);assert.match(t.element('camera-start-status').textContent,/사이트 설정/);
 t.fire(20000);await job;assert.match(t.element('camera-start-status').textContent,/20초/);assert.equal(t.element('retry-camera').hidden,false);assert.equal(t.element('cancel-start').hidden,false);assert.equal(t.run('starting'),false);
 const stream=cameraStream();t.permission.resolve(stream);await tick();assert.equal(stream.stopped,true,'a grant after timeout cannot leave the camera running');assert.equal(t.run('mode'),'idle');
}
{
 const t=setup(),video=deferred(),stream=cameraStream();t.element('webcam').play=()=>video.promise;
 const job=t.run('startCamera()');t.permission.resolve(stream);await tick();assert.match(t.element('camera-start-status').textContent,/2 \/ 3/);
 t.fire(12000);await job;assert.equal(stream.stopped,true);assert.match(t.element('camera-start-status').textContent,/영상이 시작되지/);assert.equal(t.element('retry-camera').hidden,false);
 video.resolve();await tick();assert.equal(t.models,1,'late video playback cannot create another worker');
}
{
 const t=setup(),stream=cameraStream();const job=t.run('startCamera()');t.permission.resolve(stream);await tick();t.loadArt();await tick();
 assert.equal(t.element('camera-startup').hidden,false,'art completion cannot hide pending model guidance');assert.match(t.element('camera-start-status').textContent,/3 \/ 3/);
 t.model.resolve();await job;assert.equal(t.element('camera-startup').hidden,true,'successful startup removes the guidance');
}
{
 const t=setup();const job=t.run('startCamera()');t.permission.resolve(cameraStream());await tick();t.model.resolve();await tick();t.fire(60000);await job;
 assert.match(t.element('camera-start-status').textContent,/3D 화면 로딩/);assert.equal(t.element('retry-camera').hidden,false);
}
console.log('PASS: stage visibility, permission/video/art deadlines, late-grant cleanup, immediate permission and curtain, denied permission, cancel/late grant, no audio dependency, preview before readiness, model failure cleanup');

function gesture(closed,angle=0){const h=Array.from({length:21},()=>({x:0,y:0,z:0}));for(const [i,b] of [5,9,13,17].entries()){h[b]={x:(i-1.5)*.2,y:-1,z:0};h[b+1]={x:(i-1.5)*.2,y:-1.5,z:0};h[b+3]={x:(i-1.5)*.2+(closed?.35:.12),y:closed?-1.6:-2,z:closed?.1:0};}h[4]={x:-.15,y:-.75,z:0};return h.map(p=>({x:p.x*Math.cos(angle)-p.y*Math.sin(angle),y:p.x*Math.sin(angle)+p.y*Math.cos(angle),z:p.z}));}

// Run the actual app input path: either moving hand drives the globe while
// the other remains detected and still. A hand switch itself injects no force.
for(const movingSide of [0,1]){
 const t=setup();t.run("setMode('camera')");
 function feed(time,x){
  t.context.packet={landmarks:[body()]};t.context.now=time*1000;
  t.run("applyTrackingResult('body',packet,now)");
  let hands=[hand(.38,.42),hand(.62,.42)];hands[movingSide]=hand(x,.42);
  if(Math.round(time*10)%2)hands.reverse();
  t.context.packet={landmarks:hands,worldLandmarks:hands.map(()=>gesture(true))};t.run("applyTrackingResult('hand',packet,now)");
 }
 for(const time of [0,.1,.2,.3])feed(time,movingSide===0?.38:.62);
 assert.equal(t.run('grip.closed'),true,'one C-shaped hand outside the globe can pick up with two hands visible');
 let switches=0,maxSpeed=0;
 for(let i=4;i<24;i++){
  const x=(movingSide===0?.38:.62)+.07*Math.sin((i-3)*.8);
  feed(i/10,x);
  if(t.run('audience.activeHand.changed')){switches++;assert.equal(t.run('motion.inputSpeed'),0,'switch cannot count as a shake');}
  maxSpeed=Math.max(maxSpeed,t.run('motion.inputSpeed'));
 }
 assert.ok(maxSpeed>.2,'either moving hand produces real shake input');
 assert.ok(switches<=1,'detector reordering does not alternate the controlled hand');
 assert.equal(t.run('grip.closed'),true);
}
{
 const t=setup();t.run("setMode('camera'); phase='city'");
 t.context.packet={landmarks:[body()]};t.run("applyTrackingResult('body',packet,0)");
 const face=angle=>{
  const f=Array.from({length:478},()=>({x:.5,y:.2,z:0}));
  f[33]={x:.46,y:.2,z:-Math.sin(angle)*.04};f[263]={x:.46+Math.cos(angle)*.08,y:.2,z:Math.sin(angle)*.04};
  f[10]={x:.5,y:.15,z:0};f[152]={x:.5,y:.25,z:0};return f;
 };
 t.context.packet={faceLandmarks:[face(0)]};t.run("applyTrackingResult('face',packet,100)");
 t.context.packet={faceLandmarks:[face(.3)]};t.run("applyTrackingResult('face',packet,350)");
 assert.equal(t.looks.length,2);assert.ok(t.looks[1][0]>.7,'second face result turns the real city scene');
 t.context.packet={faceLandmarks:[face(-.3)]};t.run("applyTrackingResult('face',packet,600)");
 assert.ok(t.looks[2][0]<.3);
 t.context.packet={faceLandmarks:[]};t.run("applyTrackingResult('face',packet,850)");
 assert.equal(t.looks.length,3,'no face cannot invent a turn');
}
console.log('PASS: actual app single-hand shake with both hands visible, no handover impulse, and immediate city head turns');

{
 const t=setup();t.run("setMode('camera'); phase='city'; cityArrivedAt=1");
 t.context.packet={landmarks:[body()]};t.run("applyTrackingResult('body',packet,5000)");
 t.context.packet={landmarks:[hand(.38,.85),hand(.62,.42)],worldLandmarks:[gesture(false),gesture(false)],handedness:[[{categoryName:'Left'}],[{categoryName:'Right'}]]};
 t.run("applyTrackingResult('hand',packet,4900)");
 assert.equal(t.run('receivingSnow'),false,'city look-around blocks raised hands');
 assert.equal(t.run('snowCatch.progress'),0,'look-around never collects snow');
 t.run("applyTrackingResult('hand',packet,5100)");
 assert.equal(t.run('trackedHand===packet.landmarks[1]'),true,'city chooses the raised hand when the other hand is lowered');
 assert.equal(t.run('receivingSnow'),false,'one frame does not establish a stable hand');
 assert.equal(t.run('snowCatch.progress'),0);
 t.run("applyTrackingResult('hand',packet,5310)");
 assert.equal(t.run('receivingSnow'),true);
 t.run("applyTrackingResult('hand',packet,5410)");
 assert.ok(t.run('snowCatch.progress')>0,'valid palm frames accumulate snow through the real app path');
 t.context.packet.handedness=[[{categoryName:'Left'}],[{categoryName:'Left'}]];
 t.run("applyTrackingResult('hand',packet,5510)");
 assert.equal(t.run('receivingSnow'),true,'palm orientation does not block raised hands');
 t.context.packet.landmarks=[hand(.38,.85),hand(.62,.85)];
 t.run("applyTrackingResult('hand',packet,5610)");
 assert.equal(t.run('receivingSnow'),false,'lowered hands stop receiving');
}
console.log('PASS: actual city input selects raised hands regardless of palm orientation');

// Prewarming never requests camera access, and subsequent camera starts reuse it.
{
 const t=setup();t.loadArt();await tick();
 assert.equal(t.models,1);assert.deepEqual(t.events,[],'prewarming never opens the camera');
 t.model.resolve();await tick();
 const stream=cameraStream(),job=t.run('startCamera()');t.permission.resolve(stream);await job;
 assert.equal(t.models,1,'prewarmed worker reused');
 assert.equal(t.run('mode'),'camera');
 t.run('resetExperience()');await t.run('startCamera()');
 assert.equal(t.models,1,'returning visitor reuses models');
}
{
 const t=setup();t.loadArt();await tick();t.model.reject(Error('preload failed'));await tick();
 assert.equal(t.run('tracker'),null,'failed prewarm can be retried');
 const pointer=t.run('startPointer()');await pointer;
 assert.equal(t.run('mode'),'pointer','prewarm failure does not block mouse mode');
}
console.log('PASS: model prewarm without camera, reuse, and failure recovery');

{
 const t=setup(),handler=t.documentEvents.get('keydown');assert.equal(typeof handler,'function');
 for(const key of [{key:'r',code:'KeyR'},{key:'R',code:'KeyR',shiftKey:true},{key:'ㄱ',code:'KeyR'}]){
  t.run("setMode('pointer');phase='city'");let prevented=false;
  handler({...key,preventDefault(){prevented=true;}});
  assert.equal(t.run('mode'),'idle');assert.equal(t.run('phase'),'globe');assert.ok(prevented);
 }
 for(const ignored of [{repeat:true},{isComposing:true},{ctrlKey:true},{metaKey:true},{altKey:true},{defaultPrevented:true},{target:{isContentEditable:true}},{target:{closest:()=>true}}]){
  t.run("setMode('pointer')");handler({key:'r',code:'KeyR',preventDefault(){throw Error('must not consume typing or browser shortcuts');},...ignored});assert.equal(t.run('mode'),'pointer');
 }
 console.log('PASS: R/Shift+R/Korean physical R resets actual app, typing/repeat/browser shortcuts ignored');
}

{
 const t=setup();
 t.run("setMode('camera')");const start=t.run('globeStartedAt');
 t.run(`updateGlobeJourney(${start+11999})`);assert.equal(t.run('phase'),'globe');
 t.run('releaseAudience()');t.run(`updateGlobeJourney(${start+12000})`);assert.equal(t.run('phase'),'entering','12 seconds triggers without any hand or shake');
 t.run('resetExperience()');t.run(`updateGlobeJourney(${start+90000})`);assert.equal(t.run('phase'),'globe');assert.equal(t.run('globeStartedAt'),null,'reset cancels old countdown');
 t.run("setMode('pointer')");const restart=t.run('globeStartedAt');t.run(`updateGlobeJourney(${restart+20000})`);assert.equal(t.run('phase'),'entering','late frame catches up without counting tracking frames');
 console.log('PASS: wall-clock 12-second transition, no tracking dependency, reset cancels and restart gets fresh clock');
}
