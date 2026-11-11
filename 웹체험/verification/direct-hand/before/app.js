import { createScene } from './art-scene.js';
import { ShakeMotion } from './motion.mjs';
import { Carol } from './audio.js';

const $=id=>document.getElementById(id),motion=new ShakeMotion(),carol=new Carol();
let scene,mode='idle',phase='globe',travel=0,tracker=null,stream=null,lastVideo=-1,lastDetection=0,lastHand=0,lastFrame=performance.now(),generation=0,starting=false;
let milestones=[false,false,false],feedbackUntil=0;
const questNames=['요정 만나기','눈 깨우기','뉴욕 도착'],questIds=['quest-fairy','quest-snow','quest-city'];
function feedback(text){$('feedback').textContent=text;$('feedback').hidden=false;feedbackUntil=performance.now()+2300;}
function completeStep(index,text){if(milestones[index])return;milestones[index]=true;$(questIds[index]).classList.add('done');$(questIds[index]).setAttribute('aria-label',`${questNames[index]}: 완료`);$('quest-count').textContent=milestones.filter(Boolean).length;feedback(text);}
const winter=$('window-snow'),winterContext=winter.getContext('2d');
const outsideFlakes=Array.from({length:75},()=>({x:Math.random(),y:Math.random(),size:.6+Math.random()*1.8,speed:.015+Math.random()*.025}));
function drawWinter(dt,time){
  if(winter.width!==innerWidth||winter.height!==innerHeight){winter.width=innerWidth;winter.height=innerHeight;}
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
  stormContext.strokeStyle=`rgba(245,252,255,${fade*.9})`;stormContext.lineCap='round';
  for(const streak of streaks){const r=((streak.offset+time*.8)%1)**2*radius,length=(12+travel*100)*r/radius,x=storm.width/2+Math.cos(streak.angle)*r,y=storm.height/2+Math.sin(streak.angle)*r;stormContext.lineWidth=streak.size*(.5+r/radius);stormContext.beginPath();stormContext.moveTo(x,y);stormContext.lineTo(x+Math.cos(streak.angle)*length,y+Math.sin(streak.angle)*length);stormContext.stroke();}
}
function status(text,active=false){$('status').textContent=text;$('status-dot').classList.toggle('active',active);}
function error(text){$('error').textContent=text;$('error').hidden=!text;}
window.addEventListener('art-error',event=>error(event.detail));
try{scene=createScene($('scene'));}catch(e){error('입체 화면을 시작하지 못했습니다. Chrome의 그래픽 가속 설정과 브라우저를 확인해주세요.');console.error(e);}
function stopCamera(){if(stream)stream.getTracks().forEach(track=>track.stop());stream=null;$('webcam').srcObject=null;$('camera-preview').removeAttribute('data-active');lastVideo=-1;}
function setMode(value){
  mode=value;phase='globe';travel=0;document.body.dataset.phase=phase;motion.reset();scene?.reset();milestones=[false,false,false];
  questIds.forEach((id,i)=>{$(id).classList.remove('done');$(id).setAttribute('aria-label',`${questNames[i]}: 대기`);});$('quest-count').textContent='0';$('feedback').hidden=true;
  $('reset').textContent='처음으로';document.querySelector('.step').textContent='01 / MEET THE FAIRY';document.body.classList.toggle('active',value!=='idle');
  $('mode-label').textContent=value==='camera'?'CAMERA':value==='pointer'?'TOUCH / MOUSE':'READY';$('prompt').textContent='요정과 작은 겨울을 깨워보세요';
  $('hint').textContent=value==='pointer'?'화면 위에서 좌우로 움직여보세요. 넓고 빠르게 8~10초간 흔들면 뉴욕으로 떠나요.':'한 손을 좌우로 흔들어보세요. 충분히 흔들면 작은 겨울 속으로 들어갑니다.';$('hand-cursor').hidden=true;lastHand=0;
}
async function startCamera(){
  if(starting)return;const token=++generation;starting=true;$('camera').disabled=true;error('');stopCamera();setMode('idle');status('손 인식을 준비하고 있습니다…');
  try{
    carol.start().catch(()=>{});
    if(!navigator.mediaDevices?.getUserMedia)throw new Error('LOCALHOST');
    if(!tracker){
      const {FilesetResolver,HandLandmarker}=await import('./vendor/mediapipe/vision_bundle.mjs');
      status('손 인식 엔진을 불러오고 있습니다…');
      const vision=await FilesetResolver.forVisionTasks('./vendor/mediapipe/wasm');
      const options={baseOptions:{modelAssetPath:'./vendor/mediapipe/hand_landmarker.task',delegate:'GPU'},runningMode:'VIDEO',numHands:1,minHandDetectionConfidence:.6,minHandPresenceConfidence:.6,minTrackingConfidence:.6};
      status('손 인식 모델을 준비하고 있습니다…');
      try{tracker=await HandLandmarker.createFromOptions(vision,options);}catch{options.baseOptions.delegate='CPU';tracker=await HandLandmarker.createFromOptions(vision,options);}
    }
    if(token!==generation)return;
    status('Chrome 카메라 허용을 확인해주세요');
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
  }finally{if(token===generation){starting=false;$('camera').disabled=false;}}
}
$('camera').addEventListener('click',startCamera);
async function startPointer(){generation++;stopCamera();setMode('pointer');error('');status('마우스나 손가락을 좌우로 움직여주세요',true);feedback('요정에게 손짓해보세요');try{await carol.start();}catch{error('소리를 시작하지 못했습니다. 소리 버튼을 눌러주세요.');}}
$('pointer').addEventListener('click',startPointer);
function samplePointer(event){const r=$('scene').getBoundingClientRect(),x=(event.clientX-r.left)/r.width;if(phase==='city'){scene?.lookAt(x);return;}if(mode!=='pointer'||phase!=='globe')return;motion.sample(x,(event.clientY-r.top)/r.height,performance.now()/1000);}
$('scene').addEventListener('pointerdown',event=>{if(mode==='idle'&&!starting)startPointer();if(mode==='pointer'){$('scene').setPointerCapture(event.pointerId);samplePointer(event);}});
$('scene').addEventListener('pointermove',samplePointer);
$('scene').addEventListener('pointerup',event=>{if(event.pointerType==='touch')motion.last=null;});
$('scene').addEventListener('pointercancel',()=>{motion.last=null;});
$('scene').addEventListener('pointerleave',()=>{if(mode==='pointer')motion.last=null;});
$('sound').addEventListener('click',async()=>{carol.mute(!carol.muted);$('sound').textContent=carol.muted?'소리 꺼짐':'소리 켜짐';$('sound').setAttribute('aria-pressed',String(carol.muted));feedback(carol.muted?'캐롤을 잠시 쉬어요':'캐롤이 다시 흘러요');if(mode!=='idle'&&!carol.muted)await carol.start();});
$('reset').addEventListener('click',()=>{generation++;starting=false;$('camera').disabled=false;stopCamera();setMode('idle');carol.pause();carol.reset();error('');status('카메라를 켜고 한 손을 보여주세요');});
$('fullscreen').addEventListener('click',async()=>{try{if(document.fullscreenElement)await document.exitFullscreen();else await document.documentElement.requestFullscreen();}catch{error('전체 화면은 Chrome 메뉴에서도 켤 수 있습니다.');}});
document.addEventListener('visibilitychange',()=>{if(document.hidden){motion.reset();carol.pause();}else if(mode!=='idle'){carol.start().catch(()=>{});lastFrame=performance.now();}});
window.addEventListener('pagehide',()=>{generation++;stopCamera();tracker?.close();carol.pause();});
function frame(now){
  const time=now/1000,dt=Math.min(.05,(now-lastFrame)/1000);lastFrame=now;
  if(phase!=='entering'&&mode==='camera'&&tracker&&stream&&$('webcam').readyState>=2&&now-lastDetection>66&&$('webcam').currentTime!==lastVideo){
    lastDetection=now;lastVideo=$('webcam').currentTime;
    try{
      const result=tracker.detectForVideo($('webcam'),now),hand=result.landmarks[0];
      if(hand){
        const points=[hand[0],hand[5],hand[9],hand[13],hand[17]],x=1-points.reduce((s,p)=>s+p.x,0)/5,y=points.reduce((s,p)=>s+p.y,0)/5;
        if(phase==='city')scene?.lookAt(x);else motion.sample(x,y,time);lastHand=time;status('손을 인식하고 있어요',true);$('hand-cursor').hidden=phase==='city';$('hand-cursor').style.left=`${x*100}%`;$('hand-cursor').style.top=`${y*100}%`;
      }else{$('hand-cursor').hidden=true;status('손바닥이 카메라에 보이도록 들어주세요');}
    }catch(e){stopCamera();setMode('idle');carol.pause();error('손 인식이 중단되었습니다. 카메라로 시작을 다시 눌러주세요.');console.warn(e);}
  }
  motion.update(dt,time);
  if(phase==='globe'&&mode!=='idle'&&motion.last)completeStep(0,'요정이 날아오고 있어요');
  if(phase==='globe'&&scene?.stats().fairyHolding&&motion.energy>.12)completeStep(1,'눈이 깨어났어요!');
  if(phase==='globe'&&mode!=='idle'&&motion.burst>0&&scene?.stats().fairyHolding){phase='entering';document.body.dataset.phase=phase;$('hand-cursor').hidden=true;$('prompt').textContent='눈보라 너머, 뉴욕으로';$('hint').textContent='이제 손을 멈추고 작은 겨울 속으로 들어가요.';feedback('겨울 여행이 열립니다');}
  if(phase==='entering'){
    travel=Math.min(1,travel+dt/3.6);
    if(travel===1){phase='city';document.body.dataset.phase=phase;completeStep(2,'NEW YORK · 도착했어요');document.querySelector('.step').textContent='03 / A WINTER IN NEW YORK';$('prompt').textContent='손안의 뉴욕에 도착했어요';$('hint').textContent='손을 좌우로 움직여 뉴욕의 겨울을 둘러보세요.';$('reset').textContent='매장으로 돌아가기';status('뉴욕의 겨울을 감상해보세요',true);}
  }
  carol.update(dt,mode==='idle'||phase==='city'?0:motion.energy);scene?.update(dt,time,motion,travel);
  $('energy-bar').style.width=`${motion.energy*100}%`;document.querySelector('.meter').setAttribute('aria-valuenow',Math.round(motion.energy*100));$('bpm').textContent=Math.round(carol.bpm);
  $('blizzard').style.opacity=phase==='entering'?Math.max(0,Math.min(1,(travel-.15)/.35,(.96-travel)/.28)):0;
  drawStorm(time);drawWinter(dt,time);if(now>feedbackUntil)$('feedback').hidden=true;
  if(mode!=='idle'&&phase==='globe'){
    const holding=scene?.stats().fairyHolding;
    document.querySelector('.step').textContent=holding?'02 / SHAKE A LITTLE MAGIC':'01 / MEET THE FAIRY';
    $('prompt').textContent=!milestones[0]?'요정에게 손짓해보세요':!holding?'요정이 스노우볼로 날아가요':motion.strokes>0?'눈이 모이고 있어요 · 조금 더 흔들어주세요':motion.energy>.55?'요정과 조금 더 빠르게 흔들어요':motion.energy>.12?'요정의 손끝에서 눈이 피어나요':'요정과 함께 좌우로 흔들어보세요';
  }
  requestAnimationFrame(frame);
}
requestAnimationFrame(frame);
// Read-only diagnostics for local verification; never stores camera frames.
window.snowglobe={getState:()=>({mode,phase,travel,energy:motion.energy,bpm:carol.bpm,burst:motion.burst,strokes:motion.strokes,progress:milestones.filter(Boolean).length,modelLoaded:!!tracker,cameraActive:!!stream,handSeen:!!lastHand,...scene?.stats()} )};
