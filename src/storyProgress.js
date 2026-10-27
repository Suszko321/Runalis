// storyProgress.js
// Runtime state helpers for the Runalis three-act story foundation.

export function ensureStoryProgress(player) {
  if (!player) return null;

  player.story = player.story && typeof player.story === 'object'
    ? player.story
    : {};

  player.story.act = player.story.act || 'act1';
  player.story.mainQuestline = player.story.mainQuestline || 'act1HearthmereAshes';
  player.story.flags = player.story.flags && typeof player.story.flags === 'object'
    ? player.story.flags
    : {};

  player.regions = player.regions && typeof player.regions === 'object'
    ? player.regions
    : {};

  player.regions.currentRegionId = player.regions.currentRegionId || 'hearthmereFrontier';
  player.regions.hearthmereFrontier = player.regions.hearthmereFrontier || { unlocked: true };
  player.regions.aureateMarches = player.regions.aureateMarches || { unlocked: false };
  player.regions.ascensionWastes = player.regions.ascensionWastes || { unlocked: false };

  player.travel = player.travel && typeof player.travel === 'object'
    ? player.travel
    : {};

  player.travel.routes = player.travel.routes && typeof player.travel.routes === 'object'
    ? player.travel.routes
    : {};

  player.travel.activeRoute = player.travel.activeRoute || null;

  player.companions = player.companions && typeof player.companions === 'object'
    ? player.companions
    : {};

  for (const id of ['mara', 'bram', 'dusk', 'elian']) {
    player.companions[id] = player.companions[id] || {
      relationship: 0,
      introduced: false,
      personalQuestStage: 0,
      campDialogueSeen: {}
    };
  }

  return player.story;
}

export function setStoryFlag(player, path, value = true) {
  ensureStoryProgress(player);
  setNested(player.story.flags, normalizeStoryFlagPath(path), value);
  return value;
}

export function getStoryFlag(player, path) {
  ensureStoryProgress(player);
  return readNested(player.story.flags, normalizeStoryFlagPath(path));
}

export function applyStoryFlags(player, flags = []) {
  ensureStoryProgress(player);

  for (const flag of flags || []) {
    setStoryFlag(player, flag, true);
    applyFlagSideEffects(player, normalizeStoryFlagPath(flag));
  }

  return player.story.flags;
}

export function setRegionUnlocked(player, regionId, unlocked = true) {
  ensureStoryProgress(player);
  player.regions[regionId] = player.regions[regionId] || {};
  player.regions[regionId].unlocked = !!unlocked;
}

export function setCurrentRegion(player, regionId) {
  ensureStoryProgress(player);
  player.regions.currentRegionId = regionId;
  setRegionUnlocked(player, regionId, true);
}

export function setRouteState(player, routeId, patch = {}) {
  ensureStoryProgress(player);
  player.travel.routes[routeId] = {
    ...(player.travel.routes[routeId] || {}),
    ...patch
  };
}

export function getRouteState(player, routeId) {
  ensureStoryProgress(player);
  return player.travel.routes[routeId] || {};
}

function setNested(root, path, value) {
  if (!root || !path) return;

  const keys = String(path).split('.');
  let current = root;

  while (keys.length > 1) {
    const key = keys.shift();
    current[key] = current[key] && typeof current[key] === 'object' ? current[key] : {};
    current = current[key];
  }

  current[keys[0]] = value;
}

function readNested(root, path) {
  if (!root || !path) return false;

  return String(path)
    .split('.')
    .reduce((current, key) => current && current[key], root);
}

function normalizeStoryFlagPath(path) {
  let normalized = String(path || '');

  if (normalized.startsWith('story.')) normalized = normalized.slice('story.'.length);
  if (normalized.startsWith('flags.')) normalized = normalized.slice('flags.'.length);

  return normalized;
}

function applyFlagSideEffects(player, flag) {
  const introducedMatch = flag.match(/^trainer\.(mara|bram|dusk|elian)\.introduced$/);
  if (introducedMatch) {
    const companionId = introducedMatch[1];
    player.companions[companionId] = player.companions[companionId] || {};
    player.companions[companionId].introduced = true;
  }

  const companionMatch = flag.match(/^companion\.(mara|bram|dusk|elian)\./);
  if (companionMatch) {
    const companionId = companionMatch[1];
    player.companions[companionId] = player.companions[companionId] || {};
    player.companions[companionId].introduced = true;
  }

  if (flag === 'act1Complete') player.story.act = player.story.act || 'act1';
  if (flag === 'act2Started') player.story.act = 'act2';
  if (flag === 'act3Started') player.story.act = 'act3';

  const routeUnlockMatch = flag.match(/^travel\.([^.]+)\.unlocked$/);
  if (routeUnlockMatch) {
    const routeId = routeUnlockMatch[1];
    player.travel.routes[routeId] = {
      ...(player.travel.routes[routeId] || {}),
      unlocked: true,
      storyUnlocked: true
    };
  }
}
