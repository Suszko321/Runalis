const {chromium}=require('C:/Users/austi/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright');
const fs=require('fs');const assert=require('assert/strict');
(async()=>{
const browser=await chromium.launch({channel:'msedge',headless:true});const page=await browser.newPage({viewport:{width:1920,height:1080}});const errors=[],results=[];
page.on('pageerror',e=>errors.push(e.message));page.on('response',r=>{if(r.status()>=400)errors.push(r.status()+' '+r.url())});
await page.route('**/src/main.js*',r=>r.fulfill({contentType:'text/javascript',body:''}));await page.goto('http://127.0.0.1:8766/');
await page.evaluate(async()=>{
 const ui=await import('/src/ui.js'),p=await import('/src/player.js'),{createWorld}=await import('/src/world.js'),{ITEMS}=await import('/src/data.js');
 const game={player:p.createPlayer('Grave'),world:createWorld(),camera:{x:0,y:0},logLines:[],log(t){game.logLines.push(t)},save(){},floatingTexts:[],keys:{},input:{},canvas:document.querySelector('#game')};
 Object.assign(game.player,{classId:'gravecaller',className:'Gravecaller',classSkill:'spirit',classChosen:true,gravecallerPath:'commander',spiritAwakened:true,act1OpeningPending:false,gold:10000});
 for(const [id,v] of Object.entries(ITEMS)){if(v.slot)p.addItem(game.player,id,1);else if(['material','reagent','tool'].includes(v.type))p.addItem(game.player,id,100)}
 p.addItem(game.player,'fieldRations',20);
 document.querySelector('#mainMenu').classList.remove('active');document.querySelector('#app').classList.add('active');
 ui.initUI(game);game.renderOwnedUI=()=>ui.renderUI(game.player,game.logLines,game);game.renderOwnedUI();window.fixture={game,ui,p};
 });await page.evaluate(()=>document.fonts.ready);
async function shot(name){await page.waitForTimeout(100);await page.screenshot({path:`docs/ui-overhaul/${name}.png`});}
async function tab(name){await page.locator(`[data-tab="${name}"]`).evaluate(e=>e.click());}
await tab('inventory');await shot('equipment-final');
const subtabs=await page.locator('#inventory .subtab').evaluateAll(es=>es.map(e=>e.dataset.inventorySubtab));
for(const sub of subtabs){await page.locator(`#inventory .subtab[data-inventory-subtab="${sub}"]`).click();await shot('inventory-'+sub);results.push('Inventory '+sub)}
await page.locator('#inventory .subtab[data-inventory-subtab="equipment"]').click();
// Real DOM handlers mutate fixture inventory. No player profile storage is used.
const first=await page.locator('[data-equipment-action="equip"]').first().getAttribute('data-inventory-item-index');
const item=await page.evaluate(i=>fixture.game.player.inventory[Number(i)].id,first);
await page.locator('[data-equipment-action="equip"]').first().click();
assert(await page.evaluate(id=>Object.values(fixture.game.player.equipment).includes(id),item));results.push('Equip via mouse action');
const before=await page.locator('.inventory-list-row').first().textContent();await page.locator('[data-inventory-page="1"]').click();assert.notEqual(await page.locator('.inventory-list-row').first().textContent(),before);results.push('Inventory pagination');
await page.locator('.inventory-list-row').first().focus();assert(await page.locator('.inventory-list-row').first().getAttribute('aria-selected')==='true');results.push('Keyboard item focus/selection');
await page.evaluate(()=>fixture.ui.handleGameUiControllerInput(fixture.game,{connected:true,downPressed:true}));assert(await page.locator('.game-ui-controller-focus').count()>0);results.push('Controller navigation dispatch');
await page.evaluate(async()=>{
 const {game,p}=fixture,c=await import('/src/craftingSystem.js'),{ITEMS,getAllRecipes}=await import('/src/data.js');
 const gold=game.player.gold;if(c.upgradeEquippedSlot(game.player,'weapon',game)||game.player.gold!==gold)throw Error('Remote upgrade bypass');
 const index=game.player.inventory.findIndex(e=>ITEMS[e.id]?.rarity==='common'&&ITEMS[e.id]?.slot&&!Object.values(game.player.equipment).includes(e.id));
 const id=game.player.inventory[index].id,n=p.countItem(game.player,id);if(!c.salvageInventoryItem(game.player,index,game)||p.countItem(game.player,id)!==n-1)throw Error('Salvage failed');
 p.addItem(game.player,'rawSunfish',2);const recipe=getAllRecipes().find(r=>c.getRecipeCraftStatus(game.player,r).ok);if(!recipe||c.craftRecipe(game.player,recipe.id,game))throw Error('Remote crafting bypass');
 game.player.skillTree.bloodlineBonusPoints=10;game.renderOwnedUI();
});results.push('Remote upgrade/crafting blocked; portable salvage still consumes item');
await tab('skills');await page.locator('button[data-skills-subtab="trees"]').click();const node=await page.locator('[data-skill-tree-node]:not(:disabled)').first().getAttribute('data-skill-tree-node');await page.locator('[data-skill-tree-node]:not(:disabled)').first().click();assert(await page.evaluate(id=>fixture.game.player.skillTree.spent[id]>0,node));results.push('Skill purchase via DOM action');
for(const sub of ['trees','abilities','combat','gathering','production','world']){await page.locator(`button[data-skills-subtab="${sub}"]`).click();await shot('skills-'+sub);results.push('Skills '+sub)}
await tab('character');await shot('character-final');await page.locator('button[data-character-subtab="sheet"]').click();await shot('character-sheet');
await tab('quests');await page.locator('[data-select-quest-id]').first().click();await shot('quests-final');results.push('Quest selection/tracking handler');
await page.evaluate(async()=>{const {game}=fixture;const {discoverStone}=await import('/src/worldExploration.js');const [a,b]=game.world.navStones;Object.assign(game.player,{x:a.x,y:a.y});discoverStone(game,a);Object.assign(game.player,{x:b.x,y:b.y});discoverStone(game,b);Object.assign(game.player,{x:a.x,y:a.y});game.renderOwnedUI();window.travelTest={id:b.id,x:b.x,y:b.y};});await tab('map');await shot('map-final');await page.locator('[data-nav-stone]').last().click();assert(await page.evaluate(()=>fixture.game.player.x===travelTest.x&&fixture.game.player.y===travelTest.y));results.push('Nav Stone map button travels to discovered destination');
await tab('inventory');await page.locator('#inventory .subtab[data-inventory-subtab="equipment"]').click();
for(const [width,height] of [[1366,768],[2560,1440],[3440,1440],[800,600]]){await page.setViewportSize({width,height});await page.evaluate(()=>fixture.game.renderOwnedUI());await shot(`equipment-${width}`);assert(await page.locator('#inventory').evaluate(e=>e.scrollWidth<=e.clientWidth+2));results.push({resolution:`${width}x${height}`,layout:await page.locator('#inventory').evaluate(e=>({width:e.clientWidth,scrollWidth:e.scrollWidth,height:e.clientHeight,scrollHeight:e.scrollHeight}))})}
await page.setViewportSize({width:1920,height:1080});
await page.evaluate(async()=>{fixture.ui.closeGameMenu(fixture.game);const m=await import('/src/shopSystem.js');m.openMarketShop(fixture.game)});await shot('vendor');
const purchase=await page.evaluate(()=>({gold:fixture.game.player.gold,qty:fixture.p.countItem(fixture.game.player,'fieldRations')}));
await page.locator('[data-market-category="food"]').click();await page.locator('[data-market-offer="fieldRations"]').click();await page.locator('[data-market-buy="fieldRations"]').click();
assert(await page.evaluate(n=>fixture.p.countItem(fixture.game.player,'fieldRations')===n+10,purchase.qty));assert(await page.evaluate(g=>fixture.game.player.gold===g-42,purchase.gold));results.push('Vendor purchase and quantity');
await page.locator('[data-market-close]').click();
await page.evaluate(async()=>{(await import('/src/characterCreator.js')).openCharacterCreator(fixture.game)});await shot('creator');await page.evaluate(async()=>{(await import('/src/characterCreator.js')).closeCharacterCreator()});
await page.evaluate(async()=>{(await import('/src/survivalSkills.js')).startFishingMiniGame(fixture.game,{x:0,y:0})});await shot('fishing');
await page.evaluate(async()=>{await import('/src/pauseMenu.js').then(m=>{m.ensurePauseOverlay(fixture.game);m.setPauseActive(true)})});await shot('pause');
await page.evaluate(async()=>{(await import('/src/pauseMenu.js')).setPauseActive(false);document.querySelector('#fishingMiniGameOverlay')?.classList.remove('active');const {drawDialogueUI,getDialoguePointerTarget}=await import('/src/dialogueUi.js');const {createDialogueRuntimeState,DIALOGUE_PHASES}=await import('/src/dialogueRuntime.js');const canvas=document.querySelector('#game');canvas.width=1920;canvas.height=1080;const ctx=canvas.getContext('2d');const state=createDialogueRuntimeState();Object.assign(state,{active:true,phase:DIALOGUE_PHASES.AWAITING_CHOICE,openingTimer:1,choiceAppearTimer:1,speakerName:'Warden Mael',visibleText:'The roads remember.',options:[{text:'Continue',id:'continue'},{text:'Leave',id:'leave'}]});drawDialogueUI(ctx,state);window.dialogueReview={state,drawDialogueUI,getDialoguePointerTarget,ctx};});await page.waitForTimeout(200);await page.evaluate(()=>dialogueReview.drawDialogueUI(dialogueReview.ctx,dialogueReview.state));await shot('dialogue');
const hit=await page.evaluate(()=>{const {getDialoguePointerTarget,ctx,state}=dialogueReview;for(let y=600;y<1060;y+=5){const t=getDialoguePointerTarget(ctx,state,{x:600,y});if(t?.type==='choice')return t.index}return null});assert.equal(hit,0);results.push('Creator, fishing, pause, canvas dialogue rendered; dialogue choice hit region verified');

fs.writeFileSync('docs/ui-overhaul/regression-results.json',JSON.stringify({errors,results},null,2));console.log(JSON.stringify({errors,results},null,2));await browser.close();if(errors.length)process.exitCode=1;
})().catch(e=>{console.error(e);process.exit(1)});
