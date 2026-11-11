// Eye-corner depth estimates yaw independently of face translation in the frame.
export class HeadLook {
  constructor(){this.reset();}
  reset(){this.center=0;this.pitchCenter=0;this.vertical=.5;this.samples=0;}
  update(face){
    if(!face?.[263]){this.vertical=.5;return .5;}
    const left=face[33],right=face[263];
    const yaw=Math.atan2(right.z-left.z,Math.max(.001,Math.abs(right.x-left.x)));
    const top=face[10],bottom=face[152];
    const pitch=top&&bottom?Math.atan2(bottom.z-top.z,Math.max(.001,Math.abs(bottom.y-top.y))):0;
    if(this.samples<12){this.center+=(yaw-this.center)/(++this.samples);this.pitchCenter+=(pitch-this.pitchCenter)/this.samples;this.vertical=.5;return .5;}
    const pitchDelta=pitch-this.pitchCenter;
    this.vertical=.5+Math.sign(pitchDelta)*Math.min(1,Math.max(0,Math.abs(pitchDelta)-.04)/.35)*.5;
    const delta=yaw-this.center,amount=Math.max(0,Math.abs(delta)-.045)/.45;
    return .5+Math.sign(delta)*Math.min(1,amount)*.5;
  }
}
