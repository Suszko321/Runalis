import {ITEMS,getAbilityById,getAbilitySkillRequirement} from './data.js';
import {weaponProficiency} from './progressionProfiles.js';
import {RUNALIS_SKILLS} from './skills.js';
import {requiredSkillEquipment} from './equipmentBoundSkills.js';
import {SUBCLASSES} from './subclassData.js';
import {FELLHUNTER_BASE_INFO} from './fellhunterSkills.js';

// Player-facing explanations, shared by trees, the loadout and morph previews.
// Numeric facts are read from the effective ability, never embedded in its prose.
export const ABILITY_SUMMARIES = Object.freeze({
 summonWolf:'Call a wolf that follows you and bites nearby enemies. Use again to dismiss it; recall starts when it dies or is dismissed.',
 summonDemon:'Call a demon that claws and burns enemies. Learn its pact and keep Demonseed Scythe equipped; removing the scythe dismisses it.',
 oathkeeperVowchain:'Throw a chain at an enemy. Pull smaller foes toward you; against a heavy foe, move toward it instead.',
 oathkeeperLitanyOfIron:'Hold your ground to reduce hits from the front. Incoming pressure builds Conviction and triggers retaliation.',
 oathkeeperDebtOfBlood:'Store some damage you take, then release it as a close-range shockwave. You still take damage while storing it.',
 oathkeeperMandate:'Mark one enemy. Three melee hits on the marked target trigger an extra holy strike.',
 fellhunterHuntersLine:'Tether an enemy and make it Exposed, so your attacks hit harder. Separation pulls lighter foes or moves you toward heavy ones.',
 fellhunterRicochetBlade:'Throw a blade that rebounds between nearby enemies. It deals more damage to Exposed targets.',
 fellhunterDeadfall:'Place a trap that arms after a short delay. The first nearby enemy triggers a crushing hit and stagger.',
 fellhunterExecutionWindow:'For a short time, weapon kills on wounded or Exposed enemies partly recharge your oldest gadget, up to three times.',
 fellhunterVaultingShot:'Jump backward from your aim and fire at the enemy ahead. Walls stop the jump.',
 gravecallerMurmuringHost:'Hold to send seeking spirits into your aimed area. Enemy kills briefly increase the number of spirits.',
 gravecallerFuneralUrn:'Throw an urn that breaks into short-lived spirits. They seek and damage nearby enemies.',
 gravecallerGhostwalk:'Glide through enemies, leaving a damaging wake. Crossed foes become Haunted and take stronger Spirit hits; walls still stop you.',
 gravecallerDeathEcho:'Mark an enemy. If it dies before the mark expires, its temporary echo attacks nearby enemies.',
 thornbinderBriarstride:'Move forward along a root line. Thorn patches remain at the start and end of your path.',
 thornbinderSeedReliquary:'Throw a seed pod that releases short-lived biting plants. Their bites leave lingering thorn wounds.',
 thornbinderThornstorm:'Hold a stationary stance to fire thorn volleys along your aim and slow nearby enemies.',
 thornbinderCorpsebloom:'Mark an enemy with a seed. Its death grows a temporary flower that bites nearby foes.',
 waveriderMaelstrom:'Hold a moving water vortex around you. Flow increases its reach; Soaked enemies are pulled and take stronger hits.',
 waveriderUndertow:'Place a ground current along your aim. It pulls nearby enemies toward its path and Soaks them for stronger water follow-ups.',
 waveriderPressureSpear:'Fire a narrow water jet through lined-up enemies. Soaked targets take more damage.',
 waveriderTideMirror:'Raise a water curtain that reduces ranged damage, then sends a small jet back at an attacker.',
 lightbringerDawnstep:'Dash forward and mark enemies you cross with Halo Brand. Branded targets help you build Lumens faster.',
 lightbringerOrbitalHalo:'Summon orbiting fragments that strike nearby enemies. Starting Dawncarver consumes them to widen its beam.',
 lightbringerPillarOfRevelation:'Mark an area, then strike it with a delayed column of light. Halo Branded enemies take more damage.',
 lightbringerOverexposure:'Mark one enemy. Four radiant ability hits on it trigger a damaging burst.',
 eldritchCrimsonConduit:'Channel a steerable beam of red lightning. Sustained hits branch to nearby foes; channeling also drains your health.',
 eldritchFractureStep:'Dash a short distance, leaving a rift that explodes after a delay. Solid terrain stops movement.',
 eldritchImpossibleAngle:'Create two rifts connected by a damaging line. Enemies crossing the line are struck.',
 eldritchStarlessOrbit:'Summon orbiting fragments that fire at nearby enemies. Stay close enough for them to find targets.',
 oathkeeperOathStrike:'Swing your blessed weapon at enemies in front of you for a heavy melee hit.',
 oathkeeperBastionBash:'Bash enemies in front of you with your shield, dealing damage, knocking them back and briefly staggering them.',
 oathkeeperDivineLeap:'Leap forward and strike the landing area, damaging and staggering nearby enemies.',
 oathkeeperJudgmentSmite:'Strike nearby enemies with a holy burst. Charging increases its area and impact.',
 oathkeeperConsecratedGround:'Create a holy ground effect that damages enemies over time and protects you while you stand inside it.',
 oathkeeperBulwarkOfLight:'Raise a temporary holy defense that reduces damage and makes blocking more efficient.',
 oathkeeperLastRite:'Spend Spirit to heal yourself and gain a brief defense. It heals more when you have missing health or stored Conviction.',
 oathkeeperHeavenbreakerJudgment:'Release a large holy shockwave around you and briefly strengthen your defenses.',
 fellhunterPracticalStrike:'Make a quick close-range weapon strike. Useful when enemies get past your traps or ranged attacks.',
 fellhunterThrowingDaggers:'Throw daggers along your aim. Exposed enemies take stronger hits.',
 fellhunterBearTrap:'Place a trap ahead of you. It catches the first enemy, slows or roots it, and makes it Exposed to stronger follow-up hits.',
 fellhunterCaltrops:'Scatter spikes on the ground. Enemies crossing them are damaged, slowed and made Exposed.',
 fellhunterBombToss:'Throw a timed bomb that damages a group and makes enemies Exposed for follow-up attacks.',
 fellhunterGrapplingHook:'Pull yourself forward along your aim. Walls and solid objects stop the pull.',
 fellhunterFlamingArrowVolley:'Fire a spread of burning arrows to hit groups in front of you.',
 fellhunterSmokeBomb:'Release smoke around you to slow nearby enemies, disrupt pursuit and make them Exposed.',
 fellhunterMarkedShot:'Fire a precise ranged shot that makes its target Exposed to stronger follow-up attacks.',
 fellhunterKillZone:'Deploy traps, spikes and explosive attacks in one area. It works best when enemies remain inside.',
 graveSpark:'Fire a necrotic bolt at an enemy. A successful hit restores a little of your health.',
 summonLich:'Raise a skeletal henchman that follows you and fights nearby enemies. Mastery unlocks specter and lesser goliath knight forms. Commander raises three of the selected form. Use again to dismiss the group.',
 bloodLance:'Fire a powerful necrotic lance at a target and recover health from the hit.',
 soulSiphon:'Damage nearby enemies with a necrotic pulse and turn some of that damage into healing.',
 thornbinderThornLash:'Sweep a vine in front of you to hit several enemies, slow them and leave lingering thorn wounds.',
 thornbinderBriarHook:'Fire a hooked vine that damages an enemy and strongly slows or briefly roots it.',
 thornbinderBramblePatch:'Grow a damaging thorn patch. Enemies inside are slowed and gain lingering thorn wounds.',
 thornbinderRosebiteBurst:'After a short delay, thorn mouths erupt in the aimed area to damage and slow clustered enemies.',
 thornbinderLivingBriar:'Activate a short healing aura. It adds to the smaller healing aura refreshed by your offensive thorn spells.',
 thornbinderRootPrison:'Grow roots in an aimed area to damage and hold enemies. Stronger foes resist the full root.',
 thornbinderSummonThornlings:'Call three fragile thorn creatures that slow enemies and leave lingering wounds. Use again to dismiss the group.',
 thornbinderSummonElderThornbeast:'Call one sturdy thorn beast with an empowering presence and a powerful bite. Use again to dismiss it.',
 hydromancerWaterTorrent:'Blast enemies in a narrow cone with water. Hits slow and Soak them, making later water attacks stronger.',
 hydromancerBubbleWard:'Shield yourself and nearby allies. The ward absorbs a fixed amount from each hit; Level and charge improve it.',
 hydromancerMendingCurrent:'Heal yourself and nearby allies with water. Charging increases the healing.',
 hydromancerTidalCut:'Make a sweeping water-edged strike. Soaked enemies take extra damage.',
 hydromancerRiptideStep:'Dash forward on a current, leaving a slowing wake and damaging enemies near your arrival.',
 hydromancerDrowningPressure:'Crush an aimed group with water pressure, slowing and strongly Soaking enemies for follow-up attacks.',
 hydromancerWellspring:'Restore health, Stamina and Spirit to yourself and nearby allies.',
 hydromancerDelugeCrown:'Strike a wide area with water and grant nearby allies a protective pressure ward.',
 lightbringerGleamBolt:'Fire a radiant bolt. Successful hits build Lumens; Halo Branded targets build them faster.',
 lightbringerHaloBrand:'Mark an enemy so your Lightbringer attacks build Lumens faster when they hit it.',
 lightbringerRayOfRebuke:'Fire a narrow line of light. Hitting several enemies or a Halo Branded target grants a Lumen.',
 lightbringerPrismGuard:'Raise a brief shield. The first hit it absorbs grants one Lumen.',
 lightbringerDawncarver:'Channel a steerable beam of light. It consumes available Lumens for greater width, reach and damage, and drains Spirit while active.',
 lightbringerSolarVerdict:'Spend all your Lumens on a radiant blast. More Lumens increase its damage and area.',
 lightbringerHaloAegis:'Spend all your Lumens to shield yourself and nearby allies.',
 lightbringerFirstSunrise:'Fill your Lumens immediately and briefly strengthen Lumen generation and radiant abilities.',
 voidstepBurst:'Move forward along your aim and damage enemies around your arrival with a lightning burst.',
 summonEldritchHorror:'Call your horror companion or brood, depending on your tree choice. Use again to dismiss the whole group.',
 blackStarPulse:'Release lightning around you to damage and slow nearby enemies.',
 redMawRift:'Open a damaging rift in the aimed area that pulls clustered enemies inward.',
 guard:'Briefly reduce incoming damage. Use it just before an enemy lands a hit.',
 briarWard:'Raise a temporary defense that reduces incoming damage.',
 ironOath:'Raise a stronger, longer-lasting defense that reduces incoming damage.',
 hellfireBrand:'Explode a fiery seal in the aimed area. This is a Cambion bloodline skill; that bloodline also reduces ordinary healing.',
 seraphicAegis:'Raise a protective ward and damage nearby enemies with a holy pulse. Requires the Nephilim bloodline.',
 crimsonFeast:'Strike an enemy and recover a large portion of the damage as health. Requires the Vampire bloodline.'
});

