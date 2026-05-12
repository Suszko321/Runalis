// dialogueSystem.js
// Runalis dialogue system.
//
// Responsibilities:
// - Open / close NPC dialogue.
// - Read dialogue trees from worldContent.js.
// - Handle dialogue options.
// - Always include a Leave option.
// - Start quests when dialogue option requests it.
// - Reveal POIs when dialogue option requests it.
// - Trigger hostile NPC conversion when dialogue option requests it.
// - Provide UI-ready dialogue state.

import {
  getDialogue,
  getNpcByObjectId,
  getQuest,
  getPoi
} from './worldContent.js';

// -----------------------------------------------------------------------------
// PUBLIC API
// -----------------------------------------------------------------------------

export function createDialogueState() {
  return {
    active: false,

    npcObjectId: null,
    npcId: null,
    npcName: null,

    dialogueId: null,
    currentNodeId: null,

    text: '',
    responseText: '',
    options: [],

    selectedIndex: 0,

    lastStartedQuestId: null,
    lastRevealedPoiId: null,
    lastHostileNpcObjectId: null,

    messageTimer: 0
  };
}

export function openDialogue(dialogueState, npcObject, player, world) {
  if (!dialogueState || !npcObject) return false;

  const npcDefinition =
    getNpcByObjectId(npcObject.id) ||
    getNpcByObjectId(npcObject.npcId) ||
    null;

  const dialogueId =
    npcObject.dialogueId ||
    npcDefinition?.dialogueId ||
    null;

  if (!dialogueId) {
    openFallbackDialogue(dialogueState, npcObject);
    clampDialogueSelection(dialogueState);
    return true;
  }

  const dialogue = getDialogue(dialogueId);

  if (!dialogue) {
    openFallbackDialogue(dialogueState, npcObject);
    clampDialogueSelection(dialogueState);
    return true;
  }

  dialogueState.active = true;
  dialogueState.npcObjectId = npcObject.id;
  dialogueState.npcId = npcObject.npcId || npcDefinition?.id || npcObject.id;
  dialogueState.npcName = npcObject.name || npcDefinition?.name || dialogue.speaker || 'Unknown';
  dialogueState.dialogueId = dialogueId;
  dialogueState.currentNodeId = dialogueId;
  dialogueState.responseText = '';
  dialogueState.selectedIndex = 0;
  dialogueState.lastStartedQuestId = null;
  dialogueState.lastRevealedPoiId = null;
  dialogueState.lastHostileNpcObjectId = null;
  dialogueState.messageTimer = 0;

  applyDialogueNode(dialogueState, dialogue);
  clampDialogueSelection(dialogueState);

  markNpcTalkObjective(player, dialogueState.npcId);

  return true;
}

export function closeDialogue(dialogueState) {
  if (!dialogueState) return;

  dialogueState.active = false;
  dialogueState.npcObjectId = null;
  dialogueState.npcId = null;
  dialogueState.npcName = null;
  dialogueState.dialogueId = null;
  dialogueState.currentNodeId = null;
  dialogueState.text = '';
  dialogueState.responseText = '';
  dialogueState.options = [];
  dialogueState.selectedIndex = 0;
  dialogueState.lastStartedQuestId = null;
  dialogueState.lastRevealedPoiId = null;
  dialogueState.lastHostileNpcObjectId = null;
  dialogueState.messageTimer = 0;
}

export function updateDialogue(dialogueState, dt) {
  if (!dialogueState || !dialogueState.active) return;

  clampDialogueSelection(dialogueState);

  if (dialogueState.messageTimer > 0) {
    dialogueState.messageTimer = Math.max(0, dialogueState.messageTimer - dt);
  }
}

export function updateDialogueInput(dialogueState, input, player, world) {
  if (!dialogueState || !dialogueState.active) return false;

  clampDialogueSelection(dialogueState);

  if (pressed(input, 'Escape') || pressed(input, 'esc')) {
    closeDialogue(dialogueState);
    consumeDialogueKeys(input);
    return true;
  }

  if (pressed(input, 'ArrowUp') || pressed(input, 'KeyW') || pressed(input, 'w')) {
    moveDialogueSelection(dialogueState, -1);
    consumeDialogueKeys(input);
    return true;
  }

  if (pressed(input, 'ArrowDown') || pressed(input, 'KeyS') || pressed(input, 's')) {
    moveDialogueSelection(dialogueState, 1);
    consumeDialogueKeys(input);
    return true;
  }

  if (
    pressed(input, 'Enter') ||
    pressed(input, 'Space') ||
    pressed(input, 'KeyE') ||
    pressed(input, 'e')
  ) {
    chooseDialogueOption(dialogueState, player, world);
    consumeDialogueKeys(input);
    return true;
  }

  return false;
}

