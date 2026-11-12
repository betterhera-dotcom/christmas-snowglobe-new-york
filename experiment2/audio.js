// Intro chimes crossfade to the user's recording. Rate changes never seek/restart it.
export class Carol {
  constructor(track,cityTrack){this.track=track;this.cityTrack=cityTrack;this.cityTrack.loop=true;this.cityTrack.playbackRate=1;this.cityTrack.preservesPitch=true;this.context=null;this.muted=false;this.bpm=116;this.rate=1;this.songVolume=.05;this.songLevel=.05;this.startTime=0;this.beat=0;this.note=0;this.mode='intro';if(track){track.playbackRate=1;track.preservesPitch=true;track.webkitPreservesPitch=true;track.mozPreservesPitch=true;track.loop=false;track.addEventListener('loadedmetadata',()=>{if(this.mode==='intro')track.currentTime=this.startTime;});track.addEventListener('ended',()=>{if(this.mode==='song'){track.currentTime=this.startTime;track.play().catch(()=>{});}});}}
  resumeContext(){
    if(!this.context){this.context=new AudioContext();this.master=this.context.createGain();this.master.gain.value=this.muted?0:.14;this.master.connect(this.context.destination);this.beat=0;
     this.melody=this.context.createGain();this.melody.connect(this.master);
     this.songGain=this.context.createGain();this.songGain.gain.value=0;this.songGain.connect(this.context.destination);
     this.cityGain=this.context.createGain();this.cityGain.gain.value=0;this.cityGain.connect(this.context.destination);
     this.citySource=this.context.createMediaElementSource(this.cityTrack);this.citySource.connect(this.cityGain);
     this.source=this.context.createMediaElementSource(this.track);
     // A light, intimate music-box colour for the whole recording. This is an
     // audio effect, not voice separation or a replacement child singer.
     const lowCut=this.context.createBiquadFilter();lowCut.type='highpass';lowCut.frequency.value=160;lowCut.Q.value=.7;
     const sparkle=this.context.createBiquadFilter();sparkle.type='peaking';sparkle.frequency.value=2200;sparkle.Q.value=.65;sparkle.gain.value=2.5;
     const soften=this.context.createBiquadFilter();soften.type='lowpass';soften.frequency.value=6400;soften.Q.value=.6;
     this.source.connect(lowCut);lowCut.connect(sparkle);sparkle.connect(soften);soften.connect(this.songGain);
     // Quiet, short reflections suggest a small glass object without masking words.
     const echo=this.context.createDelay(.5),echoGain=this.context.createGain();echo.delayTime.value=.095;echoGain.gain.value=.13;
     const echoTone=this.context.createBiquadFilter();echoTone.type='lowpass';echoTone.frequency.value=3800;
     soften.connect(echo);echo.connect(echoTone);echoTone.connect(echoGain);echoGain.connect(this.songGain);
    }
    if(!this.noise){
 const buffer=this.context.createBuffer(1,this.context.sampleRate*2,this.context.sampleRate),data=buffer.getChannelData(0);for(let i=0;i<data.length;i++)data[i]=(Math.random()*2-1)*.4;
 this.noise=this.context.createBufferSource();this.noise.buffer=buffer;this.noise.loop=true;
 this.filter=this.context.createBiquadFilter();this.filter.type='lowpass';this.filter.frequency.value=900;this.wind=this.context.createGain();this.wind.gain.value=0;this.noise.connect(this.filter);this.filter.connect(this.wind);this.wind.connect(this.master);this.noise.start();
 }
 return this.context.resume();
  }
  startIntro(){this.mode='intro';this.shakeBeats=0;const resumed=this.resumeContext();this.track.pause();this.cityTrack.pause();this.cityGain.gain.setTargetAtTime(0,this.context.currentTime,.2);this.songGain.gain.setTargetAtTime(0,this.context.currentTime,.2);this.melody.gain.setTargetAtTime(1,this.context.currentTime,.3);return resumed;}
  resume(){return this.mode==='ending'?this.resumeContext():this.mode==='city'?this.startCity():this.mode==='song'?this.start():this.startIntro();}
  end(){
   if(this.mode==='ending')return;
   this.mode='ending';
   if(!this.context){this.track?.pause();this.cityTrack.pause();return;}
   const now=this.context.currentTime;this.fadeEnd=now+2.5;
   this.songGain.gain.cancelScheduledValues(now);this.songGain.gain.setTargetAtTime(0,now,.45);
   this.cityGain.gain.cancelScheduledValues(now);this.cityGain.gain.setTargetAtTime(0,now,.45);
   this.melody.gain.setTargetAtTime(0,now,.3);this.wind?.gain.setTargetAtTime(0,now,.3);
   this.effect('ending');
  }
  async followShake(dt,held,energy){
   if(this.mode!=='intro')return;
   this.shakeBeats=held&&energy>.035?(this.shakeBeats||0)+dt:0;
   if(this.shakeBeats<.15)return;
   await this.start();
  }
  async unlockTrack(){const resumed=this.resumeContext();if(this.mode==='intro')this.track.currentTime=this.startTime;try{await Promise.all([resumed,this.track.play(),this.cityTrack.play()]);}finally{if(this.mode==='intro'){this.track.pause();this.track.currentTime=this.startTime;this.cityTrack.pause();this.cityTrack.currentTime=0;}}}
  async start(){
   const resumed=this.resumeContext(),fresh=this.mode!=='song';this.mode='song';if(fresh){this.track.currentTime=this.startTime;this.songVolume=.05;this.songLevel=.05;this.songElapsed=0;this.rate=.68;this.track.playbackRate=.68;this.songGain.gain.cancelScheduledValues(this.context.currentTime);this.songGain.gain.setValueAtTime(0,this.context.currentTime);}
   try{await Promise.all([resumed,this.track.play()]);}catch(e){this.startIntro().catch(()=>{});throw e;}
   if(this.mode!=='song'){this.track.pause();return;}
   this.melody.gain.setTargetAtTime(0,this.context.currentTime,.45);this.songGain.gain.setTargetAtTime(this.muted?0:this.songVolume,this.context.currentTime,.7);
  }
  async startCity(){
   const resumed=this.resumeContext(),fresh=this.mode!=='city';this.mode='city';this.rate=1;
   this.cityTrack.playbackRate=1;if(fresh)this.cityTrack.currentTime=0;
   await Promise.all([resumed,this.cityTrack.play()]);
   if(this.mode!=='city'){this.cityTrack.pause();return;}
   const now=this.context.currentTime;
   this.melody.gain.setTargetAtTime(0,now,.3);this.songGain.gain.setTargetAtTime(0,now,.45);
   this.cityGain.gain.setTargetAtTime(this.muted?0:.45,now,.55);this.globeStopAt=now+2.5;
  }
  mute(value){this.muted=value;this.cityTrack.muted=value;if(this.track)this.track.muted=value;if(this.master){this.cityGain.gain.setTargetAtTime(value||this.mode!=='city'?0:.45,this.context.currentTime,.08);this.master.gain.setTargetAtTime(value?0:.14,this.context.currentTime,.08);this.songGain.gain.setTargetAtTime(value||this.mode!=='song'?0:this.songVolume,this.context.currentTime,.08);}}
  update(dt,energy,phase='globe'){
    const strength=Math.min(1,Math.max(0,energy)/.85),shaking=this.mode==='song'&&phase==='globe';
    // Smoothly slow a quiet globe and speed up stronger shakes without seeking.
    if(shaking)this.songElapsed=(this.songElapsed||0)+dt;
    // Let the slow opening be heard, then blend into gesture-driven tempo.
    const openingMix=Math.min(1,Math.max(0,((this.songElapsed||0)-2)/1));
    const targetRate=.68+strength*.47*openingMix;
    const tempoEase=targetRate>this.rate?2.5:1.8;
    this.rate=shaking?this.rate+(targetRate-this.rate)*(1-Math.exp(-dt/tempoEase)):1;
    const volume=shaking?.12+strength**.8*.60:.4;
    this.songLevel+=(volume-this.songLevel)*(1-Math.exp(-dt/1.2));
    // Keep the opening envelope separate so per-frame shake updates cannot bypass it.
    const fade=Math.min(1,Math.max(0,(this.songElapsed||0)/3));
    const fadeMix=fade*fade*(3-2*fade);
    this.songVolume=shaking?.05+(this.songLevel-.05)*fadeMix:this.songLevel;
    if(this.songGain&&this.mode==='song')this.songGain.gain.setTargetAtTime(this.muted?0:this.songVolume,this.context.currentTime,.15);
    if(this.mode==='city'&&this.context?.currentTime>=this.globeStopAt&&!this.track.paused)this.track.pause();
    if(this.mode==='ending'&&this.context?.currentTime>=this.fadeEnd){this.track.pause();this.cityTrack.pause();this.songGain.gain.setValueAtTime(0,this.context.currentTime);this.cityGain.gain.setValueAtTime(0,this.context.currentTime);}
    if(this.track){this.track.dataset.audioMode=this.mode;this.track.dataset.audioContext=this.context?.state||'none';this.track.dataset.gain=this.muted||this.mode!=='song'?'0':this.songVolume.toFixed(3);}
    if(this.track)this.track.playbackRate=this.rate;
    if(!this.context||this.context.state!=='running')return;
    if(this.mode!=='intro')return;
    this.beat-=dt*this.bpm/60;
    if(this.beat<=0){
      const melody=[[76,1],[76,1],[76,2],[76,1],[76,1],[76,2],[76,1],[79,1],[72,1.5],[74,.5],[76,4],[77,1],[77,1],[77,1.5],[77,.5],[77,1],[76,1],[76,1],[76,.5],[76,.5],[76,1],[74,1],[74,1],[76,1],[74,2],[79,2],[76,1],[76,1],[76,2],[76,1],[76,1],[76,2],[76,1],[79,1],[72,1.5],[74,.5],[76,4],[77,1],[77,1],[77,1.5],[77,.5],[77,1],[76,1],[76,1],[76,.5],[76,.5],[79,1],[79,1],[77,1],[74,1],[72,4]];
      const [pitch,length]=melody[this.note++%melody.length];this.beat+=length;
      for(const [multiple,volume] of [[1,.48],[2,.07],[3,.02]]){
        this.introTone(pitch+12*Math.log2(multiple),volume,Math.min(.95,60/this.bpm*1.6),'sine');
      }
    }
  }
  introTone(pitch,volume,duration,type){
   const now=this.context.currentTime,o=this.context.createOscillator(),g=this.context.createGain();
   o.type=type;o.frequency.value=440*2**((pitch-69)/12);
   g.gain.setValueAtTime(.0001,now);g.gain.exponentialRampToValueAtTime(volume,now+.012);g.gain.exponentialRampToValueAtTime(.0001,now+duration);
   o.connect(g);g.connect(this.melody);o.start(now);o.stop(now+duration+.03);o.onended=()=>{o.disconnect();g.disconnect();};
  }
  stir(energy){
   if(!this.context||this.context.state!=='running')return;
   const now=this.context.currentTime;
   if(now<(this.enterUntil||0))return;
   // A quiet filtered swish follows the moving liquid; tiny glass grains
   // accent active shakes instead of sounding continuously while at rest.
   if(this.wind){this.filter.frequency.setTargetAtTime(500+energy*1600,now,.18);this.wind.gain.setTargetAtTime(Math.min(.28,energy*.28),now,.15);}
   if(energy>.08&&now>=(this.nextGrain||0)){
    this.nextGrain=now+.32+(1-energy)*.3;
    this.magicTone(82+(this.grainIndex||0)%3*5,now,.22,.035+energy*.055);
    this.grainIndex=(this.grainIndex||0)+1;
   }
  }
  magicTone(pitch,time,duration,volume){
   for(const [ratio,level] of [[1,1],[2.76,.16],[5.4,.035]]){
    const o=this.context.createOscillator(),g=this.context.createGain();o.type='sine';o.frequency.value=440*2**((pitch-69)/12)*ratio;
    g.gain.setValueAtTime(.0001,time);g.gain.exponentialRampToValueAtTime(volume*level,time+.025);g.gain.exponentialRampToValueAtTime(.0001,time+duration);
    o.connect(g);g.connect(this.master);o.start(time);o.stop(time+duration+.03);o.onended=()=>{o.disconnect();g.disconnect();};
   }
  }
  effect(type){
   if(!this.context||this.context.state!=='running'||this.muted)return;
   const now=this.context.currentTime;
   if(type==='touch'){
    if(now<(this.nextTouch||0))return;this.nextTouch=now+.12;
    this.magicTone(88,now,.34,.16);return;
   }
   if(type==='enter'||type==='curtain'){this.enterUntil=now+2;this.wind?.gain.setTargetAtTime(.19,now,.35);this.wind?.gain.setTargetAtTime(0,now+1.5,.65);}
   const ending=type==='ending',notes=ending?[72,79,84,88,91,96]:type==='arrival'?[72,79,83,88]:type==='lift'?[79,91]:[76,83,90,95];
   notes.forEach((midi,i)=>this.magicTone(midi,now+i*(ending?.32:.19),ending?3.4:1.9,.16/(1+i*.22)));
   if(this.track)this.track.dataset.lastEffect=type;
  }
  async pause(){this.track?.pause();this.cityTrack.pause();if(this.context)await this.context.suspend();}
  reset(){this.enterUntil=0;this.nextGrain=0;this.grainIndex=0;if(this.wind){this.wind.gain.cancelScheduledValues(this.context.currentTime);this.wind.gain.setValueAtTime(0,this.context.currentTime);}this.track?.pause();if(this.track)this.track.currentTime=this.startTime;this.cityTrack.pause();this.cityTrack.currentTime=0;this.mode='intro';this.rate=1;this.note=0;this.beat=0;this.shakeBeats=0;this.bpm=116;}
}
