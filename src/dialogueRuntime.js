// dialogueRuntime.js
// Deterministic presentation and input state machine for Runalis conversations.

export const DIALOGUE_PHASES = Object.freeze({
  CLOSED: 'CLOSED',
  OPENING: 'OPENING',
  TYPING: 'TYPING',
  AWAITING_CONTINUE: 'AWAITING_CONTINUE',
  AWAITING_CHOICE: 'AWAITING_CHOICE',
  PROCESSING_CHOICE: 'PROCESSING_CHOICE',
  SUSPENDED: 'SUSPENDED',
  CLOSING: 'CLOSING'
});

export const DEFAULT_DIALOGUE_SETTINGS = Object.freeze({
  textSpeed: 'normal',
  dialogueTextSpeed: 0.046,
  dialogueCommaPause: 0.055,
  dialogueSentencePause: 0.105,
  dialogueParagraphPause: 0.15,
  dialogueFastRevealSpeed: 0.012,
  instantText: false,
  autoAdvance: false,
  autoAdvanceDelay: 1.15,
  speechTickVolume: 0,
  dialogueFontScale: 1,
  highContrastChoices: false,
  holdToFastForward: true,
  fastForwardAdvances: false,
  reducedMotion: false,
  controllerVibration: false,
  confirmPermanentChoices: true,
  showPlayerResponses: true
});

const TEXT_SPEED_SECONDS = Object.freeze({
  instant: 0,
  fast: 0.026,
  normal: 0.046,
  slow: 0.078
});

export function createDialogueRuntimeState() {
  return {
    active: false,
    phase: DIALOGUE_PHASES.CLOSED,
    state: DIALOGUE_PHASES.CLOSED,

    speakerId: null,
    speakerName: null,
    speechProfile: 'default',
    npcName: null,
    text: '',
    fullText: '',
    visibleText: '',
    tokens: [],
    revealedTokenCount: 0,
    revealTimer: 0,
    lineComplete: false,
    lineSpeedMultiplier: 1,

    nextNodeId: null,
    closeAfterCurrent: false,
    options: [],
    selectedIndex: 0,
    choiceScrollOffset: 0,
    choiceAppearTimer: 0,

    openingTimer: 0,
    closingTimer: 0,
    transitionLock: 0,
    confirmReleaseRequired: false,
    autoAdvanceTimer: 0,

    history: [],
    historyOpen: false,
    historyScrollOffset: 0,
    suspendedPhase: null,
    historyRecordedForNode: false,

    inputDevice: 'keyboard',
    settings: { ...DEFAULT_DIALOGUE_SETTINGS },
    sequence: 0
  };
}

export function mergeDialogueSettings(...sources) {
  const merged = { ...DEFAULT_DIALOGUE_SETTINGS };

  for (const source of sources) {
    if (!source || typeof source !== 'object') continue;
    Object.assign(merged, source);
  }

  const speedKey = String(merged.textSpeed || 'normal').toLowerCase();
  if (Object.prototype.hasOwnProperty.call(TEXT_SPEED_SECONDS, speedKey)) {
    merged.textSpeed = speedKey;
    merged.dialogueTextSpeed = TEXT_SPEED_SECONDS[speedKey];
    merged.instantText = speedKey === 'instant' || !!merged.instantText;
  }

  merged.dialogueTextSpeed = clampNumber(merged.dialogueTextSpeed, 0, 0.3, DEFAULT_DIALOGUE_SETTINGS.dialogueTextSpeed);
  merged.dialogueCommaPause = clampNumber(merged.dialogueCommaPause, 0, 0.5, DEFAULT_DIALOGUE_SETTINGS.dialogueCommaPause);
  merged.dialogueSentencePause = clampNumber(merged.dialogueSentencePause, 0, 0.8, DEFAULT_DIALOGUE_SETTINGS.dialogueSentencePause);
  merged.dialogueParagraphPause = clampNumber(merged.dialogueParagraphPause, 0, 1, DEFAULT_DIALOGUE_SETTINGS.dialogueParagraphPause);
  merged.dialogueFastRevealSpeed = clampNumber(merged.dialogueFastRevealSpeed, 0.001, 0.1, DEFAULT_DIALOGUE_SETTINGS.dialogueFastRevealSpeed);
  merged.autoAdvanceDelay = clampNumber(merged.autoAdvanceDelay, 0.15, 10, DEFAULT_DIALOGUE_SETTINGS.autoAdvanceDelay);
  merged.speechTickVolume = clampNumber(merged.speechTickVolume, 0, 1, 0);
  merged.dialogueFontScale = clampNumber(merged.dialogueFontScale, 0.8, 1.5, 1);

  return merged;
}

