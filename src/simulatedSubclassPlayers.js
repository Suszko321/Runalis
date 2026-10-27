import {createPlayer,chooseClass,migratePlayer} from './player.js';
import {ABILITIES} from './data.js';
import {ensureSimulatedSubclass} from './subclassSystem.js';
import {resolveSubclassAbility} from './subclassVariants.js';
import {getClassSubclasses} from './subclassSystem.js';
import {updateAbilityInput,updateCombat,getPlayerMovementMultiplier} from './combat.js';
import {setSimulatedCombatActors} from './coopEnemyScaling.js';
import {setSubclassSupportParty,clearSubclassCombatState} from './subclassCombat.js';
import {hasLineOfSight,moveActorWithCollision} from './world.js';

const brains=new WeakMap();
const trackedActors=new WeakMap();
export function initializeSimulatedSubclassPlayer(npc){
  if(!npc?.simulatedPlayer&&!npc?.isSimulatedPlayer)return null;
  if(brains.has(npc))return npc;
  const saved={...npc},p=createPlayer(npc.name||'Traveling adventurer');
  chooseClass(p,npc.classId);Object.assign(npc,p,saved);
  const sub=ensureSimulatedSubclass(npc);if(!sub)return null;
  npc.spiritAwakened=true;
  const kit=ABILITIES.filter(a=>a.classId===sub.classId).sort((a,b)=>(a.unlockLevel||1)-(b.unlockLevel||1)||(a.cost||0)-(b.cost||0));
  const families=getClassSubclasses(npc.classId);let hash=0;
  for(const ch of String(npc.id||npc.name))hash=(hash*31+ch.charCodeAt(0))>>>0;
  npc.knownAbilities=kit.map(a=>a.id);npc.unlockedAbilities=[...npc.knownAbilities];
  kit.forEach((a,i)=>{npc.abilityMastery[a.id]={level:20,xp:0};const form=(hash+i)%(families.length+1);if(form<families.length)npc.abilityMorphs[a.id]=families[form].id;});
  // A finite four-skill loadout uses the same IDs and execution as a player.
  const pick=mode=>kit.find(a=>mode.includes(resolveSubclassAbility(npc,a).subclassMode));
  const selected=[pick(['bolt','melee','chain','beam']),pick(['field','mark','trap','burst']),pick(['ward','heal','retaliation','ritual','spirits']),pick(['dash','retreat','empower','auraChannel'])];
  for(const a of kit)if(selected.filter(Boolean).length<4&&!selected.includes(a))selected.push(a);
  const ids=[...new Set(selected.filter(Boolean).map(a=>a.id))].slice(0,4);
  for(const a of selected.filter(Boolean))if(npc.skillState.skills[a.skill])npc.skillState.skills[a.skill].level=Math.max(npc.skillState.skills[a.skill].level,a.unlockLevel||1);
  npc.knownAbilities=ids;npc.unlockedAbilities=[...ids];npc.loadout.abilitySlots=[...ids];
  while(npc.loadout.abilitySlots.length<4)npc.loadout.abilitySlots.push(null);
  npc.loadout.abilitySlots.push('block');
  npc.skillTree.respecVersion=1;migratePlayer(npc);
  npc.hp=npc.maxHp;npc.stamina=npc.maxStamina;npc.spirit=npc.maxSpirit;
  if(saved.continentalHydrated){
    for(const field of ['hp','maxHp','stamina','maxStamina','spirit','maxSpirit'])if(Number.isFinite(saved[field]))npc[field]=saved[field];
    delete npc.continentalHydrated;
  }
  brains.set(npc,{nextDecision:0,releaseAt:0,slot:-1,nextSkill:0,origin:{x:npc.x,y:npc.y}});
  return npc;
}

