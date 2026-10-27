const {chromium}=require(process.env.RUNALIS_NODE_MODULES+'/playwright');
const assert=require('node:assert/strict'),fs=require('node:fs');
(async()=>{
 const browser=await chromium.launch({channel:'msedge',headless:true}),errors=[],missing=[];
 fs.mkdirSync('docs/acolyte-host',{recursive:true});
 try{
  const page=await browser.newPage({viewport:{width:1440,height:1000}});
  page.on('pageerror',e=>errors.push(e.message));page.on('response',r=>{if(r.status()>=400)missing.push(r.url());});
  await page.goto('http://127.0.0.1:8768/combat-overhaul-lab.html?skill=gravecallerMurmuringHost&morph=acolyte');
  await page.waitForFunction(()=>window.combatReview?.game?.player);await page.waitForTimeout(800);
  const report=await page.evaluate(async()=>{
   const {createPlayer,chooseClass,migratePlayer}=await import('/src/player.js'),{unlockActiveAbility}=await import('/src/abilityLoadoutSystem.js'),{getAbilityMastery}=await import('/src/abilityMasterySystem.js'),{selectAbilityMorph}=await import('/src/abilityMorphSystem.js'),{useAbility,updateCombat}=await import('/src/combat.js'),{getSubclassCombatState}=await import('/src/subclassCombat.js');
   const g=combatReview.game,w=g.world;g.paused=true;g.player=createPlayer('Spectral Host');const p=g.player,id='gravecallerMurmuringHost';chooseClass(p,'gravecaller');
   for(const s of Object.values(p.skillState.skills))s.level=20;migratePlayer(p);Object.assign(p,{id:'host-review',x:185,y:315,dirX:1,dirY:0,spiritAwakened:true});p.hp=p.maxHp;p.spirit=p.maxSpirit=2000;
   unlockActiveAbility(p,id,{autoAssignEmpty:false});p.loadout.abilitySlots=[id,null,null,null];getAbilityMastery(p,id,true).level=20;selectAbilityMorph(p,id,'acolyte');
   for(let y=1;y<18;y++)for(let x=1;x<31;x++)w.tiles[y][x].passable=true;
   w.effects=[];w.enemies=Array.from({length:12},(_,i)=>({id:'target'+i,kind:'rat',name:'Target',x:285+i*39,y:315+(i%2?12:-9),hp:10000,maxHp:10000,radius:12,r:12,attackCooldown:20}));
   const now=performance.now()/1000,input={combatAimX:1,combatAimY:0,hasAim:true,ability0Held:true};
   if(!useAbility(0,p,w,()=>{},now,input))throw Error('Host cast failed');
   let peakEffects=0;const started=performance.now();
   for(let i=1;i<=45;i++){updateCombat(p,w,input,1/60,now+i/60,()=>{});for(const fx of w.effects)fx.age=(fx.age||0)+1/60;w.effects=w.effects.filter(f=>(f.age||0)<f.ttl);peakEffects=Math.max(peakEffects,w.effects.length);}
   p.visualAction=null;combatReview.draw();
   window.hostReview={updateCombat,now,input};
   return {channel:p.activeChannel?.ability?.spectralHost,shield:getSubclassCombatState(p).hostWard?.reduction,hitCount:w.enemies.filter(e=>e.hp<e.maxHp).length,peakEffects,elapsedMs:performance.now()-started,beam:w.effects.some(f=>f.geometry==='spectralHost')};
  });
  assert.equal(report.channel,true);assert.equal(report.shield,.25);assert.equal(report.hitCount,12);assert(report.peakEffects<30);assert(report.beam);
  await page.locator('#arena').screenshot({path:'docs/acolyte-host/procession.png'});
  const art=await page.evaluate(async()=>{
   const {drawSpectralHost,drawSpectralHostWard}=await import('/src/acolyteHostArt.js');
   const canvas=document.createElement('canvas');canvas.id='host-art-review';canvas.width=800;canvas.height=470;document.body.appendChild(canvas);
   const ctx=canvas.getContext('2d'),hashes=[];ctx.fillStyle='#20262b';ctx.fillRect(0,0,800,470);
   for(let i=0;i<3;i++){
    const fx={x:75,y:80+i*135,range:620,dirX:1,dirY:0,phaseTime:[0,.16,.33][i],ttl:.18,age:0};
    ctx.globalAlpha=.83;ctx.lineWidth=7;drawSpectralHost(ctx,fx,{x:0,y:0});drawSpectralHostWard(ctx,{x:75,y:80+i*135},{x:0,y:0},fx.phaseTime);
    if(ctx.globalAlpha!==.83||ctx.lineWidth!==7)throw Error('Art leaks canvas state');
    hashes.push([...ctx.getImageData(0,i*135,800,135).data].join(','));
   }
   return {distinctFrames:new Set(hashes).size};
  });
  assert.equal(art.distinctFrames,3);await page.locator('#host-art-review').screenshot({path:'docs/acolyte-host/animation-frames.png'});
  await page.evaluate(()=>{const g=combatReview.game,r=hostReview;r.updateCombat(g.player,g.world,{...r.input,ability0Held:false},.05,r.now+.8,()=>{});});
  assert.equal(await page.evaluate(()=>combatReview.game.player.activeChannel),null);
  assert.deepEqual(errors,[]);assert.deepEqual(missing,[]);
  fs.writeFileSync('docs/acolyte-host/browser-verification.json',JSON.stringify({pass:true,report,art,errors,missing},null,2)+'\n');console.log(JSON.stringify({pass:true,report,art,errors,missing}));
 }finally{await browser.close();}
})().catch(e=>{console.error(e);process.exitCode=1;});
