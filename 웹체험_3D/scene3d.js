import * as THREE from './vendor/three.module.js';
import {GLTFLoader} from './vendor/GLTFLoader.js';
import {RoomEnvironment} from './vendor/RoomEnvironment.js';
import {HeldPose} from './pose.mjs';
import {GlobeSnow} from './snow3d.mjs';
export function createScene(container){
 const renderer=new THREE.WebGLRenderer({antialias:true,alpha:true,powerPreference:'high-performance'});renderer.setPixelRatio(Math.min(devicePixelRatio,1.5));renderer.outputColorSpace=THREE.SRGBColorSpace;renderer.toneMapping=THREE.ACESFilmicToneMapping;renderer.toneMappingExposure=.88;renderer.shadowMap.enabled=true;renderer.shadowMap.type=THREE.PCFSoftShadowMap;container.append(renderer.domElement);
 const scene=new THREE.Scene(),camera=new THREE.PerspectiveCamera(36,1,.02,120);
 const environment=new RoomEnvironment(),pmrem=new THREE.PMREMGenerator(renderer);scene.environment=pmrem.fromScene(environment,.04).texture;environment.dispose();pmrem.dispose();
 scene.add(new THREE.HemisphereLight(0xd8eaff,0x806647,.72));const key=new THREE.DirectionalLight(0xffe0b0,2.8);key.position.set(-3,6,5);key.castShadow=true;key.shadow.mapSize.set(2048,2048);Object.assign(key.shadow.camera,{left:-6,right:6,top:6,bottom:-5,near:.1,far:20});key.shadow.bias=-.00025;key.shadow.normalBias=.012;key.shadow.radius=3;scene.add(key);const rim=new THREE.DirectionalLight(0xb2d8ff,.65);rim.position.set(3,4,-3);scene.add(rim);
 const pivot=new THREE.Group(),model=new THREE.Group();pivot.add(model);model.position.y=-1.5;pivot.position.y=1.5;scene.add(pivot);
 const pose=new HeldPose(),physics=new GlobeSnow(),clock={time:0};let loaded=false,shopLoaded=false,error=null,baseMin=.02,baseBounds=null,contactGap=0,materialMaps=0,look=0,lookY=0,targetLook=0,targetLookY=0,travelLast=0,frameMs=16,quality=1,slowRenderSeconds=0,renderedFrames=0,lastTick=performance.now(),frameInterval=16;
 function tuneMaterial(m){if(m.map)m.map.anisotropy=Math.min(8,renderer.capabilities.getMaxAnisotropy());m.envMapIntensity=.55;if(/limestone/i.test(m.name))m.color.setRGB(.68,.61,.49);if(/walnut|timber|wood/i.test(m.name))m.color.setRGB(.48,.32,.19);if(m.name.startsWith('SHOP cloth binding')){const c=[[.16,.027,.035],[.035,.10,.065],[.24,.16,.065],[.045,.07,.10]][Number(m.name.slice(-1))]||[.1,.07,.04];m.color.setRGB(...c);}if(/Snow/.test(m.name))m.color.setRGB(.88,.92,.97);}
 const transitionFrames=[];let previousTick=0;
 const lanternMaterials=[];
 const groups={};const loader=new GLTFLoader();
 const globeReady=loader.loadAsync('./assets/3d/snowglobe.glb').then(gltf=>{
  model.add(gltf.scene);gltf.scene.traverse(o=>{if(o.isMesh){o.frustumCulled=true;o.castShadow=true;o.receiveShadow=true;if(o.name.startsWith('TREES'))o.castShadow=false;
   const name=o.name;for(const kind of ['GLASS','BASE','CITY','TREES','PROPS'])if(name.startsWith(kind)){(groups[kind]||=[]).push(o);}
   const mats=Array.isArray(o.material)?o.material:[o.material];for(const m of mats){if(m.map)m.map.anisotropy=Math.min(4,renderer.capabilities.getMaxAnisotropy());tuneMaterial(m);if(m.normalMap)materialMaps++;}
  }});
  for(const o of groups.PROPS||[]){const materials=Array.isArray(o.material)?o.material:[o.material];o.material=materials.map(m=>{if(m.name!=='Warm window glass')return m;const lit=m.clone();lit.emissive.setHex(0xffc36a);lit.emissiveIntensity=1.4;lit.roughness=.35;lanternMaterials.push(lit);return lit;});}
  // Thin optical shell: real volume, controlled reflections, no 2D deformation.
  for(const o of groups.GLASS||[])o.material=new THREE.MeshPhysicalMaterial({color:0xffffff,metalness:0,roughness:.012,transmission:1,thickness:.003,ior:1.24,transparent:true,opacity:1,depthWrite:false,side:THREE.FrontSide,envMapIntensity:.65});
  for(const o of groups.GLASS||[])o.castShadow=false;const base=model.getObjectByName('BASE');if(base){baseBounds=new THREE.Box3().setFromObject(base);baseMin=baseBounds.min.y-(pivot.position.y+model.position.y);model.position.y=-1.5-baseMin;}return true;
 }).catch(e=>{error=e.message;window.dispatchEvent(new CustomEvent('art-error',{detail:'3D 파일을 읽지 못했습니다. 실행기를 다시 열어주세요.'}));return false;});

 const shop=new THREE.Group();scene.add(shop);
 const shopReady=loader.loadAsync('./assets/3d/shop.glb').then(gltf=>{shop.add(gltf.scene);gltf.scene.traverse(o=>{if(o.isMesh){o.receiveShadow=!(Array.isArray(o.material)?o.material:[o.material]).some(m=>m.name==='SHOP dusk beyond glass');o.castShadow=(Array.isArray(o.material)?o.material:[o.material]).some(m=>/SHOP walnut|SHOP cloth|SHOP wrapping|SHOP burgundy|Aged champagne brass|SHOP winter evergreen/.test(m.name));for(const m of Array.isArray(o.material)?o.material:[o.material]){tuneMaterial(m);if(m.map)m.map.anisotropy=Math.min(8,renderer.capabilities.getMaxAnisotropy());if(m.normalMap)materialMaps++;}}});shopLoaded=true;return true;}).catch(e=>{error=e.message;window.dispatchEvent(new CustomEvent('art-error',{detail:'매장 3D 모델을 읽지 못했습니다. 새로고침해주세요.'}));return false;});
 const modelReady=Promise.all([globeReady,shopReady]).then(results=>{loaded=results.every(Boolean);document.getElementById('shop').style.display='none';document.getElementById('window-snow').style.display='none';if(loaded){pivot.visible=false;shadow.visible=false;const cubeTarget=new THREE.WebGLCubeRenderTarget(256,{type:THREE.HalfFloatType});const capture=new THREE.CubeCamera(.1,40,cubeTarget);capture.position.set(0,1.6,0);capture.update(renderer,scene);const generator=new THREE.PMREMGenerator(renderer);const old=scene.environment;scene.environment=generator.fromCubemap(cubeTarget.texture).texture;old?.dispose();generator.dispose();cubeTarget.dispose();pivot.visible=true;shadow.visible=true;}loaded=false;return results.every(Boolean);});
 // Warm fixtures in the shop are anchored in the same real 3D room.
 for(const x of [-3.8,3.8]){const lamp=new THREE.PointLight(0xffb763,6,9,2);lamp.position.set(x,3,-1.6);shop.add(lamp);}
 const shopSnowGeo=new THREE.BufferGeometry(),shopSnowPos=new Float32Array(350*3);
 for(let i=0;i<350;i++){shopSnowPos[i*3]=(Math.random()-.5)*13;shopSnowPos[i*3+1]=Math.random()*5;shopSnowPos[i*3+2]=-3.50+Math.random()*.04;}
 shopSnowGeo.setAttribute('position',new THREE.BufferAttribute(shopSnowPos,3));const shopSnow=new THREE.Points(shopSnowGeo,new THREE.PointsMaterial({color:0xe4edf6,size:.025,transparent:true,opacity:.72,depthWrite:false}));shop.add(shopSnow);
 fetch('./assets/3d/colliders.json').then(r=>{if(!r.ok)throw Error('collision data');return r.json();}).then(b=>physics.boxes=b).catch(()=>{container.dataset.collisionWarning='true';});
 // Local lantern light, with small depth-tested halos; no full-screen bloom pass.
 const lanternHalos=[];const lanterns=new THREE.Group();model.add(lanterns);lanterns.visible=false;
 const glowCanvas=document.createElement('canvas');glowCanvas.width=glowCanvas.height=128;
 const glowContext=glowCanvas.getContext('2d'),glowGradient=glowContext.createRadialGradient(64,64,0,64,64,64);
 glowGradient.addColorStop(0,'rgba(255,235,183,.65)');glowGradient.addColorStop(.2,'rgba(255,204,112,.35)');glowGradient.addColorStop(.5,'rgba(255,174,66,.09)');glowGradient.addColorStop(1,'rgba(255,174,66,0)');glowContext.fillStyle=glowGradient;glowContext.fillRect(0,0,128,128);
 const glowMap=new THREE.CanvasTexture(glowCanvas);glowMap.colorSpace=THREE.SRGBColorSpace;
 const glowMaterial=new THREE.SpriteMaterial({map:glowMap,transparent:true,opacity:.85,depthWrite:false,depthTest:true,blending:THREE.AdditiveBlending,toneMapped:false});
 for(const [x,z] of [[-.65,.83],[-.3,.46],[-.29,-.03]]){
  const light=new THREE.PointLight(0xffbd69,.24,1.35,2);light.position.set(x,1.28,z);light.castShadow=false;lanterns.add(light);
  const halo=new THREE.Sprite(glowMaterial);halo.position.set(x,1.28,z+.035);halo.scale.set(.32,.38,1);halo.userData.center=new THREE.Vector3(x,1.28,z);lanternHalos.push(halo);lanterns.add(halo);
 }
 // Main particles share the miniature coordinate system and are occluded by actual buildings.
 const snowGeo=new THREE.BufferGeometry();snowGeo.setAttribute('position',new THREE.BufferAttribute(physics.p,3));
 const sizes=new Float32Array(physics.count);for(let i=0;i<sizes.length;i++)sizes[i]=.045+physics.depth[i]*.060;snowGeo.setAttribute('size',new THREE.BufferAttribute(sizes,1));
 const snowMat=new THREE.ShaderMaterial({transparent:true,depthWrite:false,uniforms:{opacity:{value:.88},pixelRatio:{value:renderer.getPixelRatio()}},
 vertexShader:'attribute float size;uniform float pixelRatio;varying float depth;void main(){vec4 mv=modelViewMatrix*vec4(position,1.);depth=-mv.z;gl_Position=projectionMatrix*mv;gl_PointSize=clamp(size*560.*pixelRatio/max(.1,-mv.z),5.5,80.);}',
 fragmentShader:'uniform float opacity;varying float depth;void main(){vec2 p=gl_PointCoord-.5;float r=length(p);float a=(1.-smoothstep(.36,.49,r))*opacity;if(a<.02)discard;gl_FragColor=vec4(.96,.97,.94,a);}'});
 const flakes=new THREE.Points(snowGeo,snowMat);model.add(flakes);
 // Contact shadow stays at the counter while the held globe lifts.
 const shadowTexture=document.createElement('canvas');shadowTexture.width=shadowTexture.height=128;const c=shadowTexture.getContext('2d'),grad=c.createRadialGradient(64,64,5,64,64,64);grad.addColorStop(0,'#00000088');grad.addColorStop(1,'#00000000');c.fillStyle=grad;c.fillRect(0,0,128,128);
 const shadow=new THREE.Mesh(new THREE.PlaneGeometry(3.8,3),new THREE.MeshBasicMaterial({map:new THREE.CanvasTexture(shadowTexture),transparent:true,depthWrite:false}));shadow.rotation.x=-Math.PI/2;shadow.position.y=.004;scene.add(shadow);
 // Surrounding streets are visible only after crossing the glass; the central city never swaps.
 const outer=new THREE.Group();scene.add(outer);outer.visible=false;
 const ground=new THREE.Mesh(new THREE.PlaneGeometry(120,120),new THREE.MeshStandardMaterial({color:0xe4e9e8,roughness:.95}));ground.rotation.x=-Math.PI/2;ground.position.y=.84;ground.receiveShadow=true;outer.add(ground);
 const street=new THREE.Mesh(new THREE.PlaneGeometry(1.2,45),new THREE.MeshStandardMaterial({color:0x7c8389,roughness:.6}));street.rotation.x=-Math.PI/2;street.position.set(-.4,.846,-4);outer.add(street);
 const architecture=new THREE.Group();outer.add(architecture);
 const cityReady=modelReady.then(ok=>{if(!ok)return;
  function tileMaterial(source,repeat,color){const m=source.clone();for(const key of ['map','normalMap','roughnessMap','metalnessMap','aoMap'])if(m[key]){m[key]=m[key].clone();m[key].wrapS=m[key].wrapT=THREE.RepeatWrapping;m[key].repeat.set(...repeat);m[key].needsUpdate=true;}if(color)m.color.setRGB(...color);return m;}
  let snowSurface,stoneSurface;model.traverse(o=>{if(o.isMesh)for(const m of Array.isArray(o.material)?o.material:[o.material]){if(m.name.startsWith('Snow'))snowSurface=m;if(m.name.startsWith('AI aged cream'))stoneSurface=m;}});
  if(snowSurface)ground.material=tileMaterial(snowSurface,[180,180],[.88,.92,.98]);if(stoneSurface)street.material=tileMaterial(stoneSurface,[2,70],[.12,.14,.16]);
  const city=model.getObjectByName('CITY');if(city)for(const [x,z,rotation] of [[-3,-2,0],[2.7,-2,0],[-3,-5,0],[2.7,-5,0],[-3,-8,0],[2.7,-8,0],[0,-10,Math.PI],[3,1,-Math.PI/2],[-3,1,Math.PI/2]]){const copy=city.clone();copy.traverse(o=>{if(o.isMesh&&o.material.name.startsWith('Snow')){const geometry=o.geometry.clone(),positions=geometry.attributes.position,index=geometry.index,keep=[];for(let n=0;n<index.count;n+=3){const a=index.getX(n),b=index.getX(n+1),c=index.getX(n+2);if(Math.max(positions.getY(a),positions.getY(b),positions.getY(c))>.90)keep.push(a,b,c);}geometry.setIndex(keep);o.geometry=geometry;}});copy.traverse(o=>{if(o.isMesh)o.castShadow=false;});copy.position.set(x,0,z);copy.rotation.y=rotation;architecture.add(copy);}
  const trees=model.getObjectByName('TREES');if(trees)for(const [x,z]of [[-2,-3],[2,-3]]){const copy=trees.clone();copy.position.set(x,0,z);outer.add(copy);}
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
 const startPos=new THREE.Vector3(0,2.9,9.5),endPos=new THREE.Vector3(-.20,1.13,1.12),startAim=new THREE.Vector3(0,1.60,0),endAim=new THREE.Vector3(-.10,1.40,-.42),aim=new THREE.Vector3(),inv=new THREE.Quaternion(),g=new THREE.Vector3(),v=new THREE.Vector3();
 const smooth=x=>x*x*(3-2*x);
 function resize(){const w=container.clientWidth,h=container.clientHeight;renderer.setSize(w,h);camera.aspect=w/h;camera.updateProjectionMatrix();startPos.z=camera.aspect<1?12.5:9.5;}
 addEventListener('resize',resize);resize();
 function setView(travel){const enter=smooth(Math.min(1,travel));
  lanterns.visible=travel>.55;for(const material of lanternMaterials)material.emissiveIntensity=travel>.55?4.5:1.4;
  camera.position.lerpVectors(startPos,endPos,enter);aim.lerpVectors(startAim,endAim,enter);

  if(travel>=1){const base=endAim.clone().sub(endPos),yaw=-look*.90,pitch=-lookY*.38;const euler=new THREE.Euler(pitch,yaw,0,'YXZ');base.applyEuler(euler);aim.copy(camera.position).add(base);}
  camera.lookAt(aim);if(lanterns.visible){model.updateWorldMatrix(true,false);const eye=model.worldToLocal(camera.position.clone());for(const halo of lanternHalos)halo.position.copy(eye).sub(halo.userData.center).normalize().multiplyScalar(.09).add(halo.userData.center);}camera.fov=36+enter*24;camera.updateProjectionMatrix();
  sky.material.opacity=THREE.MathUtils.smoothstep(travel,.55,.86);sky.visible=travel>.55;skyline.material.opacity=sky.material.opacity;skyline.visible=sky.visible;scene.fog=travel>.55?cityFog:null;outer.visible=travel>.55;shadow.visible=travel<.5;shop.visible=travel<.5;
  for(const o of groups.GLASS||[])o.visible=travel<.5;
  for(const o of groups.BASE||[])o.visible=travel<.5;
  flakes.visible=travel<.55;cityFlakes.visible=travel>.55;
 }
 const ready=Promise.all([modelReady,cityReady,...backgroundJobs]).then(async([ok])=>{
  if(!ok)return false;
  // Prepare both light/fog variants and upload city geometry before enabling interaction.
  for(const travel of [0,.52,.6,1]){setView(travel);await renderer.compileAsync(scene,camera);renderer.render(scene,camera);}
  setView(0);renderer.render(scene,camera);loaded=true;lastTick=previousTick=performance.now();
  container.dataset.loaded='true';return true;
 }).catch(e=>{error=e.message;window.dispatchEvent(new CustomEvent('art-error',{detail:'그래픽 준비를 완료하지 못했습니다. 다시 불러와주세요.'}));return false;});
 const api={canvas:renderer.domElement,ready,lookAt(x,y=.5){targetLook=THREE.MathUtils.clamp((x-.5)*2,-1,1);targetLookY=THREE.MathUtils.clamp((y-.5)*2,-1,1);},
 reset(){pose.reset();physics.reset();targetLook=targetLookY=look=lookY=travelLast=0;},
 update(dt,time,motion,travel=0){
  if(!loaded){container.dataset.state=JSON.stringify(api.stats());return;}
  const tick=performance.now();if(travel>0&&travel<1){if(travelLast===0)transitionFrames.length=0;if(previousTick)transitionFrames.push(tick-previousTick);}previousTick=tick;frameInterval+=(tick-lastTick-frameInterval)*.05;lastTick=tick;clock.time=time;travelLast=travel;pose.update(dt,motion);const enter=smooth(Math.min(1,travel)),settle=1-smooth(Math.min(1,travel*2.2));
  pivot.position.set(pose.position[0]*settle,1.5+pose.position[1]*settle,pose.position[2]*settle);pivot.rotation.set(pose.rotation[0]*settle,pose.rotation[1]*settle,pose.rotation[2]*settle);
  if(baseBounds){let lowest=Infinity;for(const x of [baseBounds.min.x,baseBounds.max.x])for(const y of [baseBounds.min.y,baseBounds.max.y])for(const z of [baseBounds.min.z,baseBounds.max.z]){v.set(x,y+model.position.y,z).applyQuaternion(pivot.quaternion).add(pivot.position);lowest=Math.min(lowest,v.y);}if(lowest<0)pivot.position.y-=lowest;contactGap=Math.max(0,lowest);}
  inv.copy(pivot.quaternion).invert();g.set(0,-1,0).applyQuaternion(inv);v.set(...pose.velocity).applyQuaternion(inv);if(travel<.55){physics.update(dt,time,[v.x,v.y,v.z],[g.x,g.y,g.z]);snowGeo.attributes.position.needsUpdate=true;}
  look+=(targetLook-look)*(1-Math.exp(-dt*3));lookY+=(targetLookY-lookY)*(1-Math.exp(-dt*3));
  setView(travel);
  if(cityFlakes.visible){citySnowMat.uniforms.time.value=time;for(let i=0;i<cityCount;i++){cityPos[i*3+1]-=dt*citySpeeds[i];cityPos[i*3]+=(.045+Math.sin(time*.8+i*2.4)*(.025+citySeed[i]*.065))*dt;cityPos[i*3+2]+=Math.cos(time*.65+i*1.7)*dt*.035;if(cityPos[i*3+1]<.87)cityPos[i*3+1]=i<650?4.9:9;if(cityPos[i*3]>11)cityPos[i*3]=-11;if(cityPos[i*3+2]>12)cityPos[i*3+2]=-12;if(cityPos[i*3+2]<-12)cityPos[i*3+2]=12;}cityGeo.attributes.position.needsUpdate=true;}
  if(shop.visible){for(let i=0;i<350;i++){shopSnowPos[i*3+1]-=dt*(.12+(i%7)*.025);if(shopSnowPos[i*3+1]<.15)shopSnowPos[i*3+1]=4.9;}shopSnowGeo.attributes.position.needsUpdate=true;}
  renderer.shadowMap.autoUpdate=travel<.60;if(travelLast===0)renderer.shadowMap.needsUpdate=true;
  const now=performance.now();renderer.render(scene,camera);frameMs+=(performance.now()-now-frameMs)*.03;
  renderedFrames++;slowRenderSeconds=(frameMs>35||frameInterval>34)?slowRenderSeconds+dt:Math.max(0,slowRenderSeconds-dt*2);if(renderedFrames>180&&slowRenderSeconds>2&&quality===1){quality=.75;renderer.setPixelRatio(1);resize();snowMat.uniforms.pixelRatio.value=1;citySnowMat.uniforms.pixelRatio.value=1;}
  const stats=api.stats();container.dataset.state=JSON.stringify(stats);container.dataset.holding=String(pose.held);container.dataset.airborne=String(stats.airborne);
 },
 stats(){const sorted=transitionFrames.slice().sort((a,b)=>a-b);return {transitionFrames:sorted.length,transitionMaxMs:Math.round(sorted.at(-1)||0),transitionP95Ms:Math.round(sorted[Math.floor(sorted.length*.95)]||0),artMode:'3d-shared-city',artLoaded:loaded,shopLoaded,cityBackdropLoaded,cityBackdropSize,skyLoaded,skylineLoaded,cityBackdropVisible:sky.visible&&cityBackdropLoaded,normalMappedMaterials:materialMaps,contactGap:Math.round(contactGap*10000)/10000,citySnowVisible:cityFlakes.visible,citySnowCount:cityCount,cityLanternsVisible:lanterns.visible,cityLanternCount:3,citySnowSampleY:Math.round(cityPos[1]*10000)/10000,error,holding:pose.held,inside:travelLast>=1,travel:travelLast,roll:pose.rotation[2],position:pose.position,...physics.stats(),drawCalls:renderer.info.render.calls,triangles:renderer.info.render.triangles,renderMs:Math.round(frameMs*10)/10,fps:Math.round(1000/Math.max(1,frameInterval)),quality};}
 };
 renderer.domElement.addEventListener('webglcontextlost',e=>{e.preventDefault();window.dispatchEvent(new CustomEvent('art-error',{detail:'그래픽 연결이 중단되었습니다. 새로고침해주세요.'}));});
 return api;
}
