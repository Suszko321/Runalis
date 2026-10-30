// Smoke-test the actual staged package at both root and a Pages project path.
const fs = require('node:fs');
const path = require('node:path');
const http = require('node:http');
const assert = require('node:assert/strict');
const { chromium } = require(process.env.RUNALIS_NODE_MODULES + '/playwright');
const root = path.resolve(__dirname, '..');
const staged = path.join(root, '_site');
const out = path.join(root, 'tmp', 'pages-verification');
fs.mkdirSync(out, { recursive: true });
const types = { '.html':'text/html', '.js':'text/javascript', '.css':'text/css', '.json':'application/json', '.svg':'image/svg+xml', '.png':'image/png', '.webp':'image/webp', '.woff2':'font/woff2', '.woff':'font/woff', '.ttf':'font/ttf' };
const server = http.createServer((req, res) => {
  let relative = decodeURIComponent(new URL(req.url, 'http://localhost').pathname);
  if (relative.startsWith('/Runalis/')) relative = relative.slice('/Runalis'.length);
  if (relative.endsWith('/')) relative += 'index.html';
  const file = path.resolve(staged, '.' + relative);
  if (!file.startsWith(staged + path.sep) || !fs.existsSync(file) || !fs.statSync(file).isFile()) { res.writeHead(404); res.end(); return; }
  res.writeHead(200, { 'Content-Type': types[path.extname(file)] || 'application/octet-stream', 'Cache-Control':'no-store' });
  fs.createReadStream(file).pipe(res);
});

async function smoke(browser, url, label) {
  const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });
  const errors = [], failures = [], requests = [];
  page.on('pageerror', e => errors.push(e.message));
  page.on('response', r => { requests.push(r.url()); if (r.status() >= 400) failures.push(`${r.status()} ${r.url()}`); });
  page.on('requestfailed', r => failures.push(`${r.failure()?.errorText} ${r.url()}`));
  await page.goto(url);
  await page.locator('#createProfileBtn').click();
  await page.locator('[data-creator-class]').first().waitFor({ timeout: 30000 });
  const creator = page.locator('#characterCreatorOverlay');
  const game = await creator.evaluate(e => { window.__pagesGame = e.__runalisGame; return { renderer: !!e.__runalisGame?.ctx, world: e.__runalisGame?.world?.name }; });
  await page.locator('[data-creator-class="oathkeeper"]').click();
  await page.locator('[data-creator-proceed]').click();
  await page.locator('[data-creator-start]').click();
  await page.waitForFunction(() => !document.querySelector('#characterCreatorOverlay').classList.contains('active'));
  await page.waitForTimeout(1500);
  await page.screenshot({ path: path.join(out, `${label}-started.png`) });
  await page.keyboard.press('Enter');
  await page.waitForTimeout(1600);
  // Mara's existing opening conversation may temporarily own input.
  for (let i = 0; i < 16 && await page.evaluate(() => __pagesGame.dialogue.active); i++) {
    await page.keyboard.press('Enter'); await page.waitForTimeout(150);
  }
  const before = await page.evaluate(() => ({ x: __pagesGame.player.x, y: __pagesGame.player.y }));
  await page.keyboard.down('d'); await page.waitForTimeout(600); await page.keyboard.up('d');
  const after = await page.evaluate(() => ({ x: __pagesGame.player.x, y: __pagesGame.player.y }));
  assert(before.x !== after.x || before.y !== after.y, 'Player did not move');
  await page.keyboard.press('Space');
  await page.waitForTimeout(250);
  // Use the existing sprite status API, resolved relative to the hosted path.
  const sprites = await page.evaluate(async () => (await import(new URL('src/spriteArt.js', location.href))).spriteArtStatus());
  assert(sprites.some(s => s.ready), 'No sprite atlas rendered');
  assert.deepEqual(sprites.filter(s => s.failed), [], 'Failed sprite atlas');
  const details = await page.evaluate(() => ({ classId:__pagesGame.player.classId, world:__pagesGame.world.name, audioState:__pagesGame.audio?.ctx?.state }));
  if (await page.evaluate(() => __pagesGame.dialogue.active)) await page.keyboard.press('Escape');
  await page.screenshot({ path: path.join(out, `${label}-gameplay.png`) });
  // Open the real pause menu, then resume and return through the existing binding.
  await page.keyboard.press('Escape'); await page.waitForTimeout(100);
  await page.keyboard.press('Escape');
  await page.evaluate(() => document.querySelector('#menuBtn').click());
  await page.locator('#mainMenu.active').waitFor();
  assert(await page.locator('#profileList [data-load]').count() > 0, 'Profile was not saved');
  await page.evaluate(() => {
    window.__pagesPad = { id:'Deployment test controller',index:0,connected:true,mapping:'standard',axes:[0,0,0,0],buttons:Array.from({length:16},()=>({pressed:false,value:0})) };
    Object.defineProperty(navigator,'getGamepads',{configurable:true,value:()=>[__pagesPad]});
  });
  async function pressPad(index) {
    await page.evaluate(async index => {
      __pagesPad.buttons[index]={pressed:true,value:1};
      for(let i=0;i<4;i++)await new Promise(requestAnimationFrame);
      __pagesPad.buttons[index]={pressed:false,value:0};
      for(let i=0;i<4;i++)await new Promise(requestAnimationFrame);
    }, index);
  }
  await pressPad(1);
  const firstFocus = await page.locator('#mainMenu .controller-focus').getAttribute('id');
  await pressPad(13);
  const nextFocus = await page.locator('#mainMenu .controller-focus').getAttribute('id');
  assert.notEqual(firstFocus,nextFocus,'Controller menu navigation did not move');
  assert.deepEqual(errors, [], 'Browser exceptions'); assert.deepEqual(failures, [], 'Failed requests');
  const result = { label, url, renderer:game.renderer, details, movement:{before,after}, readySprites:sprites.filter(s=>s.ready).length, requests:requests.length, errors, failures, savedAndReturned:true, simulatedController:true };
  await page.close(); return result;
}

(async () => {
  await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
  const origin = `http://127.0.0.1:${server.address().port}`;
  const browser = await chromium.launch({ channel: 'msedge', headless: true });
  try {
    const results = [];
    for (const [label, url] of [['local',origin+'/'],['project-path',origin+'/Runalis/']]) results.push(await smoke(browser,url,label));
    if (process.env.RUNALIS_LIVE_URL) results.push(await smoke(browser,process.env.RUNALIS_LIVE_URL,'live'));
    fs.writeFileSync(path.join(out,'results.json'), JSON.stringify(results,null,2));
    console.log(JSON.stringify(results,null,2));
  } finally { await browser.close(); server.close(); }
})().catch(e => { console.error(e); server.close(); process.exitCode=1; });