export function moveDialogueSelection(dialogueState, direction) {
  if (!dialogueState?.active) return;

  const count = getSelectableOptionCount(dialogueState);

  if (count <= 0) {
    dialogueState.selectedIndex = 0;
    return;
  }

  dialogueState.selectedIndex = Number(dialogueState.selectedIndex || 0);
  dialogueState.selectedIndex += direction;

  if (dialogueState.selectedIndex < 0) {
    dialogueState.selectedIndex = count - 1;
  }

  if (dialogueState.selectedIndex >= count) {
    dialogueState.selectedIndex = 0;
  }

  clampDialogueSelection(dialogueState);
}

export function chooseDialogueOption(dialogueState, player, world) {
  if (!dialogueState?.active) return false;

  clampDialogueSelection(dialogueState);

  const option = dialogueState.options?.[dialogueState.selectedIndex];

  if (!option) {
    dialogueState.selectedIndex = 0;
    return false;
  }

  applyDialogueOptionEffects(dialogueState, option, player, world);

  if (option.close) {
    closeDialogue(dialogueState);
    return true;
  }

  if (option.next) {
    const nextNode = getDialogue(option.next);

    if (nextNode) {
      dialogueState.currentNodeId = option.next;
      dialogueState.responseText = '';
      dialogueState.selectedIndex = 0;

      applyDialogueNode(dialogueState, nextNode);
      clampDialogueSelection(dialogueState);

      return true;
    }
  }

  if (option.response) {
    dialogueState.responseText = option.response;
    dialogueState.messageTimer = 5;
  }

  clampDialogueSelection(dialogueState);
  return true;
}

export function getDialogueState(dialogueState) {
  return dialogueState;
}

export function isDialogueOpen(dialogueState) {
  return !!dialogueState?.active;
}

export function findNearbyDialogueNpc(player, world, maxDistance = 48) {
  if (!player || !world?.objects) return null;

  let best = null;
  let bestDistance = Infinity;

  for (const object of world.objects) {
    if (!object || object.depleted) continue;
    if (object.kind !== 'npc') continue;

    const hasDialogue = !!object.dialogueId || !!object.talk || !!object.npcId;
    if (!hasDialogue) continue;

    const d = Math.hypot(object.x - player.x, object.y - player.y);

    if (d <= maxDistance && d < bestDistance) {
      best = object;
      bestDistance = d;
    }
  }

  return best;
}

// -----------------------------------------------------------------------------
// NODE / OPTION HANDLING
// -----------------------------------------------------------------------------

function applyDialogueNode(dialogueState, dialogueNode) {
  dialogueState.npcName = dialogueNode.speaker || dialogueState.npcName || 'Unknown';
  dialogueState.text = dialogueNode.text || '';
  dialogueState.options = normalizeDialogueOptions(dialogueNode.options);

  clampDialogueSelection(dialogueState);
}

function normalizeDialogueOptions(options) {
  const normalized = Array.isArray(options)
    ? options.map(option => ({ ...option }))
    : [];

  const hasLeave = normalized.some(option => {
    return option.close === true || option.id === 'leave';
  });

  if (!hasLeave) {
    normalized.push({
      id: 'leave',
      label: 'Leave.',
      close: true
    });
  }

  return normalized;
}

function applyDialogueOptionEffects(dialogueState, option, player, world) {
  if (!option) return;

  if (option.startsQuest) {
    startQuestFromDialogue(player, option.startsQuest, dialogueState);
  }

  if (option.revealsPoi) {
    revealPoiFromDialogue(player, option.revealsPoi, dialogueState);
  }

  if (option.hostile) {
    triggerHostility(dialogueState, world);
  }

  if (option.response) {
    dialogueState.responseText = option.response;
    dialogueState.messageTimer = 5;
  }
}

