// Classic worker: the bundled MediaPipe WASM loader uses importScripts.
// Camera images stay on this device and are closed immediately after inference.
let hand,body,face,vision,FaceTask,faceLoading=false,handRegionKey=null,handEpoch=null,lastHandStamp=0,handBlank;
async function create(Task,model,options){
 const baseOptions={modelAssetPath:new URL(`./vendor/mediapipe/${model}`,self.location.href).href,delegate:'GPU'};
 try{return {task:await Task.createFromOptions(vision,{baseOptions,runningMode:'IMAGE',...options}),delegate:'GPU'};}
 catch{baseOptions.delegate='CPU';return {task:await Task.createFromOptions(vision,{baseOptions,runningMode:'IMAGE',...options}),delegate:'CPU'};}
}
// Body and face use independent images; hands use VIDEO with a stable crop.
function warm(task){const canvas=new OffscreenCanvas(640,480);canvas.getContext('2d').fillRect(0,0,640,480);task.detect(canvas);}
self.onmessage=async({data})=>{
 if(data.type==='init'){
  try{
   const {FilesetResolver,HandLandmarker,PoseLandmarker,FaceLandmarker}=await import('./vendor/mediapipe/vision_bundle.mjs');
   FaceTask=FaceLandmarker;
   vision=await FilesetResolver.forVisionTasks(new URL('./vendor/mediapipe/wasm',self.location.href).href);
   const h=await create(HandLandmarker,'hand_landmarker.task',{runningMode:'VIDEO',numHands:2,minHandDetectionConfidence:.5,minHandPresenceConfidence:.5,minTrackingConfidence:.5});hand=h.task;handBlank=new OffscreenCanvas(640,480);handBlank.getContext('2d').fillRect(0,0,640,480);hand.detectForVideo(handBlank,0);
   const b=await create(PoseLandmarker,'pose_landmarker_lite.task',{numPoses:3,minPoseDetectionConfidence:.5,minPosePresenceConfidence:.5,minTrackingConfidence:.5,outputSegmentationMasks:false});body=b.task;warm(body);
   self.postMessage({type:'ready',delegates:{hand:h.delegate,body:b.delegate}});
  }catch(e){hand?.close();body?.close();self.postMessage({type:'error',message:e.message});}
 }else if(data.type==='prepare-face'){
  // Prepare after body/hands so their startup does not wait on the optional face task.
  if(face||faceLoading)return;faceLoading=true;
  try{const f=await create(FaceTask,'face_landmarker.task',{numFaces:1,minFaceDetectionConfidence:.5,minFacePresenceConfidence:.5,minTrackingConfidence:.5});face=f.task;warm(face);self.postMessage({type:'face-ready',delegate:f.delegate});}
  catch(e){face?.close();face=null;self.postMessage({type:'face-error',message:e.message});}
 }else if(data.type==='frame'){
  const {image,id,kind}=data;
  try{
   const start=performance.now(),task={hand,body,face}[kind];
   if(kind==='hand'&&(handRegionKey!==data.regionKey||handEpoch!==data.epoch)){
    // Moving crops or new sessions invalidate VIDEO's previous-frame coordinates.
    if(handRegionKey!==null){
     // An empty observation ends old tracks without rebuilding the GPU graph.
     lastHandStamp=Math.max(lastHandStamp+1,data.timestamp);hand.detectForVideo(handBlank,lastHandStamp);
    }
    handRegionKey=data.regionKey;handEpoch=data.epoch;
   }
   let raw;
   if(kind==='hand'){lastHandStamp=Math.max(lastHandStamp+1,data.timestamp);raw=hand.detectForVideo(image,lastHandStamp);}
   else raw=task.detect(image);
   const result=kind==='face'?{faceLandmarks:raw.faceLandmarks}:{landmarks:raw.landmarks,worldLandmarks:raw.worldLandmarks,handedness:raw.handedness||raw.handednesses};
   self.postMessage({type:'result',id,result,inferenceMs:performance.now()-start});
  }catch(e){self.postMessage({type:'error',id,message:e.message});}
  finally{image.close();}
 }
};
