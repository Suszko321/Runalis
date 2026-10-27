const fs=require('node:fs'),assert=require('node:assert/strict');
const {chromium}=require(process.env.RUNALIS_NODE_MODULES+'/playwright');
const dir='docs/nav-stone-spacing';fs.mkdirSync(dir,{recursive:true});
(async()=>{
 const browser=await chromium.launch({channel:'msedge',headless:true});
 try{
  const page=await browser.newPage({viewport:{width:1440,height:900}}),errors=[];
  page.on('pageerror',e=>errors.push(e.message));
  await page.route('**/src/main.js*',r=>r.fulfill({contentType:'text/javascript',body:''}));
  await page.goto('http://127.0.0.1:8766/');
  await page.evaluate(async()=>{
   const ui=await import('/src/ui.js'),{createWorld}=await import('/src/world.js'),{createPlayer}=await import('/src/player.js');
   const {worldMemory,worldEntityMemoryKey,worldEntityMemoryId}=await import('/src/worldExploration.js'),{getSurvey}=await import('/src/mapSurvey.js');
   const world=createWorld({skipPublishedOverride:true}),player=createPlayer('Sparse network review');Object.assign(player,world.spawn);
   const game={world,player,camera:{x:0,y:0},canvas:document.querySelector('#game'),logLines:[],log(){},save(){},keys:{},input:{}};
   const memory=worldMemory(player);for(const stone of world.navStones)memory.stones[stone.id]={name:stone.name};
   // Simulate an older profile remembering dozens of removed roadside stones.
   for(let i=0;i<91;i++)memory.stones['nav-road-retired-'+i]={name:'Old stone',x:i*100,y:1000};
   for(const site of world.authoredLocations)memory.locations[`${worldEntityMemoryKey(world,site)}:${worldEntityMemoryId(site)}`]={name:site.name,x:site.x,y:site.y};
   const survey=getSurvey(memory,world);for(let y=0;y<world.height/8;y++)for(let x=0;x<world.width/8;x++)survey.cells[x+','+y]=true;survey.revision++;
   document.querySelector('#mainMenu').classList.remove('active');document.querySelector('#app').classList.add('active');ui.initUI(game);ui.renderUI(player,[],game);
  });
  await page.locator('[data-tab="map"]').evaluate(e=>e.click());
  assert.equal(await page.locator('.survey-surface .survey-stone').count(),9);
  assert.equal(await page.locator('.survey-stone-list [data-select-stone]').count(),9);
  const overlapping=await page.locator('.survey-surface .survey-stone').evaluateAll(nodes=>{
   const boxes=nodes.map(node=>node.getBoundingClientRect());
   return boxes.some((a,i)=>boxes.slice(i+1).some(b=>a.left<b.right&&a.right>b.left&&a.top<b.bottom&&a.bottom>b.top));
  });assert(!overlapping,'NavStone markers overlap at full-map zoom');
  await page.screenshot({path:dir+'/world-map.png'});
  await page.locator('[data-map-zoom="nearby"]').click();await page.screenshot({path:dir+'/nearby-outpost.png'});
  assert.deepEqual(errors,[]);const report={pass:true,markers:9,overlapping,retiredMemoriesIgnored:91,errors};
  fs.writeFileSync(dir+'/browser-verification.json',JSON.stringify(report,null,2));console.log(JSON.stringify(report));
 }finally{await browser.close();}
})().catch(e=>{console.error(e);process.exitCode=1;});
