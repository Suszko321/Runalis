const {chromium}=require(process.env.RUNALIS_NODE_MODULES+'/playwright');
const fs=require('node:fs');
(async()=>{
 const browser=await chromium.launch({channel:'msedge',headless:true});
 try{
  const page=await browser.newPage({viewport:{width:1440,height:1050}}),errors=[];
  page.on('pageerror',e=>errors.push(e.stack));
  await page.goto('http://127.0.0.1:8766/world-lab.html');
  await page.setContent('<body style="margin:0;background:#141e1a"><img width="1440" height="1180" src="http://127.0.0.1:8766/docs/echoryn-reconstruction/master-layout.svg"></body>');
  await page.waitForFunction(()=>document.querySelector('img').complete);
  await page.screenshot({path:'docs/echoryn-reconstruction/master-layout.png',fullPage:true});
  await page.goto('http://127.0.0.1:8766/');
  await page.evaluate(async()=>{
   const {createWorld}=await import('/src/world.js'),{createPlayer}=await import('/src/player.js'),{createSaveState,writeProfiles}=await import('/src/gameSave.js');
   const {worldMemory}=await import('/src/worldExploration.js'),{surveyKey}=await import('/src/mapSurvey.js'),{ACT1_WORLD_MAP}=await import('/src/worldMapData.js');
   const world=createWorld(),player=createPlayer('Echoryn map review');Object.assign(player,{x:17.5*32,y:36.5*32,currentZone:'Echoryn Forest',act1OpeningPending:false,echorynLayoutRevision:1});
   const memory=worldMemory(player),survey={cells:{},biomes:{},revision:1,migrated:true};
   for(let y=0;y<world.height/8;y++)for(let x=0;x<world.width/8;x++)survey.cells[x+','+y]=true;
   memory.surveys[surveyKey(world)]=survey;
   for(const marker of ACT1_WORLD_MAP.markers)memory.locations['map:'+marker.id]={name:marker.name,x:marker.x*32,y:marker.y*32};
   for(const stone of world.navStones)memory.stones[stone.id]={name:stone.name,x:stone.x,y:stone.y};
   writeProfiles({'echoryn-map-review':{id:'echoryn-map-review',name:'Echoryn map review',state:createSaveState({world,player,camera:{x:0,y:0}})}});
  });
  await page.reload();await page.locator('[data-load="echoryn-map-review"]').click();
  await page.waitForFunction(()=>document.querySelector('#activeProfileLabel')?.textContent.includes('Echoryn map review'));
  await page.keyboard.press('Tab');
  await page.locator('[data-tab="map"]').click();await page.locator('.survey-art').waitFor({state:'visible'});
  await page.waitForTimeout(250);
  const report=await page.evaluate(()=>{
   const art=document.querySelector('.survey-art'),bounds=art.getBoundingClientRect(),forest=art.querySelector('path[fill="#3c5743"]');
   return {width:bounds.width,height:bounds.height,forestPathLength:forest?.getAttribute('d')?.length||0,stones:document.querySelectorAll('.survey-stone').length,places:document.querySelectorAll('.world-map-static-marker').length};
  });
  if(report.width<300||report.height<220||report.forestPathLength<100||report.stones!==9)throw Error('Map geography/render failed: '+JSON.stringify(report));
  await page.screenshot({path:'docs/echoryn-reconstruction/survey-map.png'});
  const before=await page.locator('.survey-surface').getAttribute('style');
  await page.locator('[data-map-zoom="in"]').click();
  const after=await page.locator('.survey-surface').getAttribute('style');
  if(before===after)throw Error('Survey zoom did not change');
  if(errors.length)throw Error(errors.join('\n'));
  fs.writeFileSync('docs/echoryn-reconstruction/map-review.json',JSON.stringify({result:'PASS',errors,...report,zoom:true},null,2));
  console.log(JSON.stringify({result:'PASS',...report}));
 }finally{await browser.close();}
})().catch(e=>{console.error(e);process.exitCode=1;});
