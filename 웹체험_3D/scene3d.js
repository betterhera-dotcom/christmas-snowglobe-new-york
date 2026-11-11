import * as THREE from './vendor/three.module.js';
import {GLTFLoader} from './vendor/GLTFLoader.js';
import {RoomEnvironment} from './vendor/RoomEnvironment.js';
import {HeldPose} from './pose.mjs';
import {GlobeSnow} from './snow3d.mjs';
export function createScene(container){
 const renderer=new THREE.WebGLRenderer({antialias:true,alpha:true,powerPreference:'high-performance'});renderer.setPixelRatio(Math.min(devicePixelRatio,1.5));renderer.outputColorSpace=THREE.SRGBColorSpace;renderer.toneMapping=THREE.ACESFilmicToneMapping;renderer.toneMappingExposure=.90;container.append(renderer.domElement);
 const scene=new THREE.Scene(),camera=new THREE.PerspectiveCamera(36,1,.02,120);
 const environment=new RoomEnvironment(),pmrem=new THREE.PMREMGenerator(renderer);scene.environment=pmrem.fromScene(environment,.04).texture;environment.dispose();pmrem.dispose();
 scene.add(new THREE.HemisphereLight(0xd8eaff,0x806647,1.15));const key=new THREE.DirectionalLight(0xffe0b0,2.5);key.position.set(-3,6,5);scene.add(key);const rim=new THREE.DirectionalLight(0xb2d8ff,1.25);rim.position.set(3,4,-3);scene.add(rim);
 const pivot=new THREE.Group(),model=new THREE.Group();pivot.add(model);model.position.y=-1.5;pivot.position.y=1.5;scene.add(pivot);
 const pose=new HeldPose(),physics=new GlobeSnow(),clock={time:0};let loaded=false,error=null,look=0,lookY=0,targetLook=0,targetLookY=0,travelLast=0,frameMs=16,quality=1,lastTick=performance.now(),frameInterval=16;
 const groups={};const loader=new GLTFLoader();
 const ready=loader.loadAsync('./assets/3d/snowglobe.glb').then(gltf=>{
  model.add(gltf.scene);gltf.scene.traverse(o=>{if(o.isMesh){o.frustumCulled=true;o.castShadow=false;o.receiveShadow=false;
   const name=o.name;for(const kind of ['GLASS','BASE','CITY','TREES','PROPS'])if(name.startsWith(kind)){(groups[kind]||=[]).push(o);}
   const mats=Array.isArray(o.material)?o.material:[o.material];for(const m of mats){if(m.map)m.map.anisotropy=Math.min(4,renderer.capabilities.getMaxAnisotropy());m.envMapIntensity=.65;}
  }});
  // Thin optical shell: real volume, controlled reflections, no 2D deformation.
  for(const o of groups.GLASS||[])o.material=new THREE.MeshPhysicalMaterial({color:0xffffff,metalness:0,roughness:.09,transmission:.92,thickness:.008,ior:1.12,transparent:true,opacity:.09,depthWrite:false,side:THREE.FrontSide,envMapIntensity:.65});
  loaded=true;container.dataset.loaded='true';return true;
 }).catch(e=>{error=e.message;window.dispatchEvent(new CustomEvent('art-error',{detail:'3D 파일을 읽지 못했습니다. 실행기를 다시 열어주세요.'}));return false;});
 fetch('./assets/3d/colliders.json').then(r=>{if(!r.ok)throw Error('collision data');return r.json();}).then(b=>physics.boxes=b).catch(()=>{container.dataset.collisionWarning='true';});
 // Main particles share the miniature coordinate system and are occluded by actual buildings.
 const snowGeo=new THREE.BufferGeometry();snowGeo.setAttribute('position',new THREE.BufferAttribute(physics.p,3));
 const sizes=new Float32Array(physics.count);for(let i=0;i<sizes.length;i++)sizes[i]=.012+physics.depth[i]*.016;snowGeo.setAttribute('size',new THREE.BufferAttribute(sizes,1));
 const snowMat=new THREE.ShaderMaterial({transparent:true,depthWrite:false,uniforms:{opacity:{value:.88},pixelRatio:{value:renderer.getPixelRatio()}},
 vertexShader:'attribute float size;uniform float pixelRatio;varying float depth;void main(){vec4 mv=modelViewMatrix*vec4(position,1.);depth=-mv.z;gl_Position=projectionMatrix*mv;gl_PointSize=clamp(size*560.*pixelRatio/max(.1,-mv.z),1.5,28.);}',
 fragmentShader:'uniform float opacity;varying float depth;void main(){vec2 p=gl_PointCoord-.5;float r=length(p);float a=(1.-smoothstep(.28,.48,r))*opacity;if(a<.02)discard;gl_FragColor=vec4(.96,.97,.94,a);}'});
 const flakes=new THREE.Points(snowGeo,snowMat);model.add(flakes);
 // Contact shadow stays at the counter while the held globe lifts.
 const shadowTexture=document.createElement('canvas');shadowTexture.width=shadowTexture.height=128;const c=shadowTexture.getContext('2d'),grad=c.createRadialGradient(64,64,5,64,64,64);grad.addColorStop(0,'#00000088');grad.addColorStop(1,'#00000000');c.fillStyle=grad;c.fillRect(0,0,128,128);
 const shadow=new THREE.Mesh(new THREE.PlaneGeometry(3.8,3),new THREE.MeshBasicMaterial({map:new THREE.CanvasTexture(shadowTexture),transparent:true,depthWrite:false}));shadow.rotation.x=-Math.PI/2;shadow.position.y=.015;scene.add(shadow);
 // Surrounding streets are visible only after crossing the glass; the central city never swaps.
 const outer=new THREE.Group();scene.add(outer);outer.visible=false;
 const ground=new THREE.Mesh(new THREE.PlaneGeometry(120,120),new THREE.MeshStandardMaterial({color:0xe4e9e8,roughness:.95}));ground.rotation.x=-Math.PI/2;ground.position.y=.84;outer.add(ground);
 const street=new THREE.Mesh(new THREE.PlaneGeometry(1.2,45),new THREE.MeshStandardMaterial({color:0x7c8389,roughness:.6}));street.rotation.x=-Math.PI/2;street.position.set(-.4,.846,-4);outer.add(street);
 const architecture=new THREE.Group();outer.add(architecture);
 ready.then(ok=>{if(!ok)return;const city=model.getObjectByName('CITY');if(city)for(const [x,z,rotation] of [[-3,-2,0],[2.7,-2,0],[-3,-5,0],[2.7,-5,0],[-3,-8,0],[2.7,-8,0],[0,-10,Math.PI],[3,1,-Math.PI/2],[-3,1,Math.PI/2]]){const copy=city.clone();copy.traverse(o=>{if(o.isMesh&&o.material.name.startsWith('Snow')){const geometry=o.geometry.clone(),positions=geometry.attributes.position,index=geometry.index,keep=[];for(let n=0;n<index.count;n+=3){const a=index.getX(n),b=index.getX(n+1),c=index.getX(n+2);if(Math.max(positions.getY(a),positions.getY(b),positions.getY(c))>.90)keep.push(a,b,c);}geometry.setIndex(keep);o.geometry=geometry;}});copy.position.set(x,0,z);copy.rotation.y=rotation;architecture.add(copy);}
  const trees=model.getObjectByName('TREES');if(trees)for(const [x,z]of [[-2,-3],[2,-3]]){const copy=trees.clone();copy.position.set(x,0,z);outer.add(copy);}
 });
 const sky=new THREE.Mesh(new THREE.SphereGeometry(55,24,16),new THREE.MeshBasicMaterial({color:0x8c9eaf,side:THREE.BackSide,transparent:true,opacity:0,depthWrite:false}));scene.add(sky);
 const cityCount=700,cityPos=new Float32Array(cityCount*3),citySpeeds=new Float32Array(cityCount);for(let i=0;i<cityCount;i++){cityPos[i*3]=(Math.random()-.5)*22;cityPos[i*3+1]=.9+Math.random()*10;cityPos[i*3+2]=(Math.random()-.5)*24;citySpeeds[i]=.15+Math.random()*.4;}
 const cityGeo=new THREE.BufferGeometry();cityGeo.setAttribute('position',new THREE.BufferAttribute(cityPos,3));const citySize=new Float32Array(cityCount).fill(.018);cityGeo.setAttribute('size',new THREE.BufferAttribute(citySize,1));const citySnowMat=snowMat.clone();citySnowMat.uniforms.opacity.value=.8;const cityFlakes=new THREE.Points(cityGeo,citySnowMat);scene.add(cityFlakes);cityFlakes.visible=false;
 const startPos=new THREE.Vector3(0,2.55,8.5),endPos=new THREE.Vector3(-.20,1.13,1.12),startAim=new THREE.Vector3(0,1.60,0),endAim=new THREE.Vector3(-.10,1.40,-.42),aim=new THREE.Vector3(),inv=new THREE.Quaternion(),g=new THREE.Vector3(),v=new THREE.Vector3();
 const smooth=x=>x*x*(3-2*x);
 function resize(){const w=container.clientWidth,h=container.clientHeight;renderer.setSize(w,h);camera.aspect=w/h;camera.updateProjectionMatrix();startPos.z=camera.aspect<1?11.5:8.5;}
 addEventListener('resize',resize);resize();
 const api={canvas:renderer.domElement,ready,lookAt(x,y=.5){targetLook=THREE.MathUtils.clamp((x-.5)*2,-1,1);targetLookY=THREE.MathUtils.clamp((y-.5)*2,-1,1);},
 reset(){pose.reset();physics.reset();targetLook=targetLookY=look=lookY=travelLast=0;},
 update(dt,time,motion,travel=0){
  const tick=performance.now();frameInterval+=(tick-lastTick-frameInterval)*.05;lastTick=tick;clock.time=time;travelLast=travel;pose.update(dt,motion);const enter=smooth(Math.min(1,travel)),settle=1-smooth(Math.min(1,travel*2.2));
  pivot.position.set(pose.position[0]*settle,1.5+pose.position[1]*settle,pose.position[2]*settle);pivot.rotation.set(pose.rotation[0]*settle,pose.rotation[1]*settle,pose.rotation[2]*settle);
  inv.copy(pivot.quaternion).invert();g.set(0,-1,0).applyQuaternion(inv);v.set(...pose.velocity).applyQuaternion(inv);physics.update(dt,time,[v.x,v.y,v.z],[g.x,g.y,g.z]);snowGeo.attributes.position.needsUpdate=true;
  camera.position.lerpVectors(startPos,endPos,enter);aim.lerpVectors(startAim,endAim,enter);
  look+=(targetLook-look)*(1-Math.exp(-dt*3));lookY+=(targetLookY-lookY)*(1-Math.exp(-dt*3));
  if(travel>=1){const base=endAim.clone().sub(endPos),yaw=-look*.90,pitch=-lookY*.38;const euler=new THREE.Euler(pitch,yaw,0,'YXZ');base.applyEuler(euler);aim.copy(camera.position).add(base);}
  camera.lookAt(aim);camera.fov=36+enter*24;camera.updateProjectionMatrix();
  sky.material.opacity=THREE.MathUtils.smoothstep(travel,.55,.86);sky.visible=travel>.55;outer.visible=travel>.68;shadow.visible=travel<.5;
  for(const o of groups.GLASS||[])o.visible=travel<.84;
  for(const o of groups.BASE||[])o.visible=travel<.80;
  flakes.visible=travel<.92;cityFlakes.visible=travel>.68;
  if(cityFlakes.visible){for(let i=0;i<cityCount;i++){cityPos[i*3+1]-=dt*citySpeeds[i];cityPos[i*3]+=Math.sin(time*.3+i)*dt*.03;if(cityPos[i*3+1]<.87)cityPos[i*3+1]=9;}cityGeo.attributes.position.needsUpdate=true;}
  document.getElementById('shop').style.opacity=String(1-sky.material.opacity);
  const now=performance.now();renderer.render(scene,camera);frameMs+=(performance.now()-now-frameMs)*.03;
  if(frameMs>35&&quality===1){quality=.75;renderer.setPixelRatio(1);resize();snowMat.uniforms.pixelRatio.value=1;citySnowMat.uniforms.pixelRatio.value=1;}
  const stats=api.stats();container.dataset.state=JSON.stringify(stats);container.dataset.holding=String(pose.held);container.dataset.airborne=String(stats.airborne);
 },
 stats(){return {artMode:'3d-shared-city',artLoaded:loaded,error,holding:pose.held,inside:travelLast>=1,travel:travelLast,roll:pose.rotation[2],position:pose.position,...physics.stats(),drawCalls:renderer.info.render.calls,triangles:renderer.info.render.triangles,renderMs:Math.round(frameMs*10)/10,fps:Math.round(1000/Math.max(1,frameInterval)),quality};}
 };
 renderer.domElement.addEventListener('webglcontextlost',e=>{e.preventDefault();window.dispatchEvent(new CustomEvent('art-error',{detail:'그래픽 연결이 중단되었습니다. 새로고침해주세요.'}));});
 return api;
}
