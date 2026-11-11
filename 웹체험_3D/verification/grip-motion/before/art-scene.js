
// Painted photographic layers with real-time snow and a continuous zoom transition.
// This is a 2.5D scene, not a rebuilt 3D model of the generated architecture.
export function createScene(container){
  const canvas=document.createElement('canvas'),ctx=canvas.getContext('2d',{alpha:true});container.append(canvas);
  const shop=document.getElementById('shop');
  const globeImage=new Image(),cityImage=new Image();globeImage.src='./assets/redraw-v4/snowglobe.png';cityImage.src='./assets/redraw-v4/new-york-city.png';
  for(const img of [globeImage,cityImage])img.onerror=()=>window.dispatchEvent(new CustomEvent('art-error',{detail:'그림을 불러오지 못했습니다. 실행 창을 확인하고 새로고침해주세요.'}));
  let width=1,height=1,dpr=1,held=false,gripY=.5,airborne=0,inside=false,offsetX=0,lift=0,roll=0,look=0,targetLook=0,lastTravel=0;
  let previousX=.5,previousY=.5,sampleTime=0,waterX=0,waterY=0,swirl=0;
  const count=650,flakes=Array.from({length:count},()=>({x:0,y:0,z:Math.random(),vx:0,vy:0,seed:Math.random(),floor:.70+Math.random()*.033,angle:Math.random()*6.28}));
  const citySnow=Array.from({length:230},()=>({x:Math.random(),y:Math.random(),depth:Math.random()}));
  function settle(f){f.x=.5+(Math.random()-.5)*.61;f.y=f.floor;f.vx=0;f.vy=0;}
  flakes.forEach(settle);
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
    const zoom=1.045+(1-travel)*.22,scale=Math.max(width/cityImage.naturalWidth,height/cityImage.naturalHeight)*zoom;
    const iw=cityImage.naturalWidth*scale,ih=cityImage.naturalHeight*scale;
    look+=(targetLook-look)*(1-Math.exp(-dt*2));
    ctx.drawImage(cityImage,(width-iw)/2-look*Math.min((iw-width)/2,width*.09),(height-ih)/2,iw,ih);
    for(const f of citySnow){f.y+=dt*(.018+f.depth*.13);f.x+=Math.sin(time*.3+f.depth*20)*dt*.007;if(f.y>1.03){f.y=-.03;f.x=Math.random();}const x=((f.x+1)%1)*width-look*f.depth*30,y=f.y*height,r=(.7+f.depth**3*5.5)*(width/1440+.5);ctx.fillStyle=`rgba(245,248,238,${.25+f.depth*.62})`;ctx.beginPath();ctx.arc(x,y,r,0,Math.PI*2);ctx.fill();}
    ctx.restore();
  }
  return {canvas,lookAt(x){targetLook=(x-.5)*2;},reset(){flakes.forEach(settle);waterX=waterY=swirl=sampleTime=0;held=false;gripY=.5;offsetX=lift=roll=look=targetLook=0;shop.style.opacity='1';},update(dt,time,motion,travel=0){
    inside=travel>=1;lastTravel=travel;const tracked=motion.last&&time-motion.last.t<.5;
    if(tracked&&!held)gripY=motion.y;
    held=Boolean(tracked);
    const holding=held,energy=holding?motion.energy:0;
    if(tracked&&motion.last.t!==sampleTime){
      const elapsed=motion.last.t-sampleTime;
      if(elapsed>0&&elapsed<.3){
        const dx=Math.max(-.12,Math.min(.12,motion.x-previousX)),dy=Math.max(-.12,Math.min(.12,motion.y-previousY));
        waterX-=dx*1.8;waterY-=dy*1.2;swirl+=dx*1.4;
      }
      previousX=motion.x;previousY=motion.y;sampleTime=motion.last.t;
    }
    waterX*=Math.exp(-dt*1.2);waterY*=Math.exp(-dt*1.5);swirl*=Math.exp(-dt*.65);
    const mobile=width<650,sceneH=height*(mobile?.70:1),bgH=Math.max(sceneH,width*1520/2688),bgY=(sceneH-bgH)/2;
    const size=Math.min(height*(mobile?.43:.66),width*(mobile?.76:.53)),baseY=bgY+bgH*.80;
    offsetX+=((tracked&&holding?(motion.x-.5)*size*.65:0)-offsetX)*(1-Math.exp(-dt*8));
    lift+=((holding?size*Math.max(.04,Math.min(.24,.08+(gripY-motion.y)*.45)):0)-lift)*(1-Math.exp(-dt*5));
    roll+=((tracked&&holding?-(motion.x-.5)*.45:0)-roll)*(1-Math.exp(-dt*9));
    const x=width*.5+offsetX,y=baseY-size*.48-lift;
    ctx.clearRect(0,0,width,height);
    const cityOpacity=Math.max(0,Math.min(1,(travel-.35)/.3));shop.style.opacity=String(1-cityOpacity);
    if(cityOpacity>0)drawCity(dt,time,cityOpacity,travel);
    if(travel<.68&&imageReady(globeImage)){
      ctx.save();ctx.globalAlpha=(1-cityOpacity)*Math.max(.12,.35-lift/size);
      ctx.translate(x,baseY);ctx.scale(1,.12);
      const shadow=ctx.createRadialGradient(0,0,0,0,0,size*.31);
      shadow.addColorStop(0,'#091810');shadow.addColorStop(1,'#09181000');
      ctx.fillStyle=shadow;ctx.fillRect(-size*.4,-size*.4,size*.8,size*.8);ctx.restore();
      ctx.save();ctx.globalAlpha=1-cityOpacity;
      const zoom=1+Math.pow(travel,1.6)*5.5;
      ctx.translate(width/2+(x-width/2)*(1-travel),height/2+(y-height/2)*(1-travel));ctx.scale(zoom,zoom);ctx.rotate(roll*(1-travel));
      ctx.drawImage(globeImage,-size/2,-size/2,size,size);
      ctx.translate(-size/2,-size/2);ctx.beginPath();ctx.ellipse(size*.5,size*.391,size*.392,size*.364,0,0,Math.PI*2);ctx.clip();
      airborne=0;
      for(const f of flakes){
        const suspended=f.y<f.floor-.002||f.vy<0;
        if(!suspended&&energy>.08&&Math.random()<energy*dt*(1.4+f.seed*2)){
          f.vy=-.08-energy*(.10+f.z*.20);f.vx=waterX*(.4+f.seed);
        }
        if(suspended||f.vy<0){
          // Water carries the flakes; drag limits speed and preserves a fading eddy.
          const px=f.x-.5,py=f.y-.43;
          const flowX=waterX-py*swirl*2+Math.sin(time*.8+f.seed*19)*energy*.025;
          const flowY=waterY+px*swirl*2;
          const drag=1-Math.exp(-dt*(.8+f.z*.9));
          f.vx+=(flowX-f.vx)*drag;
          f.vy+=(flowY+.018+f.z*.035-f.vy)*drag;
          f.x+=f.vx*dt;f.y+=f.vy*dt;f.angle+=dt*(f.vx*7+.2)*(.3+f.seed);
          const nx=(f.x-.5)/.375,ny=(f.y-.391)/.35,len=Math.hypot(nx,ny);
          if(len>1){f.x=.5+nx/len*.374;f.y=.391+ny/len*.349;const dot=f.vx*nx+f.vy*ny;if(dot>0){f.vx-=dot*nx*.8;f.vy-=dot*ny*.8;}}
          if(f.y>=f.floor){f.y=f.floor;f.vy=f.vx=0;}
        }
        if(f.y<f.floor-.005){
          airborne++;
          const edge=Math.max(.15,1-Math.abs(f.x-.5)/.42),r=size*(.0012+f.z*f.z*.0028);
          ctx.save();ctx.globalAlpha=(1-cityOpacity)*(.25+f.z*.45)*edge;
          ctx.translate(f.x*size,f.y*size);ctx.rotate(f.angle);ctx.scale(1,.5+.5*Math.abs(Math.sin(f.angle)));
          ctx.drawImage(snowTextures[Math.floor(f.seed*8)],-r,-r,r*2,r*2);ctx.restore();
        }
      }
      ctx.restore();
    }
    if(travel>=.68){for(const f of flakes){f.y=Math.min(.735,f.y+dt*.16);}airborne=flakes.filter(f=>f.y<.72).length;}
  },stats(){return {artMode:'photographic-layers',airborne,particles:count,inside,citySnowVisible:lastTravel>=.6,holding:held,lift,offsetX,roll,artLoaded:imageReady(globeImage)&&imageReady(cityImage)};}};
}
