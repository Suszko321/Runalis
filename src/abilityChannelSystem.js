import {HOTBAR_SLOT_COUNT} from './hotbarConfig.js';
import {mythicalChannelGeometry} from './mythicalEquipmentSystem.js';
import { resolveActorCombatAim } from './combatAim.js';

// Channel lifecycle and payments only. Damage and visuals are supplied by combat.
export function startAbilityChannel(player, ability, slot, now, aim, extra = {}) {
  if (player.activeChannel) return false;
  const profile = ability.channelProfile || {};
  player.activeChannel = {
    abilityId:ability.id, sourceAbilityId:ability.id, slot, startedAt:now,
    duration:profile.duration || 3, until:now+(profile.duration || 3), elapsed:0,
    mode:profile.mode || 'fixed', movementMode:profile.movementMode || 'locked',
    movementMultiplier:profile.movementMultiplier ?? .18, tickInterval:profile.tickInterval || .2,
    nextTickAt:now, nextResourceAt:now+.25, resourceInterval:.25,
    costPerSecond:profile.costPerSecond || 0, costType:ability.costType || 'spirit',
    healthPerSecond:profile.healthPerSecond || 0, turnRate:profile.turnRate || 3,
    dirX:aim.x,dirY:aim.y, classId:player.classId, visualProfile:ability.effectProfile,
    maxTargets:12, ...extra
  };
  return player.activeChannel;
}
export function stopAbilityChannel(player, reason = 'cancelled', onEnd = null) {
  const channel = player?.activeChannel;
  if (!channel) return false;
  player.activeChannel = null;
  if (player.lightbringer?.dawncarverChannel === channel) player.lightbringer.dawncarverChannel = null;
  if (player.visualAction?.abilityId === channel.abilityId) player.visualAction = null;
  onEnd?.(channel,reason);
  return true;
}
export function updateAbilityChannel(player,input,dt,now,{onTick,onEnd,payResource} = {}) {
  const c = player?.activeChannel;
  if (!c) return false;
  const invalid = player.hp <= 0 || (player.lifeState && player.lifeState !== 'alive') || input?.controlLocked ||
    player.stunTimer > 0 || player.staggerTimer > 0 || player.actionState?.guardBreakTimer > 0 || player.knockbackTimer > 0;
  const otherAbility = Array.from({length:HOTBAR_SLOT_COUNT},(_,slot) => slot).some(slot => slot !== c.slot && input?.[`ability${slot}Pressed`]);
  const released = c.mode === 'hold' && (input?.[`ability${c.slot}Released`] || !input?.[`ability${c.slot}Held`]);
  if (invalid || input?.dashPressed || otherAbility || released || now >= c.until) {
    stopAbilityChannel(player,invalid?'interrupted':released?'released':now>=c.until?'finished':'cancelled',onEnd); return false;
  }
  c.elapsed = Math.max(0,now-c.startedAt);
  if(mythicalChannelGeometry(player,c).invalid){stopAbilityChannel(player,'equipmentChanged',onEnd);return false;}
  // Time-based resource payments catch up independently of render frame rate.
  let payments = 0;
  while (now >= c.nextResourceAt && payments++ < 64) {
    c.nextResourceAt += c.resourceInterval;
    const amount = c.costPerSecond * c.resourceInterval;
    const health = c.healthPerSecond * c.resourceInterval;
    if (player.hp <= health || (amount > 0 && !(payResource ? payResource(c.costType,amount) : defaultPay(player,c.costType,amount)))) {
      stopAbilityChannel(player,'depleted',onEnd); return false;
    }
    player.hp -= health;
  }
  const aim = resolveActorCombatAim(player,input || {});
  const angle = Math.atan2(c.dirY,c.dirX), desired = Math.atan2(aim.y,aim.x);
  const delta = Math.atan2(Math.sin(desired-angle),Math.cos(desired-angle));
  const turn = Math.max(0,dt) * c.turnRate;
  const next = angle + Math.max(-turn,Math.min(turn,delta));
  c.dirX = Math.cos(next); c.dirY = Math.sin(next);
  player.dirX=c.dirX; player.dirY=c.dirY;
  let ticks = 0;
  while (now >= c.nextTickAt && ticks++ < 4 && player.activeChannel === c) {
    c.nextTickAt += c.tickInterval; onTick?.(c);
  }
  return true;
}
function defaultPay(player,type,amount) {
  if ((player[type] || 0) < amount) return false;
  player[type] -= amount; return true;
}
export function getChannelMovementMultiplier(player) {
  const c = player?.activeChannel;
  return !c ? 1 : c.movementMode === 'locked' ? 0 : c.movementMode === 'free' ? 1 : c.movementMultiplier;
}
