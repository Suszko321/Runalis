// Cooldowns use a session clock, whose origin changes when a page is reloaded.
// Save the origin alongside the timestamps and preserve elapsed cooldown time.
export function rebaseCooldownMap(map, savedClock, now = performance.now()/1000) {
  const result={};
  const knownOrigin=Number.isFinite(Number(savedClock))&&savedClock!=null&&Number(savedClock)>=0;
  for(const [id,value]of Object.entries(map||{})) {
    const stamp=Number(value);if(!Number.isFinite(stamp))continue;
    result[id]=Math.min(now,knownOrigin ? now-Number(savedClock)+stamp : stamp);
  }
  return result;
}
