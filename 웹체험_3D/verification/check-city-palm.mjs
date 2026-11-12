import assert from 'node:assert/strict';
const nodes=new Map();
const element=()=>({style:{},dataset:{},children:[],classList:{toggle(){}},firstElementChild:{style:{}},setAttribute(){},append(child){this.children.push(child);}});
globalThis.document={getElementById(id){if(!nodes.has(id))nodes.set(id,element());return nodes.get(id);},createElementNS:()=>element()};
const {updateGuide}=await import('../experience-guide.js');
const hand=Array.from({length:21},()=>({x:.5,y:.5}));
const base={mode:'camera',phase:'city',hand,handControllable:true,held:false,receiving:true,progress:.5,point:[.5,.6]};
updateGuide(base);assert.equal(nodes.get('snow-hand').hidden,false);assert.equal(nodes.get('palm-snow').style.opacity,'1');assert.equal(nodes.get('snow-hand').dataset.receiving,'true');
updateGuide({...base,hand:null,handControllable:false,handPreview:{hand,delayed:true},receiving:false,progress:0});
assert.equal(nodes.get('snow-hand').hidden,false,'fresh display-only hand stays visible without claiming a catch');assert.equal(nodes.get('snow-hand').style.opacity,'.45');assert.equal(nodes.get('palm-snow').style.opacity,'0');
for(const change of [{hand:null,handControllable:false,receiving:false,progress:0},{phase:'globe'},{phase:'ending'}]){updateGuide({...base,...change});assert.equal(nodes.get('snow-hand').hidden,true);}
console.log('PASS: city palm visible while receiving, delayed hand shown without snow, loss and other phases hide palm');
