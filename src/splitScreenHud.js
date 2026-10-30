import { ABILITY_GAMEPAD_LABELS } from './abilityBindings.js';
import { getAbilityAvailability } from './abilityLoadoutSystem.js';
import { getMasteryProgress,applyAbilityMastery } from './abilityMasterySystem.js';
import { drawTechniqueIcon } from './combatTechniqueIcons.js';
import { drawLexiconFrame } from './lexiconPresentation.js';
import {
  ITEMS,
  getAbilityById
} from './data.js';

import {
  getAbilityUseChargeState
} from './abilityChargeSystem.js';

import {
  getActorReviveId,
  getDownedRemaining,
  getRevivePromptForActor,
  isActorBeingRevived,
  isActorDowned
} from './coopReviveSystem.js';

import {HOTBAR_SLOT_COUNT} from './hotbarConfig.js';
import {PARTY_COLORS as SLOT_COLORS} from './partyIdentity.js';
import {getCombatLevelProgress} from './skills.js';
import {getActivePassiveLabels} from './classPassives.js';
import {drawHudPortrait} from './hudPortrait.js';

const RESOURCE_COLORS = {
  hp: '#bd6267',
  stamina: '#91ad7e',
  spirit: '#b68cff',
  lumen: '#ffe58a'
};

export function drawSplitScreenHud(ctx, player, viewport, options = {}) {
  if (!ctx || !player || !viewport) return;

  const slot = clampSlot(options.slot ?? player.slot ?? player.playerNumber ?? 1);
  const game = options.game || null;
  const memberCount = Number(options.memberCount || 1);
  const dense = !!options.dense || (!options.shared && memberCount >= 3);
  const compact = dense || !!options.compact || viewport.width < 690 || viewport.height < 430 || memberCount >= 3;
  const color = SLOT_COLORS[slot - 1] || '#e8edf5';
  const pad = dense ? 6 : compact ? 9 : 13;
  const panelWidth = Math.min(viewport.width - pad * 2, dense ? 174 : options.shared ? 318 : compact ? 238 : 318);
  const panelX = viewport.x + pad;
  const panelY = viewport.y + pad;
  const panelHeight = (dense ? 62 : compact ? 88 : 118) + 14;

  ctx.save();
  ctx.imageSmoothingEnabled = false;
  drawHudPanel(ctx, panelX, panelY, panelWidth, panelHeight, color);
  const portraitWidth = dense ? 0 : 48;
  if(portraitWidth){
    ctx.fillStyle='#10191e';ctx.fillRect(panelX+8,panelY+8,48,64);
    drawHudPortrait(ctx,player,panelX+8,panelY+8,48,64);
    ctx.strokeStyle='#b39860';ctx.lineWidth=1;ctx.strokeRect(panelX+8.5,panelY+8.5,47,63);
  }
  const bodyX=panelX+8+(portraitWidth?portraitWidth+8:0),bodyWidth=panelWidth-16-(portraitWidth?portraitWidth+8:0);
  drawPlayerHeader(ctx, player, slot, bodyX, panelY + (dense ? 6 : 8), bodyWidth, compact, color, dense);
  drawResourceBars(ctx, player, bodyX, panelY + (dense ? 24 : compact ? 31 : 39), bodyWidth, compact, dense);

  if (player.classId === 'lightbringer') {
    drawLumenPips(ctx, player, panelX + 8, panelY + panelHeight - (dense ? 27 : 32), panelWidth - 16, compact, dense);
  }
  const progress = getCombatLevelProgress(player);
  const xpY = panelY + panelHeight - 13;
  ctx.font = dense ? 'bold 7px sans-serif' : 'bold 9px sans-serif';
  ctx.textAlign = 'left';ctx.textBaseline = 'top';ctx.fillStyle = color;
  ctx.fillText(`Lv ${progress.level}`, panelX + 8, xpY);
  ctx.textAlign = 'right';ctx.fillStyle = '#f5edf8';
  ctx.fillText(`${Math.floor(progress.xp)}/${Math.ceil(progress.next)} XP`, panelX + panelWidth - 8, xpY);
  ctx.fillStyle = 'rgba(255,255,255,.15)';ctx.fillRect(panelX + 8, xpY + 10, panelWidth - 16, 2);
  ctx.fillStyle = color;ctx.fillRect(panelX + 8, xpY + 10, (panelWidth - 16) * progress.percent / 100, 2);
  const statuses = [
    player.controllerDisconnected ? 'Controller disconnected' : '',
    ...getActivePassiveLabels(player).map(status => typeof status === 'string' ? status : status.label),
    player.poisonTimer > 0 ? 'Poisoned' : '',
    player.burnTimer > 0 ? 'Burning' : '',
    player.slowTimer > 0 ? 'Slowed' : ''
  ].filter(Boolean);
  if (statuses.length) {
    ctx.fillStyle = 'rgba(3,6,12,.85)';ctx.fillRect(panelX, panelY + panelHeight + 2, panelWidth, 14);
    ctx.font = dense ? 'bold 7px sans-serif' : 'bold 9px sans-serif';ctx.textAlign = 'left';ctx.textBaseline = 'middle';ctx.fillStyle = '#f5edf8';
    ctx.fillText(trimText(ctx, statuses.join(' · '), panelWidth - 12, ctx.font), panelX + 6, panelY + panelHeight + 9);
  }

  drawHotbar(ctx, player, viewport, compact, color, dense);
  drawReviveHud(ctx, player, viewport, compact, color, game, dense);
  ctx.restore();
}

