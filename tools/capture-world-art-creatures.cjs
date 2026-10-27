const fs=require('node:fs');
const {chromium}=require((process.env.RUNALIS_NODE_MODULES||'C:/Users/austi/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules')+'/playwright');
let browser;
(async()=>{browser=await chromium.launch({channel:'msedge',headless:true});for(const stage of ['before','after']){
 const p=await browser.newPage({viewport:{width:1440,height:1600}});await p.addInitScript(()=>{requestAnimationFrame=()=>0;});
 if(stage==='before'){
  await p.route('**/src/*.js*',r=>{const file='backups/world-art-2026-10-18/'+new URL(r.request().url()).pathname.split('/').at(-1);return fs.existsSync(file)?r.fulfill({contentType:'text/javascript',body:fs.readFileSync(file,'utf8')}):r.continue();});
  await p.route('**/assets/art/sprites/*.png*',r=>{const file='backups/world-art-2026-10-18/'+new URL(r.request().url()).pathname.split('/').at(-1);return fs.existsSync(file)?r.fulfill({contentType:'image/png',body:fs.readFileSync(file)}):r.continue();});
 }
 await p.goto('http://127.0.0.1:8766/enemy-visual-lab.html');await p.waitForFunction(()=>window.enemyArtReview,null,{polling:100});await p.waitForFunction(()=>enemyArtReview.spriteArtStatus().every(a=>a.ready||a.failed),null,{polling:100});
 await p.evaluate(()=>{const a=enemyArtReview;a.controls.pose.value='idle';a.controls.facing.value='1';a.controls.distance.value='1';a.controls.lighting.value='day';a.controls.phase.value='1';a.controls.labels.checked=true;a.rebuild();const old=performance.now;performance.now=()=>5000;try{a.draw();}finally{performance.now=old;}});
 await p.locator('#review').screenshot({path:`docs/world-art/creatures-${stage}.png`});await p.close();
 }await browser.close();console.log('Captured matched original / final creature galleries');
})().catch(async e=>{console.error(e);await browser?.close();process.exitCode=1});
