import { drawLexiconFrame } from './lexiconPresentation.js';
import { resolveDialoguePortrait, drawDialoguePortrait } from './dialoguePortrait.js';
// dialogueUI.js
// Canvas presentation for the Runalis one-utterance dialogue state machine.

import { DIALOGUE_PHASES } from './dialogueRuntime.js';

export function drawDialogueUI(ctx, dialogueState, options = {}) {
  if (!ctx || !dialogueState?.active) return;

  const viewport = normalizeViewport(ctx, options.viewport);
  const box = getDialogueBox(viewport, dialogueState);
  const layout = getDialogueLayout(box, dialogueState);
  const alpha = getTransitionAlpha(dialogueState);

  ctx.save();
  ctx.beginPath();
  ctx.rect(viewport.x, viewport.y, viewport.width, viewport.height);
  ctx.clip();
  ctx.globalAlpha = alpha;

  drawDialogueBackdrop(ctx, viewport);
  drawDialoguePanel(ctx, box, dialogueState);
  drawSpeakerName(ctx, box, dialogueState);
  drawOwnerBadge(ctx, box, dialogueState);

  if (dialogueState.historyOpen) {
    drawDialogueHistory(ctx, layout, dialogueState);
  } else {
    if (layout.portrait) drawDialoguePortrait(ctx, layout.portrait, layout.speakerActor, dialogueState);
    drawCurrentUtterance(ctx, layout, dialogueState);
    drawDialogueChoices(ctx, layout, dialogueState);
  }

  drawDialogueFooter(ctx, layout, dialogueState, options.touchControls);
  ctx.restore();
}

export function getDialoguePointerTarget(ctx, dialogueState, point, options = {}) {
  if (!ctx || !dialogueState?.active || !point) return null;

  const viewport = normalizeViewport(ctx, options.viewport);
  const box = getDialogueBox(viewport, dialogueState);
  if (!contains(box, point.x, point.y)) return null;

  if (dialogueState.historyOpen) return { type: 'confirm' };

  if (dialogueState.phase === DIALOGUE_PHASES.AWAITING_CHOICE) {
    const layout = getDialogueLayout(box, dialogueState);
    const rows = getVisibleChoiceRows(layout, dialogueState);
    for (const row of rows) {
      if (contains(row.rect, point.x, point.y)) {
        return { type: 'choice', index: row.index, disabled: !!row.option?.disabled };
      }
    }
  }

  return { type: 'confirm' };
}

function getDialogueBox(viewport, dialogueState) {
  const compact = viewport.width < 720 || viewport.height < 500;
  const marginX = compact ? 12 : Math.max(18, Math.min(34, viewport.width * 0.035));
  const marginY = compact ? 16 : 28;
  const width = Math.min(960, viewport.width - marginX * 2);
  const hasPotentialChoices = (dialogueState.options?.length || 0) > 0;
  const desiredHeight = compact
    ? Math.max(230, viewport.height - marginY * 2)
    : hasPotentialChoices
      ? Math.min(520, Math.max(330, viewport.height * 0.52))
      : Math.min(330, Math.max(250, viewport.height * 0.38));
  const height = Math.min(viewport.height - marginY * 2, desiredHeight);

  return {
    x: Math.floor(viewport.x + (viewport.width - width) / 2),
    y: Math.floor(viewport.y + viewport.height - height - marginY),
    w: Math.max(260, width),
    h: Math.max(210, height),
    pad: compact ? 16 : 24,
    compact
  };
}

