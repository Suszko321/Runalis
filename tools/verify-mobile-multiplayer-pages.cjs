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
  assert.equal(await page.evaluate(()=>mobileGame().player.characterCreationComplete),undefined,'Loaded real-format saves do not need an invented completion flag');
  const originalClass=await page.evaluate(()=>{const p=mobileGame().player,value={classId:p.classId,className:p.className};p.classId=null;p.className=null;return value;});
  await page.locator('[data-action="pause"]').tap();await page.locator('#pauseMultiplayerBtn').tap();await page.locator('[data-online-password]').fill('Missing-class-test');await page.locator('[data-online-host]').tap();
  await page.waitForFunction(()=>mobileGame().onlineSession.status.includes('Choose your character'));
  assert.equal(await page.evaluate(()=>mobileGame().onlineSession.role),null);
  await page.evaluate(value=>Object.assign(mobileGame().player,value),originalClass);await page.locator('[data-online-close]').tap();
  for(const size of [{width:844,height:390},{width:667,height:375},{width:390,height:844}]){
   await page.setViewportSize(size);
   if(size.height>size.width)await page.locator('[data-mobile-portrait]').tap();
   await page.locator('[data-action="menu"]').tap();await page.locator('[data-menu-action="multiplayer"]').tap();
   await page.locator('#onlineMultiplayerOverlay.active').waitFor();
   for(const selector of ['[data-online-password]','[data-online-host]','[data-online-join]']){
    const box=await page.locator(selector).boundingBox();assert(box&&box.x>=0&&box.y>=0&&box.x+box.width<=size.width+1&&box.y+box.height<=size.height+1,selector+' fits mobile viewport');
   }
   await page.locator('[data-online-close]').tap();
   await page.locator('[data-action="pause"]').tap();await page.locator('#pauseMultiplayerBtn').tap();await page.locator('#onlineMultiplayerOverlay.active').waitFor();await page.locator('[data-online-close]').tap();
  }
  await page.locator('[data-action="pause"]').tap();await page.locator('#pauseMultiplayerBtn').tap();
  await page.locator('[data-online-password]').fill('Mobile-pages-'+crypto.randomUUID());await page.locator('[data-online-host]').tap();
  await page.waitForFunction(()=>mobileGame().onlineSession.role==='host',null,{timeout:30000});
  await page.locator('[data-online-leave]').tap();await page.locator('[data-online-close]').tap();
  const modules=scripts.filter(url=>url.includes('/_site/src/'));
  assert(modules.length>100);assert(modules.every(url=>new URL(url).searchParams.has('v')),'Every shipped module bypasses old cached addresses');
  assert.equal(new Set(modules.map(url=>new URL(url).searchParams.get('v'))).size,1,'One consistent module graph per release');
  // Complete the actual touch creator rather than manufacturing a readiness
  // flag, then verify a newly created character can host as well.
  await page.locator('[data-action="pause"]').tap();await page.locator('#saveQuitBtn').tap();await page.locator('#mainMenu.active').waitFor();
  await page.locator('#profileName').fill('Online creator check');await page.locator('#createProfileBtn').tap();await page.locator('#characterCreatorOverlay.active').waitFor();
  await page.locator('[data-creator-class="oathkeeper"]').tap();await page.locator('[data-creator-proceed]').tap();await page.locator('[data-creator-start]').tap();
  await page.waitForFunction(()=>!document.querySelector('#characterCreatorOverlay.active'));
  await page.locator('[data-action="skip"]').tap();await page.waitForFunction(()=>mobileGame().world.mode==='maraHouse'&&mobileGame().dialogue.active);
  await page.evaluate(()=>mobileGame().closeConversation());await page.waitForFunction(()=>!mobileGame().dialogue.active);
  assert.equal(await page.evaluate(()=>mobileGame().player.classId),'oathkeeper');
  assert.equal(await page.evaluate(()=>mobileGame().player.characterCreationComplete),undefined);
  await page.locator('[data-action="pause"]').tap();await page.locator('#pauseMultiplayerBtn').tap();await page.locator('[data-online-password]').fill('Creator-pages-'+crypto.randomUUID());await page.locator('[data-online-host]').tap();
  await page.waitForFunction(()=>mobileGame().onlineSession.role==='host',null,{timeout:30000});await page.locator('[data-online-leave]').tap();await page.locator('[data-online-close]').tap();
  assert.deepEqual(errors,[]);
  await page.screenshot({path:'tmp/mobile-multiplayer-pages.png'});
  console.log('PASS shipped mobile Multiplayer at 844×390, 667×375 and 390×844; menu and toolbar taps, real-format saved character hosting, missing-class rejection, actual creator completion and hosting, and stale-module cache isolation');
 }finally{await browser.close();}
})().catch(error=>{console.error(error);process.exitCode=1;});
