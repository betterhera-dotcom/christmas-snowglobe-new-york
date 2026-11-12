import assert from 'node:assert/strict';
import {ENTRY_DURATION_MS,MIN_PLAY_SECONDS,CITY_TITLE_MS,WISH_DURATION_MS,citySnowReady,advanceGlobeEnjoy} from '../journey.mjs';
assert.equal(1.5+MIN_PLAY_SECONDS+ENTRY_DURATION_MS/1000+CITY_TITLE_MS/1000+4+WISH_DURATION_MS/1000,30);
assert.equal(citySnowReady(5999,1000),false);
assert.equal(citySnowReady(6000,1000),true);
assert.equal(citySnowReady(10000,0),false);
console.log('PASS: 30-second planned stages; snow blocked until five seconds after arrival');

let enjoy=0;
for(let i=0;i<600;i++)enjoy=advanceGlobeEnjoy(enjoy,1/60,{held:false,observed:true});
assert.equal(enjoy,0,'hand visible without holding cannot start enjoyment');
for(let i=0;i<300;i++)enjoy=advanceGlobeEnjoy(enjoy,1/60,{held:true,observed:true});
assert.ok(Math.abs(enjoy-5)<.001,'holding still counts; motion strength is not required');
const paused=enjoy;
for(let i=0;i<600;i++)enjoy=advanceGlobeEnjoy(enjoy,1/60,{held:true,observed:false});
assert.equal(enjoy,paused,'lost hand time is not invented');
for(let i=0;i<300;i++)enjoy=advanceGlobeEnjoy(enjoy,1/60,{held:true,observed:true});
assert.equal(enjoy,MIN_PLAY_SECONDS,'resume preserves earned enjoyment and stops at target');
console.log('PASS: held enjoyment, pause on loss, resume and cap');
