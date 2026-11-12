import {restoreRegion,StableHandRegion} from './tracking-region.mjs';
import {RESULT_MAX_AGE_MS} from './tracking-policy.mjs';
// One in-flight image, no waiting queue. Reset makes old results ineligible.
export class TrackingClient{
 constructor(worker=new Worker(new URL('./tracking-worker.js',import.meta.url))){
  this.handRegion=new StableHandRegion();this.worker=worker;this.busy=false;this.closed=false;this.epoch=0;this.sequence=0;this.metrics={ageMs:0,inferenceMs:0,dropped:0};
  this.ready=new Promise((resolve,reject)=>{this.resolveReady=resolve;this.rejectReady=reject;});
  this.initTimer=setTimeout(()=>this.fail(new Error('손 분석 준비 시간이 초과되었습니다.')),30000);
  worker.onmessage=({data})=>{
   if(data.type==='ready'){clearTimeout(this.initTimer);this.delegates=data.delegates;this.resolveReady();}
   else if(data.type==='face-ready'){clearTimeout(this.faceTimer);this.facePreparing=false;this.faceError=null;this.delegates.face=data.delegate;}
   else if(data.type==='face-error'){clearTimeout(this.faceTimer);this.facePreparing=false;this.faceError=data.message;}
   else if(data.type==='error')this.fail(new Error(data.message));
   else if(data.type==='result'&&this.pending?.id===data.id){clearTimeout(this.pending.timer);this.pending.resolve(data);this.pending=null;}
  };
  worker.onerror=e=>this.fail(new Error(e.message||'손 분석 작업이 중단되었습니다.'));
  worker.postMessage({type:'init'});
 }
 fail(error){clearTimeout(this.initTimer);clearTimeout(this.faceTimer);this.rejectReady(error);if(this.pending){clearTimeout(this.pending.timer);this.pending.reject(error);this.pending=null;}}
 async detect(kind,source,timestamp,onResult=()=>{},region=null){
  if(this.busy||this.closed||this.facePreparing)return null;
  this.busy=true;const epoch=this.epoch,id=++this.sequence;let image;
  try{
   const w=region?.width||source.videoWidth||source.width,h=region?.height||source.videoHeight||source.height;
   const scale=w&&h?Math.min(1,640/Math.max(w,h)):1;
   const resize=w&&h?{resizeWidth:Math.max(1,Math.round(w*scale)),resizeHeight:Math.max(1,Math.round(h*scale))}:undefined;
   image=region?await createImageBitmap(source,region.x,region.y,region.width,region.height,resize):await createImageBitmap(source,...(resize?[resize]:[]));
   if(this.closed||epoch!==this.epoch)return null;
   const data=await new Promise((resolve,reject)=>{
    const timer=setTimeout(()=>this.fail(new Error('손 분석 응답이 멈췄습니다.')),2000);
    this.pending={id,resolve,reject,timer};
    try{this.worker.postMessage({type:'frame',id,kind,timestamp,image,epoch,regionKey:region?`${region.x},${region.y},${region.width},${region.height}`:'full'},[image]);image=null;}
    catch(e){clearTimeout(timer);this.pending=null;reject(e);}
   });
   if(this.closed||epoch!==this.epoch)return null;
   data.result=restoreRegion(data.result,region);
   const ageMs=performance.now()-timestamp,limitMs=RESULT_MAX_AGE_MS[kind];
   this.metrics={ageMs,inferenceMs:data.inferenceMs,dropped:this.metrics.dropped};
   onResult({kind,region,result:data.result,timestamp,ageMs,inferenceMs:data.inferenceMs,stale:ageMs>limitMs});
   if(ageMs>limitMs){this.metrics.dropped++;return null;}
   return {result:data.result,timestamp};
  }finally{image?.close();this.busy=false;if(this.faceQueued)this.prepareFace();}
 }
 prepareFace(){
  if(this.closed||this.faceRequested||this.delegates?.face)return;
  if(this.busy){this.faceQueued=true;return;}
  this.faceQueued=false;this.faceRequested=true;this.facePreparing=true;
  // Model compilation shares this worker. Do not start a 2s frame deadline during it.
  this.faceTimer=setTimeout(()=>{this.facePreparing=false;this.faceError='얼굴 인식 준비 시간이 초과되었습니다.';},30000);
  this.worker.postMessage({type:'prepare-face'});
 }
 reset(){this.epoch++;this.handRegion.reset();}
 close(){if(this.closed)return;this.closed=true;this.reset();this.fail(new Error('손 분석 종료'));this.worker.terminate();}
}
