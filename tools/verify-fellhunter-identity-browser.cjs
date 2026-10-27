const {chromium}=require(process.env.RUNALIS_NODE_MODULES+'/playwright'),fs=require('node:fs'),assert=require('node:assert/strict');
(async()=>{const out='docs/fellhunter-identity',browser=await chromium.launch({channel:'msedge',headless:true}),errors=[],missing=[],casts=[];fs.mkdirSync(out,{recursive:true});try{
 const page=await browser.newPage({viewport:{width:1440,height:1050}});page.on('pageerror',e=>errors.push(e.message));page.on('response',r=>{if(r.status()>=400)missing.push(r.url());});
 await page.goto('http://127.0.0.1:8768/combat-overhaul-lab.html?skill=fellhunterPracticalStrike&morph=hellstalker&weapon=hunterBow');await page.waitForFunction(()=>window.combatReview?.game?.player?.classId==='fellhunter');
 const ids=await page.evaluate(async()=>{const art=await import('/src/spriteArt.js');for(let i=0;i<100&&!art.spriteArtStatus().every(a=>a.ready||a.failed);i++)await new Promise(r=>setTimeout(r,25));return (await import('/src/data.js')).ABILITIES.filter(a=>a.classId==='fellhunter').map(a=>a.id);});
 for(const family of ['bloodhound','hellstalker'])for(const id of ids){
  const data=await page.evaluate(async({id,family})=>{
   const r=combatReview;r.reset('fellhunter');document.querySelector('#slot').value='0';const {selectAbilityMorph}=await import('/src/abilityMorphSystem.js'),{resolveSubclassAbility}=await import('/src/subclassVariants.js'),{updateCombat,useAbility}=await import('/src/combat.js'),{getSubclassCombatState}=await import('/src/subclassCombat.js');
   const p=r.game.player,w=r.game.world;p.equipment.weapon='hunterBow';p.spiritAwakened=true;r.game.dev.equip([id,null,null,null,'block']);r.game.dev.setMastery(id,20);
   let now=100;Object.defineProperty(performance,'now',{value:()=>now*1000,configurable:true});updateCombat(p,w,{},0,now,()=>{});p.maxSpirit=p.spirit=p.maxStamina=p.stamina=10000;
   if(!selectAbilityMorph(p,id,family,now).ok)throw Error('Select '+id);for(const[i,e]of w.enemies.entries()){e.x=p.x+165+i%3*24;e.y=p.y+Math.floor(i/3)*20;e.hp=e.maxHp=1e6;e.isBoss=false;}
   const a=resolveSubclassAbility(p,id),input={combatAimX:1,combatAimY:0,hasAim:true,ability0Held:true};if(!useAbility(0,p,w,()=>{},now,input))throw Error('Cast '+id);
   const seen=new Set(w.effects.map(f=>f.geometry).filter(Boolean)),field=getSubclassCombatState(p)?.fields[0];
   if(field)for(const[i,e]of w.enemies.entries()){e.x=field.x+i*18;e.y=field.y+(i%2)*12;}
   const duration=a.hellDelay?.48:['bolt','pierce'].includes(a.subclassMode)?.08:a.subclassMode==='field'?.48:a.subclassMode==='trap'?.3:.14;
   for(let elapsed=.02;elapsed<=duration+.001;elapsed+=.02){now=100+elapsed;updateCombat(p,w,input,.02,now,()=>{});for(const f of w.effects){if(f.geometry)seen.add(f.geometry);f.age+=.02;}w.effects=w.effects.filter(f=>f.age<f.ttl);}
   r.draw(now);r.renderHud();return {id,family,name:a.name,description:a.desc,geometries:[...seen],picture:document.querySelector('#arena').toDataURL('image/png')};
  },{id,family});
  fs.writeFileSync(`${out}/${id}-${family}.png`,Buffer.from(data.picture.split(',')[1],'base64'));delete data.picture;casts.push(data);
 }
 const rupture=casts.find(c=>c.id==='fellhunterBombToss'&&c.family==='hellstalker');assert(rupture.geometries.includes('hellWarning')&&rupture.geometries.includes('hellRupture'));
 const stacks=await page.evaluate(async()=>{
  const r=combatReview;r.reset('fellhunter');document.querySelector('#slot').value='0';const {selectAbilityMorph}=await import('/src/abilityMorphSystem.js'),{updateCombat,useAbility}=await import('/src/combat.js'),{getSubclassCombatState}=await import('/src/subclassCombat.js');
  const p=r.game.player,w=r.game.world,ids=['fellhunterPracticalStrike','fellhunterThrowingDaggers'];p.equipment.weapon='hunterBow';r.game.dev.equip([...ids,null,null,'block']);let now=100;
  Object.defineProperty(performance,'now',{value:()=>now*1000,configurable:true});updateCombat(p,w,{},0,now,()=>{});p.maxStamina=p.stamina=p.maxSpirit=p.spirit=10000;
  for(const id of ids){r.game.dev.setMastery(id,20);selectAbilityMorph(p,id,'bloodhound',now);}const e=w.enemies[0];e.x=p.x+170;e.y=p.y;e.hp=e.maxHp=1e7;w.enemies=[e];
  const input={combatAimX:1,combatAimY:0,hasAim:true};for(let i=0;i<300;i++){if(i%20===0){p.cooldowns={};p.abilityUseCharges={};useAbility(0,p,w,()=>{},now,input);useAbility(1,p,w,()=>{},now,input);}now+=.025;updateCombat(p,w,input,.025,now,()=>{});for(const fx of w.effects)fx.age+=.025;w.effects=w.effects.filter(f=>f.age<f.ttl);}
  const a=getSubclassCombatState(p).afflictions.get(e).effects.get('bloodhound');r.draw(now);r.renderHud();return {bleed:a.bleeds.length,poison:a.venoms.length,hud:document.querySelector('#calling').textContent,picture:document.querySelector('#arena').toDataURL('image/png')};
 });assert.equal(stacks.bleed,8);assert.equal(stacks.poison,6);assert(stacks.hud.includes('Bleed 8/8')&&stacks.hud.includes('Poison 6/6'));fs.writeFileSync(out+'/stacked-quarry.png',Buffer.from(stacks.picture.split(',')[1],'base64'));delete stacks.picture;
 const visual=await page.evaluate(async()=>{
  const {drawHellstalkerEffect}=await import('/src/hellstalkerArt.js'),{drawFellhunterEffect,drawFellhunterAffliction}=await import('/src/fellhunterArt.js'),canvas=document.createElement('canvas');canvas.width=800;canvas.height=650;const ctx=canvas.getContext('2d'),checks=[];
  for(const g of ['hellWarning','hellRupture','field','chain','cast','kindling','flashover'])for(const age of [.02,.2,.45]){
   const fx={kind:'subclassAbility',abilityId:'fellhunterBombToss',subclassId:'hellstalker',geometry:g,x:350,y:350,endX:450,endY:370,radius:110,age,ttl:.6};
   const sample=camera=>{ctx.clearRect(0,0,800,650);drawHellstalkerEffect(ctx,fx,camera);return ctx.getImageData(170-camera.x,140-camera.y,400,400).data;};const a=sample({x:0,y:0}),b=sample({x:13,y:11});for(let i=0;i<a.length;i++)if(a[i]!==b[i])throw Error('Drift '+g);checks.push({geometry:g,age,drift:0});
  }
  for(const ailment of ['bleed','poison','both']){
   const fx={kind:'subclassAbility',abilityId:'fellhunterCaltrops',subclassId:'bloodhound',hunterAilment:ailment,geometry:'field',x:350,y:350,radius:100,age:.1,ttl:.6};
   const sample=camera=>{ctx.clearRect(0,0,800,650);drawFellhunterEffect(ctx,fx,camera);drawFellhunterAffliction(ctx,{x:350,y:350},{ability:{hunterMorph:true,subclassId:'bloodhound'},bleeds:Array(8),venoms:Array(6)},camera,10);return ctx.getImageData(170-camera.x,140-camera.y,400,400).data;};const a=sample({x:0,y:0}),b=sample({x:13,y:11});for(let i=0;i<a.length;i++)if(a[i]!==b[i])throw Error('Drift '+ailment);checks.push({ailment,drift:0});
  }
  return checks;
 });
 const gallery=await browser.newPage();gallery.on('pageerror',e=>errors.push(e.message));gallery.on('response',r=>{if(r.status()>=400)missing.push(r.url());});
 await gallery.goto('http://127.0.0.1:8768/docs/fellhunter-identity/');await gallery.evaluate(()=>{for(const i of document.images)i.loading='eager';});await gallery.waitForFunction(()=>[...document.images].every(i=>i.complete&&i.naturalWidth>0));assert.equal(await gallery.locator('a.play').count(),30);
 for(const[width,height]of [[1440,1050],[390,844]]){await gallery.setViewportSize({width,height});assert(await gallery.evaluate(()=>document.documentElement.scrollWidth<=innerWidth));await gallery.screenshot({path:`${out}/gallery-${width}.png`});}
 await gallery.locator('a.play[href*="fellhunterPracticalStrike&morph=hellstalker"]').click();await gallery.waitForFunction(()=>window.combatReview?.game?.player?.abilityMorphs?.fellhunterPracticalStrike==='hellstalker');assert((await gallery.locator('#slots').innerText()).includes('Hellfire Bolt'));
 assert.equal(casts.length,30);assert.deepEqual(errors,[]);assert.deepEqual(missing,[]);fs.writeFileSync(out+'/browser-verification.json',JSON.stringify({casts,stacks,visual,gallery:{cards:30,viewports:2,liveSkillLink:'passed'},errors,missing},null,2));console.log(JSON.stringify({casts:30,stackedQuarry:stacks,anchoringChecks:visual.length,gallery:'passed',errors,missing}));
 }finally{await browser.close();}})().catch(e=>{console.error(e);process.exitCode=1;});
