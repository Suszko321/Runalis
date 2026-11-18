import {sampleEnemyAttackPresentation} from './enemyAttackPresentation.js';

// Indexed pixel sprites. Silhouettes and equipment are separate layers so each
// body can use its own anticipation, contact and recovery poses.
const guardians = {
  lastStandBastion:{
    palette:['#21151c','#4d3336','#825255','#bda093','#e0ad6e','#fff0b1','#a44139'],
    face:['..111111..','.12333321.','1234444321','1233223321','.12522521.','.12222221.','..111111..'],
    body:['.111111111.','12333333321','12344444321','12234343221','.122444221.','.164626461.','.166666661.','..1666661..'],
    scale:4,feet:9
  },
  forgottenOssuary:{
    palette:['#102332','#294658','#4b7c88','#9abdbb','#c9b587','#e7ffed','#46747d'],
    face:['.....1.....','....141....','...14441...','..1444441..','.133333331.','..1252521..','...12221...','....111....'],
    body:['....111....','...13631...','..1336331..','.136353631.','.136333631.','13633333631','16333333361','16633333661','..1666661..'],
    scale:4,feet:11
  },
  unfinishedHour:{
    palette:['#251938','#4f3271','#8259a4','#c0a4dd','#7dbfcf','#fff1ff','#74438d'],
    face:['.....1.....','1...141...1','13.13431.31','.131333131.','..1353531..','...13331...','....161....'],
    body:['....111....','...12321...','..1245421..','.123343321.','..1234321..','...12321...','...16361...','..1636361..','.166.3.661.'],
    scale:4,feet:12
  }
};
const mobPalette={
  coalHound:['#271b22','#664247','#b76849','#e79158','#fdd488'],
  ironbreaker:['#29191e','#6d3931','#a86347','#dc925e','#ffe29c'],
  bannerGuard:['#2b2028','#694751','#9f6963','#d4a177','#efc98b'],
  urnBearer:['#14252d','#37565f','#64887b','#a8b2a0','#d6e9c3'],
  graveEcho:['#172b3e','#30596d','#5398a5','#a3c7c0','#d8fff0'],
  grafter:['#1b3038','#395c60','#66887d','#98b5a2','#c3f7cf'],
  shardShade:['#23172e','#523473','#8662ba','#cbb0eb','#ecdcff'],
  glassBow:['#28193e','#625084','#9671be','#abc5dd','#f6dbff']
};
function pixels(ctx,rows,palette,x,y,scale){
  for(let j=0;j<rows.length;j++){
    const row=rows[j];
    for(let i=0;i<row.length;){
      const color=row[i];let end=i+1;
      while(row[end]===color)end++;
      if(color!=='.'){ctx.fillStyle=palette[Number(color)-1];ctx.fillRect(x+i*scale,y+j*scale,(end-i)*scale,scale);}
      i=end;
    }
  }
}

function tile(ctx,color,x,y,w,h){ctx.fillStyle=color;ctx.fillRect(x,y,w,h);}
function angle(ctx,x,y,radians,paint){
  ctx.save();ctx.translate(x,y);ctx.rotate(radians);paint();ctx.restore();
}
function label(ctx,actor,y){
  const display=actor.isBoss?actor.name:`${actor.name} · Lv ${actor.combatLevel||actor.level||1}`;
  ctx.font=actor.isBoss?'bold 14px Georgia':'bold 10px system-ui';
  ctx.textAlign='center';ctx.lineJoin='round';ctx.strokeStyle='#151017';ctx.lineWidth=3;
  ctx.strokeText(display,0,y);ctx.fillStyle=actor.isBoss?'#f8e0b2':'#eadfca';ctx.fillText(display,0,y);
  const w=actor.isBoss?94:32,ratio=Math.max(0,Math.min(1,actor.hp/actor.maxHp));
  tile(ctx,'#211b27',-w/2,y+3,w,actor.isBoss?8:5);
  tile(ctx,actor.isBoss?'#cf775c':'#bd6a6a',-w/2+2,y+4,Math.ceil((w-4)*ratio),actor.isBoss?5:3);
}

function pose(actor){
  const tell=actor.bossTell||actor.boss?.pendingSpecial||actor.telegraph;
  const p=tell?.maxTime?1-Math.max(0,tell.time)/tell.maxTime:0;
  const action=sampleEnemyAttackPresentation(actor);
  return {anticipation:tell?Math.max(0,p):action?.phase==='anticipation'?action.progress:0,
    release:action?.phase==='execution'?1:action?.phase==='recovery'?.34:0,
    move:actor.walkTime||0,technique:tell?.label||''};
}

