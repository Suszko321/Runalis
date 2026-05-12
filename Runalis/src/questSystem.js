// questSystem.js
// Runalis quest/objective system.
//
// Purpose:
// - Tracks active, completed, and failed quests.
// - Starts quests from dialogue.
// - Tracks objective progress for:
//   - collect item
//   - kill enemy
//   - talk to NPC
//   - discover POI
//   - enter dungeon
//   - clear dungeon
// - Provides UI-ready quest tracker data.
// - Provides reward helpers.
//
// This system is intentionally standalone.
// Other scripts will call into this file later:
//
// dialogueSystem.js
// - startQuest(player, questId, log)
//
// combat.js
// - recordEnemyKilled(player, enemy, log)
//
// gameInteraction.js
// - recordItemCollected(player, itemId, qty, log)
// - recordNpcTalked(player, npcId, log)
// - recordPoiDiscovered(player, poiId, log)
// - recordDungeonEntered(player, dungeonId, log)
//
// ui.js
// - getActiveQuestTracker(player)
// - getQuestJournalEntries(player)

import {
  getQuest,
  getNpc,
  getPoi
} from './worldContent.js';

import {
  ITEMS
} from './data.js';

// -----------------------------------------------------------------------------
// QUEST STATE DEFAULTS
// -----------------------------------------------------------------------------

const DEFAULT_QUEST_STATE = {
  activeQuestId: null,
  active: {},
  completed: {},
  failed: {},
  recentlyUpdated: [],
  recentlyCompleted: []
};

// -----------------------------------------------------------------------------
// PUBLIC STATE HELPERS
// -----------------------------------------------------------------------------

export function ensureQuestState(player) {
  if (!player) return structuredCloneSafe(DEFAULT_QUEST_STATE);

  if (!player.questState || typeof player.questState !== 'object') {
    player.questState = structuredCloneSafe(DEFAULT_QUEST_STATE);
  }

  player.questState.activeQuestId = player.questState.activeQuestId ?? null;
  player.questState.active = player.questState.active ?? {};
  player.questState.completed = player.questState.completed ?? {};
  player.questState.failed = player.questState.failed ?? {};
  player.questState.recentlyUpdated = Array.isArray(player.questState.recentlyUpdated)
    ? player.questState.recentlyUpdated
    : [];
  player.questState.recentlyCompleted = Array.isArray(player.questState.recentlyCompleted)
    ? player.questState.recentlyCompleted
    : [];

  // Migration bridge:
  // Older versions used player.quest as simple flags.
  player.quest = player.quest || {};

  return player.questState;
}

export function getQuestState(player) {
  return ensureQuestState(player);
}

export function isQuestActive(player, questId) {
  const state = ensureQuestState(player);
  return Boolean(state.active?.[questId]);
}

export function isQuestCompleted(player, questId) {
  const state = ensureQuestState(player);
  return Boolean(state.completed?.[questId]);
}

export function canStartQuest(player, questId) {
  if (!player || !questId) return false;

  const quest = getQuest(questId);
  if (!quest) return false;

  const state = ensureQuestState(player);

  if (state.active[questId]) return false;
  if (state.completed[questId]) return false;
  if (state.failed[questId]) return false;

  return true;
}

// -----------------------------------------------------------------------------
// QUEST START / COMPLETE / FAIL
// -----------------------------------------------------------------------------

export function startQuest(player, questId, log = null) {
  if (!player || !questId) return false;

  const quest = getQuest(questId);

  if (!quest) {
    console.warn(`Quest does not exist: ${questId}`);
    return false;
  }

  const state = ensureQuestState(player);

  if (state.completed[questId]) {
    log?.(`${quest.title || 'Quest'} is already complete.`);
    return false;
  }

  if (state.active[questId]) {
    state.activeQuestId = questId;
    log?.(`${quest.title || 'Quest'} is already active.`);
    return false;
  }

  const activeQuest = createActiveQuestRecord(quest);

  state.active[questId] = activeQuest;
  state.activeQuestId = questId;

  player.quest[questId] = Math.max(1, Number(player.quest[questId] || 0));

  pushRecentUpdate(player, {
    type: 'started',
    questId,
    title: quest.title,
    text: `Quest started: ${quest.title}`
  });

  log?.(`Quest started: ${quest.title}`);

  return true;
}

