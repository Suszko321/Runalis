const {chromium}=require(process.env.RUNALIS_NODE_MODULES+'/playwright');
const fs=require('node:fs'),assert=require('node:assert/strict');
(async()=>{
 const browser=await chromium.launch({channel:'msedge',headless:true}),errors=[];
 try{
  const page=await browser.newPage({viewport:{width:980,height:1450}});page.on('pageerror',e=>errors.push(e.message));
  await page.route('**/src/main.js*',r=>r.fulfill({contentType:'text/javascript',body:''}));await page.goto('http://127.0.0.1:8768/');
  await page.evaluate(async()=>{
   const {ITEMS}=await import('/src/data.js'),{createPlayer}=await import('/src/player.js'),moves=await import('/src/combatMoves.js'),{MELEE_LIGHT_COMBOS}=await import('/src/meleeLightCombos.js');
   const {drawHumanActor}=await import('/src/humanRenderer.js'),{drawAttackVisual}=await import('/src/combatVisualsRenderer.js'),{updateCombat}=await import('/src/combat.js'),art=await import('/src/spriteArt.js');
   const styles=Object.keys(MELEE_LIGHT_COMBOS),world=()=>({mode:'dungeon',width:40,height:40,tiles:Array.from({length:40},()=>Array.from({length:40},()=>({passable:true,biome:'grass'}))),objects:[],enemies:[],effects:[],drops:[]});
   const actors=styles.map((type,index)=>{
    let id=type==='unarmed'?null:Object.keys(ITEMS).find(id=>ITEMS[id].slot==='weapon'&&ITEMS[id].weaponType===type);
    if(type!=='unarmed'&&!id){id='review-light-'+type;ITEMS[id]={id,name:type,slot:'weapon',weaponType:type,baseDamage:8,rarity:'common'};}
    const p=createPlayer(type);Object.assign(p,{x:140+index%3*300,y:150+Math.floor(index/3)*210,dirX:1,dirY:0,stamina:10000,maxStamina:10000,isMoving:false});p.equipment.weapon=id;p.equipment.chest='leatherVest';p.equipment.legs=null;
    const w=world(),aim={combatAimX:1,combatAimY:0,hasAim:true},samples=[];let time=performance.now()/1000;
    for(let step=0;step<3;step++){moves.requestBasicAttack(p,w,aim,()=>{},time);samples.push({...p.combatState.attackMove});while(p.combatState.attacking){time+=.01;moves.updateWeaponCombat(p,w,aim,.01,time,()=>{});}}
    p.combatState=null;return {p,w,type,aim,samples,count:0,ids:[],lastId:0,pauses:[],ended:0};
   });
   const canvas=document.createElement('canvas');canvas.id='melee-review';canvas.width=900;canvas.height=1360;document.body.replaceChildren(canvas);document.body.style='margin:0;background:#25352c';const ctx=canvas.getContext('2d');
   window.lightComboReview={actors,canvas,ctx,moves,updateCombat,drawHumanActor,drawAttackVisual,art,time:performance.now()/1000};
   lightComboReview.sheet=facing=>{
    canvas.width=900;canvas.height=1360;ctx.imageSmoothingEnabled=false;ctx.fillStyle='#25352c';ctx.fillRect(0,0,900,1360);
    ctx.fillStyle='#efe2c7';ctx.font='18px Georgia';ctx.fillText('Melee light combos · '+facing,20,25);ctx.font='13px Georgia';['Opener','Follow-up','Finisher'].forEach((label,i)=>ctx.fillText(label,215+i*240,50));
    const [dx,dy]={right:[1,0],left:[-1,0],down:[0,1],up:[0,-1]}[facing];
    actors.forEach((r,row)=>r.samples.forEach((move,col)=>{
     const p=r.p;p.x=240+col*240;p.y=150+row*145;p.dirX=dx;p.dirY=dy;
     Object.assign(moves.ensureCombatState(p),{attacking:true,attackMove:move,attackElapsed:move.activeStart+(move.activeEnd-move.activeStart)*.75,attackDirX:dx,attackDirY:dy});
     drawHumanActor(ctx,p,{x:0,y:0},{isPlayer:true,scale:1.8});drawAttackVisual(ctx,p,{x:0,y:0});ctx.fillStyle='#efe2c7';ctx.font='13px Georgia';ctx.fillText(move.name,p.x-65,p.y+25);
     if(col===0){ctx.fillStyle='#a9c8b1';ctx.font='15px Georgia';ctx.fillText(r.type.toUpperCase(),16,p.y-27);ctx.font='12px Georgia';ctx.fillText(move.comboRestartDelay.toFixed(2)+'s restart pause',16,p.y-8);}
    }));
   };
   lightComboReview.draw=()=>{
    ctx.imageSmoothingEnabled=false;ctx.fillStyle='#25352c';ctx.fillRect(0,0,900,650);ctx.fillStyle='#efe2c7';ctx.font='18px Georgia';ctx.fillText('Rapid light taps · three strikes, then recovery',18,27);
    actors.forEach(r=>{drawHumanActor(ctx,r.p,{x:0,y:0},{isPlayer:true,scale:1.8});drawAttackVisual(ctx,r.p,{x:0,y:0});ctx.fillStyle='#efe2c7';ctx.font='15px Georgia';ctx.fillText(r.type.toUpperCase(),r.p.x-55,r.p.y-100);ctx.font='12px Georgia';ctx.fillText(r.p.combatState.attacking?'Hit '+r.p.combatState.attackMove.lightComboStep:'Recovery',r.p.x-55,r.p.y+25);});
   };
   lightComboReview.sheet('right');
  });
  await page.waitForTimeout(750);await page.evaluate(()=>lightComboReview.sheet('right'));
  fs.mkdirSync('docs/melee-light-combos',{recursive:true});await page.locator('#melee-review').screenshot({path:'docs/melee-light-combos/right-facing.png'});
  await page.evaluate(()=>lightComboReview.sheet('left'));await page.locator('#melee-review').screenshot({path:'docs/melee-light-combos/left-facing.png'});
  await page.evaluate(()=>lightComboReview.sheet('down'));await page.locator('#melee-review').screenshot({path:'docs/melee-light-combos/south-facing.png'});
  await page.setViewportSize({width:960,height:700});
  const report=await page.evaluate(async()=>{
   const r=lightComboReview;r.canvas.width=900;r.canvas.height=650;
   for(const [index,a] of r.actors.entries()){a.p.x=140+index%3*300;a.p.y=160+Math.floor(index/3)*210;a.p.dirX=1;a.p.dirY=0;a.p.combatState=null;}
   const mime=MediaRecorder.isTypeSupported('video/webm;codecs=vp9')?'video/webm;codecs=vp9':'video/webm';const chunks=[],recorder=new MediaRecorder(r.canvas.captureStream(30),{mimeType:mime});recorder.ondataavailable=e=>chunks.push(e.data);
   const recording=new Promise(resolve=>recorder.onstop=resolve);recorder.start();
   await new Promise(resolve=>{let frame=0;const timer=setInterval(()=>{
    r.time+=1/60;
    for(const a of r.actors){const input={...a.aim,attackPressed:frame%4===0,attackHeld:false};r.updateCombat(a.p,a.w,input,1/60,r.time,()=>{});const s=a.p.combatState;
     if(s.attackId!==a.lastId){a.count++;a.lastId=s.attackId;a.ids.push(s.attackMove.lightComboStep);if(a.ended){a.pauses.push(r.time-a.ended);a.ended=0;}}
     if(a.wasAttacking&&!s.attacking&&a.previousStep===3)a.ended=r.time;
     if(s.attacking&&s.attackMove.lightComboStep!==1)a.ended=0;
     a.wasAttacking=s.attacking;a.previousStep=s.attackMove?.lightComboStep;
    }
    r.draw();if(++frame>=300){clearInterval(timer);recorder.stop();resolve();}
   },1000/60);});await recording;
   const bytes=Array.from(new Uint8Array(await new Blob(chunks,{type:mime}).arrayBuffer()));
   return {styles:r.actors.map(a=>({type:a.type,count:a.count,steps:a.ids,pauses:a.pauses})),failedAssets:r.art.spriteArtStatus().filter(a=>a.failed).map(a=>a.key),bytes};
  });
  for(const style of report.styles){assert.ok(style.count>=6&&style.count<20,style.type);style.steps.forEach((step,i)=>assert.equal(step,i%3+1,style.type));assert.ok(style.pauses.length>=1,style.type+' recovery was not recorded');}
  assert.deepEqual(report.failedAssets,[]);assert.deepEqual(errors,[]);fs.writeFileSync('docs/melee-light-combos/rapid-taps.webm',Buffer.from(report.bytes));delete report.bytes;
  fs.writeFileSync('docs/melee-light-combos/browser-verification.json',JSON.stringify({pass:true,...report,errors},null,2));console.log(JSON.stringify({pass:true,...report,errors}));
 }finally{await browser.close();}
})().catch(e=>{console.error(e);process.exitCode=1;});
