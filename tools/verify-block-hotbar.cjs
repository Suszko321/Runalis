const {chromium}=require(process.env.RUNALIS_NODE_MODULES+'/playwright');
const assert=require('node:assert/strict'),fs=require('node:fs');
(async()=>{
 const browser=await chromium.launch({channel:'msedge',headless:true}),errors=[],viewports=[];
 fs.mkdirSync('docs/block-hotbar',{recursive:true});
 try{
  for(const [width,height] of [[1440,900],[1280,720],[800,600]]){
   const page=await browser.newPage({viewport:{width,height}});page.on('pageerror',e=>errors.push(e.message));
   await page.route('**/src/main.js*',r=>r.fulfill({contentType:'text/javascript',body:''}));await page.goto('http://127.0.0.1:8768/');
   await page.evaluate(async()=>{
    const ui=await import('/src/ui.js'),players=await import('/src/player.js'),loadout=await import('/src/abilityLoadoutSystem.js'),controller=await import('/src/inputController.js');
    const p=players.createPlayer('Block review');players.chooseClass(p,'thornbinder');
    const world={mode:'dungeon',name:'Block review',width:30,height:22,tiles:Array.from({length:22},()=>Array.from({length:30},()=>({passable:true,biome:'grass'}))),enemies:[],objects:[],effects:[],drops:[]};
    const game={player:p,world,camera:{x:0,y:0},logLines:[],log(){},save(){},keys:{},input:{},canvas:document.querySelector('#game')};
    document.querySelector('#mainMenu').classList.remove('active');document.querySelector('#app').classList.add('active');ui.initUI(game);
    game.uiState.skillsSubtab='abilities';game.uiState.selectedAbilityId='block';game.renderOwnedUI=()=>ui.renderUI(p,[],game);game.renderOwnedUI();
    const manager=controller.createControllerManager();manager.slots[0].connected=true;
    window.review={game,p,players,loadout,controller,manager,ui};
    review.press=button=>{const slot=manager.slots[0];slot.prevButtons=[];slot.buttons=[];if(button!==null)slot.buttons[button]=true;ui.handleGameUiControllerInput(game,controller.getControllerInput(manager));return {slots:[...p.loadout.abilitySlots],index:game.uiAbilityControllerState?.hotbarIndex,region:game.uiAbilityControllerState?.region};};
   });
   await page.locator('[data-tab="skills"]').evaluate(e=>e.click());
   assert.equal(await page.locator('[data-ability-hotbar-slot]').count(),5);
   assert.match(await page.locator('.ability-detail-pane').innerText(),/25% Defence XP/);
   assert.match(await page.locator('[data-ability-hotbar-slot="4"]').innerText(),/F\s*\/\s*LT[\s\S]*Block/);
   const press=button=>page.evaluate(button=>review.press(button),button);
   let r=await press(0);assert.equal(r.index,4);r=await press(2);assert.equal(r.slots[4],null);assert.equal(r.region,'hotbar');await press(1);
   await page.locator('[data-select-ability-id="thornbinderThornLash"]').evaluate(e=>e.click());r=await press(0);
   for(let i=0,n=(4-r.index+5)%5;i<n;i++)r=await press(15);
   assert.equal(r.index,4);r=await press(0);assert.equal(r.slots[4],'thornbinderThornLash');
   await page.locator('[data-select-ability-id="block"]').evaluate(e=>e.click());r=await press(0);
   for(let i=0,n=(4-r.index+5)%5;i<n;i++)r=await press(15);
   r=await press(0);assert.equal(r.slots[4],'block');
   await page.waitForTimeout(150);
   const fitting=await page.locator('[data-ability-hotbar-slot]').evaluateAll(elements=>elements.every(e=>{const r=e.getBoundingClientRect();return r.left>=0&&r.right<=innerWidth&&r.top>=0&&r.bottom<=innerHeight;}));
   assert(fitting,`All five assignment slots fit at ${width}x${height}`);
   const icon=page.locator('.ability-detail-pane img[src*="/block.svg"]');await icon.waitFor();assert(await icon.evaluate(e=>e.complete&&e.naturalWidth>0));
   await page.screenshot({path:`docs/block-hotbar/abilities-${width}.png`});
   await press(1);await page.evaluate(()=>review.game.renderOwnedUI());
   assert.equal(await page.locator('.combat-hud-slot').count(),6);
   assert.match(await page.locator('.combat-hud-slot[data-ability-id="block"] .combat-hud-key').innerText(),/F\s*\/\s*LT/);
   const hudFits=await page.locator('.combat-hud-slot').evaluateAll(es=>es.every(e=>{const r=e.getBoundingClientRect();return r.left>=0&&r.right<=innerWidth&&r.top>=0&&r.bottom<=innerHeight;}));assert(hudFits);
   const coop=await page.evaluate(async()=>{
    const {updateCouchCoop}=await import('/src/couchCoop.js'),{isBlocking}=await import('/src/combatActions.js');
    const {game,p,players,loadout,controller}=review,m=controller.createControllerManager();p.coop={enabled:true,players:[]};
    for(let i=1;i<4;i++){
     const a=players.createPlayer('Ally '+i);players.chooseClass(a,'gravecaller');Object.assign(a,{id:'ally'+i,slot:i+1,playerNumber:i+1,controllerSlotIndex:i,active:true,x:260+i*70,y:320,spirit:100,maxSpirit:100});
     p.coop.players.push(a);m.slots[i].connected=true;m.slots[i].axes=[0,0,1,0];
    }
    const sample=buttons=>m.slots.map((s,i)=>{s.prevButtons=s.buttons;s.buttons=Array(16).fill(false);if(buttons[i]!==undefined)s.buttons[buttons[i]]=true;return controller.getControllerInput(m,i);});
    let t=performance.now()/1000;updateCouchCoop(game,.05,t,sample([undefined,6,6,6]));const held=p.coop.players.map(isBlocking);
    updateCouchCoop(game,.05,t+.05,sample([]));const released=p.coop.players.map(isBlocking);
    const [a,b,c]=p.coop.players;loadout.unlockActiveAbility(a,'gravecallerMurmuringHost',{autoAssignEmpty:false});loadout.assignAbilityToSlot(a,4,'gravecallerMurmuringHost');
    loadout.clearAbilitySlot(b,4);loadout.assignAbilityToSlot(b,1,'block');
    updateCouchCoop(game,.05,t+.1,sample([undefined,6,3,6]));
    const mixed={channel:a.activeChannel?.slot,blocking:p.coop.players.map(isBlocking)};
    updateCouchCoop(game,.05,t+.15,sample([]));return {held,released,mixed,channelReleased:a.activeChannel===null};
   });
   assert.deepEqual(coop.held,[true,true,true]);assert.deepEqual(coop.released,[false,false,false]);assert.equal(coop.mixed.channel,4);assert.deepEqual(coop.mixed.blocking,[false,true,true]);assert(coop.channelReleased);
   viewports.push({width,height,assignmentSlots:5,hudSlots:6,slotsFit:true,coop});await page.close();
  }
  const page=await browser.newPage({viewport:{width:1280,height:800}});page.on('pageerror',e=>errors.push(e.message));
  await page.goto('http://127.0.0.1:8768/combat-overhaul-lab.html?skill=gravecallerMurmuringHost');await page.waitForFunction(()=>window.combatReview?.game.player);
  await page.evaluate(()=>{const g=combatReview.game;g.world.enemies=[];g.paused=false;});
  await page.keyboard.down('f');await page.waitForFunction(()=>combatReview.game.player.actionState?.blocking);await page.keyboard.up('f');await page.waitForFunction(()=>!combatReview.game.player.actionState?.blocking);
  await page.evaluate(()=>{const g=combatReview.game;g.dev.equip(g.player.loadout.abilitySlots.map((id,i)=>i===4?'gravecallerMurmuringHost':id));g.dev.refill();});
  await page.keyboard.down('f');await page.waitForFunction(()=>combatReview.game.player.activeChannel?.slot===4);assert.equal(await page.evaluate(()=>!!combatReview.game.player.actionState.blocking),false);
  await page.keyboard.up('f');await page.waitForFunction(()=>combatReview.game.player.activeChannel===null);await page.close();
  const mainPage=await browser.newPage({viewport:{width:1280,height:800}});mainPage.on('pageerror',e=>errors.push(e.message));
  // Run the actual main-game input handlers with a small isolated world, without booting a profile.
  const mainSource=fs.readFileSync('src/main.js','utf8').replace(/\bboot\(\);/,'window.blockMainPrototype=RunalisGame.prototype;');
  await mainPage.route('**/src/main.js*',r=>r.fulfill({contentType:'text/javascript',body:mainSource}));await mainPage.goto('http://127.0.0.1:8768/');
  await mainPage.waitForFunction(()=>window.blockMainPrototype);
  await mainPage.evaluate(async()=>{
   const players=await import('/src/player.js'),combat=await import('/src/combat.js'),loadout=await import('/src/abilityLoadoutSystem.js');
   const p=players.createPlayer('Main input review');players.chooseClass(p,'gravecaller');Object.assign(p,{x:260,y:320,spirit:100,maxSpirit:100});
   document.querySelector('#mainMenu').classList.remove('active');document.querySelector('#app').classList.add('active');
   const g=Object.assign(Object.create(blockMainPrototype),{player:p,canvas:document.querySelector('#game'),camera:{x:0,y:0},input:{},keys:new Set(),world:{mode:'dungeon',width:30,height:22,tiles:Array.from({length:22},()=>Array.from({length:30},()=>({passable:true,biome:'grass'}))),enemies:[],objects:[],effects:[],drops:[]},getPrimaryControllerInput(){return {connected:false};},log(){}});
   g.bind();window.mainBlockReview={g,combat,loadout};
  });
  await mainPage.keyboard.down('f');assert(await mainPage.evaluate(()=>mainBlockReview.g.input.ability4Pressed&&mainBlockReview.g.input.ability4Held&&!mainBlockReview.g.input.blockHeld));
  assert(await mainPage.evaluate(()=>{const {g,combat}=mainBlockReview;combat.updateAbilityInput(g.player,g.world,g.input,.05,20);combat.updateCombat(g.player,g.world,g.input,.05,20);return g.player.actionState.blocking;}));
  await mainPage.keyboard.up('f');assert(await mainPage.evaluate(()=>mainBlockReview.g.input.ability4Released&&!mainBlockReview.g.input.ability4Held));
  await mainPage.evaluate(()=>{const {g,loadout}=mainBlockReview;g.clearAbilityInputEdges();loadout.unlockActiveAbility(g.player,'gravecallerMurmuringHost',{autoAssignEmpty:false});loadout.assignAbilityToSlot(g.player,4,'gravecallerMurmuringHost');});
  await mainPage.keyboard.down('f');assert(await mainPage.evaluate(()=>{const {g,combat}=mainBlockReview;combat.updateAbilityInput(g.player,g.world,g.input,.05,20.1);combat.updateCombat(g.player,g.world,g.input,.05,20.1);return g.player.activeChannel?.slot===4&&!g.player.actionState.blocking;}));
  await mainPage.keyboard.up('f');assert(await mainPage.evaluate(()=>{const {g,combat}=mainBlockReview;g.input.ability4Pressed=false;combat.updateCombat(g.player,g.world,g.input,.05,20.2);return g.player.activeChannel===null;}));
  await mainPage.evaluate(()=>{const {g,loadout}=mainBlockReview;g.clearAbilityInputEdges();loadout.assignAbilityToSlot(g.player,4,'block');g.player.inputBindings={abilityKeys:['q','r','x','4','z']};});
  await mainPage.keyboard.down('f');assert(await mainPage.evaluate(()=>!mainBlockReview.g.input.ability4Held&&!mainBlockReview.g.input.blockHeld));await mainPage.keyboard.up('f');
  await mainPage.keyboard.down('z');assert(await mainPage.evaluate(()=>mainBlockReview.g.input.ability4Held));
  await mainPage.evaluate(()=>mainBlockReview.g.blur());assert(await mainPage.evaluate(()=>!mainBlockReview.g.input.ability4Held&&!mainBlockReview.g.player.actionState.blocking));await mainPage.keyboard.up('z');await mainPage.close();
  assert.deepEqual(errors,[]);const report={pass:true,viewports,keyboardF:{defaultBlock:true,replacementChannel:true,releases:true},mainInput:{defaultBlock:true,replacementChannel:true,releases:true,rebinds:true,blurClearsHold:true},errors};
  fs.writeFileSync('docs/block-hotbar/browser-verification.json',JSON.stringify(report,null,2)+'\n');console.log(JSON.stringify(report,null,2));
 }finally{await browser.close();}
})().catch(e=>{console.error(e);process.exitCode=1;});
