const {chromium}=require(process.env.RUNALIS_NODE_MODULES+'/playwright');
const fs=require('node:fs'),assert=require('node:assert/strict');
(async()=>{
 const browser=await chromium.launch({channel:'msedge',headless:true});
 try{
  const page=await browser.newPage({viewport:{width:1440,height:1000}}),errors=[];
  page.on('pageerror',e=>errors.push(e.message));
  await page.goto('http://127.0.0.1:8768/combat-overhaul-lab.html?skill=thornbinderThornLash&morph=fae');
  await page.waitForFunction(()=>window.combatReview?.game.player);await page.waitForTimeout(1000);
  await page.evaluate(()=>{const g=combatReview.game;g.world.enemies=[];g.player.spiritAwakened=true;g.player.spirit=g.player.maxSpirit;});
  await page.locator('#pause').click();await page.locator('#arena').click({position:{x:250,y:300}});
  const box=await page.locator('#arena').boundingBox();
  await page.mouse.move(box.x+box.width*.58,box.y+box.height*320/600);
  await page.keyboard.down('4');await page.waitForTimeout(700);
  const state=await page.evaluate(async()=>{const {getSubclassCombatState}=await import('/src/subclassCombat.js');const p=combatReview.game.player;return {channel:p.activeChannel?.subclassMode,shots:getSubclassCombatState(p)?.shots.map(s=>({x:s.x,y:s.y,speed:s.speed,aim:s.aim})),spirit:p.spirit};});
  assert.equal(state.channel,'projectileChannel');assert(state.shots.length>=1);assert(state.shots.every(s=>s.speed===620));
  fs.mkdirSync('docs/fae-thorn-channel',{recursive:true});await page.locator('#arena').screenshot({path:'docs/fae-thorn-channel/stream.png'});
  await page.keyboard.up('4');await page.waitForTimeout(100);
  assert.equal(await page.evaluate(()=>combatReview.game.player.activeChannel),null);
  const frames=await page.evaluate(async()=>{
   const {drawFaeButterfly}=await import('/src/subclassArt.js'),colors=['#d29ee4','#a5f1ef','#446b57'];
   const canvas=document.createElement('canvas');canvas.id='butterfly-frames';canvas.width=256;canvas.height=80;document.body.appendChild(canvas);
   const ctx=canvas.getContext('2d');ctx.fillStyle='#222b28';ctx.fillRect(0,0,256,80);const fingerprints=[];
   for(let i=0;i<4;i++){drawFaeButterfly(ctx,32+i*64,40,{x:1,y:0},[0,.08,.16,.23][i],colors,3);fingerprints.push([...ctx.getImageData(i*64,0,64,80).data].join(','));}
   return {distinct:new Set(fingerprints).size};
  });
  assert(frames.distinct>=3,'Butterfly visibly flaps through multiple pixel frames');
  await page.locator('#butterfly-frames').screenshot({path:'docs/fae-thorn-channel/butterfly-frames.png'});
  assert.deepEqual(errors,[]);fs.writeFileSync('docs/fae-thorn-channel/browser-verification.json',JSON.stringify({pass:true,state,errors},null,2));console.log(JSON.stringify({pass:true,shots:state.shots.length,errors}));
 }finally{await browser.close();}
})().catch(e=>{console.error(e);process.exitCode=1;});
