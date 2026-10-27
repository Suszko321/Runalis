const {chromium}=require(process.env.RUNALIS_NODE_MODULES+'/playwright');
const assert=require('node:assert/strict'),fs=require('node:fs');
(async()=>{
 const browser=await chromium.launch({channel:'msedge',headless:true}),errors=[],missing=[],forms=[];fs.mkdirSync('docs/bound-dead',{recursive:true});
 try{
  const page=await browser.newPage({viewport:{width:1440,height:1000}});page.on('pageerror',e=>errors.push(e.message));page.on('response',r=>{if(r.status()>=400)missing.push(r.url());});
  await page.goto('http://127.0.0.1:8768/combat-overhaul-lab.html?skill=summonLich&morph=acolyte');await page.waitForFunction(()=>window.combatReview?.game.player?.abilityMorphs?.summonLich==='acolyte');
  await page.evaluate(async()=>{window.sprites=await import('/src/spriteArt.js');window.summonArt=await import('/src/summonArt.js');window.codeArt=await import('/src/codeAssets.js');});
  await page.waitForFunction(()=>['summons-core','bound-dead-specter','bound-dead-knight'].every(n=>sprites.asset(n)?.ready));
  const art=await page.evaluate(()=>{
   const c=document.createElement('canvas');c.id='bound-frames';c.width=1080;c.height=680;document.body.appendChild(c);const ctx=c.getContext('2d');ctx.imageSmoothingEnabled=false;ctx.fillStyle='#253c2c';ctx.fillRect(0,0,c.width,c.height);
   for(let i=0;i<900;i++){ctx.fillStyle=i%2?'#304734':'#29402d';ctx.fillRect((i*83)%1080,(i*47)%680,4+i%5,2);}
   const report=[],oldNow=performance.now;performance.now=()=>10000;
   try{for(const [row,form] of ['base','acolyte','deathknight'].entries()){
    const name=['Skeleton Henchman','Mummy Â· stacking hexes','Specter Â· soul healing','Lesser Goliath Knight Â· cleave'][row],top=row*168+10;ctx.fillStyle='#f0dcb7';ctx.font='17px Georgia';ctx.fillText(name,16,top+12);const hashes=[];
    for(const [col,pose] of ['idle','walk A','walk B','attack'].entries()){
     const x=65+col*265,y=top+126,s={kind:'lich',summonFamily:'boundDead',summonMorph:form,evolutionStage:'skeletonServant',x,y,dirX:1,reviewAnimation:pose==='idle'?'idle':pose==='attack'?'attack':'walk',reviewAnimationTime:pose==='walk B'?.4:.15,coterieEquipment:{weapon:'hunterBow',armour:'leatherVest'},skeletonRole:'vanguard'};
     performance.now=()=>pose==='walk B'?10125:10000;const sample=document.createElement('canvas');sample.width=150;sample.height=145;const sc=sample.getContext('2d');codeArt.drawSummonAsset(sc,s,combatReview.game.player,75,120);hashes.push([...sc.getImageData(0,0,150,145).data].join(','));ctx.drawImage(sample,x-55,y-120);codeArt.drawSummonAsset(ctx,{...s,dirX:-1},combatReview.game.player,x+115,y);
     if(form!=='base'){const raw=document.createElement('canvas');raw.width=150;raw.height=145;summonArt.drawSummonArt(raw.getContext('2d'),s,'skeletonServant',75,120);if([...raw.getContext('2d').getImageData(0,0,150,145).data].join(',')!==hashes.at(-1))throw Error('Coterie gear replaced authored morph '+form);}
     ctx.fillStyle='#e1cba6';ctx.font='12px Georgia';ctx.fillText(pose+' Â· right / left',x-37,top+153);
    }report.push({form,distinctFrames:new Set(hashes).size});
   }}finally{performance.now=oldNow;}return report;
  });
  art.filter(a=>a.form!=='base').forEach(a=>assert.equal(a.distinctFrames,4,a.form));await page.locator('#bound-frames').screenshot({path:'docs/bound-dead/animation-gallery.png'});
  const comparison=await page.evaluate(async()=>{
   const {BOUND_DEAD_SPRITES}=await import('/src/lichSummonArt.js'),c=document.createElement('canvas');c.id='bound-versus-lich';c.width=960;c.height=410;document.body.appendChild(c);const ctx=c.getContext('2d');ctx.fillStyle='#253c2c';ctx.fillRect(0,0,c.width,c.height);ctx.imageSmoothingEnabled=false;const report=[];
   for(const [row,form] of ['acolyte','deathknight'].entries()){
    const top=row*200;ctx.fillStyle='#f0dcb7';ctx.font='18px Georgia';ctx.fillText(form==='acolyte'?'Specter: spectral melee henchman / greater soul caster':'Goliath: battered melee footsoldier / greater deathknight',20,top+28);
    const hashes=[];
    for(let col=0;col<4;col++){
     const bound=col<2,attack=col%2===1,x=110+col*235,y=top+169,s={kind:bound?'lich':'greaterLich',summonFamily:bound?'boundDead':undefined,summonMorph:form,evolutionStage:bound?'skeletonServant':'lich',x,y,dirX:1,reviewAnimation:attack?'attack':'idle'};
     const sample=document.createElement('canvas');sample.width=180;sample.height=170;summonArt.drawSummonArt(sample.getContext('2d'),s,s.evolutionStage,90,140);hashes.push([...sample.getContext('2d').getImageData(0,0,180,170).data].join(','));ctx.drawImage(sample,x-90,y-140);ctx.font='13px Georgia';ctx.fillText((bound?'Bound servant':'Greater lich')+' · '+(attack?'attack':'idle'),x-75,top+195);
    }
    report.push({form,lesserAsset:BOUND_DEAD_SPRITES[form].name,greaterAsset:'lich-'+form,differentIdle:hashes[0]!==hashes[2],differentAttack:hashes[1]!==hashes[3]});
   }return report;
  });
  comparison.forEach(r=>{assert.ok(r.lesserAsset.startsWith('bound-dead-'));assert.ok(r.differentIdle&&r.differentAttack);});await page.locator('#bound-versus-lich').screenshot({path:'docs/bound-dead/lesser-versus-greater.png'});
  for(const morph of ['base','acolyte','deathknight']){
   const result=await page.evaluate(async morph=>{
    const g=combatReview.game,{createPlayer,chooseClass}=await import('/src/player.js');g.player=createPlayer('Commander review');chooseClass(g.player,'gravecaller');const p=g.player,w=g.world,{useAbility,updateSummons}=await import('/src/combat.js'),{selectAbilityMorph}=await import('/src/abilityMorphSystem.js'),{getAbilityMastery}=await import('/src/abilityMasterySystem.js'),{spendSkillTreeNode}=await import('/src/skillTreeSystem.js');
    g.paused=true;p.summons=[];p.visualAction=null;p.cooldowns={};w.enemies=[];w.effects=[];g.dev.refill();g.dev.equip(['summonLich',null,null,null]);p.skillTree.bloodlineBonusPoints=100;Object.assign(p,{id:'bound-review',spiritAwakened:true,maxSpirit:1000,spirit:1000});for(const skill of Object.values(p.skillState.skills))skill.level=50;
    for(const id of ['spirit_root','spirit_harvest','spirit_minions','spirit_bone_coterie'])if(!spendSkillTreeNode(p,id).ok)throw Error('Node failed '+id);
    p.gravecaller.skeletons.forEach(s=>s.equipment={weapon:'hunterBow',armour:'leatherVest',charm:null});getAbilityMastery(p,'summonLich',true).level=20;selectAbilityMorph(p,'summonLich',morph);
    const t=performance.now()/1000,cast=useAbility(0,p,w,()=>{},t,{hasAim:true,combatAimX:1,combatAimY:0}),group=p.summons.filter(s=>s.kind==='lich');p.x=270;p.y=320;
    group.forEach((s,i)=>{s.x=355+i*75;s.y=320+i*30;s.attackCooldown=0;});const s=group[0];w.enemies=[{id:'target',kind:'rat',name:'Target',x:s.x+20,y:s.y,hp:5000,maxHp:5000,radius:12,aggro:3,combatTargetKind:'summon',combatTargetId:s.id}];updateSummons(.01,p,w,()=>{},t+.01);w.effects.forEach(f=>f.age=.08);combatReview.draw();
    return {morph,cast,count:group.length,names:group.map(s=>s.displayName),damage:5000-w.enemies[0].hp,effects:w.effects.filter(f=>f.kind==='lichSummon').map(f=>f.geometry)};
   },morph);assert.ok(result.cast&&result.damage>0,JSON.stringify(result));assert.equal(result.count,3);forms.push(result);await page.locator('#arena').screenshot({path:`docs/bound-dead/${morph}-in-game.png`});
  }
  const menu=await browser.newPage({viewport:{width:1440,height:900}});menu.on('pageerror',e=>errors.push(e.message));menu.on('response',r=>{if(r.status()>=400)missing.push(r.url());});await menu.route('**/src/main.js*',r=>r.fulfill({contentType:'text/javascript',body:''}));await menu.goto('http://127.0.0.1:8768/');
  await menu.evaluate(async()=>{
   const ui=await import('/src/ui.js'),player=await import('/src/player.js'),tree=await import('/src/skillTreeSystem.js'),morph=await import('/src/abilityMorphSystem.js'),{createWorld}=await import('/src/world.js');
   const game={player:player.createPlayer('Bound menu review'),world:createWorld(),camera:{x:0,y:0},logLines:[],log(t){this.logLines.push(t);},save(){},keys:{},input:{},canvas:document.querySelector('#game')};player.chooseClass(game.player,'gravecaller');game.player.gold=20;game.player.skillTree.bloodlineBonusPoints=100;document.querySelector('#mainMenu').classList.remove('active');document.querySelector('#app').classList.add('active');ui.initUI(game);game.renderOwnedUI=()=>ui.renderUI(game.player,game.logLines,game);window.boundReview={game,ui,tree,morph};game.renderOwnedUI();
  });
  await menu.locator('[data-tab="skills"]').evaluate(e=>e.click());await menu.locator('button.subtab[data-skills-subtab="abilities"]').click();await menu.locator('[data-select-ability-id="summonLich"]').click();assert.equal(await menu.locator('[data-ability-morph]').count(),3);
  for(const m of ['acolyte','deathknight'])assert.ok(await menu.locator(`[data-ability-morph="${m}"]`).isDisabled());
  await menu.evaluate(()=>{boundReview.game.player.abilityMastery.summonLich={level:20,xp:0};boundReview.game.renderOwnedUI();});
  assert.match(await menu.locator('[data-ability-morph="acolyte"]').innerText(),/Acolyte/i);assert.match(await menu.locator('[data-ability-morph="deathknight"]').innerText(),/Deathknight/i);
  for(const morph of ['acolyte','deathknight','base']){await menu.locator(`[data-ability-morph="${morph}"]`).click();assert.equal(await menu.evaluate(()=>boundReview.morph.getSelectedAbilityMorph(boundReview.game.player,'summonLich')),morph==='base'?null:morph);}
  await menu.locator('[data-assign-selected-slot="3"]').click();assert.equal(await menu.evaluate(()=>boundReview.game.player.loadout.abilitySlots[3]),'summonLich');
  await menu.evaluate(()=>{const {game,ui}=boundReview;game.uiState.abilityAssignmentMode=false;const index=[...document.querySelectorAll('[data-select-ability-id]')].findIndex(e=>e.dataset.selectAbilityId==='summonLich');game.uiAbilityControllerState={region:'ability',abilityIndex:index,hotbarIndex:0};ui.handleGameUiControllerInput(game,{connected:true,xPressed:true});ui.handleGameUiControllerInput(game,{connected:true,downPressed:true});ui.handleGameUiControllerInput(game,{connected:true,confirmPressed:true});});assert.equal(await menu.evaluate(()=>boundReview.game.player.abilityMorphs.summonLich),'acolyte');await menu.screenshot({path:'docs/bound-dead/abilities.png'});
  await menu.evaluate(()=>{const {game,tree}=boundReview;for(const id of ['spirit_root','spirit_harvest','spirit_minions','spirit_bone_coterie'])if(!tree.spendSkillTreeNode(game.player,id).ok)throw Error('Node failed '+id);game.renderOwnedUI();});
  await menu.locator('button.subtab[data-skills-subtab="trees"]').click();await menu.locator('[data-select-skill-tree-node="spirit_bone_coterie"]').click();assert.match(await menu.locator('.skill-tree-detail-pane').innerText(),/three.*selected|three.*chosen/i);assert.match(await menu.locator('.skill-tree-detail-pane').innerText(),/specter/i);await menu.screenshot({path:'docs/bound-dead/commander-tree.png'});
  assert.deepEqual(errors,[]);assert.deepEqual(missing,[]);fs.writeFileSync('docs/bound-dead/browser-verification.json',JSON.stringify({pass:true,art,comparison,forms,menu:['Three persistent form options','Mastery gates','Mouse and controller selection','Canonical hotbar assignment','Commander description'],errors,missing},null,2)+'\n');console.log(JSON.stringify({pass:true,art,comparison,forms,errors,missing},null,2));
 }finally{await browser.close();}
})().catch(e=>{console.error(e);process.exitCode=1;});
