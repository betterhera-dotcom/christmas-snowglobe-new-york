// Local video compositing: remove the blue studio background on the GPU.
// The original clip is preserved; no camera images enter this renderer.
export function createFairyVideo(container){
  const fallback=container.querySelector('img'),canvas=document.createElement('canvas');
  canvas.width=canvas.height=720;canvas.style.cssText='width:100%;display:none';container.prepend(canvas);
  const gl=canvas.getContext('webgl',{alpha:true,premultipliedAlpha:false,antialias:false});
  const video=document.createElement('video');video.src='./assets/fairy-flight.mp4';video.muted=true;video.loop=true;video.playsInline=true;video.preload='auto';
  if(!gl)return {update(){},ready:()=>false};
  const program=gl.createProgram();
  for(const [type,source] of [[gl.VERTEX_SHADER,'attribute vec2 a;varying vec2 uv;void main(){uv=vec2((a.x+1.0)/2.0,(1.0-a.y)/2.0);gl_Position=vec4(a,0.0,1.0);}'],[gl.FRAGMENT_SHADER,'precision mediump float;uniform sampler2D frame;varying vec2 uv;void main(){vec4 c=texture2D(frame,uv);float dominance=c.b-max(c.r,c.g);float alpha=1.0-smoothstep(0.06,0.22,dominance);c.b=min(c.b,max(c.r,c.g)+0.035);gl_FragColor=vec4(c.rgb,alpha);}']]){
    const shader=gl.createShader(type);gl.shaderSource(shader,source);gl.compileShader(shader);if(!gl.getShaderParameter(shader,gl.COMPILE_STATUS))return {update(){},ready:()=>false};gl.attachShader(program,shader);
  }
  gl.linkProgram(program);if(!gl.getProgramParameter(program,gl.LINK_STATUS))return {update(){},ready:()=>false};gl.useProgram(program);
  const buffer=gl.createBuffer();gl.bindBuffer(gl.ARRAY_BUFFER,buffer);gl.bufferData(gl.ARRAY_BUFFER,new Float32Array([-1,-1,1,-1,-1,1,1,1]),gl.STATIC_DRAW);
  const attribute=gl.getAttribLocation(program,'a');gl.enableVertexAttribArray(attribute);gl.vertexAttribPointer(attribute,2,gl.FLOAT,false,0,0);
  const texture=gl.createTexture();gl.bindTexture(gl.TEXTURE_2D,texture);gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_MIN_FILTER,gl.LINEAR);gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_MAG_FILTER,gl.LINEAR);gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_WRAP_S,gl.CLAMP_TO_EDGE);gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_WRAP_T,gl.CLAMP_TO_EDGE);
  let ready=false,lastTime=-1,playAttempt=false;
  video.addEventListener('canplay',()=>{video.play().catch(()=>{});});
  return {ready:()=>ready,update(energy,visible){
    if(!visible){if(!video.paused)video.pause();return;}
    if(video.paused&&video.readyState>=2&&!playAttempt){playAttempt=true;video.play().catch(()=>{}).finally(()=>{playAttempt=false;});}
    video.playbackRate=.75+energy*1.5;
    if(video.readyState<2||video.currentTime===lastTime)return;
    lastTime=video.currentTime;gl.texImage2D(gl.TEXTURE_2D,0,gl.RGBA,gl.RGBA,gl.UNSIGNED_BYTE,video);gl.drawArrays(gl.TRIANGLE_STRIP,0,4);
    if(!ready){ready=true;canvas.style.display='block';fallback.style.display='none';container.dataset.animated='true';}
  }};
}