// Legacy NPC lines contain a speaker label; the portrait banner owns that label.
export function dialogueBodyText(text, speakerName, speakerAliases = []) {
  const original = String(text || '');
  const name = String(speakerName || '').trim();
  if (!name) return original;
  let body = original.trimStart();
  const prefix = body.match(/^([^:\n]{1,80})\s*:\s*/);
  if (!prefix) return original;
  const label = prefix[1].trim().toLocaleLowerCase();
  // Legacy lines sometimes omit titles/factions: "Relief Scout" belongs to
  // "Covenant Relief Scout", just as "Mael" belongs to "Warden Mael".
  const names = [name, ...speakerAliases].filter(Boolean).map(value=>String(value).trim().toLocaleLowerCase());
  if (!names.some(value=>value===label||value.endsWith(` ${label}`))) return original;
  body = body.slice(prefix[0].length);
  // Remove quotation marks used to wrap the labelled line, keeping interior quotes.
  for (const [open, close] of [['"', '"'], ['“', '”'], ['‘', '’']]) {
    if (body.startsWith(open) && body.trimEnd().endsWith(close)) {
      body = body.trimEnd().slice(1, -1);
      break;
    }
  }
  return body;
}

export function beginDialogueRuntimeNode(dialogueState, node, options = {}) {
  if (!dialogueState || !node) return false;

  dialogueState.active = true;
  dialogueState.sequence = Number(dialogueState.sequence || 0) + 1;
  dialogueState.speakerId = node.speakerId || node.speaker || 'unknown';
  dialogueState.speakerName = node.speakerName || node.speaker || dialogueState.npcName || 'Unknown';
  dialogueState.speechProfile = node.speechProfile || (dialogueState.speakerId === 'narration' ? 'narration' : dialogueState.speakerId === 'player' ? 'player' : 'default');
  dialogueState.npcName = dialogueState.speakerName;
  dialogueState.fullText = dialogueBodyText(node.text, dialogueState.speakerName, [node.speaker, ...(node.speakerAliases || [])]);
  dialogueState.text = dialogueState.fullText;
  dialogueState.visibleText = '';
  dialogueState.tokens = tokenizeDialogueText(dialogueState.fullText);
  dialogueState.revealedTokenCount = 0;
  dialogueState.revealTimer = 0;
  dialogueState.lineComplete = false;
  dialogueState.lineSpeedMultiplier = clampNumber(node.lineSpeedMultiplier, 0.1, 4, 1);
  dialogueState.nextNodeId = node.nextNodeId || node.next || null;
  dialogueState.closeAfterCurrent = !!node.closeAfterCurrent;
  dialogueState.options = Array.isArray(node.choices)
    ? node.choices
    : Array.isArray(node.options) ? node.options : [];
  dialogueState.selectedIndex = firstSelectableIndex(dialogueState.options);
  dialogueState.choiceScrollOffset = 0;
  dialogueState.choiceAppearTimer = 0;
  dialogueState.autoAdvanceTimer = 0;
  dialogueState.historyRecordedForNode = false;
  dialogueState.historyOpen = false;
  dialogueState.suspendedPhase = null;
  dialogueState.transitionLock = Math.max(dialogueState.transitionLock || 0, options.transitionLock ?? 0.07);
  dialogueState.confirmReleaseRequired = !!options.confirmHeld;

  const opening = options.opening !== false && !dialogueState.settings?.reducedMotion;
  dialogueState.openingTimer = opening ? 0.08 : 0;
  setDialoguePhase(dialogueState, opening ? DIALOGUE_PHASES.OPENING : DIALOGUE_PHASES.TYPING);

  if (!dialogueState.tokens.length || dialogueState.settings?.instantText) {
    revealDialogueLine(dialogueState);
  }

  return true;
}

