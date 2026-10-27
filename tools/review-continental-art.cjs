const fs=require('node:fs'),assert=require('node:assert/strict');
const {chromium}=require((process.env.RUNALIS_NODE_MODULES||'C:/Users/austi/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules')+'/playwright');
const stage=process.argv[2]||'after',root='docs/world-art';
(async()=>{const b=await chromium.launch({channel:'msedge',headless:true}),p=await b.newPage({viewport:{width:1180,height:930}}),errors=[];p.on('pageerror',e=>errors.push(e.message));
 if(stage==='before')await p.route('**/src/*.js*',r=>{const name=new URL(r.request().url()).pathname.split('/').at(-1),path='backups/world-art-2026-10-18/'+name;return fs.existsSync(path)?r.fulfill({contentType:'text/javascript',body:fs.readFileSync(path,'utf8')}):r.continue();});
 if(stage==='before')await p.route('**/assets/art/sprites/*.png*',r=>{const file='backups/world-art-2026-10-18/'+new URL(r.request().url()).pathname.split('/').at(-1);return fs.existsSync(file)?r.fulfill({contentType:'image/png',body:fs.readFileSync(file)}):r.continue();});
 await p.addInitScript(()=>{let seed=117;Math.random=()=>((seed=Math.imul(seed,1664525)+1013904223>>>0)/4294967296);});
 await p.goto('http://127.0.0.1:8766/world-rebuild-lab.html');await p.waitForFunction(()=>window.continentReview);await p.waitForTimeout(1500);
 const results=[];
 for(const scene of ['orrakai-farms','continent-pass-lantern','continent-saint-orvane','continent-gilded-granary','continent-blueglass-aqueduct','continent-nameless-market','continent-blackfen-landing','continent-provincial-milehouse','continent-zarynth-trade-ward']){
  await p.selectOption('#scene',scene);await p.waitForTimeout(200);
  const data=await p.evaluate(async()=>{const g=continentReview.game,{draw}=await import('/src/render.js'),{continentalArtCacheStatus}=await import('/src/continentArt.js');const ctx=g.canvas.getContext('2d'),times=[];for(let i=0;i<45;i++){const t=performance.now();draw(ctx,g.world,g.player,g.camera);times.push(performance.now()-t);}times.sort((a,b)=>a-b);return {failure:continentReview.failure,medianMs:times[22],p95Ms:times[42],statistics:continentReview.statistics,artCache:continentalArtCacheStatus(),objects:g.world.objects.map(o=>[o.id,o.x,o.y]),enemies:g.world.enemies.map(o=>[o.id,o.x,o.y,o.hp,o.damage])};});
  assert.equal(data.failure,null);await p.locator('canvas').screenshot({path:`${root}/${stage}-${scene}.png`});results.push({scene,...data});
 }
 fs.writeFileSync(`${root}/continental-${stage}.json`,JSON.stringify({errors,results},null,2));await b.close();assert.equal(errors.length,0);console.log(JSON.stringify(results.map(r=>({scene:r.scene,medianMs:r.medianMs,p95Ms:r.p95Ms,cache:r.artCache})),null,2));
})().catch(e=>{console.error(e);process.exitCode=1;});
