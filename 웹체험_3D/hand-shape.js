const fingers=[[0,1,2,3,4],[5,6,7,8],[9,10,11,12],[13,14,15,16],[17,18,19,20]];
// Round the finger segments into a translucent hand with a white silhouette.
export function createHandRenderer(canvas){
 const ctx=canvas.getContext('2d'),mask=document.createElement('canvas'),edge=document.createElement('canvas');
 const m=mask.getContext('2d'),e=edge.getContext('2d');
 return hands=>{
  const w=canvas.width,h=canvas.height;
  if(!w||!h)return; // A hidden/resizing viewport must not stop the animation loop.
  if(mask.width!==w||mask.height!==h){mask.width=edge.width=w;mask.height=edge.height=h;}
  ctx.clearRect(0,0,w,h);
  for(const hand of hands){
   if(hand.length!==21||hand.some(p=>!Number.isFinite(p.x+p.y)))continue;
   const p=hand.map(v=>({x:(1-v.x)*w,y:v.y*h}));
   const palm=Math.hypot(p[5].x-p[17].x,p[5].y-p[17].y),width=Math.max(3,palm*.20);
   m.clearRect(0,0,w,h);m.fillStyle=m.strokeStyle='#fff';m.lineCap=m.lineJoin='round';
   m.beginPath();[0,1,5,9,13,17].forEach((i,j)=>j?m.lineTo(p[i].x,p[i].y):m.moveTo(p[i].x,p[i].y));m.closePath();m.fill();m.lineWidth=width*.8;m.stroke();
   for(const [f,chain] of fingers.entries())for(let j=1;j<chain.length;j++){
    const a=p[chain[j-1]],b=p[chain[j]];m.lineWidth=width*(f===0?1.05:f===4?.75:1)*(1-(j-1)*.12);
    m.beginPath();m.moveTo(a.x,a.y);m.lineTo(b.x,b.y);m.stroke();
   }
   e.clearRect(0,0,w,h);e.globalCompositeOperation='source-over';
   for(const [x,y] of [[-1.5,0],[1.5,0],[0,-1.5],[0,1.5],[-1,-1],[1,1],[-1,1],[1,-1]])e.drawImage(mask,x,y);
   e.globalCompositeOperation='destination-out';e.drawImage(mask,0,0);e.globalCompositeOperation='source-over';
   ctx.globalAlpha=.13;ctx.drawImage(mask,0,0);ctx.globalAlpha=.95;ctx.drawImage(edge,0,0);ctx.globalAlpha=1;
   const center=[0,5,9,13,17].reduce((a,i)=>({x:a.x+p[i].x/5,y:a.y+p[i].y/5}),{x:0,y:0});
   ctx.strokeStyle='#ffffff90';ctx.lineWidth=1;ctx.beginPath();ctx.moveTo(center.x-6,center.y);ctx.lineTo(center.x+6,center.y);ctx.moveTo(center.x,center.y-6);ctx.lineTo(center.x,center.y+6);ctx.stroke();
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
