const {chromium}=require(process.env.RUNALIS_NODE_MODULES+'/playwright');
const assert=require('node:assert/strict');
(async()=>{const browser=await chromium.launch({channel:'msedge',headless:true});try{
 const page=await browser.newPage(),errors=[],missing=[];page.on('pageerror',e=>errors.push(e.message));page.on('response',r=>{if(r.status()>=400&&!r.url().endsWith('/favicon.ico'))missing.push(r.url());});
 await page.goto((process.env.RUNALIS_URL||'http://127.0.0.1:8766')+'/art-lab.html');
 const result=await page.evaluate(async()=>{
  const {ITEMS}=await import('/src/data.js'),{createPlayer,addItem}=await import('/src/player.js'),{equipGearEntry}=await import('/src/equipmentProgressionSystem.js'),{drawHumanActor}=await import('/src/humanRenderer.js'),{asset,spriteArtStatus}=await import('/src/spriteArt.js'),{BOSS_ARMORY_ART}=await import('/src/bossArmoryArtData.js');
  const items=Object.values(ITEMS).filter(i=>i.weaponType==='spiritFocus'),actors={};
  for(const item of items){const p=createPlayer(item.id);p.skillState.combat.level=100;p.combatLevel=100;p.inventory=[];p.equipment={};p.equippedGear={};if(!addItem(p,item.id)||!equipGearEntry(p,0))throw Error('Equip failed '+item.id);actors[item.id]=p;if(BOSS_ARMORY_ART[item.id])asset(BOSS_ARMORY_ART[item.id].sheet);}
  for(const name of ['arcane-special','human-male','human-female','heads-custom','melee-arm-parts'])asset(name);
  for(let i=0;i<150&&spriteArtStatus().some(a=>!a.ready&&!a.failed);i++)await new Promise(r=>setTimeout(r,20));if(spriteArtStatus().some(a=>a.failed))throw Error('Missing art');
  const cv=document.createElement('canvas');cv.width=240;cv.height=240;const c=cv.getContext('2d');let samples=0;
  for(const item of items)for(const bodyType of ['male','female'])for(const [facing,dirX,dirY]of [['down',0,1],['right',1,0],['up',0,-1],['left',-1,0]])for(const state of ['idle','walk','run'])for(let key=0;key<(state==='idle'?1:4);key++){
   const p=actors[item.id];Object.assign(p,{x:120,y:160,hp:100,maxHp:100,bodyType,hairStyle:bodyType==='male'?'short':'ponytail',dirX,dirY,isMoving:state!=='idle',walkTime:(key+.1)/(state==='run'?.72:.5),actionState:{sprinting:state==='run'},combatState:{},visualAction:null});p.appearance||={};p.appearance.hairStyle=p.hairStyle;
   const im=asset(BOSS_ARMORY_ART[item.id]?.sheet||'arcane-special').image,draw=c.drawImage.bind(c),calls=[],before=JSON.stringify(p);c.clearRect(0,0,240,240);c.drawImage=(...args)=>{calls.push(args);draw(...args);};drawHumanActor(c,p,{x:0,y:0},{animationTime:5});c.drawImage=draw;if(JSON.stringify(p)!==before)throw Error('Actor changed');const positions=calls.map((args,index)=>({args,index})),weapons=positions.filter(r=>r.args[0]===im);if(weapons.length!==1)throw Error('Duplicate/missing focus '+item.id);
   const bodies=positions.filter(r=>r.args[0].width===256&&r.args[0].height===320&&r.args.length===9&&r.args[3]>10&&r.args[4]>10);if(!bodies.length)throw Error('Missing body');const rear=facing==='left'||facing==='up';if(rear?weapons[0].index>=bodies[0].index:weapons[0].index<=bodies.at(-1).index)throw Error('Wrong hip depth '+item.id+'/'+facing);samples++;
  }
  const {sampleWeaponStance,WEAPON_READY_SECONDS}=await import('/src/weaponStance.js'),{getEnemyTargetId}=await import('/src/coopEnemyScaling.js');let readinessCases=0;
  for(const item of items)for(const bodyType of ['male','female'])for(const [dirX,dirY]of [[0,1],[1,0],[0,-1],[-1,0]]){
   const p=actors[item.id],w={enemies:[]},time=1000+readinessCases*30;Object.assign(p,{bodyType,dirX,dirY,isMoving:true,walkTime:2.1,actionState:{},visualAction:null,combatState:{attackId:0}});
   const im=asset(BOSS_ARMORY_ART[item.id]?.sheet||'arcane-special').image;
   const drawAt=t=>{const stance=sampleWeaponStance(p,w,t),draw=c.drawImage.bind(c);let matrix,count=0;c.clearRect(0,0,240,240);c.drawImage=(...args)=>{if(args[0]===im){matrix=c.getTransform();count++;}draw(...args);};const before=JSON.stringify(p);drawHumanActor(c,p,{x:0,y:0},{animationTime:5,weaponSheathed:stance.sheathed});c.drawImage=draw;if(count!==1||JSON.stringify(p)!==before)throw Error('Readiness render contract');return{stowed:stance.sheathed,x:matrix.e,y:matrix.f};};
   const resting=drawAt(time);if(!resting.stowed)throw Error('Initial hip');p.combatState.attacking=true;p.combatState.attackId++;drawAt(time+1);p.combatState.attacking=false;
   const hand=drawAt(time+1.01);if(hand.stowed||(Math.abs(hand.x-resting.x)<.01&&Math.abs(hand.y-resting.y)<.01))throw Error('Focus returned to hip immediately');
   if(drawAt(time+1+WEAPON_READY_SECONDS-.001).stowed)throw Error('Early hip return');const expired=drawAt(time+1+WEAPON_READY_SECONDS+.001);if(!expired.stowed||Math.abs(expired.x-resting.x)>.01||Math.abs(expired.y-resting.y)>.01)throw Error('Wrong settled hip');
   w.enemies=[{hp:10,combatTargetKind:'player',combatTargetId:getEnemyTargetId(p)}];if(drawAt(time+10).stowed||drawAt(time+20).stowed)throw Error('Threat lost readiness');w.enemies[0].dead=true;if(drawAt(time+25.999).stowed||!drawAt(time+26.001).stowed)throw Error('Threat expiry');readinessCases++;
  }
  return{items:items.length,samples,readinessCases,bodies:2,facings:4,states:3,oneFocusPerFrame:true,depthOrder:true,actorUnchanged:true};
 });assert.equal(result.items,19);assert.equal(result.samples,1368);assert.deepEqual(errors,[]);assert.deepEqual(missing,[]);console.log('PASS',JSON.stringify({...result,noPageErrors:true,noMissingResources:true}));
}finally{await browser.close();}})().catch(e=>{console.error(e);process.exitCode=1;});
