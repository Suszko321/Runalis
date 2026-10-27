// Enemy presentation contracts. Gameplay kinds, stats and encounter IDs stay authoritative.
export const ENEMY_VISUAL_VERSION = 2;
export const ENEMY_KINDS = Object.freeze(['hollowling','ashWolf','stalkerWolf','gravebound','shieldKnight','roadlessBandit','demonCultist','cultist','wraith','veyrWraith','brute','gravePriest','archer','exploder','basicBeast']);
export const FACTION_STYLES = Object.freeze({
  roadless: {name:'Roadless', base:'#68503d', mid:'#997959', light:'#c5a580', accent:'#97725a', cloth:'#504136', silhouette:'leather', helm:'mask', emblem:'knot'},
  lastDawn: {name:'Last Dawn', base:'#35383e', mid:'#66666b', light:'#98928a', accent:'#a04a41', cloth:'#642b2d', silhouette:'plate', helm:'angular', emblem:'chevron'},
  covenant: {name:'Covenant', base:'#b8b8ae', mid:'#d9d6c3', light:'#eee2bc', accent:'#c4a15b', cloth:'#c7be9e', silhouette:'plate', helm:'crest', emblem:'sun'},
  emberVeil: {name:'Ember Veil', base:'#58352e', mid:'#9b5540', light:'#c08859', accent:'#dd9258', cloth:'#4d2826', silhouette:'robe', helm:'ritual', emblem:'flame'},
  graveCult: {name:'Grave Cult', base:'#48404f', mid:'#756479', light:'#afa08f', accent:'#9982ad', cloth:'#302b3d', silhouette:'robe', helm:'ritual', emblem:'bone'},
  watcher: {name:'Watcher', base:'#4b6270', mid:'#8194a0', light:'#b8c2b7', accent:'#95bcc0', cloth:'#344c5a', silhouette:'robe', helm:'hood', emblem:'eye'},
  veyr: {name:'Veyr', base:'#3e4954', mid:'#667b86', light:'#9faeac', accent:'#7196a5', cloth:'#293e49', silhouette:'plate', helm:'angular', emblem:'bars'}
});
export function visualHash(value) {let h=2166136261;for(const c of String(value))h=Math.imul(h^c.charCodeAt(0),16777619);return h>>>0;}
export function getEnemyBossVisual(enemy) {
  if (!enemy?.isBoss && !enemy?.worldBoss && !enemy?.bossType) return null;
  const s=`${enemy.bossRenderType||''} ${enemy.bossType||''} ${enemy.bossId||''} ${enemy.bossName||''} ${enemy.name||''} ${enemy.id||''}`.toLowerCase();
  if (/seraphel|uncrowned/.test(s)) return 'seraphel';
  if (/zephyr/.test(s)) return 'zephyrLight';
  if (/hollow.?elk|blighted.?elk/.test(s)) return 'hollowElk';
  if (/demon.?lord|malakar|solgate demon/.test(s)) return 'demonLord';
  if (/veyr.?warden|warden.?veyr/.test(s)) return 'veyrWarden';
  if (/red.?seal.?executioner|last.?dawn.?executioner/.test(s)) return 'redSealExecutioner';
  if (/grave.?maw.?bear/.test(s)) return 'graveMawBear';
  if (/briar.?titan/.test(s)) return 'briarTitan';
  return null;
}
export function getEnemyFaction(enemy) {
  if (FACTION_STYLES[enemy?.visualFactionId]&&!enemy?.enemyVisualFactionInferred) return enemy.visualFactionId;
  const title=String(enemy?.name||'').toLowerCase();
  if(/last.?dawn|red.?seal|red.?banner/.test(title))return 'lastDawn';
  if(/roadless|bandit|poach|robber|ambusher|cutthroat/.test(title))return 'roadless';
  if(/veyr/.test(title))return 'veyr';
  if(/network|unity|assimil/.test(title))return 'watcher';
  const text=`${enemy?.name||''} ${enemy?.id||''} ${enemy?.majorPoiId||''} ${enemy?.dungeonThreatProfile||''} ${enemy?.faction||''} ${enemy?.infiniteDungeonRegionId||''}`.toLowerCase();
  if (/covenant|aureate|ivory|lumen|avarra|radiant|sun.?oath|divine|concord|sacred|holy|oathbound|checkpoint|pilgrim|purifi|choir|chapel/.test(text)) return 'covenant';
  if (/last.?dawn|red.?seal/.test(text)) return 'lastDawn';
  if (/ember.?veil|cinder|ash.?cult|demon/.test(text)) return 'emberVeil';
  if (/watcher|light.?bent|astral|network|wastes|unity|assimil|severed/.test(text)) return 'watcher';
  if (/veyr/.test(text)) return 'veyr';
  if (/cult|acolyte|ritual|necrom|bone.?caller/.test(text)) return 'graveCult';
  return enemy?.kind==='demonCultist'?'emberVeil':enemy?.kind==='cultist'?'graveCult':'roadless';
}
const MODELS = Object.freeze({
  corpse:{family:'blighted',atlas:'enemies-blighted',row:0,cellWidth:96,cellHeight:112,pivot:106,scale:.9,shadow:16,hpOffset:55},
  infectedSoldier:{family:'blighted',atlas:'enemies-blighted',row:1,cellWidth:96,cellHeight:112,pivot:106,scale:1,shadow:17,hpOffset:54},
  corpseLaborer:{family:'blighted',atlas:'enemies-blighted-victims',row:0,cellWidth:96,cellHeight:112,pivot:106,scale:.75,shadow:17,hpOffset:63},
  corpseTraveler:{family:'blighted',atlas:'enemies-blighted-victims',row:1,cellWidth:96,cellHeight:112,pivot:106,scale:.75,shadow:17,hpOffset:62},
  blightedWolf:{family:'beast',atlas:'enemies-blighted',row:2,cellWidth:96,cellHeight:112,pivot:106,scale:1,shadow:24,hpOffset:37},
  blightedBrute:{family:'brute',atlas:'enemies-blighted',row:3,cellWidth:96,cellHeight:112,pivot:106,scale:1.2,shadow:27,hpOffset:95},
  skeleton:{family:'skeleton',atlas:'enemies-core',row:0,cellWidth:80,cellHeight:96,pivot:90,scale:1,shadow:17,hpOffset:66},
  skeletonWarrior:{family:'skeleton',atlas:'summons-core',row:0,cellWidth:96,cellHeight:112,pivot:106,scale:.85,shadow:17,hpOffset:66},
  skeletonKnight:{family:'skeleton',atlas:'enemies-core',row:2,cellWidth:80,cellHeight:96,pivot:90,scale:1,shadow:19,hpOffset:69},
  gravePriest:{family:'skeleton',atlas:'enemies-extra',row:2,cellWidth:80,cellHeight:96,pivot:90,scale:1,shadow:17,hpOffset:74},
  wolf:{family:'beast',atlas:'enemies-core',row:1,cellWidth:80,cellHeight:96,pivot:90,scale:1,shadow:22,hpOffset:46},
  wraith:{family:'spectral',atlas:'enemies-extra',row:3,cellWidth:80,cellHeight:96,pivot:90,scale:1,shadow:14,hpOffset:68},
  brute:{family:'brute',atlas:'enemies-remaining',row:0,cellWidth:80,cellHeight:96,pivot:90,scale:1.25,shadow:25,hpOffset:91},
  exploder:{family:'aberration',atlas:'enemies-remaining',row:1,cellWidth:80,cellHeight:96,pivot:90,scale:1,shadow:21,hpOffset:52},
  beast:{family:'beast',atlas:'enemies-remaining',row:2,cellWidth:80,cellHeight:96,pivot:90,scale:1,shadow:23,hpOffset:52},
  human:{family:'human',hpOffset:66,shadow:17}
});
export const ENEMY_MODEL_PROFILES=MODELS;
const visualProfiles=new WeakMap();
// Every field read by classification/faction inference belongs in this list.
// Runtime presentation caches are never serialized or attached to enemies.
const visualIdentityFields=['kind','archetype','name','id','species','isBoss','worldBoss','bossType',
  'bossRenderType','bossId','bossName','visualVictim','humanoid','visualFactionId',
  'enemyVisualFactionInferred','majorPoiId','dungeonThreatProfile','faction','infiniteDungeonRegionId'];
