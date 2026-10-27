import {LEGACY_ENEMY_CLUSTER_NAMES} from './enemyIdentityAliases.js';
// runalisContentExpansion.js
// Runalis RPG content expansion pack.
//
// Purpose:
// - Adds a denser RPG overworld layer without bloating overworldMap.js.
// - Adds new settlements, camps, shrines, dungeon entrances, NPCs, resources,
//   landmarks, enemy patrols, mini-bosses, and hand-authored encounter spaces.
// - Uses existing object/enemy kinds so the current render/combat/interact systems
//   keep working without a major rewrite.

import { TILE } from './data.js';

import {
  ACT1_LANDMARKS,
  makeObject,
  makeDecorObject,
  resourceRespawn,
  scatterObjects,
  makeEnemy,
  addEnemyCluster,
  scaleEnemyStats
} from './overworldUtils.js';
import { applyMajorPoiStructures } from './majorPoiStructures.js';

// -----------------------------------------------------------------------------
// PUBLIC API
// -----------------------------------------------------------------------------

export function applyRunalisContentExpansion(ctx, objects, enemies) {
  if (!objects || !enemies) return;

  addExpandedLandmarkDressing(objects);
  addExpandedResourceRoutes(objects);
  addExpandedRpgNpcs(objects);
  addExpandedDungeonEntrances(objects);
  addExpandedAmbientWorldObjects(objects);
  addCapitalHubPrototype(objects);
  addOverworldActivityCaches(objects);

  addExpandedEnemyEncounters(enemies);
  addOverworldActivityEncounters(enemies);
  addExpandedMiniBosses(enemies);
  addWorldBossPrototype(enemies);

  spreadExpandedActOneContent(objects, enemies);
  applyMajorPoiStructures(ctx, objects, enemies);
  addLivingOverworldPoiDressing(objects);
  addLivingOverworldNpcs(objects);
  addLivingOverworldCaches(objects);
  addLivingOverworldHostiles(enemies);
  addLivingOverworldElites(enemies);
  addAdditionalWorldBosses(enemies);
  addExpandedRoadSignposts(objects);
  pinQuestGiversToRelevantEntrances(objects);
  addCanonicalActOneWorldStory(objects, enemies);
  rebuildAshenOrchard(objects, enemies);
  rebuildRuinedChapel(objects, enemies);
}

