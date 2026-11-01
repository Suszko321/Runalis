// Check the shipped bundle directly; do not import a second source module graph.
const fs = require('node:fs');
const path = require('node:path');
const http = require('node:http');
const assert = require('node:assert/strict');
const {chromium} = require(process.env.RUNALIS_NODE_MODULES + '/playwright');
const staged = path.resolve(__dirname, '../_site');
const out = path.resolve(__dirname, '../docs/engineering-audit');
const key = 'runalis-profiles-v7-slim-save';
const cycleCount = Number(process.argv.find(arg=>arg.startsWith('--cycles='))?.split('=')[1] || 3);
assert(Number.isInteger(cycleCount) && cycleCount>=3 && cycleCount<=20, 'Use --cycles=3 through --cycles=20');
const mime = {'.html':'text/html','.js':'text/javascript','.css':'text/css','.json':'application/json',
  '.webmanifest':'application/manifest+json','.png':'image/png','.webp':'image/webp','.svg':'image/svg+xml','.woff2':'font/woff2'};
const server = http.createServer((request, response) => {
  let relative = decodeURIComponent(new URL(request.url, 'http://localhost').pathname).replace(/^\/Runalis\//,'/');
  if (relative.endsWith('/')) relative += 'index.html';
  const file = path.resolve(staged, '.' + relative);
  if (!file.startsWith(staged + path.sep) || !fs.existsSync(file) || !fs.statSync(file).isFile()) {
    response.writeHead(404); response.end(); return;
  }
  response.writeHead(200, {'Content-Type':mime[path.extname(file)] || 'application/octet-stream','Cache-Control':'no-store'});
  fs.createReadStream(file).pipe(response);
});
async function smoke(browser, origin, prefix) {
  const context = await browser.newContext({viewport:{width:1280,height:800}});
  const page = await context.newPage(), errors = [], failures = [], sprites = new Set();
  page.on('pageerror', error => errors.push(error.message));
  page.on('response', response => {
    if (response.status() >= 400) failures.push(`${response.status()} ${response.url()}`);
    if (/\/assets\/art\/sprites\/.+\.png/.test(response.url()) && response.ok()) sprites.add(response.url());
  });
  page.on('requestfailed', request => failures.push(`${request.failure()?.errorText} ${request.url()}`));
  await page.addInitScript(key => {
    if (localStorage.getItem(key)) return;
    localStorage.setItem(key, JSON.stringify({engineering:{id:'engineering',name:'Engineering fixture',updated:1,state:{
      version:18,worldMode:'capital',worldName:'Orrakai',player:{name:'Engineering fixture',profileId:'engineering',
        classId:'oathkeeper',className:'Oathkeeper',characterCreationComplete:true,capitalUnlocked:true,
        act1OpeningPending:false,gold:37,story:{flags:{opening:{introPlayed:true,maraConversationComplete:true}}}}
    }}}));
  }, key);
  const cdp = await context.newCDPSession(page);
  await cdp.send('Performance.enable');
  await page.goto(origin + prefix);
  await page.waitForFunction(() => !document.querySelector('#mainMenu').inert);
  const cycles = [];
  for (let cycle=0;cycle<cycleCount;cycle++) {
    await page.locator('[data-load="engineering"]').click();
    await page.waitForFunction(() => document.getElementById('pauseOverlay')?.__runalisGame?.started &&
      !document.querySelector('#loadingScreen')?.classList.contains('active'));
    const loaded = await page.evaluate(() => {
      const game = document.getElementById('pauseOverlay').__runalisGame;
      window.__engineeringGame = game;
      window.__engineeringDraws = 0;
      const draw = game.drawWorld.bind(game);
      game.drawWorld = () => {window.__engineeringDraws++; return draw();};
      return {gold:game.player.gold,world:game.world.name};
    });
    assert.equal(loaded.gold,37+cycle,'Save/reload lost character gold');
    const before = await page.evaluate(() => ({x:__engineeringGame.player.x,y:__engineeringGame.player.y}));
    for (const key of ['d','s','a','w']) {
      await page.keyboard.down(key); await page.waitForTimeout(100); await page.keyboard.up(key);
      if (await page.evaluate(before => Math.hypot(__engineeringGame.player.x-before.x,__engineeringGame.player.y-before.y)>1,before)) break;
    }
    assert(await page.evaluate(before => Math.hypot(__engineeringGame.player.x-before.x,__engineeringGame.player.y-before.y)>1,before),'Player movement failed');
    await page.keyboard.press('Space');
    const frame = await page.evaluate(async () => {
      const samples = []; let previous = performance.now();
      for (let i=0;i<90;i++) {
        const next = await new Promise(requestAnimationFrame); samples.push(next-previous); previous=next;
      }
      samples.sort((a,b)=>a-b);
      return {samples:samples.length,p50:samples[45],p95:samples[85],max:samples.at(-1)};
    });
    if (cycle===0) await page.screenshot({path:path.join(out,prefix==='/'?'package-root.png':'package-project.png')});
    assert(await page.evaluate(() => {__engineeringGame.player.gold++; return __engineeringGame.save(false);}), 'Actual game save failed');
    await page.evaluate(() => __engineeringGame.saveAndQuit());
    await page.locator('#mainMenu.active').waitFor();
    const draws = await page.evaluate(() => window.__engineeringDraws);
    await page.waitForTimeout(120);
    assert.equal(await page.evaluate(() => window.__engineeringDraws),draws,'Destroyed game kept drawing');
    assert(await page.evaluate(() => __engineeringGame.destroyed && !__engineeringGame.started));
    await page.evaluate(() => {window.__engineeringGame=null;});
    await cdp.send('HeapProfiler.collectGarbage');
    const metrics = Object.fromEntries((await cdp.send('Performance.getMetrics')).metrics.map(item=>[item.name,item.value]));
    cycles.push({cycle,world:loaded.world,frameIntervalsMs:frame,heapBytes:metrics.JSHeapUsedSize,eventListeners:metrics.JSEventListeners});
  }
  assert(sprites.size>0,'Bundled renderer requested no sprite atlases');
  assert.deepEqual(errors,[]); assert.deepEqual(failures,[]);
  await context.close();
  return {prefix,cycles,spriteResponses:sprites.size,errors,failures};
}
(async () => {
  fs.mkdirSync(out,{recursive:true});
  await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));
  const origin = `http://127.0.0.1:${server.address().port}`;
  const browser = await chromium.launch({channel:'msedge',headless:true});
  try {
    const results = [];
    for (const prefix of ['/','/Runalis/']) results.push(await smoke(browser,origin,prefix));
    fs.writeFileSync(path.join(out,'browser-verification.json'),JSON.stringify(results,null,2)+'\n');
    console.log(JSON.stringify(results,null,2));
  } finally {await browser.close(); await new Promise(resolve=>server.close(resolve));}
})().catch(error=>{console.error(error);server.close();process.exitCode=1;});
