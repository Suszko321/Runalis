const assert=require('node:assert/strict');
const {chromium}=require(process.env.RUNALIS_NODE_MODULES+'/playwright');

(async()=>{
  const browser=await chromium.launch({channel:'msedge',headless:true});
  try{
    const page=await browser.newPage({viewport:{width:844,height:390},isMobile:true,hasTouch:true});
    const errors=[];
    page.on('pageerror',error=>errors.push(error.message));
    const base=process.env.RUNALIS_URL||'http://127.0.0.1:8889';
    await page.goto(base+'/art-lab.html');
    await page.addStyleTag({url:base+'/style.css'});
    await page.evaluate(async()=>{
      const {createPlayer}=await import('/src/player.js');
      const {createCapitalHubWorld}=await import('/src/hubSystem.js');
      const {createAdventurersLounge}=await import('/src/act1OpeningSystem.js');
      const {hireGuildAdventurer,updateLivingAdventurers}=await import('/src/livingAdventurers.js');
      const {openAdventurerChat}=await import('/src/adventurerChatUi.js');
      const {normalizeProfileSave}=await import('/src/saveProfiles.js');
      const {createDialogueState,openDialogue,updateDialogue}=await import('/src/dialogueSystem.js');
      const player=createPlayer('Browser companion test');
      const game={player,world:createCapitalHubWorld()};
      const vendor=game.world.objects.find(o=>o.guildContractVendor);
      Object.assign(player,{x:vendor.x,y:vendor.y,gold:1000});
      if(!hireGuildAdventurer(game,vendor,player,()=>.2)||!hireGuildAdventurer(game,vendor,player,()=>.2))throw Error('Hire');
      window.openBenchChat=(reload=false)=>{
        if(reload)game.player=normalizeProfileSave(JSON.parse(JSON.stringify(game.player)));
        game.world=createAdventurersLounge();
        updateLivingAdventurers(game,1/60);
        const npc=game.world.objects.find(o=>o.livingAdventurer&&!o.hiredAdventurer);
        Object.assign(game.player,{x:npc.x,y:npc.y});
        const dialogue=createDialogueState();
        openDialogue(dialogue,npc,game.player,game.world);
        for(let i=0;i<300;i++)updateDialogue(dialogue,1/30);
        if(!dialogue.options.some(option=>option.action==='adventurerChat'))throw Error('Missing dialogue option');
        if(!openAdventurerChat(game,npc,game.player))throw Error('Chat did not open');
      };
      openBenchChat();
    });
    const dialog=page.locator('#adventurerChatOverlay');
    const input=dialog.getByRole('textbox');
    await input.fill('Remember that my favourite colour is forest green.');
    await input.press('Enter');
    await dialog.getByRole('log').getByText("I'll keep that in mind.").waitFor();
    await dialog.getByText('Companion’s journal').tap();
    assert.match(await dialog.locator('li').first().textContent(),/forest green/);
    assert(await dialog.evaluate(el=>el.getBoundingClientRect().width<=innerWidth));
    await dialog.getByRole('button',{name:'Done'}).tap();
    await dialog.waitFor({state:'detached'});
    await page.evaluate(()=>openBenchChat(true));
    await input.fill('Do you remember my favourite colour?');
    await dialog.getByRole('button',{name:'Send'}).tap();
    await dialog.getByRole('log').getByText(/Here's what I kept.*forest green/).waitFor();
    assert.deepEqual(errors,[]);
    console.log('PASS companion dialogue, touch chat, journal, mobile width and recall after reload.');
  }finally{await browser.close();}
})().catch(error=>{console.error(error);process.exitCode=1;});
