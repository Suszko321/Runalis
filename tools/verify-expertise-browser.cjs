const {chromium}=require(process.env.RUNALIS_NODE_MODULES+'/playwright');
const assert=require('node:assert/strict'),fs=require('node:fs');
(async()=>{
 const browser=await chromium.launch({channel:'msedge',headless:true}),errors=[],checks=[];
 fs.mkdirSync('docs/expertise',{recursive:true});
 try{
 const page=await browser.newPage({viewport:{width:1920,height:1080}});
 page.on('pageerror',e=>errors.push(e.message));page.on('response',r=>{if(r.status()>=400)errors.push(`${r.status()} ${r.url()}`);});
 await page.route('**/src/main.js*',r=>r.fulfill({contentType:'text/javascript',body:''}));
 await page.goto('http://127.0.0.1:8768/');
 await page.evaluate(async()=>{
  const ui=await import('/src/ui.js'),players=await import('/src/player.js'),tree=await import('/src/skillTreeSystem.js'),expertise=await import('/src/skillExpertiseSystem.js'),data=await import('/src/subclassData.js');
  const {createWorld}=await import('/src/world.js');
  const game={player:players.createPlayer('Expertise review'),world:createWorld(),camera:{x:0,y:0},logLines:[],log(t){this.logLines.push(t)},save(){},keys:{},input:{},canvas:document.querySelector('#game')};
  document.querySelector('#mainMenu').classList.remove('active');document.querySelector('#app').classList.add('active');
  ui.initUI(game);game.renderOwnedUI=()=>ui.renderUI(game.player,game.logLines,game);
  window.review={ui,players,tree,expertise,data,game};game.renderOwnedUI();
 });
 await page.locator('[data-tab="skills"]').evaluate(e=>e.click());await page.locator('button[data-skills-subtab="trees"]').click();
 for(const size of [[1920,1080],[1366,768],[1280,720]]){
  await page.setViewportSize({width:size[0],height:size[1]});
  for(const cls of ['gravecaller','thornbinder','waverider','oathkeeper','lightbringer','fellhunter']){
   await page.evaluate(cls=>{
    const r=review,p=r.players.createPlayer('Expertise review');r.players.chooseClass(p,cls);p.gold=50;p.skillTree.bloodlineBonusPoints=1000;p.skillTree.respecVersion=1;
    const route=id=>{const n=r.tree.SKILL_TREE_NODES[id];if(p.skillTree.spent[id])return;for(const parent of n.requirementMode==='any'?(n.requires||[]).slice(0,1):n.requires||[])route(parent);if(!r.tree.spendSkillTreeNode(p,id).ok)throw Error(id);};
    const choice=r.expertise.expertiseNodeId(cls,r.data.CLASS_SUBCLASSES[cls][0]);route(r.tree.SKILL_TREE_NODES[choice].requires[0]);
    r.game.player=p;r.game.uiState.selectedSkillTreeId=r.data.SUBCLASS_CLASS_TREES[cls];r.game.uiState.selectedSkillTreeNodeId=choice;r.game.renderOwnedUI();
   },cls);
   await page.waitForTimeout(50);
   const geometry=await page.evaluate(()=>{
    const buttons=[...document.querySelectorAll('.node-type-expertise')],panel=document.querySelector('.skill-node-detail-scroll'),graph=document.querySelector('.prerequisite-tree').getBoundingClientRect();
    return {cls:review.game.player.classId,nodes:buttons.length,clipped:buttons.filter(b=>{const r=b.getBoundingClientRect();return r.bottom>graph.bottom+1||r.left<graph.left-1||r.right>graph.right+1}).length,detailScroll:panel.scrollHeight>panel.clientHeight+1,detailText:panel.innerText,images:buttons.every(b=>b.querySelector('img')?.naturalWidth>0)};
   });
   assert.equal(geometry.nodes,3);assert.equal(geometry.clipped,0);assert(geometry.images);assert(!geometry.detailScroll,`${size} ${cls} Expertise details require scrolling`);
   assert.match(geometry.detailText,/\+15%/);assert.match(geometry.detailText,/-10%/);assert.match(geometry.detailText,/Only class skills/);
   await page.locator('.tree-learn-button').click();
   assert(await page.evaluate(()=>!!review.expertise.getPlayerExpertise(review.game.player)));
   if(size[0]===1920&&cls==='fellhunter')await page.screenshot({path:'docs/expertise/fellhunter-tree.png'});
   const buttons=await page.locator('.node-type-expertise').count();assert.equal(buttons,3);
   const families=await page.evaluate(()=>review.data.CLASS_SUBCLASSES[review.game.player.classId]);
   await page.locator(`[data-select-skill-tree-node$="_expertise_${families[1]}"]`).click();assert(await page.locator('.tree-learn-button').isDisabled());
   await page.locator('[data-skill-respec]').click();await page.locator('[data-skill-respec]').click();
   assert(await page.evaluate(()=>!review.expertise.getPlayerExpertise(review.game.player)));
   checks.push({viewport:size,...geometry,purchase:'passed',exclusive:'passed',respec:'passed'});
  }
 }
 assert.deepEqual(errors,[]);fs.writeFileSync('docs/expertise/browser-checks.json',JSON.stringify({errors,checks},null,2)+'\n');
 console.log(`PASS ${checks.length} class/viewport checks, live purchases, mutual exclusion and respec; no scrolling or missing icons.`);
 }finally{await browser.close()}
})().catch(e=>{console.error(e);process.exitCode=1});
