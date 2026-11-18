import {TILE} from './data.js';
import {drawSeraphActor} from './seraphSprites.js';
import {SERAPH_DOMAINS,ZARYNTH_CAPITAL,isAct2Instance} from './act2CampaignData.js';

const look = {
  lastStandBastion:['#251d1b','#a36e4b','#d59c65'],
  forgottenOssuary:['#121e24','#40757b','#97cad0'],
  unfinishedHour:['#191127','#6b4d96','#bd96f5'],
  capital:['#3b2c25','#bd9060','#f2d288'],
  aqueduct:['#291a1d','#794e4c','#df9a77']
};

export function drawAct2Ground(ctx,world,camera) {
  if(!isAct2Instance(world.dungeonId))return;
  const [shadow,floor,accent]=look[SERAPH_DOMAINS[world.dungeonId]?.id||(world.floor===1?'capital':'aqueduct')];
  const left=Math.max(0,Math.floor(camera.x/TILE)),top=Math.max(0,Math.floor(camera.y/TILE));
  const right=Math.min(world.width,Math.ceil((camera.x+ctx.canvas.width)/TILE)),bottom=Math.min(world.height,Math.ceil((camera.y+ctx.canvas.height)/TILE));
  ctx.save();
  for(let ty=top;ty<bottom;ty++) for(let tx=left;tx<right;tx++){
    const x=Math.floor(tx*TILE-camera.x),y=Math.floor(ty*TILE-camera.y);
    const tile=world.tiles[ty]?.[tx];
    if(!tile?.passable){
      ctx.fillStyle=shadow;
      ctx.globalAlpha=world.dungeonId==='unfinishedHour'?1:.57;
      ctx.fillRect(x,y,TILE,TILE);
      if(world.dungeonId==='unfinishedHour'&&(tx*13+ty*17)%29===0){
        ctx.fillStyle=accent;ctx.globalAlpha=.55;ctx.fillRect(x+9,y+8,2,2);
      }
      continue;
    }
    const v=(tx*13+ty*7)%11;
    ctx.fillStyle=floor;ctx.globalAlpha=.30+v*.023;ctx.fillRect(x,y,TILE,TILE);
    ctx.fillStyle=shadow;ctx.globalAlpha=.36;ctx.fillRect(x,y+30,TILE,2);
    ctx.fillRect(x+((ty%2)*16),y,1,30);
    if(tile.seraphSurface)drawSurfaceTile(ctx,tile.seraphSurface,x,y,v);
    if(v===0){
      ctx.fillStyle=accent;ctx.globalAlpha=.55;ctx.fillRect(x+13,y+14,6,2);ctx.fillRect(x+15,y+12,2,6);
    }
  }
  if(world.dungeonId===ZARYNTH_CAPITAL&&world.floor===1)drawZarynthBanners(ctx,camera);
  for(const room of world.rooms||[]){
    const x=(room.cx+.5)*TILE-camera.x,y=(room.cy+.5)*TILE-camera.y;
    const size=(room.role==='boss'?4.5:2.15)*TILE;
    if(x+size<0||x-size>ctx.canvas.width||y+size<0||y-size>ctx.canvas.height)continue;
    ctx.beginPath();ctx.moveTo(x,y-size);
    ctx.lineTo(x+size,y);ctx.lineTo(x,y+size);ctx.lineTo(x-size,y);ctx.closePath();
    ctx.globalAlpha=.36;ctx.strokeStyle=accent;ctx.lineWidth=3;ctx.stroke();
    if(room.role==='boss'){
      ctx.beginPath();ctx.arc(x,y,size*.69,0,Math.PI*2);ctx.lineWidth=2;ctx.stroke();
    }
  }
  ctx.restore();
}