export function updateDialogueRuntime(dialogueState, dt, hooks = {}) {
  if (!dialogueState?.active) return;

  const elapsed = Math.max(0, Number(dt || 0));
  dialogueState.transitionLock = Math.max(0, Number(dialogueState.transitionLock || 0) - elapsed);

  if (dialogueState.phase === DIALOGUE_PHASES.OPENING) {
    dialogueState.openingTimer = Math.max(0, Number(dialogueState.openingTimer || 0) - elapsed);
    if (dialogueState.openingTimer <= 0) {
      setDialoguePhase(dialogueState, DIALOGUE_PHASES.TYPING);
      if (!dialogueState.tokens.length || dialogueState.settings?.instantText) revealDialogueLine(dialogueState);
    }
    return;
  }

  if (dialogueState.phase === DIALOGUE_PHASES.CLOSING) {
    dialogueState.closingTimer = Math.max(0, Number(dialogueState.closingTimer || 0) - elapsed);
    if (dialogueState.closingTimer <= 0) hooks.finishClose?.();
    return;
  }

  if (dialogueState.phase === DIALOGUE_PHASES.TYPING) {
    const fast = !!(!dialogueState.confirmReleaseRequired && dialogueState.confirmHeld && dialogueState.settings?.holdToFastForward);
    dialogueState.revealTimer -= elapsed;

    let safety = 0;
    while (dialogueState.revealTimer <= 0 && !dialogueState.lineComplete && safety < 80) {
      const token = revealNextToken(dialogueState, fast);
      if (token?.trim()) hooks.onSpeechToken?.(token, dialogueState);
      safety++;
    }
    return;
  }

  if (
    dialogueState.phase === DIALOGUE_PHASES.AWAITING_CONTINUE &&
    dialogueState.settings?.autoAdvance &&
    !dialogueState.historyOpen
  ) {
    dialogueState.autoAdvanceTimer += elapsed;
    if (dialogueState.autoAdvanceTimer >= dialogueState.settings.autoAdvanceDelay) {
      dialogueState.autoAdvanceTimer = 0;
      hooks.advance?.();
    }
  }

  if (dialogueState.phase === DIALOGUE_PHASES.AWAITING_CHOICE) {
    dialogueState.choiceAppearTimer = Math.min(0.2, Number(dialogueState.choiceAppearTimer || 0) + elapsed);
  }
}

