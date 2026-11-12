// One in-flight image, no waiting queue. Reset makes old results ineligible.
export class TrackingClient{
 constructor(worker=new Worker(new URL('./tracking-worker.js',import.meta.url))){
  this.worker=worker;this.busy=false;this.closed=false;this.epoch=0;this.sequence=0;this.metrics={ageMs:0,inferenceMs:0,dropped:0};
  this.ready=new Promise((resolve,reject)=>{this.resolveReady=resolve;this.rejectReady=reject;});
  this.initTimer=setTimeout(()=>this.fail(new Error('손 분석 준비 시간이 초과되었습니다.')),30000);
  worker.onmessage=({data})=>{
   if(data.type==='ready'){clearTimeout(this.initTimer);this.delegates=data.delegates;this.resolveReady();}
   else if(data.type==='error')this.fail(new Error(data.message));
   else if(data.type==='result'&&this.pending?.id===data.id){clearTimeout(this.pending.timer);this.pending.resolve(data);this.pending=null;}
  };
  worker.onerror=e=>this.fail(new Error(e.message||'손 분석 작업이 중단되었습니다.'));
  worker.postMessage({type:'init'});
 }
 fail(error){clearTimeout(this.initTimer);this.rejectReady(error);if(this.pending){clearTimeout(this.pending.timer);this.pending.reject(error);this.pending=null;}}
 async detect(kind,source,timestamp,onResult=()=>{}){
  if(this.busy||this.closed)return null;
  this.busy=true;const epoch=this.epoch,id=++this.sequence;let image;
  try{
   image=await createImageBitmap(source);
   if(this.closed||epoch!==this.epoch)return null;
   const data=await new Promise((resolve,reject)=>{
    const timer=setTimeout(()=>this.fail(new Error('손 분석 응답이 멈췄습니다.')),2000);
    this.pending={id,resolve,reject,timer};
    try{this.worker.postMessage({type:'frame',id,kind,timestamp,image},[image]);image=null;}
    catch(e){clearTimeout(timer);this.pending=null;reject(e);}
   });
   if(this.closed||epoch!==this.epoch)return null;
   const ageMs=performance.now()-timestamp,limitMs=kind==='face'?500:280;
   this.metrics={ageMs,inferenceMs:data.inferenceMs,dropped:this.metrics.dropped};
   onResult({kind,result:data.result,timestamp,ageMs,inferenceMs:data.inferenceMs,stale:ageMs>limitMs});
   if(ageMs>limitMs){this.metrics.dropped++;return null;}
   return {result:data.result,timestamp};
  }finally{image?.close();this.busy=false;}
 }
 reset(){this.epoch++;}
 close(){if(this.closed)return;this.closed=true;this.reset();this.fail(new Error('손 분석 종료'));this.worker.terminate();}
}
