const {chromium}=require(process.env.RUNALIS_NODE_MODULES+'/playwright');
const fs=require('node:fs'),assert=require('node:assert/strict');
(async()=>{
 const browser=await chromium.launch({channel:'msedge',headless:true});
 try{
  const page=await browser.newPage({viewport:{width:1360,height:950}}),errors=[],missing=[];page.on('pageerror',e=>errors.push(e.message));page.on('response',r=>{if(r.status()>=400)missing.push(r.url());});
  await page.goto('http://127.0.0.1:8768/docs/elite-visual-cues/');await page.waitForFunction(()=>document.querySelectorAll('article').length===12);
  const images=async()=>page.evaluate(async()=>{for(const i of document.images){i.loading='eager';await i.decode();}return [...document.images].map(i=>({source:i.getAttribute('src'),width:i.naturalWidth}));});
  const warnings=await images();assert.equal(warnings.length,12);assert(warnings.every(i=>i.width>=1120&&i.width<=1124),'Full-size captured effects must load, including the canvas border');
  const audio=await page.evaluate(async()=>Promise.all([...document.querySelectorAll('audio')].map(a=>new Promise((resolve,reject)=>{a.onloadedmetadata=()=>resolve({source:a.getAttribute('src'),duration:a.duration});a.onerror=()=>reject(Error(a.src));a.load();}))));assert.equal(audio.length,12);assert(audio.every(a=>Math.abs(a.duration-1)<.01));
  await page.screenshot({path:'docs/elite-visual-cues/field-guide.png',fullPage:true});await page.getByRole('button',{name:'At impact'}).click();const impacts=await images();assert(impacts.every(i=>i.source.endsWith('-impact.png')));
  await page.setViewportSize({width:600,height:850});await page.screenshot({path:'docs/elite-visual-cues/field-guide-small.png',fullPage:true});
  await page.setViewportSize({width:1200,height:930});await page.goto('http://127.0.0.1:8768/enemy-combat-lab.html');await page.waitForFunction(()=>window.enemyCombatLab&&enemyCombatLab.spriteArtStatus().every(a=>a.ready||a.failed));
  const healingWarning=await page.evaluate(async()=>{
   const a=enemyCombatLab,{getEliteStatePresentation}=await import('/src/eliteEncounterSystem.js');a.reset('elite:regenerator@champion');a.setProtected(true);const e=a.world.enemies[0];e.hp=e.maxHp*.4;e.attackCooldown=e.specialCooldown=e.chargeCooldown=999;e.eliteAttackPauseTimer=999;
   for(let i=0;i<600&&!e.eliteHealing;i++)a.advance(1/60);if(!e.eliteHealing)throw Error('No healing chant');e.subclassSilencedUntil=performance.now()/1000+100;e.rootUntil=performance.now()/1000+100;e.staggerTimer=100;a.player.x=e.x+20;a.advance(.2);if(!e.eliteHealing)throw Error('Control or proximity cancelled the chant');a.render();return {continuedThroughControl:true};
  });await page.locator('#stage').screenshot({path:'docs/elite-visual-cues/regenerator-warning.png'});
  const healingRelease=await page.evaluate(async()=>{const a=enemyCombatLab,{getEliteStatePresentation}=await import('/src/eliteEncounterSystem.js');const e=a.world.enemies[0];while(e.eliteHealing)a.advance(1/60);a.advance(.1);const state=getEliteStatePresentation(e);if(!state.healReleased)throw Error('Missing visible completion bloom');a.render();return {released:true,progress:state.healReleaseProgress};});await page.locator('#stage').screenshot({path:'docs/elite-visual-cues/regenerator-impact.png'});
  healingRelease.expired=await page.evaluate(async()=>{const a=enemyCombatLab,{getEliteStatePresentation}=await import('/src/eliteEncounterSystem.js');a.advance(.5);return !getEliteStatePresentation(a.world.enemies[0]).healReleased;});assert(healingRelease.expired);
  const noInterrupts=await page.evaluate(async()=>{
   const {mitigateEliteHit}=await import('/src/eliteEncounterSystem.js'),a=enemyCombatLab,cases=[];
   for(const mod of ['waller','shocker','freezer','molten','vortex','artillery','bulwark','regenerator'])for(const control of ['root','rootTimer','stagger','freeze','silence']){
    a.reset('elite:'+mod+'@champion');a.setProtected(true);const e=a.world.enemies[0];e.attackCooldown=e.specialCooldown=e.chargeCooldown=999;
    if(mod==='regenerator'){e.hp=e.maxHp*.4;a.player.x=e.x-20;}
    if(control==='root')e.rootUntil=a.time+20;if(control==='rootTimer')e.rootTimer=20;if(control==='stagger')e.staggerTimer=20;if(control==='freeze')e.subclassFrozenUntil=a.time+20;if(control==='silence')e.subclassSilencedUntil=a.time+20;
    let h;for(let i=0;i<720;i++){
     a.step(1/60);if(mod==='bulwark'&&e.eliteGuardActive)for(let j=0;j<3;j++)mitigateEliteHit(e,{x:e.x+e.eliteGuardX*50,y:e.y+e.eliteGuardY*50},10);
     h=a.hazards.find(h=>h.kind===mod);if(h||e.eliteHealing)break;
    }
    if(mod==='regenerator'){
     if(!e.eliteHealing)throw Error('Control prevented heal: '+control);const hp=e.hp;mitigateEliteHit(e,a.player,e.maxHp*.02,{heavy:true});a.advance(2);if(e.hp<=hp)throw Error('Control cancelled heal: '+control);
    }else{
     if(!h)throw Error('Control prevented '+mod+': '+control);while(h.age<h.warning+.1)a.step(1/60);if(h.cancelled||!a.hazards.includes(h))throw Error('Control cancelled '+mod+': '+control);
    }
    e.hp=0;e.dead=true;a.step(1/60);if(a.hazards.some(h=>h.owner===e&&h.kind!=='moltenDeath')||a.world.encounterBarriers.length||e.eliteHealing)throw Error('Death failed cleanup: '+mod);
    cases.push({modifier:mod,control,completed:true,deathCleanup:true});
   }
   return {cases:cases.length,results:cases,scope:'Actual combat lab updateCombat and updateEnemies, not isolated coordinator updates'};
  });
  assert.deepEqual(errors,[]);assert.deepEqual(missing,[]);const report={cards:12,warningImages:warnings.length,impactImages:impacts.length,audioExamples:audio,healingWarning,healingRelease,noInterrupts,errors,missing};fs.writeFileSync('docs/elite-visual-cues/field-guide-verification.json',JSON.stringify(report,null,2));console.log(JSON.stringify({cards:12,audio:12,healingWarning,healingRelease,noInterruptCases:noInterrupts.cases,errors,missing}));
 }finally{await browser.close();}
})().catch(e=>{console.error(e);process.exitCode=1;});