export function setActiveQuest(player, questId) {
  const state = ensureQuestState(player);

  if (!questId || !state.active[questId]) return false;

  state.activeQuestId = questId;
  return true;
}

export function abandonQuest(player, questId, log = null) {
  if (!player || !questId) return false;

  const state = ensureQuestState(player);
  const active = state.active[questId];

  if (!active) return false;

  delete state.active[questId];

  if (state.activeQuestId === questId) {
    state.activeQuestId = getFirstActiveQuestId(player);
  }

  log?.(`Quest abandoned: ${active.title}`);

  return true;
}

export function completeQuest(player, questId, log = null) {
  if (!player || !questId) return false;

  const state = ensureQuestState(player);
  const active = state.active[questId];
  const quest = getQuest(questId);

  if (!active || !quest) return false;

  active.completedAt = Date.now();
  active.status = 'completed';

  state.completed[questId] = active;
  delete state.active[questId];

  if (state.activeQuestId === questId) {
    state.activeQuestId = getFirstActiveQuestId(player);
  }

  player.quest[questId] = 999;

  applyQuestRewards(player, quest, log);

  pushRecentCompletion(player, {
    type: 'completed',
    questId,
    title: quest.title,
    text: `Quest complete: ${quest.title}`
  });

  log?.(`Quest complete: ${quest.title}`);

  return true;
}

export function failQuest(player, questId, reason = '', log = null) {
  if (!player || !questId) return false;

  const state = ensureQuestState(player);
  const active = state.active[questId];

  if (!active) return false;

  active.failedAt = Date.now();
  active.status = 'failed';
  active.failReason = reason;

  state.failed[questId] = active;
  delete state.active[questId];

  if (state.activeQuestId === questId) {
    state.activeQuestId = getFirstActiveQuestId(player);
  }

  log?.(`Quest failed: ${active.title}`);

  return true;
}

// -----------------------------------------------------------------------------
// QUEST RECORD CREATION
// -----------------------------------------------------------------------------

function createActiveQuestRecord(quest) {
  const stages = Array.isArray(quest.stages) ? quest.stages : [];

  return {
    id: quest.id,
    title: quest.title || quest.id,
    summary: quest.summary || '',
    type: quest.type || 'quest',
    giverNpcId: quest.giverNpcId || null,
    recommendedLevel: quest.recommendedLevel || 1,
    status: 'active',
    startedAt: Date.now(),
    currentStageIndex: 0,
    stages: stages.map(stage => createStageRecord(stage))
  };
}

function createStageRecord(stage) {
  const objectives = Array.isArray(stage.objectives) ? stage.objectives : [];

  return {
    id: stage.id || 'stage',
    text: stage.text || 'Complete the objective.',
    completed: false,
    objectives: objectives.map(objective => createObjectiveRecord(objective))
  };
}

function createObjectiveRecord(objective) {
  return {
    ...objective,
    progress: Number(objective.progress || 0),
    required: Math.max(1, Number(objective.required || 1)),
    completed: Boolean(objective.completed)
  };
}

// -----------------------------------------------------------------------------
// PROGRESS RECORDING API
// -----------------------------------------------------------------------------

export function recordItemCollected(player, itemId, qty = 1, log = null) {
  return recordQuestProgress(player, {
    type: 'collect',
    itemId,
    amount: qty
  }, log);
}

export function recordEnemyKilled(player, enemy, log = null) {
  if (!enemy) return false;

  return recordQuestProgress(player, {
    type: 'kill',
    enemyKind: enemy.kind || enemy.enemyKind || enemy.id,
    enemyId: enemy.id || null,
    enemyName: enemy.name || null,
    amount: 1
  }, log);
}

export function recordNpcTalked(player, npcId, log = null) {
  return recordQuestProgress(player, {
    type: 'talk',
    npcId,
    amount: 1
  }, log);
}

export function recordPoiDiscovered(player, poiId, log = null) {
  return recordQuestProgress(player, {
    type: 'discoverPoi',
    poiId,
    amount: 1
  }, log);
}

export function recordDungeonEntered(player, dungeonId, log = null) {
  return recordQuestProgress(player, {
    type: 'enterDungeon',
    dungeonId,
    amount: 1
  }, log);
}

