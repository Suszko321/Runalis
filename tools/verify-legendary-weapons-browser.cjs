const {chromium}=require(process.env.RUNALIS_NODE_MODULES+'/playwright');
const fs=require('node:fs'),assert=require('node:assert/strict');
(async()=>{
 const browser=await chromium.launch({channel:'msedge',headless:true}),base=process.env.RUNALIS_URL||'http://127.0.0.1:8766',out='docs/legendary-weapons',errors=[],missing=[];fs.mkdirSync(out,{recursive:true});
 try{
  const page=await browser.newPage({viewport:{width:1280,height:900}});page.on('pageerror',e=>errors.push(e.message));page.on('response',r=>{if(r.status()>=400)missing.push(r.url());});
  await page.route('**/src/main.js*',r=>r.fulfill({contentType:'text/javascript',body:fs.readFileSync('src/main.js','utf8')+'\nwindow.legendaryReviewGame=()=>currentGame;'}));await require('./browser-game-smoke.cjs')(page,base);await page.waitForFunction(()=>legendaryReviewGame()?.started);
  const result=await page.evaluate(async()=>{
   const {LEGENDARY_WEAPON_ITEMS:items,LEGENDARY_WEAPON_ART:art,LEGENDARY_WEAPON_FAMILIES:families,LEGENDARY_FOCUS_STYLES:focus}=await import('/src/legendaryWeaponData.js');
   const {createPlayer,addItem}=await import('/src/player.js'),{equipGearEntry}=await import('/src/equipmentProgressionSystem.js'),{drawHumanActor}=await import('/src/humanRenderer.js'),{asset,spriteArtStatus}=await import('/src/spriteArt.js'),{itemIconMarkup}=await import('/src/gearVisualStyle.js'),{drawFocusProjectile}=await import('/src/bossArmoryArt.js');
   const actors={};for(const [id,a]of Object.entries(art)){asset(a.sheet);asset(a.iconSheet);const p=createPlayer(id);p.skillState.combat.level=100;Object.assign(p,{combatLevel:100,inventory:[],equipment:{},equippedGear:{}});if(!addItem(p,id,1,{gearRarity:'legendary',rarityRollVersion:1,itemLevel:100})||!equipGearEntry(p,0))throw Error('Equip '+id);actors[id]=p;}
   for(const n of ['human-male','human-female','human-male-attack','human-female-attack','heads-custom','melee-arm-parts'])asset(n);
   for(let i=0;i<200&&spriteArtStatus().some(a=>!a.ready&&!a.failed);i++)await new Promise(r=>setTimeout(r,20));if(spriteArtStatus().some(a=>a.failed))throw Error('Missing assets');
   const create=(w,h,title)=>{const cv=document.createElement('canvas');cv.width=w;cv.height=h;const c=cv.getContext('2d');c.fillStyle='#25292e';c.fillRect(0,0,w,h);c.fillStyle='#e6d3a6';c.font='20px sans-serif';c.fillText(title,18,30);c.imageSmoothingEnabled=false;return[cv,c];};
   let renders=0,modelUses=0;
   function actor(c,id,bodyType,dx,dy,x,y,scale=2,gait=null){
    const p=actors[id];Object.assign(p,{x,y,bodyType,hairStyle:bodyType==='female'?'ponytail':'short',skin:'#dcb48b',hair:'#242128',shirt:'#887052',pants:'#3d3a3c',boots:'#66421f',dirX:dx,dirY:dy,hp:100,maxHp:100,isMoving:gait!=null,walkTime:gait==null?0:(gait+.1)/.5,actionState:{},combatState:{},visualAction:null});p.appearance||={};p.appearance.hairStyle=p.hairStyle;
    const before=JSON.stringify(p),original=c.drawImage.bind(c);let used=false;c.drawImage=(...args)=>{if(args[0]===asset(art[id].sheet).image)used=true;original(...args);};drawHumanActor(c,p,{x:0,y:0},{scale,animationTime:5});c.drawImage=original;if(!used)throw Error('Missing held weapon '+id);if(before!==JSON.stringify(p))throw Error('Mutated actor');renders++;modelUses++;
   }
   const [overview,c]=create(1600,1660,'RUNALIS · twenty Legendary weapons · four designs per family');
   const pages=[],gaits=[];let row=0;
   for(const [family,ids]of Object.entries(families)){
    const [details,dc]=create(1500,1040,family.toUpperCase()+' · both bodies · front / east / back / west');
    const [motion,mc]=create(1500,1120,family.toUpperCase()+' · original east/west gait · four held frames');
    for(const [col,id]of ids.entries()){
     const item=items[id],x=col*400,y=50+row*320;c.fillStyle='#e6d3a6';c.font='16px sans-serif';c.fillText(item.name,x+16,y+20);c.font='12px sans-serif';c.fillText(item.legendaryPassive.name+' · Legendary · CL50',x+16,y+42);
     c.drawImage(asset(art[id].sheet).image,x+2,y+62,144,192);c.drawImage(asset(art[id].iconSheet).image,x+18,y+265,40,40);
     actor(c,id,'male',1,0,x+210,y+245,2.15);actor(c,id,'female',-1,0,x+330,y+245,2.15);
     const top=60+col*240;dc.font='16px sans-serif';dc.fillStyle='#e6d3a6';dc.fillText(item.name,12,top+18);dc.font='12px sans-serif';dc.fillText(item.legendaryPassive.name,12,top+40);dc.drawImage(asset(art[id].iconSheet).image,20,top+68,48,48);
     for(const [bi,body]of ['male','female'].entries())for(const [di,[dx,dy]]of [[0,1],[1,0],[0,-1],[-1,0]].entries())actor(dc,id,body,dx,dy,250+(bi*4+di)*155,top+200,2);
     for(const [bi,body]of ['male','female'].entries()){const gy=50+col*260+bi*130;mc.fillStyle='#e6d3a6';mc.font='12px sans-serif';mc.fillText(item.name,12,gy+42);mc.fillText(body,12,gy+62);for(const [di,dx]of [1,-1].entries())for(let phase=0;phase<4;phase++)actor(mc,id,body,dx,0,255+(di*4+phase)*155,gy+118,1.65,phase);}
    }
    pages.push({family,png:details.toDataURL()});gaits.push({family,png:motion.toDataURL()});row++;
   }
   // UI consumes authored 32px icons, not the full 96x128 world registration.
   const icons=document.createElement('div');icons.innerHTML=Object.values(items).map(item=>itemIconMarkup(item)).join('');document.body.appendChild(icons);
   for(const [id,a]of Object.entries(art)){const im=new Image();im.src='/assets/art/sprites/'+a.iconSheet+'.png';await im.decode();if(im.width!==32||im.height!==32)throw Error('Bad icon '+id);}
   icons.remove();const [projectiles,pc]=create(640,180,'Grimoire projectiles · light / heavy');
   for(const [id,s]of Object.entries(focus)){const x=45+s.index*155;pc.font='11px sans-serif';pc.fillText(s.name,x-20,65);drawFocusProjectile(pc,{focusItemId:id,kind:'focusBolt',dirX:1,dirY:0},x,95);drawFocusProjectile(pc,{focusItemId:id,kind:'focusLance',dirX:1,dirY:0},x+65,135);}
   return{renders,modelUses,overview:overview.toDataURL(),pages,gaits,projectiles:projectiles.toDataURL()};
  });
  const save=(name,png)=>fs.writeFileSync(out+'/'+name+'.png',Buffer.from(png.split(',')[1],'base64'));save('collection',result.overview);save('projectiles',result.projectiles);for(const p of result.pages)save(p.family+'-directions',p.png);for(const p of result.gaits)save(p.family+'-gait',p.png);
  for(const family of ['grimoires','swords','staves','maces','bows']){
   await page.evaluate(async family=>{const g=legendaryReviewGame(),{LEGENDARY_WEAPON_FAMILIES}=await import('/src/legendaryWeaponData.js'),{addItem}=await import('/src/player.js'),{equipGearEntry}=await import('/src/equipmentProgressionSystem.js');g.player.skillState.combat.level=100;g.player.combatLevel=100;g.player.inventory=[];g.player.equipment={};g.player.equippedGear={};const id=LEGENDARY_WEAPON_FAMILIES[family][0];if(!addItem(g.player,id,1,{gearRarity:'legendary',rarityRollVersion:1,itemLevel:100})||!equipGearEntry(g.player,0))throw Error('Live game equip '+id);g.player.isMoving=false;g.player.dirX=1;g.player.dirY=0;g.paused=true;},family);
   await page.waitForTimeout(120);await page.locator('#game').screenshot({path:out+'/in-game-'+family+'.png'});
  }
  assert.equal(result.renders,520);assert.deepEqual(errors,[]);assert.deepEqual(missing,[]);console.log('PASS',JSON.stringify({weapons:20,renders:result.renders,modelUses:result.modelUses,decodedIcons:20,liveGameFamilies:5,noPageErrors:true,noMissingResources:true}));
 }catch(error){console.error('Browser diagnostics',JSON.stringify({errors,missing}));throw error;}finally{await browser.close();}
})().catch(e=>{console.error(e);process.exitCode=1;});
