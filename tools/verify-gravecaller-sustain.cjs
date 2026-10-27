const {chromium}=require(process.env.RUNALIS_NODE_MODULES+'/playwright');
const assert=require('node:assert/strict'),fs=require('node:fs');
(async()=>{
 const browser=await chromium.launch({channel:'msedge',headless:true}),errors=[],missing=[];
 fs.mkdirSync('docs/gravecaller-sustain',{recursive:true});
 try{
  const page=await browser.newPage({viewport:{width:1440,height:1000}});
  page.on('pageerror',e=>errors.push(e.message));page.on('response',r=>{if(r.status()>=400)missing.push(r.url());});
  await page.goto('http://127.0.0.1:8768/combat-overhaul-lab.html?skill=gravecallerMurmuringHost&morph=acolyte');await page.waitForFunction(()=>window.combatReview?.game?.player);
  const report=await page.evaluate(async()=>{
   const {createPlayer,chooseClass,migratePlayer}=await import('/src/player.js');
   const {unlockActiveAbility}=await import('/src/abilityLoadoutSystem.js');
   const {getAbilityMastery}=await import('/src/abilityMasterySystem.js');
   const {selectAbilityMorph}=await import('/src/abilityMorphSystem.js');
   const {useAbility,updateCombat,updateSummons}=await import('/src/combat.js');
   const {getSubclassCombatState}=await import('/src/subclassCombat.js');
   const g=combatReview.game,w=g.world;g.paused=true;let clock=1000;const original=performance.now.bind(performance);performance.now=()=>clock*1000;
   const aim={hasAim:true,combatAimX:1,combatAimY:0,ability0Held:true};
   function actor(level,id,morph,invested=false){
    const p=createPlayer('Gravecaller balance');chooseClass(p,'gravecaller');p.skillState.combat.level=level;
    for(const s of ['spirit','summoning','scythe','focus','dexterity'])p.skillState.skills[s].level=Math.round(level*.35);
    p.equipment.weapon=invested?'lichboneScythe':'graveScythe';p.skillTree.respecVersion=1;
    if(invested){p.bloodline={id:'vampire'};p.skillTree.spent=Object.fromEntries(['spirit_root','spirit_harvest','spirit_minions','spirit_bone_coterie','spirit_soul_siphon','spirit_vital_theft','spirit_grave_command','scythe_root','scythe_branch_b','scythe_merge','scythe_second_b','scythe_second_merge','scythe_capstone','scythe_foundation_1','scythe_foundation_2','scythe_foundation_3','scythe_foundation_4'].map(id=>[id,1]));}
    migratePlayer(p);Object.assign(p,{id:'browser-sustain',x:185,y:315,dirX:1,dirY:0,spiritAwakened:true,isInCombat:true});p.spirit=p.maxSpirit;p.hp=p.maxHp*.3;
    unlockActiveAbility(p,id,{autoAssignEmpty:false});getAbilityMastery(p,id,true).level=20;p.loadout.abilitySlots[0]=id;selectAbilityMorph(p,id,morph);g.player=p;w.enemies=[];w.effects=[];clock+=30;return p;
   }
   const foe=(hp,x=240)=>({id:'foe'+Math.random(),kind:'hollowling',name:'Target',x,y:315,hp,maxHp:hp,radius:16,r:16,aggro:3,combatLevel:15});
   const step=p=>{clock+=1/60;updateCombat(p,w,aim,1/60,clock,()=>{});for(const fx of w.effects)fx.age=(fx.age||0)+1/60;w.effects=w.effects.filter(fx=>fx.age<fx.ttl);};
   for(let y=1;y<18;y++)for(let x=1;x<31;x++)w.tiles[y][x].passable=true;
   try{
    const p=actor(65,'gravecallerMurmuringHost','acolyte',true);w.enemies=Array.from({length:20},(_,i)=>foe(1e6,250+i*20));const initial=p.hp;
    if(!useAbility(0,p,w,()=>{},clock,aim))throw Error('Beam failed');for(let i=0;i<180;i++)step(p);
    const beam={level:65,initialHp:initial,finalHp:p.hp,healing:p.hp-initial,damage:w.enemies.reduce((sum,e)=>sum+1e6-e.hp,0),ward:getSubclassCombatState(p).hostWard.reduction};
    const bolts=[],summons=[];
    for(const morph of ['base','acolyte','deathknight']){
     const p=actor(33,'graveSpark',morph);w.enemies=[foe(1)];const initial=p.hp;
     if(!useAbility(0,p,w,()=>{},clock,aim))throw Error('Bolt failed');for(let i=0;i<30;i++)step(p);
     bolts.push({morph,healing:p.hp-initial,targetHp:w.enemies[0].hp});
    }
    for(const id of ['summonLich','gravecallerSummonLich'])for(const morph of ['base','acolyte','deathknight']){
     const p=actor(33,id,morph);if(!useAbility(0,p,w,()=>{},clock,aim))throw Error('Summon failed');const s=p.summons[0];Object.assign(s,{x:210,y:315,attackCooldown:0});w.enemies=[foe(1,235)];const initial=p.hp;
     updateSummons(.01,p,w,()=>{},clock);summons.push({id,morph,healing:p.hp-initial,targetHp:w.enemies[0].hp});combatReview.draw();
    }
    return {beam,bolts,summons};
   }finally{performance.now=original;}
  });
  assert.equal(report.beam.healing,0);assert.equal(report.beam.ward,.25);assert(report.beam.damage>10000);
  for(const r of report.bolts){assert.equal(r.targetHp,0);assert(Math.abs(r.healing-(r.morph==='deathknight'?.1:.08))<1e-8);}
  for(const r of report.summons){assert.equal(r.targetHp,0);assert(Math.abs(r.healing-(r.morph==='acolyte'?.08:.04))<1e-8);}
  const menu=await browser.newPage({viewport:{width:1440,height:900}});menu.on('pageerror',e=>errors.push(e.message));menu.on('response',r=>{if(r.status()>=400)missing.push(r.url());});
  await menu.route('**/src/main.js*',r=>r.fulfill({contentType:'text/javascript',body:''}));await menu.goto('http://127.0.0.1:8768/');
  await menu.evaluate(async()=>{
   const ui=await import('/src/ui.js'),player=await import('/src/player.js'),mastery=await import('/src/abilityMasterySystem.js'),loadout=await import('/src/abilityLoadoutSystem.js'),morph=await import('/src/abilityMorphSystem.js');const {createWorld}=await import('/src/world.js');
   const game={player:player.createPlayer('Gravecaller balance'),world:createWorld(),camera:{x:0,y:0},logLines:[],log(t){this.logLines.push(t);},save(){},keys:{},input:{},canvas:document.querySelector('#game')};player.chooseClass(game.player,'gravecaller');game.player.spiritAwakened=true;game.player.skillTree.respecVersion=1;
   for(const id of ['graveSpark','summonLich','gravecallerSummonLich','soulSiphon','gravecallerMurmuringHost']){loadout.unlockActiveAbility(game.player,id,{autoAssignEmpty:false});mastery.getAbilityMastery(game.player,id,true).level=20;}
   document.querySelector('#mainMenu').classList.remove('active');document.querySelector('#app').classList.add('active');ui.initUI(game);window.sustainMenu={game,ui,morph};ui.renderUI(game.player,game.logLines,game);
  });
  await menu.locator('[data-tab="skills"]').evaluate(e=>e.click());await menu.locator('button.subtab[data-skills-subtab="abilities"]').click();await menu.locator('[data-select-ability-id="graveSpark"]').click();
  assert.match(await menu.locator('[data-ability-detail-pane]').innerText(),/8% of actual damage/);assert.match(await menu.locator('[data-ability-detail-pane]').innerText(),/3% of max Health\/s/);
  await menu.screenshot({path:'docs/gravecaller-sustain/necrotic-bolt-abilities.png'});
  await menu.locator('[data-select-ability-id="gravecallerMurmuringHost"]').click();await menu.evaluate(()=>{const {game,ui,morph}=sustainMenu;morph.selectAbilityMorph(game.player,'gravecallerMurmuringHost','acolyte');ui.renderUI(game.player,game.logLines,game);});
  assert.match(await menu.locator('[data-ability-detail-pane]').innerText(),/25%/);assert(!/Lifesteal/.test(await menu.locator('[data-ability-detail-pane]').innerText()));
  await menu.screenshot({path:'docs/gravecaller-sustain/host-abilities.png'});
  await menu.locator('[data-select-ability-id="summonLich"]').click();assert.match(await menu.locator('[data-ability-detail-pane]').innerText(),/1% of your max Health\/s/);
  assert.deepEqual(errors,[]);assert.deepEqual(missing,[]);fs.writeFileSync('docs/gravecaller-sustain/browser-verification.json',JSON.stringify({pass:true,report,abilityPanels:true,errors,missing},null,2)+'\n');console.log(JSON.stringify({pass:true,report,abilityPanels:true,errors,missing}));
 }finally{await browser.close();}
})().catch(e=>{console.error(e);process.exitCode=1;});
