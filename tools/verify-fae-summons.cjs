const {chromium}=require(process.env.RUNALIS_NODE_MODULES+'/playwright');
const fs=require('node:fs'),assert=require('node:assert/strict');
(async()=>{
 const browser=await chromium.launch({channel:'msedge',headless:true});
 try{
  const page=await browser.newPage({viewport:{width:1440,height:1100}}),errors=[];page.on('pageerror',e=>errors.push(e.message));
  await page.goto('http://127.0.0.1:8768/combat-overhaul-lab.html?skill=thornbinderSummonElderThornbeast&morph=fae');
  await page.waitForFunction(()=>window.combatReview?.game.player);
  await page.evaluate(async()=>{window.faeArt=await import('/src/faeSummonArt.js');window.spriteArt=await import('/src/spriteArt.js');});
  await page.waitForFunction(()=>spriteArt.asset('summons-core')?.ready&&spriteArt.asset('summons-ancient')?.ready);
  const art=await page.evaluate(()=>{
   const canvas=document.createElement('canvas');canvas.id='fae-frames';canvas.width=1100;canvas.height=680;document.body.appendChild(canvas);
   const ctx=canvas.getContext('2d');ctx.imageSmoothingEnabled=false;ctx.fillStyle='#222b28';ctx.fillRect(0,0,canvas.width,canvas.height);
   const report=[];
   for(const [index,name] of ['summons-core','summons-ancient'].entries()){
    const image=spriteArt.asset(name).image,w=index?128:96,h=index?144:112,variant=faeArt.faeSummonAtlas(image,1,w,h);
    if(variant!==faeArt.faeSummonAtlas(image,1,w,h))throw Error('Palette cache not reused');
    const base=document.createElement('canvas');base.width=w*4;base.height=h;const b=base.getContext('2d');b.drawImage(image,0,h,w*4,h,0,0,w*4,h);
    const original=b.getImageData(0,0,w*4,h).data,changed=variant.getContext('2d').getImageData(0,0,w*4,h).data;
    let alphaDifferences=0,colorDifferences=0,pixels=0;const colors=new Set();
    for(let i=0;i<original.length;i+=4){if(original[i+3]!==changed[i+3])alphaDifferences++;if(original[i+3]){pixels++;colors.add(`${changed[i]},${changed[i+1]},${changed[i+2]}`);if(original[i]!==changed[i]||original[i+1]!==changed[i+1]||original[i+2]!==changed[i+2])colorDifferences++;}}
    const y=index?322:8,scale=index?1.05:1.2;ctx.fillStyle='#d6c5a9';ctx.font='14px Georgia';ctx.fillText(index?'Elder Thornbeast — original frames / Fae frames':'Thornlings — original frames / Fae frames',15,y+18);
    const hashes=[];
    for(let f=0;f<4;f++){
     ctx.drawImage(base,f*w,0,w,h,80+f*245,y+28,w*scale,h*scale);
     ctx.drawImage(variant,f*w,0,w,h,80+f*245,y+180,w*scale,h*scale);
     hashes.push([...variant.getContext('2d').getImageData(f*w,0,w,h).data].join(','));
    }
    report.push({name,pixels,alphaDifferences,colorDifferences,colors:colors.size,distinctFrames:new Set(hashes).size});
   }
   return report;
  });
  art.forEach(a=>{assert.equal(a.alphaDifferences,0);assert.equal(a.colorDifferences,a.pixels);assert.ok(a.colors<=12);assert.equal(a.distinctFrames,4);});
  fs.mkdirSync('docs/fae-summons',{recursive:true});await page.locator('#fae-frames').screenshot({path:'docs/fae-summons/animation-comparison.png'});
  await page.evaluate(async()=>{
   const {drawSummonArt}=await import('/src/summonArt.js');
   const canvas=document.createElement('canvas');canvas.id='fae-terrain';canvas.width=600;canvas.height=300;canvas.style.width='600px';canvas.style.height='300px';document.body.appendChild(canvas);
   const ctx=canvas.getContext('2d');ctx.fillStyle='#2d402e';ctx.fillRect(0,0,300,300);ctx.fillStyle='#827754';ctx.fillRect(300,0,300,300);
   for(let i=0;i<180;i++){
    const x=(i*83)%290,y=(i*47)%290;ctx.fillStyle=i%2?'#40533b':'#344932';ctx.fillRect(x,y,4+i%4,2);
    ctx.fillStyle=i%2?'#928763':'#73694b';ctx.fillRect(300+x,y,5+i%6,2);
   }
   ctx.fillStyle='#f3ead8';ctx.font='14px Georgia';ctx.fillText('Grass · actual gameplay size',12,23);ctx.fillText('Path · actual gameplay size',312,23);
   for(const shift of [0,300]){
    for(const [index,x,y] of [[0,80,118],[1,128,145],[2,178,115]])drawSummonArt(ctx,{kind:'thornbeast',summonMorph:'fae',x:shift+x,y,dirX:index===1?-1:1,reviewAnimation:index===2?'attack':'idle'},'thornling',shift+x,y);
    drawSummonArt(ctx,{kind:'thornbeast',summonMorph:'fae',x:shift+130,y:254,dirX:1},'elderThornbeast',shift+130,254);
   }
  });
  await page.locator('#fae-terrain').screenshot({path:'docs/fae-summons/terrain-visibility.png'});
  const results=[];
  for(const id of ['thornbinderSummonThornlings','thornbinderSummonElderThornbeast']){
   const result=await page.evaluate(async id=>{
    const g=combatReview.game,p=g.player,w=g.world,{useAbility,updateSummons}=await import('/src/combat.js'),{migratePlayer}=await import('/src/player.js'),{selectAbilityMorph}=await import('/src/abilityMorphSystem.js');
    g.paused=true;p.summons=[];w.enemies=[];w.effects=[];p.cooldowns={};p.visualAction=null;
    for(const s of Object.values(p.skillState.skills))s.level=20;migratePlayer(p);g.dev.equip([id,null,null,null]);g.dev.setMastery(id,30);selectAbilityMorph(p,id,'fae');g.dev.refill();p.hp-=20;
    const t=performance.now()/1000;const cast=useAbility(0,p,w,()=>{},t,{combatAimX:1,combatAimY:0,hasAim:true}),hp=p.hp;
    for(let i=1;i<=180;i++)updateSummons(1/60,p,w,()=>{},t+i/60);
    const healed=p.hp-hp,lead=p.summons[0];lead.x=320;lead.y=320;
    w.enemies=[{id:'fae-target',kind:'rat',name:'Target',x:338,y:320,hp:5000,maxHp:5000,radius:12,aggro:3,combatTargetKind:'summon',combatTargetId:lead.id}];
    updateSummons(.02,p,w,()=>{},t+3.02);
    return {cast,healed,count:p.summons.length,fae:p.summons.every(s=>s.summonMorph==='fae'),damage:5000-w.enemies[0].hp,fire:w.effects.some(e=>e.geometry==='faerieFire'),healEffects:w.effects.filter(e=>e.geometry==='faeMend').length};
   },id);
   assert.ok(result.cast&&result.healed>0&&result.fae&&result.damage>0&&result.fire);assert.equal(result.count,id.includes('Elder')?1:3);assert.ok(result.healEffects<=1);results.push({id,...result});
   await page.locator('#arena').screenshot({path:`docs/fae-summons/${id.includes('Elder')?'elder':'thornlings'}-in-game.png`});
  }
  assert.deepEqual(errors,[]);fs.writeFileSync('docs/fae-summons/browser-verification.json',JSON.stringify({pass:true,art,results,errors},null,2));console.log(JSON.stringify({pass:true,art,results,errors}));
 }finally{await browser.close();}
})().catch(e=>{console.error(e);process.exitCode=1;});
