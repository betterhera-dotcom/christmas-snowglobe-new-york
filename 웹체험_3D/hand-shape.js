import {createHandArt} from './hand-art.js';
const fingers=[[0,1,2,3,4],[5,6,7,8],[9,10,11,12],[13,14,15,16],[17,18,19,20]];
// Use the same artwork as the city hand; landmarks still control its position.
export function createHandRenderer(canvas){
 const ctx=canvas.getContext('2d'),art=createHandArt({lineWidth:1.8,edgeWidth:3.6});
 return hands=>{
  const w=canvas.width,h=canvas.height;if(!w||!h)return;
  ctx.clearRect(0,0,w,h);
  const displayWidth=canvas.clientWidth||w,ratio=w/displayWidth,displayHeight=h/ratio;
  const scale=Math.min(displayWidth*.48,displayHeight*.58,displayWidth<=650?250:400)*.72*ratio/260;
  for(const hand of hands){
   if(hand?.length!==21||hand.some(p=>!p||!Number.isFinite(p.x+p.y)))continue;
   const center=[0,5,9,13,17].reduce((a,i)=>({x:a.x+(1-hand[i].x)*w/5,y:a.y+hand[i].y*h/5}),{x:0,y:0});
   ctx.drawImage(art,center.x-120*scale,center.y-180*scale,240*scale,320*scale);
  }
 };
}
const open=[[.53,.81,0],[.62,.70,0],[.69,.61,-.01],[.75,.56,-.02],[.80,.52,-.03],[.60,.53,0],[.62,.39,0],[.64,.29,0],[.65,.22,0],[.51,.50,0],[.51,.33,0],[.51,.23,0],[.51,.16,0],[.43,.53,0],[.42,.37,0],[.41,.28,0],[.40,.22,0],[.36,.58,0],[.33,.47,0],[.31,.39,0],[.30,.33,0]];
export function pointerHand(x,y,curl,aspect){
 return open.map(([px,py,pz],i)=>{
  const f=fingers.findIndex(c=>c.includes(i)),chain=f<0?[]:fingers[f],joint=chain.indexOf(i);
  if(joint>0){const base=open[chain[0]],bend=joint/(chain.length-1);py+=(base[1]-.05-py)*curl*bend;pz-=.22*curl*bend;if(f===0)px-=(px-.64)*curl*bend;}
  return {x:1-x+(px-.5)*.5/aspect,y:y+(py-.60)*.5,z:pz*.5/aspect};
 });
}
