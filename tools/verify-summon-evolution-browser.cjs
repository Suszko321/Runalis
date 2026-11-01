const {chromium}=require(process.env.RUNALIS_PLAYWRIGHT_MODULE||'../tmp/vampire-browser/node_modules/playwright');
const assert=require('node:assert/strict'),fs=require('node:fs');
(async()=>{const browser=await chromium.launch({channel:'msedge',headless:true});try{
 const page=await browser.newPage({viewport:{width:1400,height:2700}}),errors=[];page.on('pageerror',e=>errors.push(e.message));
 await page.goto(process.env.RUNALIS_PREVIEW_URL||'http://127.0.0.1:8772/art-lab.html');
 const report=await page.evaluate(async()=>{
  const {drawSummonAsset}=await import('/src/codeAssets.js'),{asset}=await import('/src/spriteArt.js'),{synchronizeSummonEvolution}=await import('/src/summonEvolution.js');
  const names=['summons-core','summons-evolved','summons-ancient','arcane-special','enemies-core','bound-dead-specter','bound-dead-knight','lich-acolyte','lich-deathknight','skeleton-forge',...['sentinel','stalker','siegebeast','titan'].map(n=>'petalknight-rose-'+n),...['fae-thornling','fae-elder','rose-siegebeast'].map(n=>'summon-evolution-'+n)];
  await Promise.all(names.map(n=>{const a=asset(n);return a.ready?Promise.resolve():new Promise((ok,no)=>{a.image.addEventListener('load',ok,{once:true});a.image.addEventListener('error',()=>no(Error('Asset '+n)),{once:true});});}));
  const definitions=[['Fae Thornling','thornbeast','fae','thornling'],['Fae Elder','thornbeast','fae','elderThornbeast'],['Rose Siegebeast','thornbeast','petalknight','elderThornbeast'],['Rose Sentinel','thornbeast','petalknight','thornling'],['Thornling','thornbeast','base','thornling'],['Elder Thornbeast','thornbeast','base','elderThornbeast'],['Wolf','wolf','base','wolf'],['Demon','miniDemon','base','miniDemon'],['Bound Dead','lich','base','skeletalKnight'],['Bound Specter','lich','acolyte','skeletonServant'],['Bound Knight','lich','deathknight','skeletonServant'],['Lich','greaterLich','base','lich'],['Lich Specter','greaterLich','acolyte','lich'],['Lich Deathknight','greaterLich','deathknight','lich'],['Eldritch Horror','eldritchHorror','base','oldHorror']];
  const canvas=document.createElement('canvas');canvas.width=1400;canvas.height=2600;for(const child of document.body.children)child.style.display='none';document.body.appendChild(canvas);document.body.style.cssText='margin:0;background:#23232e';const c=canvas.getContext('2d');c.fillStyle='#23232e';c.fillRect(0,0,1400,2600);c.fillStyle='#f0e6ed';c.font='24px sans-serif';c.fillText('RUNALIS · summon mastery evolution',25,35);c.font='16px sans-serif';[1,5,10,20,50].forEach((n,i)=>c.fillText('Mastery '+n,270+i*230,70));
  const results=[];
  definitions.forEach(([label,kind,morph,stage],index)=>{
   const heights=[],hashes=[],sources=[];c.fillStyle='#ddd5df';c.font='16px sans-serif';c.fillText(label,12,160+index*160);
   [1,5,10,20,50].forEach((level,tier)=>{
    const s={kind,summonMorph:morph,evolutionStage:stage,summonFamily:kind==='lich'?'boundDead':undefined,dirX:1,x:0,y:0,hp:50,maxHp:100,damage:7,reviewAnimation:'idle',reviewAnimationTime:0};
    const ability=kind==='thornbeast'?(stage==='elderThornbeast'?'thornbinderSummonElderThornbeast':'thornbinderSummonThornlings'):({wolf:'summonWolf',miniDemon:'summonDemon',lich:'summonLich',greaterLich:'gravecallerSummonLich',eldritchHorror:'summonEldritchHorror'}[kind]);
    s.sourceAbilityId=ability;const owner={abilityMastery:{[ability]:{level}}};synchronizeSummonEvolution(s,owner);const before=JSON.stringify(s);
    const cell=document.createElement('canvas');cell.width=220;cell.height=155;const cx=cell.getContext('2d'),images=[],draw=cx.drawImage.bind(cx);cx.drawImage=(...args)=>{images.push(args[0]);draw(...args);};
    drawSummonAsset(cx,s,owner,110,128);if(JSON.stringify(s)!==before)throw Error('Renderer changed actor '+label);
    const d=cx.getImageData(0,0,220,155).data;let top=155,bottom=-1,left=220,right=-1,hash=0;
    for(let y=0;y<155;y++)for(let x=0;x<220;x++){const at=(y*220+x)*4;if(d[at+3]){top=Math.min(top,y);bottom=Math.max(bottom,y);left=Math.min(left,x);right=Math.max(right,x);hash=(hash*31+d[at]+d[at+1]*3+d[at+2]*5+at)>>>0;}}
    if(bottom<0||left===0||right===219||top===0||bottom===154)throw Error('Empty/clipped '+label+' '+level);
    heights.push(bottom-top+1);hashes.push(hash);sources.push(images.at(-1)?.src||'cached palette/outlined frame');c.drawImage(cell,210+tier*230,88+index*160);
   });
   if(new Set(hashes).size!==5)throw Error('Missing visual tier '+label);
   if(!heights.every((height,i)=>!i||height>heights[i-1]))throw Error('Non-growing '+label+' '+heights.join(','));
   results.push({label,heights,sources});
  });
  // Every generated pose has hard alpha, an empty cell border, and a bounded palette.
  for(const name of ['fae-thornling','fae-elder','rose-siegebeast']){
   const im=asset('summon-evolution-'+name).image,w=im.width/4,h=144,cv=document.createElement('canvas');cv.width=im.width;cv.height=im.height;const cc=cv.getContext('2d');cc.drawImage(im,0,0);const d=cc.getImageData(0,0,cv.width,cv.height).data,colors=new Set();
   for(let y=0;y<cv.height;y++)for(let x=0;x<cv.width;x++){const at=(y*cv.width+x)*4,a=d[at+3];if(a!==0&&a!==255)throw Error('Soft alpha '+name);if(a){colors.add(d.slice(at,at+3).join(','));if(x%w===0||x%w===w-1||y%h===0||y%h===h-1)throw Error('Cell edge '+name);}}
   if(colors.size>(name.startsWith('fae')?13:40))throw Error('Palette '+name);
   const {drawSummonEvolutionArt}=await import('/src/summonEvolutionArt.js');
   for(const tier of [0,1,3,4]){
    const cv=document.createElement('canvas');cv.width=220;cv.height=160;const cx=cv.getContext('2d'),crops=[];
    cx.drawImage=(...args)=>crops.push(args.slice(1,5));
    const s={kind:'thornbeast',summonMorph:name.startsWith('fae')?'fae':'petalknight',evolutionStage:name==='fae-thornling'?'thornling':'elderThornbeast',dirX:1};
    for(const [animation,time]of [['idle',0],['walk',0],['walk',.13],['attack',0]]){s.reviewAnimation=animation;s.reviewAnimationTime=time;drawSummonEvolutionArt(cx,s,{art:name,tier},110,130);}
    const width=im.width/4;if(!crops.every((crop,i)=>crop[0]===i*width&&crop[1]===[0,1,-1,2,3][tier]*144))throw Error('Wrong animation crop '+name+' tier '+tier);
   }
  }
  return results;
 });assert.deepEqual(errors,[]);fs.mkdirSync('docs/summon-evolution',{recursive:true});await page.screenshot({path:'docs/summon-evolution/runtime-all.png'});await page.screenshot({path:'docs/summon-evolution/runtime-thornbinder.png',clip:{x:0,y:0,width:1400,height:740}});fs.writeFileSync('docs/summon-evolution/browser-verification.json',JSON.stringify({report,errors},null,2));console.log('PASS '+report.length+' families/variants × five tiers, no clipped sprites, strict growth, bounded palettes, hard alpha and no actor mutations');
}finally{await browser.close();}})().catch(e=>{console.error(e);process.exitCode=1;});
