const $=id=>document.getElementById(id);
import {MIN_PLAY_SECONDS} from './journey.mjs';
let introTimer;
export function showIntro(){
 clearTimeout(introTimer);$('intro').hidden=false;$('intro').classList.remove('opening');
 $('intro-camera').disabled=$('intro-pointer').disabled=false;
 for(const child of $('experience').children)if(child.id!=='intro')child.inert=true;
 $('intro-pointer').focus();
}
export function openIntro(){
 $('intro-camera').disabled=$('intro-pointer').disabled=true;$('intro').classList.add('opening');
 introTimer=setTimeout(()=>{$('intro').hidden=true;for(const child of $('experience').children)child.inert=false;$('scene').tabIndex=-1;$('scene').focus();},matchMedia('(prefers-reduced-motion: reduce)').matches?100:1500);
}
const connections=[[0,1,2,3,4],[0,5,6,7,8],[5,9,10,11,12],[9,13,14,15,16],[13,17,18,19,20],[0,17]];
for(let i=0;i<21;i++){const dot=document.createElementNS('http://www.w3.org/2000/svg','circle');dot.setAttribute('r','2');$('tracking-joints').append(dot);}
export function updateGuide({mode,phase,playTime=0,globeFill=0,trackingHz=0,hand,handPreview=null,handControllable=!!hand,held,receiving,progress,point,test}){
 const active=mode!=='idle'&&(phase==='globe'||phase==='city');$('motion-guide').hidden=!active;
 if(!active){$('snow-hand').hidden=true;return;}
 const camera=mode==='camera',seen=!!hand&&(!camera||handControllable),city=phase==='city',percent=Math.round((city?progress:globeFill)*100);
 $('tracking-mode').textContent=camera?(trackingHz?`손 분석 ${trackingHz}회/초`:'손 추적 준비'):'마우스 테스트';
 $('tracking-state').textContent=camera?(handPreview&&!handControllable?'○ 손 위치 표시 · 조작 대기':seen?'● 손 인식 중':'○ 손 감지 대기'):'● 마우스 연결됨';
 $('motion-guide').dataset.tracking=handControllable||!camera?'true':'false';$('tracking-map').style.display=seen?'':'none';
 if(seen){
  const xs=hand.map(p=>p.x),ys=hand.map(p=>p.y),cx=(Math.min(...xs)+Math.max(...xs))/2,cy=(Math.min(...ys)+Math.max(...ys))/2,scale=70/Math.max(.05,Math.max(...xs)-Math.min(...xs),Math.max(...ys)-Math.min(...ys));
  const points=hand.map(p=>[60-(p.x-cx)*scale,45+(p.y-cy)*scale]);
  $('tracking-lines').setAttribute('d',connections.map(chain=>chain.map((i,j)=>`${j?'L':'M'}${points[i].join(' ')}`).join(' ')).join(' '));
  [...$('tracking-joints').children].forEach((dot,i)=>{dot.setAttribute('cx',points[i][0]);dot.setAttribute('cy',points[i][1]);});
 }
 $('snow-progress').hidden=!city&&playTime<MIN_PLAY_SECONDS;
 $('snow-progress-label').textContent=city?'손에 쌓인 눈':'글로브 속 눈';
 $('snow-meter').setAttribute('aria-label',city?'손에 쌓인 눈':'글로브 속 눈 채움');
 $('motion-title').textContent=city?(receiving?'그대로 유지해 눈을 받아주세요':camera?'손바닥을 펴서 눈을 받아주세요':'화면을 4초간 눌러 눈을 받아주세요'):held?(playTime<MIN_PLAY_SECONDS?'편하게 흔들며 음악과 눈을 즐겨보세요':'눈이 가득 차도록 세게 흔들어주세요'):camera?'손을 스노우볼 위에 올려주세요':'스노우볼 위로 손을 옮겨 눌러주세요';
 if(camera&&handPreview&&!handControllable)$('motion-title').textContent=handPreview.delayed?'손 위치를 확인했어요 · 분석이 늦어 조작 대기 중':'손 위치를 확인했어요 · 조작 연결 중';
 $('motion-help').textContent=city?(camera?'손을 펴거나 살짝 오므린 채 약 4초 유지 → 행운 카드':test?'자동 눈 받기 테스트 중 · 다시 누르면 멈춥니다':'화면을 4초간 누르거나 아래 눈 받기 테스트를 누르세요'):(camera?'손을 펴면 내려놓습니다. 인식 중인 손 관절이 옆에 표시됩니다.':'화면을 누른 채 흔들어보세요. 놓으면 내려놓습니다.');
 $('snow-percent').textContent=`${percent}%`;$('snow-meter').setAttribute('aria-valuenow',percent);$('snow-meter').firstElementChild.style.width=`${percent}%`;
 for(const [id,on]of [['guide-hold',!city&&!held],['guide-shake',!city&&held],['guide-snow',city]])$(id).classList.toggle('current',on);
 $('snow-hand').hidden=!city||!(camera?seen:receiving||progress>0);
 $('snow-hand').style.left=`${Math.max(.16,Math.min(.84,point[0]))*100}%`;$('snow-hand').style.top=`${Math.max(.38,Math.min(.72,point[1]))*100}%`;
 $('snow-hand').dataset.receiving=String(receiving);
 $('palm-snow').style.opacity=String(Math.min(1,progress*5));$('palm-snow').style.transform=`translateY(${(1-progress)*22}px) scale(${.18+progress*.82})`;
 $('palm-caption').textContent=receiving?`눈을 받는 중 · ${percent}%`:'손바닥을 펴서 눈을 받아주세요';
}
