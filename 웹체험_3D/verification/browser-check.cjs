const {chromium}=require('/Users/herakim/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright');
const fs=require('node:fs');const path=require('node:path');
(async()=>{
 const browser=await chromium.launch({executablePath:'/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',headless:true,args:['--use-fake-ui-for-media-stream','--use-fake-device-for-media-stream']});
 const context=await browser.newContext({viewport:{width:1440,height:1000},permissions:['camera']});const page=await context.newPage();const errors=[],requests=[];
 page.on('pageerror',e=>errors.push(String(e)));page.on('request',r=>requests.push(r.url()));
 await page.goto('http://127.0.0.1:8876');await page.waitForFunction(()=>!!window.snowglobe);await page.waitForTimeout(1500);
 await page.screenshot({path:path.join(__dirname,'01-idle.png')});
 await page.click('#pointer');await page.mouse.move(680,420);const before=await page.evaluate(()=>snowglobe.getState());
 const start=Date.now();while(Date.now()-start<5000){const s=(Date.now()-start)/1000;await page.mouse.move(890+Math.sin(s*Math.PI*3.4)*220,420);await page.waitForTimeout(25);}
 const shaken=await page.evaluate(()=>snowglobe.getState());
 await page.waitForFunction(()=>snowglobe.getState().phase==='city');await page.screenshot({path:path.join(__dirname,'04-city-automated.png')});
 await page.waitForTimeout(15000);const settled=await page.evaluate(()=>snowglobe.getState());
 await page.click('#sound');const muted=await page.locator('#sound').getAttribute('aria-pressed');await page.click('#reset');const reset=await page.evaluate(()=>snowglobe.getState());
 await page.click('#camera');await page.waitForFunction(()=>snowglobe.getState().cameraActive,{},{timeout:60000});await page.waitForTimeout(2000);const camera=await page.evaluate(()=>snowglobe.getState());
 await page.click('#pointer');const cameraStopped=await page.evaluate(()=>!snowglobe.getState().cameraActive&&document.querySelector('#webcam').srcObject===null);
 await page.setViewportSize({width:390,height:844});await page.waitForTimeout(300);const overflow=await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth);await page.screenshot({path:path.join(__dirname,'03-mobile.png')});
 const external=requests.filter(u=>!u.startsWith('http://127.0.0.1:8876')&&!u.startsWith('blob:')&&!u.startsWith('data:'));
 const result={before,shaken,settled,muted,reset,camera,cameraStopped,overflow,errors,externalRequests:external};
 fs.writeFileSync(path.join(__dirname,'browser-result.json'),JSON.stringify(result,null,2));console.log(JSON.stringify(result,null,2));
 await browser.close();
 if(errors.length||external.length||overflow||shaken.phase==='globe'||settled.phase!=='city'||!settled.inside||Math.abs(settled.cameraZ-1.65)>.01||!settled.citySnowVisible||settled.energy>.03||settled.airborne>100||!camera.modelLoaded||!cameraStopped||reset.mode!=='idle'||reset.phase!=='globe')process.exitCode=1;
})().catch(e=>{console.error(e);process.exitCode=1;});
