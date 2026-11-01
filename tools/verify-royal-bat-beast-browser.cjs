// Royal production renderer, seven state rows, transformation and scale contracts.
const {chromium}=require(process.env.RUNALIS_PLAYWRIGHT_MODULE||'playwright');
const fs=require('node:fs');
(async()=>{
 const browser=await chromium.launch({channel:'msedge',headless:true});
 try{
  const page=await browser.newPage({viewport:{width:1000,height:780},deviceScaleFactor:1});
  await page.goto(process.argv[2]||'http://127.0.0.1:8766/art-lab.html');
  const result=await page.evaluate(async()=>{
   const {drawVeyreignBat,royalBeastScale}=await import('/src/veyreignArt.js');
   const {asset}=await import('/src/spriteArt.js');
   const {beginEnemyAttackPresentation}=await import('/src/enemyAttackPresentation.js');
   const royal=asset('veyreign-royal-blood-beast'),bat=asset('veyreign-bat-beast');
   for(const a of [royal,bat])if(!a.ready)await new Promise((resolve,reject)=>{a.image.addEventListener('load',resolve,{once:true});a.image.addEventListener('error',reject,{once:true});});
   if(royal.image.width!==5376||royal.image.height!==560)throw Error('Atlas size mismatch');
   if(royalBeastScale(300)!==3||royalBeastScale(780)!==4)throw Error('Boss scale changed');
   const canvas=document.createElement('canvas');canvas.width=1000;canvas.height=780;
   document.body.replaceChildren(canvas);document.body.style.cssText='margin:0;background:#28232a';
   const c=canvas.getContext('2d');let now=100,draws=0,hidden=0;
   const original=Object.getOwnPropertyDescriptor(performance,'now');
   Object.defineProperty(performance,'now',{configurable:true,value:()=>now*1000});
   try{
    for(let row=0;row<7;row++){
     const e={veyreignFeral:true,hp:row===6?0:100,x:0,y:0,hitFlash:row===5?1:0};
     now=100;if(row===6)drawVeyreignBat(c,e,-1000,-1000);
     for(let col=0;col<48;col++){
      now=row===6?100+(col+.01)/48*1.3:100+(col+.01)/12;
      if(row===0)e.veyreignTransform=(col+.01)/48*4;
      if(row>=2&&row<=4)beginEnemyAttackPresentation(e,{kind:'basicStrike',maxTime:1,time:1,recovery:2},now-[0,0,.2,1.05,1.4][row]);
      let args;const draw=c.drawImage.bind(c);c.drawImage=(...a)=>{args=a;draw(...a);};
      const visible=drawVeyreignBat(c,e,-1000,-1000);c.drawImage=draw;
      if(row===0&&e.veyreignTransform<.7){if(visible||args)throw Error('Early transformation must remain hidden');hidden++;continue;}
      if(!visible||!args||args[1]!==col*112||args[2]!==row*80||args[3]!==112||args[4]!==80)throw Error(`Wrong crop ${row}/${col}`);
      draws++;
     }
    }
    let mirrored=false;const draw=c.drawImage.bind(c);
    c.drawImage=(...a)=>{mirrored=c.getTransform().a===-1;draw(...a);};
    drawVeyreignBat(c,{veyreignFeral:true,hp:100,dirX:-1},-1000,-1000);c.drawImage=draw;
    if(!mirrored)throw Error('Missing left-facing mirror');
    now=100;c.fillStyle='#28232a';c.fillRect(0,0,1000,780);
    c.fillStyle='#dbc9ae';c.font='18px Georgia';c.fillText('Royal Vampire Bat Beast — production boss scale',24,38);
    drawVeyreignBat(c,{veyreignFeral:true,hp:100,dirX:1},245,370);
    c.font='14px monospace';c.fillStyle='#dbc9ae';c.fillText('Royal: native size for future summon',520,86);
    c.imageSmoothingEnabled=false;c.drawImage(royal.image,0,80,112,80,600,108,112,80);
    c.fillText('Ordinary Bat Beast: current game size',520,240);
    drawVeyreignBat(c,{batBeast:true,hp:100},660,350);
    c.fillStyle='#dbc9ae';c.fillText('Seven states — four authored poses each (native size)',24,430);
    for(let row=0;row<7;row++)for(let pose=0;pose<4;pose++){
     const col=(row===0||row===6)?pose*12:pose*3;
     c.drawImage(royal.image,col*112,row*80,112,80,24+pose*125+Math.floor(row/4)*500,452+(row%4)*80,112,80);
    }
   }finally{if(original)Object.defineProperty(performance,'now',original);else delete performance.now;}
   return {draws,hiddenTransformationSlots:hidden,states:7,sourceCell:[112,80],mirroring:true};
  });
  fs.mkdirSync('docs/art-audit/royal-bat-beast',{recursive:true});
  await page.locator('canvas').screenshot({path:'docs/art-audit/royal-bat-beast/runtime.png'});
  console.log('PASS',JSON.stringify(result));
 }finally{await browser.close();}
})().catch(e=>{console.error(e);process.exitCode=1;});
