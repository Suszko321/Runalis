const {chromium}=require(process.env.RUNALIS_NODE_MODULES+'/playwright');
const fs=require('node:fs'),assert=require('node:assert/strict');
(async()=>{
 const browser=await chromium.launch({channel:'msedge',headless:true}),out='docs/garden-grave-morphs';fs.mkdirSync(out,{recursive:true});
 try{
  const page=await browser.newPage({viewport:{width:1300,height:950}}),errors=[],missing=[];page.on('pageerror',e=>errors.push(e.message));page.on('response',r=>{if(r.status()>=400)missing.push(r.url());});
  await page.goto('http://127.0.0.1:8768/combat-overhaul-lab.html?skill=thornbinderThornLash&morph=petalknight');await page.waitForFunction(()=>window.combatReview?.game?.player?.classId==='thornbinder');
  await page.evaluate(async()=>{const {spriteArtStatus}=await import('/src/spriteArt.js');for(let i=0;i<100&&!spriteArtStatus().every(s=>s.ready||s.failed);i++)await new Promise(r=>setTimeout(r,30));});
  const ids=await page.evaluate(async()=>{const {ABILITIES}=await import('/src/data.js');return ABILITIES.filter(a=>['thornbinder','gravecaller'].includes(a.classId)).map(a=>({id:a.id,classId:a.classId}));}),skills=[];
  for(const {id,classId} of ids)for(const family of classId==='thornbinder'?['petalknight']:['deathknight']){
   const data=await page.evaluate(async({id,classId,family})=>{
    const r=combatReview;r.reset(classId);const {selectAbilityMorph}=await import('/src/abilityMorphSystem.js'),{useAbility,updateCombat,updateSummons}=await import('/src/combat.js'),{getSubclassCombatState}=await import('/src/subclassCombat.js'),{subscribeAbilityAudio}=await import('/src/abilityAudio.js'),{resolveAbilityMorph}=await import('/src/subclassVariants.js');
    const p=r.game.player,w=r.game.world;r.game.dev.equip([id,null,null,null,'block']);r.game.dev.setMastery(id,20);updateCombat(p,w,{},0,100,()=>{});p.maxSpirit=p.spirit=10000;p.hp=p.maxHp*.5;
    Object.defineProperty(performance,'now',{value:()=>100000,configurable:true});if(!selectAbilityMorph(p,id,family,100).ok)throw Error('Morph selection failed '+id);
    for(const [i,e] of w.enemies.entries()){e.x=p.x+50+i*46;e.y=p.y+(i%2)*18;e.hp=e.maxHp=100000;e.isBoss=false;}
    const initial=w.enemies.map(e=>e.hp),events=[],stop=subscribeAbilityAudio(e=>events.push(e)),input={combatAimX:1,combatAimY:0,hasAim:true,ability0Held:true};if(!useAbility(0,p,w,()=>{},100,input))throw Error('Cast failed '+id);
    const a=resolveAbilityMorph(p,id,family),f=getSubclassCombatState(p)?.fields[0];if(f)for(const [i,e] of w.enemies.entries()){e.x=f.x+i*25;e.y=f.y+i*15;}
    const duration=a.summonType?.9:f?.9:p.activeChannel?.85:['bolt','pierce'].includes(a.subclassMode)?.075:.1;
    let effects=0;for(let elapsed=.025;elapsed<=duration+.001;elapsed+=.025){const now=100+elapsed;Object.defineProperty(performance,'now',{value:()=>now*1000,configurable:true});updateCombat(p,w,input,.025,now,()=>{});if(a.summonType)updateSummons(.025,p,w,()=>{},now);effects=Math.max(effects,w.effects.length);for(const fx of w.effects)fx.age+=.025;w.effects=w.effects.filter(fx=>fx.age<fx.ttl);}
    stop();r.draw(100+duration);r.renderHud();return {id,classId,family,name:a.name,description:a.desc,mode:a.subclassMode,radius:a.subclassRadius,cost:a.cost,cooldown:a.cd,damage:initial.reduce((s,h,i)=>s+h-w.enemies[i].hp,0),effects,events:events.map(e=>e.stage),summons:p.summons.map(s=>({name:s.displayName,stage:s.evolutionStage,form:s.summonMorph}))};
   },{id,classId,family});skills.push(data);await page.locator('#arena').screenshot({path:`${out}/${id}-${family}.png`});
  }
  const atlasResults=await page.evaluate(async()=>{
   const {asset}=await import('/src/spriteArt.js'),{PETAL_SUMMON_ART}=await import('/src/petalknightSummonArt.js'),result=[];
   for(const family of ['petalknight'])for(const [name,row,w,h,stage] of [['summons-core',1,96,112,'thornling'],['summons-evolved',1,96,112,'thornbeast'],['summons-ancient',1,128,144,'elderThornbeast'],['summons-ancient',2,128,144,'thornTitan']]){
    const profile=PETAL_SUMMON_ART[stage],rose=family==='petalknight',record=asset(rose?profile.sheet:name);if(!record.ready)throw Error('Missing summon sheet '+name);
    const canvas=document.createElement('canvas'),fw=rose?profile.width:w,fh=rose?profile.height:h,count=rose?12:4;
    if(rose){canvas.width=fw*12;canvas.height=fh;canvas.getContext('2d').drawImage(record.image,0,0);}const ctx=canvas.getContext('2d'),frames=[];
    for(let f=0;f<count;f++){const d=ctx.getImageData(f*fw,0,fw,fh).data;let flowers=0,opaque=0;for(let i=0;i<d.length;i+=4){if(d[i+3])opaque++;if(rose?d[i]>70&&d[i]>d[i+1]*1.6&&d[i]>d[i+2]*1.2:d[i]===255&&d[i+1]===243&&d[i+2]===210)flowers++;}if(flowers<8)throw Error('Rose/petal pixels missing '+family+'/'+stage+'/'+f);frames.push({frame:f,flowerPixels:flowers,opaquePixels:opaque});}
    result.push({family,stage,frames,artSource:rose?'independent twelve-frame sheet':'independent twelve-frame sheet',png:canvas.toDataURL('image/png')});
   }return result;
  });
  for(const a of atlasResults){fs.writeFileSync(`${out}/${a.family}-${a.stage}-atlas.png`,Buffer.from(a.png.split(',')[1],'base64'));delete a.png;}
  const presentation=await page.evaluate(async()=>{
   const {drawGardenGraveEffect,gardenGroundCacheSize}=await import('/src/gardenGraveArt.js'),canvas=document.createElement('canvas');canvas.width=640;canvas.height=550;const c=canvas.getContext('2d'),checks=[];
   for(const family of ['deathknight','petalknight'])for(const geometry of ['arc','field','beam','dash','ward','ritual','burst','mark','arrival','impact','roseReflection','burialRupture','deathSentence']){
    const fx={subclassId:family,geometry,x:280,y:260,endX:390,endY:290,dirX:1,dirY:0,radius:95,range:160,ttl:.5,age:.12,phaseTime:2};
    const sample=camera=>{c.fillStyle='#242329';c.fillRect(0,0,640,550);drawGardenGraveEffect(c,fx,camera);return c.getImageData(90-camera.x,75-camera.y,440,420).data;};
    const original=sample({x:0,y:0}),moved=sample({x:13,y:11});let difference=0;for(let i=0;i<original.length;i++)if(original[i]!==moved[i])difference++;if(difference)throw Error('Camera drift '+family+'/'+geometry+' '+difference);checks.push({family,geometry,drift:0});
   }
   const times=[];for(let frame=0;frame<100;frame++){const start=performance.timeOrigin+Date.now();for(let j=0;j<18;j++)drawGardenGraveEffect(c,{subclassId:['deathknight','petalknight'][j%2],geometry:'field',x:280,y:260,radius:145,abilityId:'density-review',ttl:.4,age:.12,phaseTime:frame*.05},{x:0,y:0});times.push(performance.timeOrigin+Date.now()-start);}times.sort((a,b)=>a-b);
   for(let j=0;j<50;j++)drawGardenGraveEffect(c,{subclassId:'petalknight',geometry:'field',x:280,y:260,radius:95+j,abilityId:'cache-check',ttl:.5,age:0},{x:0,y:0});if(gardenGroundCacheSize()>24)throw Error('Unbounded field cache');
   return {checks,rendering:{fields:18,frames:100,medianMs:times[50],p95Ms:times[95],scope:'Garden/grave effect renderer only; not full-game performance'},cacheEntries:gardenGroundCacheSize()};
  });
  const audio=await page.evaluate(async()=>{
   const {createAudioSystem}=await import('/src/audioSystem.js'),mixer=createAudioSystem(),saved={ctx:mixer.ctx,sfxGain:mixer.sfxGain,noiseBuffer:mixer.noiseBuffer,unlock:mixer.unlock},result=[];
   try{for(const family of ['deathknight','petalknight']){
    const ctx=new OfflineAudioContext(1,24000,24000);mixer.ctx=ctx;mixer.sfxGain=ctx.createGain();mixer.sfxGain.gain.value=.55;mixer.sfxGain.connect(ctx.destination);mixer.noiseBuffer=ctx.createBuffer(1,12000,24000);let seed=57;const noise=mixer.noiseBuffer.getChannelData(0);for(let i=0;i<noise.length;i++){seed=(Math.imul(seed,1664525)+1013904223)>>>0;noise[i]=seed/2147483648-1;}mixer.unlock=()=>true;mixer.play('gardenGraveSpell',{family,phase:'impact',volume:1,throttle:0});
    const b=await ctx.startRendering(),samples=b.getChannelData(0);let peak=0,energy=0,hash=2166136261;for(const v of samples){peak=Math.max(peak,Math.abs(v));energy+=v*v;hash=Math.imul(hash^Math.round(v*32767),16777619);}result.push({family,peak,rms:Math.sqrt(energy/samples.length),hash:hash>>>0,pcm:Array.from(samples,v=>Math.max(-32768,Math.min(32767,Math.round(v*32767))))});
   }}finally{Object.assign(mixer,saved);}return result;
  });
  for(const cue of audio){assert(cue.rms>.0001&&cue.peak<1);const b=Buffer.alloc(44+cue.pcm.length*2);b.write('RIFF');b.writeUInt32LE(b.length-8,4);b.write('WAVEfmt ',8);b.writeUInt32LE(16,16);b.writeUInt16LE(1,20);b.writeUInt16LE(1,22);b.writeUInt32LE(24000,24);b.writeUInt32LE(48000,28);b.writeUInt16LE(2,32);b.writeUInt16LE(16,34);b.write('data',36);b.writeUInt32LE(cue.pcm.length*2,40);cue.pcm.forEach((v,i)=>b.writeInt16LE(v,44+i*2));fs.writeFileSync(`${out}/${cue.family}.wav`,b);delete cue.pcm;}
  assert.equal(new Set(audio.map(a=>a.hash)).size,2);assert.equal(skills.length,21);assert.deepEqual(errors,[]);assert.deepEqual(missing,[]);
  fs.writeFileSync(`${out}/browser-verification.json`,JSON.stringify({skills,atlases:atlasResults,audio,presentation,errors,missing},null,2));console.log(JSON.stringify({casts:skills.length,atlasFrames:atlasResults.reduce((n,a)=>n+a.frames.length,0),audio,presentation,errors,missing}));
 }finally{await browser.close();}
})().catch(e=>{console.error(e);process.exitCode=1;});