function getDialogueLayout(box, dialogueState) {
  const footerH = box.compact ? 28 : 34;
  const innerTop = box.y + box.pad + (box.compact ? 34 : 8);
  const innerBottom = box.y + box.h - footerH - 10;
  const hasChoices = dialogueState.phase === DIALOGUE_PHASES.AWAITING_CHOICE && !dialogueState.historyOpen;
  const choiceCount = hasChoices ? dialogueState.options?.length || 0 : 0;
  const availableH = Math.max(120, innerBottom - innerTop);
  const preferredChoiceH = hasChoices
    ? clamp(choiceCount * (box.compact ? 36 : 44), box.compact ? 74 : 92, availableH * 0.58)
    : 0;
  const dividerGap = hasChoices ? (box.compact ? 12 : 18) : 0;
  const utteranceH = availableH - preferredChoiceH - dividerGap;
  const speakerActor = !dialogueState.historyOpen && resolveDialoguePortrait(dialogueState);
  const portraitSize = speakerActor ? Math.min(box.compact ? 72 : 124, Math.max(72, utteranceH)) : 0;
  const portraitGap = portraitSize ? (box.compact ? 12 : 22) : 0;

  return {
    box,
    speakerActor,
    portrait: portraitSize ? { x: box.x + box.pad, y: innerTop, w: portraitSize, h: portraitSize } : null,
    utterance: {
      x: box.x + box.pad + portraitSize + portraitGap,
      y: innerTop,
      w: box.w - box.pad * 2 - portraitSize - portraitGap,
      h: Math.max(72, utteranceH)
    },
    choices: {
      x: box.x + box.pad,
      y: innerTop + Math.max(72, utteranceH) + dividerGap,
      w: box.w - box.pad * 2,
      h: Math.max(0, preferredChoiceH)
    },
    footer: {
      x: box.x + box.pad,
      y: box.y + box.h - footerH,
      w: box.w - box.pad * 2,
      h: footerH
    }
  };
}

function drawDialogueBackdrop(ctx, viewport) {
  ctx.fillStyle = 'rgba(0,0,0,0.66)';
  ctx.fillRect(viewport.x, viewport.y, viewport.width, viewport.height);
}

function drawDialoguePanel(ctx, box, dialogueState) {
  const highContrast = !!dialogueState.settings?.highContrastChoices;

  ctx.save();
  ctx.fillStyle = 'rgba(0,0,0,0.76)';
  angularRect(ctx, box.x + 4, box.y + 6, box.w, box.h, 14);
  ctx.fill();

  ctx.fillStyle = highContrast ? 'rgba(3,4,7,0.99)' : 'rgba(8,9,13,0.97)';
  angularRect(ctx, box.x, box.y, box.w, box.h, 14);
  ctx.fill();

  drawLexiconFrame(ctx, box.x, box.y, box.w, box.h);

  ctx.strokeStyle = highContrast ? '#ffd36f' : 'rgba(213,173,85,0.72)';
  ctx.lineWidth = highContrast ? 3 : 2;
  angularRect(ctx, box.x, box.y, box.w, box.h, 14);
  ctx.stroke();

  ctx.strokeStyle = 'rgba(255,255,255,0.10)';
  ctx.lineWidth = 1;
  line(ctx, box.x + 18, box.y + 12, box.x + box.w - 18, box.y + 12);
  line(ctx, box.x + 18, box.y + box.h - 12, box.x + 112, box.y + box.h - 12);
  ctx.restore();
}

function drawSpeakerName(ctx, box, dialogueState) {
  const name = dialogueState.speakerName || dialogueState.npcName || 'Unknown';
  const scale = clamp(dialogueState.settings?.dialogueFontScale || 1, 0.8, 1.5);
  const nameX = box.x + box.pad;
  const nameY = box.compact ? box.y + 16 : box.y - 16;
  const fontSize = Math.round((box.compact ? 13 : 15) * scale);

  ctx.save();
  ctx.font = `bold ${fontSize}px Georgia`;
  ctx.textAlign = 'left';
  ctx.textBaseline = 'middle';

  const plateW = Math.min(box.w * 0.66, Math.max(132, ctx.measureText(name).width + 34));
  const plateH = box.compact ? 28 : 32;
  ctx.fillStyle = 'rgba(0,0,0,0.78)';
  angularRect(ctx, nameX - 3, nameY - plateH / 2 + 3, plateW, plateH, 8);
  ctx.fill();
  ctx.fillStyle = '#15151a';
  angularRect(ctx, nameX - 6, nameY - plateH / 2, plateW, plateH, 8);
  ctx.fill();
  ctx.strokeStyle = 'rgba(255,204,102,0.82)';
  ctx.lineWidth = 2;
  angularRect(ctx, nameX - 6, nameY - plateH / 2, plateW, plateH, 8);
  ctx.stroke();
  ctx.fillStyle = dialogueState.speakerId === 'player' ? '#b9dcff' : '#ffcc66';
  ctx.fillText(trimToWidth(ctx, name, plateW - 24), nameX + 10, nameY + 1);
  ctx.restore();
}

