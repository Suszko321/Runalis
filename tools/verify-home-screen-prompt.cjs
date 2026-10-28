const {chromium}=require(process.env.RUNALIS_NODE_MODULES+'/playwright');
const fs=require('node:fs'),assert=require('node:assert/strict');
const base=(process.env.RUNALIS_URL||'http://127.0.0.1:8768')+'/_site/',checks=[],errors=[];
const iphone='Mozilla/5.0 (iPhone; CPU iPhone OS 18_6 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/18.6 Mobile/15E148 Safari/604.1';
const android='Mozilla/5.0 (Linux; Android 14; Pixel 8) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/140.0.0.0 Mobile Safari/537.36';
(async()=>{
 const browser=await chromium.launch({channel:'msedge',headless:true});
 try{
  async function page(options={},init){
   const p=await browser.newPage({viewport:{width:390,height:844},hasTouch:true,isMobile:true,userAgent:iphone,...options});
   p.on('pageerror',e=>errors.push(e.message));
   if(init)await p.addInitScript(init);
   await p.goto(base);await p.waitForFunction(()=>document.querySelector('#profileList')?.childElementCount>0);return p;
  }
  const p=await page();await p.locator('#homeScreenPrompt').waitFor();
  assert((await p.locator('#homeScreenPrompt').innerText()).includes('Share'));assert((await p.locator('#homeScreenPrompt').innerText()).includes('Open as Web App'));
  assert(await p.locator('#mainMenu').evaluate(e=>e.inert));assert(!(await p.locator('#mobileRotate').isVisible()));
  assert(!(await p.locator('[data-home-screen-install]').isVisible()));
  await p.evaluate(()=>{
   window.homeScreenBackgroundClicks=0;document.getElementById('mainMenu').addEventListener('click',()=>window.homeScreenBackgroundClicks++);
   Object.defineProperty(navigator,'getGamepads',{configurable:true,value:()=>[{id:'Modal test pad',index:0,connected:true,axes:[0,0,0,0],buttons:Array.from({length:17},(_,i)=>({pressed:i===0,value:i===0?1:0}))}]});
  });
  await p.waitForTimeout(150);assert.equal(await p.evaluate(()=>homeScreenBackgroundClicks),0,'A gamepad cannot activate the inert profile menu behind onboarding');
  await p.evaluate(()=>{delete navigator.getGamepads;});
  await p.keyboard.press('Shift+Tab');assert.equal(await p.evaluate(()=>document.activeElement.hasAttribute('data-home-screen-later')),true);
  await p.keyboard.press('Tab');assert.equal(await p.evaluate(()=>document.activeElement.hasAttribute('data-home-screen-added')),true);
  await p.screenshot({path:'tmp/home-screen-iphone-portrait.png'});
  await p.setViewportSize({width:667,height:375});
  for(const selector of ['[data-home-screen-added]','[data-home-screen-continue]','[data-home-screen-later]']){
   const box=await p.locator(selector).boundingBox();assert(box&&box.height>=44);await p.locator(selector).scrollIntoViewIfNeeded();
  }
  await p.screenshot({path:'tmp/home-screen-iphone-landscape.png'});
  await p.locator('[data-home-screen-continue]').tap();assert.equal(await p.locator('#homeScreenPrompt').count(),0);assert(!(await p.locator('#mainMenu').evaluate(e=>e.inert)));
  await p.reload();await p.waitForFunction(()=>document.querySelector('#profileList')?.childElementCount>0);assert.equal(await p.locator('#homeScreenPrompt').count(),0);
  checks.push('iPhone instructions, accessible modal focus, portrait/short-landscape controls, rotation-prompt ordering and same-visit dismissal');await p.close();

  const snooze=await page();await snooze.evaluate(()=>localStorage.setItem('home-screen-save-sentinel','keep'));
  await snooze.locator('[data-home-screen-later]').tap();const until=await snooze.evaluate(()=>Number(localStorage.getItem('runalis-home-screen-remind-after')));assert(until>Date.now()+6*86400000);
  await snooze.evaluate(()=>sessionStorage.clear());await snooze.reload();await snooze.waitForFunction(()=>document.querySelector('#profileList')?.childElementCount>0);assert.equal(await snooze.locator('#homeScreenPrompt').count(),0);
  await snooze.evaluate(()=>localStorage.setItem('runalis-home-screen-remind-after','1'));await snooze.reload();await snooze.locator('#homeScreenPrompt').waitFor();
  assert.equal(await snooze.evaluate(()=>localStorage.getItem('home-screen-save-sentinel')),'keep');
  await snooze.locator('[data-home-screen-added]').tap();assert((await snooze.locator('#homeScreenPrompt').innerText()).includes('Close this browser tab'));
  assert((await snooze.locator('#homeScreenPrompt').innerText()).includes('Home Screen'));await snooze.locator('[data-home-screen-continue]').tap();
  checks.push('Remind later snoozes for seven days, expires correctly and preserves existing local data; manual addition shows launch instructions');await snooze.close();

  for(const outcome of ['accepted','dismissed','error']){
   const a=await page({userAgent:android,viewport:{width:844,height:390}});assert((await a.locator('#homeScreenPrompt').innerText()).includes('⋮ menu'));
   await a.evaluate(outcome=>{
    window.installPromptCalls=0;const event=new Event('beforeinstallprompt',{cancelable:true});
    event.prompt=async()=>{window.installPromptCalls++;if(outcome==='error')throw Error('unavailable');return {outcome};};
    event.userChoice=Promise.resolve({outcome});window.nativeInstallPrevented=!dispatchEvent(event);
   },outcome);
   assert(await a.evaluate(()=>nativeInstallPrevented));await a.locator('[data-home-screen-install]').tap();assert.equal(await a.evaluate(()=>installPromptCalls),1);
   if(outcome==='accepted')await a.waitForFunction(()=>document.querySelector('#homeScreenPromptTitle')?.textContent==='Launch from your Home Screen');
   else if(outcome==='error')await a.waitForFunction(()=>document.querySelector('[data-home-screen-status]')?.textContent.includes('could not open'));
   else await a.waitForFunction(()=>document.querySelector('[data-home-screen-status]')?.textContent.includes('keep playing'));
   assert(!(await a.locator('[data-home-screen-install]').isVisible()));
   if(outcome==='dismissed'){
    await a.evaluate(()=>dispatchEvent(new Event('appinstalled')));assert.equal(await a.locator('#homeScreenPromptTitle').innerText(),'Launch from your Home Screen');
   }
   checks.push(`Android install-event ${outcome} path consumes the prompt once and keeps manual/final instructions available`);await a.close();
  }
  for(const mode of ['ios-standalone','display-standalone','desktop','ipad-desktop-ua','storage-blocked']){
   const init=mode==='ios-standalone'?()=>Object.defineProperty(navigator,'standalone',{value:true}):mode==='display-standalone'?()=>{const original=window.matchMedia.bind(window);window.matchMedia=q=>{const result=original(q);if(q==='(display-mode: standalone)')Object.defineProperty(result,'matches',{value:true});return result;};}:mode==='ipad-desktop-ua'?()=>{Object.defineProperty(navigator,'platform',{value:'MacIntel'});Object.defineProperty(navigator,'maxTouchPoints',{value:5});}:mode==='storage-blocked'?()=>{Storage.prototype.getItem=()=>{throw Error('storage blocked');};Storage.prototype.setItem=()=>{throw Error('storage blocked');};}:undefined;
   const options=mode==='desktop'?{hasTouch:false,isMobile:false,userAgent:'Mozilla/5.0 Windows',viewport:{width:1280,height:800}}:mode==='ipad-desktop-ua'?{userAgent:'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15) AppleWebKit/605.1.15 Safari/605.1.15'}:{};
   const q=await page(options,init);
   if(['ios-standalone','display-standalone','desktop'].includes(mode))assert.equal(await q.locator('#homeScreenPrompt').count(),0);
   else {await q.locator('#homeScreenPrompt').waitFor();assert((await q.locator('#homeScreenPrompt').innerText()).includes('Share'));await q.keyboard.press('Escape');assert.equal(await q.locator('#homeScreenPrompt').count(),0);}
   checks.push(`${mode} detection and safe dismissal`);await q.close();
  }
  const manifest=JSON.parse(fs.readFileSync('_site/manifest.webmanifest','utf8'));
  assert.equal(manifest.start_url,'./');assert.equal(manifest.scope,'./');assert.equal(manifest.display,'standalone');
  const q=await page({userAgent:android});
  const client=await q.context().newCDPSession(q);const details=await client.send('Page.getAppManifest');assert.equal(details.errors.filter(e=>e.critical).length,0);
  for(const icon of manifest.icons){
   const response=await q.request.get(new URL(icon.src,base).href);assert(response.ok());
   const dimensions=await q.evaluate(async url=>{const image=new Image();image.src=url;await image.decode();return `${image.naturalWidth}x${image.naturalHeight}`;},new URL(icon.src,base).href);assert.equal(dimensions,icon.sizes);
  }
  const apple=await q.locator('link[rel="apple-touch-icon"]').getAttribute('href');assert((await q.request.get(new URL(apple,base).href)).ok());await q.close();
  checks.push('Shipped manifest resolves within the GitHub Pages subpath; app/Apple icons are present with correct dimensions');
  const early=await browser.newPage({viewport:{width:844,height:390},hasTouch:true,isMobile:true,userAgent:android});
  await early.route(url=>url.pathname==='/_site/',r=>r.fulfill({contentType:'text/html',body:'<div id="mainMenu">Menu</div>'}));await early.goto(base);
  const release=JSON.parse(fs.readFileSync('_site/release.json','utf8')).release;
  const captured=await early.evaluate(async url=>{
   const {initHomeScreenPrompt}=await import(url);const event=new Event('beforeinstallprompt',{cancelable:true});event.prompt=async()=>({outcome:'accepted'});
   const prevented=!dispatchEvent(event);initHomeScreenPrompt();return prevented;
  },base+'src/homeScreenPrompt.js?v='+release);
  assert(captured);await early.locator('[data-home-screen-install]').waitFor();await early.locator('[data-home-screen-install]').tap();assert.equal(await early.locator('#homeScreenPromptTitle').innerText(),'Launch from your Home Screen');await early.close();
  checks.push('An install event arriving before startup finishes is retained for the first user tap');
  assert.deepEqual(errors,[]);console.log(JSON.stringify({checks,pass:true,nativeInstallEventsSimulated:true,physicalHomeScreenInstallationRequired:true},null,2));
 }finally{await browser.close();}
})().catch(error=>{console.error(error);process.exitCode=1;});
