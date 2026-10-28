const {chromium}=require(process.env.RUNALIS_NODE_MODULES+'/playwright'),fs=require('node:fs'),assert=require('node:assert/strict'),launch=require('./browser-game-smoke.cjs');
(async()=>{const browser=await chromium.launch({channel:'msedge',headless:true}),errors=[],checks=[];try{
 for(const mobile of [false,true]){
  const p=await browser.newPage({viewport:mobile?{width:844,height:390}:{width:1280,height:800},isMobile:mobile,hasTouch:mobile});p.on('pageerror',e=>errors.push(e.message));
  await p.route('**/src/main.js*',r=>r.fulfill({contentType:'text/javascript',body:fs.readFileSync('src/main.js','utf8')+'\nwindow.deathGame=()=>currentGame;'}));
  await launch(p,process.env.RUNALIS_URL||'http://127.0.0.1:8774');await p.waitForFunction(()=>deathGame()?.started&&!document.querySelector('#loadingScreen.active'));
  const before=await p.evaluate(async()=>{const g=deathGame();g.world=(await import('/src/world.js')).createWorld();g.overworldState=null;g.player.gold=100;g.player.x=130*32;g.player.y=100*32;const stone=(await import('/src/navStoneNetwork.js')).nearestNavStone(g.world,g.player);window.deathExpected={x:stone.x,y:stone.y};g.player.hp=0;return {x:g.player.x,y:g.player.y};});
  const overlay=p.locator('#deathScreenOverlay'),count=overlay.locator('[role="status"]'),button=overlay.locator('[data-death-respawn]');
  await overlay.waitFor({state:'visible'});assert.equal(await p.evaluate(()=>deathGame().save(false)),false);assert.equal(await count.innerText(),'3');assert(!(await button.isVisible()));
  await p.keyboard.press('Enter');assert.equal(await p.evaluate(()=>deathGame().player.hp),0);
  await p.waitForFunction(()=>document.querySelector('#deathScreenOverlay [role="status"]')?.textContent==='2');assert(!(await button.isVisible()));
  await p.waitForFunction(()=>document.querySelector('#deathScreenOverlay [role="status"]')?.textContent==='1');assert(!(await button.isVisible()));
  await button.waitFor({state:'visible'});assert.equal(await p.evaluate(()=>deathGame().player.hp),0);
  await p.keyboard.down('d');await p.waitForTimeout(100);await p.keyboard.up('d');assert.deepEqual(await p.evaluate(()=>({x:deathGame().player.x,y:deathGame().player.y})),before);
  const box=await overlay.boundingBox(),vp=p.viewportSize();assert.equal(box.width,vp.width);assert.equal(box.height,vp.height);
  await p.screenshot({path:`tmp/death-screen-${mobile?'mobile':'desktop'}.png`});
  if(mobile){await p.setViewportSize({width:390,height:844});const portraitBox=await overlay.boundingBox();assert.equal(portraitBox.width,390);assert.equal(portraitBox.height,844);await button.tap();}else await p.keyboard.press('Enter');
  await overlay.waitFor({state:'hidden'});
  const result=await p.evaluate(()=>{const g=deathGame();return {hp:g.player.hp,gold:g.player.gold,lifeState:g.player.lifeState,atStone:Math.hypot(g.player.x-deathExpected.x,g.player.y-deathExpected.y)<2};});
  assert(result.hp>0);assert.equal(result.gold,88);assert.equal(result.lifeState,'alive');assert(result.atStone);
  await p.evaluate(()=>deathGame().deathScreen.respawn());assert.equal(await p.evaluate(()=>deathGame().player.gold),88);
  checks.push(`${mobile?'Mobile touch':'Desktop keyboard'}: 3,2,1, no early respawn or movement, full viewport, nearest stone, one penalty`);
  if(!mobile){
   await p.evaluate(()=>{deathGame().player.hp=0;deathGame().handlePlayerDefeated();deathGame().handleControllerGlobalInput(performance.now()/1000);});
   assert(!(await button.isVisible()));await button.waitFor({state:'visible'});
   await p.evaluate(()=>deathGame().deathScreen.handleController([{connected:true,slotIndex:deathGame().getPrimaryControllerInput().slotIndex,confirmPressed:true}]));await overlay.waitFor({state:'hidden'});
   checks.push('Controller confirm respawns only after the countdown');
  }
  await p.evaluate(()=>deathGame().destroy());assert.equal(await overlay.count(),0);await p.close();
 }
 assert.deepEqual(errors,[]);console.log(JSON.stringify({pass:true,checks,errors},null,2));
}finally{await browser.close();}})().catch(e=>{console.error(e);process.exitCode=1;});



