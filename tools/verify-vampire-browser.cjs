const {chromium}=require(process.env.RUNALIS_PLAYWRIGHT_MODULE||'../tmp/vampire-browser/node_modules/playwright');
const fs=require('node:fs'),assert=require('node:assert/strict');
(async()=>{
 const browser=await chromium.launch({channel:'msedge',headless:true});const errors=[],missing=[];fs.mkdirSync('docs/vampire-overhaul',{recursive:true});
 try{
 const page=await browser.newPage({viewport:{width:1440,height:900}});page.on('pageerror',e=>errors.push(e.message));page.on('response',r=>{if(r.status()>=400)missing.push(r.url());});
 await page.route('**/src/main.js*',r=>r.fulfill({contentType:'text/javascript',body:''}));await page.goto(process.env.RUNALIS_PREVIEW_URL||'http://127.0.0.1:8772/');
 await page.evaluate(async()=>{
  const ui=await import('/src/ui.js'),players=await import('/src/player.js'),{applyBloodline}=await import('/src/bloodlineSystem.js'),tree=await import('/src/skillTreeSystem.js');
  const p=players.createPlayer('Vampire');players.chooseClass(p,'gravecaller');applyBloodline(p,'vampire');p.skillTree.bloodlineBonusPoints=100;
  const game={player:p,world:{mode:'dungeon',enemies:[],objects:[],effects:[],drops:[]},camera:{x:0,y:0},logLines:[],log(t){this.logLines.push(t);},save(){},keys:{},input:{},canvas:document.querySelector('#game')};
  document.querySelector('#startupStatus')?.remove();document.querySelector('#mainMenu').classList.remove('active');document.querySelector('#app').classList.add('active');ui.initUI(game);game.renderOwnedUI=()=>ui.renderUI(p,game.logLines,game);window.vampireReview={game,ui,players,tree};game.renderOwnedUI();
 });
 await page.locator('[data-tab="skills"]').evaluate(e=>e.click());await page.locator('button.subtab[data-skills-subtab="trees"]').click();await page.locator('[data-skill-tree-select="vampire"]').click();
 assert(await page.locator('.prerequisite-tree').isVisible());
 const names=await page.locator('.prerequisite-tree').innerText();for(const name of ['Crimson Awakening','Sanguine Lance','Call Bat Beast','Crimson Edge','Royal Bat Beast'])assert(names.includes(name),name);
 await page.screenshot({path:'docs/vampire-overhaul/tree-desktop.png'});
 await page.evaluate(()=>{const {game,tree}=vampireReview;for(const n of Object.values(tree.SKILL_TREE_NODES).filter(n=>n.tree==='vampire'))if(!game.player.skillTree.spent[n.id]){const r=tree.spendSkillTreeNode(game.player,n.id);if(!r.ok)throw Error(n.id+': '+r.reason);}game.renderOwnedUI();});
 await page.locator('button.subtab[data-skills-subtab="abilities"]').click();await page.locator('[data-select-ability-id="sanguineLance"]').first().click();
 assert.equal(await page.locator('[data-ability-morph]').count(),3);assert((await page.locator('body').innerText()).includes('maximum HP'));
 await page.screenshot({path:'docs/vampire-overhaul/lance-desktop.png'});
 await page.setViewportSize({width:390,height:844});await page.evaluate(()=>{document.body.classList.add('mobile-input');vampireReview.game.renderOwnedUI();});await page.locator('[data-select-ability-id="sanguineLance"] > i').click();await page.screenshot({path:'docs/vampire-overhaul/lance-mobile.png'});
 const controller=await page.evaluate(async()=>{
  const {game}=vampireReview,{assignAbilityToSlot}=await import('/src/abilityLoadoutSystem.js'),combat=await import('/src/combat.js'),{getControllerInput,createControllerManager}=await import('/src/inputController.js');
  const p=game.player;combat.useAbility('block',p,game.world,()=>{},performance.now()/1000);Object.assign(p,{hp:500,maxHp:1000,spirit:500,maxSpirit:500,x:100,y:100,dirX:1,dirY:0});assignAbilityToSlot(p,0,'sanguineLance');
  const manager=createControllerManager(),slot=manager.slots[0];slot.connected=true;slot.prevButtons=Array(16).fill(false);slot.buttons=Array(16).fill(false);slot.buttons[7]=true;
  const now=performance.now()/1000,input={...getControllerInput(manager),hasAim:true,combatAimX:1,combatAimY:0};combat.updateAbilityInput(p,game.world,input,.01,now,()=>{});const began=p.activeChannel?.abilityId==='sanguineLance';
  slot.prevButtons=slot.buttons;slot.buttons=Array(16).fill(false);combat.updateCombat(p,game.world,getControllerInput(manager),.01,now+.01,()=>{});const ended=!p.activeChannel;
  assignAbilityToSlot(p,0,'royalBatBeast');slot.prevButtons=Array(16).fill(false);slot.buttons[7]=true;combat.updateAbilityInput(p,game.world,getControllerInput(manager),.01,now+.02,()=>{});const transformed=p.vampireForm?.active;
  slot.prevButtons=Array(16).fill(false);combat.updateAbilityInput(p,game.world,getControllerInput(manager),.01,now+.03,()=>{});
  return {began,ended,transformed,returned:!p.vampireForm?.active};
 });assert(Object.values(controller).every(Boolean),JSON.stringify(controller));
 await page.setViewportSize({width:1200,height:720});
 await page.evaluate(async()=>{
  const {drawRoyalVampire,drawVampireBat,drawVampireEffect}=await import('/src/vampireArt.js'),{asset}=await import('/src/spriteArt.js');
  for(const name of ['veyreign-bat-beast-compact','veyreign-royal-blood-beast-compact','veyreign-royal-blood-beast-allied-compact']){const a=asset(name);if(!a.ready)await new Promise((resolve,reject)=>{a.image.addEventListener('load',resolve,{once:true});a.image.addEventListener('error',reject,{once:true});});}
  const c=document.createElement('canvas');c.width=1200;c.height=720;document.body.replaceChildren(c);document.body.style.cssText='margin:0;background:#18141d';const ctx=c.getContext('2d'),now=performance.now()/1000;
  ctx.fillStyle='#241d29';ctx.fillRect(0,0,1200,720);ctx.font='24px Georgia';ctx.fillStyle='#efc4ca';ctx.fillText('RUNALIS · Vampire bloodline',34,42);
  for(const [i,label]of ['Transformation','Royal claws','Jaw beam','Bat Beast'].entries()){
   const x=160+i*280,y=235;ctx.font='17px Georgia';ctx.fillText(label,x-70,100);
   if(i<3){const p={x,y,slot:i+1,hp:100,maxHp:100,bloodline:{id:'vampire'},vampireForm:{active:true,transitionAt:now-(i===0?.3:1)},combatState:{attacking:i===1},activeChannel:i===2?{}:null};drawRoyalVampire(ctx,p,{x:0,y:0});if(i===2)drawVampireEffect(ctx,{kind:'vampire',profile:'beam',royal:true,x,y,targetX:x+140,targetY:y-60,ttl:.28,age:.05},{x:0,y:0});}
   else drawVampireBat(ctx,{kind:'vampireBat',displayName:'Dreadwing',dirX:1,attackAnimationUntil:now+1},{slot:4},x,y);
  }
  for(const [i,profile]of ['wave','communion','step','execution'].entries()){const x=160+i*280,y=500;ctx.fillStyle='#efc4ca';ctx.fillText(profile,x-50,350);drawVampireEffect(ctx,{kind:'vampire',profile,x,y,targetX:x-100,targetY:y+20,radius:120,ttl:.45,age:.15,dirX:1,dirY:0},{x:0,y:0});}
 });await page.screenshot({path:'docs/vampire-overhaul/combat-presentation.png'});
 assert.deepEqual(errors,[]);assert.deepEqual(missing,[]);fs.writeFileSync('docs/vampire-overhaul/browser-verification.json',JSON.stringify({errors,missing,controller,tree:true,abilityMenu:true,desktop:true,mobile:true,presentation:true},null,2));console.log('PASS Vampire tree/menu, 3 form choices, max-HP tooltips, pad beam/form lifecycle, actual atlas and effect rendering; no page errors or missing resources');
 }finally{await browser.close();}
})().catch(e=>{console.error(e);process.exitCode=1;});
