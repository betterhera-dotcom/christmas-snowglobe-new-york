import {ENTRY_DURATION_MS,MIN_PLAY_SECONDS,transitionVeil} from './journey.mjs';
import { createScene } from './scene3d.js';
import { ShakeMotion } from './motion.mjs';
import { HeadLook } from './head-look.mjs';
import {HandPickup} from './hand-pickup.mjs';
import {SnowCollection,isReceivingSnow,WINTER_WISHES,nextWish} from './snow-wish.mjs';
import {AudienceGate,cameraMotionScale} from './audience.mjs';
import {SnowEntry} from './snow-entry.mjs';
import {TrackingSchedule} from './tracking-schedule.mjs';
import {TrackingClient} from './tracking-client.mjs';
import {getHandPreview} from './hand-preview.mjs';
import {BODY_HOLD_SECONDS,HAND_HOLD_SECONDS} from './tracking-policy.mjs';
import { Carol } from './audio.js';
import {showIntro,openIntro,updateGuide} from './experience-guide.js';
import {createHandRenderer,pointerHand} from './hand-shape.js';
import {WebcamDebug} from './webcam-debug.js';

const $=id=>document.getElementById(id),motion=new ShakeMotion(),carol=new Carol($('carol-track'),$('city-track')),grip=new HandPickup(),headLook=new HeadLook(),snowCatch=new SnowCollection();
let virtualPointer=[.72,.72],virtualCurl=0;
const handOutline=$('hand-outline'),drawHandOutline=createHandRenderer(handOutline);let outlinedAt=-Infinity,lastOutlineDraw=-Infinity;
const webcamDebug=new WebcamDebug($('webcam-skeleton'),$('tracking-status'),$('tracking-metrics'));
const snowEntry=new SnowEntry();
let recognitionOnly=false,comparisonSamples=[],comparisonBefore=null,trackingPressure=0;
$('recognition-only').addEventListener('click',()=>{
 recognitionOnly=!recognitionOnly;
 if(recognitionOnly)comparisonBefore=comparisonSamples.length?Math.round(comparisonSamples.reduce((a,b)=>a+b,0)/comparisonSamples.length):null;
 comparisonSamples=[];tracker?.reset();releaseAudience();
 $('recognition-only').textContent=recognitionOnly?'3D 다시 실행':'인식만 비교 · 3D 정지';
 $('recognition-only').setAttribute('aria-pressed',String(recognitionOnly));
 scene?.resumeTiming();
});
const previewMuted=new URLSearchParams(location.search).has('muted');
carol.mute(previewMuted);$('sound').textContent=previewMuted?'소리 꺼짐':'소리 켜짐';$('sound').setAttribute('aria-pressed',String(previewMuted));
let introStarting=false;
function beginExperience(kind){
 if(introStarting)return;introStarting=true;
 // Start the permission request in this click, before waiting for art, audio or models.
 const task=kind==='camera'?startCamera():startPointer();
 carol.unlockTrack().catch(()=>{});carol.effect('curtain');openIntro();
 task.finally(()=>{introStarting=false;});
}
document.addEventListener('click',event=>{if(event.target.closest('button')&&!carol.muted)carol.resumeContext().then(()=>carol.effect('touch')).catch(()=>{});});
$('intro-camera').addEventListener('click',()=>beginExperience('camera'));
$('intro-pointer').addEventListener('click',()=>beginExperience('pointer'));
let wristBase=0;let demoTime=null,demoFrequency=10;
let pointerHeld=false;
let scene,mode='idle',phase='globe',travel=0,tracker=null,stream=null,lastHand=0,lastFrame=performance.now(),generation=0,starting=false;
let milestones=[false,false,false],feedbackUntil=0,cityArrivedAt=0;
let entryStartedAt=0,wishStartedAt=null,lastWish=-1,pointerCatchAt=null,pointerCatchPoint=[.5,.5];
const audience=new AudienceGate(),trackingSchedule=new TrackingSchedule();
let handPreviewPacket=null;
let testSnow=false,trackedHand=null,trackedAt=-Infinity,receivingSnow=false,palmPoint=[.5,.66];
function releaseAudience(){audience.activeHand.reset();audience.handAnchor=null;handPreviewPacket=null;trackedHand=null;receivingSnow=false;grip.reset();snowCatch.reset();motion.keepHeld=false;motion.release();headLook.reset();$('hand-cursor').hidden=true;}
function updateAudience(bodies,now){
  const selection=audience.update(bodies,now/1000);
  motion.cameraScale=selection.selected?cameraMotionScale(selection.selected.size):1;
  if(selection.changed||!selection.allowed)releaseAudience();
  $('viewer-status').textContent=selection.selected?'앞쪽 관객 한 분의 손을 연결합니다 · 거리 제한 없음':'관객을 기다리고 있어요 · 어깨와 손을 보여주세요';
  document.body.dataset.audience=JSON.stringify({candidates:audience.bodies.length,selected:selection.selected?.index??null,allowed:selection.allowed});
}
function clearWish(){handPreviewPacket=null;testSnow=false;receivingSnow=false;trackedHand=null;$('snow-hand').hidden=true;wishStartedAt=null;pointerCatchAt=null;snowCatch.reset();$('winter-wish').hidden=true;$('wish-message').textContent='';$('wish-title').textContent='';$('wish-token').textContent='';document.body.classList.remove('wish-active');$('catch-snow').disabled=false;$('catch-snow').textContent='눈 받기 테스트';}
function showWish(x=.5,y=.5){
  if(phase!=='city'||wishStartedAt!==null)return;
  phase='ending';document.body.dataset.phase=phase;pointerHeld=false;motion.keepHeld=false;motion.release();stopCamera();$('catch-snow').hidden=true;
  lastWish=nextWish(lastWish);wishStartedAt=performance.now();pointerCatchAt=null;snowCatch.reset();
  $('wish-title').textContent=WINTER_WISHES[lastWish].title;$('wish-token').textContent=WINTER_WISHES[lastWish].token;
  $('snow-hand').hidden=true;testSnow=false;
  const overlay=$('winter-wish');overlay.style.setProperty('--catch-x',`${x*100}%`);overlay.style.setProperty('--catch-y',`${y*100}%`);overlay.dataset.stage='shimmer';overlay.hidden=false;
  document.body.classList.add('wish-active');$('catch-snow').disabled=true;carol.end();
}
$('catch-snow').addEventListener('click',()=>{if(phase!=='city')return;testSnow=!testSnow;palmPoint=[.5,.64];$('catch-snow').textContent=testSnow?'눈 받기 멈추기':'눈 받기 테스트';});
$('wish-close').addEventListener('click',resetExperience);
showIntro();
carol.startIntro().catch(()=>{});
const questNames=['스노우볼 들기','눈 깨우기','뉴욕 도착'],questIds=['quest-hold','quest-snow','quest-city'];
function feedback(text){$('feedback').textContent=text;$('feedback').hidden=false;feedbackUntil=performance.now()+2300;}
function completeStep(index,text){if(milestones[index])return;milestones[index]=true;if(index===0)carol.effect('lift');if(index===2)carol.effect('arrival');$(questIds[index]).classList.add('done');$(questIds[index]).setAttribute('aria-label',`${questNames[index]}: 완료`);$('quest-count').textContent=milestones.filter(Boolean).length;feedback(text);}
const winter=$('window-snow'),winterContext=winter.getContext('2d');
const outsideFlakes=Array.from({length:75},()=>({x:Math.random(),y:Math.random(),size:.6+Math.random()*1.8,speed:.015+Math.random()*.025}));
function drawWinter(dt,time){
  if(winter.width!==innerWidth||winter.height!==innerHeight){winter.width=innerWidth;winter.height=innerHeight;}
  if($('window-snow').style.display==='none')return;
  const w=winter.width,h=winter.height,sceneH=h*(w<650?.70:1),scale=Math.max(w/2688,sceneH/1520),ox=(w-2688*scale)/2,oy=(sceneH-1520*scale)/2;
  winterContext.clearRect(0,0,w,h);if(phase!=='globe')return;
  winterContext.save();winterContext.beginPath();
  for(const [x,y,ww,hh] of [[175,345,200,455],[2140,345,210,455]])winterContext.rect(ox+x*scale,oy+y*scale,ww*scale,hh*scale);
  winterContext.clip();
  for(const flake of outsideFlakes){flake.y=(flake.y+dt*flake.speed*2)%1;const left=flake.x<.5,x=ox+((left?175:2140)+(flake.x*2%1)*210+Math.sin(time*.5+flake.y*5)*4)*scale,y=oy+(345+flake.y*455)*scale;winterContext.fillStyle='#f7fbf1c0';winterContext.beginPath();winterContext.arc(x,y,flake.size*scale,0,Math.PI*2);winterContext.fill();}
  winterContext.restore();
}
const storm=$('storm-particles'),stormContext=storm.getContext('2d');
const streaks=Array.from({length:130},()=>({angle:Math.random()*Math.PI*2,offset:Math.random(),size:1+Math.random()*3}));
function drawStorm(time){
  if(storm.width!==innerWidth||storm.height!==innerHeight){storm.width=innerWidth;storm.height=innerHeight;}
  stormContext.clearRect(0,0,storm.width,storm.height);if(phase!=='entering')return;
  const fade=Math.sin(Math.PI*travel),radius=Math.hypot(storm.width,storm.height)*.7;
  stormContext.strokeStyle=`rgba(196,214,226,${fade*.7})`;stormContext.lineCap='round';
  for(const streak of streaks){const r=((streak.offset+time*.8)%1)**2*radius,length=(12+travel*100)*r/radius,x=storm.width/2+Math.cos(streak.angle)*r,y=storm.height/2+Math.sin(streak.angle)*r;stormContext.lineWidth=streak.size*(.5+r/radius);stormContext.beginPath();stormContext.moveTo(x,y);stormContext.lineTo(x+Math.cos(streak.angle)*length,y+Math.sin(streak.angle)*length);stormContext.stroke();}
}
function status(text,active=false){if(introStarting)$('intro-status').textContent=text;if(starting)$('camera-start-status').textContent=text;$('status').textContent=text;$('status-dot').classList.toggle('active',active);}
function error(text){if(text&&!$('intro').hidden)$('intro-status').textContent=text;$('error').textContent=text;$('error').hidden=!text;}
function loadingFailed(message){error(message);$('loading').hidden=false;$('loading-message').textContent=message;$('loading').querySelector('small').textContent='연결을 확인한 후 다시 불러와주세요.';$('retry-load').hidden=false;}
$('retry-load').addEventListener('click',()=>location.reload());
window.addEventListener('art-error',event=>loadingFailed(event.detail));
try{scene=createScene($('scene'));$('enter-city').disabled=true;status('3D 스노우볼을 준비하고 있습니다…');scene.ready.then(ok=>{$('enter-city').disabled=!ok;$('scene').setAttribute('aria-busy','false');if(ok){$('loading').hidden=true;}else{loadingFailed('스노우볼을 불러오지 못했어요');}if(!starting&&mode==='idle')status(ok?'시작 방법을 선택해주세요':'3D 파일을 읽지 못했습니다');});}catch(e){loadingFailed('입체 화면을 시작하지 못했습니다. Chrome의 그래픽 가속 설정과 브라우저를 확인해주세요.');console.error(e);}
function stopCamera(){if(stream)stream.getTracks().forEach(track=>track.stop());stream=null;$('webcam').srcObject=null;$('camera-preview').removeAttribute('data-active');audience.reset();trackingSchedule.reset();tracker?.reset();}
function setMode(value){
  snowCatch.maxGap=value==='camera'?HAND_HOLD_SECONDS:.35;
  recognitionOnly=false;comparisonSamples=[];comparisonBefore=null;$('recognition-only').textContent='인식만 비교 · 3D 정지';$('recognition-only').setAttribute('aria-pressed','false');webcamDebug.reset();
  audience.reset();trackingSchedule.reset();tracker?.reset();
  snowEntry.reset();
  clearWish();$('catch-snow').hidden=true;
  cityArrivedAt=0;document.body.classList.remove('city-settled');
  mode=value;phase='globe';travel=0;document.body.dataset.phase=phase;document.body.dataset.input=value;motion.reset();motion.followHand=value==='camera';grip.reset();headLook.reset();pointerHeld=false;motion.keepHeld=false;motion.gripRevision=0;motion.wristRoll=0;motion.pitch=0;scene?.reset();milestones=[false,false,false];
  questIds.forEach((id,i)=>{$(id).classList.remove('done');$(id).setAttribute('aria-label',`${questNames[i]}: 대기`);});$('quest-count').textContent='0';$('feedback').hidden=true;
  $('reset').textContent='처음으로';document.querySelector('.step').textContent='01 / LIFT THE SNOWGLOBE';document.body.classList.toggle('active',value!=='idle');
  $('mode-label').textContent=value==='camera'?'CAMERA':value==='pointer'?'TOUCH / MOUSE':'READY';$('prompt').textContent='손으로 작은 겨울을 들어보세요';
  $('hint').textContent=value==='pointer'?'스노우볼 위를 눌러 잡고, 3초간 음악과 눈을 즐긴 뒤 안내에 따라 세게 흔들어주세요.':'손을 스노우볼 위에 올려 잡고, 3초간 음악과 눈을 즐긴 뒤 안내에 따라 세게 흔들어주세요.';$('hand-cursor').hidden=true;lastHand=0;
}
function startupDeadline(promise,ms,message){
 let timer;return Promise.race([promise,new Promise((_,reject)=>{timer=setTimeout(()=>reject(new Error(message)),ms);})]).finally(()=>clearTimeout(timer));
}
async function startCamera(){
  if(starting)return;const token=++generation;starting=true;$('camera').disabled=true;$('cancel-start').hidden=false;error('');stopCamera();setMode('idle');
  let permissionHint,acceptCamera=true;
  $('camera-startup').hidden=false;$('retry-camera').hidden=true;$('camera-start-help').textContent='이미 허용한 카메라는 허용 창 없이 연결됩니다. 연결 중에는 3D 움직임을 잠시 멈춥니다.';
  try{
    if(!navigator.mediaDevices?.getUserMedia)throw new Error('LOCALHOST');
    const request=navigator.mediaDevices.getUserMedia({audio:false,video:{facingMode:'user',width:{ideal:640},height:{ideal:480},frameRate:{ideal:30,max:30}}});
    request.then(candidate=>{if(!acceptCamera||token!==generation)candidate.getTracks().forEach(t=>t.stop());}).catch(()=>{});
    status('1 / 3 · 카메라 연결 요청 중 · 브라우저의 허용 안내를 확인해주세요');
    permissionHint=setTimeout(()=>{if(token===generation)status('허용 창이 안 보이면 주소창 왼쪽 사이트 설정에서 카메라 권한을 확인해주세요. 마우스로도 시작할 수 있어요.');},5000);
    carol.startIntro().catch(()=>{});
    const candidate=await startupDeadline(request,20000,'CAMERA_TIMEOUT');clearTimeout(permissionHint);
    if(token!==generation){candidate.getTracks().forEach(t=>t.stop());return;}
    stream=candidate;$('webcam').srcObject=stream;status('2 / 3 · 카메라 허용됨 · 영상이 시작되기를 기다립니다');await startupDeadline($('webcam').play(),12000,'VIDEO_TIMEOUT');
    if(token!==generation)return;
    $('camera-preview').dataset.active='true';$('camera-preview').open=true;
    stream.getVideoTracks()[0].addEventListener('ended',()=>{if(token===generation){generation++;starting=false;$('camera').disabled=false;$('cancel-start').hidden=true;stopCamera();setMode('idle');status('카메라 연결이 끊어졌습니다');error('카메라를 연결하고 ‘카메라로 시작’을 다시 눌러주세요.');}});
    status('3 / 3 · 카메라 영상 연결됨 · 몸과 손 인식을 준비하고 있습니다');
    if(!tracker)tracker=new TrackingClient();
    await tracker.ready;if(token!==generation)return;
    status('몸과 손 인식 준비됨 · 3D 화면을 준비하고 있습니다');
    const artReady=await startupDeadline(scene?.ready,60000,'ART_TIMEOUT');
    if(token!==generation)return;
    if(!artReady)throw new Error('ART');
    setMode('camera');$('camera-startup').hidden=true;
    carol.startIntro().catch(()=>error('소리를 시작하지 못했어요. 소리 버튼을 눌러주세요.'));
    status('어깨와 손을 보여주세요 · 앞쪽 관객 한 분만 조작합니다');return true;
  }catch(e){
    if(token!==generation)return;tracker?.close();tracker=null;stopCamera();setMode('idle');status('카메라를 시작하지 못했습니다');
    const messages={NotAllowedError:'카메라 권한이 차단되어 있어요. Chrome 주소창 왼쪽 사이트 설정 → 카메라 → 허용 후 다시 시작해주세요. 운영체제의 Chrome 카메라 권한도 확인해주세요.',NotFoundError:'연결된 카메라가 없습니다. 웹캠을 연결하거나 마우스로 먼저 체험해주세요.',NotReadableError:'다른 앱이 카메라를 사용 중일 수 있습니다. 카메라 사용 앱을 닫고 다시 시작해주세요.'};
    messages.SecurityError='브라우저 또는 운영체제 설정에서 카메라 접근이 차단되어 있습니다. 카메라 권한을 확인해주세요.';
    messages.OverconstrainedError='웹캠이 요청한 영상 설정을 지원하지 못했습니다. 다른 웹캠 또는 Chrome 카메라 설정을 확인해주세요.';
    const timed={CAMERA_TIMEOUT:'카메라가 20초 동안 응답하지 않았습니다. 주소창 왼쪽 사이트 설정에서 카메라 허용 여부를 확인하고, 다른 카메라 사용 앱을 닫은 뒤 다시 시도해주세요.',VIDEO_TIMEOUT:'카메라는 허용됐지만 영상이 시작되지 않았습니다. 다른 카메라 사용 앱을 닫고 웹캠 연결을 확인해주세요.',ART_TIMEOUT:'카메라와 인식은 준비됐지만 3D 화면 로딩이 지연되고 있습니다. 다시 불러오기를 시도해주세요.'};
    error(messages[e.name]||timed[e.message]||(e.message==='LOCALHOST'?'카메라는 HTTPS 또는 localhost 주소에서 실행해주세요.':e.message==='ART'?'3D 화면을 불러오지 못했습니다. 다시 불러오기를 눌러주세요.':'몸과 손 인식을 준비하지 못했습니다. 카메라로 시작을 다시 누르거나 마우스로 체험해주세요.'));console.warn(e);
    $('camera-startup').hidden=false;$('camera-start-status').textContent=$('error').textContent;$('camera-start-help').textContent='브라우저 밖의 권한 창은 사이트가 강제로 열 수 없습니다. 차단 설정을 바꾼 후 아래 버튼으로 다시 시도해주세요.';$('retry-camera').hidden=false;
  }finally{acceptCamera=false;clearTimeout(permissionHint);if(token===generation){scene?.resumeTiming();starting=false;$('camera').disabled=false;$('cancel-start').hidden=false;}}
}
$('camera').addEventListener('click',startCamera);
$('retry-camera').addEventListener('click',startCamera);
async function startPointer(){
 const token=++generation;starting=false;$('camera-startup').hidden=true;scene?.resumeTiming();$('camera').disabled=false;$('cancel-start').hidden=true;stopCamera();setMode('idle');error('');status('3D 스노우볼을 준비하고 있습니다…');carol.resume().catch(()=>{});
 if(!scene?.stats().artLoaded&&!await scene?.ready){if(token===generation)loadingFailed('스노우볼을 불러오지 못했어요');return false;}
 if(token!==generation)return false;
 setMode('pointer');status('마우스를 누른 채 움직여주세요',true);feedback('스노우볼 위를 눌러 잡아보세요');return true;
}
$('cancel-start').addEventListener('click',startPointer);
$('pointer').addEventListener('click',startPointer);
function enterCity(){
  trackingSchedule.reset();if(mode==='camera')tracker?.prepareFace();
  entryStartedAt=performance.now();
  phase='entering';
  carol.effect('enter');
  document.body.dataset.phase=phase;
  $('hand-cursor').hidden=true;
  $('prompt').textContent='눈보라 너머, 뉴욕으로';
  $('hint').textContent='이제 손을 멈추고 작은 겨울 속으로 들어가요.';
  feedback('겨울 여행이 열립니다');
}
$('enter-city').addEventListener('click',()=>{
  if(starting||phase!=='globe'||!scene?.stats().artLoaded)return;
  if(mode==='idle')startPointer();
  enterCity();
});
function samplePointer(event){if(phase==='city'&&mode==='pointer'&&pointerHeld){palmPoint=[event.clientX/innerWidth,event.clientY/innerHeight];return;}const r=$('scene').getBoundingClientRect(),x=(event.clientX-r.left)/r.width;if(phase==='city'){if(mode==='pointer'&&wishStartedAt===null)scene?.lookAt(x,(event.clientY-r.top)/r.height);return;}if(mode!=='pointer'||phase!=='globe'||!pointerHeld)return;motion.sample(x,(event.clientY-r.top)/r.height,performance.now()/1000);}
$('scene').addEventListener('pointermove',event=>{virtualPointer=[event.clientX/innerWidth,event.clientY/innerHeight];});
$('scene').addEventListener('pointerdown',event=>{virtualPointer=[event.clientX/innerWidth,event.clientY/innerHeight];});
$('scene').addEventListener('pointerdown',event=>{if(phase!=='globe'&&phase!=='city')return;if(mode==='idle'&&!starting)startPointer();if(mode==='pointer'){if(phase==='globe'&&!scene?.handOverGlobe(event.clientX/innerWidth,event.clientY/innerHeight))return;pointerHeld=true;$('scene').setPointerCapture(event.pointerId);carol.effect('touch');if(phase==='city'){const r=$('scene').getBoundingClientRect();pointerCatchPoint=[(event.clientX-r.left)/r.width,(event.clientY-r.top)/r.height];palmPoint=pointerCatchPoint;pointerCatchAt=performance.now();testSnow=false;return;}motion.keepHeld=true;samplePointer(event);}});
$('scene').addEventListener('pointermove',samplePointer);
function releasePointer(){pointerCatchAt=null;if(mode==='camera')return;pointerHeld=false;motion.keepHeld=false;motion.release();}
$('scene').addEventListener('pointerup',releasePointer);
$('scene').addEventListener('pointercancel',releasePointer);
$('scene').addEventListener('lostpointercapture',releasePointer);
$('scene').addEventListener('pointerleave',()=>{if(mode==='pointer'&&!pointerHeld)motion.release();});
$('sound').addEventListener('click',async()=>{carol.mute(!carol.muted);$('sound').textContent=carol.muted?'소리 꺼짐':'소리 켜짐';$('sound').setAttribute('aria-pressed',String(carol.muted));feedback(carol.muted?'캐롤을 잠시 쉬어요':'캐롤이 다시 흘러요');if(!carol.muted)await carol.resume().catch(()=>error('소리를 시작하지 못했어요. 다시 눌러주세요.'));});
function resetExperience(){$('camera-startup').hidden=true;generation++;starting=false;introStarting=false;$('cancel-start').hidden=true;$('camera').disabled=false;stopCamera();setMode('idle');carol.reset();carol.startIntro().catch(()=>{});error('');status('시작 방법을 선택해주세요');$('intro-status').textContent='시작 방법을 누르면 음악과 함께 커튼이 열립니다';showIntro();}
$('reset').addEventListener('click',resetExperience);
$('fullscreen').addEventListener('click',async()=>{try{if(document.fullscreenElement)await document.exitFullscreen();else await document.documentElement.requestFullscreen();}catch{error('전체 화면은 Chrome 메뉴에서도 켤 수 있습니다.');}});
document.addEventListener('visibilitychange',()=>{if(document.hidden){audience.activeHand.reset();audience.handAnchor=null;handPreviewPacket=null;tracker?.reset();motion.reset();carol.pause();pointerCatchAt=null;pointerHeld=false;testSnow=false;receivingSnow=false;snowCatch.reset();}else if(carol.context){carol.resume().catch(()=>{});lastFrame=performance.now();if(phase==='entering')entryStartedAt=lastFrame-travel*ENTRY_DURATION_MS;}});
window.addEventListener('pagehide',()=>{generation++;stopCamera();tracker?.close();carol.pause();});
function applyTrackingResult(inference,result,now){
 const time=now/1000;
      if(inference==='body'){
        updateAudience(result.landmarks,now);
      }else if(inference==='face'){
        if(phase==='city'&&audience.allowed&&wishStartedAt===null&&audience.ownsFace(result.faceLandmarks[0],time)){const horizontal=headLook.update(result.faceLandmarks[0]);scene?.lookAt(horizontal,headLook.vertical);}
      }else{
      trackingSchedule.recordHand(performance.now());
      const index=audience.handIndex(result.landmarks,time,{
        moving:phase==='globe',
        prefer:phase==='globe'&&!grip.closed?i=>{
          const palm=[0,5,9,13,17].map(j=>result.landmarks[i][j]);
          return scene?.handOverGlobe(1-palm.reduce((s,p)=>s+p.x,0)/5,palm.reduce((s,p)=>s+p.y,0)/5);
        }:undefined
      }),hand=result.landmarks[index];
      const handChanged=audience.activeHand.changed;
      if(handChanged){
        // A handover is not a shake: rebase position and wrist rotation.
        motion.release();motion.gripRevision=(motion.gripRevision||0)+1;
        grip.since=null;snowCatch.reset();
      }
      trackedHand=hand||null;trackedAt=time;
      if(phase==='city'){
        receivingSnow=isReceivingSnow(result.worldLandmarks?.[index]||hand);
        if(hand){const palm=[hand[0],hand[5],hand[9],hand[13],hand[17]];palmPoint=[1-palm.reduce((n,p)=>n+p.x,0)/5,palm.reduce((n,p)=>n+p.y,0)/5];}
        if(snowCatch.update(receivingSnow,time))showWish(...palmPoint);
      }else if(hand){
        const points=[hand[0],hand[5],hand[9],hand[13],hand[17]],x=1-points.reduce((s,p)=>s+p.x,0)/5,y=points.reduce((s,p)=>s+p.y,0)/5;
        const wasClosed=grip.closed,closed=grip.update(result.worldLandmarks?.[index]||hand,time,scene?.handOverGlobe(x,y));
        const wristAngle=Math.atan2(hand[9].y-hand[0].y,hand[9].x-hand[0].x);
        if(closed&&(handChanged||!wasClosed||time-lastHand>HAND_HOLD_SECONDS))wristBase=wristAngle;
        if(closed&&wasClosed&&time-lastHand>HAND_HOLD_SECONDS)motion.gripRevision=(motion.gripRevision||0)+1;
        if(closed){motion.wristRoll=-Math.atan2(Math.sin(wristAngle-wristBase),Math.cos(wristAngle-wristBase));
          const points3D=result.worldLandmarks?.[index]||hand,palm=Math.hypot(points3D[9].x-points3D[0].x,points3D[9].y-points3D[0].y,points3D[9].z-points3D[0].z);
          motion.pitch=Math.max(-.65,Math.min(.65,(points3D[9].z-points3D[0].z)/Math.max(.001,palm)));
        }
        motion.keepHeld=closed;
        if(closed)motion.sample(x,y,time,performance.now()/1000);else motion.release();lastHand=time;status(closed?'스노우볼을 잡고 있어요':'한 손을 스노우볼 위에 올려 잡아주세요',closed);$('hand-cursor').hidden=phase==='city';$('hand-cursor').style.left=`${x*100}%`;$('hand-cursor').style.top=`${y*100}%`;
      }else{const held=grip.update(null,time);motion.keepHeld=held;if(!held)motion.release();$('hand-cursor').hidden=true;status(held?'잡은 상태를 유지하고 있어요 · 손을 보여주세요':'손이 카메라에 보이도록 들어주세요');}
      }
 }
