// Compatibility state for existing Greyhaven outcomes. The optional quest
// chain, recruitment dialogue and assignment UI were retired by the director.
export const ORDER_TITLES = [];
export const ORDER_FLAGS = [];
export const ORDER_QUESTS = {};
export function ensureOrder(p) {
  return p.yourOrder ||= {members:{},relationships:{},rep:0,facilities:{},operations:{},policy:'voluntary',knowledge:'controlled',leadership:'council'};
}
export function orderRecruitmentOptions() { return []; }
export function getOrderDialogue() { return null; }
export function applyOrderChoice() { return false; }
export function openOrderLedger() { return false; }
