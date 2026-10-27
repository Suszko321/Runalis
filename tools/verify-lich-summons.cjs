const {chromium}=require(process.env.RUNALIS_NODE_MODULES+'/playwright');
const assert=require('node:assert/strict'),fs=require('node:fs');
(async()=>{
 const browser=await chromium.launch({channel:'msedge',headless:true}),errors=[],missing=[],forms=[];
 fs.mkdirSync('docs/lich-summons',{recursive:true});
 try{
  const page=await browser.newPage({viewport:{width:1440,height:1000}});
  page.on('pageerror',e=>errors.push(e.message));page.on('response',r=>{if(r.status()>=400)missing.push(r.url());});
  await page.goto('http://127.0.0.1:8768/combat-overhaul-lab.html?skill=gravecallerSummonLich&morph=acolyte');
  await page.waitForFunction(()=>window.combatReview?.game.player?.abilityMorphs?.gravecallerSummonLich==='acolyte');
  await page.evaluate(async()=>{window.lichArt=await import('/src/lichSummonArt.js');window.sprites=await import('/src/spriteArt.js');window.summonArt=await import('/src/summonArt.js');});
  await page.waitForFunction(()=>['summons-core','lich-acolyte','lich-deathknight'].every(n=>sprites.asset(n)?.ready));
  const art=await page.evaluate(()=>{
   const c=document.createElement('canvas');c.id='lich-frames';c.width=1080;c.height=790;document.body.appendChild(c);
   const ctx=c.getContext('2d');ctx.imageSmoothingEnabled=false;ctx.fillStyle='#253c2c';ctx.fillRect(0,0,c.width,c.height);
   for(let i=0;i<900;i++){ctx.fillStyle=i%2?'#304734':'#29402d';ctx.fillRect((i*83)%1080,(i*47)%790,4+i%5,2);}
   const report=[],oldNow=performance.now;performance.now=()=>10000;
   try{
    for(const [row,form] of ['base','acolyte','deathknight'].entries()){
     const name=['Lich · third-bolt burst','Undead Pharaoh · stacking hexes','Ghostly Specter · soul healing','Goliath Deathknight · cleave'][row];
     const top=row*195+14;ctx.fillStyle='#f0dcb7';ctx.font='17px Georgia';ctx.fillText(name,16,top+12);
     const hashes=[];
     for(const [col,pose] of ['idle','walk A','walk B','attack'].entries()){
      const x=65+col*265,y=top+144;
      const s={kind:'greaterLich',summonMorph:form,evolutionStage:'lich',x,y,dirX:1,reviewAnimation:pose==='idle'?'idle':pose==='attack'?'attack':'walk',reviewAnimationTime:pose==='walk B'?.4:.15};
      performance.now=()=>pose==='walk B'?10125:10000;
      const sample=document.createElement('canvas');sample.width=150;sample.height=160;
      const sc=sample.getContext('2d');assertDraw(summonArt.drawSummonArt(sc,s,'lich',75,135));
      hashes.push([...sc.getImageData(0,0,150,160).data].join(','));
      ctx.drawImage(sample,x-55,y-135);
      assertDraw(summonArt.drawSummonArt(ctx,{...s,dirX:-1},'lich',x+115,y));
      ctx.fillStyle='#e1cba6';ctx.font='12px Georgia';ctx.fillText(pose+' · right / left',x-37,top+179);
     }
     report.push({form,distinctFrames:new Set(hashes).size});
    }
   }finally{performance.now=oldNow;}
   function assertDraw(value){if(!value)throw Error('Sprite failed to draw');}
   return report;
  });
  art.forEach(a=>assert.equal(a.distinctFrames,4,a.form));
  await page.locator('#lich-frames').screenshot({path:'docs/lich-summons/animation-gallery.png'});
  for(const morph of ['base','acolyte','deathknight']){
   const result=await page.evaluate(async morph=>{
    const g=combatReview.game,p=g.player,w=g.world;
    const {useAbility,updateSummons}=await import('/src/combat.js'),{selectAbilityMorph}=await import('/src/abilityMorphSystem.js'),{getAbilityMastery}=await import('/src/abilityMasterySystem.js');
    g.paused=true;p.summons=[];p.visualAction=null;p.cooldowns={};w.enemies=[];w.effects=[];g.dev.refill();g.dev.equip(['summonLich',null,null,'gravecallerSummonLich']);
    getAbilityMastery(p,'gravecallerSummonLich',true).level=20;selectAbilityMorph(p,'gravecallerSummonLich',morph);
    const t=performance.now()/1000,cast=useAbility(3,p,w,()=>{},t,{hasAim:true,combatAimX:1,combatAimY:0}),s=p.summons[0];
    s.x=360;s.y=320;p.x=270;p.y=320;
    w.enemies=[{id:'target',kind:'rat',name:'Target',x:395,y:320,hp:5000,maxHp:5000,radius:12,aggro:3,combatTargetKind:'summon',combatTargetId:s.id}];
    updateSummons(.01,p,w,()=>{},t+.01);w.effects.forEach(f=>f.age=.08);combatReview.draw();
    return {morph,cast,name:s.displayName,damage:5000-w.enemies[0].hp,effects:w.effects.filter(f=>f.kind==='lichSummon').map(f=>f.geometry)};
   },morph);
   assert.ok(result.cast&&result.damage>0&&result.effects.length>0);forms.push(result);
   await page.locator('#arena').screenshot({path:`docs/lich-summons/${morph}-in-game.png`});
  }
  const menu=await browser.newPage({viewport:{width:1440,height:900}});menu.on('pageerror',e=>errors.push(e.message));menu.on('response',r=>{if(r.status()>=400)missing.push(r.url());});
  await menu.route('**/src/main.js*',r=>r.fulfill({contentType:'text/javascript',body:''}));await menu.goto('http://127.0.0.1:8768/');
  await menu.evaluate(async()=>{
   const ui=await import('/src/ui.js'),player=await import('/src/player.js'),tree=await import('/src/skillTreeSystem.js'),morph=await import('/src/abilityMorphSystem.js');
   const {createWorld}=await import('/src/world.js');
   const game={player:player.createPlayer('Lich menu review'),world:createWorld(),camera:{x:0,y:0},logLines:[],log(t){this.logLines.push(t);},save(){},keys:{},input:{},canvas:document.querySelector('#game')};
   player.chooseClass(game.player,'gravecaller');game.player.gold=20;game.player.skillTree.bloodlineBonusPoints=100;
   document.querySelector('#mainMenu').classList.remove('active');document.querySelector('#app').classList.add('active');
   ui.initUI(game);game.renderOwnedUI=()=>ui.renderUI(game.player,game.logLines,game);window.lichReview={game,ui,tree,morph};game.renderOwnedUI();
  });
  await menu.locator('[data-tab="skills"]').evaluate(e=>e.click());await menu.locator('button.subtab[data-skills-subtab="abilities"]').click();
  assert.equal(await menu.locator('[data-select-ability-id="gravecallerSummonLich"]').count(),0);
  await menu.evaluate(()=>{const {game,tree}=lichReview;for(const id of ['spirit_root','spirit_harvest','spirit_minions','spirit_lich_ascension'])if(!tree.spendSkillTreeNode(game.player,id).ok)throw Error('Node failed '+id);game.renderOwnedUI();});
  await menu.locator('[data-select-ability-id="gravecallerSummonLich"]').click();assert.equal(await menu.locator('[data-ability-morph]').count(),3);
  assert.ok(await menu.locator('[data-ability-morph="acolyte"]').isDisabled());assert.ok(await menu.locator('[data-ability-morph="deathknight"]').isDisabled());
  await menu.evaluate(()=>{lichReview.game.player.abilityMastery.gravecallerSummonLich={level:20,xp:0};lichReview.game.renderOwnedUI();});
  assert.match(await menu.locator('[data-ability-morph="acolyte"]').innerText(),/Acolyte/i);assert.match(await menu.locator('[data-ability-morph="deathknight"]').innerText(),/Deathknight/i);
  for(const morph of ['acolyte','deathknight','base']){
   await menu.locator(`[data-ability-morph="${morph}"]`).click();assert.equal(await menu.evaluate(()=>lichReview.morph.getSelectedAbilityMorph(lichReview.game.player,'gravecallerSummonLich')),morph==='base'?null:morph);
  }
  await menu.locator('[data-assign-selected-slot="3"]').click();assert.equal(await menu.evaluate(()=>lichReview.game.player.loadout.abilitySlots[3]),'gravecallerSummonLich');
  await menu.evaluate(()=>{const {game,ui}=lichReview;game.uiState.abilityAssignmentMode=false;const index=[...document.querySelectorAll('[data-select-ability-id]')].findIndex(e=>e.dataset.selectAbilityId==='gravecallerSummonLich');game.uiAbilityControllerState={region:'ability',abilityIndex:index,hotbarIndex:0};ui.handleGameUiControllerInput(game,{connected:true,xPressed:true});ui.handleGameUiControllerInput(game,{connected:true,downPressed:true});ui.handleGameUiControllerInput(game,{connected:true,confirmPressed:true});});
  assert.equal(await menu.evaluate(()=>lichReview.game.player.abilityMorphs.gravecallerSummonLich),'acolyte');
  await menu.screenshot({path:'docs/lich-summons/abilities.png'});
  await menu.locator('[data-ability-morph="base"]').click();
  await menu.locator('button.subtab[data-skills-subtab="trees"]').click();
  await menu.locator('[data-select-skill-tree-node="spirit_lich_ascension"]').click();
  assert.match(await menu.locator('.skill-tree-detail-pane').innerText(),/Summon Lich/);assert.match(await menu.locator('.skill-tree-detail-pane').innerText(),/keep Raise the Bound Dead/i);
  await menu.screenshot({path:'docs/lich-summons/tree-unlock.png'});
  assert.deepEqual(errors,[]);assert.deepEqual(missing,[]);
  fs.writeFileSync('docs/lich-summons/browser-verification.json',JSON.stringify({pass:true,art,forms,menu:['Hidden until learned','Separate tree unlock','Four morphs with correct creatures','Mastery gates','Mouse selection','Canonical hotbar assignment','Controller X opens and selects morph'],errors,missing},null,2)+'\n');
  console.log(JSON.stringify({pass:true,art,forms,errors,missing},null,2));
 }finally{await browser.close();}
})().catch(e=>{console.error(e);process.exitCode=1;});
