const {chromium}=require(process.env.RUNALIS_NODE_MODULES+'/playwright'),fs=require('node:fs'),assert=require('node:assert/strict'),launch=require('./browser-game-smoke.cjs');
(async()=>{const browser=await chromium.launch({channel:'msedge',headless:true}),page=await browser.newPage(),errors=[];page.on('pageerror',e=>errors.push(e.message));try{
 await page.route('**/src/main.js*',r=>r.fulfill({contentType:'text/javascript',body:fs.readFileSync('src/main.js','utf8')+'\nwindow.wardGame=()=>currentGame;'}));
 await launch(page);await page.waitForFunction(()=>wardGame()?.started);
 await page.evaluate(async()=>{
  const {PROFILE_KEY,createSaveState}=await import('/src/gameSave.js'),{createPlayer,chooseClass}=await import('/src/player.js');const g=wardGame(),p=createPlayer('Legacy Ward');chooseClass(p,'waverider');
  const state=createSaveState({player:p,world:g.world});state.player.buffs={bubbleWard:{until:36000,flatAbsorb:20,duration:8}};state.player.visuals={bubbleWardUntil:36000,bubbleWardFlatAbsorb:20,bubbleWardMorph:'base'};
  removeEventListener('beforeunload',g.beforeUnload);localStorage.setItem(PROFILE_KEY,JSON.stringify({legacyWard:{id:'legacyWard',name:p.name,updated:1,state}}));
 });
 await page.reload();await page.locator('[data-load="legacyWard"]').click();await page.waitForFunction(()=>wardGame()?.started);
 assert(await page.evaluate(()=>!wardGame().player.buffs?.bubbleWard&&!wardGame().player.visuals?.bubbleWardUntil));
 console.log('PASS real browser profile reload repairs legacy saved bubble without casting');
 const result=await page.evaluate(async()=>{
  const {createPlayer,chooseClass,migratePlayer}=await import('/src/player.js'),{useAbility}=await import('/src/combat.js'),{drawActionStateVisuals}=await import('/src/combatVisualsRenderer.js'),{normalizeProfileSave}=await import('/src/saveProfiles.js'),{unlockActiveAbility}=await import('/src/abilityLoadoutSystem.js');
  const actual=performance.now.bind(performance);let clock=100;Object.defineProperty(performance,'now',{value:()=>clock*1000,configurable:true});
  try{
   const p=createPlayer('Ward caster'),ally=createPlayer('Ally');chooseClass(p,'waverider');p.skillState.combat.level=33;migratePlayer(p);p.x=ally.x=80;p.y=ally.y=100;p.maxSpirit=p.spirit=10000;p.coop={players:[ally]};
   unlockActiveAbility(p,'hydromancerBubbleWard');p.loadout.abilitySlots=['hydromancerBubbleWard',null,null,null,'block'];
   const w={mode:'dungeon',objects:[],enemies:[],effects:[],drops:[]},used=useAbility(0,p,w,()=>{},clock);
   const canvas=document.createElement('canvas');canvas.width=canvas.height=200;const ctx=canvas.getContext('2d');
   const pixels=actor=>{ctx.clearRect(0,0,200,200);drawActionStateVisuals(ctx,actor,{x:0,y:0});const data=ctx.getImageData(0,0,200,200).data;let n=0;for(let i=3;i<data.length;i+=4)if(data[i])n++;return n;};
   const active=pixels(p),allyActive=pixels(ally),saved=normalizeProfileSave(p),loadedPixels=pixels(saved),liveAfterSave=pixels(p),expiry=p.buffs.bubbleWard.until;
   clock=expiry+1;const expired=pixels(p),allyExpired=pixels(ally);
   return {used,active,allyActive,loadedPixels,liveAfterSave,expired,allyExpired,duration:expiry-100};
  }finally{Object.defineProperty(performance,'now',{value:actual,configurable:true});}
 });
 assert(result.used);assert(result.active>0&&result.allyActive>0);assert.equal(result.loadedPixels,0);assert(result.liveAfterSave>0);assert.equal(result.expired,0);assert.equal(result.allyExpired,0);assert(result.duration>0&&result.duration<120);
 assert.deepEqual(errors,[]);console.log('PASS real party cast renders bubble, saving keeps live effect, loading clears it, and both bubbles expire on schedule',result);
 }finally{await browser.close();}})().catch(e=>{console.error(e);process.exitCode=1;});
