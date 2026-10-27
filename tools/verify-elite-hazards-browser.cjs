const {chromium}=require(process.env.RUNALIS_NODE_MODULES+'/playwright');
const fs=require('node:fs'),assert=require('node:assert/strict');
const folder='docs/elite-hazards';fs.mkdirSync(folder,{recursive:true});
(async()=>{
 const browser=await chromium.launch({channel:'msedge',headless:true});
 try{
  const page=await browser.newPage({viewport:{width:1200,height:950}}),errors=[],missing=[];page.on('pageerror',e=>errors.push(e.message));page.on('response',r=>{if(r.status()>=400)missing.push(r.url());});
  await page.goto('http://127.0.0.1:8768/enemy-combat-lab.html');await page.waitForFunction(()=>window.enemyCombatLab&&enemyCombatLab.spriteArtStatus().every(a=>a.ready||a.failed));
  const report={cases:[]};
  for(const scenario of ['freezer','waller','artillery','shocker','vortex','molten','bulwark','regenerator','waller+artillery','freezer+artillery','waller+freezer+artillery']){
   const result=await page.evaluate(async scenario=>{
    const a=enemyCombatLab;a.reset('elite:'+scenario+'@champion');a.setProtected(false);
    // Suppress ordinary AI to isolate modifier mechanics, retaining production
    // coordinator, damage/defenses, animation, collision and renderer.
    const {cancelEnemyAttackPresentation}=await import('/src/enemyAttackPresentation.js');
    const e=a.world.enemies[0];cancelEnemyAttackPresentation(e);e.telegraph=null;e.attackCooldown=e.specialCooldown=e.chargeCooldown=999;
    e.eliteAttackPauseTimer=999;const p=a.player;e.combatTargetKind='player';e.combatTargetId=p.id;p.hp=p.maxHp=2000;
    if(scenario==='molten'){p.x=e.x+25;}if(scenario==='regenerator')e.hp=e.maxHp*.4;
    if(scenario==='bulwark'){const {mitigateEliteHit}=await import('/src/eliteEncounterSystem.js');for(let i=0;i<400&&!a.hazards.length;i++){a.advance(1/60);if(e.eliteGuardActive)for(let j=0;j<3;j++)mitigateEliteHit(e,{x:e.x+e.eliteGuardX*50,y:e.y+e.eliteGuardY*50},10);}}
    else for(let i=0;i<600&&!a.hazards.length&&!e.eliteHealing;i++)a.advance(1/60);
    if(!a.hazards.length&&!e.eliteHealing)throw Error(scenario+' never activated');a.advance(.2);a.render();
    return {scenario,warning:a.hazards.map(h=>({kind:h.kind,radius:h.radius,danger:h.danger,tracking:h.tracking||0})),healing:!!e.eliteHealing};
   },scenario);
   await page.locator('#stage').screenshot({path:folder+'/'+scenario.replaceAll('+','-')+'-warning.png'});
   const after=await page.evaluate(scenario=>{
    const a=enemyCombatLab,seen=new Set(),startHp=a.player.hp;let frozen=false,peak=0,wall=false;
    for(let i=0;i<900;i++){if(scenario.includes('+'))a.player.hp=a.player.maxHp;a.advance(1/60);for(const h of a.hazards)seen.add(h.kind);frozen||=a.player.eliteFrozenUntil>a.time;wall||=!!a.world.encounterBarriers?.length;peak=Math.max(peak,a.hazards.length);if(scenario==='freezer'&&frozen||scenario==='waller'&&wall||['artillery','shocker'].includes(scenario)&&a.player.hp<startHp||scenario.includes('+')&&a.hazards.some(h=>h.kind==='artillery'&&h.age<h.warning)&&(!scenario.includes('waller')||a.world.encounterBarriers?.length)&&(!scenario.includes('freezer')||a.player.eliteFrozenUntil>a.time))break;}
    a.render();return {seen:[...seen],frozen,wall,peak,damage:scenario.includes('+')?null:startHp-a.player.hp,hp:a.player.hp,observerHealthReset:scenario.includes('+')};
   },scenario);
   await page.locator('#stage').screenshot({path:folder+'/'+scenario.replaceAll('+','-')+'-active.png'});report.cases.push({...result,...after});
  }
  report.dodge=await page.evaluate(async()=>{
   const a=enemyCombatLab;a.reset('elite:artillery@champion');a.setProtected(false);const e=a.world.enemies[0];const {cancelEnemyAttackPresentation}=await import('/src/enemyAttackPresentation.js');cancelEnemyAttackPresentation(e);e.telegraph=null;e.attackCooldown=e.specialCooldown=e.chargeCooldown=999;e.eliteAttackPauseTimer=999;e.combatTargetKind='player';e.combatTargetId=a.player.id;
   for(let i=0;i<600&&!a.hazards.length;i++)a.advance(1/60);const h=a.hazards[0],before=a.player.hp;while(h.warning-h.age>.085)a.advance(1/60);const lock={x:h.x,y:h.y},stamina=a.player.stamina;a.setInput({dashPressed:true,practiceMoveY:1});a.advance(1/60);while(!h.released)a.advance(1/60);return {hpBefore:before,hpAfter:a.player.hp,stamina:a.player.stamina,spentStamina:a.player.stamina<stamina,lockStable:lock.x===h.x&&lock.y===h.y};
  });assert.equal(report.dodge.hpAfter,report.dodge.hpBefore);assert(report.dodge.lockStable&&report.dodge.spentStamina);
  report.freezeEscape=await page.evaluate(async()=>{
   const a=enemyCombatLab;a.reset('elite:freezer@champion');a.setProtected(false);const e=a.world.enemies[0];const {cancelEnemyAttackPresentation}=await import('/src/enemyAttackPresentation.js');cancelEnemyAttackPresentation(e);e.telegraph=null;e.attackCooldown=e.specialCooldown=e.chargeCooldown=999;e.eliteAttackPauseTimer=999;a.player.hp=a.player.maxHp=2000;
   for(let i=0;i<700&&!(a.player.eliteFrozenUntil>a.time);i++)a.advance(1/60);if(!(a.player.eliteFrozenUntil>a.time))throw Error('No actual frozen state');const stamina=a.player.stamina;a.setInput({dashPressed:true,practiceMoveY:1});a.advance(1/60);return {thawed:!a.player.eliteFrozenUntil,spentStamina:a.player.stamina<stamina};
  });assert(report.freezeEscape.thawed&&report.freezeEscape.spentStamina);
  report.errors=errors;report.missing=missing;assert.deepEqual(errors,[]);assert.deepEqual(missing,[]);fs.writeFileSync(folder+'/browser-verification.json',JSON.stringify(report,null,2));console.log(JSON.stringify(report,null,2));
 }finally{await browser.close();}
})().catch(e=>{console.error(e);process.exitCode=1;});
