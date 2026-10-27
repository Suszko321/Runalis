const {chromium}=require(process.env.RUNALIS_NODE_MODULES+'/playwright');
const fs=require('node:fs'),assert=require('node:assert/strict');
(async()=>{
 const browser=await chromium.launch({channel:'msedge',headless:true});
 try{
  const p=await browser.newPage({viewport:{width:1280,height:1100}}),errors=[],missing=[],out='docs/oathkeeper-paladin';fs.mkdirSync(out,{recursive:true});
  p.on('pageerror',e=>errors.push(e.message));p.on('response',r=>{if(r.status()>=400)missing.push(r.url());});
  await p.goto('http://127.0.0.1:8768/docs/oathkeeper-paladin/');await p.waitForFunction(()=>window.oathbladePreview?.player);
  await p.locator('#mace').uncheck();await p.evaluate(async()=>{window.oathbladeState=(await import('/src/combatExpansion.js')).getCombatTechniqueState;});const forms=[];
  for(const family of ['base','holyknight','sinner']){
   await p.locator(`[data-family="${family}"]`).click();await p.waitForFunction(()=>{if(oathbladeState(oathbladePreview.player)?.statuses.oathBlades?.blades.some(b=>b.phase==='flight')){if(document.querySelector('#pause').textContent==='Pause')document.querySelector('#pause').click();return true;}return false;});
   await p.locator('#arena').screenshot({path:`${out}/${family}-swords.png`});
   const data=await p.evaluate(async()=>{const {getCombatTechniqueState}=await import('/src/combatExpansion.js');const r=oathbladePreview,f=getCombatTechniqueState(r.player).statuses.oathBlades;return {family:r.family,name:document.querySelector('#name').textContent,blades:f.blades.length,phases:f.blades.map(b=>b.phase),damage:r.world.enemies.reduce((sum,e)=>sum+e.maxHp-e.hp,0)};});forms.push(data);assert(data.phases.includes('flight'),JSON.stringify(data)+' '+await p.locator('#pause').textContent());await p.locator('#pause').click();
  }
  const artwork=await p.evaluate(async()=>{
   const {drawOathBlades,OATH_BLADE_SHAPES}=await import('/src/oathbladeArt.js'),{drawOathkeeperEffect}=await import('/src/oathkeeperArt.js');
   const canvas=document.createElement('canvas');canvas.width=800;canvas.height=600;const c=canvas.getContext('2d'),checks=[];
   c.fillStyle='#22261f';c.fillRect(0,0,800,600);
   for(const [row,family] of ['base','holyknight','sinner'].entries())for(let i=0;i<8;i++){const angle=-Math.PI/2+i*Math.PI/4,formation={until:9,ability:{oathBladeFamily:family},blades:[{x:55+i*96,y:70+row*140,dirX:Math.cos(angle),dirY:Math.sin(angle),phase:'orbit'}]};drawOathBlades(c,formation,{x:0,y:0},1);checks.push({family,direction:i});}
   const sheet=canvas.toDataURL('image/png');
   for(const family of Object.keys(OATH_BLADE_SHAPES))for(const phase of ['orbit','windup','flight','return']){
    const f={until:9,ability:{oathBladeFamily:family},blades:[{x:350,y:350,dirX:1,dirY:0,phase}]};const sample=camera=>{c.clearRect(0,0,800,600);drawOathBlades(c,f,camera,1);return c.getImageData(200-camera.x,200-camera.y,300,300).data;};const original=sample({x:0,y:0}),moved=sample({x:13,y:11});let drift=0;for(let i=0;i<original.length;i++)if(original[i]!==moved[i])drift++;if(drift)throw Error('Sword camera drift '+family+'/'+phase);
   }
   for(const family of Object.keys(OATH_BLADE_SHAPES))for(const kind of ['oathBladesConjure','oathBladesImpact']){const fx={kind,subclassId:family,x:350,y:350,radius:65,ttl:.65,age:.2};const sample=camera=>{c.clearRect(0,0,800,600);drawOathkeeperEffect(c,fx,camera);return c.getImageData(200-camera.x,200-camera.y,300,300).data;};const a=sample({x:0,y:0}),b=sample({x:13,y:11});assertPixels(a,b,kind);}
   function assertPixels(a,b,label){for(let i=0;i<a.length;i++)if(a[i]!==b[i])throw Error('Effect camera drift '+label);}
   return {sheet,directions:checks.length,anchoredSwordStates:16,anchoredEffects:8};
  });fs.writeFileSync(out+'/sword-silhouettes.png',Buffer.from(artwork.sheet.split(',')[1],'base64'));delete artwork.sheet;
  await p.locator('#pause').click();await p.locator('#sound').check();const audio=await p.evaluate(async()=>{
   const {createAudioSystem}=await import('/src/audioSystem.js'),m=createAudioSystem(),saved={ctx:m.ctx,sfxGain:m.sfxGain,noiseBuffer:m.noiseBuffer,unlock:m.unlock},result=[];
   try{for(const family of ['base','holyknight','sinner'])for(const phase of ['cast','bladeLaunch','bladeImpact']){
    const ctx=new OfflineAudioContext(1,24000,24000);m.ctx=ctx;m.sfxGain=ctx.createGain();m.sfxGain.gain.value=.55;m.sfxGain.connect(ctx.destination);m.noiseBuffer=ctx.createBuffer(1,12000,24000);let seed=57;const noise=m.noiseBuffer.getChannelData(0);for(let i=0;i<noise.length;i++){seed=(Math.imul(seed,1664525)+1013904223)>>>0;noise[i]=seed/2147483648-1;}m.unlock=()=>true;
    m.play('oathBlade',{family,phase,volume:1,throttle:0});const b=await ctx.startRendering(),samples=b.getChannelData(0);let peak=0,energy=0,hash=2166136261;for(const v of samples){peak=Math.max(peak,Math.abs(v));energy+=v*v;hash=Math.imul(hash^Math.round(v*32767),16777619);}result.push({family,phase,peak,rms:Math.sqrt(energy/samples.length),hash:hash>>>0,pcm:Array.from(samples,v=>Math.round(Math.max(-1,Math.min(1,v))*32767))});
   }}finally{Object.assign(m,saved);}return result;
  });
  for(const cue of audio){assert(cue.peak<1&&cue.rms>.0001,JSON.stringify(cue).slice(0,150));const b=Buffer.alloc(44+cue.pcm.length*2);b.write('RIFF');b.writeUInt32LE(b.length-8,4);b.write('WAVEfmt ',8);b.writeUInt32LE(16,16);b.writeUInt16LE(1,20);b.writeUInt16LE(1,22);b.writeUInt32LE(24000,24);b.writeUInt32LE(48000,28);b.writeUInt16LE(2,32);b.writeUInt16LE(16,34);b.write('data',36);b.writeUInt32LE(cue.pcm.length*2,40);cue.pcm.forEach((v,i)=>b.writeInt16LE(v,44+i*2));fs.writeFileSync(`${out}/${cue.family}-${cue.phase}.wav`,b);delete cue.pcm;}
  assert.equal(new Set(audio.map(c=>c.hash)).size,9);
  const mace=[];
  for(const family of ['base','holyknight','sinner']){
   await p.locator(`[data-family="${family}"]`).click();
   const check=await p.evaluate(async()=>{
    const r=oathbladePreview,p=r.player,w=r.world,{requestBasicAttack,updateWeaponCombat}=await import('/src/combatMoves.js');let now=r.now;
    for(let step=1;step<=3;step++){p.stamina=10000;w.enemies[0].x=p.x+30;w.enemies[0].y=p.y;const input={combatAimX:1,combatAimY:0,hasAim:true};if(!requestBasicAttack(p,w,input,()=>{},now))throw Error('Mace step rejected '+step);for(let i=0;p.combatState.attacking&&i<200;i++){now+=.01;updateWeaponCombat(p,w,input,.01,now,()=>{});}}
    const contacts=w.effects.filter(f=>f.kind==='enemyContactImpact'),ground=w.effects.find(f=>f.kind==='bluntGroundImpact');return {family:r.family,contacts:contacts.length,colored:contacts.every(f=>f.oathkeeper&&f.subclassId===r.family),shockwave:ground?.subclassId===r.family};
   });assert(check.contacts>0&&check.colored&&check.shockwave,JSON.stringify(check));mace.push(check);
  }
  await p.locator('#sound').check();await p.locator('#cast').click();await p.locator('#pause').click();await p.waitForTimeout(1000);assert.deepEqual(errors,[]);assert.deepEqual(missing,[]);
  await p.screenshot({path:out+'/preview.png',fullPage:true});
  const report={forms,mace,artwork,audio,errors,missing};fs.writeFileSync(out+'/browser-verification.json',JSON.stringify(report,null,2));console.log(JSON.stringify(report));
 }finally{await browser.close();}
})().catch(e=>{console.error(e);process.exitCode=1;});
