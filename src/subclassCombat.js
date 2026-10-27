import {mythicalChannelGeometry} from './mythicalEquipmentSystem.js';
import {attackProjectileSpeed} from './combatTempo.js';
import {getSubclassPassiveBonuses} from './subclassSystem.js';
import {SUBCLASSES,SUBCLASS_CLASS_TREES} from './subclassData.js';
import {getAbilityEffectiveness} from './skillExpertiseSystem.js';
import {getSelectedAbilityMorph} from './abilityMorphSystem.js';
import {startAbilityChannel,stopAbilityChannel,updateAbilityChannel} from './abilityChannelSystem.js';
import {hasLineOfSight,isPassable,moveActorWithCollision} from './world.js';
import {presentClassMobility} from './classMovement.js';
import {resolveSummonMovementSpeed} from './summonMovementSpeed.js';
import {rewardMobilityMastery,rewardCombatPurpose,registerAbilitySupport,rewardAbilitySupport} from './abilityMasterySystem.js';
import {progressionPower} from './combatPower.js';
import {createFaeFlowerLayout} from './faeFlowerArt.js';
import {GRAVECALLER_SUSTAIN} from './gravecallerSustain.js';
import {clearEliteFrost} from './eliteEncounterSystem.js';
import {CRYO_BALANCE} from './cryomancerSkills.js';
import {clearSunkenPressure,clearSunkenPressureSource} from './sunkenPressureSystem.js';
import {beginRoseMantle,endRoseMantle,updateRoseMantle,mitigateRoseMantle,roseMantleThorns} from './roseMantleSystem.js';
import {HELL_BALANCE} from './hellstalkerSkills.js';
import {applyBloodhoundAilments,updateBloodhoundAilments,removeBloodhoundSource} from './fellhunterAilments.js';
import {PETAL_STORM,beginPetalStorm,endPetalStorm,getPetalStorm,petalStormReduction} from './petalStormSustain.js';
import {executeOathkeeperMorph,onOathkeeperMorphHit,onOathkeeperGuardContact,onOathkeeperWeaponContact,buildOathkeeperBlock,updateOathkeeperMorphs,updateOathkeeperChannel,clearOathkeeperMorph} from './oathkeeperMorphCombat.js';

// Encounter state is bounded, owner-specific and never serialized into profiles.
const states=new WeakMap();
const activeFamilies=p=>new Set((p.loadout?.abilitySlots||[]).map(id=>getSelectedAbilityMorph(p,id)).filter(Boolean));
const morphBonuses=(p,a,h)=>getSubclassPassiveBonuses(p,{tree:SUBCLASS_CLASS_TREES[a.classId],bonuses:h.bonuses?.()||{}},a.subclassId);
const alive=e=>e&&e.hp>0&&!e.dead&&!e.remove&&!e.friendly;
const boss=e=>!!(e.isBoss||e.worldBoss||e.massive||e.bossType);
const elite=e=>!!(e.elite||e.isElite||e.eliteModifier);
const supportParties=new WeakMap();
export function setSubclassSupportParty(p,party){supportParties.set(p,party||[]);}
const validParty=p=>[...new Set([p,...(p.coop?.players||[]),...(supportParties.get(p)||[])])].filter(a=>a&&a.hp>0&&a.active!==false);
export function getSubclassCombatState(p){return states.get(p)||null;}
export function clearSubclassCombatState(p,reason='cancelled'){
  if(reason!=='worldChanged')clearSunkenPressure(p);
  endPetalStorm(p);
  endRoseMantle(p);
  if(p?.activeChannel?.subclassId)stopAbilityChannel(p,reason);
  const s=states.get(p);
  if(s)for(const f of s.fields)cancelField(f);
  if(s)for(const [e] of s.afflictions){if(e.subclassControlOwner===p){delete e.subclassControlOwner;delete e.subclassFrozenUntil;delete e.subclassSilencedUntil;}}
  states.delete(p);
}
export function clearAbilityMorphCombatState(p,id){
  clearSunkenPressureSource(p,id);
  endPetalStorm(p,id);
  endRoseMantle(p,id);
  const s=states.get(p);if(!s)return;
  if(s.oath&&p.buffs?.defense?.sourceAbilityId===id)delete p.buffs.defense;
  clearOathkeeperMorph(s,id);
  for(const f of s.fields)if(f.a.id===id)cancelField(f);
  if(s.preyAbilityId===id)s.prey=null;
  if(s.parryAbilityId===id)s.parryUntil=0;
  if(s.hostWard?.sourceAbilityId===id)s.hostWard=null;
  for(const key of ['fields','shots','spirits','urns','replies'])s[key]=s[key].filter(effect=>(effect.a?.id)!==id);
  if(s.hellImpacts)s.hellImpacts=s.hellImpacts.filter(f=>f.a.id!==id);
  for(const key of ['retaliation','empower','roseGuard'])if(s[key]?.a?.id===id)s[key]=null;
  for(const [e,bundle] of s.afflictions){
    for(const [family,entry] of bundle.effects){
      if(entry.bloodhoundAilments){if(!removeBloodhoundSource(entry,id))bundle.effects.delete(family);}
      else if(entry.ability?.id===id)bundle.effects.delete(family);
    }
    if(!bundle.effects.size){s.afflictions.delete(e);if(e.subclassControlOwner===p){delete e.subclassControlOwner;delete e.subclassFrozenUntil;delete e.subclassSilencedUntil;}}
  }
}
function state(p,w){
  let s=states.get(p);
  if(!s||s.world!==w){clearSubclassCombatState(p,'worldChanged');s={world:w,owner:p,fields:[],shots:[],spirits:[],urns:[],afflictions:new Map(),replies:[],killRewards:new WeakSet(),heat:0,souls:0,penance:0,combo:0,prey:null,lastHit:0,nextVisual:0,nextRetaliation:0};states.set(p,s);}
  return s;
}
function sight(w,x,y,e){return !w.tiles?.length||hasLineOfSight(w,x,y,e.x,e.y,{startSkip:1,endSkip:1});}
function nearby(w,x,y,r,max=8){return (w.enemies||[]).filter(e=>alive(e)&&Math.hypot(e.x-x,e.y-y)<=r+(e.r||e.radius||14)&&sight(w,x,y,e)).sort((a,b)=>Math.hypot(a.x-x,a.y-y)-Math.hypot(b.x-x,b.y-y)).slice(0,max);}
function line(w,x,y,aim,range,width,max=8){return (w.enemies||[]).filter(e=>{
  if(!alive(e)||!sight(w,x,y,e))return false;
  const dx=e.x-x,dy=e.y-y,along=dx*aim.x+dy*aim.y;
  return along>=-8&&along<=range&&Math.abs(dx*aim.y-dy*aim.x)<=width+(e.r||e.radius||14);
}).sort((a,b)=>((a.x-x)*aim.x+(a.y-y)*aim.y)-((b.x-x)*aim.x+(b.y-y)*aim.y)).slice(0,max);}
function point(p,w,aim,range){
  let x=p.x,y=p.y;
  for(let d=Math.min(8,range);d>0;d=Math.min(range,d+8)){
    const nx=p.x+aim.x*d,ny=p.y+aim.y*d;if(w.tiles?.length&&!isPassable(w,nx,ny))break;
    x=nx;y=ny;if(d>=range)break;
  }
  return {x,y};
}
function hunterGroundPoint(p,w,aim,range){
  const target=line(w,p.x,p.y,aim,range,24,1)[0];
  return point(p,w,aim,target?Math.min(range,Math.hypot(target.x-p.x,target.y-p.y)):range);
}
function butterflyTarget(w,origin,aim,range,angle){
  let best=null,bestScore=Infinity;
  for(const e of w.enemies||[]){
    if(!alive(e)||!sight(w,origin.x,origin.y,e))continue;
    const dx=e.x-origin.x,dy=e.y-6-origin.y,d=Math.hypot(dx,dy);
    if(d<1||d>range+(e.radius||14))continue;
    const alignment=(dx*aim.x+dy*aim.y)/d;
    if(alignment<Math.cos(angle))continue;
    const score=(1-alignment)*2+d/Math.max(1,range)*.3;
    if(score<bestScore){best=e;bestScore=score;}
  }
  return best;
}
function guideButterfly(shot,w,dt){
  if(!alive(shot.target)||!(w.enemies||[]).includes(shot.target)||!sight(w,shot.x,shot.y,shot.target)){
    shot.target=butterflyTarget(w,shot,shot.aim,shot.a.range-shot.travelled,shot.a.projectileLockAngle);
  }
  if(!shot.target)return;
  const dx=shot.target.x-shot.x,dy=shot.target.y-6-shot.y;
  // Drop passed targets instead of looping back behind the projectile.
  if(dx*shot.aim.x+dy*shot.aim.y< -8){shot.target=null;return;}
  const angle=Math.atan2(shot.aim.y,shot.aim.x),desired=Math.atan2(dy,dx);
  const delta=Math.atan2(Math.sin(desired-angle),Math.cos(desired-angle));
  const turn=shot.a.projectileTurnRate*dt,next=angle+Math.max(-turn,Math.min(turn,delta));
  shot.aim={x:Math.cos(next),y:Math.sin(next)};
}
function emit(h,p,a,geometry,extra={}){h.effect({kind:'subclassAbility',abilityId:a.id,subclassId:a.subclassId,geometry,
  x:p.x,y:p.y-5,dirX:h.aim?.x??p.dirX??1,dirY:h.aim?.y??p.dirY??0,
  radius:a.subclassRadius,colors:a.colors,hunterAilment:a.hunterAilment,ttl:.35,layer:geometry==='field'?'behind':'front',...extra});}
