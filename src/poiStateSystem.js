// Persistent investigation and consequence state for authored points of interest.
// The state lives on the player so it naturally travels through the existing save system.

const CLASS_ALIASES = {
  necromancer: 'gravecaller',
  mercenary: 'fellhunter',
  templar: 'oathkeeper',
  hydromancer: 'waverider'
};

export function getPlayerClassId(player) {
  const id = String(player?.classId || '').trim();
  return CLASS_ALIASES[id] || id || 'unbound';
}

export function getPlayerRaceId(player) {
  return String(player?.bloodline?.id || player?.raceId || 'human').trim() || 'human';
}

export function ensurePoiState(player, poiId) {
  if (!player || !poiId) return null;
  player.poiStates = player.poiStates && typeof player.poiStates === 'object' ? player.poiStates : {};
  player.poiStates[poiId] = player.poiStates[poiId] && typeof player.poiStates[poiId] === 'object'
    ? player.poiStates[poiId]
    : {
        poiId,
        clues: {},
        clueOrder: [],
        reactions: {},
        resolution: null,
        revision: 0
      };
  return player.poiStates[poiId];
}

export function getPoiState(player, poiId) {
  return player?.poiStates?.[poiId] || null;
}

export function getPoiClueCount(player, poiId) {
  return Object.keys(getPoiState(player, poiId)?.clues || {}).length;
}

export function hasPoiClue(player, poiId, clueId) {
  return !!getPoiState(player, poiId)?.clues?.[clueId];
}

export function recordPoiClue(player, poiId, clueId, data = {}) {
  const state = ensurePoiState(player, poiId);
  if (!state || !clueId) return { added: false, state };
  if (state.clues?.[clueId]) return { added: false, state };

  state.clues[clueId] = {
    id: clueId,
    discoveredAt: Date.now(),
    ...data
  };
  state.clueOrder = Array.isArray(state.clueOrder) ? state.clueOrder : [];
  state.clueOrder.push(clueId);
  state.revision = Number(state.revision || 0) + 1;
  player.poiStateRevision = Number(player.poiStateRevision || 0) + 1;
  return { added: true, state };
}

export function resolvePoi(player, poiId, resolutionId, data = {}) {
  const state = ensurePoiState(player, poiId);
  if (!state || !resolutionId || state.resolution) return { resolved: false, state };

  state.resolution = {
    id: resolutionId,
    chosenAt: Date.now(),
    classId: getPlayerClassId(player),
    raceId: getPlayerRaceId(player),
    ...data
  };
  state.revision = Number(state.revision || 0) + 1;
  player.poiStateRevision = Number(player.poiStateRevision || 0) + 1;
  return { resolved: true, state };
}

export function poiContentConditionsMatch(content, player) {
  if (!content) return true;

  const classId = getPlayerClassId(player);
  const raceId = getPlayerRaceId(player);
  const classAny = values(content.classAny);
  const classNone = values(content.classNone);
  const raceAny = values(content.raceAny);
  const raceNone = values(content.raceNone);

  if (classAny.length && !classAny.includes(classId)) return false;
  if (classNone.includes(classId)) return false;
  if (raceAny.length && !raceAny.includes(raceId)) return false;
  if (raceNone.includes(raceId)) return false;

  const poiId = content.poiId || content.requiresPoiUnresolved || content.requiresPoiResolved;
  const state = poiId ? getPoiState(player, poiId) : null;

  if (content.requiresPoiUnresolved && state?.resolution) return false;
  if (content.requiresPoiResolved && !state?.resolution) return false;

  const resolutionAny = values(content.resolutionAny || content.requiresPoiResolution);
  if (resolutionAny.length && !resolutionAny.includes(state?.resolution?.id)) return false;

  const clueIds = values(content.requiresPoiClues);
  if (clueIds.some(clueId => !state?.clues?.[clueId])) return false;

  const minClues = Number(content.requiresPoiClueCount || 0);
  if (minClues > 0 && getPoiClueCount(player, poiId) < minClues) return false;

  return true;
}

