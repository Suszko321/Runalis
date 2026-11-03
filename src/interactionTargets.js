import {objectInInteractionRange,INTERACTION_RANGE} from './interactionRange.js';
import {isQuestObjectVisible} from './questInteractables.js';
import {hasLineOfSight} from './world.js';

const TRAVEL_KINDS = new Set([
  'dungeonEntrance', 'dungeonExit', 'dungeonStairs',
  'sideZoneEntrance', 'sideZoneExit', 'towerEntrance', 'towerStairs', 'towerExit',
  'capitalGate', 'capitalExit', 'arenaGate',
  'travelRouteGate', 'travelRouteExit', 'travelRouteReturnGate',
  'gothicCastle', 'castle', 'castleVeyr', 'demonCultLair', 'cultLair', 'demonLair'
]);

export function isTravelInteraction(object) {
  if (!object) return false;
  return TRAVEL_KINDS.has(object.kind) || object.campaignAction === 'maraHome' ||
    (object.kind === 'dungeonDoor' && (object.sideRoomTarget ||
      (Number.isFinite(Number(object.targetX)) && Number.isFinite(Number(object.targetY))))) ||
    (!!object.poiId && isCastleVeyrPoi(object));
}

export function selectInteractionTarget(world, actor, range = INTERACTION_RANGE) {
  if (!actor) return null;
  let best = null;
  let bestDistance = Infinity;
  let bestPriority = -Infinity;

  for (const object of world?.objects || []) {
    if (!objectInInteractionRange(actor,object,range) || object.presentationRetired) continue;
    if (!isQuestObjectVisible(object,actor)) continue;

    const d = Math.hypot(object.x - actor.x, object.y - actor.y);
    const priority = getInteractionPriority(object);

    if (
      (!world.orrakaiRevision || hasLineOfSight(world,actor.x,actor.y,object.x,object.y)) &&
      (d < bestDistance - 1 || (Math.abs(d - bestDistance) <= 8 && priority > bestPriority))
    ) {
      best = object;
      bestDistance = d;
      bestPriority = priority;
    }
  }

  return best;
}

function getInteractionPriority(object) {
  if (!object) return 0;
  if (object.townStairs) return 54;
  if (object.kind === 'npc') return 80;
  if (object.kind === 'poiInvestigation') return 62;
  if (object.kind === 'dungeonKey' || object.kind === 'dungeonChest' || object.kind === 'dungeonDoor' || object.kind === 'dungeonPuzzle' || object.kind === 'dungeonEvent') return 60;
  if (object.kind === 'dungeonEntrance') return 55;
  if (object.kind === 'sideZoneEntrance' || object.kind === 'sideZoneExit' || object.kind === 'towerEntrance' || object.kind === 'towerStairs' || object.kind === 'towerExit' || object.kind === 'dungeonStairs') return 54;
  if (object.kind === 'capitalExit') return 52;
  if (object.kind === 'capitalGate' || object.kind === 'travelRouteGate' || object.kind === 'travelRouteExit' || object.kind === 'travelRouteReturnGate') return 50;
  if (['marketStall', 'blacksmithService', 'alchemistService', 'guildClerk', 'bankService', 'classTrainerService', 'arenaGate', 'noticeBoard'].includes(object.kind)) return 44;
  if (object.kind === 'signpost') return 28;
  if (object.poiId || object.decorative) return 25;
  return 35;
}

export function isCastleVeyrPoi(object) {
  const id = String(object?.id || '').toLowerCase();
  const name = String(object?.name || '').toLowerCase();
  const poiId = String(object?.poiId || '').toLowerCase();
  const dungeonId = String(object?.dungeonId || '').toLowerCase();

  return (
    id.includes('castleveyr') ||
    id.includes('castle_veyr') ||
    id.includes('castle-veyr') ||
    name.includes('castle veyr') ||
    poiId.includes('castleveyr') ||
    poiId.includes('castle_veyr') ||
    poiId.includes('castle-veyr') ||
    dungeonId.includes('castleveyr') ||
    dungeonId.includes('castle_veyr') ||
    dungeonId.includes('castle-veyr')
  );
}
