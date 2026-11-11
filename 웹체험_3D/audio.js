// A small synthesized Jingle Bells refrain: tempo changes note timing, never pitch.
// No third-party recording is used. Final exhibition audio remains to be selected.
export class Carol {
  constructor(){this.context=null;this.muted=false;this.bpm=56;this.beat=0;this.note=0;}
  async start(){
    if(!this.context){this.context=new AudioContext();this.master=this.context.createGain();this.master.gain.value=.14;this.master.connect(this.context.destination);this.beat=0;}
    if(!this.noise){
 const buffer=this.context.createBuffer(1,this.context.sampleRate*2,this.context.sampleRate),data=buffer.getChannelData(0);for(let i=0;i<data.length;i++)data[i]=(Math.random()*2-1)*.4;
 this.noise=this.context.createBufferSource();this.noise.buffer=buffer;this.noise.loop=true;
 this.filter=this.context.createBiquadFilter();this.filter.type='lowpass';this.filter.frequency.value=900;this.wind=this.context.createGain();this.wind.gain.value=0;this.noise.connect(this.filter);this.filter.connect(this.wind);this.wind.connect(this.master);this.noise.start();
 }
 await this.context.resume();
  }
  mute(value){this.muted=value;if(this.master)this.master.gain.setTargetAtTime(value?0:.14,this.context.currentTime,.08);}
  update(dt,energy){
    const target=56+Math.min(1,energy/.78)**.75*136;this.bpm+=(target-this.bpm)*(1-Math.exp(-dt/.28));
    if(!this.context||this.context.state!=='running')return;
    this.beat-=dt*this.bpm/60;
    if(this.beat<=0){
      const melody=[[76,1],[76,1],[76,2],[76,1],[76,1],[76,2],[76,1],[79,1],[72,1.5],[74,.5],[76,4],[77,1],[77,1],[77,1.5],[77,.5],[77,1],[76,1],[76,1],[76,.5],[76,.5],[76,1],[74,1],[74,1],[76,1],[74,2],[79,2],[76,1],[76,1],[76,2],[76,1],[76,1],[76,2],[76,1],[79,1],[72,1.5],[74,.5],[76,4],[77,1],[77,1],[77,1.5],[77,.5],[77,1],[76,1],[76,1],[76,.5],[76,.5],[79,1],[79,1],[77,1],[74,1],[72,4]];
      const [pitch,length]=melody[this.note++%melody.length];this.beat+=length;
      const now=this.context.currentTime;
      for(const [multiple,volume] of [[1,.72],[2,.18],[3,.07]]){
        const oscillator=this.context.createOscillator(),gain=this.context.createGain();
        oscillator.type='sine';oscillator.frequency.value=440*2**((pitch-69)/12)*multiple;
        gain.gain.setValueAtTime(.0001,now);gain.gain.exponentialRampToValueAtTime(volume,now+.012);gain.gain.exponentialRampToValueAtTime(.0001,now+Math.min(1.3,60/this.bpm*1.2));
        oscillator.connect(gain);gain.connect(this.master);oscillator.start(now);oscillator.stop(now+1.4);
        oscillator.onended=()=>{oscillator.disconnect();gain.disconnect();};
      }
    }
  }
  stir(energy){if(this.context&&this.context.currentTime<(this.enterUntil||0))return;if(this.wind)this.wind.gain.setTargetAtTime(Math.min(.15,energy*.15),this.context.currentTime,.18);}
  effect(type){
   if(!this.context||this.context.state!=='running')return;
   const now=this.context.currentTime;
   if(type==='enter'){this.enterUntil=now+2;this.wind?.gain.setTargetAtTime(.25,now,.15);this.wind?.gain.setTargetAtTime(0,now+2,.8);}
   const notes=type==='arrival'?[60,64,67,72]:type==='lift'?[84]:[72,79,84];
   notes.forEach((midi,i)=>{const t=now+i*.10,o=this.context.createOscillator(),g=this.context.createGain();o.type='sine';o.frequency.value=440*2**((midi-69)/12);g.gain.setValueAtTime(.0001,t);g.gain.exponentialRampToValueAtTime(.20,t+.02);g.gain.exponentialRampToValueAtTime(.0001,t+1.4);o.connect(g);g.connect(this.master);o.start(t);o.stop(t+1.5);o.onended=()=>{o.disconnect();g.disconnect();};});
  }
  async pause(){if(this.context)await this.context.suspend();}
  reset(){this.enterUntil=0;if(this.wind)this.wind.gain.cancelScheduledValues(this.context.currentTime);this.note=0;this.beat=0;this.bpm=56;}
}
