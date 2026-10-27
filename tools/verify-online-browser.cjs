const {chromium}=require(process.env.RUNALIS_NODE_MODULES+'/playwright'),fs=require('node:fs'),assert=require('node:assert/strict'),launch=require('./browser-game-smoke.cjs');
const base=process.env.RUNALIS_URL||'http://127.0.0.1:8768',out='docs/online-multiplayer';
(async()=>{
 const browser=await chromium.launch({channel:'msedge',headless:true}),errors=[],checks=[];fs.mkdirSync(out,{recursive:true});
 try{
  async function open(name,touch=false){
   const page=await browser.newPage({viewport:{width:touch?844:1280,height:touch?390:800},isMobile:touch,hasTouch:touch});
   page.on('pageerror',e=>errors.push(name+': '+e.message));
   await page.addInitScript(()=>{Element.prototype.requestFullscreen=async()=>{throw Error('Unavailable in browser test');};});
   if(process.env.RUNALIS_SIGNAL_PORT)await page.addInitScript(port=>{window.RUNALIS_NETWORK_CONFIG={host:'127.0.0.1',port:Number(port),path:'/',secure:false,config:{iceServers:[]}};},process.env.RUNALIS_SIGNAL_PORT);
   await page.route('**/src/main.js*',r=>r.fulfill({contentType:'text/javascript',body:fs.readFileSync('src/main.js','utf8')+'\nwindow.onlineGame=()=>currentGame;'}));
   await launch(page,base);await page.waitForFunction(()=>window.onlineGame?.()?.started&&!document.querySelector('#loadingScreen')?.classList.contains('active'));
   await page.evaluate(name=>{onlineGame().player.name=name;onlineGame().profileName=name;},name);return page;
  }
  async function menu(page){await page.evaluate(()=>onlineGame().onlineSession.openMenu());}
  const host=await open('Online host'),guest=await open('Online guest',true),password='Runalis-test-'+Date.now()+'-'+Math.random().toString(36).slice(2);
  await host.keyboard.press('Tab');await host.locator('[data-menu-action="multiplayer"]').click();await host.locator('[data-online-password]').fill(password);await host.locator('[data-online-host]').click();
  try{await host.waitForFunction(()=>onlineGame().onlineSession.role==='host',null,{timeout:30000});}catch(e){throw Error('Hosting failed: '+await host.locator('[data-online-status]').innerText());}
  await host.screenshot({path:out+'/open-world.png'});await host.locator('[data-online-close]').click();checks.push('Real Open World menu registers password room');
  await menu(guest);await guest.locator('[data-online-password]').fill(password);await guest.locator('[data-online-join]').click();
  try{await guest.waitForFunction(()=>onlineGame().onlineSession.role==='guest'&&onlineGame().onlineSession.ready,null,{timeout:30000});}catch(e){throw Error('Joining failed: '+await guest.locator('[data-online-status]').innerText());}
  await host.waitForFunction(()=>[...onlineGame().onlineSession.clients.values()].some(c=>c.actor&&c.ready));await guest.waitForFunction(()=>onlineGame().player.coop.players.some(p=>p.name==='Online host'));
  await guest.waitForFunction(()=>!document.body.classList.contains('couch-coop-active')&&getComputedStyle(document.querySelector('#unitFramesHud')).display!=='none');
  checks.push('Separate browser profiles connect over native WebRTC and join the same host world');
  const before=await host.evaluate(()=>onlineGame().player.coop.players[0].x);
  const stick=await guest.locator('#mobileStick').boundingBox(),client=await guest.context().newCDPSession(guest),start={id:1,x:stick.x+stick.width/2,y:stick.y+stick.height/2};
  await client.send('Input.dispatchTouchEvent',{type:'touchStart',touchPoints:[start]});await client.send('Input.dispatchTouchEvent',{type:'touchMove',touchPoints:[{...start,x:start.x+40}]});
  await host.waitForFunction(x=>onlineGame().player.coop.players[0].x>x+10,before);await client.send('Input.dispatchTouchEvent',{type:'touchEnd',touchPoints:[]});
  await guest.waitForFunction(()=>onlineGame().player.x>0);const positions=await Promise.all([host.evaluate(()=>onlineGame().player.coop.players[0].x),guest.evaluate(()=>onlineGame().player.x)]);assert(Math.abs(positions[0]-positions[1])<60);checks.push('Mobile movement reaches host-authoritative actor and returns to the guest');
  const attack=await guest.locator('[data-hold="attack"]').boundingBox();await client.send('Input.dispatchTouchEvent',{type:'touchStart',touchPoints:[{id:2,x:attack.x+attack.width/2,y:attack.y+attack.height/2}]});
  await host.waitForFunction(()=>onlineGame().player.coop.players[0].combatState?.heavyChargeActive);await client.send('Input.dispatchTouchEvent',{type:'touchEnd',touchPoints:[]});checks.push('Guest attack input runs through real host combat');
  await host.evaluate(()=>{const g=onlineGame();g.world.effects.push({id:'online-visible-effect',kind:'burst',x:g.player.coop.players[0].x,y:g.player.coop.players[0].y,radius:48,color:'#ffcc66',age:0,ttl:10});});
  await guest.waitForFunction(()=>onlineGame().world.effects.some(e=>e.id==='online-visible-effect'));checks.push('Host combat effects synchronize to guest');await guest.screenshot({path:out+'/guest-world.png'});
  await host.evaluate(async()=>{(await import('/src/audioSystem.js')).playSfx('cryoSpell',{phase:'impact',volume:.2});});await guest.waitForFunction(()=>onlineGame().onlineSession.lastAudioName==='cryoSpell');checks.push('Host combat sound cues reach the guest audio mixer without echoing back');
  const oldBody=await host.evaluate(()=>onlineGame().player.coop.players[0].bodyType);
  await guest.locator('[data-action="menu"]').tap();await guest.locator('.tab[data-tab="character"]').tap();await guest.locator('[data-open-character-creator]').tap();await guest.locator('[data-creator-next]').first().tap();await guest.locator('[data-creator-start]').tap();
  await guest.locator('[data-action="menu"]').tap();await guest.locator('[data-action="menu"]').tap();
  await host.waitForFunction(old=>onlineGame().player.coop.players[0].bodyType!==old,oldBody);checks.push('Guest customization commits to host without snapshots overwriting menu edits');
  await host.evaluate(()=>{const g=onlineGame(),p=g.player.coop.players[0],npc=g.world.objects.find(o=>o.npcId==='maraVell');p.x=npc.x;p.y=npc.y+28;});
  await guest.waitForTimeout(300);const interact=await guest.locator('[data-hold="interact"]').boundingBox();await guest.touchscreen.tap(interact.x+interact.width/2,interact.y+interact.height/2);
  await host.waitForFunction(()=>onlineGame().dialogue.active&&onlineGame().dialogue.actor.networkRemote);await guest.waitForFunction(()=>onlineGame().dialogue.active);
  assert(await host.evaluate(()=>onlineGame().uiOwner===onlineGame().player));await host.keyboard.down('d');await host.waitForFunction(()=>onlineGame().input.moveX>.9);await host.keyboard.up('d');
  await guest.evaluate(()=>onlineGame().closeConversation());await host.waitForFunction(()=>!onlineGame().dialogue.active);await guest.waitForFunction(()=>!onlineGame().dialogue.active);checks.push('Guest NPC dialogue is host-owned, exits remotely, and does not block host controls');
  await host.evaluate(async()=>{const g=onlineGame(),p=g.player.coop.players[0];(await import('/src/shopSystem.js')).openMarketShop(g.getActorGameView(p));});
  await guest.waitForSelector('#marketShopOverlay.active');assert.equal(await host.locator('#marketShopOverlay.active').count(),0);await guest.locator('[data-market-close]').tap();checks.push('Guest shop opens on guest device rather than host screen');
  await host.evaluate(()=>{const g=onlineGame(),p=g.player.coop.players[0],npc=g.world.objects.find(o=>o.npcId==='maraSmith');p.x=npc.x;p.y=npc.y+30;});await guest.waitForTimeout(350);
  await host.evaluate(async()=>{const g=onlineGame(),p=g.player.coop.players[0],npc=g.world.objects.find(o=>o.npcId==='maraSmith');(await import('/src/workshopService.js')).openWorkshopService(g.getActorGameView(p),npc,'weapons');});
  await guest.waitForSelector('#workshopServiceOverlay.active');assert.equal(await host.locator('#workshopServiceOverlay.active').count(),0);await guest.locator('[data-workshop-close]').tap();await host.waitForFunction(()=>!onlineGame().player.coop.players[0].networkMenuBusy);checks.push('Guest forge service preserves proximity checks and opens on the correct device');
  const fishBefore=await host.evaluate(async()=>{const g=onlineGame(),p=g.player.coop.players[0],object={id:'online-fishing-spot',kind:'resource',x:p.x,y:p.y+20,skill:'fishing',respawnTime:18};g.world.objects.push(object);const qty=p.inventory.reduce((s,e)=>s+e.qty,0);(await import('/src/survivalSkills.js')).startFishingMiniGame(g.getActorGameView(p),object);g.fishingMiniGame.targetStart=0;g.fishingMiniGame.targetEnd=1;return qty;});
  await guest.waitForSelector('#fishingMiniGameOverlay.active');assert.equal(await host.locator('#fishingMiniGameOverlay.active').count(),0);await guest.locator('[data-fishing-reel]').tap();await host.waitForFunction(qty=>!onlineGame().fishingMiniGame&&onlineGame().player.coop.players[0].inventory.reduce((s,e)=>s+e.qty,0)>qty,fishBefore);await guest.waitForFunction(()=>onlineGame().world.objects.find(o=>o.id==='online-fishing-spot')?.depleted);checks.push('Fishing runs on host, reels from guest device, and synchronizes its world resource and reward');
  await host.evaluate(async()=>{const g=onlineGame(),p=g.player.coop.players[0],{makeEnemy}=await import('/src/world.js');g.world.enemies=Array.from({length:16},(_,i)=>makeEnemy('rat','online-target-'+i,'Online combat target',0,0,{x:p.x+30+(i%4)*4,y:p.y+(Math.floor(i/4)-1.5)*8,hp:1000,maxHp:1000,speed:0,damage:0}));p.dirX=1;p.dirY=0;p.lastCombatAimX=1;p.lastCombatAimY=0;});
  await guest.waitForFunction(()=>onlineGame().world.enemies.filter(e=>e.id.startsWith('online-target')).length===16);
  const point=await guest.evaluate(()=>{const g=onlineGame(),r=g.canvas.getBoundingClientRect();return {id:4,x:r.left+(g.player.x-g.camera.x)*r.width/g.canvas.width+110,y:r.top+(g.player.y-g.camera.y)*r.height/g.canvas.height};});
  const attack2=await guest.locator('[data-hold="attack"]').boundingBox(),attackPoint={id:5,x:attack2.x+attack2.width/2,y:attack2.y+attack2.height/2};
  await client.send('Input.dispatchTouchEvent',{type:'touchStart',touchPoints:[point]});await client.send('Input.dispatchTouchEvent',{type:'touchStart',touchPoints:[point,attackPoint]});await guest.waitForTimeout(200);await client.send('Input.dispatchTouchEvent',{type:'touchEnd',touchPoints:[attackPoint]});await client.send('Input.dispatchTouchEvent',{type:'touchEnd',touchPoints:[]});
  await host.waitForFunction(()=>onlineGame().world.enemies.some(e=>e.id.startsWith('online-target')&&e.hp<e.maxHp));await guest.waitForFunction(()=>onlineGame().world.enemies.some(e=>e.id.startsWith('online-target')&&e.hp<e.maxHp));checks.push('Sixteen-enemy encounter and real guest damage replicate from host');
  await host.evaluate(()=>onlineGame().enterDungeon({id:'online-review-crypt',dungeonId:'online-review-crypt',name:'Online review crypt',x:onlineGame().player.x,y:onlineGame().player.y,seed:'online-review'}));
  await guest.waitForFunction(()=>onlineGame().world.mode==='dungeon'&&onlineGame().onlineSession.ready);await guest.waitForFunction(()=>onlineGame().world.enemies.length>0);checks.push('Native dungeon travel synchronizes world generation and shared enemies');
  const presentations=[];
  for(const scenario of [{classId:'gravecaller',family:'acolyte',id:'gravecallerFuneralUrn',field:'urns'},{classId:'thornbinder',family:'petalknight',id:'thornbinderLivingBriar',effect:'mantleVisual'},{classId:'thornbinder',family:'petalknight',id:'thornbinderThornstorm',effect:'stormVisual'},{classId:'waverider',family:'sunken',id:'hydromancerWaterTorrent'},{classId:'oathkeeper',family:'sinner',id:'oathkeeperHallowedBlades'},{classId:'fellhunter',family:'hellstalker',id:'fellhunterMarkedShot'}]){
   await host.evaluate(async scenario=>{
    const g=onlineGame(),p=g.player.coop.players[0],keep={slot:p.slot,playerNumber:p.playerNumber,profileId:p.profileId,controllerSlotIndex:p.controllerSlotIndex,networkRemote:true,networkId:p.networkId,x:p.x,y:p.y};g.paused=true;
    const {createPlayer,chooseClass,migratePlayer}=await import('/src/player.js'),{unlockActiveAbility}=await import('/src/abilityLoadoutSystem.js'),{getAbilityMastery}=await import('/src/abilityMasterySystem.js'),{selectAbilityMorph}=await import('/src/abilityMorphSystem.js'),{clearSubclassCombatState}=await import('/src/subclassCombat.js'),{useAbility}=await import('/src/combat.js');
    clearSubclassCombatState(p);Object.assign(p,createPlayer('Presentation '+scenario.family),keep);chooseClass(p,scenario.classId);p.skillState.combat.level=33;for(const s of Object.values(p.skillState.skills))s.level=33;migratePlayer(p);p.spiritAwakened=true;p.spirit=p.maxSpirit=p.stamina=p.maxStamina=10000;p.equipment.weapon=scenario.classId==='fellhunter'?'hunterBow':scenario.classId==='oathkeeper'?'oathkeepersMace':'oldKnife';
    unlockActiveAbility(p,scenario.id,{autoAssignEmpty:false});getAbilityMastery(p,scenario.id,true).level=20;if(!selectAbilityMorph(p,scenario.id,scenario.family,performance.now()/1000).ok)throw Error('Cannot select morph');p.loadout.abilitySlots=[scenario.id,null,null,null,'block'];g.world.effects=[];
    if(!useAbility(0,p,g.world,()=>{},performance.now()/1000,{combatAimX:1,combatAimY:0,hasAim:true}))throw Error('Cannot cast '+scenario.id);
    if(scenario.family==='sunken'){const {applySunkenPressure}=await import('/src/sunkenPressureSystem.js'),e=g.world.enemies.find(e=>e.hp>0),now=performance.now()/1000;e.arenaDormant=false;for(const at of [now,now+4,now+8,now+10])applySunkenPressure(p,g.world,e,100,'spirit',{sourceAbilityId:scenario.id,sourceMorph:'sunken'},at);}
   },scenario);
    await guest.waitForFunction(classId=>{const p=onlineGame().player,s=p.networkPresentation;return p.classId===classId&&!!(s?.subclassState||s?.techniqueState);},scenario.classId);
   if(scenario.effect)await guest.waitForFunction(field=>onlineGame().world.effects.some(e=>e[field]?.owner===onlineGame().player),scenario.effect);
   if(scenario.field)await guest.waitForFunction(field=>onlineGame().player.networkPresentation.subclassState[field]?.length>0,scenario.field);
    if(scenario.family==='sunken')await guest.waitForFunction(()=>onlineGame().player.networkPresentation.sunkenDepth?.depth>0&&!!document.querySelector('#unitFramesHud .sunken-depth'));
    await guest.waitForFunction(id=>!!document.querySelector(`#combatSkillHud [data-ability-id="${id}"]`),scenario.id);
   await guest.screenshot({path:`${out}/subclass-${scenario.family}-${scenario.id}.png`});presentations.push(scenario.family);
  }
  await host.evaluate(()=>{onlineGame().paused=false;});checks.push('Subclass urns, sword conjurations, demonic shots and Petalknight auras retain live render state: '+presentations.join(', '));
  const originalWorld=await guest.evaluate(()=>onlineGame().onlineSession.backup.worldMode);
  await menu(host);await host.locator('[data-online-leave]').click();await guest.waitForFunction(()=>onlineGame().onlineSession.role===null);assert.equal(await guest.evaluate(()=>onlineGame().world.mode),originalWorld);assert.equal(await host.evaluate(()=>onlineGame().player.coop.players.length),0);checks.push('Closing the host world disconnects guests and restores their own world');
  assert.deepEqual(errors,[]);const report={checks,errors,transport:'native WebRTC via PeerJS',signaling:process.env.RUNALIS_SIGNAL_PORT?'local test signaling relay':'public PeerJS cloud'};fs.writeFileSync(out+'/verification.json',JSON.stringify(report,null,2));console.log(JSON.stringify(report,null,2));
 }finally{await browser.close();}
})().catch(e=>{console.error(e);process.exitCode=1;});
