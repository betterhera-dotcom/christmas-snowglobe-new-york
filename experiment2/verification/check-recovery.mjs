import fs from 'node:fs';
import vm from 'node:vm';
import assert from 'node:assert/strict';
const html=fs.readFileSync(new URL('../index.html',import.meta.url),'utf8');
const code=html.match(/<script id="recovery-controls">([\s\S]*?)<\/script>/)[1];
function setup(){
 const events={},button={hidden:true,addEventListener:(n,f)=>events['button:'+n]=f};let reloads=0;
 const bind=prefix=>(n,f,capture)=>{events[prefix+n]=f;if(prefix==='doc:'&&['keydown','click'].includes(n))assert.equal(capture,true);};
 vm.runInNewContext(code,{window:{addEventListener:bind('win:')},document:{getElementById:()=>button,addEventListener:bind('doc:')},location:{reload:()=>reloads++}});
 const key=(extra={})=>{const e={code:'KeyR',key:'r',target:{closest:()=>null},preventDefault(){this.prevented=true},stopImmediatePropagation(){this.stopped=true},...extra};events['doc:keydown'](e);return e;};
 return {events,button,key,get reloads(){return reloads}};
}
let t=setup();assert.equal(t.key().stopped,true);assert.equal(t.reloads,1);
t=setup();t.events['win:snowglobe-ready']();assert.equal(t.key().stopped,undefined);assert.equal(t.reloads,0);assert.equal(t.key({shiftKey:true}).stopped,true);assert.equal(t.reloads,1);
for(const failure of ['win:error','win:unhandledrejection','win:snowglobe-failed','doc:webglcontextlost']){
 t=setup();t.events['win:snowglobe-ready']();t.events[failure]();assert.equal(t.button.hidden,false);t.key({key:'ㄱ'});assert.equal(t.reloads,1);
 const e={target:{closest:s=>s==='#reset'},preventDefault(){},stopImmediatePropagation(){}};t.events['doc:click'](e);assert.equal(t.reloads,2);t.events['button:click']();assert.equal(t.reloads,3);
}
t=setup();for(const extra of [{ctrlKey:true},{metaKey:true},{altKey:true},{repeat:true},{isComposing:true},{code:'KeyA',key:'a'},{target:{isContentEditable:true}},{target:{closest:()=>true}}])t.key(extra);assert.equal(t.reloads,0);
assert.match(html,/dispatchEvent\(new Event\('snowglobe-ready'\)\)/);assert.match(html,/dispatchEvent\(new Event\('snowglobe-failed'\)\)/);
console.log('PASS: R before app load, normal reset delegation, Shift+R reload, runtime/import/WebGL recovery, recovery buttons, Korean R, ignored shortcuts/typing');
