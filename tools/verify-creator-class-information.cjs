const {chromium}=require(process.env.RUNALIS_NODE_MODULES+'/playwright');
const assert=require('node:assert/strict'),fs=require('node:fs');
const out='docs/creator-class-information';fs.mkdirSync(out,{recursive:true});
(async()=>{
 const browser=await chromium.launch({channel:'msedge',headless:true}),errors=[],report=[];
 try{
 const page=await browser.newPage({viewport:{width:1920,height:1080}});page.on('pageerror',e=>errors.push(e.message));
 await page.goto('http://127.0.0.1:8768/creator-lab.html');await page.waitForSelector('[data-creator-class]');
 await page.evaluate(async()=>{
  window.creatorInfoReview={creator:await import('/src/characterCreator.js'),data:await import('/src/subclassData.js'),morph:await import('/src/abilityMorphSystem.js')};
  const r=creatorInfoReview,o=document.querySelector('#characterCreatorOverlay');r.game=o.__runalisGame;
  r.creator.closeCharacterCreator();r.game.player.hiddenClassUnlocks={eldritch:true};r.creator.openCharacterCreator(r.game);
  r.baseline=JSON.stringify(r.game.player);
  const l=document.createElement('link');l.rel='stylesheet';l.href='/lexicon.css';document.head.append(l);
 });
 await page.waitForFunction(()=>[...document.styleSheets].some(s=>s.href?.includes('creator-class-information.css')));
 await page.waitForTimeout(150);
 const classes=await page.locator('[data-creator-class]').evaluateAll(rows=>rows.map(e=>e.dataset.creatorClass));
 for(const id of classes){
  await page.locator(`[data-creator-class="${id}"]`).evaluate(e=>e.click());
  const result=await page.evaluate(id=>{
   const r=creatorInfoReview,root=document.querySelector('[data-creator-class-detail]');
   const cards=[...root.querySelectorAll('[data-creator-morph-theme]')];
   const rgb=c=>(c.match(/[\d.]+/g)||[]).slice(0,3).map(v=>Number(v)*(c.startsWith('color(srgb')?255:1));
   const luminance=c=>rgb(c).map(v=>{v/=255;return v<=.04045?v/12.92:((v+.055)/1.055)**2.4;}).reduce((n,v,i)=>n+v*[.2126,.7152,.0722][i],0);
   const text=[...root.querySelectorAll('p,h2,h3,h4,small,.creator-mastery-badge')].filter(e=>!e.closest('details'));
   const contrasts=text.map(e=>{
    const color=getComputedStyle(e).color;let bg=e;
    while(bg&&getComputedStyle(bg).backgroundColor==='rgba(0, 0, 0, 0)')bg=bg.parentElement;
    const background=getComputedStyle(bg||root).backgroundColor;
    const [a,b]=[luminance(color),luminance(background)].sort((a,b)=>b-a);
    return {text:e.textContent.trim(),ratio:(a+.05)/(b+.05),size:parseFloat(getComputedStyle(e).fontSize)};
   });
   return {id,expected:r.data.CLASS_SUBCLASSES[id]||[],actual:cards.map(c=>c.dataset.creatorMorphTheme),
    names:cards.map(c=>c.querySelector('h4').textContent),levels:cards.map(c=>c.querySelector('.creator-mastery-badge').textContent),
    expectedLevels:r.morph.MORPH_MASTERY_LEVELS,copy:root.innerText,
    minContrast:Math.min(...contrasts.map(c=>c.ratio)),poorContrast:contrasts.filter(c=>c.ratio<4.5),
    minimumBodySize:Math.min(...[...root.querySelectorAll('.creator-dossier p:not(.creator-morph-role)')].map(e=>parseFloat(getComputedStyle(e).fontSize))),
    playerUntouched:JSON.stringify(r.game.player)===r.baseline};
  },id);
  assert.deepEqual(result.actual,result.expected);assert(result.playerUntouched);
  assert(result.minimumBodySize>=14);assert.deepEqual(result.poorContrast,[],id+' unreadable text');
  assert.match(result.copy,/Starts with/);assert.match(result.copy,/25% XP/);assert.doesNotMatch(result.copy,/undefined|NaN|chosen grave doctrine/);
  if(result.actual.length){assert.match(result.copy,/Each skill's mastery/);assert.match(result.copy,/Abilities/);assert.deepEqual(result.levels,result.expectedLevels.map(n=>'Mastery '+n));}
  else assert.match(result.copy,/No subclass morphs/);
  await page.screenshot({path:`${out}/${id}-1920.png`});report.push(result);
 }
 const layouts=[];
 for(const [width,height]of [[1920,1080],[1440,900],[1366,768],[1280,720],[800,600],[640,360]]){
  await page.setViewportSize({width,height});
  for(const id of classes){
   await page.locator(`[data-creator-class="${id}"]`).evaluate(e=>e.click());await page.waitForTimeout(30);
   const layout=await page.evaluate(()=>{
    const o=document.querySelector('#characterCreatorOverlay'),sheet=o.querySelector('.creator-class-summary'),footer=o.querySelector('.creator-action-row'),pane=o.querySelector('.creator-info-panel');
    const a=footer.getBoundingClientRect(),b=pane.getBoundingClientRect(),c=sheet.getBoundingClientRect(),header=o.querySelector('.creator-dossier-header').getBoundingClientRect(),clipped=[];
    const walker=document.createTreeWalker(sheet,NodeFilter.SHOW_TEXT);
    for(let node=walker.nextNode();node;node=walker.nextNode()){
     if(!node.textContent.trim()||node.parentElement.closest('svg'))continue;
     const range=document.createRange();range.selectNodeContents(node);
     for(const r of range.getClientRects())if(r.top<header.bottom-1||r.bottom>a.top+1||r.left<c.left-1||r.right>c.right+1)clipped.push({text:node.textContent.trim(),rect:r.toJSON(),sheet:c.toJSON()});
    }
    return {scrollHeight:sheet.scrollHeight,height:sheet.clientHeight,scrollWidth:sheet.scrollWidth,width:sheet.clientWidth,noScroll:sheet.scrollHeight<=sheet.clientHeight+2&&sheet.scrollWidth<=sheet.clientWidth+2,
     footerFits:a.bottom<=b.bottom+1&&a.top>=b.top,bodySize:parseFloat(getComputedStyle(sheet.querySelector('p')).fontSize),clipped,
     cards:[...sheet.querySelectorAll('[data-creator-morph-theme]')].map(c=>c.dataset.creatorMorphTheme),
     selected:o.__creatorWorkingState.classId,playerUntouched:JSON.stringify(creatorInfoReview.game.player)===creatorInfoReview.baseline};
   });
   if(layout.clipped.length||!layout.noScroll){await page.screenshot({path:`${out}/${id}-${width}-overflow.png`});console.log(JSON.stringify(await page.evaluate(()=>[...document.querySelectorAll('.creator-info-panel > *, .creator-core-info > *, .creator-morph-overview > *')].map(e=>({class:e.className,y:e.getBoundingClientRect().y,height:e.getBoundingClientRect().height})))));}
   assert.deepEqual(layout.clipped,[],id+' clipped text '+width+'x'+height);
   assert(layout.noScroll&&layout.footerFits,id+' requires scrolling at '+width+' '+JSON.stringify(layout));
   assert(layout.bodySize>=(height>420?14:11));assert(layout.playerUntouched);assert.equal(layout.selected,id);
   layouts.push({width,height,id,...layout});
   if(id==='waverider'||id==='gravecaller')await page.screenshot({path:`${out}/${id}-${width}.png`});
  }
  await page.evaluate(()=>{const o=document.querySelector('#characterCreatorOverlay'),s=o.querySelector('.creator-class-summary');creatorInfoReview.creator.handleCharacterCreatorControllerInput({rtPressed:true,ltPressed:true});if(s.scrollTop!==0)throw Error('Details moved off the page');});
  const reachable=await page.evaluate(classes=>{
   const r=creatorInfoReview,graph={};
   for(const id of classes){
    graph[id]=[];
    for(const direction of ['up','down','left','right']){
     document.querySelector(`[data-creator-class="${id}"]`).focus();
     r.creator.handleCharacterCreatorControllerInput({[direction+'Pressed']:true});
     const focused=document.querySelector('#characterCreatorOverlay').__creatorWorkingState.focusedId.replace('class-','');
     if(classes.includes(focused))graph[id].push(focused);
    }
   }
   const found=new Set([classes[0]]),queue=[classes[0]];
   for(let i=0;i<queue.length;i++)for(const next of graph[queue[i]])if(!found.has(next)){found.add(next);queue.push(next);}
   return [...found];
  },classes);
  assert.equal(reachable.length,classes.length,'Controller cannot reach every class at '+width);
  await page.locator('[data-creator-proceed]').click();assert(await page.locator('[data-creator-row]').count()===11);
  await page.evaluate(()=>creatorInfoReview.creator.handleCharacterCreatorControllerInput({lbPressed:true}));
  assert(await page.locator('[data-creator-class]').count()===classes.length);
  // The unlock input and every ordinary class must fit on new-player screens too.
  const locked=await page.evaluate(()=>{
   const r=creatorInfoReview;r.creator.closeCharacterCreator();r.game.player.hiddenClassUnlocks={};r.creator.openCharacterCreator(r.game);
   const o=document.querySelector('#characterCreatorOverlay'),p=o.querySelector('.creator-class-list-panel').getBoundingClientRect();
   const controls=[...o.querySelectorAll('[data-creator-class],[data-creator-code-input],[data-creator-code-submit]')];
   const fit=controls.every(e=>{const b=e.getBoundingClientRect();return b.width>20&&b.height>15&&b.top>=p.top&&b.bottom<=p.bottom&&b.left>=p.left&&b.right<=p.right;});
   r.creator.closeCharacterCreator();r.game.player.hiddenClassUnlocks={eldritch:true};r.creator.openCharacterCreator(r.game);r.baseline=JSON.stringify(r.game.player);
   return {fit,count:controls.length};
  });
  assert(locked.fit,'New player controls do not fit at '+width);assert.equal(locked.count,classes.filter(id=>id!=='eldritch').length+2);
 }
 assert.deepEqual(errors,[]);
 fs.writeFileSync(`${out}/verification.json`,JSON.stringify({classes:report,layouts,viewports:6,errors},null,2));
 console.log(`PASS: all ${classes.length} selectable classes fit on one page at six sizes (${layouts.length} layouts), no clipped text or scrolling, text contrast >=4.5:1, new-player unlock controls, unchanged player state and appearance flow.`);
 }finally{await browser.close();}
})().catch(e=>{console.error(e);process.exit(1)});