function drawHudPanel(ctx, x, y, width, height, color) {
  const background=ctx.createLinearGradient(x,y,x+width,y+height);
  background.addColorStop(0,'rgba(11,20,25,.95)');background.addColorStop(1,'rgba(16,27,32,.85)');
  ctx.fillStyle=background;ctx.fillRect(x,y,width,height);
  ctx.strokeStyle = '#9c8457';
  ctx.lineWidth = 1;
  ctx.strokeRect(x + 0.5, y + 0.5, width - 1, height - 1);
  ctx.strokeStyle='#060d12';ctx.lineWidth=3;ctx.strokeRect(x+3,y+3,width-6,height-6);
  ctx.fillStyle = color;ctx.fillRect(x,y,3,height);
}

function drawPlayerHeader(ctx, player, slot, x, y, width, compact, color, dense = false) {
  const nameFont = dense ? 'bold 9px Georgia' : compact ? 'bold 11px Georgia' : 'bold 13px Georgia';
  const classFont = dense ? 'bold 7px Georgia' : compact ? '9px Georgia' : '10px Georgia';
  const name = trimText(ctx, player.name || `Player ${slot}`, width * 0.58, nameFont);
  const className = trimText(ctx, player.className || player.classId || 'Classless', width * 0.46, classFont);

  ctx.font = nameFont;
  ctx.textAlign = 'left';
  ctx.textBaseline = 'top';
  ctx.fillStyle = '#f5edf8';
  ctx.fillText(`P${slot} ${name}`, x, y);

  ctx.font = classFont;
  ctx.textAlign = 'right';
  ctx.fillStyle = color;
  ctx.fillText(className, x + width, y + (dense ? 1 : compact ? 1 : 2));
}

function drawResourceBars(ctx, player, x, y, width, compact, dense = false) {
  const barHeight = dense ? 5 : compact ? 9 : 10;
  const gap = dense ? 3 : compact ? 5 : 7;
  drawResourceBar(ctx, 'HP', player.hp, player.maxHp, x, y, width, barHeight, RESOURCE_COLORS.hp, dense);
  drawResourceBar(ctx, 'STA', player.stamina, player.maxStamina, x, y + barHeight + gap, width, barHeight, RESOURCE_COLORS.stamina, dense);
  drawResourceBar(ctx, 'SPI', player.spirit, player.maxSpirit || 1, x, y + (barHeight + gap) * 2, width, barHeight, RESOURCE_COLORS.spirit, dense);
}

