// Synthetic body data: not evidence of real camera recognition.
export function body(x=.5,size=.2){
 const p=Array.from({length:33},()=>({x,y:.3,z:0,visibility:0,presence:1}));
 for(const [i,dx,dy] of [[11,-.5,0],[12,.5,0],[13,-.6,.5],[14,.6,.5],[15,-.6,.8],[16,.6,.8]])p[i]={x:x+dx*size,y:.3+dy*size,z:0,visibility:1,presence:1};
 return p;
}
export const hand=(x,y=.46)=>Array.from({length:21},()=>({x,y,z:0}));
