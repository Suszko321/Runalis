const {chromium}=require(process.env.RUNALIS_NODE_MODULES+'/playwright');
const fs=require('node:fs'),assert=require('node:assert/strict');
(async()=>{
 const browser=await chromium.launch({channel:'msedge',headless:true});
 try{
  const p=await browser.newPage({viewport:{width:1300,height:950}}),errors=[],missing=[];p.on('pageerror',e=>errors.push(e.message));p.on('response',r=>{if(r.status()>=400)missing.push(r.url());});
  await p.goto('http://127.0.0.1:8768/combat-overhaul-lab.html?skill=hydromancerWaterTorrent&morph=cryomancer');await p.waitForFunction(()=>window.combatReview?.game?.player?.abilityMorphs?.hydromancerWaterTorrent==='cryomancer');
  await p.evaluate(async()=>{const {spriteArtStatus}=await import('/src/spriteArt.js');for(let i=0;i<100&&!spriteArtStatus().every(s=>s.ready||s.failed);i++)await new Promise(r=>setTimeout(r,30));});
  const ids=await p.evaluate(async()=>{const {ABILITIES}=await import('/src/data.js');return ABILITIES.filter(a=>a.classId==='waverider').map(a=>a.id);});
  fs.mkdirSync('docs/waverider-cryomancer',{recursive:true});const skills=[];
  for(const id of ids){
   const result=await p.evaluate(async id=>{
    const r=combatReview;r.reset('waverider');const {selectAbilityMorph}=await import('/src/abilityMorphSystem.js'),{useAbility,updateCombat}=await import('/src/combat.js'),{getSubclassCombatState}=await import('/src/subclassCombat.js'),{subscribeAbilityAudio}=await import('/src/abilityAudio.js');
    const player=r.game.player,w=r.game.world;r.game.dev.equip([id,null,null,null,'block']);r.game.dev.setMastery(id,20);updateCombat(player,w,{},0,100,()=>{});player.maxSpirit=player.spirit=10000;player.hp=player.maxHp*.5;
    Object.defineProperty(performance,'now',{value:()=>100000,configurable:true});if(!selectAbilityMorph(player,id,'cryomancer',100).ok)throw Error('Morph failed');
    for(const [i,e] of w.enemies.entries()){e.x=390+i*45;e.y=320+i*25;e.hp=e.maxHp=100000;e.isBoss=false;}
    const events=[],stop=subscribeAbilityAudio(e=>events.push(e)),input={combatAimX:1,combatAimY:0,hasAim:true};if(!useAbility(0,player,w,()=>{},100,input))throw Error('Cast failed '+id);
    const field=getSubclassCombatState(player).fields[0];if(field)for(const [i,e] of w.enemies.entries()){e.x=field.x+i*30;e.y=field.y+i*22;}
    const duration=field?1.85:.12;
    for(let elapsed=.025;elapsed<=duration;elapsed+=.025){const now=100+elapsed;Object.defineProperty(performance,'now',{value:()=>now*1000,configurable:true});updateCombat(player,w,input,.025,now,()=>{});for(const f of w.effects)f.age+=.025;w.effects=w.effects.filter(f=>f.age<f.ttl);}
    stop();r.draw(100+duration);r.renderHud();return {id,geometry:w.effects.filter(f=>f.subclassId==='cryomancer').map(f=>f.geometry),fieldRadius:field?.radius||null,events:events.map(e=>e.stage),frozen:w.enemies.some(e=>e.subclassFrozenUntil>100+duration),shield:player.buffs?.defense?.reduction||0};
   },id);skills.push(result);await p.locator('#arena').screenshot({path:`docs/waverider-cryomancer/${id}.png`});
  }
  const shatter=await p.evaluate(async()=>{
   const r=combatReview;r.reset('waverider');const {selectAbilityMorph}=await import('/src/abilityMorphSystem.js'),{useAbility,updateCombat}=await import('/src/combat.js'),{getSubclassCombatState}=await import('/src/subclassCombat.js'),{subscribeAbilityAudio}=await import('/src/abilityAudio.js');
   const player=r.game.player,w=r.game.world,ids=['hydromancerWaterTorrent','waveriderPressureSpear'];r.game.dev.equip([ids[0],ids[1],null,null,'block']);for(const id of ids){r.game.dev.setMastery(id,20);selectAbilityMorph(player,id,'cryomancer',100);}updateCombat(player,w,{},0,100,()=>{});player.spirit=10000;
   for(const e of w.enemies){e.hp=e.maxHp=100000;e.x=390;e.y=320;e.isBoss=false;}w.enemies=w.enemies.slice(0,1);let now=100;const input={combatAimX:1,combatAimY:0,hasAim:true},events=[],stop=subscribeAbilityAudio(e=>events.push(e.stage));
   function advance(seconds){for(let elapsed=0;elapsed<seconds;elapsed+=.025){now+=.025;Object.defineProperty(performance,'now',{value:()=>now*1000,configurable:true});updateCombat(player,w,input,.025,now,()=>{});for(const f of w.effects)f.age+=.025;w.effects=w.effects.filter(f=>f.age<f.ttl);}}
   for(let i=0;i<3;i++){player.cooldowns={};player.abilityUseCharges={};useAbility(0,player,w,()=>{},now,input);advance(.55);}
   const entry=getSubclassCombatState(player).afflictions.get(w.enemies[0]).effects.get('cryomancer');if(!(entry.brittleUntil>now))throw Error('No Brittle');window.cryoCapture={now};r.draw(now);
   return {prepared:true,frozen:w.enemies[0].subclassFrozenUntil>now,events};
  });await p.locator('#arena').screenshot({path:'docs/waverider-cryomancer/frozen-brittle.png'});
  shatter.released=await p.evaluate(async()=>{
   const r=combatReview,{useAbility,updateCombat}=await import('/src/combat.js'),{getSubclassCombatState}=await import('/src/subclassCombat.js');const input={combatAimX:1,combatAimY:0,hasAim:true};let now=cryoCapture.now;r.game.player.cooldowns={};r.game.player.abilityUseCharges={};useAbility(1,r.game.player,r.game.world,()=>{},now,input);
   for(let i=0;i<8;i++){now+=.025;Object.defineProperty(performance,'now',{value:()=>now*1000,configurable:true});updateCombat(r.game.player,r.game.world,input,.025,now,()=>{});for(const f of r.game.world.effects)f.age+=.025;r.game.world.effects=r.game.world.effects.filter(f=>f.age<f.ttl);}
   r.draw(now);return r.game.world.effects.some(f=>f.geometry==='shatter');
  });assert(shatter.released);await p.locator('#arena').screenshot({path:'docs/waverider-cryomancer/shatter.png'});
  const audio=await p.evaluate(async()=>{
   const {createAudioSystem}=await import('/src/audioSystem.js'),mixer=createAudioSystem(),saved={ctx:mixer.ctx,sfxGain:mixer.sfxGain,noiseBuffer:mixer.noiseBuffer,unlock:mixer.unlock},result=[];
   try{for(const phase of ['cast','impact','freeze','shatter']){
    const ctx=new OfflineAudioContext(1,24000,24000);mixer.ctx=ctx;mixer.sfxGain=ctx.createGain();mixer.sfxGain.gain.value=.55;mixer.sfxGain.connect(ctx.destination);mixer.noiseBuffer=ctx.createBuffer(1,12000,24000);let seed=57;const noise=mixer.noiseBuffer.getChannelData(0);for(let i=0;i<noise.length;i++){seed=(Math.imul(seed,1664525)+1013904223)>>>0;noise[i]=seed/2147483648-1;}mixer.unlock=()=>true;
    mixer.play('cryoSpell',{phase,volume:1,throttle:0});const buffer=await ctx.startRendering(),samples=buffer.getChannelData(0);let peak=0,energy=0,hash=2166136261;for(const v of samples){peak=Math.max(peak,Math.abs(v));energy+=v*v;hash=Math.imul(hash^Math.round(v*32767),16777619);}result.push({phase,peak,rms:Math.sqrt(energy/samples.length),hash:hash>>>0,pcm:Array.from(samples,v=>Math.max(-32768,Math.min(32767,Math.round(v*32767))))});
   }}finally{Object.assign(mixer,saved);}return result;
  });
  for(const cue of audio){assert(cue.rms>.001&&cue.peak<1);const bytes=Buffer.alloc(44+cue.pcm.length*2);bytes.write('RIFF');bytes.writeUInt32LE(bytes.length-8,4);bytes.write('WAVEfmt ',8);bytes.writeUInt32LE(16,16);bytes.writeUInt16LE(1,20);bytes.writeUInt16LE(1,22);bytes.writeUInt32LE(24000,24);bytes.writeUInt32LE(48000,28);bytes.writeUInt16LE(2,32);bytes.writeUInt16LE(16,34);bytes.write('data',36);bytes.writeUInt32LE(cue.pcm.length*2,40);cue.pcm.forEach((v,i)=>bytes.writeInt16LE(v,44+i*2));fs.writeFileSync('docs/waverider-cryomancer/'+cue.phase+'.wav',bytes);delete cue.pcm;}assert.equal(new Set(audio.map(c=>c.hash)).size,4);
  const presentation=await p.evaluate(async()=>{
   const {drawCryomancerEffect}=await import('/src/cryomancerArt.js'),canvas=document.createElement('canvas');canvas.width=440;canvas.height=400;const c=canvas.getContext('2d'),checks=[];
   for(const geometry of ['field','freeze','shatter','ward','dash','ritual','burst']){
    const fx={geometry,abilityId:'waveriderMaelstrom',x:210,y:210,endX:260,endY:230,radius:95,ttl:.5,age:.15,phaseTime:2};
    const sample=camera=>{c.fillStyle='#242329';c.fillRect(0,0,440,400);drawCryomancerEffect(c,fx,camera);return c.getImageData(70-camera.x,50-camera.y,280,300).data;};
    const original=sample({x:0,y:0}),moved=sample({x:13,y:11});let difference=0;for(let i=0;i<original.length;i++)if(original[i]!==moved[i])difference++;if(difference)throw Error('Camera drift '+geometry);checks.push({geometry,drift:0});
   }
   const timings=[];for(let i=0;i<100;i++){const start=Date.now();for(let j=0;j<12;j++)drawCryomancerEffect(c,{geometry:'field',abilityId:'waveriderMaelstrom',x:210,y:210,radius:175,ttl:.4,age:.12,phaseTime:i*.05},{x:0,y:0});timings.push(Date.now()-start);}timings.sort((a,b)=>a-b);return {checks,rendering:{fields:12,frames:100,medianMs:timings[50],p95Ms:timings[95],scope:'Cryomancer field renderer only; not full game performance'}};
  });
  assert.equal(skills.length,12);assert.deepEqual(errors,[]);assert.deepEqual(missing,[]);fs.writeFileSync('docs/waverider-cryomancer/browser-verification.json',JSON.stringify({skills,shatter,audio,presentation,errors,missing},null,2));console.log(JSON.stringify({skills:12,shatter,audio,presentation,errors,missing}));
 }finally{await browser.close();}
})().catch(e=>{console.error(e);process.exitCode=1;});
