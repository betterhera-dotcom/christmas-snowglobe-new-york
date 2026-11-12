import assert from 'node:assert/strict';
import {TrackingSchedule} from '../tracking-schedule.mjs';
import {WebcamDebug} from '../webcam-debug.js';

for(const allowed of [false,true]){
 const schedule=new TrackingSchedule(),kinds=[];
 for(let now=0;now<3000;now+=220)kinds.push(schedule.next(now,now/1000,{allowed,diagnostics:true}));
 assert.ok(kinds.filter(k=>k==='hand').length>=4,'slow CPU and missing face do not hide all raw hand results');
 assert.ok(kinds.includes('body'),'body selection still runs');
}
const ctx={clearRect(){},beginPath(){},moveTo(){},lineTo(){},stroke(){},arc(){},fill(){}};
const canvas={width:640,height:480,getContext:()=>ctx},status={},metrics={};
const debug=new WebcamDebug(canvas,status,metrics);
const options={video:{videoWidth:640,videoHeight:480},allowed:false,selected:null,controlled:false,delegates:{face:'CPU',hand:'CPU'}};
debug.record({kind:'hand',timestamp:1000,ageMs:50,inferenceMs:30,stale:false,result:{landmarks:[Array.from({length:21},()=>({x:.5,y:.5}))]}});
debug.draw(1100,options);
assert.match(metrics.textContent,/몸 — · 손 1/,'raw hands visible before any face is selected');
assert.match(status.textContent,/몸 미감지/,'explains why a detected hand cannot control yet');
debug.record({kind:'body',timestamp:1000,ageMs:200,inferenceMs:180,stale:true,result:{landmarks:[Array.from({length:478},()=>({x:.5,y:.3}))]}});
debug.draw(1250,options);assert.match(status.textContent,/분석 지연/);assert.match(metrics.textContent,/200ms/);
debug.draw(3601,options);assert.match(metrics.textContent,/몸 — · 손 —/,'expired results cannot look like current recognition');
debug.reset();assert.deepEqual(debug.results,{});
console.log('PASS: raw hand diagnostics without face, slow-device fairness, delayed result warning, stale overlay expiry and reset');

for(const [time,faceLandmarks,owned,stale,label] of [
 [4000,[],false,false,'얼굴 미감지'],
 [4200,[[{x:.5,y:.2}]],false,false,'조작자 얼굴 연결 대기'],
 [4400,[[{x:.5,y:.2}]],true,false,'고개 연결됨'],
 [4600,[[{x:.5,y:.2}]],true,true,'분석 지연']
]){
 debug.record({kind:'face',timestamp:time,ageMs:12,inferenceMs:8,owned,stale,result:{faceLandmarks}});
 debug.draw(time+20,options);assert.ok(metrics.textContent.includes('고개 보기 '+label),'face timing is not confused with successful head control');
}
console.log('PASS: city face absence, ownership, successful connection and stale result are distinguished');
