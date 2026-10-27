import {FELLHUNTER_BASE_INFO} from './fellhunterSkills.js';
// Preserve the existing coordinator's live balance overrides in HUDs and mastery.
export function getBalancedAbility(ability) {
  if(!ability || ability._charge || ability.subclassId || ability._combatTempo)return ability;
  if(ability.classId==='fellhunter'&&FELLHUNTER_BASE_INFO[ability.id]){
    const [animationFamily,desc]=FELLHUNTER_BASE_INFO[ability.id];return {...ability,fellToolkit:true,animationFamily,desc};
  }
  if(ability.id==='graveSpark')return {...ability,cost:12,cd:.4,range:600};
  if(ability.id==='thornbinderThornLash')return {...ability,cost:7,cd:.55,range:250};
  return ability;
}
