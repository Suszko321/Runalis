const {chromium}=require(process.env.RUNALIS_NODE_MODULES+'/playwright');
const fs=require('node:fs'),assert=require('node:assert/strict');
(async()=>{
 const out='docs/oathkeeper-identity',browser=await chromium.launch({channel:'msedge',headless:true}),errors=[],missing=[],casts=[];
 fs.mkdirSync(out,{recursive:true});
 try{
  const page=await browser.newPage({viewport:{width:1440,height:1050}});
  page.on('pageerror',e=>errors.push(e.message));page.on('response',r=>{if(r.status()>=400)missing.push(r.url());});
  await page.goto('http://127.0.0.1:8768/combat-overhaul-lab.html?skill=oathkeeperOathStrike&morph=sinner');
  await page.waitForFunction(()=>window.combatReview?.game?.player?.classId==='oathkeeper');
  await page.evaluate(async()=>{const {spriteArtStatus}=await import('/src/spriteArt.js');for(let i=0;i<100&&!spriteArtStatus().every(s=>s.ready||s.failed);i++)await new Promise(r=>setTimeout(r,30));});
  const ids=await page.evaluate(async()=>{const {ABILITIES}=await import('/src/data.js');return ABILITIES.filter(a=>a.classId==='oathkeeper').map(a=>a.id);});
  for(const family of ['holyknight','sinner'])for(const id of ids){
   const data=await page.evaluate(async({id,family})=>{
    const r=combatReview;r.reset('oathkeeper');
    const {selectAbilityMorph}=await import('/src/abilityMorphSystem.js'),{useAbility,updateCombat}=await import('/src/combat.js'),{resolveSubclassAbility}=await import('/src/subclassVariants.js'),{abilitySummary}=await import('/src/uiInformation.js');
    const p=r.game.player,w=r.game.world;p.equipment.weapon='oathkeepersMace';r.game.dev.equip([id,null,null,null,'block']);r.game.dev.setMastery(id,20);
    let now=100;Object.defineProperty(performance,'now',{value:()=>now*1000,configurable:true});updateCombat(p,w,{},0,now,()=>{});
    p.maxSpirit=p.spirit=p.maxStamina=p.stamina=10000;p.hp=p.maxHp*.4;assertCast(selectAbilityMorph(p,id,family,now).ok);
    for(const [i,e] of w.enemies.entries()){e.x=p.x+55+(i%3)*27;e.y=p.y+(Math.floor(i/3)-1)*28;e.hp=e.maxHp=100000;e.isBoss=false;}
    const input={combatAimX:1,combatAimY:0,hasAim:true,ability0Held:true},a=resolveSubclassAbility(p,id);
    assertCast(useAbility(0,p,w,()=>{},now,input));
    const duration=a.oathBlades?.8:a.subclassMode==='field'?.4:a.channelProfile?.6:a.id==='oathkeeperHeavenbreakerJudgment'?.75:a.id==='oathkeeperJudgmentSmite'&&family==='sinner'?.45:.12;
    for(let t=.025;t<=duration;t+=.025){now=100+t;updateCombat(p,w,input,.025,now,()=>{});for(const f of w.effects)f.age+=.025;w.effects=w.effects.filter(f=>f.age<f.ttl);}
    r.draw(now);r.renderHud();return {id,family,name:a.name,description:abilitySummary(a,p),effectGeometries:[...new Set(w.effects.map(f=>f.geometry).filter(Boolean))],picture:document.querySelector('#arena').toDataURL('image/png')};
    function assertCast(ok){if(!ok)throw Error('Failed '+family+'/'+id);}
   },{id,family});
   assert(data.description.length>30);fs.writeFileSync(`${out}/${id}-${family}.png`,Buffer.from(data.picture.split(',')[1],'base64'));delete data.picture;casts.push(data);
  }
  const visual=await page.evaluate(async()=>{
   const {drawOathkeeperEffect}=await import('/src/oathkeeperArt.js'),c=document.createElement('canvas');c.width=800;c.height=650;const ctx=c.getContext('2d'),checks=[];
   const geometries=['oathWarning','graveBlades','graveSword','graveCleave','graveField','bladeProcession','swordGuard','graveReclaim','graveMark','holySlam','bash','oathDebt'];
   for(const geometry of geometries)for(const age of [.01,.2,.45]){
    const fx={kind:'subclassAbility',abilityId:'oathkeeperJudgmentSmite',subclassId:['holySlam','bash','oathDebt'].includes(geometry)?'holyknight':'sinner',geometry,x:350,y:350,radius:120,range:120,dirX:1,dirY:0,age,ttl:.6};
    const sample=camera=>{ctx.clearRect(0,0,800,650);drawOathkeeperEffect(ctx,fx,camera);return ctx.getImageData(170-camera.x,140-camera.y,360,380).data;};
    const a=sample({x:0,y:0}),b=sample({x:13,y:11});let drift=0,visible=0;for(let i=0;i<a.length;i++){if(a[i]!==b[i])drift++;if(i%4===3&&a[i])visible++;}
    if(drift||visible<20)throw Error(geometry+' drift '+drift+' visible '+visible);checks.push({geometry,age,drift,visible});
   }
   return {checks};
  });
  // A contact sheet uses the actual simulation captures above.
  const sheetPage=await browser.newPage();
  await sheetPage.setContent('<html><body style="margin:0;background:#17191c;color:#e4dccb;font:18px Georgia"><main id="sheet" style="width:max-content;padding:24px;display:grid;grid-template-columns:repeat(4,500px);gap:18px"></main></body></html>');
  await sheetPage.evaluate(async({casts,base})=>{
   const sheet=document.querySelector('#sheet');for(const c of casts){const card=document.createElement('div');card.innerHTML=`<b>${c.family} · ${c.name}</b><img style="display:block;width:500px;margin-top:8px" src="${base}/${c.id}-${c.family}.png">`;sheet.append(card);}
   await Promise.all([...document.images].map(i=>i.decode()));
  },{casts,base:'http://127.0.0.1:8768/docs/oathkeeper-identity'});
  await sheetPage.locator('#sheet').screenshot({path:out+'/combat-sheet.png'});
  const gallery=await browser.newPage();gallery.on('pageerror',e=>errors.push(e.message));gallery.on('response',r=>{if(r.status()>=400)missing.push(r.url());});
  await gallery.goto('http://127.0.0.1:8768/docs/oathkeeper-identity/');
  await gallery.evaluate(()=>{for(const i of document.images)i.loading='eager';});
  await gallery.waitForFunction(()=>[...document.images].every(i=>i.complete&&i.naturalWidth>0));
  assert.equal(await gallery.locator('a.play').count(),26);
  for(const [width,height] of [[1440,1050],[390,844]]){
   await gallery.setViewportSize({width,height});assert(await gallery.evaluate(()=>document.documentElement.scrollWidth<=innerWidth));
   await gallery.screenshot({path:`${out}/gallery-${width}.png`});
  }
  await gallery.locator('a.play[href*="oathkeeperJudgmentSmite&morph=sinner"]').click();
  await gallery.waitForFunction(()=>window.combatReview?.game?.player?.abilityMorphs?.oathkeeperJudgmentSmite==='sinner');
  assert((await gallery.locator('#slots').innerText()).includes('Impaling Sentence'));
  assert.equal(casts.length,26);assert.deepEqual(errors,[]);assert.deepEqual(missing,[]);
  fs.writeFileSync(out+'/browser-verification.json',JSON.stringify({casts,visual,gallery:{cards:26,viewports:2,liveSkillLink:'passed'},errors,missing},null,2));console.log(JSON.stringify({casts:casts.length,anchoredAnimationChecks:visual.checks.length,gallery:'passed',errors,missing}));
 }finally{await browser.close();}
})().catch(e=>{console.error(e);process.exitCode=1;});
