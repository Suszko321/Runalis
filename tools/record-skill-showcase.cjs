const {chromium}=require(process.env.RUNALIS_NODE_MODULES+'/playwright');
const fs=require('node:fs');
(async()=>{
 const browser=await chromium.launch({channel:'msedge',headless:true});
 try{
  const page=await browser.newPage({viewport:{width:1440,height:1000}});
  await page.goto('http://127.0.0.1:8766/combat-overhaul-lab.html');await page.waitForFunction(()=>window.combatReview);
  const base64=await page.evaluate(async()=>{
   const {getAbilityById}=await import('/src/data.js'),{useAbility,updateCombat,updateSummons}=await import('/src/combat.js');
   const ids=['oathkeeperHeavenbreakerJudgment','fellhunterRicochetBlade','fellhunterBombToss','gravecallerFuneralUrn','thornbinderSeedReliquary','thornbinderThornstorm','waveriderMaelstrom','hydromancerDelugeCrown','lightbringerDawncarver','lightbringerPillarOfRevelation','eldritchCrimsonConduit','redMawRift'];
   const film=document.createElement('canvas');film.width=840;film.height=500;const ctx=film.getContext('2d');
   const stream=film.captureStream(30),type=MediaRecorder.isTypeSupported('video/webm;codecs=vp9')?'video/webm;codecs=vp9':'video/webm';
   const recorder=new MediaRecorder(stream,{mimeType:type,videoBitsPerSecond:2500000}),chunks=[];
   const finished=new Promise(resolve=>{recorder.ondataavailable=e=>chunks.push(e.data);recorder.onstop=()=>resolve(new Blob(chunks,{type}));});
   recorder.start();
   for(const id of ids){
    const a=getAbilityById(id);window.combatReview.reset(a.classId);const {game:g}=window.combatReview;g.paused=true;g.dev.refill();g.dev.clearCooldowns();g.player.x=250;g.player.y=320;g.world.enemies=[];
    for(let i=0;i<6;i++){const e=g.dev.spawn('dummy',360+i%3*65,285+Math.floor(i/3)*65);e.hp=e.maxHp=30000;}
    g.player.loadout.abilitySlots[3]=id;const input={rightStickActive:true,rightStickAimX:1,rightStickAimY:0,ability3Held:true};
    const started=performance.now()/1000;let previous=started;
    if(!useAbility(3,g.player,g.world,g.log,started,input))throw Error('Showcase cast failed: '+id);
    await new Promise(resolve=>{
     function frame(){const now=performance.now()/1000,dt=Math.min(.05,now-previous);previous=now;
      updateCombat(g.player,g.world,input,dt,now,g.log);updateSummons(dt,g.player,g.world,g.log,now);
      for(const fx of g.world.effects)fx.age=(fx.age||0)+dt;g.world.effects=g.world.effects.filter(fx=>fx.age<fx.ttl);
      window.combatReview.draw(now);ctx.fillStyle='#131d21';ctx.fillRect(0,0,840,500);ctx.drawImage(g.canvas,160,180,560,315,0,62,840,438);
      ctx.fillStyle='#ebd5af';ctx.font='24px Georgia';ctx.fillText(a.name,18,32);ctx.fillStyle='#b2b6ab';ctx.font='12px sans-serif';ctx.fillText(a.classId+' · live combat renderer · review targets',18,51);
      if(now-started<1.8)requestAnimationFrame(frame);else resolve();
     }requestAnimationFrame(frame);
    });
   }
   recorder.stop();const blob=await finished;
   return await new Promise(resolve=>{const reader=new FileReader();reader.onload=()=>resolve(reader.result.split(',')[1]);reader.readAsDataURL(blob);});
  });
  const bytes=Buffer.from(base64,'base64');fs.writeFileSync('docs/combat-overhaul/skill-showcase.webm',bytes);console.log(`Recorded 12 actual skill casts: ${bytes.length} bytes.`);
 }finally{await browser.close();}
})().catch(e=>{console.error(e);process.exitCode=1;});
