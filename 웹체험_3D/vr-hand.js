import {createPalmSnow} from './palm-snow3d.js';
import * as THREE from './vendor/three.module.js';

// Transparent hand contour, fading at the wrist like the supplied reference.
// The same renderer still lights the snow; the outline has no opaque palm fill.
export function createVirtualHand(){
 const scene=new THREE.Scene(),camera=new THREE.OrthographicCamera(-1,1,1,-1,.1,1000),hand=new THREE.Group();camera.position.z=500;scene.add(hand);
 scene.add(new THREE.HemisphereLight(0xe7f6ff,0x52667b,2));const light=new THREE.DirectionalLight(0xfff6e8,3);light.position.set(-100,160,250);scene.add(light);
 const canvas=document.createElement('canvas');canvas.width=720;canvas.height=960;
 const ctx=canvas.getContext('2d');ctx.scale(3,3);ctx.lineCap='round';ctx.lineJoin='round';
 const contour=new Path2D(`M 65 306
 C 70 281 73 259 68 238 C 64 223 54 209 50 193
 C 45 177 44 161 39 146 L 30 120
 C 27 112 28 106 33 104 C 39 102 43 106 46 114
 L 57 140 C 60 146 62 155 65 160
 C 68 164 72 161 71 155 L 62 123 L 55 93 L 51 77
 C 49 69 52 63 58 62 C 65 61 69 67 71 75
 L 78 100 L 84 123 L 89 142 C 90 146 94 146 95 142
 C 96 136 92 121 91 110 L 86 82 L 83 61
 C 82 52 85 46 91 45 C 98 44 102 49 104 58
 L 109 81 L 113 105 L 116 132 C 117 139 121 139 123 133
 L 130 110 L 138 88 L 144 73
 C 148 65 154 63 159 66 C 165 69 165 75 162 83
 L 155 104 L 149 126 C 144 140 141 153 143 165
 C 144 176 148 185 155 185 C 163 185 171 174 180 166
 C 188 158 195 156 201 160 C 207 165 202 173 197 179
 L 181 196 C 174 203 171 214 164 223
 C 157 233 146 241 141 253 C 136 268 136 286 139 306`);
 const fade=ctx.createLinearGradient(0,0,0,310);
 fade.addColorStop(0,'rgba(255,255,255,.98)');fade.addColorStop(.65,'rgba(255,255,255,.95)');fade.addColorStop(.79,'rgba(255,255,255,.5)');fade.addColorStop(1,'rgba(255,255,255,0)');
 ctx.strokeStyle=fade;ctx.lineWidth=1.45;ctx.stroke(contour);
 const texture=new THREE.CanvasTexture(canvas);texture.colorSpace=THREE.SRGBColorSpace;
 const outline=new THREE.Mesh(new THREE.PlaneGeometry(240,320),new THREE.MeshBasicMaterial({map:texture,transparent:true,depthWrite:false,toneMapped:false}));
 outline.position.set(0,-10,0);hand.add(outline);
 const snow=createPalmSnow();hand.add(snow.group);
 let visible=false;
 return {ready:Promise.resolve(true),set(show,point,progress=0){visible=show;hand.userData.point=point;snow.setProgress(progress);},render(renderer,w,h){if(!visible)return;
  camera.left=-w/2;camera.right=w/2;camera.top=h/2;camera.bottom=-h/2;camera.updateProjectionMatrix();
  const p=hand.userData.point||[.5,.6],size=w<=650?200:Math.min(300,Math.max(190,w*.25)),scale=size/260;
  hand.scale.setScalar(scale);hand.position.set((Math.max(.16,Math.min(.84,p[0]))-.5)*w,(.5-Math.max(.38,Math.min(.72,p[1])))*h,0);
  const auto=renderer.autoClear;renderer.autoClear=false;renderer.clearDepth();renderer.render(scene,camera);renderer.autoClear=auto;
 }};
}
