import {createHandArt} from './hand-art.js';
import {GLTFLoader} from './vendor/GLTFLoader.js';
import {createPalmSnow} from './receiving-natural-snow.js';
import * as THREE from './vendor/three.module.js';
// A small shaded glove, drawn by the existing renderer (no extra WebGL context).
export function createVirtualHand(){
 const scene=new THREE.Scene(),camera=new THREE.OrthographicCamera(-1,1,1,-1,.1,1000),hand=new THREE.Group();camera.position.z=500;scene.add(hand);
 scene.add(new THREE.HemisphereLight(0xe7f6ff,0x52667b,2));const light=new THREE.DirectionalLight(0xfff6e8,3);light.position.set(-100,160,250);scene.add(light);
 const guideScene=new THREE.Scene();
 const guideTexture=new THREE.CanvasTexture(createHandArt({lineWidth:2.6,edgeWidth:5}));guideTexture.colorSpace=THREE.SRGBColorSpace;
 const guideMesh=new THREE.Mesh(new THREE.PlaneGeometry(240,320),new THREE.MeshBasicMaterial({map:guideTexture,transparent:true,depthWrite:false,toneMapped:false}));
 guideMesh.rotation.z=Math.PI/2;guideScene.add(guideMesh);
 let modelLoaded=false,applyGripPose=()=>{};
 const ready=new GLTFLoader().loadAsync('./assets/3d/hand/left.glb').then(gltf=>{
  const model=gltf.scene;model.updateMatrixWorld(true);
  const bone=name=>model.getObjectByName(name).getWorldPosition(new THREE.Vector3());
  const wrist=bone('wrist'),middle=bone('middle-finger-phalanx-proximal'),index=bone('index-finger-phalanx-proximal'),pinky=bone('pinky-finger-phalanx-proximal');
  const up=middle.clone().sub(wrist).normalize(),right=pinky.clone().sub(index);right.addScaledVector(up,-right.dot(up)).normalize();
  const normal=new THREE.Vector3().crossVectors(right,up).normalize();
  const bend=new THREE.Quaternion().setFromAxisAngle(right,.24);
  for(const finger of ['index','middle','ring','pinky']){
   const origin=model.getObjectByName(finger+'-finger-phalanx-proximal').position.clone();
   for(const suffix of ['phalanx-intermediate','phalanx-distal','tip']){
    const joint=model.getObjectByName(finger+'-finger-'+suffix);joint.position.sub(origin).applyQuaternion(bend).add(origin);joint.quaternion.premultiply(bend);
   }
  }
  const rest=[];model.traverse(j=>{if(j.isBone)rest.push({joint:j,position:j.position.clone(),quaternion:j.quaternion.clone()});});
  let lastGrip=null;
  applyGripPose=grip=>{
   if(lastGrip===grip)return;lastGrip=grip;
   for(const r of rest){r.joint.position.copy(r.position);r.joint.quaternion.copy(r.quaternion);}
   if(!grip)return;
   const thumbNames=['thumb-metacarpal','thumb-phalanx-proximal','thumb-phalanx-distal','thumb-tip'];
   const thumbJoints=thumbNames.map(n=>model.getObjectByName(n)),thumbPivot=thumbJoints[0].position.clone();
   const thumbTurn=new THREE.Quaternion().setFromAxisAngle(normal,.35);
   for(const joint of thumbJoints){joint.position.sub(thumbPivot).applyQuaternion(thumbTurn).add(thumbPivot);joint.quaternion.premultiply(thumbTurn);}
   thumbJoints.slice(1).forEach((joint,i)=>joint.position.addScaledVector(up,.018*(i+1)/3));

   // Curl each phalanx around its own joint so the fingers wrap a round object.
   for(const finger of ['index','middle','ring','pinky']){
    const names=['phalanx-proximal','phalanx-intermediate','phalanx-distal','tip'];
    const joints=names.map(n=>model.getObjectByName(finger+'-finger-'+n));
    for(const [level,angle] of [[0,.75],[1,.8],[2,.4]]){
     const pivot=joints[level].position.clone(),q=new THREE.Quaternion().setFromAxisAngle(right,angle);
     joints[level].quaternion.premultiply(q);
     for(let j=level+1;j<joints.length;j++){joints[j].position.sub(pivot).applyQuaternion(q).add(pivot);joints[j].quaternion.premultiply(q);}
    }
   }
  };
  const rotation=new THREE.Quaternion().setFromRotationMatrix(new THREE.Matrix4().makeBasis(right,up,normal)).invert();
  // A gentle receiving tilt, with the thumb on the left of the palm.
  rotation.premultiply(new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(1,0,0),-.85));
  const scale=90/index.distanceTo(pinky),center=wrist.clone().lerp(middle,.62).applyQuaternion(rotation).multiplyScalar(scale);
  model.quaternion.copy(rotation);model.scale.setScalar(scale);model.position.set(-4-center.x,-35-center.y,-center.z);
  model.traverse(o=>{if(o.isMesh){o.material=new THREE.MeshStandardMaterial({color:0xc98f72,roughness:.72,metalness:0,transparent:true,depthWrite:true,side:THREE.DoubleSide});
   o.material.onBeforeCompile=shader=>{
    shader.uniforms.wristOrigin={value:wrist};shader.uniforms.wristUp={value:up};
    shader.vertexShader='uniform vec3 wristOrigin;uniform vec3 wristUp;varying float wristDistance;\n'+shader.vertexShader;
    shader.vertexShader=shader.vertexShader.replace('#include <project_vertex>','wristDistance=dot(transformed-wristOrigin,wristUp);\n#include <project_vertex>');
    shader.fragmentShader='varying float wristDistance;\n'+shader.fragmentShader;
    shader.fragmentShader=shader.fragmentShader.replace('#include <opaque_fragment>','diffuseColor.a*=smoothstep(-.018,.022,wristDistance);\n#include <opaque_fragment>');
   };o.frustumCulled=false;}});
  hand.add(model);model.updateWorldMatrix(true,true);
  // Seat the snow on the rendered palm surface, including skinning and pose.
  let palmSurface=-Infinity;const vertex=new THREE.Vector3();
  model.traverse(o=>{if(!o.isMesh)return;o.skeleton?.update();for(let i=0;i<o.geometry.attributes.position.count;i++){
   o.getVertexPosition(i,vertex).applyMatrix4(o.matrixWorld);
   if(Math.abs(vertex.x+4)<42&&vertex.y>-20&&vertex.y<40)palmSurface=Math.max(palmSurface,vertex.z);
  }});
  snow.group.position.set(-4,5,Number.isFinite(palmSurface)?palmSurface+1:25);
  modelLoaded=true;return true;
 }).catch(error=>{console.warn('Virtual hand model failed to load',error);return false;});
 const snow=createPalmSnow();hand.add(snow.group);
 let visible=false;
 return {ready,set(show,point,progress=0,guide=false){visible=show;hand.userData.guide=guide;hand.userData.point=point;snow.setProgress(progress);},render(renderer,w,h){if(!visible)return;
  camera.left=-w/2;camera.right=w/2;camera.top=h/2;camera.bottom=-h/2;camera.updateProjectionMatrix();
  if(hand.userData.guide){
   const size=Math.min(230,w*.27,h*.36);guideMesh.scale.setScalar(size/320);
   guideMesh.position.set(w*.29,0,0);
   const auto=renderer.autoClear;renderer.autoClear=false;renderer.clearDepth();renderer.render(guideScene,camera);renderer.autoClear=auto;return;
  }
  if(!modelLoaded)return;
  const p=hand.userData.point||[.5,.6],size=w<=650?200:Math.min(300,Math.max(190,w*.25)),scale=size/260;
  hand.scale.set(-scale,scale,scale);const guide=hand.userData.guide;hand.position.set(((guide?p[0]:Math.max(.16,Math.min(.84,p[0])))-.5)*w,(.5-(guide?p[1]:Math.max(.38,Math.min(.72,p[1]))))*h,0);
  // The guide uses the same open right hand as the city; offset only its display.
  applyGripPose(false);hand.rotation.set(0,guide?-1.15:0,0);
  if(guide)hand.position.x=Math.min(w/2-size*.45,hand.position.x+size*.6);
  const auto=renderer.autoClear;renderer.autoClear=false;renderer.clearDepth();renderer.render(scene,camera);renderer.autoClear=auto;
 }};
}
