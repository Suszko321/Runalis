const {chromium}=require(process.env.RUNALIS_NODE_MODULES+'/playwright');
const assert=require('node:assert/strict'),fs=require('node:fs');
(async()=>{
 const browser=await chromium.launch({channel:'msedge',headless:true});
 const out='docs/gravecaller-animation';fs.mkdirSync(out,{recursive:true});
 try{
  const page=await browser.newPage({viewport:{width:1440,height:1500}}),errors=[];
  page.on('pageerror',e=>errors.push(e.message));
  await page.goto('http://127.0.0.1:8768/combat-overhaul-lab.html?skill=gravecallerSummonLich&morph=acolyte');
  await page.waitForFunction(()=>window.combatReview?.game.player);
  await page.evaluate(async()=>{
   window.motion=await import('/src/gravecallerSummonMotion.js');window.art=await import('/src/codeAssets.js');window.sprites=await import('/src/spriteArt.js');window.forms=await import('/src/lichSummonSystem.js');window.combat=await import('/src/combat.js');
   combatReview.game.paused=true;
  });
  await page.waitForFunction(()=>['summons-core','skeleton-forge','lich-acolyte','lich-deathknight','bound-dead-specter','bound-dead-knight'].every(n=>sprites.asset(n)?.ready));
  const gallery=await page.evaluate(()=>{
   const canvas=document.createElement('canvas');canvas.id='gait-gallery';canvas.width=1440;canvas.height=1450;document.body.appendChild(canvas);const ctx=canvas.getContext('2d');ctx.imageSmoothingEnabled=false;
   ctx.fillStyle='#24392c';ctx.fillRect(0,0,1440,1450);ctx.fillStyle='#f0dcb7';ctx.font='20px Georgia';ctx.fillText('Gravecaller: distance-driven movement / both facings',20,26);
   const profiles=[['greaterLich','base','Lich'],['greaterLich','acolyte','Greater Specter'],['greaterLich','deathknight','Goliath'],['lich','base','Skeleton'],['lich','acolyte','Melee Specter'],['lich','deathknight','Lesser Goliath'],['lich','base','Equipped Skeleton']];
   const report=[];
   for(const [row,[kind,morph,label]] of profiles.entries()){
    const y=180+row*140;ctx.fillStyle='#f0dcb7';ctx.font='15px Georgia';ctx.fillText(label,10,y-116);
    const s={id:'review-'+row,kind,summonMorph:morph,summonFamily:kind==='lich'?'boundDead':undefined,x:500,y:400,dirX:row%2?-1:1,dirY:0,hp:1000,maxHp:1000,armour:0,damage:5,alive:true};
    if(kind==='lich')forms.configureBoundDeadSummon(s,{subclassId:morph});else forms.configureLichSummon(s,{subclassId:morph});
    if(row===8)s.coterieEquipment={weapon:'blackIronSword',armour:'leatherVest'};
    motion.beginGravecallerMotion(s);const hashes=[];
    for(let col=0;col<8;col++){
     const before=motion.beginGravecallerMotion(s);s.x+=(kind==='greaterLich'?112:88)/8;motion.finishGravecallerMotion(s,before,1/24);
     const sample=document.createElement('canvas');sample.width=172;sample.height=138;art.drawSummonAsset(sample.getContext('2d'),s,combatReview.game.player,86,116);ctx.drawImage(sample,8+col*178,y-116);
     hashes.push([...sample.getContext('2d').getImageData(0,0,172,138).data].join(','));
    }
    report.push({label,distinctFrames:new Set(hashes).size});
   }
   return report;
  });
  gallery.forEach(r=>assert.ok(r.distinctFrames>=3,r.label));
  await page.locator('#gait-gallery').screenshot({path:out+'/gait-gallery.png'});
  // Render a continuous loop, not just disconnected authored-pose samples.
  await page.evaluate(()=>{
   const c=document.createElement('canvas');c.id='gait-loop';c.width=720;c.height=420;document.body.appendChild(c);window.loopCanvas=c;
   window.loopPets=[];
   for(const kind of ['greaterLich','lich'])for(const morph of ['base','acolyte','deathknight']){
    const s={id:'loop-'+loopPets.length,kind,summonMorph:morph,x:500,y:400,dirX:1,dirY:0,hp:1000,maxHp:1000,armour:0,damage:5,alive:true};
    (kind==='lich'?forms.configureBoundDeadSummon:forms.configureLichSummon)(s,{subclassId:morph});motion.beginGravecallerMotion(s);loopPets.push(s);
   }
  });
  for(let frame=0;frame<48;frame++){
   const png=await page.evaluate(frame=>{
    const ctx=loopCanvas.getContext('2d');ctx.imageSmoothingEnabled=false;ctx.fillStyle='#24392c';ctx.fillRect(0,0,720,420);
    loopPets.forEach((s,i)=>{
     // Two simulation updates per captured frame (60 Hz / 30 Hz capture).
     for(let tick=0;tick<2;tick++){const before=motion.beginGravecallerMotion(s);s.x+=200/60;motion.finishGravecallerMotion(s,before,1/60);}
     const x=90+i%4*180,y=i<4?174:365;ctx.fillStyle='#f0dcb7';ctx.font='14px Georgia';ctx.fillText(s.displayName,x-70,y-132);
     ctx.fillStyle='#1c2c21';ctx.fillRect(x-64,y+14,128,2);
     art.drawSummonAsset(ctx,s,combatReview.game.player,x,y);
    });return loopCanvas.toDataURL('image/png').split(',')[1];
   },frame);
   fs.writeFileSync(out+'/frame-'+String(frame).padStart(2,'0')+'.png',Buffer.from(png,'base64'));
  }
  // Real AI: all eight variants follow together and settle after the owner stops.
  const following=await page.evaluate(()=>{
   const g=combatReview.game,p=g.player,w={mode:'dungeon',width:50,height:30,tiles:Array.from({length:30},()=>Array.from({length:50},()=>({passable:true,biome:'grass'}))),enemies:[],objects:[],effects:[],drops:[]};p.summons=loopPets;p.x=900;p.y=500;p.dirX=1;p.dirY=0;w.enemies=[];
   p.summons.forEach((s,i)=>{s.x=400+i*70;s.y=400;s.attackCooldown=0;});
   const used=p.summons.map(()=>new Set());
   for(let tick=0;tick<600;tick++){
    if(tick<240){p.x+=tick<120?1:-1;p.y+=.5;}
    combat.updateSummons(1/60,p,w,()=>{},tick/60);
    p.summons.forEach((s,i)=>used[i].add(motion.gravecallerMotionPose(s).frame));
   }
   return p.summons.map((s,i)=>({name:s.displayName,moving:motion.gravecallerMotionPose(s).moving,frames:[...used[i]],x:s.x,y:s.y}));
  });
  following.forEach(r=>{assert.ok(r.frames.includes(1)&&r.frames.includes(2),r.name);assert.equal(r.moving,false,r.name+' never settled');});
  await page.goto('http://127.0.0.1:8768/docs/gravecaller-animation/movement-preview.html');
  await page.waitForFunction(async()=>{const {asset}=await import('/src/spriteArt.js');return ['summons-core','skeleton-forge','lich-acolyte','lich-deathknight','bound-dead-specter','bound-dead-knight'].every(n=>asset(n)?.ready);});
  const first=await page.locator('canvas').evaluate(c=>c.toDataURL());await page.waitForTimeout(240);
  assert.notEqual(await page.locator('canvas').evaluate(c=>c.toDataURL()),first,'Live preview did not animate');
  for(const mode of ['idle','attack','walk']){await page.locator('#pose').selectOption(mode);await page.locator('#turn').click();await page.waitForTimeout(150);}
  await page.waitForTimeout(300);
  await page.screenshot({path:out+'/live-preview.png'});
  assert.deepEqual(errors,[]);const report={pass:true,gallery,following,livePreview:true,errors};fs.writeFileSync(out+'/browser-verification.json',JSON.stringify(report,null,2)+'\n');console.log(JSON.stringify(report,null,2));
 }finally{await browser.close();}
})().catch(e=>{console.error(e);process.exitCode=1;});
