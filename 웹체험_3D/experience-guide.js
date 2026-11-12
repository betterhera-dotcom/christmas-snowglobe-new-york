const $=id=>document.getElementById(id);
let introTimer;
export function showIntro(){
 clearTimeout(introTimer);$('intro').hidden=false;$('intro').classList.remove('opening');$('begin-journey').disabled=false;
 for(const child of $('experience').children)if(child.id!=='intro')child.inert=true;
 $('begin-journey').focus();
}
$('begin-journey').addEventListener('click',()=>{
 $('begin-journey').disabled=true;$('intro').classList.add('opening');
 introTimer=setTimeout(()=>{$('intro').hidden=true;for(const child of $('experience').children)child.inert=false;$('camera').focus();},matchMedia('(prefers-reduced-motion: reduce)').matches?100:1500);
});
const connections=[[0,1,2,3,4],[0,5,6,7,8],[5,9,10,11,12],[9,13,14,15,16],[13,17,18,19,20],[0,17]];
for(let i=0;i<21;i++){const dot=document.createElementNS('http://www.w3.org/2000/svg','circle');dot.setAttribute('r','2');$('tracking-joints').append(dot);}
export function updateGuide({mode,phase,hand,held,receiving,progress,point,test}){
 const active=mode!=='idle'&&(phase==='globe'||phase==='city');$('motion-guide').hidden=!active;
 if(!active){$('snow-hand').hidden=true;return;}
 const camera=mode==='camera',seen=!!hand,percent=Math.round(progress*100),city=phase==='city';
 $('tracking-mode').textContent=camera?'실시간 인식':'마우스 테스트';
 $('tracking-state').textContent=camera?(seen?'● 손 인식 중':'○ 얼굴과 손을 보여주세요'):'● 마우스 연결됨';
 $('motion-guide').dataset.tracking=seen||!camera?'true':'false';$('tracking-map').style.display=seen?'':'none';
 if(seen){
  const xs=hand.map(p=>p.x),ys=hand.map(p=>p.y),cx=(Math.min(...xs)+Math.max(...xs))/2,cy=(Math.min(...ys)+Math.max(...ys))/2,scale=70/Math.max(.05,Math.max(...xs)-Math.min(...xs),Math.max(...ys)-Math.min(...ys));
  const points=hand.map(p=>[60-(p.x-cx)*scale,45+(p.y-cy)*scale]);
  $('tracking-lines').setAttribute('d',connections.map(chain=>chain.map((i,j)=>`${j?'L':'M'}${points[i].join(' ')}`).join(' ')).join(' '));
  [...$('tracking-joints').children].forEach((dot,i)=>{dot.setAttribute('cx',points[i][0]);dot.setAttribute('cy',points[i][1]);});
 }
 $('snow-progress').hidden=!city;
 $('motion-title').textContent=city?(receiving?'좋아요, 손에 눈이 쌓이고 있어요':progress>0?'잠시 멈췄어요 · 손을 다시 펴주세요':'손바닥을 펴서 눈을 받아주세요'):held?'잡혔어요 · 상하좌우로 흔들어주세요':'손을 C자로 만들어 잡아주세요';
 $('motion-help').textContent=city?(camera?'손을 펴거나 살짝 오므린 채 약 4초 유지 → 행운 카드':test?'자동 눈 받기 테스트 중 · 다시 누르면 멈춥니다':'화면을 4초간 누르거나 아래 눈 받기 테스트를 누르세요'):(camera?'손을 펴면 내려놓습니다. 인식 중인 손 관절이 옆에 표시됩니다.':'화면을 누른 채 흔들어보세요. 놓으면 내려놓습니다.');
 $('snow-percent').textContent=`${percent}%`;$('snow-meter').setAttribute('aria-valuenow',percent);$('snow-meter').firstElementChild.style.width=`${percent}%`;
 for(const [id,on]of [['guide-hold',!city&&!held],['guide-shake',!city&&held],['guide-snow',city]])$(id).classList.toggle('current',on);
 $('snow-hand').hidden=!city||!(camera?seen:receiving||progress>0);
 $('snow-hand').style.left=`${Math.max(.16,Math.min(.84,point[0]))*100}%`;$('snow-hand').style.top=`${Math.max(.38,Math.min(.72,point[1]))*100}%`;
 $('snow-hand').dataset.receiving=String(receiving);
 $('palm-snow').style.opacity=String(Math.min(1,progress*5));$('palm-snow').style.transform=`translateY(${(1-progress)*22}px) scale(${.18+progress*.82})`;
 $('palm-caption').textContent=receiving?`눈을 받는 중 · ${percent}%`:'손바닥을 펴서 눈을 받아주세요';
}
