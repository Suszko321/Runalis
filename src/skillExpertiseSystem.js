import {getAbilityById} from './data.js';
import {getClassDefinition} from './classData.js';
import {CLASS_SUBCLASSES,SUBCLASSES,SUBCLASS_CLASS_TREES,normalizeSubclassClassId} from './subclassData.js';
import {getSelectedAbilityMorph} from './abilityMorphSystem.js';

// Expertise is a tree purchase, never a restriction on individual morph choices.
export const EXPERTISE_EFFECTS=Object.freeze({base:1.05,aligned:1.15,outside:.9});
export function expertiseNodeId(classId,family='base') {return `${SUBCLASS_CLASS_TREES[normalizeSubclassClassId(classId)]}_expertise_${family}`;}
export function createExpertiseNodes(nodes) {
  const result={};
  for(const [classId,families] of Object.entries(CLASS_SUBCLASSES)) {
    const tree=SUBCLASS_CLASS_TREES[classId],name=getClassDefinition(classId).name;
    const capstones=Object.values(nodes).filter(n=>n.tree===tree&&n.role==='Capstone').map(n=>n.id);
    for(const family of ['base',...families]) {
      const id=expertiseNodeId(classId,family),hybrid=family==='base';
      result[id]={id,tree,name:hybrid?`${name} Mastery`:`${SUBCLASSES[family].name} Expertise`,role:'Expertise',cost:1,
        requires:capstones,requirementMode:'any',choiceGroup:`${classId}_expertise`,bonuses:{},expertise:{classId,family},
        desc:hybrid?`All ${name} active skills and every morph gain +5% effectiveness. A flexible hybrid calling.`:
          `${SUBCLASSES[family].name} class skills and morphs gain +15% effectiveness. Other ${name} class skills and morphs, including original forms, suffer -10%.`,
        expertiseNote:'Affects damage, healing, protection, control and summon strength. All morphs remain usable. Respec to change. Only class skills are affected.'};
    }
  }
  return result;
}
export function getPlayerExpertise(player) {
  const classId=normalizeSubclassClassId(player?.classId),families=CLASS_SUBCLASSES[classId];
  if(!families)return null;
  const spent=player?.skillTree?.spent||player?.skillTreeProgress||{};
  const family=['base',...families].find(f=>Number(spent[expertiseNodeId(classId,f)])>0);
  if(!family)return null;
  return {classId,family,id:expertiseNodeId(classId,family),name:family==='base'?`${getClassDefinition(classId).name} Mastery`:`${SUBCLASSES[family].name} Expertise`};
}
export function normalizeExpertisePurchases(spent) {
  // Corrupt/combined saves cannot stack final callings or buy multiple ranks.
  let chosen=false;
  const ids=new Set(Object.keys(CLASS_SUBCLASSES).flatMap(id=>['base',...CLASS_SUBCLASSES[id]].map(f=>expertiseNodeId(id,f))));
  for(const id of Object.keys(spent))if(ids.has(id)) {
    if(!(Number(spent[id])>0)||chosen)delete spent[id];
    else {spent[id]=1;chosen=true;}
  }
}
export function getAbilityExpertise(player,abilityOrId) {
  const supplied=typeof abilityOrId==='string'?getAbilityById(abilityOrId):abilityOrId;
  const canonical=getAbilityById(supplied?.id),choice=getPlayerExpertise(player);
  // Canonical class ownership prevents a Warding scroll or gear skill from
  // inheriting a penalty just because it uses the same combat proficiency.
  if(!choice||!canonical?.classId||normalizeSubclassClassId(canonical.classId)!==choice.classId)return {multiplier:1,choice:null};
  const family=supplied.subclassId||(typeof abilityOrId==='string'?getSelectedAbilityMorph(player,canonical.id):null)||'base';
  return {choice,family,multiplier:choice.family==='base'?EXPERTISE_EFFECTS.base:choice.family===family?EXPERTISE_EFFECTS.aligned:EXPERTISE_EFFECTS.outside};
}
export function getAbilityEffectiveness(player,ability) {return getAbilityExpertise(player,ability).multiplier;}
export function expertiseEffectText(player,ability) {
  const effect=getAbilityExpertise(player,ability);
  return effect.choice?`${effect.choice.name}: ${effect.multiplier>1?'+':''}${Math.round((effect.multiplier-1)*100)}% effectiveness`:'';
}