function rebuildRuinedChapel(objects, enemies) {
  const prop = (id, propType, x, y, extra = {}) => makeDecorObject('townProp', id, propType, x, y, {
    propType, r: 0, interactable: false, hideLabel: true, drawRadius: 230, ...extra
  });
  const evidence = (id, name, x, y, message, extra = {}) => makeObject('poiInvestigation', id, name, x, y, {
    poiId: 'brokenChapel', clueId: id, r: 17, message, labelPriority: 8, hideLabel: true,
    clueCategory: 'physical', ...extra
  });
  const covenantNpc = (id, name, x, y, talk, extra = {}) => makeObject('npc', id, name, x, y, {
    npcId: id, factionId: 'covenantOfLight', disposition: 'friendly',
    shirt: '#eee6cf', pants: '#8e7b45', boots: '#40362a',
    ambientWander: true, wanderRadiusTiles: 1.1, wanderSpeed: 12,
    talk, poiStateCondition: { requiresPoiUnresolved: 'brokenChapel' }, ...extra
  });
  const outcomeWitness = (id, name, x, y, talk, resolutionId, extra = {}) => makeObject('npc', id, name, x, y, {
    npcId: 'chapelOutcomeWitness', dialogueId: 'chapelOutcomeDialogue',
    disposition: 'friendly', talk, ambientWander: true, wanderRadiusTiles: 1.1,
    poiStateCondition: { poiId: 'brokenChapel', resolutionAny: [resolutionId] }, ...extra
  });

  const sisterElyra = objects.find(object => object.id === 'sisterElyra');
  if (sisterElyra) Object.assign(sisterElyra, {
    factionId: 'covenantOfLight', dialogueId: 'sisterElyraIntro',
    poiStateCondition: { requiresPoiUnresolved: 'brokenChapel' }
  });
  const chapelHermit = objects.find(object => object.id === 'chapelHermit');
  if (chapelHermit) chapelHermit.poiStateCondition = { requiresPoiUnresolved: 'brokenChapel' };

  objects.push(
    // Readable silhouette and recent attack layer.
    prop('chapelBrokenBellTower', 'brokenBellTower', 445, 55, { scale: 1.25 }),
    prop('chapelAmberGlassWest', 'brokenStainedGlass', 438, 60, { scale: 0.9 }),
    prop('chapelAmberGlassEast', 'brokenStainedGlass', 452, 60, { scale: 0.9 }),
    prop('chapelFallenBanner1', 'banner', 437, 78, { color: '#eee6cf', scale: 0.85 }),
    prop('chapelFallenBanner2', 'banner', 452, 79, { color: '#d9ad4f', scale: 0.8 }),
    prop('chapelAbandonedMedicalCart', 'sickWagon', 435, 82, { scale: 0.78 }),
    prop('chapelScatteredMedicine', 'medicineCrates', 438, 82, { scale: 0.68 }),
    prop('chapelDamagedLanternProp', 'purificationBrazier', 442, 78, { scale: 0.78 }),
    prop('chapelRecoveryCot1', 'infirmaryCot', 436, 79, { scale: 0.66 }),
    prop('chapelRecoveryCot2', 'infirmaryCot', 439, 80, { scale: 0.66 }),
    prop('chapelRecoveryBasin', 'washBasin', 433, 80, { scale: 0.65 }),
    prop('chapelBodyRecoveryGrave1', 'freshGrave', 430, 74, { scale: 0.7 }),
    prop('chapelBodyRecoveryGrave2', 'freshGrave', 431, 77, { scale: 0.72 }),
    prop('chapelRotMemorial1', 'rotMemorial', 428, 70, { scale: 0.8 }),
    prop('chapelRotMemorial2', 'rotMemorial', 431, 68, { scale: 0.76 }),
    makeDecorObject('deadRoot', 'chapelGraveRoot1', 'Grave-Black Root', 430, 72, { scale: 1.2 }),
    makeDecorObject('deadRoot', 'chapelGraveRoot2', 'Memory Root', 433, 70, { scale: 1.08 }),

    // Older Avarran civic layer and pre-Veiling anomaly.
    prop('chapelWitnessPlatform', 'witnessPlatform', 445, 67, { scale: 1.05 }),
    prop('chapelAvarranOathStone', 'avarranOathStone', 440, 65, { scale: 0.92 }),
    prop('chapelBlockedNinthAlcove', 'blockedAlcove', 445, 57, { scale: 0.92 }),
    prop('chapelEchoHealer', 'echoFragment', 448, 72, { scale: 0.9, phase: 2 }),
    prop('chapelEchoFuneral', 'echoFragment', 434, 69, { scale: 0.75, phase: 5, color: '#b6a7da' }),
    prop('chapelEchoWitness', 'echoFragment', 446, 63, { scale: 0.72, phase: 8, color: '#d9ad4f' }),

    covenantNpc('chapelBodyWarden', 'Covenant Body Warden', 434, 76,
      'Body Warden: "Names first, then shrouds. If a marker changes, read from the paper list and call a second witness."', { role: 'bodyRecovery' }),
    covenantNpc('chapelSurvivorArchivist', 'Covenant Survivor-Archivist', 450, 67,
      'Archivist: "Save whatever can still be read. Do not improve a damaged sentence because you think you know what it meant."', { role: 'archiveRecovery' }),
    covenantNpc('chapelGraveHealer', 'Covenant Grave Healer', 437, 79,
      'Healer: "The living are stable. Now help me keep the dead from inheriting one another\'s names."', { role: 'healer' }),
    covenantNpc('chapelLanternEngineer', 'Purification Lantern Engineer', 443, 78,
      'Engineer: "The lantern held through the breach. It failed when the grave residue began reciting a prayer with one word missing."', { role: 'engineer' }),
    makeObject('npc', 'chapelCivilianWitness', 'Tomas Venn', 436, 84, {
      npcId: 'chapelCivilianWitness', dialogueId: 'chapelCivilianDialogue', disposition: 'fearful',
      ambientWander: false, poiStateCondition: { requiresPoiUnresolved: 'brokenChapel' }
    }),
    makeObject('npc', 'chapelLastDawnRemnant', 'Ash-Captain Rusk', 457, 67, {
      npcId: 'chapelLastDawnRemnant', dialogueId: 'chapelLastDawnDialogue', factionId: 'lastDawn',
      disposition: 'uncertain', shirt: '#71333b', pants: '#2a2328', ambientWander: false,
      poiStateCondition: { requiresPoiUnresolved: 'brokenChapel' }
    }),

    // Physical evidence first supports the public account.
    evidence('damagedPurificationLantern', 'Damaged Purification Lantern', 442, 78,
      'The lantern endured weapon strikes and continued burning. Its light failed only after black funeral residue climbed from the cemetery into its oil.', {
        discoveryRewards: { xp: { warding: 8 } },
        companionReactions: { elian: 'Sister Elian: "The lantern did its work until the dead memory entered it. Faith did not fail here; something learned to travel through the rite."' }
      }),
    evidence('fallenCovenantDefenders', 'Recovered Covenant Defenders', 438, 79,
      'The defenders died facing the south breach. Two shields still cover a civilian doorway. Their wounds match Last Dawn blades.', {
        companionReactions: { mara: 'Mara: "They died between the attackers and the patients. Whatever we learn later does not revise that choice."' }
      }),
    evidence('lastDawnWeaponMarks', 'Last Dawn Breach Marks', 451, 80,
      'Red-seal wedges and disciplined blade cuts opened the south wall. This was a planned Last Dawn assault, not scavenging after a disaster.', {
        identityInsights: [{ classAny: ['fellhunter'], message: 'A second team withdrew east through a concealed foundation drain.' }]
      }),
    evidence('civilianEscapeRoute', 'Crypt Shelter Route', 436, 82,
      'Chalk arrows lead patients away from the battle into the crypt. Sister Elyra\'s name marks the last turn; the smallest footprints all reach cover.', {
        companionReactions: { bram: 'Bram: "One usable exit, no wasted arrows, children at the center. Someone planned for panic before the attack."' }
      }),
    evidence('lastDawnAssaultPlan', 'Last Dawn Assault Plan', 455, 78,
      'The plan expects armed Covenant resistance and orders the reliquary taken. A later hand adds: CIVILIANS PRESENT—ABORT. The assault continued.', {
        clueCategory: 'faction', discoveryRewards: { items: [['lastDawnCipherScrap', 1]] }
      }),

    // Deeper physical and faction contradictions.
    evidence('authorizedWardOpening', 'Ward Opened from Within', 451, 70,
      'The inner ward accepted an authorized Covenant signature before the outer wall fell. The same hand tried to close it after the Echo disturbance began.', {
        clueCategory: 'faction', identityInsights: [{ classAny: ['oathkeeper'], message: 'The authorization belonged to an archivist office, not a combat or purification office.' }]
      }),
    evidence('selectiveArchiveBurn', 'Selective Archive Burn', 450, 62,
      'Recent patient rolls and pursuit records were burned. The oldest testimony shelves were emptied before the fire, proving destruction was not the attackers\' only purpose.', {
        clueCategory: 'historical', companionReactions: { dusk: 'Dusk: "Fire destroys without preference. People do not. Someone selected what the future was permitted to lose."' }
      }),
    evidence('covenantSealOrder', 'Covenant Lower-Seal Order', 447, 64,
      'The order sincerely warns that opening the lower chamber risks identity fracture. It also forbids recording the chamber\'s original civic function.', {
        clueCategory: 'faction', companionReactions: { elian: 'Sister Elian: "The danger may justify the seal. It does not justify pretending the older purpose never existed."' }
      }),
    evidence('attackerTunnelTrail', 'Attacker Tunnel Trail', 457, 72,
      'Blood, boot pressure, and broken red wax lead into an older drain. One wounded attacker escaped; another was dragged back toward the Chapel.', {
        clueCategory: 'physical', identityInsights: [{ classAny: ['fellhunter'], message: 'The concealed route can be trapped, followed, or used as leverage against Rusk.' }]
      }),
    evidence('warEraRestraint', 'War-Era Oath-Fire Restraint', 453, 65,
      'The restraint identifies created war-beings by purpose and commands them to remain. Its heat is intact, but its authority has become brittle.', {
        clueCategory: 'historical', identityInsights: [{ raceAny: ['cambion'], message: 'The fire recognizes a descendant of constrained war-Essence and cannot decide whether to imprison or obey you.' }]
      }),

    // Historical and spiritual layer.
    evidence('originalNineStationPlan', 'Nine-Station Foundation Plan', 444, 59,
      'The oldest plan shows nine public witness stations beneath an eightfold Chapel renovation. One station is scratched out in the legend but remains load-bearing.', {
        clueCategory: 'historical', discoveryRewards: { items: [['originalChapelPlan', 1]], xp: { runecraft: 12 } },
        companionReactions: { dusk: 'Dusk: "They did not fail to build the ninth station. Someone needed later generations to believe it had never been there."' }
      }),
    evidence('erasedRestorationOrder', 'Avarran Symbols Covered by Order', 438, 64,
      'A Covenant restoration order tells masons to cover open-hand witness symbols with lantern panels. The stated purpose is standardization, not destruction.', {
        clueCategory: 'historical', companionReactions: { elian: 'Sister Elian: "Standardization saves lives when medicines and records must travel. Here it also made an older moral language invisible."' }
      }),
    evidence('avarranWitnessStone', 'Avarran Civic Oath Stone', 440, 65,
      'The open hands face the gathering space rather than the altar. Its inscription makes authority answerable to everyone who bears its consequences.', {
        clueCategory: 'historical', discoveryRewards: { xp: { renown: 10 } }
      }),
    evidence('shiftingMemorialNames', 'Memorial of Shifting Names', 429, 70,
      'Three family names exchange letters whenever the weak lantern pulses. The Rot is moving inherited grief between memorials as if identity were soil.', {
        clueCategory: 'spiritual', companionReactions: { mara: 'Mara: "The grave roots are carrying grief as nutrients. Cut them carelessly and the forest inherits every broken name."' }
      }),
    evidence('contradictoryHealerEcho', 'Contradictory Healer Echo', 448, 72,
      'The Echo remembers shielding a patient, opening the ward, and killing itself. These acts belonged to different people fused by repeated ritual and Rot.', {
        clueCategory: 'spiritual', identityInsights: [{ classAny: ['gravecaller'], message: 'No complete dead soul is speaking. This is ritual residue wearing several identities.' }]
      }),
    evidence('interruptedFuneralEcho', 'Interrupted Funeral Echo', 434, 69,
      'The funeral repeats every name until an empty place, then begins again. Completion requires restoring the absence or allowing the rite to end unfinished.', {
        clueCategory: 'spiritual'
      }),
    evidence('cemeteryRootMemory', 'Grave-Root Memory', 431, 72,
      'Black roots link tombs by shared mourners rather than bloodline. They spread through remembered relationships, not living tissue.', {
        clueCategory: 'spiritual', identityInsights: [{ classAny: ['thornbinder'], message: 'The network can be divided into contained living knots, but the surrounding forest will dream what they carry.' }]
      }),
    evidence('preservedBloodSequence', 'Blood Preserved in Chapel Stone', 439, 71,
      'Separate blood traces record the true death sequence beneath the merged Echo account.', {
        clueCategory: 'spiritual', identityInsights: [{ raceAny: ['vampire'], message: 'The blood remembers defender, attacker, archivist, then civilian—four deaths the memorial currently merges into one.' }]
      }),
    evidence('purificationWaterMemory', 'Spilled Purification Water', 442, 76,
      'The water holds a repeated image of the lower door opening before the assault. Its current drains toward a road absent from modern maps.', {
        clueCategory: 'spiritual', identityInsights: [{ classAny: ['waverider'], message: 'The current can flood the threshold, but contaminated water will continue toward the forgotten road.' }]
      }),
    evidence('rightOfFinalRefusal', 'Rite of Final Refusal', 445, 61,
      'The oldest ritual requires every summoned witness to receive a genuine opportunity to leave. A later hand replaced the clause with compulsory purification language.', {
        clueCategory: 'historical', discoveryRewards: { items: [['riteOfFinalRefusal', 1]], xp: { spirit: 12 } }
      })
  );

  // Convert reusable major-structure evidence into canonically layered clues.
  const updates = {
    chapelCrackedAltar: ['missingRelicSocket', 'Missing Relic Socket', 'The stolen relic fits a socket aligned with the blocked ninth station, not with the modern altar. It was important before the Chapel became a religious building.'],
    chapelConfessionDevice: ['avarranPublicWitnessDevice', 'Avarran Public Witness Device', 'The device once amplified public testimony. Covenant renovations redirected it toward private confession and purification without changing its foundation.'],
    chapelLedger: ['archiveOpenedBeforeBattle', 'Archive Cabinet Opened Early', 'The oldest cabinet was unlocked before the south breach. Its Covenant seal is genuine; its missing index page was removed months earlier.'],
    chapelSealedStair: ['misalignedLowerDoor', 'Misaligned Lower Door', 'The sealed doorway does not align with the Chapel above. Measurements leave one unexplained chamber between it and the altar.'],
    act1ChapelBurnedIndex: ['removedNameIndex', 'Half-Burned Archive Index', 'Modern sermons burned in the raid. The surviving older index repeats one carefully blank entry wherever a witness was offered the right to refuse.']
  };
  for (const [objectId, [clueId, name, message]] of Object.entries(updates)) {
    const object = objects.find(entry => entry.id === objectId);
    if (object) Object.assign(object, { poiId: 'brokenChapel', clueId, name, message, clueCategory: 'historical', hideLabel: true });
  }

  for (const enemy of enemies) {
    if (enemy?.majorPoiId === 'brokenChapel' || enemy?.id === 'lastDawnArchiveBurner') {
      enemy.poiStateCondition = { requiresPoiUnresolved: 'brokenChapel' };
    }
  }

  enemies.push(makeEnemy('gravePriest', 'chapelUnnamedWitness', 'The Unnamed Witness', 445, 63, {
    tier: 5, ...scaleEnemyStats('gravePriest', 5), isBoss: true, bossId: 'chapelUnnamedWitness',
    majorPoiId: 'brokenChapel', awakened: false, alerted: false, baseAggroRange: 95, aggroRange: 95, regeneration: 5,
    poiStateCondition: { requiresPoiUnresolved: 'brokenChapel' },
    poiKnowledgeRules: [
      { id: 'restoreName', poiId: 'brokenChapel', clueId: 'rightOfFinalRefusal', hpMultiplier: 0.82, status: 'Missing name restored' },
      { id: 'divideEchoes', poiId: 'brokenChapel', clueId: 'contradictoryHealerEcho', hpMultiplier: 0.86, disableRegeneration: true, status: 'Component Echoes divided' },
      { id: 'restrainWithLantern', poiId: 'brokenChapel', clueId: 'damagedPurificationLantern', damageMultiplier: 0.88, status: 'Lantern cadence restrains attacks' }
    ]
  }));

  // Permanent outcomes and the witness required by the Consequence stage.
  objects.push(
    prop('chapelSanctuaryLantern', 'purificationBrazier', 445, 66, { scale: 1.05, poiStateCondition: { poiId: 'brokenChapel', resolutionAny: ['covenantSanctuary'] } }),
    prop('chapelSanctuaryCot', 'infirmaryCot', 438, 78, { scale: 0.82, poiStateCondition: { poiId: 'brokenChapel', resolutionAny: ['covenantSanctuary'] } }),
    prop('chapelSanctuarySupplies', 'medicineCrates', 441, 79, { scale: 0.85, poiStateCondition: { poiId: 'brokenChapel', resolutionAny: ['covenantSanctuary'] } }),
    makeObject('shrine', 'chapelSanctuaryService', 'Restored Chapel Sanctuary', 445, 69, { r: 24, poiStateCondition: { poiId: 'brokenChapel', resolutionAny: ['covenantSanctuary'] } }),
    outcomeWitness('chapelSanctuaryWitness', 'Sister Elyra', 440, 75, 'Elyra: "The road has medicine again. The sealed chamber remains our responsibility, not proof that every silence was righteous."', 'covenantSanctuary', { factionId: 'covenantOfLight' }),

    prop('chapelArchiveSeal', 'blockedAlcove', 445, 61, { scale: 1.05, poiStateCondition: { poiId: 'brokenChapel', resolutionAny: ['sealedArchive'] } }),
    prop('chapelArchiveEcho1', 'echoFragment', 441, 65, { phase: 3, poiStateCondition: { poiId: 'brokenChapel', resolutionAny: ['sealedArchive'] } }),
    prop('chapelArchiveEcho2', 'echoFragment', 449, 65, { phase: 7, poiStateCondition: { poiId: 'brokenChapel', resolutionAny: ['sealedArchive'] } }),
    outcomeWitness('chapelArchiveWitness', 'Independent Archivist', 441, 76, 'Archivist: "The testimony survives. So do the unstable Echoes around it. Pilgrims must shelter elsewhere."', 'sealedArchive'),

    prop('chapelLastDawnBanner', 'banner', 451, 66, { color: '#71333b', scale: 1.0, poiStateCondition: { poiId: 'brokenChapel', resolutionAny: ['lastDawnCache'] } }),
    makeObject('worldCache', 'chapelLastDawnWorldCache', 'Last Dawn Chapel Cache', 454, 68, { rewards: [['cultAsh', 2], ['ironScrap', 2]], xp: 30, poiStateCondition: { poiId: 'brokenChapel', resolutionAny: ['lastDawnCache'] } }),
    outcomeWitness('chapelLastDawnWitness', 'Order Lookout', 452, 72, 'Order Lookout: "Rusk kept his bargain. That does not make the graves forgive him—or you."', 'lastDawnCache', { factionId: 'lastDawn', disposition: 'uncertain' }),

    prop('chapelRestoredOathStone', 'avarranOathStone', 440, 65, { restored: true, scale: 1.05, poiStateCondition: { poiId: 'brokenChapel', resolutionAny: ['restoredCemetery'] } }),
    prop('chapelRestoredMemorial', 'memorialStone', 431, 72, { scale: 1.0, poiStateCondition: { poiId: 'brokenChapel', resolutionAny: ['restoredCemetery'] } }),
    outcomeWitness('chapelRestoredNamesWitness', 'Chapel Caretaker', 437, 76, 'Caretaker: "The bell is quiet because nobody is being compelled to testify. We remember them without keeping them here."', 'restoredCemetery', { factionId: 'chapel' }),

    prop('chapelCollapsePit1', 'burnPit', 445, 63, { scale: 1.35, poiStateCondition: { poiId: 'brokenChapel', resolutionAny: ['collapsedFoundation'] } }),
    makeDecorObject('brokenWall', 'chapelCollapseRubble1', 'Collapsed Foundation', 441, 64, { scale: 1.4, poiStateCondition: { poiId: 'brokenChapel', resolutionAny: ['collapsedFoundation'] } }),
    makeDecorObject('brokenWall', 'chapelCollapseRubble2', 'Collapsed Foundation', 449, 64, { scale: 1.35, poiStateCondition: { poiId: 'brokenChapel', resolutionAny: ['collapsedFoundation'] } }),
    outcomeWitness('chapelCollapseWitness', 'Road Evacuation Warden', 438, 79, 'Warden: "Everyone living got out. Whatever answers were below are part of the rubble now. That was the price you chose."', 'collapsedFoundation', { factionId: 'outpost' }),

    prop('chapelNeutralWitnessStone', 'avarranOathStone', 445, 67, { restored: true, scale: 1.15, poiStateCondition: { poiId: 'brokenChapel', resolutionAny: ['neutralMemorial'] } }),
    prop('chapelNeutralTent', 'quarantineTent', 437, 80, { scale: 0.78, poiStateCondition: { poiId: 'brokenChapel', resolutionAny: ['neutralMemorial'] } }),
    prop('chapelNeutralNotice', 'noticePapers', 442, 75, { scale: 0.9, poiStateCondition: { poiId: 'brokenChapel', resolutionAny: ['neutralMemorial'] } }),
    makeObject('campfire', 'chapelNeutralCampfire', 'Open Memorial Fire', 434, 82, { r: 20, poiStateCondition: { poiId: 'brokenChapel', resolutionAny: ['neutralMemorial'] } }),
    outcomeWitness('chapelNeutralWitness', 'Tomas Venn', 439, 78, 'Tomas: "This place belongs to the mourners and travelers now. Both factions call that temporary. We will need help proving otherwise."', 'neutralMemorial', { factionId: 'chapel' })
  );

  enemies.push(makeEnemy('gravebound', 'chapelArchiveInstability', 'Unstable Testimony Echo', 448, 68, {
    tier: 3, ...scaleEnemyStats('gravebound', 3),
    poiStateCondition: { poiId: 'brokenChapel', resolutionAny: ['sealedArchive'] }
  }));
}

