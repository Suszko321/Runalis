import {getEnemyTargetablePlayers} from './coopEnemyScaling.js';
import {findNearestActorPassablePoint} from './world.js';
import {SERAPH_DOMAINS,ACT2_BEHEMOTH} from './act2CampaignData.js';

const COLORS={...Object.fromEntries(Object.values(SERAPH_DOMAINS).map(d=>[d.id,d.color])),[ACT2_BEHEMOTH]:'#e7a074'};
const circle=(x,y,radius,inner=0)=>({shape:'circle',x,y,radius,inner});
const line=(x,y,angle,length,width)=>({shape:'line',x,y,angle,length,width});
const arc=(x,y,angle,radius,spread,inner=0)=>({shape:'arc',x,y,angle,radius,spread,inner});

function bastion(x,y,px,py,angle,phase,turn){
  const standards=[circle(px,py,55),circle(px-106,py-60,48),circle(px+100,py+70,49)];
  switch(turn%4){
    case 0: return ['Banner Charge',[line(x,y,angle,470,45+phase*9)],1.24,'charge'];
    case 1: return ['Shield Reversal',[arc(x,y,angle,93+phase*15,1.42)],.92,'shield'];
    case 2: return ['Spectral Standards',standards,1.25,'standards',
      phase<2?null:['Standard Break',standards.slice(1).map(z=>circle(z.x,z.y,87,39)),.82]];
    default: return ['The Last Muster',[arc(x,y,angle,176,1.02,36),arc(x,y,angle+Math.PI,123,.72)],1.17,'cleave'];
  }
}

function ossuary(x,y,px,py,angle,phase,turn){
  switch(turn%3){
    case 0: return ['The Bell’s Echo',[circle(x,y,phase===1?168:220,phase===1?100:133)],1.28,'toll',
      phase===1?null:['Returning Toll',[circle(x,y,124,53)],.88]];
    case 1: return ['Litany of Names',[circle(px,py,62),circle((x+px)/2,(y+py)/2,51),circle(x,y,48)],1.1,'names'];
    default: return ['Procession of the Drowned',
      [-1,0,1].map(i=>line(x+Math.sin(angle)*i*100,y-Math.cos(angle)*i*100,angle,360,26+phase*4)),1.49,'procession'];
  }
}

function hour(x,y,px,py,angle,phase,turn){
  switch(turn%3){
    case 0: return ['Glass Echo',[line(px-180,py,0,360,25+phase*5),line(px,py-180,Math.PI/2,360,25+phase*5)],.91,'cross',
      phase<3?null:['Inverted Reflection',
        [-1,1].map(i=>line(px-126,py-i*126,i*Math.PI/4,356,24)),.78]];
    case 1: return ['The Shifting Hour',[circle(px,py,56+phase*12),circle(px-115,py+82,42),circle(px+115,py-82,42)],1.04,'mirror'];
    default: return ['Parallax Blade',[arc(x,y,angle+.8,196,.39,50),arc(x,y,angle-.8,196,.39,50)],.92,'prism'];
  }
}

function behemoth(x,y,px,py,angle,phase,turn){
  if(turn%3===0)return ['Root Sweep',[line(x,y,angle,560,47+phase*11),line(x,y,angle+1.57,440,43)],1.34,'roots'];
  if(turn%3===2)return ['Cistern Rupture',[circle(x,y,147,64),circle(px,py,77)],1.38,'rupture',
    phase<3?null:['Root Aftershock',[circle(px+95,py-45,75),circle(px-95,py+45,75)],.91]];
  const spores=[circle(px,py,55+phase*14),circle(px-122,py+35,48+phase*10),circle(px+110,py-65,48+phase*10)];
  return ['Spore Bloom',spores,1.14,'spore'];
}

const moves={lastStandBastion:bastion,forgottenOssuary:ossuary,unfinishedHour:hour,[ACT2_BEHEMOTH]:behemoth};

