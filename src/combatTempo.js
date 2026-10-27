// Direct attack tuning only. Keep reference power, status snapshots, channel
// cadence and lasting effects unchanged; apply the hit bonus at damage delivery.
export const COMBAT_TEMPO = Object.freeze({directDamage:1.18,chargeTime:.75,recovery:.8,cooldown:.9,projectileSpeed:1.15});
const directModes=new Set(['melee','burst','bolt','pierce','chain','dash','retreat','beam','auraChannel','projectileChannel']);
const lastingProfiles=new Set(['litany','host','debt','mandate','oathBlades','deadfall','execution','urn','echo','seed','bloom','undertow','mirror','halo','overexposure','angle','orbit']);
const lastingOriginals=new Set([
  'block','guard','oathkeeperConsecratedGround','fellhunterBearTrap','fellhunterCaltrops','fellhunterSmokeBomb','fellhunterKillZone',
  'thornbinderBramblePatch','hydromancerDrowningPressure','lightbringerHaloBrand','seraphicAegis'
]);
const legacyMobility=new Set(['oathkeeperDivineLeap','hydromancerRiptideStep','fellhunterGrapplingHook','voidstepBurst']);
const agileMobility=new Set(['gravecallerGhostwalk','hydromancerRiptideStep','lightbringerDawnstep','fellhunterVaultingShot']);

export function isDirectAttack(ability) {
  if(!ability||!(ability.damage>0)||ability.summonType||ability.oathBlades||ability.petalStorm||ability.roseMantle||
    ability.faeFlowerField||ability.soulSiphonField||ability.spectralUrn||ability.spectralHost||ability.hunterSupport)return false;
  // A morph can turn a persistent original into a direct attack, or vice versa.
  if(ability.subclassId&&!ability.sunkenBase)return directModes.has(ability.subclassMode);
  return !lastingOriginals.has(ability.id)&&!lastingProfiles.has(ability.effectProfile);
}

export function mobilityUseCharges(ability) {
  if(!ability||ability.channelProfile)return 0;
  const morphed=ability.subclassId&&!ability.sunkenBase;
  const mobility=!!ability.mobilityProfile||['dash','retreat'].includes(ability.subclassMode)||(!morphed&&legacyMobility.has(ability.id));
  if(!mobility)return 0;
  return ability.subclassMode==='retreat'||agileMobility.has(ability.id)||['fae','dawnblade'].includes(ability.subclassId)?3:2;
}

export function applyCombatTempo(ability) {
  if(!isDirectAttack(ability)||ability._combatTempo)return ability;
  return {...ability,_combatTempo:true,cd:Number(ability.cd||0)*COMBAT_TEMPO.cooldown,
    ...(ability.rechargeTime?{rechargeTime:ability.rechargeTime*COMBAT_TEMPO.cooldown}:{}),
    ...(ability.projectileSpeed?{projectileSpeed:ability.projectileSpeed*COMBAT_TEMPO.projectileSpeed}:{})};
}

export function directHitMultiplier(ability,options={}) {
  if(!isDirectAttack(ability)||options.dot||options.proc||options.sunkenBurn||options.oathBlade||options.source==='summon')return 1;
  // A held attack's projectiles retain their hit bonus after release. Periodic
  // fields without a channel profile must not masquerade as a held attack.
  if(options.channelTick&&!ability.channelProfile)return 1;
  return COMBAT_TEMPO.directDamage;
}

export function attackChargeTimeMultiplier(ability) {return isDirectAttack(ability)?COMBAT_TEMPO.chargeTime:1;}
export function attackRecoveryMultiplier(ability) {return isDirectAttack(ability)?COMBAT_TEMPO.recovery:1;}
export function attackProjectileSpeed(ability,fallback) {
  return ability.projectileSpeed||(isDirectAttack(ability)?fallback*COMBAT_TEMPO.projectileSpeed:fallback);
}
