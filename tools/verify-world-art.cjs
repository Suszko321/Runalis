const fs=require('node:fs'),assert=require('node:assert/strict');
const {chromium}=require((process.env.RUNALIS_NODE_MODULES||'C:/Users/austi/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules')+'/playwright');
(async()=>{const b=await chromium.launch({channel:'msedge',headless:true}),p=await b.newPage(),errors=[];p.on('pageerror',e=>errors.push(e.message));await p.goto('http://127.0.0.1:8766/world-lab.html');await p.waitForTimeout(1500);
 const report=await p.evaluate(async()=>{
  const {drawObjects}=await import('/src/objectRenderer.js'),{makeNativeScenery}=await import('/src/nativeSceneryArt.js'),{worldObjectDepth,WORLD_ART_STANDARD}=await import('/src/worldArtDirection.js');
  const c=document.createElement('canvas');c.width=400;c.height=400;const ctx=c.getContext('2d'),drawImage=ctx.drawImage.bind(ctx),events=[];
  ctx.drawImage=function(img,...args){events.push(img.width===40?'sign':'court');return drawImage(img,...args);};
  const fillRect=ctx.fillRect.bind(ctx);ctx.fillRect=function(...args){if(this.fillStyle instanceof CanvasPattern)events.push('court');return fillRect(...args);};
  const object={id:'art-test',kind:'worldDressing',propType:'continentSign',x:100,y:120,artWidth:40,artHeight:80};const original=JSON.stringify(object);
  const cases=[];for(const [name,y,expected] of [['behind',100,['actor','sign']],['in-front',140,['sign','actor']]]){
   events.length=0;drawObjects(ctx,{objects:[object]},{x:0,y:0},null,[{y,drawActor:()=>events.push('actor')}]);cases.push({name,events:[...events],expected});
  }
  events.length=0;const court={...object,id:'floor',y:300,propType:'continentCourt',artWidth:70,artHeight:40};drawObjects(ctx,{objects:[court,object]},{x:0,y:0},null,[{y:100,drawActor:()=>events.push('actor')}]);cases.push({name:'ground-under-feet',events:[...events],expected:['court','actor','sign']});ctx.drawImage=drawImage;
  const palette={ink:'#20261e',dark:'#3b4035',stone:'#666950',light:'#93917a',roof:'#5c4233',roofLight:'#866045',gold:'#b39b62',glass:'#879e8c',wood:'#6f5339',green:'#3c523b'};
  const types=['Court','Wall','House','Granary','Abbey','Tower','Gate','Pine','Willow','Farm','Market','Ruin','Aqueduct','CausewayPier','Spire','Sign','InscribedWall','TimberStack','Wagon','Fountain','Scales','Stairs','Boardwalk','FishRack','ReedBed','WardStakes','Bell','Brazier','Sluice','Cairn'];
  let drawings=0;const empty=[],mutated=[],badSize=[],fractionalAlpha=[];
  const gallery=document.createElement('canvas');gallery.width=1000;gallery.height=6*220;const gc=gallery.getContext('2d');gc.fillStyle='#303b32';gc.fillRect(0,0,gallery.width,gallery.height);
  for(const type of types)for(const style of ['frontier','timber','pass','aureate','imperial','fen','cosmic','blackglass']){
   const o={artWidth:160,artHeight:176,style,variant:2,ruined:type==='Ruin'};const before=JSON.stringify(o),image=makeNativeScenery(type,o,palette);drawings++;
   if(JSON.stringify(o)!==before)mutated.push(type);if(image.width!==160||image.height!==176)badSize.push(type);
   const data=image.getContext('2d').getImageData(0,0,160,176).data;let pixels=0,partial=0;for(let i=3;i<data.length;i+=4){pixels+=data[i]>0;if(data[i]>0&&data[i]<255)partial++;}if(!pixels)empty.push(type);if(partial)fractionalAlpha.push({type,style,partial});
   if(style==='frontier'){const i=types.indexOf(type),x=i%5*200,y=Math.floor(i/5)*220;gc.drawImage(image,x+20,y+25);gc.fillStyle='#e2d5b3';gc.font='14px sans-serif';gc.fillText(type,x+14,y+213);}
  }
  const {spriteArtStatus}=await import('/src/spriteArt.js');
  return {cases,objectUnchanged:JSON.stringify(object)===original,groundDepth:worldObjectDepth(court)===-Infinity,standard:WORLD_ART_STANDARD,drawings,empty,mutated,badSize,fractionalAlpha,failedAssets:spriteArtStatus().filter(s=>s.failed),gallery:gallery.toDataURL()};
 });
 for(const c of report.cases)assert.deepEqual(c.events,c.expected,c.name);assert(report.objectUnchanged);assert(report.groundDepth);for(const key of ['empty','mutated','badSize','failedAssets'])assert.deepEqual(report[key],[],key);assert.equal(report.drawings,240);
 fs.writeFileSync('docs/world-art/native-scenery.png',Buffer.from(report.gallery.split(',')[1],'base64'));delete report.gallery;
 const before=JSON.parse(fs.readFileSync('docs/world-art/before.json')),after=JSON.parse(fs.readFileSync('docs/world-art/after.json'));assert.deepEqual(after.hashes,before.hashes);report.protectedFiles=Object.keys(after.hashes).length;
 for(let i=0;i<before.results.length;i++){assert.equal(after.results[i].objects,before.results[i].objects);assert.equal(after.results[i].enemies,before.results[i].enemies);assert.deepEqual(after.results[i].player,before.results[i].player);}
 const oldCont=JSON.parse(fs.readFileSync('docs/world-art/continental-before.json')),newCont=JSON.parse(fs.readFileSync('docs/world-art/continental-after.json'));
 for(let i=0;i<oldCont.results.length;i++){const a=oldCont.results[i],z=newCont.results[i];assert.deepEqual(z.objects,a.objects,z.scene+' objects');assert.deepEqual(z.enemies,a.enemies,z.scene+' enemies');assert(z.artCache.cacheBytes<=z.artCache.maxBytes);assert(z.statistics.cachedGround<=z.statistics.maxGround);}
 report.identicalScenePopulations=before.results.length+oldCont.results.length;assert.deepEqual(errors,[]);fs.writeFileSync('docs/world-art/verification.json',JSON.stringify(report,null,2));await b.close();console.log(JSON.stringify(report,null,2));
})().catch(e=>{console.error(e);process.exitCode=1;});
