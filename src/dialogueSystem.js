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

import {getCampaignStageId} from './act1CampaignData.js';
import {
  getDialogue,
  getNpcByObjectId,
  getQuest,
  getPoi,
  getQuestsForNpc
} from './worldContent.js';

import {
  applyStoryFlags,
  getStoryFlag,
  setStoryFlag
} from './storyProgress.js';

import {
  applyBloodline,
  BLOODLINE_DEFINITIONS,
  canChooseBloodline,
  questBloodlineIsBlocked
} from './bloodlineSystem.js';

import {
  addItem,
  countItem,
  removeItem
} from './player.js';
import { ITEMS } from './data.js';
import { ACT1_ROUTES } from './act1CampaignData.js';
import { getOrderDialogue, orderRecruitmentOptions, applyOrderChoice } from './yourOrder.js';
import { getCampaignConversation } from './campaignConversations.js';
import { applyEnemyStrengthScaling } from './enemyScaling.js';
import { playSfx } from './audioSystem.js';
import {
  applyPoiWorldState,
  getPoiClueCount,
  getPoiState,
  poiContentConditionsMatch,
  resolvePoi
} from './poiStateSystem.js';
import {
  DIALOGUE_PHASES,
  DEFAULT_DIALOGUE_SETTINGS,
  beginDialogueRuntimeNode,
  createDialogueRuntimeState,
  finishDialogueClosing,
  handleDialogueRuntimeInput,
  mergeDialogueSettings,
  moveDialogueRuntimeSelection,
  serializeDialogueRuntime,
  setDialogueProcessing,
  startDialogueClosing,
  updateDialogueRuntime
} from './dialogueRuntime.js';

const ACT1_QUEST_ID = 'act1HearthmereAshes';
const ACT1_LEGACY_STAGE_MAP = {
  frontierSupplies: 'handsThatStillWork',
  oldRoadCorruption: 'bramsRoadLesson',
  chapelEvidence: 'theBrokenChapel',
  redSealDescent: 'descentBeneathHearthmere'
};
const ACT1_LEGACY_STAGE_ORDER = [
  'frontierSupplies',
  'oldRoadCorruption',
  'chapelEvidence',
  'redSealDescent'
];
const BLOODLINE_QUEST_IDS = [
  'cambionAshenPact',
  'nephilimBrokenHalo',
  'vampireRedChalice'
];

// -----------------------------------------------------------------------------
// PUBLIC API
// -----------------------------------------------------------------------------

export function createDialogueState() {
  return {
    ...createDialogueRuntimeState(),
    npcObjectId: null,
    npcId: null,
    actor: null,
    world: null,
    ownerSlot: 1,

    dialogueId: null,
    currentNodeId: null,
    currentNode: null,
    transientNodes: {},
    committedEvents: [],
    effectReplyText: '',
    pendingAction: null,

    lastStartedQuestId: null,
    lastRevealedPoiId: null,
    lastHostileNpcObjectId: null
  };
}

export function openDialogue(dialogueState, npcObject, player, world) {
  if (!dialogueState || !npcObject) return false;

  const npcDefinition =
    getNpcByObjectId(npcObject.id) ||
    getNpcByObjectId(npcObject.npcId) ||
    null;

  const campaign = getCampaignConversation(npcObject,player,world);
  const contextual = campaign && !campaign.ambientCampaign ? campaign : getOrderDialogue(npcObject,player,world) || campaign;
  const dialogueId = contextual?.id ||
    npcObject.dialogueId ||
    npcDefinition?.dialogueId ||
    null;

  if (!dialogueId) {
    resetDialogueForOpening(dialogueState, player, world);
    dialogueState.npcObjectId = npcObject.id;
    dialogueState.npcId = npcObject.npcId || npcObject.id;
    dialogueState.dialogueId = `fallback:${dialogueState.npcId}`;
    openFallbackDialogue(dialogueState, npcObject, player);
    return true;
  }

  const dialogue = contextual || getDialogue(dialogueId);

  if (!dialogue) {
    resetDialogueForOpening(dialogueState, player, world);
    dialogueState.npcObjectId = npcObject.id;
    dialogueState.npcId = npcObject.npcId || npcObject.id;
    dialogueState.dialogueId = `fallback:${dialogueState.npcId}`;
    openFallbackDialogue(dialogueState, npcObject, player);
    return true;
  }

  resetDialogueForOpening(dialogueState, player, world);
  dialogueState.npcObjectId = npcObject.id;
  dialogueState.npcId = npcObject.npcId || npcDefinition?.id || npcObject.id;
  dialogueState.npcName = npcObject.name || npcDefinition?.name || dialogue.speaker || 'Unknown';
  dialogueState.dialogueId = dialogueId;

  if(contextual) dialogueState.transientNodes[dialogueId]=contextual;

  if (!npcObject.deferTalkObjective && (!contextual || contextual.ambientCampaign)) markPartyNpcTalkObjective(player, dialogueState.npcId);

  applyDialogueNode(dialogueState, dialogue, player, dialogueId, { opening: true });

  return true;
}

export function closeDialogue(dialogueState, options = {}) {
  if (!dialogueState) return;
  if (options.immediate) {
    finalizeDialogueClose(dialogueState);
    return;
  }
  startDialogueClosing(dialogueState, options);
}

export function updateDialogue(dialogueState, dt) {
  if (!dialogueState || !dialogueState.active) return;
  updateDialogueRuntime(dialogueState, dt, {
    advance: () => advanceDialogue(dialogueState, dialogueState.actor, dialogueState.world),
    finishClose: () => finalizeDialogueClose(dialogueState),
    onSpeechToken: () => {
      const volume = Number(dialogueState.settings?.speechTickVolume || 0);
      if (volume > 0) playSfx('dialogueTick', {
        volume,
        throttle: 0.045,
        frequency: getDialogueSpeechFrequency(dialogueState.speechProfile, dialogueState.speakerId)
      });
    }
  });

  if (dialogueState.phase === DIALOGUE_PHASES.AWAITING_CHOICE && !dialogueState.historyOpen) {
    dialogueState.conditionRefreshTimer = Number(dialogueState.conditionRefreshTimer || 0) + Math.max(0, Number(dt || 0));
    if (dialogueState.conditionRefreshTimer >= 0.35) {
      dialogueState.conditionRefreshTimer = 0;
      refreshConditionalDialogueChoices(dialogueState, dialogueState.actor);
    }
  }
}

export function updateDialogueInput(dialogueState, input, player, world) {
  if (!dialogueState || !dialogueState.active) return false;
  dialogueState.actor = player || dialogueState.actor;
  dialogueState.world = world || dialogueState.world;

  const previousIndex = dialogueState.selectedIndex;
  const previousPhase = dialogueState.phase;
  const handled = handleDialogueRuntimeInput(dialogueState, input, {
    advance: () => advanceDialogue(dialogueState, player, world),
    choose: index => chooseDialogueOption(dialogueState, player, world, index),
    close: () => closeDialogue(dialogueState, { confirmHeld: !!input?.confirmHeld })
  });

  if (handled) {
    consumeDialogueKeys(input);
    if (dialogueState.selectedIndex !== previousIndex) playSfx('ui', { volume: 0.45, throttle: 0.06 });
    else if (input?.cancelPressed) playSfx('menuBack', { volume: 0.5, throttle: 0.08 });
    else if (dialogueState.phase !== previousPhase && dialogueState.phase !== DIALOGUE_PHASES.TYPING) {
      playSfx('ui', { volume: 0.4, throttle: 0.06 });
    }
  }
  return handled;
}

export function moveDialogueSelection(dialogueState, direction) {
  if (!dialogueState?.active) return;
  moveDialogueRuntimeSelection(dialogueState, direction);
}

export function chooseDialogueOption(dialogueState, player, world, requestedIndex = null) {
  if (!dialogueState?.active) return false;

  if (Number.isInteger(requestedIndex)) dialogueState.selectedIndex = requestedIndex;
  clampDialogueSelection(dialogueState);
  const option = dialogueState.options?.[dialogueState.selectedIndex];

  if (!option || option.disabled) {
    dialogueState.selectedIndex = 0;
    return false;
  }

  if (option.__cancelConfirmation) {
    return returnToDialogueNode(dialogueState, option.returnNodeId, player);
  }

  if (option.__confirmedOption) {
    return executeDialogueChoice(dialogueState, option.__confirmedOption, player, world, {
      confirmed: true,
      originNodeId: option.returnNodeId
    });
  }

  if (option.confirmsBloodlineQuest && !option.confirmBloodline) {
    openBloodlineConfirmation(dialogueState, player, option.confirmsBloodlineQuest);
    return true;
  }

  if (requiresPermanentChoiceConfirmation(dialogueState, option)) {
    return openPermanentChoiceConfirmation(dialogueState, option, player);
  }

  return executeDialogueChoice(dialogueState, option, player, world);
}

export function getDialogueState(dialogueState) {
  return dialogueState;
}

export function serializeDialogueState(dialogueState) {
  return serializeDialogueRuntime(dialogueState);
}

export function restoreDialogueState(dialogueState, snapshot, player, world) {
  if (!dialogueState || !snapshot?.active) return false;

  resetDialogueForOpening(dialogueState, player, world, snapshot.settings);
  dialogueState.dialogueId = snapshot.dialogueId || null;
  dialogueState.npcObjectId = snapshot.npcObjectId || null;
  dialogueState.npcId = snapshot.npcId || null;
  dialogueState.ownerSlot = Number(snapshot.ownerSlot || player?.playerNumber || player?.slot || 1);
  dialogueState.history = Array.isArray(snapshot.history) ? snapshot.history.slice(-80) : [];
  dialogueState.committedEvents = Array.isArray(snapshot.committedEvents) ? [...snapshot.committedEvents] : [];
  dialogueState.transientNodes = snapshot.transientNodes && typeof snapshot.transientNodes === 'object'
    ? snapshot.transientNodes
    : {};

  // Old contextual snapshots embedded the placeholder record/directions menus.
  // Refresh those conversations; quest effects already saved on the actor stay
  // committed, while an unaccepted assignment still requires a fresh response.
  const savedRoot=dialogueState.transientNodes[dialogueState.dialogueId];
  const savedOptions=savedRoot?.options||savedRoot?.choices||[];
  const legacyCampaign=String(dialogueState.dialogueId).startsWith('campaign:')&&
    (String(dialogueState.dialogueId).startsWith('campaign:guide:')||savedOptions.some(o=>o.id==='record')&&!savedOptions.some(o=>String(o.id).startsWith('topic-')));
  const savedNpc=(world?.continentRuntime?.allObjects||world?.objects||[]).find(o=>o.id===dialogueState.npcObjectId);
  if(legacyCampaign&&savedNpc)return openDialogue(dialogueState,savedNpc,player,world);

  const nodeId = snapshot.currentNodeId || snapshot.dialogueId;
  const node = resolveDialogueNode(dialogueState, nodeId);
  if (!node) {
    console.warn(`Dialogue restore skipped: missing node ${nodeId || '(none)'}.`);
    finalizeDialogueClose(dialogueState);
    return false;
  }

  applyDialogueNode(dialogueState, node, player, nodeId, { opening: false });
  dialogueState.selectedIndex = Number(snapshot.selectedIndex || 0);
  dialogueState.choiceScrollOffset = Number(snapshot.choiceScrollOffset || 0);

  if (snapshot.lineComplete) {
    dialogueState.visibleText = dialogueState.fullText;
    dialogueState.revealedTokenCount = dialogueState.tokens.length;
    dialogueState.lineComplete = true;
    dialogueState.phase = dialogueState.options.length
      ? DIALOGUE_PHASES.AWAITING_CHOICE
      : DIALOGUE_PHASES.AWAITING_CONTINUE;
    dialogueState.state = dialogueState.phase;
  } else {
    const revealed = Math.max(0, Math.min(dialogueState.tokens.length, Number(snapshot.revealedTokenCount || 0)));
    dialogueState.revealedTokenCount = revealed;
    dialogueState.visibleText = dialogueState.tokens.slice(0, revealed).join('');
  }

  clampDialogueSelection(dialogueState);
  return true;
}

