const {chromium}=require(process.env.RUNALIS_NODE_MODULES+'/playwright');
const assert=require('node:assert/strict'),fs=require('node:fs');
(async()=>{
 const browser=await chromium.launch({channel:'msedge',headless:true}),errors=[],missing=[];
 try{
  const page=await browser.newPage({viewport:{width:1440,height:1000}});
  page.on('pageerror',e=>errors.push(e.message));page.on('response',r=>{if(r.status()>=400)missing.push(r.url());});
  await page.goto('http://127.0.0.1:8768/combat-overhaul-lab.html?skill=gravecallerMurmuringHost&morph=acolyte');
  await page.waitForFunction(()=>window.combatReview?.game?.player);
  const report=await page.evaluate(async()=>{
   const {createPlayer,chooseClass,migratePlayer}=await import('/src/player.js');
   const {unlockActiveAbility}=await import('/src/abilityLoadoutSystem.js');
   const {getAbilityMastery}=await import('/src/abilityMasterySystem.js');
   const {selectAbilityMorph}=await import('/src/abilityMorphSystem.js');
   const {useAbility,updateCombat}=await import('/src/combat.js');
   const {getSubclassCombatState,mitigateSubclassDamage}=await import('/src/subclassCombat.js');
   const {configureEncounterEnemy}=await import('/src/encounterData.js');
   const {resolveSubclassAbility}=await import('/src/subclassVariants.js');
   const g=combatReview.game,w=g.world;g.paused=true;
   const p=g.player=createPlayer('Level 33 Gravecaller');chooseClass(p,'gravecaller');p.equipment.weapon='graveScythe';p.skillState.combat.level=33;
   for(const s of ['spirit','summoning','scythe','focus','dexterity'])p.skillState.skills[s].level=12;
   migratePlayer(p);Object.assign(p,{id:'damage-review',x:185,y:315,dirX:1,dirY:0,spiritAwakened:true});p.spirit=p.maxSpirit;
   const id='gravecallerMurmuringHost';unlockActiveAbility(p,id,{autoAssignEmpty:false});getAbilityMastery(p,id,true).level=20;p.loadout.abilitySlots[0]=id;selectAbilityMorph(p,id,'acolyte');
   for(let y=1;y<18;y++)for(let x=1;x<31;x++)w.tiles[y][x].passable=true;
   w.effects=[];w.enemies=Array.from({length:20},(_,i)=>{
    const e={id:'target'+i,kind:'hollowling',name:'Hollowling',x:285+i*22,y:315,radius:12,r:12,aggro:3,hp:42,maxHp:42,attackCooldown:20};
    configureEncounterEnemy(e,{id:'fixed-test',levels:[15,15]},e.id,{rank:'ordinary'});return e;
   });
   const aim={combatAimX:1,combatAimY:0,hasAim:true,ability0Held:true},now=performance.now()/1000+20;
   if(!useAbility(0,p,w,()=>{},now,aim))throw Error('Beam cast failed');
   const shieldedHit=mitigateSubclassDamage(p,null,100,now),initialHp=w.enemies[0].hp;let firstTick=0,ticks=0,time=0,lastHp=initialHp,hitCount=0,peakEffects=0;
   for(let frame=1;frame<=600&&w.enemies.some(e=>e.hp>0);frame++){
    time=frame/60;updateCombat(p,w,aim,1/60,now+time,()=>{});
    if(w.enemies[0].hp<lastHp){ticks++;firstTick||=lastHp-w.enemies[0].hp;}lastHp=w.enemies[0].hp;
    hitCount=Math.max(hitCount,w.enemies.filter(e=>e.hp<e.maxHp).length);
    for(const fx of w.effects)fx.age=(fx.age||0)+1/60;w.effects=w.effects.filter(fx=>fx.age<fx.ttl);peakEffects=Math.max(peakEffects,w.effects.length);
   }
   const ability=resolveSubclassAbility(p,id),ward=getSubclassCombatState(p).hostWard;
   return {playerLevel:33,enemyLevel:15,initialHp,firstTick,ticks,killSeconds:Number(time.toFixed(3)),hitCount,killed:w.enemies.filter(e=>e.hp<=0).length,shieldedHit,shield:ward?.reduction,baseCost:ability.cost,upkeep:ability.channelProfile.costPerSecond,peakEffects,masteryXp:getAbilityMastery(p,id).xp};
  });
  assert.equal(report.firstTick,25);assert.equal(report.killSeconds,2.4);assert.equal(report.killed,20);assert.equal(report.hitCount,20);
  assert.equal(report.shield,.25);assert.equal(report.shieldedHit,75);assert.equal(report.baseCost,2);assert.equal(report.upkeep,9);assert.equal(report.masteryXp,0);
  assert.deepEqual(errors,[]);assert.deepEqual(missing,[]);
  fs.mkdirSync('docs/damage-scaling',{recursive:true});fs.writeFileSync('docs/damage-scaling/browser-verification.json',JSON.stringify({pass:true,report,errors,missing},null,2)+'\n');
  console.log(JSON.stringify({pass:true,report,errors,missing}));
 }finally{await browser.close();}
})().catch(e=>{console.error(e);process.exitCode=1;});
