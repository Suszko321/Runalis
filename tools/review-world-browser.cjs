const {chromium}=require(process.env.RUNALIS_NODE_MODULES+'/playwright');
const fs=require('node:fs');
(async()=>{
 const browser=await chromium.launch({channel:'msedge',headless:true});const page=await browser.newPage({viewport:{width:1140,height:880}});const errors=[];page.on('pageerror',e=>errors.push(e.message));
 await page.goto('http://127.0.0.1:8766/world-lab.html');await page.waitForFunction(()=>window.review?.world?.worldAtmosphere);await page.waitForTimeout(1500);
 fs.mkdirSync('docs/world-overhaul',{recursive:true});const results=[];
 for(const [name,label] of [['outpost','Outpost Workyard'],['orchard','The Last Garden'],['river','Riverbend Hearth'],['marsh','Lantern Refuge'],['terraces','The Cinder Terraces'],['bellwater','Bellwater Cloister'],['quarry','The Hanging Quarry'],['procession','The Drowned Procession'],['caravan','The Split Caravan'],['rootbound','The Rootbound Chapel'],['mill','Saltwell Mill'],['court','The Oathbreakers’ Court'],['mine','Dungeon · mine'],['crypt','Dungeon · grave'],['temple','Dungeon · holy'],['capital','Orrakai'],['aureate','Aureate Marches'],['ascension','Ascension Wastes']]){
  await page.selectOption('#scene',{label});await page.waitForTimeout(250);await page.screenshot({path:`docs/world-overhaul/${name}.png`});
  results.push({name,status:await page.locator('#status').innerText()});
 }
 await page.click('#night');await page.screenshot({path:'docs/world-overhaul/night.png'});
 await page.click('#mapButton');await page.screenshot({path:'docs/world-overhaul/map.png',fullPage:true});
 await page.selectOption('#scene',{label:'Outpost Workyard'});
 const target=await page.evaluate(async()=>{
  const {discoverStone}=await import('/src/worldExploration.js');const g=window.review,[a,b]=g.world.navStones;
  Object.assign(g.player,{x:a.x,y:a.y});discoverStone(g,a);Object.assign(g.player,{x:b.x,y:b.y});discoverStone(g,b);Object.assign(g.player,{x:a.x,y:a.y});return {id:b.id,x:b.x,y:b.y};
 });
 await page.click('#mapButton');await page.locator(`[data-nav-stone="${target.id}"]`).click();
 const arrived=await page.evaluate(({x,y})=>window.review.player.x===x&&window.review.player.y===y,target);if(!arrived)throw Error('Map destination button did not travel');
 results.push({name:'map-travel',status:'PASS: discovered destination button moved the player'});
 await page.goto('http://127.0.0.1:8766/');await page.waitForTimeout(900);
 // Isolated headless context only: exercise the real profile loader and game loop.
 await page.evaluate(async()=>{
  const {createWorld}=await import('/src/world.js'),{createPlayer,addItem}=await import('/src/player.js'),{createSaveState,writeProfiles}=await import('/src/gameSave.js');
  const world=createWorld(),player=createPlayer('World test');Object.assign(player,{x:world.navStones[0].x,y:world.navStones[0].y,act1OpeningPending:false});addItem(player,'fieldRations',5);
  const state=createSaveState({world,player,camera:{x:player.x-550,y:player.y-350},profileId:'world-overhaul-test',profileName:'World test'});
  writeProfiles({'world-overhaul-test':{id:'world-overhaul-test',name:'World test',createdAt:Date.now(),updatedAt:Date.now(),state}});
 });
 await page.reload();await page.locator('[data-load="world-overhaul-test"]').click();
 await page.waitForFunction(()=>document.querySelector('#activeProfileLabel')?.textContent.includes('World test'),{},{timeout:30000});
 await page.waitForTimeout(1600);await page.keyboard.down('d');await page.waitForTimeout(300);await page.keyboard.up('d');await page.keyboard.press('e');await page.waitForTimeout(500);
 await page.screenshot({path:'docs/world-overhaul/gameplay.png'});
 results.push({name:'main-game',status:await page.locator('#activeProfileLabel').innerText()});
 fs.writeFileSync('docs/world-overhaul/browser-results.json',JSON.stringify({errors,results},null,2));console.log(JSON.stringify({errors,results},null,2));await browser.close();if(errors.length)process.exitCode=1;
})().catch(e=>{console.error(e);process.exitCode=1;});
