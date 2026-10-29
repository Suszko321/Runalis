import {TILE} from './data.js';
import {findNearestActorPassablePoint} from './world.js';

const modes = new Set(['dungeon', 'tower', 'sideZone']);
const alive = e => e && !e.dead && !e.remove && e.alive !== false && e.hp > 0;
const boss = (w,e) => e && !e.summonedBy && !e.summonedByBoss && !e.rewardSuppressed &&
  (e.isBoss && !e.miniBoss || e.worldBoss || e.miniBoss &&
    (w.mode === 'sideZone' || (w.rooms || []).some(r=>r.id === e.roomId && r.role === 'miniBoss')));
const floor = w => Number(w.floor || 1);
const records = w => {w.dungeonState ||= {}; return w.dungeonState.bossReturns ||= {};};
const kind = w => w.mode === 'tower' ? 'towerExit' : w.mode === 'sideZone' ? 'sideZoneExit' : 'dungeonExit';
const portalId = (w,key,r) => r.final && w.mode === 'dungeon' ? 'dungeonBossReturnPortal' : `bossReturnPortal:${key}`;
function valid(w,r) {
  return r && r.floor === floor(w) && r.ids?.length &&
    !(w.enemies || []).some(e => r.ids.includes(e.id) && alive(e)) &&
    (!w.dungeonState?.malakar || w.dungeonState.malakar.mode === 'victory');
}
export function recordBossReturnVictory(world,enemy) {
  if (!modes.has(world?.mode) || !boss(world,enemy) || alive(enemy)) return false;
  if (world.bossArena && !world.bossArena.bossIds?.includes(enemy.id) && !enemy.miniBoss) return false;
  if (world.dungeonState?.malakar && world.dungeonState.malakar.mode !== 'victory') return false;
  const ids = world.bossArena?.bossIds?.includes(enemy.id) ? [...world.bossArena.bossIds] : [enemy.id];
  if ((world.enemies || []).some(e => ids.includes(e.id) && alive(e))) return false;
  const key = `${floor(world)}:${[...ids].sort().join('|')}`, ledger = records(world);
  if (!ledger[key]) {
    const center = world.bossArena?.bossIds?.includes(enemy.id) ? world.bossRoomCenter : enemy;
    const point = findNearestActorPassablePoint(world,center?.x ?? enemy.x,(center?.y ?? enemy.y) + TILE*2,12);
    ledger[key] = {floor:floor(world),ids,point,final:world.mode === 'dungeon' && !!world.dungeonState.cleared &&
      ids.some(id => (world.dungeonState.requiredBossIds || [world.dungeonState.mainBossEnemyId]).includes(id))};
  }
  syncBossReturnPortals(world);
  return true;
}
export function syncBossReturnPortals(world) {
  if (!modes.has(world?.mode)) return;
  const ledger = records(world);
  // Recover older cleared side-zone/tower saves after their boss corpse vanished.
  // Ordinary combat/treasure floors do not acquire a boss portal.
  const legacyBoss = world.mode === 'tower' ? world.floorType === 'boss' || floor(world)%10 === 0 :
    world.mode === 'sideZone' && (world.dungeonState.grove || (world.rooms || []).some(r=>r.role === 'boss'));
  const legacyVictory = world.cleared || world.bossArena?.phase === 'defeated' || world.dungeonState.grove?.defeated;
  if (legacyBoss && legacyVictory && !(world.enemies || []).some(e=>boss(world,e) && alive(e)) &&
      !Object.values(ledger).some(r=>r.floor === floor(world))) {
    const ids = world.bossArena?.bossIds?.length ? [...world.bossArena.bossIds] : [`cleared-warden:${floor(world)}`];
    const center = world.bossRoomCenter || world.spawn;
    if (center) ledger[`${floor(world)}:legacy`] = {floor:floor(world),ids,
      point:findNearestActorPassablePoint(world,center.x,center.y+TILE*2,12)};
  }
  for (const [key,r] of Object.entries(ledger)) {
    if (r.floor === floor(world) && !valid(world,r)) delete ledger[key];
  }
  world.objects ||= [];
  world.objects = world.objects.filter(o => {
    if (o.id === 'towerBossReturnPortal') return false; // Replace the old clear-only portal.
    if (o.returnPortal && !o.bossVictoryPortal && world.mode !== 'dungeon') return false;
    return !o.bossVictoryPortal || valid(world,ledger[o.returnRecordKey]);
  });
  for (const [key,r] of Object.entries(ledger)) {
    if (!valid(world,r)) continue;
    const id = portalId(world,key,r);
    let portal = world.objects.find(o => o.id === id);
    if (!portal) {portal = {id}; world.objects.push(portal);}
    Object.assign(portal,{kind:kind(world),name:'Return to Entrance',...r.point,r:24,locked:false,
      returnPortal:true,bossVictoryPortal:true,returnRecordKey:key,forceLabel:true,labelPriority:8,
      // Edda's conclusion is at the Grove entrance; keep it reachable on this visit.
      returnToZoneEntrance:world.mode === 'sideZone' && !!world.dungeonState.grove});
  }
}
export function canUseBossReturnPortal(world,portal) {
  if (!portal?.bossVictoryPortal || !world?.objects?.includes(portal) || world.bossArena?.phase === 'active') return false;
  return valid(world,world.dungeonState?.bossReturns?.[portal.returnRecordKey]);
}
export function returnToZoneEntrance(game,portal) {
  const host = game?.hostGame || game, world = host?.world;
  if (!portal?.returnToZoneEntrance || !canUseBossReturnPortal(world,portal) || !world.spawn) return false;
  const party = [host.player,...(host.player.coop?.players || []).filter(p=>p.active !== false && p.joined !== false)];
  for (const [i,p] of party.entries()) {
    const point = findNearestActorPassablePoint(world,world.spawn.x+(i%2 ? -1 : 1)*Math.floor((i+1)/2)*TILE,world.spawn.y+(i===3 ? TILE : 0),p.r||12);
    Object.assign(p,point);p.currentZone=world.name;
    for (const s of p.summons || []) Object.assign(s,point);
  }
  if (host.camera) Object.assign(host.camera,{x:host.player.x-(host.canvas?.width||960)/2,y:host.player.y-(host.canvas?.height||600)/2});
  world.effects ||= [];world.effects.push({kind:'enemyPulse',layer:'front',...world.spawn,color:'#73d18a',radius:54,ttl:.8,age:0});
  host.log?.('Returned to the dungeon entrance. Edda waits nearby.');
  return true;
}
