const fingers=[[0,1,2,3,4],[0,5,6,7,8],[5,9,10,11,12],[9,13,14,15,16],[13,17,18,19,20],[17,0]];
const contours=[
 [10,338,297,332,284,251,389,356,454,323,361,288,397,365,379,378,400,377,152,148,176,149,150,136,172,58,132,93,234,127,162,21,54,103,67,109,10],
 [33,160,158,133,153,144,33],[362,385,387,263,373,380,362],
 [61,40,37,0,267,270,291,321,314,17,84,91,61],[168,6,1,2]
];

// Raw results only: this overlay never grants control or changes audience selection.
export class WebcamDebug{
 constructor(canvas,status,metrics){this.canvas=canvas;this.ctx=canvas.getContext('2d');this.status=status;this.metrics=metrics;this.reset();}
 reset(){this.results={};this.lastDraw=-Infinity;this.ctx.clearRect(0,0,this.canvas.width,this.canvas.height);this.status.textContent='영상 연결 후 분석 대기';this.metrics.textContent='얼굴 — · 손 —';}
 record(packet){this.results[packet.kind]=packet;}
 draw(now,{video,allowed,selected,controlled,delegates,dropped=0,paused=false}){
  if(now-this.lastDraw<100)return;this.lastDraw=now;
  const w=video.videoWidth||640,h=video.videoHeight||480;
  if(this.canvas.width!==w||this.canvas.height!==h){this.canvas.width=w;this.canvas.height=h;}
  const ctx=this.ctx;ctx.clearRect(0,0,w,h);
  const fresh=kind=>{const p=this.results[kind];return p&&now-p.timestamp<=1000?p:null;};
  const face=fresh('face'),hand=fresh('hand');
  const line=(points,indices)=>{ctx.beginPath();let started=false;for(const i of indices){const p=points[i];if(!p)continue;if(!started){ctx.moveTo(p.x*w,p.y*h);started=true;}else ctx.lineTo(p.x*w,p.y*h);}ctx.stroke();};
  for(const [kind,packet] of [['face',face],['hand',hand]]){
   const shapes=kind==='face'?packet?.result.faceLandmarks:packet?.result.landmarks;
   (shapes||[]).forEach((points,index)=>{
    ctx.strokeStyle=packet.stale?'#ffca70':kind==='hand'?'#fff':index===selected?'#83f7ce':'#a9cfff';ctx.fillStyle=ctx.strokeStyle;ctx.lineWidth=kind==='hand'?3:2;
    for(const indices of kind==='hand'?fingers:contours)line(points,indices);
    if(kind==='hand')for(const p of points){ctx.beginPath();ctx.arc(p.x*w,p.y*h,3,0,Math.PI*2);ctx.fill();}
   });
  }
  const faces=face?.result.faceLandmarks.length,hands=hand?.result.landmarks.length;
  this.status.textContent=paused?'도시 이동 중 · 분석 잠시 대기':!face&&!hand?'분석 결과 대기 · 선이 없으면 아직 미인식':face?.stale||hand?.stale?'분석 지연 · 주황색 선은 조작에서 제외':!faces?'얼굴 미감지 · 얼굴과 손을 함께 보여주세요':!allowed?'얼굴 감지 · 거리 설정을 확인해주세요':!hands?'얼굴 감지 완료 · 손을 보여주세요':controlled?'손 연결 완료 · 흰색 손 UI 표시 중':'손 검출됨 · 조작자 손 연결 대기';
  const describe=p=>p?`${Math.round(p.ageMs)}ms / 처리 ${Math.round(p.inferenceMs)}ms`:'대기';
  this.metrics.textContent=`얼굴 ${faces??'—'} · 손 ${hands??'—'}\n얼굴 ${delegates?.face||'—'} ${describe(face)}\n손 ${delegates?.hand||'—'} ${describe(hand)}\n지연 제외 ${dropped}회 · 흰색: 손 / 초록: 선택 얼굴`;
 }
}
