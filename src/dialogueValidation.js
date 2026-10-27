// dialogueValidation.js
// Development-time schema validation for authored Runalis conversations.

import { RUNALIS_CLASSES, CLASS_ID_ALIASES } from './classData.js';
import { ITEMS } from './data.js';
import { COMPANIONS } from './companionData.js';
import { STORY_DIALOGUE_TRIGGERS } from './dialogueData.js';
import { DIALOGUES, NPCS, getAllQuests } from './worldContent.js';

const CANONICAL_RACES = new Set(['human', 'cambion', 'nephilim', 'vampire']);
const CONDITION_KEYS = Object.freeze({
  classAny: 'class',
  classNone: 'class',
  raceAny: 'race',
  raceNone: 'race',
  requiresItems: 'item',
  requiresQuestActive: 'quest',
  requiresQuestCompleted: 'quest',
  requiresQuestReady: 'quest',
  requiresQuestNotStarted: 'quest',
  companionAny: 'companion',
  requiresCompanions: 'companion',
  requiresFlags: 'flag',
  requiresAnyFlags: 'flag',
  excludesFlags: 'flag'
});

export function validateAllRunalisDialogues(options = {}) {
  const dialogues = { ...DIALOGUES, ...STORY_DIALOGUE_TRIGGERS };
  const issues = [];
  const nodes = Object.values(dialogues).filter(Boolean);
  const nodeIds = new Set(Object.keys(dialogues));
  const declaredIds = new Map();
  const questIds = new Set(getAllQuests().map(quest => quest?.id).filter(Boolean));
  const classIds = new Set([...Object.keys(RUNALIS_CLASSES), ...Object.keys(CLASS_ID_ALIASES)]);
  const itemIds = new Set(Object.keys(ITEMS));
  const companionIds = new Set(Object.keys(COMPANIONS));
  const knownFlags = collectKnownFlags(nodes);
  const entryIds = new Set([
    ...Object.values(NPCS).map(npc => npc?.dialogueId).filter(Boolean),
    ...Object.keys(STORY_DIALOGUE_TRIGGERS)
  ]);

  for (const [registryId, node] of Object.entries(dialogues)) {
    const nodeId = node.id || registryId;
    if (!node.id) addIssue(issues, 'error', 'missing-node-id', registryId, 'Node has no authored id.');
    if (node.id && node.id !== registryId) addIssue(issues, 'warning', 'id-key-mismatch', nodeId, `Registry key is ${registryId}.`);
    if (declaredIds.has(nodeId)) addIssue(issues, 'error', 'duplicate-node-id', nodeId, `Also declared at ${declaredIds.get(nodeId)}.`);
    declaredIds.set(nodeId, registryId);

    if (!node.speaker && !node.speakerId && !node.speakerName) {
      addIssue(issues, 'error', 'missing-speaker', nodeId, 'Node has no speaker id or name.');
    }
    if (!String(node.text || '').trim()) addIssue(issues, 'error', 'empty-text', nodeId, 'Node text is empty.');

    const choices = node.choices || node.options || [];
    const nextNodeId = node.nextNodeId || node.next || null;
    if (nextNodeId && choices.length && !node.allowContinuationWithChoices) {
      addIssue(issues, 'error', 'ambiguous-continuation', nodeId, 'Node contains both an automatic continuation and choices.');
    }
    if (nextNodeId && !nodeIds.has(nextNodeId)) {
      addIssue(issues, 'error', 'missing-next-node', nodeId, `Continuation ${nextNodeId} does not exist.`);
    }
    if (choices.length && !choices.some(choice => choice?.close || choice?.action === 'closeDialogue' || choice?.next || choice?.nextNodeId || choice?.response)) {
      addIssue(issues, 'error', 'choice-list-no-exit', nodeId, 'Choice list has no response, continuation, or close action.');
    }

    const choiceIds = new Set();
    for (const choice of choices) {
      if (!choice) continue;
      const choiceId = choice.id || '(missing)';
      const location = `${nodeId}.${choiceId}`;
      if (!choice.id) addIssue(issues, 'error', 'missing-choice-id', location, 'Choice has no id.');
      if (choice.id && choiceIds.has(choice.id)) addIssue(issues, 'error', 'duplicate-choice-id', location, 'Choice id is duplicated in this node.');
      choiceIds.add(choice.id);

      const label = String(choice.label || choice.text || '').trim();
      if (!label) addIssue(issues, 'error', 'empty-choice-text', location, 'Choice has no player-facing text.');
      if (looksLikeNpcExposition(label)) {
        addIssue(issues, 'warning', 'probable-npc-exposition-choice', location, 'Choice text resembles NPC exposition rather than a player response.');
      }
      if (/^(continue|next|go on|listen)\.?$/i.test(label) && !choice.intentionalContinuation) {
        addIssue(issues, 'warning', 'fake-continuation-choice', location, 'Use nextNodeId for an automatic utterance chain.');
      }

      const choiceNext = choice.nextNodeId || choice.next;
      if (choiceNext && !nodeIds.has(choiceNext)) {
        addIssue(issues, 'error', 'missing-choice-next-node', location, `Continuation ${choiceNext} does not exist.`);
      }

      validateConditions(choice, location, {
        class: classIds,
        race: CANONICAL_RACES,
        item: itemIds,
        quest: questIds,
        companion: companionIds,
        flag: knownFlags
      }, issues);

      if (hasRepeatSensitiveEffects(choice) && !choice.id) {
        addIssue(issues, 'error', 'unkeyed-repeat-sensitive-event', location, 'Permanent effects require a stable choice id.');
      }
    }
  }

  validateReachability(dialogues, entryIds, issues);
  validateAutomaticCycles(dialogues, issues);

  const result = {
    valid: !issues.some(issue => issue.severity === 'error'),
    dialogueCount: nodes.length,
    choiceCount: nodes.reduce((total, node) => total + (node.choices || node.options || []).length, 0),
    legacyResponseCount: nodes.flatMap(node => node.choices || node.options || []).filter(choice => choice?.response).length,
    errors: issues.filter(issue => issue.severity === 'error'),
    warnings: issues.filter(issue => issue.severity === 'warning'),
    issues
  };

  if (options.throwOnError && !result.valid) {
    throw new Error(formatDialogueValidationReport(result));
  }
  return result;
}

