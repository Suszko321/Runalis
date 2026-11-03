import {levelRefinement} from './progressionMath.js';

const directHeals = new Set([
  'wayfarerAid','oathkeeperLastRite','thornbinderLivingBriar','wildBloom',
  'hydromancerMendingCurrent','hydromancerWellspring'
]);
const wardsAndBuffs = new Set([
  'guard','briarWard','ironOath','seraphicAegis','oathkeeperBulwarkOfLight',
  'oathkeeperLitanyOfIron','waveriderTideMirror','hydromancerBubbleWard',
  'lightbringerPrismGuard','lightbringerHaloAegis','fellhunterExecutionWindow',
  'crimsonFeast','bloodFrenzy','royalBatBeast'
]);

export function isTauntAbility(ability) {
  return ability?.id === 'oathkeeperBulwarkOfLight' ||
    ability?.id === 'gravecallerFuneralUrn' && ability.subclassId === 'deathknight' ||
    ability?.id === 'thornbinderLivingBriar' && ability.subclassId === 'petalknight';
}

export function supportProgression(ability) {
  if (!ability) return null;
  if (ability.roseMantle || ability.faeFlowerField || ability.soulSiphonField ||
      (ability.summonType === 'thornbeast' && !ability.gardenSummon) || ability.cryoHeal ||
      ability.cryoFieldHeal || ability.bloomFieldHeal ||
      /^(heal|ritual)$/.test(ability.subclassMode) ||
      /^(heal|blessing|beacon)$/.test(ability.subclassSecondary) ||
      ((!ability.subclassMode || ability.sunkenBase || ability.subclassMode === 'original') && directHeals.has(ability.id))) return 'healing';
  if (isTauntAbility(ability)) return 'taunting';
  if (ability.damageReduction || ability.hostWardReduction || ability.petalStorm || ability.role === 'buff' ||
      /^(ward|retaliation|empower)$/.test(ability.subclassMode) ||
      /^(ward|haste|parry|roseWard)$/.test(ability.subclassSecondary) ||
      ((!ability.subclassMode || ability.subclassMode === 'original') && wardsAndBuffs.has(ability.id))) return 'warding';
  return null;
}

export function healingProgressionMultiplier(actor, bonuses) {
  return 1 + .25 * levelRefinement(actor?.skillState?.skills?.healing?.level, 40) +
    (bonuses?.directHealingPct || 0) / 100;
}

export function tauntingProgression(actor, bonuses) {
  const rank = levelRefinement(actor?.skillState?.skills?.taunting?.level, 40);
  return {radius:180 + 36 * rank + (bonuses?.tauntRadius || 0),
    duration:4 + rank + (bonuses?.tauntDuration || 0)};
}
