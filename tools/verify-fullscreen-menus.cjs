const {chromium}=require(process.env.RUNALIS_NODE_MODULES+'/playwright');
const assert=require('node:assert/strict'),fs=require('node:fs');
const out='docs/fullscreen-menus';fs.mkdirSync(out,{recursive:true});
(async()=>{
 const browser=await chromium.launch({channel:'msedge',headless:true}),errors=[],results=[],overlays=[],choosers=[],trees=[];
 try {
  for(const [width,height] of [[1920,1080],[1280,720],[800,600],[640,360]]){
   const page=await browser.newPage({viewport:{width,height}});page.on('pageerror',e=>errors.push(e.message));
   await page.route('**/src/main.js*',r=>r.fulfill({contentType:'text/javascript',body:''}));
   await page.goto('http://127.0.0.1:8768/');
   await page.evaluate(async()=>{
    const ui=await import('/src/ui.js'),players=await import('/src/player.js'),data=await import('/src/data.js'),loadout=await import('/src/abilityLoadoutSystem.js');
    const p=players.createPlayer('Menu review');players.chooseClass(p,'thornbinder');p.spiritAwakened=true;p.gold=100000;
    p.knownAbilities=data.ABILITIES.map(a=>a.id);p.unlockedAbilities=[...p.knownAbilities];
    p.inventory=Object.values(data.ITEMS).filter(i=>i.id).map(i=>({id:i.id,qty:5}));
    for(const slot of ['weapon','helm','chest','legs','trinket'])p.equipment[slot]=p.inventory.find(e=>data.ITEMS[e.id].slot===slot)?.id||null;
    p.quests={active:Object.fromEntries(Array.from({length:30},(_,i)=>['review'+i,{id:'review'+i,name:'Expedition '+(i+1),title:'Expedition '+(i+1),description:'Explore a distant ruin.',objectives:[{text:'Reach the ruin',current:0,target:1}]}])),completed:{}};
    const game={player:p,world:{mode:'overworld',regionId:'menuReview',tiles:Array.from({length:60},()=>Array.from({length:80},()=>({biome:'grass',forestWall:false}))),objects:[],enemies:[],navStones:[],width:80,height:60},camera:{x:0,y:0},logLines:Array.from({length:100},(_,i)=>'World event '+(i+1)),log(text){this.logLines.push(text)},save(){},keys:{},input:{},canvas:document.querySelector('#game')};
    // This fixture deliberately skips main.js; remove the startup blocker
    // that the normal boot sequence clears before exposing gameplay.
    document.getElementById('startupStatus')?.remove();document.querySelector('#mainMenu').classList.remove('active');document.querySelector('#app').classList.add('active');ui.initUI(game);
    game.renderOwnedUI=()=>ui.renderUI(p,game.logLines,game);game.renderOwnedUI();
    window.menuReview={ui,players,p,game,data,loadout};
   });
   await page.waitForTimeout(300);
   const views=[['inventory','equipment'],['inventory','bag'],['inventory','coterie'],['character'],['skills','abilities'],['skills','progression'],['skills','trees'],['quests'],['map'],['log']];
   for(const [tab,subtab] of views){
    await page.evaluate(({tab,subtab})=>{const {game}=menuReview;if(subtab)game.uiState[tab==='inventory'?'inventorySubtab':'skillsSubtab']=subtab;if(game.uiState.activeMainTab!==tab)document.querySelector(`[data-tab="${tab}"]`).click();game.renderOwnedUI();},{tab,subtab});
    await page.waitForTimeout(100);
    const report=await page.evaluate(({tab,subtab})=>{
     const panel=document.getElementById(tab),r=panel.getBoundingClientRect();
     const fullyVisible=e=>{const a=e.getBoundingClientRect(),top=document.elementFromPoint((a.left+a.right)/2,(a.top+a.bottom)/2);return a.width>0&&a.height>0&&a.top>=0&&a.bottom<=innerHeight+1&&a.left>=0&&a.right<=innerWidth+1&&(top===e||e.contains(top));};
     const core=[...panel.children].filter(e=>!e.matches('.menu-context-bar,.subtab-bar'));
     return {tab,subtab,rect:r.toJSON(),full:r.x===0&&r.y===0&&Math.abs(r.width-innerWidth)<1&&Math.abs(r.height-innerHeight)<1,
      bannerHidden:getComputedStyle(document.querySelector('.panel > .tabs')).display==='none',
      sheets:panel.querySelectorAll('.menu-sheet-pane,[data-inventory-page],.quest-page-controls').length,
      core:core.map(e=>({class:e.className,rect:e.getBoundingClientRect().toJSON(),scroll:e.scrollHeight,height:e.clientHeight})),
      slots:[...panel.querySelectorAll('.equipment-slot-grid [data-equipment-slot]')].map(e=>({slot:e.dataset.equipmentSlot,visible:fullyVisible(e),rect:e.getBoundingClientRect().toJSON()})),
      listCount:panel.querySelectorAll('[data-select-ability-id],.inventory-name-list [data-inventory-item-index],.quest-title-button').length,
      visibleAbilities:[...panel.querySelectorAll('[data-select-ability-id]')].filter(fullyVisible).length,
      subtabs:[...panel.querySelectorAll('button.subtab')].map(e=>e.textContent),
      corners:[[1,1],[innerWidth-2,1],[1,innerHeight-2],[innerWidth-2,innerHeight-2]].map(([x,y])=>document.elementFromPoint(x,y)?.closest('.panel')!==null)};
    },{tab,subtab});
    await page.screenshot({path:`${out}/${tab}${subtab?'-'+subtab:''}-${width}.png`});
    assert(report.full,JSON.stringify(report));assert.equal(report.sheets,0,JSON.stringify(report));assert(report.corners.every(Boolean));assert(report.bannerHidden,'Main category banner should be hidden inside each menu');
    if(tab==='inventory'&&subtab==='equipment')assert(report.slots.length===5&&report.slots.every(s=>s.visible),JSON.stringify(report));
    if(tab==='skills'&&subtab==='abilities')assert(report.listCount>40);
    if(tab==='quests')assert(report.listCount>=30);
    results.push({width,height,...report});
   }
   // Reproduce the reported Gravecaller tree with a compact selector, then
   // follow its nodes by controller, including the scrolling short-screen graph.
   await page.evaluate(()=>{const g=menuReview.game;Object.assign(g.player,{classId:'gravecaller',className:'Gravecaller',classSkill:'spirit'});g.player.skillTree.lockedTree='spirit';g.uiState.skillsSubtab='trees';g.uiState.selectedSkillTreeId='spirit';g.uiState.selectedSkillTreeNodeId='spirit_root';g.uiSkillTreeControllerState=null;document.querySelector('[data-tab="skills"]').click();g.renderOwnedUI();});
   const treeFit=await page.evaluate(()=>{
    const {game,ui}=menuReview;
    const selector=document.querySelector('.skill-tree-path-list').getBoundingClientRect(),stage=document.querySelector('.skill-tree-stage').getBoundingClientRect(),workspace=document.querySelector('.skill-tree-workspace').getBoundingClientRect();
    const visible=[];
    for(let step=0;step<7;step++){
     ui.handleGameUiControllerInput(game,{connected:true,downPressed:true});
     const target=document.activeElement,r=target.getBoundingClientRect(),pane=target.closest('.skill-tree-node-index')?.getBoundingClientRect(),hit=document.elementFromPoint((r.left+r.right)/2,(r.top+r.bottom)/2);
     visible.push(!!pane&&r.left>=pane.left-1&&r.right<=pane.right+1&&r.top>=pane.top-1&&r.bottom<=pane.bottom+1&&(hit===target||target.contains(hit)));
    }
    return {tree:document.querySelector('.prerequisite-tree').dataset.branchingSkillTree,selector:selector.toJSON(),stage:stage.toJSON(),workspace:workspace.toJSON(),visible:visible.every(Boolean),scroll:document.querySelector('.skill-tree-node-index').scrollTop};
   });
   assert.equal(treeFit.tree,'spirit');assert(treeFit.selector.height<=90,JSON.stringify(treeFit));assert(treeFit.stage.height>100,JSON.stringify(treeFit));assert(treeFit.visible,JSON.stringify(treeFit));if(height<=600)assert(treeFit.scroll>0);
   await page.screenshot({path:`${out}/gravecaller-tree-${width}.png`});trees.push({width,height,...treeFit});
   // The original six-option chooser is a transparent vertical list, and
   // D-pad/A opens every section. Select returns to it and B closes it.
   await page.evaluate(()=>menuReview.ui.handleGameUiControllerInput(menuReview.game,{connected:true,backPressed:true}));
   const chooser=await page.evaluate(()=>{
    const panel=document.querySelector('.panel'),tabs=panel.querySelector('.tabs'),r=tabs.getBoundingClientRect();
    const options=[...tabs.querySelectorAll('[data-tab]')].map(e=>({id:e.dataset.tab,rect:e.getBoundingClientRect().toJSON()}));
    return {rect:r.toJSON(),transparent:getComputedStyle(panel).backgroundColor==='rgba(0, 0, 0, 0)',options};
   });
   assert(chooser.transparent);assert.equal(chooser.options.length,6);assert(chooser.rect.width<width/2&&chooser.rect.height<height);assert(chooser.rect.top>=0&&chooser.rect.bottom<=height);
   assert(chooser.options.every((e,i)=>i===0||e.rect.top>chooser.options[i-1].rect.bottom));
   await page.screenshot({path:`${out}/section-chooser-${width}.png`});choosers.push({width,height,...chooser});
   for(let index=0;index<6;index++){
    const expected=chooser.options[index].id;
    await page.evaluate(index=>{const {game,ui}=menuReview;for(let i=0;i<index;i++)ui.handleGameUiControllerInput(game,{connected:true,downPressed:true});ui.handleGameUiControllerInput(game,{connected:true,confirmPressed:true});},index);
    assert.equal(await page.evaluate(()=>menuReview.game.uiState.activeMainTab),expected);
    assert(await page.locator('.panel > .tabs').isHidden());
    await page.evaluate(()=>menuReview.ui.handleGameUiControllerInput(menuReview.game,{connected:true,backPressed:true}));
    assert(await page.locator('.panel').evaluate(e=>e.classList.contains('menu-chooser')));
   }
   await page.evaluate(()=>menuReview.ui.handleGameUiControllerInput(menuReview.game,{connected:true,cancelPressed:true}));assert(await page.locator('.panel').evaluate(e=>!e.classList.contains('open')));
   // Every learned skill is reachable without sheet changes, including long libraries.
   await page.evaluate(()=>{const {game}=menuReview;game.uiState.skillsSubtab='abilities';if(game.uiState.activeMainTab!=='skills')document.querySelector('[data-tab="skills"]').click();game.renderOwnedUI();});
   const navigation=await page.evaluate(()=>{
    const {game,ui}=menuReview,visible=[],failures=[],seen=new Set();let maxScroll=0;
    const buttons=[...document.querySelectorAll('[data-select-ability-id]')],n=buttons.length;
    const columns=getComputedStyle(document.querySelector('.ability-pool-list')).gridTemplateColumns.split(' ').length;
    game.uiState.selectedAbilityId=buttons[0].dataset.selectAbilityId;game.uiAbilityControllerState=null;ui.handleGameUiControllerInput(game,{connected:true});
    const path=[];
    for(let row=0;row<Math.ceil(n/columns);row++){
     const indexes=Array.from({length:columns},(_,col)=>row*columns+col).filter(i=>i<n);
     path.push(...(row%2?indexes.reverse():indexes));
    }
    let previous=0;
    for(const index of path){
     if(index!==previous){
      const direction=Math.floor(index/columns)!==Math.floor(previous/columns)?'downPressed':index>previous?'rightPressed':'leftPressed';
      ui.handleGameUiControllerInput(game,{connected:true,[direction]:true});
     }
     const e=document.activeElement,r=e.getBoundingClientRect(),pane=e.closest('.ability-pool-list')?.getBoundingClientRect();
     maxScroll=Math.max(maxScroll,document.querySelector('.ability-pool-list').scrollTop);
     if(e.dataset.selectAbilityId){seen.add(e.dataset.selectAbilityId);const fits=!!pane&&r.top>=pane.top-1&&r.bottom<=pane.bottom+1;visible.push(fits);if(!fits&&failures.length<3)failures.push({id:e.dataset.selectAbilityId,r:r.toJSON(),pane:pane?.toJSON()});}
     previous=index;
    }
    return {width:innerWidth,height:innerHeight,n,reached:seen.size,visible:visible.every(Boolean),failures,scroll:maxScroll};
   });
   assert.equal(navigation.reached,navigation.n);assert(navigation.visible,JSON.stringify(navigation));assert(navigation.scroll>0);
   // Single merged Bag filters preserve inventory selection and item details.
   await page.evaluate(()=>{const {game}=menuReview;game.uiState.inventorySubtab='bag';if(menuReview.game.uiState.activeMainTab!=='inventory')document.querySelector('[data-tab="inventory"]').click();game.renderOwnedUI();});
   for(const filter of ['resources','supplies','scrolls','tools','all']){
    await page.locator(`[data-bag-filter="${filter}"]`).click();
    assert.equal(await page.locator(`[data-bag-filter="${filter}"]`).getAttribute('aria-pressed'),'true');
   }
   const last=page.locator('#inventory .inventory-name-list [data-inventory-item-index]').last();await last.focus();
   assert(await last.evaluate(e=>{const r=e.getBoundingClientRect(),p=e.parentElement.getBoundingClientRect();return r.bottom<=p.bottom+1&&r.top>=p.top-1}));
   // Saved old tab/page states migrate to the combined views without hiding entries.
   await page.evaluate(()=>{const {game}=menuReview;game.uiState.inventorySubtab='loot';game.uiState.inventoryPageBySubtab={loot:999};game.renderOwnedUI();});
   assert.equal(await page.locator('#inventory').getAttribute('data-inventory-subtab'),'bag');
   await page.evaluate(()=>{const {game}=menuReview;game.uiState.skillsSubtab='gathering';if(game.uiState.activeMainTab!=='skills')document.querySelector('[data-tab="skills"]').click();game.renderOwnedUI();});
   assert.equal(await page.locator('#skills').getAttribute('data-skills-subtab'),'progression');
   // Co-op keeps input ownership while its menu occupies the same full screen.
   await page.evaluate(()=>{document.body.classList.add('couch-coop-active');const e=document.querySelector('.panel');e.dataset.ownerSlot='2';e.dataset.compactViewport='true';e.style.setProperty('--owner-viewport-left','50vw');e.style.setProperty('--owner-viewport-width','50vw');e.style.setProperty('--owner-viewport-height','50vh');if(menuReview.game.uiState.activeMainTab!=='inventory')document.querySelector('[data-tab="inventory"]').click();});
   assert(await page.locator('#inventory').evaluate(e=>{const r=e.getBoundingClientRect();return r.x===0&&r.y===0&&r.width===innerWidth&&r.height===innerHeight}));
   assert.equal(await page.locator('.panel').getAttribute('data-owner-slot'),'2');
   await page.evaluate(()=>{document.body.classList.remove('couch-coop-active');document.querySelector('.panel').classList.remove('open');});
   const overlayFit=async(selector,name)=>{
    await page.waitForTimeout(100);await page.screenshot({path:`${out}/${name}-${width}.png`});
    const fit=await page.locator(selector).evaluate(e=>{const r=e.getBoundingClientRect();return {full:r.x===0&&r.y===0&&r.width===innerWidth&&r.height===innerHeight,rect:r.toJSON()};});
    assert(fit.full,`${name}: ${JSON.stringify(fit)}`);overlays.push({width,height,name,...fit});
   };
   await page.evaluate(async()=>{const {game}=menuReview;(await import('/src/shopSystem.js')).openMarketShop(game);});
   await overlayFit('.market-shop-panel','market');
   const marketReach=await page.evaluate(async()=>{
    const shop=await import('/src/shopSystem.js'),all=[...document.querySelectorAll('[data-market-row]')];
    const last=all.at(-1);last.focus();const r=last.getBoundingClientRect(),b=last.parentElement.getBoundingClientRect();
    shop.handleMarketShopControllerInput({connected:true,upPressed:true});
    return {count:all.length,visible:r.top>=b.top-1&&r.bottom<=b.bottom+1};
   });assert(marketReach.count>20&&marketReach.visible);
   await page.locator('[data-market-close]').click();
   await page.evaluate(async()=>{const {game,players}=menuReview;game.player=players.createPlayer('New adventurer');game.player.hiddenClassUnlocks={eldritch:true};(await import('/src/characterCreator.js')).openCharacterCreator(game);});
   await overlayFit('.character-creator-panel','class-selection');
   // Six standard classes plus the explicitly unlocked hidden Eldritch class.
   assert.equal(await page.locator('[data-creator-class]').count(),7);
   await page.locator('[data-creator-proceed]').click();await overlayFit('.character-creator-panel','appearance');
   assert.equal(await page.locator('[data-creator-row]').count(),11);
   await page.evaluate(async()=>(await import('/src/characterCreator.js')).closeCharacterCreator());
   await page.evaluate(async()=>{(await import('/src/pauseMenu.js')).ensurePauseOverlay(menuReview.game);document.querySelector('#pauseOverlay').classList.add('active');});
   await overlayFit('.pause-panel','pause');await page.evaluate(()=>document.querySelector('#pauseOverlay').classList.remove('active'));
   await page.evaluate(()=>{document.querySelector('#app').classList.remove('active');document.querySelector('#mainMenu').classList.add('active');});
   await overlayFit('#mainMenu','main-menu');
   await page.evaluate(()=>document.querySelector('#developerModeSetup').classList.add('active'));
   await overlayFit('.developer-setup-card','developer-menu');
   await page.close();
  }
  assert.deepEqual(errors,[]);fs.writeFileSync(`${out}/verification.json`,JSON.stringify({pass:true,results,overlays,choosers,trees,errors},null,2));console.log(JSON.stringify({pass:true,views:results.length+overlays.length,coreViews:results.length,dialogViews:overlays.length,choosers:choosers.length,trees:trees.length,errors}));
 }finally{await browser.close();}
})().catch(e=>{console.error(e);process.exitCode=1;});



