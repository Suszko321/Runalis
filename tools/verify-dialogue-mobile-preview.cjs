const {chromium}=require(process.env.RUNALIS_NODE_MODULES+'/playwright'),fs=require('node:fs'),assert=require('node:assert/strict'),launch=require('./browser-game-smoke.cjs');
const base=process.env.RUNALIS_URL||'http://127.0.0.1:8768',out='docs/dialogue-mobile-preview';
(async()=>{const browser=await chromium.launch({channel:'msedge',headless:true}),errors=[],missing=[],checks=[];fs.mkdirSync(out,{recursive:true});
 try{
  for(const config of [{name:'desktop',width:1280,height:800},{name:'controller',width:1280,height:800},{name:'phone',width:844,height:390,touch:true},{name:'portrait',width:390,height:844,touch:true}].filter(c=>!process.env.RUNALIS_LAYOUT||c.name===process.env.RUNALIS_LAYOUT)){
   const page=await browser.newPage({viewport:config.name==='portrait'?{width:844,height:390}:{width:config.width,height:config.height},hasTouch:!!config.touch,isMobile:!!config.touch,deviceScaleFactor:1});
   page.on('pageerror',e=>errors.push(e.message));page.on('response',r=>{if(r.status()>=400)missing.push(r.url());});
   await page.addInitScript(()=>{Element.prototype.requestFullscreen=async()=>{throw Error('Unsupported test browser');};});
   if(config.name==='portrait')await page.addInitScript(()=>document.addEventListener('DOMContentLoaded',()=>document.querySelector('[data-mobile-portrait]')?.click()));
   await page.route('**/src/main.js*',r=>r.fulfill({contentType:'text/javascript',body:fs.readFileSync('src/main.js','utf8')+'\nwindow.dialoguePreviewGame=()=>currentGame;'}));
   await launch(page,base);
   if(config.name==='portrait'){await page.setViewportSize({width:config.width,height:config.height});await page.locator('[data-mobile-portrait]').tap();}
   await page.waitForFunction(()=>window.dialoguePreviewGame?.()?.started&&!document.querySelector('#loadingScreen')?.classList.contains('active'));
   if(config.name==='controller'){
    await page.evaluate(()=>{window.dialoguePad={id:'Dialogue test controller',index:0,connected:true,axes:[0,0,0,0],buttons:Array.from({length:17},()=>({pressed:false,value:0}))};Object.defineProperty(navigator,'getGamepads',{configurable:true,value:()=>[dialoguePad]});});
    await page.waitForFunction(()=>dialoguePreviewGame().getPrimaryControllerInput().connected);
   }
   for(const phase of ['OPENING','TYPING','AWAITING_CONTINUE','AWAITING_CHOICE','SUSPENDED']){
    const hit=await page.evaluate(async phase=>{
     const g=dialoguePreviewGame(),{openDialogue}=await import('/src/dialogueSystem.js'),{getDialoguePointerTarget}=await import('/src/dialogueUi.js');
     const npc=g.world.objects.find(o=>o.npcId==='orenFenwick');if(!openDialogue(g.dialogue,npc,g.player,g.world))throw Error('Cannot open alchemist dialogue');
     Object.assign(g.dialogue,{phase,state:phase,historyOpen:phase==='SUSPENDED',openingTimer:100,transitionLock:100,choiceScrollOffset:0,selectedIndex:0,visibleText:'A conversation with more responses than fit on screen.',options:Array.from({length:30},(_,i)=>({text:i===29?'Leave conversation':'Response '+i,next:i===29?'__close__':'maraTrainerDialogue'}))});
     if(g.mobileControls){const {renderMobileDialogue}=await import('/src/mobileText.js');renderMobileDialogue(g);const b=document.querySelector('#mobileDialogue header button').getBoundingClientRect();return {native:true,x:b.x+b.width/2,y:b.y+b.height/2,width:b.width,height:b.height};}
     const viewport=g.getDialogueViewport(g.player),rect=g.canvas.getBoundingClientRect(),target=(x,y)=>getDialoguePointerTarget(g.ctx,g.dialogue,{x,y},{viewport});
     for(let y=0;y<g.canvas.height;y+=10)for(let x=g.canvas.width/2;x<g.canvas.width;x+=10)if(target(x,y)?.type==='close'){
      let top=y,bottom=y,left=x,right=x;
      while(target(x,top-1)?.type==='close')top--;while(target(x,bottom+1)?.type==='close')bottom++;
      while(target(left-1,y)?.type==='close')left--;while(target(right+1,y)?.type==='close')right++;
      return {x:rect.left+(left+right)/2*rect.width/g.canvas.width,y:rect.top+(top+bottom)/2*rect.height/g.canvas.height,height:(bottom-top+1)*rect.height/g.canvas.height,width:(right-left+1)*rect.width/g.canvas.width,viewport,canvas:[g.canvas.width,g.canvas.height],rect:{width:rect.width,height:rect.height}};
     }throw Error('Leave button missing');
    },phase);
    assert(hit.height>=43&&hit.width>=(hit.native?80:140),config.name+' leave touch target too small');assert(hit.y<config.height&&hit.x<config.width);
    if(config.touch)await page.locator('#mobileStick').waitFor({state:'hidden'});
    const covering=await page.evaluate(p=>p.native?document.elementFromPoint(p.x,p.y)?.closest('#mobileDialogue')?.id:document.elementFromPoint(p.x,p.y)?.outerHTML.slice(0,350),hit);
    if(!covering?.startsWith('<canvas'))await page.screenshot({path:out+'/covered.png'});
    assert(hit.native?covering==='mobileDialogue':covering?.startsWith('<canvas'),config.name+' leave button covered at '+JSON.stringify(hit)+': '+covering);
    if(phase==='AWAITING_CHOICE')await page.screenshot({path:`${out}/${config.name}-dialogue.png`});
    if(config.touch)await page.touchscreen.tap(hit.x,hit.y);else await page.mouse.click(hit.x,hit.y);
    await page.waitForFunction(()=>!dialoguePreviewGame().dialogue.active);checks.push(`${config.name}: persistent leave closes ${phase}, including overflow/history and input locks`);
   }
   if(config.touch){
    await page.locator('[data-action="menu"]').tap();await page.locator('.tab[data-tab="character"]').tap();await page.locator('[data-open-character-creator]').tap();await page.waitForSelector('#characterCreatorOverlay.active');
    const canvas=page.locator('[data-creator-preview]');await canvas.scrollIntoViewIfNeeded();assert(await canvas.isVisible());
    assert(await page.evaluate(()=>{const p=document.querySelector('.creator-preview-panel'),groups=document.querySelector('.creator-appearance-groups');return !!(groups.compareDocumentPosition(p)&Node.DOCUMENT_POSITION_FOLLOWING);}));
    const start=page.locator('[data-creator-start]');assert(await start.isVisible());const bounds=await start.boundingBox();assert(bounds.y>=0&&bounds.y+bounds.height<=config.height+1);
    await page.waitForTimeout(250);await page.screenshot({path:`${out}/${config.name}-preview.png`});
    const before=await canvas.evaluate(c=>c.toDataURL());await page.locator('[data-creator-next]').first().tap();await page.waitForTimeout(150);await canvas.scrollIntoViewIfNeeded();assert.notEqual(await canvas.evaluate(c=>c.toDataURL()),before);
    await start.tap();await page.waitForFunction(()=>!document.querySelector('#characterCreatorOverlay.active'));checks.push(`${config.name}: existing character customization has live preview below options and usable Start Game`);
   }
   await page.close();
  }
  assert.deepEqual(errors,[]);assert.deepEqual(missing,[]);const report={checks,errors,missing};fs.writeFileSync(out+'/verification.json',JSON.stringify(report,null,2));console.log(JSON.stringify(report,null,2));
 }finally{await browser.close();}
})().catch(e=>{console.error(e);process.exitCode=1;});
