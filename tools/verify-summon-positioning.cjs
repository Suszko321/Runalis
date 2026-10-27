const {chromium}=require(process.env.RUNALIS_NODE_MODULES+'/playwright');
const assert=require('node:assert/strict'),fs=require('node:fs');
(async()=>{
 const browser=await chromium.launch({channel:'msedge',headless:true}),errors=[],missing=[],cases=[];fs.mkdirSync('docs/summon-positioning',{recursive:true});
 try{
  const page=await browser.newPage({viewport:{width:1200,height:900}});page.on('pageerror',e=>errors.push(e.message));page.on('response',r=>{if(r.status()>=400)missing.push(r.url());});
  await page.goto('http://127.0.0.1:8768/combat-overhaul-lab.html?skill=gravecallerSummonLich&morph=acolyte');await page.waitForFunction(()=>window.combatReview?.game?.player);
  await page.evaluate(async()=>{window.spriteReview=await import('/src/spriteArt.js');});await page.waitForFunction(()=>['lich-acolyte','lich-deathknight','bound-dead-specter','bound-dead-knight','summons-core'].every(n=>spriteReview.asset(n)?.ready));
  for(const scenario of ['two-abilities','following','pharaoh','specter','lich','goliaths','wall']){
   const report=await page.evaluate(async scenario=>{
    const {createPlayer,chooseClass,migratePlayer}=await import('/src/player.js'),{spendSkillTreeNode}=await import('/src/skillTreeSystem.js'),{unlockActiveAbility,assignAbilityToSlot}=await import('/src/abilityLoadoutSystem.js'),{getAbilityMastery}=await import('/src/abilityMasterySystem.js'),{selectAbilityMorph}=await import('/src/abilityMorphSystem.js'),{useAbility,updateSummons}=await import('/src/combat.js');
    const g=combatReview.game;g.paused=true;g.player=createPlayer('Formation reviewer');const p=g.player,w=g.world;chooseClass(p,'gravecaller');Object.assign(p,{id:'formation-review',x:400,y:330,dirX:1,dirY:0,spiritAwakened:true});p.equipment.weapon='demonseedScythe';p.skillTree.bloodlineBonusPoints=100;for(const s of Object.values(p.skillState.skills))s.level=50;
    for(const id of ['spirit_root','spirit_harvest','spirit_minions','spirit_lich_ascension'])if(!spendSkillTreeNode(p,id).ok)throw Error('Node failed '+id);migratePlayer(p);p.maxSpirit=p.spirit=1000;w.enemies=[];w.effects=[];
    for(const id of ['summonWolf','summonDemon'])unlockActiveAbility(p,id);
    const ids=scenario==='two-abilities'?['summonLich','gravecallerSummonLich']:['summonLich','gravecallerSummonLich','summonWolf','summonDemon'],greaterMorph=scenario==='specter'?'acolyte':scenario==='lich'?'base':scenario==='goliaths'?'deathknight':'acolyte';
    for(const [slot,id] of ids.entries()){
     assignAbilityToSlot(p,slot,id);getAbilityMastery(p,id,true).level=20;selectAbilityMorph(p,id,id==='gravecallerSummonLich'?greaterMorph:id==='summonLich'&&scenario==='goliaths'?'deathknight':'base');if(!useAbility(slot,p,w,()=>{},performance.now()/1000))throw Error('Cast failed '+id);
    }
    const t=performance.now()/1000,mage=p.summons.find(s=>s.kind==='greaterLich');let before=0;
    if(!['two-abilities','following','wall'].includes(scenario)){
     mage.x=440;mage.y=330;w.enemies=[{id:'threat',kind:'rat',name:'Target',x:475,y:330,hp:100000,maxHp:100000,radius:12,aggro:3,combatTargetKind:'summon',combatTargetId:mage.id}];before=35;
    }
    if(scenario==='wall'){
     p.x=690;p.y=490;p.summons.forEach(s=>{s.x=690;s.y=490;});
    }
    const started=performance.now();for(let i=0;i<240;i++){updateSummons(1/60,p,w,()=>{},t+i/60);for(const f of w.effects)f.age=(f.age||0)+1/60;w.effects=w.effects.filter(f=>(f.age||0)<f.ttl);}
    const elapsedMs=performance.now()-started;p.visualAction=null;p.abilityCharge=null;combatReview.draw();
    let minGap=Infinity;for(let i=0;i<p.summons.length;i++)for(let j=0;j<i;j++)minGap=Math.min(minGap,Math.hypot(p.summons[i].x-p.summons[j].x,p.summons[i].y-p.summons[j].y));
    return {scenario,count:p.summons.length,minGap,elapsedMs,positions:p.summons.map(s=>({name:s.displayName,x:s.x,y:s.y})),casterGap:w.enemies[0]?Math.hypot(mage.x-w.enemies[0].x,mage.y-w.enemies[0].y):null,before,damage:w.enemies[0]?100000-w.enemies[0].hp:0};
   },scenario);
   assert.equal(report.count,scenario==='two-abilities'?2:4);assert.ok(report.minGap>=29,JSON.stringify(report));if(['pharaoh','specter','lich'].includes(scenario)){assert.ok(report.casterGap>110);assert.ok(report.damage>0);}if(scenario==='goliaths')assert.ok(report.casterGap<75&&report.damage>0);cases.push(report);await page.locator('#arena').screenshot({path:`docs/summon-positioning/${scenario}.png`});
  }
  assert.deepEqual(errors,[]);assert.deepEqual(missing,[]);fs.writeFileSync('docs/summon-positioning/browser-verification.json',JSON.stringify({pass:true,cases,errors,missing},null,2)+'\n');console.log(JSON.stringify({pass:true,cases,errors,missing},null,2));
 }finally{await browser.close();}
})().catch(e=>{console.error(e);process.exitCode=1;});
