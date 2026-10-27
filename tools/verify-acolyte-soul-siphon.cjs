const {chromium}=require(process.env.RUNALIS_NODE_MODULES+'/playwright');
const assert=require('node:assert/strict'),fs=require('node:fs');
(async()=>{
 const browser=await chromium.launch({channel:'msedge',headless:true}),errors=[],missing=[];
 fs.mkdirSync('docs/acolyte-soul-siphon',{recursive:true});
 try{
  const page=await browser.newPage({viewport:{width:1440,height:1000}});
  page.on('pageerror',e=>errors.push(e.message));page.on('response',r=>{if(r.status()>=400)missing.push(r.url());});
  await page.goto('http://127.0.0.1:8768/combat-overhaul-lab.html?skill=soulSiphon&morph=acolyte');
  await page.waitForFunction(()=>window.combatReview?.game?.player);await page.waitForTimeout(700);
  const report=await page.evaluate(async()=>{
   const {useAbility,updateCombat}=await import('/src/combat.js'),{getSubclassCombatState}=await import('/src/subclassCombat.js');
   const {migratePlayer}=await import('/src/player.js');
   const g=combatReview.game,p=g.player,w=g.world;g.paused=true;
   for(const s of Object.values(p.skillState.skills))s.level=20;migratePlayer(p);
   Object.assign(p,{x:480,y:310});p.spirit=p.maxSpirit;p.cooldowns={};p.hp=p.maxHp;
   for(const row of w.tiles)for(const tile of row)tile.passable=true;
   w.effects=[];w.enemies=Array.from({length:18},(_,i)=>({id:'target'+i,kind:'rat',name:'Target',x:480+Math.cos(i*Math.PI*2/18)*[85,130,180][i%3],y:310+Math.sin(i*Math.PI*2/18)*[85,130,180][i%3],hp:10000,maxHp:10000,radius:12,r:12,attackCooldown:20}));
   const slot=p.loadout.abilitySlots.indexOf('soulSiphon'),now=performance.now()/1000,input={combatAimX:1,combatAimY:0,hasAim:true},spirit=p.spirit;
   if(!useAbility(slot,p,w,()=>{},now,input))throw Error('Soul Siphon failed');
   const spiritSpent=spirit-p.spirit;
   let peakEffects=0;const started=performance.now();
   for(let i=1;i<=180;i++){updateCombat(p,w,input,1/60,now+i/60,()=>{});for(const fx of w.effects)fx.age=(fx.age||0)+1/60;w.effects=w.effects.filter(f=>(f.age||0)<f.ttl);peakEffects=Math.max(peakEffects,w.effects.length);}
   p.visualAction=null;combatReview.draw();const s=getSubclassCombatState(p);
   return {channel:!!p.activeChannel,fieldCount:s.fields.length,radius:s.fields[0].radius,hitCount:w.enemies.filter(e=>e.hp<e.maxHp).length,burnCount:[...s.afflictions.values()].filter(b=>b.effects.get('soulBurn:soulSiphon')?.dot).length,peakEffects,simulationMs:performance.now()-started,spiritSpent,art:w.effects.some(f=>f.geometry==='soulSiphonField')};
  });
  assert.equal(report.channel,false);assert.equal(report.fieldCount,1);assert.equal(report.radius,210);assert.equal(report.hitCount,18);assert.equal(report.burnCount,18);assert(report.peakEffects<50);assert.equal(report.spiritSpent,18);assert(report.art);
  await page.locator('#arena').screenshot({path:'docs/acolyte-soul-siphon/encounter.png'});
  const art=await page.evaluate(async()=>{
   const {drawSoulSiphonField,drawSoulBurn}=await import('/src/acolyteSoulSiphonArt.js'),{drawHumanActor}=await import('/src/humanRenderer.js');
   const canvas=document.createElement('canvas');canvas.id='siphon-art-review';canvas.width=510;canvas.height=510;canvas.style.width='510px';canvas.style.height='510px';document.body.appendChild(canvas);
   const ctx=canvas.getContext('2d'),hashes=[],v={active:true,duration:6};
   const render=(age,bg='#2c3028',camera={x:0,y:0})=>{
    ctx.globalAlpha=1;ctx.fillStyle=bg;ctx.fillRect(0,0,510,510);
    for(let y=0;y<510;y+=24)for(let x=0;x<510;x+=48){ctx.strokeStyle='#3d4034';ctx.strokeRect(x+(y%48?24:0),y,47,23);}
    ctx.globalAlpha=.83;ctx.lineWidth=7;drawSoulSiphonField(ctx,{x:255,y:267,radius:210,ttl:6,age,soulVisual:v},camera);
    if(ctx.globalAlpha!==.83||ctx.lineWidth!==7)throw Error('Art leaks canvas state');
    hashes.push([...ctx.getImageData(0,0,510,510).data].join(','));
   };
   for(const age of [.3,1.1,1.4])render(age);
   render(1.4);const first=ctx.getImageData(0,0,510,510).data;
   render(1.4);const second=ctx.getImageData(0,0,510,510).data;
   let drift=0;for(let i=0;i<first.length;i++)if(first[i]!==second[i])drift++;
   const check=document.createElement('canvas');check.width=510;check.height=510;const cc=check.getContext('2d'),fx={x:255,y:267,radius:210,ttl:6,age:1.4,soulVisual:v};
   drawSoulSiphonField(cc,fx,{x:0,y:0});const anchored=cc.getImageData(0,0,510,510).data;
   cc.clearRect(0,0,510,510);drawSoulSiphonField(cc,fx,{x:10,y:-14});const shifted=cc.getImageData(0,0,510,510).data;
   let cameraDrift=0,maxCameraDelta=0;for(let y=14;y<510;y++)for(let x=0;x<500;x++)for(let c=0;c<4;c++){
    const delta=Math.abs(anchored[((y-14)*510+x+10)*4+c]-shifted[(y*510+x)*4+c]);maxCameraDelta=Math.max(maxCameraDelta,delta);if(delta>2)cameraDrift++;
   }
   v.active=false;cc.clearRect(0,0,510,510);drawSoulSiphonField(cc,fx,{x:0,y:0});const cancelledPixels=cc.getImageData(0,0,510,510).data.some(n=>n!==0);v.active=true;
   render(1.4);ctx.globalAlpha=1;const p=combatReview.game.player;drawHumanActor(ctx,{...p,x:255,y:267},{x:0,y:0},{isPlayer:true,animationTime:1.4});
   drawSoulBurn(ctx,345,305,1.4);drawSoulBurn(ctx,185,185,1.4);
   return {distinctFrames:new Set(hashes.slice(0,3)).size,deterministicPixels:drift===0,cameraDrift,maxCameraDelta,cancelledPixels};
  });
  assert.equal(art.distinctFrames,3);assert(art.deterministicPixels);assert.equal(art.cameraDrift,0);assert.equal(art.cancelledPixels,false);
  await page.locator('#siphon-art-review').screenshot({path:'docs/acolyte-soul-siphon/preview.png'});
  assert.deepEqual(errors,[]);assert.deepEqual(missing,[]);
  fs.writeFileSync('docs/acolyte-soul-siphon/browser-verification.json',JSON.stringify({pass:true,report,art,errors,missing},null,2)+'\n');console.log(JSON.stringify({pass:true,report,art,errors,missing}));
 }finally{await browser.close();}
})().catch(e=>{console.error(e);process.exitCode=1;});
