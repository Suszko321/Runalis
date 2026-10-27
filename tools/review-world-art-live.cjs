const fs=require('node:fs'),assert=require('node:assert/strict');
const {chromium}=require((process.env.RUNALIS_NODE_MODULES||'C:/Users/austi/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules')+'/playwright');
let browser;
(async()=>{browser=await chromium.launch({channel:'msedge',headless:true});const results=[];
 for(const trial of [1,2,3])for(const stage of trial%2?['before','after']:['after','before']){
  const p=await browser.newPage({viewport:{width:1280,height:720}}),errors=[];p.on('pageerror',e=>errors.push(e.message));
  await p.addInitScript(()=>{let seed=117;Math.random=()=>((seed=Math.imul(seed,1664525)+1013904223>>>0)/4294967296);});
  await p.route('**/src/*.js*',r=>{const name=new URL(r.request().url()).pathname.split('/').at(-1),backup='backups/world-art-2026-10-18/'+name;
   let body=fs.readFileSync(stage==='before'&&fs.existsSync(backup)?backup:'src/'+name,'utf8');
   if(name==='main.js')body+='\nwindow.artLiveReview={get game(){return currentGame;},start:state=>startProfile({id:"art-live-isolated",name:"Art live review",state})};';
   return r.fulfill({contentType:'text/javascript',body});});
  if(stage==='before')await p.route('**/assets/art/sprites/*.png*',r=>{const file='backups/world-art-2026-10-18/'+new URL(r.request().url()).pathname.split('/').at(-1);return fs.existsSync(file)?r.fulfill({contentType:'image/png',body:fs.readFileSync(file)}):r.continue();});
  const start=Date.now();await p.goto('http://127.0.0.1:8766/');await p.waitForFunction(()=>window.artLiveReview);
  await p.evaluate(async()=>{const {createWorld}=await import('/src/world.js'),{createPlayer,chooseClass}=await import('/src/player.js'),{createSaveState}=await import('/src/gameSave.js');const world=createWorld({skipPublishedOverride:true}),player=createPlayer('Art live review');chooseClass(player,'fellhunter');Object.assign(player,{x:world.spawn.x,y:world.spawn.y,act1OpeningPending:false});const state=createSaveState({world,player,camera:{x:0,y:0},profileId:'art-live-isolated',profileName:'Art live review'});await artLiveReview.start(state);});
  await p.waitForFunction(()=>artLiveReview.game?.started);const startupMs=Date.now()-start;await p.waitForTimeout(700);
  const data=await p.evaluate(async()=>{const g=artLiveReview.game;const old={x:g.player.x,y:g.player.y};g.input ||= {};g.player.hp=g.player.maxHp;
   const times=await new Promise(resolve=>{const samples=[];let prior=0;function tick(t){if(prior)samples.push(t-prior);prior=t;if(samples.length<120)requestAnimationFrame(tick);else resolve(samples);}requestAnimationFrame(tick);});times.sort((a,b)=>a-b);
   return {mode:g.world.mode,player:{x:g.player.x,y:g.player.y},medianFrameMs:times[60],p95FrameMs:times[114],objects:g.world.objects.length,enemies:g.world.enemies.length};});
  await p.screenshot({path:`docs/world-art/live-${stage}.png`});assert.deepEqual(errors,[]);results.push({trial,stage,startupMs,...data,errors});await p.evaluate(()=>artLiveReview.game.destroy());await p.close();
 }
 await browser.close();fs.writeFileSync('docs/world-art/live.json',JSON.stringify(results,null,2));console.log(JSON.stringify(results,null,2));
})().catch(async e=>{console.error(e);await browser?.close();process.exitCode=1});