export function startQuest(player, questId, dialogueState = null) {
  return startQuestFromDialogue(player, questId, dialogueState);
}

export function isDialogueOpen(dialogueState) {
  return !!dialogueState?.active;
}

export function ensurePlayerDialogueSettings(player) {
  if (!player) return { ...DEFAULT_DIALOGUE_SETTINGS };
  player.dialogueSettings = mergeDialogueSettings(player.dialogueSettings);
  return player.dialogueSettings;
}

function resetDialogueForOpening(dialogueState, player, world, savedSettings = null) {
  const history = Array.isArray(dialogueState.history) ? dialogueState.history.slice(-80) : [];
  const settings = mergeDialogueSettings(
    dialogueState.settings,
    ensurePlayerDialogueSettings(player),
    savedSettings
  );
  const fresh = createDialogueState();

  Object.assign(dialogueState, fresh);
  dialogueState.active = true;
  dialogueState.actor = player || null;
  dialogueState.world = world || null;
  dialogueState.ownerSlot = Number(player?.playerNumber || player?.slot || 1);
  dialogueState.settings = settings;
  dialogueState.history = history;
}

function finalizeDialogueClose(dialogueState) {
  if (!dialogueState) return;
  finishDialogueClosing(dialogueState);
  dialogueState.npcObjectId = null;
  dialogueState.npcId = null;
  dialogueState.actor = null;
  dialogueState.world = null;
  dialogueState.dialogueId = null;
  dialogueState.currentNodeId = null;
  dialogueState.currentNode = null;
  dialogueState.transientNodes = {};
  dialogueState.committedEvents = [];
  dialogueState.effectReplyText = '';
  dialogueState.pendingAction = null;
  dialogueState.lastStartedQuestId = null;
  dialogueState.lastRevealedPoiId = null;
  dialogueState.lastHostileNpcObjectId = null;
}

function resolveDialogueNode(dialogueState, nodeId) {
  if (!nodeId || nodeId === '__close__') return null;
  return dialogueState?.transientNodes?.[nodeId] || getDialogue(nodeId) || null;
}

function advanceDialogue(dialogueState, player, world) {
  if (!dialogueState?.active) return false;

  const nextNodeId = dialogueState.nextNodeId;
  if (dialogueState.closeAfterCurrent || !nextNodeId || nextNodeId === '__close__') {
    closeDialogue(dialogueState);
    return true;
  }

  const nextNode = resolveDialogueNode(dialogueState, nextNodeId);
  if (!nextNode) {
    console.warn(`Dialogue closed safely: missing continuation ${nextNodeId}.`);
    closeDialogue(dialogueState);
    return false;
  }

  applyDialogueNode(dialogueState, nextNode, player, nextNodeId, { opening: false });
  dialogueState.world = world || dialogueState.world;
  return true;
}

function returnToDialogueNode(dialogueState, nodeId, player) {
  const returnId = nodeId || dialogueState.dialogueId;
  const node = resolveDialogueNode(dialogueState, returnId);
  if (!node) {
    closeDialogue(dialogueState);
    return false;
  }
  applyDialogueNode(dialogueState, node, player, returnId, { opening: false });
  return true;
}

function refreshConditionalDialogueChoices(dialogueState, player) {
  const contextNodeId = dialogueState.currentNode?.choiceContextNodeId || dialogueState.currentNodeId;
  const contextNode = resolveDialogueNode(dialogueState, contextNodeId);
  if (!contextNode) return;

  const nextOptions = Array.isArray(contextNode.runtimeChoices)
    ? contextNode.runtimeChoices.map(option => ({ ...option }))
    : buildDialogueOptions(dialogueState, contextNode.choices || contextNode.options || [], player, {
        appendNpcQuests: contextNode.appendNpcQuestOptions !== false && contextNodeId === dialogueState.dialogueId && !(contextNode.nextNodeId || contextNode.next)
      });
  const previousId = dialogueState.options?.[dialogueState.selectedIndex]?.id || null;
  dialogueState.options = nextOptions;
  const retainedIndex = previousId ? nextOptions.findIndex(option => option.id === previousId && !option.disabled) : -1;
  if (retainedIndex >= 0) dialogueState.selectedIndex = retainedIndex;
  clampDialogueSelection(dialogueState);
}

function executeDialogueChoice(dialogueState, option, player, world, options = {}) {
  if (!dialogueState?.active || !option) return false;

  const originNodeId = options.originNodeId || dialogueState.currentNode?.choiceContextNodeId || dialogueState.currentNodeId || dialogueState.dialogueId;
  setDialogueProcessing(dialogueState);
  dialogueState.effectReplyText = '';

  const eventId = getDialogueChoiceEventId(dialogueState, originNodeId, option);
  const committed = dialogueState.committedEvents.includes(eventId);
  if (!committed) {
    applyDialogueOptionEffects(dialogueState, option, player, world, originNodeId);
    if (choiceHasCommittedEffects(option)) dialogueState.committedEvents.push(eventId);
  }

  const effectReplyText = dialogueState.effectReplyText;
  dialogueState.effectReplyText = '';

  if (option.close || option.action === 'closeDialogue') {
    closeDialogue(dialogueState);
    return true;
  }

  if (option.opensShop || option.opensInventory || option.opensUi || option.action) {
    dialogueState.pendingAction = {
      type: option.opensShop ? 'shop' : option.opensInventory ? 'inventory' : option.opensUi || option.action,
      id: option.opensShop || option.opensInventory || option.opensUi || option.action,
      actorSlot: dialogueState.ownerSlot
    };
  }

  const explicitNext = option.closeAfterResponse || option.hostile || option.hostileNpcObjectId
    ? '__close__'
    : option.nextNodeId || option.next || null;
  const returnNodeId = explicitNext || originNodeId || dialogueState.dialogueId;
  const replyText = String(option.response || effectReplyText || '');
  let continuationId = returnNodeId;

  if (replyText) {
    const originNode = resolveDialogueNode(dialogueState, originNodeId);
    const refreshedChoices = explicitNext || !originNode
      ? []
      : Array.isArray(originNode.runtimeChoices)
        ? originNode.runtimeChoices.map(choice => ({ ...choice }))
        : buildDialogueOptions(dialogueState, originNode.choices || originNode.options || [], player, {
            appendNpcQuests: originNode.appendNpcQuestOptions !== false && originNodeId === dialogueState.dialogueId && !(originNode.nextNodeId || originNode.next)
          });
    const responseNodeId = registerTransientNode(dialogueState, {
      id: transientNodeId(dialogueState, 'reply', option.id),
      speakerId: option.responseSpeakerId || originNode?.speakerId || dialogueState.npcId || 'npc',
      speakerName: option.responseSpeakerName || originNode?.speakerName || originNode?.speaker || dialogueState.rootSpeakerName || dialogueState.npcName || 'Unknown',
      text: replyText,
      nextNodeId: explicitNext,
      runtimeChoices: refreshedChoices,
      choiceContextNodeId: originNodeId
    });
    continuationId = responseNodeId;
  }

  const playerText = String(option.spokenText || stripChoiceMetadata(option.label || option.text || ''));
  const showPlayerResponse = dialogueState.settings?.showPlayerResponses !== false && playerText && !option.__noPlayerEcho;

  if (showPlayerResponse) {
    const playerNodeId = registerTransientNode(dialogueState, {
      id: transientNodeId(dialogueState, 'player', option.id),
      speakerId: 'player',
      speakerName: player?.name || 'You',
      text: playerText,
      nextNodeId: continuationId,
      runtimeChoices: [],
      playerUtterance: true
    });
    const playerNode = resolveDialogueNode(dialogueState, playerNodeId);
    applyDialogueNode(dialogueState, playerNode, player, playerNodeId, { opening: false, playerUtterance: true });
    return true;
  }

  if (continuationId === '__close__') {
    closeDialogue(dialogueState);
    return true;
  }

  const continuation = resolveDialogueNode(dialogueState, continuationId);
  if (continuation) {
    applyDialogueNode(dialogueState, continuation, player, continuationId, { opening: false });
    return true;
  }

  closeDialogue(dialogueState);
  return true;
}

function requiresPermanentChoiceConfirmation(dialogueState, option) {
  if (!dialogueState?.settings?.confirmPermanentChoices) return false;
  if (option.confirmed || option.requiresConfirmation === false) return false;
  return !!(
    option.requiresConfirmation ||
    option.poiResolution ||
    option.hostile || option.hostileNpcObjectId ||
    option.confirmBloodline
  );
}

function openPermanentChoiceConfirmation(dialogueState, option, player) {
  const returnNodeId = dialogueState.currentNodeId || dialogueState.dialogueId;
  const nodeId = transientNodeId(dialogueState, 'confirm', option.id);
  registerTransientNode(dialogueState, {
    id: nodeId,
    speakerId: 'narration',
    speakerName: 'Decision',
    text: option.confirmationText || 'This decision permanently changes the world and cannot be undone. Confirm your choice.',
    runtimeChoices: [
      {
        id: `confirm-${option.id || 'choice'}`,
        label: `Confirm: ${option.label || option.text || 'Make this choice'}`,
        __confirmedOption: { ...option, confirmed: true },
        returnNodeId,
        __noPlayerEcho: true
      },
      {
        id: `cancel-${option.id || 'choice'}`,
        label: 'Go back.',
        __cancelConfirmation: true,
        returnNodeId,
        __noPlayerEcho: true
      }
    ]
  });
  applyDialogueNode(dialogueState, resolveDialogueNode(dialogueState, nodeId), player, nodeId, { opening: false });
  return true;
}

