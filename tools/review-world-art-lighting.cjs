const fs=require('node:fs'),assert=require('node:assert/strict');
const {chromium}=require((process.env.RUNALIS_NODE_MODULES||'C:/Users/austi/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules')+'/playwright');
let browser;
(async()=>{browser=await chromium.launch({channel:'msedge',headless:true});const p=await browser.newPage({viewport:{width:1140,height:880}}),errors=[],views=[];p.on('pageerror',e=>errors.push(e.message));await p.goto('http://127.0.0.1:8766/world-lab.html');await p.waitForFunction(()=>window.review);await p.waitForTimeout(800);
 for(const label of ['Dungeon · mine','Dungeon · grave','Dungeon · demon','Dungeon · ruin','Dungeon · thorn','Dungeon · holy','Dungeon · cosmic','Orrakai','Echoryn · Lantern Marsh']){
  await p.selectOption('#scene',{label});await p.waitForTimeout(100);
  await p.click('#night');await p.waitForTimeout(100);
  const key=label.replace(/[^a-z]+/gi,'-').toLowerCase();await p.locator('canvas').screenshot({path:`docs/world-art/lighting-${key}.png`});views.push({label,status:await p.locator('#status').innerText()});
 }
 await browser.close();assert.deepEqual(errors,[]);for(const v of views)assert(!/Error|undefined|NaN/.test(v.status),v.status);fs.writeFileSync('docs/world-art/lighting.json',JSON.stringify({errors,views},null,2));console.log('PASS',views.length,'dungeon / night scenes');
})().catch(async e=>{console.error(e);await browser?.close();process.exitCode=1});
