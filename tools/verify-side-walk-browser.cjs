const {chromium}=require(process.env.RUNALIS_NODE_MODULES+'/playwright');
const assert=require('node:assert/strict');
const southArmor=process.argv.includes('--south-armor');
const sideArmor=process.argv.includes('--side-armor');

(async()=>{
  const browser=await chromium.launch({channel:'msedge',headless:true});
  try{
    // A fresh browser context keeps the user's profiles untouched.
    const page=await browser.newPage({viewport:{width:1100,height:800}});
    const errors=[];page.on('pageerror',e=>errors.push(e.message));
    await page.goto('http://127.0.0.1:8766/');
    await page.evaluate(async({southArmor,sideArmor})=>{
      const {createWorld}=await import('/src/world.js');
      const {createPlayer}=await import('/src/player.js');
      const {createSaveState,writeProfiles}=await import('/src/gameSave.js');
      const world=createWorld(),player=createPlayer('Walking review');
      Object.assign(player,{x:world.navStones[0].x,y:world.navStones[0].y,act1OpeningPending:false,hair:'#c6c9cb'});
      if(southArmor||sideArmor){
        const {ITEMS}=await import('/src/data.js');
        const {getGearVisualProfile}=await import('/src/gearVisualStyle.js');
        const {armorMotionFamily}=await import('/src/armorMotionArt.js');
        player.equipment.chest=Object.keys(ITEMS).find(id=>ITEMS[id].slot==='chest'&&armorMotionFamily(getGearVisualProfile(id,ITEMS[id]),'chest')===(sideArmor?'plate':'leather'));
        if(!player.equipment.chest)throw new Error('Missing chest fixture');
        if(sideArmor){
          player.equipment.weapon=Object.keys(ITEMS).find(id=>ITEMS[id].slot==='weapon'&&getGearVisualProfile(id,ITEMS[id]).weaponType==='sword');
          if(!player.equipment.weapon)throw new Error('Missing sword fixture');
        }
      }
      const state=createSaveState({world,player,camera:{x:player.x-550,y:player.y-350},profileId:'walk-review',profileName:'Walking review'});
      writeProfiles({'walk-review':{id:'walk-review',name:'Walking review',createdAt:Date.now(),updatedAt:Date.now(),state}});
    },{southArmor,sideArmor});
    await page.reload();await page.locator('[data-load="walk-review"]').click();
    await page.waitForFunction(()=>document.querySelector('#activeProfileLabel')?.textContent.includes('Walking review'));
    await page.waitForTimeout(1200);
    for(const [direction,key] of southArmor?[['south-leather','s']]:[['east','d'],['west','a']]){
      await page.keyboard.down(key);await page.waitForTimeout(450);
      await page.screenshot({path:`docs/visual-production/walk-game-${direction}${sideArmor?'-armor':''}.png`});
      await page.keyboard.up(key);
      if(southArmor){await page.waitForTimeout(150);await page.screenshot({path:'docs/visual-production/walk-game-south-leather-idle.png'});}
    }
    const assets=await page.evaluate(async()=>{const {spriteArtStatus}=await import('/src/spriteArt.js');return spriteArtStatus();});
    assert(!assets.some(a=>a.failed),'A game atlas failed to load');
    assert.deepEqual(errors,[],'Browser rendering errors');
    console.log(`PASS: real game loaded in an isolated profile; ${southArmor?'south-facing leather walking and idle':sideArmor?'east/west movement with plate chest and sword':'east/west movement'} rendered, atlases loaded, no browser errors.`);
  }finally{await browser.close();}
})().catch(error=>{console.error(error);process.exitCode=1;});