function drawSurfaceTile(ctx,surface,x,y,v){
  ctx.globalAlpha=.32;
  if(surface==='timber'){
    ctx.fillStyle=v%2?'#c78954':'#45322d';ctx.fillRect(x,y,TILE,TILE);
    ctx.fillStyle='#281d26';ctx.fillRect(x,y+9,TILE,2);ctx.fillRect(x,y+21,TILE,2);
    ctx.fillStyle='#e1ab73';ctx.fillRect(x+6,y+14,2,2);ctx.fillRect(x+24,y+25,2,2);
  }else if(surface==='waterline'){
    ctx.fillStyle='#408d9b';ctx.fillRect(x,y,TILE,TILE);
    ctx.fillStyle='#93c4bd';ctx.fillRect(x+v,y+9,17,1);ctx.fillRect(x+10,y+23,19,1);
  }else if(surface==='glass'||surface==='starlight'){
    ctx.fillStyle=surface==='glass'?'#9e72d0':'#382658';ctx.fillRect(x,y,TILE,TILE);
    ctx.fillStyle='#e1c2ff';ctx.fillRect(x+v+2,y+5,2,2);
    if(v%3===0){ctx.fillRect(x+18,y+21,7,1);ctx.fillRect(x+21,y+18,1,7);}
  }else if(surface==='tombs'){
    ctx.fillStyle='#80968a';ctx.fillRect(x+5,y+3,22,25);
    ctx.fillStyle='#a2c5b4';ctx.fillRect(x+7,y+5,18,1);ctx.fillRect(x+13,y+13,6,1);
  }else{
    ctx.fillStyle=surface==='standard'?'#b96248':'#60382f';ctx.fillRect(x,y,TILE,TILE);
    if(v%3===0){ctx.fillStyle='#e6b074';ctx.fillRect(x+3,y+24,22,1);}
  }
}

function drawZarynthBanners(ctx,camera) {
  ctx.globalAlpha=1;
  for(const [tx,ty,cloth] of [[37,56,'#9c4a4a'],[49,56,'#9c4a4a'],[33,38,'#b66055'],[53,38,'#b66055'],
    [38,47,'#963e45'],[48,47,'#963e45'],[29,41,'#b38e46'],[58,41,'#b38e46'],
    [11,39,'#c6bd8d'],[17,39,'#c6bd8d'],[61,17,'#a24549'],[74,17,'#a24549']]){
    const x=Math.round((tx+.5)*TILE-camera.x),y=Math.round((ty+.5)*TILE-camera.y);
    if(x<-28||x>ctx.canvas.width+28||y<-20||y>ctx.canvas.height+86)continue;
    ctx.fillStyle='#312421';ctx.fillRect(x-15,y-4,31,7);ctx.fillRect(x-3,y-70,6,67);
    ctx.fillStyle='#644935';ctx.fillRect(x-18,y-62,37,5);
    ctx.fillStyle='#d6a658';ctx.fillRect(x-17,y-65,35,3);
    ctx.fillStyle='#593632';ctx.fillRect(x-14,y-58,28,44);
    ctx.fillStyle=cloth;ctx.fillRect(x-12,y-57,24,34);
    ctx.fillRect(x-9,y-23,18,6);ctx.fillRect(x-5,y-17,10,5);
    ctx.fillStyle='#f3cb76';ctx.fillRect(x-10,y-55,2,27);ctx.fillRect(x+8,y-55,2,27);
    ctx.fillRect(x-2,y-49,4,17);ctx.fillRect(x-6,y-43,12,4);
  }
}

export function drawAct2Enemy(ctx,enemy,camera,next) {
  if(drawSeraphActor(ctx,enemy,camera))return;
  if(!enemy.act2Heart&&!enemy.act2Boss)return next();
  const x=Math.round(enemy.x-camera.x),y=Math.round(enemy.y-camera.y);
  if(enemy.arenaDormant)return;
  if(enemy.act2Boss!=='rootCrownedBehemoth'&&!enemy.act2Heart)return next();
  if(enemy.act2Boss==='rootCrownedBehemoth')return drawBehemoth(ctx,enemy,x,y);
  if(enemy.dead||enemy.hp<=0)return;
  ctx.save();
  ctx.translate(x,y);
  ctx.fillStyle='#22161c';ctx.fillRect(-23,-19,46,26);
  for(let i=0;i<7;i++){
    ctx.fillStyle=i%2?'#604041':'#83504b';
    ctx.fillRect(-33+i*9,-10-((i*7)%11),8,17);
  }
  ctx.fillStyle='#b46256';ctx.fillRect(-15,-29,30,25);
  ctx.fillStyle='#e6a67d';ctx.fillRect(-7,-24,14,15);
  ctx.fillStyle='#edcab0';ctx.fillRect(-2,-22,4,8);
  const hp=Math.max(0,Math.min(1,enemy.hp/enemy.maxHp));
  ctx.fillStyle='#211516';ctx.fillRect(-20,-44,40,5);
  ctx.fillStyle='#c96e61';ctx.fillRect(-20,-43,Math.ceil(40*hp),3);
  ctx.restore();
}

