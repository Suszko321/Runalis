const {chromium}=require(process.env.RUNALIS_NODE_MODULES+'/playwright');
const assert=require('node:assert/strict'),fs=require('node:fs');
const base=process.env.RUNALIS_URL||'http://127.0.0.1:8768';
const before=process.env.RUNALIS_EXPECT_INVISIBLE==='1',out='docs/enemy-visibility';
fs.mkdirSync(out,{recursive:true});
(async()=>{
 const browser=await chromium.launch({channel:'msedge',headless:true});
 try{
  const page=await browser.newPage(),errors=[];
  page.on('pageerror',e=>errors.push(e.message));
  // Import production modules without starting a journey or touching saves.
  await page.route('**/src/main.js*',r=>r.fulfill({contentType:'text/javascript',body:''}));
  await page.goto(base+'/');
  await page.evaluate(async names=>{
   const art=await import('/src/spriteArt.js');
   for(const name of names)art.asset(name);
   window.visibilityArt=art;
  },fs.readdirSync('assets/art/sprites').filter(n=>n.endsWith('.png')&&!n.includes('-preview')).map(n=>n.slice(0,-4)));
  await page.waitForFunction(()=>visibilityArt.spriteArtStatus().every(a=>a.ready||a.failed));
  assert.deepEqual(await page.evaluate(()=>visibilityArt.spriteArtStatus().filter(a=>a.failed)),[]);
  const result=await page.evaluate(async()=>{
   const [{createWorld},{createPlayer},{drawEnemy},{updateAuthoredPopulation,populationPositionSafe},{continentalMemory},feedback,{isHumanoidEnemy}]=await Promise.all([
    import('/src/world.js'),import('/src/player.js'),import('/src/render.js'),import('/src/encounterPopulation.js'),import('/src/continentPersistence.js'),import('/src/combatFeedbackProfiles.js'),import('/src/humanoidEnemies.js')]);
   const world=createWorld(),player=createPlayer('Visibility regression');Object.assign(player,world.spawn);player.worldMemory={elapsed:1000};world.populationAreas=[];
   const runtime=world.continentRuntime,memory=continentalMemory(player),game={world,player};
   const eligible=e=>!e.isBoss&&!e.worldBoss&&!e.miniBoss&&!e.questCritical&&!e.namedExteriorElite&&!e.majorPoiId&&!e.poiId&&!e.bossId&&!e.dynamicEncounter;
   const residents=[false,true].map(human=>runtime.allEnemies.find(e=>eligible(e)&&isHumanoidEnemy(e)===human&&populationPositionSafe(world,[player],e.homeX,e.homeY,e.radius||12)));
   if(residents.some(e=>!e))throw Error('Missing representative resident');
   const canvas=document.createElement('canvas');canvas.width=canvas.height=256;
   const ctx=canvas.getContext('2d',{willReadFrequently:true});
   function draw(e){ctx.clearRect(0,0,256,256);drawEnemy(ctx,e,{x:e.x-128,y:e.y-180},{hideNameplate:true});const pixels=ctx.getImageData(88,142,80,34).data;return {bodyPixels:pixels.reduce((n,v,i)=>n+(i%4===3&&v>0),0),pixels};}
   const realNow=performance.now;performance.now=()=>50000;
   try{
    const rows=[];
    for(const ready of [true,false]){
     for(const state of visibilityArt.spriteArtStatus())visibilityArt.asset(state.name).ready=ready;
     for(const e of residents){
      const clean={...e,visualDeath:undefined,visualReaction:undefined};
      const healthy=draw(clean);
      Object.assign(e,{hp:0,dead:true,remove:true,alive:false,deathHandled:true});feedback.recordEnemyDeathVisual(e);e.visualDeath.startedAt=40;
      memory.entities[e.id]={kind:'enemy',hp:0,dead:true,remove:true,respawnAt:999};
      updateAuthoredPopulation(game,1.3,()=>{throw Error('Unexpected pack creation');});
      const respawn=draw(e),hasStaleDeath=!!e.visualDeath;
      player.x=e.x+96;player.y=e.y;runtime.activate([player],player,true);
      const active=world.enemies.includes(e);
      Object.assign(player,world.spawn);runtime.activate([player],player,true);
      const unloaded=!world.enemies.includes(e);
      player.x=e.x+96;player.y=e.y;runtime.activate([player],player,true);
      const reentered=world.enemies.includes(e),afterReentry=draw(e);
      Object.assign(player,world.spawn);runtime.activate([player],player,true);
      rows.push({kind:e.kind,ready,healthyBodyPixels:healthy.bodyPixels,respawnBodyPixels:respawn.bodyPixels,reentryBodyPixels:afterReentry.bodyPixels,hasStaleDeath,active,unloaded,reentered});
      // Check already affected live actors, independently of the respawn reset.
      const stale={...clean};feedback.recordEnemyDeathVisual(stale);stale.visualDeath.startedAt=40;
      const guarded=draw(stale);
      rows.at(-1).staleLiveBodyPixels=guarded.bodyPixels;
      rows.at(-1).staleLivePixelDifferences=guarded.pixels.reduce((n,v,i)=>n+(v!==healthy.pixels[i]),0);
      delete e.visualDeath;delete e.visualReaction;
     }
    }
    // Every authored resident must have visible body art, not merely an HP bar.
    for(const state of visibilityArt.spriteArtStatus())visibilityArt.asset(state.name).ready=true;
    const authored=runtime.allEnemies.filter(e=>e.hp>0&&!e.dead&&!e.remove).map(e=>({id:e.id,kind:e.kind,bodyPixels:draw(e).bodyPixels}));
    return {rows,authoredCount:authored.length,invisibleAuthored:authored.filter(e=>!e.bodyPixels)};
   }finally{performance.now=realNow;for(const state of visibilityArt.spriteArtStatus())visibilityArt.asset(state.name).ready=true;}
  });
  fs.writeFileSync(`${out}/${before?'before':'after'}.json`,JSON.stringify({...result,errors},null,2));
  for(const row of result.rows){
   assert(row.healthyBodyPixels>0);assert(row.active&&row.unloaded&&row.reentered);
   if(before){assert(row.hasStaleDeath);assert(row.respawnBodyPixels<row.healthyBodyPixels*.4);assert(row.staleLivePixelDifferences>0);if(row.kind==='hollowling')assert.equal(row.respawnBodyPixels,0);}
   else{assert.equal(row.hasStaleDeath,false);assert.equal(row.respawnBodyPixels,row.healthyBodyPixels);assert.equal(row.reentryBodyPixels,row.healthyBodyPixels);assert.equal(row.staleLivePixelDifferences,0);}
  }
  assert.deepEqual(result.invisibleAuthored,[]);assert.deepEqual(errors,[]);
  console.log(JSON.stringify({pass:true,mode:before?'reproduced invisibility':'fixed',...result},null,2));
 }finally{await browser.close();}
})().catch(e=>{console.error(e);process.exit(1);});
