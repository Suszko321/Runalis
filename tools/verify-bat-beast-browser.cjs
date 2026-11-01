// Production renderer/source-grid contract. Run against tools/serve.py (default port 8766).
const {chromium}=require(process.env.RUNALIS_PLAYWRIGHT_MODULE||'playwright');
const fs=require('node:fs');
(async()=>{
 const browser=await chromium.launch({channel:'msedge',headless:true});
 try{
  const page=await browser.newPage({viewport:{width:560,height:780},deviceScaleFactor:1});
  await page.goto(process.argv[2]||'http://127.0.0.1:8766/art-lab.html');
  const result=await page.evaluate(async()=>{
   const {drawVeyreignBat}=await import('/src/veyreignArt.js');
   const {asset}=await import('/src/spriteArt.js');
   const {BAT_ATLASES,batAtlasColumn}=await import('/src/batAtlas.js');
   const {beginEnemyAttackPresentation}=await import('/src/enemyAttackPresentation.js');
   const bat=asset(BAT_ATLASES.bat);
   if(!bat.ready)await new Promise((resolve,reject)=>{bat.image.addEventListener('load',resolve,{once:true});bat.image.addEventListener('error',reject,{once:true});});
   if(bat.image.width!==384||bat.image.height!==480)throw Error('Atlas size mismatch');
   const canvas=document.createElement('canvas');canvas.width=560;canvas.height=780;
   document.body.replaceChildren(canvas);document.body.style.cssText='margin:0;background:#28232a';
   const c=canvas.getContext('2d');c.fillStyle='#28232a';c.fillRect(0,0,560,780);
   let now=100,calls=0;const original=Object.getOwnPropertyDescriptor(performance,'now');
   Object.defineProperty(performance,'now',{configurable:true,value:()=>now*1000});
   const states=['idle','anticipation','execution','recovery','hit','death'];
   try{
    for(let row=0;row<6;row++){
     c.fillStyle='#d8c5ab';c.font='12px monospace';c.fillText(states[row],10,row*130+16);
     const e={batBeast:true,hp:row===5?0:100,x:0,y:0,hitFlash:row===4?1:0};
     now=100; if(row===5)drawVeyreignBat(c,e,-1000,-1000);
     for(let col=0;col<16;col++){
      now=row===5?100+(col+.01)/16*.9:100+(col+.01)/12;
      if(row>=1&&row<=3){const elapsed=[0,.2,1.05,1.4][row];beginEnemyAttackPresentation(e,{kind:'basicStrike',maxTime:1,time:1,recovery:2},now-elapsed);}
      let args;const draw=c.drawImage.bind(c);c.drawImage=(...a)=>{args=a;draw(...a);};
      const visible=col%4===0;
      if(!drawVeyreignBat(c,e,visible?70+(col/4)*135:-1000,row*130+112))throw Error('Bat did not render');
      c.drawImage=draw;
      if(args[1]!==batAtlasColumn('bat',row,col)*96||args[2]!==row*80||args[3]!==96||args[4]!==80)throw Error(`Wrong crop ${row}/${col}: ${args.slice(1,5)}`);
      calls++;
     }
    }
    const draw=c.drawImage.bind(c);let mirrored=false;
    c.drawImage=(...a)=>{mirrored=c.getTransform().a===-1;draw(...a);};
    drawVeyreignBat(c,{batBeast:true,hp:100,dirX:-1},-1000,-1000);c.drawImage=draw;
    if(!mirrored)throw Error('Left-facing Bat Beast was not mirrored');
   }finally{if(original)Object.defineProperty(performance,'now',original);else delete performance.now;}
   return {draws:calls,states:states.length,sourceCell:[96,80],artworkOnly:true};
  });
  fs.mkdirSync('docs/art-audit/bat-beast',{recursive:true});
  await page.locator('canvas').screenshot({path:'docs/art-audit/bat-beast/runtime.png'});
  console.log('PASS',JSON.stringify(result));
 }finally{await browser.close();}
})().catch(e=>{console.error(e);process.exitCode=1;});
