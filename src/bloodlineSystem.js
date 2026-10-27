// bloodlineSystem.js
// Mutually exclusive hidden Act 1 bloodline transformations.

import {
  applyStoryFlags,
  ensureStoryProgress
} from './storyProgress.js';

import {
  addQuestText,
  addStatusText
} from './floatingText.js';

import { unlockActiveAbility } from './abilityLoadoutSystem.js';

export const BLOODLINE_QUEST_IDS = {
  cambion: 'cambionAshenPact',
  nephilim: 'nephilimBrokenHalo',
  vampire: 'vampireRedChalice'
};

export const BLOODLINE_DEFINITIONS = {
  cambion: {
    id: 'cambion',
    name: 'Cambion',
    title: 'Half-Demon',
    tree: 'cambion',
    abilityId: 'hellfireBrand',
    theme: 'Infernal survival, brutal burst damage, and corruption that bites back.',
    confirmationText:
      'To become Cambion is to carry infernal fire as your own. It will not be borrowed, and it will not be undone.',
    positives: ['+8% ability damage', '+14% hellfire damage', '+2 bloodline skill points'],
    negatives: ['-18% healing received', '+5% incoming damage'],
    modifiers: {
      abilityDamagePct: 8,
      fireDamagePct: 14,
      healingReceivedPct: -18,
      incomingDamageTakenPct: 5
    },
    flags: ['bloodline.chosen', 'bloodline.cambion', 'unbound.infernalRiteSurvived']
  },

  nephilim: {
    id: 'nephilim',
    name: 'Nephilim',
    title: 'Half-Angel',
    tree: 'nephilim',
    abilityId: 'seraphicAegis',
    theme: 'Radiant defense, disciplined holy pressure, and a body that rejects darker comforts.',
    confirmationText:
      'To become Nephilim is to carry a light that may judge you as harshly as your enemies.',
    positives: ['+10% holy damage', '-4% incoming damage', '+2 bloodline skill points'],
    negatives: ['-8% necrotic damage', '-6% lifesteal effectiveness'],
    modifiers: {
      holyDamagePct: 10,
      necroticDamagePct: -8,
      lifestealPct: -6,
      incomingDamageTakenPct: -4
    },
    flags: ['bloodline.chosen', 'bloodline.nephilim', 'unbound.radiantRiteSurvived']
  },

  vampire: {
    id: 'vampire',
    name: 'Vampire',
    title: 'Blood-Cursed',
    tree: 'vampire',
    abilityId: 'crimsonFeast',
    theme: 'Lifesteal, speed, predatory dueling, and dangerous hunger.',
    confirmationText:
      'To become Vampire is to step beyond ordinary life and carry a hunger that will never truly sleep.',
    positives: ['+8% lifesteal', '+5% movement from bloodline nodes', '+2 bloodline skill points'],
    negatives: ['-12% healing received from non-blood sources', '+7% incoming damage'],
    modifiers: {
      lifestealPct: 8,
      healingReceivedPct: -12,
      incomingDamageTakenPct: 7
    },
    flags: ['bloodline.chosen', 'bloodline.vampire', 'unbound.redChaliceAccepted']
  }
};

export function normalizeBloodlineState(player) {
  if (!player) return null;

  player.bloodline = player.bloodline && typeof player.bloodline === 'object'
    ? player.bloodline
    : {};

  if (player.raceId && BLOODLINE_DEFINITIONS[player.raceId] && !player.bloodline.id) {
    player.bloodline.id = player.raceId;
  }

  if (player.bloodline.id && !BLOODLINE_DEFINITIONS[player.bloodline.id]) {
    player.bloodline = {};
  }

  if (player.bloodline.id) {
    const definition = BLOODLINE_DEFINITIONS[player.bloodline.id];
    player.raceId = definition.id;
    player.raceName = definition.name;
    player.bloodline.name = definition.name;
    player.bloodline.title = definition.title;
    player.bloodline.tree = definition.tree;
    player.bloodline.abilityId = definition.abilityId;
    player.bloodline.chosenAt = player.bloodline.chosenAt || Date.now();
    player.bloodline.awakened = true;
    player.bloodline.permanent = true;
    player.bloodline.lockedChoices = createLockedChoices(definition.id);
    cancelCompetingBloodlineQuests(player, definition.id);
  } else {
    player.raceId = null;
    player.raceName = null;
    player.bloodline.awakened = false;
    player.bloodline.permanent = false;
    player.bloodline.lockedChoices = normalizeLockedChoices(player.bloodline.lockedChoices);
  }

  return player.bloodline;
}

export function getPlayerBloodlineId(player) {
  return normalizeBloodlineState(player)?.id || null;
}

export function getPlayerBloodline(player) {
  const id = getPlayerBloodlineId(player);
  return id ? BLOODLINE_DEFINITIONS[id] : null;
}

export function canChooseBloodline(player, bloodlineId) {
  if (!BLOODLINE_DEFINITIONS[bloodlineId]) {
    return { ok: false, reason: 'Unknown bloodline.' };
  }

  const current = getPlayerBloodlineId(player);
  const locked = !!player?.bloodline?.lockedChoices?.[bloodlineId];

  if (!current && locked) {
    return { ok: false, reason: 'This awakened race is permanently locked.' };
  }

  if (current && current !== bloodlineId) {
    return {
      ok: false,
      reason: `${BLOODLINE_DEFINITIONS[current].name} already claimed this character.`
    };
  }

  if (current === bloodlineId) {
    return { ok: false, reason: 'This bloodline is already active.' };
  }

  return { ok: true, reason: 'Available' };
}