function drawOwnerBadge(ctx, box, dialogueState) {
  if (Number(dialogueState.ownerSlot || 1) <= 1) return;

  ctx.save();
  ctx.font = 'bold 11px Georgia';
  ctx.textAlign = 'right';
  ctx.textBaseline = 'middle';
  ctx.fillStyle = 'rgba(232,237,245,0.68)';
  ctx.fillText(`Player ${dialogueState.ownerSlot} controls this conversation`, box.x + box.w - box.pad, box.y + 24);
  ctx.restore();
}

function drawCurrentUtterance(ctx, layout, dialogueState) {
  const area = layout.utterance;
  const scale = clamp(dialogueState.settings?.dialogueFontScale || 1, 0.8, 1.5);
  const baseFont = Math.round((layout.box.compact ? 14 : 17) * scale);
  const text = dialogueState.visibleText || '';

  ctx.save();
  ctx.beginPath();
  ctx.rect(area.x, area.y, area.w, area.h);
  ctx.clip();
  ctx.textAlign = 'left';
  ctx.textBaseline = 'top';
  ctx.fillStyle = '#eee2c9';

  let fontSize = baseFont;
  let lineHeight = Math.round(fontSize * 1.45);
  let lines = [];
  while (fontSize >= 12) {
    ctx.font = `${fontSize}px Georgia`;
    lineHeight = Math.round(fontSize * 1.45);
    lines = wrapText(ctx, text, area.w);
    if (lines.length * lineHeight <= area.h) break;
    fontSize--;
  }

  const maxLines = Math.max(1, Math.floor(area.h / lineHeight));
  for (let index = 0; index < Math.min(lines.length, maxLines); index++) {
    ctx.fillText(lines[index], area.x, area.y + index * lineHeight);
  }

  if (lines.length > maxLines) {
    ctx.fillStyle = 'rgba(255,204,102,0.72)';
    ctx.font = '11px Georgia';
    ctx.textAlign = 'right';
    ctx.fillText('Text continues…', area.x + area.w, area.y + area.h - 14);
  }
  ctx.restore();
}

function drawDialogueChoices(ctx, layout, dialogueState) {
  if (dialogueState.phase !== DIALOGUE_PHASES.AWAITING_CHOICE) return;
  const options = dialogueState.options || [];
  if (!options.length || layout.choices.h <= 0) return;

  ctx.save();
  if (!dialogueState.settings?.reducedMotion) {
    ctx.globalAlpha *= clamp(Number(dialogueState.choiceAppearTimer || 0) / 0.14, 0.25, 1);
  }
  ctx.strokeStyle = 'rgba(213,173,85,0.24)';
  ctx.lineWidth = 1;
  line(ctx, layout.choices.x, layout.choices.y - 8, layout.choices.x + layout.choices.w, layout.choices.y - 8);

  const rows = getVisibleChoiceRows(layout, dialogueState);
  const highContrast = !!dialogueState.settings?.highContrastChoices;

  for (const row of rows) {
    const selected = row.index === dialogueState.selectedIndex;
    const disabled = !!row.option.disabled;
    const rect = row.rect;

    if (selected) {
      ctx.fillStyle = highContrast ? 'rgba(255,211,111,0.25)' : 'rgba(213,173,85,0.15)';
      angularRect(ctx, rect.x, rect.y, rect.w, rect.h, 6);
      ctx.fill();
      ctx.strokeStyle = highContrast ? '#ffd36f' : 'rgba(213,173,85,0.82)';
      ctx.lineWidth = highContrast ? 2 : 1;
      angularRect(ctx, rect.x, rect.y, rect.w, rect.h, 6);
      ctx.stroke();
    }

    ctx.font = `${layout.box.compact ? 12 : 14}px Georgia`;
    ctx.textAlign = 'left';
    ctx.textBaseline = 'middle';
    ctx.fillStyle = disabled ? 'rgba(198,206,219,0.42)' : selected ? '#ffffff' : '#c6cedb';
    const marker = disabled ? '×' : selected ? '›' : '·';
    ctx.fillText(marker, rect.x + 10, rect.y + rect.h / 2);

    const requirement = disabled && row.option.requirementText ? ` — ${row.option.requirementText}` : '';
    const label = `${row.option.label || row.option.text || '...'}${requirement}`;
    ctx.fillText(trimToWidth(ctx, label, rect.w - 40), rect.x + 28, rect.y + rect.h / 2);
  }

  if (dialogueState.choiceScrollOffset > 0) drawScrollCue(ctx, layout.choices, 'up');
  const finalVisible = rows.length ? rows[rows.length - 1].index : -1;
  if (finalVisible < options.length - 1) drawScrollCue(ctx, layout.choices, 'down');
  ctx.restore();
}

