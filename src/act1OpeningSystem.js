// act1OpeningSystem.js
// Canonical Act I prologue: a short, non-interactive caravan sequence followed
// by the player's recovery above the Root & Retort apothecary in Orrakai.

import { TILE } from './data.js';
import { createWorld } from './world.js';
import { createCapitalHubWorld } from './hubSystem.js';
import { openDialogue, startQuest } from './dialogueSystem.js';
import { applyStoryFlags } from './storyProgress.js';
import { ROOT_RETORT } from './orrakaiLayout.js';

const OPENING_W = 58;
const OPENING_H = 30;
const PLAYER_SPAWN = { x: 16, y: 15 };
const ARTIFACT_TILE = { x: 36, y: 14 };
const MARA_HOUSE_SPAWN = { x: 7, y: 8 };

const OPENING_BEATS = [
  [0.5, 'THE ZARYNTH ROAD', 'Although your life has not been easy, fortune has favored you recently. A merchant has hired you to escort his caravan through the Echoryn Forests.'],
  [7.5, 'HIRED STEEL', 'The contract promises generous coin and a place in Zarynth, a city brimming with wealth and opportunity. For now, you are one hired guard among many.'],
  [15.5, 'THE QUIET', 'The old guard notices first: no birds, no insects, no wind in the grass.'],
  [23.5, 'THE AMBUSH', 'Cultists descend in a storm of fire and violence. Your band of hired escorts is caught off guard. The routine journey shatters beneath an overwhelming assault.'],
  [31.5, 'THE RELIQUARY', 'They ignore the coin. They ignore the wounded. They came for what the Covenant sealed.'],
  [39.5, 'HOLD THE ROAD', 'Steel rings through smoke. You buy the survivors seconds, and spend everything you have.'],
  [47.5, 'THE ROAD ENDS', 'An explosion hurls you into the woods. Your body strikes a boulder. Through blurring vision, an imposing cultist strides toward you. Then nothing.']
];

export function createCaravanOpeningWorld() {
  const tiles = [];
  for (let y = 0; y < OPENING_H; y++) {
    const row = [];
    for (let x = 0; x < OPENING_W; x++) {
      const boundary = x < 2 || y < 2 || x >= OPENING_W - 2 || y >= OPENING_H - 2;
      const road = y >= 12 && y <= 17;
      row.push({ biome: boundary ? 'wall' : road ? 'path' : 'grass', passable: !boundary });
    }
    tiles.push(row);
  }

  return {
    mode: 'act1Opening', name: 'The Zarynth Road', regionId: 'echoryn', actId: 'act1',
    safeZone: true, width: OPENING_W, height: OPENING_H, tileSize: TILE, tiles,
    objects: createOpeningObjects(), enemies: [], drops: [], effects: [], combatEffects: [],
    spawn: { x: PLAYER_SPAWN.x * TILE + TILE / 2, y: PLAYER_SPAWN.y * TILE + TILE / 2 },
    opening: { elapsed: 0, nextBeat: 0, finishing: false, fadeElapsed: 0, skipRequested: false }
  };
}

