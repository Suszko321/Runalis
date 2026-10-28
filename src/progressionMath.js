// Keep the opening pace, then ease into a RuneScape-style long-term curve.
// Closed-form totals keep large awards logarithmic rather than looping levels.
// Numeric limits protect storage; they are not gameplay level caps.
export const XP_CURVES = Object.freeze({
  combat: { base: 100, linear: 45, quadratic: 12, rampStart:10, doubleEvery:7 },
  skill: { base: 90, linear: 55, quadratic: 42, rampStart:10, doubleEvery:7 },
  mastery: { base: 32, linear: 14, quadratic: 3, rampStart:10, doubleEvery:7 }
});
export const finiteNumber = (value, fallback = 0) => Number.isFinite(Number(value)) ? Number(value) : fallback;
export const safeXP = value => Math.min(Number.MAX_SAFE_INTEGER, Math.max(0, finiteNumber(value)));
export const safeLevel = value => Math.min(Number.MAX_SAFE_INTEGER, Math.max(1, Math.floor(finiteNumber(value, 1))));
const polynomial = (level, curve) => curve.base + curve.linear * level + curve.quadratic * level * level;
function longTermXp(start, count, curve) {
  if(!curve.doubleEvery || count<=0)return 0;
  const first=Math.max(start,curve.rampStart+1),n=Math.max(0,start+count-first);
  if(!n)return 0;
  const k=Math.LN2/curve.doubleEvery,d=first-curve.rampStart;
  // e^x minus its quadratic Taylor polynomial starts gently at the boundary.
  // Sum the geometric series directly; never subtract huge lifetime XP totals.
  if(k*(d+n)>700)return Number.MAX_VALUE;
  const geometric=Math.exp(k*d)*Math.expm1(k*n)/Math.expm1(k);
  const sumD=n*(d+(n-1)/2),sumD2=n*(d*d+d*(n-1)+(n-1)*(2*n-1)/6);
  return Math.min(Number.MAX_VALUE,polynomial(curve.rampStart,curve)*Math.max(0,geometric-n-k*sumD-k*k*sumD2/2));
}
export function xpRequired(level, curve = XP_CURVES.skill) {
  const l = safeLevel(level);
  return Math.min(Number.MAX_VALUE, polynomial(l,curve)+longTermXp(l,1,curve));
}
export function xpForLevels(start, count, curve = XP_CURVES.skill) {
  const l = safeLevel(start), n = Math.max(0, Math.floor(finiteNumber(count)));
  if(!n)return 0;
  // Sum (l+i)^2 without subtracting two large cumulative totals.
  const baseline=n * (curve.base + curve.linear * (l + (n - 1) / 2) +
    curve.quadratic * (l * l + l * (n - 1) + (n - 1) * (2 * n - 1) / 6));
  return Math.min(Number.MAX_VALUE,baseline+longTermXp(l,n,curve));
}
export function advanceProgression(entry, amount, curve = XP_CURVES.skill) {
  const oldLevel = safeLevel(entry.level), added = safeXP(amount);
  const available = Math.min(Number.MAX_SAFE_INTEGER, safeXP(entry.xp) + added);
  let low = 0, high = 1;
  while (high < Number.MAX_SAFE_INTEGER - oldLevel && xpForLevels(oldLevel, high, curve) <= available) high *= 2;
  high = Math.min(high, Number.MAX_SAFE_INTEGER - oldLevel);
  while (low < high) {
    const middle = low + Math.ceil((high - low) / 2);
    if (xpForLevels(oldLevel, middle, curve) <= available) low = middle;
    else high = middle - 1;
  }
  entry.level = oldLevel + low;
  entry.xp = Math.max(0, available - xpForLevels(oldLevel, low, curve));
  return { oldLevel, newLevel: entry.level, levelsGained: low, leveledUp: low > 0, xpAdded: added };
}
// Slow logarithmic power continues improving without runaway linear statistics.
export function levelPower(level) { return 1 + Math.log1p((safeLevel(level) - 1) / 20) * .65; }
export function levelStat(level) { return 20 * Math.log1p((safeLevel(level) - 1) / 20); }
export function levelRefinement(level, scale = 60) { return 1 - Math.exp(-(safeLevel(level) - 1) / scale); }