export function getEnemyVisualProfile(enemy={}) {
  if (!enemy || typeof enemy!=='object') return buildEnemyVisualProfile(enemy);
  const cached=visualProfiles.get(enemy),phase=enemy.boss?.phase;
  let unchanged=!!cached&&cached.phase===phase;
  if(unchanged)for(let i=0;i<visualIdentityFields.length;i++){
    if(cached.identity[i]!==enemy[visualIdentityFields[i]]){unchanged=false;break;}
  }
  if(unchanged)return cached.profile;
  const profile=buildEnemyVisualProfile(enemy);
  visualProfiles.set(enemy,{phase,identity:visualIdentityFields.map(k=>enemy[k]),profile});
  return profile;
}
function buildEnemyVisualProfile(enemy={}) {
  const bossType=getEnemyBossVisual(enemy);
  if (bossType) {
    const row={redSealExecutioner:0,graveMawBear:1,briarTitan:2}[bossType];
    if(row!==undefined)return {id:bossType,family:'boss',bossType,atlas:'bosses-frontier',row,cellWidth:160,cellHeight:176,pivot:170,scale:bossType==='briarTitan'?1.1:1,shadow:40,hpOffset:{redSealExecutioner:142,graveMawBear:111,briarTitan:160}[bossType]};
    const phase=Math.max(1,Math.min(3,Number(enemy.boss?.phase||1)));
    const scale=bossType==='demonLord'?(phase>=3?1.15:.85):bossType==='zephyrLight'?(.75+phase*.12):bossType==='seraphel'?.83:.68;
    const atlasTop=bossType==='hollowElk'?33:bossType==='veyrWarden'?23:22;
    return {id:bossType,family:'boss',bossType,hpOffset:Math.ceil((170-atlasTop)*scale-18+12)};
  }
  const kind=enemy.kind||enemy.archetype||'human';
  const text=`${enemy.name||''} ${enemy.id||''} ${enemy.species||''}`.toLowerCase();
  const blighted=/blight|hollow|rot.?blight|infect|diseas|plague|corrupt|root.?hollow/.test(text);
  let model='human';
  // Specialized anatomy wins over bodyModel='human' injected by old saves.
  if (kind==='hollowling') {
    const variant=visualHash(enemy.id||enemy.name||kind)%3;
    model=({villager:'corpse',laborer:'corpseLaborer',traveler:'corpseTraveler',soldier:'infectedSoldier'})[enemy.visualVictim] || (/soldier|guard|militant|legion|fallen.?knight/.test(text)?'infectedSoldier':/mine|labor|worker|cellar|quarry|forager|orchard/.test(text)?'corpseLaborer':/road|wanderer|traveler|caravan|cache|pilgrim/.test(text)?'corpseTraveler':['corpse','corpseLaborer','corpseTraveler'][variant]);
  }
  else if (/skeleton/i.test(kind)||enemy.species==='skeleton') model=/knight|shield|armou?r/.test(text)?'skeletonKnight':'skeleton';
  else if (kind==='gravebound') model=/road.?risen|mound.?risen/.test(text)?'skeletonWarrior':'skeletonKnight';
  else if (kind==='shieldKnight') model=/grave|bone|risen|oathbroken|veyr|nightveil|undead/.test(text)?'skeletonKnight':'human';
  else if (kind==='gravePriest') model='gravePriest';
  else if (kind==='brute') model=blighted?'blightedBrute':'brute';
  else if (['ashWolf','stalkerWolf'].includes(kind)) model=blighted?'blightedWolf':'wolf';
  else if (['wraith','veyrWraith'].includes(kind)) model='wraith';
  else if (kind==='exploder') model='exploder';
  else if (kind==='basicBeast') model='beast';
  else if (!['human','humanoid','bandit','roadlessBandit','archer','cultist','demonCultist'].includes(kind) && !enemy.humanoid && !['human','humanoid'].includes(enemy.species)) return {id:'unsupported',family:'unsupported'};
  const faction=getEnemyFaction(enemy);
  const role=kind==='archer'?'archer':['cultist','demonCultist'].includes(kind)?'caster':kind==='shieldKnight'?'knight':'melee';
  return {...MODELS[model],id:model,faction,role,variant:visualHash(enemy.id||enemy.name||kind)%3,formerFaction:blighted?faction:null};
}
