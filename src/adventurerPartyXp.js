import {safeXP} from './progressionMath.js';

export const ADVENTURER_XP_RATE = .10;

function activeContract(player) {
  if(player?.livingAdventurer)return null;
  return player?.worldMemory?.livingAdventurers?.find(record=>record.hired&&!record.dead);
}

export function playerPartyXpRate(player) {
  return activeContract(player)?1-ADVENTURER_XP_RATE:1;
}

export function settlePartyXp(player,amount,{allocated=false}={}) {
  const record=activeContract(player);
  if(!record)return amount;
  const earned=amount*(1-ADVENTURER_XP_RATE);
  if(!allocated)record.sharedXpPending=safeXP((record.sharedXpPending||0)+earned*ADVENTURER_XP_RATE);
  return earned;
}
