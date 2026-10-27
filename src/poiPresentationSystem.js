// Brief, non-modal presentation and threshold effects for important POIs.

const ARRIVAL_PROFILES = Object.freeze({
  gothicCastle: ['Cursed Noble Fortress', 'Danger: High', 'The dead still keep their oaths.'],
  demonCultLair: ['Fortified Seal Bastion', 'Danger: High', 'Order survives behind iron.'],
  brokenChapel: ['Ruined Covenant Site', 'Danger: Moderate', 'Mercy failed here.'],
  pilgrimRoadGate: ['Act II Expedition Route', 'Travel Preparation', 'Beyond this road, Orrakai ends.'],
  thornrootHollow: ['Root-Choked Descent', 'Danger: Moderate', 'The forest remembers every wound.'],
  oldHollowDungeon: ['Ancient Grave Descent', 'Danger: High', 'The oldest dead wait below.'],
  infiniteTower: ['Endless Trial', 'Danger: Rising', 'Every floor remembers who fled.']
});

export function showPoiArrival(player, poi) {
  if (!player || !poi) return;

  const profile = ARRIVAL_PROFILES[poi.id] || [
    formatKind(poi.kind),
    poi.recommendedLevel ? `Recommended Level ${poi.recommendedLevel}` : 'Uncharted Location',
    poi.description || ''
  ];

  player.poiArrival = {
    name: poi.name || 'Unknown Location',
    type: poi.arrivalType || profile[0],
    danger: poi.arrivalDanger || profile[1],
    subtitle: poi.arrivalSubtitle || profile[2],
    shownAt: globalThis.performance?.now?.() || Date.now(),
    duration: 4200
  };
}

export function playPoiThresholdEffect(game, entrance, kind = 'dungeon') {
  const hostGame = game?.hostGame || game;
  const actor = game?.player || hostGame?.player;
  if (!hostGame?.world || !entrance) return;

  const color = entrance.majorPoiId === 'castleVeyr'
    ? '#b68cff'
    : entrance.majorPoiId === 'redSealKeep'
      ? '#ef6f5e'
      : entrance.majorPoiId === 'brokenChapel'
        ? '#d9ad4f'
        : '#9facbf';

  hostGame.world.effects = Array.isArray(hostGame.world.effects) ? hostGame.world.effects : [];
  hostGame.world.effects.push({
    kind: 'enemyPulse',
    layer: 'front',
    x: entrance.x,
    y: entrance.y,
    color,
    radius: kind === 'travel' ? 68 : 54,
    ttl: 0.58,
    age: 0
  });

  if (actor) {
    actor.poiTransitionText = {
      text: kind === 'travel' ? `Prepare for ${entrance.name}` : `Enter ${entrance.name}`,
      color,
      shownAt: globalThis.performance?.now?.() || Date.now(),
      duration: 1200
    };
  }
}

function formatKind(kind) {
  return String(kind || 'Location')
    .replace(/([a-z])([A-Z])/g, '$1 $2')
    .replace(/^./, letter => letter.toUpperCase());
}
