const fs=require('node:fs'),assert=require('node:assert/strict');
const {chromium}=require(process.env.RUNALIS_NODE_MODULES+'/playwright');
(async()=>{
 const browser=await chromium.launch({channel:'msedge',headless:true});
 try{
  const page=await browser.newPage();
  await page.route('**/src/main.js',r=>r.fulfill({contentType:'text/javascript',body:fs.readFileSync('src/main.js','utf8').split('// GLOBAL GAME INSTANCE')[0]+'\nexport {RunalisGame};'}));
  await page.goto('http://127.0.0.1:8766/');
  const result=await page.evaluate(async()=>{
   const {RunalisGame}=await import('/src/main.js');
   const {createWorld,isActorPositionPassable}=await import('/src/world.js');
   const {createPlayer}=await import('/src/player.js');
   const {nearestNavStone,MIN_NAV_STONE_SPACING}=await import('/src/navStoneNetwork.js');
   const coop=await import('/src/coopReviveSystem.js');
   const g=Object.assign(Object.create(RunalisGame.prototype),{world:createWorld(),player:createPlayer(),camera:{x:0,y:0},canvas:{width:960,height:600},input:{},logLines:[],save(){},shake(){}});
   const checks=[];const check=(ok,label)=>{if(!ok)throw Error(label);checks.push(label);};
   const added=g.world.navStones.filter(s=>s.roadId);
   const blocked=[];
   for(const s of g.world.navStones){g.player.x=s.x;g.player.y=s.y;g.world.continentRuntime.refresh(g);for(const [dx,dy] of [[0,0],[-32,0],[32,0],[0,32],[32,32]])if(!isActorPositionPassable(g.world,s.x+dx,s.y+dy,12))blocked.push(s.id+':'+dx+','+dy);}
   check(!blocked.length,'all stone landing positions are passable: '+blocked.join(','));
   check(added.length===0&&g.world.navStones.length===9,'nine town and landmark destinations without roadside filler');
   check(g.world.navStones.every(a=>g.world.navStones.every(b=>a===b||Math.hypot(a.x-b.x,a.y-b.y)>=MIN_NAV_STONE_SPACING)),'town and landmark stones remain physically separated');
   g.player.x=130*32;g.player.y=100*32;g.player.hp=0;g.player.gold=100;
   g.player.lastSafeLocation={x:1,y:1,worldMode:'capital'};
   const expected=nearestNavStone(g.world,g.player);g.handlePlayerDefeated();
   check(g.player.x===expected.x&&g.player.y===expected.y,'surface death uses nearest stone instead of old safe point');
   check(g.player.hp>0&&g.player.gold===88,'death vitals and penalty preserved');
   const ally=createPlayer('Ally');ally.id='ally';ally.active=true;ally.joined=true;g.player.id='host';g.player.coop={players:[ally]};
   ally.x=400*32;ally.y=210*32;const allyStone=nearestNavStone(g.world,ally);
   ally.hp=0;coop.handleActorZeroHpForCoop(g,ally,0);coop.updateCoopReviveTimers(g,21,21);
   check(ally.hp>0&&ally.x===allyStone.x&&ally.y===allyStone.y,'co-op bleed-out returns to a stone instead of host');
   ally.x=g.player.x+10;ally.y=g.player.y;ally.hp=0;
   coop.handleActorZeroHpForCoop(g,ally,30);const original={x:ally.x,y:ally.y};
   coop.processReviveInput(g,g.player,{interactPressed:true},0,31);
   for(let i=0;i<3;i++){g.player.reviveAction.cursor=g.player.reviveAction.targetCenter;coop.processReviveInput(g,g.player,{confirmPressed:true},0,32+i);}
   check(ally.hp>0&&ally.x===original.x&&ally.y===original.y,'successful player revive stays in place');
   const {enterDungeon}=await import('/src/dungeonSystem.js');
   const {enterSideZone}=await import('/src/sideZoneSystem.js');
   const {enterTower}=await import('/src/towerSystem.js');
   for(const mode of ['dungeon','sideZone','tower']){
    const entrance={id:'verify-respawn-'+mode,name:'Verification',x:g.player.x,y:g.player.y};
    if(mode==='dungeon')enterDungeon(g,entrance);else if(mode==='sideZone')enterSideZone(g,entrance);else enterTower(g,1,entrance);
    check(g.world.mode===mode,'entered '+mode);
    g.player.hp=0;g.handlePlayerDefeated();
    check(g.world.mode==='overworld'&&g.world.navStones.some(s=>s.x===g.player.x&&s.y===g.player.y),'death in '+mode+' returns to surface stone');
   }
   const interiorAlly=ally;
   enterDungeon(g,{id:'verify-ally-instance',x:g.player.x,y:g.player.y});
   interiorAlly.hp=0;coop.handleActorZeroHpForCoop(g,interiorAlly,100);coop.updateCoopReviveTimers(g,21,121);
   check(g.world.mode==='overworld'&&g.world.navStones.some(s=>Math.hypot(s.x-interiorAlly.x,s.y-interiorAlly.y)<=32),'instance co-op bleed-out returns party to a surface stone');
   g.player.hp=0;coop.handleActorZeroHpForCoop(g,g.player,150);ally.hp=0;coop.handleActorZeroHpForCoop(g,ally,150);
   check(g.player.hp>0&&ally.hp>0&&g.world.navStones.some(s=>s.x===g.player.x&&s.y===g.player.y),'party wipe returns to a stone');
   return {added:added.length,total:g.world.navStones.length,checks};
  });
  console.log(JSON.stringify(result,null,2));
 }finally{await browser.close();}
})().catch(e=>{console.error(e);process.exit(1);});