function rebuildAshenOrchard(objects, enemies) {
  const prop = (id, propType, x, y, extra = {}) => makeDecorObject('townProp', id, propType, x, y, {
    propType, r: 0, interactable: false, hideLabel: true, drawRadius: 210, ...extra
  });
  const evidence = (id, name, x, y, message, extra = {}) => makeObject('poiInvestigation', id, name, x, y, {
    poiId: 'ashenOrchard', clueId: id, r: 17, message, labelPriority: 8,
    startsQuest: 'ashenOrchardLastHarvest', ...extra
  });
  const covenantNpc = (id, name, x, y, talk, extra = {}) => makeObject('npc', id, name, x, y, {
    npcId: id, factionId: 'covenantOfLight', disposition: 'friendly',
    shirt: '#eee6cf', pants: '#8e7b45', boots: '#40362a',
    ambientWander: true, wanderRadiusTiles: 1.25, wanderSpeed: 13,
    talk, ...extra
  });

  // Family orchard and evacuation story. Nothing here is random dressing: every
  // cluster answers who lived here, how quickly they left, or what the Rot changed.
  objects.push(
    prop('orchardTreeNorth1', 'diseasedOrchardTree', 107, 82, { scale: 0.95, phase: 1 }),
    prop('orchardTreeNorth2', 'diseasedOrchardTree', 112, 82, { scale: 1.08, phase: 3 }),
    prop('orchardTreeEast1', 'diseasedOrchardTree', 117, 85, { scale: 1.03, phase: 4 }),
    prop('orchardTreeEast2', 'diseasedOrchardTree', 119, 91, { scale: 0.92, phase: 6 }),
    prop('orchardTreeSouth1', 'diseasedOrchardTree', 113, 98, { scale: 1.06, phase: 8 }),
    prop('orchardTreeSouth2', 'diseasedOrchardTree', 108, 99, { scale: 0.9, phase: 10 }),
    prop('orchardHalfHarvestCart', 'harvestCart', 103, 97, { scale: 0.9 }),
    prop('orchardAbandonedToy', 'childToy', 100, 96, { scale: 0.88 }),
    prop('orchardPrayerRibbons', 'prayerRibbons', 105, 84, { scale: 0.95 }),
    prop('orchardDeadGoat', 'deadLivestock', 118, 95, { scale: 0.88 }),
    prop('orchardBlackChannelWest', 'rotIrrigation', 111, 95, { length: 5.4 }),
    prop('orchardBlackChannelEast', 'rotIrrigation', 117, 92, { length: 4.2, orientation: 'vertical' }),
    prop('orchardAncientSluice', 'ancientSluice', 119, 98, { scale: 0.9 }),
    makeDecorObject('townProp', 'orchardUnfinishedMeal', 'Unfinished Family Meal', 101, 94, {
      propType: 'contractTable', scale: 0.7, interactable: false, hideLabel: true
    }),

    // Covenant field response: triage, water, logistics, warding, quarantine, and burial.
    prop('orchardTriageTent1', 'quarantineTent', 98, 84, { scale: 0.82 }),
    prop('orchardTriageTent2', 'quarantineTent', 101, 81, { scale: 0.72 }),
    prop('orchardInfirmaryCot1', 'infirmaryCot', 99, 87, { scale: 0.7 }),
    prop('orchardInfirmaryCot2', 'infirmaryCot', 102, 86, { scale: 0.7 }),
    prop('orchardWashBasin1', 'washBasin', 96, 87, { scale: 0.68 }),
    prop('orchardReliefWagon', 'sickWagon', 96, 81, { scale: 0.78, clean: true }),
    prop('orchardSupplyCrates1', 'medicineCrates', 94, 84, { scale: 0.72 }),
    prop('orchardSupplyCrates2', 'medicineCrates', 95, 89, { scale: 0.68 }),
    prop('orchardQuarantineBell', 'warningBell', 103, 83, { scale: 0.72 }),
    prop('orchardOuterBrazierWest', 'purificationBrazier', 103, 89, { scale: 0.78 }),
    prop('orchardOuterBrazierSouth', 'purificationBrazier', 106, 97, { scale: 0.78 }),
    prop('orchardBurnPit', 'burnPit', 96, 94, { scale: 0.72 }),
    makeDecorObject('bone', 'orchardDeadHealer1', 'Fallen Relief Healer', 97, 91, { scale: 0.78, interactable: false }),
    makeDecorObject('bone', 'orchardDeadHealer2', 'Fallen Relief Healer', 98, 92, { scale: 0.72, interactable: false }),
    prop('orchardFreshGrave1', 'freshGrave', 93, 92, { scale: 0.7 }),
    prop('orchardFreshGrave2', 'freshGrave', 94, 94, { scale: 0.7 }),
    prop('orchardFreshGrave3', 'freshGrave', 95, 96, { scale: 0.7 }),
    prop('orchardQuarantineFence1', 'barricade', 103, 92, { scale: 0.72, orientation: 'vertical' }),
    prop('orchardQuarantineMarker', 'plagueMarker', 101, 91, { scale: 0.72 }),

    covenantNpc('orchardFieldPhysician', 'Physician Ilyen Vale', 99, 85,
      'Physician Vale: "Speak while you wash. We have more patients than hands and more theories than clean water."', {
        dialogueId: 'orchardPhysicianDialogue', ambientWander: false, role: 'fieldPhysician'
      }),
    covenantNpc('orchardCovenantHealer', 'Covenant Healer', 100, 87,
      'Healer: "Hold the lantern closer. If the black reaches the nail bed, mark the cot and call Vale."', { role: 'healer' }),
    covenantNpc('orchardWardingPriest', 'Covenant Warding Priest', 104, 90,
      'Warding Priest: "The prayer is sound. The ground beneath it is answering in the wrong order."', { role: 'priest' }),
    covenantNpc('orchardReliefEngineer', 'Relief Engineer', 115, 94,
      'Engineer: "The farm channels are four generations old. The stone sluice below them is not—and somehow it is older."', { role: 'engineer' }),
    covenantNpc('orchardVolunteer', 'Orrakai Volunteer', 95, 85,
      'Volunteer: "Clean linen goes east. Burn cloth goes south. If you forget, ask. If you guess, someone dies."', { role: 'volunteer' }),
    covenantNpc('orchardWarden', 'Covenant Relief Warden', 102, 92,
      'Relief Warden: "White rope is quarantine, not a prison. Families cross together when Vale clears them."', { role: 'warden' }),
    makeObject('npc', 'orchardEvacuatedParent', 'Orchard Parent', 98, 89, {
      npcId: 'orchardEvacuatedParent', disposition: 'fearful', ambientWander: false,
      talk: 'Orchard Parent: "My daughter left her horse by the cart. Tell her we found it. Do not tell her what grew through the kitchen."'
    }),

    // Investigation chain: domestic loss -> medical failure -> sabotage -> older contradiction.
    evidence('familyTable', 'The Verran Family Table', 101, 94,
      'Four bowls remain set. One still contains a spoon. The family fled between serving supper and taking the first bite.', {
        clueCategory: 'family', discoveryRewards: { xp: { renown: 6 } },
        companionReactions: { bram: 'Bram: "Nobody leaves food unless the danger arrives faster than fear."' }
      }),
    evidence('childsToy', 'Mira Verran\'s Wooden Horse', 100, 96,
      'MIRA is carved beneath one wheel. The quarantine register lists her alive among the children moved to Orrakai.', {
        clueCategory: 'family', companionReactions: { mara: 'Mara: "Keep her name with it. Objects survive evacuations more easily than children do."' }
      }),
    evidence('freshGraves', 'Three Fresh Field Graves', 94, 94,
      'The Covenant buried its own dead beside orchard workers. Every marker has a name, an hour, and the healer who confirmed it.', {
        clueCategory: 'relief', companionReactions: { dusk: 'Dusk: "Named, witnessed, separated from the burn pit. Someone here still understands the dignity of death."' }
      }),
    evidence('deadHealers', 'Murdered Relief Healers', 97, 91,
      'Two healers died from narrow blades before the Rot reached them. Their medicine satchels were cut away, but their coin was left.', {
        clueCategory: 'sabotage', companionReactions: { elian: 'Sister Elian: "They died treating strangers. Whatever banner killed them, remember the work they chose."' }
      }),
    evidence('burnedLedger', 'Half-Burned Patient Ledger', 96, 94,
      'The fire targeted admission times and water-source notes. A final unburned line reads: symptoms began upstream, before the Order raid.', {
        clueCategory: 'sabotage', discoveryRewards: { items: [['preservedOrchardTestimony', 1]], xp: { spirit: 8 } }
      }),
    evidence('lastDawnSatchel', 'Last Dawn Field Satchel', 120, 87,
      'A genuine Last Dawn seal closes the satchel. Inside, the sabotage orders are overwritten by a warning: DO NOT OPEN THE NINTH SLUICE. No ninth control is visible.', {
        clueCategory: 'sabotage', discoveryRewards: { items: [['lastDawnCipherScrap', 1]] },
        identityInsights: [
          { raceAny: ['cambion'], message: 'The scorched correction carries binding heat, but it was written to restrain something—not summon it.' },
          { classAny: ['fellhunter'], message: 'The boot-scuffs show the satchel was planted after its owner fled by the north wall.' }
        ]
      }),
    evidence('blackIrrigation', 'Blackened Irrigation Water', 115, 94,
      'The Rot travels against the surface current in slow pulses. Dead insects drift downstream; the black threads beneath them climb toward the sluice.', {
        clueCategory: 'rot', identityInsights: [
          { classAny: ['waverider'], message: 'Two currents occupy the channel: farm water above and a pressured ancient flow below.' },
          { raceAny: ['human'], message: 'The newer repair mortar is untouched. Only the oldest stone feeds the black thread.' }
        ]
      }),
    evidence('rootPulse', 'Listening Root', 114, 92,
      'The root tightens when the purification braziers flare, then relaxes in the silence between prayers. It is reacting, not merely growing.', {
        clueCategory: 'rot', identityInsights: [
          { classAny: ['thornbinder'], message: 'A clean sapline remains alive inside the black bark. The tree is sick, not wholly claimed.' },
          { raceAny: ['vampire'], message: 'The pulse follows stored blood in the soil rather than sunlight or rain.' }
        ]
      }),
    evidence('ancientSluice', 'Buried Stone Sluice', 119, 98,
      'Eight worn control marks ring an empty ninth space. The farm channels were built around this structure by people who did not know what it was.', {
        clueCategory: 'ancient', discoveryRewards: { items: [['preVeilingSluiceMap', 1]], xp: { runecraft: 10 } }
      }),
    evidence('missingFoundation', 'Impossible Foundation Seam', 111, 91,
      'The buried floor continues beneath a wall without crossing its foundation. Measurements disagree by exactly one chamber, as though the room were removed from the plan but not reality.', {
        clueCategory: 'ancient', identityInsights: [
          { raceAny: ['nephilim'], message: 'Eight harmonics answer your presence. A ninth resonance is not silent; it has been cut out.' },
          { classAny: ['lightbringer'], message: 'Your radiance bends around one portion of blank stone instead of touching it.' }
        ]
      }),
    evidence('keeperHeart', 'Split Root-Heart', 113, 87,
      'The Orchard Keeper is fed by two root bundles: one from the diseased trees, one descending through the ancient floor. Severing either would weaken it.', {
        clueCategory: 'boss', discoveryRewards: { xp: { blade: 10, archery: 10 } },
        companionReactions: { mara: 'Mara: "Good. Knowledge is preparation. Cut the older feeder first and the creature loses its borrowed strength."' }
      })
  );

  const purificationSlate = objects.find(object => object.id === 'act1OrchardPurificationRecord');
  if (purificationSlate) Object.assign(purificationSlate, {
    poiId: 'ashenOrchard', clueId: 'purificationSlate', startsQuest: 'ashenOrchardLastHarvest',
    clueCategory: 'relief',
    message: 'The field slate records correct incense, clean water, full prayer cadence, and a successful outer burn. The inner failure began only when the braziers aligned over the buried floor.',
    identityInsights: [{ classAny: ['oathkeeper'], message: 'Every oath response is present and properly witnessed. This was not a failure of discipline or faith.' }],
    discoveryRewards: { items: [['orchardWhitewashFormula', 1]], xp: { warding: 8 } }
  });

  const orchardKeeper = enemies.find(enemy => enemy.id === 'ashenOrchardKeeper');
  if (orchardKeeper) orchardKeeper.poiKnowledgeWeakness = {
    poiId: 'ashenOrchard', clueId: 'keeperHeart', hpMultiplier: 0.82, damageMultiplier: 0.9
  };

  // Outcome-specific returns make the choice spatially legible without a recap screen.
  objects.push(
    prop('orchardAfterBurnMemorial', 'memorialStone', 110, 90, {
      poiStateCondition: { poiId: 'ashenOrchard', resolutionAny: ['evacuateAndBurn'] }
    }),
    prop('orchardAfterLivingTree', 'diseasedOrchardTree', 110, 90, {
      restored: true, scale: 1.15, poiStateCondition: { poiId: 'ashenOrchard', resolutionAny: ['livingRootGraft'] }
    }),
    prop('orchardAfterTestimony', 'prayerRibbons', 96, 93, {
      scale: 1.2, poiStateCondition: { poiId: 'ashenOrchard', resolutionAny: ['testimonyOfDead'] }
    }),
    prop('orchardAfterCleanChannel', 'rotIrrigation', 113, 95, {
      cleansed: true, length: 7, poiStateCondition: { poiId: 'ashenOrchard', resolutionAny: ['irrigationDiversion'] }
    }),
    prop('orchardAfterLitSluice', 'ancientSluice', 111, 91, {
      lit: true, poiStateCondition: { poiId: 'ashenOrchard', resolutionAny: ['radiantFoundationSeal'] }
    }),
    prop('orchardAfterContainment', 'barricade', 108, 94, {
      scale: 1.1, poiStateCondition: { poiId: 'ashenOrchard', resolutionAny: ['oathboundContainment'] }
    }),
    prop('orchardAfterBargainMedicine', 'medicineCrates', 100, 88, {
      scale: 1.05, poiStateCondition: { poiId: 'ashenOrchard', resolutionAny: ['lastDawnBargain'] }
    }),
    makeObject('dungeonEntrance', 'orchardSluiceShortcut', 'Ancient Sluice Descent', 119, 99, {
      poiId: 'ashenOrchard', dungeonId: 'ashenOrchard', seed: 'ashen-orchard-cellar-01', r: 22,
      theme: 'grave', structureArchetype: 'crypt', structureVariant: 'haunted',
      structureImportance: 'named', depth: 1, tier: 1, recommendedLevel: 3,
      talk: 'The recovered rubbing reveals a maintenance descent that bypasses the root-choked front stair.',
      poiStateCondition: { poiId: 'ashenOrchard', requiresPoiClues: ['ancientSluice'] }
    })
  );

  // The obvious suspects remain dangerous, but their placement and notes permit doubt.
  enemies.push(
    makeEnemy('cultist', 'orchardLastDawnSaboteur', 'Last Dawn Saboteur', 121, 85, {
      tier: 3, factionId: 'orderOfTheLastDawn', alerted: false, aggro: 2.4
    }),
    makeEnemy('basicBeast', 'orchardRotBoar', 'Rot-Sick Orchard Boar', 118, 89, {
      tier: 2, awakened: true, alerted: false, aggro: 2.2
    })
  );
}