export function createMaraHouseWorld() {
  const width = 15;
  const height = 12;
  const tiles = Array.from({ length: height }, (_, y) =>
    Array.from({ length: width }, (_, x) => {
      const wall = x === 0 || y === 0 || x === width - 1 || y === height - 1;
      return { biome: wall ? 'wall' : 'path', passable: !wall };
    })
  );
  // The stairs descend into the apothecary below; this floor has no street exit.

  return {
    mode: 'maraHouse', name: 'The Root & Retort — Upstairs', regionId: 'orrakai', actId: 'act1', safeZone: true,
    width, height, tileSize: TILE, tiles, enemies: [], drops: [], effects: [], combatEffects: [],
    spawn: { x: MARA_HOUSE_SPAWN.x * TILE + TILE / 2, y: MARA_HOUSE_SPAWN.y * TILE + TILE / 2 },
    objects: [
      prop('maraBed', 'bedroll', 7, 8, { scale: 1.1 }),
      prop('maraTable', 'crateStack', 4, 5, { scale: 0.85 }),
      prop('maraHerbs', 'sacks', 10, 4, { scale: 0.75 }),
      prop('maraLamp', 'lantern', 7, 3, { glow: '#d9ad4f' }),
      {
        kind: 'npc', id: 'maraVellOpening', npcId: 'maraVell', name: 'Mara Vell',
        dialogueId: 'maraMercyOpening', deferTalkObjective: true,
        x: 7 * TILE + TILE / 2, y: 5 * TILE + TILE / 2, r: 14, radius: 14,
        disposition: 'friendly', factionId: 'orrakai', dirX: 0, dirY: 1,
        bodyType:'female',hair:'#684c38',shirt: '#566b45', pants: '#554438', boots: '#251d18', labelPriority: 10
      },
      {
        kind: 'capitalExit', id: 'maraHouseDoor', name: 'Downstairs — Root & Retort',townStairs:true,direction:'down',
        x: 7 * TILE + TILE / 2, y: 10.5 * TILE, r: 20, radius: 20, labelPriority: 9
      }
    ],
    opening: { maraAddressDelay: 0.85 }
  };
}

export function requestAct1OpeningSkip(game) {
  if (game?.world?.mode !== 'act1Opening') return false;
  game.world.opening = game.world.opening || {};
  game.world.opening.skipRequested = true;
  return true;
}

export function updateAct1Opening(game, dt) {
  const world = game?.world;
  if (!game?.player) return false;

  if (world?.mode === 'capital') {
    prepareMercyWarden(game);
    return false;
  }

  if (world?.mode === 'maraHouse') {
    updateMaraHouseArrival(game, dt);
    return true;
  }
  if (world?.mode !== 'act1Opening') return false;
  if (document.getElementById('characterCreatorOverlay')?.classList.contains('active')) return true;

  const state = world.opening || (world.opening = { elapsed: 0, nextBeat: 0, fadeElapsed: 0 });
  state.elapsed = Number(state.elapsed || 0) + dt;
  if(state.elapsed>=23.5&&!state.ambushersShown){
    state.ambushersShown=true;
    for(let i=0;i<5;i++)world.objects.push({...npc(`openingAmbusher${i}`,'Masked Attacker',20+i*5,i%2?19:10,'#702b2c'),factionId:'lastDawn',equipment:{weapon:'blackIronSword',helm:'clothHood',chest:'patchedTunic',legs:null,trinket:null}});
    world.objects.push(prop('openingFireA','campfire',22,14),prop('openingFireB','campfire',29,16));
  }
  if(state.elapsed>=23.5&&state.elapsed<39.5)for(const o of world.objects.filter(o=>o.id.startsWith('openingAmbusher'))){o.y+=(15*TILE-o.y)*Math.min(dt*.3,1);}
  if(state.elapsed>=39.5){const wagon=world.objects.find(o=>o.id==='artifactWagon');if(wagon)wagon.accent='#493e36';}
  if(state.elapsed>=47.5&&!state.wounded){state.wounded=true;game.player.x=12*TILE;game.player.y=20*TILE;game.player.hp=1;}

  while (!state.finishing && state.nextBeat < OPENING_BEATS.length && state.elapsed >= OPENING_BEATS[state.nextBeat][0]) {
    const [, title, line] = OPENING_BEATS[state.nextBeat++];
    showOpeningCard(title, line, state.nextBeat === OPENING_BEATS.length ? 5000 : 5600);
  }

  if (!state.finishing && (state.skipRequested || state.elapsed >= 53.5)) {
    state.finishing = true;
    state.fadeElapsed = 0;
    fadeToBlack();
  }
  if (state.finishing) {
    state.fadeElapsed += dt;
    if (state.fadeElapsed >= (state.skipRequested ? 0.35 : 2.8)) recoverInOrrakai(game);
  }
  return true;
}

