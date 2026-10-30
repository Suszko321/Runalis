const {chromium}=require(process.env.RUNALIS_NODE_MODULES+'/playwright');
const fs=require('node:fs'),assert=require('node:assert/strict'),launch=require('./browser-game-smoke.cjs');
const base=process.env.RUNALIS_URL||'http://127.0.0.1:8774',out='docs/hotbar-assignment';
(async()=>{
 const b=await chromium.launch({channel:'msedge',headless:true}),errors=[],checks=[];fs.mkdirSync(out,{recursive:true});
 try{for(const [width,height,mobile]of [[844,390,true],[390,844,true],[1280,800,false],[800,600,false]]){
  const p=await b.newPage({viewport:mobile?{width:844,height:390}:{width,height},isMobile:mobile,hasTouch:mobile});p.on('pageerror',e=>errors.push(e.message));
  await p.addInitScript(()=>Element.prototype.requestFullscreen=async()=>{throw Error('Test fullscreen unavailable');});
  await p.route('**/src/main.js*',r=>r.fulfill({contentType:'text/javascript',body:fs.readFileSync('src/main.js','utf8')+'\nwindow.hotbarGame=()=>currentGame;'}));
  await launch(p,base);await p.waitForFunction(()=>hotbarGame()?.started&&!document.querySelector('#loadingScreen.active'));
  await p.setViewportSize({width,height});
  if(await p.locator('[data-mobile-portrait]').isVisible())await p.locator('[data-mobile-portrait]').click();
  const click=async selector=>mobile?await p.locator(selector).tap():await p.locator(selector).click();
  if(mobile)await click('[data-action="menu"]');else await p.keyboard.press('Tab');
  await click('[data-tab="skills"]');await click('[data-skills-subtab="abilities"]');
  const slots=()=>p.evaluate(()=>[...hotbarGame().player.loadout.abilitySlots]);
  const clear='[data-clear-all-ability-slots]';await click(clear);assert.deepEqual(await slots(),[null,null,null,null,null]);assert(await p.locator(clear).isDisabled());
  const before=await slots();await click('[data-assign-selected-slot="2"]');assert.deepEqual(await slots(),before);assert.equal(await p.locator('.awaiting-skill').count(),1);assert.equal(await p.locator('[data-ability-hotbar-slot="2"]').getAttribute('aria-pressed'),'true');assert(await p.locator('.hotbar-placement-status').isVisible());assert.match(await p.locator('.hotbar-placement-status').innerText(),/Slot 3 selected/);
  const style=await p.locator('.awaiting-skill').evaluate(e=>({shadow:getComputedStyle(e).boxShadow,outline:getComputedStyle(e).outlineWidth}));assert.notEqual(style.shadow,'none');assert.notEqual(style.outline,'0px');
  await p.screenshot({path:out+`/slot-selected-${width}.png`});
  await click('[data-select-ability-id="oathkeeperOathStrike"]');assert.equal((await slots())[2],'oathkeeperOathStrike');assert.equal(await p.locator('.awaiting-skill').count(),0);assert.equal(await p.locator('.mobile-detail-open').count(),0);
  await click('[data-assign-selected-slot="1"]');await click('[data-select-ability-id="oathkeeperOathStrike"]');assert.equal((await slots())[1],'oathkeeperOathStrike');assert.equal((await slots())[2],null);
  await click('[data-assign-selected-slot="3"]');await click('[data-assign-selected-slot="4"]');assert.equal(await p.locator('.awaiting-skill').count(),1);assert.equal(await p.locator('[data-ability-hotbar-slot="4"]').getAttribute('aria-pressed'),'true');await click('[data-assign-selected-slot="4"]');assert.equal(await p.locator('.awaiting-skill').count(),0);
  await click('[data-assign-selected-slot="3"]');await click('[data-ability-category="utility"]');assert.equal(await p.locator('[data-ability-hotbar-slot="3"]').getAttribute('aria-pressed'),'true');await click('[data-ability-category="all"]');if(!mobile)await p.keyboard.press('Tab');await click('[data-tab="inventory"]');if(!mobile)await p.keyboard.press('Tab');await click('[data-tab="skills"]');assert.equal(await p.locator('.awaiting-skill').count(),0);
  await click('[data-select-ability-id="block"]');await click('[data-assign-selected-slot="0"]');assert.equal((await slots())[0],'block');assert.equal(await p.locator('.awaiting-skill').count(),0);
  // Clear all must remain reachable with the mobile morph detail sheet open.
  await click('[data-select-ability-id="oathkeeperOathStrike"]');await click(clear);assert.deepEqual(await slots(),[null,null,null,null,null]);assert.equal(await p.locator('.awaiting-skill').count(),0);assert(await p.evaluate(()=>hotbarGame().player.knownAbilities.includes('oathkeeperOathStrike')&&hotbarGame().player.knownAbilities.includes('block')));
  await p.screenshot({path:out+`/cleared-${width}.png`});
  await p.reload();await p.waitForFunction(()=>document.querySelector('#profileList')?.childElementCount>0);if(await p.locator('[data-mobile-portrait]').isVisible())await p.locator('[data-mobile-portrait]').click();await p.locator('[data-load="playerSmoke"]').click();await p.waitForFunction(()=>hotbarGame()?.started&&!document.querySelector('#loadingScreen.active'));assert.deepEqual(await slots(),[null,null,null,null,null]);
  checks.push({width,height,mobile,pass:true});await p.close();
 }
 assert.deepEqual(errors,[]);fs.writeFileSync(out+'/verification.json',JSON.stringify({checks,errors},null,2));console.log(JSON.stringify({checks,errors},null,2));
 }finally{await b.close();}
})().catch(e=>{console.error(e);process.exitCode=1;});
