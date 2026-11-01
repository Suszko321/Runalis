// Director-approved playable roster. Retired tasks must not return through saves,
// compatibility journals, dialogue snapshots or cached world marker metadata.
export const QUEST_ROSTER_VERSION = 1;
export const PLAYABLE_QUEST_IDS = Object.freeze([
  'mercy_in_orrakai', 'act1HearthmereAshes', 'act2AureateReckoning', 'act3Severance',
  'vampireRedChalice', 'groveLastLullaby', 'orchardBelowTheBurn', 'ironMireLastShift'
]);
const playable = new Set(PLAYABLE_QUEST_IDS);
export const isQuestEnabled = id => playable.has(id);

// Copy only changed collections. Save normalization must not mutate the live
// actor's nested records. Earned inventory, XP, bloodlines and world outcomes stay.
export function retireRemovedQuestState(player) {
  if (!player) return;
  for (const key of ['quests', 'questState']) {
    const source = player[key];
    if (!source || typeof source !== 'object') continue;
    let next = source;
    const set = (field, value) => { if (next === source) next = {...source}; next[field] = value; };
    for (const field of ['active', 'completed', 'failed']) {
      const records = source[field];
      if (records && Object.keys(records).some(id => !isQuestEnabled(id))) {
        set(field, Object.fromEntries(Object.entries(records).filter(([id]) => isQuestEnabled(id))));
      }
    }
    for (const field of ['activeQuestId', 'trackedQuestId']) {
      if (source[field] && !isQuestEnabled(source[field])) set(field, null);
    }
    for (const field of ['recentlyUpdated', 'recentlyCompleted']) {
      if (!Array.isArray(source[field])) continue;
      const kept = source[field].filter(entry => isQuestEnabled(entry?.questId || entry?.id));
      if (kept.length !== source[field].length) set(field, kept);
    }
    player[key] = next;
  }
  if (player.questProgress && Object.keys(player.questProgress).some(id => !isQuestEnabled(id))) {
    player.questProgress = Object.fromEntries(Object.entries(player.questProgress).filter(([id]) => isQuestEnabled(id)));
  }
}

export function dialogueReferencesRemovedQuest(option) {
  if (!option) return false;
  if (option.orderAction || ['foundOrder', 'orderLedger'].includes(option.action)) return true;
  for (const field of ['startsQuest', 'completesQuest', 'confirmsBloodlineQuest']) {
    if (option[field] && !isQuestEnabled(option[field])) return true;
  }
  for (const field of ['requiresQuestActive', 'requiresQuestCompleted', 'requiresQuestNotStarted', 'excludesQuestCompleted', 'requiresQuestStage', 'requiresQuestStageAtLeast']) {
    const value = option[field];
    for (const entry of Array.isArray(value) ? value : value ? [value] : []) {
      const id = typeof entry === 'string' ? entry : entry.questId || entry.id;
      if (id && !isQuestEnabled(id)) return true;
    }
  }
  return false;
}
