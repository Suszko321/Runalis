import {drawHumanActor} from './humanRenderer.js?v=20260924b';
import {drawOathkeeperEffect} from './oathkeeperArt.js';
import {drawSkillPresentation} from './skillPresentationRenderer.js';
import {drawSkillReleaseArt} from './combatArt.js';
import {drawSummonArt} from './summonArt.js';
import {getSignatureAbilityProfile} from './animationProfiles.js';

// A miniature, cosmetic stage. Never cast real abilities or use the game player.
// Timelines use the same signature poses, effects and summon art as combat.
export const CLASS_PREVIEW_DEMOS = Object.freeze({
  classless: {caption:'Practice a three-strike sword combo.', color:'#e2d6b9', actions:['sword','sword','sword']},
  gravecaller: {caption:'Raise the Bound Dead / Necrotic Bolt', color:'#b4a0ed', actions:['summonLich','graveSpark'], summon:'skeletonServant', kind:'skeleton'},
  thornbinder: {caption:'Summon Thornlings / Thorn Lash', color:'#88c984', actions:['thornbinderSummonThornlings','thornbinderThornLash'], summon:'thornling', kind:'thornbeast'},
  waverider: {caption:'Water Torrent / Bubble Ward', color:'#83e6f5', actions:['hydromancerWaterTorrent','hydromancerBubbleWard']},
  lightbringer: {caption:'Gleam Bolt / Dawncarver', color:'#ffe6a4', actions:['lightbringerGleamBolt','lightbringerDawncarver']},
  oathkeeper: {caption:'Oath Strike / Shield guard', color:'#ffe6a4', actions:['oathkeeperOathStrike','guard']},
  fellhunter: {caption:'Bear Trap / Throwing Daggers', color:'#d9d5ba', actions:['fellhunterBearTrap','fellhunterThrowingDaggers']},
  eldritch: {caption:'Summon Horror / Black Star Pulse', color:'#c8a0f3', actions:['summonEldritchHorror','blackStarPulse'], summon:'lesserHorror', kind:'eldritchHorror'}
});

export function createClassPreviewDemo(classId, startedAt) {
  return {classId, startedAt, summon:{kind:CLASS_PREVIEW_DEMOS[classId]?.kind,x:0,y:0,attackCooldown:0}, effects:null};
}

// Export the sampler so timing, interruption and presentation can be inspected
// without running combat, consuming resources or changing a character's save.
export function sampleClassPreviewDemo(classId, elapsed) {
  const profile=CLASS_PREVIEW_DEMOS[classId]||CLASS_PREVIEW_DEMOS.classless;
  const time=((Math.max(0,elapsed)%5.8)*12|0)/12;
  const starts=classId==='classless'?[.2,.9,1.6]:[.2,1.7];
  let action=null;
  profile.actions.forEach((id,index)=>{
    const duration=id==='sword'?.62:id==='guard'?1.15:id==='lightbringerDawncarver'?1.45:getSignatureAbilityProfile(id)?.duration||.85;
    if(time>=starts[index]&&time<starts[index]+duration)action={id,index,startedAt:starts[index],duration};
  });
  return {profile,time,action,active:time<4.1};
}

export function drawClassPreviewDemo(ctx, actor, demo, now, appearanceOptions) {
  const sample=sampleClassPreviewDemo(demo.classId,now-demo.startedAt);
  const {profile,time,action}=sample;
  actor.x=122;actor.y=326;actor.isMoving=false;
  actor.dirX=action&&!['summonLich','thornbinderSummonThornlings','summonEldritchHorror','guard'].includes(action.id)?1:0;
  actor.dirY=actor.dirX?0:1;
  if(action?.id==='sword'){
    actor.combatState={attacking:true,attackElapsed:time-action.startedAt,attackDirX:1,attackDirY:0,attackMove:{
      kind:'arc',comboType:'light',attackFamily:action.index===1?'reverseSlash':'slash',swingDirection:action.index===1?-1:1,
      duration:action.duration,activeStart:.18,activeEnd:.34
    }};
  }else if(action?.id==='guard')actor.actionState={blocking:true};
  else if(action)actor.visualAction={abilityId:action.id,startedAt:action.startedAt,duration:action.duration,kind:profile.summon&&action.index===0?'summon':'cast'};

  if(!demo.effects){demo.effects=document.createElement('canvas');demo.effects.width=190;demo.effects.height=220;}
  const fx=demo.effects.getContext('2d');fx.clearRect(0,0,190,220);
  fx.save();fx.scale(.5,.5);fx.translate(0,14);
  drawSceneEffects(fx,demo.classId,profile,time,actor);
  fx.restore();
  // Explicit nearest-neighbour enlargement keeps all spell geometry pixel art.
  ctx.save();ctx.imageSmoothingEnabled=false;ctx.drawImage(demo.effects,0,0,380,440);ctx.restore();
  drawHumanActor(ctx,actor,{x:0,y:0},{...appearanceOptions,scale:3.15,animationTime:time});

  if(profile.summon&&time>.85&&time<4.1){
    const emerge=Math.min(1,(time-.85)/.45),fade=Math.min(1,(4.1-time)/.45);
    const x=240+Math.min(18,Math.max(0,time-1.8)*12),y=350;
    const summon=demo.summon;summon.x=x;summon.y=y;
    summon.attackCooldown=time>2.3&&time<2.6?1:0;
    ctx.save();ctx.beginPath();ctx.rect(175,180,140,205);ctx.clip();
    ctx.globalAlpha=emerge*fade;ctx.translate(Math.round(x),Math.round(y+(1-emerge)*45));ctx.scale(1.7,1.7);
    drawSummonArt(ctx,summon,profile.summon,0,0);ctx.restore();
  }
  return sample;
}

