// Reduced fluid model in globe coordinates: inertial forcing, decaying circulation,
// drag, gravity and an inelastic glass boundary. Not a full fluid simulation.
export const boundedRoll=value=>Math.max(-.14,Math.min(.14,value*.22));
export class SnowPhysics {
  constructor(){this.reset();}
  reset(){this.x=null;this.y=null;this.vx=0;this.vy=0;this.flowX=0;this.flowY=0;this.agitation=0;}
  step(flakes,dt,time,x,y,roll){
    if(dt<=0)return;
    if(this.x===null){this.x=x;this.y=y;}
    const vx=(x-this.x)/dt,vy=(y-this.y)/dt;
    const dx=Math.max(-.35,Math.min(.35,vx-this.vx)),dy=Math.max(-.35,Math.min(.35,vy-this.vy));
    this.x=x;this.y=y;this.vx=vx;this.vy=vy;
    const c=Math.cos(roll),s=Math.sin(roll),kickX=-(dx*c+dy*s)*.65,kickY=(dx*s-dy*c)*.65;
    this.flowX=(this.flowX+kickX)*Math.exp(-dt*1.8);
    this.flowY=(this.flowY+kickY)*Math.exp(-dt*1.8);
    this.agitation=Math.min(1.4,(this.agitation+Math.hypot(dx,dy)*1.5)*Math.exp(-dt*1.3));
    for(const f of flakes){
      // Different eddy phases disperse flakes throughout the glass, rather than a rotating sheet.
      const eddy=this.agitation*(.24+.22*f.z),phase=f.seed*Math.PI*2;
      const flowX=this.flowX+Math.sin(f.y*11+time*1.6+phase)*eddy;
      const flowY=this.flowY+Math.cos(f.x*12-time*1.3+phase)*eddy;
      f.vx+=kickX*(.6+f.z*.4);f.vy+=kickY*(.6+f.z*.4);
      const drag=1-Math.exp(-dt*(2.2+f.z));
      f.vx+=(flowX+Math.sin(roll)*(.035+f.z*.045)-f.vx)*drag;
      f.vy+=(flowY+Math.cos(roll)*(.035+f.z*.045)-f.vy)*drag;
      f.x+=f.vx*dt;f.y+=f.vy*dt;f.angle+=dt*(f.vx*4+.15);
      const nx=(f.x-.5)/.375,ny=(f.y-.391)/.35,len=Math.hypot(nx,ny);
      if(len>1){
        f.x=.5+nx/len*.374;f.y=.391+ny/len*.349;
        const gx=nx/.375,gy=ny/.35,n=Math.hypot(gx,gy),ux=gx/n,uy=gy/n,dot=f.vx*ux+f.vy*uy;
        if(dot>0){f.vx-=1.15*dot*ux;f.vy-=1.15*dot*uy;}
      }
      if(f.y>f.floor){f.y=f.floor;if(f.vy>0)f.vy=0;f.vx*=Math.exp(-dt*5);}
    }
  }
}