function getVisibleChoiceRows(layout, dialogueState) {
  const options = dialogueState.options || [];
  const gap = layout.box.compact ? 3 : 5;
  const rowH = layout.box.compact ? 32 : 38;
  const visibleCount = Math.max(1, Math.floor((layout.choices.h + gap) / (rowH + gap)));
  const selected = clamp(Number(dialogueState.selectedIndex || 0), 0, Math.max(0, options.length - 1));
  let offset = clamp(Number(dialogueState.choiceScrollOffset || 0), 0, Math.max(0, options.length - visibleCount));
  if (selected < offset) offset = selected;
  if (selected >= offset + visibleCount) offset = selected - visibleCount + 1;
  dialogueState.choiceScrollOffset = offset;

  return options.slice(offset, offset + visibleCount).map((option, visibleIndex) => ({
    option,
    index: offset + visibleIndex,
    rect: {
      x: layout.choices.x,
      y: layout.choices.y + visibleIndex * (rowH + gap),
      w: layout.choices.w,
      h: rowH
    }
  }));
}

function drawDialogueHistory(ctx, layout, dialogueState) {
  const entries = dialogueState.history || [];
  const area = {
    x: layout.utterance.x,
    y: layout.utterance.y,
    w: layout.utterance.w,
    h: layout.choices.y + layout.choices.h - layout.utterance.y
  };

  ctx.save();
  ctx.font = 'bold 13px Georgia';
  ctx.textAlign = 'left';
  ctx.textBaseline = 'top';
  ctx.fillStyle = '#ffcc66';
  ctx.fillText('Dialogue History', area.x, area.y);

  const lineH = layout.box.compact ? 42 : 48;
  const maxRows = Math.max(1, Math.floor((area.h - 30) / lineH));
  const maxOffset = Math.max(0, entries.length - maxRows);
  const offset = clamp(Number(dialogueState.historyScrollOffset || maxOffset), 0, maxOffset);
  dialogueState.historyScrollOffset = offset;

  for (let index = 0; index < maxRows; index++) {
    const entry = entries[offset + index];
    if (!entry) break;
    const y = area.y + 26 + index * lineH;
    ctx.font = 'bold 11px Georgia';
    ctx.fillStyle = entry.kind === 'player' ? '#b9dcff' : '#d9ad55';
    ctx.fillText(entry.speakerName || 'Unknown', area.x, y);
    ctx.font = `${layout.box.compact ? 11 : 12}px Georgia`;
    ctx.fillStyle = 'rgba(238,242,248,0.88)';
    ctx.fillText(trimToWidth(ctx, entry.text, area.w), area.x, y + 16);
  }
  ctx.restore();
}

function drawDialogueFooter(ctx, layout, dialogueState, touchControls = false) {
  const footer = getFooterText(dialogueState, touchControls);
  ctx.save();
  ctx.font = `${touchControls ? 12 : layout.box.compact ? 9 : 11}px Georgia`;
  ctx.textAlign = 'right';
  ctx.textBaseline = 'bottom';
  ctx.fillStyle = 'rgba(232,237,245,0.62)';
  ctx.fillText(trimToWidth(ctx, footer, layout.footer.w), layout.footer.x + layout.footer.w, layout.footer.y + layout.footer.h - 8);
  ctx.restore();
}

