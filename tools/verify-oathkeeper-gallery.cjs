const {chromium}=require(process.env.RUNALIS_NODE_MODULES+'/playwright');
const fs=require('node:fs'),assert=require('node:assert/strict');
(async()=>{
 const browser=await chromium.launch({channel:'msedge',headless:true});
 try{
  const page=await browser.newPage({viewport:{width:1440,height:1000}}),errors=[],missing=[];
  page.on('pageerror',e=>errors.push(e.message));page.on('response',r=>{if(r.status()>=400)missing.push(r.url());});
  await page.goto('http://127.0.0.1:8768/docs/oathkeeper-blunt/');await page.waitForFunction(()=>document.querySelector('#strike').textContent!=='Loading the mace…');
  assert.equal(await page.locator('.card').count(),12);const a=await page.locator('#drill').screenshot();await page.waitForTimeout(350);const b=await page.locator('#drill').screenshot();assert(!a.equals(b),'The drill must animate');
  await page.selectOption('#direction','west');await page.selectOption('#attack','heavy');await page.waitForFunction(()=>document.querySelector('#strike').textContent==='Heavy Mace Blow');
  await page.locator('#pause').click();assert.equal(await page.locator('#pause').textContent(),'Resume');await page.locator('#pause').click();
  await page.locator('[data-family="holyknight"]').click();assert.equal(await page.locator('.card').count(),12);assert((await page.locator('.card a').first().getAttribute('href')).includes('morph=holyknight'));
  await page.locator('[data-family="all"]').click();assert.equal(await page.locator('.card').count(),48);
  await page.evaluate(()=>{for(const img of document.querySelectorAll('.card img'))img.loading='eager';});await page.waitForFunction(()=>[...document.querySelectorAll('.card img')].every(i=>i.complete&&i.naturalWidth>0));
  await page.locator('.picture').first().click();assert(await page.locator('#zoom').evaluate(e=>e.open));await page.locator('#close').click();
  assert.equal(await page.locator('audio').count(),6);await page.locator('[data-family="base"]').click();await page.screenshot({path:'docs/oathkeeper-blunt/preview-page.png'});
  assert.deepEqual(errors,[]);assert.deepEqual(missing,[]);const report={forms:48,liveDrill:'animated',heavyFacing:'west',pause:'passed',filters:'passed',zoom:'passed',audioSamples:6,errors,missing};
  fs.writeFileSync('docs/oathkeeper-blunt/gallery-verification.json',JSON.stringify(report,null,2));console.log(JSON.stringify(report));
 }finally{await browser.close();}
})().catch(e=>{console.error(e);process.exitCode=1;});
