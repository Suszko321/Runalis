const {chromium}=require(process.env.RUNALIS_PLAYWRIGHT_MODULE||'../tmp/vampire-browser/node_modules/playwright');
const fs=require('node:fs'),assert=require('node:assert/strict');
(async()=>{const browser=await chromium.launch({channel:'msedge',headless:true});try{
 const page=await browser.newPage({viewport:{width:1450,height:1320}}),errors=[],missing=[];page.on('pageerror',e=>errors.push(e.message));page.on('response',r=>{if(r.status()>=400)missing.push(r.url());});
 await page.goto(process.env.RUNALIS_PREVIEW_URL||'http://127.0.0.1:8772/art-lab.html');
 const result=await page.evaluate(async()=>{
  const {asset,spriteArtStatus}=await import('/src/spriteArt.js'),{BOSS_ARMORY_ART}=await import('/src/bossArmoryArtData.js'),{BOSS_ARMORY_ITEMS}=await import('/src/bossArmoryData.js'),{FOCUS_PROJECTILE_STYLES}=await import('/src/focusProjectileData.js'),{drawBossArmoryWeapon,drawFocusProjectile}=await import('/src/bossArmoryArt.js');
  const {drawHumanActor}=await import('/src/humanRenderer.js'),{createPlayer,chooseClass,addItem}=await import('/src/player.js'),{equipGearEntry}=await import('/src/equipmentProgressionSystem.js'),{itemIconMarkup}=await import('/src/gearVisualStyle.js'),{requestBasicAttack,updateWeaponCombat}=await import('/src/combatMoves.js'),{drawCombatProjectiles}=await import('/src/combatVisualsRenderer.js');
  const {ITEMS}=await import('/src/data.js');
  const names=[...Object.values(BOSS_ARMORY_ART).map(p=>p.sheet),'focus-projectiles','human-male','human-female'];await Promise.all(names.map(n=>{const a=asset(n);return a.ready?Promise.resolve():new Promise((ok,no)=>{a.image.addEventListener('load',ok,{once:true});a.image.addEventListener('error',()=>no(Error(n)),{once:true});});}));
  for(let i=0;i<100&&spriteArtStatus().some(a=>!a.ready&&!a.failed);i++)await new Promise(r=>setTimeout(r,20));
  const canvas=document.createElement('canvas');canvas.width=1450;canvas.height=1280;for(const child of document.body.children)child.style.display='none';document.body.appendChild(canvas);document.body.style.cssText='margin:0;background:#24232c';const c=canvas.getContext('2d');c.fillStyle='#24232c';c.fillRect(0,0,1450,1280);c.fillStyle='#eee1ca';c.font='25px sans-serif';c.fillText('RUNALIS · boss armory & book focuses',25,38);
  const classes=['thornbinder','gravecaller','lightbringer','oathkeeper','fellhunter','waverider','eldritch','classless'],world={mode:'dungeon',width:30,height:22,tiles:Array.from({length:22},()=>Array.from({length:30},()=>({passable:true,biome:'grass'}))),enemies:[],objects:[],effects:[]};
  let gripCases=0,heldCases=0;const report=[];
  Object.entries(BOSS_ARMORY_ITEMS).forEach(([id,item],i)=>{
   const x=30+i%4*355,y=90+Math.floor(i/4)*290,profile=BOSS_ARMORY_ART[id];c.fillStyle='#ded2c2';c.font='17px sans-serif';c.fillText(item.name,x,y);c.font='13px sans-serif';c.fillText(classes[i][0].toUpperCase()+classes[i].slice(1)+' · '+(item.weaponType==='grimoire'?'Grimoire':item.weaponType),x,y+24);
   const im=asset(profile.sheet).image;c.imageSmoothingEnabled=false;c.drawImage(im,x+5,y+48,96,128);
   if(!itemIconMarkup(item).includes(profile.sheet+'.png'))throw Error('Inventory icon does not use new art '+id);
   const p=createPlayer('Armory');chooseClass(p,classes[i]);Object.assign(p,{x:200,y:200,hp:500,maxHp:500,stamina:1000,maxStamina:1000,dirX:1,dirY:0});addItem(p,id);if(!equipGearEntry(p,p.inventory.findLastIndex(e=>e.id===id)))throw Error('Cannot equip '+id);p.spirit=p.maxSpirit=1000;
   const original=c.drawImage.bind(c),calls=[];c.drawImage=(...args)=>{calls.push(args);original(...args);};
   for(const [j,[dx,dy]]of [[0,1],[1,0],[0,-1],[-1,0]].entries()){
    p.x=x+155+j%2*105;p.y=y+110+Math.floor(j/2)*105;p.dirX=dx;p.dirY=dy;p.combatState=null;drawHumanActor(c,p,{x:0,y:0});
    const used=calls.some(args=>args[0]===im);if(!used)throw Error('Held art missing '+id+' '+j);heldCases++;calls.length=0;
    if(!requestBasicAttack(p,world,{combatAimX:dx,combatAimY:dy,hasAim:true},()=>{},performance.now()/1000+30))throw Error('Attack '+id);
    updateWeaponCombat(p,world,{},.08,performance.now()/1000+30.08,()=>{});
    const attackCanvas=document.createElement('canvas');attackCanvas.width=1450;attackCanvas.height=1280;const attackCtx=attackCanvas.getContext('2d');attackCtx.drawImage=(...args)=>calls.push(args);
    drawHumanActor(attackCtx,p,{x:0,y:0});if(!calls.some(args=>args[0]===im))throw Error('Attack art missing '+id);heldCases++;calls.length=0;
   }
   c.drawImage=original;
   for(const side of [-1,1]){const cv=document.createElement('canvas');cv.width=240;cv.height=240;const cc=cv.getContext('2d'),matrices=[],draw=cc.drawImage.bind(cc);cc.drawImage=(...args)=>{const t=cc.getTransform();matrices.push({args,t});draw(...args);};drawBossArmoryWeapon(cc,id,120,150,side);const call=matrices[0];if(!call||call.args[0]!==im)throw Error('Wrong art');const {gripX,gripY,scale}=profile,worldX=call.t.a*(call.args[1]+gripX*scale)+call.t.e,worldY=call.t.d*(call.args[2]+gripY*scale)+call.t.f;if(Math.abs(worldX-120)>.01||Math.abs(worldY-150)>.01)throw Error('Grip shifted '+id);gripCases++;}
   const cv=document.createElement('canvas');cv.width=96;cv.height=128;const cc=cv.getContext('2d');cc.drawImage(im,0,0);const d=cc.getImageData(0,0,96,128).data,colors=new Set();let pixels=0;
   for(let yy=0;yy<128;yy++)for(let xx=0;xx<96;xx++){const at=(yy*96+xx)*4,a=d[at+3];if(a!==0&&a!==255)throw Error('Soft equipment alpha');if(a){pixels++;colors.add(d.slice(at,at+3).join(','));if(xx===0||xx===95||yy===0||yy===127)throw Error('Clipped equipment');}}
   if(pixels<150||colors.size>32)throw Error('Equipment export '+id);report.push({id,pixels,colors:colors.size});
  });
  c.fillStyle='#eee1ca';c.font='23px sans-serif';c.fillText('Every focus has its own projectile',25,720);const masks=new Set(),pixelHashes=new Set();let projectileCases=0;
  for(const [ordinal,[id,style]]of Object.entries(FOCUS_PROJECTILE_STYLES).entries()){
   const sx=25+ordinal%5*285,sy=780+Math.floor(ordinal/5)*120;c.fillStyle='#ddd2c5';c.font='14px sans-serif';c.fillText(style.name,sx,sy);c.font='11px sans-serif';c.fillText(ITEMS[id].name,sx,sy+19);
   const p={combatState:{projectiles:[{focusItemId:id,kind:'focusBolt',dirX:1,dirY:0,x:sx+65,y:sy+55,alive:true,age:.1}]}};drawCombatProjectiles(c,p,{x:0,y:0});p.combatState.projectiles[0]={...p.combatState.projectiles[0],x:sx+170,kind:'focusLance',comboType:'heavy'};drawCombatProjectiles(c,p,{x:0,y:0});
   const im=asset(style.sheet||'focus-projectiles').image,cv=document.createElement('canvas');cv.width=32;cv.height=32;const cc=cv.getContext('2d');cc.drawImage(im,style.index%4*32,Math.floor(style.index/4)*32,32,32,0,0,32,32);const d=cc.getImageData(0,0,32,32).data;let mask='',hash=0,pixels=0;
   for(let y=0;y<32;y++)for(let x=0;x<32;x++){const at=(y*32+x)*4,a=d[at+3];if(a!==0&&a!==255)throw Error('Soft projectile alpha');mask+=a?'1':'0';if(a){pixels++;if(x===0||x===31||y===0||y===31)throw Error('Clipped projectile');}hash=(hash*31+d[at]+d[at+1]*3+d[at+2]*5+a)>>>0;}if(pixels<45)throw Error('Unreadable projectile '+id);masks.add(mask);pixelHashes.add(hash);
   for(const [dx,dy]of [[1,0],[0,1],[-1,0],[0,-1]])for(const kind of ['focusBolt','focusLance']){
    const angles=[],draws=[],target=document.createElement('canvas').getContext('2d');target.rotate=a=>angles.push(a);target.drawImage=(...a)=>draws.push(a);if(!drawFocusProjectile(target,{focusItemId:id,kind,dirX:dx,dirY:dy},0,0))throw Error('Missing focus renderer');if(Math.abs(angles[0]-Math.atan2(dy,dx))>.001||draws[0][1]!==style.index%4*32||draws[0][2]!==Math.floor(style.index/4)*32)throw Error('Wrong projectile direction/crop');projectileCases++;
   }
  }
  if(masks.size!==21||pixelHashes.size!==21)throw Error('Foci need distinct silhouettes, not only color swaps');return {heldCases,gripCases,projectileCases,uniqueProjectileSilhouettes:masks.size,items:report};
 });assert.deepEqual(errors,[]);assert.deepEqual(missing,[]);await page.screenshot({path:'docs/boss-armory/runtime.png'});fs.writeFileSync('docs/boss-armory/browser-verification.json',JSON.stringify({...result,errors,missing},null,2));console.log('PASS '+JSON.stringify(result));
}finally{await browser.close();}})().catch(e=>{console.error(e);process.exitCode=1;});