function startQuestFromDialogue(player, questId, dialogueState) {
  if (!player || !questId) return false;

  const quest = getQuest(questId);
  if (!quest) return false;

  ensureQuestLog(player);

  const existing = player.quests.active[questId] || player.quests.completed[questId];

  if (existing) {
    dialogueState.responseText = `Quest already known: ${quest.title}`;
    dialogueState.messageTimer = 4;
    return false;
  }

  const firstStage = quest.stages?.[0] || null;

  player.quests.active[questId] = {
    id: questId,
    title: quest.title,
    description: quest.description || '',
    startedAt: performance.now(),
    stageIndex: 0,
    currentStageId: firstStage?.id || null,
    objectives: createObjectiveProgress(firstStage?.objectives || []),
    complete: false,
    readyToTurnIn: false
  };

  dialogueState.lastStartedQuestId = questId;
  dialogueState.responseText = `Quest started: ${quest.title}`;
  dialogueState.messageTimer = 5;

  return true;
}

function revealPoiFromDialogue(player, poiId, dialogueState) {
  if (!player || !poiId) return false;

  const poi = getPoi(poiId);
  if (!poi) return false;

  ensureDiscoveryLog(player);

  if (!player.discoveredPois[poiId]) {
    player.discoveredPois[poiId] = {
      id: poiId,
      name: poi.name,
      discoveredAt: performance.now()
    };

    dialogueState.lastRevealedPoiId = poiId;
    dialogueState.responseText = poi.discoveredText || `${poi.name} discovered.`;
    dialogueState.messageTimer = 5;

    markDiscoverPoiObjective(player, poiId);

    return true;
  }

  return false;
}

function triggerHostility(dialogueState, world) {
  if (!dialogueState?.npcObjectId || !world?.objects) return false;

  const npc = world.objects.find(object => object.id === dialogueState.npcObjectId);
  if (!npc) return false;

  npc.disposition = 'hostile';
  npc.hostile = true;
  npc.wasProvoked = true;

  dialogueState.lastHostileNpcObjectId = npc.id;

  convertHostileNpcToEnemy(world, npc);

  return true;
}

function convertHostileNpcToEnemy(world, npc) {
  if (!world || !npc) return;

  if (!Array.isArray(world.enemies)) {
    world.enemies = [];
  }

  const enemyId = `${npc.id}-enemy`;

  const alreadyExists = world.enemies.some(enemy => enemy.id === enemyId);
  if (alreadyExists) return;

  const enemyKind = getEnemyKindForHostileNpc(npc);

  world.enemies.push({
    id: enemyId,
    kind: enemyKind,
    name: npc.name || 'Hostile NPC',

    x: npc.x,
    y: npc.y,

    r: 15,
    radius: 15,

    hp: npc.hp || 90,
    maxHp: npc.maxHp || npc.hp || 90,

    damage: npc.damage || npc.dmg || 12,
    dmg: npc.damage || npc.dmg || 12,

    xp: npc.xp || 55,
    speed: npc.speed || 54,

    aggroRange: npc.aggroRange || 260,
    attackRange: npc.attackRange || 28,
    attackRate: npc.attackRate || 1.05,
    attackCooldown: 0,
    attackCd: 0,

    factionId: npc.factionId || 'hostile',
    sourceNpcId: npc.npcId || npc.id,

    slowTimer: 0,
    hitFlash: 0,
    dead: false,
    remove: false
  });
}

function getEnemyKindForHostileNpc(npc) {
  if (npc.factionId === 'demonCult') return 'demonCultist';
  if (npc.factionId === 'bandits') return 'roadlessBandit';
  if (npc.factionId === 'castleCourt') return 'veyrWraith';

  return 'hollowling';
}

// -----------------------------------------------------------------------------
// QUEST OBJECTIVE HELPERS
// -----------------------------------------------------------------------------

export function markNpcTalkObjective(player, npcId) {
  if (!player || !npcId) return;
  if (!player.quests?.active) return;

  for (const questState of Object.values(player.quests.active)) {
    const objectives = questState.objectives || [];

    for (const objective of objectives) {
      if (objective.type !== 'talk') continue;
      if (objective.npcId !== npcId) continue;

      objective.current = Math.min(objective.required, objective.current + 1);
    }

    updateQuestStageCompletion(player, questState.id);
  }
}