export function recordDungeonCleared(player, dungeonId, log = null) {
  return recordQuestProgress(player, {
    type: 'clearDungeon',
    dungeonId,
    amount: 1
  }, log);
}

export function recordQuestProgress(player, event, log = null) {
  if (!player || !event?.type) return false;

  const state = ensureQuestState(player);
  let changed = false;

  for (const questId of Object.keys(state.active)) {
    const activeQuest = state.active[questId];
    if (!activeQuest || activeQuest.status !== 'active') continue;

    const stage = getCurrentStage(activeQuest);
    if (!stage || stage.completed) continue;

    for (const objective of stage.objectives || []) {
      if (!objective || objective.completed) continue;
      if (!objectiveMatchesEvent(objective, event)) continue;

      const amount = Math.max(1, Number(event.amount || 1));

      objective.progress = Math.min(
        objective.required,
        Number(objective.progress || 0) + amount
      );

      if (objective.progress >= objective.required) {
        objective.completed = true;
      }

      changed = true;

      pushRecentUpdate(player, {
        type: 'progress',
        questId,
        title: activeQuest.title,
        text: getObjectiveProgressText(objective)
      });
    }

    if (stageObjectivesComplete(stage)) {
      stage.completed = true;

      pushRecentUpdate(player, {
        type: 'stageComplete',
        questId,
        title: activeQuest.title,
        text: `${activeQuest.title}: ${stage.text}`
      });

      advanceQuestStage(player, activeQuest, log);
      changed = true;
    }
  }

  return changed;
}

function objectiveMatchesEvent(objective, event) {
  if (!objective || !event) return false;
  if (objective.type !== event.type) return false;

  if (objective.type === 'collect') {
    return objective.itemId === event.itemId;
  }

  if (objective.type === 'kill') {
    return objective.enemyKind === event.enemyKind ||
      objective.enemyId === event.enemyId ||
      objective.enemyName === event.enemyName;
  }

  if (objective.type === 'talk') {
    return objective.npcId === event.npcId;
  }

  if (objective.type === 'discoverPoi') {
    return objective.poiId === event.poiId;
  }

  if (objective.type === 'enterDungeon') {
    return objective.dungeonId === event.dungeonId ||
      objective.entranceId === event.dungeonId;
  }

  if (objective.type === 'clearDungeon') {
    return objective.dungeonId === event.dungeonId ||
      objective.entranceId === event.dungeonId;
  }

  return true;
}

function advanceQuestStage(player, activeQuest, log = null) {
  if (!activeQuest) return false;

  const nextIndex = activeQuest.currentStageIndex + 1;

  if (nextIndex >= activeQuest.stages.length) {
    return completeQuest(player, activeQuest.id, log);
  }

  activeQuest.currentStageIndex = nextIndex;

  const nextStage = getCurrentStage(activeQuest);

  if (nextStage) {
    pushRecentUpdate(player, {
      type: 'newStage',
      questId: activeQuest.id,
      title: activeQuest.title,
      text: nextStage.text
    });

    log?.(`${activeQuest.title}: ${nextStage.text}`);
  }

  return true;
}

// -----------------------------------------------------------------------------
// QUEST TRACKER / JOURNAL API
// -----------------------------------------------------------------------------

export function getActiveQuestTracker(player) {
  const state = ensureQuestState(player);

  let questId = state.activeQuestId;

  if (!questId || !state.active[questId]) {
    questId = getFirstActiveQuestId(player);
    state.activeQuestId = questId;
  }

  if (!questId) {
    return {
      hasQuest: false,
      title: 'No Active Quest',
      objectiveText: 'Speak with an NPC to begin a quest.',
      progressText: '',
      questId: null,
      recommendedLevel: null,
      type: null
    };
  }

  const quest = state.active[questId];
  const stage = getCurrentStage(quest);
  const objective = getFirstIncompleteObjective(stage);

  return {
    hasQuest: true,
    questId: quest.id,
    title: quest.title,
    summary: quest.summary || '',
    type: quest.type || 'quest',
    recommendedLevel: quest.recommendedLevel || 1,
    stageIndex: quest.currentStageIndex || 0,
    totalStages: quest.stages?.length || 0,
    objectiveText: stage?.text || 'Continue the quest.',
    progressText: objective ? getObjectiveProgressText(objective) : '',
    objective,
    stage,
    giverNpc: getNpc(quest.giverNpcId) || null
  };
}

