const {chromium,webkit}=require(process.env.RUNALIS_PLAYWRIGHT_MODULE||'../tmp/vampire-browser/node_modules/playwright');
const assert=require('node:assert/strict'),fs=require('node:fs'),out='docs/gear-ascension';fs.mkdirSync(out,{recursive:true});
(async()=>{for(const [name,type,launch]of [['chromium',chromium,{channel:'msedge',headless:true}],['webkit',webkit,{headless:true}]]){
 const browser=await type.launch(launch);try{for(const viewport of [{width:1440,height:1000},{width:390,height:844}]){
  const page=await browser.newPage({viewport}),errors=[];page.on('pageerror',e=>errors.push(e.message));await page.goto((process.env.RUNALIS_URL||'http://127.0.0.1:8772')+'/art-lab.html');
  await page.evaluate(async()=>{
   window.ascend={...await import('/src/player.js'),...await import('/src/equipmentProgressionSystem.js'),...await import('/src/workshopService.js'),...await import('/src/gearRarity.js')};const m=ascend;
   const party=[];for(let slot=1;slot<=4;slot++){const p=m.createPlayer('Ascend P'+slot);m.chooseClass(p,'oathkeeper');p.skillState.combat.level=100;Object.assign(p,{combatLevel:100,slot,playerNumber:slot,x:300,y:300,gold:1e9,inventory:[]});m.addItem(p,'oldKnife',1,{gearRarity:'common',rarityRollVersion:1});p.inventory[0].upgradeTier=20;party.push(p);}
   party[0].coop={enabled:true,players:party.slice(1)};const npc={id:'smith',kind:'npc',name:'Blacksmith',workshopService:'blacksmith',x:324,y:300,r:14};const world={name:'Ascension Forge',mode:'capital',width:80,height:64,tiles:Array.from({length:64},()=>Array.from({length:80},()=>({passable:true,biome:'grass'}))),objects:[npc],enemies:[],effects:[]};
   const root={player:party[0],world,log(){},input:{},uiState:{}};Object.assign(ascend,{party,npc,root,games:party.map((p,i)=>i?{player:p,world,hostGame:root,input:{},uiState:{},log(){}}:root)});
   ascend.fund=(p,q,omit)=>{for(const [id,n]of q.cost.materials)if(id!==omit)m.addItem(p,id,n+500);};
  });
  for(let slot=0;slot<4;slot++){
   const before=await page.evaluate(i=>{const m=ascend,p=m.party[i],q=m.makeOwnedGearUpgradeQuote(p,p.inventory[0].instanceId);m.fund(p,q);if(!m.openWorkshopService(m.games[i],m.npc,'weapons'))throw Error('Cannot open forge');return {gold:p.gold,id:p.inventory[0].instanceId,cost:q.cost.gold};},slot);
   assert.match(await page.locator('.workshop-detail').innerText(),/After · Uncommon \+1/);await page.getByRole('button',{name:'Review Ascension',exact:true}).click();assert.equal(await page.evaluate(i=>ascend.party[i].gold,slot),before.gold);
   await page.getByRole('button',{name:'Confirm Ascension',exact:true}).click();const after=await page.evaluate(i=>{const p=ascend.party[i],e=p.inventory.find(e=>e.id==='oldKnife');return {gold:p.gold,id:e.instanceId,rarity:e.gearRarity,tier:e.upgradeTier,ascensions:e.rarityAscensions};},slot);
   assert.deepEqual(after,{gold:before.gold-before.cost,id:before.id,rarity:'uncommon',tier:1,ascensions:1});await page.evaluate(()=>ascend.closeWorkshopService(ascend.root));
  }
  await page.evaluate(()=>{const m=ascend,p=m.party[0],e=p.inventory.find(e=>e.id==='oldKnife');e.upgradeTier=20;const q=m.makeOwnedGearUpgradeQuote(p,e.instanceId);m.fund(p,q,'bossCore');p.inventory=p.inventory.filter(e=>e.id!=='bossCore');m.openWorkshopService(m.root,m.npc,'weapons');});
  assert.match(await page.locator('.workshop-detail').innerText(),/Boss Core/);assert(await page.getByRole('button',{name:'Review Ascension',exact:true}).isDisabled());await page.screenshot({path:`${out}/${name}-${viewport.width}-cores.png`});
  await page.evaluate(()=>{const m=ascend,p=m.party[0],e=p.inventory.find(e=>e.id==='oldKnife');m.fund(p,m.makeOwnedGearUpgradeQuote(p,e.instanceId));});await page.locator('[data-workshop-row]').first().click();
  await page.evaluate(()=>ascend.handleWorkshopControllerInput({confirmPressed:true}));await page.getByRole('button',{name:'Confirm Ascension',exact:true}).waitFor();await page.evaluate(()=>ascend.handleWorkshopControllerInput({confirmPressed:true}));assert.equal(await page.evaluate(()=>ascend.party[0].inventory.find(e=>e.id==='oldKnife').gearRarity),'rare');
  await page.evaluate(()=>{const m=ascend,p=m.party[0],e=p.inventory.find(e=>e.id==='oldKnife');e.gearRarity='legendary';e.upgradeTier=20;p.combatLevel=49;p.skillState.combat.level=49;});await page.locator('[data-workshop-row]').first().click();assert.match(await page.locator('.workshop-detail').innerText(),/Combat Level 50/);assert(await page.getByRole('button',{name:'Review Ascension',exact:true}).isDisabled());
  await page.evaluate(()=>{const p=ascend.party[0],e=p.inventory.find(e=>e.id==='oldKnife');e.gearRarity='primordial';e.upgradeTier=20;e.rarityAscensions=5;});await page.locator('[data-workshop-row]').first().click();assert.match(await page.locator('.workshop-detail').innerText(),/Maximum · Primordial \+20/);assert.equal(await page.locator('[data-workshop-perform]').count(),0);
  assert.deepEqual(errors,[]);await page.close();
 }}finally{await browser.close();}
}console.log('PASS Chromium/WebKit desktop/mobile: all four owners review/commit Common20→Uncommon1, Rare entry needs cores, controller confirmation, level50 gate and Primordial20 cap');})().catch(e=>{console.error(e);process.exitCode=1;});
