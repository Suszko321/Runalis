const {chromium}=require(process.env.RUNALIS_NODE_MODULES+'/playwright');
const {createCanvas,loadImage}=require(process.env.RUNALIS_NODE_MODULES+'/@napi-rs/canvas');
const fs=require('node:fs');
(async()=>{
 const browser=await chromium.launch({channel:'msedge',headless:true});
 const report={errors:[],broken:[],directSkills:[]};
 try{
  const page=await browser.newPage({viewport:{width:1440,height:1000}});page.on('pageerror',e=>report.errors.push(e.message));
  await page.goto('http://127.0.0.1:8766/docs/combat-overhaul/skill-art.html');
  await page.evaluate(async()=>{for(const d of document.querySelectorAll('details'))d.open=true;for(const i of document.images)i.loading='eager';await Promise.all(Array.from(document.images,i=>i.decode().catch(()=>{})));});
  report.broken=await page.evaluate(()=>Array.from(document.images).filter(i=>!i.naturalWidth).map(i=>i.src));
  report.images=await page.locator('img').count();
  await page.screenshot({path:'docs/combat-overhaul/skill-art-gallery.png'});
  await page.setViewportSize({width:800,height:700});report.compactOverflow=await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth);
  await page.screenshot({path:'docs/combat-overhaul/skill-art-gallery-compact.png'});
  for(const id of ['oathkeeperBastionBash','fellhunterBearTrap','graveSpark','thornbinderSeedReliquary','hydromancerWellspring','lightbringerDawncarver','eldritchCrimsonConduit','hellfireBrand','seraphicAegis','crimsonFeast']){
   await page.goto('http://127.0.0.1:8766/combat-overhaul-lab.html?skill='+id);await page.waitForFunction(()=>window.combatReview?.game?.player);
   const result=await page.evaluate(async(id)=>{const {game:g}=window.combatReview;g.paused=true;g.dev.refill();g.dev.clearCooldowns();const {useAbility}=await import('/src/combat.js');g.world.enemies=[];g.dev.spawn('boss',350,320);g.player.dirX=1;g.player.dirY=0;const messages=[];return {id,equipped:g.player.loadout.abilitySlots[3],used:useAbility(3,g.player,g.world,m=>messages.push(m),performance.now()/1000,{rightStickActive:true,rightStickAimX:1,rightStickAimY:0,ability3Held:true}),messages};},id);
   report.directSkills.push(result);
  }
  const catalogue=await page.evaluate(async()=>{const {ABILITIES}=await import('/src/data.js');return ABILITIES.map(a=>({id:a.id,name:a.name,classId:a.classId||'shared'}));});
  const canvas=createCanvas(1200,Math.ceil(catalogue.length/8)*110+48),ctx=canvas.getContext('2d');ctx.fillStyle='#182226';ctx.fillRect(0,0,canvas.width,canvas.height);ctx.fillStyle='#edd9b4';ctx.font='22px Georgia';ctx.fillText('RUNALIS · 85 DIFFERENT ACTIVE SKILL ICONS',20,30);
  for(let i=0;i<catalogue.length;i++){const a=catalogue[i],x=i%8*150,y=Math.floor(i/8)*110+48,picture=await loadImage('assets/combat-icons/'+a.id+'.svg');ctx.drawImage(picture,x+47,y+3,56,56);ctx.fillStyle='#e9dcc5';ctx.font='11px sans-serif';ctx.textAlign='center';const words=a.name.split(' ');let line='',row=0;for(const word of words){if(ctx.measureText(line+' '+word).width>143){ctx.fillText(line,x+75,y+75+row++*13);line=word;}else line+=(line?' ':'')+word;}ctx.fillText(line,x+75,y+75+row*13);}
  fs.writeFileSync('docs/combat-overhaul/icons-active.png',canvas.toBuffer('image/png'));
  fs.writeFileSync('docs/combat-overhaul/skill-art-browser-results.json',JSON.stringify(report,null,2)+'\n');console.log(JSON.stringify(report,null,2));
  if(report.errors.length||report.broken.length||report.compactOverflow||report.directSkills.some(a=>!a.used||a.equipped!==a.id))process.exitCode=1;
 }finally{await browser.close();}
})().catch(e=>{console.error(e);process.exitCode=1;});
