const fs=require('node:fs'),assert=require('node:assert/strict');
const {chromium}=require((process.env.RUNALIS_NODE_MODULES||'C:/Users/austi/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules')+'/playwright');
let browser;
(async()=>{const b=browser=await chromium.launch({channel:'msedge',headless:true}),errors=[],casts=[];
 for(const id of ['oathkeeperBastionBash','fellhunterBearTrap','graveSpark','thornbinderSeedReliquary','hydromancerWellspring','eldritchCrimsonConduit']){
  const p=await b.newPage({viewport:{width:1440,height:1000}});p.on('pageerror',e=>{errors.push(e.message);console.error(id,e.message);});console.log('Reviewing',id);
  await p.goto('http://127.0.0.1:8766/combat-overhaul-lab.html?skill='+id);await p.waitForFunction(()=>window.combatReview?.game?.player);await p.waitForTimeout(200);
  const result=await p.evaluate(async id=>{const {game:g}=combatReview,{useAbility,updateCombat}=await import('/src/combat.js'),{draw}=await import('/src/render.js');g.paused=true;g.dev.refill();g.dev.clearCooldowns();g.world.enemies=[];
   for(let i=0;i<12;i++){const e=g.dev.spawn('dummy',350+i%4*35,250+Math.floor(i/4)*40);e.kind=i%2?'gravebound':'roadlessBandit';e.trainingDummy=true;}
   g.player.dirX=1;g.player.dirY=0;g.input={rightStickActive:true,rightStickAimX:1,rightStickAimY:0,ability3Held:true};const used=useAbility(3,g.player,g.world,()=>{},performance.now()/1000,g.input);
   // Freeze a readable effect instant, then render it through the production
   // world pipeline as well as the isolated combat laboratory.
   updateCombat(g.player,g.world,.08,performance.now()/1000+.08,()=>{},g.input);g.canvas.getContext('2d').imageSmoothingEnabled=false;draw(g.canvas.getContext('2d'),g.world,g.player,g.camera);
   return {id,used,equipped:g.player.loadout.abilitySlots[3],effects:g.world.effects.length,enemies:g.world.enemies.length};},id);
  assert(result.used,id);assert.equal(result.equipped,id);casts.push(result);
  await p.evaluate(async()=>{const {game:g}=combatReview,{draw}=await import('/src/render.js');draw(g.canvas.getContext('2d'),g.world,g.player,g.camera);const copy=document.createElement('canvas');copy.id='world-art-combat';copy.width=g.canvas.width;copy.height=g.canvas.height;copy.getContext('2d').drawImage(g.canvas,0,0);document.body.append(copy);});
  await p.locator('#world-art-combat').screenshot({path:`docs/world-art/combat-${id}.png`});
  await p.close();
 }
 await b.close();assert.deepEqual(errors,[]);fs.writeFileSync('docs/world-art/combat.json',JSON.stringify({errors,casts},null,2));console.log(JSON.stringify({errors,casts},null,2));
})().catch(async e=>{console.error(e);await browser?.close();process.exitCode=1;});