// Canonical Act I environmental layer. It uses existing paths and encounters,
// but gives the journey a readable gradient: relief, containment, failure,
// deliberate Last Dawn sabotage, and finally Rot-entangled Divine Age ruins.
function addCanonicalActOneWorldStory(objects, enemies) {
  const prop = (id, propType, x, y, extra = {}) => makeDecorObject('townProp', id, propType, x, y, {
    propType, r: 0, interactable: false, hideLabel: true, drawRadius: 180, ...extra
  });
  const evidence = (id, name, x, y, message) => makeObject('poiInvestigation', id, name, x, y, {
    r: 18, message, labelPriority: 7
  });
  const fieldNpc = (id, name, x, y, talk, extra = {}) => makeObject('npc', id, name, x, y, {
    npcId: id, factionId: 'covenantOfLight', disposition: 'friendly',
    shirt: '#eee6cf', pants: '#8e7b45', boots: '#40362a',
    ambientWander: true, wanderRadiusTiles: 2.2, wanderSpeed: 15,
    talk, ...extra
  });

  objects.push(
    // Near Orrakai: intact systems and early warnings.
    prop('act1ReliefWagonNearRoad', 'sickWagon', 31, 31, { clean: true, scale: 0.86 }),
    prop('act1MedicineNearRoad', 'medicineCrates', 34, 30, { scale: 0.8 }),
    prop('act1RoadPurificationBrazier', 'purificationBrazier', 36, 31, { scale: 0.82 }),
    prop('act1EarlyPlagueMarker', 'plagueMarker', 51, 31, { scale: 0.85 }),
    fieldNpc('covenantRoadPhysician', 'Covenant Road Physician', 33, 32,
      'Road Physician: "Healthy travelers take the chalked road. Fever takes the white rope. No one is refused water."'),
    evidence('act1RefugeeFootprints', 'Refugee Footprints', 55, 35,
      'Adult prints keep to the road. Smaller prints repeatedly leave it to circle trees marked with fresh Rot warnings.'),

    // Blighted Road: containment is active, but the ecology is changing.
    prop('act1HollowRoadTent', 'quarantineTent', 74, 55, { scale: 0.85 }),
    prop('act1HollowRoadCot', 'infirmaryCot', 77, 54, { scale: 0.78 }),
    prop('act1HollowRoadBell', 'warningBell', 79, 52, { scale: 0.82 }),
    makeDecorObject('bone', 'act1FirstDeadDeer', 'Dead Road Deer', 87, 58, { scale: 1.1, interactable: false }),
    makeDecorObject('deadRoot', 'act1FirstBlackRoot', 'Blackened Root', 91, 61, { scale: 1.2, interactable: false }),
    fieldNpc('covenantRoadScout', 'Covenant Relief Scout', 76, 52,
      'Relief Scout: "The roots crossed the old road in a single night. They stop at new stone and return beneath anything older."'),
    evidence('act1RootsUnderRoad', 'Roots Beneath the Milestone', 92, 61,
      'The black roots ignore fresh roadwork. Every strand bends toward a buried block carved in an unknown Divine Age hand.'),

    // Ashen Orchard: purification held at the perimeter and failed at the old foundation.
    prop('act1OrchardBrazier1', 'purificationBrazier', 105, 86, { scale: 0.9 }),
    prop('act1OrchardBrazier2', 'purificationBrazier', 114, 86, { scale: 0.9 }),
    prop('act1OrchardBrokenCrates', 'medicineCrates', 117, 93, { scale: 0.82 }),
    makeDecorObject('deadRoot', 'act1OrchardBlackRoot1', 'Rot-Black Root', 108, 94, { scale: 1.35 }),
    makeDecorObject('deadRoot', 'act1OrchardBlackRoot2', 'Rot-Black Root', 114, 96, { scale: 1.5 }),
    evidence('act1OrchardPurificationRecord', 'Purification Slate', 105, 88,
      'The Covenant slate records clean water, correct incense, and a successful outer burn. The inner roots returned from beneath an older floor.'),

    // Pilgrim Bridge: a medical convoy destroyed by people, not the Rot.
    prop('act1BridgeWreckedWagon', 'sickWagon', 245, 104, { scale: 1.02 }),
    prop('act1BridgeScatteredMedicine', 'medicineCrates', 242, 106, { scale: 0.95 }),
    prop('act1BridgeBarricade', 'barricade', 248, 106, { scale: 0.95, orientation: 'diagonalRight' }),
    makeDecorObject('campfire', 'act1BridgeBurnedRecords', 'Burned Records', 246, 108, { scale: 0.72 }),
    evidence('act1BridgeRedSealEvidence', 'Red-Sealed Arrow', 249, 103,
      'The arrow bears the Last Dawn seal. Medicine remains scattered and untouched; only the convoy archive and relic case are missing.'),
    fieldNpc('covenantConvoySurvivor', 'Wounded Covenant Courier', 243, 102,
      'Courier: "They cut the traces, burned the patient rolls, and asked where we kept artifacts from Zarynth. They never asked for coin."', {
        disposition: 'fearful', ambientWander: false
      }),

    // Broken Chapel: sabotage and the deliberate destruction of history.
    prop('act1ChapelFailedBrazier', 'purificationBrazier', 439, 77, { scale: 1.05 }),
    prop('act1ChapelBurnPit', 'burnPit', 448, 77, { scale: 0.92 }),
    makeDecorObject('brokenWall', 'act1ChapelBrokenArchive', 'Broken Archive Wall', 442, 74, { scale: 1.1 }),
    evidence('act1ChapelBurnedIndex', 'Half-Burned Archive Index', 447, 74,
      'The Last Dawn burned every modern sermon. The surviving half of the index lists sealed testimonies from beings alive during the Divine War.'),

    // Last Dawn Keep: the Rot and the ancient construction have become inseparable.
    prop('act1KeepOrderBanner1', 'banner', 552, 386, { color: '#7a2e35', scale: 1.05 }),
    prop('act1KeepOrderBanner2', 'banner', 568, 386, { color: '#7a2e35', scale: 1.05 }),
    makeDecorObject('deadRoot', 'act1KeepRotRoot1', 'Ancient Rot Root', 555, 393, { scale: 1.7 }),
    makeDecorObject('deadRoot', 'act1KeepRotRoot2', 'Ancient Rot Root', 565, 396, { scale: 1.8 }),
    evidence('act1KeepSummoningPlan', 'Last Dawn Summoning Plan', 558, 388,
      'The diagram names Malakar as WITNESS and PRISONER. The word GOD is crossed out three times beside a sketch of Seraphel.'),
    evidence('act1KeepAncientFoundation', 'Divine Age Foundation', 563, 394,
      'Rot veins enter the old foundation without cracking it, as though the stone were built to carry them.')
  );

  const orderRaiders = [
    ['lastDawnBridgeSaboteur', 'Last Dawn Saboteur', 252, 106, 'demonCultist', 2],
    ['lastDawnArchiveBurner', 'Last Dawn Archive-Burner', 451, 78, 'cultist', 3],
    ['lastDawnReliquaryGuard1', 'Last Dawn Reliquary Guard', 553, 389, 'demonCultist', 4],
    ['lastDawnReliquaryGuard2', 'Last Dawn Reliquary Guard', 567, 392, 'cultist', 4]
  ];
  for (const [id, name, x, y, kind, tier] of orderRaiders) {
    enemies.push(makeEnemy(kind, id, name, x, y, {
      tier, ...scaleEnemyStats(kind, tier), factionId: 'lastDawn', guardRole: 'sabotagePatrol'
    }));
  }
}

// -----------------------------------------------------------------------------
// EXPANDED ACT I LAYOUT
// -----------------------------------------------------------------------------

function spreadExpandedActOneContent(objects, enemies) {
  const zones = [
    { from: [306, 184], to: ACT1_LANDMARKS.demonCultLair, radius: 28 },
    { from: [282, 205], to: ACT1_LANDMARKS.oldHollow, radius: 28 },
    { from: [272, 132], to: ACT1_LANDMARKS.watcherRidge, radius: 23 },
    { from: [245, 118], to: ACT1_LANDMARKS.hunterCamp, radius: 25 },
    { from: [292, 52], to: ACT1_LANDMARKS.castleVeyr, radius: 27 },
    { from: [239, 49], to: ACT1_LANDMARKS.brokenChapel, radius: 32 },
    { from: [184, 79], to: ACT1_LANDMARKS.pilgrimBridge, radius: 22 },
    { from: [151, 43], to: ACT1_LANDMARKS.hungryShrine, radius: 26 },
    { from: [121, 76], to: ACT1_LANDMARKS.ashenOrchard, radius: 25 },
    { from: [90, 158], to: ACT1_LANDMARKS.mirrorGrove, radius: 23 },
    { from: [58, 124], to: ACT1_LANDMARKS.thornrootHollow, radius: 27 },
    { from: [101, 211], to: ACT1_LANDMARKS.saltwellCamp, radius: 18 },
    { from: [178, 198], to: ACT1_LANDMARKS.lanternMarsh, radius: 21 },
    { from: [208, 203], to: ACT1_LANDMARKS.ironMire, radius: 27 }
  ];

  for (const entity of [...objects, ...enemies]) {
    if (!entity || !Number.isFinite(entity.x) || !Number.isFinite(entity.y)) continue;

    for (const zone of zones) {
      if (!pointIsWithinTileRadius(entity, zone.from, zone.radius)) continue;

      moveEntityByTiles(entity, zone.to[0] - zone.from[0], zone.to[1] - zone.from[1]);
      break;
    }
  }

  const routeGate = objects.find(object => object?.id === 'hearthmere-pilgrim-road-gate');
  setEntityTile(routeGate, ACT1_LANDMARKS.pilgrimRoadGate[0], ACT1_LANDMARKS.pilgrimRoadGate[1]);
}

function pinQuestGiversToRelevantEntrances(objects) {
  const placements = {
    hollowPilgrim: offset(ACT1_LANDMARKS.ashenOrchard, -4, -2),
    sableCartographer: offset(ACT1_LANDMARKS.pilgrimBridge, -4, -2),
    chapelHermit: offset(ACT1_LANDMARKS.brokenChapel, -5, 4),
    sisterElyra: offset(ACT1_LANDMARKS.brokenChapel, -3, 4),
    lordVeyrShade: offset(ACT1_LANDMARKS.castleVeyr, -5, 4),
    thornboundSeer: offset(ACT1_LANDMARKS.thornrootHollow, -4, -2),
    fenrickSalt: offset(ACT1_LANDMARKS.saltwellCamp, -3, -2),
    lumenSable: offset(ACT1_LANDMARKS.lanternMarsh, -4, -2),
    mireWidow: offset(ACT1_LANDMARKS.lanternMarsh, 3, -2),
    mineDrifter: offset(ACT1_LANDMARKS.ironMire, -4, -2),
    hunterScout: offset(ACT1_LANDMARKS.hunterCamp, -4, -2),
    roadlessCaptain: offset(ACT1_LANDMARKS.hunterCamp, 6, 4),
    watcherIvo: offset(ACT1_LANDMARKS.watcherRidge, -4, -2),
    repentantCultist: offset(ACT1_LANDMARKS.demonCultLair, -6, -4),
    emberVeilAcolyte: offset(ACT1_LANDMARKS.demonCultLair, 6, -3)
  };

  for (const object of objects) {
    const tile = placements[object?.id];
    if (tile) setEntityTile(object, tile[0], tile[1]);
  }
}

