const {chromium}=require(process.env.RUNALIS_NODE_MODULES+'/playwright');
const assert=require('node:assert/strict'),fs=require('node:fs');
(async()=>{
 const browser=await chromium.launch({channel:'msedge',headless:true}),out='docs/ability-visibility';fs.mkdirSync(out,{recursive:true});
 try{
  const page=await browser.newPage({viewport:{width:1440,height:900}}),errors=[],missing=[],layouts=[];page.on('pageerror',e=>errors.push(e.message));page.on('response',r=>{if(r.status()>=400)missing.push(r.url());});await page.route('**/src/main.js*',r=>r.fulfill({contentType:'text/javascript',body:''}));await page.goto('http://127.0.0.1:8768/');
  await page.evaluate(async()=>{
   const ui=await import('/src/ui.js'),players=await import('/src/player.js'),loadout=await import('/src/abilityLoadoutSystem.js'),mastery=await import('/src/abilityMasterySystem.js'),morphs=await import('/src/abilityMorphSystem.js'),data=await import('/src/data.js'),sub=await import('/src/subclassData.js'),expertise=await import('/src/skillExpertiseSystem.js');
   const game={player:players.createPlayer('Abilities review'),world:{mode:'overworld',objects:[],enemies:[],width:640,height:480},camera:{x:0,y:0},logLines:[],log(text){this.logLines.push(text);},save(){},keys:{},input:{},canvas:document.querySelector('#game')};document.querySelector('#mainMenu').classList.remove('active');document.querySelector('#app').classList.add('active');ui.initUI(game);game.uiState.skillsSubtab='abilities';
   window.abilityVisibility={game,ui,players,loadout,mastery,morphs,data,sub,expertise};window.renderAbilities=(cls,id,level=20,expert=false)=>{
    const r=abilityVisibility,p=players.createPlayer('Abilities review');players.chooseClass(p,cls);p.spiritAwakened=true;const skills=data.ABILITIES.filter(a=>a.classId===cls);
    for(const a of skills){loadout.unlockActiveAbility(p,a.id,{autoAssignEmpty:false});mastery.getAbilityMastery(p,a.id,true).level=level;if(level>=20)morphs.selectAbilityMorph(p,a.id,sub.CLASS_SUBCLASSES[cls][0]);}
    p.loadout.abilitySlots=[...skills.slice(0,4).map(a=>a.id),'block'];if(expert)p.skillTree.spent[expertise.expertiseNodeId(cls,sub.CLASS_SUBCLASSES[cls][0])]=1;game.player=p;game.uiState.selectedAbilityId=id||skills[0].id;game.uiState.abilityCategory='all';ui.renderUI(p,[],game);
   };renderAbilities('oathkeeper','oathkeeperHallowedBlades');
  });await page.locator('[data-tab="skills"]').evaluate(e=>e.click());await page.waitForFunction(()=>document.styleSheets.length>5);await page.waitForTimeout(100);
  const classes=await page.evaluate(async()=>{const {isClassAvailable}=await import('/src/classData.js');return Object.keys(abilityVisibility.sub.CLASS_SUBCLASSES).filter(isClassAvailable);});
  for(const [width,height] of [[1920,1080],[1440,900],[1280,720],[800,600],[640,480]]){
   await page.setViewportSize({width,height});
   for(const cls of classes){
    const ids=await page.evaluate(cls=>abilityVisibility.data.ABILITIES.filter(a=>a.classId===cls).map(a=>a.id),cls);
    for(const id of ids){
     await page.evaluate(({cls,id})=>renderAbilities(cls,id,20,true),{cls,id});
     await page.waitForFunction(()=>[...document.querySelectorAll('#skills .ability-hotbar-icon img,#skills .ability-detail-title img')].every(e=>e.complete&&e.naturalWidth>0));
     const fit=await page.evaluate(()=>{
      const pane=document.querySelector('.ability-detail-pane'),box=pane.getBoundingClientRect(),info=pane.querySelector('.ability-detail-info'),choices=[...pane.querySelectorAll('[data-ability-morph]')];
      const within=e=>{const r=e.getBoundingClientRect();return r.width>0&&r.height>0&&r.left>=box.left-1&&r.right<=box.right+1&&r.top>=box.top-1&&r.bottom<=box.bottom+1&&r.bottom<=innerHeight-1;};
      const buttons=choices.map(e=>({id:e.dataset.abilityMorph,visible:within(e),fits:e.scrollHeight<=e.clientHeight+1&&e.scrollWidth<=e.clientWidth+1,font:getComputedStyle(e.querySelector('b')).fontSize,symbol:e.querySelector('svg').getBoundingClientRect().width}));
      const before=choices.map(e=>e.getBoundingClientRect().top);info.scrollTop=info.scrollHeight;const after=choices.map(e=>e.getBoundingClientRect().top);
      const hotbar=[...document.querySelectorAll('.ability-hotbar-icon')].map(e=>({symbol:!!e.querySelector('svg,img.technique-icon,.runalis-art-icon'),size:e.getBoundingClientRect().width,visible:e.getBoundingClientRect().bottom<=innerHeight-36}));
      return {buttons,stationary:before.every((y,i)=>y===after[i]),hotbar,bodyFits:document.querySelector('#skills').scrollWidth<=innerWidth,readingHeight:info.clientHeight};
     });
     const valid=fit.buttons.length===4&&fit.buttons.every(b=>b.visible&&b.fits&&parseFloat(b.font)>=12&&b.symbol>=24)&&fit.stationary&&fit.hotbar.length===5&&fit.hotbar.every(b=>b.symbol&&b.visible)&&fit.bodyFits&&fit.readingHeight>=28;
     if(!valid){await page.screenshot({path:out+'/failure.png'});throw Error(JSON.stringify({width,height,cls,id,...fit}));}layouts.push({width,height,cls,id,readingHeight:fit.readingHeight});
    }
   }
   await page.evaluate(()=>renderAbilities('oathkeeper','oathkeeperHallowedBlades',20,true));await page.waitForFunction(()=>[...document.querySelectorAll('#skills img')].every(e=>e.complete&&e.naturalWidth>0));await page.screenshot({path:`${out}/abilities-${width}.png`});
  }
  await page.setViewportSize({width:1280,height:720});await page.evaluate(()=>renderAbilities('waverider','hydromancerWaterTorrent',1));
  const locked=await page.locator('[data-ability-morph]:disabled').evaluateAll(es=>es.map(e=>({opacity:getComputedStyle(e).opacity,status:e.querySelector('small').textContent,visible:e.getBoundingClientRect().bottom<=innerHeight-36})));assert.equal(locked.length,3);assert(locked.every(e=>e.opacity==='1'&&e.visible&&/Mastery/.test(e.status)));
  await page.screenshot({path:out+'/locked-forms.png'});
  const contrast=await page.evaluate(()=>{const colors=['#fff0d3','#e1ceb1','#dccdb7'],backgrounds=['#29221d','#463525','#211c19'];const lum=hex=>{const v=hex.match(/[a-f0-9]{2}/gi).map(c=>parseInt(c,16)/255).map(c=>c<=.04045?c/12.92:((c+.055)/1.055)**2.4);return v[0]*.2126+v[1]*.7152+v[2]*.0722;};return colors.flatMap(text=>backgrounds.map(bg=>({text,bg,ratio:(lum(text)+.05)/(lum(bg)+.05)})));});assert(contrast.every(c=>c.ratio>=4.5));
  await page.evaluate(()=>renderAbilities('thornbinder','thornbinderThornstorm',20));await page.locator('[data-ability-morph="petalknight"]').click();await page.locator('[data-assign-selected-slot="0"]').evaluate(e=>e.click());assert.equal(await page.locator('[data-ability-hotbar-slot="0"] .subclass-skill-badge svg path').getAttribute('d'),await page.locator('[data-ability-morph="petalknight"] svg path').getAttribute('d'));await page.locator('[data-clear-ability-slot="0"]').click();assert.equal(await page.locator('[data-ability-hotbar-slot="0"] .hotbar-empty-symbol').count(),1);
  await page.locator('[data-select-ability-id="block"]').evaluate(e=>e.click());assert.equal(await page.locator('[data-ability-morph]').count(),0);assert(await page.locator('.ability-detail-info').isVisible());
  assert.deepEqual(errors,[]);assert.deepEqual(missing,[]);fs.writeFileSync(out+'/verification.json',JSON.stringify({layouts,locked,contrast,errors,missing},null,2));console.log(JSON.stringify({layouts:layouts.length,viewports:5,classes:6,locked:locked.length,minContrast:Math.min(...contrast.map(c=>c.ratio)),errors,missing}));
 }finally{await browser.close();}
})().catch(e=>{console.error(e);process.exitCode=1;});
