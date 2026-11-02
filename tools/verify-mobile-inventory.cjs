const {chromium}=require(process.env.RUNALIS_NODE_MODULES+'/playwright');
const assert=require('node:assert/strict'),fs=require('node:fs');
(async()=>{const browser=await chromium.launch({channel:'msedge',headless:true}),out='docs/mobile-inventory',errors=[];fs.mkdirSync(out,{recursive:true});try{
 const page=await browser.newPage({viewport:{width:1280,height:900},hasTouch:true});page.on('pageerror',e=>errors.push(e.message));
 await page.route('**/src/main.js*',r=>r.fulfill({contentType:'text/javascript',body:fs.readFileSync('src/main.js','utf8')+'\nwindow.inventoryReviewGame=()=>currentGame;'}));
 await require('./browser-game-smoke.cjs')(page,process.env.RUNALIS_URL||'http://127.0.0.1:8766');await page.waitForFunction(()=>inventoryReviewGame()?.started);
 await page.evaluate(async()=>{
  const m={...await import('/src/player.js'),...await import('/src/equipmentProgressionSystem.js'),...await import('/src/panelInventory.js'),...await import('/src/gearRarity.js')},g=inventoryReviewGame(),p=g.player;window.inventoryReviewModules=m;
  p.inventory=[];p.equipment={};p.equippedGear={};p.combatLevel=100;p.skillState.combat.level=100;
  for(const id of ['oldKnife','graveboundHelm','patchedRoadLeathers','graveboundGreaves','crackedVowShield']){m.addItem(p,id,1,{gearRarity:'rare',rarityRollVersion:1,itemLevel:100});assertEquip(m.equipGearEntry(p,p.inventory.length-1));}
  function assertEquip(ok){if(!ok)throw Error('Fixture equip');}
  for(let i=0;i<20;i++)m.addItem(p,['oldKnife','graveboundHelm','patchedRoadLeathers','graveboundGreaves','crackedVowShield'][i%5],1,{gearRarity:i<5?'primordial':i<10?'common':'rare',rarityRollVersion:1,itemLevel:100});
  Object.assign(g.uiState,{inventorySubtab:'equipment',equipmentFocusRegion:'inventory',selectedInventoryBagIndexBySubtab:{equipment:0}});
 });
 await page.evaluate(()=>document.querySelector('.tabs [data-tab="inventory"]').click());await page.screenshot({path:out+'/opened.png'});await page.waitForSelector('[data-equipment-workstation]');
 const results=[];
 for(const [width,height]of [[390,844],[360,640],[320,568],[844,390],[667,375],[1024,768],[1440,1000]]){
  await page.setViewportSize({width,height});const portrait=page.locator('[data-mobile-portrait]');if(await portrait.isVisible())await portrait.click();await page.locator('.equipment-inventory-list [data-inventory-item-index="0"]').click();
  const layout=await page.evaluate(()=>{
   const root=document.querySelector('#inventory'),work=root.querySelector('.equipment-workstation'),panes=[...work.children].map(e=>{const b=e.getBoundingClientRect();return {x:b.x,y:b.y,right:b.right,bottom:b.bottom,width:b.width};}),r=root.getBoundingClientRect();
   return {panes,classes:root.className,style:root.getAttribute('style'),work:{display:getComputedStyle(work).display,columns:getComputedStyle(work).gridTemplateColumns},root:{x:r.x,y:r.y,right:r.right,bottom:r.bottom},rootOverflow:root.scrollHeight-root.clientHeight,horizontalOverflow:root.scrollWidth-root.clientWidth,rows:root.querySelectorAll('.equipment-inventory-list .inventory-list-row').length};
  });
  assert.equal(layout.rows,20);assert(layout.panes[0].right<=layout.panes[1].x+2);assert(layout.panes[1].right<=layout.panes[2].x+2);assert(Math.abs(layout.panes[0].y-layout.panes[2].y)<2);
  assert(layout.root.x>=0&&layout.root.right<=width+1&&layout.root.bottom<=height+1,JSON.stringify({width,height,layout}));assert(layout.horizontalOverflow<=1);
  if(width<=1100||height<=600)assert(layout.rootOverflow<=1,JSON.stringify({width,height,layout}));
  for(const action of ['equip','toggle-lock']){const b=await page.locator(`.inventory-primary-actions [data-equipment-action="${action}"]`).boundingBox();assert(b&&b.y>=layout.root.y&&b.y+b.height<=Math.min(height,layout.panes[2].bottom)+1);assert(b.height>=44);}
  const verdict=page.locator('[data-comparison]');assert.equal(await verdict.getAttribute('data-comparison'),'better');assert.equal(await verdict.evaluate(e=>getComputedStyle(e).color),'rgb(54, 88, 41)');
  const indicator=await verdict.boundingBox();assert(indicator&&indicator.y+indicator.height<=layout.panes[2].bottom+1,'Quick comparison must be on screen');
  await page.screenshot({path:`${out}/inventory-${width}x${height}.png`});results.push({width,height,threeColumns:true,actionsVisible:true,outerScroll:false});
 }
 // Same base ID, different rarities: comparison must use each actual copy.
 await page.setViewportSize({width:390,height:844});if(await page.locator('[data-mobile-portrait]').isVisible())await page.locator('[data-mobile-portrait]').click();await page.locator('[data-inventory-item-index="5"].inventory-list-row').click();assert.equal(await page.locator('[data-comparison]').getAttribute('data-comparison'),'worse');assert.equal(await page.locator('[data-comparison]').evaluate(e=>getComputedStyle(e).color),'rgb(148, 39, 42)');
 await page.locator('[data-inventory-item-index="10"].inventory-list-row').click();assert.equal(await page.locator('[data-comparison]').getAttribute('data-comparison'),'equal');
 await page.locator('[data-inventory-item-index="0"].inventory-list-row').click();await page.locator('.inventory-primary-actions [data-equipment-action="toggle-lock"]').click();assert.equal(await page.locator('.inventory-primary-actions [data-equipment-action="toggle-lock"]').textContent(),'Unlock Item');
 // Hovering another row must not replace the last selected piece.
 await page.locator('[data-inventory-item-index="1"].inventory-list-row').hover();assert.equal(await page.locator('.inventory-primary-actions [data-equipment-action="equip"]').getAttribute('data-inventory-item-index'),'0');
 await page.locator('.inventory-primary-actions [data-equipment-action="equip"]').click();
 await page.locator('.equipment-slot-button[data-equipment-slot="weapon"]').click();assert.equal(await page.locator('.inventory-primary-actions [data-equipment-action="toggle-lock"]').textContent(),'Unlock Item');assert(await page.locator('.inventory-primary-actions [data-equipment-action="unequip"]').isVisible());
 await page.locator('.inventory-extended-details summary').click();assert(await page.locator('.equipment-upgrade-cost').isVisible());await page.locator('.inventory-extended-details summary').click();
 await page.locator('.inventory-primary-actions [data-equipment-action="unequip"]').click();assert(await page.evaluate(()=>!!inventoryReviewGame().player.equipment.weapon),'Full bag must still block unequip');
 await page.evaluate(()=>inventoryReviewGame().player.inventory.pop());await page.locator('.inventory-primary-actions [data-equipment-action="unequip"]').click();assert(await page.evaluate(()=>!inventoryReviewGame().player.equipment.weapon));
 // Empty slot and upgraded armour/trinket comparisons are independent of rarity.
 await page.evaluate(()=>{const g=inventoryReviewGame();g.uiState.equipmentFocusRegion='inventory';g.uiState.selectedInventoryBagIndexBySubtab.equipment=g.player.inventory.findIndex(e=>e.id==='oldKnife');inventoryReviewModules.renderInventory(g.player,g);inventoryReviewModules.bindInventoryButtons(g.player,g,()=>{});});assert.equal(await page.locator('[data-comparison]').getAttribute('data-comparison'),'empty');
 await page.evaluate(()=>{const g=inventoryReviewGame(),m=inventoryReviewModules,p=g.player;const entry=p.inventory.find(e=>e.id==='graveboundHelm'&&e.gearRarity==='rare');entry.upgradeTier=20;g.uiState.selectedInventoryBagIndexBySubtab.equipment=p.inventory.indexOf(entry);m.renderInventory(p,g);m.bindInventoryButtons(p,g,()=>{});});assert.equal(await page.locator('[data-comparison]').getAttribute('data-comparison'),'better');
 // Bottom entries stay reachable inside their own list without moving actions.
 await page.locator('.equipment-inventory-list .inventory-list-row').last().click();assert(await page.locator('.inventory-primary-actions [data-equipment-action="equip"]').isVisible());
 await page.evaluate(()=>{const g=inventoryReviewGame(),p=g.player,m=inventoryReviewModules;p.inventory.splice(-2);m.addItem(p,'starweaverChest',1,{gearRarity:'legendary',rarityRollVersion:1,itemLevel:100});m.equipGearEntry(p,p.inventory.length-1);m.addItem(p,'sunwardRegentChest',1,{gearRarity:'legendary',rarityRollVersion:1,itemLevel:100});g.uiState.equipmentFocusRegion='inventory';g.uiState.selectedInventoryBagIndexBySubtab.equipment=p.inventory.length-1;m.renderInventory(p,g);m.bindInventoryButtons(p,g,()=>{});});assert.equal(await page.locator('[data-comparison]').getAttribute('data-comparison'),'mixed');assert(await page.locator('.equipment-comparison-block .good-text').count()>0);assert(await page.locator('.equipment-comparison-block .bad-text').count()>0);
 // The same layout is bounded inside a local player's isolated menu document.
 await page.evaluate(()=>{const g=inventoryReviewGame(),m=inventoryReviewModules,p=m.createPlayer('Inventory P2');m.chooseClass(p,'oathkeeper');Object.assign(p,{slot:2,active:true,x:g.player.x,y:g.player.y});g.player.coop={...g.player.coop,players:[p]};g.localMenus.open(p);});
 const local=page.frameLocator('.local-player-menu[data-owner-slot="2"]');await local.locator('[data-tab="inventory"]').click();await local.locator('.equipment-workstation').waitFor();const localLayout=await local.locator('.equipment-workstation > section').evaluateAll(nodes=>nodes.map(n=>{const r=n.getBoundingClientRect();return {x:r.x,right:r.right,y:r.y};}));assert(localLayout[0].right<=localLayout[1].x+2&&localLayout[1].right<=localLayout[2].x+2);await local.locator('#localMenuClose').click();
 // Verify mouse/keyboard desktop still uses all three columns.
 const desktop=await browser.newPage({viewport:{width:1440,height:1000},hasTouch:false});desktop.on('pageerror',e=>errors.push(e.message));await require('./browser-game-smoke.cjs')(desktop,process.env.RUNALIS_URL||'http://127.0.0.1:8766');await desktop.evaluate(()=>document.querySelector('.tabs [data-tab="inventory"]').click());await desktop.waitForSelector('.equipment-workstation');const desktopPanes=await desktop.locator('.equipment-workstation > section').evaluateAll(nodes=>nodes.map(n=>{const r=n.getBoundingClientRect();return {x:r.x,right:r.right,y:r.y};}));assert(desktopPanes[0].right<=desktopPanes[1].x+2&&desktopPanes[1].right<=desktopPanes[2].x+2);await desktop.screenshot({path:out+'/desktop.png'});
 assert.deepEqual(errors,[]);console.log('PASS',JSON.stringify({layouts:results,comparisonRarity:true,comparisonUpgrade:true,mixedStats:true,equalAndEmpty:true,lockEquipUnequip:true,lastClickRetained:true,expandedDetails:true,fullBagReachable:true,localPlayerDocument:true,mouseDesktop:true,noPageErrors:true}));
}finally{await browser.close();}})().catch(e=>{console.error(e);process.exitCode=1;});

