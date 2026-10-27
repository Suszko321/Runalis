import {drawEnvironmentProp,drawTownDetailProp,drawLandmarkArt,drawTownBuildingArt} from './environmentArt.js';
import {drawTownPropSprite} from './spriteArt.js';
import {drawForestKit,drawEchorynLandmark} from './echorynRenderer.js';
import {drawNarrativeProp} from './propArt.js';
import {hashWorld,ECOLOGIES} from './worldAuthorship.js';
import {drawPropSprite} from './spriteArt.js';

export function drawAuthoredObject(ctx,o,camera,player) {
  if(!['worldDressing','navStone','worldSecret','worldRelic'].includes(o.kind))return false;
  const x=o.x-camera.x,y=o.y-camera.y;
  if(o.propType==='forestKit'){drawForestKit(ctx,o.kitIndex,x,y,o.artWidth,o.artHeight);return true;}
  if(o.propType==='distantLandmark'){ctx.save();ctx.globalAlpha=.5;if(o.landmarkIndex===undefined||!drawEchorynLandmark(ctx,o.landmarkIndex,x,y,o.artWidth,o.artHeight))drawLandmarkArt(ctx,o.artIndex,x,y,o.artWidth,o.artHeight);ctx.restore();return true;}
  if(o.propType==='fishingRack'){
    ctx.save();ctx.strokeStyle='#75624a';ctx.lineWidth=5;ctx.beginPath();ctx.moveTo(x-28,y+6);ctx.lineTo(x-28,y-50);ctx.lineTo(x+28,y-50);ctx.lineTo(x+28,y+6);ctx.stroke();ctx.strokeStyle='#d0ba87';ctx.lineWidth=1;
    for(let i=0;i<5;i++){const px=x-20+i*10;ctx.beginPath();ctx.moveTo(px,y-48);ctx.lineTo(px,y-16);ctx.stroke();ctx.fillStyle=i%2?'#9b987d':'#737c71';ctx.fillRect(px-2,y-33,5,15);}
    ctx.restore();return true;
  }
  if(o.kind==='navStone'){
    const active=!!player?.worldMemory?.stones?.[o.id];
    ctx.save();ctx.strokeStyle=active?'#96e0dc':'#757c71';ctx.lineWidth=2;
    ctx.beginPath();ctx.ellipse(x,y+5,29,12,0,0,Math.PI*2);ctx.stroke();
    drawEnvironmentProp(ctx,'runestone',x,y,{scale:1.7});
    ctx.strokeStyle=active?'#a7fff2':'#728f91';ctx.lineWidth=2;ctx.beginPath();ctx.moveTo(x,y-54);ctx.lineTo(x-7,y-40);ctx.lineTo(x,y-29);ctx.lineTo(x+7,y-40);ctx.lineTo(x,y-54);ctx.moveTo(x,y-29);ctx.lineTo(x,y-13);ctx.stroke();
    if(active){const t=performance.now()/1000;ctx.fillStyle='#b5fff1';for(let i=0;i<5;i++){ctx.globalAlpha=.35+.3*Math.sin(t+i);ctx.fillRect(x+Math.sin(t*.5+i*2)*22,y-20-((t*12+i*17)%65),2,3);}}
    ctx.globalAlpha=1;ctx.font='11px Georgia';ctx.textAlign='center';ctx.fillStyle=active?'#bcefe5':'#d5c7a6';ctx.fillText(o.name,x,y+29);ctx.restore();return true;
  }
  if(o.kind==='worldSecret'){drawNarrativeProp(ctx,{propType:o.claimed?'ruinWall':'blockedAlcove',scale:.7},x,y);return true;}
  if(o.kind==='worldRelic'){drawNarrativeProp(ctx,{propType:'warningBell',scale:1.8,lit:!!player?.worldMemory?.inscriptions?.[o.id]},x,y);return true;}
  if(o.propType==='townBuilding'){ctx.save();if(o.ruined)ctx.filter='saturate(.6) brightness(.78)';if(o.echorynStructure&&player&&Math.abs(player.x-o.x)<85&&player.y<o.y+12&&player.y>o.y-140)ctx.globalAlpha=.24;drawTownBuildingArt(ctx,o.buildingIndex,x,y,o.buildingHeight);ctx.restore();return true;}
  if(o.propType==='modular'){drawLandmarkArt(ctx,o.artIndex,x,y,o.artWidth,o.artHeight);return true;}
  if(o.propType==='statue'){drawLandmarkArt(ctx,8,x,y,48*o.scale,72*o.scale);return true;}
  if(['pine','willow'].includes(o.propType)){ctx.save();if(o.propType==='willow')ctx.filter='hue-rotate(18deg) saturate(.7)';drawPropSprite(ctx,o.propType==='pine'?9:8,x,y+12,.8*o.scale);ctx.restore();return true;}
  if(o.propType==='timberSupport'){
    ctx.save();ctx.fillStyle='#221c15';ctx.fillRect(x-25,y-65,7,69);ctx.fillRect(x+18,y-65,7,69);ctx.fillRect(x-28,y-69,56,9);ctx.fillStyle='#69543b';ctx.fillRect(x-23,y-61,3,61);ctx.fillRect(x+20,y-61,3,61);ctx.fillRect(x-26,y-68,52,4);ctx.restore();return true;
  }
  if(o.propType==='tower'){drawLandmarkArt(ctx,2,x,y,82*o.scale,116*o.scale);return true;}
  if(drawTownPropSprite(ctx,o,x,y)||drawNarrativeProp(ctx,o,x,y)||drawTownDetailProp(ctx,o,x,y)||drawEnvironmentProp(ctx,o.propType,x,y,o))return true;
  return true;
}

