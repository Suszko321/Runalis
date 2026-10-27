const {chromium}=require(process.env.RUNALIS_NODE_MODULES+'/playwright');
const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path');
const root=path.resolve('docs/world-art/enemies'),base='http://127.0.0.1:8766';
(async()=>{
 const browser=await chromium.launch({channel:'msedge',headless:true}),errors=[],failed=[],report={};
 try{
  const page=await browser.newPage({viewport:{width:1440,height:1100}});
  page.on('pageerror',e=>errors.push(e.message));page.on('response',r=>{if(r.status()>=400)failed.push(r.url());});
  await page.goto(base+'/enemy-visual-lab.html');await page.waitForFunction(()=>window.enemyArtReview&&enemyArtReview.spriteArtStatus().every(a=>a.ready||a.failed));
  assert.deepEqual(await page.evaluate(()=>enemyArtReview.spriteArtStatus().filter(a=>a.failed)),[]);
  report.matrix=await page.evaluate(()=>{
   const api=enemyArtReview,ctx=document.querySelector('#review').getContext('2d'),original=ctx.drawImage.bind(ctx);let images=0,invalid=0;
   ctx.drawImage=function(img,...a){images++;if(a.length===8&&(a[0]<0||a[1]<0||a[0]+a[2]>img.width+.001||a[1]+a[3]>img.height+.001))invalid++;return original(img,...a);};
   let configurations=0;
   try{for(const pose of ['idle','walk','run','attack','hurt','block','death'])for(const facing of ['1','-1','down','up'])for(const lighting of ['day','night','dungeon'])for(const distance of ['1'])for(const variant of ['0']){
    Object.assign(api.controls.pose,{value:pose});api.controls.facing.value=facing;api.controls.lighting.value=lighting;api.controls.distance.value=distance;api.controls.variant.value=variant;api.rebuild();
    api.controls.phase.value=String(1+configurations%3);api.controls.labels.checked=configurations%2===0;api.draw();configurations++;
   }}finally{ctx.drawImage=original;}
   return {configurations,actors:api.actorCount,imageDraws:images,invalidSourceRectangles:invalid};
  });assert.equal(report.matrix.invalidSourceRectangles,0);
  const capture=async(name,pose,facing,lighting='day',phase='1')=>{
   await page.evaluate(({pose,facing,lighting,phase})=>{const a=enemyArtReview;a.controls.pose.value=pose;a.controls.facing.value=facing;a.controls.lighting.value=lighting;a.controls.phase.value=phase;a.controls.distance.value='1';a.controls.variant.value='0';a.controls.labels.checked=true;a.rebuild();a.draw();},{pose,facing,lighting,phase});
   await page.waitForTimeout(170);await page.locator('#review').screenshot({path:path.join(root,name+'.png')});
  };
  await capture('after','idle','1');await capture('walking-east','walk','1');await capture('walking-west','walk','-1');await capture('south-facing','idle','down');await capture('night-attacks','attack','-1','night','3');await capture('dungeon-deaths','death','1','dungeon');
  await page.evaluate(()=>{enemyArtReview.controls.labels.checked=false;enemyArtReview.controls.pose.value='idle';enemyArtReview.controls.lighting.value='day';enemyArtReview.draw();});
  await page.locator('#review').screenshot({path:path.join(root,'silhouettes-no-names.png')});
  report.playerEquipment=await page.evaluate(async()=>{
   const {drawHumanActor}=await import('/src/humanRenderer.js'),{ENEMY_OUTFIT_SETS,enemyOutfitFor}=await import('/src/enemyEquipmentData.js'),{factionArtCacheStatus,blightedUniformArt,blightedUniformCacheStatus}=await import('/src/factionEquipmentArt.js');
   const canvas=document.createElement('canvas');canvas.id='equipment-review';canvas.width=1440;canvas.height=1440;document.body.append(canvas);const ctx=canvas.getContext('2d');
   ctx.fillStyle='#58604c';ctx.fillRect(0,0,1440,1440);let renders=0,empty=0;const factions=Object.keys(ENEMY_OUTFIT_SETS);
   for(const [column,faction] of factions.entries())for(const [row,role] of ['knight','archer','caster'].entries())for(const [gender,bodyType] of ['male','female'].entries()){
    const x=(column+.5)*1440/7,y=(row*2+gender+.8)*240,equipment=enemyOutfitFor({faction,role,variant:0});
    drawHumanActor(ctx,{x,y,hp:100,bodyType,skin:'#d0ab87',hair:'#6c5643',hairStyle:bodyType==='male'?'short':'ponytail',dirX:1,dirY:0,isMoving:true,walkTime:.37,equipment},{x:0,y:0},{scale:2});
    ctx.fillStyle='#ede3c9';ctx.font='12px system-ui';ctx.textAlign='center';ctx.fillText(`${faction} / ${role} / ${bodyType}`,x,y+40);
   }
   const scratch=document.createElement('canvas');scratch.width=200;scratch.height=200;const c=scratch.getContext('2d',{willReadFrequently:true});
   for(const [faction,set] of Object.entries(ENEMY_OUTFIT_SETS))for(const item of Object.values(set))for(const bodyType of ['male','female'])for(const [dirX,dirY] of [[1,0],[-1,0],[0,1],[0,-1]])for(const walking of [false,true]){
    const {ITEMS}=await import('/src/data.js');c.clearRect(0,0,200,200);drawHumanActor(c,{x:100,y:150,hp:100,bodyType,skin:'#d0ab87',hair:'#6c5643',dirX,dirY,isMoving:walking,walkTime:.37,equipment:{[ITEMS[item].slot]:item}},{x:0,y:0});renders++;
    if(!c.getImageData(0,0,200,200).data.some((v,i)=>i%4===3&&v))empty++;
   }
   const {asset}=await import('/src/spriteArt.js'),{getEnemyVisualProfile}=await import('/src/enemyVisualProfiles.js');
   const source=asset('enemies-blighted').image;const hashes=[];for(const faction of factions){const image=blightedUniformArt(source,getEnemyVisualProfile({kind:'hollowling',name:'Blighted Soldier',visualVictim:'soldier',visualFactionId:faction}));let h=2166136261;for(const v of image.getContext('2d').getImageData(0,0,image.width,image.height).data)h=Math.imul(h^v,16777619)>>>0;hashes.push(h);}
   const section=document.createElement('section');section.id='inventory-review';section.style='display:grid;grid-template-columns:repeat(7,1fr);gap:12px;padding:20px;background:#252b26';const {ITEMS}=await import('/src/data.js'),{itemIconMarkup}=await import('/src/gearVisualStyle.js');
   for(const set of Object.values(ENEMY_OUTFIT_SETS))for(const item of Object.values(set)){const card=document.createElement('div');card.style='display:flex;gap:8px;align-items:center;min-height:55px;font-size:12px';card.innerHTML=itemIconMarkup(ITEMS[item])+`<span>${ITEMS[item].name}</span>`;section.append(card);}document.body.append(section);
   const warm=factionArtCacheStatus(),uniforms=blightedUniformCacheStatus();for(let n=0;n<100;n++)enemyArtReview.draw();return {renders,empty,warm,afterRepeatedFrames:factionArtCacheStatus(),uniforms,uniformsAfterRepeatedFrames:blightedUniformCacheStatus(),distinctFormerFactionUniforms:new Set(hashes).size,inventoryIcons:section.querySelectorAll('svg').length};
  });
  assert.equal(report.playerEquipment.empty,0);assert.deepEqual(report.playerEquipment.warm,report.playerEquipment.afterRepeatedFrames);
  assert(report.playerEquipment.warm.tintedAtlases<=report.playerEquipment.warm.maxAtlases);
  assert.equal(report.playerEquipment.distinctFormerFactionUniforms,7);assert.equal(report.playerEquipment.inventoryIcons,84);assert.deepEqual(report.playerEquipment.uniforms,report.playerEquipment.uniformsAfterRepeatedFrames);
  await page.locator('#equipment-review').screenshot({path:path.join(root,'player-faction-equipment.png')});
  await page.locator('#inventory-review').screenshot({path:path.join(root,'faction-inventory.png')});
  report.summonEquipment=await page.evaluate(async()=>{
   const {drawSummonAsset}=await import('/src/codeAssets.js');const canvas=document.createElement('canvas');canvas.id='summon-equipment-review';canvas.width=1200;canvas.height=300;document.body.append(canvas);const ctx=canvas.getContext('2d');ctx.fillStyle='#58604c';ctx.fillRect(0,0,1200,300);
   const cases=[{kind:'skeletonServant'},{kind:'skeletonServant',skeletonRole:'marksman',coterieEquipment:{armour:'graveboundChest'}},{kind:'skeletonServant',evolutionStage:'skeletalKnight'},{kind:'skeletonServant',evolutionStage:'skeletalKnight',skeletonRole:'marksman',coterieEquipment:{armour:'graveboundChest',weapon:'hunterBow'}},{kind:'lich',evolutionStage:'lich'}];let mutated=0,humanSprites=0;
   const original=ctx.drawImage.bind(ctx);ctx.drawImage=(img,...a)=>{if(/human-(male|female)/.test(img.src||''))humanSprites++;return original(img,...a);};
   for(const [i,s] of cases.entries()){s.x=120+i*240;s.y=200;s.dirX=1;s.walkTime=.3;const before=JSON.stringify(s);drawSummonAsset(ctx,s,{classId:'gravecaller',level:1},s.x,s.y);if(JSON.stringify(s)!==before)mutated++;ctx.fillStyle='#ede3c9';ctx.font='12px system-ui';ctx.textAlign='center';ctx.fillText(s.skeletonRole||s.evolutionStage||s.kind,s.x,250);}ctx.drawImage=original;return {cases:cases.length,mutated,humanSprites};
  });assert.equal(report.summonEquipment.mutated,0);assert.equal(report.summonEquipment.humanSprites,0);
  await page.locator('#summon-equipment-review').screenshot({path:path.join(root,'skeletal-equipment.png')});
  // Match the same scene, canvas, actor count and warm-up on both source versions.
  const baseline=await browser.newPage({viewport:{width:1440,height:1100}});
  baseline.on('pageerror',e=>errors.push('Baseline: '+e.message));
  await baseline.route('**/src/*.js*',async route=>{
   const name=path.basename(new URL(route.request().url()).pathname),file=path.resolve('backups/world-art-2026-10-18',name);
   if(!fs.existsSync(file))return route.continue();let body=fs.readFileSync(file,'utf8');if(name==='render.js')body=body.replace('\nfunction drawEnemy(', '\nexport function drawEnemy(');
   return route.fulfill({contentType:'text/javascript',body});
  });
  await baseline.goto(base+'/enemy-visual-lab.html');await baseline.waitForFunction(()=>window.enemyArtReview&&enemyArtReview.spriteArtStatus().every(a=>a.ready||a.failed));
  const measure=async p=>p.evaluate(()=>{const a=enemyArtReview;a.controls.pose.value='idle';a.controls.facing.value='1';a.controls.lighting.value='day';a.controls.distance.value='1';a.controls.phase.value='1';a.controls.labels.checked=true;a.controls.variant.value='0';a.rebuild();a.benchmark(40,36);return Array.from({length:3},()=>a.benchmark(60,36));});
  report.performance={method:'Same 36-actor gallery, 1440x1512 canvas, idle/day/east/names, 40 warm-up frames; three synchronous 60-frame trials per version. Canvas render CPU only, not whole-game FPS.',before:await measure(baseline),after:await measure(page)};
  await baseline.locator('#review').screenshot({path:path.join(root,'before-matched.png')});
  // Ordinary player art must remain byte-identical with old versus current modules.
  const playerHashes=async p=>p.evaluate(async()=>{
   const {drawHumanActor}=await import('/src/humanRenderer.js');const c=document.createElement('canvas');c.width=200;c.height=200;const ctx=c.getContext('2d',{willReadFrequently:true}),original=performance.now.bind(performance);performance.now=()=>10000;
   try{const hashes=[];for(const bodyType of ['male','female'])for(const [dirX,dirY] of [[1,0],[-1,0],[0,1],[0,-1]])for(const equipment of [{},{chest:'leatherVest',legs:'leatherLeggings',weapon:'ironSword'}]){ctx.clearRect(0,0,200,200);drawHumanActor(ctx,{x:100,y:150,hp:100,bodyType,skin:'#d0ab87',hair:'#6c5643',dirX,dirY,isMoving:true,walkTime:.37,equipment},{x:0,y:0},{animationTime:0});let h=2166136261;for(const v of ctx.getImageData(0,0,200,200).data)h=Math.imul(h^v,16777619)>>>0;hashes.push(h);}return hashes;}finally{performance.now=original;}
  });
  await playerHashes(baseline);await playerHashes(page);await page.waitForTimeout(200);
  const oldHashes=await playerHashes(baseline),newHashes=await playerHashes(page);assert.deepEqual(newHashes,oldHashes);report.originalPlayerPixels={renders:newHashes.length,identical:true};
  report.errors=errors;report.failedRequests=failed;assert.deepEqual(errors,[]);assert.deepEqual(failed,[]);report.pass=true;
  fs.writeFileSync(path.join(root,'browser-validation.json'),JSON.stringify(report,null,2));console.log(JSON.stringify(report,null,2));
 }finally{await browser.close();}
})().catch(e=>{console.error(e);process.exitCode=1});
