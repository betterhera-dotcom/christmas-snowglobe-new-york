// Classic worker: the bundled MediaPipe WASM loader uses importScripts.
// Camera images stay on this device and are closed immediately after inference.
let hand,face;
self.onmessage=async({data})=>{
 if(data.type==='init'){
  try{
   const {FilesetResolver,HandLandmarker,FaceLandmarker}=await import('./vendor/mediapipe/vision_bundle.mjs');
   const vision=await FilesetResolver.forVisionTasks(new URL('./vendor/mediapipe/wasm',self.location.href).href);
   async function create(Task,model,options){
    const baseOptions={modelAssetPath:new URL(`./vendor/mediapipe/${model}`,self.location.href).href,delegate:'GPU'};
    try{return {task:await Task.createFromOptions(vision,{baseOptions,runningMode:'VIDEO',...options}),delegate:'GPU'};}
    catch{baseOptions.delegate='CPU';return {task:await Task.createFromOptions(vision,{baseOptions,runningMode:'VIDEO',...options}),delegate:'CPU'};}
   }
   const h=await create(HandLandmarker,'hand_landmarker.task',{numHands:2,minHandDetectionConfidence:.6,minHandPresenceConfidence:.6,minTrackingConfidence:.5});hand=h.task;
   const f=await create(FaceLandmarker,'face_landmarker.task',{numFaces:1,minFaceDetectionConfidence:.5,minFacePresenceConfidence:.5,minTrackingConfidence:.5});face=f.task;
   // Compile the first inference before handing control to the visitor.
   const warmup=new OffscreenCanvas(640,480);warmup.getContext('2d').fillRect(0,0,640,480);
   hand.detectForVideo(warmup,1);face.detectForVideo(warmup,1);
   self.postMessage({type:'ready',delegates:{hand:h.delegate,face:f.delegate}});
  }catch(e){hand?.close();face?.close();self.postMessage({type:'error',message:e.message});}
 }else if(data.type==='frame'){
  const {image,id,kind,timestamp}=data;
  try{
   const start=performance.now(),raw=(kind==='hand'?hand:face).detectForVideo(image,timestamp);
   const result=kind==='hand'?{landmarks:raw.landmarks,worldLandmarks:raw.worldLandmarks}:{faceLandmarks:raw.faceLandmarks};
   self.postMessage({type:'result',id,result,inferenceMs:performance.now()-start});
  }catch(e){self.postMessage({type:'error',id,message:e.message});}
  finally{image.close();}
 }
};
