// Blender preview and browser use the same particle solver, not two imitations.
import {writeFile,readFile} from 'node:fs/promises';
import {GlobeSnow} from '../웹체험_3D/snow3d.mjs';
let seed=73;const random=()=>((seed=(seed*1664525+1013904223)>>>0)/4294967296);
const snow=new GlobeSnow(420,random);
snow.boxes=JSON.parse(await readFile(new URL('../웹체험_3D/assets/3d/colliders.json',import.meta.url)));
const samples=[],fps=24,seconds=48;
for(let frame=0;frame<=seconds*fps;frame++){
 const time=frame/fps,shaking=time>=1&&time<5;
 if(frame)for(let step=0;step<3;step++){
  const t=(frame-1)/fps+(step+1)/(fps*3),v=shaking?[1.8*Math.cos((t-1)*8),1.1*Math.sin((t-1)*6),.35*Math.sin((t-1)*7)]:[0,0,0];
  snow.update(1/(fps*3),t,v);
 }
 if(frame%4===0)samples.push({frame:frame+1,positions:Array.from(snow.p,v=>Math.round(v*100000)/100000)});
}
await writeFile(new URL('./.liquid-motion.json',import.meta.url),JSON.stringify({fps,count:snow.count,samples}));
console.log(`Baked ${samples.length} shared-solver frames, ${snow.count} particles; final`,snow.stats());
