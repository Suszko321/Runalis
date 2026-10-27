const {chromium}=require(process.env.RUNALIS_NODE_MODULES+'/playwright');
const assert=require('node:assert/strict');
(async()=>{
 const browser=await chromium.launch({channel:'msedge',headless:true});
 try{
  const page=await browser.newPage({viewport:{width:1280,height:800}}),errors=[];page.on('pageerror',e=>errors.push(e.message));
  await page.route('**/src/main.js*',r=>r.fulfill({contentType:'text/javascript',body:''}));await page.goto('http://127.0.0.1:8768/');
  await page.evaluate(async()=>{
   const ui=await import('/src/ui.js'),player=await import('/src/player.js'),loadout=await import('/src/abilityLoadoutSystem.js'),mastery=await import('/src/abilityMasterySystem.js');
   const p=player.createPlayer('Hotbar mastery');player.chooseClass(p,'waverider');
   const ids=['hydromancerWaterTorrent','hydromancerMendingCurrent','hydromancerBubbleWard','summonWolf'];
   ids.forEach((id,slot)=>{loadout.unlockActiveAbility(p,id,{autoAssignEmpty:false});if(!loadout.assignAbilityToSlot(p,slot,id).ok)throw Error('Assignment failed');});
   const game={player:p,world:{mode:'overworld',objects:[],enemies:[],width:640,height:480},camera:{x:0,y:0},logLines:[],log(){},save(){},keys:{},input:{},canvas:document.querySelector('#game')};
   document.querySelector('#mainMenu').classList.remove('active');document.querySelector('#app').classList.add('active');ui.initUI(game);
   game.renderOwnedUI=()=>ui.renderUI(game.player,[],game);game.uiState.skillsSubtab='abilities';game.uiState.selectedAbilityId=ids[1];game.renderOwnedUI();window.review={game,player,mastery,ids};
  });
  await page.locator('[data-tab="skills"]').evaluate(e=>e.click());
  const before=await page.locator('.ability-detail-pane').innerText();assert.match(before,/Earn XP with this skill on your hotbar to gain mastery\. Using the skill is optional\./);
  assert.doesNotMatch(before,/Mastery grows through useful combat/);
  const result=await page.evaluate(()=>{const r=review;r.player.gainXp(r.game.player,'fishing',20);r.game.renderOwnedUI();return r.ids.map(id=>r.mastery.getAbilityMastery(r.game.player,id));});
  result.forEach(m=>{assert.equal(m.xp,20);assert.equal(m.lifetimeSuccessfulUses,0);});
  assert.match(await page.locator('.ability-detail-pane').innerText(),/20\s*\/\s*49/);
  assert.deepEqual(errors,[]);console.log(JSON.stringify({pass:true,checks:'Abilities panel explains hotbar XP; all four unused skills gain mastery from fishing XP',errors}));
 }finally{await browser.close();}
})().catch(e=>{console.error(e);process.exitCode=1;});
