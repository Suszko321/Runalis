// Set dressing and cinematic effects only: world objects/tiles are never edited.
import {drawPropSprite} from './spriteArt.js';
import {drawTownDetailArt,drawEnvironmentProp} from './environmentArt.js';
import {drawSkillReleaseArt} from './combatArt.js';

export function drawSceneArtBack(ctx,world,camera) {
  if(world.mode==='maraHouse') {
    const x=Math.round(5*32-camera.x),y=Math.round(6*32-camera.y);
    if(!drawTownDetailArt(ctx,15,x+64,y+96,145,112)){
    ctx.save();ctx.fillStyle='#272f27';ctx.fillRect(x-2,y-2,132,100);
    ctx.fillStyle='#5c4534';ctx.fillRect(x,y,128,96);
    ctx.strokeStyle='#b19158';ctx.lineWidth=2;ctx.strokeRect(x+6,y+6,116,84);
    ctx.strokeStyle='#8e7149';ctx.strokeRect(x+10,y+10,108,76);
    for(let i=16;i<116;i+=12){ctx.fillStyle='#a08453';ctx.fillRect(x+i,y+16,4,4);ctx.fillRect(x+i,y+76,4,4);}
    for(let i=0;i<128;i+=5){ctx.fillStyle='#aa956f';ctx.fillRect(x+i,y-4,2,4);ctx.fillRect(x+i,y+96,2,4);}
    ctx.translate(x+64,y+48);ctx.rotate(Math.PI/4);ctx.strokeStyle='#aa8655';ctx.strokeRect(-17,-17,34,34);ctx.strokeRect(-10,-10,20,20);ctx.restore();
    }
  }
  if(world.mode!=='act1Opening')return;
  // Plant only in the existing impassable border; roadside silhouettes do not
  // imply new collision on walkable grass or roads.
  const first=Math.max(1,Math.floor(camera.x/128)-1),last=Math.min(14,Math.ceil((camera.x+ctx.canvas.width)/128)+1);
  for(let i=first;i<=last;i++) {
    const x=i*128-camera.x;
    drawPropSprite(ctx,i%3?9:8,x,65-camera.y,.95+(i%3)*.12);
    drawPropSprite(ctx,i%3?8:9,x+48,world.height*32-38-camera.y,1.05);
  }
  // Low-profile scattered grass and roadside stones stay decorative.
  for(let i=0;i<70;i++) {
    const wx=80+i*26,wy=(i%2?11:18)*32+(i%5)*7;
    const x=Math.round(wx-camera.x),y=Math.round(wy-camera.y);
    if(x<0||x>ctx.canvas.width||y<0||y>ctx.canvas.height)continue;
    if(drawEnvironmentProp(ctx,'tallGrassPatch',x,y,{scale:.35}))continue;
    ctx.fillStyle=i%3?'#667042':'#7b7354';
    ctx.fillRect(x,y,2,4);ctx.fillRect(x-3,y+2,2,3);ctx.fillRect(x+3,y+1,2,4);
  }
}

export function drawSceneArtFront(ctx,world,player,camera) {
  if(world.mode!=='act1Opening')return;
  const time=Number(world.opening?.elapsed||0);
  if(time<24)return;
  const intensity=Math.min(1,(time-24)/18);
  ctx.save();
  for(const object of world.objects||[]) {
    if(object.propType!=='supplyWagon')continue;
    const x=object.x-camera.x,y=object.y-camera.y;
    if(x<-120||x>ctx.canvas.width+120)continue;
    ctx.save();ctx.filter='grayscale(1) brightness(.45)';
    const rasterSmoke=drawSkillReleaseArt(ctx,'smoke',x+18,y-55,64,(time*.35)%1,.36*intensity);ctx.restore();
    if(rasterSmoke){
      if(time>39)for(let i=0;i<3;i++)drawSkillReleaseArt(ctx,'fire',x-18+i*18,y-18,30,(time*.8+i*.22)%1,.9);
      continue;
    }
    for(let i=0;i<12;i++) {
      const age=(time*.55+i*.137)%1;
      ctx.globalAlpha=(1-age)*.16*intensity;ctx.fillStyle='#252321';
      const size=Math.round(7+age*24);
      ctx.fillRect(Math.round(x+Math.sin(i*3+time*.6)*12+age*24),Math.round(y-26-age*100),size,size);
    }
    if(time>39) {
      for(let i=0;i<7;i++) {
        const phase=(time*1.5+i*.17)%1;
        ctx.globalAlpha=(1-phase)*.85;ctx.fillStyle=i%2?'#efa13b':'#f3d38c';
        ctx.fillRect(Math.round(x-24+i*8+Math.sin(time*3+i)*3),Math.round(y-12-phase*28),3,Math.round(7+phase*9));
      }
    }
  }
  ctx.restore();
}
