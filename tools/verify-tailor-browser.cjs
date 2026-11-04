const assert = require('node:assert/strict');
const {chromium} = require(process.env.RUNALIS_NODE_MODULES+'/playwright');

(async()=>{
  const browser = await chromium.launch({channel:'msedge',headless:true});
  try {
    const page = await browser.newPage({viewport:{width:844,height:390},isMobile:true,hasTouch:true});
    const errors = [];
    page.on('pageerror',error=>errors.push(error.message));
    const url = process.env.RUNALIS_URL||'http://127.0.0.1:8885';
    await page.goto(url+'/art-lab.html');
    await page.addStyleTag({url:url+'/style.css'});
    const report = await page.evaluate(async()=>{
      const {ITEMS,TILE}=await import('/src/data.js');
      const {createPlayer}=await import('/src/player.js');
      const {createCapitalHubWorld}=await import('/src/hubSystem.js');
      const {interact}=await import('/src/gameInteraction.js');
      const {classifyRadarMarker}=await import('/src/minimapRadar.js');
      const {normalizeProfileSave}=await import('/src/saveProfiles.js');
      const {drawHumanActor}=await import('/src/humanRenderer.js');
      const {asset,spriteArtStatus}=await import('/src/spriteArt.js');
      const {fittedWearable}=await import('/src/playerWearableArt.js');
      const {isActorPositionPassable}=await import('/src/world.js');
      const {gearDye}=await import('/src/gearDye.js');
      const check = (pass,message) => {if(!pass) throw Error(message);};
      const player=createPlayer('Tailor test');
      const world=createCapitalHubWorld();
      const npc=world.objects.find(o=>o.tailorService);
      check(npc && classifyRadarMarker(npc,'object').shape==='needle','Needle marker');
      const tile=(x,y)=>[Math.floor(x/TILE),Math.floor(y/TILE)];
      const queue=[tile(world.spawn.x,world.spawn.y)],visited=new Set();
      for(let i=0;i<queue.length;i++){
        const [x,y]=queue[i],key=x+','+y;
        if(visited.has(key)||!isActorPositionPassable(world,(x+.5)*TILE,(y+.5)*TILE,12))continue;
        visited.add(key);
        queue.push([x+1,y],[x-1,y],[x,y+1],[x,y-1]);
      }
      check(visited.has(tile(npc.x,npc.y).join(',')),'Tailor house is reachable');
      Object.assign(player,world.spawn);
      player.equipment={helm:'clothHood',chest:'apprenticeRobe',legs:'roughLegwraps',weapon:'oldKnife'};
      const game={player,world,log(){}};
      interact(game);
      check(!document.querySelector('#tailorOverlay'),'Range is enforced');
      Object.assign(player,{x:npc.x,y:npc.y+24});
      interact(game);
      const dialog=document.querySelector('#tailorOverlay');
      check(dialog?.open,'Interact opened the tailor');
      check(dialog.getBoundingClientRect().width<=innerWidth,'Tailor fits mobile');
      check(dialog.querySelectorAll('[data-slot]').length===3,'Only worn armour is listed');
      dialog.querySelector('[data-dye]').click();
      check(!gearDye(player,'helm'),'Preview is isolated');
      dialog.querySelector('[data-apply]').click();
      check(gearDye(player,'helm')==='#ad5949','Applied colour');
      check(gearDye(normalizeProfileSave(JSON.parse(JSON.stringify(player))),'helm')==='#ad5949','Saved colour survives reload');
      dialog.querySelector('[data-reset]').click();
      dialog.querySelector('[data-apply]').click();
      check(!gearDye(player,'helm'),'Restored original');
      dialog.querySelector('[data-close]').click();
      await new Promise(requestAnimationFrame);

      const garments=Object.values(ITEMS).filter(i=>i.type==='armour');
      for(const item of garments)asset(fittedWearable(item.id).sheet);
      const canvas=document.createElement('canvas');
      canvas.width=128;canvas.height=128;
      const ctx=canvas.getContext('2d',{willReadFrequently:true});
      const actor={...player,x:64,y:80,appearance:{},equipment:{}};
      drawHumanActor(ctx,actor,{x:0,y:0});
      for(let i=0;i<160&&spriteArtStatus().some(a=>!a.ready&&!a.failed);i++)await new Promise(r=>setTimeout(r,20));
      check(!spriteArtStatus().some(a=>a.failed),'Sprite decode failure');
      const render = () => {
        ctx.clearRect(0,0,128,128);
        drawHumanActor(ctx,actor,{x:0,y:0},{animationTime:0});
        return ctx.getImageData(0,0,128,128).data;
      };
      let poses=0;
      for(const item of garments)for(const bodyType of ['male','female'])for(const [dirX,dirY] of [[0,1],[1,0],[0,-1],[-1,0]]){
        Object.assign(actor,{bodyType,dirX,dirY,equipment:{[item.slot]:item.id},appearance:{}});
        const before=render();
        actor.appearance.gearDyes={[item.id]:'#426ec9'};
        const after=render();
        let changed=0;
        for(let i=0;i<before.length;i+=4){
          check(before[i+3]===after[i+3],item.id+' changed silhouette');
          if(before[i]!==after[i]||before[i+1]!==after[i+1]||before[i+2]!==after[i+2])changed++;
        }
        check(changed>=6,item.id+' missing dye in '+bodyType+'/'+dirX+'/'+dirY);
        poses++;
      }
      return {garments:garments.length,poses,reachable:true,saveRoundTrip:true};
    });
    assert.deepEqual(errors,[]);
    console.log('PASS',report);
  } finally {await browser.close();}
})().catch(error=>{console.error(error);process.exitCode=1;});
