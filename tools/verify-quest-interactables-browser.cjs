const {chromium}=require(process.env.RUNALIS_NODE_MODULES+'/playwright'),fs=require('node:fs'),assert=require('node:assert/strict');
(async()=>{
 const browser=await chromium.launch({channel:'msedge',headless:true}),out='docs/quest-interactables',errors=[];fs.mkdirSync(out,{recursive:true});
 try{
  const page=await browser.newPage({viewport:{width:1200,height:850}});page.on('pageerror',e=>errors.push(e.message));await page.goto('http://127.0.0.1:8768/');
  const result=await page.evaluate(async()=>{
   const {drawObjects}=await import('/src/objectRenderer.js'),{drawQuestEvidence,QUEST_EVIDENCE_ART}=await import('/src/questObjectArt.js'),{isQuestObjectVisible}=await import('/src/questInteractables.js'),{createWorld}=await import('/src/world.js'),{installCampaignWorld}=await import('/src/act1CampaignRuntime.js'),{createPlayer}=await import('/src/player.js'),{startQuest,createDialogueState}=await import('/src/dialogueSystem.js'),{getQuest}=await import('/src/worldContent.js'),{nearestObject,interact}=await import('/src/gameInteraction.js'),{classifyRadarMarker,buildRadarQuestTargets}=await import('/src/minimapRadar.js');
   const p=createPlayer('Evidence browser review'),world=createWorld();installCampaignWorld(world);const real=world.continentRuntime.allObjects.filter(o=>['act1CargoManifest','act1RelicCradle'].includes(o.id));
   const canvas=document.createElement('canvas');canvas.id='evidenceReview';canvas.width=1000;canvas.height=640;document.body.append(canvas);Object.assign(canvas.style,{position:'fixed',left:'0',top:'0',zIndex:'100000'});const ctx=canvas.getContext('2d');
   const manifest={...real.find(o=>o.id==='act1CargoManifest'),x:160,y:180},cradle={...real.find(o=>o.id==='act1RelicCradle'),x:240,y:180},w={mode:'overworld',objects:[manifest,cradle],enemies:[],effects:[]},cam={x:0,y:0};p.x=manifest.x;p.y=manifest.y;
   function pixels(){ctx.clearRect(0,0,canvas.width,canvas.height);drawObjects(ctx,w,cam,p);return ctx.getImageData(0,0,canvas.width,canvas.height).data.some((v,i)=>i%4===3&&v>0);}
   if(pixels())throw Error('Dormant evidence drew pixels');if(nearestObject({player:p,world:w}))throw Error('Dormant evidence has a prompt');
   startQuest(p,'act1HearthmereAshes');if(!pixels())throw Error('Active evidence has no art');if(nearestObject({player:p,world:w})?.id!==manifest.id)throw Error('Active evidence not selectable');
   const g={player:p,world:w,dialogue:createDialogueState(),canvas,camera:cam,log(){},logLines:[]};interact(g);if(!p.poiStates.caravanWreck.clues.act1CargoManifest)throw Error('Manifest interaction failed');p.x=cradle.x;p.y=cradle.y;interact(g);if(p.quests.active.act1HearthmereAshes.currentStageId!=='handsThatStillWork')throw Error('Caravan progression failed');
   if(pixels()||nearestObject(g))throw Error('Evidence remains after its step');if(classifyRadarMarker(manifest,'object',buildRadarQuestTargets(p,w.objects)))throw Error('Ghost evidence radar marker');
   const guest={questOwner:p,quests:{active:{},completed:{}}};if(isQuestObjectVisible(manifest,guest))throw Error('Guest sees host-hidden evidence');
   ctx.fillStyle='#272d29';ctx.fillRect(0,0,canvas.width,canvas.height);ctx.fillStyle='#e1cf9b';ctx.font='22px Georgia';ctx.fillText('Physical quest evidence',32,40);ctx.font='13px Georgia';ctx.fillStyle='#b7b7a3';ctx.fillText('Native pixel models • documents, objects and traces',32,63);
   QUEST_EVIDENCE_ART.forEach((questArt,i)=>{const x=100+(i%5)*200,y=155+Math.floor(i/5)*140;ctx.fillStyle=i%2?'#343a30':'#30372e';ctx.fillRect(x-83,y-56,166,100);drawQuestEvidence(ctx,{questArt},x,y);ctx.font='14px Georgia';ctx.fillStyle='#dfd1ae';ctx.textAlign='center';ctx.fillText(questArt,x,y+37);ctx.textAlign='left';});
   return {artFamilies:QUEST_EVIDENCE_ART.length,inactiveDrawsNothing:true,activeDrawsPhysicalArt:true,realCaravanInteractions:true,hiddenAfterStep:true,noGhostPromptsOrRadar:true,sharedQuestVisibility:true};
  });await page.locator('#evidenceReview').screenshot({path:out+'/evidence-art.png'});assert.deepEqual(errors,[]);fs.writeFileSync(out+'/browser-verification.json',JSON.stringify({result,errors},null,2));console.log(JSON.stringify({result,errors}));
 }finally{await browser.close();}
})().catch(e=>{console.error(e);process.exitCode=1;});
