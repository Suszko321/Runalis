const {chromium}=require(process.env.RUNALIS_NODE_MODULES+'/playwright');
const fs=require('node:fs'),assert=require('node:assert/strict');
(async()=>{
 const browser=await chromium.launch({channel:'msedge',headless:true});
 const report={classes:[],errors:[],performance:null};
 const folder='docs/progression-overhaul';fs.mkdirSync(folder,{recursive:true});
 try{
  const page=await browser.newPage({viewport:{width:1440,height:1000}});
  page.on('pageerror',e=>report.errors.push(e.stack));
  await page.goto('http://127.0.0.1:8766/');
  await page.evaluate(async()=>{
   const {createPlayer}=await import('/src/player.js'),{createCapitalHubWorld}=await import('/src/hubSystem.js');
   const {createSaveState,writeProfiles}=await import('/src/gameSave.js');
   const player=createPlayer('Isolated progression review');player.act1OpeningPending=false;
   const state=createSaveState({player,world:createCapitalHubWorld(),camera:{x:0,y:0}});
   writeProfiles({'progression-review':{id:'progression-review',name:player.name,createdAt:Date.now(),updatedAt:Date.now(),state}});
  });
  await page.reload();await page.locator('[data-load="progression-review"]').click();await page.waitForTimeout(1000);
  await page.evaluate(async()=>{
   const {createPlayer,chooseClass}=await import('/src/player.js');
   const {createCapitalHubWorld}=await import('/src/hubSystem.js');
   const {initUI,renderUI}=await import('/src/ui.js');
   const {interact}=await import('/src/gameInteraction.js');
   window.prepareProgressionReview=(classId)=>{
    const player=createPlayer('Progression review');chooseClass(player,classId,()=>{});
    player.id='progression-review';player.act1OpeningPending=false;player.gold=40;
    const world=createCapitalHubWorld({skipPublishedOverride:true}),merchant=world.objects.find(o=>o.id==='orrakaiSkillMerchant');
    player.x=merchant.x;player.y=merchant.y+22;
    const g={player,world,canvas:document.querySelector('#game'),camera:{x:player.x-480,y:player.y-270},logLines:[],log:m=>g.logLines.push(m),save:()=>{},uiState:{activeMainTab:'inventory',inventorySubtab:'loot'}};
    window.progressionReview=g;initUI(g);renderUI(player,[],g);document.querySelector('.panel').classList.add('open');interact(g);
    return {classId,merchant:merchant.name,category:g.marketShop.categoryId};
   };
  });
  for(const classId of ['classless','oathkeeper','fellhunter','gravecaller','thornbinder','waverider','lightbringer','eldritch']){
   const result=await page.evaluate(id=>window.prepareProgressionReview(id),classId);
   assert.equal(result.category,'skills');
   assert.ok((await page.locator('#marketShopOverlay').innerText()).includes('Ilyra'));
   if(classId==='classless')await page.locator('#marketShopOverlay').screenshot({path:folder+'/merchant.png'});
   await page.locator('[data-market-buy="summonWolfScroll"]').click();
   result.purchase=await page.evaluate(()=>({gold:window.progressionReview.player.gold,scroll:window.progressionReview.player.inventory.some(i=>i.id==='summonWolfScroll')}));
   assert.equal(result.purchase.gold,28);assert.ok(result.purchase.scroll);
   assert.equal(await page.locator('[data-market-buy="summonWolfScroll"]').isEnabled(),false);
   await page.locator('[data-market-close]').click();
   await page.evaluate(async()=>{const g=window.progressionReview;const {renderUI}=await import('/src/ui.js');renderUI(g.player,[],g);});
   const row=page.locator('[data-inventory-item-index]').filter({hasText:'Scroll: Summon Wolf'});
   assert.equal(await row.count(),1,'Purchased scroll must be visible in production Inventory → Loot');
   await row.click();
   if(classId==='classless')await page.screenshot({path:folder+'/scroll-inventory.png'});
   await page.locator('[data-read-skill-scroll]').click();
   result.read=await page.evaluate(()=>({known:window.progressionReview.player.knownAbilities.includes('summonWolf'),scroll:window.progressionReview.player.inventory.some(i=>i.id==='summonWolfScroll')}));
   assert.equal(result.read.known,true);assert.equal(result.read.scroll,false);
   await page.evaluate(async()=>{const g=window.progressionReview;g.uiState.activeMainTab='skills';g.uiState.skillsSubtab='abilities';g.uiState.abilityCategory='all';g.uiState.selectedAbilityId='summonWolf';const {renderUI}=await import('/src/ui.js');renderUI(g.player,[],g);});
   await page.locator('[data-select-ability-id="summonWolf"]').click();await page.locator('[data-assign-selected-slot="3"]').click();
   assert.equal(await page.evaluate(()=>window.progressionReview.player.loadout.abilitySlots[3]),'summonWolf');
   if(classId==='classless')await page.screenshot({path:folder+'/wolf-library.png'});
   result.live=await page.evaluate(async()=>{
    const g=window.progressionReview,{useAbility}=await import('/src/combat.js');
    const {createSaveState,migrateSaveState}=await import('/src/gameSave.js');
    const used=useAbility(3,g.player,g.world,g.log,performance.now()/1000,{combatAimX:1,combatAimY:0});
    const saved=createSaveState(g),restored=migrateSaveState(JSON.parse(JSON.stringify(saved)));
    return {used,pets:g.player.summons.length,known:restored.player.knownAbilities.includes('summonWolf'),slot:restored.player.loadout.abilitySlots[3],version:restored.player.saveVersion};
   });
   assert.ok(result.live.used&&result.live.pets===1&&result.live.known);assert.equal(result.live.slot,'summonWolf');assert.equal(result.live.version,13);
   report.classes.push(result);
  }
  // Production character/progression panels show independent Combat XP and the second affinity.
  report.progressionPanel=await page.evaluate(async()=>{
   const g=window.progressionReview;g.uiState.activeMainTab='skills';g.uiState.skillsSubtab='combat';
   const {renderUI}=await import('/src/ui.js');renderUI(g.player,[],g);return document.querySelector('.panel').innerText;
  });
  const panelText=report.progressionPanel.toLowerCase();assert.ok(panelText.includes('core attributes')&&panelText.includes('combat proficiencies')&&panelText.includes('summoning')&&panelText.includes('focus'),report.progressionPanel);
  await page.screenshot({path:folder+'/progression-panel.png'});
  await page.goto('http://127.0.0.1:8766/combat-overhaul-lab.html');await page.waitForFunction(()=>window.combatReview?.game.player);
  await page.locator('#refill').click();await page.locator('#wolf').click();await page.locator('#slot').selectOption('2');await page.locator('#demon').click();
  report.performance=await page.evaluate(async()=>{
   const g=window.combatReview.game,{useAbility,updateSummons,updateCombat,updateEnemies}=await import('/src/combat.js');
   g.paused=true;g.player.hp=g.player.maxHp=100000;g.player.spirit=g.player.maxSpirit=10000;g.world.enemies=[];
   for(let i=0;i<12;i++)g.dev.spawn(i%3?'melee':'ranged',380+i%4*45,240+Math.floor(i/4)*50);
   for(const e of g.world.enemies)e.hp=e.maxHp=100000;
   const now=performance.now()/1000,aim={combatAimX:1,combatAimY:0};useAbility(3,g.player,g.world,g.log,now,aim);useAbility(2,g.player,g.world,g.log,now,aim);
   for(const s of g.player.summons)s.hp=s.maxHp=100000; // Keep the benchmark population constant; not a balance simulation.
   const times=[];for(let i=1;i<=240;i++){
    const start=performance.now();updateCombat(g.player,g.world,aim,1/60,now+i/60,g.log);updateEnemies(1/60,g.player,g.world,g.log,now+i/60);updateSummons(1/60,g.player,g.world,g.log,now+i/60);window.combatReview.draw(now+i/60);
    for(const fx of g.world.effects)fx.age=(fx.age||0)+1/60;g.world.effects=g.world.effects.filter(fx=>fx.age<fx.ttl);if(i>20)times.push(performance.now()-start);
   }
   times.sort((a,b)=>a-b);window.combatReview.renderHud();return {enemies:g.world.enemies.length,summons:g.player.summons.map(s=>s.kind),samples:times.length,medianMs:times[Math.floor(times.length*.5)],p95Ms:times[Math.floor(times.length*.95)],maxMs:times.at(-1),effects:g.world.effects.length};
  });
  assert.ok(report.performance.summons.includes('wolf')&&report.performance.summons.includes('miniDemon'),JSON.stringify(report.performance));
  await page.screenshot({path:folder+'/companions.png',fullPage:true});
  await page.setViewportSize({width:800,height:700});await page.screenshot({path:folder+'/companions-compact.png',fullPage:true});
  fs.writeFileSync(folder+'/browser-results.json',JSON.stringify(report,null,2));
  console.log(JSON.stringify(report,null,2));assert.equal(report.errors.length,0,'Browser exceptions');
 }finally{await browser.close();}
})().catch(e=>{console.error(e);process.exitCode=1;});