export function drawSeraphActor(ctx,actor,camera,{guardianOnly=false,showLabel=true}={}){
  const id=actor.seraphSprite||actor.act2Boss,guardian=guardians[id];
  const palette=guardian?.palette||mobPalette[id];
  if(!palette||guardianOnly&&!guardian)return false;
  if(actor.arenaDormant||actor.dead||actor.hp<=0)return true;
  const x=Math.round(actor.x-camera.x),y=Math.round(actor.y-camera.y);
  const motion=pose(actor),side=actor.dirX<-.06?-1:1;
  const tick=Math.floor(performance.now()/130);
  ctx.save();ctx.translate(x,y);
  ctx.globalAlpha=.34;tile(ctx,'#090913',guardian?-24:-13,-4,guardian?48:26,8);ctx.globalAlpha=1;
  ctx.save();ctx.scale(side,1);
  if(guardian){
    const phase=actor.boss?.phase||1;
    const anticip=motion.anticipation,release=motion.release;
    const bob=id==='lastStandBastion'?Math.round(Math.sin(motion.move*9)*2):Math.round(Math.sin(tick*.54)*3);
    const top=-62+bob;
    if(id==='lastStandBastion'){
      const stride=Math.round(Math.sin(motion.move*10)*4);
      tile(ctx,palette[0],-16,-14+stride,12,16);tile(ctx,palette[0],5,-14-stride,12,16);
      tile(ctx,palette[2],-14,-13+stride,8,11);tile(ctx,palette[2],7,-13-stride,8,11);
      tile(ctx,palette[6],-22,top+17,11,41);tile(ctx,palette[2],15,top+19,8,30);
      const shield=motion.technique==='Shield Reversal';
      angle(ctx,-23+(shield?Math.round(anticip*10):0),top+30,shield?-.3*anticip:-.08,()=>{
        pixels(ctx,['.1111.','133331','134431','134431','133331','.1331.','..11..'],palette,-12,-12,4);
      });
      angle(ctx,22,top+34,-.28-anticip*1.75+release*1.68,()=>{
        tile(ctx,palette[0],-4,-39,8,47);tile(ctx,palette[3],-2,-36,5,29);
        tile(ctx,palette[5],-1,-38,2,31);tile(ctx,palette[4],-8,-8,16,4);
      });
    }else if(id==='forgottenOssuary'){
      for(let i=0;i<5;i++){
        const offset=Math.round(Math.sin(tick*.42+i)*4);
        tile(ctx,i%2?palette[1]:palette[6],-19+i*8,top+42,6,18+offset);
      }
      angle(ctx,26,top+23,-.25+Math.sin(tick*.6)*.13+anticip*.8-release,()=>{
        tile(ctx,palette[2],-2,-29,4,33);
        pixels(ctx,['..44..','.4444.','.4554.','445544','666666','..66..'],palette,-12,0,4);
      });
      if(anticip||release){
        ctx.strokeStyle=palette[5];ctx.globalAlpha=.21+anticip*.32;ctx.lineWidth=2;
        ctx.beginPath();ctx.ellipse(26,top+39,10+anticip*18,6+anticip*8,0,0,Math.PI*2);ctx.stroke();ctx.globalAlpha=1;
      }
    }else{
      for(let i=0;i<4;i++){
        const a=tick*.3+i*Math.PI/2;
        const orbit=24+anticip*13;
        const sx=Math.round(Math.cos(a)*orbit),sy=Math.round(Math.sin(a)*11)+top+27;
        tile(ctx,palette[2],sx-3,sy-6,6,12);tile(ctx,palette[4],sx-1,sy-4,3,7);
      }
      const lift=Math.round(anticip*11-release*5);
      pixels(ctx,['..444..','.45554.','4533354','4533354','.45554.','..444..'],palette,19,top+13-lift,3);
      tile(ctx,palette[6],-17,top+40,7,17);tile(ctx,palette[2],14,top+40,6,16);
    }
    pixels(ctx,guardian.body,palette,-Math.floor(guardian.body[0].length*2),top+19,guardian.scale);
    pixels(ctx,guardian.face,palette,-Math.floor(guardian.face[0].length*2),top-6,guardian.scale);
    if(phase>1||actor.hitFlash>0){
      ctx.globalAlpha=actor.hitFlash>0?.72:.28+phase*.08;
      tile(ctx,palette[5],-7,top+24,14,2);ctx.globalAlpha=1;
    }
  }else drawMob(ctx,id,palette,motion,tick);
  ctx.restore();
  if(showLabel&&!guardianOnly)label(ctx,actor,guardian?-86:-46);
  ctx.restore();
  return true;
}

