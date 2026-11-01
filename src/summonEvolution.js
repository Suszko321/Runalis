// Visual mastery is independent of the existing combat evolutionStage/path.
// These milestones match Call Bat Beast; growth never changes combat statistics.
export const SUMMON_VISUAL_MILESTONES=Object.freeze([1,5,10,20,50]);
const growth=Object.freeze([.75,.875,1,1.125,1.25]);
export const SUMMON_MASTERY_ABILITIES=Object.freeze({wolf:'summonWolf',miniDemon:'summonDemon',lich:'summonLich',greaterLich:'gravecallerSummonLich',thornbeast:'thornbinderSummonThornlings',eldritchHorror:'summonEldritchHorror'});
export function summonVisualTier(level=1){
 const value=Number(level),mastery=Number.isFinite(value)?Math.max(1,Math.floor(value)):1;
 for(let i=SUMMON_VISUAL_MILESTONES.length-1;i>=0;i--)if(mastery>=SUMMON_VISUAL_MILESTONES[i])return i;
}
export function summonVisualAbility(s){
 if(!s||s.legendaryTemporary||!SUMMON_MASTERY_ABILITIES[s.kind])return null;
 return s.sourceAbilityId||s.summonAbilityId||(s.kind==='thornbeast'&&s.summonPath==='evolved'?'thornbinderSummonElderThornbeast':SUMMON_MASTERY_ABILITIES[s.kind]);
}
export function synchronizeSummonEvolution(s,owner){
 const ability=summonVisualAbility(s);if(!ability)return;
 const value=Number(owner?.abilityMastery?.[ability]?.level);
 s.summonVisualMastery=Number.isFinite(value)?Math.max(1,Math.floor(value)):1;
 s.summonVisualTier=summonVisualTier(s.summonVisualMastery);
}
export function summonEvolutionPresentation(s,owner){
 const ability=summonVisualAbility(s);if(!ability)return {tier:2,scale:1,art:null};
 // Host-stamped mastery also works when a guest does not have the owner's skill map.
 const tier=summonVisualTier(s.summonVisualMastery??owner?.abilityMastery?.[ability]?.level);
 const elder=s.evolutionStage==='elderThornbeast',fae=s.kind==='thornbeast'&&s.summonMorph==='fae';
 const art=fae&&['thornling','elderThornbeast'].includes(s.evolutionStage)?(elder?'fae-elder':'fae-thornling'):s.kind==='thornbeast'&&s.summonMorph==='petalknight'&&elder?'rose-siegebeast':null;
 const morph=s.summonMorph||'base';
 const graveName=s.kind==='lich'?({base:'skeleton',acolyte:'bound-specter',deathknight:'bound-knight'}[morph]):s.kind==='greaterLich'?({base:'lich',acolyte:'lich-specter',deathknight:'lich-knight'}[morph]):null;
 const graveArt=tier===2?null:graveName||null;
 return {tier,scale:(art&&tier!==2)||(graveArt&&graveArt!=='skeleton')?1:growth[tier],art:tier===2?null:art,graveArt};
}