export function markDiscoverPoiObjective(player, poiId) {
  if (!player || !poiId) return;
  if (!player.quests?.active) return;

  for (const questState of Object.values(player.quests.active)) {
    const objectives = questState.objectives || [];

    for (const objective of objectives) {
      if (objective.type !== 'discoverPoi') continue;
      if (objective.poiId !== poiId) continue;

      objective.current = Math.min(objective.required, objective.current + 1);
    }

    updateQuestStageCompletion(player, questState.id);
  }
}

export function markKillObjective(player, enemy) {
  if (!player || !enemy) return;
  if (!player.quests?.active) return;

  for (const questState of Object.values(player.quests.active)) {
    const objectives = questState.objectives || [];

    for (const objective of objectives) {
      if (objective.type === 'kill' && objective.enemyKind === enemy.kind) {
        objective.current = Math.min(objective.required, objective.current + 1);
      }

      if (
        objective.type === 'killAny' &&
        Array.isArray(objective.enemyKinds) &&
        objective.enemyKinds.includes(enemy.kind)
      ) {
        objective.current = Math.min(objective.required, objective.current + 1);
      }
    }

    updateQuestStageCompletion(player, questState.id);
  }
}

export function markCollectObjective(player, itemId, amount = 1) {
  if (!player || !itemId) return;
  if (!player.quests?.active) return;

  for (const questState of Object.values(player.quests.active)) {
    const objectives = questState.objectives || [];

    for (const objective of objectives) {
      if (objective.type !== 'collect') continue;
      if (objective.itemId !== itemId) continue;

      objective.current = Math.min(objective.required, objective.current + amount);
    }

    updateQuestStageCompletion(player, questState.id);
  }
}

export function updateQuestStageCompletion(player, questId) {
  if (!player?.quests?.active?.[questId]) return false;

  const questState = player.quests.active[questId];
  const quest = getQuest(questId);

  if (!quest) return false;

  const complete = areObjectivesComplete(questState.objectives || []);

  if (!complete) return false;

  const nextStageIndex = questState.stageIndex + 1;
  const nextStage = quest.stages?.[nextStageIndex] || null;

  if (!nextStage) {
    questState.complete = true;
    questState.readyToTurnIn = true;
    return true;
  }

  questState.stageIndex = nextStageIndex;
  questState.currentStageId = nextStage.id;
  questState.objectives = createObjectiveProgress(nextStage.objectives || []);

  return true;
}

export function completeQuest(player, questId) {
  if (!player?.quests?.active?.[questId]) return false;

  const quest = getQuest(questId);
  if (!quest) return false;

  ensureQuestLog(player);

  const questState = player.quests.active[questId];

  if (!questState.complete && !questState.readyToTurnIn) return false;

  delete player.quests.active[questId];

  player.quests.completed[questId] = {
    id: questId,
    title: quest.title,
    completedAt: performance.now()
  };

  applyQuestRewards(player, quest);

  return true;
}

function createObjectiveProgress(objectives) {
  return objectives.map(objective => ({
    ...objective,
    current: 0
  }));
}

function areObjectivesComplete(objectives) {
  if (!objectives.length) return true;

  return objectives.every(objective => {
    const required = objective.required || 1;
    const current = objective.current || 0;

    return current >= required;
  });
}

function applyQuestRewards(player, quest) {
  if (!player || !quest?.rewards) return;

  const rewards = quest.rewards;

  if (rewards.xp) {
    player.pendingQuestXp = player.pendingQuestXp || {};

    for (const [skillId, amount] of Object.entries(rewards.xp)) {
      player.pendingQuestXp[skillId] = (player.pendingQuestXp[skillId] || 0) + amount;
    }
  }

  if (Array.isArray(rewards.items)) {
    player.inventory = player.inventory || [];

    for (const [itemId, amount] of rewards.items) {
      player.inventory.push({
        id: itemId,
        itemId,
        qty: amount || 1,
        source: 'questReward'
      });
    }
  }
}