export function recoverInOrrakai(game) {
  if (!game?.player) return false;
  const frontier = createWorld();
  const hub = createCapitalHubWorld();
  game.overworldState = {
    tiles: frontier.tiles || [], objects: frontier.objects || [], enemies: frontier.enemies || [], drops: frontier.drops || [],
    mode: 'overworld', name: frontier.name, regionId: frontier.regionId || 'echoryn', actId: 'act1',
    camera: { x: 11 * TILE - game.canvas.width / 2, y: 27 * TILE - game.canvas.height / 2 },
    returnPoint: { x: 11 * TILE, y: 27 * TILE }
  };

  game.world = createMaraHouseWorld();
  game.player.x = game.world.spawn.x;
  game.player.y = game.world.spawn.y;
  game.player.hp = Math.max(1, Math.floor(game.player.maxHp * 0.68));
  game.player.stamina = Math.max(1, Math.floor(game.player.maxStamina * 0.55));
  game.player.dirX = 0; game.player.dirY = -1;
  game.player.currentZone = game.world.name;
  game.player.capitalUnlocked = true;
  game.player.act1OpeningPending = false;
  game.player.story = game.player.story || {};
  game.player.story.flags = game.player.story.flags || {};
  game.player.story.flags.opening = { ...(game.player.story.flags.opening || {}), introPlayed: true, wokeInOrrakai: true };
  game.player.story.flags.story = { ...(game.player.story.flags.story || {}), caravanDestroyed: true, artifactStolen: true, recoveredInOrrakai: true };
  game.player.mercyInOrrakai = { ...(game.player.mercyInOrrakai || {}), introPlayed: true, location: 'maraHouse' };
  game.player.discoveredLocations = game.player.discoveredLocations || {};
  game.player.discoveredLocations.orrakai = { id: 'orrakai', name: hub.name, discoveredAt: Date.now() };
  game.player.tower = game.player.tower || {}; game.player.tower.unlocked = true;
  startQuest(game.player, 'mercy_in_orrakai');
  game.camera.x = game.player.x - game.canvas.width / 2;
  game.camera.y = game.player.y - game.canvas.height / 2;
  game.logLines = ['You wake in Mara’s recovery room above the Root & Retort in Orrakai.', 'Main Quest: Mercy in Orrakai has begun.'];
  hideOpeningOverlay();
  return true;
}

export function enterMaraHouse(game) {
  if(!game?.player||game.world?.mode!=='capital')return false;
  game.world=createMaraHouseWorld();game.world.opening.maraAddressDelay=Infinity;
  Object.assign(game.player,{x:7.5*TILE,y:9.5*TILE,dirX:0,dirY:-1,moveTarget:null,currentZone:game.world.name});
  game.player.mercyInOrrakai={...(game.player.mercyInOrrakai||{}),location:'maraHouse'};
  game.camera.x=game.player.x-game.canvas.width/2;game.camera.y=game.player.y-game.canvas.height/2;
  game.log?.('You climb to Mara’s room above the Root & Retort.');
  return true;
}

export function leaveMaraHouse(game) {
  if (!game?.player || game.world?.mode !== 'maraHouse') return false;
  const hub = createCapitalHubWorld();
  hub.safeZone = true;
  game.world = hub;
  game.player.x = (ROOT_RETORT.arrival.x+.5) * TILE;
  game.player.y = (ROOT_RETORT.arrival.y+.5) * TILE;
  game.player.moveTarget=null;
  game.player.orrakaiLayoutRevision=hub.orrakaiRevision;
  game.player.dirX = 0; game.player.dirY = 1;
  game.player.currentZone = hub.name;
  game.player.mercyInOrrakai = { ...(game.player.mercyInOrrakai || {}), location: 'orrakai' };
  game.rememberSafeLocation?.('rootRetortDownstairs');
  game.camera.x = game.player.x - game.canvas.width / 2;
  game.camera.y = game.player.y - game.canvas.height / 2;
  game.log?.('You descend into the Root & Retort. The shop’s south door leads to Orrakai; the Covenant infirmary is west along the lower ward.');
  return true;
}

