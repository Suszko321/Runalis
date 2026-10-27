const {chromium}=require(process.env.RUNALIS_NODE_MODULES+'/playwright');
const fs=require('node:fs'),path=require('node:path'),assert=require('node:assert/strict');
const root='docs/moment-gameplay',base=process.env.RUNALIS_URL||'http://127.0.0.1:8768',original='backups/moment-gameplay-2026-10-25';
fs.mkdirSync(root,{recursive:true});
(async()=>{
 const browser=await chromium.launch({channel:'msedge',headless:true}),errors=[],report={};
 try{
  // Same seeded encounter and warmed atlases, with the pre-pass source served
  // from the backup at its original module URLs. No player saves are touched.
  report.combat=[];
  for(const label of ['before','after']){
   const context=await browser.newContext({viewport:{width:1440,height:1000}}),page=await context.newPage();page.on('pageerror',e=>errors.push(label+': '+e.message));
   await page.addInitScript(()=>{let seed=8421;Math.random=()=>{seed=(Math.imul(seed,1664525)+1013904223)>>>0;return seed/4294967296;};});
   await page.route('**/src/minimapHud.js?historical',route=>route.fulfill({contentType:'text/javascript',body:fs.readFileSync('docs/performance/original-src/minimapHud.js','utf8')}));
   if(label==='before')await page.route('**/src/gardenRecovery.js',route=>route.fulfill({contentType:'text/javascript',body:fs.readFileSync('backups/act1-campaign-2026-10-24/gardenRecovery.js','utf8')}));
   if(label==='before')await page.route('**/src/lichSummonSystem.js',route=>route.fulfill({contentType:'text/javascript',body:fs.readFileSync('backups/act1-campaign-2026-10-24/lichSummonSystem.js','utf8')}));
   // Keep the archived weapon coordinator with the archived combat modules;
   // the current coordinator now calls the Oathkeeper post-contact hook.
   if(label==='before')await page.route('**/src/combatMoves.js',route=>route.fulfill({contentType:'text/javascript',body:fs.readFileSync('backups/act1-campaign-2026-10-24/combatMoves.js','utf8')}));
   if(label==='before')await page.route('**/src/*.js*',async route=>{const file=path.basename(new URL(route.request().url()).pathname),source=path.join(original,file);if(fs.existsSync(source))await route.fulfill({contentType:'text/javascript',body:fs.readFileSync(source,'utf8')});else await route.fallback();});
   await page.goto(base+'/enemy-combat-lab.html');await page.waitForFunction(()=>window.enemyCombatLab&&enemyCombatLab.spriteArtStatus().every(a=>a.ready||a.failed));
   await page.evaluate(()=>{enemyCombatLab.spawnPack(80);enemyCombatLab.setProtected(true);});await page.waitForFunction(()=>enemyCombatLab.spriteArtStatus().every(a=>a.ready||a.failed));
   await page.evaluate(()=>enemyCombatLab.benchmark(60));
   const cdp=await context.newCDPSession(page);await cdp.send('Profiler.enable');await cdp.send('Profiler.start');
   const measured=await page.evaluate(()=>enemyCombatLab.benchmark(240));
   const {profile}=await cdp.send('Profiler.stop');fs.writeFileSync(`${root}/dense-${label}.cpuprofile`,JSON.stringify(profile));
   report.combat.push({label,...measured});await page.locator('#stage').screenshot({path:`${root}/dense-${label}.png`});
   const historical=await page.evaluate(async()=>{
    const current=await import('/src/minimapHud.js'),old=await import('/src/minimapHud.js?historical'),{createWorld}=await import('/src/world.js'),{createPlayer}=await import('/src/player.js');
    const w=createWorld(),p=createPlayer('Historical fixture');p.x=18.4*32;p.y=37.7*32;w.continentRuntime.refresh({world:w,player:p});
    const render=m=>{const c=document.createElement('canvas');c.width=640;c.height=480;m.drawMinimapPanel(c.getContext('2d'),{world:w,player:p},{x:0,y:0,width:640,height:480});return c.getContext('2d').getImageData(0,0,640,480).data;};
    const a=render(current),b=render(old);return a.reduce((n,v,i)=>n+(v!==b[i]),0);
   });(report.historicalMinimapDifferences||=[]).push({label,differentChannels:historical});await context.close();
  }
  const context=await browser.newContext({viewport:{width:1500,height:1000}}),page=await context.newPage();page.on('pageerror',e=>errors.push(e.message));
  await page.route('**/src/main.js*',r=>r.fulfill({contentType:'text/javascript',body:''}));await page.goto(base+'/');
  await page.evaluate(async names=>{
   const art=await import('/src/spriteArt.js');for(const name of names)art.asset(name);
   window.gp={art,...await import('/src/player.js'),...await import('/src/combat.js'),...await import('/src/classMovement.js'),...await import('/src/abilityLoadoutSystem.js'),...await import('/src/abilityMorphSystem.js'),...await import('/src/world.js'),...await import('/src/render.js'),...await import('/src/humanRenderer.js'),...await import('/src/combatVisualsRenderer.js'),...await import('/src/gameplayDiscoveries.js')};
  },fs.readdirSync('assets/art/sprites').filter(n=>n.endsWith('.png')&&!n.includes('-preview')).map(n=>n.slice(0,-4)));
  await page.waitForFunction(()=>gp.art.spriteArtStatus().every(a=>a.ready||a.failed));assert.deepEqual(await page.evaluate(()=>gp.art.spriteArtStatus().filter(a=>a.failed)),[]);
  report.movement=await page.evaluate(()=>{
   document.body.innerHTML='<canvas id="proof" width="1440" height="430" style="display:block;background:#24292b"></canvas>';
   const canvas=document.querySelector('#proof'),ctx=canvas.getContext('2d'),classes=['gravecaller','oathkeeper','fellhunter','lightbringer','thornbinder','waverider'],out=[];
   ctx.fillStyle='#24292b';ctx.fillRect(0,0,1440,430);
   for(let i=0;i<classes.length;i++){
    const c=classes[i],p=gp.createPlayer(c);gp.chooseClass(p,c,()=>{});Object.assign(p,{x:75+i*240,y:235,dirX:1,dirY:0,hp:500,maxHp:500,stamina:500,maxStamina:500});
    const w={mode:'dungeon',width:60,height:20,tiles:Array.from({length:20},()=>Array.from({length:60},()=>({biome:'grass',passable:true}))),enemies:[],objects:[],effects:[],drops:[]};
    gp.updateCombat(p,w,{dashPressed:true,moveX:1,moveY:0},.01,10,()=>{});
    for(let k=0;k<2;k++){p.x+=20;gp.updateCombat(p,w,{},.05,10.05+k*.05,()=>{});}
    gp.drawWorldEffects(ctx,w,{x:0,y:0},'behind');gp.drawHumanActor(ctx,p,{x:0,y:0},{animationTime:10.1});gp.drawWorldEffects(ctx,w,{x:0,y:0},'front');
    ctx.fillStyle='#e1d7bb';ctx.textAlign='center';ctx.font='18px sans-serif';ctx.fillText(c,120+i*240,70);ctx.font='13px sans-serif';ctx.fillText(w.effects.find(f=>f.kind==='classMovement').motif,120+i*240,295);
    const body=ctx.getImageData(i*240+50,145,150,120).data;out.push({classId:c,effects:w.effects.filter(f=>f.kind==='classMovement').length,visiblePixels:body.reduce((n,v,j)=>n+(j%4===0&&(v!==36||body[j+1]!==41||body[j+2]!==43)),0)});
   }
   return out;
  });await page.locator('#proof').screenshot({path:`${root}/class-dodges.png`});
  report.morphs=await page.evaluate(()=>{
   const ctx=document.querySelector('#proof').getContext('2d');ctx.fillStyle='#24292b';ctx.fillRect(0,0,1440,430);const out=[];
   for(const [i,morph] of ['cryomancer','sunken'].entries()){
    const p=gp.createPlayer('Waverider');gp.chooseClass(p,'waverider',()=>{});gp.unlockActiveAbility(p,'hydromancerRiptideStep');p.abilityMastery.hydromancerRiptideStep={level:20,xp:0};Object.assign(p,{x:240+i*480,y:240});
    if(!gp.selectAbilityMorph(p,'hydromancerRiptideStep',morph,30).ok)throw Error('Could not select '+morph);
    const w={effects:[],tiles:[]};gp.presentClassMobility(p,w,{x:p.x-80,y:p.y},{id:'hydromancerRiptideStep'},30);
    gp.drawWorldEffects(ctx,w,{x:0,y:0},'behind');gp.drawHumanActor(ctx,p,{x:0,y:0});ctx.fillStyle='#e1d7bb';ctx.font='20px sans-serif';ctx.textAlign='center';ctx.fillText(morph,p.x,80);out.push({morph,colors:[...new Set(w.effects.map(f=>f.color))]});
   }return out;
  });await page.locator('#proof').screenshot({path:`${root}/movement-morphs.png`});
  report.discoveries=await page.evaluate(()=>{
   const canvas=document.querySelector('#proof');canvas.width=1000;canvas.height=700;const ctx=canvas.getContext('2d'),w=gp.createWorld(),p=gp.createPlayer('Explorer'),sites=w.continentRuntime.allObjects.filter(o=>o.id.startsWith('discovery-'));
   const site=sites.find(o=>o.discoveryId==='courier-satchel');Object.assign(p,{x:site.x,y:site.y+40});w.continentRuntime.activate([p],p,true);gp.draw(ctx,w,p,{x:p.x-500,y:p.y-350});
   return sites.map(o=>({name:o.name,kind:o.kind,passable:gp.isActorPositionPassable(w,o.x,o.y,12)}));
  });await page.locator('#proof').screenshot({path:`${root}/courier-discovery.png`});
  report.lootLabels=await page.evaluate(()=>{
   const c=document.querySelector('#proof'),ctx=c.getContext('2d');c.width=1000;c.height=500;
   const w={mode:'dungeon',name:'Loot labels',width:40,height:25,tiles:Array.from({length:25},()=>Array.from({length:40},()=>({biome:'grass',passable:true}))),enemies:[],objects:[],effects:[],drops:[{itemId:'guardScroll',name:'Scroll: Guard',rarity:'common',x:210,y:170,ownerLabel:'P1'},{itemId:'arcaneDust',name:'Arcane Dust',rarity:'common',x:620,y:170,ownerLabel:'P1'},{itemId:'ashenExecutionerChest',name:'Ashen Executioner Chest',rarity:'mythic',x:500,y:350,ownerLabel:'P1'}]};
   const labels=[],original=ctx.fillText;ctx.fillText=function(text,...rest){labels.push(String(text));return original.call(this,text,...rest);};
   try{const p=gp.createPlayer('Discovery labels');p.x=850;p.y=420;gp.draw(ctx,w,p,{x:0,y:0});}finally{ctx.fillText=original;}
   return labels.filter(s=>/Skill scroll|Upgrade material|Ashen Executioner/.test(s));
  });await page.locator('#proof').screenshot({path:`${root}/loot-discovery-labels.png`});
  const cdp=await context.newCDPSession(page);report.retainedHeap=[];
  for(let cycle=0;cycle<5;cycle++){
   await page.evaluate(()=>{
    const w=gp.createWorld(),p=gp.createPlayer('Movement memory');gp.chooseClass(p,'gravecaller',()=>{});Object.assign(p,w.spawn);p.stamina=500;p.maxStamina=500;
    gp.updateCombat(p,w,{dashPressed:true,moveX:1,moveY:0},.01,80,()=>{});
    for(let i=0;i<3;i++){p.x+=15;gp.updateCombat(p,w,{},.045,80.05+i*.05,()=>{});}
    gp.drawWorldEffects(document.querySelector('#proof').getContext('2d'),w,{x:p.x-100,y:p.y-150},'behind');
   });await cdp.send('HeapProfiler.collectGarbage');report.retainedHeap.push(await cdp.send('Runtime.getHeapUsage'));
  }
  assert(report.retainedHeap.at(-1).usedSize<report.retainedHeap[1].usedSize+4*1024*1024,'world/movement cycles retain more than 4 MiB after warmup');
  assert.equal(report.movement.length,6);assert(report.movement.every(m=>m.visiblePixels>100));assert.equal(new Set(report.morphs.flatMap(m=>m.colors)).size,report.morphs.length);assert.equal(report.discoveries.length,5);assert(report.discoveries.every(d=>d.passable));assert(report.lootLabels.some(s=>s.includes('Skill scroll')));assert(report.lootLabels.some(s=>s.includes('Upgrade material')));assert.deepEqual(errors,[]);
  report.errors=errors;report.pass=true;fs.writeFileSync(`${root}/browser.json`,JSON.stringify(report,null,2));console.log(JSON.stringify(report,null,2));await context.close();
 }finally{await browser.close();}
})().catch(e=>{console.error(e);process.exit(1);});
