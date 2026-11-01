const {chromium}=require(process.env.RUNALIS_NODE_MODULES+'/playwright');
const fs=require('node:fs'),assert=require('node:assert/strict');
(async()=>{
 const browser=await chromium.launch({channel:'msedge',headless:true}),errors=[],out='docs/wearable-catalogue',base=process.env.RUNALIS_URL||'http://127.0.0.1:8766';fs.mkdirSync(out,{recursive:true});
 try{
  const page=await browser.newPage({viewport:{width:1280,height:800}});page.on('pageerror',e=>errors.push(e.message));
  await page.route('**/src/main.js*',r=>r.fulfill({contentType:'text/javascript',body:fs.readFileSync('src/main.js','utf8')+'\nwindow.wearableReviewGame=()=>currentGame;'}));
  await require('./browser-game-smoke.cjs')(page,base);await page.waitForFunction(()=>wearableReviewGame()?.started);
  const result=await page.evaluate(async()=>{
   const {ITEMS}=await import('/src/data.js'),{createPlayer,addItem}=await import('/src/player.js'),{equipGearEntry}=await import('/src/equipmentProgressionSystem.js'),{asset,spriteArtStatus}=await import('/src/spriteArt.js'),{fittedWearable}=await import('/src/playerWearableArt.js'),{drawHumanActor}=await import('/src/humanRenderer.js'),{itemIconMarkup}=await import('/src/gearVisualStyle.js');
   const items=Object.values(ITEMS).filter(i=>!i.endgameExclusive&&['helm','chest','legs','trinket'].includes(i.slot)),actors=[];
   for(const item of items){
    const actor=createPlayer('Wearable review');actor.equipment={weapon:'veyrRapier'};actor.equippedGear={};
    if(!addItem(actor,item.id,1,{gearRarity:'common',itemLevel:1}))throw Error('Add failed '+item.id);
    if(!equipGearEntry(actor,actor.inventory.findIndex(e=>e.id===item.id)))throw Error('Equip failed '+item.id);
    if(actor.equipment[item.slot]!==item.id)throw Error('Wrong equipped ID');const fit=fittedWearable(item.id);if(!fit)throw Error('Missing fit '+item.id);
    asset(fit.sheet);asset(fit.sheet+'-icons');actors.push(actor);
   }
   for(const n of ['human-male','human-female','heads-custom','melee-arm-parts','human-male-attack','human-female-attack'])asset(n);
   for(let i=0;i<150&&spriteArtStatus().some(a=>!a.ready&&!a.failed);i++)await new Promise(r=>setTimeout(r,20));if(spriteArtStatus().some(a=>a.failed))throw Error('Failed catalogue asset '+JSON.stringify(spriteArtStatus().filter(a=>a.failed)));
   const pages=[];
   for(let offset=0;offset<items.length;offset+=12){
    const group=items.slice(offset,offset+12),cv=document.createElement('canvas');cv.width=1080;cv.height=60+group.length*160;const c=cv.getContext('2d');c.fillStyle='#29302d';c.fillRect(0,0,cv.width,cv.height);c.font='13px sans-serif';c.fillStyle='#e1d1b1';c.fillText('Item / matching icon',12,24);['M front','M east','M back','M west','F front','F east','F back','F west'].forEach((s,i)=>c.fillText(s,230+i*105,24));
    for(const [n,item]of group.entries()){
     const rowTop=40+n*160;c.fillStyle='#e1d1b1';c.fillText(item.name.slice(0,29),12,rowTop+32);c.font='11px sans-serif';c.fillText(item.id,12,rowTop+48);c.font='13px sans-serif';
     const icon=document.createElement('div');icon.innerHTML=itemIconMarkup(item);const child=icon.firstChild,bg=child.style.backgroundImage.match(/url\(["']?(.+?)["']?\)/)[1];const im=new Image();im.src=bg;await im.decode();const fit=fittedWearable(item.id);c.imageSmoothingEnabled=false;c.drawImage(im,fit.row*32,0,32,32,20,rowTop+62,64,64);
     for(const[bi,bodyType]of ['male','female'].entries())for(const[di,[dirX,dirY]]of [[0,1],[1,0],[0,-1],[-1,0]].entries()){
      const actor=actors[offset+n];Object.assign(actor,{x:266+(bi*4+di)*105,y:rowTop+137,hp:100,maxHp:100,bodyType,hairStyle:bi?'ponytail':'short',skin:'#dcb48b',hair:'#242128',shirt:'#887052',pants:'#3d3a3c',boots:'#66421f',dirX,dirY,isMoving:false,actionState:{},combatState:{}});
      const before=JSON.stringify(actor);drawHumanActor(c,actor,{x:0,y:0},{scale:1.7,animationTime:5});if(before!==JSON.stringify(actor))throw Error('Render mutation');
     }
    }
    pages.push(cv.toDataURL('image/png'));
   }
   const motion=document.createElement('canvas');motion.width=1060;motion.height=1860;const mc=motion.getContext('2d');mc.fillStyle='#29302d';mc.fillRect(0,0,motion.width,motion.height);mc.font='13px sans-serif';mc.fillStyle='#e1d1b1';mc.fillText('Existing east/west gait — four held-frame samples, both bodies',12,24);
   const kits=[
    {helm:'clothHood',chest:'patchedTunic',legs:'roughLegwraps'},
    {helm:'knightHelm',chest:'knightChest',legs:'ironGreaves'},
    {helm:'necromancerHood',chest:'necromancerRobe',legs:'graveclothGreaves'},
    {helm:'blackbriarCrown',chest:'thornbinderGarb',legs:'briarCovenantGreaves'},
    {helm:'enemyVeyrHelm',chest:'veyrSilkMantle',legs:'watcherGreaves'},
    {helm:'drownedConvergenceHelm',chest:'drownedConvergenceChest',legs:'beastSovereignLegs'}
   ];
   for(const[ki,kit]of kits.entries())for(const[bi,bodyType]of ['male','female'].entries()){
    const row=ki*2+bi,top=40+row*150;mc.fillStyle='#e1d1b1';mc.fillText(kit.chest,12,top+60);mc.fillText(bodyType,12,top+80);
    for(const[di,dirX]of [1,-1].entries())for(let phase=0;phase<4;phase++){
     const a={x:240+(di*4+phase)*105,y:top+135,hp:100,maxHp:100,bodyType,hairStyle:bi?'ponytail':'short',skin:'#dcb48b',hair:'#242128',shirt:'#887052',pants:'#3d3a3c',boots:'#66421f',dirX,dirY:0,isMoving:true,walkTime:(phase+.1)/.5,equipment:{weapon:'veyrRapier',...kit},actionState:{},combatState:{}};drawHumanActor(mc,a,{x:0,y:0},{scale:1.7,animationTime:5});
    }
   }
   window.catalogueReview={items,actors,drawHumanActor};return{items:items.length,body:items.filter(i=>i.slot!=='trinket').length,accessories:items.filter(i=>i.slot==='trinket').length,pages,motion:motion.toDataURL('image/png')};
  });
  assert.equal(result.items,120);for(const[n,png]of result.pages.entries())fs.writeFileSync(`${out}/catalogue-${n+1}.png`,Buffer.from(png.split(',')[1],'base64'));
  fs.writeFileSync(`${out}/gait-review.png`,Buffer.from(result.motion.split(',')[1],'base64'));
  // Install actual equipped review actors into the normal game for final mixed-outfit captures.
  for(const[ni,kit]of [
   ['field',{helm:'knightHelm',chest:'knightChest',legs:'ironGreaves',trinket:'dawnwardAegis'}],
   ['grave',{helm:'necromancerHood',chest:'necromancerRobe',legs:'graveclothGreaves',trinket:'enemyGraveCultTrinket'}],
   ['court',{helm:'enemyVeyrHelm',chest:'veyrSilkMantle',legs:'watcherGreaves',trinket:'enemyVeyrTrinket'}],
   ['mythical',{helm:'drownedConvergenceHelm',chest:'drownedConvergenceChest',legs:'beastSovereignLegs',trinket:'drownedConvergenceTrinket'}]
  ]){
   await page.evaluate(async kit=>{
    const g=wearableReviewGame(),{addItem}=await import('/src/player.js'),{equipGearEntry}=await import('/src/equipmentProgressionSystem.js');
    // Fixtures reuse the live owner, while keeping independent bag copies out of persistence.
    g.player.inventory=[];g.player.equipment={weapon:'veyrRapier'};g.player.equippedGear={};
    for(const id of Object.values(kit)){if(!addItem(g.player,id,1,{gearRarity:'common',itemLevel:1}))throw Error('Add kit failed');if(!equipGearEntry(g.player,g.player.inventory.findIndex(e=>e.id===id)))throw Error('Equip kit failed');}
    g.player.isMoving=false;g.player.dirX=0;g.player.dirY=1;g.player.floatingTexts=[];g.paused=true;
   },kit);await page.waitForTimeout(120);await page.locator('#game').screenshot({path:`${out}/in-game-${ni}.png`});
  }
  assert.deepEqual(errors,[]);console.log('PASS',JSON.stringify({items:result.items,inventoryEquipOperations:120,productionRenders:result.items*8,iconsDecoded:120,reviewPages:result.pages.length,mixedOutfits:4,noPageErrors:true}));
 }finally{await browser.close();}
})().catch(e=>{console.error(e);process.exitCode=1;});