export function questBloodlineIsBlocked(player, quest) {
  const questBloodline = quest?.rewards?.bloodline || quest?.bloodline;
  if (!questBloodline) return false;

  const current = getPlayerBloodlineId(player);
  return (!!current && current !== questBloodline) || !!player?.bloodline?.lockedChoices?.[questBloodline];
}

export function applyBloodline(player, bloodlineId, log = null) {
  if (!player || !bloodlineId) return false;

  const check = canChooseBloodline(player, bloodlineId);
  if (!check.ok) {
    log?.(check.reason);
    return false;
  }

  const definition = BLOODLINE_DEFINITIONS[bloodlineId];

  ensureStoryProgress(player);
  normalizeBloodlineState(player);

  player.bloodline = {
    id: definition.id,
    name: definition.name,
    title: definition.title,
    tree: definition.tree,
    abilityId: definition.abilityId,
    chosenAt: Date.now(),
    awakened: true,
    permanent: true,
    lockedChoices: createLockedChoices(definition.id)
  };
  player.raceId = definition.id;
  player.raceName = definition.name;

  player.skillTree = player.skillTree && typeof player.skillTree === 'object' ? player.skillTree : {};
  player.skillTree.bloodlineBonusPoints = Math.max(2, Number(player.skillTree.bloodlineBonusPoints || 0));

  unlockBloodlineAbility(player, definition.abilityId);
  cancelCompetingBloodlineQuests(player, definition.id);
  applyStoryFlags(player, [
    ...definition.flags,
    ...Object.keys(BLOODLINE_DEFINITIONS)
      .filter(id => id !== definition.id)
      .map(id => `bloodline.${id}.locked`)
  ]);

  log?.(`${definition.name} bloodline awakened. ${definition.title} abilities unlocked.`);
  addQuestText(player, `${definition.name} Bloodline Awakened`, {
    color: definition.id === 'cambion' ? '#ef6f6c' : definition.id === 'nephilim' ? '#ffecb0' : '#c44762',
    ttl: 2.2,
    size: 18
  });
  addStatusText(player, `Unlocked: ${definition.name} Skill Tree`, {
    color: definition.id === 'cambion' ? '#ef6f6c' : definition.id === 'nephilim' ? '#ffecb0' : '#c44762',
    ttl: 1.6
  });

  return true;
}

export function getBloodlineCombatModifiers(player) {
  const definition = getPlayerBloodline(player);
  return definition?.modifiers || {};
}

export function modifyBloodlineHealing(player, amount, options = {}) {
  const modifiers = getBloodlineCombatModifiers(player);
  let finalAmount = Math.max(0, Number(amount || 0));

  if (options.source === 'lifesteal') {
    finalAmount *= 1 + Number(modifiers.lifestealHealingPct || 0) / 100;
  } else {
    finalAmount *= 1 + Number(modifiers.healingReceivedPct || 0) / 100;
  }

  return Math.max(0, Math.ceil(finalAmount));
}

export function modifyBloodlineIncomingDamage(player, amount) {
  const modifiers = getBloodlineCombatModifiers(player);
  const scalar = 1 + Number(modifiers.incomingDamageTakenPct || 0) / 100;
  return Math.max(0, Math.ceil(Math.max(0, Number(amount || 0)) * scalar));
}

function unlockBloodlineAbility(player, abilityId) {
  if (!abilityId) return;
  unlockActiveAbility(player, abilityId, { autoAssignEmpty: true });
}

function cancelCompetingBloodlineQuests(player, chosenBloodlineId) {
  player.quests = player.quests || { active: {}, completed: {} };
  player.quests.active = player.quests.active || {};
  player.questState = player.questState && typeof player.questState === 'object'
    ? player.questState
    : {};
  player.questState.active = player.questState.active && typeof player.questState.active === 'object'
    ? player.questState.active
    : {};
  player.questState.failed = player.questState.failed && typeof player.questState.failed === 'object'
    ? player.questState.failed
    : {};

  for (const [bloodlineId, questId] of Object.entries(BLOODLINE_QUEST_IDS)) {
    if (bloodlineId === chosenBloodlineId) continue;

    delete player.quests.active[questId];
    delete player.questState.active[questId];
    player.questState.failed[questId] = player.questState.failed[questId] || {
      id: questId,
      status: 'locked',
      reason: `${BLOODLINE_DEFINITIONS[chosenBloodlineId].name} permanently chosen.`,
      lockedAt: Date.now()
    };
  }
}

function createLockedChoices(chosenBloodlineId) {
  return Object.fromEntries(
    Object.keys(BLOODLINE_DEFINITIONS).map(id => [id, id !== chosenBloodlineId])
  );
}

function normalizeLockedChoices(value) {
  const source = value && typeof value === 'object' ? value : {};

  return Object.fromEntries(
    Object.keys(BLOODLINE_DEFINITIONS).map(id => [id, !!source[id]])
  );
}
