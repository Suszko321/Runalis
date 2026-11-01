const {chromium}=require(process.env.RUNALIS_NODE_MODULES+'/playwright');
const fs=require('node:fs'),{execFileSync}=require('node:child_process'),assert=require('node:assert/strict');
(async()=>{
 const browser=await chromium.launch({channel:'msedge',headless:true}),errors=[],out='docs/player-wearables-first-pass';fs.mkdirSync(out,{recursive:true});
 const base=process.env.RUNALIS_URL||'http://127.0.0.1:8766';
 const old=new Map(['humanRenderer.js','spriteArt.js','armorMotionArt.js','equipmentArt.js'].map(n=>[n,execFileSync('git',['show',`HEAD:src/${n}`],{encoding:'utf8'})]));
 try{
  let baseline;
  for(const before of [true,false]){
   const page=await browser.newPage({viewport:{width:660,height:1360},deviceScaleFactor:1});page.on('pageerror',e=>errors.push(e.message));
   if(before)await page.route('**/src/*.js*',route=>{const name=new URL(route.request().url()).pathname.split('/').pop();return old.has(name)?route.fulfill({contentType:'text/javascript',body:old.get(name)}):route.continue();});
   await page.route(base+'/wearable-review',route=>route.fulfill({contentType:'text/html',body:'<!doctype html><html><body></body></html>'}));
   await page.goto(base+'/wearable-review');
   const result=await page.evaluate(async({before,baseline})=>{
    const {drawHumanActor}=await import('/src/humanRenderer.js');const {asset,spriteArtStatus}=await import('/src/spriteArt.js');
    for(const name of ['player-wearables-first-pass','human-male','human-female','heads-custom','melee-arm-parts','armor-motion-leather','armor-motion-plate'])asset(name);
    for(let i=0;i<100&&spriteArtStatus().some(a=>!a.ready&&!a.failed);i++)await new Promise(r=>setTimeout(r,20));
    if(spriteArtStatus().some(a=>a.failed))throw Error('Asset failed');
    const canvas=document.createElement('canvas');canvas.width=660;canvas.height=1360;document.body.replaceChildren(canvas);document.body.style.cssText='margin:0;background:#29302d';const c=canvas.getContext('2d');c.fillStyle='#29302d';c.fillRect(0,0,660,1360);
    c.font='14px sans-serif';c.fillStyle='#decdb0';['Base / same weapon','Previous rendering','First-pass fitted gear'].forEach((label,i)=>c.fillText(label,12+i*220,26));
    if(baseline){const image=new Image();image.src=baseline;await image.decode();c.drawImage(image,220,36,220,1324,220,36,220,1324);}
    let row=0,cases=0;
    for(const bodyType of ['male','female'])for(const[dirX,dirY]of [[0,1],[1,0],[0,-1],[-1,0]]){
     for(const col of before?[1]:[0,2]){
      const equipped=col!==0,actor={x:110+col*220,y:155+row*160,hp:100,maxHp:100,bodyType,hairStyle:'short',skin:'#dcb48b',hair:'#242128',shirt:'#887052',pants:'#3d3a3c',boots:'#66421f',dirX,dirY,isMoving:false,equipment:{weapon:'veyrRapier',trinket:'orrakaiFoundersSignet',...(equipped?{helm:'graveboundHelm',chest:'patchedRoadLeathers',legs:'graveboundGreaves'}:{})},actionState:{},combatState:{}};
      const state=JSON.stringify(actor);drawHumanActor(c,actor,{x:0,y:0},{animationTime:5,scale:2});if(JSON.stringify(actor)!==state)throw Error('Actor mutated');cases++;
     }row++;
    }
    return {cases,png:canvas.toDataURL('image/png')};
   },{before,baseline});
   if(before)baseline=result.png;else fs.writeFileSync(out+'/before-after.png',Buffer.from(result.png.split(',')[1],'base64'));
   console.log('PASS',before?'Original reference renders':'Current production renders',result.cases);await page.close();
  }
  const gamePage=await browser.newPage({viewport:{width:1280,height:800}});gamePage.on('pageerror',e=>errors.push(e.message));
  await gamePage.route('**/src/main.js*',r=>r.fulfill({contentType:'text/javascript',body:fs.readFileSync('src/main.js','utf8')+'\nwindow.wearableReviewGame=()=>currentGame;'}));
  await require('./browser-game-smoke.cjs')(gamePage,base);await gamePage.waitForFunction(()=>wearableReviewGame()?.started);
  const equipped=await gamePage.evaluate(async()=>{
   const g=wearableReviewGame(),{addItem}=await import('/src/player.js'),{equipGearEntry}=await import('/src/equipmentProgressionSystem.js');
   for(const id of ['veyrRapier','graveboundHelm','patchedRoadLeathers','graveboundGreaves','orrakaiFoundersSignet']){
    if(!addItem(g.player,id,1,{gearRarity:'common',itemLevel:1}))throw Error('Could not add '+id);
    if(!equipGearEntry(g.player,g.player.inventory.findIndex(e=>e.id===id)))throw Error('Could not equip '+id);
   }
   g.player.isMoving=false;g.player.dirX=0;g.player.dirY=1;g.player.combatState.attackId=(g.player.combatState.attackId||0)+1;g.player.floatingTexts=[];g.paused=true;
   return {...g.player.equipment};
  });
  assert.equal(equipped.chest,'patchedRoadLeathers');assert.equal(equipped.helm,'graveboundHelm');assert.equal(equipped.legs,'graveboundGreaves');
  await gamePage.waitForFunction(async()=>{const{asset}=await import('/src/spriteArt.js');return asset('player-wearables-first-pass').ready;});
  await gamePage.waitForTimeout(150);await gamePage.locator('#game').screenshot({path:out+'/in-game.png'});
  console.log('PASS normal startup, actual inventory equip operations, selected five-item outfit, no page errors');
  assert.deepEqual(errors,[]);
 }finally{await browser.close();}
})().catch(e=>{console.error(e);process.exitCode=1;});
