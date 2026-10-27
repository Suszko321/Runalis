const {chromium}=require(process.env.RUNALIS_NODE_MODULES+'/playwright'),fs=require('node:fs'),assert=require('node:assert/strict'),launch=require('./browser-game-smoke.cjs');
(async()=>{const browser=await chromium.launch({channel:'msedge',headless:true}),base=process.env.RUNALIS_URL||'http://127.0.0.1:8768',out='docs/menu-opening',errors=[],failed=[],cases=[];fs.mkdirSync(out,{recursive:true});
 try{
  const page=await browser.newPage({viewport:{width:1280,height:800}});page.on('pageerror',e=>errors.push(e.message));page.on('response',r=>{if(r.status()>=400)failed.push(r.url());});
  await page.route('**/src/main.js*',r=>r.fulfill({contentType:'text/javascript',body:fs.readFileSync('src/main.js','utf8')+'\nwindow.menuOpeningGame=()=>currentGame;'}));
  await page.goto(base+'/');await page.waitForSelector('#mainMenu.active');assert.equal(await page.locator('#developerModeBtn').count(),0);assert(!(await page.locator('#mainMenu').innerText()).includes('Developer Mode'));await page.screenshot({path:out+'/main-menu.png'});
  await launch(page,base,'act1Opening');await page.waitForFunction(()=>window.menuOpeningGame?.()?.started);await page.waitForFunction(()=>!document.querySelector('#loadingScreen')?.classList.contains('active'));
  const reset=()=>page.evaluate(async()=>{
   const g=menuOpeningGame(),{createCaravanOpeningWorld}=await import('/src/act1OpeningSystem.js'),{closeDialogue}=await import('/src/dialogueSystem.js');closeDialogue(g.dialogue,{immediate:true});g.world=createCaravanOpeningWorld();Object.assign(g.player,g.world.spawn);g.player.moveTarget=null;g.keys.clear();g.clearAbilityInputEdges(true);g.paused=false;
  });
  await reset();await page.waitForFunction(()=>document.querySelector('#act1NarrativeOverlay small')?.textContent.includes('Press any key'));
  for(const key of ['z','w','q','Space','ArrowLeft','Tab','F2','Shift','Escape','Enter']){
   await reset();await page.keyboard.down(key);await page.waitForFunction(()=>menuOpeningGame().world.mode==='maraHouse',null,{timeout:15000});
   // Repeated held input after the transition must remain consumed until keyup.
   await page.keyboard.down(key);const state=await page.evaluate(()=>{const g=menuOpeningGame();return {mode:g.world.mode,keys:g.keys.size,charge:!!g.player.abilityCharge,attack:!!g.player.combatState?.attacking,paused:g.paused};});
   assert.equal(state.keys,0,key+' leaked into movement');assert(!state.charge&&!state.attack&&!state.paused,key+' triggered gameplay');await page.keyboard.up(key);assert.equal(await page.evaluate(()=>menuOpeningGame().openingSkipKeys.size),0);cases.push({key,mode:state.mode,heldInputConsumed:true});
  }
  await reset();await page.evaluate(()=>{const field=document.createElement('input');field.id='openingTypingReview';field.style='position:fixed;top:0;left:0;z-index:9999';document.body.append(field);field.focus();});await page.keyboard.type('hello');assert.equal(await page.evaluate(()=>menuOpeningGame().world.opening.skipRequested),false);await page.evaluate(()=>document.querySelector('#openingTypingReview').remove());
  await page.evaluate(()=>{const overlay=document.createElement('div');overlay.id='characterCreatorOverlay';overlay.className='active';overlay.dataset.review='true';document.body.append(overlay);});await page.keyboard.press('z');assert.equal(await page.evaluate(()=>menuOpeningGame().world.opening.skipRequested),false);await page.evaluate(()=>document.querySelector('[data-review="true"]').remove());
  const controller=await page.evaluate(()=>{const g=menuOpeningGame(),original=g.getAllControllerInputsForUi;g.getAllControllerInputsForUi=()=>[{confirmPressed:true}];try{g.handleControllerGlobalInput(performance.now()/1000);return g.world.opening.skipRequested;}finally{g.getAllControllerInputsForUi=original;}});assert(controller);await page.waitForFunction(()=>menuOpeningGame().world.mode==='maraHouse');
  await page.waitForFunction(()=>menuOpeningGame().dialogue.active,null,{timeout:10000});await page.keyboard.press('z');assert.equal(await page.evaluate(()=>menuOpeningGame().world.mode),'maraHouse');assert(await page.evaluate(()=>menuOpeningGame().dialogue.active&&!menuOpeningGame().player.story.flags.opening.maraConversationComplete));
  assert.deepEqual(errors,[]);assert.deepEqual(failed,[]);const report={mainMenuDeveloperEntry:false,cases,typingProtected:true,creatorProtected:true,controllerConfirm:true,recoveryDialoguePreserved:true,errors,failed};fs.writeFileSync(out+'/verification.json',JSON.stringify(report,null,2));console.log(JSON.stringify(report));
 }finally{await browser.close();}
})().catch(e=>{console.error(e);process.exitCode=1;});
