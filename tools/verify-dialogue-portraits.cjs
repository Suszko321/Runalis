const {chromium}=require('C:/Users/austi/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright');
const assert=require('assert/strict');
(async()=>{
 const browser=await chromium.launch({channel:'msedge',headless:true});
 const page=await browser.newPage(); const errors=[];
 page.on('pageerror',e=>errors.push(e.message));
 await page.route('**/src/main.js*',r=>r.fulfill({contentType:'text/javascript',body:''}));
 await page.goto('http://127.0.0.1:8766/');
 const result=await page.evaluate(async()=>{
   const {createMaraHouseWorld:createWorld}=await import('/src/act1OpeningSystem.js');
   const {createPlayer}=await import('/src/player.js');
   const {createDialogueState,openDialogue}=await import('/src/dialogueSystem.js');
   const portrait=await import('/src/dialoguePortrait.js');
   const ui=await import('/src/dialogueUi.js');
   const world=createWorld(), player=createPlayer('Grave');
   const mara=world.objects.find(o=>o.npcId==='maraVell');
   if(!mara) throw Error('Mara missing from world');
   const state=createDialogueState(); openDialogue(state,mara,player,world);
   Object.assign(state,{active:true,speakerId:'maraVell',speakerName:'Mara Vell',phase:'TYPING',openingTimer:1,
    visibleText:'Easy. You are in Orrakai, in my house, and alive despite your best effort. I am Mara Vell. Before you stand, ask what you need to ask.',revealedTokenCount:17});
   const resolved=portrait.resolveDialoguePortrait(state);
   const checks={mara:resolved.npcId==='maraVell',player:portrait.resolveDialoguePortrait({...state,speakerId:'player'})===player,
     narration:portrait.resolveDialoguePortrait({...state,speakerId:'narration'})===null,
     unknown:portrait.resolveDialoguePortrait({...state,speakerId:'missing',speakerName:'Missing'})===null,
     talking:portrait.getPortraitSpeechFrame({...state,visibleText:'Easy'})>0,
     stopped:portrait.getPortraitSpeechFrame({...state,phase:'AWAITING_CHOICE'})===0,
     reduced:portrait.getPortraitSpeechFrame({...state,settings:{reducedMotion:true}})===0,
     history:portrait.getPortraitSpeechFrame({...state,historyOpen:true})===0};
   const canvas=document.createElement('canvas');document.body.replaceChildren(canvas);
   document.body.style.cssText='margin:0;background:#090a0e';canvas.style.cssText='display:block;width:100%;height:auto';
   window.review={canvas,state,ui,portrait,player,mara};
   window.render=(w,h)=>{canvas.width=w;canvas.height=h;const ctx=canvas.getContext('2d');ctx.fillStyle='#17191b';ctx.fillRect(0,0,w,h);ui.drawDialogueUI(ctx,state)};
   render(1280,720);return checks;
 });
 for(const [key,value]of Object.entries(result))assert(value,key);
 await page.waitForTimeout(1800);
 assert(await page.evaluate(()=>{
   const {portrait,state,player,mara}=review;
   const c=document.createElement('canvas');c.width=c.height=124;const ctx=c.getContext('2d');
   const before=JSON.stringify([player,mara]);
   const draw=(phase,count)=>{ctx.clearRect(0,0,124,124);portrait.drawDialoguePortrait(ctx,{x:0,y:0,w:124,h:124},portrait.resolveDialoguePortrait(state),{...state,phase,visibleText:'Easy',revealedTokenCount:count});return c.toDataURL()};
   const rest=draw('AWAITING_CHOICE',2),talkA=draw('TYPING',2),talkB=draw('TYPING',4);
   return rest!==talkA&&talkA!==talkB&&rest===draw('AWAITING_CHOICE',4)&&before===JSON.stringify([player,mara]);
 }),'portrait changes while speaking, returns to rest, leaves actors unchanged');
 for(const [w,h] of [[1280,720],[640,480],[360,640]]){
   await page.setViewportSize({width:w,height:h});
   await page.evaluate(([w,h])=>{review.state.phase='AWAITING_CHOICE';review.state.choiceAppearTimer=1;review.state.options=[{text:'How did I survive?'},{text:'What should I do now?',disabled:true},{text:'Leave.'}];render(w,h)},[w,h]);
   await page.screenshot({path:`docs/ui-overhaul/dialogue-portrait-${w}.png`});
   assert(await page.evaluate(()=>{const {canvas,state,ui}=review;const hits=new Set();for(let y=0;y<canvas.height;y+=2){const hit=ui.getDialoguePointerTarget(canvas.getContext('2d'),state,{x:canvas.width/2,y});if(hit?.type==='choice')hits.add(hit.index)}return hits.size===3}),`choice targets ${w}`);
 }
 assert.deepEqual(errors,[]);console.log(JSON.stringify({checks:result,errors}));await browser.close();
})().catch(e=>{console.error(e);process.exit(1)});


