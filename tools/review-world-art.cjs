const fs=require('node:fs'),assert=require('node:assert/strict'),crypto=require('node:crypto');
const {chromium}=require((process.env.RUNALIS_NODE_MODULES||'C:/Users/austi/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules')+'/playwright');
const stage=process.argv[2]||'after',root='docs/world-art';fs.mkdirSync(root,{recursive:true});
const scenes=['Orrakai','Orrakai · Smithy','Echoryn · Hollow Road','Echoryn · Ashen Orchard','Echoryn · Pilgrim Bridge','Echoryn · Lantern Marsh','Echoryn · Castle Veyr','Dungeon · mine','Dungeon · grave','Dungeon · holy','Aureate Marches','Ascension Wastes'];
let browser;
(async()=>{browser=await chromium.launch({channel:'msedge',headless:true});const p=await browser.newPage({viewport:{width:1140,height:880}}),errors=[];p.on('pageerror',e=>errors.push(e.message));
 if(stage==='before'){
  await p.route('**/src/*.js*',r=>{const file='backups/world-art-2026-10-18/'+new URL(r.request().url()).pathname.split('/').at(-1);return fs.existsSync(file)?r.fulfill({contentType:'text/javascript',body:fs.readFileSync(file,'utf8')}):r.continue();});
  await p.route('**/assets/art/sprites/*.png*',r=>{const file='backups/world-art-2026-10-18/'+new URL(r.request().url()).pathname.split('/').at(-1);return fs.existsSync(file)?r.fulfill({contentType:'image/png',body:fs.readFileSync(file)}):r.continue();});
 }
 await p.addInitScript(()=>{let seed=117;Math.random=()=>((seed=Math.imul(seed,1664525)+1013904223>>>0)/4294967296);requestAnimationFrame=()=>0;});
 const started=Date.now();await p.goto('http://127.0.0.1:8766/world-lab.html');await p.waitForFunction(()=>window.review?.world?.worldAtmosphere,null,{polling:100});await p.waitForFunction(async()=>(await import('/src/spriteArt.js')).spriteArtStatus().every(a=>a.ready||a.failed),null,{polling:100});const readyMs=Date.now()-started;await p.waitForTimeout(500);
 const results=[];
 for(const [i,label] of scenes.entries()){
  await p.selectOption('#scene',{label});await p.waitForTimeout(250);
  const data=await p.evaluate(async()=>{const g=window.review,{draw}=await import('/src/render.js'),{spriteArtStatus}=await import('/src/spriteArt.js');const ctx=g.canvas.getContext('2d');
   const times=[];for(let i=0;i<45;i++){let t=performance.now();draw(ctx,g.world,g.player,g.camera);times.push(performance.now()-t);}times.sort((a,b)=>a-b);
   const failures=spriteArtStatus().filter(a=>a.failed);return {medianMs:times[22],p95Ms:times[42],failures,mode:g.world.mode,objects:g.world.objects.length,enemies:g.world.enemies.length,player:{x:g.player.x,y:g.player.y}};});
  assert.equal(data.failures.length,0);await p.locator('canvas').screenshot({path:`${root}/${stage}-${String(i).padStart(2,'0')}.png`});results.push({label,...data});
 }
 const protectedFiles=['humanRenderer.js','playerAnimationController.js','humanLocomotionRig.js','meleeRig.js','data.js','world.js','gameSave.js'];
 const hashes=Object.fromEntries([...protectedFiles.map(n=>'src/'+n),...fs.readdirSync('assets/art/sprites').filter(n=>/^human-(male|female).*\.png$/.test(n)).map(n=>'assets/art/sprites/'+n)].map(n=>[n,crypto.createHash('sha256').update(fs.readFileSync(n)).digest('hex')]));
 fs.writeFileSync(`${root}/${stage}.json`,JSON.stringify({errors,readyMs,results,hashes},null,2));await browser.close();assert.equal(errors.length,0);console.log(JSON.stringify({stage,readyMs,scenes:results.length,errors,medianMs:results.map(r=>[r.label,r.medianMs])},null,2));
})().catch(async e=>{console.error(e);await browser?.close();process.exitCode=1});
