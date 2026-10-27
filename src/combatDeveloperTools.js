import {HOTBAR_SLOT_COUNT} from './hotbarConfig.js';
import { ABILITIES } from './data.js';
import { unlockActiveAbility,assignAbilityToSlot } from './abilityLoadoutSystem.js';
import { grantAbilityMasteryXp,getAbilityMastery } from './abilityMasterySystem.js';
import { migratePlayer } from './player.js';

// Explicitly installed only in the isolated combat laboratory or developer mode.
export function createCombatDeveloperTools(game) {
  const p=()=>game.player;
  return {
    unlockAll({includeScrolls=true}={}){
      for(const a of ABILITIES){
        if(!includeScrolls&&['summonWolf','summonDemon'].includes(a.id))continue;
        unlockActiveAbility(p(),a.id,{autoAssignEmpty:false});
        const skill=p().skillState?.skills?.[a.skill];
        if(a.classId===p().classId&&skill)skill.level=Math.max(skill.level,a.unlockLevel||1);
      }
      migratePlayer(p());
    },
    equip(ids){return ids.slice(0,HOTBAR_SLOT_COUNT).map((id,i)=>assignAbilityToSlot(p(),i,id));},
    setMastery(id,level){const m=getAbilityMastery(p(),id,true);m.level=Math.max(1,Math.floor(Number(level)||1));m.xp=0;},
    grantMastery(id,xp){grantAbilityMasteryXp(p(),id,Math.min(10000000,Math.max(0,Number(xp)||0)));},
    resetMastery(){p().abilityMastery={};},
    refill(){p().hp=p().maxHp;p().spirit=p().maxSpirit;p().stamina=p().maxStamina;if(p().lightbringer)p().lightbringer.lumens=3;if(p().passiveState){const now=performance.now()/1000;p().passiveState.hydromancerFlowStacks=3;p().passiveState.hydromancerFlowUntil=now+9;p().passiveState.oathboundRiposteStacks=3;p().passiveState.oathboundRiposteUntil=now+4.2;}},
    clearCooldowns(){p().cooldowns={};p().abilityUseCharges={};p().summonCooldowns={};},
    spawn(kind='melee',x=p().x+140,y=p().y){
      const boss=kind==='boss',dummy=kind==='dummy';
      const e={id:`combat-test-${Date.now()}-${Math.random()}`,kind:'rat',name:kind==='boss'?'Boss-scale target':kind==='elite'?'Elite target':kind+' target',
        x,y,hp:dummy?20000:boss?1800:kind==='elite'?500:180,maxHp:dummy?20000:boss?1800:kind==='elite'?500:180,
        radius:boss?32:kind==='small'?9:14,r:boss?32:14,damage:dummy?0:boss?15:8,
        speed:dummy?0:kind==='fast'?120:kind==='ranged'?50:60,attackRange:kind==='ranged'?180:26,
        ranged:kind==='ranged',isBoss:boss,elite:kind==='elite',trainingDummy:dummy,
        aggro:3,level:Math.max(1,p().combatLevel),xp:boss?250:50,combatTargetKind:'player',combatTargetId:p().id||p().profileId||p().name};
      game.world.enemies.push(e);return e;
    }
  };
}
