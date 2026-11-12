import assert from 'node:assert/strict';
import {ENTRY_DURATION_MS,MIN_PLAY_SECONDS,CITY_TITLE_MS,WISH_DURATION_MS,citySnowReady} from '../journey.mjs';
assert.equal(1.5+MIN_PLAY_SECONDS+ENTRY_DURATION_MS/1000+CITY_TITLE_MS/1000+4+WISH_DURATION_MS/1000,29);
assert.equal(citySnowReady(5999,1000),false);
assert.equal(citySnowReady(6000,1000),true);
assert.equal(citySnowReady(10000,0),false);
console.log('PASS: 29-second planned stages plus entry gesture; snow blocked until five seconds after arrival');
