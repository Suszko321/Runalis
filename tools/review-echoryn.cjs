const {chromium}=require(process.env.RUNALIS_NODE_MODULES+'/playwright');
const fs=require('node:fs');
(async()=>{
 const browser=await chromium.launch({channel:'msedge',headless:true});
 try{
  const page=await browser.newPage({viewport:{width:1200,height:860}}),errors=[];
  page.on('pageerror',e=>errors.push(e.stack));
  await page.goto('http://127.0.0.1:8766/world-lab.html');
  await page.waitForFunction(()=>window.review?.world?.worldAtmosphere);
  const folder='docs/echoryn-reconstruction';fs.mkdirSync(folder,{recursive:true});
  const results=[];
  // Review captures deliberately omit text so regional identity can be judged from the art.
  await page.evaluate(()=>{window.review.canvas.getContext('2d').fillText=()=>{};});
  const proof=process.argv.includes('--proof');
  const scenes=proof?[['frontier',23,42],['hollow-road',55,55],['hollow-cut',67,63],['orchard-approach',98,81],['ashen-orchard',110,94]]:
   [['frontier',23,42],['hollow-road',55,55],['thornwood',78,153],['ashen-orchard',110,94],['pilgrim-bridge',250,100],['broken-chapel',445,79],['castle-veyr',565,113],['riverlands',105,354],['iron-mire',285,344],['watcher-ridge',510,193],['old-hollow',385,341],['red-seal-keep',560,381]];
  for(const [name,x,y] of scenes){
   await page.evaluate(async([x,y])=>{const g=window.review,{updateWorldExploration}=await import('/src/worldExploration.js');Object.assign(g.player,{x:(x+.5)*32,y:(y+.5)*32});updateWorldExploration(g,.5);g.player.floatingTexts=[];},[x,y]);
   await page.waitForTimeout(450);
   await page.locator('canvas').screenshot({path:folder+'/'+name+'.png'});
   const timing=await page.evaluate(async()=>{const {draw}=await import('/src/render.js'),{echorynRenderStats}=await import('/src/echorynRenderer.js');const g=window.review,c=g.canvas.getContext('2d'),times=[];for(let i=0;i<45;i++){const t=performance.now();draw(c,g.world,g.player,g.camera);times.push(performance.now()-t);}times.sort((a,b)=>a-b);return {median:times[22],p95:times[42],...echorynRenderStats(c,g.world)};});
   results.push({name,...timing});
  }
  await page.locator('#walkRoute').click();
  await page.waitForFunction(()=>Math.hypot(window.review.player.x-110.5*32,window.review.player.y-90.5*32)<3&&document.querySelector('#scene').selectedOptions[0].textContent==='Echoryn · Ashen Orchard',null,{timeout:55000});
  const guidedJourney=await page.evaluate(()=>({x:window.review.player.x,y:window.review.player.y,status:document.querySelector('#status').textContent}));
  await page.locator('canvas').screenshot({path:folder+'/journey-arrival.png'});
  if(!proof){
   for(const [name,x,y] of [['castle-courtyard',565,94],['keep-courtyard',553,395],['chapel-nave',452,64],['watcher-overlook',510,176]]){
    await page.evaluate(([x,y])=>Object.assign(window.review.player,{x:(x+.5)*32,y:(y+.5)*32}),[x,y]);await page.waitForTimeout(300);
    await page.locator('canvas').screenshot({path:folder+'/'+name+'.png'});
   }
   for(const [name,x,y] of [['hollow-elk-grove',99,262],['briar-den',96,177],['caravan-wreck',143,95],['ritual-site',554,383],['saltwell-dock',95,355]]){
    await page.evaluate(async([x,y])=>{Object.assign(window.review.player,{x:(x+.5)*32,y:(y+.5)*32});const {updateWorldExploration}=await import('/src/worldExploration.js');updateWorldExploration(window.review,.5);},[x,y]);await page.waitForTimeout(300);
    await page.locator('canvas').screenshot({path:folder+'/'+name+'.png'});
   }
   await page.evaluate(()=>Object.assign(window.review.player,{x:55.5*32,y:55.5*32}));await page.locator('#night').click();await page.waitForTimeout(300);
   await page.locator('canvas').screenshot({path:folder+'/hollow-road-night.png'});await page.locator('#night').click();
  }
  const walk=await page.evaluate(async()=>{
   const {ECHORYN_ROADS}=await import('/src/echorynGeography.js'),{moveActorWithCollision,isActorPositionPassable}=await import('/src/world.js');
   const g=window.review,road=ECHORYN_ROADS.find(r=>r.id==='hollow-road'),actors=[g.player,{x:0,y:0,r:12}],legs=[];
   for(const a of actors)Object.assign(a,{x:(road.points[0][0]+.5)*32,y:(road.points[0][1]+.5)*32});
   for(let i=1;i<road.points.length;i++){
    const end={x:(road.points[i][0]+.5)*32,y:(road.points[i][1]+.5)*32};
    for(const a of actors){const sx=a.x,sy=a.y,dx=end.x-sx,dy=end.y-sy,n=Math.ceil(Math.hypot(dx,dy)/5);for(let k=0;k<n;k++)moveActorWithCollision(a,g.world,dx/n,dy/n,12);}
    legs.push({point:i,error:Math.hypot(actors[0].x-end.x,actors[0].y-end.y),companionError:Math.hypot(actors[1].x-end.x,actors[1].y-end.y)});
   }
   return {legs,valid:isActorPositionPassable(g.world,g.player.x,g.player.y,12)};
  });
  // Keyboard movement proves the live review route is connected to the runtime input.
  await page.evaluate(()=>Object.assign(window.review.player,{x:35.5*32,y:44.5*32}));
  const before=await page.evaluate(()=>window.review.player.x);await page.keyboard.down('d');await page.waitForTimeout(600);await page.keyboard.up('d');
  const moved=await page.evaluate(()=>window.review.player.x);
  const visualChecks=await page.evaluate(async()=>{
   const {draw}=await import('/src/render.js'),{echorynRenderStats}=await import('/src/echorynRenderer.js');
   const g=window.review,c=g.canvas.getContext('2d');
   const tree=g.world.echorynTrees.find(t=>t.kind==='oak'&&t.x>2000&&t.x<3000);
   Object.assign(g.player,{x:tree.x,y:tree.y-58});g.camera={x:tree.x-550,y:tree.y-350};draw(c,g.world,g.player,g.camera);
   const canopyStats=echorynRenderStats(c,g.world);
   return {tree:{kind:tree.kind,x:tree.x,y:tree.y},canopyStats};
  });
  await page.locator('canvas').screenshot({path:folder+'/canopy-readability.png'});
  // Run the actual game through a profile load, movement, save and reload.
  await page.goto('http://127.0.0.1:8766/');
  await page.evaluate(async()=>{
   const {createWorld}=await import('/src/world.js'),{createPlayer}=await import('/src/player.js'),{createSaveState,writeProfiles}=await import('/src/gameSave.js');
   const world=createWorld(),player=createPlayer('Echoryn runtime review');Object.assign(player,{x:35.5*32,y:44.5*32,currentZone:'Echoryn Forest',act1OpeningPending:false,echorynLayoutRevision:1});
   writeProfiles({'echoryn-review':{id:'echoryn-review',name:'Echoryn runtime review',createdAt:Date.now(),updatedAt:Date.now(),state:createSaveState({world,player,camera:{x:player.x-550,y:player.y-350}})}});
  });
  await page.reload();await page.locator('[data-load="echoryn-review"]').click();
  await page.waitForFunction(()=>document.querySelector('#activeProfileLabel')?.textContent.includes('Echoryn runtime review'));
  await page.waitForTimeout(600);await page.keyboard.down('d');await page.waitForTimeout(600);await page.keyboard.up('d');await page.keyboard.press('Space');await page.waitForTimeout(250);
  await page.screenshot({path:folder+'/gameplay-frontier.png'});
  await page.keyboard.press('Escape');await page.locator('#pauseSaveBtn').click();
  const saved=await page.evaluate(async()=>{const {readProfiles}=await import('/src/gameSave.js');const state=readProfiles()['echoryn-review'].state;return {x:state.player.x,y:state.player.y,revision:state.player.echorynLayoutRevision,mode:state.worldMode};});
  if(saved.mode!=='overworld'||saved.revision!==1||saved.x<35.5*32+30)throw Error('Actual gameplay movement/save failed '+JSON.stringify(saved));
  await page.reload();await page.locator('[data-load="echoryn-review"]').click();await page.waitForFunction(()=>document.querySelector('#activeProfileLabel')?.textContent.includes('Echoryn runtime review'));await page.waitForTimeout(450);await page.screenshot({path:folder+'/gameplay-reloaded.png'});
  const report={errors,results,guidedJourney,walk,keyboardMovement:moved-before,visualChecks,realGame:saved};
  fs.writeFileSync(folder+'/'+(proof?'proof-review':'review')+'.json',JSON.stringify(report,null,2));console.log(JSON.stringify(report));
  if(errors.length||walk.legs.some(l=>l.error>8||l.companionError>8)||moved-before<25)process.exitCode=1;
 }finally{await browser.close();}
})().catch(e=>{console.error(e);process.exitCode=1;});