function frame(now){
  const time=now/1000,dt=Math.min(.05,(now-lastFrame)/1000);lastFrame=now;
  if(starting){requestAnimationFrame(frame);return;}
  $('recognition-only').disabled=phase==='entering'||phase==='ending';
  if(demoTime!==null&&phase==='globe'){const t=time-demoTime;motion.keepHeld=true;motion.sample(.5+.19*Math.sin(t*demoFrequency),.5+.10*Math.cos(t*demoFrequency*.8),time);if(t>32){demoTime=null;releasePointer();}}
  if(demoTime!==null&&phase==='city'){demoTime=null;releasePointer();}
  if(phase!=='entering'&&mode==='camera'&&tracker&&!tracker.busy&&stream&&$('webcam').readyState>=2){
    const inference=trackingSchedule.next(now,$('webcam').currentTime,{allowed:audience.allowed,phase,diagnostics:true,faceReady:!!tracker.delegates?.face});
    if(inference){
      const token=generation,requestPhase=phase;
      tracker.detect(inference,$('webcam'),now,raw=>{
        if(token===generation&&mode==='camera'&&phase===requestPhase&&!document.hidden){
         if(inference==='face')raw.owned=audience.ownsFace(raw.result.faceLandmarks?.[0],raw.timestamp/1000);
         webcamDebug.record(raw);
         if(inference==='hand'){handPreviewPacket=raw;comparisonSamples.push(raw.ageMs);if(comparisonSamples.length>60)comparisonSamples.shift();
          if(!recognitionOnly){trackingPressure=raw.ageMs>150?trackingPressure+1:Math.max(0,trackingPressure-1);if(trackingPressure>=12){scene?.reduceQuality();trackingPressure=0;}}
         }
        }
      }).then(packet=>{
        if(token!==generation||mode!=='camera'||phase!==requestPhase||document.hidden)return;
        if(packet&&(!recognitionOnly||inference==='body'))applyTrackingResult(inference,packet.result,packet.timestamp);
        document.body.dataset.tracking=JSON.stringify({...tracker.metrics,handHz:trackingSchedule.handHz(performance.now()),delegates:tracker.delegates});
      }).catch(e=>{
        if(token!==generation||mode!=='camera')return;
        stopCamera();tracker?.close();tracker=null;setMode('idle');carol.pause();error('손 인식이 중단되었습니다. 카메라로 시작을 다시 눌러주세요.');console.warn(e);
      });
    }
  }
  if(mode==='camera'&&phase!=='entering'&&(!audience.allowed||time-audience.lastSeen>BODY_HOLD_SECONDS))releaseAudience();
  if(mode==='camera'){
   const avg=comparisonSamples.length?Math.round(comparisonSamples.reduce((a,b)=>a+b,0)/comparisonSamples.length):null;
   $('comparison-status').textContent=`${recognitionOnly?'3D 정지 · 인식만 측정':'3D 실행 중'} · 화질 ${scene?.stats().quality===1?'기본':scene?.stats().quality===.75?'경량':'최소'}\n손 평균 지연 ${avg??'—'}ms (${comparisonSamples.length}회)${recognitionOnly?` · 정지 전 ${comparisonBefore??'—'}ms`:''}`;
  }
  if(recognitionOnly){webcamDebug.draw(now,{video:$('webcam'),allowed:audience.allowed,selected:audience.selected?.index,controlled:false,delegates:tracker?.delegates,dropped:tracker?.metrics.dropped});handOutline.hidden=true;requestAnimationFrame(frame);return;}
  motion.update(dt,time);
  if(phase==='globe'&&mode!=='idle')carol.followShake(dt,!!scene?.stats().holding&&motion.keepHeld,motion.raw).catch(()=>error('소리를 시작하지 못했어요. 소리 버튼을 눌러주세요.'));
  if(phase==='globe'&&mode!=='idle'&&scene?.stats().holding){completeStep(0,'스노우볼을 들었어요');}
  if(phase==='globe'&&scene?.stats().holding&&motion.energy>.12)completeStep(1,'눈이 깨어났어요!');
  const fillState=scene?.stats();
  if(snowEntry.update(dt,{ready:phase==='globe'&&mode!=='idle'&&motion.playTime>=MIN_PLAY_SECONDS,fill:fillState?.globeFill||0}))enterCity();
  if(phase==='entering'){
    travel=Math.min(1,(now-entryStartedAt)/ENTRY_DURATION_MS);
    if(travel===1){phase='city';carol.startCity().catch(()=>error('도시 음악을 시작하지 못했어요. 소리 버튼을 눌러 다시 켜주세요.'));pointerHeld=false;pointerCatchAt=null;testSnow=false;receivingSnow=false;headLook.reset();snowCatch.reset();document.body.dataset.phase=phase;completeStep(2,'NEW YORK · 도착했어요');document.querySelector('.step').textContent='03 / A WINTER IN NEW YORK';$('prompt').textContent='손안의 뉴욕에 도착했어요';$('hint').textContent=mode==='camera'?'고개로 둘러보고, 손바닥을 펴서 약 4초간 눈을 받아주세요. 눈이 가득 쌓이면 행운 카드가 열립니다.':'화면을 약 4초간 누르면 손에 눈이 쌓입니다. 눈 받기 테스트 버튼으로도 확인할 수 있어요.';$('catch-snow').hidden=mode!=='pointer';$('reset').textContent='처음으로 돌아가기';status('뉴욕의 겨울을 감상해보세요',true);}
  }
  if(phase==='city'){
    if(!cityArrivedAt)cityArrivedAt=now;
    if(now-cityArrivedAt>4000&&!document.body.classList.contains('city-settled')){
      document.body.classList.add('city-settled');
      $('hint').textContent=mode==='camera'?'고개로 둘러보기 · 한 손으로 4초간 눈 받기 → 행운 카드':'화면을 4초간 누르기 → 손에 눈 쌓기 → 행운 카드';
    }
  }
  if(phase==='city'){
    if(mode==='pointer'){receivingSnow=pointerHeld||testSnow;if(snowCatch.update(receivingSnow,time))showWish(...palmPoint);}
    else if(time-trackedAt>HAND_HOLD_SECONDS){receivingSnow=false;snowCatch.update(false,time);}
  }
  const preview=mode==='camera'&&(phase==='globe'||phase==='city')?getHandPreview(handPreviewPacket,audience,now):null;
  const handControllable=!!preview&&!preview.delayed&&trackedHand===preview.hand&&trackedAt===preview.timestamp/1000;
  updateGuide({mode,phase,handPreview:preview,handControllable,playTime:motion.playTime,globeFill:fillState?.globeFill||0,trackingHz:trackingSchedule.handHz(now),hand:time-trackedAt<=HAND_HOLD_SECONDS&&audience.allowed?trackedHand:null,held:motion.keepHeld,receiving:receivingSnow,progress:snowCatch.progress,point:palmPoint,test:testSnow});
  if(mode==='camera'&&(phase==='globe'||phase==='city')){
    if(!audience.selected)$('motion-title').textContent='어깨와 손이 카메라에 보이게 서주세요';
  }
  const showHand=!!preview;
  if(mode==='camera')webcamDebug.draw(now,{video:$('webcam'),allowed:audience.allowed,selected:audience.selected?.index,controlled:handControllable,delegates:tracker?.delegates,dropped:tracker?.metrics.dropped,paused:phase==='entering'});
  virtualCurl+=((pointerHeld&&phase==='globe'?1:0)-virtualCurl)*(1-Math.exp(-dt*16));
  const shownHand=showHand?preview.hand:mode==='pointer'&&(phase==='globe'||phase==='city')?pointerHand(...virtualPointer,virtualCurl,innerWidth/innerHeight):null;
  handOutline.hidden=!shownHand;handOutline.style.opacity=showHand&&!handControllable?'.45':'1';
  handOutline.dataset.state=showHand?(handControllable?'controlling':'preview'):shownHand?'pointer':'hidden';
  if(shownHand){
    const width=Math.min(960,innerWidth),height=Math.round(width*innerHeight/innerWidth),resized=handOutline.width!==width||handOutline.height!==height;
    if(resized){handOutline.width=width;handOutline.height=height;}
    if(resized||(mode==='camera'?outlinedAt!==preview?.timestamp:now-lastOutlineDraw>=32)){drawHandOutline([shownHand]);outlinedAt=preview?.timestamp;lastOutlineDraw=now;}
  }else outlinedAt=-Infinity;
  if(wishStartedAt!==null){const elapsed=now-wishStartedAt;if(elapsed>=19500)resetExperience();else if(elapsed>=18000)$('winter-wish').dataset.stage='fading';else if(elapsed>=2300&&$('winter-wish').dataset.stage!=='message'){$('winter-wish').dataset.stage='message';$('wish-message').textContent=WINTER_WISHES[lastWish].message;}else if(elapsed>=1400&&$('winter-wish').dataset.stage==='grow')$('winter-wish').dataset.stage='shimmer';}
  carol.update(dt,mode==='idle'?0:motion.energy,phase);carol.stir(phase==='globe'&&motion.keepHeld?motion.raw:0);scene?.update(dt,time,motion,travel);
  $('energy-bar').style.width=`${motion.energy*100}%`;document.querySelector('.meter').setAttribute('aria-valuenow',Math.round(motion.energy*100));$('bpm').textContent=carol.rate.toFixed(2);
  $('blizzard').style.opacity=phase==='entering'?transitionVeil(travel):0;
  drawStorm(time);drawWinter(dt,time);if(now>feedbackUntil)$('feedback').hidden=true;
  if(mode!=='idle'&&phase==='globe'){
    const holding=scene?.stats().holding;
    document.querySelector('.step').textContent=holding?'02 / SHAKE A LITTLE MAGIC':'01 / LIFT THE SNOWGLOBE';
    $('prompt').textContent=!milestones[0]?'손을 C자 모양으로 만들어 스노우볼을 잡아보세요':!holding?'손을 C자 모양으로 만들어 스노우볼을 다시 잡아주세요':motion.playTime<MIN_PLAY_SECONDS?'빠르게, 느리게 · 음악과 눈을 즐겨보세요':motion.strokes>0?'눈이 모이면 뉴욕으로 떠나요':motion.energy>.55?'스노우볼을 조금 더 빠르게 흔들어요':motion.energy>.12?'손끝에서 눈이 피어나요':'상하·좌우·원을 그리며 흔들어보세요';
  }
  requestAnimationFrame(frame);
}
requestAnimationFrame(frame);
// Read-only diagnostics for local verification; never stores camera frames.
window.snowglobe={getState:()=>({mode,phase,travel,energy:motion.energy,bpm:carol.bpm,playbackRate:carol.rate,burst:motion.burst,strokes:motion.strokes,playTime:motion.playTime,progress:milestones.filter(Boolean).length,modelLoaded:!!tracker?.delegates,bodyModelLoaded:!!tracker?.delegates?.body,faceModelLoaded:!!tracker?.delegates?.face,cameraActive:!!stream,handSeen:!!trackedHand,handTrackingHz:trackingSchedule.handHz(performance.now()),handSpeed:motion.inputSpeed,snowProgress:snowCatch.progress,...scene?.stats()} )};

// Explicit local verification controls: synthetic pointer input, never presented as webcam evidence.
if(new URLSearchParams(location.search).has('verify')){
 const bar=document.createElement('div');bar.style.cssText='position:fixed;top:120px;left:20px;z-index:99;background:#15251bd9;padding:8px';bar.id='verification-controls';
 for(const [label,action] of [
 ['들고 유지',()=>{demoTime=null;startPointer();pointerHeld=true;motion.keepHeld=true;motion.sample(.5,.5,performance.now()/1000);}],['내려놓기',()=>{demoTime=null;releasePointer();}],
 ['천천히 흔들기 검증',()=>{startPointer();demoFrequency=2;demoTime=performance.now()/1000;}],
 ['자동 흔들기 검증',()=>{startPointer();demoFrequency=10;demoTime=performance.now()/1000;}],
 ['왼쪽 위 보기',()=>scene.lookAt(0,0)],['오른쪽 아래 보기',()=>scene.lookAt(1,1)],
 ['정면 보기',()=>scene.lookAt(.5,.5)],['복귀 검증',()=>{demoTime=null;setMode('pointer');carol.reset();}]
 ]){const b=document.createElement('button');b.textContent=label;b.onclick=action;bar.append(b);}
 document.body.append(bar);
}