function updateMaraHouseArrival(game, dt) {
  const state = game.world.opening || (game.world.opening = { maraAddressDelay: 0.85 });
  const flags = game.player.story?.flags?.opening || {};
  const resident=game.world.objects.find(object=>object.id==='maraVellOpening');
  if(flags.maraConversationComplete&&resident?.dialogueId==='maraMercyOpening')resident.dialogueId='maraTrainerDialogue';
  if (flags.maraConversationComplete || game.dialogue?.active) return;
  state.maraAddressDelay = Number(state.maraAddressDelay ?? 0.85) - dt;
  if (state.maraAddressDelay > 0) return;
  const mara = game.world.objects.find(object => object.id === 'maraVellOpening');
  if (mara && openDialogue(game.dialogue, mara, game.player, game.world)) {
    state.maraAddressDelay = Number.POSITIVE_INFINITY;
  }
}

function prepareMercyWarden(game) {
  for (const object of game.world.objects || []) {
    if (object.kind !== 'npc') continue;
    object.suppressQuestMarker = !!(
      game.dialogue?.active &&
      (game.dialogue.npcObjectId === object.id || game.dialogue.npcId === object.npcId)
    );
  }
  const quest = game.player.quests?.active?.mercy_in_orrakai;
  const warden = game.world.objects?.find(object => object.npcId === 'wardenMael');
  if (!warden || !quest) return;
  const flags = game.player.story?.flags || {};
  const mercyFlags = flags.mercy || {};
  if (quest.currentStageId === 'returnOldWellEvidence' && !mercyFlags.brokenLanternHeld && !mercyFlags.evidenceReported) {
    applyStoryFlags(game.player, ['mercy.brokenLanternAcquired', 'mercy.brokenLanternHeld']);
  }
  const dialogueId = quest.currentStageId === 'findWardenMael'
    ? 'wardenMercyIntroduction'
    : quest.currentStageId === 'aidPlagueTents'
      ? 'wardenMercyAidIncomplete'
      : quest.currentStageId === 'reportToWardenMael'
        ? 'wardenMercyAidReport'
        : quest.currentStageId === 'investigateOldWell'
          ? (mercyFlags.maelOldWellCheckInComplete ? 'wardenOldWellIncomplete' : 'wardenOldWellCheckIn')
          : quest.currentStageId === 'returnOldWellEvidence'
            ? 'wardenOldWellReturn'
        : 'wardenMaelIntro';
  warden.dialogueId = dialogueId;
  warden.deferTalkObjective = ['wardenMercyIntroduction', 'wardenMercyAidReport', 'wardenOldWellReturn'].includes(dialogueId);
  warden.talk = quest.currentStageId === 'aidPlagueTents'
    ? 'Warden Mael is waiting for you to finish the work at the plague tents.'
    : 'Warden Mael studies crossed-out caravan routes and witness statements.';

  const caelen = game.world.objects?.find(object => object.npcId === 'lightwardenCaelen');
  if (caelen) {
    caelen.dialogueId = quest.currentStageId === 'speakWithCaelen'
      ? 'lightwardenCaelenIntroduction'
      : quest.currentStageId === 'investigateOldWell'
        ? 'lightwardenCaelenOldWellReminder'
        : quest.currentStageId === 'returnOldWellEvidence'
          ? 'lightwardenCaelenReturnReminder'
          : 'lightwardenCaelenMilestone';
    caelen.deferTalkObjective = true;
  }

  const tentSupplies = game.world.objects?.find(object => object.id === 'plagueTentSupplies');
  const refugeeSupplies = game.world.objects?.find(object => object.id === 'refugeeBedrolls');
  if (tentSupplies && flags.orrakai_extra_supply_sick) {
    tentSupplies.scale = 1.2;
    tentSupplies.accent = '#d9ad4f';
  }
  if (refugeeSupplies && flags.orrakai_extra_supply_refugees) {
    refugeeSupplies.scale = 1.2;
    refugeeSupplies.accent = '#73d18a';
  }
}

