const {chromium}=require(process.env.RUNALIS_NODE_MODULES+'/playwright'),fs=require('node:fs'),assert=require('node:assert/strict');
(async()=>{const browser=await chromium.launch({channel:'msedge',headless:true}),out='docs/main-menu-return';fs.mkdirSync(out,{recursive:true});const results=[],errors=[],missing=[];try{
 for(const [width,height] of [[1920,1080],[1280,720],[800,600],[640,360]]){
  const page=await browser.newPage({viewport:{width,height}});page.on('pageerror',e=>errors.push(e.message));page.on('response',r=>{if(r.status()>=400)missing.push(r.url());});await page.goto('http://127.0.0.1:8768/');
  await page.evaluate(async()=>{const {writeProfiles}=await import('/src/gameSave.js'),{createPlayer,chooseClass}=await import('/src/player.js');const p=createPlayer('Return review');chooseClass(p,'thornbinder');p.currentZone='Orrakai';p.characterCreationComplete=true;const profiles={};for(let i=0;i<5;i++){const id='return-review-'+i;profiles[id]={id,name:i===0?'Return review':'Saved wayfarer '+i,updated:1000-i,updatedText:'Review save',state:i===0?{version:5,player:p,worldMode:'capital',worldName:'Orrakai'}:null};}writeProfiles(profiles);});await page.reload();await page.waitForSelector('#profileList [data-load]');
  const snapshot=()=>page.evaluate(()=>{
   const selectors=['#mainMenu','#mainMenu .menu-card','#mainMenu h1','.main-menu-actions','#profileName','#createProfileBtn','#profileList'];
   return Object.fromEntries(selectors.map(selector=>{const e=document.querySelector(selector),s=getComputedStyle(e),r=e.getBoundingClientRect();return [selector,{x:r.x,y:r.y,width:r.width,height:r.height,display:s.display,padding:s.padding,background:s.backgroundImage,fontSize:s.fontSize}];}));
  });
  const before=await snapshot();assert(before['#mainMenu .menu-card'].y>=0,'title card starts above screen');assert(before['#mainMenu .menu-card'].y+before['#mainMenu .menu-card'].height<=height+1,'title card extends below screen');assert(before['#mainMenu h1'].y>=before['#mainMenu .menu-card'].y,'title is clipped above scroll origin');await page.screenshot({path:out+'/initial-'+width+'.png'});
  const cycles=[];for(let cycle=0;cycle<3;cycle++){
   await page.locator('[data-load="return-review-0"]').click();await page.waitForFunction(()=>document.querySelector('#app').classList.contains('active')&&!document.querySelector('#loadingScreen').classList.contains('active')&&!!document.querySelector('#runalisUiStyles'));await page.waitForTimeout(150);
   // Invoke the real Save & Quit binding even though the HUD hides this legacy
   // topbar button. It calls RunalisGame.saveAndQuit, destroy, then showMenu.
   await page.evaluate(()=>document.querySelector('#menuBtn').click());await page.waitForFunction(()=>document.querySelector('#mainMenu').classList.contains('active'));
   const after=await snapshot();cycles.push({cycle,after});await page.screenshot({path:out+'/returned-'+width+'.png'});assert.deepEqual(after,before,'Title layout changed after Save & Quit at '+width);
   assert.equal(await page.locator('#profileList [data-load]').count(),5);assert.equal(await page.locator('#app').evaluate(e=>getComputedStyle(e).display),'none');
  }
  // Drive the real menu controller loop through a synthetic standard pad.
  await page.evaluate(()=>{window.returnPad={id:'Menu review pad',index:0,connected:true,mapping:'standard',axes:[0,0,0,0],buttons:Array.from({length:16},()=>({pressed:false,value:0}))};Object.defineProperty(navigator,'getGamepads',{configurable:true,value:()=>[returnPad]});});
  const press=async index=>{await page.evaluate(async index=>{returnPad.buttons[index]={pressed:true,value:1};for(let i=0;i<3;i++)await new Promise(requestAnimationFrame);returnPad.buttons[index]={pressed:false,value:0};for(let i=0;i<3;i++)await new Promise(requestAnimationFrame);},index);};
  await press(1);const firstFocus=await page.locator('#mainMenu .controller-focus').getAttribute('id');await press(13);const nextFocus=await page.locator('#mainMenu .controller-focus').getAttribute('id');assert.notEqual(nextFocus,firstFocus,'D-pad focus did not move after return');await press(1);assert.equal(await page.locator('#mainMenu .controller-focus').getAttribute('id'),firstFocus);
  // Delete confirmation must remain an explicit, cancelable action.
  await page.locator('[data-delete="return-review-4"]').click();await page.waitForSelector('#profileDeleteConfirmation.active');await page.locator('[data-cancel-profile-delete]').click();assert.equal(await page.locator('#profileList [data-load]').count(),5);
  results.push({width,height,before,cycles,controller:{firstFocus,nextFocus,cancelReturned:true}});await page.close();
 }
 assert.deepEqual(errors,[]);assert.deepEqual(missing,[]);fs.writeFileSync(out+'/verification.json',JSON.stringify({results,errors,missing},null,2));console.log(JSON.stringify({viewports:results.length,saveQuitCycles:results.reduce((sum,r)=>sum+r.cycles.length,0),profilesPreserved:true,controller:true,errors,missing}));
 }finally{await browser.close();}})().catch(e=>{console.error(e);process.exitCode=1;});
