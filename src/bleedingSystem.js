// Shared read/consume/extend view of actual bleed pools. Owners retain ticking.
const pools=new WeakMap();
export function registerBleedPool(enemy,key,pool){let map=pools.get(enemy);if(!map){map=new Map();pools.set(enemy,map);}map.set(key,pool);}
export function bleedLayers(enemy,now){return [...(pools.get(enemy)?.values()||[])].flatMap(p=>p.bleeds||[]).filter(s=>s.until>now);}
export function isBleeding(enemy,now){return bleedLayers(enemy,now).length>0;}
export function consumeBleeding(enemy,now){const layers=bleedLayers(enemy,now);for(const p of pools.get(enemy)?.values()||[])p.bleeds.splice(0);return layers;}
export function extendBleeding(enemy,seconds,now){for(const s of bleedLayers(enemy,now)){s.extensionLimit??=s.until+3;s.until=Math.min(s.extensionLimit,s.until+seconds);}}
