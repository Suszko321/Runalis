const {chromium}=require(process.env.RUNALIS_NODE_MODULES+'/playwright'),assert=require('node:assert/strict');
(async()=>{const browser=await chromium.launch({channel:'msedge',headless:true}),page=await browser.newPage(),errors=[];page.on('pageerror',e=>errors.push(e.message));
for(const [width,height] of [[1440,900],[1280,720],[800,600],[640,360]]){
 await page.setViewportSize({width,height});await page.goto('http://127.0.0.1:8768/creator-lab.html');await page.waitForSelector('[data-creator-class]');
 await page.evaluate(()=>{const l=document.createElement('link');l.rel='stylesheet';l.href='/lexicon.css';document.head.append(l);});await page.waitForTimeout(300);
 const classFit=await page.evaluate(()=>{const panel=document.querySelector('.character-creator-panel').getBoundingClientRect();return [...document.querySelectorAll('[data-creator-class]')].map(b=>({name:b.textContent.trim(),fits:b.getBoundingClientRect().top>=panel.top&&b.getBoundingClientRect().bottom<=panel.bottom,rect:b.getBoundingClientRect().toJSON()}));});
 assert(classFit.every(c=>c.fits),'Class options clipped '+width+' '+JSON.stringify(classFit));
 await page.screenshot({path:`docs/visual-production/creator-classes-${width}.png`});
 await page.evaluate(async()=>{const {handleCharacterCreatorControllerInput}=await import('/src/characterCreator.js');handleCharacterCreatorControllerInput({rtPressed:true});});assert.equal(await page.locator('.creator-detail-tabs,.creator-detail-pager,.class-card-glyph').count(),0);
 await page.locator('[data-creator-proceed]').click();await page.waitForTimeout(100);
 const fit=await page.evaluate(()=>{const panel=document.querySelector('.character-creator-panel').getBoundingClientRect(),group=document.querySelector('.creator-appearance-groups').getBoundingClientRect();return [...document.querySelectorAll('[data-creator-row]')].map(b=>({id:b.dataset.creatorField,fit:b.getBoundingClientRect().bottom<=Math.min(panel.bottom,group.bottom)+1&&b.getBoundingClientRect().top>=group.top-1}));});
 await page.screenshot({path:`docs/visual-production/creator-appearance-${width}.png`});assert.equal(fit.length,11);
 const navigation=await page.evaluate(async()=>{
  const {handleCharacterCreatorControllerInput}=await import('/src/characterCreator.js');
  document.querySelector('[data-creator-name]').focus();const reached=[],changes=[];
  for(let i=0;i<14;i++){
   handleCharacterCreatorControllerInput({downPressed:true});const current=document.activeElement;
   reached.push(current.dataset.focusId);
   if(current.matches('[data-creator-row]')){
    const field=current.dataset.creatorField,before=current.querySelector('strong').textContent;
    handleCharacterCreatorControllerInput({rightPressed:true});
    const after=document.querySelector(`[data-creator-field="${field}"] strong`).textContent;
    changes.push({field,changed:before!==after});
    handleCharacterCreatorControllerInput({leftPressed:true});
   }
  }
  const reverse=[];for(let i=0;i<14;i++){handleCharacterCreatorControllerInput({upPressed:true});reverse.push(document.activeElement.dataset.focusId);}
  return {reached,reverse,changes,removed:document.querySelectorAll('[data-creator-field="accessory"],[data-creator-field="marking"],[data-creator-field="cloak"]').length};
 });
 assert.equal(navigation.removed,0);assert.equal(navigation.changes.length,11);assert(navigation.changes.every(c=>c.changed),'Every row can change its value');
 assert.equal(new Set(navigation.reached).size,14,'All eleven rows and three action buttons must be reachable');
 assert.equal(navigation.reverse.at(-1),'appearance-name');assert(fit.every(f=>f.fit),'Appearance controls clipped '+width+' '+JSON.stringify(fit));
 await page.screenshot({path:`docs/visual-production/creator-appearance-${width}.png`});
}
await page.setViewportSize({width:1000,height:700});
await page.evaluate(async()=>{const {closeCharacterCreator}=await import('/src/characterCreator.js');closeCharacterCreator();const pane=document.createElement('div');pane.className='panel open';pane.style='position:fixed;inset:20px;display:block;';pane.innerHTML='<div id="sheet-test" style="height:260px;overflow:auto;width:400px">'+Array.from({length:25},(_,i)=>`<button style="display:block;height:36px;width:100%">Option ${i+1}</button>`).join('')+'</div>';document.body.append(pane);const {prepareMenuSheets}=await import('/src/menuSheets.js');prepareMenuSheets();});
assert.equal(await page.locator('#sheet-test .menu-sheet-controls').count(),0);
const reached=new Set();
for(const option of await page.locator('#sheet-test button').all()){
 await option.focus();const fit=await option.evaluate(e=>{const r=e.getBoundingClientRect(),p=e.parentElement.getBoundingClientRect();return r.top>=p.top&&r.bottom<=p.bottom;});
 assert(fit,'Focused rows should be revealed without switching sheets');reached.add(await option.innerText());
}
assert.equal(reached.size,25,'Every option must remain reachable in a continuous list');
await page.goto('http://127.0.0.1:8768/index.html');await page.waitForTimeout(1500);
assert.deepEqual(errors,[]);console.log('PASS: all classes and all 11 appearance controls fit at four sizes; class details have no tabs; continuous lists reveal focused controls without paging; no browser errors.');await browser.close();})().catch(e=>{console.error(e);process.exit(1);});