function createOpeningObjects() {
  return [
    prop('merchantWagon', 'supplyWagon', 22, 14), prop('pilgrimWagon', 'supplyWagon', 29, 16),
    prop('artifactWagon', 'supplyWagon', ARTIFACT_TILE.x, ARTIFACT_TILE.y, { scale: 1.15, accent: '#d9ad4f' }),
    prop('roadCampfire', 'lantern', 18, 13, { glow: '#ef6f2f' }),
    npc('caravanMaster', 'Caravan Master Hedd', 18, 16, '#7c6548'),
    npc('pilgrimMother', 'Pilgrim Sava', 30, 13, '#9b8b72'),
    npc('oldVeteran', 'Old Guard Verran', 25, 16, '#6f7680'),
    npc('artifactCustodian', 'Covenant Custodian Ilye', 35, 12, '#eee6cf')
  ];
}

function showOpeningCard(title, subtitle, duration = 5000) {
  const overlay = ensureOpeningOverlay();
  overlay.innerHTML = `<strong>${title}</strong><span>${subtitle}</span><small>Confirm or Cancel to skip</small>`;
  overlay.classList.remove('blackout'); overlay.classList.add('visible');
  clearTimeout(overlay.hideTimer);
  overlay.hideTimer = window.setTimeout(() => overlay.classList.remove('visible'), duration);
}
function fadeToBlack() {
  const overlay = ensureOpeningOverlay();
  overlay.innerHTML = '<strong>THE ROAD ENDS</strong><span>Smoke. Bells. Nothing.</span>';
  overlay.classList.add('visible', 'blackout');
}
function hideOpeningOverlay() {
  const overlay = document.getElementById('act1NarrativeOverlay');
  if (overlay) { clearTimeout(overlay.hideTimer); overlay.classList.remove('visible', 'blackout'); }
}
function ensureOpeningOverlay() {
  let overlay = document.getElementById('act1NarrativeOverlay');
  if (overlay) return overlay;
  const style = document.createElement('style'); style.id = 'act1NarrativeOverlayStyles';
  style.textContent = `#act1NarrativeOverlay{position:fixed;inset:0;z-index:1800;display:flex;flex-direction:column;align-items:center;justify-content:center;pointer-events:none;opacity:0;color:#eee6cf;background:rgba(3,5,7,.18);transition:opacity .65s ease,background 1.2s ease;text-align:center;padding:12vw;box-sizing:border-box}#act1NarrativeOverlay.visible{opacity:1}#act1NarrativeOverlay.blackout{background:#030405}#act1NarrativeOverlay strong{font:700 26px/1.2 Georgia,serif;letter-spacing:.25em;text-shadow:0 3px 12px #000}#act1NarrativeOverlay span{margin-top:12px;color:#d9ad4f;font:16px/1.55 Georgia,serif;letter-spacing:.04em;max-width:760px}#act1NarrativeOverlay small{position:absolute;bottom:28px;color:#9ca3ad;font:12px sans-serif;letter-spacing:.08em}`;
  document.head.appendChild(style); overlay = document.createElement('div'); overlay.id = 'act1NarrativeOverlay'; document.body.appendChild(overlay); return overlay;
}
function prop(id, propType, tileX, tileY, extra = {}) { return { kind:propType==='campfire'?'campfire':'townProp', id, name:propType, x:tileX*TILE+TILE/2, y:tileY*TILE+TILE/2, r:0, propType, decorative:true, interactable:false, hideLabel:true, drawRadius:180, ...extra }; }
function npc(id, name, tileX, tileY, shirt) { return { kind:'npc', id, npcId:id, name, x:tileX*TILE+TILE/2, y:tileY*TILE+TILE/2, r:14, radius:14, disposition:'friendly', factionId:'caravan', dirX:0, dirY:1, shirt, pants:'#3b352f', boots:'#251d18', interactable:false, hideLabel:true }; }
