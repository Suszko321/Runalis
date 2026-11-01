const {chromium,webkit}=require(process.env.RUNALIS_PLAYWRIGHT_MODULE||'../tmp/vampire-browser/node_modules/playwright');
const assert=require('node:assert/strict'),fs=require('node:fs');
const out='docs/enemy-loot-delivery',base=process.env.RUNALIS_URL||'http://127.0.0.1:8772';fs.mkdirSync(out,{recursive:true});
(async()=>{const reports=[];
 for(const [engine,type,launch]of [['chromium',chromium,{channel:'msedge',headless:true}],['webkit',webkit,{headless:true}]]){
  const browser=await type.launch(launch);try{
   for(const viewport of [{width:1440,height:900},{width:390,height:844},{width:844,height:390}]){
    const context=await browser.newContext({viewport,isMobile:viewport.width<1000,hasTouch:true,deviceScaleFactor:2}),page=await context.newPage(),errors=[];page.on('pageerror',e=>errors.push(e.message));await page.goto(base+'/art-lab.html');
    const result=await page.evaluate(async viewport=>{
     const {drawWorldDrops}=await import('/src/objectRenderer.js'),{GEAR_RARITIES}=await import('/src/gearRarity.js'),{recordLootCollection,drawLootCollectionFeed}=await import('/src/lootCollectionFeed.js');
     for(const child of document.body.children)child.style.display='none';const canvas=document.createElement('canvas');canvas.width=viewport.width;canvas.height=viewport.height;canvas.style.cssText='display:block;width:100%';document.body.style.cssText='margin:0;background:#161d25';document.body.appendChild(canvas);const c=canvas.getContext('2d');c.fillStyle='#161d25';c.fillRect(0,0,canvas.width,canvas.height);c.fillStyle='#ffffff';c.font='16px sans-serif';c.fillText('RUNALIS · enemy loot',12,25);
     const portrait=viewport.height>viewport.width,cols=portrait?2:6,cell=viewport.width/cols,drops=Object.keys(GEAR_RARITIES).map((rarity,i)=>({itemId:'blackIronSword',rarity,gearRarity:rarity,x:(i%cols+.5)*cell,y:portrait?195+Math.floor(i/cols)*180:240,age:.4,ownerSlot:i%4+1,ownerLabel:'P'+(i%4+1),name:GEAR_RARITIES[rarity].name}));
     const fills=[],fill=c.fill.bind(c),rect=c.fillRect.bind(c);c.fill=(...a)=>{fills.push(c.fillStyle);fill(...a);};c.fillRect=(...a)=>{fills.push(c.fillStyle);rect(...a);};
     const before=JSON.stringify(drops);drawWorldDrops(c,{drops},{x:0,y:0});if(JSON.stringify(drops)!==before)throw Error('Rendering mutated drops');
     for(const grade of Object.values(GEAR_RARITIES))if(!fills.includes(grade.color))throw Error('Missing rarity glow '+grade.name);
     c.globalAlpha=1;c.fillStyle='#ffffff';c.font='12px sans-serif';c.textAlign='center';drops.forEach(d=>c.fillText(d.name,d.x,d.y+30));
     const party=[1,2,3,4].map(slot=>({slot}));recordLootCollection(party[0],'gold','Gold',18);recordLootCollection(party[1],'ironScrap','Iron Scrap',2);recordLootCollection(party[1],'ironScrap','Iron Scrap',3);recordLootCollection(party[2],'dust','Arcane Dust',1);recordLootCollection(party[3],'wood','Sturdy Hardwood',4);
     const texts=[],text=c.fillText.bind(c);c.fillText=(...a)=>{texts.push({text:a[0],x:a[1],y:a[2],color:c.fillStyle});text(...a);};drawLootCollectionFeed(c,party,{x:0,y:0,...viewport});
     if(texts.length!==4||!texts.some(e=>e.text==='P2 · +5 Iron Scrap'))throw Error('Collection aggregate/owner mismatch');if(texts.some(e=>e.color!=='#ffffff'||e.x<0||e.y<0||e.y>=viewport.height))throw Error('Feed colour/bounds');
     const count=texts.length;drawLootCollectionFeed(c,party,{x:0,y:0,...viewport},Date.now()+5000);if(texts.length!==count)throw Error('Feed did not expire');
     return {rarityGlows:6,ownerFeedLines:texts.length,aggregate:5,renderMutation:false};
    },viewport);
    await page.screenshot({path:`${out}/${engine}-${viewport.width}.png`});assert.deepEqual(errors,[]);reports.push({engine,viewport,...result,errors});await context.close();
   }
  }finally{await browser.close();}
 }
 const live=await chromium.launch({channel:'msedge',headless:true});try{
  const page=await live.newPage({viewport:{width:1280,height:800}}),errors=[];page.on('pageerror',e=>errors.push(e.message));
  await page.route('**/src/main.js*',route=>route.fulfill({contentType:'text/javascript',body:fs.readFileSync('src/main.js','utf8')+'\nwindow.lootReviewGame=()=>currentGame;'}));
  await require('./browser-game-smoke.cjs')(page,base);await page.waitForFunction(()=>lootReviewGame()?.started);
  const modes=await page.evaluate(async()=>{
   const g=lootReviewGame(),{createPlayer,chooseClass}=await import('/src/player.js'),{recordLootCollection}=await import('/src/lootCollectionFeed.js');g.paused=true;
   const c=g.ctx,fill=c.fillText.bind(c),texts=[];c.fillText=(...args)=>{if(String(args[0]).includes('+')&&String(args[0]).includes('Iron Scrap'))texts.push(args[0]);fill(...args);};
   recordLootCollection(g.player,'ironScrap','Iron Scrap',1);g.drawWorld();if(!texts.includes('+1 Iron Scrap'))throw Error('Single-player feed missing');
   const party=[g.player];for(let slot=2;slot<=4;slot++){const p=createPlayer('Loot P'+slot);chooseClass(p,'oathkeeper');Object.assign(p,{slot,playerNumber:slot,active:true,x:g.player.x+slot*20,y:g.player.y});recordLootCollection(p,'ironScrap','Iron Scrap',slot);party.push(p);}g.player.coop={enabled:true,players:party.slice(1)};
   g.isSharedPartyCameraMode=()=>true;texts.length=0;g.drawWorld();for(let slot=1;slot<=4;slot++)if(!texts.includes(`P${slot} · +${slot} Iron Scrap`))throw Error('Shared owner feed missing '+slot);
   g.isSharedPartyCameraMode=()=>false;texts.length=0;g.drawWorld();for(let slot=1;slot<=4;slot++)if(!texts.includes(`+${slot} Iron Scrap`))throw Error('Split owner feed missing '+slot);
   c.fillText=fill;return ['single','shared four-player','split four-player'];
  });assert.deepEqual(errors,[]);reports.push({liveGameModes:modes,errors});
 }finally{await live.close();}
 fs.writeFileSync(out+'/browser-verification.json',JSON.stringify(reports,null,2));console.log('PASS six Chromium/WebKit profiles plus actual game single/shared/split four-player feed: six rarity glows, launched high grades, white receipts, aggregation, expiry and no page errors');
})().catch(e=>{console.error(e);process.exitCode=1;});