export function getQuestJournalEntries(player) {
  const state = ensureQuestState(player);

  const active = Object.values(state.active || {}).map(quest => ({
    ...quest,
    journalStatus: 'Active',
    sort: 0
  }));

  const completed = Object.values(state.completed || {}).map(quest => ({
    ...quest,
    journalStatus: 'Completed',
    sort: 1
  }));

  const failed = Object.values(state.failed || {}).map(quest => ({
    ...quest,
    journalStatus: 'Failed',
    sort: 2
  }));

  return [...active, ...completed, ...failed].sort((a, b) => {
    if (a.sort !== b.sort) return a.sort - b.sort;
    return (b.startedAt || 0) - (a.startedAt || 0);
  });
}

export function getQuestJournalSummary(player) {
  const state = ensureQuestState(player);

  return {
    activeCount: Object.keys(state.active || {}).length,
    completedCount: Object.keys(state.completed || {}).length,
    failedCount: Object.keys(state.failed || {}).length,
    activeQuestId: state.activeQuestId || null
  };
}

export function getQuestByIdFromPlayer(player, questId) {
  const state = ensureQuestState(player);

  return state.active[questId] ||
    state.completed[questId] ||
    state.failed[questId] ||
    null;
}

export function getCurrentStage(activeQuest) {
  if (!activeQuest?.stages?.length) return null;

  const index = Math.max(0, Math.min(
    activeQuest.stages.length - 1,
    Number(activeQuest.currentStageIndex || 0)
  ));

  return activeQuest.stages[index] || null;
}

export function getFirstIncompleteObjective(stage) {
  if (!stage?.objectives?.length) return null;

  return stage.objectives.find(objective => !objective.completed) ||
    stage.objectives[0] ||
    null;
}

export function getObjectiveProgressText(objective) {
  if (!objective) return '';

  const progress = Math.min(
    Number(objective.progress || 0),
    Number(objective.required || 1)
  );

  const required = Number(objective.required || 1);

  if (objective.type === 'collect') {
    const item = ITEMS[objective.itemId];
    const name = item?.name || objective.itemId || 'Item';
    return `${name}: ${progress}/${required}`;
  }

  if (objective.type === 'kill') {
    const name = prettifyId(objective.enemyKind || objective.enemyId || objective.enemyName || 'Enemy');
    return `${name} defeated: ${progress}/${required}`;
  }

  if (objective.type === 'talk') {
    const npc = getNpc(objective.npcId);
    const name = npc?.name || prettifyId(objective.npcId || 'NPC');
    return `Speak with ${name}: ${progress}/${required}`;
  }

  if (objective.type === 'discoverPoi') {
    const poi = getPoi(objective.poiId);
    const name = poi?.name || prettifyId(objective.poiId || 'Location');
    return `Discover ${name}: ${progress}/${required}`;
  }

  if (objective.type === 'enterDungeon') {
    return `Enter dungeon: ${progress}/${required}`;
  }

  if (objective.type === 'clearDungeon') {
    return `Clear dungeon: ${progress}/${required}`;
  }

  return `${prettifyId(objective.type)}: ${progress}/${required}`;
}

function stageObjectivesComplete(stage) {
  if (!stage?.objectives?.length) return true;

  return stage.objectives.every(objective => objective.completed);
}

function getFirstActiveQuestId(player) {
  const state = ensureQuestState(player);
  return Object.keys(state.active || {})[0] || null;
}

// -----------------------------------------------------------------------------
// QUEST REWARDS
// -----------------------------------------------------------------------------

export function applyQuestRewards(player, quest, log = null) {
  if (!player || !quest?.rewards) return false;

  const rewards = quest.rewards;

  if (rewards.items) {
    applyItemRewards(player, rewards.items, log);
  }

  if (rewards.xp) {
    applyXpRewards(player, rewards.xp, log);
  }

  return true;
}

