// Actual combat casts in three phases, presented together for visual inspection.
const {chromium}=require(process.env.RUNALIS_NODE_MODULES+'/playwright');
const {createCanvas,loadImage}=require(process.env.RUNALIS_NODE_MODULES+'/@napi-rs/canvas');
const fs=require('node:fs');
(async()=>{
 const browser=await chromium.launch({channel:'msedge',headless:true});
 const report={abilities:[],errors:[],phaseTimes:[.1,.5,1.1]};
 try{
  const page=await browser.newPage({viewport:{width:1440,height:1000}});page.on('pageerror',e=>report.errors.push(e.message));
  await page.goto('http://127.0.0.1:8766/combat-overhaul-lab.html');await page.waitForFunction(()=>window.combatReview);
  const catalogue=await page.evaluate(async()=>{const {ABILITIES}=await import('/src/data.js');return ABILITIES.map(a=>({id:a.id,name:a.name,classId:a.classId||'other',role:a.role||'existing technique'}));});
  for(const group of [...new Set(catalogue.map(a=>a.classId))]) {
   const abilities=catalogue.filter(a=>a.classId===group),canvas=createCanvas(1200,Math.ceil(abilities.length/2)*205+38),ctx=canvas.getContext('2d');
   ctx.fillStyle='#141820';ctx.fillRect(0,0,canvas.width,canvas.height);ctx.fillStyle='#ddcba8';ctx.font='bold 22px Georgia';ctx.fillText(group.toUpperCase()+' · LIVE COMBAT CATALOGUE',16,28);
   for(let index=0;index<abilities.length;index++) {
    const a=abilities[index];
    const result=await page.evaluate(async(id)=>{
     const {getAbilityById,ITEMS}=await import('/src/data.js'),{useAbility,updateCombat,updateSummons}=await import('/src/combat.js');
     const {migratePlayer}=await import('/src/player.js');const a=getAbilityById(id);
     window.combatReview.reset(a.classId||'gravecaller');const {game:g}=window.combatReview;g.paused=true;
     for(const skill of Object.values(g.player.skillState.skills))skill.level=100;
     if(a.bloodline){g.player.bloodline={id:a.bloodline};g.player.raceId=a.bloodline;}
     const required=a.requiresWeaponType||a.weaponType;
     if(required)g.player.equipment.weapon=Object.entries(ITEMS).find(([id,item])=>item.weaponType===required)?.[0]||g.player.equipment.weapon;
     migratePlayer(g.player);g.dev.refill();g.dev.clearCooldowns();g.player.loadout.abilitySlots[3]=id;g.world.enemies=[];
     for(let i=0;i<6;i++){const e=g.dev.spawn(i===5?'boss':'melee',365+i%3*40,300+Math.floor(i/3)*35);e.hp=e.maxHp=20000;}
     const input={rightStickActive:true,rightStickAimX:1,rightStickAimY:0,combatAimX:1,combatAimY:0,ability3Held:true},now=performance.now()/1000;
     const messages=[];const used=useAbility(3,g.player,g.world,message=>messages.push(message),now,input);const frames=[];
     for(let frame=1;frame<=66;frame++){
      updateCombat(g.player,g.world,input,1/60,now+frame/60,g.log);updateSummons(1/60,g.player,g.world,g.log,now+frame/60);
      for(const fx of g.world.effects)fx.age=(fx.age||0)+1/60;g.world.effects=g.world.effects.filter(fx=>fx.age<fx.ttl);
      if([6,30,66].includes(frame)){
       window.combatReview.draw(now+frame/60);frames.push(g.canvas.toDataURL());
      }
     }
     return {used,messages,frames};
    },a.id);
    const x=index%2*600,y=Math.floor(index/2)*205+38;
    ctx.fillStyle='#d7c9ac';ctx.font='bold 14px sans-serif';ctx.fillText(a.name,x+10,y+19);
    ctx.fillStyle=result.used?'#adb7b7':'#ee8d79';ctx.font='10px sans-serif';ctx.fillText(a.role+(result.used?'':' · CAST FAILED'),x+10,y+34);
    for(let phase=0;phase<3;phase++){
     const picture=await loadImage(result.frames[phase]);ctx.drawImage(picture,180,210,470,300,x+phase*198+2,y+43,194,124);
     ctx.fillStyle='#bcae93';ctx.fillText(['0.1s · setup','0.5s · release','1.1s · aftermath'][phase],x+phase*198+10,y+184);
    }
    report.abilities.push({...a,used:result.used,messages:result.messages});
   }
   fs.writeFileSync(`docs/combat-overhaul/catalogue-${group}.png`,canvas.toBuffer('image/png'));
  }
  fs.writeFileSync('docs/combat-overhaul/catalogue-results.json',JSON.stringify(report,null,2));
  console.log(JSON.stringify({total:report.abilities.length,failed:report.abilities.filter(a=>!a.used),errors:report.errors},null,2));
  if(report.errors.length||report.abilities.some(a=>!a.used))process.exitCode=1;
 }finally{await browser.close();}
})().catch(error=>{console.error(error);process.exitCode=1;});
