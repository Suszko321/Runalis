// dialogueUI.js
// Runalis dialogue UI renderer.
//
// Revised:
// - Stronger backdrop to visually hide canvas HUD.
// - Better panel layout.
// - Response text no longer overlaps option text.
// - Options are drawn in their own area.
// - Panel is centered higher to avoid bottom HUD overlap.
// - Visible option list scrolls around the selected option.
// - Prevents invisible selected dialogue options.

export function drawDialogueUI(ctx, dialogueState) {
  if (!ctx || !dialogueState?.active) return;

  const box = getDialogueBox(ctx);

  drawDialogueBackdrop(ctx);
  drawDialoguePanel(ctx, box);
  drawSpeakerName(ctx, box, dialogueState);
  drawDialogueText(ctx, box, dialogueState);
  drawResponseText(ctx, box, dialogueState);
  drawDialogueOptions(ctx, box, dialogueState);
  drawDialogueHints(ctx, box);
}

// -----------------------------------------------------------------------------
// LAYOUT
// -----------------------------------------------------------------------------

function getDialogueBox(ctx) {
  const margin = 36;
  const width = Math.min(940, ctx.canvas.width - margin * 2);
  const height = Math.min(300, Math.max(250, ctx.canvas.height * 0.34));

  return {
    x: Math.floor((ctx.canvas.width - width) / 2),
    y: Math.floor(ctx.canvas.height - height - 62),
    w: width,
    h: height,
    pad: 22
  };
}

function getLayout(box, hasResponse) {
  const speakerY = box.y + box.pad + 10;

  const responseY = hasResponse
    ? box.y + 86
    : null;

  const responseH = hasResponse
    ? 48
    : 0;

  const optionsY = hasResponse
    ? responseY + responseH + 14
    : box.y + 112;

  const optionsBottom = box.y + box.h - 38;

  return {
    speakerY,
    responseY,
    responseH,
    optionsY,
    optionsBottom,
    optionH: 28,
    optionGap: 7
  };
}

// -----------------------------------------------------------------------------
// DRAWING
// -----------------------------------------------------------------------------

function drawDialogueBackdrop(ctx) {
  ctx.save();

  ctx.fillStyle = 'rgba(0,0,0,0.72)';
  ctx.fillRect(0, 0, ctx.canvas.width, ctx.canvas.height);

  ctx.restore();
}

function drawDialoguePanel(ctx, box) {
  ctx.save();

  ctx.fillStyle = 'rgba(0,0,0,0.64)';
  roundedRect(ctx, box.x + 4, box.y + 6, box.w, box.h, 16);
  ctx.fill();

  const gradient = ctx.createLinearGradient(box.x, box.y, box.x, box.y + box.h);
  gradient.addColorStop(0, 'rgba(24,22,31,0.98)');
  gradient.addColorStop(1, 'rgba(8,8,13,0.98)');

  ctx.fillStyle = gradient;
  roundedRect(ctx, box.x, box.y, box.w, box.h, 16);
  ctx.fill();

  ctx.strokeStyle = 'rgba(182,140,255,0.55)';
  ctx.lineWidth = 2;
  roundedRect(ctx, box.x, box.y, box.w, box.h, 16);
  ctx.stroke();

  ctx.strokeStyle = 'rgba(255,255,255,0.10)';
  ctx.lineWidth = 1;
  line(ctx, box.x + 18, box.y + 12, box.x + box.w - 18, box.y + 12);

  ctx.restore();
}

function drawSpeakerName(ctx, box, dialogueState) {
  const name = dialogueState.npcName || 'Unknown';

  ctx.save();

  const nameX = box.x + box.pad;
  const nameY = box.y - 18;

  ctx.font = 'bold 15px sans-serif';
  ctx.textAlign = 'left';
  ctx.textBaseline = 'middle';

  const textW = ctx.measureText(name).width;
  const plateW = Math.max(150, textW + 34);
  const plateH = 32;

  ctx.fillStyle = 'rgba(0,0,0,0.72)';
  roundedRect(ctx, nameX - 3, nameY - plateH / 2 + 3, plateW, plateH, 10);
  ctx.fill();

  ctx.fillStyle = '#201c2a';
  roundedRect(ctx, nameX - 6, nameY - plateH / 2, plateW, plateH, 10);
  ctx.fill();

  ctx.strokeStyle = 'rgba(255,204,102,0.68)';
  ctx.lineWidth = 2;
  roundedRect(ctx, nameX - 6, nameY - plateH / 2, plateW, plateH, 10);
  ctx.stroke();

  ctx.fillStyle = '#ffcc66';
  ctx.fillText(name, nameX + 10, nameY + 1);

  ctx.restore();
}