function drawMob(ctx,id,p,motion,tick){
  const wind=motion.anticipation,hit=motion.release;
  const step=Math.round(Math.sin(motion.move*12)*3);
  const floats=['graveEcho','shardShade'].includes(id);
  const y=-34+(floats?Math.round(Math.sin(tick*.7)*3):Math.abs(step));
  if(id==='coalHound'){
    pixels(ctx,['.....1111.','1112233311','1223333441','.13333111.','..11111...'],p,-18,y+9,4);
    tile(ctx,p[0],-13,-14+step,5,14);tile(ctx,p[1],7,-14-step,5,14);
    tile(ctx,p[4],15+Math.round(hit*6),y+16,3,2);
    return;
  }
  const outline=['..1111..','.122221.','12233221','12333321','.122221.','..1111..'];
  const body=id==='grafter'||id==='ironbreaker'
    ?['.111111.','12233221','12344321','12233221','.123321.','..1111..']
    :['..1111..','.122221.','12344321','.123321.','..1331..','...11...'];
  if(!floats){
    tile(ctx,p[0],-9,-11+step,7,10);tile(ctx,p[0],3,-11-step,7,10);
  }else{
    for(let i=0;i<3;i++)tile(ctx,p[i+1],-7+i*6,-6+Math.round(Math.sin(tick+i)*3),3,4);
  }
  pixels(ctx,body,p,-12,y+14,3);
  pixels(ctx,outline,p,-12,y,3);
  tile(ctx,p[4],-5,y+8,3,2);tile(ctx,p[4],3,y+8,3,2);
  angle(ctx,10,y+22,-.34-wind+hit*1.5,()=>{
    if(id==='ironbreaker'||id==='grafter'){
      tile(ctx,p[0],-2,-20,5,25);tile(ctx,p[2],-9,-20,18,8);tile(ctx,p[3],-7,-20,14,3);
    }else if(id==='urnBearer'){
      pixels(ctx,['.22.','3333','3443','3333','.22.'],p,-2,-7,3);
    }else if(id==='glassBow'||id==='shardShade'){
      pixels(ctx,['.4.','343','454','343','.4.'],p,-2,-11,3);
    }else{
      tile(ctx,p[1],0,-15,4,20);tile(ctx,p[4],1,-17,2,9);
    }
  });
}

export function drawSeraphFixture(ctx,o,camera){
  if(!o.seraphProp)return false;
  const x=Math.round(o.x-camera.x),y=Math.round(o.y-camera.y);
  const lit=o.seraphLit,tick=Math.floor(performance.now()/160);
  const palettes={signal:['#442926','#956342','#f3b55c'],chime:['#142c36','#548488','#9af0da'],
    parallax:['#281d45','#765fa0','#e6acff'],plaque:['#2c242a','#806e67','#d8b18b']};
  const [dark,mid,glow]=palettes[o.seraphProp];
  ctx.save();ctx.translate(x,y);
  tile(ctx,dark,-18,-9,36,12);tile(ctx,mid,-12,-12,24,7);
  if(o.seraphProp==='chime'){
    tile(ctx,dark,-12,-40,24,30);tile(ctx,mid,-9,-38,18,4);
    tile(ctx,lit?glow:mid,-6,-31,12,15);tile(ctx,glow,-7,-16,14,2);
  }else if(o.seraphProp==='parallax'){
    tile(ctx,dark,-3,-31,6,21);
    ctx.rotate((lit?.18:.095)*(o.seraphOrder-1));tile(ctx,mid,-14,-35,28,17);
    tile(ctx,lit?glow:dark,-10,-32,20,10);tile(ctx,glow,-4,-30,8,3);
  }else{
    tile(ctx,mid,-4,-33,8,21);tile(ctx,dark,-12,-36,24,12);
    tile(ctx,lit?glow:mid,-8,-33,15,6);
  }
  if(lit){ctx.globalAlpha=.38+Math.sin(tick*.66)*.19;tile(ctx,glow,-19,-45,38,2);}
  ctx.restore();
  return true;
}
