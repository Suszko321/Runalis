// Exercise the shipped module graph, including a stale unversioned menu response.
const {chromium}=require(process.env.RUNALIS_NODE_MODULES+'/playwright');
const fs=require('node:fs'),assert=require('node:assert/strict'),launch=require('./browser-game-smoke.cjs');
const base=process.env.RUNALIS_URL||'http://127.0.0.1:8768';
(async()=>{
 const browser=await chromium.launch({channel:'msedge',headless:true}),errors=[],scripts=[];
 try{
  const page=await browser.newPage({viewport:{width:844,height:390},isMobile:true,hasTouch:true});
  page.on('pageerror',e=>errors.push(e.message));page.on('request',r=>{if(r.resourceType()==='script')scripts.push(r.url());});
  await page.addInitScript(()=>{Element.prototype.requestFullscreen=async()=>{throw Error('Unsupported test browser');};});
  await page.route('**/_site/src/main.js*',r=>r.fulfill({contentType:'text/javascript',body:fs.readFileSync('_site/src/main.js','utf8')+'\nwindow.mobileGame=()=>currentGame;'}));
  // A phone may retain an old response at this address. New releases must
  // request versioned imports instead, throughout the graph.
  await page.route('**/_site/src/ui.js',r=>r.fulfill({contentType:'text/javascript',body:'throw Error("Stale menu module loaded");'}));
  await launch(page,base+'/_site');
  await page.waitForFunction(()=>mobileGame()?.started&&!document.querySelector('#loadingScreen')?.classList.contains('active'));
  for(const size of [{width:844,height:390},{width:667,height:375},{width:390,height:844}]){
   await page.setViewportSize(size);
   if(size.height>size.width)await page.locator('[data-mobile-portrait]').tap();
   await page.locator('[data-action="menu"]').tap();await page.locator('[data-menu-action="multiplayer"]').tap();
   await page.locator('#onlineMultiplayerOverlay.active').waitFor();
   for(const selector of ['[data-online-password]','[data-online-host]','[data-online-join]']){
    const box=await page.locator(selector).boundingBox();assert(box&&box.x>=0&&box.y>=0&&box.x+box.width<=size.width+1&&box.y+box.height<=size.height+1,selector+' fits mobile viewport');
   }
   await page.locator('[data-online-close]').tap();
   await page.locator('[data-action="multiplayer"]').tap();await page.locator('#onlineMultiplayerOverlay.active').waitFor();await page.locator('[data-online-close]').tap();
  }
  await page.locator('[data-action="multiplayer"]').tap();
  await page.locator('[data-online-password]').fill('Mobile-pages-'+crypto.randomUUID());await page.locator('[data-online-host]').tap();
  await page.waitForFunction(()=>mobileGame().onlineSession.role==='host',null,{timeout:30000});
  await page.locator('[data-online-leave]').tap();await page.locator('[data-online-close]').tap();
  const modules=scripts.filter(url=>url.includes('/_site/src/'));
  assert(modules.length>100);assert(modules.every(url=>new URL(url).searchParams.has('v')),'Every shipped module bypasses old cached addresses');
  assert.equal(new Set(modules.map(url=>new URL(url).searchParams.get('v'))).size,1,'One consistent module graph per release');
  assert.deepEqual(errors,[]);
  await page.screenshot({path:'tmp/mobile-multiplayer-pages.png'});
  console.log('PASS shipped mobile Multiplayer at 844×390, 667×375 and 390×844; menu and toolbar taps, visible host/join controls, real room hosting, and stale-module cache isolation');
 }finally{await browser.close();}
})().catch(error=>{console.error(error);process.exitCode=1;});
