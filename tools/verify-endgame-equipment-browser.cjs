const {chromium}=require(process.env.RUNALIS_NODE_MODULES+'/playwright');
const fs=require('node:fs'),assert=require('node:assert/strict');
(async()=>{
 const browser=await chromium.launch({channel:'msedge',headless:true}),errors=[],base=process.env.RUNALIS_URL||'http://127.0.0.1:8766',out='docs/endgame-equipment';fs.mkdirSync(out,{recursive:true});
 try{
  const page=await browser.newPage({viewport:{width:1280,height:800}});page.on('pageerror',e=>errors.push(e.message));
  await page.route('**/src/main.js*',r=>r.fulfill({contentType:'text/javascript',body:fs.readFileSync('src/main.js','utf8')+'\nwindow.endgameReviewGame=()=>currentGame;'}));await require('./browser-game-smoke.cjs')(page,base);await page.waitForFunction(()=>endgameReviewGame()?.started);
  const result=await page.evaluate(async requested=>{
   const {ENDGAME_ENSEMBLES}=await import('/src/endgameEquipmentData.js'),{ITEMS}=await import('/src/data.js'),{createPlayer,addItem}=await import('/src/player.js'),{equipGearEntry}=await import('/src/equipmentProgressionSystem.js'),{asset,spriteArtStatus}=await import('/src/spriteArt.js'),{drawHumanActor}=await import('/src/humanRenderer.js'),{getEquipmentStatBonuses}=await import('/src/setBonusSystem.js');
   const sets=Object.values(ENDGAME_ENSEMBLES).filter(s=>!requested.length||requested.includes(s.id)),actors={};
   for(const s of sets){
    asset(s.sheet);asset(s.sheet+'-icons');const p=createPlayer(s.name);p.skillState.combat.level=100;p.combatLevel=100;p.inventory=[];p.equipment={weapon:s.role==='archer'?'cindervowBow':s.role==='mage'?'enemyWatcherStaff':'veyrRapier'};p.equippedGear={};
    for(const id of s.pieces){if(!addItem(p,id,1,{gearRarity:s.rarity,rarityRollVersion:1,itemLevel:100}))throw Error('Add failed '+id);if(!equipGearEntry(p,p.inventory.findIndex(e=>e.id===id)))throw Error('Equip failed '+id);if(p.equippedGear[ITEMS[id].slot].gearRarity!==s.rarity)throw Error('Grade changed');}
    if(!getEquipmentStatBonuses(p).bossDamage)throw Error('Set bonus missing');actors[s.id]=p;
   }
   for(const n of ['human-male','human-female','heads-custom','melee-arm-parts'])asset(n);
   for(let i=0;i<150&&spriteArtStatus().some(a=>!a.ready&&!a.failed);i++)await new Promise(r=>setTimeout(r,20));if(spriteArtStatus().some(a=>a.failed))throw Error(JSON.stringify(spriteArtStatus().filter(a=>a.failed)));
   function render(c,p,s,bodyType,dirX,dirY,x,y,scale=2,walkTime=null){
    Object.assign(p,{x,y,hp:100,maxHp:100,bodyType,hairStyle:bodyType==='female'?'ponytail':'short',skin:'#dcb48b',hair:'#242128',shirt:'#887052',pants:'#3d3a3c',boots:'#66421f',dirX,dirY,isMoving:walkTime!=null,walkTime:walkTime||0,actionState:{},combatState:{}});p.appearance||={};p.appearance.hairStyle=p.hairStyle;
    const before=JSON.stringify(p);drawHumanActor(c,p,{x:0,y:0},{scale,animationTime:5});if(before!==JSON.stringify(p))throw Error('Render mutated '+s.id);
   }
   const overview=document.createElement('canvas');overview.width=1320;overview.height=1300;const c=overview.getContext('2d');c.fillStyle='#21262b';c.fillRect(0,0,1320,1300);c.fillStyle='#e2d0aa';c.font='18px sans-serif';['LEGENDARY · LEVEL 50','MYTHICAL · LEVEL 65','PRIMORDIAL · LEVEL 80'].forEach((x,i)=>c.fillText(x,18+i*440,28));
   for(const s of sets){const ri=['mage','knight','archer','battlemage'].indexOf(s.role),ci=['legendary','mythic','primordial'].indexOf(s.rarity),left=ci*440,top=40+ri*300;c.font='17px sans-serif';c.fillStyle='#e2d0aa';c.fillText(s.name,left+16,top+24);c.font='12px sans-serif';c.fillText(s.role.toUpperCase(),left+16,top+44);for(const[n,[body,dx,dy]]of [['male',0,1],['male',0,-1],['female',1,0],['female',-1,0]].entries())render(c,actors[s.id],s,body,dx,dy,left+60+n*106,top+250,2.2);}
   const pages=[];
   for(const rarity of ['legendary','mythic','primordial']){
    const group=sets.filter(s=>s.rarity===rarity);if(!group.length)continue;const cv=document.createElement('canvas');cv.width=1180;cv.height=70+group.length*220;const cc=cv.getContext('2d');cc.fillStyle='#29302d';cc.fillRect(0,0,cv.width,cv.height);cc.font='14px sans-serif';cc.fillStyle='#e2d0aa';cc.fillText(rarity.toUpperCase()+' — male/female, front/east/back/west',16,28);
    for(const[n,s]of group.entries()){const top=55+n*220;cc.fillText(s.name,12,top+24);cc.font='12px sans-serif';cc.fillText('Combat level '+s.minCombatLevel+' · '+s.role,12,top+44);cc.font='14px sans-serif';const icon=asset(s.sheet+'-icons').image;cc.imageSmoothingEnabled=false;for(let k=0;k<4;k++)cc.drawImage(icon,k*32,0,32,32,12+k*44,top+65,40,40);
     for(const[bi,body]of ['male','female'].entries())for(const[di,[dx,dy]]of [[0,1],[1,0],[0,-1],[-1,0]].entries())render(cc,actors[s.id],s,body,dx,dy,245+(bi*4+di)*116,top+178,2);
    }pages.push({rarity,png:cv.toDataURL('image/png')});
   }
   const motion=document.createElement('canvas');motion.width=1180;motion.height=80+sets.length*300;const mc=motion.getContext('2d');mc.fillStyle='#29302d';mc.fillRect(0,0,motion.width,motion.height);mc.fillStyle='#e2d0aa';mc.font='13px sans-serif';mc.fillText('Existing east / west walk — all four held frames',12,26);
   for(const[si,s]of sets.entries())for(const[bi,body]of ['male','female'].entries()){
    const top=40+(si*2+bi)*150;mc.fillStyle='#e2d0aa';mc.fillText(s.name,12,top+55);mc.fillText(body,12,top+75);
    for(const[di,dx]of [1,-1].entries())for(let phase=0;phase<4;phase++)render(mc,actors[s.id],s,body,dx,0,245+(di*4+phase)*116,top+135,1.7,(phase+.1)/.5);
   }
   return{sets:sets.length,items:sets.length*4,overview:overview.toDataURL('image/png'),pages,motion:motion.toDataURL('image/png')};
  },(process.env.ENDGAME_REVIEW_SETS||'').split(',').filter(Boolean));
  fs.writeFileSync(out+'/collection.png',Buffer.from(result.overview.split(',')[1],'base64'));for(const p of result.pages)fs.writeFileSync(`${out}/${p.rarity}-outfits.png`,Buffer.from(p.png.split(',')[1],'base64'));fs.writeFileSync(out+'/gait-review.png',Buffer.from(result.motion.split(',')[1],'base64'));
  if(!process.env.ENDGAME_REVIEW_SETS)assert.equal(result.items,48);
  // Actual game owners receive full outfits through the same add/equip operations.
  for(const role of process.env.ENDGAME_REVIEW_SETS?[]:['mage','knight','archer','battlemage']){
   await page.evaluate(async role=>{const g=endgameReviewGame(),{ENDGAME_ENSEMBLES}=await import('/src/endgameEquipmentData.js'),{addItem}=await import('/src/player.js'),{equipGearEntry}=await import('/src/equipmentProgressionSystem.js');const s=Object.values(ENDGAME_ENSEMBLES).find(s=>s.role===role&&s.rarity==='primordial');g.player.skillState.combat.level=100;g.player.combatLevel=100;g.player.inventory=[];g.player.equipment={weapon:role==='archer'?'cindervowBow':role==='mage'?'enemyWatcherStaff':'veyrRapier'};g.player.equippedGear={};for(const id of s.pieces){if(!addItem(g.player,id,1,{gearRarity:s.rarity,rarityRollVersion:1,itemLevel:100}))throw Error('Game add failed');if(!equipGearEntry(g.player,g.player.inventory.findIndex(e=>e.id===id)))throw Error('Game equip failed');}g.player.isMoving=false;g.player.dirX=0;g.player.dirY=1;g.player.floatingTexts=[];g.paused=true;},role);
   if(!process.env.ENDGAME_REVIEW_SETS){await page.waitForTimeout(150);await page.locator('#game').screenshot({path:`${out}/in-game-${role}.png`});}
  }
  assert.deepEqual(errors,[]);console.log('PASS',JSON.stringify({sets:result.sets,items:result.items,equippedGrades:true,liveSetBonuses:true,bothBodies:true,facings:4,gaitFrames:4,noPageErrors:true}));
 }finally{await browser.close();}
})().catch(e=>{console.error(e);process.exitCode=1;});