export function handleDialogueRuntimeInput(dialogueState, input, hooks = {}) {
  if (!dialogueState?.active || !input) return false;

  const normalized = normalizeDialogueInput(input);
  if (normalized.anyAction || normalized.confirmHeld) {
    dialogueState.inputDevice = normalized.inputDevice || dialogueState.inputDevice || 'keyboard';
  }
  dialogueState.confirmHeld = normalized.confirmHeld;

  if (dialogueState.phase === DIALOGUE_PHASES.OPENING && normalized.confirmHeld) {
    dialogueState.confirmReleaseRequired = true;
    return true;
  }

  if (dialogueState.confirmReleaseRequired) {
    if (normalized.confirmReleased || !normalized.confirmHeld) {
      dialogueState.confirmReleaseRequired = false;
    }
    if (normalized.confirmPressed || normalized.confirmHeld) return true;
  }

  if (dialogueState.transitionLock > 0) {
    return normalized.anyAction;
  }

  if (dialogueState.phase === DIALOGUE_PHASES.SUSPENDED && dialogueState.historyOpen) {
    if (normalized.cancelPressed || normalized.historyPressed || normalized.confirmPressed) {
      closeDialogueHistory(dialogueState);
      return true;
    }
    if (normalized.upPressed) {
      dialogueState.historyScrollOffset = Math.max(0, dialogueState.historyScrollOffset - 1);
      return true;
    }
    if (normalized.downPressed) {
      dialogueState.historyScrollOffset = Math.min(
        Math.max(0, dialogueState.history.length - 1),
        dialogueState.historyScrollOffset + 1
      );
      return true;
    }
    return normalized.anyAction;
  }

  if (normalized.historyPressed && dialogueState.history.length) {
    openDialogueHistory(dialogueState);
    return true;
  }

  if (normalized.cancelPressed) {
    hooks.close?.();
    return true;
  }

  if (dialogueState.phase === DIALOGUE_PHASES.TYPING) {
    if (normalized.confirmPressed || normalized.pointerConfirm) {
      revealDialogueLine(dialogueState);
      dialogueState.transitionLock = 0.05;
      dialogueState.confirmReleaseRequired = !!normalized.confirmHeld;
      return true;
    }
    return normalized.anyAction;
  }

  if (dialogueState.phase === DIALOGUE_PHASES.AWAITING_CONTINUE) {
    if (normalized.confirmPressed || normalized.pointerConfirm) {
      dialogueState.transitionLock = 0.06;
      dialogueState.confirmReleaseRequired = !!normalized.confirmHeld;
      hooks.advance?.();
      return true;
    }
    return normalized.anyAction;
  }

  if (dialogueState.phase === DIALOGUE_PHASES.AWAITING_CHOICE) {
    if (Number.isInteger(normalized.pointerChoiceIndex)) {
      const index = normalized.pointerChoiceIndex;
      if (dialogueState.options[index] && !dialogueState.options[index].disabled) {
        dialogueState.selectedIndex = index;
        dialogueState.transitionLock = 0.06;
        hooks.choose?.(index);
      }
      return true;
    }

    if (normalized.upPressed) {
      moveDialogueRuntimeSelection(dialogueState, -1);
      return true;
    }
    if (normalized.downPressed) {
      moveDialogueRuntimeSelection(dialogueState, 1);
      return true;
    }
    if (normalized.confirmPressed || normalized.pointerConfirm) {
      const option = dialogueState.options[dialogueState.selectedIndex];
      if (option && !option.disabled) {
        dialogueState.transitionLock = 0.06;
        dialogueState.confirmReleaseRequired = !!normalized.confirmHeld;
        hooks.choose?.(dialogueState.selectedIndex);
      }
      return true;
    }
    return normalized.anyAction;
  }

  return normalized.anyAction;
}

export function revealDialogueLine(dialogueState) {
  if (!dialogueState?.active) return false;

  dialogueState.revealedTokenCount = dialogueState.tokens.length;
  dialogueState.visibleText = dialogueState.fullText;
  dialogueState.lineComplete = true;
  dialogueState.revealTimer = 0;
  settleCompletedDialogueLine(dialogueState);
  return true;
}

export function moveDialogueRuntimeSelection(dialogueState, direction) {
  const options = Array.isArray(dialogueState?.options) ? dialogueState.options : [];
  if (!options.length) {
    dialogueState.selectedIndex = 0;
    return;
  }

  const step = direction < 0 ? -1 : 1;
  let next = Number(dialogueState.selectedIndex || 0);

  for (let attempts = 0; attempts < options.length; attempts++) {
    next = (next + step + options.length) % options.length;
    if (!options[next]?.disabled) {
      dialogueState.selectedIndex = next;
      return;
    }
  }

  dialogueState.selectedIndex = firstSelectableIndex(options);
}

export function setDialogueProcessing(dialogueState) {
  if (!dialogueState) return;
  setDialoguePhase(dialogueState, DIALOGUE_PHASES.PROCESSING_CHOICE);
  dialogueState.options = [];
  dialogueState.transitionLock = Math.max(dialogueState.transitionLock || 0, 0.06);
}

export function startDialogueClosing(dialogueState, options = {}) {
  if (!dialogueState?.active) return false;
  dialogueState.options = [];
  dialogueState.confirmHeld = false;
  dialogueState.confirmReleaseRequired = !!options.confirmHeld;
  dialogueState.closingTimer = dialogueState.settings?.reducedMotion ? 0 : 0.07;
  dialogueState.transitionLock = 0.08;
  setDialoguePhase(dialogueState, DIALOGUE_PHASES.CLOSING);
  return true;
}