function drawResourceBar(ctx, label, value, max, x, y, width, height, color, dense = false) {
  const safeMax = Math.max(1, Number(max || 1));
  const safeValue = Math.max(0, Math.min(safeMax, Number(value || 0)));
  const fillWidth = Math.round(width * safeValue / safeMax);

  ctx.fillStyle = 'rgba(255, 255, 255, 0.1)';
  ctx.fillRect(x, y, width, height);
  const fill=ctx.createLinearGradient(x,y,x,y+height);fill.addColorStop(0,color);fill.addColorStop(1,color===RESOURCE_COLORS.hp?'#aa303d':color===RESOURCE_COLORS.stamina?'#438c73':'#7752b4');
  ctx.fillStyle = fill;
  ctx.fillRect(x, y, fillWidth, height);
  ctx.strokeStyle = '#8a805f';
  ctx.strokeRect(x + 0.5, y + 0.5, width - 1, height - 1);

  ctx.font = dense ? 'bold 6px sans-serif' : 'bold 7px sans-serif';
  ctx.textAlign = 'left';
  ctx.textBaseline = 'middle';
  ctx.fillStyle = '#05070c';
  ctx.fillText(label, x + 3, y + height / 2 + 0.5);

  ctx.textAlign = 'right';
  ctx.fillStyle = '#f5edf8';
  ctx.fillText(`${Math.ceil(safeValue)}/${Math.ceil(safeMax)}`, x + width - 3, y + height / 2 + 0.5);
}

function drawLumenPips(ctx, player, x, y, width, compact, dense = false) {
  const state = player.lightbringer || {};
  const maxLumens = Math.max(1, Number(state.maxLumens || 3));
  const lumens = Math.max(0, Math.min(maxLumens, Math.floor(Number(state.lumens || 0))));
  const pipSize = dense ? 6 : compact ? 8 : 10;
  const gap = dense ? 3 : 4;
  const startX = x + Math.max(0, width - maxLumens * pipSize - (maxLumens - 1) * gap);

  ctx.font = dense ? 'bold 6px sans-serif' : compact ? 'bold 8px sans-serif' : 'bold 9px sans-serif';
  ctx.textAlign = 'left';
  ctx.textBaseline = 'middle';
  ctx.fillStyle = '#ffeeb5';
  ctx.fillText('LUM', x, y + pipSize / 2);

  for (let i = 0; i < maxLumens; i++) {
    const px = startX + i * (pipSize + gap);
    ctx.fillStyle = i < lumens ? RESOURCE_COLORS.lumen : 'rgba(255, 229, 138, 0.18)';
    ctx.fillRect(px, y, pipSize, pipSize);
    ctx.strokeStyle = 'rgba(255, 229, 138, 0.5)';
    ctx.strokeRect(px + 0.5, y + 0.5, pipSize - 1, pipSize - 1);
  }
}

function drawHotbar(ctx, player, viewport, compact, color, dense = false) {
  const now = performance.now() / 1000;
  const gap = dense ? 4 : compact ? 6 : 8;
  const slotSize = Math.min(dense ? 27 : compact ? 40 : 52,
    Math.max(16, Math.floor((viewport.width - 16 - gap * HOTBAR_SLOT_COUNT) / (HOTBAR_SLOT_COUNT + 1))));
  const totalWidth = slotSize * (HOTBAR_SLOT_COUNT+1) + gap * HOTBAR_SLOT_COUNT;
  const x = viewport.x + Math.max(8, Math.floor((viewport.width - totalWidth) / 2));
  const y = viewport.y + viewport.height - slotSize - (dense ? 17 : compact ? 20 : 24);
  const weapon = player.equipment?.weapon ? ITEMS[player.equipment.weapon] : null;
  const hotbar = [
    {
      key: 'RB',
      name: getBasicAttackName(weapon),
      icon: getWeaponIcon(weapon),
      ready: true,
      cooldownPercent: 0,
      chargeText: ''
    },
    ...Array.from({length:HOTBAR_SLOT_COUNT},(_,index)=>index).map(index => getAbilitySlotState(player, index, now))
  ];

  drawHudPanel(ctx,x-6,y-6,totalWidth+12,slotSize+22,color);
  for (let i = 0; i < hotbar.length; i++) {
    drawHotbarSlot(ctx, hotbar[i], x + i * (slotSize + gap), y, slotSize, compact, i === 0 ? color : '#c1a16b', dense);
  }
}

