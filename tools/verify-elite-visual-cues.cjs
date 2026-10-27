const {chromium}=require(process.env.RUNALIS_NODE_MODULES+'/playwright');
const fs=require('node:fs'),assert=require('node:assert/strict');
const folder='docs/elite-visual-cues';fs.mkdirSync(folder,{recursive:true});
(async()=>{
 const browser=await chromium.launch({channel:'msedge',headless:true});
 try{
  const page=await browser.newPage({viewport:{width:1200,height:930}}),errors=[],missing=[];page.on('pageerror',e=>errors.push(e.message));page.on('response',r=>{if(r.status()>=400)missing.push(r.url());});
  await page.goto('http://127.0.0.1:8768/enemy-combat-lab.html');await page.waitForFunction(()=>window.enemyCombatLab&&enemyCombatLab.spriteArtStatus().every(a=>a.ready||a.failed));
  const report={phases:[],sounds:[],scope:'Real modifier updates/damage/renderer, observed-health refill for capturing late phases. Audio rendered through the existing mixer into OfflineAudioContext; no human listening claim.'};
  // Mix each family through the real audio engine into an offline waveform.
  const sounds=await page.evaluate(async()=>{
   const {ELITE_CUE_PROFILES,eliteCueRecipe}=await import('/src/eliteHazardPresentation.js'),{createAudioSystem}=await import('/src/audioSystem.js');
   const mixer=createAudioSystem(),saved={ctx:mixer.ctx,sfxGain:mixer.sfxGain,noiseBuffer:mixer.noiseBuffer,unlock:mixer.unlock};
   const records=[];
   try{for(const kind of Object.keys(ELITE_CUE_PROFILES)){
    const ctx=new OfflineAudioContext(1,48000,48000);mixer.ctx=ctx;mixer.sfxGain=ctx.createGain();mixer.sfxGain.gain.value=.55;mixer.sfxGain.connect(ctx.destination);mixer.noiseBuffer=ctx.createBuffer(1,28800,48000);const noise=mixer.noiseBuffer.getChannelData(0);let seed=32;for(let i=0;i<noise.length;i++){seed=(Math.imul(seed,1664525)+1013904223)>>>0;noise[i]=seed/2147483648-1;}mixer.unlock=()=>true;
    const recipe=eliteCueRecipe(kind,'warning');mixer.play('eliteHazard',{recipe,volume:1,throttle:0,throttleKey:'offline:'+kind});const rendered=await ctx.startRendering(),data=rendered.getChannelData(0);let energy=0,peak=0,hash=2166136261;for(let i=0;i<data.length;i++){energy+=data[i]*data[i];peak=Math.max(peak,Math.abs(data[i]));hash=Math.imul(hash^Math.round(data[i]*32767),16777619);}records.push({kind,rms:Math.sqrt(energy/data.length),peak,hash:hash>>>0,recipe,pcm:Array.from(data.filter((_,i)=>i%3===0),v=>Math.max(-32768,Math.min(32767,Math.round(v*32767))))});
   }}finally{Object.assign(mixer,saved);}
   return records;
  });
  for(const sound of sounds){assert(sound.rms>.001&&sound.peak<1,sound.kind+' silent/clipped');const samples=sound.pcm,bytes=Buffer.alloc(44+samples.length*2);bytes.write('RIFF');bytes.writeUInt32LE(bytes.length-8,4);bytes.write('WAVEfmt ',8);bytes.writeUInt32LE(16,16);bytes.writeUInt16LE(1,20);bytes.writeUInt16LE(1,22);bytes.writeUInt32LE(16000,24);bytes.writeUInt32LE(32000,28);bytes.writeUInt16LE(2,32);bytes.writeUInt16LE(16,34);bytes.write('data',36);bytes.writeUInt32LE(samples.length*2,40);samples.forEach((v,i)=>bytes.writeInt16LE(v,44+i*2));fs.writeFileSync(folder+'/'+sound.kind+'-warning.wav',bytes);delete sound.pcm;report.sounds.push(sound);}
  assert.equal(new Set(sounds.map(s=>s.hash)).size,12,'Audio motifs are duplicated');
  await page.evaluate(async()=>{const {createAudioSystem}=await import('/src/audioSystem.js');const mixer=createAudioSystem();window.cueAudioEvents=[];window.originalCueAudioPlay=mixer.play;mixer.play=function(name,options={}){if(name==='eliteHazard')cueAudioEvents.push({key:options.throttleKey,time:enemyCombatLab.time});};});
  const ids=['freezer','shatter','waller','chamber','artillery','shocker','vortex','collapse','molten','moltenDeath','bulwark','regenerator'];
  for(const kind of ids){
   const state=await page.evaluate(async kind=>{
    const a=enemyCombatLab,base={shatter:'freezer',chamber:'waller',collapse:'vortex',moltenDeath:'molten'}[kind]||kind;a.reset('elite:'+base+'@champion');a.setProtected(false);
    const e=a.world.enemies[0];const {cancelEnemyAttackPresentation}=await import('/src/enemyAttackPresentation.js'),{mitigateEliteHit}=await import('/src/eliteEncounterSystem.js');cancelEnemyAttackPresentation(e);e.telegraph=null;e.attackCooldown=e.specialCooldown=e.chargeCooldown=999;e.eliteAttackPauseTimer=999;e.combatTargetKind='player';e.combatTargetId=a.player.id;
    if(kind==='moltenDeath'){a.player.x=e.x+35;e.hp=0;e.dead=true;}if(kind==='regenerator')e.hp=e.maxHp*.4;
    for(let i=0;i<1000;i++){a.player.hp=a.player.maxHp;a.advance(1/60);if(kind==='bulwark'&&e.eliteGuardActive)for(let j=0;j<3;j++)mitigateEliteHit(e,{x:e.x+e.eliteGuardX*50,y:e.y+e.eliteGuardY*50},10);if(a.hazards.some(h=>h.kind===kind)||kind==='regenerator'&&e.eliteHealing)break;}
    const h=a.hazards.find(h=>h.kind===kind);if(!h&&kind!=='regenerator')throw Error(kind+' never appeared');
    const ctx=document.querySelector('#stage').getContext('2d'),labels=[],fill=ctx.fillText;ctx.fillText=function(t,...args){labels.push(t);return fill.call(this,t,...args);};
    a.advance(.2);a.render();ctx.fillText=fill;window.cueCapture=h;
    return {kind,warning:h?.warning||1.8,tracking:h?.tracking||0,geometry:h?.geometry?.shape||'circle',labels,healing:e.eliteHealing};
   },kind);
   await page.locator('#stage').screenshot({path:folder+'/'+kind+'-warning.png'});report.phases.push(state);
   if(kind==='waller'||kind==='artillery'){
    await page.evaluate(()=>{const a=enemyCombatLab,h=window.cueCapture;a.advance(Math.max(0,(h.tracking||0)+.12-h.age));});await page.locator('#stage').screenshot({path:folder+'/'+kind+'-locked.png'});
   }
   const impact=await page.evaluate(kind=>{
    const a=enemyCombatLab,h=window.cueCapture;if(h){const frames=Math.ceil((h.warning-h.age+.12)*60);for(let i=0;i<frames;i++){a.player.hp=a.player.maxHp;a.advance(1/60);}}else a.advance(1.7);a.render();return {kind,released:!!h?.released,wallSegments:h?.segments?.length||0,healed:kind==='regenerator'&&a.world.enemies[0].hp>a.world.enemies[0].maxHp*.4};
   },kind);await page.locator('#stage').screenshot({path:folder+'/'+kind+'-impact.png'});assert(impact.released||impact.wallSegments||impact.healed,kind+' missing real release');
  }
  report.combination=await page.evaluate(async()=>{
   const a=enemyCombatLab;a.reset('elite:waller+freezer+artillery@champion');a.setProtected(false);const e=a.world.enemies[0];const {cancelEnemyAttackPresentation}=await import('/src/enemyAttackPresentation.js');cancelEnemyAttackPresentation(e);e.telegraph=null;e.attackCooldown=e.specialCooldown=e.chargeCooldown=999;e.eliteAttackPauseTimer=999;
   for(let i=0;i<1200;i++){a.player.hp=a.player.maxHp;a.advance(1/60);if(a.hazards.some(h=>h.kind==='artillery')&&a.player.eliteFrozenUntil>a.time&&a.world.encounterBarriers.length)break;}a.render();return {frozen:a.player.eliteFrozenUntil>a.time,walls:a.world.encounterBarriers.length,kinds:a.hazards.map(h=>h.kind),effects:a.world.effects.length};
  });assert(report.combination.frozen&&report.combination.walls&&report.combination.kinds.includes('artillery'));await page.locator('#stage').screenshot({path:folder+'/triple-warning.png'});
  report.identities=await page.evaluate(async()=>{
   const {ELITE_SIGILS,drawEliteGroundArt}=await import('/src/eliteHazardArt.js'),{ELITE_CUE_PROFILES}=await import('/src/eliteHazardPresentation.js');
   const fingerprints=[];for(const [kind,p] of Object.entries(ELITE_CUE_PROFILES)){
    const canvas=document.createElement('canvas');canvas.width=400;canvas.height=320;const c=canvas.getContext('2d'),h={kind,x:200,y:160,radius:90,warning:2,age:.5,geometry:kind==='shocker'?{shape:'line',x:120,y:160,endX:300,endY:160,width:24}:kind==='bulwark'?{shape:'cone',x:130,y:160,radius:170,angle:0,halfAngle:.9}:null};
    // Compare as presented on opaque ground. Unpremultiplying tiny alpha at
    // antialiased line edges can amplify a 1/255 rounding error into RGB noise.
    const sample=cam=>{c.fillStyle='#242329';c.fillRect(0,0,400,320);drawEliteGroundArt(c,h,cam);const data=c.getImageData(40-cam.x,20-cam.y,300,280).data;return data;};
    const first=sample({x:0,y:0}),moved=sample({x:13,y:11});let drift=0,hash=0,pixels=0,maxDifference=0;for(let i=0;i<first.length;i+=4){if(first[i]!==36||first[i+1]!==35||first[i+2]!==41)pixels++;hash=(Math.imul(hash,31)+first[i]+first[i+1]+first[i+2]+first[i+3])|0;for(let k=0;k<4;k++)maxDifference=Math.max(maxDifference,Math.abs(first[i+k]-moved[i+k]));if([0,1,2,3].some(k=>Math.abs(first[i+k]-moved[i+k])>3))drift++;}
    if(kind!=='regenerator'&&kind!=='waller'&&pixels<100)throw Error(kind+' ground cue missing');if(drift)throw Error(kind+' camera drifting '+drift+' max '+maxDifference);fingerprints.push({kind,hash,pixels,drift,maxDifference});
   }return {uniqueSigils:new Set(Object.values(ELITE_SIGILS).map(m=>m.join(''))).size,patterns:fingerprints};
  });assert.equal(report.identities.uniqueSigils,12);
  report.audioEvents=await page.evaluate(async()=>{const {createAudioSystem}=await import('/src/audioSystem.js');createAudioSystem().play=window.originalCueAudioPlay;return cueAudioEvents;});
  for(const kind of ids){assert(report.audioEvents.some(e=>e.key==='elite:'+kind+':warning'),kind+' missing warning sound');assert(report.audioEvents.some(e=>e.key==='elite:'+kind+':impact'),kind+' missing impact sound');}
  assert(report.audioEvents.some(e=>e.key==='elite:artillery:launch'));assert(report.audioEvents.some(e=>e.key==='elite:waller:lock'));assert(report.audioEvents.some(e=>e.key==='elite:bulwark:guard'));
  report.paintPerformance=await page.evaluate(()=>{const a=enemyCombatLab,samples=[];for(let i=0;i<120;i++){const started=Date.now();a.render();samples.push(Date.now()-started);}samples.sort((a,b)=>a-b);return {frames:120,medianMs:samples[60],p95Ms:samples[114],scope:'Paint fixed, actual Waller/Freeze/Artillery state, player and caster; not full campaign FPS'};});
  report.errors=errors;report.missing=missing;assert.deepEqual(errors,[]);assert.deepEqual(missing,[]);fs.writeFileSync(folder+'/verification.json',JSON.stringify(report,null,2));console.log(JSON.stringify({phases:report.phases.length,distinctSounds:report.sounds.length,uniqueSigils:report.identities.uniqueSigils,triple:report.combination,errors,missing},null,2));
 }finally{await browser.close();}
})().catch(e=>{console.error(e);process.exitCode=1;});
