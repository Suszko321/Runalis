const {chromium}=require(process.env.RUNALIS_NODE_MODULES+'/playwright');
const assert=require('node:assert/strict'),fs=require('node:fs');
(async()=>{const browser=await chromium.launch({channel:'msedge',headless:true}),out='docs/player-ground-indicator',errors=[];fs.mkdirSync(out,{recursive:true});try{
 const page=await browser.newPage({viewport:{width:1120,height:760}});page.on('pageerror',e=>errors.push(e.message));await page.goto((process.env.RUNALIS_URL||'http://127.0.0.1:8766')+'/art-lab.html');
 const report=await page.evaluate(async()=>{
  const {drawPlayerGroundIndicator}=await import('/src/playerGroundIndicator.js'),{partyColor,PARTY_COLORS}=await import('/src/partyIdentity.js'),{drawHumanActor}=await import('/src/humanRenderer.js'),{createPlayer,chooseClass}=await import('/src/player.js'),{draw}=await import('/src/render.js'),{createCapitalHubWorld}=await import('/src/hubSystem.js');
  const check=(ok,message)=>{if(!ok)throw Error(message);};const canvas=document.createElement('canvas');canvas.width=1120;canvas.height=760;canvas.id='indicator-review';for(const node of document.body.children)node.style.display='none';document.body.append(canvas);const c=canvas.getContext('2d'),camera={x:13,y:21},directions=[[0,-1],[1,-1],[1,0],[1,1],[0,1],[-1,1],[-1,0],[-1,-1]],names=['N','NE','E','SE','S','SW','W','NW'];
  let checks=0;
  for(let slot=1;slot<=4;slot++)for(const [dirX,dirY]of directions){
   const actor={x:100,y:80,slot,dirX,dirY},before=JSON.stringify(actor),arrows=[],rings=[];let path=[];
   const methods={beginPath:c.beginPath,moveTo:c.moveTo,lineTo:c.lineTo,ellipse:c.ellipse,fill:c.fill};
   c.beginPath=function(...args){path=[];return methods.beginPath.apply(this,args);};c.moveTo=function(x,y){path.push([x,y]);return methods.moveTo.call(this,x,y);};c.lineTo=function(x,y){path.push([x,y]);return methods.lineTo.call(this,x,y);};c.ellipse=function(...args){rings.push({args,color:this.strokeStyle,alpha:this.globalAlpha,matrix:this.getTransform()});return methods.ellipse.apply(this,args);};c.fill=function(...args){arrows.push({path:[...path],color:this.fillStyle,alpha:this.globalAlpha});return methods.fill.apply(this,args);};
   c.save();c.globalAlpha=.5;c.strokeStyle='#123456';c.lineWidth=3;c.translate(5,7);const matrix=c.getTransform();drawPlayerGroundIndicator(c,actor,camera,.96);
   check(c.globalAlpha===.5&&c.strokeStyle==='#123456'&&c.lineWidth===3,'Canvas style leak');check(c.getTransform().e===matrix.e&&c.getTransform().f===matrix.f,'Canvas transform leak');c.restore();for(const [name,method]of Object.entries(methods))c[name]=method;
   check(before===JSON.stringify(actor),'Actor mutated');check(rings.length===1&&arrows.length===1,'One ring and arrow');check(rings[0].color===PARTY_COLORS[slot-1]&&arrows[0].color===PARTY_COLORS[slot-1],'Wrong player colour');check(Math.abs(rings[0].alpha-.09)<.001&&Math.abs(arrows[0].alpha-.14)<.001,'Opacity not inherited');const tip=arrows[0].path[0],length=Math.hypot(dirX,dirY);check(Math.abs(tip[0]/24-dirX/length)<.0001&&Math.abs((tip[1]-2)/12-dirY/length)<.0001,'Arrow facing mismatch');checks++;
  }
  check(partyColor({partyMapSlot:3,slot:1})===PARTY_COLORS[2],'Online authoritative slot not retained');
  const players=Array.from({length:4},(_,i)=>{const p=createPlayer('Player '+(i+1));chooseClass(p,'oathkeeper');p.slot=i+1;p.x=150+i*100;p.y=140;return p;});players[0].coop={enabled:true,players:players.slice(1)};
  const world=createCapitalHubWorld(),rings=[],ellipse=c.ellipse;c.ellipse=function(...args){if(args[2]===19&&args[3]===9)rings.push(this.strokeStyle);return ellipse.apply(this,args);};draw(c,world,players[0],{x:0,y:0});c.ellipse=ellipse;check(rings.length===4&&new Set(rings).size===4,'Production render must mark all four players exactly once');
  // Repeat after assets have decoded, then capture a review of every facing.
  const render=()=>{c.clearRect(0,0,canvas.width,canvas.height);c.fillStyle='#191c1a';c.fillRect(0,0,canvas.width,canvas.height);for(let slot=1;slot<=4;slot++)for(let i=0;i<8;i++){const x=70+i*140,y=110+(slot-1)*180,p=players[slot-1];c.fillStyle=slot%2?'#454d3d':'#392b36';c.fillRect(x-65,y-90,130,170);const actor={...p,x,y,dirX:directions[i][0],dirY:directions[i][1],isMoving:false,walkTime:0};drawHumanActor(c,actor,{x:0,y:0},{scale:1.5,animationTime:0});drawPlayerGroundIndicator(c,actor,{x:0,y:0},1.5);c.fillStyle=partyColor(actor);c.font='13px sans-serif';c.textAlign='center';c.fillText('P'+slot+' · '+names[i],x,y+62);}};render();await new Promise(r=>setTimeout(r,800));render();
  return {facingAndColourCases:checks,productionPlayers:rings.length,onlineSlotColour:true,canvasStatePreserved:true,actorStatePreserved:true};
 });
 await page.locator('#indicator-review').screenshot({path:out+'/four-players-eight-facings.png'});assert.deepEqual(errors,[]);console.log('PASS',JSON.stringify({...report,noPageErrors:true}));
}finally{await browser.close();}})().catch(e=>{console.error(e);process.exitCode=1;});