function drawReviveHud(ctx, player, viewport, compact, color, game, dense = false) {
  const now = performance.now() / 1000;

  if (player.reviveAction?.active) {
    drawReviveTimingMeter(ctx, player, viewport, compact, color, game, now, dense);
    return;
  }

  if (isActorDowned(player)) {
    drawDownedHud(ctx, player, viewport, compact, now, dense);
    return;
  }

  const prompt = getRevivePromptForActor(game, player, now);
  if (prompt) {
    drawRevivePrompt(ctx, prompt, viewport, compact, color, dense);
  }
}

function drawDownedHud(ctx, player, viewport, compact, now, dense = false) {
  const width = Math.min(viewport.width - 22, dense ? 132 : compact ? 186 : 250);
  const height = dense ? 28 : compact ? 36 : 44;
  const x = viewport.x + Math.floor((viewport.width - width) / 2);
  const y = viewport.y + viewport.height - (dense ? 70 : compact ? 94 : 122);
  const remaining = Math.ceil(getDownedRemaining(player, now));
  const label = isActorBeingRevived(player) ? 'BEING REVIVED' : 'DOWNED';

  drawLexiconFrame(ctx, x, y, width, height, true);
  ctx.strokeStyle = isActorBeingRevived(player) ? '#fff1b8' : '#ff8c8c';
  ctx.lineWidth = 2;
  ctx.strokeRect(x + 1, y + 1, width - 2, height - 2);

  ctx.font = dense ? 'bold 8px sans-serif' : compact ? 'bold 10px sans-serif' : 'bold 12px sans-serif';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillStyle = '#f5edf8';
  ctx.fillText(`${label} ${remaining}s`, x + width / 2, y + height / 2);
}

function drawRevivePrompt(ctx, prompt, viewport, compact, color, dense = false) {
  const width = Math.min(viewport.width - 22, dense ? 124 : compact ? 156 : 210);
  const height = dense ? 24 : compact ? 28 : 34;
  const x = viewport.x + Math.floor((viewport.width - width) / 2);
  const y = viewport.y + viewport.height - (dense ? 68 : compact ? 92 : 118);
  const targetName = prompt.target?.name || `P${prompt.target?.slot || '?'}`;

  drawLexiconFrame(ctx, x, y, width, height, true);
  ctx.strokeStyle = color;
  ctx.lineWidth = 2;
  ctx.strokeRect(x + 1, y + 1, width - 2, height - 2);

  ctx.font = dense ? 'bold 7px sans-serif' : compact ? 'bold 9px sans-serif' : 'bold 11px sans-serif';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillStyle = '#f5edf8';
  const font = dense ? 'bold 7px sans-serif' : compact ? 'bold 9px sans-serif' : 'bold 11px sans-serif';
  ctx.fillText(`A REVIVE ${trimText(ctx, targetName, Math.max(20, width - (dense ? 70 : 92)), font)}`, x + width / 2, y + height / 2);
}

