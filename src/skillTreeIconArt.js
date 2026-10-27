import {SUBCLASS_ICON_PATHS} from './subclassArt.js';
import {SUBCLASSES} from './subclassData.js';
import { CLASS_COMBAT_PALETTES } from './combatExpansionData.js';
import { LEGACY_SKILL_ART } from './skillArtProfiles.js';
import { TECHNIQUE_ICON_PATHS } from './combatTechniqueIcons.js';
// Distinct discipline stages and doctrines keep their own primary emblem.
const primary={
 blunt_root:'oathkeeperOathStrike',
 blunt_branch_a:'M18 42H22V22L28 17L24 8H16L12 17L18 22ZM16 12H24M30 12L39 16L31 21M31 29L42 33L33 38',
 blunt_merge:'M22 42H26V23L32 20L35 13L30 6H18L13 13L16 20L22 23ZM19 10H29M4 27L9 22M39 22L44 27M9 37L15 33M33 33L39 37',
 blunt_second_a:'M12 42L26 23L21 16L25 8L34 6L41 13L40 21L32 26L26 23ZM7 10L13 15L9 22M36 32L31 36L37 42M14 27L18 30',
 blunt_second_merge:'M7 8L18 8L21 18L16 24L13 24L32 43M30 8L41 8L44 18L39 24L36 24L17 43M9 13H17M32 13H40',
 blade_bastion:'oathkeeperBastionBash',blade_last_rite:'oathkeeperLastRite',archery_rapid_reload:'fellhunterBearTrap',
 spirit_lich_ascension:'gravecallerSummonLich',spirit_bone_coterie:TECHNIQUE_ICON_PATHS.host,warding_living_battlefield:'thornbinderBramblePatch',
 cambion_chain:TECHNIQUE_ICON_PATHS.chain,cambion_heart:TECHNIQUE_ICON_PATHS.debt,cambion_tempered:'ironOath',
 nephilim_lantern:'M16 13L32 13L35 34L13 34ZM24 5L24 13M18 5L30 5M18 39L30 39M24 18L27 25L24 30L21 25Z',
 nephilim_wingless_guard:'lightbringerHaloAegis',vampire_feast:'bloodLance',vampire_predation:'soulSiphon',vampire_old_oath:'ironOath',
 sword_merge:'M9 39L32 8L38 5L39 12L16 42ZM16 29L25 35M8 32L23 43M29 10L39 20M5 14L12 14M8 11L8 17',sword_second_merge:'M5 7L10 7L39 36L42 42L36 39L7 10ZM41 7L36 7L7 36L4 42L10 39L39 10ZM10 28L20 38M28 10L38 20',
 bow_merge:'fellhunterFlamingArrowVolley',bow_second_merge:'M13 5Q42 24 13 43L13 5M13 24L42 24M35 17L42 24L35 31M7 17L13 24L7 31',
 staff_second_a:'thornbinderThornLash',staff_second_b:'briarWard',staff_second_merge:'M24 42L24 14M24 23L13 12L15 5M24 18L35 8L32 3M24 31L33 25M19 42L29 42',
 scythe_merge:'M14 43L14 9Q29 2 41 19Q26 11 14 16M10 35L18 35M14 22L22 19',
 scythe_second_a:'M12 42L12 8Q33 1 44 23Q29 11 12 16M6 30L18 30M22 29Q31 25 37 33M20 38Q33 32 42 40',
 scythe_second_b:'M14 42L14 8Q33 2 43 21Q28 11 14 16M28 25C21 33 20 39 28 41C36 39 35 33 28 25Z',
 scythe_second_merge:'M10 42L10 10Q26 3 38 20Q23 12 10 17M20 42L20 21Q31 13 44 27Q31 21 20 28',
 spiritFocus_second_merge:'lightbringerRayOfRebuke',eldritchWeapon_merge:TECHNIQUE_ICON_PATHS.conduit,eldritchWeapon_second_merge:TECHNIQUE_ICON_PATHS.orbit
};
const motifs={
 blade:'oathkeeperOathStrike',archery:'fellhunterMarkedShot',spirit:'summonLich',warding:'thornbinderThornLash',
 hydromancy:'hydromancerWaterTorrent',lightbringer:'lightbringerGleamBolt',eldritch:'blackStarPulse',
 cambion:'hellfireBrand',nephilim:'seraphicAegis',vampire:'crimsonFeast',blunt:'oathkeeperOathStrike',sword:'fellhunterPracticalStrike',
 bow:'fellhunterMarkedShot',staff:'thornbinderLivingBriar',scythe:'bloodLance',spiritFocus:'lightbringerPrismGuard',eldritchWeapon:'redMawRift'
};
const classes={blade:'oathkeeper',archery:'fellhunter',spirit:'gravecaller',warding:'thornbinder',hydromancy:'waverider',blunt:'oathkeeper',sword:'oathkeeper',bow:'fellhunter',staff:'thornbinder',scythe:'gravecaller',spiritFocus:'lightbringer',eldritchWeapon:'eldritch'};
function symbol(node) {
 const text=`${node.name} ${Object.keys(node.bonuses||{}).join(' ')}`.toLowerCase();
 if(/lich|coterie|servant|dead|horror|lesser/.test(text))return 'summonLich';
 if(/heal|mercy|repair|regeneration/.test(text))return 'hydromancerMendingCurrent';
 if(/life.?steal|hungry|blood|vital/.test(text))return 'crimsonFeast';
 if(/guard|armour|block|bulwark|hide|shield/.test(text))return 'guard';
 if(/speed|stride|moving|rhythm|step/.test(text))return 'hydromancerRiptideStep';
 if(/crit|aim|mark|patient|opening/.test(text))return 'fellhunterMarkedShot';
 if(/root|thorn|wound|garden|briar/.test(text))return 'thornbinderBramblePatch';
 if(/flame|fire|ember|inferno/.test(text))return 'hellfireBrand';
 if(/spirit|focus|channel/.test(text))return 'lightbringerPrismGuard';
 if(/radius|aoe|wide|cleav|volley/.test(text))return 'oathkeeperJudgmentSmite';
 return motifs[node.tree]||'ironOath';
}
export function getPassiveIconArt(node) {
 if(node.expertise){
  const family=node.expertise.family,sub=SUBCLASSES[family],palette=sub?sub.colors:['#d6b575','#fff2cd','#382b24'];
  const path=sub?SUBCLASS_ICON_PATHS[family]:'M16 3L20 12L30 12L22 19L25 29L16 23L7 29L10 19L2 12L12 12Z';
  return {path:'',palette,detail:`<path d="${path}" transform="translate(5 1) scale(1.2)" fill="none" stroke="${palette[1]}" stroke-width="2"/><path d="M9 35L15 39L24 33L33 39L39 35L37 44H11Z" fill="${palette[2]}" stroke="${palette[0]}"/>`};
 }
 const custom=primary[node.id];
 const base=custom?(LEGACY_SKILL_ART[custom]?.path||custom):LEGACY_SKILL_ART[symbol(node)].path;
 const accent=LEGACY_SKILL_ART[motifs[node.tree]||'ironOath'].path;
 const palette=CLASS_COMBAT_PALETTES[classes[node.tree]||node.tree]||(['cambion','vampire'].includes(node.tree)?CLASS_COMBAT_PALETTES.eldritch:CLASS_COMBAT_PALETTES.lightbringer);
 // The benefit stays large enough to read; the small badge identifies discipline.
 const benefitKeys=Object.keys(node.bonuses||{}),notches=Math.min(4,Math.max(1,benefitKeys.length));
 const badge=node.type==='capstone'?'M30 28L35 32L40 28L43 41L28 41Z':node.choiceGroup?'M35 27L44 35L35 44L26 35Z':'M28 28L43 28L43 43L28 43Z';
 const detail=`<path d="${base}" transform="translate(1 1) scale(.73)" fill="none" stroke="${palette[1]}" stroke-width="2.7" stroke-linecap="round"/><path d="${badge}" fill="${palette[2]}" stroke="${palette[0]}"/><path d="${accent}" transform="translate(28 28) scale(.29)" fill="none" stroke="${palette[1]}" stroke-width="5" stroke-linecap="round"/>${Array.from({length:notches},(_,i)=>`<path d="M${8+i*5} 41L${10+i*5} 38L${12+i*5} 41" stroke="${palette[0]}" fill="none"/>`).join('')}`;
 const discipline=Object.keys(motifs).indexOf(node.tree);
 const foundation=node.foundationTier?`<circle cx="24" cy="24" r="19" fill="none" stroke="${palette[0]}" stroke-dasharray="${5+discipline} 60" transform="rotate(${discipline*22.5} 24 24)" opacity=".7"/>${Array.from({length:node.foundationTier},(_,i)=>`<circle cx="${18+i*4}" cy="5" r="1.3" fill="${palette[1]}"/>`).join('')}`:'';
 return {path:'',palette,detail:detail+foundation};
}
export function skillTreeIconMarkup(node) {
 return `<img class="technique-icon" src="assets/${node.unlocksAbility?'combat-icons/'+node.unlocksAbility:'skill-tree-icons/'+node.id}.svg" alt="" aria-hidden="true">`;
}