export const informationLabel=id=>RUNALIS_SKILLS[id]?.name || ({spiritFocus:'Spirit Focus',miniDemon:'Demon',classless:'Classless',cambion:'Cambion',nephilim:'Nephilim',vampire:'Vampire'}[id]) || String(id||'').replace(/([a-z])([A-Z])/g,'$1 $2').replace(/^./,c=>c.toUpperCase());
export const informationNumber=n=>Number(Number(n||0).toFixed(1));
export function abilitySummary(ability,player=null) {
 if(!ability)return '';
 if(ability.roseEruption||ability.gardenGraveMorph&&ability.subclassId==='petalknight'&&ability.id==='thornbinderRosebiteBurst')return ability.desc+' The impact pushes surviving enemies away; heavy enemies resist and bosses hold their ground.';
 if(ability.oathBlades)return ability.desc;
 if(ability.spectralUrn)return ability.desc;
  if(ability.hunterMorph||ability.oathMorph)return ability.desc;
 if(ability.classId==='fellhunter'&&!ability.subclassId&&FELLHUNTER_BASE_INFO[ability.id])return FELLHUNTER_BASE_INFO[ability.id][1];
 if(ability.sunkenBase||ability.cryoSkill||ability.gardenGraveMorph||ability.hellSkill)return ability.desc;
 if(ability.id==='gravecallerSummonLich'||(ability.id==='summonLich'&&ability.subclassMode==='summon'))return ability.desc;
 if(ability.id==='thornbinderThornLash'&&ability.subclassId==='fae')return 'Hold to send fast faerie butterflies toward enemies near your aim. Shots gently curve toward visible foes. Hits weaken enemies; three hits briefly bind weaker foes. Lower damage and slightly higher Spirit upkeep than Murmuring Host. Release or dodge to stop.';
 if(ability._mythChannel==='torrentSweep')return 'Hold a broad, sweeping water torrent through groups. It trades direct damage for coverage and higher Spirit upkeep.';
 if(ability.faeSummon||ability.faeFlowerField||ability.spectralHost||ability.soulSiphonField)return ability.desc;
 if(ability.subclassMode&&ability.classId==='gravecaller')return ability.desc;
 if(ability.subclassMode){
  const modes={bolt:'Fire an aimed projectile at an enemy.',pierce:'Fire a piercing attack through lined-up enemies.',chain:'Strike a target and jump the attack to nearby foes.',beam:'Hold a steerable beam on enemies; release or dodge to stop.',auraChannel:'Hold a surrounding aura that affects nearby enemies.',burst:'Release a damaging burst in the aimed area.',melee:'Strike enemies at close range with this form’s effect.',dash:'Dash along your aim and strike enemies on the path.',retreat:'Move backward while striking along your aim.',mark:'Mark an aimed enemy for stronger follow-up attacks.',field:'Create a lingering area that affects enemies inside.',trap:'Place a trap that triggers when an enemy approaches.',ward:'Raise a temporary protective ward for nearby allies.',heal:'Heal nearby allies and pulse damage against nearby enemies.',ritual:'Perform a healing rite with an offensive pulse.',retaliation:'Raise a ward that builds retaliation against attackers.',spirits:'Call short-lived spirits that seek nearby enemies.',empower:'Temporarily strengthen your following attacks.'};
  const secondary={chill:'Hits slow enemies and build Chill toward freezing.',freeze:'Build Chill and freeze weaker enemies; bosses are slowed.',shatter:'Brittle enemies take stronger hits.',ward:'Also grants a brief barrier.',chain:'Lightning jumps to nearby enemies; hits briefly hasten you.',heal:'Also heals nearby allies.',haste:'Also grants nearby allies a short speed boost.',drain:'Effective damage restores health.',pressure:'Continued hits build Depth, strengthening a water burn; stopping pressure resets it.',pull:'Pulls weaker enemies into the effect.',detonate:'Detonates an existing affliction.',sacrifice:'Spends 4% of your current health to strengthen the cast.',smite:'Prepares holy retaliation.',bind:'Briefly holds weaker enemies.',blessing:'Also heals nearby allies.',curse:'Leaves a damaging curse.',soul:'Gather Soul Fragments from kills; healing rites consume them.',spread:'Spreads existing curses.',misdirect:'Weakens enemies; three Faerie Fire hits briefly hold weaker foes.',root:'Holds weaker enemies in place; bosses are slowed.',bleed:'Leaves a lingering bleed.',seal:'Interrupts weaker casters and exposes ordinary enemies to stronger hits.',dispel:'Strips shields, or exposes enemies when no shield remains.',brand:'Applies Infernal Brand; three hits detonate it.',burn:'Leaves a lingering burn; repeated hits build Heat for stronger burns.',blade:'Concentrates light into a weapon-shaped strike.',beacon:'Creates a Beacon that strengthens and protects nearby allies.',combo:'Every third close strike hits harder.',burst:'Adds an area burst.',parry:'A brief parry protects against the next hit.',heat:'Builds Heat for stronger burns.',prey:'Marks one prey; strikes against it are stronger below half health.',execute:'Deals more damage to wounded marked prey.',retaliation:'Stores a portion of incoming damage for retaliation.',field:'Leaves a temporary ground effect.',strike:'Strikes enemies along your movement.'};
  const family={cryomancer:secondary.chill,sunken:secondary.pressure,holyknight:'Weakens struck enemies; wards protect nearby allies.',sinner:'Injuries build Penance for stronger hits; damage restores health.',acolyte:secondary.soul,deathknight:'Necrotic damage restores health and weakens enemies.',fae:secondary.misdirect,petalknight:secondary.root,sunscorched:secondary.burn,dawnblade:'Exposes enemies to stronger attacks; every third strike hits harder.',bloodhound:secondary.prey,hellstalker:secondary.brand};
  const effect=secondary[ability.subclassSecondary] || family[ability.subclassId];
  const element=SUBCLASSES[ability.subclassId]?.traits.element;
  const shape=modes[ability.subclassMode]||'Use this form’s attack or support effect.';
  const sacrifice=ability.subclassHealthCost && ability.subclassSecondary!=='sacrifice'?'Casting also spends 4% of your current health.':'';
  return [element?`${informationLabel(element)} form: ${shape[0].toLowerCase()+shape.slice(1)}`:shape,effect,sacrifice].filter(Boolean).join(' ');
 }
 if(ability.id==='summonWolf'&&player?.equipment && ['beastSovereignHelm','beastSovereignLegs','beastSovereignTrinket'].every(id=>Object.values(player.equipment).includes(id)))return 'Call a larger Dire Wolf. Every third bite cleaves nearby foes and draws their attention; it moves and attacks more slowly.';
 if(ability.id==='summonLich'){
  const path=player?.gravecaller?.path||player?.gravecallerPath;
  if(path==='commander'||player?.skillTree?.spent?.spirit_bone_coterie)return 'Raise three skeletal henchmen: a Vanguard, Reaver and Marksman. Their attacks steal life for you within a healing limit shared by all summons. Mastery changes the group into specters or lesser goliath knights; Coterie gear still grants bonuses. Use again to dismiss the group.';

 }
 if(['graveSpark','bloodLance','soulSiphon','summonLich'].includes(ability.id))return ability.desc;
 return ABILITY_SUMMARIES[ability.id] || ability.desc || 'Use this technique against enemies or to support allies.';
}
export function abilityRequirements(ability) {
 const requirements=[];
 if(ability.classId)requirements.push(informationLabel(ability.classId));
 if(ability.bloodline)requirements.push(`${informationLabel(ability.bloodline)} bloodline`);
 const skillRequirement=getAbilitySkillRequirement(ability);
 if(skillRequirement>1)requirements.push(`${informationLabel(ability.skill)} ${skillRequirement}`);
 const equipment=requiredSkillEquipment(ability);
 if(equipment)requirements.push(`Equipped ${ITEMS[equipment]?.name || informationLabel(equipment)}`);
 const weapon=ability.requiresWeaponType||ability.weaponType;
 if(weapon)requirements.push(`${informationLabel(weapon)} equipped`);
 if(ability.requiresSpiritAwakened)requirements.push('Awakened Spirit');
 return [...new Set(requirements)].join(' · ');
}
export function abilityScaling(ability) {
 if(ability.roseMantle)return 'Each recipient’s maximum Health · Level · Warding · Defence · mastery · support perks (healing); charge · ward perks · class Expertise (protection). Healing and protection are capped.';
 if(ability.oathBlades)return 'Level · Blunt Weapons · Dexterity · skill mastery · weapon and charm · class Expertise; swords last eight seconds and one formation is allowed';
 if(ability.classId==='fellhunter')return 'Level · Dexterity · higher of Archery or equipped melee proficiency · skill mastery · weapon and charm'+(ability.hunterWard?'; wards use Warding, Defence and mastery, capped at 30%':'');
 if(ability.gardenSummon&&ability.subclassId==='petalknight')return 'Level · Summoning · mastery (companion damage and health); reflected damage is capped by the hit received and companion damage';
 if(ability.heldBlock)return 'Blocking perks and block-efficiency gear';
 if(ability.soulSiphonField)return 'Level · Spirit · mastery · Spirit gear (damage); maximum Health · mastery · support perks · Soul Fragments (healing)';
 if(ability.summonType)return 'Level · Summoning · skill mastery'+(['wolf','miniDemon','greaterLich'].includes(ability.summonType)?' · Spirit · Spirit gear':ability.summonType==='lich'?' · skeleton gear (Commander)':ability.summonType==='thornbeast'?'; passive healing also uses Warding':'');
 const defensive=['guard','briarWard','ironOath','hydromancerBubbleWard','hydromancerMendingCurrent','hydromancerWellspring','thornbinderLivingBriar','oathkeeperLastRite'].includes(ability.id)&&!ability.subclassId;
 if(['guard','briarWard','ironOath'].includes(ability.id)&&!ability.subclassId)return 'Level · Warding · Defence · mastery (protection and cost)';
 if(defensive)return 'Level · Warding · Defence · skill mastery · tree bonuses'+(ability.id==='oathkeeperLastRite'?' · missing health · Conviction':ability.id.startsWith('hydromancer')?' · Flow':'');
 const proficiency=defensive?'warding':ability.skill;
 const attribute=defensive?'defence':['blade','blunt','scythe','archery'].includes(proficiency)?'dexterity':'spirit';
 const damage=[...new Set(['Level',informationLabel(proficiency),informationLabel(attribute),'skill mastery','weapon and charm'])].filter(Boolean).join(' · ');
 const supports=ability.subclassId&&(['ward','heal','ritual','retaliation'].includes(ability.subclassMode)||['ward','heal','blessing','beacon','parry','smite'].includes(ability.subclassSecondary));
 return supports?`${damage}; healing and protection also use Warding and Defence`:damage;
}
export function equipmentPurpose(item) {
 if(item?.type==='weapon')return ({mace:'Crushing melee weapon. Three deliberate blows end in a heavy slam; trains Blunt Weapons.',hammer:'Heavy crushing melee weapon; trains Blunt Weapons.',bow:'Ranged weapon for aimed shots and charged heavy attacks.',crossbow:'Ranged weapon for aimed shots and heavy attacks.',spiritFocus:'Ranged focus that fires bolts using Stamina.',scythe:'Melee weapon with sweeping attacks; trains Scythes.',staff:'Melee staff; its strikes train Blades.'}[item.weaponType]) || 'Melee weapon for close-range light and heavy combinations.';
 if(item?.type==='armour')return 'Adds protection against incoming hits.';
 if(item?.type==='trinket')return 'Adds the listed combat bonuses while equipped.';
 if(item?.type==='scroll')return `Read to learn ${getAbilityById(item.learnsAbility)?.name||'its technique'}, then assign it in Abilities.`;
 return item?.desc || '';
}
export function equipmentScaling(item) {
 if(item?.type!=='weapon')return '';
 const proficiency=weaponProficiency(item);
 const attribute=['blade','blunt','scythe','archery'].includes(proficiency)?'dexterity':'spirit';
 return [...new Set(['Level',informationLabel(proficiency),informationLabel(attribute)])].join(' · ');
}
