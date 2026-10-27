const {chromium}=require(process.env.RUNALIS_NODE_MODULES+'/playwright');
const assert=require('node:assert/strict'),fs=require('node:fs');
const folder='docs/brick-anchoring';fs.mkdirSync(folder,{recursive:true});
(async()=>{
 const browser=await chromium.launch({channel:'msedge',headless:true});
 try{
  const page=await browser.newPage(),errors=[];page.on('pageerror',e=>errors.push(e.message));
  await page.goto('http://127.0.0.1:8768/enemy-combat-lab.html');
  await page.waitForFunction(async()=>{const {orrakaiArtReady}=await import('/src/orrakaiRenderer.js');return orrakaiArtReady()&&window.enemyCombatLab?.spriteArtStatus().every(a=>a.ready||a.failed);});
  const report=await page.evaluate(async()=>{
   const {drawOrrakaiWalls,drawOrrakaiGround,drawOrrakaiWallArt}=await import('/src/orrakaiRenderer.js');
   const {drawEchorynMajorPiece}=await import('/src/echorynRenderer.js');
   const {drawContinentalObject}=await import('/src/continentArt.js');
   const {createCapitalHubWorld}=await import('/src/hubSystem.js');
   const {createWorld}=await import('/src/world.js');
   const {asset}=await import('/src/spriteArt.js');
   const c=document.createElement('canvas');c.width=800;c.height=650;const ctx=c.getContext('2d');ctx.imageSmoothingEnabled=false;
   const results=[],offsets=[[13,17],[-19,31],[65,-33],[.25,.25],[13.75,17.75],[-19.75,31.75]];
   function check(name,render,origin,region){
    const sample=cam=>{ctx.clearRect(0,0,c.width,c.height);render(cam);return ctx.getImageData(Math.round(region.x-cam.x),Math.round(region.y-cam.y),region.w,region.h).data;};
    const baseline=sample(origin);if(!baseline.some(v=>v))throw Error(name+' rendered no pixels');
    // Canvas pattern compositing can round channels by 1–2/255 across GPU
    // translations. A sliding brick boundary exceeds this small colour tolerance.
    for(const [dx,dy] of offsets){const pixels=sample({x:origin.x+dx,y:origin.y+dy});let mismatched=0;for(let i=0;i<pixels.length;i+=4)if([0,1,2,3].some(k=>Math.abs(pixels[i+k]-baseline[i+k])>2))mismatched++;if(mismatched){window.brickFailure={name,dx,dy,baseline:Array.from(baseline),pixels:Array.from(pixels),width:region.w,height:region.h};throw Error(name+' shifted '+mismatched+' world pixels at '+dx+','+dy);}}
    results.push({name,views:offsets.length+1,mismatchedWorldPixels:0});return c.toDataURL('image/png');
   }
   const capital=createCapitalHubWorld(),viewer={x:0,y:0};
   for(const b of capital.buildings){
    const origin={x:b.x*32-100,y:b.y*32-100};
    for(const [part,x] of [['outer',b.x*32+6],['partition',(b.x+b.partition)*32+6]])check('Orrakai '+b.id+' '+part,cam=>drawOrrakaiWalls(ctx,capital,cam,viewer),origin,{x,y:b.y*32+64,w:8,h:70});
   }
   const ground=check('Orrakai cached paving',cam=>drawOrrakaiGround(ctx,capital,cam),{x:900,y:760},{x:1020,y:950,w:130,h:100});
   const world=createWorld({legacy:true,skipPublishedOverride:true});
   const wall=world.objects.find(o=>o.echorynMajor&&['wall','ruinWall'].includes(o.pieceType)&&o.orientation==='vertical'&&o.length>=5&&o.length<=12);if(!wall)throw Error('No real overworld wall fixture');
   const origin={x:wall.x-400,y:wall.y-300},region={x:wall.x-30,y:wall.y-wall.length*16+30,w:54,h:100};
   const overworld=check('Echoryn brick wall '+wall.id,cam=>drawEchorynMajorPiece(ctx,wall,wall.x-cam.x,wall.y-cam.y),origin,region);
   const terrain=asset('terrain-core'),ready=terrain.ready;terrain.ready=false;
   try{check('Echoryn masonry fallback',cam=>drawEchorynMajorPiece(ctx,wall,wall.x-cam.x,wall.y-cam.y),origin,region);}finally{terrain.ready=ready;}
   check('Shared procedural masonry',cam=>drawOrrakaiWallArt(ctx,500-cam.x,500-cam.y,96,200,true,cam),{x:300,y:300},{x:510,y:520,w:75,h:120});
   const frontier={propType:'continentWall',style:'frontier',x:500,y:600,artWidth:96,artHeight:200,vertical:true};
   check('Continental frontier masonry',cam=>drawContinentalObject(ctx,frontier,cam),{x:300,y:300},{x:465,y:420,w:65,h:120});
   return {checks:results,ground,overworld};
  }).catch(async error=>{const failure=await page.evaluate(()=>window.brickFailure);if(failure)fs.writeFileSync(folder+'/failure.json',JSON.stringify(failure));throw error;});
  for(const [name,data] of [['orrakai-paving',report.ground],['overworld-wall',report.overworld]])fs.writeFileSync(folder+'/'+name+'.png',Buffer.from(data.split(',')[1],'base64'));
  delete report.ground;delete report.overworld;report.browserErrors=errors;assert.deepEqual(errors,[]);
  fs.writeFileSync(folder+'/verification.json',JSON.stringify(report,null,2));console.log(JSON.stringify({result:'PASS',surfaces:report.checks.length,cameraViews:report.checks.length*7,browserErrors:errors},null,2));
 }finally{await browser.close();}
})().catch(e=>{console.error(e);process.exitCode=1;});
