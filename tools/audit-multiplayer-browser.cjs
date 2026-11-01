// Controlled audit of the actual host message handler in an isolated browser.
// No production room is opened and no real user profile is loaded.
const {chromium}=require(process.env.RUNALIS_NODE_MODULES+'/playwright');
const fs=require('node:fs'),assert=require('node:assert/strict');
const launch=require('./browser-game-smoke.cjs');
(async()=>{
 const browser=await chromium.launch({channel:'msedge',headless:true});
 const page=await browser.newPage({viewport:{width:1280,height:800}}),errors=[];
 try{
  page.on('pageerror',e=>errors.push(e.message));
  await page.route('**/src/main.js*',route=>route.fulfill({contentType:'text/javascript',body:fs.readFileSync('src/main.js','utf8')+'\nwindow.multiplayerAuditGame=()=>currentGame;'}));
  await launch(page,process.env.RUNALIS_URL||'http://127.0.0.1:8768');
  await page.waitForFunction(()=>multiplayerAuditGame()?.started&&!document.querySelector('#loadingScreen')?.classList.contains('active'));
  const finding=await page.evaluate(async()=>{
   const g=multiplayerAuditGame(),{createPlayer,chooseClass}=await import('/src/player.js');
   const actor=createPlayer('Disposable audit guest');chooseClass(actor,'oathkeeper');
   actor.networkMenuBusy=true;const oldGold=actor.gold,hostGold=g.player.gold,acks=[];
   const record={actor,ready:true,wire:{send:p=>acks.push(p)}};
   await g.onlineSession.hostMessage(record,{type:'character',revision:1,character:{gold:987654321}},'unused-after-authentication');
   return {id:'MP-002',confirmed:actor.gold===987654321,oldGold,acceptedGold:actor.gold,
    hostGoldUnchanged:hostGold===g.player.gold,acknowledged:acks.some(p=>p.type==='character-accepted'),
    description:'An authenticated-actor menu update accepts an arbitrary gold balance without a purchase/reward transaction.'};
  });
  assert(finding.confirmed&&finding.hostGoldUnchanged&&finding.acknowledged,'Audit baseline changed: reassess MP-002.');
  assert.deepEqual(errors,[]);
  const report={date:'2026-10-31',kind:'controlled host-handler dispatch; not a live network exploit',finding,errors};
  fs.mkdirSync('docs/multiplayer-audit',{recursive:true});
  fs.writeFileSync('docs/multiplayer-audit/browser-diagnostics.json',JSON.stringify(report,null,2)+'\n');
  console.log(JSON.stringify(report,null,2));
 }finally{await browser.close();}
})().catch(error=>{console.error(error);process.exitCode=1;});