export function formatDialogueValidationReport(result) {
  const lines = [
    `Dialogue validation: ${result.valid ? 'PASS' : 'FAIL'}`,
    `${result.dialogueCount} nodes, ${result.choiceCount} choices, ${result.errors.length} errors, ${result.warnings.length} warnings`
  ];
  for (const issue of result.issues || []) {
    lines.push(`[${issue.severity.toUpperCase()}] ${issue.code} @ ${issue.location}: ${issue.message}`);
  }
  return lines.join('\n');
}

function validateConditions(choice, location, registries, issues) {
  for (const [key, kind] of Object.entries(CONDITION_KEYS)) {
    const values = normalizeConditionValues(choice[key]);
    for (const rawValue of values) {
      const id = kind === 'item' && Array.isArray(rawValue)
        ? rawValue[0]
        : kind === 'item' && typeof rawValue === 'object'
          ? rawValue.itemId
          : typeof rawValue === 'object'
            ? rawValue.id || rawValue.questId || rawValue.companionId
            : rawValue;
      if (!id) continue;
      if (!registries[kind]?.has(id)) {
        const severity = kind === 'flag' ? 'warning' : 'error';
        addIssue(issues, severity, `missing-${kind}-condition`, location, `${key} references unknown ${kind} ${id}.`);
      }
    }
  }

  for (const stageKey of ['requiresQuestStage', 'requiresQuestStageAtLeast']) {
    for (const value of normalizeConditionValues(choice[stageKey])) {
      const questId = typeof value === 'string' ? value.split(':')[0] : value?.questId || value?.id;
      if (questId && !registries.quest.has(questId)) {
        addIssue(issues, 'error', 'missing-quest-condition', location, `${stageKey} references unknown quest ${questId}.`);
      }
    }
  }
}

function validateReachability(dialogues, entryIds, issues) {
  const reached = new Set();
  const visit = id => {
    if (!id || reached.has(id) || !dialogues[id]) return;
    reached.add(id);
    const node = dialogues[id];
    visit(node.nextNodeId || node.next);
    for (const choice of node.choices || node.options || []) visit(choice?.nextNodeId || choice?.next);
  };
  for (const entryId of entryIds) visit(entryId);
  for (const id of Object.keys(dialogues)) {
    if (!reached.has(id)) addIssue(issues, 'warning', 'inaccessible-node', id, 'Node is not reachable from an NPC or story-dialogue entry point.');
  }
}

function validateAutomaticCycles(dialogues, issues) {
  const visiting = new Set();
  const visited = new Set();
  const walk = id => {
    if (!id || visited.has(id) || !dialogues[id]) return;
    if (visiting.has(id)) {
      if (!dialogues[id].intentionalLoop) addIssue(issues, 'error', 'automatic-cycle', id, 'Automatic continuation loop has no intentionalLoop marker.');
      return;
    }
    visiting.add(id);
    walk(dialogues[id].nextNodeId || dialogues[id].next);
    visiting.delete(id);
    visited.add(id);
  };
  for (const id of Object.keys(dialogues)) walk(id);
}

function collectKnownFlags(nodes) {
  const flags = new Set();
  for (const node of nodes) {
    for (const flag of normalizeConditionValues(node.flagsSet)) flags.add(flag);
    for (const choice of node.choices || node.options || []) {
      for (const flag of normalizeConditionValues(choice?.flagsSet)) flags.add(flag);
    }
  }
  return flags;
}

function hasRepeatSensitiveEffects(choice) {
  return !!(choice.startsQuest || choice.completesQuest || choice.poiResolution || choice.costItems || choice.rewardItems || choice.rewardXp || choice.hostile);
}

function looksLikeNpcExposition(label) {
  return label.length > 180 || /^[A-Z][\w' -]{1,30}:\s/.test(label) || /^['“\"]/.test(label) && /[.!?]['”\"]?$/.test(label);
}

function normalizeConditionValues(value) {
  if (value === undefined || value === null || value === false) return [];
  return Array.isArray(value) ? value : [value];
}

function addIssue(issues, severity, code, location, message) {
  issues.push({ severity, code, location, message });
}