export function updateSimulatedSubclassPlayers(game,dt,now=performance.now()/1000){
  const {player:host,world}=game;if(!host||!world)return;
  const safe=world.safeZone||['capital','hub','town'].includes(world.mode);
  const actors=(world.objects||[]).filter(n=>n?.simulatedPlayer||n?.isSimulatedPlayer).slice(0,4);
  for(const previous of trackedActors.get(game)||[])if(!actors.includes(previous)){
    clearSubclassCombatState(previous,'removed');setSubclassSupportParty(previous,[]);previous.abilityCharge=null;previous.simulatedInCombat=false;
  }
  trackedActors.set(game,actors);
  setSimulatedCombatActors(host,safe?[]:actors.filter(a=>a.hp>0&&Math.hypot(a.x-host.x,a.y-host.y)<650));
  for(const npc of actors){
    if(!initializeSimulatedSubclassPlayer(npc))continue;
    const brain=brains.get(npc);npc.simulatedInCombat=false;
    if(safe||npc.hp<=0||npc.depleted||Math.hypot(npc.x-host.x,npc.y-host.y)>650){
      clearSubclassCombatState(npc);if(npc.hp<=0){npc.depleted=true;npc.isMoving=false;}continue;
    }
    setSubclassSupportParty(npc,[host,...(host.coop?.players||[]),...actors]);
    const target=(world.enemies||[]).filter(e=>e.hp>0&&!e.dead&&!e.friendly&&!e.remove&&Math.hypot(e.x-npc.x,e.y-npc.y)<340&&Math.hypot(e.x-brain.origin.x,e.y-brain.origin.y)<450&&hasLineOfSight(world,npc.x,npc.y,e.x,e.y,{startSkip:1,endSkip:1}))
      .sort((a,b)=>Math.hypot(a.x-npc.x,a.y-npc.y)-Math.hypot(b.x-npc.x,b.y-npc.y))[0];
    const input={mouseAimActive:!!target,mouseWorldX:target?.x,mouseWorldY:target?.y};
    if(brain.slot>=0){input[`ability${brain.slot}Held`]=!!target&&now<brain.releaseAt;input[`ability${brain.slot}Released`]=!input[`ability${brain.slot}Held`];if(input[`ability${brain.slot}Released`])brain.slot=-1;}
    if(target){
      npc.simulatedInCombat=true;
      const dx=target.x-npc.x,dy=target.y-npc.y,d=Math.hypot(dx,dy)||1;
      npc.dirX=dx/d;npc.dirY=dy/d;
      const skills=npc.loadout.abilitySlots.map(id=>resolveSubclassAbility(npc,ABILITIES.find(a=>a.id===id))).filter(Boolean);
      const melee=skills.filter(a=>['melee','retaliation','ward','empower'].includes(a.subclassMode)).length>=2;
      const desired=melee?52:170,retreat=npc.hp<npc.maxHp*.3||d<desired*.6;
      const movement=npc.activeChannel||npc.abilityCharge?0:retreat?-1:d>desired?1:0;
      const speed=70*getPlayerMovementMultiplier(npc,now);moveActorWithCollision(npc,world,dx/d*movement*speed*dt,dy/d*movement*speed*dt);
      npc.isMoving=!!movement;npc.walkTime=(npc.walkTime||0)+(movement?dt:0);
      input.attackPressed=melee&&d<65&&now>=brain.nextDecision;
      if(now>=brain.nextDecision&&brain.slot<0&&!npc.activeChannel&&!npc.abilityCharge){
        const support=skills.find(a=>['heal','ward','ritual','retaliation'].includes(a.subclassMode)&&[host,npc].some(p=>p.hp<p.maxHp*.7));
        const available=skills.filter(a=>npc[a.costType]>=a.cost+(a.channelProfile?.costPerSecond||0)*.8&&now-(npc.cooldowns[a.id]??-Infinity)>=a.cd&&
          (!['auraChannel','melee','ward','retaliation','heal','ritual'].includes(a.subclassMode)||d<=(['melee'].includes(a.subclassMode)?a.range:a.subclassRadius)+15));
        const ordered=skills.map((_,i)=>skills[(brain.nextSkill+i)%skills.length]);
        const a=available.includes(support)?support:ordered.find(a=>available.includes(a));
        if(a)brain.nextSkill=(skills.indexOf(a)+1)%skills.length;
        if(a){const slot=npc.loadout.abilitySlots.indexOf(a.id);brain.slot=slot;brain.releaseAt=now+(['beam','auraChannel'].includes(a.subclassMode)?2.4:a.canCharge?.85:.12);input[`ability${slot}Pressed`]=true;input[`ability${slot}Held`]=true;}
        brain.nextDecision=now+1.5;
      }
    }
    updateAbilityInput(npc,world,input,dt,now,()=>{});updateCombat(npc,world,input,dt,now,()=>{});
  }
}
