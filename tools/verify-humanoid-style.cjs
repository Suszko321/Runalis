const {chromium}=require(process.env.RUNALIS_NODE_MODULES+'/playwright');
const assert=require('node:assert/strict'),fs=require('node:fs');
(async()=>{
 const browser=await chromium.launch({channel:'msedge',headless:true}),errors=[],missing=[];
 try{
  const page=await browser.newPage({viewport:{width:1440,height:1100}});
  page.on('pageerror',e=>errors.push(e.message));page.on('response',r=>{if(r.status()>=400)missing.push(r.url());});
  await page.goto('http://127.0.0.1:8768/enemy-visual-lab.html');
  await page.waitForFunction(()=>window.enemyArtReview&&enemyArtReview.spriteArtStatus().every(a=>a.ready||a.failed));
  await page.evaluate(async()=>{
   const {drawHumanActor}=await import('/src/humanRenderer.js');
   const canvas=document.createElement('canvas');canvas.width=200;canvas.height=200;
   for(const bodyType of ['male','female'])drawHumanActor(canvas.getContext('2d'),{x:100,y:140,hp:100,bodyType,equipment:{},dirX:0,dirY:1},{x:0,y:0});
  });
  await page.waitForFunction(()=>enemyArtReview.spriteArtStatus().every(a=>a.ready||a.failed));
  const report=await page.evaluate(async()=>{
   const {drawHumanActor}=await import('/src/humanRenderer.js');
   const {ITEMS}=await import('/src/data.js');
   const {enemyOutfitFor,ENEMY_OUTFIT_SETS}=await import('/src/enemyEquipmentData.js');
   const {humanEquipmentArtStatus}=await import('/src/humanEquipmentSprites.js');
   const {WEAPON_MOVESETS,ensureCombatState}=await import('/src/combatMoves.js');
   const {spriteArtStatus}=await import('/src/spriteArt.js');
   const c=document.createElement('canvas');c.width=200;c.height=200;const ctx=c.getContext('2d',{willReadFrequently:true});
   const drawImage=ctx.drawImage.bind(ctx);let invalidSources=0,draws=0;
   ctx.drawImage=(image,...a)=>{draws++;if(a.length===8&&(a[0]<0||a[1]<0||a[0]+a[2]>image.width+.01||a[1]+a[3]>image.height+.01))invalidSources++;return drawImage(image,...a);};
   const make=(equipment,bodyType)=>{const actor={x:100,y:140,hp:100,bodyType,hairStyle:bodyType==='female'?'ponytail':'short',skin:'#e5b18a',hair:'#3b2923',shirt:'#9b7042',pants:'#4c5058',boots:'#78512f',equipment,actionState:{},dirX:0,dirY:1};ensureCombatState(actor);return actor;};
   const wearable=Object.values(ITEMS).filter(i=>['helm','chest','legs'].includes(i.slot));let renders=0,mutations=0,empty=0;
   for(const item of wearable)for(const bodyType of ['male','female'])for(const [dirX,dirY] of [[0,1],[1,0],[0,-1],[-1,0]])for(const pose of ['idle','walk','run','attack','block','cast']){
    const actor=make({[item.slot]:item.id,weapon:pose==='cast'?'walkingStick':'noviceBlade'},bodyType);Object.assign(actor,{dirX,dirY,isMoving:['walk','run'].includes(pose),walkTime:.37});actor.actionState.sprinting=pose==='run';actor.actionState.blocking=pose==='block';
    if(pose==='attack')Object.assign(actor.combatState,{attacking:true,attackMove:WEAPON_MOVESETS.sword.moves[0],attackElapsed:WEAPON_MOVESETS.sword.moves[0].duration*.5});
    if(pose==='cast')actor.visualAction={kind:'cast',animationFamily:'magic',abilityId:'graveSpark',startedAt:performance.now()/1000-.3,duration:1};
    const before=JSON.stringify(actor);ctx.clearRect(0,0,200,200);drawHumanActor(ctx,actor,{x:0,y:0},{scale:1.5});if(JSON.stringify(actor)!==before)mutations++;
    if(!ctx.getImageData(0,0,200,200).data.some((v,i)=>i%4===3&&v))empty++;renders++;
   }
   const gallery=document.createElement('canvas');gallery.id='humanoid-style-review';gallery.width=1440;gallery.height=1050;document.body.append(gallery);const g=gallery.getContext('2d');g.fillStyle='#354032';g.fillRect(0,0,1440,1050);
   const entries=[['Base player',{}],['Leather',{chest:'leatherVest',legs:'leatherLeggings'}],...Object.keys(ENEMY_OUTFIT_SETS).map(f=>[f,enemyOutfitFor({faction:f,role:'knight',variant:0})])];
   for(const [row,[title,equipment]] of entries.entries())for(let col=0;col<6;col++){
    const actor=make(equipment,col<3?'male':'female');actor.x=120+(col%6)*240;actor.y=90+row*115;
    Object.assign(actor,{dirX:col%3===0?0:1,dirY:col%3===0?1:0,isMoving:col%3===2,walkTime:.37});drawHumanActor(g,actor,{x:0,y:0},{scale:1.4});
    g.fillStyle='#e4d5b4';g.font='12px system-ui';g.fillText(`${title} / ${actor.bodyType}`,actor.x-80,actor.y+31);
   }
   const warmed=humanEquipmentArtStatus();for(let i=0;i<100;i++){
    const p=make(enemyOutfitFor({faction:'lastDawn',role:'knight',variant:0}),'male');drawHumanActor(ctx,p,{x:0,y:0});
   }
   const after=humanEquipmentArtStatus();
   return {wearables:wearable.length,renders,draws,mutations,empty,invalidSources,warmed,after,failedAssets:spriteArtStatus().filter(a=>a.failed)};
  });
  assert.equal(report.mutations,0);assert.equal(report.empty,0);assert.equal(report.invalidSources,0);assert.deepEqual(report.failedAssets,[]);
  assert(report.after.armourAtlases<=report.after.maxArmourAtlases);assert(report.after.armAtlases<=report.after.maxArmAtlases);assert.deepEqual(report.warmed,report.after);
  fs.mkdirSync('docs/humanoid-art-style',{recursive:true});await page.locator('#humanoid-style-review').screenshot({path:'docs/humanoid-art-style/browser-gallery.png'});
  // Exercise the actual enemy renderer's attacks, hurt and death layers too.
  await page.evaluate(()=>{for(const pose of ['idle','walk','run','attack','hurt','block','death'])for(const facing of ['1','-1','down','up']){enemyArtReview.controls.pose.value=pose;enemyArtReview.controls.facing.value=facing;enemyArtReview.rebuild();enemyArtReview.draw();}});
  report.performance=await page.evaluate(()=>{
   const a=enemyArtReview;a.controls.pose.value='walk';a.controls.facing.value='1';a.rebuild();a.benchmark(30,36);return a.benchmark(120,36);
  });
  const smoke=await browser.newPage({viewport:{width:1280,height:720}});smoke.on('pageerror',e=>errors.push(e.message));
  await smoke.goto('http://127.0.0.1:8768/');await smoke.locator('#developerModeBtn').click();await smoke.locator('[name="worldState"]').selectOption('fresh');await smoke.locator('.developer-launch').click();
  await smoke.waitForFunction(()=>document.querySelector('#app')?.classList.contains('active'));await smoke.waitForTimeout(800);report.liveGameLaunch=true;
  await smoke.screenshot({path:'docs/humanoid-art-style/live-game.png'});
  assert.deepEqual(errors,[]);assert.deepEqual(missing,[]);
  fs.writeFileSync('docs/humanoid-art-style/browser-verification.json',JSON.stringify({pass:true,report,errors,missing},null,2)+'\n');console.log(JSON.stringify({pass:true,report,errors,missing}));
 }finally{await browser.close();}
})().catch(e=>{console.error(e);process.exitCode=1;});
