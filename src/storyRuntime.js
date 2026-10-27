// storyRuntime.js
// Small runtime glue that turns boss kills, travel, and class choices into story progress.

import { addItem, countItem } from './player.js';
import { addQuestText, addStatusText } from './floatingText.js';
import { applyStoryFlags, ensureStoryProgress, setRouteState } from './storyProgress.js';
import { startQuest, completeQuest, markDiscoverPoiObjective } from './dialogueSystem.js';
import { getTrainerByClass } from './trainerData.js';

export function ensureActQuest(player, actId = 'act1') {
  if (!player) return false;

  ensureStoryProgress(player);

  if (
    actId === 'act1' &&
    (player.quests?.active?.mercy_in_orrakai || player.quests?.completed?.mercy_in_orrakai || player.story?.flags?.opening?.introPlayed)
  ) {
    player.story.mainQuestline = player.quests?.completed?.mercy_in_orrakai ? 'act1HearthmereAshes' : 'mercy_in_orrakai';
    return false;
  }

  const questId =
    actId === 'act3' ? 'act3Severance' :
    actId === 'act2' ? 'act2AureateReckoning' :
    'act1HearthmereAshes';

  player.story.mainQuestline = questId;
  return startQuest(player, questId);
}

export function applyClassStoryChoice(player, classId, log = null) {
  if (!player || !classId) return;

  ensureStoryProgress(player);

  const originalClassId = classId;
  classId = classId === 'necromancer'
    ? 'gravecaller'
    : classId === 'hydromancer'
      ? 'waverider'
      : classId === 'mercenary'
        ? 'fellhunter'
      : classId;
  const trainer = getTrainerByClass(classId);
  const companionId = trainer?.companionId;
  const classFlags = originalClassId === classId
    ? [`class.${classId}.chosen`]
    : [`class.${classId}.chosen`, `class.${originalClassId}.chosen`];
  applyStoryFlags(player, [...classFlags, ...(trainer?.unlockFlags || [])]);

  if (companionId) {
    player.companions[companionId] = player.companions[companionId] || {};
    player.companions[companionId].introduced = true;
    player.companions[companionId].relationship = Math.max(1, Number(player.companions[companionId].relationship || 0));
    applyStoryFlags(player, [`trainer.${companionId}.introduced`]);
  }

  if (trainer?.classMeaning) {
    log?.(`${trainer.trainerName}: ${trainer.trainingStates?.[0]?.line || trainer.classMeaning}`);
  }
}

export function applyBossStoryProgress(enemy, player, world, log = null) {
  if (!enemy?.isBoss || !player) return false;

  ensureStoryProgress(player);

  const bossId = enemy.bossId || enemy.bossType || enemy.id || '';
  const dungeonId = world?.dungeonId || world?.poiId || world?.entranceId || '';
  const text = `${bossId} ${enemy.bossName || ''} ${enemy.name || ''} ${dungeonId}`.toLowerCase();

  if (!enemy.miniBoss && enemy.isDungeonMainBoss && /demoncultlair|dawnspireroot|emberveil/i.test(dungeonId)) {
    applyStoryFlags(player, [
      'story.dawnspireRootActivated',
      'story.malakarDefeated',
      'story.lastDawnNeededMalakar',
      'lore.malakarPrimordialWitness',
      'story.malakarEncounterResolved'
    ]);
    grantMissing(player, 'pilgrimRoadPermit', 1);
    log?.('Malakar, Primordial witness of the Divine Age: "The Order needed me. It did not worship me."');
    log?.('Malakar: "Only one who remembers the Divine Age can name what was removed from it."');
    log?.('Malakar is defeated, but still has something to say.');
    addQuestText(player, 'Malakar Defeated', { color: '#ffcc66', ttl: 1.8, size: 17 });
    return true;
  }

  if (text.includes('seraphel') || text.includes('shatteredchoir')) {
    applyStoryFlags(player, [
      'story.act2Complete',
      'story.zephyrNamed',
      'unbound.seraphelConfirmed',
      'travel.severedCauseway.unlocked'
    ]);
    completeOrRecordQuest(player, 'act2AureateReckoning', 'The Beautiful Cage');
    grantMissing(player, 'severedCausewayChart', 1);
    grantMissing(player, 'lightstormWard', 2);
    setRouteState(player, 'severedCauseway', { unlocked: true, storyUnlocked: true });
    log?.('Seraphel falls, but his warning remains: the Covenant does not worship Light. It feeds it.');
    addQuestText(player, 'Act II Complete', { color: '#b68cff', ttl: 1.8, size: 17 });
    return true;
  }

  if (text.includes('zephyr') || text.includes('ascensionspire')) {
    applyStoryFlags(player, [
      'story.act3Complete',
      'unbound.zephyrDirectVoice',
      'ending.networkSeveredAvailable'
    ]);
    completeOrRecordQuest(player, 'act3Severance', 'Sever the Light');
    grantMissing(player, 'zephyrShard', 1);
    log?.('Zephyr Light is wounded. The ending choice is now open: destroy, replace, or sever the Network.');
    addQuestText(player, 'Ending Choice Unlocked', { color: '#66f0ff', ttl: 1.9, size: 17 });
    return true;
  }

  return false;
}

export function markTravelStoryProgress(player, routeId, arrivedRegionId, log = null) {
  if (!player || !routeId) return;

  ensureStoryProgress(player);

  if (routeId === 'pilgrimRoad') {
    applyStoryFlags(player, ['story.act2Started', 'region.aureateMarches.reached']);
    ensureActQuest(player, 'act2');
    markRouteArrivalDiscovery(player, 'pilgrimBridge', 'Pilgrim Road Checkpoint');
    log?.('Main quest updated: The Beautiful Cage.');
    addStatusText(player, 'Act II Started', { color: '#ffcc66', ttl: 1.2 });
  }

  if (routeId === 'severedCauseway') {
    applyStoryFlags(player, ['story.act3Started', 'region.ascensionWastes.reached']);
    ensureActQuest(player, 'act3');
    markRouteArrivalDiscovery(player, 'lastLanternCrossing', 'Last Lantern Crossing');
    log?.('Main quest updated: Sever the Light.');
    addStatusText(player, 'Act III Started', { color: '#b68cff', ttl: 1.2 });
  }
}

function markRouteArrivalDiscovery(player, poiId, name) {
  player.discoveredPois = player.discoveredPois || {};
  player.discoveredPois[poiId] = player.discoveredPois[poiId] || {
    id: poiId,
    name,
    discoveredAt: Date.now()
  };
  markDiscoverPoiObjective(player, poiId);
}

function grantMissing(player, itemId, qty) {
  const needed = Math.max(0, Number(qty || 1) - countItem(player, itemId));
  if (needed > 0) addItem(player, itemId, needed);
}

function completeOrRecordQuest(player, questId, title) {
  player.quests = player.quests || { active: {}, completed: {} };
  player.quests.active = player.quests.active || {};
  player.quests.completed = player.quests.completed || {};

  if (completeQuest(player, questId)) return true;

  player.quests.completed[questId] = player.quests.completed[questId] || {
    id: questId,
    title,
    completedAt: Date.now(),
    description: 'Completed through story progression.'
  };

  return true;
}
