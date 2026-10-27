const {chromium}=require(process.env.RUNALIS_NODE_MODULES+'/playwright');
const assert=require('node:assert/strict'),fs=require('node:fs');
(async()=>{
 const browser=await chromium.launch({channel:'msedge',headless:true}),errors=[],results=[];
 try{
  for(const [width,height] of [[1440,900],[1280,720],[800,600]]){
   const page=await browser.newPage({viewport:{width,height}});page.on('pageerror',e=>errors.push(e.message));
   await page.route('**/src/main.js*',r=>r.fulfill({contentType:'text/javascript',body:''}));await page.goto('http://127.0.0.1:8768/');
   await page.evaluate(async()=>{
    const ui=await import('/src/ui.js'),players=await import('/src/player.js'),loadout=await import('/src/abilityLoadoutSystem.js'),mastery=await import('/src/abilityMasterySystem.js'),morphs=await import('/src/abilityMorphSystem.js'),controller=await import('/src/inputController.js');
    const p=players.createPlayer('Controller review');players.chooseClass(p,'thornbinder');p.spiritAwakened=true;
    for(const id of ['thornbinderThornstorm','thornbinderThornLash','guard'])loadout.unlockActiveAbility(p,id,{autoAssignEmpty:false});
    mastery.getAbilityMastery(p,'thornbinderThornstorm',true).level=20;morphs.selectAbilityMorph(p,'thornbinderThornstorm','fae');
    const game={player:p,world:{mode:'overworld',objects:[],enemies:[],width:640,height:480},camera:{x:0,y:0},logLines:[],log(text){this.logLines.push(text);},save(){},keys:{},input:{},canvas:document.querySelector('#game')};
    document.querySelector('#mainMenu').classList.remove('active');document.querySelector('#app').classList.add('active');ui.initUI(game);
    game.uiState.skillsSubtab='abilities';game.uiState.selectedAbilityId='thornbinderThornstorm';game.renderOwnedUI=()=>ui.renderUI(p,game.logLines,game);game.renderOwnedUI();
    const manager=controller.createControllerManager();manager.slots[0].connected=true;
    window.abilityControllerReview={game,ui,p,mastery,morphs,loadout,controller,manager};
    abilityControllerReview.press=button=>{
     const slot=manager.slots[0];slot.prevButtons=[];slot.buttons=[];if(button!==null)slot.buttons[button]=true;
     const handled=ui.handleGameUiControllerInput(game,controller.getControllerInput(manager));slot.prevButtons=slot.buttons;slot.buttons=[];
     return {handled,region:game.uiAbilityControllerState?.region,selected:game.uiState.selectedAbilityId,pending:game.uiState.pendingAbilityId,assigning:game.uiState.abilityAssignmentMode,hotbarIndex:game.uiAbilityControllerState?.hotbarIndex,
      focus:{ability:document.activeElement.dataset.selectAbilityId||null,morph:document.activeElement.dataset.abilityMorph||null,slot:document.activeElement.dataset.abilityHotbarSlot??null},slots:[...p.loadout.abilitySlots],morph:morphs.getSelectedAbilityMorph(p,'thornbinderThornstorm'),open:document.querySelector('.panel').classList.contains('open'),prompts:document.querySelector('#skills .menu-context-bar').innerText};
    };
   });
   await page.locator('[data-tab="skills"]').evaluate(e=>e.click());
   const press=button=>page.evaluate(button=>abilityControllerReview.press(button),button);
   const select=async id=>{await page.locator(`[data-select-ability-id="${id}"]`).evaluate(e=>e.click());return press(null);};
   let r=await press(null);assert.equal(r.region,'ability');assert.match(r.prompts,/X\s*Choose Morph/);
   for(let i=0;i<5;i++){r=await press(15);assert.equal(r.region,'ability');assert.equal(r.focus.ability,r.selected);}
   await select('thornbinderThornstorm');
   r=await press(13);assert.equal(r.region,'ability');assert.notEqual(r.selected,'thornbinderThornstorm');
   await select('thornbinderThornstorm');r=await press(2);assert.equal(r.region,'morph');assert.equal(r.focus.morph,'fae');assert.equal(r.assigning,false);assert.match(r.prompts,/B\s*Return to Skills/);
   for(const button of [15,14]){r=await press(button);assert.equal(r.region,'morph');assert.equal(r.focus.morph,'fae');}
   r=await press(13);assert.equal(r.focus.morph,'petalknight');assert.equal(r.morph,'fae','Navigation must not change the chosen morph');
   r=await press(0);assert.equal(r.morph,'petalknight');assert.equal(r.region,'morph');assert.equal(r.focus.morph,'petalknight');
   r=await press(1);assert.equal(r.region,'ability');assert.equal(r.open,true);assert.equal(r.focus.ability,'thornbinderThornstorm');
   r=await press(0);assert.equal(r.region,'hotbar');assert.equal(r.assigning,true);assert.equal(r.pending,'thornbinderThornstorm');assert.match(r.prompts,/A\s*Place Ability/);
   for(const button of [12,13]){r=await press(button);assert.equal(r.region,'hotbar');}
   r=await press(15);const slot=r.hotbarIndex;r=await press(0);assert.equal(r.slots[slot],'thornbinderThornstorm');assert.equal(r.region,'ability');assert.equal(r.assigning,false);
   r=await press(0);const saved=r.slots;r=await press(15);r=await press(1);assert.equal(r.open,true);assert.equal(r.region,'ability');assert.equal(r.pending,null);assert.deepEqual(r.slots,saved);
   r=await press(0);r=await press(2);assert.equal(r.slots[slot],null);assert.equal(r.region,'hotbar');assert.equal(r.assigning,true);r=await press(1);assert.equal(r.region,'ability');
   r=await select('thornbinderThornLash');r=await press(2);assert.equal(r.region,'morph');assert.equal(r.focus.morph,'base');
   for(let i=0;i<5;i++){r=await press(13);assert.equal(r.focus.morph,'base','Locked morphs cannot be selected');}
   r=await press(1);r=await select('guard');r=await press(15);assert.equal(r.region,'ability');r=await press(2);assert.equal(r.region,'ability','Skills without morphs must remain in the list');
   await select('thornbinderThornstorm');await press(2);r=await press(12);assert.equal(r.focus.morph,'fae');
   r=await press(0);assert.equal(r.morph,'fae');r=await press(12);assert.equal(r.focus.morph,'base');
   await page.evaluate(()=>abilityControllerReview.p.cooldowns.thornbinderThornstorm=performance.now()/1000);r=await press(0);assert.equal(r.morph,'fae','Recovering skills must retain their current morph');assert.equal(r.region,'morph');
   await page.evaluate(()=>abilityControllerReview.p.cooldowns={});r=await press(0);assert.equal(r.morph,null);await press(13);r=await press(0);assert.equal(r.morph,'fae');
   await page.waitForTimeout(150);
   const visibility=await page.evaluate(()=>{const active=document.activeElement,a=active.getBoundingClientRect(),b=document.querySelector('.panel').getBoundingClientRect();return {visible:a.top>=b.top&&a.bottom<=b.bottom&&a.left>=b.left&&a.right<=b.right,tag:active.tagName,morph:active.dataset.abilityMorph,rect:a.toJSON(),panel:b.toJSON()};});
   if(!visibility.visible)await page.screenshot({path:'docs/ability-controller/visibility-failure.png'});
   assert.equal(visibility.visible,true,'Morph selection remains visible: '+JSON.stringify(visibility));
   fs.mkdirSync('docs/ability-controller',{recursive:true});await page.screenshot({path:`docs/ability-controller/morph-selection-${width}.png`});
   r=await press(5);assert.notEqual(await page.evaluate(()=>abilityControllerReview.game.uiState.skillsSubtab),'abilities');
   r=await press(4);assert.equal(await page.evaluate(()=>abilityControllerReview.game.uiState.skillsSubtab),'abilities');assert.equal(r.region,'ability');
   await press(2);await page.locator('[data-skills-subtab="trees"]').evaluate(e=>e.click());await page.locator('[data-skills-subtab="abilities"]').evaluate(e=>e.click());r=await press(null);assert.equal(r.region,'ability');
   await select('thornbinderThornstorm');await press(2);r=await press(8);assert.equal(r.region,'ability');
   await page.locator('[data-tab="skills"]').evaluate(e=>e.click());r=await press(15);assert.equal(r.region,'ability');
   r=await press(1);assert.equal(r.open,false,'B closes the panel after returning to the skill list');
   await page.locator('[data-tab="skills"]').evaluate(e=>e.click());await select('thornbinderThornstorm');await press(0);
   await page.locator('[data-tab="inventory"]').evaluate(e=>e.click());await page.locator('[data-tab="skills"]').evaluate(e=>e.click());r=await press(15);assert.equal(r.region,'ability');assert.equal(r.assigning,false);
   await select('thornbinderThornstorm');await page.locator('[data-ability-morph="base"]').evaluate(e=>e.click());assert.equal(await page.evaluate(()=>abilityControllerReview.morphs.getSelectedAbilityMorph(abilityControllerReview.p,'thornbinderThornstorm')),null,'Mouse morph controls still work');
   await page.locator('[data-assign-selected-slot="3"]').evaluate(e=>e.click());assert.equal(await page.evaluate(()=>abilityControllerReview.p.loadout.abilitySlots[3]),'thornbinderThornstorm','Mouse assignment still works');
   results.push({width,height,passed:true});await page.close();
  }
  assert.deepEqual(errors,[]);fs.writeFileSync('docs/ability-controller/verification.json',JSON.stringify({pass:true,viewports:results,errors},null,2));console.log(JSON.stringify({pass:true,viewports:results,errors}));
 }finally{await browser.close();}
})().catch(e=>{console.error(e);process.exitCode=1;});
