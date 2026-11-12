// Monocular range estimate: calibrate a single viewer at a measured 2.3 m mark.
// Face size is only a distance proxy, not a depth-camera measurement.
export const CALIBRATION_METERS=2.3,MAX_VIEWER_METERS=3;
function describe(points,index){
 if(!points?.length)return null;
 let x0=Infinity,y0=Infinity,x1=-Infinity,y1=-Infinity;
 for(const p of points){if(!Number.isFinite(p.x+p.y))return null;x0=Math.min(x0,p.x);x1=Math.max(x1,p.x);y0=Math.min(y0,p.y);y1=Math.max(y1,p.y);}
 // Face height changes less than width when the viewer turns to look around.
 const width=x1-x0,height=y1-y0,size=height;
 return size>.005?{index,points,x:(x0+x1)/2,y:(y0+y1)/2,width,height,size}:null;
}
export class AudienceGate {
 constructor(){this.reference=null;this.rangeLimited=false;this.reset();}
 reset(){this.faces=[];this.selected=null;this.allowed=false;this.distance=null;this.lastSeen=-Infinity;this.handAnchor=null;}
 calibrate(size){if(!Number.isFinite(size)||size<.015||size>.6)return false;this.reference=size;return true;}
 update(landmarks,time){
  const previous=this.selected;
  this.faces=landmarks.map(describe).filter(Boolean);
  let selected=this.faces.reduce((best,face)=>!best||face.size>best.size?face:best,null);
  // Avoid exchanging control when two similarly distant faces jitter in size.
  if(previous&&selected){const match=this.faces.find(f=>Math.hypot(f.x-previous.x,f.y-previous.y)<previous.size*.5);if(match&&selected.size<match.size*1.12)selected=match;}
  const changed=!!previous!==!!selected||!!(previous&&selected&&Math.hypot(previous.x-selected.x,previous.y-selected.y)>previous.size*.7);
  if(changed)this.handAnchor=null;
  this.selected=selected;this.distance=selected&&this.reference?CALIBRATION_METERS*this.reference/selected.size:null;
  this.allowed=!!selected&&(!this.rangeLimited||(this.distance!==null&&this.distance<=MAX_VIEWER_METERS+1e-6));
  if(selected)this.lastSeen=time;
  return {selected,allowed:this.allowed,changed,distance:this.distance};
 }
 handIndex(hands,time){
  if(!this.allowed||time-this.lastSeen>.35){this.handAnchor=null;return -1;}
  const candidates=[];
  for(const [index,hand] of hands.entries()){
   if(hand?.length!==21)continue;
   const wrist=hand[0],owners=[];
   for(const face of this.faces){const dx=(wrist.x-face.x)/face.size,dy=(wrist.y-face.y)/face.size;if(Math.abs(dx)>2.3||dy< -1.6||dy>4)continue;owners.push({face,score:dx*dx+Math.max(0,Math.abs(dy)-.8)**2*.3});}
   owners.sort((a,b)=>a.score-b.score);
   if(owners[0]?.face.index!==this.selected.index)continue;
   if(owners[1]&&owners[1].score<owners[0].score*1.25+.08)continue;
   const distance=this.handAnchor?Math.hypot(wrist.x-this.handAnchor.x,wrist.y-this.handAnchor.y):owners[0].score;
   candidates.push({index,wrist,distance});
  }
  candidates.sort((a,b)=>a.distance-b.distance);
  this.handAnchor=candidates[0]?.wrist||null;
  return candidates[0]?.index??-1;
 }
}
