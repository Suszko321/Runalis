const {chromium}=require(process.env.RUNALIS_PLAYWRIGHT_MODULE||'../tmp/vampire-browser/node_modules/playwright');
const assert=require('node:assert/strict'),fs=require('node:fs');
(async()=>{const browser=await chromium.launch({channel:'msedge',headless:true});try{
 const page=await browser.newPage({viewport:{width:1400,height:900}}),errors=[];page.on('pageerror',e=>errors.push(e.message));
 await page.goto(process.env.RUNALIS_PREVIEW_URL||'http://127.0.0.1:8772/art-lab.html');
 const result=await page.evaluate(async()=>{
  const {drawVeyreignBat}=await import('/src/veyreignArt.js'),{drawRoyalVampire,drawVampireBat}=await import('/src/vampireArt.js'),{asset}=await import('/src/spriteArt.js');
  const {BAT_ATLASES}=await import('/src/batAtlas.js');
  const {BAT_BEAST_EVOLUTIONS}=await import('/src/batBeastEvolution.js'),royal=asset(BAT_ATLASES.royal),allied=asset(BAT_ATLASES.allied);
  if(!allied.ready)await new Promise((resolve,reject)=>{allied.image.addEventListener('load',resolve,{once:true});allied.image.addEventListener('error',reject,{once:true});});
  if(!royal.ready)await new Promise((resolve,reject)=>{royal.image.addEventListener('load',resolve,{once:true});royal.image.addEventListener('error',reject,{once:true});});
  const canvas=document.createElement('canvas');canvas.width=1400;canvas.height=900;for(const child of document.body.children)child.style.display='none';document.body.appendChild(canvas);document.body.style.cssText='margin:0;background:#201a24';const c=canvas.getContext('2d');
  c.fillStyle='#201a24';c.fillRect(0,0,1400,900);c.fillStyle='#edccd3';c.font='25px Georgia';c.fillText('RUNALIS · Royal Bat lineage',35,42);
  const camera={x:0,y:0},owner={hp:100,bloodline:{id:'vampire'},slot:2,abilityMastery:{callBatBeast:{level:50}}};
  const originalDraw=c.drawImage.bind(c),calls=[];c.drawImage=(...a)=>{calls.push(a);originalDraw(...a);};
  drawVeyreignBat(c,{veyreignFeral:true,hp:100,dirX:1},280,410);const bossImage=calls.at(-1)[0];
  drawRoyalVampire(c,{...owner,x:780,y:360,vampireForm:{active:true,transitionAt:performance.now()/1000-1},dirX:1},camera);const formImage=calls.at(-1)[0];
  const widths=[];let alliedImage;
  for(let i=0;i<5;i++){const stage=BAT_BEAST_EVOLUTIONS[i],s={kind:'vampireBat',vampireMastery:stage.mastery,displayName:stage.name+' Bat Beast',dirX:1};drawVampireBat(c,s,owner,120+i*275,715);const args=calls.at(-1);widths.push(args[7]);alliedImage=args[0];c.fillStyle='#c6e1e7';c.font='17px Georgia';c.fillText('Mastery '+stage.mastery,62+i*275,790);}
  c.drawImage=originalDraw;
  if(bossImage!==royal.image||formImage!==royal.image)throw Error('Boss/form must share new royal image');
  if(alliedImage===royal.image||alliedImage.width!==royal.image.width||alliedImage.height!==royal.image.height)throw Error('Missing allied palette variant');
  const source=document.createElement('canvas');source.width=royal.image.width;source.height=royal.image.height;const sc=source.getContext('2d');sc.drawImage(royal.image,0,0);const a=sc.getImageData(0,0,112,560).data,b=(()=>{const cv=document.createElement('canvas');cv.width=alliedImage.width;cv.height=alliedImage.height;const cc=cv.getContext('2d');cc.drawImage(alliedImage,0,0);return cc.getImageData(0,0,112,560).data;})();
  let changed=0;for(let i=0;i<a.length;i+=4){if(a[i+3]!==b[i+3])throw Error('Recolour changed silhouette alpha');if(a[i+3]&&(a[i]!==b[i]||a[i+1]!==b[i+1]||a[i+2]!==b[i+2]))changed++;}
  if(changed<100)throw Error('Summon palette not visibly distinct');if(!widths.every((v,i)=>!i||v>widths[i-1]))throw Error('Sizes must increase across evolutions');
  c.fillStyle='#edccd3';c.font='19px Georgia';c.fillText('Castle Veyreign · final form',105,470);c.fillText('Royal Bat Beast · player skill',645,430);c.font='18px Georgia';c.fillText('Shared royal sprite · allied silver-blue palette · persistent skill mastery',35,530);
  return {widths,changedPalettePixels:changed,sharedBossAndSkillSprite:true,alphaPreserved:true};
 });assert.deepEqual(errors,[]);fs.mkdirSync('docs/bat-mastery-evolution',{recursive:true});await page.screenshot({path:'docs/bat-mastery-evolution/runtime.png'});fs.writeFileSync('docs/bat-mastery-evolution/browser-verification.json',JSON.stringify({...result,errors},null,2));console.log('PASS '+JSON.stringify(result));
}finally{await browser.close();}})().catch(e=>{console.error(e);process.exitCode=1;});
