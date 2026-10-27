const {chromium}=require(process.env.RUNALIS_NODE_MODULES+'/playwright');
const fs=require('node:fs'),assert=require('node:assert/strict');
const folder='docs/infernal-waller';fs.mkdirSync(folder,{recursive:true});
(async()=>{
 const browser=await chromium.launch({channel:'msedge',headless:true});
 try{
  const page=await browser.newPage({viewport:{width:1200,height:920}}),errors=[];page.on('pageerror',e=>errors.push(e.message));
  await page.goto('http://127.0.0.1:8768/enemy-combat-lab.html');await page.waitForFunction(()=>window.enemyCombatLab&&enemyCombatLab.spriteArtStatus().every(a=>a.ready||a.failed));
  await page.evaluate(async()=>{
   const a=enemyCombatLab;a.reset('elite:waller');a.advance(1/60);const e=a.world.enemies[0];
   const {cancelEnemyAttackPresentation}=await import('/src/enemyAttackPresentation.js');cancelEnemyAttackPresentation(e);e.telegraph=null;e.eliteAttackPauseTimer=9999;e.attackCooldown=e.specialCooldown=e.chargeCooldown=99;
   for(let t=0;t<7&&!a.hazards.length;t+=.1)a.advance(.1);if(!a.hazards.length)throw Error('Waller never prepared');
   a.advance(.25);a.render();
  });
  await page.locator('#stage').screenshot({path:folder+'/warning.png'});
  await page.evaluate(()=>{const a=enemyCombatLab,h=a.hazards[0];a.advance(h.warning-h.age+.04);});
  await page.locator('#stage').screenshot({path:folder+'/emerging.png'});
  await page.evaluate(()=>enemyCombatLab.advance(.35));await page.locator('#stage').screenshot({path:folder+'/active.png'});
  const crop=await page.evaluate(()=>{const c=document.querySelector('#stage'),b=c.getBoundingClientRect(),h=enemyCombatLab.hazards[0],s=b.width/c.width;return {x:b.x+(h.x-h.radius-25)*s,y:b.y+(h.y-h.radius-65)*s,width:(h.radius*2+50)*s,height:(h.radius*2+90)*s};});
  await page.screenshot({path:folder+'/preview.png',clip:crop});
  await page.selectOption('#lighting','night');await page.evaluate(()=>enemyCombatLab.render());await page.locator('#stage').screenshot({path:folder+'/night.png'});
  const report=await page.evaluate(async()=>{
   const a=enemyCombatLab,h=a.hazards[0],before=JSON.stringify(h.segments),effects=a.world.effects.length;
   const {isActorPositionPassable}=await import('/src/world.js'),{drawInfernalWall}=await import('/src/infernalWallRenderer.js');
   if(h.segments.length!==3)throw Error('U-shaped barrier changed');if(JSON.stringify(a.world.encounterBarriers)!==before)throw Error('Art diverged from collision segments');
   if(isActorPositionPassable(a.world,h.x,h.y-h.radius,8))throw Error('Top wall lost collision');if(!isActorPositionPassable(a.world,h.x,h.y+h.radius+12,8))throw Error('Escape opening blocked');
   const c=document.createElement('canvas');c.width=600;c.height=500;const ctx=c.getContext('2d');ctx.imageSmoothingEnabled=false;
   const origin={x:h.x-300,y:h.y-250};
   const sample=(age,cam=origin)=>{ctx.clearRect(0,0,c.width,c.height);for(const layer of ['behind','front'])drawInfernalWall(ctx,{...h,age},cam,layer);return ctx.getImageData(Math.round(h.x-h.radius-10-cam.x),Math.round(h.y-h.radius-65-cam.y),h.radius*2+20,h.radius*2+85).data;};
   const first=sample(h.warning+.5),next=sample(h.warning+.9);let animated=0,hot=0;
   for(let i=0;i<first.length;i+=4){if(first[i]>170&&first[i]>first[i+1]*1.2)hot++;if([0,1,2,3].some(k=>Math.abs(first[i+k]-next[i+k])>2))animated++;}
   if(hot<70||animated<80)throw Error('Magma or fire animation missing');
   // Multiple translucent fire layers can round premultiplied channels by 3/255.
   const moved=sample(h.warning+.5,{x:origin.x+13,y:origin.y+17});let drift=0,maxDrift=0;for(let i=0;i<first.length;i+=4){for(let k=0;k<4;k++)maxDrift=Math.max(maxDrift,Math.abs(first[i+k]-moved[i+k]));if([0,1,2,3].some(k=>Math.abs(first[i+k]-moved[i+k])>3))drift++;}if(drift)throw Error('Wall art drifts with the camera: '+drift+' pixels, max channel '+maxDrift);
   const timings=[],clock=Date.now;for(let i=0;i<120;i++){const start=clock();sample(h.warning+.5+i/60);timings.push(clock()-start);}timings.sort((a,b)=>a-b);
   if(JSON.stringify(h.segments)!==before||a.world.effects.length!==effects)throw Error('Rendering mutated combat state');
   a.advance(h.warning+h.duration-h.age+.1);if(a.world.encounterBarriers.length||a.hazards.some(f=>f.kind==='waller'))throw Error('Expired barrier not removed');
   return {segments:3,exitOpen:true,collisionPreserved:true,hotPixels:hot,animatedPixels:animated,cameraDriftPixels:drift,compositingTolerance:3,effectQueueUnchanged:true,expiredCleanly:true,renderAndReadbackP95Ms:timings[Math.floor(timings.length*.95)]};
  });
  report.browserErrors=errors;assert.deepEqual(errors,[]);fs.writeFileSync(folder+'/verification.json',JSON.stringify(report,null,2));console.log(JSON.stringify(report,null,2));
 }finally{await browser.close();}
})().catch(e=>{console.error(e);process.exitCode=1;});