function addExpandedRoadSignposts(objects) {
  const signs = [
    ['north-road-sign', 'Chapel Road', 74, 55],
    ['pilgrim-crossroads-sign', 'Pilgrim Crossroads', 250, 108],
    ['eastern-road-sign', 'Hunter Reach Road', 350, 135],
    ['southern-road-sign', 'South Fen Road', 74, 150],
    ['riverlands-road-sign', 'Riverlands Road', 112, 252],
    ['mire-crossroads-sign', 'Iron Mire Crossroads', 245, 325],
    ['hollow-road-sign', 'Old Blighted Road', 385, 332],
    ['red-seal-road-sign', 'Last Dawn Road', 520, 350]
  ];

  for (const [id, name, x, y] of signs) {
    objects.push(makeDecorObject('signpost', id, name, x, y, {
      scale: 0.92,
      forceLabel: true,
      labelPriority: 4
    }));
  }
}

function pointIsWithinTileRadius(entity, tile, radius) {
  const tileX = entity.x / TILE - 0.5;
  const tileY = entity.y / TILE - 0.5;
  return Math.hypot(tileX - tile[0], tileY - tile[1]) <= radius;
}

function moveEntityByTiles(entity, dx, dy) {
  entity.x += dx * TILE;
  entity.y += dy * TILE;
  if (Number.isFinite(entity.spawnX)) entity.spawnX += dx * TILE;
  if (Number.isFinite(entity.spawnY)) entity.spawnY += dy * TILE;
  if (Number.isFinite(entity.homeX)) entity.homeX += dx * TILE;
  if (Number.isFinite(entity.homeY)) entity.homeY += dy * TILE;
}

function setEntityTile(entity, tileX, tileY) {
  if (!entity) return;
  entity.x = tileX * TILE + TILE / 2;
  entity.y = tileY * TILE + TILE / 2;
  if (Number.isFinite(entity.spawnX)) entity.spawnX = entity.x;
  if (Number.isFinite(entity.spawnY)) entity.spawnY = entity.y;
  if (Number.isFinite(entity.homeX)) entity.homeX = entity.x;
  if (Number.isFinite(entity.homeY)) entity.homeY = entity.y;
}

function offset(point, dx, dy) {
  return [point[0] + dx, point[1] + dy];
}

// -----------------------------------------------------------------------------
// LANDMARK / POI DRESSING
// -----------------------------------------------------------------------------

function addExpandedLandmarkDressing(objects) {
  // Ashen Orchard - a corrupted farm/orchard between the outpost and gravefields.
  objects.push(makeDecorObject('deadRoot', 'ashen-orchard-root-1', 'Ashen Orchard Root', 116, 69, { scale: 1.25 }));
  objects.push(makeDecorObject('deadRoot', 'ashen-orchard-root-2', 'Ashen Orchard Root', 123, 74, { scale: 1.05 }));
  objects.push(makeDecorObject('stump', 'ashen-orchard-stump-1', 'Burned Stump', 118, 78, { scale: 0.9 }));
  objects.push(makeDecorObject('graveMarker', 'ashen-orchard-marker-1', 'Field Grave', 126, 70, { scale: 0.8 }));
  objects.push(makeDecorObject('brokenWall', 'ashen-orchard-wall-1', 'Collapsed Orchard Wall', 113, 75, {
    scale: 0.92,
    orientation: 'horizontal'
  }));

  // Pilgrim Bridge - narrative crossing on the road to the chapel.
  objects.push(makeDecorObject('signpost', 'pilgrim-bridge-sign', 'Pilgrim Bridge Sign', 181, 76, { scale: 0.9 }));
  objects.push(makeDecorObject('brokenWall', 'pilgrim-bridge-wall-1', 'Old Bridge Stone', 178, 80, { scale: 0.85 }));
  objects.push(makeDecorObject('brokenWall', 'pilgrim-bridge-wall-2', 'Old Bridge Stone', 187, 78, { scale: 0.85 }));
  objects.push(makeDecorObject('ruinPillar', 'pilgrim-bridge-pillar-1', 'Pilgrim Pillar', 183, 73, { scale: 0.8 }));

  // Lantern Marsh - safer rest area inside Iron Mire.
  objects.push(makeDecorObject('signpost', 'lantern-marsh-sign', 'Lantern Marsh Sign', 176, 194, { scale: 0.88 }));
  objects.push(makeDecorObject('smallBoulder', 'lantern-marsh-stone-1', 'Wet Stone', 172, 198, { scale: 0.92, dark: true }));
  objects.push(makeDecorObject('smallBoulder', 'lantern-marsh-stone-2', 'Wet Stone', 183, 202, { scale: 0.82, dark: true }));
  objects.push(makeDecorObject('deadRoot', 'lantern-marsh-root-1', 'Marsh Root', 180, 198, { scale: 1.0 }));
  objects.push(makeDecorObject('shrub', 'lantern-marsh-reed-1', 'Lantern Reed', 174, 191, { scale: 1.05 }));

  // Mirror Grove - strange quiet forest shrine.
  objects.push(makeDecorObject('treeCluster', 'mirror-grove-tree-1', 'Mirror Grove Trees', 86, 151, { scale: 1.18 }));
  objects.push(makeDecorObject('treeCluster', 'mirror-grove-tree-2', 'Mirror Grove Trees', 94, 158, { scale: 1.05 }));
  objects.push(makeDecorObject('shrub', 'mirror-grove-shrub-1', 'Silver Shrub', 91, 151, { scale: 0.9 }));
  objects.push(makeDecorObject('graveMarker', 'mirror-grove-marker-1', 'Nameless Stone', 89, 162, { scale: 0.75 }));

  // Saltwell Camp - hunter/fishing stop in the riverlands.
  objects.push(makeDecorObject('signpost', 'saltwell-sign', 'Saltwell Camp Sign', 101, 211, { scale: 0.86 }));
  objects.push(makeDecorObject('stump', 'saltwell-stump-1', 'Camp Stump', 97, 214, { scale: 0.82 }));
  objects.push(makeDecorObject('shrub', 'saltwell-shrub-1', 'River Shrub', 106, 216, { scale: 0.92 }));

  // Watcher Ridge - dangerous highland encounter site.
  objects.push(makeDecorObject('ruinPillar', 'watcher-ridge-pillar-1', 'Watcher Pillar', 268, 128, { scale: 1.15 }));
  objects.push(makeDecorObject('ruinPillar', 'watcher-ridge-pillar-2', 'Watcher Pillar', 275, 132, { scale: 0.95 }));
  objects.push(makeDecorObject('brokenWall', 'watcher-ridge-wall-1', 'Ridge Wall', 271, 136, {
    scale: 1.0,
    orientation: 'horizontal'
  }));
}

// -----------------------------------------------------------------------------
// RESOURCES
// -----------------------------------------------------------------------------

function addExpandedResourceRoutes(objects) {
  // Early-game foraging loop north/east of the outpost.
  scatterObjects(objects, 'emberleaf', 'Emberleaf', 'exp-emberleaf-road', [
    [39, 44], [46, 49], [51, 54], [59, 58], [66, 64], [76, 69]
  ]);

  // Thornwood reagent loop.
  scatterObjects(objects, 'emberleaf', 'Wild Emberleaf', 'exp-emberleaf-thornwood', [
    [49, 111], [64, 116], [72, 129], [87, 143], [95, 154]
  ]);

  scatterObjects(objects, 'ashFruit', 'Ash Fruit Growth', 'exp-ash-fruit-orchard', [
    [108, 68], [114, 76], [122, 82], [132, 72], [139, 86]
  ]);

  scatterObjects(objects, 'gravecap', 'Pale Gravecap', 'exp-gravecap-thornwood', [
    [53, 132], [68, 140], [91, 166]
  ]);

  // Gravefield / chapel occult loop.
  scatterObjects(objects, 'gravecap', 'Ashen Gravecap', 'exp-gravecap-gravefields', [
    [131, 54], [147, 48], [166, 58], [196, 61], [225, 68], [252, 70]
  ]);

  // Iron Mire mining loop.
  scatterObjects(objects, 'ore', 'Black Iron Vein', 'exp-iron-mire-ore', [
    [151, 182], [162, 190], [179, 205], [192, 213], [211, 216]
  ]);

  // Riverland material loop.
  scatterObjects(objects, 'riverReed', 'River Reed', 'exp-river-reed', [
    [56, 197], [67, 209], [83, 218], [103, 221], [119, 215]
  ]);

  // Rare luminous moss for the hidden Nephilim bloodline and high-end rune craft.
  scatterObjects(objects, 'lanternMoss', 'Lantern Moss', 'exp-lantern-moss', [
    [181, 194], [186, 201], [265, 126], [273, 137], [238, 52], [245, 57]
  ]);

  // Make these slower so resource routes feel meaningful.
  for (const object of objects) {
    if (!object?.id?.startsWith('exp-')) continue;

    if (object.kind === 'ore') Object.assign(object, resourceRespawn(95));
    if (object.kind === 'gravecap') Object.assign(object, resourceRespawn(80));
    if (object.kind === 'emberleaf') Object.assign(object, resourceRespawn(55));
    if (object.kind === 'ashFruit') Object.assign(object, resourceRespawn(90));
    if (object.kind === 'riverReed') Object.assign(object, resourceRespawn(65));
    if (object.kind === 'lanternMoss') Object.assign(object, resourceRespawn(110));
  }
}

// -----------------------------------------------------------------------------
// NPCS / QUEST GIVERS / WORLD FLAVOR
// -----------------------------------------------------------------------------

function addExpandedRpgNpcs(objects) {
  objects.push(makeObject('npc', 'oldTarin', 'Old Tarin', 40, 45, {
    npcId: 'oldTarin',
    dialogueId: 'oldTarinIntro',
    factionId: 'outpost',
    disposition: 'friendly',
    role: 'roadGuide',
    talk: 'Old Tarin: "The safest path is never the shortest one."'
  }));

  objects.push(makeObject('npc', 'lumenSable', 'Lumen Sable', 181, 196, {
    npcId: 'lumenSable',
    dialogueId: 'lumenSableIntro',
    factionId: 'outpost',
    disposition: 'friendly',
    role: 'marshGuide',
    talk: 'Lumen Sable: "Follow the lanterns. Ignore anything that copies your voice."'
  }));

  objects.push(makeObject('npc', 'sableCartographer', 'Sable Cartographer', 182, 77, {
    npcId: 'sableCartographer',
    dialogueId: 'sableCartographerIntro',
    factionId: 'chapel',
    disposition: 'neutral',
    role: 'cartographer',
    talk: 'Sable Cartographer: "Every map of this place becomes wrong by morning."'
  }));

  objects.push(makeObject('npc', 'mireWidow', 'Mire Widow', 176, 201, {
    npcId: 'mireWidow',
    dialogueId: 'mireWidowIntro',
    factionId: 'gravecallers',
    disposition: 'uncertain',
    role: 'questGiver',
    classId: 'gravecaller',
    talk: 'Mire Widow: "Do not look into the water unless you are ready to be recognized."'
  }));

  objects.push(makeObject('npc', 'fenrickSalt', 'Fenrick Salt', 101, 211, {
    npcId: 'fenrickSalt',
    dialogueId: 'fenrickSaltIntro',
    factionId: 'outpost',
    disposition: 'friendly',
    role: 'fisher',
    talk: 'Fenrick Salt: "Fish bite better after a fight. Do not ask me why."'
  }));

  objects.push(makeObject('npc', 'hollowPilgrim', 'Blighted Pilgrim', 121, 74, {
    npcId: 'hollowPilgrim',
    dialogueId: 'hollowPilgrimIntro',
    factionId: 'chapel',
    disposition: 'uncertain',
    role: 'wanderingQuest',
    talk: 'Blighted Pilgrim: "I buried my name under the orchard. Something keeps digging it up."'
  }));

  objects.push(makeObject('npc', 'watcherIvo', 'Watcher Ivo', 264, 128, {
    npcId: 'watcherIvo',
    dialogueId: 'watcherIvoIntro',
    factionId: 'outpost',
    disposition: 'wounded',
    role: 'warningNpc',
    talk: 'Watcher Ivo: "Do not climb the ridge unless you want everything below to see you."'
  }));
}

// -----------------------------------------------------------------------------
// DUNGEON ENTRANCES / REST SITES / SHRINES
// -----------------------------------------------------------------------------

