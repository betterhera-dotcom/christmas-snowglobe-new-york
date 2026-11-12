// A viscous, shared fluid velocity field inside a filled globe (not a full fluid solver).
export class GlobeSnow{
 constructor(count=1400,random=Math.random){this.count=count;this.random=random;this.p=new Float32Array(count*3);this.v=new Float32Array(count*3);this.depth=new Float32Array(count);this.boxes=[];this.reset();}
 reset(){for(let i=0;i<this.count;i++){const a=this.random()*Math.PI*2,r=Math.sqrt(this.random())*1.13;this.p.set([Math.cos(a)*r,.88+this.random()*.035,Math.sin(a)*r],i*3);this.depth[i]=this.random();}this.v.fill(0);this.previousVelocity=[0,0,0];this.flow=[0,0,0];this.spin=[0,0,0];this.turbulence=0;}
 update(dt,time,velocity,gravity=[0,-1,0]){
  const kick=velocity.map((v,i)=>Math.max(-1,Math.min(1,this.previousVelocity[i]-v))*.60);this.previousVelocity=[...velocity];
  const speed=Math.hypot(...kick);this.turbulence=Math.min(1.2,(this.turbulence+speed*.85)*Math.exp(-dt*.8));
  for(let a=0;a<3;a++)this.flow[a]=Math.max(-1.5,Math.min(1.5,this.flow[a]+kick[a]*1.7))*Math.exp(-dt*1.05);
  const turn=[-kick[2]*1.8,kick[0]*.3-kick[2]*.3,kick[0]*1.8];
  for(let a=0;a<3;a++)this.spin[a]=Math.max(-2,Math.min(2,this.spin[a]+turn[a]))*Math.exp(-dt*.65);
  const steps=Math.max(1,Math.ceil(dt/.012)),h=dt/steps;
  for(let n=0;n<steps;n++)for(let i=0;i<this.count;i++){
   const k=i*3,seed=this.depth[i],x=this.p[k],y=this.p[k+1],z=this.p[k+2];
   // Neighbours sample the SAME smooth current. No random particle-specific wind.
   const ry=y-1.78,eddy=this.turbulence*.32,slow=time*.45;
   const target=[this.flow[0]+this.spin[1]*z-this.spin[2]*ry+eddy*Math.sin(ry*2.4+slow)*Math.cos(z*1.8),this.flow[1]+this.spin[2]*x-this.spin[0]*z+eddy*Math.sin(z*2.1-slow)*Math.cos(x*1.8),this.flow[2]+this.spin[0]*ry-this.spin[1]*x+eddy*Math.sin(x*2.2+slow)*Math.cos(ry*1.7)];
   // Flow along the floor lifts settled flakes during a shake, then dies away.
   target[1]+=Math.hypot(this.flow[0],this.flow[2])*Math.max(0,1-(y-.875)/.3)*.65;
   const radius=Math.hypot(x,ry,z),out=(target[0]*x+target[1]*ry+target[2]*z)/Math.max(.001,radius);
   if(radius>1.30&&out>0)for(let a=0;a<3;a++)target[a]-=out*[x,ry,z][a]/radius*Math.min(1,(radius-1.30)/.18);
   const drag=1-Math.exp(-h*(4.8+seed*2.2));
   for(let a=0;a<3;a++){this.v[k+a]+=(target[a]+gravity[a]*(.065+seed*.075)-this.v[k+a])*drag;this.p[k+a]+=this.v[k+a]*h;}
   let dx=this.p[k],dy=this.p[k+1]-1.78,dz=this.p[k+2],len=Math.hypot(dx,dy,dz);
   if(len>1.48){const nx=dx/len,ny=dy/len,nz=dz/len;this.p[k]=nx*1.479;this.p[k+1]=1.78+ny*1.479;this.p[k+2]=nz*1.479;const d=this.v[k]*nx+this.v[k+1]*ny+this.v[k+2]*nz;if(d>0){this.v[k]-=1.12*d*nx;this.v[k+1]-=1.12*d*ny;this.v[k+2]-=1.12*d*nz;}}
   if(this.p[k+1]<.875){this.p[k+1]=.875;if(this.v[k+1]<0)this.v[k+1]=0;this.v[k]*=Math.exp(-h*4);this.v[k+2]*=Math.exp(-h*4);}
   for(const b of this.boxes){
    if(this.p[k]>b.min[0]&&this.p[k]<b.max[0]&&this.p[k+1]>b.min[1]&&this.p[k+1]<b.max[1]&&this.p[k+2]>b.min[2]&&this.p[k+2]<b.max[2]){
     let best=Infinity,axis=0,edge=0;for(let a=0;a<3;a++)for(const side of [0,1]){const e=(side?b.max:b.min)[a],d=Math.abs(this.p[k+a]-e);if(d<best){best=d;axis=a;edge=e+(side?.003:-.003);}}
     this.p[k+axis]=edge;this.v[k+axis]*=-.08;
    }
   }
  }
 }
 stats(){let airborne=0,upper=0;for(let i=0;i<this.count;i++){if(this.p[i*3+1]>.95)airborne++;if(this.p[i*3+1]>2.1)upper++;}return {airborne,upper};}
}