function drawReviveTimingMeter(ctx, player, viewport, compact, color, game, now, dense = false) {
  const action = player.reviveAction;
  if (!action?.active) return;

  const target = findReviveTarget(game, action.targetId);
  const attempts = Array.isArray(action.attempts) ? action.attempts : [];
  const width = Math.min(viewport.width - 24, dense ? 184 : compact ? 248 : 330);
  const height = dense ? 46 : compact ? 58 : 70;
  const x = viewport.x + Math.floor((viewport.width - width) / 2);
  const y = viewport.y + viewport.height - (dense ? 96 : compact ? 128 : 164);
  const barX = x + 14;
  const barY = y + (dense ? 24 : compact ? 31 : 39);
  const barWidth = width - 28;
  const barHeight = dense ? 7 : compact ? 9 : 11;
  const targetName = target?.name || 'Ally';
  const remaining = target ? Math.ceil(getDownedRemaining(target, now)) : 0;

  drawLexiconFrame(ctx, x, y, width, height, true);
  ctx.strokeStyle = color;
  ctx.lineWidth = 2;
  ctx.strokeRect(x + 1, y + 1, width - 2, height - 2);

  ctx.font = dense ? 'bold 7px sans-serif' : compact ? 'bold 9px sans-serif' : 'bold 11px sans-serif';
  ctx.textAlign = 'left';
  ctx.textBaseline = 'top';
  ctx.fillStyle = '#f5edf8';
  ctx.fillText(`REVIVE ${trimText(ctx, targetName, width * 0.42, dense ? 'bold 7px sans-serif' : compact ? 'bold 9px sans-serif' : 'bold 11px sans-serif')}`, x + 12, y + 8);

  ctx.textAlign = 'right';
  ctx.fillStyle = '#fff1b8';
  ctx.fillText(`${attempts.length}/3  ${remaining}s`, x + width - 12, y + 8);

  ctx.fillStyle = 'rgba(255, 255, 255, 0.12)';
  ctx.fillRect(barX, barY, barWidth, barHeight);

  const successStart = barX + Math.max(0, Math.min(1, Number(action.targetStart || 0))) * barWidth;
  const successEnd = barX + Math.max(0, Math.min(1, Number(action.targetEnd || 0))) * barWidth;
  ctx.fillStyle = 'rgba(255, 241, 184, 0.78)';
  ctx.fillRect(successStart, barY - 2, Math.max(3, successEnd - successStart), barHeight + 4);

  const cursorX = barX + Math.max(0, Math.min(1, Number(action.cursor || 0))) * barWidth;
  ctx.fillStyle = '#66f0ff';
  ctx.fillRect(Math.round(cursorX) - 2, barY - 6, 4, barHeight + 12);

  drawReviveAttemptPips(ctx, attempts, x + 12, y + height - (dense ? 9 : compact ? 12 : 15), compact, dense);

  ctx.font = dense ? 'bold 6px sans-serif' : compact ? 'bold 8px sans-serif' : 'bold 9px sans-serif';
  ctx.textAlign = 'right';
  ctx.textBaseline = 'middle';
  ctx.fillStyle = '#d9c7ef';
  ctx.fillText(action.feedback || 'Press A in the window', x + width - 12, y + height - (compact ? 9 : 12));
}

function drawReviveAttemptPips(ctx, attempts, x, y, compact, dense = false) {
  const size = dense ? 5 : compact ? 6 : 8;
  const gap = dense ? 4 : 5;

  for (let i = 0; i < 3; i++) {
    const attempt = attempts[i];
    const px = x + i * (size + gap);
    ctx.fillStyle = attempt
      ? attempt.score >= 0.75
        ? '#fff1b8'
        : attempt.score > 0
          ? '#73d18a'
          : '#9facbf'
      : 'rgba(255, 255, 255, 0.18)';
    ctx.fillRect(px, y - size / 2, size, size);
    ctx.strokeStyle = 'rgba(0, 0, 0, 0.65)';
    ctx.strokeRect(px + 0.5, y - size / 2 + 0.5, size - 1, size - 1);
  }
}

function findReviveTarget(game, targetId) {
  if (!game || !targetId) return null;

  const party = [
    game.player,
    ...(game.player?.coop?.players || [])
  ].filter(actor => actor && actor.active !== false);

  return party.find(actor => getActorReviveId(actor) === String(targetId)) || null;
}

