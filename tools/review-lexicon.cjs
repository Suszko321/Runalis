const {chromium}=require('C:/Users/austi/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright');
const fs=require('fs');
(async()=>{
const browser=await chromium.launch({channel:'msedge',headless:true});const page=await browser.newPage({viewport:{width:1920,height:1080}});const errors=[];page.on('pageerror',e=>errors.push(e.message));
await page.goto('http://127.0.0.1:8766/');await page.waitForTimeout(1000);await page.screenshot({path:'docs/ui-overhaul/title.png'});
await page.click('#creditsBtn');await page.screenshot({path:'docs/ui-overhaul/credits.png'});await page.keyboard.press('Escape');
await page.evaluate(async()=>{const {createPlayer,addItem}=await import('/src/player.js');const {createWorld}=await import('/src/world.js');const {createSaveState,writeProfiles}=await import('/src/gameSave.js');const {ITEMS}=await import('/src/data.js');const world=createWorld(),player=createPlayer('Grave');Object.assign(player,{classId:'gravecaller',className:'Gravecaller',act1OpeningPending:false});for(const [id,v] of Object.entries(ITEMS).filter(([id,v])=>v.slot).slice(0,22))addItem(player,id,1);addItem(player,'fieldRations',12);addItem(player,'paleRune',1);player.equipment={weapon:'graveScythe',helm:'crackedIronCap',chest:'leatherVest',legs:null,trinket:null};const state=createSaveState({world,player,camera:{x:0,y:0},profileId:'lexicon-test',profileName:'Grave'});writeProfiles({'lexicon-test':{id:'lexicon-test',name:'Grave',createdAt:Date.now(),updatedAt:Date.now(),state}});});
await page.reload();await page.locator('[data-load="lexicon-test"]').click();await page.waitForTimeout(2300);
await page.screenshot({path:'docs/ui-overhaul/hud.png'});
await page.locator('#saveBtn').evaluate(e=>e.click());
await page.keyboard.press('Escape');await page.waitForTimeout(100);await page.screenshot({path:'docs/ui-overhaul/pause-live.png'});
await page.locator('#resumeBtn').click();
const saved=await page.evaluate(async()=>{const {readProfiles}=await import('/src/gameSave.js');return !!readProfiles()['lexicon-test']?.state?.player});if(!saved)throw Error('Profile save missing');
console.log('save/pause/resume passed');

console.log('tabs',await page.locator('.tabs').innerText());
for(const tab of ['inventory','character','skills','quests','map','log']){
 await page.locator(`[data-tab="${tab}"]`).evaluate(e=>e.click());await page.waitForTimeout(300);await page.screenshot({path:`docs/ui-overhaul/${tab}.png`});
 console.log(tab,await page.locator('#'+tab).evaluate(e=>({classes:e.className,rect:e.getBoundingClientRect().toJSON(),scroll:[e.scrollWidth,e.clientWidth,e.scrollHeight,e.clientHeight],text:e.innerText.slice(0,120)})));
}
console.log('errors',errors);fs.writeFileSync('docs/ui-overhaul/initial-browser.json',JSON.stringify({errors},null,2));await browser.close();
})().catch(e=>{console.error(e);process.exit(1)});
