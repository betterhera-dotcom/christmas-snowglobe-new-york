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
// A C grip keeps a visible thumb/index gap and gently curved fingers.
export function isCGrip(hand){
  const d=(a,b)=>Math.hypot(a.x-b.x,a.y-b.y,(a.z||0)-(b.z||0));
  const palm=Math.max(d(hand[0],hand[9]),d(hand[5],hand[17]));
  if(palm<1e-5)return false;
  const gap=d(hand[4],hand[8])/palm;
  if(gap<.3||gap>1.8)return false;
  let curved=0;
  for(const [base,joint,tip] of [[5,6,8],[9,10,12],[13,14,16],[17,18,20]]){
    const a=hand[base],b=hand[joint],c=hand[tip],ab=d(a,b),bc=d(b,c);
    if(ab*bc<1e-8)continue;
    const dot=((a.x-b.x)*(c.x-b.x)+(a.y-b.y)*(c.y-b.y)+((a.z||0)-(b.z||0))*((c.z||0)-(b.z||0)))/(ab*bc);
    if(dot>-.94&&d(c,hand[0])<d(b,hand[0])*1.6)curved++;
  }
  // Closed fists have fingertips folded back to the palm; a C keeps them forward.
  return curved>=2&&d(hand[8],hand[0])>d(hand[5],hand[0])*1.12;
}
// Release only on a clearly OPEN hand, not merely a weak fist estimate.
function openFingers(hand){
  let count=0;
  for(const [base,joint,tip] of [[5,6,8],[9,10,12],[13,14,16],[17,18,20]]){
    const a=hand[base],b=hand[joint],c=hand[tip],w=hand[0];
    const d=(p,q)=>Math.hypot(p.x-q.x,p.y-q.y,(p.z||0)-(q.z||0));
    const ab=d(a,b),bc=d(b,c);if(ab*bc<1e-8)continue;
    const dot=((a.x-b.x)*(c.x-b.x)+(a.y-b.y)*(c.y-b.y)+((a.z||0)-(b.z||0))*((c.z||0)-(b.z||0)))/(ab*bc);
    if(dot<-.82&&d(c,w)>d(b,w)*1.28)count++;
  }
  return count;
}
export class Grip {
  constructor(){this.reset();}
  reset(){this.closed=false;this.since=null;this.lastSeen=-Infinity;this.openSince=null;}
  update(hand,time=performance.now()/1000){
    if(!hand){
      this.since=this.openSince=null;
      if(time-this.lastSeen>1.2)this.closed=false;
      return this.closed;
    }
    this.lastSeen=time;
    if(this.closed){
      if(openFingers(hand)>=3){
        if(this.openSince===null)this.openSince=time;
        if(time-this.openSince>=.4){this.closed=false;this.since=null;}
      }else this.openSince=null;
    }else{
      if(isCGrip(hand)){
        if(this.since===null)this.since=time;
        if(time-this.since>=.12){this.closed=true;this.openSince=null;}
      }else this.since=null;
    }
    return this.closed;
  }
}

export class FistReturn {
  reset(time=0){this.arrived=time;this.since=null;}
  constructor(){this.reset();}
  update(hand,time){
    if(time-this.arrived<2||!hand||curledFingers(hand)<3||isCGrip(hand)){this.since=null;return false;}
    if(this.since===null)this.since=time;
    return time-this.since>=.8;
  }
}