function presentation(ctx,id,x,y,age,ttl=.8,radius=35) {
  if(age<0||age>=ttl)return;
  drawSkillPresentation(ctx,{abilityId:id,x,y,age,ttl,radius,dirX:1,dirY:0},{x:0,y:0});
}
function release(ctx,kind,x,y,age,ttl=.8,radius=45){
  if(age<0||age>=ttl)return;
  drawSkillReleaseArt(ctx,kind,x,y,radius,age/ttl,.9);
}
function pixels(ctx,points,color,size=4){ctx.fillStyle=color;for(const [x,y]of points)ctx.fillRect(Math.round(x/2)*2,Math.round(y/2)*2,size,size);}
function projectile(ctx,time,start,color,kind='orb',lane=0){
  const t=(time-start)/.65;if(t<0||t>1)return;
  const x=154+156*t,y=244+lane*15;
  for(let i=1;i<=5;i++)pixels(ctx,[[x-i*10,y]],color,Math.max(2,8-i));
  ctx.save();ctx.translate(Math.round(x/2)*2,Math.round(y/2)*2);
  if(kind==='dagger'){
    pixels(ctx,[[-10,-2],[-4,-4],[2,-2]],'#191c24',8);
    pixels(ctx,[[-8,0],[-2,-2],[4,0]],'#efead2',4);
    pixels(ctx,[[-14,-2]],'#a48658',4);
  }else{
    pixels(ctx,[[-6,-6]],'#151725',16);pixels(ctx,[[-4,-4]],color,12);pixels(ctx,[[0,-2]],'#fff4dc',6);
  }
  ctx.restore();
}
function drawSceneEffects(ctx,id,profile,time,actor){
  const cast=time-1.95;
  if(id==='classless'){
    [.42,1.12,1.82].forEach((start,i)=>{
      const t=(time-start)/.3;if(t<0||t>1)return;
      ctx.strokeStyle=i===2?'#fff1c7':'#b9c4ce';ctx.lineWidth=i===2?6:4;
      ctx.beginPath();ctx.arc(140,260,55,i===1?.5:-1.15,i===1?2.5:1.15);ctx.stroke();
      pixels(ctx,[[200,255],[212,245]],profile.color,4);
    });
  }else if(profile.summon){
    presentation(ctx,profile.actions[0],240,350,time-.55,1,38);
    release(ctx,id==='gravecaller'?'bone':id==='thornbinder'?'root':'void',240,293,time-.75,.8,48);
    if(id==='gravecaller'){
      projectile(ctx,time,2,profile.color);release(ctx,'necro',310,244,time-2.65,.8,34);
    }else if(id==='thornbinder'){
      presentation(ctx,'thornbinderThornLash',178,260,cast,1,55);
      release(ctx,'thorn',292,265,time-2.35,.8,44);
    }else{
      presentation(ctx,'blackStarPulse',270,253,cast,1.35,53);
      release(ctx,'void',276,247,time-2.25,1,53);
    }
  }else if(id==='waverider'){
    presentation(ctx,'hydromancerWaterTorrent',165,245,time-.45,1.15,66);
    release(ctx,'water',282,252,time-.75,1,50);
    presentation(ctx,'hydromancerBubbleWard',actor.x,254,time-2,1.7,65);
  }else if(id==='lightbringer'){
    projectile(ctx,time,.4,profile.color);release(ctx,'light',310,244,time-1.05,.65,35);
    if(time>=1.9&&time<3.2){
      ctx.fillStyle='#775a30';ctx.fillRect(150,236,164,18);
      ctx.fillStyle='#efbe66';ctx.fillRect(150,240,164,10);
      ctx.fillStyle='#fff3c9';ctx.fillRect(150,244,164,4);
      for(let i=0;i<7;i++)pixels(ctx,[[158+i*22,228+(Math.floor(time*12)+i)%3*14]],profile.color,4);
      release(ctx,'dawn',310,244,(time-1.9)%.5,.5,30);
    }
  }else if(id==='oathkeeper'){
    if(time>.4&&time<1.2)drawOathkeeperEffect(ctx,{kind:'oathkeeperOathStrike',x:157,y:260,range:60,dirX:1,dirY:0,age:time-.4,ttl:.8},{x:0,y:0});
    if(time>.7&&time<1.05)drawOathkeeperEffect(ctx,{kind:'enemyContactImpact',oathkeeper:true,heavy:true,x:213,y:260,age:time-.7,ttl:.35},{x:0,y:0});
    if(time>1.95&&time<3.35)drawOathkeeperEffect(ctx,{kind:'oathkeeperBulwark',x:actor.x+22,y:261,radius:45,age:time-1.95,ttl:1.4},{x:0,y:0});
  }else if(id==='fellhunter'){
    if(time>.55&&time<3.6){
      // Persist the trap long enough to read its metal jaws on the shrine floor.
      ctx.strokeStyle='#171b20';ctx.lineWidth=7;ctx.beginPath();ctx.ellipse(245,350,25,9,0,0,Math.PI*2);ctx.stroke();
      ctx.strokeStyle='#bfc7c4';ctx.lineWidth=3;ctx.stroke();
      pixels(ctx,[[222,339],[230,344],[239,343],[250,343],[260,342]],'#e8dfc4',4);
      presentation(ctx,'fellhunterBearTrap',245,342,time-.55,.65,28);
    }
    for(let i=-1;i<=1;i++)projectile(ctx,time,2+i*.07,profile.color,'dagger',i);
    presentation(ctx,'fellhunterThrowingDaggers',295,244,time-2.6,.65,25);
  }
}
