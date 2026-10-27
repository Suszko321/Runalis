import {TILE} from './data.js';

// Towns and important regional sites take priority over a strict walking-time
// interval. A physical separation floor prevents nearby duplicate destinations.
export const MIN_NAV_STONE_SPACING=250*TILE;
const PRIMARY_STONES=[
  'nav-hearthmereFrontier-outpost',
  'nav-hearthmereFrontier-hunterCamp',
  'continent-blackfen-landing-nav',
  'nav-aureateMarches-west',
  'continent-clean-hands-nav',
  'continent-last-lantern-overlook-nav',
  'nav-ascensionWastes-east',
  'continent-kingsway-watch-nav',
  'continent-zarynth-trade-ward-nav'
];

// Keep actual regional destinations, rather than generating stones every 90
// road tiles. Stable retained IDs preserve their existing saved attunements.
export function spaceNavStoneNetwork(objects) {
  const priority=id=>{const index=PRIMARY_STONES.indexOf(id);return index<0?PRIMARY_STONES.length:index;};
  const candidates=objects.filter(o=>o.kind==='navStone'&&PRIMARY_STONES.includes(o.id)).sort((a,b)=>priority(a.id)-priority(b.id));
  const retained=[];
  for(const stone of candidates)if(retained.every(other=>Math.hypot(other.x-stone.x,other.y-stone.y)>=MIN_NAV_STONE_SPACING))retained.push(stone);
  const saintOrvane=retained.find(stone=>stone.id==='nav-aureateMarches-west');
  if(saintOrvane)saintOrvane.name='Saint Orvane Waystone';
  const keep=new Set(retained);
  // Remove retired stones from the authored object list before streaming,
  // collision clearings, map destinations and respawn lists are constructed.
  for(let i=objects.length-1;i>=0;i--)if(objects[i].kind==='navStone'&&!keep.has(objects[i]))objects.splice(i,1);
  return retained;
}

export function nearestNavStone(world,actor) {
  const stones=world.navStones?.length?world.navStones:(world.objects||[]).filter(o=>o.kind==='navStone');
  return stones.reduce((best,stone)=>!best||Math.hypot(stone.x-actor.x,stone.y-actor.y)<Math.hypot(best.x-actor.x,best.y-actor.y)?stone:best,null);
}

export function placeAtNavStone(game,actor) {
  const stone=nearestNavStone(game.world,actor);
  if(!stone)return false;
  Object.assign(actor,{x:stone.x,y:stone.y,vx:0,vy:0,dirX:0,dirY:1,currentZone:game.world.name,currentPosition:{x:stone.x,y:stone.y}});
  game.world.continentRuntime?.refresh?.(game);
  return stone;
}
