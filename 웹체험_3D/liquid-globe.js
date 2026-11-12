import {GLTFLoader} from './vendor/GLTFLoader.js';

// Blender-authored water volume; independent from the existing miniature asset.
export function createLiquid(model){
 let volume=null;
 const ready=new GLTFLoader().loadAsync('./assets/3d/liquid.glb').then(gltf=>{
  volume=gltf.scene;volume.name='LIQUID_VOLUME';
  volume.traverse(o=>{if(o.isMesh){o.castShadow=false;o.receiveShadow=false;o.renderOrder=1;o.material.depthWrite=false;o.material.envMapIntensity=.35;}});
  model.add(volume);return true;
 });
 return {ready,setLightweight(enabled){if(volume)volume.traverse(o=>{if(o.isMesh){const m=o.material;if(m.userData.originalTransmission===undefined)m.userData.originalTransmission=m.transmission;m.transmission=enabled?0:m.userData.originalTransmission;m.transparent=true;m.opacity=enabled?.035:1;m.needsUpdate=true;}});},setTravel(travel){if(volume)volume.visible=travel<.44;},stats(){return {liquidLoaded:!!volume,liquidVisible:!!volume?.visible};}};
}
