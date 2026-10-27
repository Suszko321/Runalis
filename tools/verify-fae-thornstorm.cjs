const {chromium}=require(process.env.RUNALIS_NODE_MODULES+'/playwright');
const fs=require('node:fs'),assert=require('node:assert/strict');
(async()=>{
 const browser=await chromium.launch({channel:'msedge',headless:true});
 try{
  const page=await browser.newPage({viewport:{width:1280,height:1000}}),errors=[];page.on('pageerror',e=>errors.push(e.message));
  await page.goto('http://127.0.0.1:8768/combat-overhaul-lab.html?skill=thornbinderThornstorm&morph=fae');
  await page.waitForFunction(()=>window.combatReview?.game.player);
  await page.evaluate(async()=>{
   const g=combatReview.game,w=g.world;
   const combat=await import('/src/combat.js'),players=await import('/src/player.js'),state=await import('/src/subclassCombat.js'),visuals=await import('/src/combatVisualsRenderer.js'),humans=await import('/src/humanRenderer.js'),enemies=await import('/src/render.js');
   const p=players.createPlayer('Flower reviewer');players.chooseClass(p,'thornbinder');g.player=p;
   const loadout=await import('/src/abilityLoadoutSystem.js'),mastery=await import('/src/abilityMasterySystem.js'),morphs=await import('/src/abilityMorphSystem.js');
   g.paused=true;for(const s of Object.values(p.skillState.skills))s.level=20;players.migratePlayer(p);
   loadout.unlockActiveAbility(p,'thornbinderThornstorm',{autoAssignEmpty:false});mastery.getAbilityMastery(p,'thornbinderThornstorm',true).level=20;loadout.assignAbilityToSlot(p,0,'thornbinderThornstorm');morphs.selectAbilityMorph(p,'thornbinderThornstorm','fae');
   p.spiritAwakened=true;g.dev.refill();p.hp=p.maxHp*.4;p.x=300;p.y=270;p.visualAction=null;p.cooldowns={};p.summons=[];
   const ally=players.createPlayer('Ally');players.chooseClass(ally,'oathkeeper');Object.assign(ally,{id:'flower-ally',x:230,y:285,hp:10,dirX:1,dirY:0});
   const outside=players.createPlayer('Outside ally');players.chooseClass(outside,'oathkeeper');Object.assign(outside,{id:'outside-ally',x:510,y:280,hp:10});p.coop={players:[ally,outside]};
   const foe=(name,x)=>({id:name,name,kind:'rat',x,y:300,hp:10000,maxHp:10000,radius:12,aggro:3,combatTargetKind:'player',combatTargetId:p.id});
   w.enemies=[foe('Inside enemy',380),foe('Outside enemy',520)];w.effects=[];const t=performance.now()/1000;
   const cast=combat.useAbility(0,p,w,()=>{},t,{combatAimX:1,combatAimY:0,hasAim:true});
   if(!cast)throw Error('Fae Thornstorm cast failed');
   const canvas=document.createElement('canvas');canvas.id='flower-scene';canvas.width=600;canvas.height=530;canvas.style.width='600px';canvas.style.height='530px';document.body.appendChild(canvas);
   const ctx=canvas.getContext('2d');
   window.flowerReview={g,p,w,ally,outside,combat,state,visuals,humans,enemies,t,time:0,canvas,ctx,before:{player:p.hp,ally:ally.hp,outside:outside.hp}};
   flowerReview.step=seconds=>{const r=flowerReview;for(let i=0;i<Math.round(seconds/.05);i++){r.time+=.05;combat.updateCombat(p,w,{},.05,t+r.time,()=>{});for(const fx of w.effects)fx.age+=.05;w.effects=w.effects.filter(fx=>fx.age<fx.ttl);}};
   flowerReview.draw=label=>{
    ctx.imageSmoothingEnabled=false;ctx.fillStyle='#2d402e';ctx.fillRect(0,0,600,530);
    for(let i=0;i<700;i++){ctx.fillStyle=i%2?'#3c5136':'#344932';ctx.fillRect(i*83%598,i*47%529,4+i%4,2);}
    ctx.fillStyle='#ece0c7';ctx.font='16px Georgia';ctx.fillText('Fae Thornstorm · '+label,18,27);
    const camera={x:0,y:0};visuals.drawWorldEffects(ctx,w,camera,'behind');for(const e of w.enemies)enemies.drawEnemy(ctx,e,camera,p);
    for(const actor of [ally,p])humans.drawHumanActor(ctx,actor,camera,{isPlayer:true});visuals.drawWorldEffects(ctx,w,camera,'front');
   };
  });
  await page.waitForTimeout(500);
  fs.mkdirSync('docs/fae-thornstorm',{recursive:true});
  await page.evaluate(()=>{flowerReview.step(.45);flowerReview.draw('emerging');});await page.locator('#flower-scene').screenshot({path:'docs/fae-thornstorm/emerging.png'});
  await page.evaluate(()=>{flowerReview.step(1.3);flowerReview.draw('flower field');});await page.locator('#flower-scene').screenshot({path:'docs/fae-thornstorm/flower-field.png'});
  const report=await page.evaluate(async()=>{
   const r=flowerReview,f=r.state.getSubclassCombatState(r.p).fields[0],fx=r.w.effects.find(e=>e.geometry==='flowerField'),{drawFaeFlowerField}=await import('/src/faeFlowerArt.js');
   const canvas=document.createElement('canvas');canvas.width=600;canvas.height=530;const ctx=canvas.getContext('2d'),pixels=[];
   for(const age of [.45,1.5,7.7,8.01]){ctx.clearRect(0,0,600,530);drawFaeFlowerField(ctx,{...fx,age,flowerAge:0},{x:0,y:0});const d=ctx.getImageData(0,0,600,530).data;let painted=0;for(let i=3;i<d.length;i+=4)if(d[i])painted++;pixels.push({age,painted});}
   return {playerHealed:r.p.hp-r.before.player,allyHealed:r.ally.hp-r.before.ally,outsideHealed:r.outside.hp-r.before.outside,insideDamage:10000-r.w.enemies[0].hp,outsideDamage:10000-r.w.enemies[1].hp,
    radius:f.radius,duration:f.until-f.startedAt,flowers:f.flowerVisual.flowers.length,channel:r.p.activeChannel?.abilityId||null,pixels};
  });
  assert.ok(report.playerHealed>0&&report.allyHealed>0&&report.insideDamage>0);assert.equal(report.outsideHealed,0);assert.equal(report.outsideDamage,0);assert.equal(report.channel,null);
  assert.equal(report.radius,180);assert.equal(report.duration,8);assert.equal(report.flowers,64);
  assert.ok(report.pixels[1].painted>report.pixels[0].painted);assert.ok(report.pixels[2].painted<report.pixels[1].painted);assert.equal(report.pixels[3].painted,0);
  await page.evaluate(()=>{flowerReview.step(5.95);flowerReview.draw('fading');});await page.locator('#flower-scene').screenshot({path:'docs/fae-thornstorm/fading.png'});
  await page.evaluate(()=>flowerReview.step(.5));assert.equal(await page.evaluate(()=>flowerReview.state.getSubclassCombatState(flowerReview.p).fields.length),0);
  const uiPage=await browser.newPage({viewport:{width:1280,height:900}});uiPage.on('pageerror',e=>errors.push(e.message));
  await uiPage.route('**/src/main.js*',r=>r.fulfill({contentType:'text/javascript',body:''}));await uiPage.goto('http://127.0.0.1:8768/');
  await uiPage.evaluate(async()=>{
   const ui=await import('/src/ui.js'),players=await import('/src/player.js'),loadout=await import('/src/abilityLoadoutSystem.js'),mastery=await import('/src/abilityMasterySystem.js'),morphs=await import('/src/abilityMorphSystem.js');
   const p=players.createPlayer('Flower field');players.chooseClass(p,'thornbinder');loadout.unlockActiveAbility(p,'thornbinderThornstorm',{autoAssignEmpty:false});mastery.getAbilityMastery(p,'thornbinderThornstorm',true).level=20;morphs.selectAbilityMorph(p,'thornbinderThornstorm','fae');
   const game={player:p,world:{mode:'overworld',objects:[],enemies:[],width:640,height:480},camera:{x:0,y:0},logLines:[],log(){},save(){},keys:{},input:{},canvas:document.querySelector('#game')};
   document.querySelector('#mainMenu').classList.remove('active');document.querySelector('#app').classList.add('active');ui.initUI(game);game.uiState.skillsSubtab='abilities';game.uiState.selectedAbilityId='thornbinderThornstorm';ui.renderUI(p,[],game);
  });
  await uiPage.locator('[data-tab="skills"]').evaluate(e=>e.click());
  const detail=await uiPage.locator('.ability-detail-pane').innerText(),facts=await uiPage.locator('.ability-detail-pane .information-facts').innerText();
  assert.match(detail,/eight-second circle of Fae flowers/);assert.match(detail,/standing inside/);assert.match(detail,/Faerie Fire damage/);
  assert.match(facts,/Press to use/);assert.match(facts,/5\.6-tile radius/);assert.match(facts,/8s before tree bonuses/);assert.match(facts,/every 0\.8s/);assert.doesNotMatch(facts,/channel|\/s|Hold/i);
  report.abilityPanelVerified=true;await uiPage.locator('.ability-detail-pane').screenshot({path:'docs/fae-thornstorm/ability-panel.png'});
  assert.deepEqual(errors,[]);fs.writeFileSync('docs/fae-thornstorm/browser-verification.json',JSON.stringify({pass:true,...report,errors},null,2));console.log(JSON.stringify({pass:true,...report,errors}));
 }finally{await browser.close();}
})().catch(e=>{console.error(e);process.exitCode=1;});
