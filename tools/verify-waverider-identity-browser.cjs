const {chromium}=require(process.env.RUNALIS_NODE_MODULES+'/playwright'),assert=require('node:assert/strict'),fs=require('node:fs');
(async()=>{const out='docs/waverider-identity',browser=await chromium.launch({channel:'msedge',headless:true}),errors=[],missing=[];
 try{
  const page=await browser.newPage({viewport:{width:1440,height:1050}});page.on('pageerror',e=>errors.push(e.message));page.on('response',r=>{if(r.status()>=400)missing.push(r.url());});
  await page.goto('http://127.0.0.1:8768/combat-overhaul-lab.html?skill=waveriderMaelstrom&morph=sunken');await page.waitForFunction(()=>window.combatReview?.game?.player);
  await page.evaluate(async()=>{const {spriteArtStatus}=await import('/src/spriteArt.js');for(let i=0;i<100&&!spriteArtStatus().every(s=>s.ready||s.failed);i++)await new Promise(r=>setTimeout(r,25));});
  const pressure=await page.evaluate(async()=>{
   const r=combatReview;r.reset('waverider');document.querySelector('#slot').value='0';
   const {selectAbilityMorph}=await import('/src/abilityMorphSystem.js'),{useAbility,updateCombat}=await import('/src/combat.js'),{getSunkenPressureState}=await import('/src/sunkenPressureSystem.js');
   const p=r.game.player,w=r.game.world;Object.assign(p,{x:400,y:400,dirX:1,dirY:0,spiritAwakened:true});r.game.dev.equip(['waveriderMaelstrom','hydromancerWaterTorrent',null,null,'block']);
   let now=100;Object.defineProperty(performance,'now',{value:()=>now*1000,configurable:true});updateCombat(p,w,{},0,now,()=>{});p.maxSpirit=p.spirit=p.maxStamina=p.stamina=10000;
   for(const id of ['waveriderMaelstrom','hydromancerWaterTorrent']){r.game.dev.setMastery(id,20);if(!selectAbilityMorph(p,id,'sunken',now).ok)throw Error('Select '+id);}
   const base=w.enemies[0];w.enemies=Array.from({length:16},(_,i)=>({...base,id:'pressure'+i,x:472+i%4*18,y:400+Math.floor(i/4)*14,hp:1e7,maxHp:1e7,isBoss:true,dead:false}));
   const input={hasAim:true,combatAimX:1,combatAimY:0,ability0Held:true};if(!useAbility(0,p,w,()=>{},now,input))throw Error('Start Maelstrom');
   const captures=[];for(let i=1;i<=832;i++){
    // A held technique has a twelve-second maximum cast; re-cast it on expiry
    // to exercise a longer encounter without bypassing the real lifecycle.
    if(!p.activeChannel){p.spirit=10000;if(!useAbility(0,p,w,()=>{},now,input))throw Error('Restart Maelstrom');}
    now+=.025;updateCombat(p,w,input,.025,now,()=>{});for(const f of w.effects)f.age+=.025;w.effects=w.effects.filter(f=>f.age<f.ttl);
    if([10,410,830].includes(i)){r.draw(now);r.renderHud();captures.push({seconds:+(now-100).toFixed(2),depth:getSunkenPressureState(p).depth,targets:getSunkenPressureState(p).targets.size,picture:document.querySelector('#arena').toDataURL('image/png')});}
   }
   // Exercise the actual in-game unit frame, in the isolated lab's DOM.
   const shell=document.createElement('div');shell.id='app';shell.className='active';document.body.appendChild(shell);
   const {renderUI,clearGameUiDom}=await import('/src/ui.js');r.game.uiState={};renderUI(p,[],r.game,{hudOnly:true});const hud=document.querySelector('.sunken-depth')?.textContent;
   clearGameUiDom();shell.remove();if(!hud?.includes('100%'))throw Error('Missing full-Depth HUD: '+hud);
   input.ability0Held=false;input.ability0Released=true;now+=.025;updateCombat(p,w,input,.025,now,()=>{});
   w.enemies=[{...w.enemies[0],id:'fresh',x:500,y:400,hp:1e7,maxHp:1e7,dead:false}];p.spirit=10000;p.cooldowns={};p.abilityUseCharges={};
   if(!useAbility(1,p,w,()=>{},now,{hasAim:true,combatAimX:1,combatAimY:0}))throw Error('Target swap cast');
   return {captures,hud,swappedDepth:getSunkenPressureState(p).targets.get(w.enemies[0]).depth};
  });
  for(const [i,c]of pressure.captures.entries()){fs.writeFileSync(`${out}/sunken-depth-${i}.png`,Buffer.from(c.picture.split(',')[1],'base64'));delete c.picture;}
  assert.equal(pressure.captures[0].depth,0);assert(pressure.captures[1].depth>.45&&pressure.captures[1].depth<.6);assert.equal(pressure.captures[2].depth,1);assert.equal(pressure.captures[2].targets,12,'retain Maelstrom\'s existing twelve-target cap in the sixteen-enemy encounter');assert.equal(pressure.swappedDepth,1);
  const restoration=await page.evaluate(async()=>{
   const r=combatReview;r.reset('waverider');document.querySelector('#slot').value='0';const {selectAbilityMorph}=await import('/src/abilityMorphSystem.js'),{useAbility,updateCombat}=await import('/src/combat.js');
   const p=r.game.player,w=r.game.world;r.game.dev.equip(['hydromancerMendingCurrent',null,null,null,'block']);r.game.dev.setMastery('hydromancerMendingCurrent',20);
   let now=100;Object.defineProperty(performance,'now',{value:()=>now*1000,configurable:true});updateCombat(p,w,{},0,now,()=>{});p.maxSpirit=p.spirit=10000;p.hp=p.maxHp*.5;
   if(!selectAbilityMorph(p,'hydromancerMendingCurrent','cryomancer',now).ok)throw Error('Rime morph');Object.assign(p,{slowTimer:3,eliteFrost:70,eliteFrozenUntil:now+1,burnTimer:4,poisonTimer:5});const hp=p.hp;
   if(!useAbility(0,p,w,()=>{},now,{hasAim:true,combatAimX:1,combatAimY:0}))throw Error('Rime cast');r.draw(now);r.renderHud();
   return {healed:p.hp>hp,slow:p.slowTimer,frost:p.eliteFrost,frozen:p.eliteFrozenUntil,poison:p.poisonTimer,burn:p.burnTimer,ward:p.buffs.defense.cryo,thaw:w.effects.some(f=>f.geometry==='thaw'),picture:document.querySelector('#arena').toDataURL('image/png')};
  });assert(restoration.healed&&restoration.ward&&restoration.thaw);assert.equal(restoration.slow,0);assert.equal(restoration.frost,0);assert.equal(restoration.frozen,0);assert.equal(restoration.poison,5);assert.equal(restoration.burn,4);fs.writeFileSync(out+'/restorative-rime.png',Buffer.from(restoration.picture.split(',')[1],'base64'));delete restoration.picture;
  const anchoring=await page.evaluate(async()=>{
   const {drawSunkenSkill}=await import('/src/sunkenArt.js'),{drawCryomancerEffect}=await import('/src/cryomancerArt.js'),canvas=document.createElement('canvas');canvas.width=600;canvas.height=550;const c=canvas.getContext('2d'),checks=[];
   for(const geometry of ['depth','burn','thaw'])for(const depth of [0,.5,1]){
    const fx={profile:geometry,geometry,x:300,y:300,radius:27,ttl:.4,age:.1,depth};
    const sample=camera=>{c.clearRect(0,0,600,550);if(geometry==='thaw')drawCryomancerEffect(c,fx,camera);else drawSunkenSkill(c,fx,camera);return c.getImageData(170-camera.x,170-camera.y,260,260).data;};const a=sample({x:0,y:0}),b=sample({x:13,y:11});for(let i=0;i<a.length;i++)if(a[i]!==b[i])throw Error('Camera drift '+geometry+' '+depth);checks.push({geometry,depth,drift:0});
   }return checks;
  });
  const gallery=await browser.newPage();gallery.on('pageerror',e=>errors.push(e.message));gallery.on('response',r=>{if(r.status()>=400)missing.push(r.url());});
  await gallery.goto('http://127.0.0.1:8768/docs/waverider-identity/');await gallery.evaluate(()=>{for(const i of document.images)i.loading='eager';});await gallery.waitForFunction(()=>[...document.images].every(i=>i.complete&&i.naturalWidth>0));assert.equal(await gallery.locator('.skill').count(),24);
  for(const [width,height]of [[1440,1050],[390,844]]){await gallery.setViewportSize({width,height});assert(await gallery.evaluate(()=>document.documentElement.scrollWidth<=innerWidth));await gallery.screenshot({path:out+'/gallery-'+width+'.png'});}
  await gallery.locator('a[href*="skill=hydromancerWaterTorrent"][href*="morph=cryomancer"]').click();await gallery.waitForFunction(()=>window.combatReview?.game?.player?.abilityMorphs?.hydromancerWaterTorrent==='cryomancer');assert((await gallery.locator('#slots').innerText()).includes('Frost Shard'));
  const galleryChecks={cards:24,viewports:2,liveSkillLink:'passed'};
  assert.deepEqual(errors,[]);assert.deepEqual(missing,[]);fs.writeFileSync(out+'/browser-verification.json',JSON.stringify({pressure,restoration,anchoring,gallery:galleryChecks,errors,missing},null,2));console.log(JSON.stringify({pressure,restoration,anchoring:anchoring.length,gallery:galleryChecks,errors,missing}));
 }finally{await browser.close();}
})().catch(e=>{console.error(e);process.exitCode=1;});