function drawDialogueText(ctx, box, dialogueState) {
  const hasResponse = !!dialogueState.responseText;
  const layout = getLayout(box, hasResponse);

  const textX = box.x + box.pad;
  const textY = layout.speakerY;
  const maxW = box.w - box.pad * 2;

  ctx.save();

  ctx.font = '15px sans-serif';
  ctx.textAlign = 'left';
  ctx.textBaseline = 'top';
  ctx.fillStyle = '#e8edf5';

  drawWrappedText(ctx, dialogueState.text || '', textX, textY, maxW, 21, 3);

  ctx.restore();
}

function drawResponseText(ctx, box, dialogueState) {
  if (!dialogueState.responseText) return;

  const layout = getLayout(box, true);

  const responseX = box.x + box.pad;
  const responseY = layout.responseY;
  const responseW = box.w - box.pad * 2;
  const responseH = layout.responseH;

  ctx.save();

  ctx.fillStyle = 'rgba(255,204,102,0.12)';
  roundedRect(ctx, responseX - 8, responseY, responseW + 16, responseH, 8);
  ctx.fill();

  ctx.strokeStyle = 'rgba(255,204,102,0.34)';
  ctx.lineWidth = 1;
  roundedRect(ctx, responseX - 8, responseY, responseW + 16, responseH, 8);
  ctx.stroke();

  ctx.font = '14px sans-serif';
  ctx.textAlign = 'left';
  ctx.textBaseline = 'top';
  ctx.fillStyle = '#ffdf9b';

  drawWrappedText(ctx, dialogueState.responseText, responseX, responseY + 8, responseW, 18, 2);

  ctx.restore();
}

function drawDialogueOptions(ctx, box, dialogueState) {
  const options = dialogueState.options || [];
  if (!options.length) return;

  const hasResponse = !!dialogueState.responseText;
  const layout = getLayout(box, hasResponse);

  const optionX = box.x + box.pad;
  const optionW = box.w - box.pad * 2;
  const optionH = layout.optionH;
  const gap = layout.optionGap;

  const availableH = Math.max(0, layout.optionsBottom - layout.optionsY);
  const maxVisible = Math.max(1, Math.floor(availableH / (optionH + gap)));

  const selectedIndex = clamp(
    Number(dialogueState.selectedIndex || 0),
    0,
    Math.max(0, options.length - 1)
  );

  let firstVisible = 0;

  if (selectedIndex >= maxVisible) {
    firstVisible = selectedIndex - maxVisible + 1;
  }

  firstVisible = clamp(
    firstVisible,
    0,
    Math.max(0, options.length - maxVisible)
  );

  const lastVisible = Math.min(options.length, firstVisible + maxVisible);

  ctx.save();

  ctx.font = '14px sans-serif';
  ctx.textAlign = 'left';
  ctx.textBaseline = 'middle';

  for (let optionIndex = firstVisible; optionIndex < lastVisible; optionIndex++) {
    const option = options[optionIndex];
    const visibleIndex = optionIndex - firstVisible;
    const selected = optionIndex === selectedIndex;
    const y = layout.optionsY + visibleIndex * (optionH + gap);

    if (selected) {
      ctx.fillStyle = 'rgba(182,140,255,0.26)';
      roundedRect(ctx, optionX - 8, y, optionW + 16, optionH, 7);
      ctx.fill();

      ctx.strokeStyle = 'rgba(182,140,255,0.75)';
      ctx.lineWidth = 1;
      roundedRect(ctx, optionX - 8, y, optionW + 16, optionH, 7);
      ctx.stroke();

      ctx.fillStyle = '#ffcc66';
      ctx.fillText('›', optionX, y + optionH / 2);
    }

    ctx.fillStyle = selected ? '#ffffff' : '#c6cedb';

    const label = trimToWidth(ctx, option.label || '...', optionW - 34);
    ctx.fillText(label, optionX + 18, y + optionH / 2);
  }

  ctx.font = '12px sans-serif';
  ctx.fillStyle = 'rgba(232,237,245,0.58)';
  ctx.textAlign = 'right';

  if (firstVisible > 0) {
    ctx.fillText(
      `+${firstVisible} above`,
      optionX + optionW,
      layout.optionsY - 7
    );
  }

  const hiddenBelow = options.length - lastVisible;

  if (hiddenBelow > 0) {
    ctx.fillText(
      `+${hiddenBelow} more`,
      optionX + optionW,
      layout.optionsBottom + 2
    );
  }

  ctx.restore();
}

