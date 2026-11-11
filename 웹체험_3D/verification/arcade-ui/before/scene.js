import * as THREE from './vendor/three.module.js';

export function createScene(container){
  const renderer=new THREE.WebGLRenderer({antialias:true,alpha:true});
  renderer.setPixelRatio(Math.min(devicePixelRatio,1.75));renderer.setClearColor(0x000000,0);
  renderer.outputColorSpace=THREE.SRGBColorSpace;renderer.toneMapping=THREE.ACESFilmicToneMapping;renderer.toneMappingExposure=1.35;
  container.append(renderer.domElement);
  const scene=new THREE.Scene(),camera=new THREE.PerspectiveCamera(38,1,.1,70);
  camera.position.set(0,1.0,10.4);camera.lookAt(0,-.15,0);
  scene.add(new THREE.HemisphereLight(0xc7eaff,0x443023,2.1));
  const key=new THREE.DirectionalLight(0xffd4a0,4);key.position.set(-4,6,5);scene.add(key);
  const fill=new THREE.DirectionalLight(0x8dc9ff,2);fill.position.set(4,3,-3);scene.add(fill);
  const globe=new THREE.Group();scene.add(globe);
  const material=(color,opts={})=>new THREE.MeshStandardMaterial({color,roughness:.6,...opts});
  const gold=material(0xb69860,{metalness:.75,roughness:.25}),wood=material(0x3c211b,{roughness:.38}),snow=material(0xe3eeeb),buildingMaterials=[0x607e87,0x59666e,0x76838a,0x4b6772].map(c=>material(c,{metalness:.15}));
  function mesh(geometry,mat,x,y,z,parent=globe){const item=new THREE.Mesh(geometry,mat);item.position.set(x,y,z);parent.add(item);return item;}
  const shell=[];
  function cylinder(top,bottom,height,mat,y){const item=mesh(new THREE.CylinderGeometry(top,bottom,height,96),mat,0,y,0);shell.push(item);return item;}
  cylinder(1.70,1.83,.25,wood,-1.78);cylinder(1.84,1.84,.07,gold,-1.92);cylinder(1.72,1.80,.08,gold,-1.63);cylinder(1.64,1.67,.08,snow,-1.55);
  // Warm desk plane and a soft contact shadow.
  const table=mesh(new THREE.PlaneGeometry(200,200),material(0x342a24,{roughness:.85}),0,-1.97,0,scene);table.rotation.x=-Math.PI/2;
  const shadowCanvas=document.createElement('canvas');shadowCanvas.width=shadowCanvas.height=128;const sc=shadowCanvas.getContext('2d');const sg=sc.createRadialGradient(64,64,3,64,64,64);sg.addColorStop(0,'#000000bb');sg.addColorStop(1,'#00000000');sc.fillStyle=sg;sc.fillRect(0,0,128,128);
  const shadow=mesh(new THREE.PlaneGeometry(5.7,5.7),new THREE.MeshBasicMaterial({map:new THREE.CanvasTexture(shadowCanvas),transparent:true,depthWrite:false}),0,-1.96,0,scene);shadow.rotation.x=-Math.PI/2;
  const windows=[];
  function building(x,z,w,d,h,style=0){
    mesh(new THREE.BoxGeometry(w,h,d),buildingMaterials[style%4],x,-1.5+h/2,z);
    mesh(new THREE.BoxGeometry(w+.03,.045,d+.03),snow,x,-1.49+h,z);
    for(let row=.14;row<h-.08;row+=.16)for(let col=-w/2+.07;col<w/2-.03;col+=.12){
      if(Math.sin(row*31+col*47+x*17)>.0)windows.push([x+col,-1.5+row,z+d/2+.005]);
    }
    for(let row=.15;row<h-.05;row+=.26)mesh(new THREE.BoxGeometry(w+.016,.012,d+.016),material(0x94a1a0),x,-1.5+row,z);
  }
  building(0,-.65,.56,.44,2.45,1);building(-.02,-.65,.39,.32,2.67,1);building(-.02,-.65,.23,.22,2.83,1);
  mesh(new THREE.CylinderGeometry(.014,.025,.34,8),gold,-.02,1.47,-.65);
  building(-.7,-.48,.38,.37,1.7,0);building(-1.15,-.1,.34,.4,1.2,2);building(.66,-.5,.42,.39,1.8,3);building(1.15,-.08,.33,.44,1.3,0);
  building(-.85,.48,.35,.36,.76,1);building(.88,.44,.36,.32,.9,2);
  const wm=new THREE.InstancedMesh(new THREE.PlaneGeometry(.045,.07),new THREE.MeshBasicMaterial({color:0xffdb8b}),windows.length),matrix=new THREE.Matrix4();
  windows.forEach((p,i)=>{matrix.makeTranslation(...p);wm.setMatrixAt(i,matrix);});globe.add(wm);
  // Central Rockefeller-inspired tree and skating rink.
  const rink=mesh(new THREE.CircleGeometry(.58,64),material(0x8cb9c2,{metalness:.4,roughness:.2}),0,-1.493,.78);rink.rotation.x=-Math.PI/2;rink.scale.set(1,.7,1);
  const rail=mesh(new THREE.TorusGeometry(.61,.018,8,64),gold,0,-1.47,.78);rail.rotation.x=-Math.PI/2;rail.scale.y=.7;
  mesh(new THREE.CylinderGeometry(.06,.08,.28,12),wood,0,-1.38,.15);
  const green=material(0x1b5543,{roughness:.95});
  for(let i=0;i<5;i++)mesh(new THREE.ConeGeometry(.48-i*.075,.48,12),green,0,-1.2+i*.24,.15);
  const starShape=new THREE.Shape();for(let i=0;i<10;i++){const a=i*Math.PI/5+Math.PI/2,r=i%2?.055:.13;const x=Math.cos(a)*r,y=Math.sin(a)*r;i?starShape.lineTo(x,y):starShape.moveTo(x,y);}starShape.closePath();
  const star=mesh(new THREE.ExtrudeGeometry(starShape,{depth:.025,bevelEnabled:false}),new THREE.MeshBasicMaterial({color:0xffe4a3}),0,.12,.15);
  const lightPositions=[],lightColors=[];const c=new THREE.Color();
  for(let i=0;i<160;i++){const y=i/160*1.1,r=(1-y/1.2)*.43,a=i*.69;lightPositions.push(Math.cos(a)*r,-1.2+y,.15+Math.sin(a)*r);c.setHex([0xffd998,0xffe7b4,0xe88359,0xa3d7ca][i%4]);lightColors.push(c.r,c.g,c.b);}
  const lg=new THREE.BufferGeometry();lg.setAttribute('position',new THREE.Float32BufferAttribute(lightPositions,3));lg.setAttribute('color',new THREE.Float32BufferAttribute(lightColors,3));
  const dotCanvas=document.createElement('canvas');dotCanvas.width=dotCanvas.height=64;const dc=dotCanvas.getContext('2d'),gradient=dc.createRadialGradient(32,32,0,32,32,32);gradient.addColorStop(0,'white');gradient.addColorStop(.18,'#fffffff0');gradient.addColorStop(.45,'#ffffff55');gradient.addColorStop(1,'#ffffff00');dc.fillStyle=gradient;dc.fillRect(0,0,64,64);const dot=new THREE.CanvasTexture(dotCanvas);
  const lights=new THREE.Points(lg,new THREE.PointsMaterial({size:.09,map:dot,vertexColors:true,transparent:true,depthWrite:false,blending:THREE.AdditiveBlending}));globe.add(lights);
  // Small lamps along the rink and red parcels at the foot of the tree.
  for(const x of [-.64,.64])for(const z of [.25,1.06]){mesh(new THREE.CylinderGeometry(.012,.017,.34,8),gold,x,-1.32,z);mesh(new THREE.SphereGeometry(.045,12,8),new THREE.MeshBasicMaterial({color:0xffdb99}),x,-1.12,z);}
  for(let i=0;i<5;i++){const x=(i-2)*.13;mesh(new THREE.BoxGeometry(.1,.09,.1),material(i%2?0xa13b31:0xe2ba76),x,-1.43,.42);}
  // Glass rim shader keeps the miniature readable while suggesting a reflective sphere.
  const glass=new THREE.ShaderMaterial({transparent:true,depthWrite:false,uniforms:{t:{value:0}},vertexShader:`varying vec3 n;varying vec3 v;void main(){vec4 mv=modelViewMatrix*vec4(position,1.);n=normalize(normalMatrix*normal);v=normalize(-mv.xyz);gl_Position=projectionMatrix*mv;}`,fragmentShader:`varying vec3 n;varying vec3 v;void main(){float rim=pow(1.-abs(dot(normalize(n),normalize(v))),2.7);float shine=pow(max(0.,dot(normalize(n),normalize(vec3(-.55,.55,.65)))),65.);float shine2=pow(max(0.,dot(normalize(n),normalize(vec3(.8,.15,.3)))),90.);gl_FragColor=vec4(vec3(.65,.85,.9)+shine*.3,rim*.36+shine*.19+shine2*.1);}`});
  shell.push(mesh(new THREE.SphereGeometry(2.21,80,56),glass,0,0,0));
  // Snow starts settled; shaking lifts it and adds swirl, then gravity settles it again.
  const count=1400,positions=new Float32Array(count*3),velocities=new Float32Array(count*3),seeds=new Float32Array(count);
  function settle(i){const a=Math.random()*Math.PI*2,r=Math.sqrt(Math.random())*1.57;positions[i*3]=Math.cos(a)*r;positions[i*3+1]=-1.47+Math.random()*.04;positions[i*3+2]=Math.sin(a)*r;velocities.fill(0,i*3,i*3+3);}
  for(let i=0;i<count;i++){settle(i);seeds[i]=Math.random();}
  const snowCanvas=document.createElement('canvas');snowCanvas.width=snowCanvas.height=64;
  const snowContext=snowCanvas.getContext('2d'),snowGradient=snowContext.createRadialGradient(32,32,0,32,32,32);
  snowGradient.addColorStop(0,'#ffffff');snowGradient.addColorStop(.48,'#fffffff5');snowGradient.addColorStop(1,'#ffffff00');snowContext.fillStyle=snowGradient;snowContext.fillRect(0,0,64,64);
  const snowDot=new THREE.CanvasTexture(snowCanvas);
  const geometry=new THREE.BufferGeometry();geometry.setAttribute('position',new THREE.BufferAttribute(positions,3));geometry.setDrawRange(350,count-350);
  const flakeMaterial=new THREE.PointsMaterial({color:0xf3fcff,size:.08,map:snowDot,transparent:true,opacity:.95,depthWrite:false,sizeAttenuation:true});
  const flakes=new THREE.Points(geometry,flakeMaterial);globe.add(flakes);
  const largeGeometry=new THREE.BufferGeometry();largeGeometry.setAttribute('position',geometry.attributes.position);largeGeometry.setDrawRange(0,350);
  const largeMaterial=flakeMaterial.clone();largeMaterial.size=.12;
  globe.add(new THREE.Points(largeGeometry,largeMaterial));
  // Same miniature becomes an eye-level world. Extend only the snow ground inside it.
  const cityGround=mesh(new THREE.PlaneGeometry(60,60),snow,0,-1.51,0);cityGround.rotation.x=-Math.PI/2;cityGround.visible=false;
  const citySnowPositions=new Float32Array(600*3);
  function resetCitySnow(){for(let i=0;i<600;i++){citySnowPositions[i*3]=(Math.random()-.5)*7;citySnowPositions[i*3+1]=-1.4+Math.random()*5;citySnowPositions[i*3+2]=-3+Math.random()*5.2;}}
  resetCitySnow();const citySnowGeometry=new THREE.BufferGeometry();citySnowGeometry.setAttribute('position',new THREE.BufferAttribute(citySnowPositions,3));
  const citySnow=new THREE.Points(citySnowGeometry,new THREE.PointsMaterial({color:0xf4fbff,size:.028,map:snowDot,transparent:true,opacity:.85,depthWrite:false}));citySnow.visible=false;scene.add(citySnow);
  // Label on the pedestal.
  const labelCanvas=document.createElement('canvas');labelCanvas.width=512;labelCanvas.height=96;const lc=labelCanvas.getContext('2d');lc.fillStyle='#b99b65';lc.fillRect(0,0,512,96);lc.fillStyle='#352e23';lc.textAlign='center';lc.font='28px Georgia';lc.fillText('N E W   Y O R K',256,43);lc.font='12px sans-serif';lc.fillText('A  W I N T E R  T O  R E M E M B E R',256,69);
  shell.push(mesh(new THREE.PlaneGeometry(.86,.16),new THREE.MeshBasicMaterial({map:new THREE.CanvasTexture(labelCanvas)}),0,-1.78,1.824));
  let width=1,height=1,airborne=0,previousTravel=-1,inside=false;
  const startCamera=new THREE.Vector3(0,1,10.4),endCamera=new THREE.Vector3(0,-1.20,1.65),lookTarget=new THREE.Vector3();
  function project(travel){camera.fov=(width<600?49:38)*(1-travel)+72*travel;camera.setViewOffset(width,height,width>900?-width*.105*(1-travel):0,0,width,height);camera.updateProjectionMatrix();}
  function resize(){width=container.clientWidth;height=container.clientHeight;renderer.setSize(width,height,false);camera.aspect=width/height;project(Math.max(0,previousTravel));}
  window.addEventListener('resize',resize);resize();
  return {canvas:renderer.domElement,reset(){for(let i=0;i<count;i++)settle(i);resetCitySnow();},update(dt,time,motion,travel=0){
    const progress=travel*travel*(3-2*travel);inside=travel>=1;
    if(progress!==previousTravel){project(progress);previousTravel=progress;}
    camera.position.lerpVectors(startCamera,endCamera,progress);lookTarget.set(0,-.15+(-.54+.15)*progress,-.45*progress);camera.lookAt(lookTarget);
    shell.forEach(item=>item.visible=travel<.6);table.visible=shadow.visible=travel<.6;cityGround.visible=citySnow.visible=travel>=.6;
    scene.background=travel>=.6?new THREE.Color(0x14252f):null;
    flakeMaterial.size=.08*(1-progress*.8);largeMaterial.size=.12*(1-progress*.8);
    const energy=motion.energy,tracked=motion.last&&time-motion.last.t<.5;
    const targetX=tracked&&travel===0?(motion.x-.5)*.8:0,targetY=tracked&&travel===0?Math.max(0,(.65-motion.y))*.65:0;
    globe.position.x+=(targetX-globe.position.x)*(1-Math.exp(-dt*5));globe.position.y+=(targetY-globe.position.y)*(1-Math.exp(-dt*4));
    const targetRoll=tracked&&travel===0?-(motion.x-.5)*.16:0;globe.rotation.z+=(targetRoll-globe.rotation.z)*(1-Math.exp(-dt*7));globe.rotation.y=Math.sin(time*.18)*.035*(1-progress);
    star.rotation.y=Math.sin(time*.6)*.2;airborne=0;
    for(let i=0;i<count;i++){
      const j=i*3;let x=positions[j],y=positions[j+1],z=positions[j+2];
      if(y<=-1.43&&energy>.055&&Math.random()<energy*dt*4){velocities[j+1]=.6+energy*2+seeds[i];velocities[j]=(Math.random()-.5)*energy*2;velocities[j+2]=(Math.random()-.5)*energy*2;}
      if(y>-1.44||velocities[j+1]>0){
        velocities[j]+=(Math.sin(time*2+seeds[i]*20)*energy*.55-z*energy*.35)*dt;
        velocities[j+2]+=(Math.cos(time*2+seeds[i]*20)*energy*.55+x*energy*.35)*dt;
        velocities[j+1]-=(.32+.16*seeds[i])*dt;
        velocities[j]*=Math.exp(-dt*.8);velocities[j+2]*=Math.exp(-dt*.8);
        x+=velocities[j]*dt;y+=velocities[j+1]*dt;z+=velocities[j+2]*dt;
        const length=Math.hypot(x,y,z);if(length>2.1){const scale=2.09/length;x*=scale;y*=scale;z*=scale;const d=(velocities[j]*x+velocities[j+1]*y+velocities[j+2]*z)/(2.09**2);if(d>0){velocities[j]-=1.5*d*x;velocities[j+1]-=1.5*d*y;velocities[j+2]-=1.5*d*z;}}
        if(y<-1.46){y=-1.46;velocities[j+1]=0;const r=Math.hypot(x,z);if(r>1.58){x*=1.58/r;z*=1.58/r;}}
        positions[j]=x;positions[j+1]=y;positions[j+2]=z;if(y>-1.35)airborne++;
      }
    }
    if(citySnow.visible){for(let i=0;i<600;i++){const j=i*3;citySnowPositions[j]+=Math.sin(time*.5+i)*dt*.025;citySnowPositions[j+1]-=dt*(.12+(i%7)*.025);if(citySnowPositions[j+1]<-1.48)citySnowPositions[j+1]=3.5;}citySnowGeometry.attributes.position.needsUpdate=true;}
    geometry.attributes.position.needsUpdate=true;renderer.render(scene,camera);
  },stats(){return {airborne,particles:count,drawCalls:renderer.info.render.calls,inside,cameraZ:camera.position.z,flakeSize:flakeMaterial.size,citySnowVisible:citySnow.visible};}};
}
