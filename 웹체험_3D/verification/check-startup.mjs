// Execute the real app orchestration with controlled browser/scene/model promises.
import assert from 'node:assert/strict';
import vm from 'node:vm';
import {readFile} from 'node:fs/promises';
import {AudienceGate,cameraMotionScale} from '../audience.mjs';
import {getHandPreview} from '../hand-preview.mjs';
import {TrackingSchedule} from '../tracking-schedule.mjs';
import {ShakeMotion} from '../motion.mjs';
import {HandPickup} from '../hand-pickup.mjs';
import {BODY_HOLD_SECONDS,HAND_HOLD_SECONDS} from '../tracking-policy.mjs';
const html=await readFile(new URL('../index.html',import.meta.url),'utf8');
assert.doesNotMatch(html,/id="(?:distance-limit|calibrate-distance|viewer-distance|viewer-calibration)"/,'range and calibration controls removed');
const source=(await readFile(new URL('../app.js',import.meta.url),'utf8')).replace(/^import .*?;\n/gm,'');
const deferred=()=>{let resolve,reject;const promise=new Promise((a,b)=>{resolve=a;reject=b;});return {promise,resolve,reject};};
const tick=()=>new Promise(r=>setImmediate(r));
function setup(){
 const art=deferred(),permission=deferred(),model=deferred(),audio=deferred(),nodes=new Map(),events=[];let ready=false,models=0;
 function element(id){if(nodes.has(id))return nodes.get(id);const classes=new Set();const e={id,hidden:false,disabled:false,dataset:{},style:{setProperty(){}},children:[],firstElementChild:{style:{}},classList:{add:c=>classes.add(c),remove:c=>classes.delete(c),contains:c=>classes.has(c),toggle(){}},addEventListener(type,fn){this[type]=fn;},setAttribute(){},removeAttribute(){},getContext:()=>({clearRect(){}}),play:()=>Promise.resolve(),querySelector:()=>element(id+' child'),focus(){}};nodes.set(id,e);return e;}
 class Noop{reset(){} pause(){} close(){} mute(){} update(){} startIntro(){return audio.promise;}unlockTrack(){return audio.promise;}resume(){return audio.promise;}effect(){} }
 class FakeTracker extends Noop{constructor(){super();models++;this.ready=model.promise;} }
 const scene={ready:art.promise,stats:()=>({artLoaded:ready}),reset(){},resumeTiming(){}};
 const context=vm.createContext({console:{warn(){},error(){}},performance,URLSearchParams,location:{search:'?muted=1'},document:{getElementById:element,querySelector:element,addEventListener(){},body:element('body')},window:{addEventListener(){}},navigator:{mediaDevices:{getUserMedia(){events.push('permission');return permission.promise;}}},localStorage:{getItem(){throw Error('removed range settings must not be read');}},requestAnimationFrame(){},setTimeout,clearTimeout,innerWidth:1280,innerHeight:720,AudienceGate,cameraMotionScale,TrackingSchedule,getHandPreview,ShakeMotion,HandPickup,BODY_HOLD_SECONDS,HAND_HOLD_SECONDS,TrackingClient:FakeTracker,HeadLook:Noop,SnowCollection:Noop,SnowEntry:Noop,Carol:Noop,WebcamDebug:Noop,createHandRenderer:()=>()=>{},showIntro(){},openIntro(){events.push('curtain');},createScene:()=>scene});
 vm.runInContext(source,context);
 return {context,art,permission,model,events,element,get models(){return models;},loadArt(){ready=true;art.resolve(true);},run:code=>vm.runInContext(code,context)};
}
function cameraStream(){let stopped=false;const track={stop(){stopped=true;},getSettings:()=>({deviceId:'test',width:640,height:480}),addEventListener(){}};return {get stopped(){return stopped;},getTracks:()=>[track],getVideoTracks:()=>[track]};}
{
 const t=setup();t.run("beginExperience('camera')");assert.deepEqual(t.events,['permission','curtain'],'request and curtain happen with 3D/audio/model all unresolved');assert.equal(t.models,0,'models do not delay the permission prompt');
 const pointer=t.run('startPointer()'),stream=cameraStream();t.permission.resolve(stream);await tick();assert.equal(stream.stopped,true,'late permission grant after cancellation stops its tracks');t.loadArt();await pointer;assert.equal(t.run('mode'),'pointer');
}
{
 const t=setup();t.run("beginExperience('camera')");t.permission.reject(Object.assign(Error('denied'),{name:'NotAllowedError'}));await tick();assert.match(t.element('error').textContent,/사이트 설정/);assert.equal(t.element('camera').disabled,false);assert.equal(t.models,0);
 const request=t.run('startPointer()');t.loadArt();await request;assert.equal(t.run('mode'),'pointer','denial allows mouse without waiting on audio');
}
{
 const t=setup(),stream=cameraStream();t.run("beginExperience('camera')");t.permission.resolve(stream);await tick();assert.equal(t.models,1);assert.equal(t.element('webcam').srcObject,stream,'video connects before 3D/model readiness');assert.equal(t.run('mode'),'idle');
 t.model.resolve();t.loadArt();await tick();assert.equal(t.run('mode'),'camera');assert.equal(t.run('audience.allowed'),false);assert.equal(t.element('camera').disabled,false);t.run('resetExperience()');assert.equal(stream.stopped,true);
}
{
 const t=setup(),stream=cameraStream();const job=t.run('startCamera()');t.permission.resolve(stream);await tick();t.model.reject(Error('bad model'));await job;assert.equal(stream.stopped,true);assert.equal(t.element('camera').disabled,false);assert.match(t.element('error').textContent,/몸과 손/);
}
console.log('PASS: immediate permission and curtain, denied permission, cancel/late grant, no audio dependency, preview before readiness, model failure cleanup');