export function applyPoiWorldState(player, world) {
  if (!player || !world) return false;
  const revision = Number(player.poiStateRevision || 0);
  if (world.poiStateRevisionApplied === revision) return false;

  for (const entry of world.objects || []) {
    if (!entry?.poiStateCondition) continue;
    const visible = poiContentConditionsMatch(entry.poiStateCondition, player);
    entry.hiddenByPoiState = !visible;
    entry.depleted = !visible;
    if (entry.kind === 'npc' || entry.kind === 'poiInvestigation' || entry.kind === 'dungeonEntrance') {
      entry.interactable = visible;
    }
  }

  for (const enemy of world.enemies || []) {
    if (!enemy?.poiStateCondition) continue;
    enemy._poiBaseAlive = enemy._poiBaseAlive ?? enemy.alive !== false;
    const visible = poiContentConditionsMatch(enemy.poiStateCondition, player);
    enemy.hiddenByPoiState = !visible;
    enemy.depleted = !visible;
    enemy.alive = visible ? enemy._poiBaseAlive : false;
  }

  for (const enemy of world.enemies || []) {
    const weakness = enemy?.poiKnowledgeWeakness;
    if (!weakness?.poiId || !weakness?.clueId || enemy.poiKnowledgeApplied) continue;
    if (!hasPoiClue(player, weakness.poiId, weakness.clueId)) continue;

    const hpMultiplier = Math.max(0.5, Math.min(1, Number(weakness.hpMultiplier || 0.85)));
    const damageMultiplier = Math.max(0.5, Math.min(1, Number(weakness.damageMultiplier || 0.9)));
    enemy.maxHp = Math.max(1, Math.round(Number(enemy.maxHp || enemy.hp || 1) * hpMultiplier));
    enemy.hp = Math.min(enemy.maxHp, Math.max(1, Math.round(Number(enemy.hp || enemy.maxHp) * hpMultiplier)));
    if (Number.isFinite(Number(enemy.damage))) enemy.damage = Math.max(1, Number(enemy.damage) * damageMultiplier);
    enemy.poiKnowledgeApplied = true;
    enemy.weaknessRevealed = true;
  }


  for (const enemy of world.enemies || []) {
    for (const rule of enemy?.poiKnowledgeRules || []) {
      if (!rule?.poiId || !rule?.clueId) continue;
      enemy.poiKnowledgeRuleIds = enemy.poiKnowledgeRuleIds || {};
      const ruleId = rule.id || `${rule.poiId}:${rule.clueId}`;
      if (enemy.poiKnowledgeRuleIds[ruleId] || !hasPoiClue(player, rule.poiId, rule.clueId)) continue;

      if (Number.isFinite(Number(enemy.maxHp)) && Number(rule.hpMultiplier)) {
        const multiplier = Math.max(0.55, Math.min(1, Number(rule.hpMultiplier)));
        enemy.maxHp = Math.max(1, Math.round(enemy.maxHp * multiplier));
        enemy.hp = Math.min(enemy.maxHp, Math.max(1, Math.round(Number(enemy.hp || enemy.maxHp) * multiplier)));
      }
      if (Number.isFinite(Number(enemy.damage)) && Number(rule.damageMultiplier)) {
        enemy.damage = Math.max(1, enemy.damage * Math.max(0.55, Math.min(1, Number(rule.damageMultiplier))));
        enemy.dmg = enemy.damage;
      }
      if (rule.disableRegeneration) enemy.regeneration = 0;
      if (rule.status) enemy.knowledgeStatus = rule.status;
      enemy.poiKnowledgeRuleIds[ruleId] = true;
      enemy.weaknessRevealed = true;
    }
  }

  for (const [poiId, state] of Object.entries(player.poiStates || {})) {
    const resolution = state?.resolution;
    if (!resolution) continue;
    const discovery = player.discoveredPois?.[poiId];
    if (discovery && resolution.mapName) discovery.name = resolution.mapName;
    if (discovery && resolution.journalDescription) discovery.description = resolution.journalDescription;
    world.poiSafeZones = world.poiSafeZones && typeof world.poiSafeZones === 'object' ? world.poiSafeZones : {};
    world.poiSafeZones[poiId] = !!resolution.safeZone;
  }

  world.poiStateRevisionApplied = revision;
  return true;
}

function values(value) {
  if (Array.isArray(value)) return value.map(String);
  if (value === undefined || value === null || value === '') return [];
  return [String(value)];
}
