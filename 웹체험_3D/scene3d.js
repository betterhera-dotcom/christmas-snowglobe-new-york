import {createVirtualHand} from './receiving-natural-hand.js?pose=lite-v2';
import {flattenDistantObject} from './city-impostor.js';
import * as THREE from './vendor/three.module.js';
import {GLTFLoader} from './vendor/GLTFLoader.js';
import {RoomEnvironment} from './vendor/RoomEnvironment.js';
import {decorateCityLights,varyCityWindows,separateGlobeRailing} from './city-lighting.js';
import {HeldPose} from './pose.mjs?follow=fast-v16';
import {GlobeSnow} from './snow3d.mjs';
import {createLiteSnow} from './lite-snow.js';
import {sampleSnowSurface} from './snow-surface.js';
export function createScene(container){
 const renderer=new THREE.WebGLRenderer({antialias:true,alpha:true,powerPreference:'high-performance'});renderer.setPixelRatio(Math.min(devicePixelRatio,1));renderer.outputColorSpace=THREE.SRGBColorSpace;renderer.toneMapping=THREE.ACESFilmicToneMapping;renderer.toneMappingExposure=.88;renderer.shadowMap.enabled=false;renderer.shadowMap.type=THREE.PCFSoftShadowMap;container.append(renderer.domElement);
 const virtualHand=createVirtualHand();
 const scene=new THREE.Scene(),camera=new THREE.PerspectiveCamera(36,1,.02,120);
 const environment=new RoomEnvironment(),pmrem=new THREE.PMREMGenerator(renderer);scene.environment=pmrem.fromScene(environment,.04).texture;environment.dispose();pmrem.dispose();
 scene.add(new THREE.HemisphereLight(0xd8eaff,0x806647,.72));const key=new THREE.DirectionalLight(0xffe0b0,2.8);key.position.set(-3,6,5);key.castShadow=true;key.shadow.mapSize.set(2048,2048);Object.assign(key.shadow.camera,{left:-6,right:6,top:6,bottom:-5,near:.1,far:20});key.shadow.bias=-.00025;key.shadow.normalBias=.012;key.shadow.radius=3;scene.add(key);const rim=new THREE.DirectionalLight(0xb2d8ff,.65);rim.position.set(3,4,-3);scene.add(rim);
 const pivot=new THREE.Group(),model=new THREE.Group();pivot.add(model);model.position.y=-1.5;pivot.position.y=1.5;scene.add(pivot);
 const liquid={ready:Promise.resolve(true),setTravel(){},stats:()=>({liquidLoaded:false,liquidVisible:false})};
 const liteSnow=createLiteSnow();model.add(liteSnow.mesh);let physicsMs=0,statsAt=-Infinity,snowStats={};
 const pose=new HeldPose(),physics=new GlobeSnow(3000,Math.random,{maxSubsteps:2}),clock={time:0};let loaded=false,shopLoaded=false,error=null,baseMin=.02,baseBounds=null,contactGap=0,materialMaps=0,look=0,lookY=0,targetLook=0,targetLookY=0,travelLast=0,frameMs=16,quality=1,slowRenderSeconds=0,renderedFrames=0,lastTick=performance.now(),frameInterval=16;
 function tuneMaterial(m){if(m.map)m.map.anisotropy=Math.min(8,renderer.capabilities.getMaxAnisotropy());m.envMapIntensity=.55;if(/limestone/i.test(m.name))m.color.setRGB(.68,.61,.49);if(/walnut|timber|wood/i.test(m.name))m.color.setRGB(.48,.32,.19);if(m.name.startsWith('SHOP cloth binding')){const c=[[.16,.027,.035],[.035,.10,.065],[.24,.16,.065],[.045,.07,.10]][Number(m.name.slice(-1))]||[.1,.07,.04];m.color.setRGB(...c);}if(/Snow/.test(m.name))m.color.setRGB(.88,.92,.97);}
 const transitionFrames=[];let previousTick=0,shadowPhase=-1;
 let cityLightStats={};
 const lanternMaterials=[];let globeRailing=[];
 const groups={};const loader=new GLTFLoader();
 const globeReady=loader.loadAsync('./assets/3d/snowglobe.glb').then(async gltf=>{
  model.add(gltf.scene);gltf.scene.traverse(o=>{if(o.isMesh){o.frustumCulled=true;o.castShadow=true;o.receiveShadow=true;if(o.name.startsWith('TREES'))o.castShadow=false;
   for(const kind of ['GLASS','BASE','CITY','TREES','PROPS']){let parent=o;while(parent&&!parent.name.startsWith(kind))parent=parent.parent;if(parent){(groups[kind]||=[]).push(o);if(kind==='TREES')o.castShadow=false;}}
   const mats=Array.isArray(o.material)?o.material:[o.material];for(const m of mats){if(m.map)m.map.anisotropy=Math.min(4,renderer.capabilities.getMaxAnisotropy());tuneMaterial(m);if(m.normalMap)materialMaps++;}
   if(mats.some(m=>m.name==='Winter paving'||m.name==='Snow-covered ground'))o.castShadow=false;
  }});
  for(const o of groups.PROPS||[]){const array=Array.isArray(o.material),materials=array?o.material:[o.material];const tuned=materials.map(m=>{if(m.name!=='Warm window glass')return m;const lit=m.clone();lit.emissive.setHex(0xffd5a0);lit.emissiveIntensity=1.4;lit.roughness=.35;lanternMaterials.push(lit);return lit;});o.material=array?tuned:tuned[0];}
  physics.surface=sampleSnowSurface(model);physics.reset();
  cityLightStats=await decorateCityLights(gltf.scene);
  globeRailing=separateGlobeRailing(groups.PROPS||[]);
  // Thin optical shell: real volume, controlled reflections, no 2D deformation.
  for(const o of groups.GLASS||[])o.material=new THREE.ShaderMaterial({transparent:true,depthWrite:false,side:THREE.FrontSide,
   vertexShader:`varying vec3 n;varying vec3 eye;void main(){vec4 p=modelViewMatrix*vec4(position,1.);n=normalize(normalMatrix*normal);eye=normalize(-p.xyz);gl_Position=projectionMatrix*p;}`,
   fragmentShader:`varying vec3 n;varying vec3 eye;void main(){float rim=pow(1.-abs(dot(normalize(n),normalize(eye))),2.5);gl_FragColor=vec4(.88,.95,1.,.012+rim*.26);}`});
  for(const o of groups.GLASS||[])o.castShadow=false;const base=model.getObjectByName('BASE');if(base){baseBounds=new THREE.Box3().setFromObject(base);baseMin=baseBounds.min.y-(pivot.position.y+model.position.y);model.position.y=-1.5-baseMin;}return true;
 }).catch(e=>{error=e.message;window.dispatchEvent(new CustomEvent('art-error',{detail:'3D 파일을 읽지 못했습니다. 실행기를 다시 열어주세요.'}));return false;});

 const shop=new THREE.Group();scene.add(shop);
 const shopReady=Promise.resolve(true);shopLoaded=true;
 const collisionReady=fetch('./assets/3d/colliders.json').then(r=>{if(!r.ok)throw Error('collision data');return r.json();}).then(b=>{physics.boxes=b;return true;}).catch(()=>{container.dataset.collisionWarning='true';return true;});
 const modelReady=Promise.all([globeReady,shopReady,liquid.ready,collisionReady]).then(results=>{physics.reset();document.getElementById('shop').style.display='';document.getElementById('window-snow').style.display='none';return results.every(Boolean);});
 // Warm fixtures in the shop are anchored in the same real 3D room.
 for(const x of [-3.8,3.8]){const lamp=new THREE.PointLight(0xffb763,6,9,2);lamp.position.set(x,3,-1.6);shop.add(lamp);}
 // Local lantern light, with small depth-tested halos; no full-screen bloom pass.
 const lanternHalos=[];const lanterns=new THREE.Group();model.add(lanterns);lanterns.visible=false;
 const glowCanvas=document.createElement('canvas');glowCanvas.width=glowCanvas.height=128;
 const glowContext=glowCanvas.getContext('2d'),glowGradient=glowContext.createRadialGradient(64,64,0,64,64,64);
 glowGradient.addColorStop(0,'rgba(255,235,183,.65)');glowGradient.addColorStop(.2,'rgba(255,204,112,.35)');glowGradient.addColorStop(.5,'rgba(255,174,66,.09)');glowGradient.addColorStop(1,'rgba(255,174,66,0)');glowContext.fillStyle=glowGradient;glowContext.fillRect(0,0,128,128);
 const glowMap=new THREE.CanvasTexture(glowCanvas);glowMap.colorSpace=THREE.SRGBColorSpace;
 const glowMaterial=new THREE.SpriteMaterial({map:glowMap,transparent:true,opacity:.28,depthWrite:false,depthTest:true,blending:THREE.AdditiveBlending,toneMapped:false});
 for(const [x,z] of [[-.65,.83],[-.3,.46],[-.29,-.03]]){
  const light=new THREE.PointLight(0xffd6a3,.085,1.65,2);light.position.set(x,1.26,z);light.castShadow=false;lanterns.add(light);
  const spill=new THREE.PointLight(0xffd7ad,.018,.85,2);spill.position.set(x,1.06,z);lanterns.add(spill);
  const halo=new THREE.Sprite(glowMaterial);halo.position.set(x,1.28,z+.035);halo.scale.set(.21,.25,1);halo.userData.center=new THREE.Vector3(x,1.28,z);lanternHalos.push(halo);lanterns.add(halo);
 }
 // Main particles share the miniature coordinate system and are occluded by actual buildings.
 const snowGeo=new THREE.BufferGeometry();snowGeo.setAttribute('position',new THREE.BufferAttribute(physics.p,3));
 const sizes=new Float32Array(physics.count);for(let i=0;i<sizes.length;i++)sizes[i]=.020+Math.pow(physics.depth[i],2.4)*.090;snowGeo.setAttribute('size',new THREE.BufferAttribute(sizes,1));
 snowGeo.setAttribute('flakeAngle',new THREE.BufferAttribute(physics.angle,1));snowGeo.setAttribute('flakeSeed',new THREE.BufferAttribute(physics.depth,1));
 // Solid cutout flakes enter Three's transmission buffer BEFORE liquid/glass.
 // Transparent points would be drawn over the glass, like an exterior overlay.
 const snowMat=new THREE.ShaderMaterial({transparent:false,depthWrite:true,alphaToCoverage:true,uniforms:{pixelRatio:{value:renderer.getPixelRatio()}},
 vertexShader:`attribute float size;attribute float flakeAngle;attribute float flakeSeed;uniform float pixelRatio;varying float angle;varying float seed;varying float waterDepth;void main(){vec4 mv=modelViewMatrix*vec4(position,1.);vec4 center=modelViewMatrix*vec4(0.,1.78,0.,1.);waterDepth=clamp((center.z-mv.z+1.43)/2.86,0.,1.);angle=flakeAngle;seed=flakeSeed;gl_Position=projectionMatrix*mv;gl_PointSize=clamp(size*560.*pixelRatio/max(.1,-mv.z),2.,80.);}`,
 fragmentShader:`varying float angle;varying float seed;varying float waterDepth;void main(){
 vec2 p=gl_PointCoord-.5;float c=cos(angle),s=sin(angle);p=mat2(c,-s,s,c)*p;
 float face=abs(cos(angle*.73+seed*6.28));p.y/=mix(.35,.95,face);p.x/=mix(.70,1.,fract(seed*17.));
 float theta=atan(p.y,p.x),edge=.36+.035*sin(theta*3.+seed*18.)+.025*cos(theta*7.-seed*12.);
 float coverage=1.-smoothstep(edge-.025,edge+.035,length(p));if(coverage<.02)discard;
 float light=(.66+.19*face+.15*fract(seed*31.))*mix(1.,.68,waterDepth);gl_FragColor=vec4(mix(vec3(.86,.93,1.),vec3(1.,.97,.90),fract(seed*13.))*light,coverage);
 #include <tonemapping_fragment>
 #include <colorspace_fragment>
 }`});
 const flakes=new THREE.Points(snowGeo,snowMat);model.add(flakes);
 // Contact shadow stays at the counter while the held globe lifts.
 const shadowTexture=document.createElement('canvas');shadowTexture.width=shadowTexture.height=128;const c=shadowTexture.getContext('2d'),grad=c.createRadialGradient(64,64,5,64,64,64);grad.addColorStop(0,'#00000088');grad.addColorStop(1,'#00000000');c.fillStyle=grad;c.fillRect(0,0,128,128);
 const shadow=new THREE.Mesh(new THREE.PlaneGeometry(3.8,3),new THREE.MeshBasicMaterial({map:new THREE.CanvasTexture(shadowTexture),transparent:true,depthWrite:false}));shadow.rotation.x=-Math.PI/2;shadow.position.y=.004;scene.add(shadow);
 // Local ambient contact beneath each foot remains legible at the miniature scale.
 const footShadowMaterial=new THREE.MeshBasicMaterial({map:shadow.material.map,transparent:true,depthWrite:false,polygonOffset:true,polygonOffsetFactor:-1,polygonOffsetUnits:-1});
 const footShadowGeometry=new THREE.PlaneGeometry(.14,.14);
 for(const [x,z] of [[-.65,.83],[-.3,.46],[-.29,-.03]]){
  const footShadow=new THREE.Mesh(footShadowGeometry,footShadowMaterial);
  footShadow.rotation.x=-Math.PI/2;footShadow.position.set(x,.8405,z);
  model.add(footShadow);
 }
 // Surrounding streets are visible only after crossing the glass; the central city never swaps.
 const outer=new THREE.Group();scene.add(outer);outer.visible=false;
 const ground=new THREE.Mesh(new THREE.PlaneGeometry(120,120),new THREE.MeshStandardMaterial({color:0xe8edf1,roughness:.95}));ground.rotation.x=-Math.PI/2;ground.position.y=.839;ground.receiveShadow=true;outer.add(ground);
 const architecture=new THREE.Group();outer.add(architecture);
 const cityFill=new THREE.DirectionalLight(0xc1d9ff,.85);cityFill.position.set(2,3,4);outer.add(cityFill);
 const distantCards=[];
 const cityReady=modelReady.then(ok=>{if(!ok)return;
  // Match the miniature's counter-contact offset so the surrounding street meets its floor.
  outer.position.y=-baseMin;
  function tileMaterial(source,repeat,color){const m=source.clone();for(const key of ['map','normalMap','roughnessMap','metalnessMap','aoMap'])if(m[key]){m[key]=m[key].clone();m[key].wrapS=m[key].wrapT=THREE.RepeatWrapping;m[key].repeat.set(...repeat);m[key].needsUpdate=true;}if(color)m.color.setRGB(...color);return m;}
  let snowSurface;model.traverse(o=>{if(o.isMesh)for(const m of Array.isArray(o.material)?o.material:[o.material]){if(m.name==='Settled ground snow')snowSurface=m;}});
  if(snowSurface)ground.material=tileMaterial(snowSurface,[480,480]);
  const city=model.getObjectByName('CITY');
  city?.traverse(o=>{
   if(!o.isMesh||o.material.name!=='Settled ground snow')return;
   const p=o.geometry.attributes.position,colors=new Float32Array(p.count*3);
   const bases=[[-.13,.23,-.56,-.14],[.27,.67,-.58,-.16],[.71,1.05,-.51,-.09],[-.715,-.325,-.64,-.32]];
   for(let i=0;i<p.count;i++){
    let shade=0;for(const [x0,x1,z0,z1] of bases){const dx=Math.max(x0-p.getX(i),0,p.getX(i)-x1),dz=Math.max(z0-p.getZ(i),0,p.getZ(i)-z1);shade=Math.max(shade,.20*Math.exp(-Math.hypot(dx,dz)/.055));}
    colors.set([1-shade,1-shade*.91,1-shade*.72],i*3);
   }
   o.geometry.setAttribute('color',new THREE.BufferAttribute(colors,3));o.material=o.material.clone();o.material.vertexColors=true;
  });
  const blocks=[[-3.2,-2.3,.12,.90],[2.9,-2.6,-.17,1.12],[-3.4,-5.5,.32,1.17],[3.2,-5.8,-.28,.84],[-3,-8.6,-.13,.79],[3.5,-9,.21,1.06],[.6,-11,Math.PI+.18,.91],[3.3,1.1,-Math.PI/2,1.04],[-3.4,.7,Math.PI/2,.87],[-1.6,-6.7,.20,.78],[1.4,-7.6,-.24,.89]];
  if(city)for(const [i,[x,z,rotation,height]] of blocks.entries()){
   const copy=city.clone();
   copy.traverse(o=>{if(o.isMesh&&(o.material.name.startsWith('Snow')||o.material.name==='Winter paving')){const geometry=o.geometry.clone(),positions=geometry.attributes.position,index=geometry.index,keep=[];for(let n=0;n<index.count;n+=3){const a=index.getX(n),b=index.getX(n+1),c=index.getX(n+2);if(Math.max(positions.getY(a),positions.getY(b),positions.getY(c))>.90)keep.push(a,b,c);}geometry.setIndex(keep);o.geometry=geometry;}if(o.isMesh)o.castShadow=false;});
   varyCityWindows(copy,i+1);copy.scale.y=height;copy.position.set(x,.84*(1-height),z);copy.rotation.y=rotation;architecture.add(copy);
  }
  const trees=model.getObjectByName('TREES');
  if(trees)for(const [x,z,scale,rotation]of [[-2,-1.1,.8,.2],[2.1,-1.4,.76,-.3],[-1.7,-3.7,.9,-.4],[1.8,-4,.85,.5],[-3.9,-1.5,.82,-.2],[3.8,-1.8,.92,.3]]){
   const copy=trees.clone();copy.scale.setScalar(scale);copy.position.set(x,.84*(1-scale),z);copy.rotation.y=rotation;outer.add(copy);
  }
  scene.updateMatrixWorld(true);
  const eye=new THREE.Vector3(-.12,1.18,1.70);
  for(const object of [...architecture.children,...outer.children.filter(o=>o!==architecture&&o.isGroup)]){
   const card=flattenDistantObject(object,renderer,scene,eye);
   if(card){card.visible=false;distantCards.push(card);}
  }
 });
 // Independent sky dome and distant skyline: buildings never stretch with sky elevation.
 const sky=new THREE.Mesh(new THREE.SphereGeometry(55,64,32),new THREE.MeshBasicMaterial({color:0x9caabd,side:THREE.BackSide,transparent:true,opacity:0,depthWrite:false,toneMapped:false,fog:false}));
 sky.rotation.y=Math.PI/2;sky.renderOrder=-20;sky.visible=false;scene.add(sky);
 const skyline=new THREE.Mesh(new THREE.CylinderGeometry(40,40,22,144,1,true),new THREE.MeshBasicMaterial({color:0xc4cdd9,side:THREE.BackSide,transparent:true,opacity:0,depthWrite:false,alphaTest:.015,toneMapped:false,fog:false}));
 skyline.position.y=11+.72;skyline.rotation.y=Math.PI;skyline.renderOrder=-10;skyline.visible=false;scene.add(skyline);
 const cityFog=new THREE.Fog(0x9caabd,8,52);
 let cityBackdropLoaded=false,cityBackdropSize=null,skyLoaded=false,skylineLoaded=false;
 const backgroundLoader=new THREE.TextureLoader();const backgroundJobs=[];
 backgroundJobs.push(new Promise(resolve=>backgroundLoader.load('./assets/city-background-v2/winter-sky.png',texture=>{
  texture.colorSpace=THREE.SRGBColorSpace;sky.material.map=texture;sky.material.color.setHex(0xffffff);sky.material.needsUpdate=true;skyLoaded=true;cityBackdropLoaded=skylineLoaded;resolve();
 },undefined,()=>{container.dataset.backgroundWarning='겨울 하늘을 읽지 못했습니다.';resolve();})));
 backgroundJobs.push(new Promise(resolve=>backgroundLoader.load('./assets/city-background-v2/manhattan-distant.png',texture=>{
  texture.colorSpace=THREE.SRGBColorSpace;texture.wrapS=THREE.RepeatWrapping;texture.repeat.x=3;texture.anisotropy=Math.min(8,renderer.capabilities.getMaxAnisotropy());
  skyline.material.map=texture;skyline.material.needsUpdate=true;skylineLoaded=true;cityBackdropLoaded=skyLoaded;cityBackdropSize=[texture.image.width,texture.image.height];resolve();
 },undefined,()=>{container.dataset.backgroundWarning='뉴욕 원경을 읽지 못했습니다.';resolve();})));
 const cityCount=1800,cityPos=new Float32Array(cityCount*3),citySpeeds=new Float32Array(cityCount);for(let i=0;i<cityCount;i++){const near=i<650;cityPos[i*3]=(Math.random()-.5)*(near?4:22);cityPos[i*3+1]=.9+Math.random()*(near?4:10);cityPos[i*3+2]=near?-.9+Math.random()*2:(Math.random()-.5)*24;citySpeeds[i]=.23+Math.random()*.45;}
 const cityGeo=new THREE.BufferGeometry();cityGeo.setAttribute('position',new THREE.BufferAttribute(cityPos,3));
 const citySeed=Float32Array.from({length:cityCount},()=>Math.random());
 const citySize=Float32Array.from(citySeed,n=>.035+n*n*.075);cityGeo.setAttribute('size',new THREE.BufferAttribute(citySize,1));cityGeo.setAttribute('seed',new THREE.BufferAttribute(citySeed,1));
 const citySnowMat=new THREE.ShaderMaterial({transparent:true,depthWrite:false,uniforms:{pixelRatio:{value:renderer.getPixelRatio()},time:{value:0}},
 vertexShader:`attribute float size;attribute float seed;uniform float pixelRatio;varying float flakeSeed;varying float viewDepth;void main(){vec4 mv=modelViewMatrix*vec4(position,1.);viewDepth=-mv.z;flakeSeed=seed;gl_Position=projectionMatrix*mv;gl_PointSize=clamp(size*560.*pixelRatio/max(.25,viewDepth),1.5*pixelRatio,54.*pixelRatio);}`,
 fragmentShader:`uniform float time;varying float flakeSeed;varying float viewDepth;void main(){
 vec2 p=(gl_PointCoord-.5)*2.;float angle=flakeSeed*6.283+time*(.22+flakeSeed*.4);float c=cos(angle),s=sin(angle);p=mat2(c,-s,s,c)*p;
 p.x*=1.+.45*sin(time*.7+flakeSeed*12.);p.y*=1.15;
 float soft=(1.-smoothstep(.6,3.,viewDepth));float grain=sin(p.x*19.+flakeSeed*31.)*sin(p.y*23.+flakeSeed*17.);
 float r=length(p)+(.06*(1.-soft))*grain;
 float core=1.-smoothstep(.23,.72+soft*.18,r);
 float lobe=exp(-18.*dot(p-vec2(.25,.12),p-vec2(.25,.12)))+exp(-23.*dot(p+vec2(.20,.14),p+vec2(.20,.14)));
 float alpha=clamp(core*.76+lobe*.18,0.,1.)*(.48+flakeSeed*.32)*smoothstep(.22,.65,viewDepth);
 if(alpha<.015)discard;gl_FragColor=vec4(mix(vec3(.83,.88,.93),vec3(.98,.98,.94),flakeSeed),alpha);
 }`});
 const cityFlakes=new THREE.Points(cityGeo,citySnowMat);scene.add(cityFlakes);cityFlakes.visible=false;
 const startPos=new THREE.Vector3(0,2.9,9.5),endPos=new THREE.Vector3(-.12,1.18,1.70),startAim=new THREE.Vector3(0,1.60,0),endAim=new THREE.Vector3(.02,1.34,-.42),aim=new THREE.Vector3(),inv=new THREE.Quaternion(),g=new THREE.Vector3(),v=new THREE.Vector3();
 const smooth=x=>x*x*(3-2*x);
 let startFov=36;
 function resize(){
  const w=container.clientWidth,h=container.clientHeight;
  renderer.setSize(w,h);camera.aspect=w/h;
  // Widen the portrait view while keeping the camera inside the shop's front wall.
  startFov=THREE.MathUtils.radToDeg(2*Math.atan(Math.tan(THREE.MathUtils.degToRad(18))/Math.min(1,camera.aspect)));
  camera.updateProjectionMatrix();
 }
 addEventListener('resize',resize);resize();
 function setView(travel){const enter=smooth(Math.min(1,travel));
  key.shadow.normalBias=travel>.55?.001:.012;
  key.shadow.bias=travel>.55?-.00005:-.00025;
  key.intensity=THREE.MathUtils.lerp(2.8,1.85,enter);
  lanterns.visible=travel>.55;for(const material of lanternMaterials)material.emissiveIntensity=travel>.55?.65:1.4;
  camera.position.lerpVectors(startPos,endPos,enter);aim.lerpVectors(startAim,endAim,enter);

  if(travel>=1){const base=endAim.clone().sub(endPos),yaw=-look*.90,pitch=-lookY*.38;const euler=new THREE.Euler(pitch,yaw,0,'YXZ');base.applyEuler(euler);aim.copy(camera.position).add(base);}
  camera.lookAt(aim);if(lanterns.visible){model.updateWorldMatrix(true,false);const eye=model.worldToLocal(camera.position.clone());for(const halo of lanternHalos)halo.position.copy(eye).sub(halo.userData.center).normalize().multiplyScalar(.09).add(halo.userData.center);}camera.fov=THREE.MathUtils.lerp(startFov,60,enter);camera.updateProjectionMatrix();
  sky.material.opacity=THREE.MathUtils.smoothstep(travel,.55,.86);sky.visible=travel>.55;skyline.material.opacity=sky.material.opacity;skyline.visible=sky.visible;scene.fog=travel>.55?cityFog:null;outer.visible=travel>.55;shadow.visible=travel<.5;shop.visible=false;
  // Stop drawing the full-screen refraction once the snow veil covers the globe.
  for(const o of groups.GLASS||[])o.visible=travel<.44;
  liquid.setTravel(travel);
  for(const o of groups.BASE||[])o.visible=travel<.5;
  for(const o of globeRailing)o.visible=travel<.55;
  for(const card of distantCards)card.visible=travel>.55;
  flakes.visible=travel<.55;cityFlakes.visible=travel>.55;
 }
 const ready=Promise.all([modelReady,cityReady,...backgroundJobs]).then(async([ok])=>{
  if(!ok)return false;
  // Prepare only the opening view. City variants compile when that view is entered.
  setView(0);await renderer.compileAsync(scene,camera);
  setView(0);renderer.render(scene,camera);loaded=true;lastTick=previousTick=performance.now();
  container.dataset.loaded='true';return true;
 }).catch(e=>{error=e.message;window.dispatchEvent(new CustomEvent('art-error',{detail:'그래픽 준비를 완료하지 못했습니다. 다시 불러와주세요.'}));return false;});
 const api={setReceivingHand:(show,point,progress,guide=false)=>virtualHand.set(show,point,progress,guide),canvas:renderer.domElement,ready,
 handOverGlobe(x,y){
  if(!loaded||travelLast>0)return false;
  const box=new THREE.Box3();for(const glass of groups.GLASS||[])box.expandByObject(glass);
  if(box.isEmpty())return false;
  let left=1,right=0,top=1,bottom=0;
  for(const xx of [box.min.x,box.max.x])for(const yy of [box.min.y,box.max.y])for(const zz of [box.min.z,box.max.z]){
   const p=new THREE.Vector3(xx,yy,zz).project(camera),sx=(p.x+1)/2,sy=(1-p.y)/2;
   left=Math.min(left,sx);right=Math.max(right,sx);top=Math.min(top,sy);bottom=Math.max(bottom,sy);
  }
  const rx=(right-left)*.55,ry=(bottom-top)*.55;
  return rx>0&&ry>0&&((x-(left+right)/2)/rx)**2+((y-(top+bottom)/2)/ry)**2<=1;
 },
 resumeTiming(){lastTick=performance.now();previousTick=0;},
 reduceQuality(){
  if(!loaded||quality===.5)return;
  quality=quality===1?.75:.5;slowRenderSeconds=0;
  const ratio=quality===.75?.85:.65;renderer.setPixelRatio(ratio);resize();
  snowMat.uniforms.pixelRatio.value=ratio;citySnowMat.uniforms.pixelRatio.value=ratio;
  if(quality===.5)for(const glass of groups.GLASS||[]){glass.material.transmission=0;glass.material.opacity=.12;glass.material.needsUpdate=true;}
 },
 lookAt(x,y=.5){targetLook=THREE.MathUtils.clamp((x-.5)*2,-1,1);targetLookY=THREE.MathUtils.clamp((y-.5)*2,-1,1);},
 reset(){pose.reset();physics.reset();targetLook=targetLookY=look=lookY=travelLast=0;},
 update(dt,time,motion,travel=0){
  if(!loaded){container.dataset.state=JSON.stringify(api.stats());return;}
  const tick=performance.now();if(travel>0&&travel<1){if(travelLast===0)transitionFrames.length=0;if(previousTick)transitionFrames.push(tick-previousTick);}previousTick=tick;const elapsed=Math.min(.25,Math.max(0,(tick-lastTick)/1000));frameInterval+=(tick-lastTick-frameInterval)*.05;lastTick=tick;clock.time=time;travelLast=travel;pose.update(dt,motion);const enter=smooth(Math.min(1,travel)),settle=1-smooth(Math.min(1,travel*2.2));
  pivot.position.set(pose.position[0]*settle,1.5+pose.position[1]*settle,pose.position[2]*settle);pivot.rotation.set(pose.rotation[0]*settle,pose.rotation[1]*settle,pose.rotation[2]*settle);
  if(baseBounds){let lowest=Infinity;for(const x of [baseBounds.min.x,baseBounds.max.x])for(const y of [baseBounds.min.y,baseBounds.max.y])for(const z of [baseBounds.min.z,baseBounds.max.z]){v.set(x,y+model.position.y,z).applyQuaternion(pivot.quaternion).add(pivot.position);lowest=Math.min(lowest,v.y);}if(lowest<0)pivot.position.y-=lowest;contactGap=Math.max(0,lowest);}
  inv.copy(pivot.quaternion).invert();g.set(0,-1,0).applyQuaternion(inv);v.set(...pose.velocity).applyQuaternion(inv);
  // HeldPose already compensates camera motion, including the velocity used by snow.
  if(travel<.42){const begin=performance.now();physics.update(dt,time,[v.x,v.y,v.z],[g.x,g.y,g.z]);physicsMs+=(performance.now()-begin-physicsMs)*.1;snowGeo.attributes.position.needsUpdate=true;snowGeo.attributes.flakeAngle.needsUpdate=true;}
  liteSnow.update(dt,time,physics.agitation,travel,renderer.getPixelRatio());
  look+=(targetLook-look)*(1-Math.exp(-dt*3.5));lookY+=(targetLookY-lookY)*(1-Math.exp(-dt*3.5));
  setView(travel);
  if(cityFlakes.visible){citySnowMat.uniforms.time.value=time;for(let i=0;i<cityCount;i++){cityPos[i*3+1]-=dt*citySpeeds[i];cityPos[i*3]+=(.045+Math.sin(time*.8+i*2.4)*(.025+citySeed[i]*.065))*dt;cityPos[i*3+2]+=Math.cos(time*.65+i*1.7)*dt*.035;if(cityPos[i*3+1]<.87)cityPos[i*3+1]=i<650?4.9:9;if(cityPos[i*3]>11)cityPos[i*3]=-11;if(cityPos[i*3+2]>12)cityPos[i*3+2]=-12;if(cityPos[i*3+2]<-12)cityPos[i*3+2]=12;}cityGeo.attributes.position.needsUpdate=true;}
  const nextShadowPhase=travel<.5?0:travel<=.55?1:2;
  renderer.shadowMap.autoUpdate=travel<.46&&(renderedFrames%(quality===1?2:quality===.75?4:8)===0);if(nextShadowPhase!==shadowPhase){renderer.shadowMap.needsUpdate=true;shadowPhase=nextShadowPhase;}
  const now=performance.now();renderer.info.autoReset=false;renderer.info.reset();renderer.render(scene,camera);virtualHand.render(renderer,container.clientWidth,container.clientHeight);frameMs+=(performance.now()-now-frameMs)*.03;
  renderedFrames++;slowRenderSeconds=(frameMs>35||frameInterval>34)?slowRenderSeconds+elapsed:Math.max(0,slowRenderSeconds-elapsed*2);if(slowRenderSeconds>2)api.reduceQuality();
  const stats=api.stats();container.dataset.state=JSON.stringify(stats);container.dataset.holding=String(pose.held);container.dataset.airborne=String(stats.airborne);
 },
 stats(){const stamp=performance.now();if(stamp-statsAt>100){snowStats=physics.stats();statsAt=stamp;}const sorted=transitionFrames.slice().sort((a,b)=>a-b);return {...cityLightStats,...liquid.stats(),transitionFrames:sorted.length,transitionMaxMs:Math.round(sorted.at(-1)||0),transitionP95Ms:Math.round(sorted[Math.floor(sorted.length*.95)]||0),distantPlanes:distantCards.length,distantTrianglesRemoved:distantCards.reduce((n,c)=>n+c.userData.originalTriangles,0),artMode:'3d-shared-city',artLoaded:loaded,shopLoaded,cityBackdropLoaded,cityBackdropSize,skyLoaded,skylineLoaded,cityBackdropVisible:sky.visible&&cityBackdropLoaded,normalMappedMaterials:materialMaps,contactGap:Math.round(contactGap*10000)/10000,citySnowVisible:cityFlakes.visible,citySnowCount:cityCount,cityLanternsVisible:lanterns.visible,cityLanternCount:3,citySnowSampleY:Math.round(cityPos[1]*10000)/10000,error,holding:pose.held,inside:travelLast>=1,travel:travelLast,roll:pose.rotation[2],position:pose.position,...snowStats,lite:true,physicsMs:travelLast<.42?Math.round(physicsMs*100)/100:0,decorativeSnowCount:6000,drawCalls:renderer.info.render.calls,triangles:renderer.info.render.triangles,renderMs:Math.round(frameMs*10)/10,fps:Math.round(1000/Math.max(1,frameInterval)),quality};}
 };
 renderer.domElement.addEventListener('webglcontextlost',e=>{e.preventDefault();window.dispatchEvent(new CustomEvent('art-error',{detail:'그래픽 연결이 중단되었습니다. 새로고침해주세요.'}));});
 return api;
}
