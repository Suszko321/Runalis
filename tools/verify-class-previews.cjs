const {chromium}=require(process.env.RUNALIS_NODE_MODULES+'/playwright');
const assert=require('node:assert/strict'),fs=require('node:fs');
const out='docs/class-previews';fs.mkdirSync(out,{recursive:true});
(async()=>{
 const browser=await chromium.launch({channel:'msedge',headless:true});
 const page=await browser.newPage({viewport:{width:1440,height:900}}),errors=[],frames=[],report=[];
 page.on('pageerror',e=>errors.push(e.message));
 await page.goto('http://127.0.0.1:8768/creator-lab.html');await page.waitForSelector('[data-creator-class]');
 await page.evaluate(async()=>{
  window.previewReview={creator:await import('/src/characterCreator.js'),animation:await import('/src/classPreviewAnimation.js'),poses:await import('/src/playerAnimationController.js'),art:await import('/src/spriteArt.js')};
  const overlay=document.querySelector('#characterCreatorOverlay');previewReview.game=overlay.__runalisGame;
  previewReview.creator.closeCharacterCreator();previewReview.game.player.hiddenClassUnlocks={eldritch:true};previewReview.creator.openCharacterCreator(previewReview.game);
  previewReview.baseline=JSON.stringify(previewReview.game.player);
  const l=document.createElement('link');l.rel='stylesheet';l.href='/lexicon.css';document.head.append(l);
 });
 await page.waitForFunction(()=>previewReview.art.spriteArtStatus().every(a=>a.ready||a.failed));
 const classes=await page.evaluate(()=>Object.keys(previewReview.animation.CLASS_PREVIEW_DEMOS));
 for(const id of classes){
  await page.locator(`[data-creator-class="${id}"]`).hover();
  assert.equal(await page.evaluate(()=>document.querySelector('#characterCreatorOverlay').__creatorDemo.classId),id);
  for(const [phase,time]of [['cast',.65],['skill',2.05],['rest',4.8]]){
   await page.evaluate(time=>{document.querySelector('#characterCreatorOverlay').__creatorDemo.startedAt=performance.now()/1000-time;},time);
   await page.waitForTimeout(50);
   const image=await page.locator('[data-creator-preview]').evaluate(c=>c.toDataURL());
   frames.push({id,phase,image});
   await page.locator('[data-creator-preview]').screenshot({path:`${out}/${id}-${phase}.png`});
  }
  const result=await page.evaluate(id=>{
   const r=previewReview,a=r.animation,samples=[.4,1.95].map(t=>a.sampleClassPreviewDemo(id,t));
   const poses=samples.map(({action,time})=>{
    const actor={classId:id,equipment:{weapon:({classless:'noviceBlade',gravecaller:'graveScythe',thornbinder:'rootStaff',waverider:'tideglassRapier',lightbringer:'crackedDawnlens',oathkeeper:'oathkeepersMace',fellhunter:'hunterBow',eldritch:'eldritchConduit'})[id]},dirX:1,dirY:0,isMoving:false};
    if(action.id==='sword')actor.combatState={attacking:true,attackElapsed:time-action.startedAt,attackMove:{duration:.62,kind:'arc',comboType:'light',activeStart:.18,activeEnd:.34}};
    else if(action.id==='guard')actor.actionState={blocking:true};
    else actor.visualAction={abilityId:action.id,startedAt:action.startedAt,duration:action.duration};
    return r.poses.getHumanAnimationPose(actor,{now:time}).state;
   });
   const overlay=document.querySelector('#characterCreatorOverlay'),demo=overlay.__creatorDemo;
   document.querySelector(`[data-creator-class="${id}"]`).click();
   return {id,actions:samples.map(s=>s.action.id),poses,sameSelectionKeptTimer:overlay.__creatorDemo===demo,playerUntouched:JSON.stringify(r.game.player)===r.baseline};
  },id);
  assert(result.poses.every(p=>p!=='idle'&&p!=='walk'),id+' needs a stationary action pose');
  assert(result.sameSelectionKeptTimer);assert(result.playerUntouched);report.push(result);
 }
 // Every preview must actually change across its cast, skill and resting frames.
 for(const id of classes){const f=frames.filter(f=>f.id===id);assert(new Set(f.map(f=>f.image)).size===3,id+' animation frames were identical');}
 await page.evaluate(async()=>{
  const r=previewReview;document.querySelector('[data-creator-class="gravecaller"]').click();
  const prior=document.querySelector('#characterCreatorOverlay').__creatorDemo;
  r.creator.handleCharacterCreatorControllerInput({downPressed:true});
  const o=document.querySelector('#characterCreatorOverlay');
  if(o.__creatorDemo.classId!=='thornbinder')throw Error('Controller selection did not start Thornbinder demo');
  if(o.__creatorDemo.summon.x!==0||o.__creatorDemo.effects===prior.effects||o.__creatorDemo.summon===prior.summon)throw Error('New selection retained prior effect state');
  document.querySelector('[data-creator-class="waverider"]').focus();
  if(o.__creatorDemo.classId!=='waverider')throw Error('Keyboard focus did not update the preview');
 });
 for(const [width,height]of [[1920,1080],[1280,720],[800,600],[640,360]]){
  await page.setViewportSize({width,height});await page.waitForTimeout(80);
  const fit=await page.locator('[data-creator-preview]').evaluate(c=>{const r=c.getBoundingClientRect(),s=c.closest('.creator-canvas-shell').getBoundingClientRect();return {visible:r.width>50&&r.height>80,fits:r.top>=s.top-1&&r.bottom<=s.bottom+1&&r.left>=s.left-1&&r.right<=s.right+1};});
  assert(fit.visible&&fit.fits,'Preview must fit and remain visible '+width+' '+JSON.stringify(fit));
  await page.screenshot({path:`${out}/menu-${width}.png`});
 }
 await page.evaluate(()=>{
  const r=previewReview;document.querySelector('[data-creator-proceed]').click();
  if(document.querySelector('#characterCreatorOverlay').__creatorWorkingState.currentStep!=='appearance')throw Error('Appearance flow broken');
  if(JSON.stringify(r.game.player)!==r.baseline)throw Error('Demo changed saved player');
  r.creator.closeCharacterCreator();const o=document.querySelector('#characterCreatorOverlay');
  if(o.__creatorPreviewFrame!==null||o.__creatorDemo!==null)throw Error('Preview did not clean up');
  r.game.player.hiddenClassUnlocks={};r.creator.openCharacterCreator(r.game);
  if(document.querySelector('[data-creator-class="eldritch"]'))throw Error('Demo exposed locked class');
  r.creator.closeCharacterCreator();
 });
 assert.deepEqual(errors,[]);
 await page.setViewportSize({width:1520,height:990});
 await page.evaluate(frames=>{
  document.body.innerHTML='<div id="preview-contact" style="display:grid;grid-template-columns:repeat(4,380px);background:#111;color:#eee;font:18px Georgia">'+frames.filter(f=>f.phase==='skill').map(f=>`<section><div style="padding:10px">${f.id}</div><img style="display:block;width:380px;height:440px;image-rendering:pixelated" src="${f.image}"></section>`).join('')+'</div>';
 },frames);
 await page.locator('#preview-contact').screenshot({path:`${out}/all-classes.png`});
 fs.writeFileSync(`${out}/verification.json`,JSON.stringify({classes:report,viewports:4,errors},null,2));
 console.log('PASS: eight distinct pixel-art class demos; actual mouse and controller selection; repeat selection preserves timing; four visible, fitted preview layouts; no player changes; locked class preserved; animation cleaned up.');
 await browser.close();
})().catch(e=>{console.error(e);process.exit(1)});


