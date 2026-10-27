const {chromium}=require(process.env.RUNALIS_NODE_MODULES+'/playwright');
const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path');
const root=path.resolve('docs/enemy-combat');fs.mkdirSync(root,{recursive:true});
(async()=>{
 const browser=await chromium.launch({channel:'msedge',headless:true}),errors=[],failed=[],report={archetypes:[],bosses:[],elites:[],sequences:[]};
 const context=await browser.newContext({viewport:{width:1200,height:920},recordVideo:{dir:path.join(root,'footage'),size:{width:1200,height:920}}});
 try{
  const page=await context.newPage();page.on('pageerror',e=>errors.push(e.message));page.on('response',r=>{if(r.status()>=400)failed.push(r.url());});
  await page.goto('http://127.0.0.1:8768/enemy-combat-lab.html');await page.waitForFunction(()=>window.enemyCombatLab&&enemyCombatLab.spriteArtStatus().every(a=>a.ready||a.failed));
  assert.deepEqual(await page.evaluate(()=>enemyCombatLab.spriteArtStatus().filter(a=>a.failed)),[]);
  report.archetypes=await page.evaluate(async()=>{
   const {ENEMY_KINDS}=await import('/src/enemyVisualProfiles.js'),out=[];
   for(const kind of ENEMY_KINDS){const a=enemyCombatLab;a.reset(kind);if(['cultist','gravePriest'].includes(kind))a.world.enemies[0].specialCooldown=99;a.setProtected(false);a.advance(.05);const before=a.player.hp;a.advance(.08);const pose=a.poses[0];if(!pose)throw Error(kind+' has no preparation');if(a.player.hp!==before)throw Error(kind+' hit during preparation');a.advance(pose.windup-pose.elapsed+.03);if(!(a.player.hp<before))throw Error(kind+' release never hit');out.push({kind,windup:pose.windup,damage:before-a.player.hp});}
   enemyCombatLab.setProtected(true);return out;
  });
  async function capture(name){await page.evaluate(()=>enemyCombatLab.render());await page.locator('#stage').screenshot({path:path.join(root,name+'.png')});report.sequences.push(name);}
  for(const kind of ['roadlessBandit','brute','archer','cultist','wraith','exploder']){
   await page.evaluate(kind=>{const a=enemyCombatLab;a.reset(kind);a.advance(.18);},kind);await capture(kind+'-prepare');
   await page.evaluate(()=>{const a=enemyCombatLab,p=a.poses[0];a.advance(Math.max(.01,p.windup-p.elapsed+.025));});await capture(kind+'-release');
   await page.evaluate(()=>enemyCombatLab.advance(.2));await capture(kind+'-recover');
  }
  await page.evaluate(()=>{const a=enemyCombatLab;a.reset('roadlessBandit');a.setProtected(false);a.advance(.37);});await capture('unprotected-melee-contact');
  await page.evaluate(()=>{const a=enemyCombatLab;a.setProtected(true);a.reset('cultist');a.world.enemies[0].specialCooldown=99;a.advance(.22);});await capture('curse-bolt-prepare');
  await page.evaluate(()=>{const a=enemyCombatLab;a.advance(a.poses[0].windup-a.poses[0].elapsed+.025);});await capture('curse-bolt-release');
  for(const name of ['Veyr Warden','Blighted Elk','Malakar','Seraphel','Zephyr Light','Last Dawn Executioner','Grave-Maw Bear','Briar Titan']){
   await page.evaluate(name=>{const a=enemyCombatLab;a.reset('identity:'+name);a.advance(.2);},name);const pending=await page.evaluate(()=>enemyCombatLab.world.enemies[0].boss.pendingSpecial);assert(pending,name);
   const file=name.toLowerCase().replace(/[^a-z]+/g,'-');await capture(file+'-prepare');
   await page.evaluate(()=>{const a=enemyCombatLab;a.advance(a.world.enemies[0].boss.pendingSpecial.time+.025);});await capture(file+'-release');report.bosses.push({name,warningRadius:pending.radius,windup:pending.maxTime});
  }
  for(const id of ['waller','shocker','freezer','molten','vortex','artillery','bulwark','regenerator']){
   await page.evaluate(async id=>{const a=enemyCombatLab;a.reset('elite:'+id);a.advance(1/60);const e=a.world.enemies[0];const {cancelEnemyAttackPresentation}=await import('/src/enemyAttackPresentation.js');cancelEnemyAttackPresentation(e);e.telegraph=null;e.eliteAttackPauseTimer=9999;e.attackCooldown=e.specialCooldown=e.chargeCooldown=99;},id);
   let state;for(let t=0;t<7;t+=.1){state=await page.evaluate(()=>{const a=enemyCombatLab;a.advance(.1);return {hazard:a.hazards[0]&&{kind:a.hazards[0].kind,warning:a.hazards[0].warning,age:a.hazards[0].age},healing:a.world.enemies[0].eliteHealing,guard:a.world.enemies[0].eliteGuardActive};});if(state.hazard||state.healing||id==='bulwark'&&state.guard)break;}
   assert(state.hazard||state.healing||state.guard,id+' never presented');await capture(id+'-prepare');
   if(state.hazard)await page.evaluate(()=>{const a=enemyCombatLab,h=a.hazards[0];a.advance(h.warning-h.age+.05);});else await page.evaluate(()=>enemyCombatLab.advance(.5));
   await capture(id+'-release');report.elites.push({id,...state});
  }
  report.charge=await page.evaluate(()=>{const a=enemyCombatLab;a.reset('brute');const e=a.world.enemies[0];Object.assign(e,{x:390,dungeonEnemy:true});a.advance(.2);return {tell:e.telegraph?.kind,source:e.x,windup:e.telegraph?.time};});assert.equal(report.charge.tell,'chargeRush');await capture('charge-prepare');
  await page.evaluate(()=>{const a=enemyCombatLab,e=a.world.enemies[0];a.advance(e.telegraph.time+.04);});await capture('charge-travel');
  await page.evaluate(()=>enemyCombatLab.advance(.25));await capture('charge-contact');
  report.playerImpact=await page.evaluate(()=>{const a=enemyCombatLab;a.reset('roadlessBandit');const e=a.world.enemies[0];e.attackCooldown=99;a.strike();for(let t=0;t<2;t+=1/60){a.advance(1/60);if(e.hp<e.maxHp)break;}return {damage:e.maxHp-e.hp,contacts:a.world.effects.filter(f=>f.kind==='enemyContactImpact').length};});assert(report.playerImpact.damage>0&&report.playerImpact.contacts>0);await capture('light-contact');
  report.heavyImpact=await page.evaluate(()=>{const a=enemyCombatLab;a.advance(.6);const e=a.world.enemies[0],hp=e.hp;a.strike(true);for(let t=0;t<2;t+=1/60){a.advance(1/60);if(e.hp<hp)break;}return {damage:hp-e.hp,heavyContacts:a.world.effects.filter(f=>f.kind==='enemyContactImpact'&&f.heavy).length};});assert(report.heavyImpact.damage>0&&report.heavyImpact.heavyContacts>0);await capture('heavy-contact');
  await page.evaluate(()=>{const a=enemyCombatLab;a.reset('gravebound');const e=a.world.enemies[0];e.hp=1;e.attackCooldown=e.specialCooldown=99;a.strike(true);for(let t=0;t<2;t+=1/60){a.advance(1/60);if(e.hp<=0)break;}a.advance(1/60);});await capture('skeletal-death');
  report.dense=await page.evaluate(()=>{const a=enemyCombatLab;a.reset('pack');a.setProtected(true);return a.benchmark(240);});
  report.nameplates=await page.evaluate(async()=>{
   const a=enemyCombatLab,ctx=document.querySelector('#stage').getContext('2d'),painted=[],original=ctx.fillText;
   ctx.fillText=function(text,x,y,...args){if(String(text).includes(' · Lv ')&&['#ff7777','#a9d7a8'].includes(this.fillStyle))painted.push({text,left:x-this.measureText(text).width/2,right:x+this.measureText(text).width/2,top:y-11,bottom:y+2});return original.call(this,text,x,y,...args);};
   try{a.render();}finally{ctx.fillText=original;}
   for(let i=0;i<painted.length;i++)for(let j=0;j<i;j++){const p=painted[i],q=painted[j];if(p.left<q.right&&p.right>q.left&&p.top<q.bottom&&p.bottom>q.top)throw Error('Overlapping enemy labels: '+p.text+' / '+q.text);}
   const {selectEnemyNameplates}=await import('/src/render.js'),base=a.world.enemies.find(e=>!e.dead&&e.hp>0),normal={...base,isBoss:false,worldBoss:false,bossType:null,elite:false,eliteModifier:null,isElite:false,eliteModifiers:[],x:500,y:400},elite={...normal,elite:true,name:'Priority elite'},boss={...normal,isBoss:true,name:'Priority boss'};
   const chosen=selectEnemyNameplates(ctx,[normal,elite,boss],{x:0,y:0});if(!chosen.has(boss)||chosen.has(normal)||chosen.has(elite))throw Error('Boss label priority lost');if(normal.hideEnemyNameplate)throw Error('Display filtering mutated enemy');
   return {actors:a.world.enemies.length,visible:painted.length,noOverlap:true,bossPriority:true};
  });await capture('mixed-combat');
  report.stress=await page.evaluate(()=>{const a=enemyCombatLab;a.spawnPack(80);a.setProtected(true);return a.benchmark(240);});
  // Real keyboard input exercises the same production weapon/AI loop between captures.
  await page.evaluate(()=>{enemyCombatLab.reset('roadlessBandit');enemyCombatLab.setPaused(false);});await page.keyboard.press('Space');await page.waitForTimeout(900);await page.keyboard.down('Space');await page.waitForTimeout(650);await page.keyboard.up('Space');await page.waitForTimeout(1000);await page.keyboard.press('Shift');await page.waitForTimeout(500);await page.evaluate(()=>enemyCombatLab.setPaused(true));
  report.assets=await page.evaluate(()=>enemyCombatLab.spriteArtStatus().filter(a=>a.ready).length);report.errors=errors;report.failedRequests=failed;assert.deepEqual(errors,[]);assert.deepEqual(failed,[]);
  fs.writeFileSync(path.join(root,'browser-checks.json'),JSON.stringify(report,null,2));
  const video=page.video();await context.close();const recorded=await video.path();report.video=path.join(root,'combat-review.webm');fs.copyFileSync(recorded,report.video);fs.writeFileSync(path.join(root,'browser-checks.json'),JSON.stringify(report,null,2));
  console.log(JSON.stringify({archetypes:report.archetypes.length,bosses:report.bosses.length,elites:report.elites.length,frames:report.sequences.length,dense:report.dense,assets:report.assets,errors:report.errors,video:report.video},null,2));
 }finally{await context.close();await browser.close();}
})().catch(e=>{console.error(e);process.exit(1);});