function applyItemRewards(player, itemRewards, log = null) {
  if (!Array.isArray(itemRewards)) return;

  player.inventory = Array.isArray(player.inventory) ? player.inventory : [];

  for (const reward of itemRewards) {
    const itemId = Array.isArray(reward) ? reward[0] : reward.itemId;
    const qty = Math.max(1, Number(Array.isArray(reward) ? reward[1] : reward.qty || 1));

    if (!itemId || !ITEMS[itemId]) {
      console.warn(`Quest reward item does not exist: ${itemId}`);
      continue;
    }

    addItemDirect(player, itemId, qty);

    const itemName = ITEMS[itemId]?.name || itemId;
    log?.(`Received ${qty} ${itemName}.`);
  }
}

function addItemDirect(player, itemId, qty = 1) {
  const item = ITEMS[itemId];

  if (!item) return false;

  if (item.stack) {
    const existing = player.inventory.find(entry => entry.id === itemId);

    if (existing) {
      existing.qty = Number(existing.qty || 0) + qty;
    } else {
      player.inventory.push({
        id: itemId,
        qty
      });
    }

    return true;
  }

  for (let i = 0; i < qty; i++) {
    player.inventory.push({
      id: itemId,
      qty: 1
    });
  }

  return true;
}

function applyXpRewards(player, xpRewards, log = null) {
  // XP application is intentionally soft-linked.
  // main/player integration can later route this through gainXp from player.js.
  // For now, this stores pending XP rewards safely so we do not create circular imports.
  player.pendingQuestXpRewards = Array.isArray(player.pendingQuestXpRewards)
    ? player.pendingQuestXpRewards
    : [];

  for (const [skillId, amount] of Object.entries(xpRewards || {})) {
    const safeAmount = Math.max(0, Number(amount || 0));

    if (safeAmount <= 0) continue;

    player.pendingQuestXpRewards.push({
      skillId,
      amount: safeAmount,
      source: 'quest'
    });

    log?.(`Quest reward pending: ${safeAmount} ${prettifyId(skillId)} XP.`);
  }
}

// -----------------------------------------------------------------------------
// RECENT UPDATES
// -----------------------------------------------------------------------------

export function consumeRecentQuestUpdates(player) {
  const state = ensureQuestState(player);
  const updates = [...(state.recentlyUpdated || [])];

  state.recentlyUpdated = [];

  return updates;
}

export function consumeRecentQuestCompletions(player) {
  const state = ensureQuestState(player);
  const completions = [...(state.recentlyCompleted || [])];

  state.recentlyCompleted = [];

  return completions;
}

function pushRecentUpdate(player, update) {
  const state = ensureQuestState(player);

  state.recentlyUpdated.unshift({
    time: Date.now(),
    ...update
  });

  state.recentlyUpdated = state.recentlyUpdated.slice(0, 12);
}

function pushRecentCompletion(player, update) {
  const state = ensureQuestState(player);

  state.recentlyCompleted.unshift({
    time: Date.now(),
    ...update
  });

  state.recentlyCompleted = state.recentlyCompleted.slice(0, 12);
}

// -----------------------------------------------------------------------------
// DEBUG / DEV HELPERS
// -----------------------------------------------------------------------------

export function devCompleteActiveQuest(player, log = null) {
  const tracker = getActiveQuestTracker(player);

  if (!tracker.hasQuest) {
    log?.('No active quest to complete.');
    return false;
  }

  return completeQuest(player, tracker.questId, log);
}

export function devAdvanceActiveQuest(player, log = null) {
  const state = ensureQuestState(player);
  const questId = state.activeQuestId;

  if (!questId || !state.active[questId]) {
    log?.('No active quest to advance.');
    return false;
  }

  const activeQuest = state.active[questId];
  const stage = getCurrentStage(activeQuest);

  if (!stage) return completeQuest(player, questId, log);

  for (const objective of stage.objectives || []) {
    objective.progress = objective.required;
    objective.completed = true;
  }

  stage.completed = true;

  return advanceQuestStage(player, activeQuest, log);
}

// -----------------------------------------------------------------------------
// SMALL HELPERS
// -----------------------------------------------------------------------------

function prettifyId(id) {
  return String(id || '')
    .replace(/([A-Z])/g, ' $1')
    .replace(/[-_]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
    .replace(/^./, c => c.toUpperCase());
}

function structuredCloneSafe(value) {
  return JSON.parse(JSON.stringify(value));
}