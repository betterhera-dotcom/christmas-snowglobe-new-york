import * as THREE from './vendor/three.module.js';
// The city camera turns in place. A fixed, perspective-baked card preserves
// the distant object's projection from that eye without drawing its meshes.
export function flattenDistantObject(object,renderer,world,eye,cutoff=6){
 object.updateWorldMatrix(true,true);
 const box=new THREE.Box3().setFromObject(object),sphere=box.getBoundingSphere(new THREE.Sphere());
 const distance=eye.distanceTo(sphere.center);
 if(box.isEmpty()||distance-sphere.radius<cutoff)return null;
 const halfAngle=Math.asin(Math.min(.95,sphere.radius/distance))*1.04;
 const size=2*distance*Math.tan(halfAngle),resolution=distance<10?768:512;
 const camera=new THREE.PerspectiveCamera(THREE.MathUtils.radToDeg(halfAngle*2),1,.02,distance+sphere.radius+2);
 camera.position.copy(eye);camera.lookAt(sphere.center);camera.updateMatrixWorld();
 const bake=new THREE.Scene();bake.environment=world.environment;
 const copy=object.clone();object.matrixWorld.decompose(copy.position,copy.quaternion,copy.scale);bake.add(copy);
 world.traverse(o=>{if(o.isLight){const light=o.clone();o.updateWorldMatrix(true,false);o.matrixWorld.decompose(light.position,light.quaternion,light.scale);light.castShadow=false;bake.add(light);}});
 const target=new THREE.WebGLRenderTarget(resolution,resolution,{type:THREE.HalfFloatType});
 const oldTarget=renderer.getRenderTarget(),oldTone=renderer.toneMapping,oldAlpha=renderer.getClearAlpha(),oldColor=renderer.getClearColor(new THREE.Color());
 try{renderer.toneMapping=THREE.NoToneMapping;renderer.setRenderTarget(target);renderer.setClearColor(0x000000,0);renderer.clear();renderer.render(bake,camera);}
 finally{renderer.setRenderTarget(oldTarget);renderer.toneMapping=oldTone;renderer.setClearColor(oldColor,oldAlpha);}
 const card=new THREE.Mesh(new THREE.PlaneGeometry(size,size),new THREE.MeshBasicMaterial({map:target.texture,transparent:true,alphaTest:.03,depthWrite:true}));
 card.name='DISTANT_PLANE_'+object.name;card.position.copy(sphere.center);card.quaternion.copy(camera.quaternion);
 card.userData.bakedTarget=target;card.userData.originalTriangles=0;
 object.traverse(o=>{if(o.isMesh)card.userData.originalTriangles+=(o.geometry.index?.count||o.geometry.attributes.position.count)/3;});
 world.add(card);object.visible=false;return card;
}
