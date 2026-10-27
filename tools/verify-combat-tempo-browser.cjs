const {chromium}=require(process.env.RUNALIS_NODE_MODULES+'/playwright');
const fs=require('node:fs'),assert=require('node:assert/strict');
(async()=>{
 const out='docs/combat-tempo',browser=await chromium.launch({channel:'msedge',headless:true}),errors=[],missing=[],cases=[];
 try {
  const page=await browser.newPage({viewport:{width:1440,height:1000}});
  page.on('pageerror',e=>errors.push(e.message));page.on('response',r=>{if(r.status()>=400)missing.push(r.url());});
  await page.goto('http://127.0.0.1:8768/combat-overhaul-lab.html?skill=thornbinderThornLash&morph=petalknight');
  await page.waitForFunction(()=>window.combatReview?.game?.player);
  await page.evaluate(async()=>{const art=await import('/src/spriteArt.js');for(let i=0;i<100&&!art.spriteArtStatus().every(a=>a.ready||a.failed);i++)await new Promise(r=>setTimeout(r,25));});
  for(const scenario of [
   {id:'thornbinderThornLash',classId:'thornbinder',family:'petalknight',charge:true},
   {id:'hydromancerWaterTorrent',classId:'waverider',family:'base',charge:true},
   {id:'fellhunterVaultingShot',classId:'fellhunter',family:'hellstalker',uses:3},
   {id:'oathkeeperDivineLeap',classId:'oathkeeper',family:'holyknight',uses:2}
  ]) {
   const result=await page.evaluate(async scenario=>{
    const r=combatReview;r.reset(scenario.classId);document.querySelector('#slot').value='0';
    const {useAbility,updateAbilityInput,updateCombat}=await import('/src/combat.js'),{selectAbilityMorph}=await import('/src/abilityMorphSystem.js'),
      {resolveSubclassAbility}=await import('/src/subclassVariants.js'),{applyAbilityMastery}=await import('/src/abilityMasterySystem.js'),
      {getAbilityUseChargeState}=await import('/src/abilityChargeSystem.js');
    const p=r.game.player,w=r.game.world;Object.assign(p,{x:400,y:400,dirX:1,dirY:0,spiritAwakened:true});
    if(scenario.classId==='oathkeeper')p.equipment.weapon='oathkeepersMace';if(scenario.classId==='fellhunter')p.equipment.weapon='hunterBow';
    r.game.dev.equip([scenario.id,null,null,null,'block']);r.game.dev.setMastery(scenario.id,20);
    let now=100;Object.defineProperty(performance,'now',{value:()=>now*1000,configurable:true});updateCombat(p,w,{},0,now,()=>{});
    p.maxStamina=p.stamina=p.maxSpirit=p.spirit=10000;
    if(scenario.family!=='base'&&!selectAbilityMorph(p,scenario.id,scenario.family,now).ok)throw Error('Morph selection');
    const a=applyAbilityMastery(p,resolveSubclassAbility(p,scenario.id)),base=w.enemies[0];
    w.enemies=Array.from({length:16},(_,i)=>({...base,id:'tempo'+i,x:530+(i%4-1)*16,y:400+Math.floor(i/4)*16,hp:1e7,maxHp:1e7,isBoss:false,isElite:false,dead:false}));
    const input={combatAimX:1,combatAimY:0,hasAim:true,ability0Held:true},before=w.enemies.map(e=>({x:e.x,y:e.y}));let chargeTime=null;
    if(scenario.charge) {
      if(!updateAbilityInput(p,w,{...input,ability0Pressed:true},0,now,()=>{}))throw Error('Begin charge');
      chargeTime=p.abilityCharge.maxChargeTime;now+=chargeTime*.8;
      updateAbilityInput(p,w,input,chargeTime*.8,now,()=>{});if(p.abilityCharge.level!==2)throw Error('Full charge not reached');
      if(!updateAbilityInput(p,w,{...input,ability0Held:false,ability0Released:true},0,now,()=>{}))throw Error('Release');
    }else for(let i=0;i<scenario.uses;i++)if(!useAbility(0,p,w,()=>{},now,input))throw Error('Movement use '+i);
    const exhausted=scenario.uses?!useAbility(0,p,w,()=>{},now,input):null;
    for(let i=0;i<5;i++){now+=.02;updateCombat(p,w,input,.02,now,()=>{});for(const fx of w.effects)fx.age+=.02;w.effects=w.effects.filter(f=>f.age<f.ttl);}
    r.draw(now);r.renderHud();const charge=getAbilityUseChargeState(p,a,now);
    return {id:scenario.id,family:scenario.family,name:a.name,enemies:16,damaged:w.enemies.filter(e=>e.hp<e.maxHp).length,
      pushed:w.enemies.filter((e,i)=>Math.hypot(e.x-before[i].x,e.y-before[i].y)>1).length,
      chargeTime,charges:charge.charges,maxCharges:charge.maxCharges,exhausted,
      finite:w.enemies.every(e=>[e.x,e.y,e.hp].every(Number.isFinite)),effects:w.effects.length,
      picture:document.querySelector('#arena').toDataURL('image/png')};
   },scenario);
   assert(result.finite);if(scenario.charge)assert(result.damaged>0);if(scenario.id==='thornbinderThornLash')assert.equal(result.pushed,16);
   if(scenario.uses){assert(result.exhausted);assert.equal(result.charges,0);assert.equal(result.maxCharges,scenario.uses);}
   fs.writeFileSync(`${out}/${scenario.id}.png`,Buffer.from(result.picture.split(',')[1],'base64'));delete result.picture;cases.push(result);
  }
  assert.deepEqual(errors,[]);assert.deepEqual(missing,[]);
  fs.writeFileSync(out+'/browser-verification.json',JSON.stringify({cases,errors,missing},null,2));console.log(JSON.stringify({cases,errors,missing}));
 }finally {await browser.close();}
})().catch(e=>{console.error(e);process.exitCode=1;});
