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
export async function decorateCityLights(art){
 const [atlas,stoneMap]=await Promise.all(['rooms-atlas.png','limestone-ashlar.png'].map(name=>new THREE.TextureLoader().loadAsync('./assets/window-interiors/'+name)));atlas.colorSpace=THREE.SRGBColorSpace;atlas.anisotropy=4;
 const city=art.getObjectByName('CITY'),trees=art.getObjectByName('TREES'),rooms=[];let lit=0,dark=0,bulbs=0;
 city?.traverse(o=>{if(!o.isMesh||o.material.name!=='Warm shaded interior')return;for(const part of components(o.geometry)){
  const c=part.center;const building=hash(Math.round(c.x*4)*17+Math.round(c.z*4)*31);
  const on=hash(Math.round(c.x*100)*12.9898+Math.round(c.y*100)*78.233+Math.round(c.z*100)*37.719)>(.27+building*.23);
  const value=on?.65+hash(c.x*51+c.y*93+c.z*17)*.35:0;rooms.push({center:c,value,box:part.box});if(on)lit++;else dark++;
 }});
 city?.traverse(o=>{if(!o.isMesh||!['Warm shaded interior','Ivory curtain','Clear window glazing'].includes(o.material.name))return;
  const interior=o.material.name==='Warm shaded interior',glazing=o.material.name==='Clear window glazing';
  if(glazing){o.material=new THREE.MeshPhysicalMaterial({color:0xb8cad6,transparent:true,opacity:.09,roughness:.21,metalness:.08,depthWrite:false,envMapIntensity:.3});o.castShadow=false;return;}
  o.geometry=o.geometry.clone();const p=o.geometry.attributes.position,uv=new Float32Array(p.count*2),colors=new Float32Array(p.count*3);
  for(const part of components(o.geometry)){let nearest=null,distance=Infinity;for(const room of rooms){const d=part.center.distanceToSquared(room.center);if(d<distance){nearest=room;distance=d;}}
   const on=(nearest?.value||0)>0,c=part.center,tile=hash(c.x*13+c.y*37+c.z*73)>.5?1:0;
   const width=Math.max(.001,part.box.max.x-part.box.min.x),height=Math.max(.001,part.box.max.y-part.box.min.y);
   for(const i of part.vertices){const u=(p.getX(i)-part.box.min.x)/width,v=(p.getY(i)-part.box.min.y)/height;
    // Cropped room view sits on the existing recessed back wall, behind real mullions.
    uv[i*2]=(tile+.04+u*.72)*.5;uv[i*2+1]=((on?1:0)+.015+v*.97)*.5;
    const brightness=on?1.12+(nearest.value-.65)*.3:.95;
    if(interior){colors.set([brightness,brightness,brightness],i*3);}else{colors.set(on?[.72,.66,.53]:[.18,.23,.29],i*3);}
   }
  }
  o.geometry.setAttribute('uv',new THREE.BufferAttribute(uv,2));o.geometry.setAttribute('color',new THREE.BufferAttribute(colors,3));
  o.material=interior?new THREE.MeshBasicMaterial({map:atlas,vertexColors:true,toneMapped:false}):new THREE.MeshStandardMaterial({color:0xffffff,vertexColors:true,roughness:.9});
 });
 // Recut limestone courses use the existing world-scaled UVs; brick stays untouched.
 stoneMap.colorSpace=THREE.SRGBColorSpace;stoneMap.wrapS=stoneMap.wrapT=THREE.RepeatWrapping;stoneMap.repeat.set(.8,.8);stoneMap.anisotropy=8;
 const stone=new THREE.MeshStandardMaterial({map:stoneMap,bumpMap:stoneMap,bumpScale:.0012,roughness:.9,color:0xe5e7e5});stone.name='AI aged cream limestone · ashlar';
 city?.traverse(o=>{if(o.isMesh&&/AI aged cream limestone|Weathered limestone relief/.test(o.material.name))o.material=stone;});
 const trimRooms=rooms.filter(r=>r.box.max.y-r.box.min.y<.1),trims=new THREE.InstancedMesh(new THREE.BoxGeometry(1,1,1),new THREE.MeshStandardMaterial({color:0xc4c5c1,roughness:.88}),trimRooms.length*5);
 const transform=new THREE.Object3D();let instance=0;
 for(const room of trimRooms){const c=room.center,w=room.box.max.x-room.box.min.x,h=room.box.max.y-room.box.min.y,z=room.box.max.z+.003;
  for(const [x,y,sx,sy,sz] of [[c.x-w/2-.003,c.y,.006,h+.012,.012],[c.x+w/2+.003,c.y,.006,h+.012,.012],[c.x,c.y+h/2+.003,w+.012,.006,.012],[c.x,c.y-h/2-.004,w+.018,.008,.022],[c.x,c.y,.002,h,.006]]){transform.position.set(x,y,z);transform.scale.set(sx,sy,sz);transform.updateMatrix();trims.setMatrixAt(instance++,transform.matrix);}
 }
 trims.name='Stone window reveals and sills';trims.castShadow=true;trims.receiveShadow=true;city?.add(trims);
 const canvas=document.createElement('canvas');canvas.width=canvas.height=64;const ctx=canvas.getContext('2d'),g=ctx.createRadialGradient(32,32,0,32,32,32);g.addColorStop(0,'rgba(255,242,200,.9)');g.addColorStop(.2,'rgba(255,213,129,.5)');g.addColorStop(.55,'rgba(255,176,61,.12)');g.addColorStop(1,'rgba(255,176,61,0)');ctx.fillStyle=g;ctx.fillRect(0,0,64,64);const texture=new THREE.CanvasTexture(canvas);texture.colorSpace=THREE.SRGBColorSpace;
 const bulbMeshes=[];trees?.traverse(o=>{if(o.isMesh&&o.material.name==='Warm window glass')bulbMeshes.push(o);});
 for(const mesh of bulbMeshes){const parts=components(mesh.geometry);bulbs+=parts.length;const positions=new Float32Array(parts.length*3);parts.forEach((p,i)=>p.center.toArray(positions,i*3));const geometry=new THREE.BufferGeometry();geometry.setAttribute('position',new THREE.BufferAttribute(positions,3));const halo=new THREE.Points(geometry,new THREE.PointsMaterial({map:texture,size:.10,color:0xffdb9a,transparent:true,opacity:.8,depthWrite:false,blending:THREE.AdditiveBlending,toneMapped:false}));halo.name='Christmas bulb halos';mesh.add(halo);mesh.material=mesh.material.clone();mesh.material.emissive.setHex(0xffcd83);mesh.material.emissiveIntensity=5;mesh.material.roughness=.3;
 }
 return {windowInteriorsLoaded:true,stoneFacadeLoaded:true,stoneWindowFrames:trimRooms.length,litWindows:lit,darkWindows:dark,christmasBulbs:bulbs};
}