export function finishDialogueClosing(dialogueState) {
  if (!dialogueState) return;

  const settings = mergeDialogueSettings(dialogueState.settings);
  const history = Array.isArray(dialogueState.history) ? dialogueState.history.slice(-80) : [];
  const fresh = createDialogueRuntimeState();
  Object.assign(dialogueState, fresh, { settings, history });
}

export function openDialogueHistory(dialogueState) {
  if (!dialogueState?.active || !dialogueState.history?.length || dialogueState.historyOpen) return false;
  dialogueState.suspendedPhase = dialogueState.phase;
  dialogueState.historyOpen = true;
  dialogueState.historyScrollOffset = Math.max(0, dialogueState.history.length - 1);
  setDialoguePhase(dialogueState, DIALOGUE_PHASES.SUSPENDED);
  return true;
}

export function closeDialogueHistory(dialogueState) {
  if (!dialogueState?.historyOpen) return false;
  dialogueState.historyOpen = false;
  const resume = dialogueState.suspendedPhase || (dialogueState.lineComplete
    ? dialogueState.options?.length ? DIALOGUE_PHASES.AWAITING_CHOICE : DIALOGUE_PHASES.AWAITING_CONTINUE
    : DIALOGUE_PHASES.TYPING);
  dialogueState.suspendedPhase = null;
  dialogueState.transitionLock = 0.05;
  setDialoguePhase(dialogueState, resume);
  return true;
}

export function appendDialogueHistory(dialogueState, entry) {
  if (!dialogueState || !entry?.text) return;

  dialogueState.history = Array.isArray(dialogueState.history) ? dialogueState.history : [];
  dialogueState.history.push({
    speakerId: entry.speakerId || null,
    speakerName: entry.speakerName || 'Unknown',
    text: String(entry.text),
    kind: entry.kind || 'utterance',
    choiceTags: Array.isArray(entry.choiceTags) ? [...entry.choiceTags] : [],
    reachedAt: Number(entry.reachedAt || Date.now())
  });

  if (dialogueState.history.length > 80) {
    dialogueState.history.splice(0, dialogueState.history.length - 80);
  }
}

export function serializeDialogueRuntime(dialogueState) {
  if (!dialogueState?.active) return null;

  return {
    active: true,
    phase: dialogueState.phase,
    dialogueId: dialogueState.dialogueId || null,
    currentNodeId: dialogueState.currentNodeId || null,
    npcObjectId: dialogueState.npcObjectId || null,
    npcId: dialogueState.npcId || null,
    ownerSlot: dialogueState.ownerSlot || 1,
    selectedIndex: Number(dialogueState.selectedIndex || 0),
    choiceScrollOffset: Number(dialogueState.choiceScrollOffset || 0),
    lineComplete: !!dialogueState.lineComplete,
    revealedTokenCount: Number(dialogueState.revealedTokenCount || 0),
    history: Array.isArray(dialogueState.history) ? dialogueState.history.slice(-80) : [],
    committedEvents: Array.isArray(dialogueState.committedEvents)
      ? [...dialogueState.committedEvents]
      : [],
    transientNodes: dialogueState.transientNodes && typeof dialogueState.transientNodes === 'object'
      ? dialogueState.transientNodes
      : {},
    settings: mergeDialogueSettings(dialogueState.settings)
  };
}

export function tokenizeDialogueText(text) {
  const value = String(text || '');
  if (!value) return [];
  return value.match(/\S+\s*/g) || [];
}

