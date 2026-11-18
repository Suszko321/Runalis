const {readFile}=require('node:fs/promises');
const {resolve,extname,sep}=require('node:path');
const assert=require('node:assert/strict');

const modules=process.env.RUNALIS_NODE_MODULES;
if(!modules)throw Error('Set RUNALIS_NODE_MODULES to your Playwright modules directory.');
let playwright;
try{playwright=require(resolve(modules,'playwright'));}catch(error){
  if(error.code!=='MODULE_NOT_FOUND')throw error;
  playwright=require(resolve(modules,'playwright-core'));
}
const types={'.html':'text/html','.js':'text/javascript','.css':'text/css','.json':'application/json','.png':'image/png','.webp':'image/webp','.svg':'image/svg+xml','.woff2':'font/woff2'};
async function main(){
  const root=resolve('.');

  let browser;
  try{
    browser=await playwright.chromium.launch({channel:process.env.RUNALIS_BROWSER_CHANNEL||'chrome',headless:true});
    const page=await browser.newPage({viewport:{width:1440,height:900}});
    const errors=[];page.on('pageerror',error=>errors.push(error.message));
    await page.route('http://runalis.test/**',async route=>{
      const path=new URL(route.request().url()).pathname;
      const file=resolve(root,'.'+(path==='/'?'/index.html':decodeURIComponent(path)));
      if(!file.startsWith(root+sep)){await route.fulfill({status:403});return;}
      try{
        let body=await readFile(file);
        if(path==='/src/main.js')body=Buffer.concat([body,Buffer.from('\nwindow.act2Game=()=>currentGame;')]);
        await route.fulfill({status:200,contentType:types[extname(file)]||'application/octet-stream',body});
      }catch{await route.fulfill({status:404});}
    });
    await page.goto('http://runalis.test/');
    await page.evaluate(async()=>{
      const {writeProfiles}=await import('/src/gameSave.js');
      const {createPlayer,chooseClass}=await import('/src/player.js');
      const p=createPlayer('Act II Browser Review');chooseClass(p,'oathkeeper');p.characterCreationComplete=true;p.capitalUnlocked=true;
      p.story.flags.opening={introPlayed:true,maraConversationComplete:true};
      p.story.flags.act1Complete=true;
      p.quests.completed.mercy_in_orrakai={id:'mercy_in_orrakai'};
      p.quests.completed.act1HearthmereAshes={id:'act1HearthmereAshes'};
      writeProfiles({act2Review:{id:'act2Review',name:p.name,updated:1,state:{version:18,player:p,worldMode:'capital',worldName:'Orrakai'}}});
    });
    await page.reload();
    await page.locator('[data-load="act2Review"]').click();
    await page.waitForFunction(()=>window.act2Game?.()?.world?.mode==='capital');
    const afterMael=await page.evaluate(async()=>{
      const g=act2Game(),{interact}=await import('/src/gameInteraction.js');
      const {chooseDialogueOption,closeDialogue}=await import('/src/dialogueSystem.js');
      const mael=g.world.objects.find(o=>o.npcId==='wardenMael');
      Object.assign(g.player,{x:mael.x,y:mael.y});
      interact(g);
      const selected=g.dialogue.options.findIndex(o=>o.id==='commission');
      if(selected<0)return false;
      chooseDialogueOption(g.dialogue,g.player,g.world,selected);
      closeDialogue(g.dialogue,{immediate:true});
      return !!g.player.quests.completed.act2AshesAfterDawn;
    });
    assert(afterMael);
    const outcomes=await page.evaluate(async()=>{
      const g=act2Game();
      const {createContinentalWorld}=await import('/src/continentWorld.js');
      const {enterDungeon}=await import('/src/dungeonSystem.js');
      const {openDialogue,chooseDialogueOption,closeDialogue}=await import('/src/dialogueSystem.js');
      const {SERAPH_DOMAINS,domainFlag}=await import('/src/act2CampaignData.js');
      const {addItem}=await import('/src/player.js');
      const {setStoryFlag}=await import('/src/storyProgress.js');
      g.world=createContinentalWorld({spawnRegionId:'zarynth',player:g.player});
      Object.assign(g.player,g.world.spawn);
      const gate=g.world.continentRuntime.allObjects.find(o=>o.dungeonId==='zarynthCapital');
      const blocked=!enterDungeon(g,gate);
      const examiner=g.world.continentRuntime.allObjects.find(o=>o.npcId==='act2-examiner'&&o.id.includes('zarynth'));
      openDialogue(g.dialogue,examiner,g.player,g.world);
      chooseDialogueOption(g.dialogue,g.player,g.world,g.dialogue.options.findIndex(o=>o.id==='witnesses'));
      closeDialogue(g.dialogue,{immediate:true});
      for(const id of Object.keys(SERAPH_DOMAINS)){
        setStoryFlag(g.player,domainFlag(id,'relic'));
        addItem(g.player,`concordantRelic_${id}`);
      }
      Object.assign(g.player,{x:gate.x,y:gate.y});
      const admitted=enterDungeon(g,gate);
      if(admitted)Object.assign(g.player,{x:43.5*32,y:46*32});
      return {blocked,admitted,name:g.world.name,ward:g.player.story.flags.act2.wardExplained};
    });
    assert.deepEqual(outcomes,{blocked:true,admitted:true,name:'Zarynth · City of a Thousand Banners',ward:true});
    await page.waitForTimeout(1000);
    if(process.env.RUNALIS_ACT2_SCREENSHOT)await page.screenshot({path:process.env.RUNALIS_ACT2_SCREENSHOT});
    const rendered=await page.evaluate(async()=>{
      const g=act2Game();
      const {createDungeonWorld}=await import('/src/dungeonSystem.js');
      const {draw}=await import('/src/render.js');
      const {summonAct2Guardian}=await import('/src/act2World.js');
      const {buildAct2BossTell}=await import('/src/act2BossPatterns.js');
      const canvas=document.createElement('canvas');
      canvas.width=1280;canvas.height=800;const ctx=canvas.getContext('2d');
      const checks=[];
      for(const id of ['lastStandBastion','forgottenOssuary','unfinishedHour']){
        const w=createDungeonWorld({dungeonId:id});
        const boss=summonAct2Guardian(w);
        boss.arenaDormant=false;
        const p={...g.player,x:boss.x+70,y:boss.y+30};
        boss.boss={phase:2,act2Turn:1};
        const tell=buildAct2BossTell(boss,p);
        boss.boss.pendingSpecial={...tell,time:.6,maxTime:1};
        const camera={x:boss.x-640,y:boss.y-382};
        draw(ctx,w,p,camera);
        const sprite=ctx.getImageData(620,309,40,63).data;
        const colors=new Set();
        for(let i=0;i<sprite.length;i+=4)colors.add(sprite[i]+','+sprite[i+1]+','+sprite[i+2]);
        checks.push([id,colors.size,w.enemies.filter(e=>e.seraphSprite).length]);
        const fixture=w.objects.find(o=>o.seraphTrial);
        fixture.seraphLit=true;
        draw(ctx,w,p,{x:fixture.x-640,y:fixture.y-382});
      }
      return checks;
    });
    assert(rendered.every(([,colors,mobs])=>colors>12&&mobs>=8),JSON.stringify(rendered));
    assert.deepEqual(errors,[]);
    console.log('PASS browser launch, Mael, ward denial, capital admission, all three custom boss sprites, tells and mechanism draws');
  } finally {
    if(browser)await browser.close();
  }
}
main().catch(error=>{console.error(error);process.exitCode=1;});
