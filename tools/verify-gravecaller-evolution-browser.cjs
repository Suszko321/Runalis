const {chromium}=require(process.env.RUNALIS_PLAYWRIGHT_MODULE||'../tmp/vampire-browser/node_modules/playwright');
const assert=require('node:assert/strict'),fs=require('node:fs');
(async()=>{const browser=await chromium.launch({channel:'msedge',headless:true});try{
 const page=await browser.newPage({viewport:{width:1450,height:1950}}),errors=[],missing=[];
 page.on('pageerror',e=>errors.push(e.message));page.on('response',r=>{if(r.status()>=400)missing.push(r.url());});
 await page.goto(process.env.RUNALIS_PREVIEW_URL||'http://127.0.0.1:8772/art-lab.html');
 const result=await page.evaluate(async()=>{
  const {drawSummonAsset}=await import('/src/codeAssets.js'),{asset}=await import('/src/spriteArt.js'),{summonEvolutionPresentation,synchronizeSummonEvolution}=await import('/src/summonEvolution.js'),{GRAVE_EVOLUTION_ART}=await import('/src/gravecallerEvolutionArt.js');
  const names=[...Object.keys(GRAVE_EVOLUTION_ART).map(n=>'grave-evolution-'+n),'summons-core','summons-evolved','summons-ancient','skeleton-forge','bound-dead-specter','bound-dead-knight','lich-acolyte','lich-deathknight','weapons-equipped','armor-equipped','headgear-equipped','accessories-equipped'];
  await Promise.all(names.map(n=>{const a=asset(n);return a.ready?Promise.resolve():new Promise((ok,no)=>{a.image.addEventListener('load',ok,{once:true});a.image.addEventListener('error',()=>no(Error('Missing '+n)),{once:true});});}));
  const defs=[['Skeleton Henchman','lich','base','skeletonServant'],['Bound Specter','lich','acolyte','skeletonServant'],['Lesser Goliath Knight','lich','deathknight','skeletonServant'],['Lich','greaterLich','base','lich'],['Ghostly Specter','greaterLich','acolyte','lich'],['Goliath Deathknight','greaterLich','deathknight','lich'],['Equipped Skeleton','lich','base','skeletonServant',{weapon:'blackIronSword',armour:'graveboundChest',charm:'zephyrglassAmulet'}],['Marksman Skeleton','lich','base','skeletonServant',{},'marksman'],['Legacy Knight Gear','lich','base','skeletalKnight',{weapon:'blackIronSword',armour:'graveboundChest'}]];
  const canvas=document.createElement('canvas');canvas.width=1450;canvas.height=1900;for(const child of document.body.children)child.style.display='none';document.body.appendChild(canvas);document.body.style.cssText='margin:0;background:#23232e';const c=canvas.getContext('2d');c.fillStyle='#23232e';c.fillRect(0,0,1450,1900);c.fillStyle='#e7ded6';c.font='24px sans-serif';c.fillText('RUNALIS · Gravecaller summon evolution',25,35);c.font='17px sans-serif';[1,5,10,20,50].forEach((n,i)=>c.fillText('Mastery '+n,285+i*235,73));
  let cases=0;const rows=[];
  for(const [index,[label,kind,morph,stage,gear,role]]of defs.entries()){
   c.fillStyle='#ddd5d0';c.font='16px sans-serif';c.fillText(label,12,180+index*195);const heights=[];
   for(const [tier,level]of [1,5,10,20,50].entries()){
    const s={kind,summonMorph:morph,summonFamily:kind==='lich'?'boundDead':undefined,evolutionStage:stage,coterieEquipment:gear,skeletonRole:role,dirX:1,x:0,y:0,reviewAnimation:'idle',reviewAnimationTime:0,hp:33,maxHp:100},id=kind==='lich'?'summonLich':'gravecallerSummonLich',owner={abilityMastery:{[id]:{level}}};s.sourceAbilityId=id;synchronizeSummonEvolution(s,owner);
    const cell=document.createElement('canvas');cell.width=230;cell.height=190;const cx=cell.getContext('2d'),draw=cx.drawImage.bind(cx),calls=[];cx.drawImage=(...a)=>{calls.push(a);draw(...a);};
    const bounds=()=>{const d=cx.getImageData(0,0,230,190).data;let t=190,b=-1,l=230,r=-1;for(let y=0;y<190;y++)for(let x=0;x<230;x++)if(d[(y*230+x)*4+3]){t=Math.min(t,y);b=Math.max(b,y);l=Math.min(l,x);r=Math.max(r,x);}if(b<0||t===0||b===189||l===0||r===229)throw Error('Empty or clipped '+label+' '+level+' '+s.reviewAnimation);return b-t+1;};
    for(const facing of [1,-1])for(const [animation,time]of [['idle',0],['walk',.07],['walk',.34],['attack',0]]){
     s.dirX=facing;s.reviewAnimation=animation;s.reviewAnimationTime=time;cx.clearRect(0,0,230,190);calls.length=0;const before=JSON.stringify(s);drawSummonAsset(cx,s,owner,115,160);if(JSON.stringify(s)!==before)throw Error('Actor mutated');bounds();
     const graveCalls=calls.filter(a=>a[0].src?.includes('/grave-evolution-'));
     if(tier===2&&graveCalls.length)throw Error('Original midpoint replaced '+label);
     if(tier!==2){const presentation=summonEvolutionPresentation(s,owner),name=presentation.graveArt,profile=GRAVE_EVOLUTION_ART[name],expectedFrame=animation==='idle'?0:animation==='attack'?3:time<.1?1:2;
      if(graveCalls.length!==1||!graveCalls[0][0].src.endsWith('grave-evolution-'+name+'.png')||graveCalls[0][1]!==expectedFrame*profile.width||graveCalls[0][2]!==[0,1,-1,2,3][tier]*profile.height)throw Error('Wrong body/pose '+label+' '+level+' '+animation);
      if(gear?.weapon&&!calls.some(a=>a[0].src?.endsWith('weapons-equipped.png')))throw Error('Equipped weapon missing');
      if(gear?.armour&&!calls.some(a=>a[0].src?.endsWith('armor-equipped.png')||a[0].src?.includes('armor-motion-')||a[0] instanceof HTMLCanvasElement))throw Error('Equipped armour missing');
      if(gear?.charm&&!calls.some(a=>a[0].src?.endsWith('accessories-equipped.png')))throw Error('Equipped charm missing');
     }cases++;
    }
    s.dirX=1;s.reviewAnimation='idle';s.reviewAnimationTime=0;cx.clearRect(0,0,230,190);drawSummonAsset(cx,s,owner,115,160);heights.push(bounds());c.drawImage(cell,220+tier*235,86+index*195);
   }
   if(!heights.every((h,i)=>!i||h>heights[i-1]))throw Error('Non-growing '+label+' '+heights.join(','));rows.push({label,heights});
  }
  for(const [name,profile]of Object.entries(GRAVE_EVOLUTION_ART)){
   const im=asset('grave-evolution-'+name).image,cv=document.createElement('canvas');cv.width=im.width;cv.height=im.height;const cc=cv.getContext('2d');cc.drawImage(im,0,0);const d=cc.getImageData(0,0,cv.width,cv.height).data,colors=new Set();
   for(let y=0;y<cv.height;y++)for(let x=0;x<cv.width;x++){const at=(y*cv.width+x)*4,a=d[at+3];if(a!==0&&a!==255)throw Error('Soft alpha '+name);if(a){colors.add(d.slice(at,at+3).join(','));if(x%profile.width===0||x%profile.width===profile.width-1||y%profile.height===0||y%profile.height===profile.height-1)throw Error('Cell edge '+name);}}
   if(colors.size>32)throw Error('Palette overflow '+name);
  }
  return {cases,rows,sourceMatchedPalettes:6,authoredPoses:96};
 });assert.deepEqual(errors,[]);assert.deepEqual(missing,[]);await page.screenshot({path:'docs/gravecaller-evolution/runtime-all.png'});await page.screenshot({path:'docs/gravecaller-evolution/runtime.png',clip:{x:0,y:0,width:1450,height:1260}});fs.writeFileSync('docs/gravecaller-evolution/browser-verification.json',JSON.stringify({...result,errors,missing},null,2));console.log('PASS '+JSON.stringify(result));
}finally{await browser.close();}})().catch(e=>{console.error(e);process.exitCode=1;});
