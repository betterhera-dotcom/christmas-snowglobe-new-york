import * as THREE from './vendor/three.module.js';

// Sample only the authored ground snow, in the same coordinates as the flakes.
// Rasterizing once avoids raycasting thousands of flakes on every frame.
export function sampleSnowSurface(model){
 const size=49,min=-1.16,max=1.16,step=(max-min)/(size-1),heights=new Float32Array(size*size).fill(-Infinity);
 model.updateWorldMatrix(true,true);
 const inverse=model.matrixWorld.clone().invert(),a=new THREE.Vector3(),b=new THREE.Vector3(),c=new THREE.Vector3();
 model.traverse(o=>{
  if(!o.isMesh||o.material.name!=='Settled ground snow')return;
  const matrix=new THREE.Matrix4().multiplyMatrices(inverse,o.matrixWorld),p=o.geometry.attributes.position,index=o.geometry.index;
  for(let i=0;i<(index?index.count:p.count);i+=3){
   a.fromBufferAttribute(p,index?index.getX(i):i).applyMatrix4(matrix);
   b.fromBufferAttribute(p,index?index.getX(i+1):i+1).applyMatrix4(matrix);
   c.fromBufferAttribute(p,index?index.getX(i+2):i+2).applyMatrix4(matrix);
   if(Math.min(a.y,b.y,c.y)>1.1)continue;
   const den=(b.z-c.z)*(a.x-c.x)+(c.x-b.x)*(a.z-c.z);if(Math.abs(den)<1e-9)continue;
   const x0=Math.max(0,Math.ceil((Math.min(a.x,b.x,c.x)-min)/step)),x1=Math.min(size-1,Math.floor((Math.max(a.x,b.x,c.x)-min)/step));
   const z0=Math.max(0,Math.ceil((Math.min(a.z,b.z,c.z)-min)/step)),z1=Math.min(size-1,Math.floor((Math.max(a.z,b.z,c.z)-min)/step));
   for(let z=z0;z<=z1;z++)for(let x=x0;x<=x1;x++){
    const px=min+x*step,pz=min+z*step,u=((b.z-c.z)*(px-c.x)+(c.x-b.x)*(pz-c.z))/den,v=((c.z-a.z)*(px-c.x)+(a.x-c.x)*(pz-c.z))/den;
    if(u>=-1e-6&&v>=-1e-6&&u+v<=1.000001)heights[z*size+x]=Math.max(heights[z*size+x],u*a.y+v*b.y+(1-u-v)*c.y+.009);
   }
  }
 });
 for(let i=0;i<heights.length;i++)if(!Number.isFinite(heights[i]))heights[i]=.875;
 return {size,min,max,heights};
}
