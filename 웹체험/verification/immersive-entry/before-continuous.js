import {SnowPhysics,boundedRoll} from './snow-physics.mjs';

// Painted photographic layers with real-time snow and a continuous zoom transition.
// This is a 2.5D scene, not a rebuilt 3D model of the generated architecture.
export function createScene(container){
  const canvas=document.createElement('canvas'),ctx=canvas.getContext('2d',{alpha:true});container.append(canvas);
  const shop=document.getElementById('shop');
  const globeImage=new Image(),cityImage=new Image();globeImage.src='./assets/redraw-v4/snowglobe-clear.png';cityImage.src='./assets/redraw-v4/new-york-wide.png';
  for(const img of [globeImage,cityImage])img.onerror=()=>window.dispatchEvent(new CustomEvent('art-error',{detail:'그림을 불러오지 못했습니다. 실행 창을 확인하고 새로고침해주세요.'}));
  let width=1,height=1,dpr=1,held=false,gripY=.5,vertical=0,pitch=0,yaw=0,airborne=0,inside=false,offsetX=0,lift=0,roll=0,look=0,targetLook=0,lookY=0,targetLookY=0,lastTravel=0;
  const physics=new SnowPhysics();
  const count=650,flakes=Array.from({length:count},()=>({x:0,y:0,z:Math.random(),vx:0,vy:0,seed:Math.random(),floor:.70+Math.random()*.033,angle:Math.random()*6.28}));
  const citySnow=Array.from({length:230},()=>({x:Math.random(),y:Math.random(),depth:Math.random()}));
  function floorAt(f){return Math.min(f.floor,.391+.35*Math.sqrt(Math.max(0,1-((f.x-.5)/.375)**2))-.004);}
  function settle(f){f.x=.5+(Math.random()-.5)*.61;f.y=floorAt(f);f.vx=0;f.vy=0;}
  function seedSnow(){flakes.forEach(settle);for(const f of flakes.slice(0,180)){f.x=.5+(Math.random()-.5)*.46;f.y=.20+Math.random()*.38;f.vy=.02;}}

  seedSnow();
  // Small irregular flakes, softly edged once in a texture atlas (no glowing dots).
  const snowTextures=Array.from({length:8},(_,i)=>{
    const tile=document.createElement('canvas');tile.width=tile.height=32;
    const g=tile.getContext('2d');g.translate(16,16);g.fillStyle='#f4f1e7';
    g.shadowColor='#f3f0e299';g.shadowBlur=i>5?3:1;
    g.beginPath();for(let k=0;k<7;k++){const a=k/7*Math.PI*2,r=7+3*Math.sin(k*5+i*3);g.lineTo(Math.cos(a)*r,Math.sin(a)*r*.75);}g.closePath();g.fill();return tile;
  });
  function resize(){width=container.clientWidth;height=container.clientHeight;dpr=Math.min(devicePixelRatio,1.75);canvas.width=width*dpr;canvas.height=height*dpr;canvas.style.width=`${width}px`;canvas.style.height=`${height}px`;ctx.setTransform(dpr,0,0,dpr,0,0);}
  window.addEventListener('resize',resize);resize();
  function imageReady(img){return img.complete&&img.naturalWidth>0;}
  function drawCity(dt,time,opacity,travel){
    if(!imageReady(cityImage))return;
    ctx.save();ctx.globalAlpha=opacity;
    const arrival=Math.max(0,Math.min(1,(travel-.58)/.42));
    const zoom=1.12+.22*(1-(1-arrival)**3),scale=Math.max(width/cityImage.naturalWidth,height/cityImage.naturalHeight)*zoom;
    const iw=cityImage.naturalWidth*scale,ih=cityImage.naturalHeight*scale;
    look+=(targetLook-look)*(1-Math.exp(-dt*2));lookY+=(targetLookY-lookY)*(1-Math.exp(-dt*2));
    ctx.drawImage(cityImage,(width-iw)/2-look*Math.max(0,(iw-width)/2)*.96,(height-ih)/2-lookY*Math.max(0,(ih-height)/2)*.96,iw,ih);
    for(const f of citySnow){f.y+=dt*(.018+f.depth*.13);f.x+=Math.sin(time*.3+f.depth*20)*dt*.007;if(f.y>1.03){f.y=-.03;f.x=Math.random();}const x=((f.x+1)%1)*width-look*f.depth*30,y=f.y*height,r=(.7+f.depth**3*5.5)*(width/1440+.5);ctx.fillStyle=`rgba(245,248,238,${.25+f.depth*.62})`;ctx.beginPath();ctx.arc(x,y,r,0,Math.PI*2);ctx.fill();}
    ctx.restore();
  }
  return {canvas,lookAt(x,y=.5){targetLook=Math.max(-1,Math.min(1,(x-.5)*2));targetLookY=Math.max(-1,Math.min(1,(y-.5)*2));},reset(){seedSnow();physics.reset();held=false;gripY=.5;offsetX=lift=roll=vertical=pitch=yaw=look=targetLook=lookY=targetLookY=0;shop.style.opacity='1';},update(dt,time,motion,travel=0){
    inside=travel>=1;lastTravel=travel;const tracked=motion.last&&(motion.keepHeld||time-motion.last.t<.5);
    if((motion.keepHeld||tracked)&&!held)gripY=motion.y;
    held=Boolean(motion.keepHeld||tracked);
    const holding=held,energy=holding?motion.energy:0;
    const mobile=width<650,sceneH=height*(mobile?.70:1),bgH=Math.max(sceneH,width*1520/2688),bgY=(sceneH-bgH)/2;
    const size=Math.min(height*(mobile?.43:.66),width*(mobile?.76:.53)),baseY=bgY+bgH*.80;
    offsetX+=((tracked&&holding?(motion.x-.5)*size*.65:0)-offsetX)*(1-Math.exp(-dt*8));
    lift+=((holding?size*Math.max(.04,Math.min(.24,.08+(gripY-motion.y)*.45)):0)-lift)*(1-Math.exp(-dt*5));
    vertical+=((holding?Math.max(-.18,Math.min(.18,motion.y-gripY))*size*.6:0)-vertical)*(1-Math.exp(-dt*8));
    roll+=((tracked&&holding?boundedRoll(motion.wristRoll||0):0)-roll)*(1-Math.exp(-dt*9));
    pitch+=((holding?(motion.pitch||0)+(motion.y-gripY)*1.3:0)-pitch)*(1-Math.exp(-dt*7));
    yaw+=((holding?(motion.x-.5)*.8:0)-yaw)*(1-Math.exp(-dt*7));
    const x=width*.5+offsetX,y=baseY-size*.48-Math.max(holding?size*.045:0,lift-vertical);
    physics.step(flakes,dt,time,x/size,y/size,roll);
    ctx.clearRect(0,0,width,height);
    const cityOpacity=Math.max(0,Math.min(1,(travel-.58)/.28));shop.style.opacity=String(1-cityOpacity);
    if(cityOpacity>0)drawCity(dt,time,cityOpacity,travel);
    if(travel<.86&&imageReady(globeImage)){
      ctx.save();ctx.globalAlpha=(1-cityOpacity)*Math.max(.12,.35-lift/size);
      ctx.translate(x,baseY);ctx.scale(1,.12);
      const shadow=ctx.createRadialGradient(0,0,0,0,0,size*.31);
      shadow.addColorStop(0,'#091810');shadow.addColorStop(1,'#09181000');
      ctx.fillStyle=shadow;ctx.fillRect(-size*.4,-size*.4,size*.8,size*.8);ctx.restore();
      ctx.save();ctx.globalAlpha=1-cityOpacity;
      const approach=Math.min(1,travel/.86),focus=approach*approach*(3-2*approach);
      const zoom=Math.exp(approach*approach*Math.log(8));
      // Uniform scale + rotation preserve the glass silhouette. Aim at the city inside the glass.
      ctx.translate(x+(width/2-x)*focus,y+(height/2-y)*focus);
      ctx.scale(zoom,zoom);ctx.rotate(roll*(1-focus));ctx.translate(0,size*.109*focus);
      ctx.drawImage(globeImage,-size/2,-size/2,size,size);
      ctx.translate(-size/2,-size/2);ctx.beginPath();ctx.ellipse(size*.5,size*.391,size*.392,size*.364,0,0,Math.PI*2);ctx.clip();
      airborne=0;
      for(const f of flakes){
        const bottom=floorAt(f);
        if(f.y<bottom-.005){
          airborne++;
          const edge=Math.max(.15,1-Math.abs(f.x-.5)/.42),r=size*(.005+f.z*f.z*.007);
          ctx.save();ctx.globalAlpha=(1-cityOpacity)*(.50+f.z*.35)*edge;
          ctx.translate(f.x*size,f.y*size);ctx.rotate(f.angle);ctx.scale(1,.5+.5*Math.abs(Math.sin(f.angle)));
          ctx.drawImage(snowTextures[Math.floor(f.seed*8)],-r,-r,r*2,r*2);ctx.restore();
        }
      }
      ctx.restore();
    }

    container.dataset.airborne=String(airborne);container.dataset.snowHeight=String(airborne?flakes.filter(f=>f.y<floorAt(f)-.005).reduce((sum,f)=>sum+f.y,0)/airborne:0);container.dataset.holding=String(held);container.dataset.tilt=JSON.stringify([roll,pitch,yaw]);
  },stats(){return {artMode:'photographic-layers',airborne,particles:count,inside,citySnowVisible:lastTravel>=.6,holding:held,lift,offsetX,roll,artLoaded:imageReady(globeImage)&&imageReady(cityImage)};}};
}
