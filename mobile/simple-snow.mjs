// Mobile snow: one linear pass, no neighbour/fluid/roof collision simulation.
export class GlobeSnow {
 constructor(count=400,random=Math.random){this.count=count;this.random=random;this.p=new Float32Array(count*3);this.depth=Float32Array.from({length:count},random);this.angle=new Float32Array(count);this.reset();}
 reset(){this.agitation=0;for(let i=0;i<this.count;i++){const a=this.random()*Math.PI*2,r=Math.sqrt(this.random())*1.05;this.p.set([Math.cos(a)*r,.88+this.random()*.025,Math.sin(a)*r],i*3);}}
 update(dt,time,velocity){dt=Math.min(.05,Math.max(0,dt));const speed=Math.min(1,Math.hypot(...velocity)/1.5);this.agitation+=(speed-this.agitation)*(1-Math.exp(-dt*3));for(let i=0;i<this.count;i++){const k=i*3;let x=this.p[k],y=this.p[k+1],z=this.p[k+2];if(this.agitation>.08){x+=Math.sin(time*1.3+i)*dt*this.agitation*.4;z+=Math.cos(time+i)*dt*this.agitation*.4;y+=dt*this.agitation*(.8+this.depth[i]);if(y>2.9)y=.9;}else y-=dt*(.12+this.depth[i]*.15);const r=Math.hypot(x,y-1.78,z);if(r>1.35){x*=1.35/r;z*=1.35/r;y=1.78+(y-1.78)*1.35/r;}this.p.set([x,Math.max(.88,y),z],k);}}
 stats(){let airborne=0;for(let i=0;i<this.count;i++)if(this.p[i*3+1]>.96)airborne++;return {airborne,snowCount:this.count,globeFill:airborne/this.count,currentStrength:this.agitation};}
}
