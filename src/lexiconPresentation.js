// Shared, state-free canvas materials. Never changes hit regions or game state.
let binding;
let shrine;
export function drawLexiconShrine(ctx, width, height) {
  if (!shrine && typeof Image !== 'undefined') {
    shrine = new Image();
    shrine.src = new URL('../assets/ui/shrine.webp', import.meta.url).href;
  }
  ctx.save();
  ctx.fillStyle = '#11100e';
  ctx.fillRect(0, 0, width, height);
  if (shrine?.complete && shrine.naturalWidth) {
    const scale = Math.max(width / shrine.naturalWidth, height / shrine.naturalHeight);
    const w = shrine.naturalWidth * scale, h = shrine.naturalHeight * scale;
    ctx.drawImage(shrine, (width - w) / 2, (height - h) / 2, w, h);
  }
  ctx.restore();
}
function getBinding() {
  if (!binding && typeof Image !== 'undefined') {
    binding = new Image();
    binding.src = new URL('../assets/ui/grimoire-frame.webp', import.meta.url).href;
  }
  return binding;
}

export function drawLexiconFrame(ctx, x, y, width, height, compact = false) {
  ctx.save();
  ctx.fillStyle = '#171510';
  ctx.fillRect(x, y, width, height);
  const art = getBinding();
  const edge = Math.min(compact ? 8 : 24, width / 4, height / 4);
  if (art?.complete && art.naturalWidth) {
    const sw = art.naturalWidth, sh = art.naturalHeight;
    const cut = Math.round(sw * 145 / 1254);
    const sx = [0, cut, sw - cut], sy = [0, cut, sh - cut];
    const dx = [x, x + edge, x + width - edge], dy = [y, y + edge, y + height - edge];
    const sourceW = [cut, sw - cut * 2, cut], sourceH = [cut, sh - cut * 2, cut];
    const destW = [edge, width - edge * 2, edge], destH = [edge, height - edge * 2, edge];
    for (let row = 0; row < 3; row++) for (let col = 0; col < 3; col++) {
      ctx.drawImage(art, sx[col], sy[row], sourceW[col], sourceH[row], dx[col], dy[row], destW[col], destH[row]);
    }
  } else {
    ctx.strokeStyle = '#a88a59';
    ctx.strokeRect(x + .5, y + .5, width - 1, height - 1);
    ctx.strokeStyle = '#56452d';
    ctx.strokeRect(x + 3.5, y + 3.5, width - 7, height - 7);
  }
  ctx.restore();
}

// Replaces informational title-screen alerts only. No confirmation semantics.
export function showLexiconMessage(title, message) {
  let dialog = document.getElementById('lexiconMessage');
  if (!dialog) {
    dialog = document.createElement('dialog');
    dialog.id = 'lexiconMessage';
    dialog.className = 'lexicon-message';
    dialog.setAttribute('aria-labelledby', 'lexiconMessageTitle');
    dialog.innerHTML = '<h2 id="lexiconMessageTitle"></h2><p></p><form method="dialog"><button autofocus>Close</button></form>';
    document.body.appendChild(dialog);
  }
  dialog.querySelector('h2').textContent = title;
  dialog.querySelector('p').textContent = message;
  if (!dialog.open) dialog.showModal();
}