// -----------------------------------------------------------------------------
// DISCOVERY HELPERS
// -----------------------------------------------------------------------------

export function updatePoiDiscovery(player, world) {
  if (!player || !world?.objects) return [];

  ensureDiscoveryLog(player);

  const discovered = [];

  for (const object of world.objects) {
    if (!object?.poiId) continue;

    const d = Math.hypot(object.x - player.x, object.y - player.y);
    const radius = object.r || 28;

    if (d <= radius + 24 && !player.discoveredPois[object.poiId]) {
      const poi = getPoi(object.poiId);

      player.discoveredPois[object.poiId] = {
        id: object.poiId,
        name: poi?.name || object.name || object.poiId,
        discoveredAt: performance.now()
      };

      markDiscoverPoiObjective(player, object.poiId);

      discovered.push(object.poiId);
    }
  }

  return discovered;
}

// -----------------------------------------------------------------------------
// INITIALIZATION HELPERS
// -----------------------------------------------------------------------------

export function ensurePlayerDialogueAndQuestState(player) {
  ensureQuestLog(player);
  ensureDiscoveryLog(player);
}

function ensureQuestLog(player) {
  if (!player) return;

  if (!player.quests) {
    player.quests = {
      active: {},
      completed: {}
    };
  }

  if (!player.quests.active) player.quests.active = {};
  if (!player.quests.completed) player.quests.completed = {};
}

function ensureDiscoveryLog(player) {
  if (!player) return;

  if (!player.discoveredPois) {
    player.discoveredPois = {};
  }
}

// -----------------------------------------------------------------------------
// FALLBACK DIALOGUE
// -----------------------------------------------------------------------------

function openFallbackDialogue(dialogueState, npcObject) {
  dialogueState.active = true;
  dialogueState.npcObjectId = npcObject.id;
  dialogueState.npcId = npcObject.npcId || npcObject.id;
  dialogueState.npcName = npcObject.name || 'Unknown';
  dialogueState.dialogueId = null;
  dialogueState.currentNodeId = null;
  dialogueState.text = npcObject.talk || `${npcObject.name || 'Someone'} has nothing else to say.`;
  dialogueState.responseText = '';
  dialogueState.options = normalizeDialogueOptions([]);
  dialogueState.selectedIndex = 0;
  dialogueState.messageTimer = 0;

  clampDialogueSelection(dialogueState);
}

// -----------------------------------------------------------------------------
// INPUT HELPERS
// -----------------------------------------------------------------------------

function pressed(input, key) {
  if (!input) return false;

  if (typeof input.wasPressed === 'function' && input.wasPressed(key)) return true;
  if (typeof input.pressed === 'function' && input.pressed(key)) return true;

  if (input.justPressed?.[key]) return true;
  if (input.keysJustPressed?.[key]) return true;
  if (input.pressedKeys?.[key]) return true;

  return false;
}

function consumeDialogueKeys(input) {
  if (!input) return;

  const keys = [
    'Escape',
    'esc',
    'ArrowUp',
    'ArrowDown',
    'KeyW',
    'KeyS',
    'KeyE',
    'Enter',
    'Space',
    'w',
    's',
    'e'
  ];

  for (const key of keys) {
    if (input.justPressed) input.justPressed[key] = false;
    if (input.keysJustPressed) input.keysJustPressed[key] = false;
    if (input.pressedKeys) input.pressedKeys[key] = false;
  }
}

// -----------------------------------------------------------------------------
// SELECTION SAFETY HELPERS
// -----------------------------------------------------------------------------

function getSelectableOptionCount(dialogueState) {
  const options = Array.isArray(dialogueState?.options)
    ? dialogueState.options
    : [];

  return options.length;
}

function clampDialogueSelection(dialogueState) {
  if (!dialogueState) return;

  const count = getSelectableOptionCount(dialogueState);

  if (count <= 0) {
    dialogueState.selectedIndex = 0;
    return;
  }

  const selected = Number(dialogueState.selectedIndex || 0);

  dialogueState.selectedIndex = clamp(
    selected,
    0,
    count - 1
  );
}

// -----------------------------------------------------------------------------
// GENERAL HELPERS
// -----------------------------------------------------------------------------

function clamp(value, min, max) {
  return Math.max(min, Math.min(max, value));
}