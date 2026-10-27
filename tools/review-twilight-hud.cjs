const fs=require('node:fs'),assert=require('node:assert/strict');
const {chromium}=require((process.env.RUNALIS_NODE_MODULES||'C:/Users/austi/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules')+'/playwright');
const out='docs/twilight-hud';fs.mkdirSync(out,{recursive:true});let browser;
(async()=>{browser=await chromium.launch({channel:'msedge',headless:true});const results=[];
 for(const stage of ['before','after']){
  const p=await browser.newPage({viewport:{width:1440,height:900}}),errors=[];p.on('pageerror',e=>errors.push(e.message));
  await p.route('**/src/*.js*',r=>{const name=new URL(r.request().url()).pathname.split('/').at(-1),backup='backups/twilight-hud-2026-10-25/'+name;let body=fs.readFileSync(stage==='before'&&fs.existsSync(backup)?backup:'src/'+name,'utf8');if(name==='main.js')body+='\nwindow.twilightReview={get game(){return currentGame;},start:state=>startProfile({id:"twilight-isolated",name:"Twilight review",state})};';return r.fulfill({contentType:'text/javascript',body});});
  if(stage==='before')await p.route('**/twilight-hud.css*',r=>r.fulfill({contentType:'text/css',body:''}));
  await p.goto('http://127.0.0.1:8766/');await p.waitForFunction(()=>window.twilightReview);
  await p.evaluate(async()=>{const {createWorld}=await import('/src/world.js'),{createPlayer,chooseClass}=await import('/src/player.js'),{createSaveState}=await import('/src/gameSave.js');const world=createWorld({skipPublishedOverride:true}),player=createPlayer('Grave');chooseClass(player,'gravecaller');Object.assign(player,{x:world.spawn.x,y:world.spawn.y,act1OpeningPending:false});await twilightReview.start(createSaveState({world,player,camera:{x:0,y:0},profileId:'twilight-isolated',profileName:'Twilight review'}));});
  await p.waitForFunction(()=>twilightReview.game?.started);await p.waitForTimeout(1000);
  await p.screenshot({path:`${out}/${stage}-game.png`});
  // Use a frozen production world render to compare nameplates and the radar
  // beside real scenery. These isolated actors never enter a saved profile.
  await p.evaluate(async()=>{
   const {game:g}=twilightReview,{draw}=await import('/src/render.js'),{renderMinimapHud}=await import('/src/minimapHud.js');
   g.paused=true;g.world.enemies=[
    {id:'plate-ordinary',kind:'roadlessBandit',name:'Roadless Drifter',x:g.player.x+150,y:g.player.y+100,hp:72,maxHp:100,level:8,dirX:0,dirY:1},
    {id:'plate-elite',kind:'archer',name:'Fennick Salt',x:g.player.x+270,y:g.player.y+20,hp:220,maxHp:300,level:11,elite:true,encounterTier:'elite',eliteModifiers:['molten']},
    {id:'plate-boss',kind:'brute',name:'Grave-Maw Bear',bossType:'graveMawBear',isBoss:true,x:g.player.x+55,y:g.player.y+215,hp:720,maxHp:1000,level:14}
   ];
   g.world.objects.push({id:'radar-quest',kind:'npc',name:'Mine Witness',npcId:'radar-witness',questRelated:true,x:g.player.x-100,y:g.player.y+40});
   draw(g.ctx,g.world,g.player,g.camera);const frozen=document.createElement('canvas');frozen.id='hud-review-frozen';frozen.width=g.canvas.width;frozen.height=g.canvas.height;frozen.style.cssText='position:fixed;inset:0;width:100vw;height:100vh;z-index:4;pointer-events:none';frozen.getContext('2d').drawImage(g.canvas,0,0);document.body.append(frozen);g.paused=false;renderMinimapHud(g);
  });
  await p.screenshot({path:`${out}/${stage}-nameplates.png`});
  await p.evaluate(()=>{document.querySelector('#hud-review-frozen')?.remove();twilightReview.game.paused=false;});
  if(stage==='after'){
   results.push(await p.evaluate(async()=>{
    const {classifyRadarMarker,buildRadarQuestTargets,RADAR_COLORS,drawEntityRadar}=await import('/src/minimapRadar.js');
    const player={x:100,y:100,hp:100,questState:{active:{q:{id:'q',giverNpcId:'quest-npc',currentStageIndex:0,stages:[{objectives:[{type:'event',eventId:'blue-event',required:1,progress:0}]}]}}},coop:{players:[]},summons:[]};
    const targets=buildRadarQuestTargets(player),samples=[['friendly',classifyRadarMarker({alive:true},'friendly',targets).color,RADAR_COLORS.friendly],['enemy',classifyRadarMarker({hp:2},'enemy',targets).color,RADAR_COLORS.enemy],['entrance',classifyRadarMarker({kind:'dungeonEntrance'},'object',targets).color,RADAR_COLORS.entrance],['quest NPC',classifyRadarMarker({kind:'npc',npcId:'quest-npc'},'object',targets).color,RADAR_COLORS.quest],['quest event',classifyRadarMarker({eventId:'blue-event'},'object',targets).color,RADAR_COLORS.quest],['quest overrides entrance',classifyRadarMarker({kind:'dungeonEntrance',questId:'q'},'object',targets).color,RADAR_COLORS.quest],['boss',classifyRadarMarker({isBoss:true},'enemy',targets).shape,'boss'],['elite',classifyRadarMarker({elite:true},'enemy',targets).shape,'elite'],['dead enemy',classifyRadarMarker({hp:0},'enemy',targets),null],['ordinary resource',classifyRadarMarker({kind:'ore'},'object',targets),null]];
    const c=document.createElement('canvas');c.width=c.height=168;const ctx=c.getContext('2d');let terrainReads=0;const world={objects:[{kind:'npc',x:130,y:100},{kind:'dungeonEntrance',x:90,y:120},{eventId:'blue-event',x:80,y:90}],enemies:[{hp:1,x:110,y:110},{isBoss:true,x:70,y:120},{elite:true,x:140,y:80}],get tiles(){terrainReads++;throw Error('Radar read terrain');}};
    const before=JSON.stringify(player);const radar=drawEntityRadar(ctx,{world,player},168);const cornerAlpha=ctx.getImageData(0,0,1,1).data[3];
    const map=document.querySelector('#runalisMinimapCanvas'),orb=document.querySelector('.twilight-orb');
    return {samples,radar,terrainReads,cornerAlpha,playerUnchanged:before===JSON.stringify(player),radarWidth:map.width,radarHeight:map.height,radarRound:getComputedStyle(map).borderRadius,orbCount:document.querySelectorAll('.twilight-orb').length,orbValue:orb?.getAttribute('aria-valuenow'),slots:document.querySelectorAll('#combatSkillHud .combat-hud-slot').length};
   }));
   for(const [width,height] of [[760,800],[390,844],[360,740]]){await p.setViewportSize({width,height});await p.waitForTimeout(250);await p.screenshot({path:`${out}/after-${width}.png`});const layout=await p.evaluate(()=>{const ids=['unitFramesHud','combatSkillHud','runalisMinimapHud'];const canvas=document.querySelector('#game'),rect=canvas.getBoundingClientRect();return {aspectError:Math.abs(canvas.width/canvas.height-rect.width/rect.height),renderPixels:canvas.width*canvas.height,viewport:innerWidth,overflow:document.documentElement.scrollWidth>innerWidth,boxes:ids.map(id=>{const r=document.getElementById(id)?.getBoundingClientRect();return {id,x:r.x,right:r.right,top:r.top,bottom:r.bottom};})};});results.push(layout);}
  }
  assert.deepEqual(errors,[]);await p.evaluate(()=>twilightReview.game.destroy());await p.close();
 }
 for(const [label,actual,expected] of results[0].samples)assert.deepEqual(actual,expected,label);assert.equal(results[0].terrainReads,0);assert.equal(results[0].cornerAlpha,0);assert(results[0].playerUnchanged);assert.equal(results[0].slots,6);assert.equal(results[0].orbCount,0);for(const r of results.slice(1)){assert(!r.overflow);assert(r.aspectError<.003);assert(r.renderPixels<580000);for(const box of r.boxes)assert(box.x>=-1&&box.right<=r.viewport+1,JSON.stringify(box));}
 fs.writeFileSync(`${out}/verification.json`,JSON.stringify(results,null,2));console.log(JSON.stringify(results,null,2));await browser.close();
})().catch(async e=>{console.error(e);await browser?.close();process.exitCode=1;});
