import * as THREE from './vendor/three.module.js';

// Recover individual bulbs/panes from joined mesh topology once at load time.
function components(geometry){
 const p=geometry.attributes.position,index=geometry.index,parent=Int32Array.from({length:p.count},(_,i)=>i),same=new Map();
 const root=i=>{while(parent[i]!==i){parent[i]=parent[parent[i]];i=parent[i];}return i;};
 const join=(a,b)=>{parent[root(a)]=root(b);};
 for(let i=0;i<p.count;i++){const key=[p.getX(i),p.getY(i),p.getZ(i)].map(v=>Math.round(v*1e6)).join(',');if(same.has(key))join(i,same.get(key));else same.set(key,i);}
 for(let i=0;i<(index?.count||p.count);i+=3){const a=index?index.getX(i):i,b=index?index.getX(i+1):i+1,c=index?index.getX(i+2):i+2;join(a,b);join(a,c);}
 const parts=new Map();for(let i=0;i<p.count;i++){const r=root(i);if(!parts.has(r))parts.set(r,{vertices:[],box:new THREE.Box3()});const part=parts.get(r);part.vertices.push(i);part.box.expandByPoint(new THREE.Vector3().fromBufferAttribute(p,i));}
 return [...parts.values()].map(part=>({...part,center:part.box.getCenter(new THREE.Vector3())}));
}
const hash=n=>{const x=Math.sin(n)*43758.5453;return x-Math.floor(x);};
export function decorateCityLights(art){
 const city=art.getObjectByName('CITY'),trees=art.getObjectByName('TREES'),rooms=[];let lit=0,dark=0,bulbs=0;
 city?.traverse(o=>{if(!o.isMesh||o.material.name!=='Warm shaded interior')return;for(const part of components(o.geometry)){
  const c=part.center;const building=hash(Math.round(c.x*4)*17+Math.round(c.z*4)*31);
  const on=hash(Math.round(c.x*100)*12.9898+Math.round(c.y*100)*78.233+Math.round(c.z*100)*37.719)>(.27+building*.23);
  const value=on?.65+hash(c.x*51+c.y*93+c.z*17)*.35:0;rooms.push({center:c,value});if(on)lit++;else dark++;
 }});
 city?.traverse(o=>{if(!o.isMesh||!['Warm shaded interior','Ivory curtain','Clear window glazing'].includes(o.material.name))return;
  o.geometry=o.geometry.clone();const values=new Float32Array(o.geometry.attributes.position.count);
  for(const part of components(o.geometry)){let nearest=null,distance=Infinity;for(const room of rooms){const d=part.center.distanceToSquared(room.center);if(d<distance){nearest=room;distance=d;}}for(const i of part.vertices)values[i]=nearest?.value||0;}
  o.geometry.setAttribute('roomLight',new THREE.BufferAttribute(values,1));const m=o.material.clone();
  m.onBeforeCompile=shader=>{shader.vertexShader='attribute float roomLight;varying float vRoomLight;\n'+shader.vertexShader;shader.vertexShader=shader.vertexShader.replace('#include <begin_vertex>','#include <begin_vertex>\nvRoomLight=roomLight;');shader.fragmentShader='varying float vRoomLight;\n'+shader.fragmentShader;
   shader.fragmentShader=shader.fragmentShader.replace('#include <color_fragment>','#include <color_fragment>\ndiffuseColor.rgb=mix(vec3(.008,.013,.022),diffuseColor.rgb*(.7+.3*vRoomLight),step(.01,vRoomLight));');
   shader.fragmentShader=shader.fragmentShader.replace('#include <emissivemap_fragment>','#include <emissivemap_fragment>\ntotalEmissiveRadiance*=vRoomLight*1.65;');};m.customProgramCacheKey=()=> 'room-occupancy-v1';o.material=m;
 });
 const canvas=document.createElement('canvas');canvas.width=canvas.height=64;const ctx=canvas.getContext('2d'),g=ctx.createRadialGradient(32,32,0,32,32,32);g.addColorStop(0,'rgba(255,242,200,.9)');g.addColorStop(.2,'rgba(255,213,129,.5)');g.addColorStop(.55,'rgba(255,176,61,.12)');g.addColorStop(1,'rgba(255,176,61,0)');ctx.fillStyle=g;ctx.fillRect(0,0,64,64);const texture=new THREE.CanvasTexture(canvas);texture.colorSpace=THREE.SRGBColorSpace;
 const bulbMeshes=[];trees?.traverse(o=>{if(o.isMesh&&o.material.name==='Warm window glass')bulbMeshes.push(o);});
 for(const mesh of bulbMeshes){const parts=components(mesh.geometry);bulbs+=parts.length;const positions=new Float32Array(parts.length*3);parts.forEach((p,i)=>p.center.toArray(positions,i*3));const geometry=new THREE.BufferGeometry();geometry.setAttribute('position',new THREE.BufferAttribute(positions,3));const halo=new THREE.Points(geometry,new THREE.PointsMaterial({map:texture,size:.10,color:0xffdb9a,transparent:true,opacity:.8,depthWrite:false,blending:THREE.AdditiveBlending,toneMapped:false}));halo.name='Christmas bulb halos';mesh.add(halo);mesh.material=mesh.material.clone();mesh.material.emissive.setHex(0xffcd83);mesh.material.emissiveIntensity=5;mesh.material.roughness=.3;
 }
 return {litWindows:lit,darkWindows:dark,christmasBulbs:bulbs};
}