export function drawLivingWorld(ctx,world,player,camera) {
  const a=world.worldAtmosphere;if(!a)return;
  const width=ctx.canvas.width,height=ctx.canvas.height,t=a.time;
  ctx.save();
  if(a.night&&a.weather!=='indoor'){ctx.fillStyle=world.terrainFeatures?.echorynRevision?'rgba(12,22,47,.26)':'rgba(15,22,43,.17)';ctx.fillRect(0,0,width,height);}
  if(a.weather==='fog'){
    ctx.fillStyle='rgba(157,184,170,.06)';
    for(let i=0;i<6;i++){ctx.beginPath();ctx.ellipse(((i*263+t*9-camera.x*.08)%(width+500)+width+500)%(width+500)-200,80+i*110,360,50,0,0,Math.PI*2);ctx.fill();}
  }
  if(['rain','ash'].includes(a.weather)){
    ctx.strokeStyle=a.weather==='rain'?'rgba(170,200,213,.24)':'rgba(239,225,184,.4)';ctx.lineWidth=1;ctx.beginPath();
    for(let i=0;i<65;i++){const x=(hashWorld(i)*width+t*35)%width,y=(hashWorld(i+'y')*height+t*(a.weather==='rain'?330:20))%height;ctx.moveTo(x,y);ctx.lineTo(x+(a.weather==='rain'?-3:1),y+(a.weather==='rain'?10:1));}ctx.stroke();
  }
  // A bounded set of world-anchored flocks. No enemies, collision or saved entities.
  if(a.weather!=='indoor'){
    const life=a.night?'fireflies':ECOLOGIES[a.ecology].life;
    const cell=340,bx=Math.floor(camera.x/cell),by=Math.floor(camera.y/cell);
    for(let cy=by;cy<=by+Math.ceil(height/cell);cy++)for(let cx=bx;cx<=bx+Math.ceil(width/cell);cx++){
      if(hashWorld(`${cx}:${cy}`)<.52)continue;
      for(let i=0;i<3;i++){
        const wx=cx*cell+100+i*27,wy=cy*cell+130+i*9;
        const flee=Math.max(0,1-Math.hypot(wx-player.x,wy-player.y)/150);
        const x=wx-camera.x+Math.sin(t*.6+i)*14+flee*70,y=wy-camera.y+Math.cos(t*.7+i)*9-flee*45;
        ctx.globalAlpha=.55;ctx.strokeStyle=life==='crows'?'#252b2b':life==='birds'?'#c5c9aa':'#c0da8a';ctx.fillStyle=ctx.strokeStyle;
        if(life==='birds'||life==='crows'){ctx.beginPath();ctx.moveTo(x-5,y-Math.sin(t*9+i)*3);ctx.lineTo(x,y);ctx.lineTo(x+5,y-Math.sin(t*9+i)*3);ctx.stroke();}
        else ctx.fillRect(x,y,2,2);
      }
    }
  }
  // Nearby hearths and stones remain readable after dusk; no full-screen glare.
  if(a.night)for(const o of world.objects||[]){if(!['campfire','navStone'].includes(o.kind)||Math.abs(o.x-camera.x-width/2)>width/2+80||Math.abs(o.y-camera.y-height/2)>height/2+80)continue;
    ctx.globalAlpha=1;const x=o.x-camera.x,y=o.y-camera.y,g=ctx.createRadialGradient(x,y,3,x,y,65);g.addColorStop(0,o.kind==='navStone'?'rgba(122,218,211,.15)':'rgba(245,176,85,.2)');g.addColorStop(1,'transparent');ctx.fillStyle=g;ctx.fillRect(x-65,y-65,130,130);
  }
  ctx.restore();
}
