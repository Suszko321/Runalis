const {chromium}=require(process.env.RUNALIS_NODE_MODULES+'/playwright');
const fs=require('node:fs'),assert=require('node:assert/strict');
(async()=>{
 const browser=await chromium.launch({channel:'msedge',headless:true});
 try{
  const p=await browser.newPage({viewport:{width:1300,height:950}}),errors=[],missing=[];
  p.on('pageerror',e=>errors.push(e.message));p.on('response',r=>{if(r.status()>=400)missing.push(r.url());});
  await p.goto('http://127.0.0.1:8768/combat-overhaul-lab.html?skill=oathkeeperOathStrike');await p.waitForFunction(()=>window.combatReview?.game?.player?.classId==='oathkeeper');
  await p.evaluate(async()=>{const {spriteArtStatus}=await import('/src/spriteArt.js');for(let i=0;i<100&&!spriteArtStatus().every(s=>s.ready||s.failed);i++)await new Promise(r=>setTimeout(r,30));});
  const ids=await p.evaluate(async()=>{const {ABILITIES}=await import('/src/data.js');return ABILITIES.filter(a=>a.classId==='oathkeeper').map(a=>a.id);});
  const out='docs/oathkeeper-blunt';fs.mkdirSync(out,{recursive:true});const skills=[];
  for(const id of ids)for(const morph of ['base','holyknight','sinner']){
   const data=await p.evaluate(async({id,morph})=>{
    const r=combatReview;r.reset('oathkeeper');const {selectAbilityMorph}=await import('/src/abilityMorphSystem.js'),{useAbility,updateCombat}=await import('/src/combat.js'),{mitigateTechniqueDamage}=await import('/src/combatExpansion.js'),{getSubclassCombatState}=await import('/src/subclassCombat.js'),{subscribeAbilityAudio}=await import('/src/abilityAudio.js');
    const player=r.game.player,w=r.game.world;player.equipment.weapon='oathkeepersMace';r.game.dev.equip([id,null,null,null,'block']);r.game.dev.setMastery(id,20);updateCombat(player,w,{},0,100,()=>{});player.maxSpirit=player.spirit=10000;player.maxStamina=player.stamina=10000;player.hp=player.maxHp*.5;
    Object.defineProperty(performance,'now',{value:()=>100000,configurable:true});if(!selectAbilityMorph(player,id,morph,100).ok)throw Error('Morph failed');
    for(const [i,e] of w.enemies.entries()){e.x=player.x+30+i*46;e.y=player.y+(i%2)*18;e.hp=e.maxHp=100000;e.isBoss=false;}
    const initial=w.enemies.map(e=>e.hp),events=[],stop=subscribeAbilityAudio(e=>events.push(e)),input={combatAimX:1,combatAimY:0,hasAim:true,ability0Held:true};if(!useAbility(0,player,w,()=>{},100,input))throw Error('Cast failed '+id);
    if(/LitanyOfIron|DebtOfBlood/.test(id))mitigateTechniqueDamage(player,w.enemies[0],30,100,w);
    const field=getSubclassCombatState(player)?.fields[0];if(field)for(const [i,e] of w.enemies.entries()){e.x=field.x+i*24;e.y=field.y+i*20;}
    // Capture the real release, projectile travel or persistent field, not a mock effect.
    const duration=id==='oathkeeperDebtOfBlood'&&morph==='base'?5.1:field?.65:player.activeChannel?.15:id==='oathkeeperHallowedBlades'?.6:.11;
    let effects=0;for(let elapsed=.025;elapsed<=duration;elapsed+=.025){const now=100+elapsed;Object.defineProperty(performance,'now',{value:()=>now*1000,configurable:true});updateCombat(player,w,input,.025,now,()=>{});effects=Math.max(effects,w.effects.length);for(const f of w.effects)f.age+=.025;w.effects=w.effects.filter(f=>f.age<f.ttl);}
    stop();r.draw(100+duration);r.renderHud();return {id,morph,damage:initial.reduce((s,h,i)=>s+h-w.enemies[i].hp,0),effects,events:events.map(e=>e.stage),weapon:player.equipment.weapon};
   },{id,morph});skills.push(data);await p.locator('#arena').screenshot({path:`${out}/${id}-${morph}.png`});
  }
  const weapons=[];
  for(const facing of ['east','west','south','north'])for(const step of [1,2,3,4]){
   const data=await p.evaluate(async({facing,step})=>{
    const r=combatReview;r.reset('oathkeeper');const m=await import('/src/combatMoves.js'),{updateCombat}=await import('/src/combat.js');const player=r.game.player,w=r.game.world;player.equipment.weapon='oathkeepersMace';
    player.x=360;player.y=330;updateCombat(player,w,{},0,100,()=>{});player.stamina=player.maxStamina=10000;
    const dirs={east:[1,0],west:[-1,0],north:[0,-1],south:[0,1]},[x,y]=dirs[facing],input={combatAimX:x,combatAimY:y,hasAim:true};let now=100;
    for(const e of w.enemies){e.x=player.x+x*30;e.y=player.y+y*30;e.hp=e.maxHp=100000;}
    for(let j=1;j<=step;j++){
     if(j===4)now+=.6; // Keep the heavy separate from finisher recovery.
     const ok=step===4&&j===4?m.requestHeavyAttack(player,w,input,()=>{},now):m.requestBasicAttack(player,w,input,()=>{},now);if(!ok)throw Error('Weapon failed '+facing+'/'+j);
     const move=player.combatState.attackMove,targetTime=j===step?move.activeStart+.055:move.duration+.16;
     let elapsed=0;while(elapsed<targetTime){now+=.01;elapsed+=.01;Object.defineProperty(performance,'now',{value:()=>now*1000,configurable:true});m.updateWeaponCombat(player,w,input,.01,now,()=>{});for(const fx of w.effects)fx.age+=.01;w.effects=w.effects.filter(f=>f.age<f.ttl);}
     if(j<step)for(const e of w.enemies){e.x=player.x+x*30;e.y=player.y+y*30;}
    }
    const move=player.combatState.attackMove;r.draw(now);return {facing,step,name:move.name,family:move.attackFamily,hit:w.enemies.some(e=>e.hp<e.maxHp),contact:w.effects.some(f=>f.blunt),ground:w.effects.some(f=>f.kind==='bluntGroundImpact')};
   },{facing,step});weapons.push(data);assert(data.hit&&data.contact);await p.locator('#arena').screenshot({path:`${out}/mace-${facing}-${step}.png`});
  }
  const audio=await p.evaluate(async()=>{
   const {createAudioSystem}=await import('/src/audioSystem.js'),mixer=createAudioSystem(),saved={ctx:mixer.ctx,sfxGain:mixer.sfxGain,noiseBuffer:mixer.noiseBuffer,unlock:mixer.unlock},result=[];
   try{for(const [name,options,label] of [['bluntLift',{},'mace-lift'],['bluntSwing',{},'mace-swing'],['bluntImpact',{},'mace-impact'],['bluntImpact',{heavy:true},'mace-crush'],...['base','holyknight','sinner'].map(f=>['oathMiracle',{phase:'impact',family:f,heavy:true},f+'-impact'])]){
    const ctx=new OfflineAudioContext(1,24000,24000);mixer.ctx=ctx;mixer.sfxGain=ctx.createGain();mixer.sfxGain.gain.value=.55;mixer.sfxGain.connect(ctx.destination);mixer.noiseBuffer=ctx.createBuffer(1,12000,24000);let seed=57;const noise=mixer.noiseBuffer.getChannelData(0);for(let i=0;i<noise.length;i++){seed=(Math.imul(seed,1664525)+1013904223)>>>0;noise[i]=seed/2147483648-1;}mixer.unlock=()=>true;
    mixer.play(name,{...options,volume:1,throttle:0});const buffer=await ctx.startRendering(),samples=buffer.getChannelData(0);let peak=0,energy=0,hash=2166136261;for(const v of samples){peak=Math.max(peak,Math.abs(v));energy+=v*v;hash=Math.imul(hash^Math.round(v*32767),16777619);}result.push({label,peak,rms:Math.sqrt(energy/samples.length),hash:hash>>>0,pcm:Array.from(samples,v=>Math.max(-32768,Math.min(32767,Math.round(v*32767))))});
   }}finally{Object.assign(mixer,saved);}return result;
  });
  for(const cue of audio){assert(cue.rms>.0001&&cue.peak<1);const bytes=Buffer.alloc(44+cue.pcm.length*2);bytes.write('RIFF');bytes.writeUInt32LE(bytes.length-8,4);bytes.write('WAVEfmt ',8);bytes.writeUInt32LE(16,16);bytes.writeUInt16LE(1,20);bytes.writeUInt16LE(1,22);bytes.writeUInt32LE(24000,24);bytes.writeUInt32LE(48000,28);bytes.writeUInt16LE(2,32);bytes.writeUInt16LE(16,34);bytes.write('data',36);bytes.writeUInt32LE(cue.pcm.length*2,40);cue.pcm.forEach((v,i)=>bytes.writeInt16LE(v,44+i*2));fs.writeFileSync(out+'/'+cue.label+'.wav',bytes);delete cue.pcm;}
  assert.equal(new Set(audio.filter(c=>c.label!=='holyknight-impact').map(c=>c.hash)).size,6); // Base and Holyknight intentionally share the sacred bell.
  const presentation=await p.evaluate(async()=>{
   const {drawOathkeeperEffect}=await import('/src/oathkeeperArt.js'),canvas=document.createElement('canvas');canvas.width=520;canvas.height=460;const c=canvas.getContext('2d'),checks=[];
   for(const geometry of ['arc','field','chain','beam','ward','ritual','burst','smite','mark']){
    const fx={geometry,abilityId:'oathkeeperJudgmentSmite',x:235,y:235,endX:305,endY:265,dirX:1,dirY:0,radius:80,range:80,ttl:.5,age:.12};
    const sample=camera=>{c.fillStyle='#242329';c.fillRect(0,0,520,460);drawOathkeeperEffect(c,fx,camera);return c.getImageData(70-camera.x,50-camera.y,360,370).data;};
    const original=sample({x:0,y:0}),moved=sample({x:13,y:11});let difference=0;for(let i=0;i<original.length;i++)if(original[i]!==moved[i])difference++;if(difference)throw Error('Camera drift '+geometry);checks.push({geometry,drift:0});
   }
   const timings=[];for(let i=0;i<100;i++){const start=Date.now();for(let j=0;j<18;j++)drawOathkeeperEffect(c,{geometry:'field',abilityId:'oathkeeperConsecratedGround',x:235,y:235,radius:110,ttl:5.4,age:i*.05},{x:0,y:0});timings.push(Date.now()-start);}timings.sort((a,b)=>a-b);return {checks,rendering:{fields:18,frames:100,medianMs:timings[50],p95Ms:timings[95],scope:'Oathkeeper effect renderer only; not full-game performance'}};
  });
  assert.equal(skills.length,ids.length*3);assert.equal(weapons.length,16);assert.deepEqual(errors,[]);assert.deepEqual(missing,[]);
  fs.writeFileSync(out+'/browser-verification.json',JSON.stringify({skills,weapons,audio,presentation,errors,missing},null,2));console.log(JSON.stringify({skills:skills.length,weapons:weapons.length,audio,presentation,errors,missing}));
 }finally{await browser.close();}
})().catch(e=>{console.error(e);process.exitCode=1;});
