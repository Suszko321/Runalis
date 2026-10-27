// Real browser rendering against authored atlases; isolated context, no saves.
const {chromium}=require(process.env.RUNALIS_NODE_MODULES+'/playwright');
const assert=require('node:assert/strict'),fs=require('node:fs');
(async()=>{
 const browser=await chromium.launch({channel:'msedge',headless:true}),report={errors:[]};
 try {
  const page=await browser.newPage({viewport:{width:1440,height:880}});
  page.on('pageerror',e=>report.errors.push(e.stack));
  await page.goto('http://127.0.0.1:8766/docs/progression-overhaul/companion-art.html');
  await page.waitForFunction(()=>document.querySelector('#status').textContent.startsWith('Both pixel atlases loaded'));
  report.rendering=await page.evaluate(async()=>{
   const {drawSummonAsset}=await import('/src/codeAssets.js'),{asset}=await import('/src/spriteArt.js');
   const {COMPANION_SPRITES,companionAnimationFrame}=await import('/src/companionSpriteArt.js');
   const result={kinds:[],stateRestored:true,sourceUnchanged:true,fallbacks:[],liveAnimation:null};
   const canvas=document.createElement('canvas');canvas.width=160;canvas.height=150;
   const ctx=canvas.getContext('2d',{willReadFrequently:true});
   const signatures=(data)=>{let hash=2166136261;for(const n of data)hash=Math.imul(hash^n,16777619);return hash>>>0;};
   const sourceHash=image=>{const c=document.createElement('canvas');c.width=image.width;c.height=image.height;const x=c.getContext('2d');x.drawImage(image,0,0);return signatures(x.getImageData(0,0,c.width,c.height).data);};
   for(const [kind,config]of Object.entries(COMPANION_SPRITES)) {
    const image=asset(config.sheet).image,before=sourceHash(image),entry={kind,frames:[],facings:[],coolPixels:0,violetPixels:0,changedPixels:0};
    for(const facing of [1,-1]) {
     const hashes=[];
     for(const [state,moving,walkTime,attack]of [['idle',false,0,false],['walk1',true,0,false],['walk2',true,1,false],['attack',false,0,true]]) {
      const now=performance.now()/1000,s={kind,x:0,y:0,dirX:facing,moving,walkTime,attackAnimationUntil:attack?now+1:0};
      const snapshot=JSON.stringify(s);ctx.clearRect(0,0,160,150);ctx.globalAlpha=.85;ctx.imageSmoothingEnabled=true;
      const transform=ctx.getTransform();drawSummonAsset(ctx,s,{},80,108);
      if(ctx.globalAlpha!==.85||ctx.imageSmoothingEnabled!==true||JSON.stringify(ctx.getTransform())!==JSON.stringify(transform))result.stateRestored=false;
      if(JSON.stringify(s)!==snapshot)throw Error('Renderer mutated summon simulation');
      const pixels=ctx.getImageData(0,0,160,150).data;hashes.push(signatures(pixels));
      if(facing===1)entry.frames.push({state,frame:companionAnimationFrame(s,now),hash:hashes.at(-1)});
      if(state==='idle'&&facing===1) {
       for(let i=0;i<pixels.length;i+=4)if(pixels[i+3]>0){const [r,g,b]=pixels.slice(i,i+3);if(g>r+15&&b>r+15)entry.coolPixels++;if(b>g+20&&r>g+10)entry.violetPixels++;}
       // Same native pose/layout as the original: prove visible recolouring.
       const allied=pixels.slice();ctx.clearRect(0,0,160,150);ctx.save();ctx.translate(80,108);ctx.imageSmoothingEnabled=false;
       const scale=kind==='miniDemon'?.75:1;ctx.drawImage(image,0,config.row*config.height,config.width,config.height,-Math.round(config.width*scale/2),16-Math.round(config.pivot*scale),Math.round(config.width*scale),Math.round(config.height*scale));ctx.restore();
       const original=ctx.getImageData(0,0,160,150).data;
       for(let i=0;i<allied.length;i+=4)if(original[i+3]>0&&(Math.abs(allied[i]-original[i])+Math.abs(allied[i+1]-original[i+1])+Math.abs(allied[i+2]-original[i+2])>40))entry.changedPixels++;
      }
     }
     entry.facings.push({facing,uniqueFrames:new Set(hashes).size,hashes});
    }
    result.sourceUnchanged&&=before===sourceHash(image);result.kinds.push(entry);
    const loaded=asset(config.sheet);loaded.ready=false;ctx.clearRect(0,0,160,150);
    drawSummonAsset(ctx,{kind,dirX:1,moving:true,walkTime:1,attackAnimationUntil:performance.now()/1000+1},{},80,108);loaded.ready=true;
    result.fallbacks.push({kind,visible:ctx.getImageData(0,0,160,150).data.some(n=>n!==0)});
   }
   // Verify movement/attack frames respond to actual combat companion updates.
   const {createPlayer}=await import('/src/player.js'),{updateSummons}=await import('/src/combat.js');
   const p=createPlayer('Isolated art review');Object.assign(p,{id:'art-review',x:300,y:300,hp:100,dirX:1,dirY:0});
   const w={mode:'dungeon',width:40,height:40,tiles:Array.from({length:40},()=>Array.from({length:40},()=>({passable:true,biome:'grass'}))),objects:[],enemies:[],effects:[],drops:[]};
   result.liveAnimation=[];
   for(const [kind,abilityId]of [['wolf','summonWolf'],['miniDemon','summonDemon']]) {
    p.loadout.abilitySlots=[abilityId,null,null,null];p.summons=[{id:kind,kind,x:220,y:300,hp:65,maxHp:65,alive:true,speed:200,attackRange:34,attackRate:.6,attackCooldown:0,damage:1,walkTime:0,sourceAbilityId:abilityId}];
    const s=p.summons[0];w.enemies=[];updateSummons(1/60,p,w,()=>{},performance.now()/1000);
    const movementFrame=companionAnimationFrame(s),moved=s.x>220;
    w.enemies=[{id:'target',kind:'rat',x:s.x+20,y:s.y,hp:500,maxHp:500,radius:8,r:8,aggro:3,combatTargetKind:'summon',combatTargetId:s.id}];
    updateSummons(1/60,p,w,()=>{},performance.now()/1000);
    result.liveAnimation.push({kind,moved,movementFrame,attackFrame:companionAnimationFrame(s)});
   }
   return result;
  });
  for(const kind of report.rendering.kinds){assert.deepEqual(kind.frames.map(f=>f.frame),[0,1,2,3]);for(const facing of kind.facings)assert.equal(facing.uniqueFrames,4);assert.notEqual(kind.facings[0].hashes[0],kind.facings[1].hashes[0]);assert.ok(kind.changedPixels>200);assert.ok(kind.coolPixels>(kind.kind==='wolf'?100:8),JSON.stringify(kind));if(kind.kind==='miniDemon')assert.ok(kind.violetPixels>100,JSON.stringify(kind));}
  assert.ok(report.rendering.stateRestored&&report.rendering.sourceUnchanged);assert.ok(report.rendering.fallbacks.every(f=>f.visible));
  for(const live of report.rendering.liveAnimation){assert.ok(live.moved&&[1,2].includes(live.movementFrame));assert.equal(live.attackFrame,3);}
  await page.screenshot({path:'docs/progression-overhaul/companion-pixel-art.png',fullPage:true});
  await page.locator('#facing').click();assert.equal(await page.locator('#facing').innerText(),'Face right');
  await page.setViewportSize({width:760,height:850});await page.screenshot({path:'docs/progression-overhaul/companion-pixel-art-compact.png',fullPage:true});
  assert.equal(report.errors.length,0);fs.writeFileSync('docs/progression-overhaul/companion-art-results.json',JSON.stringify(report,null,2)+'\n');console.log(JSON.stringify(report,null,2));
 }finally{await browser.close();}
})().catch(e=>{console.error(e);process.exitCode=1;});