function getAbilitySlotState(player, index, now) {
  const labels = ABILITY_GAMEPAD_LABELS;
  const id = player.loadout?.abilitySlots?.[index] || null;
  const ability = applyAbilityMastery(player,id ? getAbilityById(id) : null);

  if (!ability) {
    return {
      key: labels[index],
      name: 'Empty',
      icon: '',
      ready: false,
      cooldownPercent: 0,
      cooldownText: '',
      chargeText: ''
    };
  }

  player.cooldowns = player.cooldowns || {};
  const useChargeState = getAbilityUseChargeState(player, ability, now);
  let cooldownPercent = 0;
  let cooldownText = '';
  let ready = true;

  if (useChargeState.maxCharges > 1) {
    ready = useChargeState.charges > 0;
    cooldownPercent = ready ? 0 : Math.max(0, Math.min(100, (useChargeState.remaining / Math.max(0.1, useChargeState.rechargeTime)) * 100));
    cooldownText = cooldownPercent > 0 ? useChargeState.remaining.toFixed(1) : '';
  } else {
    const cooldown = Math.max(0, Number(ability.cd || 0));
    const last = player.cooldowns[ability.id] ?? -Infinity;
    const remaining = Math.max(0, cooldown - (now - last));
    cooldownPercent = cooldown > 0 ? Math.max(0, Math.min(100, remaining / cooldown * 100)) : 0;
    cooldownText = remaining > 0 ? remaining.toFixed(1) : '';
    ready = remaining <= 0;
  }

  return {
    key: labels[index],
    name: ability.name,
    ability,mastery:getMasteryProgress(player,ability.id).level,channelActive:ability.heldBlock?!!player.actionState?.blocking&&!player.actionState?.guardBroken:player.activeChannel?.abilityId===ability.id,holdProgress:player.abilityCharge?.abilityId===ability.id?player.abilityCharge.progress:0,
    icon: createAbilityIcon(ability),
    ready:ready && getAbilityAvailability(player,ability).usable && (player[ability.costType] || 0)>=(ability.heldBlock?2:ability.cost),
    cooldownPercent,
    cooldownText,
    chargeText: useChargeState.maxCharges > 1 ? `${useChargeState.charges}/${useChargeState.maxCharges}` : '',
    rechargeProgress:useChargeState.maxCharges>1&&useChargeState.recharging?useChargeState.rechargeProgress:0,
    resourceLow:(player[ability.costType]||0)<(ability.heldBlock?2:ability.cost)
  };
}

