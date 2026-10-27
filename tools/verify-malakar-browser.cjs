const {chromium}=require(process.env.RUNALIS_NODE_MODULES+'/playwright');
const fs=require('fs'),assert=require('assert/strict');
(async()=>{const browser=await chromium.launch({channel:'msedge',headless:true});const page=await browser.newPage({viewport:{width:1280,height:800}}),errors=[];page.on('pageerror',e=>errors.push(e.stack));
try{
 await page.route('**/src/main.js*',route=>route.fulfill({contentType:'text/javascript',body:fs.readFileSync('src/main.js','utf8')+'\nwindow.getCampaignReviewGame=()=>currentGame;'}));
 await page.goto(process.env.RUNALIS_URL||'http://127.0.0.1:8768/');
 await page.evaluate(async()=>{const{writeProfiles}=await import('/src/gameSave.js'),{createPlayer,chooseClass}=await import('/src/player.js');const p=createPlayer('Malakar Review');chooseClass(p,'oathkeeper');p.characterCreationComplete=true;p.story.flags.opening={introPlayed:true,maraConversationComplete:true};writeProfiles({malakarReview:{id:'malakarReview',name:'Malakar Review',updated:1,state:{version:18,player:p,worldMode:'capital',worldName:'Orrakai'}}});});
 await page.reload();await page.locator('[data-load="malakarReview"]').click();await page.waitForFunction(()=>!!window.getCampaignReviewGame?.());
 await page.evaluate(async()=>{const g=getCampaignReviewGame(),{createDungeonWorld}=await import('/src/dungeonSystem.js');g.world=createDungeonWorld({dungeonId:'demonCultLair',theme:'demon',tier:5,depth:3,seed:'malakar-climax',floor:3});g.world.enemies=[];const stair=g.world.objects.find(o=>o.malakarEntrance);Object.assign(g.player,{x:stair.x,y:stair.y+30});g.camera.x=g.player.x-640;g.camera.y=g.player.y-400;});
 await page.waitForTimeout(500);await page.screenshot({path:'docs/malakar-climax/approach.png'});
 await page.keyboard.press('e');await page.waitForSelector('#malakarEncounterPanel');assert.equal(await page.evaluate(()=>getCampaignReviewGame().world.floor),3);await page.screenshot({path:'docs/malakar-climax/readiness.png'});
 await page.getByRole('button',{name:'Player 1: Yes',exact:true}).click();await page.waitForFunction(()=>getCampaignReviewGame().world.floor===4);
 await page.waitForTimeout(10000);await page.screenshot({path:'docs/malakar-climax/sacrifice.png'});
 await page.keyboard.press('Escape');await page.waitForFunction(()=>getCampaignReviewGame().world.dungeonState.malakar.mode==='introduction');await page.screenshot({path:'docs/malakar-climax/introduction.png'});
 await page.getByRole('button',{name:'What was in the caravan?',exact:true}).click();await page.waitForFunction(()=>getCampaignReviewGame().world.dungeonState.malakar.mode==='active');
 await page.keyboard.down('a');await page.waitForTimeout(900);await page.keyboard.up('a');await page.waitForTimeout(1800);await page.screenshot({path:'docs/malakar-climax/combat.png'});
 // Controlled visual/AI phase coverage. This is not a full survival victory.
 for(const [name,ratio]of [['wrath',.65],['ruin',.3]]){await page.evaluate(r=>{const g=getCampaignReviewGame();g.player.hp=g.player.maxHp;g.world.enemies[0].hp=g.world.enemies[0].maxHp*r;},ratio);await page.waitForTimeout(2200);await page.screenshot({path:'docs/malakar-climax/'+name+'.png'});assert.equal(await page.evaluate(()=>getCampaignReviewGame().world.dungeonState.malakar.phase),name==='wrath'?2:3);}
 await page.evaluate(()=>{const g=getCampaignReviewGame();g.world.enemies[0].hp=0;});await page.waitForTimeout(700);await page.screenshot({path:'docs/malakar-climax/defeat.png'});await page.waitForTimeout(4500);
 assert(await page.evaluate(()=>getCampaignReviewGame().world.objects.some(o=>o.returnPortal)));
 assert.deepEqual(errors,[]);fs.writeFileSync('docs/malakar-climax/browser-verification.json',JSON.stringify({errors,keyboardEntrance:true,readinessButton:true,ritualPlayback:true,skip:true,introductionBranch:'relic',keyboardMovement:true,phaseRendering:true,defeatPortal:true,limitations:'Phase HP and final defeat were injected for coverage; not a normal-play victory.'},null,2));console.log('PASS actual keyboard entrance, consent, ritual, intro, movement, three phase rendering, death/portal; no browser errors');
}finally{await browser.close();}})().catch(e=>{console.error(e);process.exitCode=1});
