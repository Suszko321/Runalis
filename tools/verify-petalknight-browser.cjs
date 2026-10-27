const {chromium}=require(process.env.RUNALIS_NODE_MODULES+'/playwright'),assert=require('node:assert/strict'),fs=require('node:fs');
(async()=>{const browser=await chromium.launch({channel:'msedge',headless:true});try{
 const page=await browser.newPage({viewport:{width:1300,height:950}}),errors=[],missing=[];page.on('pageerror',e=>errors.push(e.message));page.on('response',r=>{if(r.status()>=400)missing.push(r.url());});
 await page.goto('http://127.0.0.1:8768/combat-overhaul-lab.html?skill=thornbinderSummonThornlings&morph=petalknight');await page.waitForFunction(()=>window.combatReview?.game?.player?.classId==='thornbinder');
 await page.evaluate(async()=>{const {spriteArtStatus}=await import('/src/spriteArt.js');for(let i=0;i<100&&!spriteArtStatus().every(s=>s.ready||s.failed);i++)await new Promise(r=>setTimeout(r,30));});
 const result=await page.evaluate(async()=>{
  const {drawSummonArt}=await import('/src/summonArt.js'),{PETAL_SUMMON_ART,petalSummonPose}=await import('/src/petalknightSummonArt.js'),{useAbility,updateCombat,updateSummons}=await import('/src/combat.js'),{selectAbilityMorph}=await import('/src/abilityMorphSystem.js');
  const canvas=document.createElement('canvas');canvas.width=360;canvas.height=230;const c=canvas.getContext('2d'),checks=[];
  for(const [stage,profile] of Object.entries(PETAL_SUMMON_ART)){
   const s={kind:'thornbeast',summonMorph:'petalknight',evolutionStage:stage,x:180,y:180,dirX:1,dirY:0,reviewAnimation:'idle',reviewAnimationTime:0},hashes=[],feet=[];
   for(let frame=0;frame<12;frame++){
    s.reviewAnimation=frame<2?'idle':frame<8?'walk':'attack';s.reviewAnimationTime=frame<2?frame/0.8:(frame<8?(frame-2+.1)/12:(frame-8+.1)/4);
    if(petalSummonPose(s).frame!==frame)throw Error('Wrong review pose '+stage+'/'+frame);
    c.clearRect(0,0,360,230);const drawn=[],native=c.drawImage.bind(c);c.drawImage=(...args)=>{drawn.push({source:args[0].src,w:args.at(-2),h:args.at(-1)});native(...args);};drawSummonArt(c,s,stage,180,180);c.drawImage=native;
    if(drawn.length!==1||!drawn[0].source.endsWith(profile.sheet+'.png'))throw Error('Base art reached '+stage+'/'+frame);if(drawn[0].w!==profile.width||drawn[0].h!==profile.height)throw Error('Rescaled native sprite');
    const d=c.getImageData(0,0,360,230).data;let hash=2166136261,bottom=0,count=0;for(let i=0;i<d.length;i+=4){if(d[i+3]!==0&&d[i+3]!==255)throw Error('Smoothed edge '+stage);if(d[i+3]){bottom=Math.max(bottom,Math.floor(i/4/360));count++;}hash=Math.imul(hash^d[i],16777619);hash=Math.imul(hash^d[i+1],16777619);hash=Math.imul(hash^d[i+3],16777619);}if(count<400)throw Error('Missing body '+stage);hashes.push(hash>>>0);feet.push(bottom);
   }
   if(new Set(hashes.slice(2,8)).size<6)throw Error('Duplicate walk poses '+stage);if(Math.max(...feet)-Math.min(...feet)>1)throw Error('Drifting feet '+stage);
   s.reviewAnimation='idle';s.reviewAnimationTime=0;c.clearRect(0,0,360,230);drawSummonArt(c,s,stage,180,180);const rose=c.getImageData(0,0,360,230).data;c.clearRect(0,0,360,230);drawSummonArt(c,{...s,summonMorph:'base'},stage,180,180);const standard=c.getImageData(0,0,360,230).data;let intersection=0,union=0;for(let i=3;i<rose.length;i+=4){if(rose[i]&&standard[i])intersection++;if(rose[i]||standard[i])union++;}const silhouetteOverlap=intersection/union;if(silhouetteOverlap>.78)throw Error('Base silhouette reused '+stage);
   checks.push({stage,frames:12,uniqueWalkingPoses:6,footDrift:Math.max(...feet)-Math.min(...feet),silhouetteOverlap,source:profile.sheet,nativeScale:true,binaryAlpha:true});
  }
  const r=combatReview;r.reset('thornbinder');r.game.dev.equip(['thornbinderSummonThornlings','thornbinderSummonElderThornbeast',null,null,'block']);for(const id of r.game.player.loadout.abilitySlots.filter(x=>x!=='block'&&x)){r.game.dev.setMastery(id,20);selectAbilityMorph(r.game.player,id,'petalknight',100);}const p=r.game.player,w=r.game.world;w.enemies=[];p.maxSpirit=p.spirit=10000;const input={combatAimX:1,combatAimY:0,hasAim:true};Object.defineProperty(performance,'now',{value:()=>100000,configurable:true});if(!useAbility(0,p,w,()=>{},100,input)||!useAbility(1,p,w,()=>{},100,input))throw Error('Could not summon both groups');p.x=530;
  const movement=new Map(p.summons.map(s=>[s,new Set()]));for(let i=0;i<100;i++){const now=100+(i+1)/60;Object.defineProperty(performance,'now',{value:()=>now*1000,configurable:true});updateCombat(p,w,input,1/60,now,()=>{});updateSummons(1/60,p,w,()=>{},now);for(const s of p.summons){const pose=petalSummonPose(s);if(pose.moving)movement.get(s).add(pose.frame);}}
  for(const frames of movement.values())if(frames.size<6)throw Error('Actual follow movement did not use the six-frame gait');r.draw(102);r.renderHud();
  return {checks,actualFollowing:Array.from(movement,([s,frames])=>({source:s.sourceAbilityId,stage:s.evolutionStage,walkFrames:[...frames].sort()})),summons:p.summons.length};
 });
 await page.locator('#arena').screenshot({path:'docs/garden-grave-morphs/petalknight-following.png'});
 assert.equal(result.checks.length,4);assert.equal(result.summons,4);assert.deepEqual(errors,[]);assert.deepEqual(missing,[]);fs.writeFileSync('docs/garden-grave-morphs/petalknight-browser-verification.json',JSON.stringify({...result,errors,missing},null,2));console.log(JSON.stringify({...result,errors,missing}));
}finally{await browser.close();}})().catch(e=>{console.error(e);process.exitCode=1;});