function registerTransientNode(dialogueState, node) {
  const id = node.id || transientNodeId(dialogueState, 'node', 'anonymous');
  dialogueState.transientNodes = dialogueState.transientNodes || {};
  dialogueState.transientNodes[id] = { ...node, id };
  return id;
}

function transientNodeId(dialogueState, kind, sourceId) {
  const safeSource = String(sourceId || 'choice').replace(/[^a-zA-Z0-9_-]/g, '-');
  const sequence = Number(dialogueState.sequence || 0) + Object.keys(dialogueState.transientNodes || {}).length + 1;
  return `__${kind}:${dialogueState.dialogueId || 'dialogue'}:${safeSource}:${sequence}`;
}

function getDialogueChoiceEventId(dialogueState, nodeId, option) {
  return `${dialogueState.dialogueId || 'dialogue'}:${nodeId || 'node'}:${option.id || option.label || 'choice'}`;
}

function choiceHasCommittedEffects(option) {
  return !!(
    option.orderAction || option.regulatorStep !== undefined || option.karma || option.relationships || option.learnRoute ||
    option.startsQuest || option.completesQuest || option.confirmsBloodlineQuest || option.poiResolution ||
    option.flagsSet || option.flagsCleared || option.revealsPoi || option.hostile || option.hostileNpcObjectId || option.costItems || option.requiresItems ||
    option.rewardItems || option.rewardXp || option.completesTalkObjective || option.action || option.opensShop || option.opensInventory || option.opensUi
  );
}

function stripChoiceMetadata(label) {
  return String(label || '').replace(/^\s*\[[^\]]+\]\s*/, '').trim();
}

function resolveDialogueText(text, player) {
  return String(text || '')
    .replace(/\{player(?:Name)?\}/gi, player?.name || 'Wayfarer')
    .replace(/\{item:([^}]+)\}/gi, (_, itemId) => ITEMS[itemId]?.name || itemId)
    .replace(/\{key:([^}]+)\}/gi, (_, keyName) => keyName)
    .replace(/\[(?:\/?b|\/?i|\/?em|\/?strong)\]/gi, '')
    .replace(/\[\/?color(?:=[^\]]+)?\]/gi, '');
}

function getDialogueSpeechFrequency(profile, speakerId) {
  if (profile === 'narration') return 330;
  if (profile === 'player') return 520;
  const value = String(speakerId || 'speaker');
  let hash = 0;
  for (let index = 0; index < value.length; index++) hash = (hash * 31 + value.charCodeAt(index)) >>> 0;
  return 385 + (hash % 130);
}

function showDialogueMessage(dialogueState, player, text) {
  const returnNodeId = dialogueState.currentNodeId || dialogueState.dialogueId || '__close__';
  const nodeId = transientNodeId(dialogueState, 'notice', 'system');
  registerTransientNode(dialogueState, {
    id: nodeId,
    speakerId: 'narration',
    speakerName: 'Narration',
    text: String(text || 'The conversation cannot continue.'),
    nextNodeId: returnNodeId,
    runtimeChoices: []
  });
  applyDialogueNode(dialogueState, resolveDialogueNode(dialogueState, nodeId), player, nodeId, { opening: false });
}

export function npcHasQuestInteraction(player, npcObject) {
  if (!player || !npcObject || npcObject.interactable === false) return false;
  const mercy=player.quests?.active?.mercy_in_orrakai?.currentStageId;
  if(npcObject.orrakaiWatch&&npcHasActiveTalkObjective(player,'orrakaiLowerGateGuard'))return true;
  if((mercy==='returnOldWellEvidence'||mercy==='confrontEvidence')&&['wardenMael','lightwardenCaelen'].includes(npcObject.npcId))return true;
  if(mercy==='witnessHealingRite'&&npcObject.npcId==='covenantHealingRite')return true;
  if(mercy==='returnToMara'&&npcObject.npcId==='maraVell')return true;

  const npcDefinition =
    getNpcByObjectId(npcObject.npcId) ||
    getNpcByObjectId(npcObject.id) ||
    null;
  const npcId = npcObject.npcId || npcDefinition?.id || npcObject.id;

  if (!npcId) return false;

  if (npcHasActiveTalkObjective(player, npcId)) return true;
  if (npcHasReadyQuestTurnIn(player, npcId)) return true;
  if (npcCanOfferQuest(player, npcId)) return true;

  const dialogueId = npcObject.dialogueId || npcDefinition?.dialogueId || null;
  const dialogue = dialogueId ? getDialogue(dialogueId) : null;

  if (!dialogue) return false;

  const options = normalizeDialogueOptions(
    filterDialogueOptionsForPlayer(dialogue.options || [], player)
  );

  return options.some(option => {
    return option && option.id !== 'leave' && (
      option.startsQuest ||
      option.completesQuest ||
      option.confirmsBloodlineQuest
    );
  });
}

function npcHasActiveTalkObjective(player, npcId) {
  const owner = getQuestOwner(player);

  for (const questSource of getQuestStateSources(player)) {
    const activeQuests = questSource?.quests?.active || {};
    const scope = owner && owner !== player
      ? (questSource === player ? 'personal' : 'shared')
      : 'all';

    for (const questState of Object.values(activeQuests)) {
      if (!questMatchesProgressScope(questState, scope)) continue;

      for (const objective of questState?.objectives || []) {
        if (objective?.type !== 'talk') continue;
        if (objective.npcId !== npcId) continue;

        const required = Math.max(1, Number(objective.required || 1));
        const current = Math.max(0, Number(objective.current || 0));

        if (current < required) return true;
      }
    }
  }

  return false;
}

function npcHasReadyQuestTurnIn(player, npcId) {
  if (npcId === 'wardenMael' && legacyFirstOathIsReady(player)) {
    return true;
  }

  for (const questSource of getQuestStateSources(player)) {
    const activeQuests = questSource?.quests?.active || {};

    for (const [questId, questState] of Object.entries(activeQuests)) {
      if (!questState?.readyToTurnIn && !questState?.complete) continue;

      const quest = getQuest(questId);
      if (!quest || quest.giverNpcId !== npcId) continue;
      if (getQuestProgressOwner(player, quest) !== questSource) continue;

      return true;
    }
  }

  return false;
}

function npcCanOfferQuest(player, npcId) {
  const deprecatedQuestIds = new Set(['hollowCrown', 'solgateOath', 'humanBeginningLegacy']);

  return getQuestsForNpc(npcId).some(quest => {
    if (!quest || quest.hidden) return false;
    if (deprecatedQuestIds.has(quest.id)) return false;
    if (quest.type === 'main' || quest.type === 'mainStory') return false;

    const state = getQuestStateSnapshot(player, quest.id);
    if (state.active || state.completed || state.failed) return false;

    if (questBloodlineIsBlocked(getQuestProgressOwner(player, quest), quest)) return false;

    return true;
  });
}

function getQuestStateSources(player) {
  if (!player) return [];

  const owner = getQuestOwner(player);
  return owner && owner !== player ? [player, owner] : [player];
}

