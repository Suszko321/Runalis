// Slots are assigned by the session host and retained on online replicas.
export const PARTY_COLORS = Object.freeze(['#ffcc66', '#73d18a', '#b68cff', '#66f0ff']);
export function partySlot(actor, fallback = 1) {
  return Math.max(1, Math.min(4, Number(actor?.partyMapSlot || actor?.slot || actor?.playerNumber || fallback)));
}
export function partyColor(actor, fallback = 1) {
  return PARTY_COLORS[partySlot(actor, fallback) - 1];
}
