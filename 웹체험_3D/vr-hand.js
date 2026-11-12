import {createHandArt} from './hand-art.js';
import {createPalmSnow} from './palm-snow3d.js';
import * as THREE from './vendor/three.module.js';

// Transparent hand contour, fading at the wrist like the supplied reference.
// The same renderer still lights the snow; the outline has no opaque palm fill.
export function createVirtualHand(){
 const scene=new THREE.Scene(),camera=new THREE.OrthographicCamera(-1,1,1,-1,.1,1000),hand=new THREE.Group();camera.position.z=500;scene.add(hand);
 scene.add(new THREE.HemisphereLight(0xe7f6ff,0x52667b,2));const light=new THREE.DirectionalLight(0xfff6e8,3);light.position.set(-100,160,250);scene.add(light);
 const canvas=createHandArt();
 const texture=new THREE.CanvasTexture(canvas);texture.colorSpace=THREE.SRGBColorSpace;
 const outline=new THREE.Mesh(new THREE.PlaneGeometry(240,320),new THREE.MeshBasicMaterial({map:texture,transparent:true,depthWrite:false,toneMapped:false}));
 outline.position.set(0,-10,0);hand.add(outline);
 const snow=createPalmSnow();hand.add(snow.group);
 let visible=false;
 return {ready:Promise.resolve(true),set(show,point,progress=0){visible=show;hand.userData.point=point;snow.setProgress(progress);},render(renderer,w,h){if(!visible)return;
  camera.left=-w/2;camera.right=w/2;camera.top=h/2;camera.bottom=-h/2;camera.updateProjectionMatrix();
  const p=hand.userData.point||[.5,.6],size=Math.min(w*.48,h*.58,w<=650?250:400),scale=size/260;
  hand.scale.setScalar(scale);
  const marginX=120*scale+12,marginY=170*scale+12;
  hand.position.set(Math.max(-w/2+marginX,Math.min(w/2-marginX,(p[0]-.5)*w)),Math.max(-h/2+marginY,Math.min(h/2-marginY,(.5-Math.max(.38,Math.min(.72,p[1])))*h)),0);
  const auto=renderer.autoClear;renderer.autoClear=false;renderer.clearDepth();renderer.render(scene,camera);renderer.autoClear=auto;
 }};
}
