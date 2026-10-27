const {chromium}=require(process.env.RUNALIS_NODE_MODULES+'/playwright');
const fs=require('node:fs'),assert=require('node:assert/strict'),launch=require('./browser-game-smoke.cjs');
const base=process.env.RUNALIS_URL||'http://127.0.0.1:8768',html=fs.readFileSync('_site/index.html','utf8');
const current=JSON.parse(fs.readFileSync('_site/release.json','utf8')).release;
const next='0123456789abcdef',old='0000000000000000',checks=[];
const instrument=page=>page.route('**/_site/src/main.js*',route=>route.fulfill({contentType:'text/javascript',body:fs.readFileSync('_site/src/main.js','utf8')+'\nwindow.releaseTestBooted=true;'}));
(async()=>{
 const browser=await chromium.launch({channel:'msedge',headless:true});
 let diagnosticPage;const failures=[];
 browser.on('page',p=>{p.on('pageerror',e=>failures.push(e.message));p.on('requestfailed',r=>failures.push(r.url()+': '+r.failure()?.errorText));});
 try{
  for(const mobile of [true,false]){
   const page=await browser.newPage({viewport:mobile?{width:844,height:390}:{width:1280,height:800},isMobile:mobile,hasTouch:mobile});
   diagnosticPage=page;
   const errors=[];page.on('pageerror',e=>errors.push(e.message));
   await instrument(page);
   let documents=0,latest=current,stale=true;const manifestUrls=[];
   await page.addInitScript(()=>{if(!localStorage.getItem('update-preserved'))localStorage.setItem('update-preserved','saved character sentinel');});
   await page.route(url=>url.pathname==='/_site/',route=>{documents++;return route.fulfill({contentType:'text/html',body:html.replace(current,stale?(stale=false,old):latest)});});
   await page.route('**/_site/release.json?*',route=>{manifestUrls.push(route.request().url());return route.fulfill({json:{release:latest}});});
   await page.goto(base+'/_site/');
   await page.waitForFunction(expected=>document.querySelector('meta[name="runalis-release"]')?.content===expected&&!!document.querySelector('#profileList [data-load],#createProfileBtn'),current);
   await page.waitForFunction(()=>!location.search.includes('_runalis_release'));
   await page.waitForFunction(()=>window.releaseTestBooted===true);
   assert.equal(documents,2,'Cached entry page is replaced once before the game starts');
   assert.equal(await page.evaluate(()=>localStorage.getItem('update-preserved')),'saved character sentinel');
   latest=next;
   await page.evaluate(()=>dispatchEvent(new Event('online')));
   await page.waitForFunction(expected=>document.querySelector('meta[name="runalis-release"]')?.content===expected&&!location.search.includes('_runalis_release'),next);
   await page.waitForFunction(()=>window.releaseTestBooted===true);
   assert.equal(documents,3,'Returning to the menu picks up a new deployment');
   await page.goto(base+'/_site/?_runalis_release='+old+'&_runalis_checked='+Date.now());
   await page.waitForFunction(()=>window.releaseTestBooted===true&&!location.search.includes('_runalis_release'));
   assert.equal(documents,4,'A newer deployment also cleans an older internal update address');
   assert.equal(new Set(manifestUrls).size,manifestUrls.length,'Each manifest check bypasses cached responses');
   assert.equal(await page.evaluate(()=>localStorage.getItem('update-preserved')),'saved character sentinel');
   assert.deepEqual(errors,[]);checks.push(`${mobile?'Mobile':'Desktop'} normal link recovers stale HTML, cleans its internal URL and detects a later release without deleting saves`);
   await page.close();
  }
  const page=await browser.newPage({viewport:{width:844,height:390},isMobile:true,hasTouch:true});
  diagnosticPage=page;
  let latest=current;
  await page.addInitScript(()=>{Element.prototype.requestFullscreen=async()=>{throw Error('Unsupported test browser');};});
  await page.route('**/_site/release.json?*',route=>route.fulfill({json:{release:latest}}));
  await page.route(url=>url.pathname==='/_site/',route=>route.fulfill({contentType:'text/html',body:html.replace(current,latest)}));
  await page.route('**/_site/src/main.js*',route=>route.fulfill({contentType:'text/javascript',body:fs.readFileSync('_site/src/main.js','utf8')+'\nwindow.updateGame=()=>currentGame;'}));
  await launch(page,base+'/_site');await page.waitForFunction(()=>window.updateGame?.()?.started&&!document.querySelector('#loadingScreen')?.classList.contains('active'));
  await page.evaluate(()=>{const g=updateGame();g.player.gold=9876;g.originalSaveForTest=g.save;g.save=()=>false;});
  latest=next;await page.evaluate(()=>dispatchEvent(new Event('online')));await page.locator('#releaseUpdateNotice').waitFor();
  assert.equal(await page.evaluate(()=>document.querySelector('meta[name="runalis-release"]').content),current,'Gameplay does not auto-reload');
  await page.getByRole('button',{name:'Later',exact:true}).click();assert.equal(await page.locator('#releaseUpdateNotice').count(),0);
  // Another release is independently offered after deferring one update.
  latest='fedcba9876543210';await page.evaluate(()=>dispatchEvent(new Event('online')));await page.locator('#releaseUpdateNotice').waitFor();
  await page.getByRole('button',{name:'Save & update',exact:true}).click();await page.waitForFunction(()=>document.querySelector('#releaseUpdateNotice')?.textContent.includes('Could not save'));
  assert.equal(await page.evaluate(()=>updateGame().player.gold),9876,'A failed save leaves the active character intact');
  await page.evaluate(()=>{updateGame().save=updateGame().originalSaveForTest;});
  await page.getByRole('button',{name:'Save & update',exact:true}).click();
  await page.waitForFunction(expected=>document.querySelector('meta[name="runalis-release"]')?.content===expected&&!location.search.includes('_runalis_release'),'fedcba9876543210');
  const savedGold=await page.evaluate(async()=>{const {readProfiles}=await import('/src/gameSave.js');return readProfiles().playerSmoke.state.player.gold;});
  assert.equal(savedGold,9876);checks.push('Active gameplay offers an update; Later defers it; save failure prevents reload; successful update preserves character progress');await page.close();
  async function onlinePage(mobile){
   const p=await browser.newPage({viewport:{width:844,height:390},isMobile:mobile,hasTouch:mobile});let advertised=current;
   diagnosticPage=p;
   await p.addInitScript(()=>{Element.prototype.requestFullscreen=async()=>{throw Error('Unsupported test browser');};});
   await p.route('**/_site/release.json?*',r=>r.fulfill({json:{release:advertised}}));
   await p.route(url=>url.pathname==='/_site/',r=>r.fulfill({contentType:'text/html',body:html.replace(current,advertised)}));
   await p.route('**/_site/src/main.js*',r=>r.fulfill({contentType:'text/javascript',body:fs.readFileSync('_site/src/main.js','utf8')+'\nwindow.updateGame=()=>currentGame;'}));
   await launch(p,base+'/_site');await p.waitForFunction(()=>window.updateGame?.()?.started&&!document.querySelector('#loadingScreen')?.classList.contains('active'));
   return {page:p,advertise:value=>{advertised=value;}};
  }
  const host=await onlinePage(false),guest=await onlinePage(true),password='Release-update-'+crypto.randomUUID();
  await host.page.evaluate(password=>updateGame().onlineSession.connect('host',password),password);await host.page.waitForFunction(()=>updateGame().onlineSession.role==='host');
  await guest.page.evaluate(password=>updateGame().onlineSession.connect('guest',password),password);await guest.page.waitForFunction(()=>updateGame().onlineSession.role==='guest'&&updateGame().onlineSession.ready);
  await host.page.evaluate(()=>{[...updateGame().onlineSession.clients.values()][0].actor.gold=4321;});await guest.page.waitForFunction(()=>updateGame().player.gold===4321);
  guest.advertise(next);await guest.page.evaluate(()=>dispatchEvent(new Event('online')));await guest.page.locator('#releaseUpdateNotice').waitFor();
  assert.equal(await guest.page.evaluate(()=>updateGame().onlineSession.role),'guest','An update does not interrupt online play');
  await guest.page.getByRole('button',{name:'Save & update',exact:true}).click();
  await guest.page.waitForFunction(expected=>document.querySelector('meta[name="runalis-release"]')?.content===expected&&!location.search.includes('_runalis_release'),next);
  const onlineSave=await guest.page.evaluate(async()=>{const {readProfiles}=await import('/src/gameSave.js');return readProfiles().playerSmoke.state;});
  assert.equal(onlineSave.player.gold,4321);assert.equal(onlineSave.worldMode,'capital');assert(!onlineSave.player.networkRemote);
  await host.page.waitForFunction(()=>updateGame().player.coop.players.length===0);assert.equal(await host.page.evaluate(()=>updateGame().onlineSession.role),'host');
  checks.push('A real online guest can defer interruption, then save acquired progress and return home during update while the desktop host stays open');
  await guest.page.close();await host.page.close();
  for(const mode of ['offline','timeout','invalid','stale-edge']){
   const p=await browser.newPage();let documents=0,recovered=false;
   await instrument(p);
   if(mode==='stale-edge')await p.clock.install();
   await p.route(url=>url.pathname==='/_site/',route=>{documents++;return route.fulfill({contentType:'text/html',body:recovered?html.replace(current,next):html});});
   await p.route('**/_site/release.json?*',route=>mode==='offline'?route.abort():mode==='timeout'?undefined:route.fulfill({json:{release:mode==='invalid'?'https://bad.example/':next}}));
   await p.goto(base+'/_site/');await p.waitForFunction(()=>window.releaseTestBooted===true,null,{timeout:15000});
   assert.equal(documents,mode==='stale-edge'?2:1);
   if(mode==='stale-edge'){
    recovered=true;await p.clock.fastForward(61000);
    await p.waitForFunction(expected=>document.querySelector('meta[name="runalis-release"]')?.content===expected&&!location.search.includes('_runalis_release'),next);
    assert.equal(documents,3,'A recovered deployment edge is retried after a backoff');
   }
   checks.push(`${mode}: startup remains usable without a reload loop${mode==='stale-edge'?'; a recovered edge updates after backoff':''}`);await p.close();
  }
  console.log(JSON.stringify({checks,pass:true},null,2));
 }catch(error){console.error(JSON.stringify({checks,failures,page:diagnosticPage&&!diagnosticPage.isClosed()?await diagnosticPage.evaluate(()=>({url:location.href,release:document.querySelector('meta[name="runalis-release"]')?.content,booted:window.releaseTestBooted})):null}));throw error;
 }finally{await browser.close();}
})().catch(error=>{console.error(error);process.exitCode=1;});