export function buildAct2BossTell(enemy,player) {
  const phase=enemy.boss.phase,turn=enemy.boss.act2Turn||0;
  enemy.boss.act2Turn=turn+1;
  const party=getEnemyTargetablePlayers(player);
  const target=party[turn%Math.max(1,party.length)]||player;
  const {x,y}=enemy;
  const angle=Math.atan2(target.y-y,target.x-x);
  const [label,zones,windup,motion,volley]=moves[enemy.act2Boss](x,y,target.x,target.y,angle,phase,turn);
  return {label,zones,windup,motion,volley,facingX:Math.cos(angle),facingY:Math.sin(angle),
    color:COLORS[enemy.act2Boss],recovery:motion==='charge'?1.35:motion==='mirror'?.67:.9,
    pose:enemy.act2Boss==='lastStandBastion'?'bossSlam':'ritual'};
}

export function act2ZoneHits(zone,actor) {
  const dx=actor.x-zone.x,dy=actor.y-zone.y;
  if(zone.shape==='circle'||zone.shape==='arc'){
    const distance=Math.hypot(dx,dy);
    if(distance<zone.inner||distance>zone.radius)return false;
    if(zone.shape==='circle')return true;
    const offset=Math.atan2(dy,dx)-zone.angle;
    return Math.abs(Math.atan2(Math.sin(offset),Math.cos(offset)))<=zone.spread;
  }
  const cos=Math.cos(zone.angle),sin=Math.sin(zone.angle);
  const forward=dx*cos+dy*sin,side=-dx*sin+dy*cos;
  return forward>=0&&forward<=zone.length&&Math.abs(side)<=zone.width;
}

export function releaseAct2BossTell(enemy,world,player,now,damageParty) {
  const tell=enemy.boss.pendingSpecial;
  if (!tell?.zones) return null;
  const phase=enemy.boss.phase;
  const damage=Math.round(enemy.damage*(tell.followup?.68:.9+phase*.17));
  damageParty(enemy,player,world,1000,damage,
    target=>tell.zones.some(zone=>act2ZoneHits(zone,target)),tell.label,now,enemy.act2Boss===ACT2_BEHEMOTH?'poison':null);
  for(const zone of tell.zones){
    world.effects.push({kind:'seraphImpact',layer:'behind',x:zone.x,y:zone.y,zone,
      color:tell.color,ttl:.55,duration:.55,age:0,arenaId:world.bossArena?.id});
  }
  if (tell.motion==='charge'&&world.bossArena) {
    const {x,y,w,h}=world.bossArena,zone=tell.zones[0],inset=enemy.radius+20;
    const endX=Math.max(x+inset,Math.min(x+w-inset,zone.x+Math.cos(zone.angle)*zone.length*.66));
    const endY=Math.max(y+inset,Math.min(y+h-inset,zone.y+Math.sin(zone.angle)*zone.length*.66));
    Object.assign(enemy,findNearestActorPassablePoint(world,endX,endY,enemy.radius));
  }
  if (tell.motion==='mirror'&&world.bossArena) {
    const mirror=findNearestActorPassablePoint(world,2*world.bossRoomCenter.x-enemy.x,2*world.bossRoomCenter.y-enemy.y,enemy.radius);
    Object.assign(enemy,mirror);
  }
  if(!tell.volley)return null;
  const [label,zones,time]=tell.volley;
  return {...tell,label,zones,time,maxTime:time,followup:true,volley:null};
}

export const ACT2_PHASE_LINES={
  lastStandBastion:['The last banner drops into the ring. Kaedros lowers his shield.','Kaedros calls the standards of the cities he never abandoned.'],
  forgottenOssuary:['A second toll answers from somewhere below the stone.','The bell sounds twice. Only one of the rings is moving outward.'],
  unfinishedHour:['Elyndra’s reflection takes a step before she does.','The mirror stops agreeing with the room.'],
  [ACT2_BEHEMOTH]:['The armour breaks away. An entire root bed moves underneath it.','The cistern fills with spores as the last root crown opens.']
};