function drawBehemoth(ctx,enemy,x,y) {
  if(enemy.dead||enemy.hp<=0)return;
  const motion=Math.floor(Math.sin((enemy.walkTime||0)*7)*3),phase=enemy.boss?.phase||1;
  ctx.save();ctx.translate(x,y);
  ctx.fillStyle='#241922';ctx.fillRect(-42,-11,84,17);
  for(let i=0;i<12;i++){
    const left=i<6,dx=(left?-1:1)*(22+(i%6)*6);
    ctx.fillStyle=i%2?'#633a39':'#845147';
    ctx.fillRect(dx-7,-29+(i%3)*5+motion,14,29-(i%3)*5);
    ctx.fillRect(dx+(left?-9:0),-8,16,8);
  }
  ctx.fillStyle=enemy.hitFlash>0?'#bd8b72':'#68443e';ctx.fillRect(-32,-58+motion,65,44);
  ctx.fillStyle='#8d5548';ctx.fillRect(-25,-64+motion,50,21);
  ctx.fillStyle='#a16b57';ctx.fillRect(-19,-55+motion,13,14);ctx.fillRect(7,-52+motion,15,15);
  ctx.fillStyle='#4b373c';ctx.fillRect(-12,-42+motion,23,13);
  for(let i=0;i<6;i++){
    ctx.fillStyle=i%2?'#b36b56':'#6d433d';
    ctx.fillRect(-31+i*11,-63-(i%3)*6+motion,8,22);
  }
  ctx.fillStyle=phase===3?'#fff2a9':'#e2ad66';
  ctx.fillRect(-16,-47+motion,8,4);ctx.fillRect(8,-47+motion,8,4);
  ctx.fillStyle='#261f26';ctx.fillRect(-47,-89,94,7);
  ctx.fillStyle='#db8366';ctx.fillRect(-45,-87,Math.ceil(90*enemy.hp/enemy.maxHp),3);
  ctx.fillStyle='#f0cba3';ctx.font='bold 13px Georgia';ctx.textAlign='center';ctx.fillText(enemy.name,0,-96);
  ctx.restore();
}

function zonePath(ctx,zone){
  if(zone.shape==='line'){
    ctx.rotate(zone.angle);
    ctx.rect(0,-zone.width,zone.length,zone.width*2);
  }else if(zone.shape==='arc'){
    const from=zone.angle-zone.spread,to=zone.angle+zone.spread;
    ctx.arc(0,0,zone.radius,from,to);
    if(zone.inner)ctx.arc(0,0,zone.inner,to,from,true);
    else ctx.lineTo(0,0);
    ctx.closePath();
  }else{
    ctx.arc(0,0,zone.radius,0,Math.PI*2);
    if(zone.inner){ctx.moveTo(zone.inner,0);ctx.arc(0,0,zone.inner,0,Math.PI*2);}
  }
}

function drawZone(ctx,zone,camera,color,alpha,stroke){
  ctx.save();ctx.translate(zone.x-camera.x,zone.y-camera.y);
  ctx.beginPath();zonePath(ctx,zone);
  ctx.fillStyle=color;ctx.globalAlpha=alpha;ctx.fill('evenodd');
  ctx.globalAlpha=stroke;ctx.strokeStyle=color;ctx.lineWidth=3;ctx.stroke();
  ctx.restore();
}

export function drawAct2Impacts(ctx,world,camera){
  if(!isAct2Instance(world.dungeonId))return;
  for(const fx of world.effects||[])if(fx.kind==='seraphImpact'){
    const fade=Math.max(0,(fx.ttl||0)/fx.duration);
    drawZone(ctx,fx.zone,camera,fx.color,.54*fade,.96*fade);
  }
}

export function drawAct2Tells(ctx,world,camera) {
  if(!isAct2Instance(world.dungeonId))return;
  for(const enemy of world.enemies){
    const tell=enemy.boss?.pendingSpecial;
    if(!tell?.zones||enemy.dead||enemy.arenaDormant)continue;
    const progress=1-tell.time/Math.max(.01,tell.maxTime);
    for(const zone of tell.zones)drawZone(ctx,zone,camera,tell.color,.13+.24*progress,.85);
    ctx.save();
    ctx.textAlign='center';ctx.font='bold 14px Georgia';
    const x=enemy.x-camera.x,y=enemy.y-camera.y-103;
    const width=ctx.measureText(tell.label).width+16;
    ctx.fillStyle='#211c24';ctx.fillRect(x-width/2,y-15,width,20);
    ctx.fillStyle=tell.color;ctx.fillText(tell.label,x,y);
    ctx.restore();
  }
}
