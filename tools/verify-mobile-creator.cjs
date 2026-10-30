const {chromium}=require(process.env.RUNALIS_NODE_MODULES+'/playwright');
const assert=require('node:assert/strict');
const fs=require('node:fs');

(async()=>{
 const browser=await chromium.launch({channel:'msedge',headless:true});
 const errors=[],results=[];
 fs.mkdirSync('tmp/mobile-creator',{recursive:true});
 try {
  for(const [width,height] of [[390,844],[360,640],[430,932],[844,390],[740,360],[640,360],[1024,768]]) {
   const page=await browser.newPage({viewport:{width,height},isMobile:true,hasTouch:true});
   console.log(`Checking ${width}x${height}`);
   page.on('pageerror',e=>{errors.push(e.message);console.error(e.message);});
   await page.goto('http://127.0.0.1:8768/creator-lab.html');
   await page.waitForSelector('[data-creator-class]',{state:'attached'});
   await page.addStyleTag({url:'/mobile-controls.css'});
   await page.addStyleTag({url:'/mobile-text.css'});
   await page.evaluate(()=>document.body.classList.add('mobile-input'));
   const measure=()=>page.evaluate(()=>{
    const root=document.querySelector('#characterCreatorOverlay');
    const rect=s=>root.querySelector(s).getBoundingClientRect().toJSON();
    const panel=root.querySelector('.character-creator-panel');
    const selectors=['.creator-class-list-panel','.creator-preview-panel','.creator-info-panel','.creator-appearance-panel','[data-creator-row]','.creator-action-row button','[data-creator-class]','[data-creator-code-input]','[data-creator-code-submit]'];
    const outside=selectors.flatMap(s=>[...root.querySelectorAll(s)]).filter(e=>{
     const r=e.getBoundingClientRect();return r.width<1||r.height<1||r.x<0||r.y<0||r.right>innerWidth+1||r.bottom>innerHeight+1;
    }).map(e=>e.className||e.outerHTML);
    const overflow=[...root.querySelectorAll('.creator-dossier,.creator-appearance-groups,.selector-copy,.creator-class-list')].filter(e=>e.scrollHeight>e.clientHeight+2||e.scrollWidth>e.clientWidth+2).map(e=>({class:e.className,scroll:[e.scrollWidth,e.scrollHeight],size:[e.clientWidth,e.clientHeight]}));
    return {preview:rect('.creator-preview-panel'),left:root.querySelector('.creator-class-list-panel')?rect('.creator-class-list-panel'):null,right:rect('.creator-info-panel,.creator-appearance-panel'),outside,overflow,panelScroll:panel.scrollHeight>panel.clientHeight+2};
   });
   const classes=await page.locator('[data-creator-class]').evaluateAll(es=>es.map(e=>e.dataset.creatorClass));
   for(const id of classes){
    await page.locator(`[data-creator-class="${id}"]`).click();
    const m=await measure();
    assert(m.left.right<=m.preview.left&&m.preview.right<=m.right.left,`${width}: class columns`);
    assert.deepEqual(m.outside,[],`${width}: class controls outside viewport`);
    assert.deepEqual(m.overflow,[],`${width}: ${id} clipped content`);
    assert(!m.panelScroll,`${width}: class page scrolls`);
   }
   await page.screenshot({path:`tmp/mobile-creator/classes-${width}.png`});
   await page.locator('[data-creator-proceed]').click();
   assert.equal(await page.locator('[data-creator-row]').count(),11);
   const appearance=await measure();
   assert(appearance.preview.right<=appearance.right.left,`${width}: appearance columns`);
   assert(Math.abs(appearance.preview.width-appearance.right.width)<2,`${width}: preview occupies half`);
   assert.deepEqual(appearance.outside,[],`${width}: appearance controls outside viewport`);
   assert.deepEqual(appearance.overflow,[],`${width}: appearance clipped content`);
   assert(!appearance.panelScroll,`${width}: appearance page scrolls`);
   const before=await page.locator('[data-creator-row]').first().innerText();
   await page.locator('[data-creator-next]').first().click();
   assert.notEqual(await page.locator('[data-creator-row]').first().innerText(),before);
   await page.locator('[data-creator-prev]').first().click();
   assert.equal(await page.locator('[data-creator-row]').first().innerText(),before);
   await page.locator('[data-creator-name]').fill('Mobile Hero');
   await page.locator('[data-creator-randomize]').click();
   assert.equal(await page.locator('[data-creator-name]').inputValue(),'Mobile Hero');
   // Exercise every option, including the longest labels at short landscape sizes.
   for(const field of await page.locator('[data-creator-row]').evaluateAll(es=>es.map(e=>e.dataset.creatorField))){
    const values=new Set();
    for(let i=0;i<40;i++){
     const row=page.locator(`[data-creator-field="${field}"]`);
     const value=await row.locator('strong').innerText();
     if(values.has(value))break;
     values.add(value);
     const fits=await row.evaluate(e=>{
      const row=e.getBoundingClientRect(),text=e.querySelector('.selector-copy').getBoundingClientRect();
      return text.top>=row.top-1&&text.bottom<=row.bottom+1&&text.left>=row.left&&text.right<=row.right;
     });
     assert(fits,`${width}x${height}: clipped ${field} option ${value}`);
     await row.locator('[data-creator-next]').click();
    }
   }
   await page.screenshot({path:`tmp/mobile-creator/appearance-${width}.png`});
   await page.locator('[data-creator-back]').click();
   assert.equal(await page.locator('[data-creator-class]').count(),classes.length);
   results.push({width,height,classes:classes.length,appearance});
   await page.close();
  }
  // Also exercise the real entry point and final submission (the lab blocks it).
  const live=await browser.newPage({viewport:{width:390,height:844},isMobile:true,hasTouch:true});
  live.on('pageerror',e=>errors.push(e.message));
  await live.goto('http://127.0.0.1:8768/');
  await live.locator('[data-home-screen-continue]').click();
  await live.locator('[data-mobile-portrait]').click();
  assert.equal(await live.locator('#profileName').count(),0);
  await live.locator('#createProfileBtn').click();
  await live.locator('[data-creator-class="oathkeeper"]').click();
  assert(await live.locator('body').evaluate(e=>e.classList.contains('mobile-input')));
  await live.locator('[data-creator-proceed]').click();
  assert.equal(await live.locator('[data-creator-row]').count(),11);
  await live.locator('[data-creator-name]').fill('Mobile Hero');
  await live.locator('#characterCreatorOverlay').evaluate(e=>{window.mobileCreatorGame=e.__runalisGame;});
  await live.locator('[data-creator-start]').click();
  await live.waitForFunction(()=>!document.querySelector('#characterCreatorOverlay').classList.contains('active'));
  assert.equal(await live.evaluate(()=>window.mobileCreatorGame.player.name),'Mobile Hero');
  await live.close();
  assert.deepEqual(errors,[]);
  fs.writeFileSync('tmp/mobile-creator/verification.json',JSON.stringify(results,null,2));
  console.log(`PASS: mobile creator fits at ${results.length} portrait, landscape and tablet sizes; all appearance options, arrows, randomization, name, back navigation and real game creation work.`);
 } finally {await browser.close();}
})().catch(e=>{console.error(e);process.exitCode=1;});
