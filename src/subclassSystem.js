import {SUBCLASSES,CLASS_SUBCLASSES,SUBCLASS_CLASS_TREES,normalizeSubclassClassId} from './subclassData.js';
import {SUBCLASS_SKILL_PLANS,getSubclassSkillPlan} from './subclassVariants.js';
import {normalizeAbilityMorphs} from './abilityMorphSystem.js';

export function getPlayerSubclass(player){
  return null;
}
export function getClassSubclasses(classId){return (CLASS_SUBCLASSES[normalizeSubclassClassId(classId)]||[]).map(id=>SUBCLASSES[id]);}
export function normalizeSubclassState(player){
  normalizeAbilityMorphs(player);return null;
}
export function chooseSubclass(player,id){
  return {ok:false,reason:'Choose individual skill morphs in Skills → Abilities.'};
}
export function getSubclassPassiveBonuses(player,node,morphId=null){
  const sub=SUBCLASSES[morphId],base={...node?.bonuses};
  if(!sub||node?.tree!==SUBCLASS_CLASS_TREES[sub.classId])return base;
  // Summon investment in the old grave tree becomes spirit/ritual investment.
  if(sub.classId==='gravecaller')for(const key of Object.keys(base)){
    if(/^(summon|gravecaller)/.test(key)){
      const to=sub.id==='deathknight'?'maxHpPct':'supportHealingPct';
      base[to]=(base[to]||0)+Math.min(10,base[key]);delete base[key];
    }
  }
  if(sub.id==='bloodhound'&&base.aoeDamagePct){base.singleTargetDamagePct=(base.singleTargetDamagePct||0)+base.aoeDamagePct;delete base.aoeDamagePct;}
  if(sub.id==='sunscorched'&&base.lightbringerShieldPct){base.subclassDotPct=(base.subclassDotPct||0)+base.lightbringerShieldPct;delete base.lightbringerShieldPct;}
  const replacements={
    cleavingStepRangePct:'subclassRangePct',judgmentSmiteRadiusPct:'aoeRadiusPct',consecratedGroundDurationPct:'subclassDurationPct',lastRiteCostReductionPct:'supportHealingPct',
    trapArmSpeedPct:'subclassControlPct',trapDamagePct:'abilityDamagePct',exposedDurationPct:'subclassDurationPct',grapplingHookRangePct:'subclassRangePct',
    volleyDamagePct:'abilityDamagePct',volleyExtraHits:'subclassFocusPct',volleyWidthPct:'aoeRadiusPct',bombRadiusPct:'aoeRadiusPct',markedShotDamagePct:'singleTargetDamagePct',markedTargetDamagePct:'singleTargetDamagePct',gadgetCooldownPct:'subclassFocusPct',smokeDurationPct:'subclassDurationPct',killZoneRadiusPct:'aoeRadiusPct',
    briarBloomHealingPct:'supportHealingPct',thornLashRangePct:'subclassRangePct',thornLashDamagePct:'abilityDamagePct',verdantWoundDamage:'subclassDotPct',bramblePatchDurationPct:'subclassDurationPct',rosebiteRadiusPct:'aoeRadiusPct',
    waterDamagePct:sub.id==='sunken'?'waterDamagePct':'abilityDamagePct',waterVulnerabilityPct:'subclassFocusPct',
    lightbringerDamagePct:'abilityDamagePct',haloBrandDurationPct:'subclassDurationPct',lumenGenerationPct:'subclassFocusPct',lightbringerShieldPct:'subclassWardPct',dawncarverDamagePct:'abilityDamagePct',dawncarverTurnRatePct:'subclassControlPct',solarVerdictRadiusPct:'aoeRadiusPct',overbrightDuration:'subclassDurationPct',brandedTargetDamagePct:'subclassFocusPct',
    rootDurationPct:'subclassControlPct',slowDurationPct:'subclassControlPct',staggerPowerPct:'subclassControlPct',defenseBuffDurationPct:'subclassDurationPct',
  };
  if(sub.classId==='thornbinder')for(const key of ['summonDamagePct','summonHealthPct','summonCount'])replacements[key]=sub.id==='petalknight'?'maxHpPct':'abilityDamagePct';
  if(sub.id==='sunscorched')replacements.holyDamagePct='abilityDamagePct';
  for(const [from,to] of Object.entries(replacements))if(from!==to&&base[from]!==undefined){base[to]=(base[to]||0)+base[from];delete base[from];}
  // A charge node continues to benefit a skill that has become a held channel.
  for(const key of Object.keys(base))if(/^ability(Charge|RechargePct)_/.test(key)){
    const id=key.replace(/^ability(Charge|RechargePct)_/,''),plan=sub.id==='sunken'?null:getSubclassSkillPlan(id,sub.id);
    if(plan&&/^(beam|auraChannel)/.test(plan)){base.subclassFocusPct=(base.subclassFocusPct||0)+(key.startsWith('abilityCharge_')?4:base[key]*.25);delete base[key];}
  }
  if(!node.unlocksAbility)base.subclassFocusPct=(base.subclassFocusPct||0)+1;
  return base;
}
export function getSubclassTreeNode(player,node){
  return node;
}

// Legacy adapter: return class metadata for explicit adventurers. Their skill
// forms are selected individually in simulatedSubclassPlayers.js.
export function ensureSimulatedSubclass(actor){
  if(!actor?.simulatedPlayer&&!actor?.isSimulatedPlayer)return null;
  normalizeSubclassState(actor);return getClassSubclasses(actor.classId)[0]||null;
}
