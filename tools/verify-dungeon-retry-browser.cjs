const {chromium}=require(process.env.RUNALIS_NODE_MODULES+'/playwright');
const fs=require('node:fs'),assert=require('node:assert/strict'),launch=require('./browser-game-smoke.cjs');
const base=process.env.RUNALIS_URL||'http://127.0.0.1:8774',out='docs/dungeon-retry';
(async()=>{
 const browser=await chromium.launch({channel:'msedge',headless:true}),errors=[];fs.mkdirSync(out,{recursive:true});
 try{for(const mobile of [false,true]){
  const page=await browser.newPage({viewport:mobile?{width:844,height:390}:{width:1280,height:800},isMobile:mobile,hasTouch:mobile});
  page.on('pageerror',e=>errors.push(e.message));
  await page.route('**/src/main.js*',r=>r.fulfill({contentType:'text/javascript',body:fs.readFileSync('src/main.js','utf8')+'\nwindow.retryGame=()=>currentGame;'}));
  await launch(page,base);await page.waitForFunction(()=>retryGame()?.started&&!document.querySelector('#loadingScreen.active'));
  await page.evaluate(async()=>{
   const g=retryGame(),d=await import('/src/dungeonSystem.js'),{createWorld}=await import('/src/world.js'),{handleVeyreignInteraction}=await import('/src/veyreignDungeon.js');
   g.world=createWorld();window.retryEntrance={id:'castleVeyrOverworldEntrance',dungeonId:'castleVeyr',name:'Castle Veyreign',x:18096,y:3376};
   d.enterDungeon(g,retryEntrance);
   // Inject guard deaths to prepare an actually cleared route; boss deaths below
   // come from the real main loop and lethal boss attacks.
   for(let floor=1;floor<=4;floor++){
    for(const e of g.world.enemies)e.hp=0;
    for(const o of g.world.objects.filter(o=>o.veyreignSeal))handleVeyreignInteraction(g,o);
    d.transitionDungeonFloor(g,g.world.objects.find(o=>o.direction==='down'));
   }
   g.world.dungeonState.veyreign.seen[5]=true;(await import('/src/dialogueSystem.js')).closeDialogue(g.dialogue,{immediate:true});g.paused=true;
  });
  for(const feral of [false,true]){
   await page.evaluate(async feral=>{
    const g=retryGame(),e=g.world.enemies[0],{beginVeyreignMove,updateVeyreignCombat}=await import('/src/veyreignCombat.js');
    g.world.bossArena.phase='active';Object.assign(g.player,g.world.bossRoomCenter);
    if(feral){e.hp=0;updateVeyreignCombat(e,g.world,g.player,4.1,performance.now()/1000,g);}
    else beginVeyreignMove(e,g.world,g.player,'hearts');
    g.player.hp=1;g.player.invulnerableUntil=0;g.player.lifeState='alive';g.paused=false;
   },feral);
   const button=page.locator('[data-death-respawn]');await page.locator('#deathScreenOverlay.active').waitFor({timeout:20000});
   assert.equal(await page.evaluate(()=>retryGame().player.hp),0);await button.waitFor({state:'visible'});
   if(mobile)await button.tap();else await button.click();
   await page.locator('#deathScreenOverlay.active').waitFor({state:'hidden'});
   await page.waitForTimeout(600);
   assert(await page.evaluate(()=>{const g=retryGame(),s=g.world.navStones?.find(s=>s.id==='nav-hearthmereFrontier-castleVeyr');return g.world.mode==='overworld'&&g.player.hp>0&&s&&Math.hypot(g.player.x-s.x,g.player.y-s.y)<2&&!g.deathScreen.active;}));
   await page.screenshot({path:out+`/${mobile?'mobile':'desktop'}-${feral?'feral':'human'}-nav-stone.png`});
   await page.evaluate(async()=>{const g=retryGame();(await import('/src/dungeonSystem.js')).enterDungeon(g,retryEntrance);g.paused=true;});
   assert(await page.evaluate(()=>{const g=retryGame(),a=g.world.bossArena;return g.world.floor===5&&a.phase==='dormant'&&g.player.y>a.y+a.h&&Object.keys(g.world.dungeonState.veyreign.seals).length===8&&g.world.enemies[0].hp===g.world.enemies[0].maxHp&&!g.world.enemies[0].veyreignFeral;}));
   console.log(`PASS ${mobile?'mobile touch':'desktop'} ${feral?'feral':'human'} lethal boss attack: countdown, Castle Nav Stone, no death loop, full boss reset, safe floor-five retry`);
  }
  await page.screenshot({path:out+`/${mobile?'mobile':'desktop'}-retry-threshold.png`});
  // Real Save & Quit, then real profile login.
  await page.evaluate(()=>retryGame().togglePause(true));await page.locator('#saveQuitBtn').click();
  await page.locator('[data-load="playerSmoke"]').click();await page.waitForFunction(()=>retryGame()?.started&&!document.querySelector('#loadingScreen.active'));
  assert(await page.evaluate(()=>retryGame().world.mode==='overworld'&&Object.keys(retryGame().player.worldMemory.dungeonRuns).length===0));
  await page.evaluate(async()=>{const g=retryGame();(await import('/src/dungeonSystem.js')).enterDungeon(g,{id:'castleVeyrOverworldEntrance',dungeonId:'castleVeyr',name:'Castle Veyreign',x:18096,y:3376});g.paused=true;});
  assert(await page.evaluate(()=>retryGame().world.floor===1&&retryGame().world.enemies.length===60&&Object.keys(retryGame().world.dungeonState.veyreign.seals).length===0));
  // A browser reload must also eject a previously saved active boss room.
  await page.evaluate(async()=>{const g=retryGame(),d=await import('/src/dungeonSystem.js');g.world=d.createDungeonWorld({dungeonId:'castleVeyr',floor:5,dungeonState:g.world.dungeonState});g.world.dungeonState.veyreign.seen[5]=true;g.world.bossArena.phase='active';Object.assign(g.player,g.world.bossRoomCenter);if(!g.save(false))throw Error('Cannot prepare reload save');});
  await page.reload();await page.locator('[data-load="playerSmoke"]').click();await page.waitForFunction(()=>retryGame()?.started&&!document.querySelector('#loadingScreen.active'));
  assert(await page.evaluate(()=>{const g=retryGame(),s=g.world.navStones.find(s=>s.id==='nav-hearthmereFrontier-castleVeyr');return g.world.mode==='overworld'&&Math.hypot(g.player.x-s.x,g.player.y-s.y)<2&&Object.keys(g.player.worldMemory.dungeonRuns).length===0;}));
  console.log(`PASS ${mobile?'mobile':'desktop'} Save & Quit and browser reload: forced surface return, cleared retry access, fresh first-floor population`);
  await page.close();
 }
 assert.deepEqual(errors,[]);console.log('PASS real boss deaths, retry and session boundaries; no browser errors');
 }finally{await browser.close();}
})().catch(e=>{console.error(e);process.exitCode=1;});
