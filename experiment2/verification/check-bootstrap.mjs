import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import vm from 'node:vm';
const html=await readFile(new URL('../index.html',import.meta.url),'utf8');
for(const id of ['intro-camera','intro-pointer'])assert.match(html,new RegExp(`<button id="${id}" disabled>`));
assert.match(html,/<button id="retry-app" hidden onclick="location.reload\(\)">/);
const source=html.match(/<script id="app-bootstrap">([\s\S]*?)<\/script>/)[1].replace(/import\('\.\/app\.js(?:\?[^']*)?'\)/,'loadApp()');
const tick=()=>new Promise(r=>setImmediate(r));
function setup(){
 let resolve,reject,timeout,cleared=false;const events=[];
 const promise=new Promise((a,b)=>{resolve=a;reject=b;});
 const nodes=Object.fromEntries(['intro-status','retry-app','intro-camera','intro-pointer'].map(id=>[id,{disabled:true,hidden:true,textContent:''}]));
 vm.runInNewContext(source,{Event:class {constructor(type){this.type=type}},window:{dispatchEvent:e=>events.push(e.type)},document:{getElementById:id=>nodes[id]},loadApp:()=>promise,setTimeout(fn){timeout=fn;return 1;},clearTimeout(){cleared=true;},console:{error(){}}});
 return {nodes,events,resolve,reject,slow:()=>timeout(),get cleared(){return cleared;}};
}
{
 const t=setup();t.reject(Error('missing dependency'));await tick();
 assert.match(t.nodes['intro-status'].textContent,/불러오지 못/);assert.deepEqual(t.events,['snowglobe-failed']);
 assert.equal(t.nodes['retry-app'].hidden,false);
 assert.equal(t.nodes['intro-camera'].disabled,true);
 assert.ok(t.cleared);
}
{
 const t=setup();t.slow();assert.equal(t.nodes['retry-app'].hidden,false);
 t.resolve();await tick();
 assert.equal(t.nodes['retry-app'].hidden,true);assert.deepEqual(t.events,['snowglobe-ready']);
 assert.equal(t.nodes['intro-camera'].disabled,false);
 assert.equal(t.nodes['intro-pointer'].disabled,false);
 assert.match(t.nodes['intro-status'].textContent,/시작 방법/);
 assert.ok(t.cleared);
}
console.log('PASS: failed module exposes reload; delayed success restores both start buttons');
