const {chromium}=require(process.env.RUNALIS_NODE_MODULES+'/playwright');
const fs=require('node:fs');
let browser;
(async()=>{
 browser=await chromium.launch({channel:'msedge',headless:true});
 const page=await browser.newPage({viewport:{width:1440,height:1000}}),errors=[];
 page.on('pageerror',e=>errors.push(e.stack));
 await page.goto('http://127.0.0.1:8766/world-lab.html');
 await page.waitForFunction(()=>window.review?.world?.worldAtmosphere);
 await page.selectOption('#scene',{label:'Orrakai'});
 await page.waitForTimeout(1800);
 const folder='docs/orrakai-reconstruction';fs.mkdirSync(folder,{recursive:true});
 const baseline=process.argv.includes('--baseline');
 if(baseline){
  fs.writeFileSync(folder+'/content-before.json',JSON.stringify(await page.evaluate(()=>window.review.world.objects.map(({id,kind,npcId,dialogueId,questId,poiId,majorPoiId,x,y,decorative,propType})=>({id,kind,npcId,dialogueId,questId,poiId,majorPoiId,x,y,decorative,propType}))),null,2));
 }
 const results=[];
 for(const [name,x,y] of [['gate',36,39],['market',36,25],['guild',36,14],['smith',53,23],['shrine',19,13]]){
  await page.evaluate(([x,y])=>Object.assign(window.review.player,{x:x*32+16,y:y*32+16}),[x,y]);await page.waitForTimeout(400);
  await page.locator('canvas').screenshot({path:folder+'/'+(baseline?'before-':'')+name+'.png'});
  const timing=await page.evaluate(async()=>{const {draw}=await import('/src/render.js');const g=window.review,c=g.canvas.getContext('2d'),ts=[];for(let i=0;i<90;i++){const t=performance.now();draw(c,g.world,g.player,g.camera);ts.push(performance.now()-t);}ts.sort((a,b)=>a-b);return {median:ts[45],p95:ts[85]};});
  results.push({name,...timing});
 }
 if(!baseline){
  await page.waitForFunction(async()=>{const a=await import('/src/orrakaiRenderer.js');return a.orrakaiArtReady();});
  const buildings=await page.evaluate(()=>window.review.world.buildings);
  for(const b of buildings){
   await page.evaluate(b=>Object.assign(window.review.player,{x:(b.x+b.door+1)*32,y:(b.y+b.h-2.5)*32}),b);
   await page.waitForTimeout(450);
   const alpha=await page.evaluate(async id=>{const {getOrrakaiCutawayState}=await import('/src/orrakaiRenderer.js');return getOrrakaiCutawayState(window.review.world,window.review.player)[id];},b.id);
   if(!(alpha<.05))throw Error('Roof failed to reveal '+b.id+': '+alpha);
   await page.locator('canvas').screenshot({path:folder+'/interior-'+b.id+'.png'});
   await page.evaluate(b=>Object.assign(window.review.player,{x:(b.x+b.door+1)*32,y:(b.y+b.h+1.5)*32}),b);
   await page.waitForTimeout(450);
   const closed=await page.evaluate(async id=>{const {getOrrakaiCutawayState}=await import('/src/orrakaiRenderer.js');return getOrrakaiCutawayState(window.review.world,window.review.player)[id];},b.id);
   if(!(closed>.95))throw Error('Roof failed to restore '+b.id+': '+closed);
   results.push({name:'cutaway-'+b.id,insideAlpha:alpha,outsideAlpha:closed});
  }
  // Give a second viewer an independent cutaway state, as in split-screen co-op.
  const coOp=await page.evaluate(async()=>{const {draw}=await import('/src/render.js');const {getOrrakaiCutawayState}=await import('/src/orrakaiRenderer.js');const g=window.review,b=g.world.buildings[3],ally={...g.player,x:(b.x+3)*32,y:(b.y+3)*32};draw(g.canvas.getContext('2d'),g.world,ally,{x:ally.x-550,y:ally.y-350});return {inside:getOrrakaiCutawayState(g.world,ally).smith,outside:getOrrakaiCutawayState(g.world,g.player).smith};});
  if(coOp.inside!==0)throw Error('Co-op interior did not reveal');results.push({name:'independent-coop-cutaway',...coOp});
  await page.goto('http://127.0.0.1:8766/');
  await page.evaluate(async()=>{
   const {createCapitalHubWorld}=await import('/src/hubSystem.js'),{createPlayer,addItem}=await import('/src/player.js'),{createSaveState,writeProfiles}=await import('/src/gameSave.js');
   const world=createCapitalHubWorld(),player=createPlayer('Orrakai review');Object.assign(player,{x:20.5*32,y:27.5*32,currentZone:'Orrakai',orrakaiLayoutRevision:1,act1OpeningPending:false,gold:100});addItem(player,'fieldRations',5);
   const state=createSaveState({world,player,camera:{x:100,y:500},profileId:'orrakai-review',profileName:'Orrakai review'});
   writeProfiles({'orrakai-review':{id:'orrakai-review',name:'Orrakai review',createdAt:Date.now(),updatedAt:Date.now(),state}});
  });
  await page.reload();await page.locator('[data-load="orrakai-review"]').click();
  await page.waitForFunction(()=>document.querySelector('#activeProfileLabel')?.textContent.includes('Orrakai review'),{},{timeout:30000});
  await page.waitForTimeout(1400);await page.keyboard.press('e');await page.waitForTimeout(300);
  await page.screenshot({path:folder+'/gameplay-bank.png'});
  await page.keyboard.press('Escape');await page.locator('#pauseSaveBtn').click();await page.waitForTimeout(250);
  const saved=await page.evaluate(async()=>{const {readProfiles}=await import('/src/gameSave.js');const s=readProfiles()['orrakai-review'].state;return {gold:s.player.gold,reserve:s.player.storage?.goldReserve,mode:s.worldMode,x:s.player.x,y:s.player.y,revision:s.player.orrakaiLayoutRevision};});
  if(saved.reserve!==25||saved.mode!=='capital'||saved.revision!==1)throw Error('Real bank/save integration failed '+JSON.stringify(saved));results.push({name:'real-game-bank-save',...saved});
  await page.locator('#resumeBtn').click();await page.keyboard.down('d');await page.waitForTimeout(500);await page.keyboard.up('d');await page.keyboard.press('Space');await page.waitForTimeout(300);
  await page.screenshot({path:folder+'/gameplay-movement.png'});
  await page.keyboard.press('Escape');await page.locator('#pauseSaveBtn').click();
  const moved=await page.evaluate(async()=>{const {readProfiles}=await import('/src/gameSave.js');return readProfiles()['orrakai-review'].state.player.x;});
  if(moved<=saved.x+25)throw Error('Real keyboard movement failed');results.push({name:'real-keyboard-and-attack',movedPixels:moved-saved.x});
  await page.goto('http://127.0.0.1:8766/world-lab.html?scene=Orrakai');
  const marketBefore=await page.evaluate(async()=>{const {readProfiles,writeProfiles}=await import('/src/gameSave.js'),{countItem}=await import('/src/player.js');const profiles=readProfiles(),p=profiles['orrakai-review'].state.player;Object.assign(p,{x:33.5*32,y:25.5*32});writeProfiles(profiles);return {gold:p.gold,rations:countItem(p,'fieldRations')};});
  await page.goto('http://127.0.0.1:8766/');await page.locator('[data-load="orrakai-review"]').click();await page.waitForFunction(()=>document.querySelector('#activeProfileLabel')?.textContent.includes('Orrakai review'));await page.waitForTimeout(900);await page.keyboard.press('e');
  await page.locator('#marketShopOverlay.active').waitFor();await page.locator('[data-market-offer="fieldRations"]').click();await page.locator('[data-market-buy="fieldRations"]').click();
  await page.screenshot({path:folder+'/gameplay-market.png'});await page.locator('[data-market-close]').click();await page.keyboard.press('Escape');await page.locator('#pauseSaveBtn').click();
  const marketAfter=await page.evaluate(async()=>{const {readProfiles}=await import('/src/gameSave.js'),{countItem}=await import('/src/player.js');const p=readProfiles()['orrakai-review'].state.player;return {gold:p.gold,rations:countItem(p,'fieldRations')};});
  if(marketAfter.gold!==marketBefore.gold-42||marketAfter.rations!==marketBefore.rations+11)throw Error('Real market purchase failed '+JSON.stringify({marketBefore,marketAfter}));results.push({name:'real-market-purchase',before:marketBefore,after:marketAfter});
  await page.goto('http://127.0.0.1:8766/world-lab.html?scene=Orrakai');
  await page.evaluate(async()=>{const {readProfiles,writeProfiles}=await import('/src/gameSave.js');const profiles=readProfiles();Object.assign(profiles['orrakai-review'].state.player,{x:36.5*32,y:13.5*32});writeProfiles(profiles);});
  await page.goto('http://127.0.0.1:8766/');await page.locator('[data-load="orrakai-review"]').click();await page.waitForFunction(()=>document.querySelector('#activeProfileLabel')?.textContent.includes('Orrakai review'));await page.waitForTimeout(900);await page.keyboard.press('e');await page.waitForTimeout(900);await page.screenshot({path:folder+'/gameplay-warden-dialogue.png'});
 }
 fs.writeFileSync(folder+'/'+(baseline?'baseline':'review')+'.json',JSON.stringify({errors,results},null,2));console.log(JSON.stringify({errors,results}));await browser.close();if(errors.length)process.exitCode=1;
})().catch(async e=>{console.error(e);await browser?.close();process.exitCode=1;});