function revealNextToken(dialogueState, fast = false) {
  if (dialogueState.revealedTokenCount >= dialogueState.tokens.length) {
    dialogueState.lineComplete = true;
    settleCompletedDialogueLine(dialogueState);
    return '';
  }

  const token = dialogueState.tokens[dialogueState.revealedTokenCount] || '';
  dialogueState.revealedTokenCount++;
  dialogueState.visibleText += token;

  if (dialogueState.revealedTokenCount >= dialogueState.tokens.length) {
    dialogueState.visibleText = dialogueState.fullText;
    dialogueState.lineComplete = true;
    settleCompletedDialogueLine(dialogueState);
    return token;
  }

  const settings = dialogueState.settings || DEFAULT_DIALOGUE_SETTINGS;
  let delay = fast
    ? Number(settings.dialogueFastRevealSpeed || DEFAULT_DIALOGUE_SETTINGS.dialogueFastRevealSpeed)
    : Number(settings.dialogueTextSpeed || DEFAULT_DIALOGUE_SETTINGS.dialogueTextSpeed) * Number(dialogueState.lineSpeedMultiplier || 1);
  const trimmed = token.trimEnd();

  if (/\n\s*\n/.test(token)) delay += Number(settings.dialogueParagraphPause || 0);
  else if (/[.!?;:](["'’”)]*)$/.test(trimmed)) delay += Number(settings.dialogueSentencePause || 0);
  else if (/[,](["'’”)]*)$/.test(trimmed)) delay += Number(settings.dialogueCommaPause || 0);

  dialogueState.revealTimer += Math.max(0.001, delay);
  return token;
}

function settleCompletedDialogueLine(dialogueState) {
  if (!dialogueState.historyRecordedForNode && dialogueState.fullText) {
    appendDialogueHistory(dialogueState, {
      speakerId: dialogueState.speakerId,
      speakerName: dialogueState.speakerName,
      text: dialogueState.fullText,
      kind: dialogueState.speakerId === 'player' ? 'player' : 'utterance'
    });
    dialogueState.historyRecordedForNode = true;
  }

  dialogueState.autoAdvanceTimer = 0;
  if (dialogueState.options?.length) {
    dialogueState.choiceAppearTimer = 0;
    setDialoguePhase(dialogueState, DIALOGUE_PHASES.AWAITING_CHOICE);
  }
  else setDialoguePhase(dialogueState, DIALOGUE_PHASES.AWAITING_CONTINUE);
}

function firstSelectableIndex(options) {
  const index = (options || []).findIndex(option => option && !option.disabled);
  return index >= 0 ? index : 0;
}

function normalizeDialogueInput(input) {
  const confirmPressed = !!(
    input.confirmPressed || input.pointerConfirm || pressed(input, 'Enter') || pressed(input, 'Space') ||
    pressed(input, 'KeyE') || pressed(input, 'e')
  );
  const cancelPressed = !!(input.cancelPressed || pressed(input, 'Escape') || pressed(input, 'esc'));
  const upPressed = !!(input.upPressed || pressed(input, 'ArrowUp') || pressed(input, 'KeyW') || pressed(input, 'w'));
  const downPressed = !!(input.downPressed || pressed(input, 'ArrowDown') || pressed(input, 'KeyS') || pressed(input, 's'));
  const historyPressed = !!(input.historyPressed || pressed(input, 'KeyH') || pressed(input, 'h') || pressed(input, 'Tab'));

  return {
    confirmPressed,
    confirmHeld: !!input.confirmHeld,
    confirmReleased: !!input.confirmReleased,
    cancelPressed,
    upPressed,
    downPressed,
    historyPressed,
    pointerConfirm: !!input.pointerConfirm,
    pointerChoiceIndex: Number.isInteger(input.pointerChoiceIndex) ? input.pointerChoiceIndex : null,
    inputDevice: input.inputDevice || (input.pointerConfirm || Number.isInteger(input.pointerChoiceIndex)
      ? 'mouse'
      : input.controller ? 'controller' : 'keyboard'),
    anyAction: !!(
      confirmPressed || cancelPressed || upPressed || downPressed || historyPressed ||
      input.pointerConfirm || Number.isInteger(input.pointerChoiceIndex)
    )
  };
}

function pressed(input, key) {
  if (!input) return false;
  if (typeof input.wasPressed === 'function' && input.wasPressed(key)) return true;
  if (typeof input.pressed === 'function' && input.pressed(key)) return true;
  return !!(input.justPressed?.[key] || input.keysJustPressed?.[key] || input.pressedKeys?.[key]);
}

function setDialoguePhase(dialogueState, phase) {
  dialogueState.phase = phase;
  dialogueState.state = phase;
}

function clampNumber(value, min, max, fallback) {
  const number = Number(value);
  if (!Number.isFinite(number)) return fallback;
  return Math.max(min, Math.min(max, number));
}
