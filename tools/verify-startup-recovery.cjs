const {chromium,webkit,devices}=require(process.env.RUNALIS_NODE_MODULES+'/playwright');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const http=require('node:http');
const path=require('node:path');
const root=path.resolve('_site');
const key='runalis-profiles-v7-slim-save';
const saved=JSON.stringify({existing:{id:'existing',name:'Existing iPhone profile',updated:1,state:null}});
const types={'.html':'text/html','.js':'text/javascript','.css':'text/css','.json':'application/json','.webmanifest':'application/manifest+json','.png':'image/png','.webp':'image/webp','.woff2':'font/woff2'};
const server=http.createServer((req,res)=>{
 let relative=new URL(req.url,'http://localhost').pathname.replace(/^\/Runalis\//,'/');
 if(relative.endsWith('/'))relative+='index.html';
 const file=path.resolve(root,'.'+relative);
 if(!file.startsWith(root+path.sep)||!fs.existsSync(file)){res.writeHead(404);res.end();return;}
 res.writeHead(200,{'Content-Type':types[path.extname(file)]||'application/octet-stream','Cache-Control':'no-store'});
 fs.createReadStream(file).pipe(res);
});
(async()=>{
 await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));
 const base=`http://127.0.0.1:${server.address().port}/Runalis/`;
 const checks=[];
 try{
  for(const engine of [webkit,chromium]){
   const browser=await engine.launch(engine===chromium?{channel:'msedge',headless:true}:{headless:true});
   try{
    for(const failure of ['503','script','runtime','slow','none']){
     const page=await browser.newPage({...devices['iPhone 13'],viewport:{width:844,height:390}});
     const errors=[],scripts=[];
     page.on('pageerror',e=>errors.push(e.message));
     page.on('request',r=>{if(new URL(r.url()).pathname.endsWith('.js'))scripts.push(r.url());});
     await page.addInitScript(({key,saved})=>{
      Object.defineProperty(navigator,'standalone',{value:true});
      if(!localStorage.getItem(key))localStorage.setItem(key,saved);
     },{key,saved});
     let broken=failure!=='none';
     const pattern=failure==='script'?'**/src/startup.js*':'**/src/boot.js*';
     let delayed;
     await page.route(pattern,async route=>{
      if(!broken)return route.continue();
      if(failure==='slow'){delayed=route;return;}
      if(failure==='runtime')return route.fulfill({contentType:'text/javascript',body:'throw new Error("Injected startup failure")'});
      return route.fulfill({status:503,contentType:'text/plain',body:'Temporarily unavailable'});
     });
     await page.goto(base,{waitUntil:'domcontentloaded'});
     if(failure!=='none'){
      if(failure==='slow'){
       await page.waitForFunction(()=>document.querySelector('#startupStatus')!==null);
       await page.clock.install();await page.clock.fastForward(16000);
      }
      await page.locator('[data-startup-retry]').waitFor({state:'visible'});
      assert.equal(await page.locator('#mainMenu').evaluate(e=>e.inert),true);
      assert.equal(await page.evaluate(key=>localStorage.getItem(key),key),saved);
      broken=false;
      if(delayed)await delayed.abort();
      await page.locator('[data-startup-retry]').click();
     }
     await page.locator('[data-load="existing"]').waitFor();
     assert.equal(await page.locator('#startupStatus').count(),0);
     assert.equal(await page.locator('#mainMenu').evaluate(e=>e.inert),false);
     assert.equal(await page.evaluate(key=>localStorage.getItem(key),key),saved);
     assert(!new URL(page.url()).searchParams.has('_runalis_retry'));
     if(failure==='none'){
      assert.equal(scripts.length,2,'Startup must only download the loader and bundled game');
      await page.locator('#profileName').fill('Mobile startup review');
      await page.locator('#createProfileBtn').tap();
      await page.locator('[data-creator-class="oathkeeper"]').tap();
      await page.locator('[data-creator-proceed]').tap();
      await page.locator('[data-creator-name]').fill('Startup Hero');
      await page.locator('[data-creator-start]').tap();
      await page.waitForFunction(()=>!document.querySelector('#characterCreatorOverlay').classList.contains('active'));
      await page.waitForFunction(key=>Object.values(JSON.parse(localStorage.getItem(key))).some(p=>p.state?.player?.name==='Startup Hero'),key);
      await page.reload();
      await page.locator('[data-load="existing"]').waitFor();
      assert.equal(await page.locator('#profileList [data-load]').count(),2);
      assert.deepEqual(await page.evaluate(key=>JSON.parse(localStorage.getItem(key)).existing,key),JSON.parse(saved).existing);
     }
     assert.deepEqual(errors,[]);
     checks.push(`${engine.name()}: ${failure}, existing save preserved and menu usable`);
     console.log(checks.at(-1));
     await page.close();
    }
    const page=await browser.newPage({...devices['iPhone 13'],viewport:{width:844,height:390}});
    const current=JSON.parse(fs.readFileSync('_site/release.json','utf8')).release;
    const html=fs.readFileSync('_site/index.html','utf8');
    let documents=0,latest=current;
    await page.addInitScript(({key,saved})=>{
     Object.defineProperty(navigator,'standalone',{value:true});
     if(!localStorage.getItem(key))localStorage.setItem(key,saved);
    },{key,saved});
    await page.route(url=>url.pathname==='/Runalis/',route=>{
     documents++;
     return route.fulfill({contentType:'text/html',body:html.replace(current,documents===1?'0000000000000000':latest)});
    });
    await page.route('**/release.json?*',route=>route.fulfill({json:{release:latest}}));
    await page.goto(base);
    await page.locator('[data-load="existing"]').waitFor();
    assert.equal(documents,2,'An old entry page should update once before boot');
    assert.equal(await page.evaluate(key=>localStorage.getItem(key),key),saved);
    latest='0123456789abcdef';
    await page.evaluate(()=>dispatchEvent(new Event('online')));
    await page.waitForFunction(latest=>document.querySelector('meta[name="runalis-release"]').content===latest,latest);
    await page.locator('[data-load="existing"]').waitFor();
    assert.equal(documents,3);
    assert.equal(await page.evaluate(key=>localStorage.getItem(key),key),saved);
    checks.push(`${engine.name()}: stale entry and menu release updates preserve profiles`);
    console.log(checks.at(-1));
    await page.close();
   }finally{await browser.close();}
  }
  console.log(JSON.stringify({checks,pass:true},null,2));
 }finally{await new Promise(resolve=>server.close(resolve));}
})().catch(e=>{console.error(e);server.close();process.exitCode=1;});
