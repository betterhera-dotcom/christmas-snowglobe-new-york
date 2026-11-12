import assert from 'node:assert/strict';
import {Carol} from '../audio.js';
const param=()=>({value:0,setTargetAtTime(v){this.value=v;},setValueAtTime(v){this.value=v;},exponentialRampToValueAtTime(v){this.value=v;},cancelScheduledValues(){}});
const node=()=>({gain:param(),frequency:param(),Q:param(),delayTime:param(),connect(){},disconnect(){},start(){},stop(){}});
let sources=0,tones=0;const oscillators=[];
globalThis.AudioContext=class{
 constructor(){this.state='suspended';this.currentTime=0;this.sampleRate=100;this.destination={};}
 createGain(){return node();}createBufferSource(){return node();}createBiquadFilter(){return node();}createDelay(){return node();}
 createOscillator(){tones++;const o=node();oscillators.push(o);return o;}
 createBuffer(){return {getChannelData:()=>new Float32Array(200)};}
 createMediaElementSource(){sources++;return node();}
 async resume(){this.state='running';}async suspend(){this.state='suspended';}
};
const events={},track={currentTime:0,playbackRate:1,paused:true,dataset:{},addEventListener:(name,fn)=>events[name]=fn,async play(){this.paused=false;},pause(){this.paused=true;}};
const city={...track,dataset:{},addEventListener(){}};
const carol=new Carol(track,city);
await carol.startIntro();await carol.unlockTrack();assert.equal(track.paused,true);assert.equal(city.paused,true);
for(let f=0;f<120;f++){carol.update(1/60,0);await carol.followShake(1/60,false,1);}
assert.equal(track.paused,true,'motion without a held globe cannot start the recording');
assert.ok(tones>=9,'intro keeps its melodic line');assert.ok(oscillators.every(o=>o.type==='sine'),'no triangle-wave game accompaniment');assert.equal(carol.bpm,116);
await carol.pause();await carol.resume();assert.equal(track.paused,true,'resuming before shaking keeps instrumental intro');
for(let f=0;f<60;f++)await carol.followShake(1/60,true,0);
assert.equal(track.paused,true,'holding without shaking keeps instrumental intro');
for(let f=0;f<4;f++)await carol.followShake(1/60,true,1);
await carol.followShake(1/60,true,0);assert.equal(track.paused,true,'one brief tracking bump cannot start the song');
for(let f=0;f<12;f++)await carol.followShake(1/60,true,.1);
assert.equal(track.paused,false,'held movement starts the recording');assert.equal(track.currentTime,20,'start at the user-specified chorus');assert.equal(carol.songGain.gain.value,.12,'song starts quietly');assert.equal(track.playbackRate,.6,'first shake winds up from slow playback');
track.currentTime=45;
for(const gentle of [.04,.15,.35,.55,.70]){
 for(let f=0;f<480;f++)carol.update(1/60,gentle);
 assert.ok(Math.abs(track.playbackRate-1)<.004,'gentle and ordinary shaking keep original speed');
}
for(let f=0;f<300;f++)carol.update(1/60,1);
assert.ok(track.playbackRate>3.3&&track.playbackRate<=3.4,'strong shake feels like fast-forward');
assert.ok(carol.songVolume>.70&&carol.songVolume<=.72,'volume grows within a bounded range');
assert.equal(track.currentTime,45,'changing rate does not seek or restart');assert.equal(track.preservesPitch,false,'tape-style playback changes voice pitch with speed');
carol.mute(true);for(let f=0;f<30;f++)carol.update(1/60,1);
assert.equal(carol.songGain.gain.value,0);assert.equal(track.muted,true);
await carol.pause();await carol.start();assert.equal(track.currentTime,45,'tab resume continues the same verse');assert.equal(carol.songGain.gain.value,0);
carol.mute(false);
for(let f=0;f<300;f++)carol.update(1/60,0);
assert.ok(track.playbackRate<.86&&track.playbackRate>=.85);assert.ok(carol.songVolume<.14);
carol.rate=3.4;track.playbackRate=3.4;carol.update(1/60,1,'city');assert.equal(track.playbackRate,1,'arrival immediately locks original speed');
assert.ok(Math.abs(track.playbackRate-1)<.004,'city returns to original speed');
let before=tones;carol.effect('touch');assert.ok(tones>before,'touch has a glass chime');
before=tones;carol.effect('touch');assert.equal(tones,before,'rapid repeat taps do not stack chimes');
for(const effect of ['curtain','enter','arrival','lift']){before=tones;carol.effect(effect);assert.ok(tones>before,`${effect} has an effect`);}
carol.enterUntil=0;before=tones;carol.stir(0);assert.equal(tones,before,'no shake sound at rest');carol.stir(.4);assert.ok(tones>before,'active motion has a snow/glass accent');
carol.mute(true);before=tones;carol.effect('enter');assert.equal(tones,before,'effects respect mute');carol.mute(false);
events.ended();assert.equal(track.currentTime,20,'next loop starts at the chorus too');
await carol.startCity();assert.equal(city.currentTime,0,'new city song starts at its beginning');assert.equal(city.playbackRate,1);assert.equal(city.paused,false);assert.equal(carol.songGain.gain.value,0);
carol.context.currentTime+=3;carol.update(1/60,1,'city');assert.equal(track.paused,true,'globe song stops after the crossfade');assert.equal(city.paused,false);
city.currentTime=12;await carol.pause();await carol.resume();assert.equal(city.currentTime,12,'city resumes without restarting');assert.equal(city.playbackRate,1);
carol.mute(true);assert.equal(city.muted,true);assert.equal(carol.cityGain.gain.value,0);carol.mute(false);assert.equal(carol.cityGain.gain.value,.45);
before=tones;carol.end();assert.equal(carol.mode,'ending');assert.ok(tones>before,'ending plays its own sustained chime');
assert.equal(carol.songGain.gain.value,0,'ending fades the carol');
carol.context.currentTime+=3;carol.update(1/60,1,'ending');assert.equal(track.paused,true,'recording stops after the fade');assert.equal(city.paused,true,'city song also stops at ending');
await carol.pause();await carol.resume();assert.equal(track.paused,true,'returning to ending never restarts the song');assert.equal(city.paused,true);
events.ended();assert.equal(track.paused,true,'ending cannot restart the chorus loop');
carol.reset();await carol.startIntro();assert.equal(track.paused,true);assert.equal(carol.mode,'intro');assert.equal(city.paused,true);assert.equal(sources,2,'one source per recording across repeated visits');
console.log('PASS: chorus at 20s, quiet start, 1x gentle movement / strong 3.4x, separate city song, magical effects, mute, resume, ending and reset');
