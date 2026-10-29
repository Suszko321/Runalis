import { drawHumanActor } from './humanRenderer.js?v=20260924b';
import { getNpcRenderActor } from './objectRenderer.js';
import { DIALOGUE_PHASES } from './dialogueRuntime.js';
import {drawDungeonCharacter} from './dungeonCharacterSprites.js';

// Resolve each line independently: replies can change speakers within one conversation.
export function resolveDialoguePortrait(state) {
  if (state.speakerId === 'narration') return null;
  if (state.speakerId === 'player') return state.actor || null;
  const objects = state.world?.objects || [];
  const npc = objects.find(o => o.kind === 'npc' && state.speakerId &&
    (o.npcId === state.speakerId || o.id === state.speakerId)) ||
    objects.find(o => o.kind === 'npc' && state.speakerName && o.name === state.speakerName) ||
    (state.npcId && state.speakerId === state.npcId
      ? objects.find(o => o.id === state.npcObjectId) : null);
  return npc ? getNpcRenderActor(npc) : null;
}

export function getPortraitSpeechFrame(state) {
  if (state.phase !== DIALOGUE_PHASES.TYPING || state.historyOpen ||
      state.settings?.reducedMotion || !state.visibleText ||
      /[\s.,!?;:]$/.test(state.visibleText)) return 0;
  return 1 + Math.floor((state.revealedTokenCount || state.visibleText.length) / 2) % 3;
}

export function drawDialoguePortrait(ctx, rect, actor, state) {
  const speech = getPortraitSpeechFrame(state);
  ctx.save();
  ctx.fillStyle = '#121014';
  ctx.fillRect(rect.x, rect.y, rect.w, rect.h);
  const light = ctx.createRadialGradient(rect.x + rect.w / 2, rect.y + rect.h * .42, 2,
    rect.x + rect.w / 2, rect.y + rect.h * .42, rect.w * .7);
  light.addColorStop(0, '#534335');
  light.addColorStop(1, '#121014');
  ctx.fillStyle = light;
  ctx.fillRect(rect.x, rect.y, rect.w, rect.h);
  ctx.save();
  ctx.beginPath();
  ctx.rect(rect.x + 3, rect.y + 3, rect.w - 6, rect.h - 6);
  ctx.clip();
  ctx.imageSmoothingEnabled = false;
  const zoom = rect.w / 38 * (state.portraitZoom || 1);
  ctx.translate(rect.x + rect.w / 2, rect.y + rect.h / 2);
  ctx.rotate(speech === 2 ? -.018 : speech === 3 ? .012 : 0);
  ctx.scale(zoom, zoom);
  ctx.translate(0, 30 + (speech === 2 ? .45 : 0));
  // A neutral, front-facing copy keeps world movement/combat out of the portrait.
  if(['groveRootkeeper','orchardTamsin'].includes(actor.npcId))drawDungeonCharacter(ctx,actor.npcId==='groveRootkeeper'?'edda':'tamsin',actor,0,actor.npcId==='groveRootkeeper'?-5:22,{scale:1,talking:!!speech,portrait:true});
  else drawHumanActor(ctx, { ...actor, x: 0, y: 0, scale: 1, dirX: 0, dirY: 1,
    isMoving: false, walkTime: 0, animTime: 0, moveTime: 0, hp: 1, dead: false,
    actionState: {}, combatState: {}, abilityCharge: null, visualAction: null,
    equipment: { ...actor.equipment, weapon: null, offhand: null },
    visualHitUntil: 0 }, { x: 0, y: 0 }, { scale: 1, animationTime: 0 });
  ctx.restore();
  ctx.strokeStyle = '#a58952';
  ctx.lineWidth = 2;
  ctx.strokeRect(rect.x + 1, rect.y + 1, rect.w - 2, rect.h - 2);
  ctx.strokeStyle = '#4c3d2b';
  ctx.lineWidth = 1;
  ctx.strokeRect(rect.x + 4, rect.y + 4, rect.w - 8, rect.h - 8);
  if (speech) {
    ctx.fillStyle = '#e8c578';
    for (let i = 0; i < 3; i++) {
      const height = 3 + ((speech + i) % 3) * 3;
      ctx.fillRect(rect.x + rect.w - 20 + i * 5, rect.y + rect.h - 8 - height, 3, height);
    }
  }
  ctx.restore();
}

