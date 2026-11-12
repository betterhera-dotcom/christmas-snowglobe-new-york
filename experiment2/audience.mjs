// Select the frontmost-looking body by projected shoulder span, not metric depth.
import {BODY_HOLD_SECONDS} from './tracking-policy.mjs';
import {ActiveHand} from './active-hand.mjs';
// Relative movement compensation only; no metre estimate or distance cutoff.
export function cameraMotionScale(size){
 if(!Number.isFinite(size)||size<=0)return 1;
 return .35/Math.max(.005,size);
}
const visible=p=>p&&Number.isFinite(p.x+p.y)&&p.x>=0&&p.x<=1&&p.y>=0&&p.y<=1&&(p.visibility??0)>=.5&&(p.presence??1)>=.5;
function describe(points,index){
 if(points?.length!==33||!visible(points[11])||!visible(points[12]))return null;
 const a=points[11],b=points[12],size=Math.hypot(a.x-b.x,a.y-b.y);
 // Neither the face landmarks nor legs need to be in the frame.
 if(size<.005)return null;
 return {index,points,size,x:(a.x+b.x)/2,y:(a.y+b.y)/2,wrists:[points[15],points[16]].filter(visible)};
}
export class AudienceGate {
 constructor(){this.reset();}
 reset(){this.bodies=[];this.selected=null;this.allowed=false;this.lastSeen=-Infinity;this.handAnchor=null;this.activeHand=new ActiveHand();}
 update(landmarks,time){
  const previous=time-this.lastSeen<=BODY_HOLD_SECONDS?this.selected:null;
  this.bodies=landmarks.map(describe).filter(Boolean);
  let selected=this.bodies.reduce((best,body)=>!best||body.size>best.size?body:best,null);
  // Detection order can change. Match by position/size, then retain the current
  // viewer while similarly sized candidates jitter; a clearly larger newcomer wins.
  const match=previous?this.bodies.filter(b=>Math.hypot(b.x-previous.x,b.y-previous.y)<previous.size*.65&&b.size/previous.size>.6&&b.size/previous.size<1.6)
   .sort((a,b)=>Math.hypot(a.x-previous.x,a.y-previous.y)/previous.size+Math.abs(Math.log(a.size/previous.size))*.25-(Math.hypot(b.x-previous.x,b.y-previous.y)/previous.size+Math.abs(Math.log(b.size/previous.size))*.25))[0]:null;
  if(match&&selected.size<match.size*1.12)selected=match;
  const changed=!!previous!==!!selected||!!(previous&&selected&&selected!==match);
  if(changed){this.handAnchor=null;this.activeHand.reset();}
  this.selected=selected;this.allowed=!!selected;
  if(selected)this.lastSeen=time;
  return {selected,allowed:this.allowed,changed};
 }
 ownsFace(points,time){
  if(!this.allowed||time-this.lastSeen>BODY_HOLD_SECONDS||!points?.length)return false;
  const xs=points.map(p=>p.x),ys=points.map(p=>p.y);
  const x=(Math.min(...xs)+Math.max(...xs))/2,y=(Math.min(...ys)+Math.max(...ys))/2;
  const owners=this.bodies.map(body=>{const head=visible(body.points[0])?body.points[0]:{x:body.x,y:body.y-body.size*.5};return {body,score:Math.hypot(x-head.x,y-head.y)/body.size};}).filter(o=>o.score<.8).sort((a,b)=>a.score-b.score);
  return owners[0]?.body===this.selected&&(!owners[1]||owners[1].score>owners[0].score*1.25+.08);
 }
 handIndex(hands,time,{remember=true,prefer,moving=false,held=false}={}){
  if(!this.allowed||time-this.lastSeen>BODY_HOLD_SECONDS){if(remember){this.handAnchor=null;this.activeHand.reset();}return -1;}
  const candidates=[];
  for(const [index,hand] of hands.entries()){
   if(hand?.length!==21||hand.some(p=>!p||!Number.isFinite(p.x+p.y)))continue;
   const wrist=hand[0];if(!wrist||!Number.isFinite(wrist.x+wrist.y))continue;
   const owners=[];
   for(const body of this.bodies){
    // Allow motion since the less-frequent body scan, but require a visible body wrist nearby.
    const score=Math.min(...body.wrists.map(p=>Math.hypot(wrist.x-p.x,wrist.y-p.y)/body.size));
    if(score<=1.25)owners.push({body,score});
   }
   owners.sort((a,b)=>a.score-b.score);
   const anchor=this.handAnchor;
   const continuing=(held||!remember)&&this.bodies.length===1&&this.selected.wrists.length>0&&anchor&&time>=anchor.t&&time-anchor.t<.4&&
    Math.hypot(wrist.x-anchor.x,wrist.y-anchor.y)<=this.selected.size*.9&&
    Math.abs(wrist.x-this.selected.x)<this.selected.size*2&&Math.abs(wrist.y-this.selected.y)<this.selected.size*2;
   if(owners[0]?.body.index!==this.selected.index&&!continuing)continue;
   if(owners[1]&&owners[1].score<owners[0].score*1.25+.08)continue;
   candidates.push({index,wrist,distance:this.handAnchor?Math.hypot(wrist.x-this.handAnchor.x,wrist.y-this.handAnchor.y):(owners[0]?.score??0)});
  }
  candidates.sort((a,b)=>a.distance-b.distance);
  if(!remember)return candidates[0]?.index??-1;
  const index=this.activeHand.select(candidates,time,{size:this.selected.size,prefer,moving});
  this.handAnchor=hands[index]?.[0]?{...hands[index][0],t:time}:null;
  return index;
 }
}