function drawDialogueHints(ctx, box) {
  ctx.save();

  ctx.font = '11px sans-serif';
  ctx.textAlign = 'right';
  ctx.textBaseline = 'bottom';
  ctx.fillStyle = 'rgba(232,237,245,0.58)';

  ctx.fillText(
    '↑/↓ Select   Enter/E Choose   Esc Close',
    box.x + box.w - box.pad,
    box.y + box.h - 10
  );

  ctx.restore();
}

// -----------------------------------------------------------------------------
// TEXT HELPERS
// -----------------------------------------------------------------------------

function drawWrappedText(ctx, text, x, y, maxWidth, lineHeight, maxLines = Infinity) {
  const words = String(text || '').split(/\s+/).filter(Boolean);

  let line = '';
  let linesDrawn = 0;

  for (let i = 0; i < words.length; i++) {
    const testLine = line ? `${line} ${words[i]}` : words[i];
    const testWidth = ctx.measureText(testLine).width;

    if (testWidth > maxWidth && line) {
      if (linesDrawn >= maxLines) return;

      ctx.fillText(line, x, y + linesDrawn * lineHeight);
      linesDrawn++;

      if (linesDrawn >= maxLines) {
        const remaining = [words[i], ...words.slice(i + 1)].join(' ');
        const ellipsis = trimToWidth(ctx, `${remaining}...`, maxWidth);
        ctx.fillText(ellipsis, x, y + (linesDrawn - 1) * lineHeight);
        return;
      }

      line = words[i];
    } else {
      line = testLine;
    }
  }

  if (line && linesDrawn < maxLines) {
    ctx.fillText(line, x, y + linesDrawn * lineHeight);
  }
}

function trimToWidth(ctx, text, maxWidth) {
  let value = String(text || '');

  if (ctx.measureText(value).width <= maxWidth) {
    return value;
  }

  while (value.length > 3 && ctx.measureText(`${value}...`).width > maxWidth) {
    value = value.slice(0, -1);
  }

  return `${value}...`;
}

// -----------------------------------------------------------------------------
// LOW-LEVEL DRAWING
// -----------------------------------------------------------------------------

function roundedRect(ctx, x, y, w, h, r) {
  const radius = Math.min(r, Math.abs(w) / 2, Math.abs(h) / 2);

  ctx.beginPath();
  ctx.moveTo(x + radius, y);
  ctx.lineTo(x + w - radius, y);
  ctx.quadraticCurveTo(x + w, y, x + w, y + radius);
  ctx.lineTo(x + w, y + h - radius);
  ctx.quadraticCurveTo(x + w, y + h, x + w - radius, y + h);
  ctx.lineTo(x + radius, y + h);
  ctx.quadraticCurveTo(x, y + h, x, y + h - radius);
  ctx.lineTo(x, y + radius);
  ctx.quadraticCurveTo(x, y, x + radius, y);
  ctx.closePath();
}

function line(ctx, x1, y1, x2, y2) {
  ctx.beginPath();
  ctx.moveTo(Math.round(x1), Math.round(y1));
  ctx.lineTo(Math.round(x2), Math.round(y2));
  ctx.stroke();
}

function clamp(value, min, max) {
  return Math.max(min, Math.min(max, value));
}