function legacyFirstOathIsReady(player) {
  if (!player || player.quests?.active?.firstOath || player.quests?.completed?.firstOath) {
    return false;
  }

  const legacyState = Number(player.quest?.firstOath || 0);
  const hollowlings = Number(player.quest?.hollowlings || 0);

  return (
    legacyState > 0 &&
    legacyState < 3 &&
    countItem(player, 'emberleaf') >= 3 &&
    countItem(player, 'ironOre') >= 2 &&
    hollowlings >= 3
  );
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

function applyDialogueNode(dialogueState, dialogueNode, player = null, nodeId = null, runtimeOptions = {}) {
  if (!dialogueState || !dialogueNode) return false;

  const resolvedNodeId = nodeId || dialogueNode.id || dialogueState.dialogueId;
  const speakerName = dialogueNode.speakerName || dialogueNode.speaker || dialogueState.rootSpeakerName || dialogueState.npcName || 'Unknown';
  const speakerId = dialogueNode.speakerId || (dialogueNode.playerUtterance ? 'player' : dialogueState.npcId || speakerName);
  let rawChoices = Array.isArray(dialogueNode.runtimeChoices)
    ? dialogueNode.runtimeChoices.map(option => ({ ...option }))
    : (dialogueNode.choices || dialogueNode.options || []);
  if(resolvedNodeId===dialogueState.dialogueId && !resolvedNodeId.startsWith('orderDialogue:')) {
    rawChoices=[...rawChoices,...orderRecruitmentOptions({npcId:dialogueState.npcId,name:speakerName},player)];
  }
  const isRuntimeNode = Array.isArray(dialogueNode.runtimeChoices);
  const appendNpcQuests = !isRuntimeNode && dialogueNode.appendNpcQuestOptions !== false &&
    resolvedNodeId === dialogueState.dialogueId && !(dialogueNode.nextNodeId || dialogueNode.next);
  const choices = isRuntimeNode
    ? rawChoices
    : rawChoices.length
      ? buildDialogueOptions(dialogueState, rawChoices, player, { appendNpcQuests })
      : [];
  const normalizedNode = {
    id: resolvedNodeId,
    speakerId,
    speakerName,
    speechProfile: dialogueNode.speechProfile || null,
    text: resolveDialogueText(dialogueNode.text || '', player),
    nextNodeId: dialogueNode.nextNodeId || dialogueNode.next || null,
    closeAfterCurrent: dialogueNode.closeAfterCurrent || (!choices.length && !(dialogueNode.nextNodeId || dialogueNode.next)),
    choiceContextNodeId: dialogueNode.choiceContextNodeId || resolvedNodeId,
    lineSpeedMultiplier: dialogueNode.playerUtterance ? 0.38 : dialogueNode.lineSpeedMultiplier || 1,
    choices
  };

  dialogueState.currentNodeId = resolvedNodeId;
  dialogueState.currentNode = normalizedNode;
  if (!dialogueState.rootSpeakerName && !dialogueNode.playerUtterance && speakerId !== 'narration') {
    dialogueState.rootSpeakerName = speakerName;
  }

  const enterEventId = `node-enter:${dialogueState.dialogueId || 'dialogue'}:${resolvedNodeId}`;
  if (player && Array.isArray(dialogueNode.flagsSet) && !dialogueState.committedEvents.includes(enterEventId)) {
    applyStoryFlags(player, dialogueNode.flagsSet);
    dialogueState.committedEvents.push(enterEventId);
  }

  beginDialogueRuntimeNode(dialogueState, normalizedNode, {
    opening: runtimeOptions.opening,
    confirmHeld: runtimeOptions.confirmHeld
  });
  clampDialogueSelection(dialogueState);
  return true;
}

function refreshDialogueOptions(dialogueState, player) {
  if (!dialogueState) return;

  const dialogueNode =
    resolveDialogueNode(dialogueState, dialogueState.currentNodeId) ||
    getDialogue(dialogueState.dialogueId);

  if (!dialogueNode) return;

  if (Array.isArray(dialogueNode.runtimeChoices)) {
    dialogueState.options = dialogueNode.runtimeChoices.map(option => ({ ...option }));
  } else if ((dialogueNode.choices || dialogueNode.options || []).length) {
    dialogueState.options = buildDialogueOptions(dialogueState, dialogueNode.choices || dialogueNode.options, player, {
      appendNpcQuests: dialogueState.currentNodeId === dialogueState.dialogueId && !(dialogueNode.nextNodeId || dialogueNode.next)
    });
  } else {
    dialogueState.options = [];
  }
  clampDialogueSelection(dialogueState);
}

function buildDialogueOptions(dialogueState, options, player, settings = {}) {
  const withNpcQuests = settings.appendNpcQuests === false
    ? (Array.isArray(options) ? options.map(option => ({ ...option })) : [])
    : appendNpcQuestOptions(dialogueState, options, player);
  const provider=dialogueState.world?.objects?.find(o=>o.id===dialogueState.npcObjectId);
  if(provider?.apothecaryService&&dialogueState.world.mode==='capital'&&settings.appendNpcQuests!==false&&
    !withNpcQuests.some(o=>o.action==='maraApothecary')){
    const leave=withNpcQuests.findIndex(o=>o.id==='leave'||o.close);
    withNpcQuests.splice(leave<0?withNpcQuests.length:leave,0,{id:'mara-restorative',text:'Prepare a restorative (Gravecap + Pale Essence, or 8 gold).',action:'maraApothecary'});
  }
  if(provider?.workshopService&&!withNpcQuests.some(o=>String(o.action||'').startsWith('workshop'))){
    const smith=provider.workshopService==='blacksmith';
    withNpcQuests.unshift(...(smith?[
      {id:'smith-weapons',text:'Upgrade Weapons',action:'workshopWeapons'},
      {id:'smith-armour',text:'Upgrade Armour & Trinkets',action:'workshopArmour'},
      {id:'smith-about',text:'Ask About Smithing',response:'I work on the piece you bring me, not a replacement. Each tier needs its own materials and coin. Bring spare equipment too; it need not be equipped. I can still refine ore or supply scrap at the forge.'}
    ]:[
      {id:'craft-items',text:'Craft Items',action:'workshopCraft'},
      {id:'craft-about',text:'Ask About Crafting',response:'Choose a recipe at the bench. Your profession still matters, and I need the proper materials. Campfire meals can still be prepared on the road.'}
    ]));
  }
  const available = filterDialogueOptionsForPlayer(withNpcQuests, player);
  return normalizeDialogueOptions(available);
}

function appendNpcQuestOptions(dialogueState, options, player) {
  const normalized = Array.isArray(options)
    ? options.map(option => ({ ...option }))
    : [];

  if (!player || !dialogueState?.npcId) {
    return normalized;
  }

  const knownQuestIds = new Set(normalized.map(option => option.startsQuest).filter(Boolean));
  const deprecatedQuestIds = new Set(['hollowCrown', 'solgateOath', 'humanBeginningLegacy']);
  const quests = getQuestsForNpc(dialogueState.npcId)
    .filter(quest => {
      if (!quest || quest.hidden) return false;
      if (deprecatedQuestIds.has(quest.id)) return false;
      if (quest.type === 'main' || quest.type === 'mainStory') return false;
      if (knownQuestIds.has(quest.id)) return false;
      const state = getQuestStateSnapshot(player, quest.id);
      if (state.active || state.completed || state.failed) return false;
      if (questBloodlineIsBlocked(getQuestProgressOwner(player, quest), quest)) return false;
      return true;
    });

  for (const quest of quests) {
    normalized.push({
      id: `quest-${quest.id}`,
      label: `Quest: ${quest.title}`,
      response: quest.summary || quest.description || 'There is work to do.',
      startsQuest: quest.id
    });
  }

  appendReadyQuestTurnInOptions(normalized, dialogueState, player);

  return normalized;
}

function appendReadyQuestTurnInOptions(options, dialogueState, player) {
  if (dialogueState?.npcId === 'wardenMael') {
    migrateReadyLegacyFirstOath(player);
  }

  const owner = getQuestOwner(player);
  const questSources = owner && owner !== player ? [player, owner] : [player];

  for (const questSource of questSources) {
    const activeQuests = questSource?.quests?.active || {};

    for (const [questId, questState] of Object.entries(activeQuests)) {
      if (!questState?.readyToTurnIn && !questState?.complete) continue;

      const quest = getQuest(questId);
      if (!quest || quest.giverNpcId !== dialogueState.npcId) continue;
      if (getQuestProgressOwner(player, quest) !== questSource) continue;

      if (quest.rewards?.bloodline) {
        const definition = BLOODLINE_DEFINITIONS[quest.rewards.bloodline];

        options.unshift({
          id: `confirm-bloodline-${questId}`,
          label: `Final choice: Become ${definition?.name || 'something else'}.`,
          confirmsBloodlineQuest: questId
        });
        continue;
      }

      options.unshift({
        id: `turn-in-${questId}`,
        label: `Complete quest: ${quest.title}.`,
        completesQuest: questId
      });
    }
  }
}

function migrateReadyLegacyFirstOath(player) {
  if (!player || player.quests?.active?.firstOath || player.quests?.completed?.firstOath) return false;

  const legacyState = Number(player.quest?.firstOath || 0);
  const hollowlings = Number(player.quest?.hollowlings || 0);

  if (
    legacyState <= 0 ||
    legacyState >= 3 ||
    countItem(player, 'emberleaf') < 3 ||
    countItem(player, 'ironOre') < 2 ||
    hollowlings < 3
  ) {
    return false;
  }

  const quest = getQuest('firstOath');
  if (!quest) return false;

  const finalStageIndex = Math.max(0, Number(quest.stages?.length || 1) - 1);
  const finalStage = quest.stages?.[finalStageIndex] || null;

  ensureQuestLog(player);
  player.quests.active.firstOath = {
    id: 'firstOath',
    title: quest.title,
    type: quest.type || 'starter',
    description: quest.summary || '',
    startedAt: performance.now(),
    stageIndex: finalStageIndex,
    currentStageId: finalStage?.id || null,
    objectives: createObjectiveProgress(finalStage?.objectives || [], player).map(objective => ({
      ...objective,
      current: objective.required
    })),
    complete: true,
    readyToTurnIn: true
  };
  syncQuestStateStarted(player, 'firstOath', quest, player.quests.active.firstOath);

  return true;
}

function normalizeDialogueOptions(options) {
  const normalized = Array.isArray(options)
    ? options
      .filter(option => option && option.close !== true && option.id !== 'leave')
      .map(option => ({
        ...option,
        label: option.label || option.text || '...',
        nextNodeId: option.nextNodeId || option.next || null,
        disabled: !!option.disabled
      }))
    : [];

  normalized.push({
    id: 'leave',
    label: 'Leave.',
    close: true
  });

  return normalized;
}

function filterDialogueOptionsForPlayer(options, player) {
  if (!Array.isArray(options)) return [];

  const resolved = [];
  for (const option of options) {
    if (!option || option.hidden) continue;
    const available = dialogueOptionIsAvailable(option, player);
    if (available) {
      resolved.push({ ...option, disabled: false });
      continue;
    }
    if (option.showWhenUnavailable || option.disabled) {
      resolved.push({
        ...option,
        disabled: true,
        requirementText: option.requirementText || getDialogueRequirementText(option)
      });
    }
  }
  return resolved;
}

function dialogueOptionIsAvailable(option, player) {
  if (!option) return false;
  if (option.disabled) return false;
  if (option.close === true || option.id === 'leave') return true;
  if (!player) return !dialogueOptionNeedsPlayerState(option);

  if (option.startsQuest) {
    const quest = getQuest(option.startsQuest);
    const state = getQuestStateSnapshot(player, option.startsQuest);
    const questPlayer = getQuestProgressOwner(player, quest || option.startsQuest);

    if (state.active || state.completed || state.failed) return false;
    if (quest && questBloodlineIsBlocked(questPlayer, quest)) return false;
  }

  if (option.completesQuest || option.confirmsBloodlineQuest) {
    const questId = option.completesQuest || option.confirmsBloodlineQuest;
    const state = getQuestStateSnapshot(player, questId);
    if (!state.active || !state.ready) return false;
  }

  if (!questConditionsMatch(option, player)) return false;
  if (!flagConditionsMatch(option, player)) return false;
  if (!poiContentConditionsMatch(option, player)) return false;
  if (!itemConditionsMatch(option, player)) return false;

  return true;
}

function getDialogueRequirementText(option) {
  if (conditionValues(option.classAny).length) return `Requires ${conditionValues(option.classAny).join(' or ')}`;
  if (conditionValues(option.raceAny).length) return `Requires ${conditionValues(option.raceAny).join(' or ')}`;
  if (conditionValues(option.requiresQuestActive).length) return 'Requires an active quest';
  if (conditionValues(option.requiresQuestCompleted).length) return 'Requires a completed quest';
  if (conditionValues(option.requiresItems).length) return 'Required items are missing';
  if (option.requiresPoiClueCount || option.requiresPoiClues) return 'Requires more investigation';
  return 'Requirements not met';
}

function dialogueOptionNeedsPlayerState(option) {
  return !!(
    option?.startsQuest ||
    option?.completesQuest ||
    option?.confirmsBloodlineQuest ||
    option?.requiresQuestActive ||
    option?.requiresQuestCompleted ||
    option?.requiresQuestReady ||
    option?.requiresQuestNotStarted ||
    option?.requiresQuestStage ||
    option?.requiresQuestStageAtLeast ||
    option?.requiresFlags ||
    option?.requiresAnyFlags ||
    option?.excludesFlags ||
    option?.classAny ||
    option?.classNone ||
    option?.raceAny ||
    option?.raceNone ||
    option?.requiresPoiUnresolved ||
    option?.requiresPoiResolved ||
    option?.requiresPoiResolution ||
    option?.requiresPoiClues ||
    option?.requiresPoiClueCount
    || option?.requiresItems
  );
}

function questConditionsMatch(option, player) {
  if (!conditionQuestIds(option.requiresQuestActive).every(id => getQuestStateSnapshot(player, id).active)) {
    return false;
  }

  if (!conditionQuestIds(option.requiresQuestCompleted).every(id => getQuestStateSnapshot(player, id).completed)) {
    return false;
  }

  if (!conditionQuestIds(option.requiresQuestReady).every(id => getQuestStateSnapshot(player, id).ready)) {
    return false;
  }

  if (!conditionQuestIds(option.requiresQuestNotStarted).every(id => {
    const state = getQuestStateSnapshot(player, id);
    return !state.active && !state.completed && !state.failed;
  })) {
    return false;
  }

  if (!questStageConditions(option.requiresQuestStage).every(condition => {
    const state = getQuestStateSnapshot(player, condition.questId);
    return state.active && state.stageId === condition.stageId;
  })) {
    return false;
  }

  if (!questStageConditions(option.requiresQuestStageAtLeast).every(condition => {
    const state = getQuestStateSnapshot(player, condition.questId);
    const quest = getQuest(condition.questId);
    const requiredIndex = quest?.stages?.findIndex(stage => stage.id === condition.stageId) ?? -1;
    return state.active && requiredIndex >= 0 && state.stageIndex >= requiredIndex;
  })) {
    return false;
  }

  return true;
}

function flagConditionsMatch(option, player) {
  const owner = getQuestOwner(player);
  const hasFlag = flag => !!(
    getStoryFlag(player, flag) ||
    (!option.actorOnlyFlags && owner && owner !== player && getStoryFlag(owner, flag))
  );

  if (!conditionValues(option.requiresFlags).every(hasFlag)) return false;
  if (conditionValues(option.requiresAnyFlags).length && !conditionValues(option.requiresAnyFlags).some(hasFlag)) {
    return false;
  }
  if (conditionValues(option.excludesFlags).some(hasFlag)) return false;

  return true;
}

function itemConditionsMatch(option, player) {
  for (const requirement of option?.requiresItems || []) {
    const [itemId, amount = 1] = Array.isArray(requirement)
      ? requirement
      : [requirement?.itemId, requirement?.qty || 1];
    if (!itemId || (itemId==='ashCoin'?Number(player.gold||0):countItem(player, itemId)) < Number(amount || 1)) return false;
  }
  return true;
}

function getQuestStateSnapshot(player, questId) {
  const quest = getQuest(questId);
  const questPlayer = getQuestProgressOwner(player, quest || questId);
  const activeRecord =
    questPlayer?.quests?.active?.[questId] ||
    questPlayer?.questState?.active?.[questId] ||
    null;
  const completedRecord =
    questPlayer?.quests?.completed?.[questId] ||
    questPlayer?.questState?.completed?.[questId] ||
    null;
  const failedRecord =
    questPlayer?.quests?.failed?.[questId] ||
    questPlayer?.questState?.failed?.[questId] ||
    null;

  const legacyState = Number(questPlayer?.quest?.[questId] || 0);
  const legacyActive = questId === 'firstOath' && legacyState > 0 && legacyState < 3;
  const legacyCompleted = questId === 'firstOath' && legacyState >= 3;
  const stageIndex = Math.max(
    0,
    Number(activeRecord?.stageIndex ?? activeRecord?.currentStageIndex ?? 0)
  );

  return {
    active: !!activeRecord || legacyActive,
    completed: !!completedRecord || legacyCompleted,
    failed: !!failedRecord,
    ready: !!(
      activeRecord?.readyToTurnIn ||
      activeRecord?.complete ||
      activeRecord?.status === 'readyToTurnIn'
    ),
    stageId: activeRecord?.currentStageId || activeRecord?.stages?.[stageIndex]?.id || null,
    stageIndex
  };
}

function conditionQuestIds(value) {
  return conditionValues(value).filter(entry => typeof entry === 'string' && entry);
}

function questStageConditions(value) {
  return conditionValues(value).map(entry => {
    if (typeof entry === 'string') {
      const [questId, stageId] = entry.split(':');
      return { questId, stageId };
    }

    return {
      questId: entry?.questId || entry?.id || '',
      stageId: entry?.stageId || entry?.stage || ''
    };
  }).filter(entry => entry.questId && entry.stageId);
}

function conditionValues(value) {
  if (value === undefined || value === null || value === false) return [];
  return Array.isArray(value) ? value : [value];
}

function applyDialogueOptionEffects(dialogueState, option, player, world, originNodeId = null) {
  if (!option) return;
  if(option.orderAction) applyOrderChoice(player,option.orderAction);
  const campaignOwner=getQuestOwner(player);
  if(Number.isInteger(option.regulatorStep)&&!getStoryFlag(campaignOwner,'act1.machineAligned')) {
    campaignOwner.act1RegulatorStep=option.regulatorStep===(campaignOwner.act1RegulatorStep||0)?option.regulatorStep+1:0;
    player.act1RegulatorStep=campaignOwner.act1RegulatorStep;
    if(campaignOwner.act1RegulatorStep===3)for(const recipient of new Set([player,campaignOwner])){setStoryFlag(recipient,'act1.machineAligned');recipient.locationKnowledge ||= {};recipient.locationKnowledge.demonCultLair={...ACT1_ROUTES.demonCultLair,state:'routeKnown'};}
  }

  // Non-resolution conversations also use inventory costs and rewards. Commit
  // effects once per authored choice for persistent reputation, not per reopening.
  const campaignChoice = option.karma || option.relationships || option.learnRoute || option.campaignOnce;
  const choiceKey = `${originNodeId || dialogueState.currentNode?.choiceContextNodeId || dialogueState.currentNodeId}:${option.id}`;
  player.campaignChoices ||= {};
  if (!campaignChoice || !player.campaignChoices[choiceKey]) {
    if (!option.poiResolution) { consumeDialogueCosts(player, {...option,requiresItems:[]}); grantDialogueRewards(player,option); }
    if (campaignChoice) {
      player.campaignChoices[choiceKey] = true;
      player.factionReputation ||= {};
      for (const [id,delta] of Object.entries(option.karma || {})) player.factionReputation[id] = (player.factionReputation[id] || 0) + delta;
      for (const [id,delta] of Object.entries(option.relationships || {})) {
        player.companions ||= {}; player.companions[id] ||= {relationship:0};
        player.companions[id].relationship = (player.companions[id].relationship || 0) + delta;
      }
    }
  }
  // Knowledge is idempotent and may need sharing with a different host; it is
  // not a repeatable reputation or inventory reward.
  if(option.learnRoute&&ACT1_ROUTES[option.learnRoute])for(const recipient of new Set([player,campaignOwner])){
    recipient.locationKnowledge ||= {};
    const previous=recipient.locationKnowledge[option.learnRoute];
    recipient.locationKnowledge[option.learnRoute]={...ACT1_ROUTES[option.learnRoute],...previous,state:previous?.state||'routeKnown'};
  }

  if (option.confirmsBloodlineQuest) {
    openBloodlineConfirmation(dialogueState, player, option.confirmsBloodlineQuest);
    return;
  }

  if (option.completesQuest) {
    completeQuestFromDialogue(dialogueState, player, option.completesQuest, {
      confirmBloodline: !!option.confirmBloodline
    });
    return;
  }

  if (option.startsQuest) {
    startQuestFromDialogue(player, option.startsQuest, dialogueState);
  }

  if (option.poiResolution?.poiId && option.poiResolution?.id) {
    const result = resolvePoi(
      player,
      option.poiResolution.poiId,
      option.poiResolution.id,
      option.poiResolution
    );

    if (result.resolved) {
      consumeDialogueCosts(player, option);
      markPoiResolutionObjective(player, option.poiResolution.poiId, option.poiResolution.id);
      grantDialogueRewards(player, option);
      applyPoiWorldState(player, world);
    }
  }

  if (Array.isArray(option.flagsSet)) {
    applyStoryFlags(player, option.flagsSet);
    const owner = getQuestOwner(player);
    const sharedOpeningFlags = option.flagsSet.filter(isMercyInOrrakaiSharedFlag);
    if (owner && owner !== player && sharedOpeningFlags.length) applyStoryFlags(owner, sharedOpeningFlags);
  }

  for (const flag of option.flagsCleared || []) {
    setStoryFlag(player, flag, false);
    const owner = getQuestOwner(player);
    if (owner && owner !== player && isMercyInOrrakaiSharedFlag(flag)) setStoryFlag(owner, flag, false);
  }

  if (option.completesTalkObjective) {
    markPartyNpcTalkObjective(player, option.completesTalkObjective);
  }

  if (option.revealsPoi) {
    revealPoiFromDialogue(player, option.revealsPoi, dialogueState);
  }

  if (option.hostile || option.hostileNpcObjectId) {
    triggerHostility(dialogueState, world, option.hostileNpcObjectId);
  }

}

function isMercyInOrrakaiSharedFlag(flag) {
  const id = String(flag || '');
  return id.startsWith('mercy.') || id.startsWith('caravan_') || id.startsWith('orrakai_extra_supply_');
}

function consumeDialogueCosts(player, option) {
  for (const cost of option?.costItems || option?.requiresItems || []) {
    const [itemId, amount = 1] = Array.isArray(cost) ? cost : [cost?.itemId, cost?.qty || 1];
    if (itemId) removeItem(player, itemId, Number(amount || 1));
  }
}

function grantDialogueRewards(player, option) {
  for (const reward of option.rewardItems || []) {
    const [itemId, amount = 1] = Array.isArray(reward)
      ? reward
      : [reward?.itemId, reward?.qty || 1];
    if (itemId) addItem(player, itemId, amount);
  }

  if (option.rewardXp && typeof option.rewardXp === 'object') {
    player.pendingQuestXp = player.pendingQuestXp || {};
    for (const [skillId, amount] of Object.entries(option.rewardXp)) {
      player.pendingQuestXp[skillId] = Number(player.pendingQuestXp[skillId] || 0) + Number(amount || 0);
    }
  }
}

function openBloodlineConfirmation(dialogueState, player, questId) {
  const quest = getQuest(questId);
  const bloodlineId = quest?.rewards?.bloodline;
  const definition = BLOODLINE_DEFINITIONS[bloodlineId];
  const questPlayer = getQuestProgressOwner(player, quest);
  const choice = canChooseBloodline(questPlayer, bloodlineId);

  if (!quest || !definition || !questPlayer?.quests?.active?.[questId]) {
    showDialogueMessage(dialogueState, player, 'The rite is not ready.');
    return;
  }

  if (!choice.ok) {
    showDialogueMessage(dialogueState, player, choice.reason);
    return;
  }

  const nodeId = `__bloodline-confirm:${questId}`;
  registerTransientNode(dialogueState, {
    id: nodeId,
    speakerId: 'narration',
    speakerName: 'Bloodline Rite',
    text: `${definition.confirmationText || definition.theme} This choice is permanent. You can only become one awakened race. Are you sure?`,
    runtimeChoices: [
      {
        id: `accept-${questId}`,
        label: `Confirm transformation: Become ${definition.name}.`,
        completesQuest: questId,
        confirmBloodline: true,
        requiresConfirmation: false
      },
      {
        id: `decline-${questId}`,
        label: 'Not yet. Keep the rite waiting.',
        response: 'The rite waits. Nothing in your blood changes.',
        nextNodeId: dialogueState.dialogueId
      }
    ]
  });
  applyDialogueNode(dialogueState, resolveDialogueNode(dialogueState, nodeId), player, nodeId, { opening: false });
}

function completeQuestFromDialogue(dialogueState, player, questId, options = {}) {
  const quest = getQuest(questId);
  const questPlayer = getQuestProgressOwner(player, quest);
  const completed = finishQuest(questPlayer, questId, true, options);

  if (!completed || !quest) {
    dialogueState.effectReplyText = quest?.rewards?.bloodline
      ? 'The rite remains unfinished. Confirm the choice before proceeding.'
      : 'That work is not ready to turn in.';
    return false;
  }

  if (questId === 'firstOath') {
    player.quest = player.quest || {};
    player.quest.firstOath = 3;
    dialogueState.effectReplyText =
      'Good. You are not ready, but you are less likely to die uselessly. That is enough for a first oath.';
  } else if (quest.rewards?.bloodline) {
    const definition = BLOODLINE_DEFINITIONS[quest.rewards.bloodline];
    dialogueState.effectReplyText =
      `The rite answers. You rise as ${definition?.name || 'something changed'}. ` +
      'The choice is permanent, and the other awakened paths are now closed.';
  } else {
    dialogueState.effectReplyText = `The work is done. ${quest.title} is complete.`;
  }

  return true;
}

function startQuestFromDialogue(player, questId, dialogueState) {
  if (!player || !questId) return false;

  const quest = getQuest(questId);
  if (!quest) return false;

  const questPlayer = getQuestProgressOwner(player, quest);
  ensureQuestLog(questPlayer);

  if (questBloodlineIsBlocked(questPlayer, quest)) {
    if (dialogueState) {
      dialogueState.effectReplyText = 'That path is permanently closed. Your blood has already answered another rite.';
    }

    return false;
  }

  const existing = questPlayer.quests.active[questId] || questPlayer.quests.completed[questId];

  if (existing) {
    if (dialogueState) {
      const definition = BLOODLINE_DEFINITIONS[quest.rewards?.bloodline];
      dialogueState.effectReplyText = definition && questPlayer.bloodline?.id === definition.id
        ? `${definition.name} is already your permanent awakened race.`
        : `Quest already known: ${quest.title}`;
    }

    return false;
  }

  const firstStage = quest.stages?.[0] || null;

  questPlayer.quests.active[questId] = {
    id: questId,
    title: quest.title,
    type: quest.type || 'side',
    description: quest.description || quest.summary || '',
    startedAt: performance.now(),
    stageIndex: 0,
    currentStageId: firstStage?.id || null,
    currentStageTitle: firstStage?.title || firstStage?.text || '',
    currentStageText: firstStage?.text || '',
    objectives: createObjectiveProgress(firstStage?.objectives || [], questPlayer),
    rewardedStages: {},
    complete: false,
    readyToTurnIn: false
  };

  if (questId === 'firstOath') {
    questPlayer.quest = questPlayer.quest || {};
    questPlayer.quest.firstOath = Math.max(1, Number(questPlayer.quest.firstOath || 0));
  }

  syncQuestStateStarted(questPlayer, questId, quest, questPlayer.quests.active[questId]);

  if (dialogueState) {
    dialogueState.lastStartedQuestId = questId;
  }

  return true;
}

function revealPoiFromDialogue(player, poiId, dialogueState) {
  if (!player || !poiId) return false;

  const poi = getPoi(poiId);
  if (!poi) return false;

  if (recordPartyPoiDiscovery(player, poiId, poi.name)) {

    dialogueState.lastRevealedPoiId = poiId;

    return true;
  }

  return false;
}

function triggerHostility(dialogueState, world, targetObjectId = null) {
  const objectId = targetObjectId || dialogueState?.npcObjectId;
  if (!objectId || !world?.objects) return false;

  const npc = world.objects.find(object => object.id === objectId || object.npcId === objectId);
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

  world.enemies.push(applyEnemyStrengthScaling({
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
  }));
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

export function markNpcTalkObjective(player, npcId, scope = 'all') {
  if (!player || !npcId) return;
  if (!player.quests?.active) return;

  for (const questState of Object.values(player.quests.active)) {
    if (!questMatchesProgressScope(questState, scope)) continue;

    const objectives = questState.objectives || [];

    for (const objective of objectives) {
      if (objective.type !== 'talk') continue;
      if (objective.npcId !== npcId) continue;

      objective.current = Math.min(objective.required, objective.current + 1);
    }

    updateQuestStageCompletion(player, questState.id);
  }
}

export function getQuestOwner(player) {
  return player?.questOwner || player || null;
}

export function getQuestProgressOwner(player, questOrId) {
  const quest = typeof questOrId === 'string' ? getQuest(questOrId) : questOrId;

  if (quest?.type === 'bloodline') return player || null;

  return getQuestOwner(player);
}

function questMatchesProgressScope(questState, scope) {
  if (scope === 'all') return true;

  const quest = getQuest(questState?.id);
  const personal = quest?.type === 'bloodline';

  if (scope === 'personal') return personal;
  if (scope === 'shared') return !personal;

  return true;
}

export function markPartyNpcTalkObjective(player, npcId) {
  if (!player || !npcId) return;

  markNpcTalkObjective(player, npcId);

  const owner = getQuestOwner(player);
  if (owner && owner !== player) {
    markNpcTalkObjective(owner, npcId, 'shared');
  }
}

export function markDiscoverPoiObjective(player, poiId, scope = 'all') {
  if (!player || !poiId) return;
  if (!player.quests?.active) return;

  for (const questState of Object.values(player.quests.active)) {
    if (!questMatchesProgressScope(questState, scope)) continue;

    const objectives = questState.objectives || [];

    for (const objective of objectives) {
      if (objective.type !== 'discoverPoi') continue;
      if (objective.poiId !== poiId) continue;

      objective.current = Math.min(objective.required, objective.current + 1);
    }

    updateQuestStageCompletion(player, questState.id);
  }
}

export function markPartyDiscoverPoiObjective(player, poiId) {
  if (!player || !poiId) return;

  markDiscoverPoiObjective(player, poiId);

  const owner = getQuestOwner(player);
  if (owner && owner !== player) {
    markDiscoverPoiObjective(owner, poiId, 'shared');
  }
}

export function markPoiInvestigationObjective(player, poiId, clueId, scope = 'all') {
  if (!player?.quests?.active || !poiId || !clueId) return;

  for (const questState of Object.values(player.quests.active)) {
    if (!questMatchesProgressScope(questState, scope)) continue;
    for (const objective of questState.objectives || []) {
      if (objective.type !== 'investigatePoi' || objective.poiId !== poiId) continue;
      objective.current = Math.min(
        Number(objective.required || 1),
        getPoiClueCount(player, poiId)
      );
    }
    updateQuestStageCompletion(player, questState.id);
  }
}

export function markPartyPoiInvestigationObjective(player, poiId, clueId) {
  markPoiInvestigationObjective(player, poiId, clueId);
  const owner = getQuestOwner(player);
  if (owner && owner !== player) markPoiInvestigationObjective(owner, poiId, clueId, 'shared');
}

export function markPoiResolutionObjective(player, poiId, resolutionId, scope = 'all') {
  if (!player?.quests?.active || !poiId || !resolutionId) return;

  for (const questState of Object.values(player.quests.active)) {
    if (!questMatchesProgressScope(questState, scope)) continue;
    for (const objective of questState.objectives || []) {
      if (objective.type !== 'resolvePoi' || objective.poiId !== poiId) continue;
      objective.current = Math.max(Number(objective.current || 0), 1);
      objective.resolutionId = resolutionId;
      const resolution = getPoiState(player, poiId)?.resolution;
      questState.resolutionId = resolutionId;
      questState.outcomeSummary = resolution?.journalDescription || questState.outcomeSummary || '';
    }
    updateQuestStageCompletion(player, questState.id);
  }
}

export function markKillObjective(player, enemy, scope = 'all') {
  if (!player || !enemy) return;
  if(enemy.id==='oldWellLastDawnRitualist'&&Number.isFinite(enemy.x)&&Number.isFinite(enemy.y))player.mercyLanternRecoveryPoint={x:enemy.x,y:enemy.y};
  if(enemy.questEncounter||enemy.id?.startsWith('greyhaven')){player.campaignKills ||= {};player.campaignKills[enemy.id]=true;}
  if (!player.quests?.active) return;

  for (const questState of Object.values(player.quests.active)) {
    if (!questMatchesProgressScope(questState, scope)) continue;

    const objectives = questState.objectives || [];

    for (const objective of objectives) {
      if (objective.type === 'kill' && objective.enemyKind === enemy.kind) {
        objective.current = Math.min(objective.required, objective.current + 1);
      }

      if (objective.type === 'kill' && objective.enemyId && objective.enemyId === enemy.id) {
        objective.current = Math.min(objective.required, objective.current + 1);
      }

      if (objective.type === 'kill' && objective.enemyName && objective.enemyName === enemy.name) {
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

  if (scope === 'all') {
    const owner = getQuestOwner(player);
    if (owner && owner !== player) markKillObjective(owner, enemy, 'shared');
  }
}

export function markDungeonEnteredObjective(player, dungeonId, scope = 'all') {
  recordDungeonSeen(player, dungeonId);
  markDungeonObjective(player, dungeonId, 'enterDungeon', scope);
}

export function markDungeonClearedObjective(player, dungeonId, scope = 'all') {
  recordDungeonSeen(player, dungeonId);
  recordDungeonCleared(player, dungeonId);
  markDungeonObjective(player, dungeonId, 'clearDungeon', scope);
}

export function markPartyDungeonEnteredObjective(player, dungeonId) {
  if (!player || !dungeonId) return;

  markDungeonEnteredObjective(player, dungeonId);

  const owner = getQuestOwner(player);
  if (owner && owner !== player) {
    markDungeonEnteredObjective(owner, dungeonId, 'shared');
  }
}

export function markPartyDungeonClearedObjective(player, dungeonId) {
  if (!player || !dungeonId) return;

  markDungeonClearedObjective(player, dungeonId);

  const owner = getQuestOwner(player);
  if (owner && owner !== player) {
    markDungeonClearedObjective(owner, dungeonId, 'shared');
  }
}

function markDungeonObjective(player, dungeonId, objectiveType, scope = 'all') {
  if (!player || !dungeonId) return;
  if (!player.quests?.active) return;

  const dungeonAliases = getDungeonObjectiveAliases(dungeonId);

  for (const questState of Object.values(player.quests.active)) {
    if (!questMatchesProgressScope(questState, scope)) continue;

    const objectives = questState.objectives || [];

    for (const objective of objectives) {
      if (objective.type !== objectiveType) continue;

      const objectiveDungeonId = objective.dungeonId || objective.entranceId || objective.poiId;

      if (objectiveDungeonId && !hasDungeonObjectiveAliasMatch(dungeonAliases, objectiveDungeonId)) {
        continue;
      }

      objective.current = Math.min(objective.required, objective.current + 1);
    }

    updateQuestStageCompletion(player, questState.id);
  }
}

function normalizeDungeonObjectiveId(value) {
  return String(value || '')
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]/g, '');
}

function getDungeonObjectiveAliases(dungeonId) {
  const normalized = normalizeDungeonObjectiveId(dungeonId);
  const aliases = new Set([normalized]);

  const actOneDungeonIds = new Set([
    'demoncultlair',
    'dawnspireroot',
    'hollowrootcellar',
    'malakar',
    'malakarsolgatedemonlord',
    'demoncult',
    'cultlair'
  ]);

  if (actOneDungeonIds.has(normalized)) {
    for (const id of actOneDungeonIds) {
      aliases.add(id);
    }
  }

  return aliases;
}

function hasDungeonObjectiveAliasMatch(actualAliases, objectiveDungeonId) {
  const objectiveAliases = getDungeonObjectiveAliases(objectiveDungeonId);

  for (const id of objectiveAliases) {
    if (actualAliases.has(id)) return true;
  }

  return false;
}

export function markCollectObjective(player, itemId, amount = 1, scope = 'all') {
  if (!player || !itemId) return;
  if (!player.quests?.active) return;

  for (const questState of Object.values(player.quests.active)) {
    if (!questMatchesProgressScope(questState, scope)) continue;

    const objectives = questState.objectives || [];

    for (const objective of objectives) {
      if (objective.type !== 'collect') continue;
      if (objective.itemId !== itemId) continue;

      objective.current = Math.min(objective.required, objective.current + amount);
    }

    updateQuestStageCompletion(player, questState.id);
  }
}

export function markPartyCollectObjective(player, itemId, amount = 1) {
  if (!player || !itemId) return;

  markCollectObjective(player, itemId, amount);

  const owner = getQuestOwner(player);
  if (owner && owner !== player) {
    markCollectObjective(owner, itemId, amount, 'shared');
  }
}

export function updateQuestStageCompletion(player, questId) {
  if (!player?.quests?.active?.[questId]) return false;

  const questState = player.quests.active[questId];
  const quest = getQuest(questId);

  if (!quest) return false;

  const complete = areObjectivesComplete(questState.objectives || []);

  if (!complete) return false;

  grantStageRewardsOnce(player, questState, quest.stages?.[questState.stageIndex] || null);

  const nextStageIndex = questState.stageIndex + 1;
  const nextStage = quest.stages?.[nextStageIndex] || null;

  if (!nextStage) {
    questState.complete = true;
    questState.readyToTurnIn = true;
    syncQuestStateStarted(player, questId, quest, questState);

    if (quest.requiresTurnIn || quest.rewards?.bloodline) {
      return true;
    }

    return finishQuest(player, questId);
  }

  questState.stageIndex = nextStageIndex;
  questState.currentStageId = nextStage.id;
  questState.currentStageTitle = nextStage.title || nextStage.text || '';
  questState.currentStageText = nextStage.text || '';
  questState.objectives = createObjectiveProgress(nextStage.objectives || [], player);
  syncQuestStateStarted(player, questId, quest, questState);

  return true;
}

export function completeQuest(player, questId, options = {}) {
  return finishQuest(player, questId, true, options);
}

function finishQuest(player, questId, requireReady = false, options = {}) {
  if (!player?.quests?.active?.[questId]) return false;

  const quest = getQuest(questId);
  if (!quest) return false;

  if (!options.skipEnsureQuestLog) ensureQuestLog(player);

  const questState = player.quests.active[questId];

  if (requireReady && !questState.complete && !questState.readyToTurnIn) return false;
  if (quest.rewards?.bloodline && !options.confirmBloodline) return false;
  if (quest.rewards?.bloodline && !canChooseBloodline(player, quest.rewards.bloodline).ok) return false;

  delete player.quests.active[questId];

  player.quests.completed[questId] = {
    id: questId,
    title: quest.title,
    completedAt: performance.now(),
    description: questState.outcomeSummary || quest.summary || quest.description || '',
    outcomeSummary: questState.outcomeSummary || '',
    resolutionId: questState.resolutionId || null
  };

  syncQuestStateCompleted(player, questId, quest, player.quests.completed[questId]);

  applyQuestRewards(player, quest);

  return true;
}

function createObjectiveProgress(objectives, player = null) {
  return objectives.map(objective => ({
    ...objective,
    current: getInitialObjectiveProgress(objective, player)
  }));
}

function getInitialObjectiveProgress(objective, player = null) {
  const required = Number(objective?.required || 1);

  if (!objective || !player) return 0;

  if (objective.type === 'storyFlag') return getStoryFlag(player,objective.flag) ? required : 0;

  if (objective.type === 'collect' && objective.itemId) {
    return Math.min(required, countItem(player, objective.itemId));
  }

  if (objective.type === 'discoverPoi' && objective.poiId && player.discoveredPois?.[objective.poiId]) {
    return required;
  }

  if (objective.type === 'investigatePoi' && objective.poiId) {
    return Math.min(required, getPoiClueCount(player, objective.poiId));
  }

  if (objective.type === 'resolvePoi' && objective.poiId && getPoiState(player, objective.poiId)?.resolution) {
    return required;
  }

  const dungeonId = objective.dungeonId || objective.entranceId || objective.poiId;

  if (objective.type === 'enterDungeon' && dungeonId) {
    return hasDungeonRecord(player.enteredDungeons, dungeonId) || hasDungeonRecord(player.completedDungeons, dungeonId)
      ? required
      : 0;
  }

  if (objective.type === 'clearDungeon' && dungeonId) {
    return hasDungeonRecord(player.completedDungeons, dungeonId) ? required : 0;
  }

  return 0;
}

function areObjectivesComplete(objectives) {
  if (!objectives.length) return true;

  return objectives.every(objective => {
    const required = objective.required || 1;
    const current = objective.current || 0;

    return current >= required;
  });
}

function grantStageRewardsOnce(player, questState, stage) {
  if (!player || !questState || !stage?.id) return false;

  questState.rewardedStages = questState.rewardedStages && typeof questState.rewardedStages === 'object'
    ? questState.rewardedStages
    : {};

  if (questState.rewardedStages[stage.id]) return false;

  questState.rewardedStages[stage.id] = true;
  applyQuestRewards(player, stage);

  return true;
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

  if (Array.isArray(rewards.storyFlags)) {
    applyStoryFlags(player, rewards.storyFlags);
  }

  if (rewards.bloodline) {
    applyBloodline(player, rewards.bloodline);
  }

  if (rewards.bloodlineSkillPoints) {
    player.skillTree = player.skillTree && typeof player.skillTree === 'object' ? player.skillTree : {};
    player.skillTree.bloodlineBonusPoints = Math.max(
      Number(player.skillTree.bloodlineBonusPoints || 0),
      Number(rewards.bloodlineSkillPoints || 0)
    );
  }
}

// -----------------------------------------------------------------------------
// DISCOVERY HELPERS
// -----------------------------------------------------------------------------

export function updatePoiDiscovery(player, world) {
  if (!player || !world?.objects) return [];

  const discovered = [];

  for (const object of world.objects) {
    if (!object?.poiId) continue;

    const d = Math.hypot(object.x - player.x, object.y - player.y);
    const radius = object.r || 28;

    if (d <= radius + 24) {
      const poi = getPoi(object.poiId);
      const didDiscover = recordPartyPoiDiscovery(
        player,
        object.poiId,
        poi?.name || object.name || object.poiId
      );

      if (didDiscover) discovered.push(object.poiId);
    }
  }

  return discovered;
}

export function recordPartyPoiDiscovery(player, poiId, name = null) {
  if (!player || !poiId) return false;

  const discoveredForActor = recordPoiDiscovery(player, poiId, name);
  const owner = getQuestOwner(player);

  if (owner && owner !== player) {
    recordPoiDiscovery(owner, poiId, name);
  }

  markPartyDiscoverPoiObjective(player, poiId);

  return discoveredForActor;
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
  // Keep stable smith/quest IDs for old saves while refreshing Aren's visible
  // identity. Inventory, objective progress and reward claims stay untouched.
  const smithDefinition=getQuest('ironForMara');
  for(const collection of [player.quests.active,player.quests.completed]){
    const saved=collection.ironForMara;if(!saved||typeof saved!=='object')continue;
    saved.title=smithDefinition.title;saved.summary=smithDefinition.summary;
    if(collection===player.quests.active){
      const stage=smithDefinition.stages.find(s=>s.id===saved.currentStageId)||smithDefinition.stages[saved.stageIndex||0];
      if(stage){saved.currentStageTitle=stage.title||stage.text||'';saved.currentStageText=stage.text||'';}
    }
  }
  reconcileAct1QuestDefinition(player);
  reconcileBloodlineQuestDefinitions(player);
  ensureQuestStateBridge(player);
  syncQuestStateBridgeFromQuestLog(player);
}

function reconcileBloodlineQuestDefinitions(player) {
  for (const questId of BLOODLINE_QUEST_IDS) {
    const questState = player?.quests?.active?.[questId];
    const quest = getQuest(questId);

    if (!questState || !quest?.stages?.length) continue;

    questState.rewardedStages = questState.rewardedStages && typeof questState.rewardedStages === 'object'
      ? questState.rewardedStages
      : {};

    let stageIndex = quest.stages.findIndex(stage => stage.id === questState.currentStageId);
    if (stageIndex < 0) {
      stageIndex = Math.max(0, Math.min(Number(questState.stageIndex) || 0, quest.stages.length - 1));
    }

    const stage = quest.stages[stageIndex];
    const definitionChanged =
      questState.stageIndex !== stageIndex ||
      questState.currentStageId !== stage.id ||
      !objectiveDefinitionsMatch(questState.objectives, stage.objectives);

    questState.stageIndex = stageIndex;
    questState.currentStageId = stage.id;
    questState.currentStageTitle = stage.title || stage.text || '';
    questState.currentStageText = stage.text || '';

    if (!definitionChanged) continue;

    questState.objectives = rebuildObjectiveProgress(stage.objectives || [], player, questState.objectives || []);

    for (let index = 0; index < stageIndex; index += 1) {
      const completedStageId = quest.stages[index]?.id;
      if (completedStageId) questState.rewardedStages[completedStageId] = true;
    }
  }
}

function objectiveDefinitionsMatch(currentObjectives, definedObjectives) {
  if (!Array.isArray(currentObjectives) || !Array.isArray(definedObjectives)) return false;
  if (currentObjectives.length !== definedObjectives.length) return false;

  return definedObjectives.every((objective, index) => {
    const current = currentObjectives[index];
    return objectiveIdentity(current) === objectiveIdentity(objective) &&
      Number(current?.required || 1) === Number(objective?.required || 1);
  });
}

function rebuildObjectiveProgress(objectives, player, previousObjectives) {
  return createObjectiveProgress(objectives, player).map(objective => {
    const previous = previousObjectives.find(entry => objectiveIdentity(entry) === objectiveIdentity(objective));
    if (!previous) return objective;

    return {
      ...objective,
      current: Math.min(
        Number(objective.required || 1),
        Math.max(Number(objective.current || 0), Number(previous.current || 0))
      )
    };
  });
}

function objectiveIdentity(objective) {
  return [
    objective?.type || '',
    objective?.itemId || '',
    objective?.npcId || '',
    objective?.poiId || '',
    objective?.dungeonId || objective?.entranceId || '',
    objective?.enemyKind || objective?.enemyId || objective?.enemyName || '',
    Array.isArray(objective?.enemyKinds) ? objective.enemyKinds.join(',') : ''
  ].join('|');
}

function reconcileAct1QuestDefinition(player) {
  const questState = player?.quests?.active?.[ACT1_QUEST_ID];
  const quest = getQuest(ACT1_QUEST_ID);

  if (!questState || !quest?.stages?.length) return;

  questState.rewardedStages = questState.rewardedStages && typeof questState.rewardedStages === 'object'
    ? questState.rewardedStages
    : {};

  const currentStageId = questState.currentStageId;
  let targetStageId = getCampaignStageId(player,ACT1_LEGACY_STAGE_MAP[currentStageId] || currentStageId);

  if (!targetStageId && Number.isFinite(Number(questState.stageIndex))) {
    const legacyStageId = ACT1_LEGACY_STAGE_ORDER[Number(questState.stageIndex)] || null;
    targetStageId = ACT1_LEGACY_STAGE_MAP[legacyStageId] || quest.stages[0]?.id || null;
  }

  if (currentStageId === 'redSealDescent' && hasDungeonRecord(player.completedDungeons, 'demonCultLair')) {
    targetStageId = 'malakarAndTheRoot';
  }

  let stageIndex = quest.stages.findIndex(stage => stage.id === targetStageId);

  if (stageIndex < 0) {
    stageIndex = Math.max(0, Math.min(Number(questState.stageIndex) || 0, quest.stages.length - 1));
    targetStageId = quest.stages[stageIndex]?.id || null;
  }

  const definitionChanged = currentStageId !== targetStageId || !objectiveDefinitionsMatch(questState.objectives,quest.stages[stageIndex]?.objectives);
  questState.stageIndex = stageIndex;
  questState.currentStageId = targetStageId;
  questState.currentStageTitle = quest.stages[stageIndex]?.title || quest.stages[stageIndex]?.text || '';
  questState.currentStageText = quest.stages[stageIndex]?.text || '';

  if (definitionChanged || !Array.isArray(questState.objectives)) {
    questState.objectives = rebuildObjectiveProgress(quest.stages[stageIndex]?.objectives || [], player,questState.objectives || []);

    for (let index = 0; index < stageIndex; index += 1) {
      const completedStageId = quest.stages[index]?.id;
      if (completedStageId) questState.rewardedStages[completedStageId] = true;
    }
  }

  if (
    targetStageId === 'malakarAndTheRoot' &&
    areObjectivesComplete(questState.objectives || [])
  ) {
    grantStageRewardsOnce(player, questState, quest.stages[stageIndex] || null);
    finishQuest(player, ACT1_QUEST_ID, false, { skipEnsureQuestLog: true });
  }
}

function ensureDiscoveryLog(player) {
  if (!player) return;

  if (!player.discoveredPois) {
    player.discoveredPois = {};
  }
}

function recordPoiDiscovery(player, poiId, name = null) {
  if (!player || !poiId) return false;

  ensureDiscoveryLog(player);

  if (player.discoveredPois[poiId]) return false;

  player.discoveredPois[poiId] = {
    id: poiId,
    name: name || poiId,
    discoveredAt: performance.now()
  };

  return true;
}

function recordDungeonSeen(player, dungeonId) {
  if (!player || !dungeonId) return;

  player.enteredDungeons = player.enteredDungeons && typeof player.enteredDungeons === 'object'
    ? player.enteredDungeons
    : {};

  player.enteredDungeons[dungeonId] = player.enteredDungeons[dungeonId] || {
    id: dungeonId,
    enteredAt: Date.now()
  };
}

function recordDungeonCleared(player, dungeonId) {
  if (!player || !dungeonId) return;

  player.completedDungeons = player.completedDungeons && typeof player.completedDungeons === 'object'
    ? player.completedDungeons
    : {};

  player.completedDungeons[dungeonId] = player.completedDungeons[dungeonId] || {
    id: dungeonId,
    completedAt: Date.now()
  };
}

function hasDungeonRecord(records, dungeonId) {
  if (!records || !dungeonId) return false;

  const aliases = getDungeonObjectiveAliases(dungeonId);

  for (const id of Object.keys(records)) {
    if (hasDungeonObjectiveAliasMatch(aliases, id)) return true;
  }

  return false;
}

function ensureQuestStateBridge(player) {
  if (!player) return null;

  player.questState = player.questState && typeof player.questState === 'object'
    ? player.questState
    : {};

  player.questState.activeQuestId = player.questState.activeQuestId ?? null;
  player.questState.active = player.questState.active && typeof player.questState.active === 'object'
    ? player.questState.active
    : {};
  player.questState.completed = player.questState.completed && typeof player.questState.completed === 'object'
    ? player.questState.completed
    : {};
  player.questState.failed = player.questState.failed && typeof player.questState.failed === 'object'
    ? player.questState.failed
    : {};
  player.questState.recentlyUpdated = Array.isArray(player.questState.recentlyUpdated)
    ? player.questState.recentlyUpdated
    : [];
  player.questState.recentlyCompleted = Array.isArray(player.questState.recentlyCompleted)
    ? player.questState.recentlyCompleted
    : [];

  return player.questState;
}

function syncQuestStateStarted(player, questId, quest, questState) {
  const bridge = ensureQuestStateBridge(player);
  if (!bridge || !questId) return;

  bridge.active[questId] = {
    id: questId,
    title: quest?.title || questState?.title || questId,
    status: 'active',
    stageIndex: questState?.stageIndex || 0,
    currentStageId: questState?.currentStageId || null,
    currentStageTitle: questState?.currentStageTitle || '',
    currentStageText: questState?.currentStageText || ''
  };
}

function syncQuestStateCompleted(player, questId, quest, completedRecord) {
  const bridge = ensureQuestStateBridge(player);
  if (!bridge || !questId) return;

  delete bridge.active[questId];

  bridge.completed[questId] = {
    id: questId,
    title: quest?.title || completedRecord?.title || questId,
    status: 'completed',
    completedAt: completedRecord?.completedAt || Date.now()
  };
}

function syncQuestStateBridgeFromQuestLog(player) {
  const bridge = ensureQuestStateBridge(player);
  if (!bridge || !player?.quests) return;

  for (const [questId, questState] of Object.entries(player.quests.active || {})) {
    if (!questId) continue;

    bridge.active[questId] = {
      id: questId,
      title: questState?.title || questId,
      status: 'active',
      stageIndex: questState?.stageIndex || 0,
      currentStageId: questState?.currentStageId || null,
      currentStageTitle: questState?.currentStageTitle || '',
      currentStageText: questState?.currentStageText || ''
    };
  }

  for (const [questId, questState] of Object.entries(player.quests.completed || {})) {
    if (!questId || bridge.completed[questId]) continue;

    bridge.completed[questId] = {
      id: questId,
      title: questState?.title || questId,
      status: 'completed',
      completedAt: questState?.completedAt || Date.now()
    };
  }

}

// -----------------------------------------------------------------------------
// FALLBACK DIALOGUE
// -----------------------------------------------------------------------------

function openFallbackDialogue(dialogueState, npcObject, player = null) {
  const nodeId = dialogueState.dialogueId || `fallback:${npcObject.id || 'npc'}`;
  const serviceChoices=npcObject.workshopService?buildDialogueOptions(dialogueState,[],player):[];
  const node = {
    id: nodeId,
    speakerId: npcObject.npcId || npcObject.id || 'npc',
    speakerName: npcObject.name || 'Unknown',
    text: npcObject.talk || `${npcObject.name || 'Someone'} has nothing else to say.`,
    closeAfterCurrent: !serviceChoices.length,
    runtimeChoices: serviceChoices
  };
  registerTransientNode(dialogueState, node);
  applyDialogueNode(dialogueState, node, player, nodeId, { opening: true });
}

// -----------------------------------------------------------------------------
// INPUT HELPERS
// -----------------------------------------------------------------------------

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
    'KeyH',
    'Tab',
    'w',
    's',
    'e',
    'h'
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

  const selected = clamp(Number(dialogueState.selectedIndex || 0), 0, count - 1);
  if (!dialogueState.options[selected]?.disabled) {
    dialogueState.selectedIndex = selected;
    return;
  }

  const firstAvailable = dialogueState.options.findIndex(option => option && !option.disabled);
  dialogueState.selectedIndex = firstAvailable >= 0 ? firstAvailable : 0;
}

// -----------------------------------------------------------------------------
// GENERAL HELPERS
// -----------------------------------------------------------------------------

function clamp(value, min, max) {
  return Math.max(min, Math.min(max, value));
}