function heal(p,w,a,amount,x,y,r,h,healingBonusMultiplier=1){
  const bonuses=morphBonuses(p,a,h),scalar=1+(bonuses.supportHealingPct||0)/100;
  let total=0;
  for(const ally of a.oathMorph?[p]:validParty(p))if(Math.hypot(ally.x-x,ally.y-y)<=r&&sight(w,x,y,ally)){
    const value=Math.max(1,Math.round((amount+(bonuses.healingPower||0)*healingBonusMultiplier)*scalar*getAbilityEffectiveness(p,a))),before=ally.hp;
    ally.hp=Math.min(ally.maxHp,ally.hp+value);
    total+=ally.hp-before;
    if(a.subclassId==='acolyte'){ally.poisonTimer=0;ally.burnTimer=0;ally.slowTimer=0;clearEliteFrost(ally,h.now);}
  }
  if(total)rewardCombatPurpose(p,w,a.id,total*.12,h.now,h.log);
  return total;
}
function ward(p,w,a,h,strength=.22,duration=3,x=p.x,y=p.y,r=a.subclassRadius){
  const bonuses=morphBonuses(p,a,h);strength*=(1+Math.min(40,bonuses.subclassWardPct||0)/100)*getAbilityEffectiveness(p,a);duration*=1+Math.min(50,bonuses.subclassDurationPct||0)/100;
  for(const ally of a.oathMorph?[p]:validParty(p))if(Math.hypot(ally.x-x,ally.y-y)<=r&&sight(w,x,y,ally)){
    ally.buffs=ally.buffs||{};
    const prior=ally.buffs.defense;
    const buff={expertiseScaled:true,timer:Math.max(prior?.timer||0,duration),reduction:Math.min(.55,Math.max(prior?.reduction||0,strength)),sourceAbilityId:a.id};
    if(a.cryoSkill)buff.cryo=true;
    if(a.gardenGraveMorph)buff.gardenFamily=a.subclassId;
    registerAbilitySupport(buff,p,a.id);ally.buffs.defense=buff;
  }
}
function refreshHostWard(p,a,s,h){
  const bonuses=morphBonuses(p,a,h);
  const buff={until:h.now+.65*(1+Math.min(50,bonuses.subclassDurationPct||0)/100),
    reduction:Math.min(.55,a.hostWardReduction*(1+Math.min(40,bonuses.subclassWardPct||0)/100)*getAbilityEffectiveness(p,a)),sourceAbilityId:a.id};
  registerAbilitySupport(buff,p,a.id);s.hostWard=buff;
}
function affliction(s,e,now,a,key=a.subclassId){
  let bundle=s.afflictions.get(e);
  if(!bundle){if(s.afflictions.size>=(s.afflictionLimit||64)){const oldest=s.afflictions.keys().next().value;if(oldest.subclassControlOwner===s.owner)delete oldest.subclassControlOwner;s.afflictions.delete(oldest);}bundle={effects:new Map()};s.afflictions.set(e,bundle);}
  let entry=bundle.effects.get(key);
  if(!entry){entry={stacks:0,until:now+5,nextTick:now+.8,damage:0,ability:a};bundle.effects.set(key,entry);}
  return entry;
}
function infernalBrand(p,w,a,e,power,entry,oldStacks,s,h){
 const now=h.now,prepared=oldStacks>=3,empowered=s.empower?.a?.subclassId==='hellstalker'&&s.empower.until>now;
 if(!entry.hellBrand||entry.until<=now||oldStacks===0)entry.nextTick=now+HELL_BALANCE.tickInterval;
 if(prepared&&a.flashover&&now>=(entry.flashoverRecovery||0)){
  entry.flashoverRecovery=now+1.2;
  const strength=Math.max(power,entry.hellPower||0);h.damage(e,strength*.55,a.skill,{sourceAbilityId:a.id,sourceMorph:'hellstalker',element:'fire',magic:true,quiet:true,subclassApplied:true,proc:true});
  for(const foe of nearby(w,e.x,e.y,65,5).filter(f=>f!==e).slice(0,4))h.damage(foe,strength*.18,a.skill,{sourceAbilityId:a.id,sourceMorph:'hellstalker',element:'fire',magic:true,quiet:true,aoe:true,subclassApplied:true,proc:true});
  entry.stacks=1;entry.nextEmber=now+HELL_BALANCE.cadence;emit(h,p,a,'flashover',{x:e.x,y:e.y-5,radius:65,ttl:.45});h.audio?.('flashover',a);
 }else{entry.stacks=now>=(entry.nextEmber||0)?Math.min(3,oldStacks+1):oldStacks;if(now>=(entry.nextEmber||0))entry.nextEmber=now+HELL_BALANCE.cadence;}
 entry.hellBrand=true;entry.hellPower=Math.max(entry.hellPower||0,power*(empowered?1.2:1));entry.damage=entry.hellPower*(HELL_BALANCE.baseBurn+HELL_BALANCE.perEmber*Math.max(1,entry.stacks));entry.dot=true;entry.until=now+HELL_BALANCE.duration;
 p.subclassHasteUntil=now+HELL_BALANCE.paceDuration;p.subclassHasteEffectiveness=getAbilityEffectiveness(p,a);
}
function roseGuard(s,a,power,now,stack=true,duration=4){
 const old=s.roseGuard,active=old?.until>now,ready=now>=(old?.nextLayer||0);
 s.roseGuard={a,power:Math.max(active?old.power:0,power),until:now+duration,
  stacks:stack&&ready?Math.min(3,(active?old.stacks:0)+1):active?old.stacks:0,nextLayer:stack&&ready?now+.5:old?.nextLayer||0};
}
function thornRoot(p,e,a,now,duration=.6){
 control(p,e,now,'slow',1,a);
 if(boss(e)||now<(e.gardenRootRecoveryUntil||0))return;
 control(p,e,now,'root',duration,a);e.gardenRootRecoveryUntil=now+duration+2.5;
}
export function applyGardenCompanionHit(p,w,a,e,power,now){
 if(!a?.gardenGraveMorph||!alive(e))return;
 const s=state(p,w),entry=affliction(s,e,now,a);
 if(a.subclassId==='petalknight'){
  if(Math.hypot(e.x-p.x,e.y-p.y)<=180)roseGuard(s,a,power,now);control(p,e,now,'slow',.75,a);
  if(now>=(entry.nextRoseHit||0)){entry.nextRoseHit=now+.6;entry.stacks=Math.min(3,(entry.until>now?entry.stacks:0)+1);if(entry.stacks===3){thornRoot(p,e,a,now);entry.stacks=0;}}
  entry.ability=a;entry.until=now+4;
 }
}
function control(p,e,now,type,duration=1,a=null){
  duration*=getAbilityEffectiveness(p,a);
  duration*=1+Math.min(40,states.get(p)?.bonuses?.subclassControlPct||0)/100;
  const scale=boss(e)?.3:elite(e)?.55:1;
  e.slowTimer=Math.max(e.slowTimer||0,duration*scale);
  e.subclassControlOwner=p;
  if(type==='freeze'&&!boss(e)&&now>=(e.subclassFreezeRecoveryUntil||0)){
    const dr=Math.min(3,e.subclassFreezeCount||0),time=duration*scale/(1+dr*.6);
    e.subclassFrozenUntil=now+time;e.subclassFreezeRecoveryUntil=now+time+2;e.subclassFreezeCount=dr+1;
  }
  if(type==='root'&&!boss(e))e.rootUntil=Math.max(e.rootUntil||0,now+duration*scale);
  if(type==='silence'&&!boss(e)&&!elite(e)){
    e.subclassSilencedUntil=Math.max(e.subclassSilencedUntil||0,now+duration*scale);
    if(/cultist|priest|mage|wraith|caster/i.test(`${e.kind} ${e.archetype}`))e.telegraph=null;
  }
}
function moveFoe(w,e,x,y,amount){if(boss(e))return;const d=Math.hypot(x-e.x,y-e.y)||1;moveActorWithCollision(e,w,(x-e.x)/d*Math.min(d,amount),(y-e.y)/d*Math.min(d,amount));}
function roseKnockback(p,w,a,e,origin,aim){
  if(boss(e)||!alive(e))return;
  const dx=e.x-origin.x,dy=e.y-origin.y,d=Math.hypot(dx,dy);
  const resistance=elite(e)?.45:(e.radius||e.r||12)>25?.3:1;
  const distance=(32+8*Number(a._charge?.level||0))*resistance;
  const x=d>.01?dx/d:aim.x,y=d>.01?dy/d:aim.y;
  // Small collision-checked steps prevent crossing a thin wall or obstacle.
  for(let left=distance;left>0;left-=4){const step=Math.min(left,4);moveActorWithCollision(e,w,x*step,y*step);}
}
function faerieFire(p,e,entry,now){
  e.subclassWeakenedUntil=now+2;e.subclassWeakenedEffectiveness=getAbilityEffectiveness(p,entry.ability);
  if(entry.stacks>=3){control(p,e,now,'root',.6,entry.ability);entry.stacks=0;}
}
// Companion hits join the same bounded Faerie Fire counter as Fae spells.
// Damage and reward attribution remain in the original summon coordinator.
export function applyFaeSummonHit(p,w,a,e,now){
  if(a?.subclassId!=='fae'||!alive(e))return;
  const s=state(p,w),entry=affliction(s,e,now,a);
  if(entry.until<=now)entry.stacks=0;
  entry.ability=a;entry.until=now+5;entry.stacks=Math.min(3,entry.stacks+1);s.lastHit=now;
  faerieFire(p,e,entry,now);
}
function hit(p,w,a,e,power,h,extra={}){
  if(!alive(e))return false;
  const sub=SUBCLASSES[a.subclassId],s=state(p,w),now=h.now,entry=affliction(s,e,now,a);
  const bonuses=morphBonuses(p,a,h),focus=1+Math.min(20,bonuses.subclassFocusPct||0)/100;
  const oldStacks=entry.until>now?entry.stacks:0;
  if(a.gardenGraveMorph&&entry.until<=now){entry.stacks=0;}
  if(a.hellSkill&&entry.until<=now){entry.stacks=0;entry.hellPower=0;entry.nextEmber=0;}
  s.bonuses=bonuses;
  let damage=power*focus;
  // Hydromancy's existing water-damage investment also strengthens its cold
  // morphs. The cold damage path does not apply the original water bonus.
  if(a.cryoSkill)damage*=1+Math.max(0,h.bonuses?.()?.waterDamagePct||0)/100;
  if(sub.id==='bloodhound'&&s.prey===e&&s.preyUntil>now)damage*=e.hp/(e.maxHp||e.hp)<.5?1.3:1.1;
  if(a.hunterMorph&&sub.id==='bloodhound'&&s.prey===e&&s.preyUntil>now&&!extra.dot){
    if(a.hunterExecute&&e.hp/(e.maxHp||e.hp)<.35)damage*=1.25;
  }
  const shatter=a.cryoSkill&&a.subclassSecondary==='shatter'&&entry.brittleUntil>now&&!extra.proc;
  if(a.cryoSkill&&entry.brittleUntil>now)damage*=shatter?CRYO_BALANCE.shatter:CRYO_BALANCE.brittleDamage;
  if(sub.id==='dawnblade'){s.combo=(s.combo+1)%3;if(s.combo===0)damage*=1.2;}
  if(e.subclassExposedUntil>now)damage*=1+(10+(bonuses.exposedDamagePct||0))/100;
  if(extra.dot)damage*=1+Math.min(40,bonuses.subclassDotPct||0)/100;
  const before=e.hp;
  h.damage(e,Math.max(1,damage),a.skill,{sourceAbilityId:a.id,sourceName:a.baseName||a.name,element:a.element,magic:true,
    color:a.colors[0],singleTarget:a.maxHits===1,aoe:a.maxHits>1,channelTick:extra.channelTick||extra.dot,quiet:!!extra.dot,subclassApplied:true,subclassId:a.subclassId,now,magic:!(a.hunterMorph&&sub.id==='bloodhound'),...extra});
  const dealt=Math.max(0,before-e.hp);
  if(!dealt)return false;
  if(a.id==='fellhunterPracticalStrike'&&(a.hellSkill||a.hunterMorph)&&!extra.dot&&!extra.proc&&!extra.channelTick){
    const resource=a.costType,maximum=resource==='spirit'?p.maxSpirit:p.maxStamina;
    p[resource]=Math.min(maximum,p[resource]+6);
  }
  s.lastHit=now;
  if(a.oathMorph)onOathkeeperMorphHit(p,w,a,e,dealt,s,h,oathAPI,extra);
  if(extra.dot)return true;
  if(a.subclassSecondary==='bind')control(p,e,now,'root',.7,a);
  entry.ability=a;entry.until=now+5;entry.damage=Math.max(1,power*.12);entry.stacks=Math.min(3,entry.stacks+1);
  if(['sunken','holyknight','deathknight','acolyte'].includes(sub.id))e.subclassWeakenedEffectiveness=getAbilityEffectiveness(p,a);
  if(sub.id==='dawnblade')e.subclassExposedEffectiveness=getAbilityEffectiveness(p,a);
  switch(sub.id){
    case 'cryomancer':{
      control(p,e,now,'slow',boss(e)?3:1.8,a);
      // Shared cadence across frost skills: a simultaneous volley is not an
      // instant freeze. Expired Chill and Shatter cannot auto-refresh Brittle.
      if(shatter){
        entry.brittleUntil=0;entry.chill=0;entry.stacks=0;
        emit(h,p,a,'shatter',{x:e.x,y:e.y-6,radius:50,ttl:.42});h.audio?.('shatter',a);
        for(const foe of nearby(w,e.x,e.y,50,4).filter(f=>f!==e).slice(0,3))h.damage(foe,power*CRYO_BALANCE.shardBurst,a.skill,{sourceAbilityId:a.id,sourceMorph:'cryomancer',sourceName:a.baseName,element:'cold',magic:true,quiet:true,subclassApplied:true,proc:true});
      }else if(!extra.proc||extra.channelTick||a.subclassMode==='retaliation'){
        if(now>(entry.chillUntil||0))entry.chill=0;
        if(now>=(entry.nextChill||0)){
          entry.nextChill=now+CRYO_BALANCE.chillCadence;entry.chill=Math.min(3,(entry.chill||0)+1);entry.chillUntil=now+CRYO_BALANCE.chillExpiry;
          if(entry.chill>=3){
            entry.chill=0;
            if(entry.brittleUntil<=now||!entry.brittleUntil){entry.brittleUntil=now+CRYO_BALANCE.brittleDuration;emit(h,p,a,'brittle',{x:e.x,y:e.y-6,radius:28,ttl:.4});}
            if(!boss(e)&&now>=(e.subclassFreezeRecoveryUntil||0)){
              const duration=(elite(e)?CRYO_BALANCE.eliteFreeze:CRYO_BALANCE.freeze)*getAbilityEffectiveness(p,a)*(1+Math.min(40,bonuses.subclassControlPct||0)/100);
              e.subclassFrozenUntil=now+duration;e.subclassFreezeRecoveryUntil=now+duration+CRYO_BALANCE.recovery;e.subclassControlOwner=p;
              emit(h,p,a,'freeze',{x:e.x,y:e.y-10,radius:30,ttl:.4});h.audio?.('freeze',a);
            }
          }
        }
        entry.stacks=entry.chill||0;
      }break;
    }
    case 'holyknight':e.subclassWeakenedUntil=now+1.5;break;
    case 'acolyte':
      e.subclassWeakenedUntil=now+2;
      if(a.soulSiphonField){
        control(p,e,now,'slow',1.25,a);
        // Separate from other Acolyte afflictions: refresh one burn, never stack it.
        const burn=affliction(s,e,now,a,`soulBurn:${a.id}`);
        Object.assign(burn,{ability:a,dot:true,soulBurn:true,stacks:1,
          until:now+a.soulBurnDuration*(1+Math.min(50,bonuses.subclassDurationPct||0)/100),
          damage:Math.max(1,(extra.soulBurnPower??power)*.16)});
      }
      break;
    case 'deathknight':
      e.subclassWeakenedUntil=now+2;
      if(a.gardenGraveMorph)entry.stacks=oldStacks;
      if(a.gardenGraveMorph&&!extra.proc&&Math.hypot(e.x-p.x,e.y-p.y)<=(a.subclassMode==='dash'?220:180)&&now>=(entry.nextSentenceHit||0)){
        entry.nextSentenceHit=now+.6;entry.stacks=Math.min(3,oldStacks+1);
        if(entry.stacks>=3&&now>=(entry.sentenceRecovery||0)){
          entry.stacks=0;entry.sentenceRecovery=now+2.5;
          h.damage(e,power*.45,a.skill,{sourceAbilityId:a.id,sourceMorph:'deathknight',sourceName:a.baseName,element:'necrotic',magic:true,quiet:true,subclassApplied:true,proc:true});
          emit(h,p,a,'deathSentence',{x:e.x,y:e.y-7,radius:28,ttl:.4});
        }
      }break;
    case 'fae':faerieFire(p,e,entry,now);break;
    case 'petalknight':
      if(a.gardenGraveMorph){
        if(a.roseEruption){
          // One separate wound per target: other rose skills cannot overwrite
          // its potency or prolong it; damage ticks never reapply the wound.
          const wound=affliction(s,e,now,a,`thornWound:${a.id}`);
          if(wound.until<=now||!wound.dot)wound.nextTick=now+.8;
          Object.assign(wound,{ability:a,dot:true,thornWound:true,stacks:1,
            until:now+a.thornWoundDuration,damage:power*a.thornWoundRatio});
        }
        entry.stacks=oldStacks;
        if(!extra.proc&&Math.hypot(e.x-p.x,e.y-p.y)<=180)roseGuard(s,a,power,now);
        if(a.subclassSecondary==='pull'&&!extra.proc)moveFoe(w,e,p.x,p.y,elite(e)||e.heavy?12:38);
        control(p,e,now,'slow',.75,a);
        if(a.rootPrison||a.subclassMode==='trap')thornRoot(p,e,a,now,.85);
        else if(now>=(entry.nextRoseHit||0)){entry.nextRoseHit=now+.6;entry.stacks=Math.min(3,oldStacks+1);if(entry.stacks>=3){thornRoot(p,e,a,now);entry.stacks=0;}}
      }else control(p,e,now,'root',.45,a);break;
    case 'sunscorched':s.heat=Math.min(5,s.heat+1);entry.dot=true;entry.damage=power*(.1+s.heat*.018);break;
    case 'dawnblade':e.subclassExposedUntil=now+2;break;
    case 'bloodhound':
      if(a.hunterMorph){
        if(!alive(s.prey)||s.preyUntil<=now||a.hunterRetarget&&!extra.proc&&!extra.channelTick){s.prey=e;s.preyAbilityId=a.id;}
        if(s.prey===e)s.preyUntil=now+6;
        applyBloodhoundAilments(entry,a,power,now,s.empower?.a?.subclassId==='bloodhound'&&s.empower.until>now);
        if(a.subclassSecondary==='slow'||a.subclassSecondary==='field')control(p,e,now,'slow',1,a);
        if(a.subclassSecondary==='pull'&&!extra.proc)moveFoe(w,e,p.x,p.y,elite(e)||e.heavy?12:35);
        if(a.hunterExecute&&s.prey===e&&e.hp/(e.maxHp||e.hp)<.35)emit(h,p,a,'execute',{x:e.x,y:e.y-6,radius:30,ttl:.3});
        break;
      }
      s.prey=e;s.preyAbilityId=a.id;s.preyUntil=now+5;entry.dot=true;entry.damage=power*.09;break;
    case 'hellstalker':
      if(a.hellSkill){infernalBrand(p,w,a,e,power,entry,oldStacks,s,h);if(a.subclassSecondary==='slow')control(p,e,now,'slow',1,a);if(a.subclassSecondary==='pull'&&!extra.proc)moveFoe(w,e,p.x,p.y,elite(e)||e.heavy?12:35);break;}
      entry.dot=true;entry.damage=power*.1;if(entry.stacks>=3){entry.stacks=0;
      for(const foe of nearby(w,e.x,e.y,75,5))h.damage(foe,power*.25,a.skill,{sourceAbilityId:a.id,sourceName:a.baseName,element:'fire',magic:true,quiet:true,subclassApplied:true});
      emit(h,p,a,'burst',{x:e.x,y:e.y,radius:45});}break;
  }
  if(!a.gardenGraveMorph&&!a.hellSkill&&a.subclassSecondary==='detonate'&&entry.dot&&entry.stacks>=2){
    entry.stacks=0;entry.dot=false;h.damage(e,power*.5,a.skill,{sourceAbilityId:a.id,sourceName:a.baseName,element:a.element,magic:true,quiet:true,subclassApplied:true,proc:true});
  }
  if((!a.spectralHost||extra.hostImpact)&&(!a.petalStorm||extra.stormImpact))emit(h,p,a,a.spectralUrn?'urnSpiritHit':a.soulSiphonField?'soulBurnImpact':a.spectralHost?'spectralHostImpact':extra.flowerField?'faerieFire':'impact',{x:e.x,y:e.y-7,radius:extra.flowerField?8:20,ttl:.22});
  if(a.spectralUrn&&now>=(s.nextUrnImpact||0)){s.nextUrnImpact=now+.16;h.audio?.('impact',a);}
  if(a.cryoSkill&&now>=(s.nextCryoImpact||0)){s.nextCryoImpact=now+.18;h.audio?.('impact',a);}
  if(a.gardenGraveMorph&&now>=(s.nextGardenImpact||0)){s.nextGardenImpact=now+.18;h.audio?.('impact',a);}
  if(a.hellSkill&&now>=(s.nextHellImpact||0)){s.nextHellImpact=now+.18;h.audio?.('impact',a);}
  if(a.hunterMorph&&now>=(s.nextHunterImpact||0)){s.nextHunterImpact=now+.18;h.audio?.('impact',a);}
  return true;
}
function cancelField(f){if(f.flowerVisual)f.flowerVisual.active=false;if(f.soulVisual)f.soulVisual.active=false;if(f.stormVisual)endPetalStorm(f.stormVisual.owner,f.stormVisual);}
function addField(s,a,h,pos,extra={}){
  const same=s.fields.filter(f=>f.a.id===a.id);if(same.length>=2){cancelField(same[0]);s.fields.splice(s.fields.indexOf(same[0]),1);}
  if(s.fields.length>=12)cancelField(s.fields.shift());
  const field={a,x:pos.x,y:pos.y,until:h.now+(a.duration||4)*(a._charge?.durationMultiplier||1),nextTick:h.now,nextVisual:h.now,radius:a.subclassRadius,power:h.power,...extra};
  s.fields.push(field);return field;
}
function emitFlowerField(p,h,f){
  emit(h,p,f.a,'flowerField',{x:f.x,y:f.y,radius:f.radius,layer:'behind',
    ttl:Math.max(.01,f.until-h.now),flowerAge:h.now-f.startedAt,flowerVisual:f.flowerVisual});
}
function emitSoulField(p,h,f){
  emit(h,p,f.a,'soulSiphonField',{x:f.x,y:f.y,radius:f.radius,layer:'behind',
    ttl:Math.max(.01,f.until-h.now),soulAge:h.now-f.startedAt,soulVisual:f.soulVisual});
}
function cleanseCryoAllies(p,w,a,h,x,y,r){
  for(const ally of validParty(p))if(Math.hypot(ally.x-x,ally.y-y)<=r&&sight(w,x,y,ally)){
    const affected=ally.slowTimer>0||ally.slowUntil>h.now||ally.eliteFrost>0||ally.eliteFrozenUntil>h.now;
    ally.slowTimer=0;ally.slowUntil=0;clearEliteFrost(ally,h.now);
    if(affected){emit(h,p,a,'thaw',{x:ally.x,y:ally.y-8,radius:30,ttl:.4});rewardCombatPurpose(p,w,a.id,2,h.now,h.log);}
  }
}
function supportCast(p,w,a,s,h,placeBeacon=true){
  const secondary=a.subclassSecondary,sub=SUBCLASSES[a.subclassId],mode=a.subclassMode;
  if(a.hellSkill){if(mode==='empower')s.empower={a,until:h.now+6};return;}
  if(a.hunterMorph){if(mode==='empower')s.empower={a,until:h.now+6};if(a.hunterWard){ward(p,w,a,h,a.hunterWard,a.hunterWardDuration);s.hunterWardUntil=h.now+a.hunterWardDuration;}return;}
  if(a.gardenGraveMorph){
    if(sub.id==='petalknight'){
      if(a.roseWard&&mode!=='field'){roseGuard(s,a,h.power,h.now,false,mode==='auraChannel'?.65:4);if(mode==='retaliation')ward(p,w,a,h,.28,4);}
      return;
    }
    if(sub.id==='deathknight'&&a.boneWard){ward(p,w,a,h,a.boneWard,mode==='auraChannel'?.65:3);return;}
  }
  if(a.cryoSkill){
    if(a.cryoWard)ward(p,w,a,h,a.cryoWard,a.cryoWardDuration);
    if(a.cryoHeal)heal(p,w,a,a.cryoHeal,p.x,p.y,a.subclassRadius,h);
    if(a.cryoCleanse)cleanseCryoAllies(p,w,a,h,p.x,p.y,a.subclassRadius);
    if(mode==='retaliation')s.retaliation={a,until:h.now+a.cryoWardDuration,power:h.power,stored:0};
    return;
  }
  if(['ward','retaliation'].includes(mode)||['ward','parry','smite'].includes(secondary)){
    ward(p,w,a,h,sub.id==='sinner'?.38:sub.id==='holyknight'?.3:.22,mode==='retaliation'?4:3);
    if(mode==='retaliation'||secondary==='smite'){s.retaliation={a,until:h.now+4,power:h.power,stored:0};}
    if(secondary==='parry'){s.parryUntil=h.now+.7;s.parryAbilityId=a.id;}
  }
  if(['heal','ritual'].includes(mode)||['heal','blessing','beacon'].includes(secondary)){
    const souls=sub.id==='acolyte'?s.souls:0;s.souls=Math.max(0,s.souls-souls);
    if(sub.id==='acolyte'&&a.id==='soulSiphon'){
      const bonuses=morphBonuses(p,a,h),fraction=(GRAVECALLER_SUSTAIN.riteBase+souls*GRAVECALLER_SUSTAIN.ritePerSoul)*
        (1+Math.min(40,bonuses.supportHealingPct||0)/100)*(a._mastery?.damage||1)*getAbilityEffectiveness(p,a);
      let restored=0;
      for(const ally of validParty(p))if(Math.hypot(ally.x-p.x,ally.y-p.y)<=a.subclassRadius&&sight(w,p.x,p.y,ally)){
        const before=ally.hp;
        ally.hp=Math.min(ally.maxHp,ally.hp+ally.maxHp*Math.min(GRAVECALLER_SUSTAIN.riteMaximum,fraction));
        restored+=ally.hp-before;
        ally.poisonTimer=0;ally.burnTimer=0;ally.slowTimer=0;clearEliteFrost(ally,h.now);
      }
      if(restored)rewardCombatPurpose(p,w,a.id,restored*.12,h.now,h.log);
    }else heal(p,w,a,Math.max(4,h.power/getAbilityEffectiveness(p,a)*.45)+souls*2,p.x,p.y,a.subclassRadius,h);
  }
  if(mode==='empower'){s.empower={a,until:h.now+6};if(sub.id==='sunscorched')s.heat=Math.min(5,s.heat+2);}
}
export function executeSubclassAbility(p,w,a,slot,h){
  if(!a?.subclassId||!SUBCLASSES[a.subclassId])return false;
  const s=state(p,w),aim=h.aim,mode=a.subclassMode;
  s.bonuses=morphBonuses(p,a,h);
  a={...a,range:a.range*(1+Math.min(40,s.bonuses.subclassRangePct||0)/100),subclassRadius:a.subclassRadius*(a._charge?.radiusMultiplier||1)*(1+Math.min(40,s.bonuses.aoeRadiusPct||0)/100),duration:a.petalStorm?PETAL_STORM.duration:(a.duration||4)*(a.oathMorph?1:1+Math.min(50,s.bonuses.subclassDurationPct||0)/100)};
  if(a.oathMorph)return executeOathkeeperMorph(p,w,a,slot,s,h,oathAPI);
  if(a.hellSkill||a.hunterMorph){
    const raw=h.bonuses?.()||{};
    const rangePct=(raw.subclassRangePct||0)+(a.id==='fellhunterGrapplingHook'?raw.grapplingHookRangePct||0:0);
    const radiusPct=(raw.aoeRadiusPct||0)+(a.id==='fellhunterBombToss'?raw.bombRadiusPct||0:a.id==='fellhunterKillZone'?raw.killZoneRadiusPct||0:0);
    a.range=a.range/(1+Math.min(40,s.bonuses.subclassRangePct||0)/100)*(1+Math.min(40,rangePct)/100);
    a.subclassRadius=a.subclassRadius/(1+Math.min(40,s.bonuses.aoeRadiusPct||0)/100)*(1+Math.min(40,radiusPct)/100);
    if(a.id==='fellhunterGrapplingHook')a.mobilityProfile={...a.mobilityProfile,distance:a.mobilityProfile.distance*(1+Math.min(40,rangePct)/100)};
    if(a.id==='fellhunterFlamingArrowVolley')a.maxHits+=Math.max(0,Math.floor(raw.volleyExtraHits||0));
  }
  const target=line(w,p.x,p.y,aim,a.range,24,1)[0];
  if(mode==='mark'&&!target){h.log?.('Aim at a living enemy.');return false;}
  if(a.channelProfile){
    const c=startAbilityChannel(p,a,slot,h.now,aim,{subclassId:a.subclassId,subclassMode:mode,ability:a,damage:h.power,range:a.range,profile:'subclass',mythicalMode:a._mythChannel});
    if(!c)return false;
    if(a.spectralHost)refreshHostWard(p,a,s,h);
    if(mode==='projectileChannel'||a.spectralHost)h.audio?.('channelStart',a);
  }else if(mode==='dash'||mode==='retreat'){
    const before={x:p.x,y:p.y},sign=mode==='retreat'?-1:1;
    const travel=a.hunterPursuit&&target?Math.min(a.mobilityProfile.distance,Math.max(0,Math.hypot(target.x-p.x,target.y-p.y)-40)):a.mobilityProfile.distance;
    moveActorWithCollision(p,w,aim.x*travel*sign,aim.y*travel*sign);
    const distance=Math.hypot(p.x-before.x,p.y-before.y);if(distance<8&&!(a.hunterPursuit&&target&&Math.hypot(target.x-before.x,target.y-before.y)<=48))return false;
    rewardMobilityMastery(p,w,a.id,distance,h.now,h.log);
    const start=sign>0?before:p;
    if(!((a.hellSkill||a.hunterMorph)&&a.subclassSecondary==='shot'))for(const e of line(w,start.x,start.y,aim,distance+60,30,a.maxHits))hit(p,w,a,e,h.power,h);
    if((a.hellSkill||a.hunterMorph)&&a.subclassSecondary==='shot'){
      if(s.shots.length>=32)s.shots.shift();s.shots.push({a:{...a,range:460,subclassMode:'bolt'},x:before.x,y:before.y-6,aim:{...aim},travelled:0,power:h.power,hit:new Set(),speed:820,until:h.now+2});
    }
    if(a.subclassSecondary==='burst')for(const e of nearby(w,p.x,p.y,a.subclassRadius,a.maxHits))hit(p,w,a,e,h.power*.3,h,{proc:true});
    if(['field','pressure','burn','beacon'].includes(a.subclassSecondary))addField(s,a,h,before,{power:h.power*.3});
    presentClassMobility(p,w,before,a,h.now);
    emit(h,p,a,'dash',{x:before.x,y:before.y-5,endX:p.x,endY:p.y-5});supportCast(p,w,a,s,h);
  }else if(mode==='bolt'||mode==='pierce'){
    const spread=a.hellSkill||a.hunterMorph?1+Math.min(50,h.bonuses?.()?.volleyWidthPct||0)/100:1;
    const count=a.hellVolley||a.hunterVolley||1,angles=Array.from({length:count},(_,i)=>(i-(count-1)/2)*.18*spread);
    for(const angle of angles){
      if(s.shots.length>=32)s.shots.shift();const dir=Math.atan2(aim.y,aim.x)+angle;
      s.shots.push({a,x:p.x,y:p.y-6,aim:{x:Math.cos(dir),y:Math.sin(dir)},travelled:0,power:h.power,hit:new Set(),speed:attackProjectileSpeed(a,mode==='pierce'?760:480),until:h.now+2});
    }
  }else if(mode==='chain'){
    if(target){const targets=[target,...nearby(w,target.x,target.y,140,5).filter(e=>e!==target)].slice(0,a.maxHits);
      let prior=p;for(let i=0;i<targets.length;i++){hit(p,w,a,targets[i],h.power*Math.pow(.7,i),h,{proc:i>0});emit(h,p,a,'chain',{x:prior.x,y:prior.y-8,endX:targets[i].x,endY:targets[i].y-8});prior=targets[i];}}
  }else if(mode==='field'||mode==='trap'){
    if(a.petalStorm){
      for(const f of s.fields)if(f.a.id===a.id)cancelField(f);
      s.fields=s.fields.filter(f=>f.a.id!==a.id);
      const visual=beginPetalStorm(p,a,h.now,a.subclassRadius);
      visual.world=w;
      addField(s,a,h,p,{follow:true,startedAt:h.now,until:visual.until,nextTick:h.now+.25,stormVisual:visual});
      for(const layer of ['behind','front'])emit(h,p,a,'petalStorm',{x:p.x,y:p.y,radius:a.subclassRadius,ttl:PETAL_STORM.duration,stormVisual:visual,layer});
    }else if(a.soulSiphonField){
      s.afflictionLimit=128;
      for(const f of s.fields)if(f.a.id===a.id)cancelField(f);
      s.fields=s.fields.filter(f=>f.a.id!==a.id);
      const f=addField(s,a,h,p,{startedAt:h.now,until:h.now+a.duration,nextTick:h.now+.8,
        soulVisual:{active:true,duration:a.duration}});
      for(const e of nearby(w,f.x,f.y,f.radius,a.maxHits).filter(e=>Math.hypot(e.x-f.x,e.y-f.y)<=f.radius))
        hit(p,w,a,e,h.power*.7,h,{soulBurnPower:h.power});
      emitSoulField(p,h,f);
    }else if(a.faeFlowerField){
      for(const f of s.fields)if(f.a.id===a.id)cancelField(f);
      s.fields=s.fields.filter(f=>f.a.id!==a.id);
      const flowers=createFaeFlowerLayout(a.subclassRadius).filter(f=>!w.tiles?.length||(isPassable(w,p.x+f.x,p.y+f.y)&&sight(w,p.x,p.y,{x:p.x+f.x,y:p.y+f.y})));
      const f=addField(s,a,h,p,{startedAt:h.now,until:h.now+a.duration,nextTick:h.now+.8,
        healingPower:3*progressionPower(p,'warding','defence')*(a._mastery?.damage||1),
        flowerVisual:{active:true,duration:a.duration,flowers}});
      emitFlowerField(p,h,f);
    }else{
      const pos=a.hellSkill||a.hunterMorph||a.cryoSkill?hunterGroundPoint(p,w,aim,a.range):point(p,w,aim,Math.min(210,a.range));
      if(a.cryoSkill||a.gardenGraveMorph||a.hellSkill||a.hunterMorph){for(const f of s.fields)if(f.a.id===a.id)cancelField(f);s.fields=s.fields.filter(f=>f.a.id!==a.id);}
      addField(s,a,h,pos,{trap:mode==='trap',armAt:h.now+.55/(a.hellSkill||a.hunterMorph?1+Math.max(0,h.bonuses?.()?.trapArmSpeedPct||0)/100:1),until:h.now+(a.cryoSkill||a.gardenGraveMorph||a.hellSkill||a.hunterMorph?a.duration:(mode==='trap'?8:4)*(1+Math.min(50,s.bonuses.subclassDurationPct||0)/100))});
      emit(h,p,a,'field',{...pos,ttl:.5});
    }
  }else if(a.hellDelay){
    const pos=hunterGroundPoint(p,w,aim,a.range);s.hellImpacts=s.hellImpacts||[];
    if(s.hellImpacts.length>=8)s.hellImpacts.shift();s.hellImpacts.push({a,...pos,power:h.power,at:h.now+a.hellDelay});
    emit(h,p,a,'hellWarning',{...pos,radius:a.subclassRadius,ttl:a.hellDelay,layer:'behind'});
  }else if(a.roseMantle){
    const visual=beginRoseMantle(p,w,a,h.now,s.bonuses);s.roseMantle=visual;
    for(const layer of ['behind','front'])emit(h,p,a,'roseMantle',{ttl:6,mantleVisual:visual,layer});
  }else if(a.roseEruption){
    const pos=point(p,w,aim,a.range);
    // The visible circular border is the exact damage boundary. Do not let
    // enemy radius padding or a target cap hide the actual burst shape.
    for(const e of nearby(w,pos.x,pos.y,a.subclassRadius,Infinity).filter(e=>
      Math.hypot(e.x-pos.x,e.y-pos.y)<=a.subclassRadius&&sight(w,p.x,p.y,e))){
      if(hit(p,w,a,e,h.power,h,{heavy:true,knockback:true}))roseKnockback(p,w,a,e,pos,aim);
    }
    for(const layer of ['behind','front'])emit(h,p,a,'roseEruption',{
      ...pos,radius:a.subclassRadius,chargeLevel:a._charge?.level||0,ttl:.95,layer});
  }else if(a.spectralUrn){
    if(s.urns.length>=8)s.urns.shift();
    const landing=point(p,w,aim,a.range),group=s.nextUrnId=(s.nextUrnId||0)+1;
    s.urns.push({a,group,startX:p.x,startY:p.y,x:p.x,y:p.y,endX:landing.x,endY:landing.y,
      born:h.now,landAt:h.now+a.urnFlightTime,progress:0,power:h.power});
  }else if(mode==='spirits'){
    supportCast(p,w,a,s,h);
    for(let i=0;i<3;i++){if(s.spirits.length>=12)s.spirits.shift();s.spirits.push({a,x:p.x+(i-1)*15,y:p.y-20,power:h.power*.28,until:h.now+4,nextHit:h.now+.2});}
  }else if(mode==='mark'){
    hit(p,w,a,target,h.power*.45,h);const entry=affliction(s,target,h.now,a);
    entry.mark={a,power:h.power,hits:0,until:h.now+6};emit(h,p,a,'mark',{x:target.x,y:target.y-35,ttl:.5});
    supportCast(p,w,a,s,h);
  }else{
    supportCast(p,w,a,s,h);
    const pos=mode==='burst'?(a.hellSkill||a.hunterMorph?hunterGroundPoint(p,w,aim,a.range):point(p,w,aim,Math.min(170,a.range))):p;
    const targets=mode==='melee'?line(w,p.x,p.y,aim,a.range,35,a.maxHits):nearby(w,pos.x,pos.y,a.subclassRadius,a.maxHits);
    if(!a.hunterSupport)for(const e of targets){
      const rose=a.gardenGraveMorph&&a.subclassId==='petalknight'&&mode==='melee'&&a.subclassSecondary==='burst';
      if(hit(p,w,a,e,h.power*(['ward','heal','ritual','retaliation','empower'].includes(mode)?.4:1),h,rose?{heavy:true,knockback:true}:{})&&rose)roseKnockback(p,w,a,e,p,aim);
    }
    if(a.gardenGraveMorph&&a.subclassId==='petalknight'&&mode==='melee'&&a.subclassSecondary==='burst'){
      const end=point(p,w,aim,a.range*.7);
      for(const e of nearby(w,end.x,end.y,a.subclassRadius,6))hit(p,w,a,e,h.power*.22,h,{proc:true});
      emit(h,p,a,'burst',{...end,radius:a.subclassRadius,ttl:.4});
    }
    emit(h,p,a,mode==='melee'?'arc':mode==='retaliation'||mode==='ward'?'ward':mode==='heal'||mode==='ritual'?'ritual':a.hellSkill&&mode==='empower'?'kindling':'burst',{x:pos.x,y:pos.y-5,range:a.range});
  }
  if(!a.faeFlowerField&&['bolt','pierce','chain','beam','auraChannel','field','trap'].includes(mode))supportCast(p,w,a,s,h,!['field','trap'].includes(mode));
  h.pay(a);h.cooldown(a);
  if(a.hellSkill)s.hellExposureUntil=h.now+HELL_BALANCE.exposureDuration;
  if(a.subclassHealthCost){const spent=Math.max(0,Math.min(p.hp-1,Math.max(1,Math.floor(p.hp*a.subclassHealthCost))));p.hp-=spent;s.penance=Math.min(6,s.penance+1);}
  if(!a.soulSiphonField&&!a.spectralUrn)emit(h,p,a,'cast',{radius:24});
  return true;
}
export function updateSubclassCombat(p,w,input,dt,now,h){
  if(!states.has(p)&&!p.activeChannel?.subclassId)return;
  const s=state(p,w);h.now=now;
  s.bonuses=h.bonuses?.()||{};
  if(p.hp<=0||p.lifeState&&p.lifeState!=='alive'){clearSubclassCombatState(p,'death');return;}
  const validHunter=a=>p.active!==false&&p.knownAbilities?.includes(a.id)&&getSelectedAbilityMorph(p,a.id)===a.subclassId;
  for(const f of s.fields)if((f.a.hellSkill||f.a.hunterMorph)&&!validHunter(f.a)){cancelField(f);f.until=now;}
  s.shots=s.shots.filter(f=>!(f.a.hellSkill||f.a.hunterMorph)||validHunter(f.a));
  if((s.empower?.a?.hellSkill||s.empower?.a?.hunterMorph)&&!validHunter(s.empower.a))s.empower=null;
  updateOathkeeperMorphs(p,w,s,h,oathAPI);
  if(s.hellImpacts){
    s.hellImpacts=s.hellImpacts.filter(f=>p.active!==false&&p.knownAbilities?.includes(f.a.id)&&getSelectedAbilityMorph(p,f.a.id)==='hellstalker');
    for(const f of s.hellImpacts)if(f.at<=now){
      for(const e of nearby(w,f.x,f.y,f.a.subclassRadius,f.a.maxHits).filter(e=>sight(w,p.x,p.y,e)))hit(p,w,f.a,e,f.power,h);
      emit(h,p,f.a,'hellRupture',{x:f.x,y:f.y,radius:f.a.subclassRadius,ttl:.6});h.audio?.('impact',f.a);f.done=true;
    }
    s.hellImpacts=s.hellImpacts.filter(f=>!f.done);
  }
  if(s.roseMantle){
    s.roseMantle=updateRoseMantle(p,w,now);
    if(s.roseMantle)for(const layer of ['behind','front'])if(!w.effects?.some(fx=>fx.mantleVisual===s.roseMantle&&fx.layer===layer))emit(h,p,s.roseMantle.a,'roseMantle',{ttl:s.roseMantle.until-now,mantleVisual:s.roseMantle,layer});
  }
  if(s.lastHit&&now-s.lastHit>4){s.heat=0;s.combo=0;s.penance=Math.max(0,s.penance-dt*.5);}
  if(p.activeChannel?.subclassId){
    updateAbilityChannel(p,input,dt,now,{payResource:h.payResource,onTick:c=>{
      const a=c.ability,shape=mythicalChannelGeometry(p,c),aim={x:shape.dirX,y:shape.dirY};
      if(a.oathMorph){updateOathkeeperChannel(p,w,a,s,h,oathAPI,c.damage*shape.damageMultiplier);return;}
      if(c.subclassMode==='projectileChannel'){
        if(s.shots.length>=32)s.shots.shift();
        const origin={x:p.x,y:p.y-6};
        s.shots.push({a,...origin,aim:{...aim},target:butterflyTarget(w,origin,aim,a.range,a.projectileLockAngle),travelled:0,power:c.damage*shape.damageMultiplier,hit:new Set(),speed:a.projectileSpeed,until:now+2,channelTick:true,trail:[],nextTrailAt:0});
        if(now>=(c.nextAudioAt||0)){c.nextAudioAt=now+.8;h.audio?.('channelLoop',a);}
        return;
      }
      // The Host pierces every visible foe, including when a transforming set
      // supplies its usual target cap. Terrain still stops the procession.
      const end=a.spectralHost?point(p,w,aim,c.range):null;
      const reach=end?Math.hypot(end.x-p.x,end.y-p.y):c.range;
      const targets=c.subclassMode==='beam'?line(w,p.x,p.y,aim,reach,a.spectralHost?Math.max(a.beamWidth,shape.width):shape.width,a.spectralHost?Infinity:shape.maxTargets||a.maxHits):nearby(w,p.x,p.y,a.subclassRadius,a.maxHits);
      for(const [i,e] of targets.entries()){hit(p,w,a,e,c.damage*shape.damageMultiplier,h,{channelTick:true,...(a.spectralHost?{quiet:true,hostImpact:i<6}: {})});if(a.subclassSecondary==='pull')moveFoe(w,e,p.x,p.y,8);}
      if(a.spectralHost){
        refreshHostWard(p,a,s,h);
        if(now>=(c.nextAudioAt||0)){c.nextAudioAt=now+.8;h.audio?.('channelLoop',a);}
      }
      if(a.gardenGraveMorph){
        if(a.subclassId==='petalknight'&&a.roseWard)roseGuard(s,a,c.damage,now,false,.65);
        if(a.subclassId==='deathknight'&&a.boneWard)ward(p,w,a,h,a.boneWard,.65);
        if(now>=(c.nextGardenAudio||0)){c.nextGardenAudio=now+.9;h.audio?.('channelLoop',a);}
      }
      if(shape.mode==='starChain'&&targets[0])for(const e of nearby(w,targets[0].x,targets[0].y,120,4).filter(e=>!targets.includes(e)).slice(0,2)){hit(p,w,a,e,c.damage*.28,h,{channelTick:true,proc:true});emit(h,p,a,'chain',{x:targets[0].x,y:targets[0].y-8,endX:e.x,endY:e.y-8,ttl:.2});}
      if(['heal','blessing','beacon'].includes(a.subclassSecondary))heal(p,w,a,c.damage/getAbilityEffectiveness(p,a)*.4,p.x,p.y,a.subclassRadius,h);
      if(['ward','retaliation'].includes(a.subclassSecondary))ward(p,w,a,h,.22,.6);
      if(a.subclassSecondary==='retaliation')s.retaliation={a,until:now+.7,power:c.damage,stored:0};
      if(a.subclassSecondary==='haste')for(const ally of validParty(p))if(Math.hypot(ally.x-p.x,ally.y-p.y)<=a.subclassRadius){ally.subclassHasteUntil=now+.8;ally.subclassHasteEffectiveness=getAbilityEffectiveness(p,a);}
      if(a.subclassHealthCost&&p.hp>1){p.hp=Math.max(1,p.hp-1);s.penance=Math.min(6,s.penance+.25);}
    },onEnd:c=>h.audio?.('channelEnd',c.ability)});
    if(p.activeChannel&&now>=s.nextVisual){s.nextVisual=now+.12;const c=p.activeChannel;
      const shape=mythicalChannelGeometry(p,c);
      if(c.subclassMode==='projectileChannel')emit(h,p,c.ability,'faeBloom',{radius:12,dirX:c.dirX,dirY:c.dirY,ttl:.2});
      else if(c.ability.spectralHost){
        const end=point(p,w,{x:shape.dirX,y:shape.dirY},c.range);
        emit(h,p,c.ability,'spectralHost',{dirX:shape.dirX,dirY:shape.dirY,range:Math.hypot(end.x-p.x,end.y-p.y),width:Math.max(c.ability.beamWidth,shape.width),phaseTime:c.elapsed,ttl:.18});
      }
      else if(shape.mode==='torrentSweep')h.effect({kind:'combatTechnique',profile:'mythicTorrent',colors:c.ability.colors,x:p.x,y:p.y,dirX:shape.dirX,dirY:shape.dirY,width:shape.width,range:c.range,ttl:.18,layer:'front'});
      else if(!c.ability.oathMorph)emit(h,p,c.ability,c.subclassMode==='beam'?'beam':'aura',{dirX:c.dirX,dirY:c.dirY,range:c.range,ttl:.18});}
  }
  for(const f of s.fields){
    if(f.a.petalStorm){if(!getPetalStorm(p,now)){cancelField(f);f.until=now;continue;}f.x=p.x;f.y=p.y;f.stormVisual.elapsed=now-f.startedAt;}
    if(f.until<=now)continue;
    const foes=f.a.petalStorm||f.a.faeFlowerField||f.a.soulSiphonField||f.a.cryoSkill
      ? nearby(w,f.x,f.y,f.radius,Infinity).filter(e=>Math.hypot(e.x-f.x,e.y-f.y)<=f.radius)
      : nearby(w,f.x,f.y,f.radius,f.a.maxHits);
    const ready=!f.trap||now>=f.armAt&&foes.length>0;
    if(ready&&now>=f.nextTick){f.nextTick=now+(f.a.petalStorm?PETAL_STORM.interval:f.a.cryoFieldInterval||.8);
      for(const [index,e] of foes.entries()){hit(p,w,f.a,e,f.power*(f.a.soulSiphonField ? .3 : 1),h,{proc:true,channelTick:!f.trap,stormImpact:!!f.a.petalStorm&&index<6,
        ...(f.a.soulSiphonField?{soulBurnPower:f.power,quiet:true}:{}),...(f.a.faeFlowerField?{flowerField:true,quiet:true}:{})});if(f.a.subclassSecondary==='pull')moveFoe(w,e,f.x,f.y,14);}
      // Ground effects retain status application but use their own capped cadence.
      if(!f.trap)for(const e of foes){if(f.a.hellSkill||f.a.hunterMorph)continue;const sub=SUBCLASSES[f.a.subclassId];if(['sunken','petalknight'].includes(sub.id)&&!(f.a.gardenGraveMorph&&sub.id==='petalknight'))control(p,e,now,sub.id==='petalknight'?'root':'slow',.8,f.a);const entry=affliction(s,e,now,f.a);entry.ability=f.a;entry.until=now+(f.a.cryoSkill?5:2);}
      if(!f.a.soulSiphonField&&['heal','blessing'].includes(f.a.subclassSecondary)){
        heal(p,w,f.a,f.a.bloomFieldHeal?f.a.bloomFieldHeal*progressionPower(p,'warding','defence')*(f.a._mastery?.damage||1):f.a.cryoFieldHeal?f.a.cryoFieldHeal*progressionPower(p,'warding','defence')*(f.a._mastery?.damage||1):f.a.faeFlowerField?f.healingPower:Math.max(2,f.power/getAbilityEffectiveness(p,f.a)*.3),f.x,f.y,f.radius,h,f.a.cryoFieldHeal||f.a.gardenGraveMorph?.25:1);
      }
      if(f.a.cryoFieldCleanse)cleanseCryoAllies(p,w,f.a,h,f.x,f.y,f.radius);
      if(f.a.subclassSecondary==='ward')ward(p,w,f.a,h,.2,1,f.x,f.y,f.radius);
      if(f.a.gardenGraveMorph&&f.a.subclassId==='petalknight'&&f.a.roseWard&&Math.hypot(p.x-f.x,p.y-f.y)<=f.radius&&sight(w,f.x,f.y,p))roseGuard(s,f.a,f.power,now,false,1);
      if(f.trap){for(const e of foes)control(p,e,now,'root',1,f.a);f.until=now;emit(h,p,f.a,'burst',{x:f.x,y:f.y,radius:f.radius});}
    }
    if(now>=f.nextVisual){f.nextVisual=now+.3;
      if(f.a.petalStorm){for(const layer of ['behind','front'])if(!w.effects?.some(fx=>fx.stormVisual===f.stormVisual&&fx.layer===layer))emit(h,p,f.a,'petalStorm',{radius:f.radius,ttl:f.until-now,stormVisual:f.stormVisual,layer});}
      else if(f.a.soulSiphonField){if(!w.effects?.some(fx=>fx.soulVisual===f.soulVisual))emitSoulField(p,h,f);}
      else if(f.a.faeFlowerField){if(!w.effects?.some(fx=>fx.flowerVisual===f.flowerVisual))emitFlowerField(p,h,f);}
      else emit(h,p,f.a,'field',{x:f.x,y:f.y,ttl:.4,radius:f.radius,phaseTime:now-(f.until-f.a.duration),layer:f.a.cryoSkill||f.a.gardenGraveMorph||f.a.hellSkill||f.a.hunterMorph?'behind':'front',armed:!f.trap||now>=f.armAt});}
  }
  for(const f of s.fields)if(f.until<=now)cancelField(f);
  s.fields=s.fields.filter(f=>f.until>now);
  for(const shot of s.shots){
    if(shot.until<=now)continue;
    const steps=shot.channelTick?Math.max(1,Math.ceil(shot.speed*Math.max(0,dt)/16)):1;
    for(let step=0;step<steps&&shot.until>now;step++){
      if(shot.channelTick)guideButterfly(shot,w,Math.max(0,dt)/steps);
      const distance=Math.min(shot.speed*Math.max(0,dt)/steps,shot.a.range-shot.travelled),start={x:shot.x,y:shot.y};
      const end=point(start,w,shot.aim,distance);shot.x=end.x;shot.y=end.y;
      // Point samples can step over a thin temporary wall. Check the swept
      // segment before allowing a hunter or frost projectile past it.
      if((shot.a.hellSkill||shot.a.hunterMorph||shot.a.cryoSkill)&&w.tiles?.length&&!hasLineOfSight(w,start.x,start.y,end.x,end.y)){shot.until=now;break;}
      const travelled=Math.hypot(end.x-start.x,end.y-start.y);shot.travelled+=travelled;
      if(shot.channelTick&&shot.travelled>=shot.nextTrailAt){shot.nextTrailAt=shot.travelled+12;shot.trail.push({x:shot.x,y:shot.y});if(shot.trail.length>8)shot.trail.shift();}
      for(const e of line(w,start.x,start.y,shot.aim,travelled+5,shot.channelTick?14:10,shot.a.maxHits))if(!shot.hit.has(e)){
        shot.hit.add(e);hit(p,w,shot.a,e,shot.power,h,{projectile:true,ranged:true,channelTick:!!shot.channelTick});
        if(shot.channelTick)emit(h,p,shot.a,'butterflyImpact',{x:e.x,y:e.y-10,ttl:.35,radius:24});
        if(shot.a.subclassMode==='bolt'||shot.hit.size>=shot.a.maxHits){shot.until=now;break;}
      }
      if(travelled<distance-4||shot.travelled>=shot.a.range)shot.until=now;
    }
  }
  s.shots=s.shots.filter(shot=>shot.until>now);
  updateSpectralUrns(p,w,s,dt,now,h);
  for(const spirit of s.spirits){
    if(spirit.a.spectralUrn)continue;
    const foe=nearby(w,spirit.x,spirit.y,330,1)[0];if(!foe)continue;
    const d=Math.hypot(foe.x-spirit.x,foe.y-spirit.y)||1;
    const advance=Math.min(d,(h.summonMoveSpeed?.(130)||resolveSummonMovementSpeed(130))*dt);const end=point(spirit,w,{x:(foe.x-spirit.x)/d,y:(foe.y-spirit.y)/d},advance);spirit.x=end.x;spirit.y=end.y;
    if(d<35&&now>=spirit.nextHit){spirit.nextHit=now+.8;hit(p,w,spirit.a,foe,spirit.power,h);if(spirit.a.subclassSecondary==='heal')heal(p,w,spirit.a,2,p.x,p.y,150,h);}
  }
  s.spirits=s.spirits.filter(spirit=>spirit.until>now);
  for(const [e,bundle] of s.afflictions){
    for(const [family,entry] of bundle.effects){
      if(entry.bloodhoundAilments){
        if(!alive(e)||!updateBloodhoundAilments(p,entry,now,(a,power,type)=>hit(p,w,a,e,power,h,{dot:true,element:type==='poison'?'poison':'physical',bleed:type==='bleed',poison:type==='poison'})))bundle.effects.delete(family);
        continue;
      }
      if(entry.hellBrand){
        if(!alive(e)||!validHunter(entry.ability)){bundle.effects.delete(family);continue;}
        let steps=0;while(entry.nextTick<=Math.min(now,entry.until)+1e-8&&steps++<8){entry.nextTick+=HELL_BALANCE.tickInterval;hit(p,w,entry.ability,e,entry.damage,h,{dot:true});}
        if(entry.until<=now)bundle.effects.delete(family);continue;
      }
      if(!alive(e)||entry.until<=now){bundle.effects.delete(family);continue;}
      if(entry.dot&&entry.ability&&now>=entry.nextTick){entry.nextTick=now+.8;hit(p,w,entry.ability,e,entry.damage,h,{dot:true});}
      if(entry.mark&&entry.mark.until<=now)delete entry.mark;
    }
    if(!bundle.effects.size){if(e.subclassControlOwner===p)delete e.subclassControlOwner;s.afflictions.delete(e);}
  }
  for(const reply of s.replies.splice(0,8))if(alive(reply.enemy)){
    if(reply.mantleReflection)h.damage(reply.enemy,reply.damage,reply.a.skill,{sourceAbilityId:reply.a.id,sourceMorph:'petalknight',element:'nature',magic:true,quiet:true,proc:true,subclassApplied:true});
    else hit(p,w,reply.a,reply.enemy,reply.damage,h,{proc:true});
    if(reply.roseReflection)emit(h,p,reply.a,'roseReflection',{x:p.x,y:p.y-10,endX:reply.enemy.x,endY:reply.enemy.y-10,ttl:.3});
  }
  if(s.retaliation&&s.retaliation.until<=now)s.retaliation=null;
  if(s.roseGuard&&s.roseGuard.until<=now)s.roseGuard=null;
  if(s.empower&&s.empower.until<=now)s.empower=null;
  if(s.prey&&(s.preyUntil<=now||!alive(s.prey)))s.prey=null;
}
function updateSpectralUrns(p,w,s,dt,now,h){
  for(const urn of s.urns){
    urn.progress=Math.max(0,Math.min(1,(now-urn.born)/urn.a.urnFlightTime));
    const desiredX=urn.startX+(urn.endX-urn.startX)*urn.progress,desiredY=urn.startY+(urn.endY-urn.startY)*urn.progress;
    const dx=desiredX-urn.x,dy=desiredY-urn.y,distance=Math.hypot(dx,dy),next=point(urn,w,{x:dx/(distance||1),y:dy/(distance||1)},distance);
    const travelled=Math.hypot(next.x-urn.x,next.y-urn.y);urn.x=next.x;urn.y=next.y;
    if(travelled<distance-.01){urn.endX=urn.x;urn.endY=urn.y;urn.landAt=now;urn.progress=1;}
    if(now<urn.landAt||now>=urn.landAt+4)continue;
    // Up to eight overlapping urn groups. Ordinary cooldowns/lifetimes produce
    // fewer; the ceiling also bounds deliberately reset developer cooldowns.
    while(s.spirits.filter(g=>g.a.spectralUrn).length>21){const old=s.spirits.find(g=>g.a.spectralUrn);s.spirits=s.spirits.filter(g=>!g.a.spectralUrn||g.group!==old.group);}
    for(let index=0;index<3;index++){
      const angle=index*Math.PI*2/3,spawn=point({x:urn.endX,y:urn.endY},w,{x:Math.cos(angle),y:Math.sin(angle)},15);
      s.spirits.push({a:urn.a,...spawn,anchorX:urn.endX,anchorY:urn.endY,group:urn.group,index,
        born:urn.landAt,until:urn.landAt+4,nextHit:urn.landAt+.18,strikes:0,power:urn.power*urn.a.spiritHitRatio,trail:[],nextTrail:0});
    }
    emit(h,p,urn.a,'urnShatter',{x:urn.endX,y:urn.endY,ttl:.55,radius:42});h.audio?.('urnShatter',urn.a);
  }
  s.urns=s.urns.filter(urn=>now<urn.landAt);
  for(const spirit of s.spirits){
    if(!spirit.a.spectralUrn||now>=spirit.until)continue;
    const a=spirit.a,valid=e=>alive(e)&&Math.hypot(e.x-spirit.anchorX,e.y-spirit.anchorY)<=a.spiritSeekRange&&sight(w,spirit.x,spirit.y,e)&&sight(w,spirit.anchorX,spirit.anchorY,e);
    if(!valid(spirit.target)){const foes=nearby(w,spirit.anchorX,spirit.anchorY,a.spiritSeekRange,Infinity).filter(valid);spirit.target=foes[spirit.index%Math.max(1,Math.min(3,foes.length))]||null;}
    const foe=spirit.target,angle=spirit.index*Math.PI*2/3+spirit.group*2.399963,radius=25+(spirit.group%3)*9;
    const desired=foe?{x:foe.x+Math.cos(angle)*radius,y:foe.y+Math.sin(angle)*radius}:{x:spirit.anchorX+Math.cos(angle+(now-spirit.born)) *22,y:spirit.anchorY+Math.sin(angle+(now-spirit.born))*22};
    const dx=desired.x-spirit.x,dy=desired.y-spirit.y,distance=Math.hypot(dx,dy)||1;
    const speed=h.summonMoveSpeed?.(a.spiritSpeed)||resolveSummonMovementSpeed(a.spiritSpeed);
    const next=point(spirit,w,{x:dx/distance,y:dy/distance},Math.min(distance,speed*Math.max(0,dt)));
    spirit.x=next.x;spirit.y=next.y;spirit.elapsed=now-spirit.born;
    if(now>=spirit.nextTrail){spirit.nextTrail=now+.05;spirit.trail.push({x:spirit.x,y:spirit.y});if(spirit.trail.length>6)spirit.trail.shift();}
    if(foe&&now>=spirit.nextHit&&Math.hypot(foe.x-spirit.x,foe.y-spirit.y)<=50&&valid(foe)){
      spirit.nextHit=now+a.spiritInterval;spirit.hitUntil=now+.16;spirit.strikes++;
      hit(p,w,a,foe,spirit.power,h,{proc:true});
      if(spirit.strikes>=a.spiritStrikes){spirit.until=now;emit(h,p,a,'urnSpiritFade',{x:spirit.x,y:spirit.y-14,ttl:.25,radius:16});}
    }
  }
}
export function onSubclassKill(p,e,w,now){
  if(!w||!e)return;const families=activeFamilies(p);
  if(!states.has(p)&&!families.has('acolyte'))return;
  const s=state(p,w);if(s.killRewards.has(e))return;s.killRewards.add(e);
  if(families.has('acolyte'))s.souls=Math.min(5,s.souls+1);
  if(s.prey===e)s.prey=null;
}
function queueMantleThorns(p,amount,attacker,w,now,s){
  const enemy=attacker?.combatSource||attacker,reply=roseMantleThorns(p,amount,now,w);
  if(!reply||!alive(enemy)||now<s.nextRetaliation||Math.hypot(enemy.x-p.x,enemy.y-p.y)>125||!sight(w,p.x,p.y,enemy))return false;
  s.nextRetaliation=now+.75;if(s.replies.length<24)s.replies.push({enemy,a:reply.a,damage:reply.damage,roseReflection:true,mantleReflection:true});return true;
}
export function onSubclassDamaged(p,amount,enemy,w,now){
  if(!w||amount<=0)return;const families=activeFamilies(p);
  if(!states.has(p)&&!families.has('sinner'))return;
  const s=state(p,w);if(families.has('sinner')){s.penance=Math.min(6,s.penance+Math.min(1,amount/10));s.lastHit=now;}
  onOathkeeperGuardContact(p,s,enemy,amount,now,false);
  if(!(s.roseGuard?.until>now)&&queueMantleThorns(p,amount,enemy,w,now,s))return;
  if(s.roseGuard?.until>now&&amount>0&&alive(enemy)&&now>=s.nextRetaliation&&Math.hypot(enemy.x-p.x,enemy.y-p.y)<=200&&sight(w,p.x,p.y,enemy)){
    s.nextRetaliation=now+.7;const g=s.roseGuard,rate=Math.min(.45,.16+g.stacks*.06+Math.max(0,s.bonuses?.thornsPct||0)/200);
    if(s.replies.length<24)s.replies.push({enemy,a:g.a,damage:Math.min(g.power*.65,amount*rate*getAbilityEffectiveness(p,g.a)),roseReflection:true});return;
  }
  if(s.retaliation&&alive(enemy)&&now>=s.nextRetaliation){s.nextRetaliation=now+.7;
    const cap=Math.min(s.retaliation.power*.65,amount*.4+2);s.replies.push({enemy,a:s.retaliation.a,damage:cap});}
}
export function onSubclassBlocked(p,result,enemy,w,now){
  if(!w||!result?.blocked||result.guardBroken||!alive(enemy))return;
  const families=activeFamilies(p);
  const s=states.get(p)||(families.has('holyknight')?state(p,w):null);
  if(s){
    const prevented=Math.max(0,result.preventedDamage??result.blockedDamage??0);
    if(families.has('holyknight')&&prevented>0)buildOathkeeperBlock(s,now);
    onOathkeeperGuardContact(p,s,enemy,prevented,now,true);
  }
  if(s&&!(s.roseGuard?.until>now)&&queueMantleThorns(p,Math.max(0,result.preventedDamage??result.blockedDamage??0)*.5,enemy,w,now,s))return;
  if(s?.roseGuard?.until>now&&now>=s.nextRetaliation&&Math.hypot(enemy.x-p.x,enemy.y-p.y)<=200&&sight(w,p.x,p.y,enemy)){
    const prevented=Math.max(0,result.preventedDamage??result.blockedDamage??0);if(!prevented)return;
    s.nextRetaliation=now+.7;const g=s.roseGuard;
    if(s.replies.length<24)s.replies.push({enemy,a:g.a,damage:Math.min(g.power*.65,prevented*.3*getAbilityEffectiveness(p,g.a)),roseReflection:true});return;
  }
  const a=s?.retaliation?.until>now?s.retaliation.a:null;
  if(!a||now<s.nextRetaliation)return;s.nextRetaliation=now+.7;
  s.replies.push({enemy,a,damage:Math.min(18,4+Number(result.preventedDamage||result.blockedDamage||4)*.35)*getAbilityEffectiveness(p,a)});
}
export function subclassWeaponDamage(p,target,damage,now){
  const s=states.get(p);if(!s)return damage;
  if(s.prey===target&&s.preyUntil>now){const bleed=s.afflictions.get(target)?.effects.get('bloodhound');if(bleed?.ability?.hunterMorph)s.preyUntil=now+6;}
  for(const entry of s.afflictions.get(target)?.effects?.values()||[]){const mark=entry.mark;
    if(mark&&mark.until>now){mark.hits++;damage*=1+.1*getAbilityEffectiveness(p,mark.a);if(mark.hits>=3){s.replies.push({enemy:target,a:mark.a,damage:mark.power*.55});delete entry.mark;}}}
  if(s.empower?.until>now)damage*=1+.12*getAbilityEffectiveness(p,s.empower.a);
  if(target?.subclassExposedUntil>now)damage*=1+(10+(s.bonuses?.exposedDamagePct||0))/100*(target.subclassExposedEffectiveness||1);
  if(s.prey===target&&s.preyUntil>now&&target.hp/(target.maxHp||target.hp)<.5)damage*=1+.2*getAbilityEffectiveness(p,s.preyAbilityId);
  return damage;
}
// Called only after a real melee weapon hit deals positive damage. Projectiles,
// spells, misses, retaliation and secondary sword echoes cannot advance it.
export function onOathkeeperMeleeContact(p,target,w,now){
  const families=activeFamilies(p);
  if(!families.has('holyknight')&&!families.has('sinner'))return;
  onOathkeeperWeaponContact(p,target,state(p,w),now,families);
}
export function onFellhunterWeaponContact(p,target,w,damage,now){
  if(p?.classId!=='fellhunter'||damage<=0||!alive(target))return;
  const s=states.get(p),entry=s?.afflictions.get(target)?.effects.get('bloodhound');
  if(!entry?.bloodhoundAilments||s.world!==w||s.prey!==target||s.preyUntil<=now)return;
  applyBloodhoundAilments(entry,{...entry.ability,hunterAilment:'bleed',hunterLayers:1},damage*.35,now,s.empower?.a?.subclassId==='bloodhound'&&s.empower.until>now);
  s.preyUntil=now+6;
}
export function mitigateSubclassDamage(p,enemy,damage,now){
  const s=states.get(p);
  let result=enemy?.subclassWeakenedUntil>now?Math.ceil(damage*(1-.12*(enemy.subclassWeakenedEffectiveness||1))):damage;
  if(s?.hellExposureUntil>now)result=Math.max(0,Math.ceil(result*HELL_BALANCE.exposure-1e-8));
  if(s?.roseGuard?.until>now)result=Math.ceil(result*(1-Math.min(.18,s.roseGuard.stacks*.04*getAbilityEffectiveness(p,s.roseGuard.a))));
  result=mitigateRoseMantle(p,result,now,s?.world);
  const petalReduction=petalStormReduction(p,now);if(petalReduction)result=Math.ceil(result*(1-petalReduction));
  if(s?.parryUntil>now){s.parryUntil=0;result=Math.ceil(result*(1-Math.min(.72,.55*getAbilityEffectiveness(p,s.parryAbilityId))));}
  if(s?.hostWard?.until>now){
    const before=result;result=Math.ceil(result*(1-s.hostWard.reduction));
    rewardAbilitySupport(s.hostWard,s.world,before-result,now);
  }
  return result;
}
export function getSubclassMovementMultiplier(p,now=performance.now()/1000){return p?.subclassHasteUntil>now?1+.1*(p.subclassHasteEffectiveness||1):1;}
export function getSubclassResourceLabel(p){const s=states.get(p);if(!s)return '';const f=activeFamilies(p),quarry=f.has('bloodhound')&&s.prey?s.afflictions.get(s.prey)?.effects.get('bloodhound'):null;return [f.has('acolyte')?`Soul Fragments ${s.souls}/5`:'',f.has('sunscorched')?`Heat ${s.heat}/5`:'',f.has('holyknight')?`Resolve ${s.oath?.resolve||0}/3`:'',f.has('sinner')?`Penance ${Math.floor(s.penance)}/6`:'',quarry?`Quarry: Bleed ${quarry.bleeds?.length||0}/8 · Poison ${quarry.venoms?.length||0}/6`:'',s.roseGuard?.until>performance.now()/1000?`Roseguard ${s.roseGuard.stacks}/3`:'',s.hellExposureUntil>performance.now()/1000?'Cinder Exposure +10% damage taken':''].filter(Boolean).join(' · ');}

const oathAPI={hit,heal,ward,emit,line,nearby,point,control,sight};




