// Joint angles and relative distances work with either hand and a rotated wrist.
export function curledFingers(hand){
  const distance=(a,b)=>Math.hypot(a.x-b.x,a.y-b.y,(a.z||0)-(b.z||0));
  let curled=0;
  for(const [base,joint,tip] of [[5,6,8],[9,10,12],[13,14,16],[17,18,20]]){
    const a=hand[base],b=hand[joint],c=hand[tip];
    const ab=distance(a,b),bc=distance(b,c);
    if(ab*bc<1e-8)continue;
    const dot=((a.x-b.x)*(c.x-b.x)+(a.y-b.y)*(c.y-b.y)+((a.z||0)-(b.z||0))*((c.z||0)-(b.z||0)))/(ab*bc);
    if(dot>-.7&&distance(c,hand[0])<distance(b,hand[0])*1.18)curled++;
  }
  return curled;
}
export class Grip {
  constructor(){this.reset();}
  reset(){this.closed=false;this.frames=0;}
  update(hand){
    if(!hand){this.reset();return false;}
    const count=curledFingers(hand),next=this.closed?count>=2:count>=3;
    if(next===this.closed)this.frames=0;
    else if(++this.frames>=2){this.closed=next;this.frames=0;}
    return this.closed;
  }
}
