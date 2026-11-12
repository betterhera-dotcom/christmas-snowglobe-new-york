import {openFingers,curledFingers,isCGrip} from './grip.mjs';

// A visible open palm must precede the catch; tracking gaps never count as a grip.
export class SnowCatch {
 constructor(){this.reset();}
 reset(){this.armed=false;this.openSince=null;this.closeSince=null;this.lastSeen=-Infinity;this.samples=0;}
 update(hand,time){
  if(!hand||hand.length!==21||hand.some(p=>!p||!Number.isFinite(p.x+p.y+(p.z??0)))){this.reset();return false;}
  if(time-this.lastSeen>.3)this.reset();
  this.lastSeen=time;
  if(openFingers(hand)>=3){
   this.closeSince=null;
   if(this.openSince===null){this.openSince=time;this.samples=0;}
   if(++this.samples>=3&&time-this.openSince>=.25)this.armed=true;
   return false;
  }
  this.openSince=null;
  if(this.armed&&(curledFingers(hand)>=3||isCGrip(hand))){
   if(this.closeSince===null){this.closeSince=time;this.samples=0;}
   if(++this.samples>=3&&time-this.closeSince>=.18){this.reset();return true;}
  }else{this.closeSince=null;this.samples=0;}
  return false;
 }
}

// Only consecutive, valid palm samples add snow. Missing tracking never fills it.
export class SnowCollection {
 constructor(){this.reset();}
 reset(){this.progress=0;this.lastTime=null;this.lastReceiving=false;this.lastReceived=-Infinity;this.receiving=false;}
 update(receiving,time){
  const gap=this.lastTime===null?0:Math.max(0,time-this.lastTime);
  this.receiving=!!receiving;
  if(receiving){
   if(this.lastReceiving&&gap<=.35)this.progress=Math.min(1,this.progress+gap/4);
   this.lastReceived=time;
  }else if(time-this.lastReceived>.8){this.progress=Math.max(0,this.progress-Math.min(gap,.15)/2);}
  this.lastTime=time;this.lastReceiving=!!receiving;
  return this.progress>=1;
 }
}
export function isReceivingSnow(hand){
 return !!hand&&hand.length===21&&hand.every(p=>p&&Number.isFinite(p.x+p.y+(p.z??0)))&&(openFingers(hand)>=3||isCGrip(hand));
}

export const WINTER_WISHES=[
 {title:'새로운 문이 열리는 운',message:'크리스마스의 작은 빛이\n새해의 새로운 문을 비춥니다.\n망설이던 첫걸음에 반가운 기회가 찾아올 거예요.',token:'행운의 열쇠 · 작은 용기'},
 {title:'반가운 인연이 찾아오는 운',message:'크리스마스의 온기가\n새해에는 새로운 인연으로 이어집니다.\n우연히 건넨 인사가 오래 남을 만남이 될 거예요.',token:'행운의 열쇠 · 먼저 건네는 인사'},
 {title:'소원이 가까워지는 운',message:'이 크리스마스에 품은 소원 하나가\n새해에는 한 걸음 더 가까워집니다.\n마음속에만 두었던 꿈에 작은 시작을 선물하세요.',token:'행운의 열쇠 · 종이에 적은 소원'},
 {title:'좋은 소식이 도착하는 운',message:'크리스마스의 별빛을 따라\n새해의 반가운 소식이 당신을 찾아옵니다.\n뜻밖의 순간에 환하게 웃을 일이 생길 거예요.',token:'행운의 열쇠 · 열린 마음'},
 {title:'다정함이 돌아오는 운',message:'올해 당신이 나눈 다정함을\n크리스마스의 눈이 기억하고 있습니다.\n새해에는 그 온기가 당신에게 돌아올 거예요.',token:'행운의 열쇠 · 고마운 사람에게 한마디'},
 {title:'당신의 빛이 발견되는 운',message:'크리스마스 트리의 별처럼\n새해에는 당신만의 빛이 눈에 띕니다.\n차곡차곡 쌓아온 노력이 반가운 응원을 만날 거예요.',token:'행운의 열쇠 · 꾸준히 좋아해 온 것'},
 {title:'기쁨이 자라나는 운',message:'크리스마스에 찾아온 작은 설렘이\n새해의 일상에 기쁨을 더합니다.\n익숙한 길에서도 새로운 즐거움을 발견할 거예요.',token:'행운의 열쇠 · 평소와 다른 작은 선택'},
 {title:'따뜻한 동행이 이어지는 운',message:'크리스마스의 포근한 불빛 아래\n새해를 함께할 마음들이 가까워집니다.\n소중한 사람과 나눌 이야기가 더 많아질 거예요.',token:'행운의 열쇠 · 함께 보내는 시간'}
];
export function nextWish(previous=-1,random=Math.random){
 const choices=WINTER_WISHES.map((_,i)=>i).filter(i=>i!==previous);
 return choices[Math.min(choices.length-1,Math.floor(random()*choices.length))];
}
