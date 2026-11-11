import {createFairyVideo} from './fairy-video.js';

// Painted photographic layers with real-time snow and a continuous zoom transition.
// This is a 2.5D scene, not a rebuilt 3D model of the generated architecture.
export function createScene(container){
  const canvas=document.createElement('canvas'),ctx=canvas.getContext('2d',{alpha:true});container.append(canvas);
  const fairy=document.getElementById('fairy'),fairyVideo=createFairyVideo(fairy),shop=document.getElementById('shop');
  const globeImage=new Image(),cityImage=new Image();globeImage.src='./assets/new-york-globe.png';cityImage.src='./assets/new-york-city.png';
  for(const img of [globeImage,cityImage])img.onerror=()=>window.dispatchEvent(new CustomEvent('art-error',{detail:'그림을 불러오지 못했습니다. 실행 창을 확인하고 새로고침해주세요.'}));
  let width=1,height=1,dpr=1,fairyFlight=0,fairyStarted=false,airborne=0,inside=false,offsetX=0,lift=0,roll=0,look=0,targetLook=0,lastTravel=0;
  const count=1000,flakes=Array.from({length:count},()=>({x:0,y:0,z:Math.random(),vx:0,vy:0,seed:Math.random()}));
  const citySnow=Array.from({length:230},()=>({x:Math.random(),y:Math.random(),depth:Math.random()}));
  function settle(f){f.x=.5+(Math.random()-.5)*.61;f.y=.733+Math.random()*.012;f.vx=0;f.vy=0;}
  flakes.forEach(settle);
  function resize(){width=container.clientWidth;height=container.clientHeight;dpr=Math.min(devicePixelRatio,1.75);canvas.width=width*dpr;canvas.height=height*dpr;canvas.style.width=`${width}px`;canvas.style.height=`${height}px`;ctx.setTransform(dpr,0,0,dpr,0,0);}
  window.addEventListener('resize',resize);resize();
  const smooth=x=>x*x*(3-2*x);
  function imageReady(img){return img.complete&&img.naturalWidth>0;}
  function drawCity(dt,time,opacity,travel){
    if(!imageReady(cityImage))return;
    ctx.save();ctx.globalAlpha=opacity;
    const zoom=1.045+(1-travel)*.22,scale=Math.max(width/cityImage.naturalWidth,height/cityImage.naturalHeight)*zoom;
    const iw=cityImage.naturalWidth*scale,ih=cityImage.naturalHeight*scale;
    look+=(targetLook-look)*(1-Math.exp(-dt*2));
    ctx.drawImage(cityImage,(width-iw)/2-look*Math.min((iw-width)/2,width*.09),(height-ih)/2,iw,ih);
    for(const f of citySnow){f.y+=dt*(.018+f.depth*.13);f.x+=Math.sin(time*.3+f.depth*20)*dt*.007;if(f.y>1.03){f.y=-.03;f.x=Math.random();}const x=((f.x+1)%1)*width-look*f.depth*30,y=f.y*height,r=(.7+f.depth**3*5.5)*(width/1440+.5);ctx.fillStyle=`rgba(245,248,238,${.25+f.depth*.62})`;ctx.beginPath();ctx.arc(x,y,r,0,Math.PI*2);ctx.fill();}
    ctx.restore();
  }
  return {canvas,lookAt(x){targetLook=(x-.5)*2;},reset(){flakes.forEach(settle);fairyFlight=0;fairyStarted=false;offsetX=lift=roll=look=targetLook=0;shop.style.opacity='1';},update(dt,time,motion,travel=0){
    inside=travel>=1;lastTravel=travel;const tracked=motion.last&&time-motion.last.t<.5;
    if(tracked)fairyStarted=true;if(fairyStarted)fairyFlight=Math.min(1,fairyFlight+dt/1.6);
    const holding=fairyFlight===1,energy=holding?motion.energy:0;
    const mobile=width<650,sceneH=height*(mobile?.70:1),bgH=Math.max(sceneH,width*1158/2048),bgY=(sceneH-bgH)/2;
    const size=Math.min(height*(mobile?.43:.61),width*(mobile?.76:.53)),baseY=bgY+bgH*.77;
    offsetX+=((tracked&&holding?(motion.x-.5)*size*.13:0)-offsetX)*(1-Math.exp(-dt*8));
    lift+=((holding?size*(.025+energy*.018):0)-lift)*(1-Math.exp(-dt*5));
    roll+=((tracked&&holding?-(motion.x-.5)*.20:0)-roll)*(1-Math.exp(-dt*9));
    const x=width*(mobile?.60:.59)+offsetX,y=baseY-size*.48-lift,flightEase=smooth(fairyFlight);
    ctx.clearRect(0,0,width,height);
    const cityOpacity=Math.max(0,Math.min(1,(travel-.35)/.3));shop.style.opacity=String(1-cityOpacity);
    if(cityOpacity>0)drawCity(dt,time,cityOpacity,travel);
    if(travel<.68&&imageReady(globeImage)){
      ctx.save();ctx.globalAlpha=1-cityOpacity;
      const zoom=1+Math.pow(travel,1.6)*5.5;
      ctx.translate(width/2+(x-width/2)*(1-travel),height/2+(y-height/2)*(1-travel));ctx.scale(zoom,zoom);ctx.rotate(roll*(1-travel));
      // A restrained contact shadow fixes the pedestal to its counter before lifting.
      ctx.save();ctx.scale(1,.16);const shadow=ctx.createRadialGradient(0,size*3.0,0,0,size*3.0,size*.34);shadow.addColorStop(0,'#17201966');shadow.addColorStop(1,'#17201900');ctx.fillStyle=shadow;ctx.fillRect(-size*.4,size*2.55,size*.8,size*.9);ctx.restore();
      ctx.drawImage(globeImage,-size/2,-size/2,size,size);
      ctx.translate(-size/2,-size/2);ctx.beginPath();ctx.ellipse(size*.5,size*.391,size*.392,size*.364,0,0,Math.PI*2);ctx.clip();
      airborne=0;
      for(const f of flakes){
        if(f.y>=.731&&energy>.055&&Math.random()<energy*dt*5){f.vy=-.12-energy*.32-f.seed*.12;f.vx=(Math.random()-.5)*energy*.30;}
        if(f.y<.731||f.vy<0){
          f.vy+=dt*(.075+f.seed*.035);f.vx+=(Math.sin(time*3+f.seed*25)*energy*.12)*dt;f.vx*=Math.exp(-dt*.9);f.x+=f.vx*dt;f.y+=f.vy*dt;
          const nx=(f.x-.5)/.38,ny=(f.y-.391)/.355,len=Math.hypot(nx,ny);
          if(len>1){f.x=.5+nx/len*.378;f.y=.391+ny/len*.353;f.vx*=-.55;if(f.y<.1)f.vy=Math.abs(f.vy)*.35;}
          if(f.y>=.735){f.y=.735;f.vy=0;}if(f.y<.72)airborne++;
        }
        if(f.y<.727){const r=(.001+.0024*f.z)*size;ctx.fillStyle=`rgba(255,253,240,${.4+f.z*.55})`;ctx.beginPath();ctx.arc(f.x*size,f.y*size,r,0,Math.PI*2);ctx.fill();}
      }
      ctx.restore();
    }
    if(travel>=.68){for(const f of flakes){f.y=Math.min(.735,f.y+dt*.16);}airborne=flakes.filter(f=>f.y<.72).length;}
    const anchorX=x-size*.355,anchorY=y-size*.015;
    const animated=fairyVideo.ready(),fairySize=Math.min(height*.43,width*(mobile?.61:.35));
    const contactX=animated?.73:.85,contactY=animated?.45:.55;
    const approachX=-(1-flightEase)*Math.min(width*.16,160),approachY=-Math.sin(fairyFlight*Math.PI)*height*.06+(1-flightEase)*height*.035;
    fairy.style.width=`${fairySize}px`;fairy.style.left=`${anchorX-fairySize*contactX+approachX}px`;fairy.style.top=`${anchorY-fairySize*contactY+approachY+Math.sin(time*2.2)*(holding?1:3)}px`;
    fairy.style.transform=`rotate(${roll*57.3+(1-flightEase)*-6}deg)`;fairy.style.opacity=String(Math.max(0,1-travel*2.6));
    fairyVideo.update(energy,travel<.4&&!document.hidden);
  },stats(){return {artMode:'photographic-layers',airborne,particles:count,inside,citySnowVisible:lastTravel>=.6,fairyFlight,fairyHolding:fairyFlight===1,fairyVideo:fairyVideo.ready(),artLoaded:imageReady(globeImage)&&imageReady(cityImage)};}};
}