function addExpandedDungeonEntrances(objects) {
  objects.push(makeObject('dungeonEntrance', 'ashenOrchardCellarEntrance', 'Ashen Orchard Cellar', 121, 76, {
    r: 24,
    poiId: 'ashenOrchard',
    seed: 'ashen-orchard-cellar-01',
    theme: 'grave',
    structureArchetype: 'crypt',
    structureVariant: 'haunted',
    structureImportance: 'named',
    depth: 1,
    tier: 1,
    recommendedLevel: 3,
    talk: 'A root-choked cellar descends beneath the burned orchard.'
  }));

  objects.push(makeObject('dungeonEntrance', 'mirrorGroveUnderrootEntrance', 'Mirror Grove Underroot', 90, 158, {
    r: 24,
    poiId: 'mirrorGrove',
    seed: 'mirror-grove-underroot-01',
    theme: 'thorn',
    structureArchetype: 'hollow',
    structureVariant: 'forest',
    structureImportance: 'named',
    depth: 1,
    tier: 2,
    recommendedLevel: 6,
    talk: 'A living tunnel opens between roots polished smooth as glass.'
  }));

  objects.push(makeObject('dungeonEntrance', 'pilgrimCryptEntrance', 'Pilgrim Crypt', 184, 79, {
    r: 24,
    poiId: 'pilgrimBridge',
    seed: 'pilgrim-crypt-01',
    theme: 'grave',
    structureArchetype: 'crypt',
    structureVariant: 'haunted',
    structureImportance: 'named',
    depth: 2,
    tier: 2,
    recommendedLevel: 8,
    talk: 'A narrow stair vanishes beneath the bridge stones.'
  }));

  objects.push(makeObject('dungeonEntrance', 'watcherRidgeVaultEntrance', 'Watcher Ridge Vault', 272, 134, {
    r: 26,
    poiId: 'watcherRidge',
    seed: 'watcher-ridge-vault-01',
    theme: 'mine',
    structureArchetype: 'mine',
    structureVariant: 'ruined',
    structureImportance: 'named',
    depth: 2,
    tier: 3,
    recommendedLevel: 14,
    talk: 'A sealed vault hums under the ridge.'
  }));
}

function addExpandedAmbientWorldObjects(objects) {
  objects.push(makeObject('campfire', 'ashenOrchardCampfire', 'Ashen Orchard Campfire', 116, 72, { r: 18 }));
  objects.push(makeObject('campfire', 'lanternMarshCampfire', 'Lantern Marsh Campfire', 180, 196, { r: 18 }));
  objects.push(makeObject('campfire', 'saltwellCampfire', 'Saltwell Campfire', 101, 212, { r: 18 }));
  objects.push(makeObject('campfire', 'pilgrimBridgeCampfire', 'Pilgrim Bridge Campfire', 182, 76, { r: 18 }));

  objects.push(makeObject('shrine', 'mirrorGroveShrine', 'Mirror Grove Shrine', 90, 156, {
    r: 20,
    structureVariant: 'forest',
    structurePresentation: 'altar',
    structureScale: 0.82,
    structureLabelOffset: 45
  }));
  objects.push(makeObject('shrine', 'lanternMarshShrine', 'Lantern Marsh Shrine', 176, 198, {
    r: 20,
    structureVariant: 'swamp'
  }));
  objects.push(makeObject('shrine', 'watcherRidgeShrine', 'Watcher Ridge Shrine', 272, 131, {
    r: 20,
    structureVariant: 'ruined'
  }));
}

function addCapitalHubPrototype(objects) {
  const [orrakaiX, orrakaiY] = ACT1_LANDMARKS.outpost;

  objects.push(makeDecorObject('gothicCastle', 'capital-gate-prototype', 'Orrakai Town Gate', orrakaiX + 3, orrakaiY + 7, {
    kind: 'capitalGate',
    scale: 0.9,
    r: 30,
    forceLabel: true,
    labelPriority: 7,
    blocksMovement: false
  }));

  objects.push(makeObject('towerEntrance', 'infinite-tower-entrance', 'Infinite Tower', 44, 27, {
    r: 24,
    poiId: 'infiniteTower',
    forceLabel: true,
    labelPriority: 7,
    structureArchetype: 'tower',
    structureVariant: 'haunted',
    structureImportance: 'major',
    infiniteDungeonRegionId: 'hearthmereFrontier'
  }));

  objects.push(makeObject('sideZoneEntrance', 'hearthmere-hollow-grove', 'Blighted Grove', 76, 51, {
    r: 24,
    forceLabel: true,
    labelPriority: 7,
    sideZoneType: 'hollowGrove',
    regionId: 'hearthmereFrontier',
    theme: 'thorn',
    structureArchetype: 'hollow',
    structureVariant: 'forest',
    structureImportance: 'named',
    tier: 1
  }));

  objects.push(makeObject('sideZoneEntrance', 'hearthmere-abandoned-mine', 'Abandoned Mine', 166, 188, {
    r: 24,
    forceLabel: true,
    labelPriority: 7,
    sideZoneType: 'abandonedMine',
    regionId: 'hearthmereFrontier',
    theme: 'ruin',
    structureArchetype: 'mine',
    structureVariant: 'ruined',
    structureImportance: 'named',
    tier: 2
  }));

  objects.push(makeObject('travelRouteGate', 'hearthmere-pilgrim-road-gate', 'Pilgrim Road Expedition', 92, 18, {
    r: 28,
    forceLabel: true,
    labelPriority: 9,
    structureArchetype: 'fort',
    structureVariant: 'rural',
    structureImportance: 'major',
    routeId: 'pilgrimRoad'
  }));
}

function addOverworldActivityCaches(objects) {
  const caches = [
    {
      id: 'roadside-supply-cache',
      name: 'Roadside Supply Cache',
      x: 68,
      y: 66,
      majorPoiId: 'hollowRoadCache',
      rewards: [['fieldRations', 2], ['ashCoin', 18]],
      message: 'A travel cache tucked under loose stones. Someone expected the road to get worse.'
    },
    {
      id: 'hunter-reach-cache',
      name: 'Hunter Reach Cache',
      x: 247,
      y: 121,
      majorPoiId: 'hunterReachCache',
      rewards: [['ironScrap', 3], ['ashCoin', 35]],
      message: 'A marked hunter cache. The bowstring inside is ruined, but the supplies are good.'
    },
    {
      id: 'chapel-reliquary-cache',
      name: 'Broken Chapel Reliquary',
      x: 239,
      y: 53,
      majorPoiId: 'brokenChapelReliquary',
      rewards: [['arcaneDust', 2], ['paleEssence', 2]],
      color: '#b68cff',
      skill: 'runecraft',
      xp: 32,
      cursed: true,
      ambushTier: 2,
      ambushKinds: ['cultist', 'wraith', 'stalkerWolf'],
      message: 'The reliquary opens with a sigh of cold incense.'
    },
    {
      id: 'mirror-grove-offering-cache',
      name: 'Mirror Grove Offering',
      x: 94,
      y: 162,
      majorPoiId: 'mirrorGroveOffering',
      rewards: [['briarRoot', 2], ['shrineTonic', 1]],
      color: '#73d18a',
      skill: 'foraging',
      xp: 30,
      message: 'The offering bowl is full of roots that are still faintly warm.'
    },
    {
      id: 'red-seal-war-cache',
      name: 'Last Dawn War Cache',
      x: 299,
      y: 190,
      majorPoiId: 'redSealWarCache',
      rewards: [['redSealFragment', 1], ['bossCore', 1]],
      color: '#ef6f6c',
      skill: 'renown',
      xp: 55,
      cursed: true,
      ambushTier: 4,
      ambushKinds: ['cultist', 'exploder', 'brute'],
      message: 'Cult war spoils. Taking them feels like ringing a bell in the dark.'
    },
    {
      id: 'watcher-ridge-tower-cache',
      name: 'Watcher Ridge Tower Cache',
      x: 275,
      y: 128,
      majorPoiId: 'watcherRidgeCache',
      rewards: [['towerFragment', 1], ['lightstormWard', 1], ['paleRune', 1]],
      color: '#66f0ff',
      skill: 'renown',
      xp: 44,
      message: 'A tower-marked cache hums as your hand touches the latch.'
    }
  ];

  for (const cache of caches) {
    objects.push(makeObject('worldCache', cache.id, cache.name, cache.x, cache.y, {
      r: 18,
      forceLabel: true,
      labelPriority: 5,
      rewards: cache.rewards,
      majorPoiId: cache.majorPoiId,
      color: cache.color,
      skill: cache.skill,
      xp: cache.xp,
      cursed: !!cache.cursed,
      ambushTier: cache.ambushTier,
      ambushKinds: cache.ambushKinds,
      message: cache.message
    }));
  }
}

// -----------------------------------------------------------------------------
// ENEMIES
// -----------------------------------------------------------------------------

function addExpandedEnemyEncounters(enemies) {
  // Early road threats, deliberately spaced out so new players get practice.
  addEnemyCluster(enemies, 'hollowling', 'Blighted Corpse Forager', [
    [52, 50], [63, 60], [75, 67], [91, 72]
  ], 1);

  // Ashen Orchard pocket dungeon overworld guard.
  addEnemyCluster(enemies, 'hollowling', 'Orchard Blighted Corpse', [
    [115, 71], [123, 78], [129, 73]
  ], 2);

  // Chapel approach / pilgrim bridge.
  addEnemyCluster(enemies, 'gravebound', 'Pilgrim Gravebound', [
    [176, 73], [188, 82], [196, 76]
  ], 2);

  addEnemyCluster(enemies, 'shieldKnight', 'Pilgrim Shield Knight', [
    [181, 78], [201, 82]
  ], 2);

  addEnemyCluster(enemies, 'gravePriest', 'Chapel Grave Priest', [
    [205, 72], [214, 78]
  ], 3);

  // Thornwood / Mirror Grove.
  addEnemyCluster(enemies, 'ashWolf', 'Thornwood Ash Wolf', [
    [78, 137], [88, 150], [98, 158], [73, 160]
  ], 2);

  addEnemyCluster(enemies, 'stalkerWolf', 'Mirror Stalker', [
    [82, 144], [100, 154]
  ], 2);

  addEnemyCluster(enemies, 'hollowling', 'Root-Blighted Wanderer', [
    [88, 154], [92, 162], [97, 150]
  ], 2);

  // Iron Mire.
  addEnemyCluster(enemies, 'gravebound', 'Mire Gravebound', [
    [165, 187], [177, 201], [195, 206], [213, 212]
  ], 3);

  addEnemyCluster(enemies, 'brute', 'Mire Iron Brute', [
    [187, 197], [207, 216]
  ], 3);

  // Hunter reach roadless patrols.
  addEnemyCluster(enemies, 'roadlessBandit', 'Roadless Cutthroat', [
    [228, 111], [238, 122], [252, 134]
  ], 2);

  addEnemyCluster(enemies, 'archer', 'Roadless Archer', [
    [233, 116], [246, 128]
  ], 2);

  // Old Blighted / late-game pressure.
  addEnemyCluster(enemies, 'veyrWraith', 'Blighted Wraith', [
    [246, 179], [263, 192], [286, 213], [301, 221]
  ], 3);

  addEnemyCluster(enemies, 'wraith', 'Phasing Wraith', [
    [258, 185], [294, 205]
  ], 4);

  // Demon cult outer ring.
  addEnemyCluster(enemies, 'demonCultist', 'Last Dawn Zealot', [
    [292, 174], [300, 188], [314, 180], [310, 195]
  ], 3);

  addEnemyCluster(enemies, 'exploder', 'Volatile Husk', [
    [286, 171], [306, 202]
  ], 3);
}

function addOverworldActivityEncounters(enemies) {
  addPoiEnemyCluster(enemies, 'hollowRoadCache', 'roadlessBandit', 'Cache Robber', [
    [64, 64], [70, 68], [75, 66]
  ], 1, { guardRole: 'cacheRobber' });

  addPoiEnemyCluster(enemies, 'hunterReachCache', 'archer', 'Hunter Reach Poacher', [
    [243, 119], [251, 123], [256, 127]
  ], 3, { guardRole: 'cacheRobber' });

  addPoiEnemyCluster(enemies, 'brokenChapelReliquary', 'gravePriest', 'Reliquary Grave Priest', [
    [235, 51], [243, 56]
  ], 3, { guardRole: 'reliquaryGuard' });

  addPoiEnemyCluster(enemies, 'mirrorGroveOffering', 'stalkerWolf', 'Mirror Grove Prowler', [
    [91, 160], [98, 165], [103, 157]
  ], 3, { guardRole: 'offeringGuard' });

  addPoiEnemyCluster(enemies, 'redSealWarCache', 'demonCultist', 'Last Dawn Quartermaster', [
    [296, 190], [303, 193], [310, 187]
  ], 4, { guardRole: 'warCacheGuard' });

  enemies.push(makeEnemy('veyrWraith', 'watcherRidgeCacheWarden', 'Cache Warden', 275, 128, {
    tier: 4,
    ...scaleEnemyStats('veyrWraith', 4),
    hp: 360,
    maxHp: 360,
    damage: 28,
    dmg: 28,
    xp: 260,
    speed: 62,
    r: 19,
    radius: 19,
    aggroRange: 310,
    attackRange: 32,
    attackRate: 0.9,
    isBoss: true,
    bossName: 'Cache Warden',
    bossId: 'watcherRidgeCacheWarden',
    majorPoiId: 'watcherRidgeCache',
    guardRole: 'cacheWarden',
    namedExteriorElite: true
  }));
}

