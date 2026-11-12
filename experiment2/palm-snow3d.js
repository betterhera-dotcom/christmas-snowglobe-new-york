import * as THREE from './vendor/three.module.js';

// Individual powder clumps land in a shallow bed on the outlined palm.
// Deterministic positions keep the texture stable as tracking updates arrive.
export function createPalmSnow(){
 const group=new THREE.Group();group.position.set(-15,-43,12);
 let seed=1749;const random=()=>{seed=(Math.imul(seed,1664525)+1013904223)>>>0;return seed/4294967296;};
 // Soft, irregular powder patches join the landed grains without a hard rim.
 const canvas=document.createElement('canvas');canvas.width=128;canvas.height=128;
 const ctx=canvas.getContext('2d'),pixels=ctx.createImageData(128,128);
 for(let y=0;y<128;y++)for(let x=0;x<128;x++){
  const dx=(x-64)/60,dy=(y-64)/60,angle=Math.atan2(dy,dx);
  const edge=.84+.06*Math.sin(angle*5)+.04*Math.sin(angle*9+1.2);
  const coverage=Math.max(0,Math.min(1,(edge-Math.hypot(dx,dy))/.22));
  const alpha=coverage*coverage*(3-2*coverage),k=(y*128+x)*4;
  pixels.data[k]=244-7*Math.max(0,dy);pixels.data[k+1]=249-5*Math.max(0,dy);pixels.data[k+2]=252;pixels.data[k+3]=alpha*255;
 }
 ctx.putImageData(pixels,0,0);const texture=new THREE.CanvasTexture(canvas);texture.colorSpace=THREE.SRGBColorSpace;
 const patches=[];
 for(const [x,y,w,h,birth] of [[-4,0,48,31,.12],[-16,-4,34,24,.25],[12,-4,35,25,.34],[-6,10,35,24,.46],[12,8,30,23,.58],[-20,5,26,23,.69]]){
  const patch=new THREE.Mesh(new THREE.PlaneGeometry(w,h),new THREE.MeshBasicMaterial({map:texture,transparent:true,depthWrite:false,toneMapped:false}));
  patch.position.set(x,y,1);patch.userData.birth=birth;group.add(patch);patches.push(patch);
 }
 const count=1400,grains=new THREE.InstancedMesh(new THREE.IcosahedronGeometry(1,1),new THREE.MeshStandardMaterial({color:0xf4f8fa,roughness:1,metalness:0}),count);
 const transform=new THREE.Object3D(),color=new THREE.Color(),particles=[];
 for(let i=0;i<count;i++){
  const angle=random()*Math.PI*2,r=Math.sqrt(random()),x=Math.cos(angle)*r*34,y=Math.sin(angle)*r*20;
  const size=.28+random()*.72,z=3+7*(1-r*r)+random()*3;
  particles.push({x,y,z,size,angle:random()*6.28,birth:i/count*.94,drift:(random()-.5)*12,fall:28+random()*36});
  color.set(i%9===0?0xe6f0f5:i%3===0?0xf4f8fc:0xffffff);grains.setColorAt(i,color);
 }
 group.add(grains);grains.instanceMatrix.setUsage(THREE.DynamicDrawUsage);grains.frustumCulled=false;
 let lastProgress=-1;
 return {group,setProgress(value){
  const p=Number.isFinite(value)?Math.max(0,Math.min(1,value)):0;
  group.visible=p>0;if(p===lastProgress)return;lastProgress=p;
  for(const patch of patches){
   const amount=Math.max(0,Math.min(1,(p-patch.userData.birth)/.24));
   patch.visible=amount>0;patch.material.opacity=amount;patch.scale.setScalar(.6+.4*amount);
  }
  let visible=0;
  for(const particle of particles){
   const age=(p-particle.birth)/.06;if(age<=0)break;
   const arrival=Math.min(1,age),remaining=1-arrival;
   // Each new flake descends before joining the pile. No stretching a solid oval.
   transform.position.set(particle.x+particle.drift*remaining,particle.y+particle.fall*remaining,particle.z+4*remaining);
   transform.rotation.set(particle.angle,.3,particle.angle*.7);
   const size=particle.size*(1+remaining*.8)*Math.min(1,arrival*4);
   transform.scale.set(size,size*.75,size*.6);transform.updateMatrix();grains.setMatrixAt(visible++,transform.matrix);
  }
  grains.count=visible;grains.instanceMatrix.needsUpdate=true;
 }};
}
