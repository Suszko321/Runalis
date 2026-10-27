// Launch a normal isolated player profile; smoke tests must not depend on an
// authoring shortcut in the player's main menu.
module.exports=async function launchBrowserGame(page,base='http://127.0.0.1:8768',worldMode='capital'){
 await page.goto(base+'/');
 await page.evaluate(async worldMode=>{
  const {createPlayer,chooseClass}=await import('/src/player.js'),{writeProfiles,createSaveState}=await import('/src/gameSave.js'),{createCapitalHubWorld}=await import('/src/hubSystem.js'),{createCaravanOpeningWorld}=await import('/src/act1OpeningSystem.js');
  const p=createPlayer('Player smoke review');chooseClass(p,'oathkeeper');p.act1OpeningPending=worldMode==='act1Opening';p.capitalUnlocked=true;
  if(worldMode!=='act1Opening')p.story.flags.opening={introPlayed:true,maraConversationComplete:true};
  const world=worldMode==='act1Opening'?createCaravanOpeningWorld():createCapitalHubWorld();Object.assign(p,world.spawn);
  writeProfiles({playerSmoke:{id:'playerSmoke',name:p.name,updated:1,state:createSaveState({player:p,world})}});
 },worldMode);
 await page.reload();await page.locator('[data-load="playerSmoke"]').click();await page.waitForFunction(()=>document.querySelector('#app')?.classList.contains('active'),null,{timeout:60000});
};