function addExpandedMiniBosses(enemies) {
  enemies.push(makeEnemy('hollowling', 'ashenOrchardKeeper', 'The Orchard Keeper', 123, 73, {
    tier: 2,
    ...scaleEnemyStats('hollowling', 2),
    hp: 240,
    maxHp: 240,
    damage: 17,
    dmg: 17,
    xp: 130,
    speed: 38,
    r: 19,
    radius: 19,
    aggroRange: 260,
    attackRange: 30,
    attackRate: 1.15,
    isBoss: true,
    bossName: 'The Orchard Keeper',
    bossId: 'ashenOrchardKeeper',
    majorPoiId: 'ashenOrchard',
    guardRole: 'miniBoss',
    namedExteriorElite: true
  }));

  enemies.push(makeEnemy('ashWolf', 'mirrorGroveWhiteWolf', 'White Ash Wolf', 91, 158, {
    tier: 2,
    ...scaleEnemyStats('ashWolf', 2),
    hp: 285,
    maxHp: 285,
    damage: 21,
    dmg: 21,
    xp: 155,
    speed: 86,
    r: 18,
    radius: 18,
    aggroRange: 285,
    attackRate: 0.82,
    isBoss: true,
    bossName: 'White Ash Wolf',
    bossId: 'mirrorGroveWhiteWolf',
    majorPoiId: 'mirrorGrove',
    guardRole: 'miniBoss',
    namedExteriorElite: true
  }));

  enemies.push(makeEnemy('gravebound', 'pilgrimBridgeWarden', 'Warden of the Bridge', 184, 80, {
    tier: 3,
    ...scaleEnemyStats('gravebound', 3),
    hp: 390,
    maxHp: 390,
    damage: 26,
    dmg: 26,
    xp: 230,
    speed: 44,
    r: 20,
    radius: 20,
    aggroRange: 285,
    attackRange: 31,
    attackRate: 1.05,
    isBoss: true,
    bossName: 'Warden of the Bridge',
    bossId: 'pilgrimBridgeWarden',
    majorPoiId: 'pilgrimBridge',
    guardRole: 'miniBoss',
    namedExteriorElite: true
  }));

  enemies.push(makeEnemy('veyrWraith', 'watcherRidgeWraith', 'Watcher Above the Road', 272, 132, {
    tier: 4,
    ...scaleEnemyStats('veyrWraith', 4),
    hp: 510,
    maxHp: 510,
    damage: 34,
    dmg: 34,
    xp: 360,
    speed: 58,
    r: 21,
    radius: 21,
    aggroRange: 320,
    attackRange: 32,
    attackRate: 0.95,
    isBoss: true,
    bossName: 'Watcher Above the Road',
    bossId: 'watcherAboveTheRoad',
    majorPoiId: 'watcherRidge',
    guardRole: 'miniBoss',
    namedExteriorElite: true
  }));
}

function addWorldBossPrototype(enemies) {
  enemies.push(makeEnemy('ashWolf', 'worldBossHollowElk', 'The Blighted Elk', 84, 150, {
    tier: 5,
    hp: 860,
    maxHp: 860,
    damage: 38,
    dmg: 38,
    xp: 520,
    speed: 68,
    r: 26,
    radius: 26,
    aggroRange: 360,
    attackRange: 36,
    attackRate: 0.95,
    isBoss: true,
    bossName: 'The Blighted Elk',
    bossType: 'hollowElk',
    bossId: 'theHollowElk',
    worldBoss: true,
    majorPoiId: 'hollowElkGrove',
    guardRole: 'worldBoss',
    namedExteriorElite: true
  }));
}

// -----------------------------------------------------------------------------
// LIVING OVERWORLD PASS
// -----------------------------------------------------------------------------

function addLivingOverworldPoiDressing(objects) {
  const poiMarkers = [
    ['poi-hollow-elk-grove', 'Blighted Elk Grove', 106, 263, '#73d18a'],
    ['poi-briar-den', 'Briar Den', 96, 177, '#73d18a'],
    ['poi-abandoned-caravan', 'Abandoned Caravan', 143, 95, '#d9ad4f'],
    ['poi-pilgrim-ambush', 'Pilgrim Road Ambush', 252, 103, '#ef6f6c'],
    ['poi-bandit-road-camp', 'Bandit Road Camp', 384, 162, '#ef6f6c'],
    ['poi-grave-mound', 'Grave Mound', 450, 84, '#b68cff'],
    ['poi-mire-watchpost', 'Mire Watchpost', 292, 350, '#66f0ff'],
    ['poi-old-hollow-den', 'Old Blighted Den', 392, 344, '#ef6f6c'],
    ['poi-red-seal-ritual', 'Last Dawn Ritual Site', 554, 383, '#ef6f6c']
  ];

  for (const [id, name, x, y, color] of poiMarkers) {
    objects.push(makeObject('poiMarker', id, name, x, y, {
      r: 1,
      markerColor: color,
      hideLabel: true,
      interactable: false,
      blocksMovement: false
    }));
  }

  addDecorCluster(objects, 'abandoned-caravan', [
    ['smallBoulder', 'Broken Axle', 140, 94, { scale: 0.75 }],
    ['townProp', 'Crate Pile', 142, 96, { propType: 'crateStack', scale: 0.92 }],
    ['townProp', 'Fallen Packs', 145, 93, { propType: 'sacks', scale: 0.82 }],
    ['signpost', 'Splintered Road Sign', 139, 97, { scale: 0.72 }]
  ]);

  addDecorCluster(objects, 'bandit-road-camp', [
    ['campfire', 'Bandit Campfire', 383, 160, { r: 18, hideLabel: true }],
    ['townProp', 'Loot Crates', 381, 163, { propType: 'crateStack', scale: 0.9 }],
    ['stump', 'Chopping Stump', 386, 165, { scale: 0.86 }],
    ['signpost', 'Roadless Warning Sign', 379, 158, { scale: 0.82 }]
  ]);

  addDecorCluster(objects, 'grave-mound', [
    ['graveMarker', 'Fresh Grave', 447, 82, { scale: 0.82 }],
    ['graveMarker', 'Fresh Grave', 452, 85, { scale: 0.82 }],
    ['ruinPillar', 'Chapel Relic Pillar', 449, 88, { scale: 0.86 }],
    ['deadRoot', 'Cold Root', 454, 80, { scale: 1.02 }]
  ]);

  addDecorCluster(objects, 'briar-den', [
    ['treeCluster', 'Briar Den Thicket', 94, 174, { scale: 1.08 }],
    ['deadRoot', 'Snare Root', 99, 179, { scale: 1.12 }],
    ['shrub', 'Blood Briar', 97, 172, { scale: 0.92 }],
    ['smallBoulder', 'Gnawed Stone', 101, 181, { scale: 0.78 }]
  ]);

  addDecorCluster(objects, 'mire-watchpost', [
    ['ruinPillar', 'Mire Watch Post', 289, 349, { scale: 0.9 }],
    ['brokenWall', 'Sunken Wall', 294, 352, { scale: 0.9, orientation: 'horizontal' }],
    ['smallBoulder', 'Wet Cairn', 296, 347, { scale: 0.72, dark: true }],
    ['shrub', 'Mire Grass', 287, 353, { scale: 0.85 }]
  ]);

  addDecorCluster(objects, 'red-seal-ritual', [
    ['ruinPillar', 'Last Dawn Pillar', 552, 381, { scale: 1.05 }],
    ['ruinPillar', 'Last Dawn Pillar', 557, 386, { scale: 0.95 }],
    ['deadRoot', 'Charred Root', 550, 388, { scale: 1.15 }],
    ['graveMarker', 'Ash-Signed Stone', 559, 379, { scale: 0.78 }]
  ]);
}

function addLivingOverworldNpcs(objects) {
  const npcs = [
    {
      id: 'roadCookMira',
      name: 'Road Cook Mira',
      x: 28,
      y: 34,
      factionId: 'outpost',
      disposition: 'friendly',
      role: 'traveler',
      shirt: '#c9965a',
      talk: 'Road Cook Mira: "Eat before the forest eats your courage."'
    },
    {
      id: 'ashpackCourier',
      name: 'Ashpack Courier',
      x: 46,
      y: 43,
      factionId: 'outpost',
      disposition: 'friendly',
      role: 'courier',
      shirt: '#6fa8ef',
      wanderRadiusTiles: 5,
      talk: 'Ashpack Courier: "If I stop moving, the road starts remembering me."'
    },
    {
      id: 'nervousPilgrim',
      name: 'Nervous Pilgrim',
      x: 91,
      y: 66,
      factionId: 'chapel',
      disposition: 'fearful',
      role: 'pilgrim',
      shirt: '#d8c38c',
      wanderRadiusTiles: 4,
      talk: 'Nervous Pilgrim: "The chapel bells rang last night. There are no bells left."'
    },
    {
      id: 'wanderingHerbalist',
      name: 'Wandering Herbalist',
      x: 118,
      y: 92,
      factionId: 'outpost',
      disposition: 'friendly',
      role: 'forager',
      shirt: '#73d18a',
      wanderRadiusTiles: 6,
      talk: 'Wandering Herbalist: "The bright leaves heal. The bright roots bite."'
    },
    {
      id: 'lostCartGuard',
      name: 'Lost Cart Guard',
      x: 144,
      y: 94,
      factionId: 'outpost',
      disposition: 'wounded',
      role: 'guard',
      shirt: '#9facbf',
      wanderRadiusTiles: 2,
      talk: 'Lost Cart Guard: "Bandits hit the caravan, then something hit the bandits."'
    },
    {
      id: 'bridgeLampKeeper',
      name: 'Bridge Lamp Keeper',
      x: 246,
      y: 101,
      factionId: 'chapel',
      disposition: 'neutral',
      role: 'roadGuide',
      shirt: '#ffcc66',
      wanderRadiusTiles: 3,
      talk: 'Bridge Lamp Keeper: "Keep a lamp between you and the river when the fog thickens."'
    },
    {
      id: 'mirePackhand',
      name: 'Mire Packhand',
      x: 246,
      y: 327,
      factionId: 'outpost',
      disposition: 'friendly',
      role: 'miner',
      shirt: '#66f0ff',
      wanderRadiusTiles: 5,
      talk: 'Mire Packhand: "Ore is easy. Getting it home is the part that grows teeth."'
    },
    {
      id: 'hunterReachRunner',
      name: 'Hunter Reach Runner',
      x: 390,
      y: 156,
      factionId: 'outpost',
      disposition: 'neutral',
      role: 'scout',
      shirt: '#8f6b45',
      wanderRadiusTiles: 7,
      talk: 'Hunter Reach Runner: "If the trees go quiet, count arrows, not birds."'
    },
    {
      id: 'redRoadDefector',
      name: 'Red Road Defector',
      x: 528,
      y: 350,
      factionId: 'redSeal',
      disposition: 'uncertain',
      role: 'warningNpc',
      shirt: '#863b3b',
      wanderRadiusTiles: 3,
      talk: 'Red Road Defector: "The Seal wants witnesses. That is worse than wanting corpses."'
    }
  ];

  for (const npc of npcs) {
    objects.push(makeWanderingNpc(npc));
  }

  objects.push(makeObject('marketStall', 'hollow-road-traveling-merchant', 'Traveling Merchant', 64, 58, {
    r: 30,
    forceLabel: true,
    labelPriority: 6,
    talk: 'A road merchant sells field supplies under a patched awning.'
  }));

  objects.push(makeObject('marketStall', 'pilgrim-bridge-traveling-merchant', 'Pilgrim Bridge Merchant', 242, 102, {
    r: 30,
    forceLabel: true,
    labelPriority: 6,
    talk: 'A lantern merchant keeps their best supplies close to the bridge.'
  }));
}

