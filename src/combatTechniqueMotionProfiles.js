import { COMBAT_EXPANSION_ABILITIES,CLASS_COMBAT_PALETTES } from './combatExpansionData.js';
import { LEGACY_SKILL_ART,SHARED_SKILL_PALETTES } from './skillArtProfiles.js';

// Per-technique timing and posture reuse the proven anatomical pose system.
const motion = {
 chain:['oathPull',.62,.3],litany:['heldIron',.8,.12],debt:['guardCounter',.7,.4],mandate:['brandTrace',.64,.36],oathBlades:['ritualRise',.76,.35],
 tether:['oathPull',.55,.28],ricochet:['steelThrow',.58,.38],deadfall:['vesselThrow',.72,.46],execution:['guardCounter',.48,.3],vault:['evasiveVault',.54,.3],
 host:['heldHost',.8,.12],urn:['vesselThrow',.72,.48],ghostwalk:['spectralGlide',.6,.25],echo:['curseGrasp',.72,.42],
 briarstride:['rootStride',.64,.3],seed:['seedThrow',.68,.44],thornstorm:['heldThorns',.8,.12],bloom:['ritualRise',.78,.46],
 maelstrom:['heldWater',.8,.12],undertow:['waterSweep',.72,.4],pressure:['lanceCast',.52,.32],mirror:['waterWard',.76,.42],
 dawnstep:['radiantStride',.58,.3],halo:['prismGuard',.72,.35],pillar:['firstSunrise',.86,.5],overexposure:['brandTrace',.7,.38],
 conduit:['heldConduit',.8,.12],fracture:['fracturedStride',.6,.3],angle:['redMark',.72,.4],orbit:['blackRedBurst',.82,.46]
};
const profiles=Object.fromEntries(COMBAT_EXPANSION_ABILITIES.map(a=>{
 const [poseType,duration,releasePoint]=motion[a.effectProfile];
 return [a.id,Object.freeze({id:a.id+'_motion',classId:a.classId,poseType,duration:duration*.72,releasePoint,
   animationFamily:a.animationFamily,colors:CLASS_COMBAT_PALETTES[a.classId],productionTechnique:true})];
}));
for(const [id,art] of Object.entries(LEGACY_SKILL_ART)) {
 const classId=id.startsWith('oathkeeper')?'oathkeeper':id.startsWith('fellhunter')?'fellhunter':id.startsWith('thornbinder')?'thornbinder':id.startsWith('hydromancer')?'waverider':id.startsWith('lightbringer')?'lightbringer':['graveSpark','summonLich','gravecallerSummonLich','bloodLance','soulSiphon'].includes(id)?'gravecaller':'eldritch';
 profiles[id]=Object.freeze({id:id+'_motion',...art,duration:art.duration*.72,classId,colors:SHARED_SKILL_PALETTES[id]||CLASS_COMBAT_PALETTES[classId],productionTechnique:true});
}
export function getCombatTechniqueMotionProfile(id){return profiles[id]||null;}
