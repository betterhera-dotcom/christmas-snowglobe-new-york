// A viscous, shared fluid velocity field inside a filled globe (not a full fluid solver).
export class GlobeSnow{
 constructor(count=12000,random=Math.random){this.count=count;this.random=random;this.p=new Float32Array(count*3);this.v=new Float32Array(count*3);this.depth=Float32Array.from({length:count},()=>random());this.drift=Float32Array.from({length:count*3},()=>random()*Math.PI*2);this.angle=new Float32Array(count);this.targetScratch=[0,0,0];this.dragCache=new Float64Array(count);this.dragStep=-1;this.boxes=[];this.surface=null;this.reset();}
 floorHeight(x,z){
  if(!this.surface)return .875;
  const {size,min,max,heights}=this.surface,gx=Math.max(0,Math.min(size-1.001,(x-min)/(max-min)*(size-1))),gz=Math.max(0,Math.min(size-1.001,(z-min)/(max-min)*(size-1))),ix=Math.floor(gx),iz=Math.floor(gz),tx=gx-ix,tz=gz-iz,k=iz*size+ix;
  return (heights[k]*(1-tx)+heights[k+1]*tx)*(1-tz)+(heights[k+size]*(1-tx)+heights[k+size+1]*tx)*tz;
 }
 // Stable individual layers make a dense, uneven deposit instead of one flat sheet.
 deposit(i,x,z){return .004+this.depth[i]**2*(.045+.045*(.5+.5*Math.sin(x*7+Math.cos(z*8))));}
 reset(){for(let i=0;i<this.count;i++){const a=this.random()*Math.PI*2,r=Math.sqrt(this.random())*1.07;let x=Math.cos(a)*r,z=Math.sin(a)*r,floor=this.floorHeight(x,z);
  // Coat the miniature rooftops as well as the ground before the first shake.
  if(this.boxes.length&&i%4===0){const b=this.boxes[Math.floor(this.random()*this.boxes.length)];x=b.min[0]+this.random()*(b.max[0]-b.min[0]);z=b.min[2]+this.random()*(b.max[2]-b.min[2]);floor=b.max[1];}
  for(const b of this.boxes)if(x>b.min[0]&&x<b.max[0]&&z>b.min[2]&&z<b.max[2])floor=Math.max(floor,b.max[1]);
  this.p.set([x,floor+this.deposit(i,x,z),z],i*3);this.angle[i]=this.drift[i*3];}this.v.fill(0);this.previousVelocity=[0,0,0];this.flow=[0,0,0];this.displacement=[0,0,0];this.spin=[0,0,0];this.turbulence=0;this.agitation=0;this.shakePower=0;this.time=0;}
 update(dt,time,velocity,gravity=[0,-1,0]){
  if(!(dt>0))return;
  dt=Math.min(dt,.05);
  // Acceleration supplies an impulse; a damped liquid displacement carries it
  // through a direction change instead of instantly reversing every flake.
  const power=Math.min(1,Math.hypot(...velocity)/1.8)**2;
  this.shakePower+=(power-this.shakePower)*(1-Math.exp(-dt/.32));
  const kick=velocity.map((v,i)=>Math.max(-3,Math.min(3,this.previousVelocity[i]-v))*(.22+.7*this.shakePower));this.previousVelocity=[...velocity];
  const speed=Math.hypot(...kick),stir=speed*Math.min(1,speed/(dt*8));this.turbulence=Math.min(1.8,this.turbulence+stir*.45);this.agitation=Math.min(1,this.agitation+stir*.23*this.shakePower);
  for(let a=0;a<3;a++)this.flow[a]=Math.max(-2.4,Math.min(2.4,this.flow[a]+kick[a]));
  const turn=[-kick[2]*1.1,kick[0]*.25-kick[2]*.35,kick[0]*1.1];
  for(let a=0;a<3;a++)this.spin[a]=Math.max(-2,Math.min(2,this.spin[a]+turn[a]));
  const steps=Math.max(1,Math.ceil(dt/.012)),h=dt/steps;
  // h and particle depth are constant across substeps; avoid 12,000 exponentials per step.
  if(this.dragStep!==h){for(let i=0;i<this.count;i++)this.dragCache[i]=1-Math.exp(-h*(3.2+(1-this.depth[i])*2.0));this.dragStep=h;}
  const floorDrag=Math.exp(-h*4);
  for(let n=0;n<steps;n++){
   this.time+=h;this.turbulence*=Math.exp(-h*.48);this.agitation*=Math.exp(-h*.7);
   for(let a=0;a<3;a++){this.flow[a]+=(-this.displacement[a]*1.45-this.flow[a]*.85)*h;this.displacement[a]+=this.flow[a]*h;this.spin[a]*=Math.exp(-h*.50);}
   const slow=this.time*.55,eddy=this.turbulence*.28,mixing=this.agitation*this.agitation,horizontalFlow=Math.hypot(this.flow[0],this.flow[2]);
   for(let i=0;i<this.count;i++){
   const k=i*3,seed=this.depth[i],x=this.p[k],y=this.p[k+1],z=this.p[k+2],floor=this.floorHeight(x,z);
   // Neighbours share the large-scale current; fine mixing below is smooth in time.
   const ry=y-1.78,cx=x-this.displacement[0]*.25,cz=z-this.displacement[2]*.25;
   // Two spatial scales bend a cloud into sheets and separate curls. These
   // divergence-free sine currents are shared by neighbours, not random wind.
   const target=this.targetScratch;target[0]=this.flow[0]+this.spin[1]*cz-this.spin[2]*ry+eddy*(Math.sin(ry*2.7+slow)+.38*Math.cos(z*4.1-slow));target[1]=this.flow[1]+this.spin[2]*cx-this.spin[0]*cz+eddy*(Math.sin(z*2.7-slow)+.38*Math.cos(x*4.1+slow));target[2]=this.flow[2]+this.spin[0]*ry-this.spin[1]*cx+eddy*(Math.sin(x*2.7+slow)+.38*Math.cos(ry*4.1-slow));
   // Sustained shaking breaks thin sheets into a volume of snow. Smooth,
   // independently phased small eddies disperse flakes without frame-wise jitter.
   for(let a=0;a<3;a++)target[a]+=mixing*1.15*Math.sin(this.time*(1.1+seed*.65)+this.drift[k+a]);
   // Flow along the floor lifts settled flakes during a shake, then dies away.
   target[1]+=horizontalFlow*Math.max(0,1-(y-floor)/.3)*.85;
   target[1]+=mixing*1.8*Math.max(0,1-(y-floor)/.7);
   const radius=Math.sqrt(x*x+ry*ry+z*z),out=(target[0]*x+target[1]*ry+target[2]*z)/Math.max(.001,radius);
   if(radius>1.20)for(let a=0;a<3;a++)target[a]-=(Math.max(0,out)*Math.min(1,(radius-1.20)/.23)+(radius-1.20)*this.turbulence*.9)*(a===0?x:a===1?ry:z)/radius;
   const drag=this.dragCache[i];
   const settling=(.045+seed*seed*.125)*(.82+.18*Math.abs(Math.cos(this.angle[i])));
   for(let a=0;a<3;a++){this.v[k+a]+=(target[a]+gravity[a]*settling-this.v[k+a])*drag;this.p[k+a]+=this.v[k+a]*h;}
   let dx=this.p[k],dy=this.p[k+1]-1.78,dz=this.p[k+2],len=Math.sqrt(dx*dx+dy*dy+dz*dz);
   if(len>1.43){const nx=dx/len,ny=dy/len,nz=dz/len;this.p[k]=nx*1.429;this.p[k+1]=1.78+ny*1.429;this.p[k+2]=nz*1.429;const d=this.v[k]*nx+this.v[k+1]*ny+this.v[k+2]*nz;if(d>0){this.v[k]-=1.12*d*nx;this.v[k+1]-=1.12*d*ny;this.v[k+2]-=1.12*d*nz;}}
   const layer=this.deposit(i,this.p[k],this.p[k+2]),landing=this.floorHeight(this.p[k],this.p[k+2])+layer;
   if(this.p[k+1]<landing){this.p[k+1]=landing;if(this.v[k+1]<0)this.v[k+1]=0;this.v[k]*=floorDrag;this.v[k+2]*=floorDrag;}
   for(const b of this.boxes){
    // Keep roof contact continuous instead of repeatedly falling across the
    // collision clearance and bouncing back. Upward water flow can lift it again.
    if(this.p[k]>b.min[0]&&this.p[k]<b.max[0]&&this.p[k+2]>b.min[2]&&this.p[k+2]<b.max[2]&&this.v[k+1]<=0&&y>=b.max[1]-.003&&this.p[k+1]<=b.max[1]+layer){this.p[k+1]=b.max[1]+layer;this.v[k+1]=0;}
    if(this.p[k]>b.min[0]&&this.p[k]<b.max[0]&&this.p[k+1]>b.min[1]&&this.p[k+1]<b.max[1]&&this.p[k+2]>b.min[2]&&this.p[k+2]<b.max[2]){
     let best=Infinity,axis=0,edge=0;for(let a=0;a<3;a++)for(let side=0;side<2;side++){const e=(side?b.max:b.min)[a],d=Math.abs(this.p[k+a]-e);if(d<best){best=d;axis=a;edge=e+(side?.003:-.003);}}
     this.p[k+axis]=edge;this.v[k+axis]*=-.08;
    }
   }
   // A resting flake stops turning; suspended flakes turn at different rates.
   this.angle[i]+=h*(.7+seed*1.8)*Math.min(1,Math.sqrt(this.v[k]*this.v[k]+this.v[k+1]*this.v[k+1]+this.v[k+2]*this.v[k+2])*14);
   }
  }
 }
 stats(){
  let airborne=0,upper=0,top=0;const regions=Array(8).fill(0);
  for(let i=0;i<this.count;i++){
   const k=i*3,x=this.p[k],y=this.p[k+1],z=this.p[k+2];
   if(y>.95&&Math.sqrt(this.v[k]*this.v[k]+this.v[k+1]*this.v[k+1]+this.v[k+2]*this.v[k+2])>.005){
    airborne++;if(y>2.1)upper++;if(y>2.65)top++;
    regions[(x>0?1:0)+(y>1.8?2:0)+(z>0?4:0)]++;
   }
  }
  // A floor cloud or a thin ribbon cannot count as a filled globe.
  const globeFill=this.count?Math.min(1,airborne/(this.count*.8),upper/(this.count*.28),top/(this.count*.025),Math.min(...regions)/(this.count*.035)):0;
  return {airborne,upper,snowCount:this.count,globeFill,currentStrength:Math.round((Math.hypot(...this.flow)+Math.hypot(...this.spin)+this.turbulence)*100)/100};
 }
}
