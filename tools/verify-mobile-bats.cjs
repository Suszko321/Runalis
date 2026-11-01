const {chromium,webkit}=require(process.env.RUNALIS_PLAYWRIGHT_MODULE||'../tmp/vampire-browser/node_modules/playwright');
const fs=require('node:fs'),assert=require('node:assert/strict'),{execFileSync}=require('node:child_process');
const base=process.env.RUNALIS_URL||'http://127.0.0.1:8772',out='docs/mobile-bats';fs.mkdirSync(out,{recursive:true});
async function limitCanvas(context){await context.addInitScript(()=>{
 window.mobileCanvasViolations=[];const get=HTMLCanvasElement.prototype.getContext;
 HTMLCanvasElement.prototype.getContext=function(...args){if(this.width>4096||this.height>4096){mobileCanvasViolations.push([this.width,this.height]);return null;}return get.apply(this,args);};
});}
(async()=>{const report={profiles:[]};
 if(process.argv.includes('--reproduce-before')){
  const browser=await chromium.launch({channel:'msedge',headless:true});try{
   const context=await browser.newContext({viewport:{width:390,height:844},isMobile:true,deviceScaleFactor:3});await limitCanvas(context);
   const oldSource=execFileSync('git',['show','8bd4398:src/vampireArt.js'],{encoding:'utf8'});
   const page=await context.newPage();await page.route('**/src/vampireArt.js',route=>route.fulfill({contentType:'text/javascript',body:oldSource}));await page.goto(base+'/art-lab.html');
   report.before=await page.evaluate(async()=>{const {drawVampireBat}=await import('/src/vampireArt.js'),{asset}=await import('/src/spriteArt.js'),a=asset('veyreign-royal-blood-beast');if(!a.ready)await new Promise((ok,no)=>{a.image.onload=()=>{a.ready=true;ok();};a.image.onerror=no;});const cv=document.createElement('canvas');cv.width=390;cv.height=844;let error;try{drawVampireBat(cv.getContext('2d'),{kind:'vampireBat'},{slot:1},100,200);}catch(e){error=e.message;}return {error,oversized:mobileCanvasViolations};});
   assert(report.before.error);assert.deepEqual(report.before.oversized,[[5376,560]]);console.log('REPRODUCED old mobile canvas failure: '+JSON.stringify(report.before));
  }finally{await browser.close();}
 }
 for(const [name,type,options]of [['Chromium',chromium,{channel:'msedge',headless:true}],['WebKit',webkit,{headless:true}]]){
  const browser=await type.launch(options);try{
   for(const viewport of [{width:390,height:844},{width:844,height:390}]){
    const context=await browser.newContext({viewport,isMobile:true,hasTouch:true,deviceScaleFactor:3});await limitCanvas(context);const page=await context.newPage(),errors=[],requests=[];
    page.on('pageerror',e=>errors.push(e.message));page.on('request',r=>requests.push(r.url()));await page.goto(base+'/art-lab.html');
    const result=await page.evaluate(async({width,height})=>{
     const {asset}=await import('/src/spriteArt.js'),{BAT_ATLASES}=await import('/src/batAtlas.js'),{drawVeyreignBat,royalBeastScale}=await import('/src/veyreignArt.js'),{drawRoyalVampire,drawVampireBat}=await import('/src/vampireArt.js');
     const records=Object.values(BAT_ATLASES).map(n=>asset(n));await Promise.all(records.map(a=>a.ready?Promise.resolve():new Promise((ok,no)=>{a.image.addEventListener('load',ok,{once:true});a.image.addEventListener('error',no,{once:true});})));
     for(const a of records)if(a.image.width>512||a.image.height>560)throw Error('Oversized runtime sheet');
     const canvas=document.createElement('canvas');canvas.width=width;canvas.height=height;for(const child of document.body.children)child.style.display='none';document.body.appendChild(canvas);document.body.style.cssText='margin:0;background:#24212b';canvas.style.cssText='display:block;width:100%;height:auto';
     const c=canvas.getContext('2d');c.fillStyle='#24212b';c.fillRect(0,0,width,height);c.fillStyle='#ead6d2';c.font='16px sans-serif';c.fillText('RUNALIS · mobile bat sprites',14,24);const calls=[],draw=c.drawImage.bind(c);c.drawImage=(...args)=>{calls.push(args);draw(...args);};
     const portrait=height>width,owner={slot:1,hp:100,bloodline:{id:'vampire'},vampireForm:{active:true,transitionAt:performance.now()/1000-2},x:portrait?290:250,y:portrait?150:145,dirX:1};
     if(!drawVeyreignBat(c,{batBeast:true,hp:100,dirX:1},80,portrait?150:145))throw Error('Ordinary bat missing');
     if(!drawRoyalVampire(c,owner,{x:0,y:0}))throw Error('Royal skill missing');
     if(!drawVeyreignBat(c,{veyreignFeral:true,hp:100,dirX:-1},portrait?width/2:610,portrait?405:245))throw Error('Royal boss missing');
     const widths=[];for(const [i,level]of [1,5,10,20,50].entries()){
      const x=portrait?(i===4?width/2:i%2?290:90):90+i*150,y=portrait?(i===4?790:535+Math.floor(i/2)*125):355;
      drawVampireBat(c,{kind:'vampireBat',vampireMastery:level,dirX:i%2?-1:1},owner,x,y);widths.push(calls.at(-1)[7]);c.fillStyle='#cce6e9';c.font='12px sans-serif';c.textAlign='center';c.fillText('Mastery '+level,x,y+22);
     }
     if(calls.length!==8)throw Error('Unexpected render fallback');
     const expected=[records[0].image,records[1].image,records[1].image,...Array(5).fill(records[2].image)];
     calls.forEach((args,i)=>{if(args[0]!==expected[i])throw Error('Wrong or missing sprite '+i);if(args[1]<0||args[2]<0||args[1]+args[3]>args[0].width||args[2]+args[4]>args[0].height)throw Error('Out-of-bounds crop');});
     if(112*royalBeastScale(height,width)>width-32)throw Error('Boss exceeds narrow view');
     return {sizes:records.map(a=>[a.image.width,a.image.height]),widths,draws:calls.length,oversized:mobileCanvasViolations,portrait};
    },viewport);
    assert.deepEqual(errors,[]);assert.deepEqual(result.oversized,[]);assert.deepEqual(result.widths,[84,98,112,126,140]);assert(!requests.some(url=>/\/veyreign-(?:royal-blood-beast|bat-beast)\.png(?:\?|$)/.test(url)),'Wide/stale authoring atlas was requested');
    await page.screenshot({path:`${out}/${name.toLowerCase()}-${viewport.width}.png`});report.profiles.push({engine:name,viewport,...result,errors});await context.close();
   }
  }finally{await browser.close();}
 }
 fs.writeFileSync(out+'/verification.json',JSON.stringify(report,null,2));console.log('PASS '+report.profiles.length+' mobile engine/orientation profiles; all sprites, mastery sizes, compact crops, legacy canvas guard and boss fit');
})().catch(e=>{console.error(e);process.exitCode=1;});
