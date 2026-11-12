import {ENTRY_DURATION_MS,MIN_PLAY_SECONDS,transitionVeil} from './journey.mjs';
import { createScene } from './scene3d.js';
import { ShakeMotion } from './motion.mjs';
import { HeadLook } from './head-look.mjs';
import { Grip } from './grip.mjs';
import {SnowCollection,isReceivingSnow,WINTER_WISHES,nextWish} from './snow-wish.mjs';
import {AudienceGate} from './audience.mjs';
import { Carol } from './audio.js';
import {showIntro,updateGuide} from './experience-guide.js';

const $=id=>document.getElementById(id),motion=new ShakeMotion(),carol=new Carol(),grip=new Grip(),headLook=new HeadLook(),snowCatch=new SnowCollection();
let wristBase=0;let demoTime=null;
let pointerHeld=false;
let scene,mode='idle',phase='globe',travel=0,tracker=null,faceTracker=null,stream=null,lastVideo=-1,lastDetection=0,lastHand=0,lastFrame=performance.now(),generation=0,starting=false;
let milestones=[false,false,false],feedbackUntil=0,cityArrivedAt=0;
let entryStartedAt=0,wishStartedAt=null,lastWish=-1,pointerCatchAt=null,pointerCatchPoint=[.5,.5];
const audience=new AudienceGate();let detectHandNext=false,calibrationStart=null,calibrationSamples=[],distanceKey='';
let testSnow=false,trackedHand=null,trackedAt=-Infinity,receivingSnow=false,palmPoint=[.5,.66];
function releaseAudience(){trackedHand=null;receivingSnow=false;grip.reset();snowCatch.reset();motion.keepHeld=false;motion.release();headLook.reset();$('hand-cursor').hidden=true;}
function updateAudience(faces,now){
  const selection=audience.update(faces,now/1000);
  if(selection.changed||!selection.allowed)releaseAudience();
  if(calibrationStart!==null){
    const elapsed=now-calibrationStart;
    if(elapsed<7000)$('viewer-status').textContent=`${Math.ceil((7000-elapsed)/1000)}초 뒤 측정합니다. 혼자 카메라에서 2.3m 표시까지 이동해주세요.`;
    else if(elapsed<9000){$('viewer-status').textContent='2.3m 위치에서 정면을 보고 잠시 멈춰주세요.';if(audience.faces.length===1)calibrationSamples.push(audience.selected.size);else calibrationSamples=[];}
    else {
      const sorted=calibrationSamples.sort((a,b)=>a-b),median=sorted[Math.floor(sorted.length/2)],stable=sorted.length>=8&&sorted.at(-1)/sorted[0]<1.15;
      if(stable&&audience.calibrate(median)){try{localStorage.setItem(distanceKey,JSON.stringify({size:median}));}catch{}$('viewer-status').textContent='2.3m 기준을 저장했어요. 이 위치에서 편하게 체험하세요.';}
      else $('viewer-status').textContent='기준을 맞추지 못했어요. 한 사람만 정면을 보고 다시 시도해주세요.';
      calibrationStart=null;$('calibrate-distance').disabled=false;
    }
    $('viewer-calibration').dataset.ready='false';return;
  }
  $('viewer-calibration').dataset.ready=String(!!audience.reference);
  $('viewer-status').textContent=!audience.rangeLimited?(selection.selected?'테스트 모드 · 거리 제한 없이 한 분 조작 중':'테스트 모드 · 카메라에 얼굴과 손을 보여주세요'):!audience.reference?'먼저 2.3m 거리 기준을 맞춰주세요.':!selection.selected?'가장 가까운 관객을 기다리고 있어요.':!selection.allowed?'3m 안으로 다가와주세요 · 권장 위치 2.3m':'가장 가까운 한 분만 조작 중 · 권장 위치 2.3m';
  document.body.dataset.audience=JSON.stringify({testMode:!audience.rangeLimited,candidates:audience.faces.length,selected:selection.selected?.index??null,allowed:selection.allowed,estimatedMeters:selection.distance===null?null:Math.round(selection.distance*100)/100,calibrated:!!audience.reference});
}
$('distance-limit').addEventListener('change',()=>{audience.rangeLimited=$('distance-limit').checked;audience.reset();releaseAudience();calibrationStart=null;$('calibrate-distance').disabled=false;$('calibrate-distance').hidden=!audience.rangeLimited;});
$('calibrate-distance').addEventListener('click',()=>{if(mode!=='camera'||!stream)return;audience.reference=null;releaseAudience();calibrationStart=performance.now();calibrationSamples=[];$('calibrate-distance').disabled=true;});
function clearWish(){testSnow=false;receivingSnow=false;trackedHand=null;$('snow-hand').hidden=true;wishStartedAt=null;pointerCatchAt=null;snowCatch.reset();$('winter-wish').hidden=true;$('wish-message').textContent='';$('wish-title').textContent='';$('wish-token').textContent='';document.body.classList.remove('wish-active');$('catch-snow').disabled=false;$('catch-snow').textContent='눈 받기 테스트';}
function showWish(x=.5,y=.5){
  if(phase!=='city'||wishStartedAt!==null)return;
  phase='ending';document.body.dataset.phase=phase;pointerHeld=false;motion.keepHeld=false;motion.release();stopCamera();$('catch-snow').hidden=true;
  lastWish=nextWish(lastWish);wishStartedAt=performance.now();pointerCatchAt=null;snowCatch.reset();
  $('wish-title').textContent=WINTER_WISHES[lastWish].title;$('wish-token').textContent=WINTER_WISHES[lastWish].token;
  $('snow-hand').hidden=true;testSnow=false;
  const overlay=$('winter-wish');overlay.style.setProperty('--catch-x',`${x*100}%`);overlay.style.setProperty('--catch-y',`${y*100}%`);overlay.dataset.stage='shimmer';overlay.hidden=false;
  document.body.classList.add('wish-active');$('catch-snow').disabled=true;carol.effect('catch');
}
$('catch-snow').addEventListener('click',()=>{if(phase!=='city')return;testSnow=!testSnow;palmPoint=[.5,.64];$('catch-snow').textContent=testSnow?'눈 받기 멈추기':'눈 받기 테스트';});
$('wish-close').addEventListener('click',resetExperience);
showIntro();
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
function status(text,active=false){$('status').textContent=text;$('status-dot').classList.toggle('active',active);}
function error(text){$('error').textContent=text;$('error').hidden=!text;}
function loadingFailed(message){error(message);$('loading').hidden=false;$('loading-message').textContent=message;$('loading').querySelector('small').textContent='연결을 확인한 후 다시 불러와주세요.';$('retry-load').hidden=false;}
$('retry-load').addEventListener('click',()=>location.reload());
window.addEventListener('art-error',event=>loadingFailed(event.detail));
try{scene=createScene($('scene'));$('camera').disabled=$('pointer').disabled=$('reset').disabled=true;status('3D 스노우볼을 준비하고 있습니다…');scene.ready.then(ok=>{$('camera').disabled=$('pointer').disabled=$('reset').disabled=$('enter-city').disabled=!ok;$('scene').setAttribute('aria-busy','false');if(ok){$('loading').hidden=true;}else{loadingFailed('스노우볼을 불러오지 못했어요');}status(ok?'시작 방법을 선택해주세요':'3D 파일을 읽지 못했습니다');});}catch(e){loadingFailed('입체 화면을 시작하지 못했습니다. Chrome의 그래픽 가속 설정과 브라우저를 확인해주세요.');console.error(e);}
function stopCamera(){if(stream)stream.getTracks().forEach(track=>track.stop());stream=null;$('webcam').srcObject=null;$('camera-preview').removeAttribute('data-active');$('viewer-calibration').hidden=true;calibrationStart=null;audience.reset();lastVideo=-1;}
function setMode(value){
  audience.reset();detectHandNext=false;
  clearWish();$('catch-snow').hidden=true;
  cityArrivedAt=0;document.body.classList.remove('city-settled');
  mode=value;phase='globe';travel=0;document.body.dataset.phase=phase;motion.reset();grip.reset();headLook.reset();pointerHeld=false;motion.keepHeld=false;motion.gripRevision=0;motion.wristRoll=0;motion.pitch=0;scene?.reset();milestones=[false,false,false];
  questIds.forEach((id,i)=>{$(id).classList.remove('done');$(id).setAttribute('aria-label',`${questNames[i]}: 대기`);});$('quest-count').textContent='0';$('feedback').hidden=true;
  $('reset').textContent='처음으로';document.querySelector('.step').textContent='01 / LIFT THE SNOWGLOBE';document.body.classList.toggle('active',value!=='idle');
  $('mode-label').textContent=value==='camera'?'CAMERA':value==='pointer'?'TOUCH / MOUSE':'READY';$('prompt').textContent='손으로 작은 겨울을 들어보세요';
  $('hint').textContent=value==='pointer'?'마우스를 누른 채 천천히, 빠르게 흔들며 음악을 즐겨보세요. 충분히 즐긴 뒤 계속 흔들면 뉴욕으로 들어갑니다.':'손을 C자 모양으로 만들어 잡고 자유롭게 흔들어보세요. 손을 완전히 펴서 1초간 유지하면 내려놓습니다.';$('hand-cursor').hidden=true;lastHand=0;
}
async function startCamera(){
  if(starting||!scene?.stats().artLoaded)return;const token=++generation;starting=true;$('camera').disabled=true;error('');stopCamera();setMode('idle');status('손 인식을 준비하고 있습니다…');
  try{
    carol.start().catch(()=>{});
    if(!navigator.mediaDevices?.getUserMedia)throw new Error('LOCALHOST');
    if(!tracker){
      const {FilesetResolver,HandLandmarker}=await import('./vendor/mediapipe/vision_bundle.mjs');
      status('손 인식 엔진을 불러오고 있습니다…');
      const vision=await FilesetResolver.forVisionTasks('./vendor/mediapipe/wasm');
      const options={baseOptions:{modelAssetPath:'./vendor/mediapipe/hand_landmarker.task',delegate:'GPU'},runningMode:'VIDEO',numHands:4,minHandDetectionConfidence:.6,minHandPresenceConfidence:.6,minTrackingConfidence:.6};
      status('손 인식 모델을 준비하고 있습니다…');
      try{tracker=await HandLandmarker.createFromOptions(vision,options);}catch{options.baseOptions.delegate='CPU';tracker=await HandLandmarker.createFromOptions(vision,options);}
    }
    if(token!==generation)return;
    if(!faceTracker){
      status('고개 방향 인식을 준비하고 있습니다…');
      const {FilesetResolver,FaceLandmarker}=await import('./vendor/mediapipe/vision_bundle.mjs');
      const vision=await FilesetResolver.forVisionTasks('./vendor/mediapipe/wasm');
      const options={baseOptions:{modelAssetPath:'./vendor/mediapipe/face_landmarker.task',delegate:'GPU'},runningMode:'VIDEO',numFaces:4,minFaceDetectionConfidence:.5,minFacePresenceConfidence:.5,minTrackingConfidence:.5};
      try{faceTracker=await FaceLandmarker.createFromOptions(vision,options);}catch{options.baseOptions.delegate='CPU';faceTracker=await FaceLandmarker.createFromOptions(vision,options);}
    }
    if(token!==generation)return;
    status('Chrome 카메라 허용을 확인해주세요');
    const candidate=await navigator.mediaDevices.getUserMedia({audio:false,video:{facingMode:'user',width:{ideal:640},height:{ideal:480},frameRate:{ideal:30,max:30}}});
    if(token!==generation){candidate.getTracks().forEach(t=>t.stop());return;}
    stream=candidate;$('webcam').srcObject=stream;await $('webcam').play();
    if(token!==generation)return;
    stream.getVideoTracks()[0].addEventListener('ended',()=>{if(mode==='camera'){stopCamera();setMode('idle');carol.pause();status('카메라 연결이 끊어졌습니다');error('카메라를 연결하고 ‘카메라로 시작’을 다시 눌러주세요.');}});
    setMode('camera');$('camera-preview').dataset.active='true';$('viewer-calibration').hidden=false;$('calibrate-distance').disabled=false;
    const settings=stream.getVideoTracks()[0].getSettings();distanceKey=`snowglobe-range-2.3m-v1:${settings.deviceId||'default'}:${settings.width}x${settings.height}`;audience.reference=null;
    try{const saved=JSON.parse(localStorage.getItem(distanceKey));if(saved)audience.calibrate(saved.size);}catch{}
    status(audience.rangeLimited?'3m 이내에서 한 사람씩 체험해주세요 · 권장 2.3m':'테스트 모드 · 위치 제한 없이 체험해주세요');
  }catch(e){
    if(token!==generation)return;stopCamera();setMode('idle');await carol.pause();status('카메라를 시작하지 못했습니다');
    const messages={NotAllowedError:'카메라 권한이 필요합니다. Chrome 주소창의 카메라 설정에서 허용한 뒤 다시 시작해주세요.',NotFoundError:'연결된 카메라가 없습니다. 웹캠을 연결하거나 마우스로 먼저 체험해주세요.',NotReadableError:'다른 앱이 카메라를 사용 중일 수 있습니다. 카메라 사용 앱을 닫고 다시 시작해주세요.'};
    error(messages[e.name]||(e.message==='LOCALHOST'?'‘스노우볼 실행.command’로 열어주세요. 파일을 직접 열면 카메라 인식이 작동하지 않습니다.':'손 인식을 불러오지 못했습니다. 실행 창을 확인하거나 마우스로 먼저 체험해주세요.'));console.warn(e);
  }finally{if(token===generation){starting=false;$('camera').disabled=false;}}
}
$('camera').addEventListener('click',startCamera);
async function startPointer(){if(!scene?.stats().artLoaded)return;starting=false;$('camera').disabled=false;generation++;stopCamera();setMode('pointer');error('');status('마우스를 누른 채 움직여주세요',true);feedback('손을 C자 모양으로 만들어 스노우볼을 잡아보세요');try{await carol.start();}catch{error('소리를 시작하지 못했습니다. 소리 버튼을 눌러주세요.');}}
$('pointer').addEventListener('click',startPointer);
function enterCity(){
  detectHandNext=false;
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
$('scene').addEventListener('pointerdown',event=>{if(phase!=='globe'&&phase!=='city')return;if(mode==='idle'&&!starting)startPointer();if(mode==='pointer'){pointerHeld=true;$('scene').setPointerCapture(event.pointerId);if(phase==='city'){const r=$('scene').getBoundingClientRect();pointerCatchPoint=[(event.clientX-r.left)/r.width,(event.clientY-r.top)/r.height];palmPoint=pointerCatchPoint;pointerCatchAt=performance.now();testSnow=false;return;}motion.keepHeld=true;samplePointer(event);}});
$('scene').addEventListener('pointermove',samplePointer);
function releasePointer(){pointerCatchAt=null;if(mode==='camera')return;pointerHeld=false;motion.keepHeld=false;motion.release();}
$('scene').addEventListener('pointerup',releasePointer);
$('scene').addEventListener('pointercancel',releasePointer);
$('scene').addEventListener('lostpointercapture',releasePointer);
$('scene').addEventListener('pointerleave',()=>{if(mode==='pointer'&&!pointerHeld)motion.release();});
$('sound').addEventListener('click',async()=>{carol.mute(!carol.muted);$('sound').textContent=carol.muted?'소리 꺼짐':'소리 켜짐';$('sound').setAttribute('aria-pressed',String(carol.muted));feedback(carol.muted?'캐롤을 잠시 쉬어요':'캐롤이 다시 흘러요');if(mode!=='idle'&&!carol.muted)await carol.start();});
function resetExperience(){generation++;starting=false;$('camera').disabled=false;stopCamera();setMode('idle');carol.pause();carol.reset();error('');status('시작 방법을 선택해주세요');showIntro();}
$('reset').addEventListener('click',resetExperience);
$('fullscreen').addEventListener('click',async()=>{try{if(document.fullscreenElement)await document.exitFullscreen();else await document.documentElement.requestFullscreen();}catch{error('전체 화면은 Chrome 메뉴에서도 켤 수 있습니다.');}});
document.addEventListener('visibilitychange',()=>{if(document.hidden){motion.reset();carol.pause();pointerCatchAt=null;pointerHeld=false;testSnow=false;receivingSnow=false;snowCatch.reset();}else if(mode!=='idle'){carol.start().catch(()=>{});lastFrame=performance.now();if(phase==='entering')entryStartedAt=lastFrame-travel*ENTRY_DURATION_MS;}});
window.addEventListener('pagehide',()=>{generation++;stopCamera();tracker?.close();faceTracker?.close();carol.pause();});
function frame(now){
  const time=now/1000,dt=Math.min(.05,(now-lastFrame)/1000);lastFrame=now;
  if(demoTime!==null&&phase==='globe'){const t=time-demoTime;motion.keepHeld=true;motion.sample(.5+.19*Math.sin(t*10),.5+.10*Math.cos(t*8),time);if(t>32){demoTime=null;releasePointer();}}
  if(demoTime!==null&&phase==='city'){demoTime=null;releasePointer();}
  if(phase!=='entering'&&mode==='camera'&&tracker&&faceTracker&&stream&&$('webcam').readyState>=2&&now-lastDetection>60&&$('webcam').currentTime!==lastVideo){
    lastDetection=now;lastVideo=$('webcam').currentTime;
    try{
      // Alternate face/hand inference so both models do not stall the same frame.
      if(!detectHandNext||!audience.allowed||calibrationStart!==null){
        const result=faceTracker.detectForVideo($('webcam'),now);updateAudience(result.faceLandmarks,now);
        detectHandNext=audience.allowed&&calibrationStart===null;
        if(phase==='city'&&audience.allowed&&wishStartedAt===null){const horizontal=headLook.update(audience.selected.points);scene?.lookAt(horizontal,headLook.vertical);}
      }else{
      detectHandNext=false;
      const result=tracker.detectForVideo($('webcam'),now),index=audience.handIndex(result.landmarks,time),hand=result.landmarks[index];
      trackedHand=hand||null;trackedAt=time;
      if(phase==='city'){
        receivingSnow=isReceivingSnow(result.worldLandmarks?.[index]||hand);
        if(hand){const palm=[hand[0],hand[5],hand[9],hand[13],hand[17]];palmPoint=[1-palm.reduce((n,p)=>n+p.x,0)/5,palm.reduce((n,p)=>n+p.y,0)/5];}
        if(snowCatch.update(receivingSnow,time))showWish(...palmPoint);
      }else if(hand){
        const points=[hand[0],hand[5],hand[9],hand[13],hand[17]],x=1-points.reduce((s,p)=>s+p.x,0)/5,y=points.reduce((s,p)=>s+p.y,0)/5;
        const wasClosed=grip.closed,closed=grip.update(result.worldLandmarks?.[index]||hand,time);
        const wristAngle=Math.atan2(hand[9].y-hand[0].y,hand[9].x-hand[0].x);
        if(closed&&(!wasClosed||time-lastHand>.3))wristBase=wristAngle;
        if(closed&&wasClosed&&time-lastHand>.3)motion.gripRevision=(motion.gripRevision||0)+1;
        if(closed){motion.wristRoll=-Math.atan2(Math.sin(wristAngle-wristBase),Math.cos(wristAngle-wristBase));
          const points3D=result.worldLandmarks?.[index]||hand,palm=Math.hypot(points3D[9].x-points3D[0].x,points3D[9].y-points3D[0].y,points3D[9].z-points3D[0].z);
          motion.pitch=Math.max(-.65,Math.min(.65,(points3D[9].z-points3D[0].z)/Math.max(.001,palm)));
        }
        motion.keepHeld=closed;
        if(closed)motion.sample(x,y,time);else motion.release();lastHand=time;status(closed?'스노우볼을 잡고 있어요':'손을 C자 모양으로 만들어 스노우볼을 잡아주세요',closed);$('hand-cursor').hidden=phase==='city';$('hand-cursor').style.left=`${x*100}%`;$('hand-cursor').style.top=`${y*100}%`;
      }else{const held=grip.update(null,time);motion.keepHeld=held;if(!held)motion.release();$('hand-cursor').hidden=true;status(held?'잡은 상태를 유지하고 있어요 · 손을 보여주세요':'손이 카메라에 보이도록 들어주세요');}
      }
    }catch(e){stopCamera();setMode('idle');carol.pause();error('손 인식이 중단되었습니다. 카메라로 시작을 다시 눌러주세요.');console.warn(e);}
  }
  if(mode==='camera'&&phase!=='entering'&&(!audience.allowed||time-audience.lastSeen>.35))releaseAudience();
  motion.update(dt,time);
  if(phase==='globe'&&mode!=='idle'&&scene?.stats().holding){completeStep(0,'스노우볼을 들었어요');}
  if(phase==='globe'&&scene?.stats().holding&&motion.energy>.12)completeStep(1,'눈이 깨어났어요!');
  if(phase==='globe'&&mode!=='idle'&&motion.burst>0&&scene?.stats().holding)enterCity();
  if(phase==='entering'){
    travel=Math.min(1,(now-entryStartedAt)/ENTRY_DURATION_MS);
    if(travel===1){phase='city';pointerHeld=false;pointerCatchAt=null;testSnow=false;receivingSnow=false;headLook.reset();snowCatch.reset();document.body.dataset.phase=phase;completeStep(2,'NEW YORK · 도착했어요');document.querySelector('.step').textContent='03 / A WINTER IN NEW YORK';$('prompt').textContent='손안의 뉴욕에 도착했어요';$('hint').textContent=mode==='camera'?'고개로 둘러보고, 손바닥을 펴서 약 4초간 눈을 받아주세요. 눈이 가득 쌓이면 행운 카드가 열립니다.':'화면을 약 4초간 누르면 손에 눈이 쌓입니다. 눈 받기 테스트 버튼으로도 확인할 수 있어요.';$('catch-snow').hidden=mode!=='pointer';$('reset').textContent='처음으로 돌아가기';status('뉴욕의 겨울을 감상해보세요',true);}
  }
  if(phase==='city'){
    if(!cityArrivedAt)cityArrivedAt=now;
    if(now-cityArrivedAt>4000&&!document.body.classList.contains('city-settled')){
      document.body.classList.add('city-settled');
      $('hint').textContent=mode==='camera'?'손바닥을 펴고 4초간 눈 받기 → 가득 쌓이면 행운 카드':'화면을 4초간 누르기 → 손에 눈 쌓기 → 행운 카드';
    }
  }
  if(phase==='city'){
    if(mode==='pointer'){receivingSnow=pointerHeld||testSnow;if(snowCatch.update(receivingSnow,time))showWish(...palmPoint);}
    else if(time-trackedAt>.35){receivingSnow=false;snowCatch.update(false,time);}
  }
  updateGuide({mode,phase,hand:time-trackedAt<=.35&&audience.allowed?trackedHand:null,held:motion.keepHeld,receiving:receivingSnow,progress:snowCatch.progress,point:palmPoint,test:testSnow});
  if(wishStartedAt!==null){const elapsed=now-wishStartedAt;if(elapsed>=19500)resetExperience();else if(elapsed>=18000)$('winter-wish').dataset.stage='fading';else if(elapsed>=2300&&$('winter-wish').dataset.stage!=='message'){$('winter-wish').dataset.stage='message';$('wish-message').textContent=WINTER_WISHES[lastWish].message;}else if(elapsed>=1400&&$('winter-wish').dataset.stage==='grow')$('winter-wish').dataset.stage='shimmer';}
  carol.update(dt,mode==='idle'||phase==='city'?0:motion.energy);carol.stir(phase==='globe'?motion.energy:0);scene?.update(dt,time,motion,travel);
  $('energy-bar').style.width=`${motion.energy*100}%`;document.querySelector('.meter').setAttribute('aria-valuenow',Math.round(motion.energy*100));$('bpm').textContent=Math.round(carol.bpm);
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
window.snowglobe={getState:()=>({mode,phase,travel,energy:motion.energy,bpm:carol.bpm,burst:motion.burst,strokes:motion.strokes,playTime:motion.playTime,progress:milestones.filter(Boolean).length,modelLoaded:!!tracker,faceModelLoaded:!!faceTracker,cameraActive:!!stream,handSeen:!!trackedHand,snowProgress:snowCatch.progress,...scene?.stats()} )};

// Explicit local verification controls: synthetic pointer input, never presented as webcam evidence.
if(new URLSearchParams(location.search).has('verify')){
 const bar=document.createElement('div');bar.style.cssText='position:fixed;top:120px;left:20px;z-index:99;background:#15251bd9;padding:8px';bar.id='verification-controls';
 for(const [label,action] of [
 ['들고 유지',()=>{demoTime=null;startPointer();pointerHeld=true;motion.keepHeld=true;motion.sample(.5,.5,performance.now()/1000);}],['내려놓기',()=>{demoTime=null;releasePointer();}],
 ['자동 흔들기 검증',()=>{startPointer();demoTime=performance.now()/1000;}],
 ['왼쪽 위 보기',()=>scene.lookAt(0,0)],['오른쪽 아래 보기',()=>scene.lookAt(1,1)],
 ['정면 보기',()=>scene.lookAt(.5,.5)],['복귀 검증',()=>{demoTime=null;setMode('pointer');carol.reset();}]
 ]){const b=document.createElement('button');b.textContent=label;b.onclick=action;bar.append(b);}
 document.body.append(bar);
}
