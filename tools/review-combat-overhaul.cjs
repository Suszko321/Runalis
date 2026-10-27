const {chromium}=require(process.env.RUNALIS_NODE_MODULES+'/playwright');
const fs=require('node:fs');
(async()=>{
 const browser=await chromium.launch({channel:'msedge',headless:true});
 const report={classes:[],errors:[],allAbilityPoses:null};
 try{
  const page=await browser.newPage({viewport:{width:1440,height:1000}});
  page.on('pageerror',e=>report.errors.push(e.stack));
  await page.goto('http://127.0.0.1:8766/combat-overhaul-lab.html');
  await page.waitForFunction(()=>window.combatReview?.game.player);
  await page.selectOption('#class','gravecaller');
  await page.evaluate(()=>{const g=window.combatReview.game;g.paused=false;g.dev.equip(['graveSpark','gravecallerGhostwalk','gravecallerFuneralUrn','gravecallerMurmuringHost']);g.dev.refill();});
  await page.keyboard.down('4');await page.waitForTimeout(250);
  report.keyboardChannelStart=await page.evaluate(()=>window.combatReview.game.player.activeChannel?.abilityId==='gravecallerMurmuringHost');
  await page.keyboard.up('4');await page.waitForTimeout(100);
  report.keyboardChannelReleased=await page.evaluate(()=>window.combatReview.game.player.activeChannel==null);
  if(!report.keyboardChannelStart||!report.keyboardChannelReleased)throw Error('Keyboard fourth-slot channel lifecycle failed');
  for(const classId of ['oathkeeper','fellhunter','gravecaller','thornbinder','waverider','lightbringer','eldritch']){
   await page.selectOption('#class',classId);await page.click('#refill');
   const result=await page.evaluate(async(classId)=>{
    const {game:g}=window.combatReview;g.paused=true;
    const {ABILITIES}=await import('/src/data.js'),{useAbility,updateCombat,updateSummons}=await import('/src/combat.js');
    const {COMBAT_EXPANSION_ABILITIES}=await import('/src/combatExpansionData.js');
    const {stopAbilityChannel}=await import('/src/abilityChannelSystem.js');
    const additions=COMBAT_EXPANSION_ABILITIES.filter(a=>a.classId===classId),results=[];
    for(const a of additions){
     stopAbilityChannel(g.player);g.dev.refill();g.dev.clearCooldowns();g.player.x=250;g.player.y=320;
     g.world.enemies=[];for(let i=0;i<5;i++)g.dev.spawn(i===4?'elite':'melee',360+i%3*45,300+Math.floor(i/3)*35);
     g.player.loadout.abilitySlots[3]=a.id;const now=performance.now()/1000;
     const input={rightStickActive:true,rightStickAimX:1,rightStickAimY:0,aimSource:'rightStick',ability3Held:true};
     const used=useAbility(3,g.player,g.world,g.log,now,input);
     const times=[];
     for(let i=1;i<=55;i++){const t=performance.now();updateCombat(g.player,g.world,input,1/60,now+i/60,g.log);updateSummons(1/60,g.player,g.world,g.log,now+i/60);times.push(performance.now()-t);for(const fx of g.world.effects)fx.age=(fx.age||0)+1/60;g.world.effects=g.world.effects.filter(fx=>fx.age<fx.ttl);}
     window.combatReview.draw();times.sort((a,b)=>a-b);
     results.push({id:a.id,used,p95:times[Math.floor(times.length*.95)],effects:g.world.effects.length});
    }
    // Keep the class channel or a representative effect visible for its capture.
    window.combatReview.reset(classId);g.paused=true;
    stopAbilityChannel(g.player);g.dev.refill();g.dev.clearCooldowns();g.player.x=250;g.player.y=320;
    g.world.enemies=[];for(let i=0;i<8;i++)g.dev.spawn(i===7?'boss':'melee',330+i%4*50,280+Math.floor(i/4)*55);
    const showcase=additions.find(a=>a.channelProfile)||additions.find(a=>a.role==='area')||additions[1];
    g.player.loadout.abilitySlots=[...additions.filter(a=>a.id!==showcase.id).slice(0,3).map(a=>a.id),showcase.id];const now=performance.now()/1000,input={rightStickActive:true,rightStickAimX:1,rightStickAimY:0,aimSource:'rightStick',ability3Held:true};
    useAbility(3,g.player,g.world,g.log,now,input);updateCombat(g.player,g.world,input,.15,now+.15,g.log);window.combatReview.draw();window.combatReview.renderHud();
    return {classId,results,slots:g.player.loadout.abilitySlots};
   },classId);
   await page.locator('main').screenshot({path:`docs/combat-overhaul/${classId}.png`});report.classes.push(result);
  }
  // Every old and new ability pose/effect is exercised in the existing atelier.
  await page.goto('http://127.0.0.1:8766/combat-lab.html');
  await page.waitForFunction(()=>typeof document.querySelector('#check')?.onclick==='function');
  await page.locator('#check').click();
  await page.waitForSelector('#results');report.allAbilityPoses=await page.locator('#results').textContent();
  await page.goto('http://127.0.0.1:8766/');
  await page.waitForTimeout(800);
  report.gameBoot=await page.title();
  await page.evaluate(async()=>{
   const {createPlayer,chooseClass}=await import('/src/player.js'),{createWorld}=await import('/src/world.js');
   const {createSaveState,writeProfiles}=await import('/src/gameSave.js'),{unlockActiveAbility}=await import('/src/abilityLoadoutSystem.js');
   const {grantAbilityMasteryXp}=await import('/src/abilityMasterySystem.js');
   const player=createPlayer('Combat Review');chooseClass(player,'gravecaller',()=>{});player.act1OpeningPending=false;
   for(const id of ['gravecallerMurmuringHost','gravecallerGhostwalk','gravecallerFuneralUrn'])unlockActiveAbility(player,id);
   player.loadout.abilitySlots=['graveSpark','gravecallerGhostwalk','gravecallerFuneralUrn','gravecallerMurmuringHost'];
   grantAbilityMasteryXp(player,'gravecallerMurmuringHost',1000);player.currentZone='Echoryn Forest';
   const world=createWorld(),state=createSaveState({world,player,camera:{x:0,y:0},profileId:'combat-review',profileName:player.name});
   writeProfiles({'combat-review':{id:'combat-review',name:player.name,createdAt:Date.now(),updatedAt:Date.now(),state}});
  });
  await page.reload();await page.locator('[data-load="combat-review"]').click();await page.waitForTimeout(1800);
  report.loadedHudSlots=await page.locator('.combat-hud-slot').count();
  await page.screenshot({path:'docs/combat-overhaul/game-hud.png'});
  await page.locator('[data-tab="skills"]').evaluate(e=>e.click());await page.waitForTimeout(150);
  await page.locator('[data-skills-subtab="trees"]').click();await page.waitForTimeout(150);
  report.treeIcons=await page.locator('.compact-node-button img').count();
  if(!report.treeIcons)throw Error('Skill tree icons did not render');
  await page.screenshot({path:'docs/combat-overhaul/skill-tree-icons.png'});
  await page.locator('[data-skills-subtab="abilities"]').click();await page.waitForTimeout(150);
  report.library={fourSlots:await page.locator('[data-ability-hotbar-slot]').count(),locked:await page.locator('[data-select-ability-id="gravecallerDeathEcho"]').textContent()};
  await page.locator('[data-select-ability-id="gravecallerMurmuringHost"]').click();await page.waitForTimeout(100);
  report.library.mastery=await page.locator('[data-ability-detail-pane]').textContent();
  await page.screenshot({path:'docs/combat-overhaul/ability-library.png'});
  await page.locator('[data-assign-selected-slot="3"]').click();
  await page.setViewportSize({width:800,height:700});await page.waitForTimeout(150);
  await page.screenshot({path:'docs/combat-overhaul/ability-library-compact.png'});
  report.library.compactSlots=await page.locator('[data-ability-hotbar-slot]').count();
  // Exercise the real controller menu coordinator with an isolated review actor.
  report.controllerAssignment=await page.evaluate(async()=>{
   const {createPlayer,chooseClass}=await import('/src/player.js'),{createWorld}=await import('/src/world.js');
   const {unlockActiveAbility}=await import('/src/abilityLoadoutSystem.js');
   const {initUI,renderUI,handleGameUiControllerInput}=await import('/src/ui.js');
   const player=createPlayer('Controller review');chooseClass(player,'gravecaller',()=>{});unlockActiveAbility(player,'gravecallerGhostwalk');
   player.loadout.abilitySlots=['graveSpark',null,null,null];
   const game={player,world:createWorld(),canvas:document.querySelector('#game'),camera:{x:0,y:0},logLines:[],log:()=>{},save:()=>{},uiState:{activeMainTab:'skills',skillsSubtab:'abilities',abilityCategory:'all',selectedAbilityId:'gravecallerGhostwalk'}};
   initUI(game);renderUI(player,[],game);document.querySelector('.panel').classList.add('open');
   handleGameUiControllerInput(game,{connected:true,confirmPressed:true});game.uiAbilityControllerState.hotbarIndex=0;
   for(let i=0;i<3;i++)handleGameUiControllerInput(game,{connected:true,rightPressed:true});
   handleGameUiControllerInput(game,{connected:true,confirmPressed:true});
   return {slots:player.loadout.abilitySlots,known:player.knownAbilities.includes('gravecallerGhostwalk')};
  });
  if(report.controllerAssignment.slots[0]!=='graveSpark'||report.controllerAssignment.slots[3]!=='gravecallerGhostwalk')throw Error('Controller exact fourth-slot assignment failed');
  if(report.loadedHudSlots!==5||report.library.fourSlots!==4||report.library.compactSlots!==4)throw Error('Four-slot production UI check failed');
  fs.writeFileSync('docs/combat-overhaul/browser-results.json',JSON.stringify(report,null,2));
  console.log(JSON.stringify(report,null,2));
  if(report.errors.length||report.classes.some(c=>c.results.some(a=>!a.used)))process.exitCode=1;
 }finally{await browser.close();}
})();
