import { createScene } from './scene.js';
import { ShakeMotion } from './motion.mjs';
import { Carol } from './audio.js';

const $=id=>document.getElementById(id),motion=new ShakeMotion(),carol=new Carol();
let scene,mode='idle',phase='globe',travel=0,tracker=null,stream=null,lastVideo=-1,lastDetection=0,lastHand=0,lastFrame=performance.now(),generation=0,starting=false;
const storm=$('storm-particles'),stormContext=storm.getContext('2d');
const streaks=Array.from({length:130},()=>({angle:Math.random()*Math.PI*2,offset:Math.random(),size:1+Math.random()*3}));
function drawStorm(time){
  if(storm.width!==innerWidth||storm.height!==innerHeight){storm.width=innerWidth;storm.height=innerHeight;}
  stormContext.clearRect(0,0,storm.width,storm.height);if(phase!=='entering')return;
  const fade=Math.sin(Math.PI*travel),radius=Math.hypot(storm.width,storm.height)*.7;
  stormContext.strokeStyle=`rgba(245,252,255,${fade*.9})`;stormContext.lineCap='round';
  for(const streak of streaks){const r=((streak.offset+time*.8)%1)**2*radius,length=(12+travel*100)*r/radius,x=storm.width/2+Math.cos(streak.angle)*r,y=storm.height/2+Math.sin(streak.angle)*r;stormContext.lineWidth=streak.size*(.5+r/radius);stormContext.beginPath();stormContext.moveTo(x,y);stormContext.lineTo(x+Math.cos(streak.angle)*length,y+Math.sin(streak.angle)*length);stormContext.stroke();}
}
function status(text,active=false){$('status').textContent=text;$('status-dot').classList.toggle('active',active);}
function error(text){$('error').textContent=text;$('error').hidden=!text;}
try{scene=createScene($('scene'));}catch(e){error('입체 화면을 시작하지 못했습니다. Chrome의 그래픽 가속 설정과 브라우저를 확인해주세요.');console.error(e);}
function stopCamera(){if(stream)stream.getTracks().forEach(track=>track.stop());stream=null;$('webcam').srcObject=null;$('camera-preview').removeAttribute('data-active');lastVideo=-1;}
function setMode(value){mode=value;phase='globe';travel=0;document.body.dataset.phase=phase;motion.reset();scene?.reset();$('reset').textContent='처음으로';document.querySelector('.step').textContent='01 / SHAKE THE SNOW';document.body.classList.toggle('active',value!=='idle');$('mode-label').textContent=value==='camera'?'카메라 체험':value==='pointer'?'마우스 체험':'시작을 기다리는 중';$('prompt').textContent=value==='idle'?'작은 겨울을 깨워보세요':'손끝에서 눈이 피어납니다';$('hint').textContent=value==='pointer'?'스노우볼 위에서 마우스를 빠르게 좌우로 흔들면 뉴욕 안으로 들어갑니다.': '한 손을 빠르게 좌우로 반복해서 흔들면 뉴욕 안으로 들어갑니다.';$('hand-cursor').hidden=true;lastHand=0;}
async function startCamera(){
  if(starting)return;const token=++generation;starting=true;$('camera').disabled=true;error('');stopCamera();setMode('idle');status('손 인식을 준비하고 있습니다…');
  try{
    await carol.start();
    if(!navigator.mediaDevices?.getUserMedia)throw new Error('LOCALHOST');
    if(!tracker){
      const {FilesetResolver,HandLandmarker}=await import('./vendor/mediapipe/vision_bundle.mjs');
      const vision=await FilesetResolver.forVisionTasks('./vendor/mediapipe/wasm');
      const options={baseOptions:{modelAssetPath:'./vendor/mediapipe/hand_landmarker.task',delegate:'GPU'},runningMode:'VIDEO',numHands:1,minHandDetectionConfidence:.6,minHandPresenceConfidence:.6,minTrackingConfidence:.6};
      try{tracker=await HandLandmarker.createFromOptions(vision,options);}catch{options.baseOptions.delegate='CPU';tracker=await HandLandmarker.createFromOptions(vision,options);}
    }
    if(token!==generation)return;
    const candidate=await navigator.mediaDevices.getUserMedia({audio:false,video:{facingMode:'user',width:{ideal:640},height:{ideal:480},frameRate:{ideal:30,max:30}}});
    if(token!==generation){candidate.getTracks().forEach(t=>t.stop());return;}
    stream=candidate;$('webcam').srcObject=stream;await $('webcam').play();
    if(token!==generation)return;
    stream.getVideoTracks()[0].addEventListener('ended',()=>{if(mode==='camera'){stopCamera();setMode('idle');carol.pause();status('카메라 연결이 끊어졌습니다');error('카메라를 연결하고 ‘카메라로 시작’을 다시 눌러주세요.');}});
    setMode('camera');$('camera-preview').dataset.active='true';status('카메라 앞에 한 손을 보여주세요');
  }catch(e){
    if(token!==generation)return;stopCamera();setMode('idle');await carol.pause();status('카메라를 시작하지 못했습니다');
    const messages={NotAllowedError:'카메라 권한이 필요합니다. Chrome 주소창의 카메라 설정에서 허용한 뒤 다시 시작해주세요.',NotFoundError:'연결된 카메라가 없습니다. 웹캠을 연결하거나 마우스로 먼저 체험해주세요.',NotReadableError:'다른 앱이 카메라를 사용 중일 수 있습니다. 카메라 사용 앱을 닫고 다시 시작해주세요.'};
    error(messages[e.name]||(e.message==='LOCALHOST'?'‘스노우볼 실행.command’로 열어주세요. 파일을 직접 열면 카메라 인식이 작동하지 않습니다.':'손 인식을 불러오지 못했습니다. 실행 창을 확인하거나 마우스로 먼저 체험해주세요.'));console.warn(e);
  }finally{starting=false;$('camera').disabled=false;}
}
$('camera').addEventListener('click',startCamera);
$('pointer').addEventListener('click',async()=>{generation++;stopCamera();setMode('pointer');error('');status('마우스를 좌우로 움직여주세요',true);try{await carol.start();}catch{error('소리를 시작하지 못했습니다. 소리 버튼을 눌러주세요.');}});
$('scene').addEventListener('pointermove',event=>{if(mode!=='pointer'||phase!=='globe')return;const r=$('scene').getBoundingClientRect();motion.sample((event.clientX-r.left)/r.width,(event.clientY-r.top)/r.height,performance.now()/1000);});
$('scene').addEventListener('pointerleave',()=>{if(mode==='pointer')motion.last=null;});
$('sound').addEventListener('click',async()=>{carol.mute(!carol.muted);$('sound').textContent=carol.muted?'소리 꺼짐':'소리 켜짐';$('sound').setAttribute('aria-pressed',String(carol.muted));if(mode!=='idle'&&!carol.muted)await carol.start();});
$('reset').addEventListener('click',()=>{generation++;stopCamera();setMode('idle');carol.pause();carol.reset();error('');status('카메라를 켜고 한 손을 보여주세요');});
$('fullscreen').addEventListener('click',async()=>{try{if(document.fullscreenElement)await document.exitFullscreen();else await document.documentElement.requestFullscreen();}catch{error('전체 화면은 Chrome 메뉴에서도 켤 수 있습니다.');}});
document.addEventListener('visibilitychange',()=>{if(document.hidden){motion.reset();carol.pause();}else if(mode!=='idle'){carol.start().catch(()=>{});lastFrame=performance.now();}});
window.addEventListener('pagehide',()=>{generation++;stopCamera();tracker?.close();carol.pause();});
function frame(now){
  const time=now/1000,dt=Math.min(.05,(now-lastFrame)/1000);lastFrame=now;
  if(phase==='globe'&&mode==='camera'&&tracker&&stream&&$('webcam').readyState>=2&&now-lastDetection>66&&$('webcam').currentTime!==lastVideo){
    lastDetection=now;lastVideo=$('webcam').currentTime;
    try{
      const result=tracker.detectForVideo($('webcam'),now),hand=result.landmarks[0];
      if(hand){
        const points=[hand[0],hand[5],hand[9],hand[13],hand[17]],x=1-points.reduce((s,p)=>s+p.x,0)/5,y=points.reduce((s,p)=>s+p.y,0)/5;
        motion.sample(x,y,time);lastHand=time;status('손을 인식하고 있어요',true);$('hand-cursor').hidden=false;$('hand-cursor').style.left=`${x*100}%`;$('hand-cursor').style.top=`${y*100}%`;
      }else{$('hand-cursor').hidden=true;status('손바닥이 카메라에 보이도록 들어주세요');}
    }catch(e){stopCamera();setMode('idle');carol.pause();error('손 인식이 중단되었습니다. 카메라로 시작을 다시 눌러주세요.');console.warn(e);}
  }
  motion.update(dt,time);
  if(phase==='globe'&&mode!=='idle'&&motion.burst>0){phase='entering';document.body.dataset.phase=phase;$('hand-cursor').hidden=true;$('prompt').textContent='스노우볼 속 뉴욕으로';$('hint').textContent='이제 손을 멈추고, 눈보라 너머를 바라보세요.';}
  if(phase==='entering'){
    travel=Math.min(1,travel+dt/3.6);
    if(travel===1){phase='city';document.body.dataset.phase=phase;document.querySelector('.step').textContent='02 / INSIDE NEW YORK';$('prompt').textContent='손안의 뉴욕에 도착했어요';$('hint').textContent='조금 전 유리구 안에 있던 트리와 건물 사이입니다.';$('reset').textContent='스노우볼로 돌아가기';status('뉴욕의 겨울을 감상해보세요',true);}
  }
  carol.update(dt,mode==='idle'||phase==='city'?0:motion.energy);scene?.update(dt,time,motion,travel);
  $('energy-bar').style.width=`${motion.energy*100}%`;$('bpm').textContent=Math.round(carol.bpm);
  $('blizzard').style.opacity=phase==='entering'?Math.max(0,Math.min(1,(travel-.15)/.35,(.96-travel)/.28)):0;
  drawStorm(time);
  if(mode!=='idle'&&phase==='globe')$('prompt').textContent=motion.strokes>0?`뉴욕으로 가는 중 · ${Math.min(4,motion.strokes)} / 4`:motion.energy>.55?'계속 좌우로 흔들어주세요':motion.energy>.12?'눈이 깨어나고 있어요':'손끝에서 눈이 피어납니다';
  requestAnimationFrame(frame);
}
requestAnimationFrame(frame);
// Read-only diagnostics for local verification; never stores camera frames.
window.snowglobe={getState:()=>({mode,phase,travel,energy:motion.energy,bpm:carol.bpm,burst:motion.burst,strokes:motion.strokes,modelLoaded:!!tracker,cameraActive:!!stream,handSeen:!!lastHand,...scene?.stats()} )};
