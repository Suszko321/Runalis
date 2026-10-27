const {chromium}=require(process.env.RUNALIS_NODE_MODULES+'/playwright');
const fs=require('node:fs'),assert=require('node:assert/strict');
(async()=>{
 const browser=await chromium.launch({channel:'msedge',headless:true});
 try{
  const page=await browser.newPage({viewport:{width:1300,height:950}}),errors=[],missing=[];
  page.on('pageerror',e=>errors.push(e.message));page.on('response',r=>{if(r.status()>=400)missing.push(r.url());});
  await page.goto('http://127.0.0.1:8768/combat-overhaul-lab.html?skill=waveriderMaelstrom&morph=sunken');
  await page.waitForFunction(()=>window.combatReview?.game?.player?.abilityMorphs?.waveriderMaelstrom==='sunken');
  await page.evaluate(async()=>{const {spriteArtStatus}=await import('/src/spriteArt.js');for(let i=0;i<100&&!spriteArtStatus().every(s=>s.ready||s.failed);i++)await new Promise(r=>setTimeout(r,30));});
  const ids=await page.evaluate(async()=>{const {ABILITIES}=await import('/src/data.js');return ABILITIES.filter(a=>a.classId==='waverider').map(a=>a.id);});
  fs.mkdirSync('docs/waverider-sunken',{recursive:true});const skills=[];
  for(const id of ids){
   const result=await page.evaluate(async id=>{
    const r=combatReview;r.reset('waverider');const {selectAbilityMorph,getAbilityMorphOptions}=await import('/src/abilityMorphSystem.js'),{useAbility,updateCombat}=await import('/src/combat.js');
    const p=r.game.player,w=r.game.world;r.game.dev.equip([id,null,null,null,'block']);r.game.dev.setMastery(id,20);updateCombat(p,w,{},0,100,()=>{});p.maxSpirit=p.spirit=10000;p.maxStamina=p.stamina=10000;p.hp=p.maxHp*.5;
    Object.defineProperty(performance,'now',{value:()=>100000,configurable:true});selectAbilityMorph(p,id,'sunken',100);
    for(const [i,e] of w.enemies.entries()){e.x=390+i*70;e.y=320+i*45;e.hp=e.maxHp=100000;e.isBoss=true;}
    const input={combatAimX:1,combatAimY:0,hasAim:true,ability0Held:true},spirit=p.spirit;
    if(!useAbility(0,p,w,()=>{},100,input))throw Error('Failed cast '+id);
    for(let i=1;i<=8;i++){Object.defineProperty(performance,'now',{value:()=>(100+i*.025)*1000,configurable:true});updateCombat(p,w,input,.025,100+i*.025,()=>{});for(const f of w.effects)f.age+=.025;w.effects=w.effects.filter(f=>f.age<f.ttl);}
    r.draw(100.2);r.renderHud();const fx=w.effects.filter(f=>f.kind==='sunkenSkill');if(!fx.length)throw Error('Missing effects '+id);if(id==='waveriderMaelstrom'&&!fx.some(f=>f.phase==='active'&&f.radius>=205))throw Error('Missing enlarged active vortex');
    return {id,order:getAbilityMorphOptions(p,id).map(o=>({id:o.id,mastery:o.requiredMastery})),effects:fx.map(f=>f.profile),spiritCost:spirit-p.spirit,channel:p.activeChannel?.abilityId||null};
   },id);skills.push(result);await page.locator('#arena').screenshot({path:`docs/waverider-sunken/${id}.png`});
  }
  await page.evaluate(async()=>{
   const r=combatReview;r.reset('waverider');const {useAbility,updateCombat}=await import('/src/combat.js');r.game.dev.equip(['waveriderMaelstrom',null,null,null,'block']);r.game.player.spirit=1000;
   const p=r.game.player,w=r.game.world;for(const e of w.enemies){e.hp=e.maxHp=100000;e.isBoss=true;}useAbility(0,p,w,()=>{},100,{combatAimX:1,combatAimY:0,hasAim:true});
   for(let i=1;i<=8;i++){updateCombat(p,w,{ability0Held:true,combatAimX:1,combatAimY:0,hasAim:true},.025,100+i*.025,()=>{});for(const f of w.effects)f.age+=.025;}r.draw(100.2);
  });await page.locator('#arena').screenshot({path:'docs/waverider-sunken/standard-maelstrom.png'});
  const burn=await page.evaluate(async()=>{
   const r=combatReview;r.reset('waverider');const {selectAbilityMorph}=await import('/src/abilityMorphSystem.js'),{useAbility,updateCombat}=await import('/src/combat.js'),{getSunkenPressureState}=await import('/src/sunkenPressureSystem.js');
   const p=r.game.player,w=r.game.world;r.game.dev.equip(['hydromancerWaterTorrent',null,null,null,'block']);r.game.dev.setMastery('hydromancerWaterTorrent',20);selectAbilityMorph(p,'hydromancerWaterTorrent','sunken',100);for(const e of w.enemies){e.hp=e.maxHp=100000;e.x=410;e.y=320;e.isBoss=true;}w.enemies=w.enemies.slice(0,1);
   for(let i=0;i<440;i++){const now=100+i*.05;Object.defineProperty(performance,'now',{value:()=>now*1000,configurable:true});p.spirit=1000;
    if(i%36===0){p.cooldowns={};p.abilityUseCharges={};if(!useAbility(0,p,w,()=>{},now,{combatAimX:1,combatAimY:0,hasAim:true}))throw Error('Pressure cast failed');}
    updateCombat(p,w,{combatAimX:1,combatAimY:0,hasAim:true},.05,now,()=>{});for(const f of w.effects)f.age+=.05;w.effects=w.effects.filter(f=>f.age<f.ttl);
   }
   for(let i=0;i<10;i++){const now=122+i*.05;Object.defineProperty(performance,'now',{value:()=>now*1000,configurable:true});updateCombat(p,w,{},.05,now,()=>{});for(const f of w.effects)f.age+=.05;w.effects=w.effects.filter(f=>f.age<f.ttl);}
   const depth=getSunkenPressureState(p).targets.get(w.enemies[0]).depth;r.draw(122.5);return {depth,healthLost:100000-w.enemies[0].hp};
  });assert.equal(burn.depth,1);await page.locator('#arena').screenshot({path:'docs/waverider-sunken/full-depth-burn.png'});
  const rendering=await page.evaluate(()=>{const samples=[];for(let i=0;i<60;i++){const start=Date.now();combatReview.draw(122.5);samples.push(Date.now()-start);}samples.sort((a,b)=>a-b);return {frames:60,medianMs:samples[30],p95Ms:samples[57],scope:'One Sunken practice scene; not campaign performance'};});
  assert.deepEqual(errors,[]);assert.deepEqual(missing,[]);fs.writeFileSync('docs/waverider-sunken/browser-verification.json',JSON.stringify({skills,burn,rendering,errors,missing},null,2));console.log(JSON.stringify({skills:skills.length,burn,rendering,errors,missing}));
 }finally{await browser.close();}
})().catch(e=>{console.error(e);process.exitCode=1;});
