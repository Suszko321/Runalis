import {getAbilityById,normalizeAbilityId} from './data.js';
import {SUBCLASSES,CLASS_SUBCLASSES,normalizeSubclassClassId} from './subclassData.js';
import {SUBCLASS_SKILL_PLANS,resolveAbilityMorph} from './subclassVariants.js';

// Morphs belong to individual canonical skill IDs. The base form is always free.
export const MORPH_MASTERY_LEVELS=Object.freeze([5,10]);
const unlocked=(p,id,family,index)=>getMorphMasteryLevel(p,id)>=MORPH_MASTERY_LEVELS[index];
export function getMorphMasteryLevel(player,id){
  const map=player?.abilityMastery||{};
  const entry=map[id]||Object.entries(map).find(([key])=>normalizeAbilityId(key)===id)?.[1];
  return Math.max(1,Math.floor(Number(entry?.level)||1));
}
function families(player,id){
  const a=getAbilityById(id),classId=normalizeSubclassClassId(player?.classId);
  return a&&SUBCLASS_SKILL_PLANS[id]&&normalizeSubclassClassId(a.classId)===classId?CLASS_SUBCLASSES[classId]||[]:[];
}
export function getSelectedAbilityMorph(player,abilityId){
  const id=normalizeAbilityId(abilityId),choice=player?.abilityMorphs?.[id],index=families(player,id).indexOf(choice);
  const learned=[...(player?.knownAbilities||[]),...(player?.unlockedAbilities||[])].some(key=>normalizeAbilityId(key)===id);
  return learned&&index>=0&&unlocked(player,id,choice,index)?choice:null;
}
export function normalizeAbilityMorphs(player){
  if(!player)return {};
  // Unlocks follow the current two-tier catalogue. Retired/unknown selections
  // return to Original, keeping the canonical skill, mastery and recovery state.
  delete player.abilityMorphUnlocks;
  const choices={};
  for(const [key,value] of Object.entries(player.abilityMorphs&&typeof player.abilityMorphs==='object'&&!Array.isArray(player.abilityMorphs)?player.abilityMorphs:{})){
    const id=normalizeAbilityId(key),index=families(player,id).indexOf(value);
    if(index>=0&&unlocked(player,id,value,index))choices[id]=value;
  }
  const invalid=new Set(Object.keys(player.abilityMorphs||{}).filter(id=>!choices[normalizeAbilityId(id)]).map(normalizeAbilityId));
  const obsolete=effect=>effect?.subclassId&&!SUBCLASSES[effect.subclassId]||effect?.ability?.subclassId&&!SUBCLASSES[effect.ability.subclassId];
  if(obsolete(player.activeChannel)||invalid.has(normalizeAbilityId(player.activeChannel?.abilityId)))player.activeChannel=null;
  if(obsolete(player.abilityCharge)||invalid.has(normalizeAbilityId(player.abilityCharge?.abilityId)))player.abilityCharge=null;
  if(obsolete(player.visualAction))player.visualAction=null;
  const obsoleteSummon=s=>s?.summonMorph&&s.summonMorph!=='base'&&!SUBCLASSES[s.summonMorph];
  if(Array.isArray(player.summons)&&player.summons.some(obsoleteSummon))player.summons=player.summons.filter(s=>!obsoleteSummon(s));
  if(Array.isArray(player.combatEffects)&&player.combatEffects.some(obsolete))player.combatEffects=player.combatEffects.filter(effect=>!obsolete(effect));
  player.abilityMorphs=choices;player.abilityMorphVersion=3;
  // Previous permanent callings do not silently opt players into any morph.
  if(player.selectedSubclass||player.subclassId){player.activeChannel=null;player.abilityCharge=null;player.visualAction=null;}
  delete player.selectedSubclass;delete player.subclassId;
  return choices;
}
export function getAbilityMorphOptions(player,abilityId){
  const id=normalizeAbilityId(abilityId),a=getAbilityById(id);
  if(!a)return [];
  const selected=getSelectedAbilityMorph(player,id);
  return [{id:'base',name:'Original',requiredMastery:1,unlocked:true,selected:!selected,ability:a},
    ...families(player,id).map((family,index)=>({id:family,name:SUBCLASSES[family].name,requiredMastery:MORPH_MASTERY_LEVELS[index],
      unlocked:unlocked(player,id,family,index),selected:selected===family,ability:resolveAbilityMorph(player,a,family)}))];
}
export function selectAbilityMorph(player,abilityId,morphId='base',now=performance.now()/1000){
  const id=normalizeAbilityId(abilityId),a=getAbilityById(id);
  if(!a||![...(player?.knownAbilities||[]),...(player?.unlockedAbilities||[])].includes(id))return {ok:false,reason:'Learn this skill in its tree first.'};
  const option=getAbilityMorphOptions(player,id).find(o=>o.id===(morphId||'base'));
  if(!option)return {ok:false,reason:'This skill does not have that morph.'};
  if(!option.unlocked)return {ok:false,reason:`Reach Mastery ${option.requiredMastery} with this skill to unlock ${option.name}.`};
  if(option.selected)return {ok:true,changed:false,reason:`${a.name} already uses ${option.name}.`};
  if(!(player.hp>0))return {ok:false,reason:'You must be alive to change a skill morph.'};
  if(player.activeChannel||player.abilityCharge)return {ok:false,reason:'Finish channeling or charging before changing a morph.'};
  const current=resolveAbilityMorph(player,a,getSelectedAbilityMorph(player,id));
  const last=player.cooldowns?.[id];
  const recovering=(player.abilityUseCharges?.[id]?.rechargeQueue||[]).some(t=>t>now);
  if((Number.isFinite(last)&&now-last<Math.max(current.cd||0,a.cd||0))||recovering)return {ok:false,reason:'Wait for this skill to finish recovering before changing its morph.'};
  player.abilityMorphs=player.abilityMorphs||{};
  if(option.id==='base')delete player.abilityMorphs[id];else player.abilityMorphs[id]=option.id;
  player.abilityMorphVersion=3;
  if(option.ability.costType==='spirit'&&!(player.maxSpirit>0)){player.spiritAwakened=true;player.maxSpirit=35;player.spirit=Math.max(player.spirit||0,24);}
  return {ok:true,changed:true,reason:`${a.name} now uses ${option.name}.`};
}
