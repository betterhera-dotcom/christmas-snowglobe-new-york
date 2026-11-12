import assert from 'node:assert/strict';
import {createHandRenderer,pointerHand} from '../hand-shape.js';
let draws=0;
function canvas(width=300,height=150){
 const context=new Proxy({}, {get:(_,key)=>key==='createLinearGradient'?()=>({addColorStop(){}}):key==='drawImage'?(source)=>{
  if(!source.width||!source.height)throw new Error('empty canvas');
  draws++;
 }:()=>{}});
 return {width,height,getContext:()=>context};
}
globalThis.Path2D=class {};
globalThis.document={createElement:()=>canvas()};
const target=canvas(0,0),render=createHandRenderer(target),hands=[pointerHand(.5,.5,0,1)];
assert.doesNotThrow(()=>render(hands),'zero viewport must not kill the frame loop');
assert.equal(draws,0);
target.width=640;target.height=480;render(hands);assert.ok(draws>0,'drawing recovers once the viewport is visible');
target.height=0;assert.doesNotThrow(()=>render(hands));
console.log('PASS: zero-size hand canvas is skipped and visible-size rendering recovers');