function addLivingOverworldCaches(objects) {
  const caches = [
    {
      id: 'abandoned-caravan-lockbox',
      name: 'Abandoned Caravan Lockbox',
      x: 145,
      y: 96,
      majorPoiId: 'abandonedCaravan',
      rewards: [['ashCoin', 32], ['fieldRations', 2], ['ironScrap', 2]],
      color: '#d9ad4f',
      xp: 24,
      message: 'The lockbox still smells of rain and panic.'
    },
    {
      id: 'bandit-road-camp-stash',
      name: 'Bandit Camp Stash',
      x: 382,
      y: 164,
      majorPoiId: 'banditRoadCamp',
      rewards: [['ashCoin', 58], ['ironScrap', 4], ['tornHide', 2]],
      color: '#d9ad4f',
      xp: 36,
      cursed: true,
      ambushTier: 3,
      ambushKinds: ['roadlessBandit', 'archer', 'roadlessBandit'],
      message: 'A stolen stash. The bandits tied bells under the lid.'
    },
    {
      id: 'briar-den-hidden-cache',
      name: 'Briar Den Cache',
      x: 99,
      y: 180,
      majorPoiId: 'briarDen',
      rewards: [['briarRoot', 3], ['livingBark', 1], ['thornSeed', 1]],
      color: '#73d18a',
      skill: 'foraging',
      xp: 38,
      message: 'The briars pull back just enough to reveal a wrapped bundle.'
    },
    {
      id: 'hollow-elk-offering',
      name: 'Blighted Elk Offering',
      x: 108,
      y: 266,
      majorPoiId: 'hollowElkGrove',
      rewards: [['livingBark', 2], ['thornSeed', 2], ['briarRoot', 3]],
      color: '#73d18a',
      skill: 'renown',
      xp: 48,
      message: 'Old offerings lie under antler-shaped branches.'
    },
    {
      id: 'grave-mound-bone-cache',
      name: 'Grave Mound Bone Cache',
      x: 451,
      y: 87,
      majorPoiId: 'graveMound',
      rewards: [['graveAsh', 2], ['boneShard', 3], ['paleEssence', 1]],
      color: '#b68cff',
      skill: 'runecraft',
      xp: 42,
      cursed: true,
      ambushTier: 4,
      ambushKinds: ['gravebound', 'gravePriest', 'wraith'],
      message: 'The grave goods are wrapped in names scratched into bone.'
    },
    {
      id: 'mire-watchpost-supply-cache',
      name: 'Mire Watchpost Supplies',
      x: 291,
      y: 352,
      majorPoiId: 'mireWatchpost',
      rewards: [['ironScrap', 4], ['graveAsh', 1], ['ashCoin', 42]],
      color: '#66f0ff',
      xp: 32,
      message: 'A sunken watch post still has sealed supplies above the mud line.'
    },
    {
      id: 'red-seal-ritual-cache',
      name: 'Last Dawn Ritual Cache',
      x: 555,
      y: 384,
      majorPoiId: 'redSealRitualRoad',
      rewards: [['redSealFragment', 2], ['redGlassIchor', 1], ['bossCore', 1]],
      color: '#ef6f6c',
      skill: 'renown',
      xp: 64,
      cursed: true,
      ambushTier: 5,
      ambushKinds: ['demonCultist', 'exploder', 'brute'],
      message: 'The cache is warm, as if someone just stopped holding it.'
    },
    {
      id: 'old-hollow-den-cache',
      name: 'Old Blighted Den Cache',
      x: 394,
      y: 346,
      majorPoiId: 'oldHollowBearDen',
      rewards: [['tornHide', 3], ['boneShard', 3], ['graveAsh', 2]],
      color: '#ef6f6c',
      skill: 'renown',
      xp: 52,
      message: 'Deep claw marks circle the cache, but the latch is intact.'
    }
  ];

  for (const cache of caches) {
    objects.push(makeObject('worldCache', cache.id, cache.name, cache.x, cache.y, {
      r: 18,
      forceLabel: true,
      labelPriority: 5,
      majorPoiId: cache.majorPoiId,
      rewards: cache.rewards,
      color: cache.color,
      skill: cache.skill,
      xp: cache.xp,
      cursed: !!cache.cursed,
      ambushTier: cache.ambushTier,
      ambushKinds: cache.ambushKinds,
      message: cache.message
    }));
  }
}

function addLivingOverworldHostiles(enemies) {
  addPoiEnemyCluster(enemies, 'abandonedCaravan', 'roadlessBandit', 'Caravan Cutthroat', [
    [141, 95], [147, 93], [149, 98]
  ], 2, { guardRole: 'caravanRaider' });

  addPoiEnemyCluster(enemies, 'pilgrimRoadAmbush', 'archer', 'Road Ambusher', [
    [248, 100], [256, 106], [262, 101]
  ], 3, { guardRole: 'ambusher', aggroRange: 300 });

  addPoiEnemyCluster(enemies, 'banditRoadCamp', 'roadlessBandit', 'Roadless Camp Raider', [
    [379, 159], [386, 161], [390, 166], [375, 166]
  ], 3, { guardRole: 'campGuard' });

  addPoiEnemyCluster(enemies, 'banditRoadCamp', 'archer', 'Roadless Lookout', [
    [381, 154], [392, 158]
  ], 3, { guardRole: 'campLookout', attackRange: 240 });

  addPoiEnemyCluster(enemies, 'graveMound', 'gravebound', 'Grave Mound Risen', [
    [445, 84], [452, 80], [456, 88]
  ], 4, { guardRole: 'graveDefender' });

  addPoiEnemyCluster(enemies, 'graveMound', 'gravePriest', 'Mound Bone-Singer', [
    [449, 90], [457, 83]
  ], 4, { guardRole: 'gravePriest' });

  addPoiEnemyCluster(enemies, 'briarDen', 'ashWolf', 'Briar Den Ash Wolf', [
    [94, 176], [99, 173], [102, 181], [91, 181]
  ], 3, { guardRole: 'denGuard', speed: 92 });

  addPoiEnemyCluster(enemies, 'mireWatchpost', 'gravebound', 'Mire Watchpost Guard', [
    [288, 348], [295, 352], [300, 346]
  ], 4, { guardRole: 'watchpostGuard' });

  addPoiEnemyCluster(enemies, 'oldHollowBearDen', 'stalkerWolf', 'Old Blighted Carrion Wolf', [
    [386, 342], [398, 348], [391, 352]
  ], 4, { guardRole: 'denGuard', speed: 96 });

  addPoiEnemyCluster(enemies, 'redSealRitualRoad', 'demonCultist', 'Last Dawn Ritualist', [
    [549, 380], [557, 381], [560, 389], [552, 391]
  ], 5, { guardRole: 'ritualGuard', aggroRange: 340 });

  addPoiEnemyCluster(enemies, 'redSealRitualRoad', 'exploder', 'Last Dawn Husk', [
    [545, 386], [563, 384]
  ], 5, { guardRole: 'ritualHusk' });
}

function addLivingOverworldElites(enemies) {
  addNamedElite(enemies, 'roadlessBandit', 'elite-garren-ironhand', 'Garren Ironhand', 386, 162, {
    tier: 4,
    hp: 560,
    damage: 34,
    xp: 420,
    eliteModifier: 'armoured',
    majorPoiId: 'banditRoadCamp',
    guardRole: 'eliteCaptain'
  });

  addNamedElite(enemies, 'gravePriest', 'elite-sister-marrow', 'Sister Marrow', 451, 84, {
    tier: 4,
    hp: 520,
    damage: 36,
    xp: 430,
    eliteModifier: 'vampiric',
    majorPoiId: 'graveMound',
    guardRole: 'elitePriest'
  });

  addNamedElite(enemies, 'basicBeast', 'elite-briar-crowned-boar', 'Briar-Crowned Boar', 98, 178, {
    tier: 4,
    hp: 610,
    damage: 36,
    xp: 440,
    speed: 78,
    eliteModifier: 'armoured',
    majorPoiId: 'briarDen',
    guardRole: 'eliteBeast'
  });

  addNamedElite(enemies, 'wraith', 'elite-hollow-road-reaper', 'Blighted Road Reaper', 206, 118, {
    tier: 3,
    hp: 430,
    damage: 30,
    xp: 310,
    eliteModifier: 'vampiric',
    majorPoiId: 'pilgrimRoadAmbush',
    guardRole: 'eliteAmbusher'
  });

  addNamedElite(enemies, 'veyrWraith', 'elite-veyr-road-judge', 'Veyr Road Judge', 515, 194, {
    tier: 5,
    hp: 680,
    damage: 42,
    xp: 560,
    eliteModifier: 'armoured',
    majorPoiId: 'mireWatchpost',
    guardRole: 'eliteJudge'
  });

  addNamedElite(enemies, 'demonCultist', 'elite-red-seal-manhunter', 'Last Dawn Manhunter', 553, 386, {
    tier: 5,
    hp: 720,
    damage: 44,
    xp: 620,
    eliteModifier: 'burning',
    majorPoiId: 'redSealRitualRoad',
    guardRole: 'eliteManhunter'
  });
}

function addAdditionalWorldBosses(enemies) {
  enemies.push(makeWorldBoss('brute', 'worldBossRedSealExecutioner', 'Last Dawn Executioner', 558, 386, {
    tier: 6,
    hp: 1280,
    damage: 50,
    xp: 820,
    r: 30,
    speed: 45,
    bossType: 'redSealExecutioner',
    bossId: 'redSealExecutioner',
    majorPoiId: 'redSealRitualRoad',
    eliteModifier: 'burning'
  }));

  enemies.push(makeWorldBoss('basicBeast', 'worldBossGraveMawBear', 'Grave-Maw Bear', 392, 344, {
    tier: 5,
    hp: 1120,
    damage: 46,
    xp: 760,
    r: 31,
    speed: 64,
    bossType: 'graveMawBear',
    bossId: 'graveMawBear',
    majorPoiId: 'oldHollowBearDen',
    eliteModifier: 'armoured'
  }));

  enemies.push(makeWorldBoss('brute', 'worldBossBriarTitan', 'Briar Titan', 104, 180, {
    tier: 5,
    hp: 1040,
    damage: 42,
    xp: 720,
    r: 29,
    speed: 38,
    bossType: 'briarTitan',
    bossId: 'briarTitan',
    majorPoiId: 'briarDen',
    eliteModifier: 'vampiric'
  }));
}

function makeWanderingNpc(options) {
  return makeObject('npc', options.id, options.name, options.x, options.y, {
    npcId: options.id,
    factionId: options.factionId || 'outpost',
    disposition: options.disposition || 'neutral',
    role: options.role || 'traveler',
    ambientWander: true,
    wanderRadiusTiles: options.wanderRadiusTiles || 4,
    wanderSpeed: options.wanderSpeed || 18,
    wanderPauseMin: options.wanderPauseMin || 1.0,
    wanderPauseMax: options.wanderPauseMax || 3.2,
    labelPriority: options.labelPriority || 3,
    skin: options.skin || '#e0b090',
    hair: options.hair || '#2b1f1a',
    shirt: options.shirt || '#9facbf',
    pants: options.pants || '#26344a',
    boots: options.boots || '#2b1f1a',
    talk: options.talk
  });
}

function addDecorCluster(objects, prefix, entries) {
  entries.forEach(([kind, name, x, y, extra], index) => {
    const id = `${prefix}-${slugifyLocal(LEGACY_ENEMY_CLUSTER_NAMES[name] || name)}-${index}`;
    const factory = kind === 'campfire' ? makeObject : makeDecorObject;
    objects.push(factory(kind, id, name, x, y, {
      labelPriority: 2,
      ...extra
    }));
  });
}

function addPoiEnemyCluster(enemies, majorPoiId, kind, name, points, tier = 1, extra = {}) {
  points.forEach(([x, y], index) => {
    enemies.push(makeEnemy(kind, `${majorPoiId}-${slugifyLocal(LEGACY_ENEMY_CLUSTER_NAMES[name] || name)}-${index}`, name, x, y, {
      tier,
      ...scaleEnemyStats(kind, tier),
      ...extra,
      majorPoiId,
      guardRole: extra.guardRole || 'patrol'
    }));
  });
}

function addNamedElite(enemies, kind, id, name, x, y, options = {}) {
  const tier = options.tier || 3;
  const scaled = scaleEnemyStats(kind, tier);
  enemies.push(makeEnemy(kind, id, name, x, y, {
    tier,
    ...scaled,
    ...options,
    hp: options.hp || Math.floor(scaled.hp * 1.85),
    maxHp: options.maxHp || options.hp || Math.floor(scaled.maxHp * 1.85),
    damage: options.damage || Math.floor(scaled.damage * 1.25),
    dmg: options.dmg || options.damage || Math.floor(scaled.damage * 1.25),
    xp: options.xp || Math.floor(scaled.xp * 2.6),
    aggroRange: options.aggroRange || 330,
    attackRate: options.attackRate || Math.max(0.72, Number(scaled.attackRate || 1) * 0.9),
    namedExteriorElite: true,
    isBoss: true,
    bossName: name,
    bossId: options.bossId || id,
    guardRole: options.guardRole || 'namedElite'
  }));
}

function makeWorldBoss(kind, id, name, x, y, options = {}) {
  const tier = options.tier || 5;
  const scaled = scaleEnemyStats(kind, tier);
  const hp = options.hp || Math.floor(scaled.hp * 3.2);
  const damage = options.damage || Math.floor(scaled.damage * 1.45);

  return makeEnemy(kind, id, name, x, y, {
    tier,
    ...scaled,
    ...options,
    hp,
    maxHp: options.maxHp || hp,
    damage,
    dmg: options.dmg || damage,
    xp: options.xp || Math.floor(scaled.xp * 5),
    r: options.r || 28,
    radius: options.radius || options.r || 28,
    aggroRange: options.aggroRange || 410,
    attackRange: options.attackRange || 42,
    attackRate: options.attackRate || 0.86,
    isBoss: true,
    worldBoss: true,
    namedExteriorElite: true,
    bossName: name,
    bossId: options.bossId || id,
    guardRole: 'worldBoss'
  });
}

function slugifyLocal(value) {
  return String(value || 'entry')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '') || 'entry';
}
