const {chromium}=require(process.env.RUNALIS_NODE_MODULES+'/playwright');
const fs=require('node:fs'),{execFileSync}=require('node:child_process'),assert=require('node:assert/strict');
(async()=>{
 const browser=await chromium.launch({channel:'msedge',headless:true}),errors=[],out='docs/faction-wearables',base=process.env.RUNALIS_URL||'http://127.0.0.1:8766';fs.mkdirSync(out,{recursive:true});
 const old=new Map(['humanRenderer.js','spriteArt.js','armorMotionArt.js','equipmentArt.js','playerWearableArt.js','meleeArmArt.js','artIcons.js'].map(n=>[n,execFileSync('git',['show',`da009cf:src/${n}`],{encoding:'utf8'})]));
 try{
  let baseline;
  for(const before of [true,false]){
   const page=await browser.newPage({viewport:{width:1260,height:2760},deviceScaleFactor:1});page.on('pageerror',e=>errors.push(e.message));
   if(before)await page.route('**/src/*.js*',r=>{const n=new URL(r.request().url()).pathname.split('/').pop();return old.has(n)?r.fulfill({contentType:'text/javascript',body:old.get(n)}):r.continue();});
   await page.route(base+'/faction-review',r=>r.fulfill({contentType:'text/html',body:'<!doctype html><html><body></body></html>'}));await page.goto(base+'/faction-review');
   const result=await page.evaluate(async({before,baseline})=>{
    const{drawHumanActor}=await import('/src/humanRenderer.js'),{asset,spriteArtStatus}=await import('/src/spriteArt.js');
    for(const n of ['player-wearables-covenant','player-wearables-last-dawn','human-male','human-female','heads-custom','melee-arm-parts','armor-motion-leather','armor-motion-cloth','armor-motion-plate'])asset(n);
    for(let i=0;i<100&&spriteArtStatus().some(a=>!a.ready&&!a.failed);i++)await new Promise(r=>setTimeout(r,20));if(spriteArtStatus().some(a=>a.failed))throw Error('Failed asset');
    const canvas=document.createElement('canvas');canvas.width=1260;canvas.height=2760;document.body.replaceChildren(canvas);document.body.style.cssText='margin:0;background:#29302d';const c=canvas.getContext('2d');c.fillStyle='#29302d';c.fillRect(0,0,1260,2760);
    if(baseline){const im=new Image();im.src=baseline;await im.decode();c.drawImage(im,0,0);}
    c.font='14px sans-serif';c.fillStyle='#decdb0';let cases=0;
    for(const[fi,faction]of ['Covenant','LastDawn'].entries()){
     const top=fi*1380;c.fillText(faction==='Covenant'?'COVENANT OF LIGHT':'ORDER OF THE LAST DAWN',20,top+24);
     ['Base','Old plate','Fitted plate','Old ceremonial','Fitted ceremonial','Old scout','Fitted scout'].forEach((s,i)=>c.fillText(s,12+i*180,top+50));
     let row=0;
     for(const bodyType of ['male','female'])for(const[dirX,dirY]of [[0,1],[1,0],[0,-1],[-1,0]]){
      for(const col of before?[1,3,5]:[0,2,4,6]){
       const role=Math.floor((col-1)/2),chest=['Chest','Robe','ScoutChest'][role],kit=col===0?{}:{helm:`enemy${faction}${role===2?'ScoutHelm':'Helm'}`,chest:`enemy${faction}${chest}`,legs:`enemy${faction}Legs`};
       const actor={x:90+col*180,y:top+170+row*150,hp:100,maxHp:100,bodyType,hairStyle:'short',skin:'#dcb48b',hair:'#242128',shirt:'#887052',pants:'#3d3a3c',boots:'#66421f',dirX,dirY,isMoving:false,equipment:{weapon:'veyrRapier',...kit},actionState:{},combatState:{}};
       const state=JSON.stringify(actor);drawHumanActor(c,actor,{x:0,y:0},{animationTime:5,scale:2});if(state!==JSON.stringify(actor))throw Error('Actor mutation');cases++;
      }row++;
     }
    }
    return{cases,png:canvas.toDataURL('image/png')};
   },{before,baseline});
   if(before)baseline=result.png;else fs.writeFileSync(out+'/before-after.png',Buffer.from(result.png.split(',')[1],'base64'));console.log('PASS',before?'Previous faction renders':'Fitted faction renders',result.cases);await page.close();
  }
  const page=await browser.newPage({viewport:{width:1280,height:800}});page.on('pageerror',e=>errors.push(e.message));
  await page.route('**/src/main.js*',r=>r.fulfill({contentType:'text/javascript',body:fs.readFileSync('src/main.js','utf8')+'\nwindow.wearableReviewGame=()=>currentGame;'}));
  await require('./browser-game-smoke.cjs')(page,base);await page.waitForFunction(()=>wearableReviewGame()?.started);
  for(const faction of ['Covenant','LastDawn']){
   const result=await page.evaluate(async faction=>{
    const g=wearableReviewGame(),{addItem}=await import('/src/player.js'),{equipGearEntry}=await import('/src/equipmentProgressionSystem.js'),{itemIconMarkup}=await import('/src/gearVisualStyle.js'),{ITEMS}=await import('/src/data.js');
    for(const part of ['ScoutHelm','ScoutChest','Robe','Legs','Helm','Chest']){
     const id=`enemy${faction}${part}`;if(!addItem(g.player,id,1,{gearRarity:'common',itemLevel:1}))throw Error('Add failed '+id);if(!equipGearEntry(g.player,g.player.inventory.findIndex(e=>e.id===id)))throw Error('Equip failed '+id);if(!itemIconMarkup(ITEMS[id]).includes('-icons.png'))throw Error('Missing authored icon');
    }
    g.player.isMoving=false;g.player.dirX=0;g.player.dirY=1;g.player.floatingTexts=[];g.paused=true;return {...g.player.equipment};
   },faction);
   assert.equal(result.chest,`enemy${faction}Chest`);assert.equal(result.helm,`enemy${faction}Helm`);assert.equal(result.legs,`enemy${faction}Legs`);
   await page.waitForFunction(async faction=>{const{asset}=await import('/src/spriteArt.js');return asset(`player-wearables-${faction==='Covenant'?'covenant':'last-dawn'}`).ready;},faction);await page.waitForTimeout(150);await page.locator('#game').screenshot({path:`${out}/${faction}-in-game.png`});
  }
  assert.deepEqual(errors,[]);console.log('PASS real startup, all 12 inventory/equip operations, authored icons, no page errors');
 }finally{await browser.close();}
})().catch(e=>{console.error(e);process.exitCode=1;});