function getFooterText(dialogueState, touchControls = false) {
  if (touchControls) {
    if (dialogueState.phase === DIALOGUE_PHASES.TYPING) return 'Tap dialogue to reveal text';
    if (dialogueState.phase === DIALOGUE_PHASES.AWAITING_CHOICE) return 'Tap a response to choose';
    if (dialogueState.phase === DIALOGUE_PHASES.AWAITING_CONTINUE) return 'Tap dialogue to continue';
  }
  if (dialogueState.historyOpen) return '↑/↓ Review   A / Enter / H Return';
  const controller = dialogueState.inputDevice === 'controller';
  if (dialogueState.phase === DIALOGUE_PHASES.OPENING) return 'Conversation opening…';
  if (dialogueState.phase === DIALOGUE_PHASES.TYPING) {
    return controller ? 'A: Reveal Text   View: History   B: Close' : 'Enter / E: Reveal Text   H: History   Esc: Close';
  }
  if (dialogueState.phase === DIALOGUE_PHASES.AWAITING_CHOICE) {
    return controller
      ? 'D-pad Select   A Choose   View History   B Close'
      : '↑/↓ Select   Enter / E Choose   H History   Esc Close';
  }
  if (dialogueState.phase === DIALOGUE_PHASES.AWAITING_CONTINUE) {
    return controller ? 'A: Continue   View: History   B: Close' : 'Enter / E: Continue   H: History   Esc: Close';
  }
  if (dialogueState.phase === DIALOGUE_PHASES.PROCESSING_CHOICE) return 'Applying choice…';
  return '';
}

function getTransitionAlpha(dialogueState) {
  if (dialogueState.settings?.reducedMotion) return 1;
  if (dialogueState.phase === DIALOGUE_PHASES.OPENING) return clamp(1 - Number(dialogueState.openingTimer || 0) / 0.08, 0.2, 1);
  if (dialogueState.phase === DIALOGUE_PHASES.CLOSING) return clamp(Number(dialogueState.closingTimer || 0) / 0.07, 0, 1);
  return 1;
}

function normalizeViewport(ctx, viewport) {
  if (!viewport) return { x: 0, y: 0, width: ctx.canvas.width, height: ctx.canvas.height };
  return {
    x: Math.max(0, Number(viewport.x || 0)),
    y: Math.max(0, Number(viewport.y || 0)),
    width: Math.max(1, Number(viewport.width || ctx.canvas.width)),
    height: Math.max(1, Number(viewport.height || ctx.canvas.height))
  };
}

function wrapText(ctx, text, maxWidth) {
  const paragraphs = String(text || '').split(/\n/);
  const lines = [];

  for (let p = 0; p < paragraphs.length; p++) {
    const words = paragraphs[p].split(/\s+/).filter(Boolean);
    let lineText = '';
    for (const word of words) {
      const candidate = lineText ? `${lineText} ${word}` : word;
      if (ctx.measureText(candidate).width <= maxWidth || !lineText) lineText = candidate;
      else {
        lines.push(lineText);
        lineText = word;
      }
    }
    if (lineText || !words.length) lines.push(lineText);
    if (p < paragraphs.length - 1) lines.push('');
  }
  return lines;
}

function drawScrollCue(ctx, area, direction) {
  ctx.save();
  ctx.font = 'bold 12px Georgia';
  ctx.textAlign = 'right';
  ctx.textBaseline = direction === 'up' ? 'top' : 'bottom';
  ctx.fillStyle = 'rgba(255,204,102,0.76)';
  ctx.fillText(direction === 'up' ? '▲ more' : '▼ more', area.x + area.w - 4, direction === 'up' ? area.y + 2 : area.y + area.h - 2);
  ctx.restore();
}

function trimToWidth(ctx, text, maxWidth) {
  let value = String(text || '');
  if (ctx.measureText(value).width <= maxWidth) return value;
  while (value.length > 3 && ctx.measureText(`${value}…`).width > maxWidth) value = value.slice(0, -1);
  return `${value}…`;
}

function angularRect(ctx, x, y, w, h, cut = 8) {
  const safeCut = Math.max(0, Math.min(cut, Math.abs(w) / 3, Math.abs(h) / 3));
  ctx.beginPath();
  ctx.moveTo(x + safeCut, y);
  ctx.lineTo(x + w - safeCut, y);
  ctx.lineTo(x + w, y + safeCut);
  ctx.lineTo(x + w, y + h);
  ctx.lineTo(x + safeCut, y + h);
  ctx.lineTo(x, y + h - safeCut);
  ctx.lineTo(x, y);
  ctx.closePath();
}

function line(ctx, x1, y1, x2, y2) {
  ctx.beginPath();
  ctx.moveTo(Math.round(x1), Math.round(y1));
  ctx.lineTo(Math.round(x2), Math.round(y2));
  ctx.stroke();
}

function contains(rect, x, y) {
  return x >= rect.x && x <= rect.x + rect.w && y >= rect.y && y <= rect.y + rect.h;
}

function clamp(value, min, max) {
  return Math.max(min, Math.min(max, Number(value || 0)));
}
