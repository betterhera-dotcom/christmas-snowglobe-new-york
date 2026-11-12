// Crop the selected viewer before model resizing. Coordinates remain in full-camera space.
const valid=p=>p&&Number.isFinite(p.x+p.y)&&(p.visibility??1)>=.5;
export function trackingRegion(kind,body,width,height){
 if(kind==='body'||!body||!width||!height)return null;
 const points=body.points,a=points?.[11],b=points?.[12];
 if(!valid(a)||!valid(b))return null;
 const span=Math.hypot((a.x-b.x)*width,(a.y-b.y)*height);
 if(span<8)return null;
 let cx,cy,size;
 if(kind==='face'){
  const nose=points[0];
  // A small/occluded nose must not disable the enlargement needed to recover a face.
  cx=valid(nose)?nose.x*width:(a.x+b.x)*width/2;
  cy=valid(nose)?nose.y*height:(a.y+b.y)*height/2-span*.5;
  size=span*(valid(nose)?1.5:1.8);
 }else{
  const cx0=(a.x+b.x)*width/2,cy0=(a.y+b.y)*height/2;
  const selected=[0,11,12,13,14,15,16,19,20].map(i=>points[i]).filter(valid);
  const xs=selected.map(p=>p.x*width),ys=selected.map(p=>p.y*height);
  const left=Math.min(cx0-span*1.4,...xs)-span*.3,right=Math.max(cx0+span*1.4,...xs)+span*.3;
  const top=Math.min(cy0-span*1.1,...ys)-span*.4,bottom=Math.max(cy0+span,...ys)+span*.4;
  cx=(left+right)/2;cy=(top+bottom)/2;size=Math.max(right-left,bottom-top);
 }
 // Close viewers with spread arms need the full wide camera image.
 if(kind==='hand'&&size>=Math.min(width,height))return null;
 size=Math.min(Math.max(64,Math.ceil(size)),width,height);
 const x=Math.max(0,Math.min(width-size,Math.round(cx-size/2))),y=Math.max(0,Math.min(height-size,Math.round(cy-size/2)));
 return {x,y,width:size,height:size,sourceWidth:width,sourceHeight:height};
}
export function restoreRegion(result,region){
 if(!region)return result;
 const {x,y,width,height,sourceWidth,sourceHeight}=region;
 const restore=shapes=>shapes?.map(points=>points.map(p=>({...p,x:(x+p.x*width)/sourceWidth,y:(y+p.y*height)/sourceHeight,z:p.z===undefined?undefined:p.z*width/sourceWidth})));
 return {...result,...(result.landmarks?{landmarks:restore(result.landmarks)}:{}),...(result.faceLandmarks?{faceLandmarks:restore(result.faceLandmarks)}:{})};
}

// Keep a fixed camera-space crop while VIDEO tracking follows the same viewer.
export class StableHandRegion {
 constructor(){this.reset();}
 reset(){this.region=undefined;this.width=0;this.height=0;}
 select(body,width,height){
  const next=trackingRegion('hand',body,width,height);
  if(this.region===undefined||width!==this.width||height!==this.height){this.region=next;this.width=width;this.height=height;}
  else if(!next)this.region=null;
  else if(this.region){
   const r=this.region;
   // Reframe only when the requested centre approaches the existing crop edge.
   const x=next.x+next.width/2,y=next.y+next.height/2;
   if(x<r.x+r.width*.2||x>r.x+r.width*.8||y<r.y+r.height*.2||y>r.y+r.height*.8||next.width>r.width*1.3)this.region=next;
  }
  return this.region;
 }
}
