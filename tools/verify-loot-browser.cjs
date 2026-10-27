const {chromium}=require(process.env.RUNALIS_NODE_MODULES+'/playwright');
const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path');
const root=path.resolve('docs/loot-overhaul');fs.mkdirSync(root,{recursive:true});
(async()=>{
 const browser=await chromium.launch({channel:'msedge',headless:true}),errors=[],failed=[],report={};
 try{
 const page=await browser.newPage({viewport:{width:1440,height:1100}});
 page.on('pageerror',e=>errors.push(e.message));page.on('response',r=>{if(r.status()>=400)failed.push(r.url());});
 await page.goto('http://127.0.0.1:8768/loot-overhaul-lab.html');await page.waitForFunction(()=>window.lootReview&&lootReview.spriteArtStatus().every(a=>a.ready||a.failed));await page.waitForTimeout(400);
 assert.deepEqual(await page.evaluate(()=>lootReview.spriteArtStatus().filter(a=>a.failed)),[]);
 await page.locator('#review').screenshot({path:path.join(root,'mythical-pixel-art.png')});
 report.art=await page.evaluate(async()=>{
 const {MYTHICAL_ITEMS}=await import('/src/mythicalEquipmentData.js'),{drawHumanActor}=await import('/src/humanRenderer.js'),{getGearVisualProfile}=await import('/src/gearVisualStyle.js'),{equipmentIconMarkup}=await import('/src/artIcons.js'),{factionArtCacheStatus}=await import('/src/factionEquipmentArt.js');
 const c=document.createElement('canvas');c.width=160;c.height=180;const ctx=c.getContext('2d',{willReadFrequently:true}),original=ctx.drawImage.bind(ctx);let renders=0,invalid=0,draws=0,blank=0;
 ctx.drawImage=(img,...a)=>{draws++;if(a.length===8&&(a[0]<0||a[1]<0||a[0]+a[2]>img.width+.001||a[1]+a[3]>img.height+.001))invalid++;return original(img,...a);};
 const signatures=[];
 for(const item of Object.values(MYTHICAL_ITEMS)){
 assertIcon(item);for(const bodyType of ['male','female'])for(const [dirX,dirY] of [[1,0],[-1,0],[0,1],[0,-1]])for(const moving of [false,true])for(const walkTime of [0,.4,.8,1.2]){
 ctx.clearRect(0,0,160,180);drawHumanActor(ctx,{x:80,y:140,hp:100,bodyType,dirX,dirY,isMoving:moving,walkTime,skin:'#cda47f',hair:'#514234',equipment:{[item.slot]:item.id}},{x:0,y:0});const pixels=ctx.getImageData(0,0,160,180).data;if(!pixels.some(v=>v))blank++;renders++;
 }
 signatures.push(equipmentIconMarkup(item,getGearVisualProfile(item.id,item)));
 }
 function assertIcon(item){if(!equipmentIconMarkup(item,getGearVisualProfile(item.id,item)))throw Error('Missing gear icon '+item.id);}
 const warm=factionArtCacheStatus();for(let i=0;i<30;i++)lootReview.draw();return {items:15,renders,draws,invalid,blank,distinctIcons:new Set(signatures).size,warm,after:factionArtCacheStatus()};
 });assert.equal(report.art.invalid,0);assert.equal(report.art.blank,0);assert.equal(report.art.distinctIcons,15);assert.deepEqual(report.art.warm,report.art.after);
 await page.selectOption('#set','demonseed');await page.selectOption('#tier','1');
 const initial=await page.evaluate(()=>({gold:lootReview.player.gold,tier:lootReview.getEquipmentTier(lootReview.player,'weapon')}));assert.equal(initial.tier,1);
 assert.equal(await page.locator('[data-equipment-action="upgrade"]').count(),0);
 await page.evaluate(async()=>{const {createCapitalHubWorld}=await import('/src/hubSystem.js'),{openWorkshopService}=await import('/src/workshopService.js');const g=lootReview.game;g.world=createCapitalHubWorld({skipPublishedOverride:true});const n=g.world.objects.find(o=>o.workshopService==='blacksmith');Object.assign(g.player,{x:n.x,y:n.y+32});openWorkshopService(g,n,'weapons');});
 await page.locator('[data-workshop-row]').filter({hasText:'Equipped'}).click();await page.getByRole('button',{name:'Review Upgrade',exact:true}).click();assert.equal(await page.evaluate(()=>lootReview.player.gold),initial.gold);await page.getByRole('button',{name:'Confirm Upgrade',exact:true}).waitFor();
 await page.locator('#workshopServiceOverlay').screenshot({path:path.join(root,'upgrade-confirmation.png')});
 await page.getByRole('button',{name:'Confirm Upgrade',exact:true}).click();assert.equal(await page.evaluate(()=>lootReview.getEquipmentTier(lootReview.player,'weapon')),2);assert.equal(await page.evaluate(()=>lootReview.player.gold),initial.gold-20);report.upgradeConfirmation=true;
 await page.locator('[data-workshop-close]').click();await page.evaluate(()=>lootReview.renderPanel());await page.locator('[data-equipment-action="unequip"]').click();assert.equal(await page.evaluate(()=>lootReview.player.equipment.weapon),null);assert.ok(await page.evaluate(()=>lootReview.player.inventory.some(e=>e.id==='demonseedScythe'&&e.upgradeTier===2)));report.upgradedUnequip=true;
 await page.selectOption('#set','mixed');await page.locator('[data-equipment-slot="chest"]').first().click();assert.match(await page.locator('#inventory').innerText(),/Drowned Convergence.*3\/3 equipped/s);await page.locator('#inventory').screenshot({path:path.join(root,'mixed-set-inventory.png')});report.mixedSetUi=true;
 await page.selectOption('#tier','20');assert.equal(await page.locator('[data-equipment-action="upgrade"]').count(),0);assert.match(await page.locator('#inventory').innerText(),/Tier 20\/20/);report.tierCapUi=true;
 report.market=await page.evaluate(async()=>{const {openMarketShop}=await import('/src/shopSystem.js');openMarketShop(lootReview.game);const overlay=document.querySelector('#marketShopOverlay');const {ITEMS}=await import('/src/data.js');return {commissions:[...overlay.querySelectorAll('[data-market-offer]')].filter(e=>ITEMS[e.dataset.marketOffer]?.rarity==='mythic').length,text:overlay.innerText};});assert.equal(report.market.commissions,5);
 await page.locator('#marketShopOverlay').screenshot({path:path.join(root,'mythical-merchant.png')});
 const purchaseBefore=await page.evaluate(()=>({gold:lootReview.player.gold,count:lootReview.player.inventory.length}));await page.locator('[data-market-offer="pilgrimVigilTrinket"]').click();await page.locator('[data-market-buy="pilgrimVigilTrinket"]').click();const purchase=await page.evaluate(()=>({gold:lootReview.player.gold,item:lootReview.player.inventory.findLast(e=>e.id==='pilgrimVigilTrinket')}));assert.equal(purchase.gold,purchaseBefore.gold-1250);assert.equal(purchase.item.upgradeTier,1);assert.ok(purchase.item.instanceId);report.merchantPurchase=true;
 const smoke=await browser.newPage({viewport:{width:1280,height:720}});smoke.on('pageerror',e=>errors.push(e.message));smoke.on('response',r=>{if(r.status()>=400)failed.push(r.url());});await smoke.goto('http://127.0.0.1:8768/');
 await require('./browser-game-smoke.cjs')(smoke);await smoke.waitForTimeout(600);await smoke.screenshot({path:path.join(root,'live-game.png')});report.gameLaunch=true;
 report.errors=errors;report.failedRequests=failed;assert.deepEqual(errors,[]);assert.deepEqual(failed,[]);delete report.market.text;report.pass=true;fs.writeFileSync(path.join(root,'browser-verification.json'),JSON.stringify(report,null,2));console.log(JSON.stringify(report,null,2));
 }finally{await browser.close();}
})().catch(e=>{console.error(e);process.exitCode=1});
