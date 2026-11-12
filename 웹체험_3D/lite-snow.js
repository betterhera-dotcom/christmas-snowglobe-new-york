import * as THREE from './vendor/three.module.js';
// Decorative flakes have no CPU collision loop. The 3,000 physical flakes still
// settle on the miniature; this layer only adds density while snow is suspended.
export function createLiteSnow(count=6000){
 const positions=new Float32Array(count*3),seeds=new Float32Array(count);
 for(let i=0;i<count;i++){
  const y=Math.random()*2-1,a=Math.random()*Math.PI*2,r=Math.cbrt(Math.random())*1.36;
  positions.set([Math.sqrt(1-y*y)*Math.cos(a)*r,y*r,Math.sqrt(1-y*y)*Math.sin(a)*r],i*3);seeds[i]=Math.random();
 }
 const geometry=new THREE.BufferGeometry();geometry.setAttribute('position',new THREE.BufferAttribute(positions,3));geometry.setAttribute('seed',new THREE.BufferAttribute(seeds,1));
 const material=new THREE.ShaderMaterial({transparent:true,depthWrite:false,uniforms:{time:{value:0},amount:{value:0},pixelRatio:{value:1}},
 vertexShader:`attribute float seed;uniform float time;uniform float amount;uniform float pixelRatio;varying float alpha;void main(){float a=time*(.12+seed*.18);float c=cos(a),s=sin(a);vec3 p=position;p.xz=mat2(c,-s,s,c)*p.xz;p.y+=1.78;vec4 mv=modelViewMatrix*vec4(p,1.);gl_Position=projectionMatrix*mv;gl_PointSize=clamp((2.+seed*3.)*pixelRatio*3./max(.5,-mv.z),1.,12.);alpha=amount*(.35+seed*.45);}`,
 fragmentShader:`varying float alpha;void main(){float d=length(gl_PointCoord-.5);if(d>.48)discard;gl_FragColor=vec4(.94,.97,1.,alpha*(1.-smoothstep(.3,.48,d)));}`});
 const mesh=new THREE.Points(geometry,material);mesh.frustumCulled=false;let amount=0;
 return {mesh,update(dt,time,agitation,travel,ratio){amount+=(Math.min(1,agitation*2)-amount)*(1-Math.exp(-dt*2));mesh.visible=travel<.42&&amount>.01;material.uniforms.time.value=time;material.uniforms.amount.value=amount;material.uniforms.pixelRatio.value=ratio;}};
}