function drawHotbarSlot(ctx, slot, x, y, size, compact, accent, dense = false) {
  const background=ctx.createLinearGradient(x,y,x,y+size);background.addColorStop(0,'#263039');background.addColorStop(1,'#10151d');
  ctx.fillStyle = background;
  ctx.fillRect(x, y, size, size);
  ctx.strokeStyle = slot.ready ? accent : '#655b48';
  ctx.lineWidth = 1;
  ctx.strokeRect(x + 1, y + 1, size - 2, size - 2);

  ctx.fillStyle = slot.ready ? '#f5edf8' : 'rgba(245, 237, 248, 0.42)';
  ctx.font = dense ? 'bold 9px sans-serif' : compact ? 'bold 13px sans-serif' : 'bold 16px sans-serif';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  if(!drawTechniqueIcon(ctx,slot.ability,x+size*.09,y+size*.09,size*.82))ctx.fillText(slot.icon || '--', x + size / 2, y + size / 2 - (dense ? 1 : compact ? 2 : 4));
  if(slot.channelActive){ctx.strokeStyle='#dceaf2';ctx.lineWidth=3;ctx.strokeRect(x+2,y+2,size-4,size-4);}
  if(slot.holdProgress){ctx.fillStyle='#ead49a';ctx.fillRect(x,y+size-3,size*slot.holdProgress,3);}
  if(slot.mastery&&!dense){ctx.font='bold 7px sans-serif';ctx.fillText(`M${slot.mastery}`,x+size-11,y+size-17);}

  ctx.fillStyle = 'rgba(3, 6, 12, 0.84)';
  const badgeWidth=dense?16:22,badgeHeight=dense?10:12;
  ctx.fillRect(x+(size-badgeWidth)/2,y+size-3,badgeWidth,badgeHeight);
  ctx.strokeStyle='#98835b';ctx.strokeRect(x+(size-badgeWidth)/2+.5,y+size-2.5,badgeWidth-1,badgeHeight-1);
  ctx.font = dense ? '7px Georgia' : '9px Georgia';
  ctx.textAlign = 'center';ctx.textBaseline='middle';
  ctx.fillStyle = '#eee2c6';
  ctx.fillText(slot.key,x+size/2,y+size+badgeHeight/2-3);

  if (slot.chargeText) {
    ctx.textAlign = 'right';
    ctx.fillStyle = '#ffeeb5';
    ctx.fillText(slot.chargeText, x + size - 4, y + (dense ? 8 : compact ? 10 : 13));
  }

  if (!compact && slot.name) {
    ctx.font = 'bold 7px sans-serif';
    ctx.textAlign = 'center';
    ctx.fillStyle = 'rgba(245, 237, 248, 0.78)';
    ctx.fillText(trimText(ctx, slot.name, size - 6, 'bold 7px sans-serif'), x + size / 2, y + size - 8);
  }

  if (slot.cooldownPercent > 0) {
    const overlayHeight = Math.round(size * slot.cooldownPercent / 100);
    ctx.fillStyle = 'rgba(0, 0, 0, 0.62)';
    ctx.fillRect(x, y + size - overlayHeight, size, overlayHeight);
    ctx.font = dense ? 'bold 8px sans-serif' : compact ? 'bold 10px sans-serif' : 'bold 12px sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillStyle = '#f8e7ff';
    ctx.fillText(slot.cooldownText, x + size / 2, y + size / 2);
  }
  if(slot.rechargeProgress){ctx.fillStyle='#80c8dc';ctx.fillRect(x,y+size-5,size*slot.rechargeProgress,2);}
  if(slot.channelActive||slot.resourceLow){ctx.textAlign='center';ctx.font=dense?'bold 5px sans-serif':'bold 7px sans-serif';ctx.fillStyle=slot.channelActive?'#e6eff5':'#e6ad87';ctx.fillText(slot.channelActive?'CHANNEL':'LOW',x+size/2,y+size-4);}
}

function getBasicAttackName(weapon) {
  if (weapon?.primaryAttackName) return weapon.primaryAttackName;
  if (weapon?.name) return weapon.name;
  return 'Strike';
}

function getWeaponIcon(weapon) {
  const type = String(weapon?.weaponType || weapon?.type || '').toLowerCase();

  if (type.includes('bow')) return 'BOW';
  if (type.includes('focus')) return 'FOC';
  if (type.includes('staff')) return 'STF';
  if (type.includes('dagger')) return 'DAG';
  if (type.includes('axe')) return 'AXE';
  if (type.includes('mace')) return 'MCE';
  if (type.includes('sword') || type.includes('blade')) return 'SWD';
  return 'ATK';
}

function createAbilityIcon(ability) {
  const source = ability?.shortName || ability?.name || ability?.id || '';
  const words = String(source).replace(/([a-z])([A-Z])/g, '$1 $2').split(/\s+/).filter(Boolean);
  const initials = words.slice(0, 2).map(word => word[0]).join('').toUpperCase();
  return initials || 'AB';
}

function trimText(ctx, text, maxWidth, font) {
  const value = String(text || '');
  const previousFont = ctx.font;
  if (font) ctx.font = font;
  if (ctx.measureText(value).width <= maxWidth) {
    ctx.font = previousFont;
    return value;
  }

  let trimmed = value;
  while (trimmed.length > 1 && ctx.measureText(`${trimmed}...`).width > maxWidth) {
    trimmed = trimmed.slice(0, -1);
  }

  ctx.font = previousFont;
  return `${trimmed}...`;
}

function clampSlot(value) {
  return Math.max(1, Math.min(4, Math.floor(Number(value || 1))));
}
