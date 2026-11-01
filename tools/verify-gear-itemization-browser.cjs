const {chromium}=require(process.env.RUNALIS_PLAYWRIGHT_MODULE||'../tmp/vampire-browser/node_modules/playwright');
const assert=require('node:assert/strict'),fs=require('node:fs');fs.mkdirSync('docs/gear-itemization',{recursive:true});
(async()=>{const browser=await chromium.launch({channel:'msedge',headless:true});try{
 const page=await browser.newPage({viewport:{width:1440,height:1000}}),errors=[];page.on('pageerror',e=>errors.push(e.message));
 await page.goto(process.env.RUNALIS_URL||'http://127.0.0.1:8772/art-lab.html');await page.addStyleTag({url:'/style.css'});await page.addStyleTag({url:'/lexicon.css'});
 await page.evaluate(async()=>{
  window.gearModules={...await import('/src/player.js'),...await import('/src/shopSystem.js'),...await import('/src/workshopService.js'),...await import('/src/equipmentProgressionSystem.js'),...await import('/src/gearItemization.js'),...await import('/src/panelInventory.js'),...await import('/src/gearRarity.js')};
  const m=gearModules,party=[];for(let slot=1;slot<=4;slot++){const p=m.createPlayer('Gear Review P'+slot);m.chooseClass(p,'oathkeeper');p.skillState.combat.level=100;Object.assign(p,{id:'review-'+slot,slot,combatLevel:100,x:300,y:300,gold:1000,inventory:[]});for(const rarity of Object.keys(m.GEAR_RARITIES))m.addItem(p,'roseReaper',1,{gearRarity:rarity,rarityRollVersion:1,itemLevel:100});party.push(p);}
  const {drawWorldDrops}=await import('/src/objectRenderer.js');
  for(const [rarity,grade]of Object.entries(m.GEAR_RARITIES)){
   const cv=document.createElement('canvas');cv.width=200;cv.height=200;const cx=cv.getContext('2d'),colors=[],fills=cx.fill.bind(cx);cx.fill=(...args)=>{colors.push(cx.fillStyle);fills(...args);};
   drawWorldDrops(cx,{drops:[{itemId:'roseReaper',rarity,x:100,y:100,name:'Rose Reaper',age:.2}]},{x:0,y:0});if(!colors.includes(grade.color))throw Error('Wrong ground-loot color '+rarity);
  }
  party[0].coop={players:party.slice(1)};
  const npc={id:'smith',kind:'npc',name:'Blacksmith',workshopService:'blacksmith',x:324,y:300,r:14},world={name:'Gear Review Forge',mode:'capital',width:80,height:64,tiles:Array.from({length:64},()=>Array.from({length:80},()=>({passable:true,biome:'grass'}))),objects:[npc],enemies:[],effects:[],drops:[]};
  const root={player:party[0],world,uiState:{inventorySubtab:'bag'},input:{},log(){},setUiOwner(p){this.uiOwner=p;}};window.gearReview={party,npc,root,world,games:party.map((p,i)=>i?{player:p,world,hostGame:root,uiState:{},input:{},log(){}}:root)};
 });
 let sales=0,deconstructions=0;
 for(let slot=0;slot<4;slot++){
  await page.evaluate(i=>gearModules.openMarketShop(gearReview.games[i]),slot);
  const before=await page.evaluate(()=>gearReview.party.map(p=>({gold:p.gold,gear:gearModules.gearBagCount(p)})));
  await page.locator('[data-market-gear-sell]').first().click();assert.deepEqual(await page.evaluate(()=>gearReview.party.map(p=>({gold:p.gold,gear:gearModules.gearBagCount(p)}))),before);
  await page.locator('[data-market-gear-sell]').first().focus();await page.evaluate(()=>gearModules.handleMarketShopControllerInput({confirmPressed:true}));
  const after=await page.evaluate(()=>gearReview.party.map(p=>({gold:p.gold,gear:gearModules.gearBagCount(p)})));
  for(let i=0;i<4;i++)if(i===slot){assert.equal(after[i].gear,before[i].gear-1);assert(after[i].gold>before[i].gold);}else assert.deepEqual(after[i],before[i]);sales++;
  if(slot===2)await page.screenshot({path:'docs/gear-itemization/merchant.png'});
  await page.locator('[data-market-close]').click();
  assert(await page.evaluate(i=>gearModules.openWorkshopService(gearReview.games[i],gearReview.npc,'all'),slot));await page.locator('[data-workshop-category="deconstruct"]').click();
  await page.locator('[data-workshop-row]').first().click();assert.match(await page.locator('.workshop-detail').innerText(),/Deconstruct into/);
  const beforeCount=await page.evaluate(i=>gearModules.gearBagCount(gearReview.party[i]),slot);await page.locator('[data-workshop-perform]').click();assert.equal(await page.evaluate(i=>gearModules.gearBagCount(gearReview.party[i]),slot),beforeCount);
  if(slot===2)await page.screenshot({path:'docs/gear-itemization/blacksmith.png'});
  await page.evaluate(()=>gearModules.handleWorkshopControllerInput({confirmPressed:true}));assert.equal(await page.evaluate(i=>gearModules.gearBagCount(gearReview.party[i]),slot),beforeCount-1);assert.match(await page.locator('[role="status"]').innerText(),/Deconstructed/);deconstructions++;
  await page.evaluate(i=>gearModules.closeWorkshopService(gearReview.games[i]),slot);
 }
 const inventory=await page.evaluate(()=>{
  const p=gearReview.party[0];p.inventory=[];for(const rarity of Object.keys(gearModules.GEAR_RARITIES))gearModules.addItem(p,'roseReaper',1,{gearRarity:rarity,rarityRollVersion:1,itemLevel:100});
  for(const child of document.body.children)child.style.display='none';let el=document.getElementById('inventory');if(!el){el=document.createElement('div');el.id='inventory';document.body.appendChild(el);}el.style.cssText='display:block;position:relative;margin:20px;padding:20px;background:#202127;color:white;min-height:700px';gearReview.root.uiState.inventorySubtab='equipment';gearModules.renderInventory(p,gearReview.root);
  const colors=[...el.querySelectorAll('.inventory-list-name')].map(e=>e.style.color);if(new Set(colors).size!==6)throw Error('Six rarity colors missing');if(!el.textContent.includes('Gear bag: 6 / 20'))throw Error('Capacity display missing');
  const html=el.innerHTML;for(let i=0;i<14;i++)gearModules.addItem(p,'oldKnife');const gold=p.gold;
  return {colors,count:gearModules.gearBagCount(p),gold};
 });assert.equal(inventory.count,20);await page.screenshot({path:'docs/gear-itemization/inventory.png'});
 await page.evaluate(()=>{document.getElementById('inventory').style.display='none';document.getElementById('marketShopOverlay').style.removeProperty('display');gearModules.openMarketShop(gearReview.root);});
 await page.locator('[data-market-category="gear"]').click();await page.locator('[data-market-offer="pilgrimsFocus"]').click();
 const full=await page.evaluate(()=>({gold:gearReview.party[0].gold,count:gearModules.gearBagCount(gearReview.party[0])}));assert(await page.locator('[data-market-buy="pilgrimsFocus"]').isDisabled());await page.locator('[data-market-buy="pilgrimsFocus"]').evaluate(e=>e.click());assert.deepEqual(await page.evaluate(()=>({gold:gearReview.party[0].gold,count:gearModules.gearBagCount(gearReview.party[0])})),full);
 await page.locator('[data-market-gear-sell]').first().focus();await page.evaluate(()=>{for(let i=0;i<19;i++)gearModules.handleMarketShopControllerInput({downPressed:true});});assert(await page.locator('[data-market-gear-sell]').last().evaluate(e=>document.activeElement===e));await page.locator('[data-market-close]').click();
 await page.setViewportSize({width:390,height:844});await page.evaluate(()=>gearModules.openWorkshopService(gearReview.root,gearReview.npc,'all'));await page.locator('[data-workshop-category="deconstruct"]').click();await page.screenshot({path:'docs/gear-itemization/mobile-blacksmith.png'});
 const fits=await page.locator('.workshop-panel').evaluate(e=>e.getBoundingClientRect().width<=innerWidth);assert(fits);
 await page.locator('[data-workshop-row]').first().focus();await page.evaluate(()=>{for(let i=0;i<19;i++)gearModules.handleWorkshopControllerInput({downPressed:true});});assert(await page.locator('[data-workshop-row]').last().evaluate(e=>document.activeElement===e));
 assert.deepEqual(errors,[]);const report={sales,deconstructions,colors:inventory.colors,fullBagPurchaseProtected:true,mobileFits:fits,errors};fs.writeFileSync('docs/gear-itemization/browser-verification.json',JSON.stringify(report,null,2));console.log('PASS '+JSON.stringify(report));
}finally{await browser.close();}})().catch(e=>{console.error(e);process.exitCode=1;});
