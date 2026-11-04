import {TILE} from './data.js';

export function drawUpstairsInterior(ctx,world,camera) {
  if(!['maraHouse','adventurersLounge'].includes(world.mode))return false;
  const guild=world.mode==='adventurersLounge';
  const width=world.width*TILE,height=world.height*TILE;
  ctx.save();
  ctx.translate(-Math.round(camera.x),-Math.round(camera.y));
  const box=(color,x,y,w,h)=>{ctx.fillStyle=color;ctx.fillRect(x,y,w,h);};
  box('#28251f',0,0,width,height);
  for(let y=TILE;y<height-TILE;y+=8){
    const row=(y-TILE)/8;
    box(['#9f7651','#aa8059','#b0865d','#a37a55'][row%4],TILE,y,width-2*TILE,8);
    box('#76513a',TILE,y+7,width-2*TILE,1);
    for(let x=TILE+(row%3)*23;x<width-TILE;x+=70){
      box('#76513a',x,y,1,7);
      box('#bc9268',x+5,y+2,14,1);
    }
  }
  const rug=guild?'#83534a':'#64775b';
  box('#553f32',80,153,width-160,87);
  box('#c6a879',82,155,width-164,83);
  box(rug,86,159,width-172,75);
  for(let x=94;x<width-96;x+=16){
    box('#c3a67a',x,162,5,2);box('#c3a67a',x,229,5,2);
  }

  box('#ad9876',TILE,4,width-2*TILE,TILE-4);
  box('#584031',TILE,TILE-6,width-2*TILE,6);
  for(let x=TILE;x<=width-TILE;x+=104)box('#614735',x,0,7,TILE);
  box('#5c4534',0,0,TILE,height);
  box('#5c4534',width-TILE,0,TILE,height);
  box('#9b7654',TILE-5,TILE,4,height-2*TILE);
  box('#9b7654',width-TILE,TILE,4,height-2*TILE);
  box('#6b5038',TILE,height-TILE,width-2*TILE,TILE);
  box('#b08a61',TILE,height-TILE,width-2*TILE,4);

  for(const x of guild?[60,164,268,372]:[70,214,358]){
    box('#513d2e',x-3,3,48,25);
    box('#adcfcc',x,5,42,19);
    box('#dce9d5',x,5,42,8);
    box('#819f79',x,20,42,4);
    box('#694e35',x+20,5,3,20);
    box('#d4ad77',x-4,25,50,3);

    ctx.save();
    ctx.beginPath();ctx.rect(TILE,TILE,width-2*TILE,height-2*TILE);ctx.clip();
    const daylight=ctx.createLinearGradient(x,TILE,x+85,235);
    daylight.addColorStop(0,'#fff1b783');daylight.addColorStop(1,'#ffe0a300');
    ctx.fillStyle=daylight;ctx.beginPath();
    ctx.moveTo(x,TILE);ctx.lineTo(x+42,TILE);ctx.lineTo(x+154,244);ctx.lineTo(x+66,244);ctx.closePath();ctx.fill();
    ctx.restore();
  }
  ctx.restore();
  return true;
}
