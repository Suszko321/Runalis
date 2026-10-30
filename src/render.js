import {drawEnemyNameplate,enemyPlateLayout} from './enemyNameplateArt.js';
import {drawVeyreignGround,drawVeyreignEffects,drawVeyreignBat} from './veyreignArt.js';
import {drawGroveGround,drawGroveMother,drawGroveTells} from './blightedGroveArt.js';
import {drawOrchardGround,drawOrchardBoss,drawOrchardTells} from './ashenOrchardArt.js';
import {drawMalakarGround,drawMalakarTelegraphs,drawMalakarActor} from './malakarRenderer.js';
import {drawLivingWorld} from './worldAtmosphereRenderer.js';
import {sampleEnemyAttackPresentation} from './enemyAttackPresentation.js';
import {ELITE_CUE_PROFILES} from './eliteHazardPresentation.js';
import {drawEchorynForest,drawEchorynDebug} from './echorynRenderer.js';
import {drawOrrakaiWalls,drawOrrakaiOverhead} from './orrakaiRenderer.js';
import {drawAuthoredGround} from './authoredLandscapes.js';
// render.js
// Runalis main renderer orchestration.
//
// This file should stay small compared to the old render.js.
//
// Split modules:
// - terrainRenderer.js handles terrain/tile rendering.
// - objectRenderer.js handles world objects, NPCs, resources, dungeon entrances, drops.
// - combatVisualsRenderer.js handles projectiles, attacks, action-state visuals, effects.
//
// This file still handles:
// - Render order.
// - Player body.
// - Enemy body.
// - Summon body.
// - Circular local minimap.
// - Floating text.

import { drawEnemySprite, drawBossSprite } from './spriteArt.js';
import {WORLD_ART_STANDARD} from './worldArtDirection.js';
import { drawSceneArtBack, drawSceneArtFront } from './sceneArt.js';
import { TILE } from './data.js';
import { drawHumanActor } from './humanRenderer.js?v=20260924b';
import { isHumanoidEnemy, getHumanoidEnemyActor, getEnemyNameplate } from './humanoidEnemies.js';
import {getEnemyVisualProfile,getEnemyBossVisual} from './enemyVisualProfiles.js';
import { drawSummonAsset } from './codeAssets.js';
import { drawFloatingTexts } from './floatingText.js';
import { getVisualStatus, isDeveloperArtMode, shouldRenderVisual } from './modelRegistry.js';

import {
  getWorldWidth,
  getWorldHeight,
  getVisibleTileBounds,
  drawTiles,
  drawEnvironmentAtmosphere
} from './terrainRenderer.js';

import {
  drawObjects,
  drawObjectDepthOverlays,
  drawWorldDrops
} from './objectRenderer.js';

import {
  drawCombatProjectiles,
  drawAttackVisual,
  drawActionStateVisuals,
  drawWorldEffects
} from './combatVisualsRenderer.js';

import {
  getActiveCoopPlayers
} from './couchCoop.js';
import {
  COOP_DOWNED_DURATION,
  getDownedRemaining,
  isActorBeingRevived,
  isActorDowned
} from './coopReviveSystem.js';
import {
  applyPixelArtContext,
  drawPixelGroundShadow,
  getClassAccentColor
} from './visualStyle.js';
import {
  drawPresentationBack,
  drawPresentationFront
} from './presentationRenderer.js';
import { sampleEnemyVisualState } from './combatFeedbackProfiles.js';
import {sampleWeaponStance} from './weaponStance.js';

// -----------------------------------------------------------------------------
// MAIN DRAW
// -----------------------------------------------------------------------------

export function draw(ctx, world, player, camera, options = {}) {
  if (!ctx || !world || !player || !camera) return;

  const viewport = options.viewport || null;

  ctx.save();

  if (viewport) {
    ctx.beginPath();
    ctx.rect(viewport.x, viewport.y, viewport.width, viewport.height);
    ctx.clip();
    ctx.clearRect(viewport.x, viewport.y, viewport.width, viewport.height);
    ctx.translate(viewport.x, viewport.y);
  } else {
    ctx.clearRect(0, 0, ctx.canvas.width, ctx.canvas.height);
  }

  applyPixelArtContext(ctx);

  const bounds = getVisibleTileBounds(ctx, world, camera);

  drawTiles(ctx, world, camera, bounds);
  drawAuthoredGround(ctx, world, camera);
  drawMalakarGround(ctx,world,camera);
  drawGroveGround(ctx,world,camera);
  drawOrchardGround(ctx,world,camera);
  drawVeyreignGround(ctx,world,camera);
  drawSceneArtBack(ctx, world, camera);
  drawEnvironmentAtmosphere(ctx, world, camera, 'back');
  drawPresentationBack(ctx, world, player, camera, options);

  drawOrrakaiWalls(ctx, world, camera, player);
  const depthActors = getDepthActors(world, player);
  const actorLayers = [];
  drawEchorynForest(ctx, world, camera, player, actorLayers, depthActors);

  // Ground dressing precedes ground effects and loot. Otherwise a courtyard
  // drawn in the depth queue could hide a danger zone or a dropped item.
  actorLayers.push({sortY:-Number.MAX_SAFE_INTEGER,
    drawActor:()=>drawWorldEffects(ctx, world, camera, 'behind')});
  actorLayers.push({sortY:-Number.MAX_SAFE_INTEGER+1,
    drawActor:()=>drawWorldDrops(ctx, world, camera)});
  const nameplates = selectEnemyNameplates(ctx, world.enemies || [], camera);
  actorLayers.push({y: player.y+WORLD_ART_STANDARD.actorFootOffset, drawActor: () => drawPlayer(ctx, player, camera, world)});
  for (const enemy of world.enemies || []) if (enemy && enemy.alive !== false && !enemy.remove) {
    const p = screen(enemy, camera);
    if (isOnScreen(ctx, p.x, p.y, 260)) actorLayers.push({y: enemy.y+WORLD_ART_STANDARD.actorFootOffset,
      drawActor: () => drawOrchardBoss(ctx,enemy,world,camera,()=>drawGroveMother(ctx,enemy,world,camera,()=>drawMalakarActor(ctx,enemy,world,()=>drawEnemy(ctx, enemy, camera, {hideNameplate: !nameplates.has(enemy)}))))});
  }
  for (const summon of player.summons || []) if (summon && summon.alive !== false) {
    const p = screen(summon, camera);
    if (isOnScreen(ctx, p.x, p.y, 260)) actorLayers.push({y: summon.y+16,
      drawActor: () => drawSummons(ctx, player, camera, [summon])});
  }
  for (const ally of getActiveCoopPlayers(player)) if (ally && ally.active !== false) {
    actorLayers.push({y: ally.y+WORLD_ART_STANDARD.actorFootOffset, drawActor: () => drawCoopPlayers(ctx, player, camera, world, [ally])});
  }
  drawObjects(ctx, world, camera, player, actorLayers);
  drawCombatProjectiles(ctx, player, camera);
  drawAttackVisual(ctx, player, camera);
  drawActionStateVisuals(ctx, player, camera);

  drawObjectDepthOverlays(ctx, world, camera, depthActors);
  drawOrrakaiOverhead(ctx, world, player, camera, depthActors);

  drawWorldEffects(ctx, world, camera, 'front');
  drawMalakarTelegraphs(ctx,world,camera);
  drawGroveTells(ctx,world,camera);
  drawOrchardTells(ctx,world,camera);
  drawVeyreignEffects(ctx,world,camera);
  drawEnvironmentAtmosphere(ctx, world, camera, 'front');
  drawPresentationFront(ctx, world, player, camera, options);
  drawSceneArtFront(ctx, world, player, camera);

  drawLivingWorld(ctx, world, player, camera);
  drawEchorynDebug(ctx,world,camera);
  drawFloatingTexts(ctx, player, camera);

  ctx.restore();
}

function getDepthActors(world, player) {
  const party = [player, ...getActiveCoopPlayers(player)];
  return [
    ...party,
    ...(world.objects || []).filter(o=>o.kind==='npc'&&!o.depleted),
    ...(world.enemies || []),
    ...party.flatMap(member => member?.summons || [])
  ].filter(Boolean);
}

// -----------------------------------------------------------------------------
// PLAYER / SUMMONS
// -----------------------------------------------------------------------------

function drawPlayer(ctx, player, camera, world) {
  drawHumanActor(ctx, player, camera, {
    weaponSheathed: sampleWeaponStance(player,world).sheathed,
    isPlayer: true,
    scale: 1.0,
    skin: player.skin || '#ffd1bd',
    hair: player.hair || '#0b0d12',
    shirt: player.shirt || '#f2a51f',
    pants: player.pants || '#293fba',
    boots: player.boots || '#3a2a22',
    classId: player.classId || null
  });

  const p = screen(player, camera);
  hp(ctx, p.x, p.y - 54, player.hp, player.maxHp);
  drawPvpEliminatedIndicator(ctx, player, camera);
  drawDownedIndicator(ctx, player, camera);
}

function drawCoopPlayers(ctx, player, camera, world, allies = getActiveCoopPlayers(player)) {
  for (const ally of allies) {
    if (!ally || ally.active === false) continue;

    const p = screen(ally, camera);
    if (!isOnScreen(ctx, p.x, p.y, 130)) continue;

    drawSummons(ctx, ally, camera);

    drawHumanActor(ctx, ally, camera, {
      weaponSheathed: sampleWeaponStance(ally,world).sheathed,
      isPlayer: true,
      name: ally.name || 'Player 2',
      scale: ally.scale || 0.96,
      skin: ally.skin || '#d79b73',
      hair: ally.hair || '#7c3723',
      shirt: ally.shirt || '#446b42',
      pants: ally.pants || '#37402d',
      boots: ally.boots || '#111111',
      classId: ally.classId || null
    });

    drawCombatProjectiles(ctx, ally, camera);
    drawAttackVisual(ctx, ally, camera);
    drawActionStateVisuals(ctx, ally, camera);
    hp(ctx, p.x, p.y - 54, ally.hp, ally.maxHp);
    drawPvpEliminatedIndicator(ctx, ally, camera);
    drawDownedIndicator(ctx, ally, camera);
    drawFloatingTexts(ctx, ally, camera);
  }
}

function drawPvpEliminatedIndicator(ctx, actor, camera) {
  if (!actor?.pvpArena?.eliminated) return;

  const p = screen(actor, camera);
  ctx.save();
  ctx.font = 'bold 10px sans-serif';
  ctx.textAlign = 'center';
  ctx.fillStyle = 'rgba(0,0,0,.78)';
  ctx.fillText('ELIMINATED', p.x + 1, p.y - 63);
  ctx.fillStyle = '#ef6f6c';
  ctx.fillText('ELIMINATED', p.x, p.y - 64);
  ctx.restore();
}

function drawDownedIndicator(ctx, actor, camera) {
  if (!isActorDowned(actor)) return;

  const p = screen(actor, camera);
  const now = performance.now() / 1000;
  const remaining = getDownedRemaining(actor, now);
  const label = isActorBeingRevived(actor) ? 'REVIVING' : 'DOWNED';
  const seconds = Math.ceil(remaining);
  const width = 78;
  const height = 25;
  const x = Math.round(p.x - width / 2);
  const y = Math.round(p.y - 86);
  const fillPercent = Math.max(0, Math.min(1, remaining / COOP_DOWNED_DURATION));

  ctx.save();
  ctx.fillStyle = 'rgba(5, 4, 9, 0.84)';
  ctx.fillRect(x, y, width, height);
  ctx.strokeStyle = isActorBeingRevived(actor) ? '#fff1b8' : '#ff8c8c';
  ctx.lineWidth = 2;
  ctx.strokeRect(x + 1, y + 1, width - 2, height - 2);

  ctx.fillStyle = 'rgba(255, 140, 140, 0.2)';
  ctx.fillRect(x + 5, y + height - 7, width - 10, 3);
  ctx.fillStyle = isActorBeingRevived(actor) ? '#fff1b8' : '#ff8c8c';
  ctx.fillRect(x + 5, y + height - 7, Math.round((width - 10) * fillPercent), 3);

  ctx.font = 'bold 8px sans-serif';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'top';
  ctx.fillStyle = '#f5edf8';
  ctx.fillText(`${label} ${seconds}s`, x + width / 2, y + 5);
  ctx.restore();
}

function drawSummons(ctx, player, camera, summons = player.summons || []) {
  for (const summon of summons) {
    if (!summon || summon.alive === false) continue;

    const p = screen(summon, camera);
    if (!isOnScreen(ctx, p.x, p.y, 130)) continue;

    drawSummonAsset(ctx, summon, player, p.x, p.y);

    // Intentionally no summon HP bar.
  }
}

// -----------------------------------------------------------------------------
// ENEMIES
// -----------------------------------------------------------------------------

function drawEnemies(ctx, world, camera) {
  const nameplates = selectEnemyNameplates(ctx, world.enemies || [], camera);
  for (const enemy of world.enemies || []) {
    if (enemy && enemy.alive !== false && !enemy.remove) {
      drawEnemy(ctx, enemy, camera, {hideNameplate: !nameplates.has(enemy)});
    }
  }
}

// Labels share screen space, not combat state. Keep every health bar and give
// boss/elite identities first choice when ordinary names would overlap them.
export function selectEnemyNameplates(ctx, enemies, camera) {
  const candidates = [];
  ctx.save();
  ctx.font = 'bold 10px sans-serif';
  for (const enemy of enemies) {
    if (!enemy || enemy.alive === false || enemy.remove || enemy.dead || !(enemy.hp > 0) || enemy.hideEnemyNameplate) continue;
    const p = screen(enemy, camera);
    if (!isOnScreen(ctx, p.x, p.y, 130)) continue;
    if (!isHumanoidEnemy(enemy) && !shouldRenderVisual(enemy, 'enemies', isDeveloperArtMode())) continue;
    const layout=enemyPlateLayout(ctx,enemy,p.x,p.y-getEnemyHpOffset(enemy));
    candidates.push({enemy,priority:layout.rank==='boss'?3:layout.rank==='elite'?2:1,
      left:layout.left,right:layout.right,top:layout.top,bottom:layout.bottom});
  }
  ctx.restore();
  candidates.sort((a, b) => b.priority - a.priority);
  const accepted = [], visible = new Set();
  for (const candidate of candidates) {
    if (accepted.some(other => candidate.left < other.right && candidate.right > other.left && candidate.top < other.bottom && candidate.bottom > other.top)) continue;
    accepted.push(candidate);
    visible.add(candidate.enemy);
  }
  return visible;
}

export function drawEnemy(ctx, enemy, camera, options = {}) {
  if (enemy.remove) return;

  const p = screen(enemy, camera);
  // Tall native boss cells remain visible while their feet are below the view.
  if (!isOnScreen(ctx, p.x, p.y, Math.max(130, getEnemyHpOffset(enemy) + 24))) return;

  const visualStatus = getVisualStatus(enemy, 'enemies');
  const developerArtMode = isDeveloperArtMode();
  const humanoid = isHumanoidEnemy(enemy);
  if (!humanoid && !shouldRenderVisual(enemy, 'enemies', developerArtMode)) return;

  const bossType = getBossRenderType(enemy);
  const reaction = sampleEnemyVisualState(enemy);
  const attackPose=sampleEnemyAttackPresentation(enemy);

  ctx.save();
  if(attackPose&&!humanoid){
    // Pixel-stepped anticipation/release using the creature's own atlas. Never
    // stretch human legs or substitute humanoid limbs for monster anatomy.
    const p=attackPose.progress,release=attackPose.phase==='execution';
    const weight=attackPose.technique==='slam'?1.6:attackPose.technique==='bite'?1.2:.8;
    const offset=release?5*weight:attackPose.phase==='anticipation'?-3*p*weight:0;
    ctx.translate(Math.round(attackPose.dirX*offset),Math.round(attackPose.dirY*offset*.45-(attackPose.technique==='phase'&&!release?p*5:0)));
  }
  if (reaction) {
    ctx.translate(p.x + reaction.x, p.y + reaction.y);
    if (reaction.rotation) ctx.rotate(reaction.rotation);
    ctx.scale(reaction.scaleX || 1, reaction.scaleY || 1);
    ctx.translate(-p.x, -p.y);
    ctx.globalAlpha = reaction.alpha ?? 1;
  }

  const rasterEnemy = !enemy.batBeast && !humanoid && (bossType ? drawBossSprite(ctx, enemy, p.x, p.y, bossType) : drawEnemySprite(ctx, enemy, p.x, p.y));
  if (drawVeyreignBat(ctx,enemy,p.x,p.y)) {
    // Native 60x80 Bat Beast atlas shares normal health/status layers below.
  } else if (humanoid) {
    drawHumanActor(ctx, getHumanoidEnemyActor(enemy), camera, {scale:1});
  } else if (rasterEnemy) {
    // Preserve the authoritative reaction transform and status/tell layers.
  } else if (bossType === 'veyrWarden') {
    drawVeyrWardenBoss(ctx, enemy, p.x, p.y);
  } else if (bossType === 'hollowElk') {
    drawHollowElkBoss(ctx, enemy, p.x, p.y);
  } else if (bossType === 'demonLord') {
    drawDemonLordBoss(ctx, enemy, p.x, p.y);
  } else if (bossType === 'seraphel') {
    drawSeraphelBoss(ctx, enemy, p.x, p.y);
  } else if (bossType === 'zephyrLight') {
    drawZephyrBoss(ctx, enemy, p.x, p.y);
  } else if (enemy.kind === 'exploder') {
    drawExploderEnemy(ctx, enemy, p.x, p.y);
  } else if (enemy.kind === 'basicBeast') {
    drawHollowBeast(ctx, enemy, p.x, p.y);
  } else if (enemy.kind === 'stalkerWolf' || enemy.kind === 'ashWolf') {
    drawAshWolf(ctx, enemy, p.x, p.y);
  } else if (enemy.kind === 'brute') {
    drawGraveBrute(ctx, enemy, p.x, p.y);
  } else if (enemy.kind === 'shieldKnight' || enemy.kind === 'gravebound') {
    drawGraveboundKnight(ctx, enemy, p.x, p.y);
  } else if (enemy.kind === 'archer') {
    drawArcherEnemy(ctx, enemy, p.x, p.y);
  } else if (enemy.kind === 'roadlessBandit') {
    drawBanditEnemy(ctx, enemy, p.x, p.y);
  } else if (enemy.kind === 'gravePriest') {
    drawGravePriestEnemy(ctx, enemy, p.x, p.y);
  } else if (enemy.kind === 'cultist' || enemy.kind === 'demonCultist') {
    drawCultistEnemy(ctx, enemy, p.x, p.y);
  } else if (enemy.kind === 'wraith' || enemy.kind === 'veyrWraith') {
    drawWraithEnemy(ctx, enemy, p.x, p.y);
  } else if (enemy.kind === 'hollowling') {
    drawHollowling(ctx, enemy, p.x, p.y);
  } else {
    drawMissingEnemyModel(ctx, enemy, p.x, p.y, visualStatus);
  }

  drawEnemyAttackTellPose(ctx, enemy, p.x, p.y);
  if (!rasterEnemy && !humanoid) drawEnemyModelPolish(ctx, enemy, p.x, p.y);
  ctx.restore();

  drawEnemyReactionOverlay(ctx, enemy, p.x, p.y, reaction);
  drawEnemyStatus(ctx, enemy, p.x, p.y);
  drawFloatingTexts(ctx,enemy,camera);

  if (!enemy.dead && enemy.hp > 0) {
    const hpOffset = getEnemyHpOffset(enemy);
    drawEnemyNameplate(ctx,enemy,p.x,p.y-hpOffset,{hideLabel:!!enemy.hideEnemyNameplate||!!options.hideNameplate});
  }
}

function drawMissingEnemyModel(ctx, enemy, x, y, visualStatus) {
  const size = 13;
  drawShadow(ctx, x, y + 14, 16, 5);
  ctx.save();
  ctx.fillStyle = '#ff2bd6';
  rect(ctx, x - size, y - size, size, size);
  rect(ctx, x, y, size, size);
  ctx.fillStyle = '#171018';
  rect(ctx, x, y - size, size, size);
  rect(ctx, x - size, y, size, size);
  ctx.strokeStyle = '#fff0fb';
  ctx.lineWidth = 2;
  ctx.strokeRect(Math.round(x - size), Math.round(y - size), size * 2, size * 2);
  ctx.fillStyle = '#ff8bea';
  ctx.font = 'bold 9px monospace';
  ctx.textAlign = 'center';
  ctx.fillText(`MISSING: ${visualStatus?.modelId || enemy?.kind || enemy?.id || 'enemy'}`, Math.round(x), Math.round(y - 20));
  ctx.restore();
}

function drawEnemyReactionOverlay(ctx, enemy, x, y, reaction) {
  if (!reaction) return;

  const radius = Math.max(14, Number(enemy.r || enemy.radius || 14));
  ctx.save();

  if (reaction.kind === 'hit') {
    ctx.globalAlpha = Math.max(0, Number(reaction.flash || 0)) * 0.42;
    ctx.strokeStyle = reaction.color || '#ffffff';
    ctx.lineWidth = reaction.profileId === 'resistant' ? 3 : 2;
    circleStroke(ctx, x + reaction.x, y - 10 + reaction.y, radius + 7);
    if (reaction.profileId === 'resistant') {
      ctx.globalAlpha *= 0.85;
      line(ctx, x - radius, y - 18, x - radius * 0.3, y - 26);
      line(ctx, x + radius * 0.3, y - 26, x + radius, y - 18);
    } else if (reaction.style === 'shielded') {
      ctx.globalAlpha *= 0.9;
      line(ctx, x - radius * 0.65, y - 16, x, y - 25);
      line(ctx, x, y - 25, x + radius * 0.65, y - 16);
    }
  } else if (reaction.kind === 'death') {
    const progress = reaction.progress || 0;
    const color = reaction.color || '#ef6f6c';
    ctx.strokeStyle = color;
    ctx.fillStyle = color;
    ctx.globalAlpha = (1 - progress) * 0.82;

    if (reaction.profileId === 'holyBurst') {
      for (let i = 0; i < 6; i++) {
        const angle = i / 6 * Math.PI * 2;
        line(ctx, x, y - 15, x + Math.cos(angle) * (18 + progress * 22), y - 15 + Math.sin(angle) * (18 + progress * 22));
      }
    } else if (reaction.family==='skeleton') {
      ctx.fillStyle='#d7cab2';
      for(let i=0;i<7;i++){const a=i*2.4,r=5+progress*(14+i%3*4),by=y-12+Math.sin(a)*r+progress*12;rect(ctx,x+Math.cos(a)*r,by,i%2?5:3,2);}
    } else if (reaction.profileId === 'necromancerCollapse'||reaction.profileId === 'magicDissolve') {
      for(let i=0;i<8;i++){const a=i*2.4;rect(ctx,x+Math.cos(a)*(8+progress*18),y-12-(i%4)*7-progress*20,2+i%2,2);}
    } else if (reaction.profileId === 'eldritchRupture') {
      for (let i = 0; i < 5; i++) {
        const angle = i / 5 * Math.PI * 2 + 0.3;
        line(ctx, x, y - 12, x + Math.cos(angle) * (15 + progress * 26), y - 12 + Math.sin(angle) * (15 + progress * 26));
      }
    } else if (reaction.profileId === 'thornOvergrowth') {
      for (let i = -2; i <= 2; i++) {
        line(ctx, x + i * 6, y + 8, x + i * 8, y - 12 - progress * (9 + Math.abs(i) * 2));
      }
    } else if (reaction.profileId === 'emberFade') {
      for (let i = 0; i < 5; i++) {
        diamond(ctx, x - 14 + i * 7, y - 4 - progress * (18 + i * 2), 2 + (i % 2));
      }
    } else if (reaction.profileId === 'magicDissolve') {
      circleStroke(ctx, x, y - 10, radius + progress * 16);
    }
  }

  ctx.restore();
}

function drawEnemyAttackTellPose(ctx, enemy, x, y) {
  const attack=sampleEnemyAttackPresentation(enemy);
  const tell = enemy.bossTell || enemy.telegraph;
  if(attack&&attack.normal)return; // The actual body and equipped weapon carry ordinary tells.
  if(isHumanoidEnemy(enemy)&&attack?.technique!=='cast')return;
  if (!tell?.time || !tell.pose) return;

  const progress = clamp(1 - tell.time / Math.max(0.001, tell.maxTime || 1), 0, 1);
  const color = tell.color || '#ffcc66';
  const dirX = Number(tell.x ?? enemy.x) - Number(enemy.x ?? 0);
  const dirY = Number(tell.y ?? enemy.y) - Number(enemy.y ?? 0);
  const length = Math.hypot(dirX, dirY) || 1;
  const nx = dirX / length;
  const ny = dirY / length;
  const sideX = -ny;
  const sideY = nx;

  ctx.save();
  ctx.lineCap = 'round';

  if (tell.pose === 'heavyCleave' || tell.pose === 'overhead' || tell.pose === 'bossSlam') {
    // Existing atlas/equipment pixels carry the raised weapon, not a synthetic arm.
  } else if (tell.pose === 'aim' || tell.pose === 'channel' || tell.pose === 'phase') {
    ctx.globalAlpha = 0.45 + progress * 0.45;
    ctx.strokeStyle = color;
    ctx.lineWidth = 3;
    line(ctx, x, y - 20, x + nx * (18 + progress * 8), y - 20 + ny * (18 + progress * 8));
    ctx.fillStyle = color;
    circle(ctx, x + nx * 22, y - 20 + ny * 22, 3 + progress * 3);
  } else if (tell.pose === 'ritual') {
    ctx.globalAlpha = 0.35 + progress * 0.45;
    ctx.strokeStyle = color;
    ctx.lineWidth = 2;
    circleStroke(ctx, x, y + 12, 18 + progress * 8);
    line(ctx, x - 14, y - 16, x - 24, y - 30 - progress * 5);
    line(ctx, x + 14, y - 16, x + 24, y - 30 - progress * 5);
  } else if (tell.pose === 'swell') {
    ctx.globalAlpha = 0.25 + progress * 0.5;
    ctx.strokeStyle = color;
    ctx.lineWidth = 3 + progress * 3;
    circleStroke(ctx, x, y - 12, 18 + progress * 12);
  }

  ctx.restore();
}

function getEnemyDisplayName(enemy) {
  if (enemy?.bossName) return enemy.bossName;
  if (enemy?.name) return enemy.name;

  const kind = String(enemy?.kind || enemy?.archetype || 'enemy');
  return kind
    .replace(/([a-z])([A-Z])/g, '$1 $2')
    .replace(/[-_]+/g, ' ')
    .replace(/\b\w/g, letter => letter.toUpperCase());
}

function getBossRenderType(enemy) {
  return getEnemyBossVisual(enemy);
}

function drawHollowling(ctx, enemy, x, y) {
  const t = enemy.walkTime || performance.now() / 1000;
  const twitch = Math.sin(t * 7.5) * 1.2;
  const bob = Math.sin(t * 3.2) * 1.2;
  const flash = enemy.hitFlash > 0;

  drawShadow(ctx, x + 1, y + 14, 15, 5);

  ctx.strokeStyle = flash ? '#d8a1a8' : '#3b222a';
  ctx.lineWidth = 5;
  line(ctx, x - 4, y - 4 + bob, x - 13, y + 15 - twitch);
  line(ctx, x + 5, y - 3 + bob, x + 11, y + 16 + twitch);
  line(ctx, x - 8, y - 10 + bob, x - 21, y + 1 + twitch);
  line(ctx, x + 8, y - 9 + bob, x + 19, y + 7 - twitch);

  ctx.fillStyle = flash ? '#c98d95' : '#5a3038';
  poly(ctx, [
    [x - 12, y - 17 + bob],
    [x - 5, y - 25 + bob],
    [x + 9, y - 20 + bob],
    [x + 12, y - 2 + bob],
    [x + 4, y + 7 + bob],
    [x - 10, y + 2 + bob]
  ]);

  ctx.fillStyle = flash ? '#e0b3b6' : '#80606a';
  poly(ctx, [
    [x - 9, y - 26 + bob],
    [x - 3, y - 36 + bob],
    [x + 9, y - 32 + bob],
    [x + 11, y - 21 + bob],
    [x + 1, y - 17 + bob],
    [x - 10, y - 20 + bob]
  ]);

  ctx.fillStyle = '#241319';
  poly(ctx, [
    [x - 9, y - 30 + bob],
    [x + 8, y - 28 + bob],
    [x + 5, y - 20 + bob],
    [x - 7, y - 22 + bob]
  ]);

  ctx.fillStyle = '#ff9b8f';
  diamond(ctx, x - 4, y - 26 + bob, 2.5);
  diamond(ctx, x + 4, y - 25 + bob, 2.5);

  ctx.strokeStyle = '#a95a61';
  ctx.lineWidth = 2;
  line(ctx, x - 20, y + 1 + twitch, x - 26, y - 2 + twitch);
  line(ctx, x + 18, y + 7 - twitch, x + 24, y + 2 - twitch);
  line(ctx, x - 13, y + 15 - twitch, x - 18, y + 18 - twitch);
  line(ctx, x + 11, y + 16 + twitch, x + 17, y + 18 + twitch);
}

function drawHollowBeast(ctx, enemy, x, y) {
  const t = enemy.walkTime || performance.now() / 1000;
  const bob = Math.sin(t * 3.4) * 1.5;
  const stride = Math.sin(t * 5) * 2;
  const flash = enemy.hitFlash > 0;

  drawShadow(ctx, x + 1, y + 16, 28, 7);

  ctx.fillStyle = flash ? '#b18a91' : '#382833';
  poly(ctx, [
    [x - 29, y + 4 + bob],
    [x - 20, y - 15 + bob],
    [x + 4, y - 18 + bob],
    [x + 26, y - 8 + bob],
    [x + 21, y + 11 + bob],
    [x - 18, y + 14 + bob]
  ]);
  ctx.fillStyle = flash ? '#d0a6aa' : '#61404b';
  poly(ctx, [
    [x - 19, y - 14 + bob],
    [x + 2, y - 17 + bob],
    [x + 20, y - 9 + bob],
    [x + 5, y - 4 + bob],
    [x - 17, y - 3 + bob]
  ]);

  ctx.fillStyle = flash ? '#d9afb1' : '#754957';
  poly(ctx, [
    [x + 14, y - 12 + bob],
    [x + 34, y - 18 + bob],
    [x + 43, y - 7 + bob],
    [x + 31, y + 3 + bob],
    [x + 18, y - 1 + bob]
  ]);
  ctx.fillStyle = '#1d1419';
  poly(ctx, [
    [x + 35, y - 8 + bob],
    [x + 49, y - 4 + bob],
    [x + 43, y + 4 + bob],
    [x + 31, y + 1 + bob]
  ]);
  ctx.fillStyle = '#ff8c8c';
  diamond(ctx, x + 34, y - 11 + bob, 2.5);

  ctx.strokeStyle = flash ? '#ba969a' : '#302028';
  ctx.lineWidth = 6;
  line(ctx, x - 20, y + 9 + bob, x - 29, y + 25 + stride);
  line(ctx, x - 4, y + 11 + bob, x - 8, y + 27 - stride);
  line(ctx, x + 12, y + 10 + bob, x + 18, y + 26 - stride);
  line(ctx, x + 23, y + 6 + bob, x + 31, y + 22 + stride);
  ctx.lineWidth = 3;
  line(ctx, x - 28, y - 2 + bob, x - 43, y - 12 + bob);

  ctx.fillStyle = '#21171d';
  triangle(ctx, x - 16, y - 15 + bob, x - 9, y - 29 + bob, x - 3, y - 16 + bob);
  triangle(ctx, x + 2, y - 17 + bob, x + 10, y - 29 + bob, x + 14, y - 13 + bob);
}

function drawExploderEnemy(ctx, enemy, x, y) {
  const t = enemy.walkTime || performance.now() / 1000;
  const pulse = Math.sin(t * (enemy.exploding ? 13 : 5));
  const swell = enemy.exploding ? 1.12 + pulse * 0.05 : 1 + pulse * 0.025;
  const bob = Math.sin(t * 3) * 1.1;
  const flash = enemy.hitFlash > 0;

  drawShadow(ctx, x, y + 18, 22, 7);

  ctx.save();
  ctx.translate(Math.round(x), Math.round(y - 2 + bob));
  ctx.scale(swell, swell);

  ctx.fillStyle = flash ? '#e3a59c' : '#431c24';
  circle(ctx, 0, -4, 23);
  ctx.fillStyle = flash ? '#ffc4a8' : '#762b31';
  circle(ctx, 2, -8, 16);

  ctx.strokeStyle = '#ff7d55';
  ctx.lineWidth = 3;
  line(ctx, -14, -16, -5, -8);
  line(ctx, 5, -22, 2, -10);
  line(ctx, 15, -12, 7, -5);
  line(ctx, -10, 5, -2, -2);
  line(ctx, 10, 7, 4, 0);

  ctx.fillStyle = '#ffcc66';
  diamond(ctx, -5, -9, 3);
  diamond(ctx, 5, -8, 3);
  ctx.fillStyle = '#201015';
  triangle(ctx, -16, -21, -24, -34, -9, -25);
  triangle(ctx, 13, -23, 23, -35, 22, -17);

  ctx.strokeStyle = '#2b171c';
  ctx.lineWidth = 6;
  line(ctx, -13, 12, -22, 27);
  line(ctx, 13, 12, 22, 27);
  ctx.restore();

  ctx.save();
  ctx.globalAlpha = enemy.exploding ? 0.38 + pulse * 0.12 : 0.16 + pulse * 0.04;
  ctx.strokeStyle = '#ff7d55';
  ctx.lineWidth = enemy.exploding ? 4 : 2;
  circleStroke(ctx, x, y - 6 + bob, enemy.exploding ? 33 : 27);
  ctx.restore();
}

function drawAshWolf(ctx, enemy, x, y) {
  const t = enemy.walkTime || performance.now() / 1000;
  const run = Math.sin(t * 4) * 2.2;
  const lift = Math.sin(t * 2.5) * 0.8;
  const flash = enemy.hitFlash > 0;
  const ash = enemy.kind === 'ashWolf';

  drawShadow(ctx, x + 4, y + 15, 24, 7);

  ctx.strokeStyle = flash ? '#8795a8' : '#242a32';
  ctx.lineWidth = 5;
  line(ctx, x - 18, y - 3 + lift, x - 35, y - 12 + lift);

  ctx.strokeStyle = flash ? '#b8c8dc' : '#56616f';
  ctx.lineWidth = 3;
  line(ctx, x - 17, y - 4 + lift, x - 32, y - 11 + lift);

  ctx.fillStyle = flash ? '#8795a8' : ash ? '#514844' : '#3f4853';
  poly(ctx, [
    [x - 19, y + 3 + lift],
    [x - 12, y - 9 + lift],
    [x + 8, y - 11 + lift],
    [x + 24, y - 4 + lift],
    [x + 20, y + 9 + lift],
    [x - 10, y + 11 + lift]
  ]);

  ctx.fillStyle = flash ? '#c2d2e4' : ash ? '#827064' : '#5f6c7a';
  poly(ctx, [
    [x - 12, y - 8 + lift],
    [x + 8, y - 10 + lift],
    [x + 21, y - 4 + lift],
    [x + 7, y - 2 + lift],
    [x - 11, y - 1 + lift]
  ]);

  ctx.fillStyle = flash ? '#a5b4c7' : ash ? '#66564e' : '#4e5966';
  poly(ctx, [
    [x + 11, y - 10 + lift],
    [x + 24, y - 15 + lift],
    [x + 31, y - 5 + lift],
    [x + 21, y + 2 + lift]
  ]);

  ctx.fillStyle = flash ? '#c9d8e9' : ash ? '#8b7568' : '#667483';
  poly(ctx, [
    [x + 23, y - 17 + lift],
    [x + 39, y - 12 + lift],
    [x + 42, y - 4 + lift],
    [x + 33, y + 2 + lift],
    [x + 22, y - 2 + lift]
  ]);

  ctx.fillStyle = flash ? '#576173' : '#242a32';
  poly(ctx, [
    [x + 36, y - 9 + lift],
    [x + 47, y - 6 + lift],
    [x + 42, y + 0 + lift],
    [x + 34, y - 2 + lift]
  ]);

  ctx.fillStyle = '#11151a';
  rect(ctx, x + 44, y - 6 + lift, 4, 3);

  ctx.fillStyle = flash ? '#394150' : '#1f242c';
  triangle(ctx, x + 22, y - 17 + lift, x + 25, y - 30 + lift, x + 31, y - 16 + lift);
  triangle(ctx, x + 11, y - 11 + lift, x + 13, y - 25 + lift, x + 20, y - 12 + lift);

  ctx.fillStyle = '#ffcc66';
  rect(ctx, x + 31, y - 12 + lift, 3, 3);

  ctx.strokeStyle = ash ? '#ef8b62' : '#9facbf';
  ctx.lineWidth = 2;
  line(ctx, x - 10, y - 9 + lift, x - 3, y - 17 + lift);
  line(ctx, x + 1, y - 10 + lift, x + 8, y - 19 + lift);
  line(ctx, x + 11, y - 8 + lift, x + 17, y - 15 + lift);

  ctx.strokeStyle = flash ? '#576173' : '#222832';
  ctx.lineWidth = 4;
  line(ctx, x - 11, y + 8 + lift, x - 17, y + 22 + run);
  line(ctx, x - 2, y + 9 + lift, x - 5, y + 23 - run);
  line(ctx, x + 10, y + 9 + lift, x + 14, y + 23 - run);
  line(ctx, x + 19, y + 7 + lift, x + 24, y + 21 + run);

  ctx.fillStyle = '#1b2028';
  rect(ctx, x - 21, y + 21 + run, 8, 3);
  rect(ctx, x - 8, y + 22 - run, 8, 3);
  rect(ctx, x + 11, y + 22 - run, 8, 3);
  rect(ctx, x + 21, y + 20 + run, 8, 3);
}

function drawGraveboundKnight(ctx, enemy, x, y) {
  const t = enemy.walkTime || performance.now() / 1000;
  const bob = Math.sin(t * 2) * 0.8;
  const step = Math.sin(t * 3.2) * 1.2;
  const flash = enemy.hitFlash > 0;
  const shielded = enemy.kind === 'shieldKnight';

  drawShadow(ctx, x + 1, y + 16, shielded ? 25 : 20, 7);

  ctx.fillStyle = flash ? '#aaa1b4' : '#302c37';
  poly(ctx, [
    [x - 15, y - 22 + bob],
    [x - 9, y - 30 + bob],
    [x + 10, y - 30 + bob],
    [x + 16, y - 20 + bob],
    [x + 13, y + 9 + bob],
    [x - 13, y + 9 + bob]
  ]);
  ctx.fillStyle = flash ? '#c8c1ce' : '#6c6574';
  poly(ctx, [
    [x - 12, y - 25 + bob],
    [x + 12, y - 25 + bob],
    [x + 10, y - 4 + bob],
    [x, y + 3 + bob],
    [x - 10, y - 4 + bob]
  ]);
  ctx.fillStyle = '#25222a';
  rect(ctx, x - 13, y - 7 + bob, 26, 6);
  ctx.fillStyle = '#9d8b63';
  rect(ctx, x - 2, y - 25 + bob, 4, 22);

  ctx.fillStyle = flash ? '#d0c8d6' : '#514b59';
  poly(ctx, [
    [x - 11, y - 47 + bob],
    [x + 11, y - 47 + bob],
    [x + 14, y - 32 + bob],
    [x + 8, y - 25 + bob],
    [x - 8, y - 25 + bob],
    [x - 14, y - 32 + bob]
  ]);
  ctx.fillStyle = '#17151a';
  rect(ctx, x - 10, y - 38 + bob, 20, 4);
  ctx.fillStyle = '#d9b76f';
  rect(ctx, x - 6, y - 37 + bob, 4, 2);
  rect(ctx, x + 2, y - 37 + bob, 4, 2);
  ctx.fillStyle = '#302b35';
  triangle(ctx, x - 11, y - 46 + bob, x, y - 57 + bob, x + 11, y - 46 + bob);

  ctx.strokeStyle = '#2a2020';
  ctx.lineWidth = 5;
  line(ctx, x + 12, y - 21 + bob, x + 24, y + 1 + bob);
  ctx.strokeStyle = '#a18c62';
  ctx.lineWidth = 3;
  line(ctx, x + 23, y - 2 + bob, x + 31, y - 29 + bob);
  ctx.fillStyle = '#706477';
  triangle(ctx, x + 31, y - 38 + bob, x + 25, y - 27 + bob, x + 36, y - 27 + bob);

  if (shielded) {
    ctx.fillStyle = flash ? '#d6d9de' : '#505a66';
    poly(ctx, [
      [x - 19, y - 29 + bob],
      [x - 38, y - 20 + bob],
      [x - 36, y + 9 + bob],
      [x - 22, y + 20 + bob],
      [x - 13, y + 10 + bob],
      [x - 12, y - 18 + bob]
    ]);
    ctx.fillStyle = '#90805f';
    rect(ctx, x - 27, y - 23 + bob, 4, 36);
    rect(ctx, x - 36, y - 7 + bob, 22, 4);
    ctx.strokeStyle = '#b49d6a';
    ctx.lineWidth = 2;
    circleStroke(ctx, x - 26, y - 5 + bob, 10);
  }

  ctx.strokeStyle = '#252129';
  ctx.lineWidth = 7;
  line(ctx, x - 7, y + 5 + bob, x - 10, y + 20 + step);
  line(ctx, x + 7, y + 5 + bob, x + 10, y + 20 - step);
  ctx.fillStyle = '#19171c';
  rect(ctx, x - 15, y + 18 + step, 10, 5);
  rect(ctx, x + 5, y + 18 - step, 10, 5);

  if (enemy.isBoss) {
    ctx.save();
    ctx.globalAlpha = 0.22;
    ctx.fillStyle = '#b68cff';
    circle(ctx, x, y - 16 + bob, 30);
    ctx.restore();
  }
}

function drawGraveBrute(ctx, enemy, x, y) {
  const t = enemy.walkTime || performance.now() / 1000;
  const bob = Math.sin(t * 1.7) * 1;
  const heave = Math.sin(t * 2.2) * 2;
  const flash = enemy.hitFlash > 0;

  drawShadow(ctx, x + 2, y + 20, 31, 9);

  ctx.fillStyle = flash ? '#c0a39d' : '#432e32';
  poly(ctx, [
    [x - 28, y - 22 + bob],
    [x - 13, y - 36 + bob],
    [x + 16, y - 33 + bob],
    [x + 30, y - 15 + bob],
    [x + 23, y + 11 + bob],
    [x - 23, y + 11 + bob]
  ]);
  ctx.fillStyle = flash ? '#d2bab1' : '#795b58';
  poly(ctx, [
    [x - 18, y - 28 + bob],
    [x + 14, y - 27 + bob],
    [x + 20, y - 8 + bob],
    [x - 20, y - 8 + bob]
  ]);
  ctx.fillStyle = '#29252b';
  rect(ctx, x - 25, y - 11 + bob, 49, 8);
  ctx.fillStyle = '#9c815c';
  rect(ctx, x - 3, y - 32 + bob, 6, 28);

  ctx.fillStyle = flash ? '#c9b5ad' : '#514247';
  poly(ctx, [
    [x - 13, y - 52 + bob],
    [x + 10, y - 50 + bob],
    [x + 15, y - 36 + bob],
    [x + 4, y - 29 + bob],
    [x - 12, y - 34 + bob]
  ]);
  ctx.fillStyle = '#1a171b';
  rect(ctx, x - 11, y - 44 + bob, 21, 5);
  ctx.fillStyle = '#ef8b72';
  rect(ctx, x - 6, y - 43 + bob, 4, 2);
  rect(ctx, x + 3, y - 43 + bob, 4, 2);

  ctx.strokeStyle = flash ? '#d0b7ad' : '#4c3538';
  ctx.lineWidth = 9;
  line(ctx, x - 22, y - 21 + bob, x - 35, y + 3 + bob + heave);
  line(ctx, x + 22, y - 21 + bob, x + 34, y + 2 + bob - heave);
  ctx.strokeStyle = '#211c20';
  ctx.lineWidth = 7;
  line(ctx, x - 13, y + 7 + bob, x - 18, y + 25 + heave);
  line(ctx, x + 13, y + 7 + bob, x + 18, y + 25 - heave);

  ctx.strokeStyle = '#33261f';
  ctx.lineWidth = 7;
  line(ctx, x + 29, y - 2 + bob, x + 48, y - 33 + bob);
  ctx.fillStyle = '#62585e';
  poly(ctx, [
    [x + 39, y - 43 + bob],
    [x + 55, y - 46 + bob],
    [x + 64, y - 32 + bob],
    [x + 50, y - 23 + bob],
    [x + 39, y - 31 + bob]
  ]);
  ctx.fillStyle = '#99845f';
  rect(ctx, x + 48, y - 43 + bob, 4, 17);
}

function drawArcherEnemy(ctx, enemy, x, y) {
  const t = enemy.walkTime || performance.now() / 1000;
  const bob = Math.sin(t * 2.8) * 1.1;
  const flash = enemy.hitFlash > 0;
  const dir = enemy.dirX < -0.15 ? -1 : 1;

  drawShadow(ctx, x + 1, y + 14, 17, 5);

  ctx.fillStyle = flash ? '#b7c7d4' : '#334653';
  poly(ctx, [
    [x - 10, y - 29 + bob],
    [x + 9, y - 29 + bob],
    [x + 13, y + 7 + bob],
    [x - 12, y + 7 + bob]
  ]);
  ctx.fillStyle = '#202b34';
  triangle(ctx, x - 13, y - 27 + bob, x, y - 45 + bob, x + 13, y - 27 + bob);
  ctx.fillStyle = flash ? '#e4edf3' : '#81919b';
  poly(ctx, [
    [x - 7, y - 31 + bob],
    [x + 7, y - 31 + bob],
    [x + 5, y - 22 + bob],
    [x - 5, y - 22 + bob]
  ]);
  ctx.fillStyle = '#161d22';
  rect(ctx, x - 5, y - 27 + bob, 10, 3);

  ctx.strokeStyle = '#30241d';
  ctx.lineWidth = 5;
  line(ctx, x - dir * 6, y - 21 + bob, x - dir * 15, y + 5 + bob);
  ctx.fillStyle = '#76614a';
  poly(ctx, [
    [x - dir * 12, y - 29 + bob],
    [x - dir * 21, y - 27 + bob],
    [x - dir * 18, y + 4 + bob],
    [x - dir * 10, y + 3 + bob]
  ]);
  ctx.strokeStyle = '#d9ad4f';
  ctx.lineWidth = 3;
  line(ctx, x + dir * 8, y - 22 + bob, x + dir * 27, y - 6 + bob);
  line(ctx, x + dir * 27, y - 6 + bob, x + dir * 24, y - 34 + bob);
  ctx.strokeStyle = '#e8edf5';
  ctx.lineWidth = 1;
  line(ctx, x + dir * 24, y - 34 + bob, x + dir * 27, y - 6 + bob);
  ctx.strokeStyle = '#b9c4cc';
  line(ctx, x + dir * 5, y - 20 + bob, x + dir * 29, y - 20 + bob);
  ctx.fillStyle = '#d9ad4f';
  triangle(ctx, x + dir * 32, y - 20 + bob, x + dir * 27, y - 23 + bob, x + dir * 27, y - 17 + bob);

  ctx.strokeStyle = '#1b2430';
  ctx.lineWidth = 4;
  line(ctx, x - 6, y + 5 + bob, x - 12, y + 19 + bob);
  line(ctx, x + 6, y + 5 + bob, x + 12, y + 19 + bob);
}

function drawBanditEnemy(ctx, enemy, x, y) {
  const t = enemy.walkTime || performance.now() / 1000;
  const bob = Math.sin(t * 3.1) * 1.2;
  const flash = enemy.hitFlash > 0;
  const dir = enemy.dirX < -0.15 ? -1 : 1;

  drawShadow(ctx, x, y + 14, 16, 5);
  ctx.fillStyle = flash ? '#c2a995' : '#4b3d36';
  poly(ctx, [
    [x - 12, y - 24 + bob],
    [x + 10, y - 24 + bob],
    [x + 13, y + 8 + bob],
    [x - 12, y + 8 + bob]
  ]);
  ctx.fillStyle = '#6e5746';
  poly(ctx, [
    [x - 15, y - 22 + bob],
    [x + 10, y - 17 + bob],
    [x + 5, y - 8 + bob],
    [x - 13, y - 10 + bob]
  ]);
  ctx.fillStyle = flash ? '#dfbd9e' : '#8b6a55';
  circle(ctx, x, y - 32 + bob, 9);
  ctx.fillStyle = '#302722';
  poly(ctx, [
    [x - 10, y - 35 + bob],
    [x + 8, y - 39 + bob],
    [x + 14, y - 31 + bob],
    [x - 9, y - 29 + bob]
  ]);
  ctx.fillStyle = '#b85f52';
  rect(ctx, x - 8, y - 31 + bob, 17, 4);

  ctx.strokeStyle = '#2b211b';
  ctx.lineWidth = 5;
  line(ctx, x + dir * 7, y - 15 + bob, x + dir * 22, y + 5 + bob);
  ctx.fillStyle = '#9b8a72';
  poly(ctx, [
    [x + dir * 20, y - 1 + bob],
    [x + dir * 35, y - 8 + bob],
    [x + dir * 31, y + 4 + bob],
    [x + dir * 22, y + 8 + bob]
  ]);
  ctx.strokeStyle = '#28201c';
  ctx.lineWidth = 4;
  line(ctx, x - 6, y + 5 + bob, x - 10, y + 20 + bob);
  line(ctx, x + 6, y + 5 + bob, x + 10, y + 20 + bob);
}

function drawCultistEnemy(ctx, enemy, x, y) {
  const t = enemy.walkTime || performance.now() / 1000;
  const bob = Math.sin(t * 2) * 1.4;
  const flash = enemy.hitFlash > 0;
  const demon = enemy.kind === 'demonCultist';
  const glowColor = demon ? '#ef6f6c' : '#b68cff';

  drawShadow(ctx, x, y + 14, 17, 5);

  ctx.save();
  ctx.globalAlpha = 0.28 + Math.sin(t * 3) * 0.05;
  ctx.strokeStyle = glowColor;
  ctx.lineWidth = 2;
  circleStroke(ctx, x, y - 12 + bob, 23);
  line(ctx, x - 12, y - 12 + bob, x + 12, y - 12 + bob);
  ctx.restore();

  ctx.fillStyle = flash ? '#c4add9' : demon ? '#461b22' : '#342743';
  poly(ctx, [
    [x - 11, y - 30 + bob],
    [x + 11, y - 30 + bob],
    [x + 18, y + 10 + bob],
    [x - 18, y + 10 + bob]
  ]);
  ctx.fillStyle = demon ? '#6d2931' : '#554069';
  poly(ctx, [
    [x - 10, y - 28 + bob],
    [x + 10, y - 28 + bob],
    [x + 8, y - 4 + bob],
    [x - 8, y - 4 + bob]
  ]);
  ctx.fillStyle = '#1c151f';
  triangle(ctx, x - 13, y - 28 + bob, x, y - 48 + bob, x + 13, y - 28 + bob);
  ctx.fillStyle = demon ? '#dba08e' : '#bfb0c7';
  poly(ctx, [
    [x - 7, y - 32 + bob],
    [x + 7, y - 32 + bob],
    [x + 5, y - 23 + bob],
    [x - 5, y - 23 + bob]
  ]);
  ctx.fillStyle = glowColor;
  diamond(ctx, x, y - 27 + bob, 2.5);
  ctx.strokeStyle = glowColor;
  ctx.lineWidth = 4;
  line(ctx, x + 11, y - 19 + bob, x + 25, y + 4 + bob);
  ctx.fillStyle = glowColor;
  triangle(ctx, x + 26, y - 1 + bob, x + 35, y + 7 + bob, x + 24, y + 9 + bob);

  if (demon) {
    ctx.fillStyle = '#261116';
    triangle(ctx, x - 11, y - 31 + bob, x - 20, y - 43 + bob, x - 4, y - 35 + bob);
    triangle(ctx, x + 11, y - 31 + bob, x + 20, y - 43 + bob, x + 4, y - 35 + bob);
  }
}

function drawGravePriestEnemy(ctx, enemy, x, y) {
  const t = enemy.walkTime || performance.now() / 1000;
  const bob = Math.sin(t * 1.8) * 1.8;
  const flash = enemy.hitFlash > 0;
  const glow = '#73d18a';

  drawShadow(ctx, x, y + 15, 20, 6);
  ctx.save();
  ctx.globalAlpha = 0.24 + Math.sin(t * 3.3) * 0.05;
  ctx.strokeStyle = glow;
  ctx.lineWidth = 2;
  circleStroke(ctx, x, y - 27 + bob, 28);
  circleStroke(ctx, x, y - 27 + bob, 20);
  ctx.restore();

  ctx.fillStyle = flash ? '#b9c9bd' : '#24372f';
  poly(ctx, [
    [x - 12, y - 35 + bob],
    [x + 12, y - 35 + bob],
    [x + 22, y + 12 + bob],
    [x - 22, y + 12 + bob]
  ]);
  ctx.fillStyle = '#455e50';
  poly(ctx, [
    [x - 9, y - 32 + bob],
    [x + 9, y - 32 + bob],
    [x + 7, y + 5 + bob],
    [x - 7, y + 5 + bob]
  ]);
  ctx.fillStyle = flash ? '#dce3d8' : '#807f72';
  poly(ctx, [
    [x - 11, y - 47 + bob],
    [x - 5, y - 63 + bob],
    [x + 5, y - 63 + bob],
    [x + 11, y - 47 + bob],
    [x + 7, y - 35 + bob],
    [x - 7, y - 35 + bob]
  ]);
  ctx.fillStyle = '#171d19';
  rect(ctx, x - 7, y - 47 + bob, 14, 4);
  ctx.fillStyle = glow;
  diamond(ctx, x, y - 45 + bob, 3);

  ctx.strokeStyle = '#594b38';
  ctx.lineWidth = 5;
  line(ctx, x + 14, y - 28 + bob, x + 29, y + 13 + bob);
  ctx.strokeStyle = '#a3aa8c';
  ctx.lineWidth = 3;
  line(ctx, x + 28, y + 12 + bob, x + 29, y - 46 + bob);
  circleStroke(ctx, x + 29, y - 51 + bob, 8);
  ctx.fillStyle = glow;
  diamond(ctx, x + 29, y - 51 + bob, 3);

  ctx.strokeStyle = '#8a7657';
  ctx.lineWidth = 2;
  line(ctx, x - 14, y - 24 + bob, x - 28, y - 5 + bob);
  ctx.fillStyle = '#594b38';
  circle(ctx, x - 30, y - 1 + bob, 6);
  ctx.fillStyle = glow;
  rect(ctx, x - 32, y - 3 + bob, 4, 4);
}

function drawWraithEnemy(ctx, enemy, x, y) {
  const t = enemy.walkTime || performance.now() / 1000;
  const bob = Math.sin(t * 2.5) * 3;
  const drift = Math.sin(t * 1.7) * 2;
  const flash = enemy.hitFlash > 0;
  const veyr = enemy.kind === 'veyrWraith';
  const glow = veyr ? '#66f0ff' : '#b68cff';

  drawShadow(ctx, x, y + 18, 18, 4);

  ctx.save();
  ctx.globalAlpha = flash ? 0.9 : 0.76;
  ctx.fillStyle = flash ? '#d8e9ff' : veyr ? '#24445a' : '#322746';
  poly(ctx, [
    [x - 15, y - 31 + bob],
    [x + 14, y - 31 + bob],
    [x + 23 + drift, y - 5 + bob],
    [x + 10, y + 18 + bob],
    [x + 2, y + 6 + bob],
    [x - 7, y + 22 + bob],
    [x - 21 - drift, y - 2 + bob]
  ]);
  ctx.fillStyle = flash ? '#f2f5ff' : veyr ? '#7ca7bb' : '#817093';
  poly(ctx, [
    [x - 9, y - 42 + bob],
    [x + 9, y - 42 + bob],
    [x + 12, y - 29 + bob],
    [x, y - 22 + bob],
    [x - 12, y - 29 + bob]
  ]);
  ctx.fillStyle = '#12151c';
  poly(ctx, [
    [x - 7, y - 36 + bob],
    [x + 7, y - 36 + bob],
    [x + 4, y - 29 + bob],
    [x - 4, y - 29 + bob]
  ]);
  ctx.fillStyle = glow;
  diamond(ctx, x - 4, y - 33 + bob, 2);
  diamond(ctx, x + 4, y - 33 + bob, 2);

  ctx.globalAlpha = 0.5;
  ctx.strokeStyle = glow;
  ctx.lineWidth = 2;
  line(ctx, x - 12, y - 20 + bob, x - 31 - drift, y - 1 + bob);
  line(ctx, x + 12, y - 20 + bob, x + 31 + drift, y - 1 + bob);
  circleStroke(ctx, x, y - 25 + bob, veyr ? 28 : 24);
  if (veyr) {
    triangle(ctx, x - 13, y - 42 + bob, x - 20, y - 58 + bob, x - 3, y - 45 + bob);
    triangle(ctx, x + 13, y - 42 + bob, x + 20, y - 58 + bob, x + 3, y - 45 + bob);
  }
  ctx.restore();
}

function drawVeyrWardenBoss(ctx, enemy, x, y) {
  const t = enemy.walkTime || performance.now() / 1000;
  const bob = Math.sin(t * 1.6) * 1;
  const flash = enemy.hitFlash > 0;
  const phase = enemy.boss?.phase || enemy.phase || 1;
  const glow = phase >= 3 ? '#ef6f6c' : phase >= 2 ? '#b68cff' : '#66f0ff';

  drawShadow(ctx, x + 2, y + 22, 36, 11);

  ctx.save();
  ctx.globalAlpha = phase >= 2 ? 0.24 : 0.14;
  ctx.fillStyle = glow;
  circle(ctx, x, y - 18 + bob, phase >= 3 ? 54 : 44);
  ctx.restore();

  ctx.fillStyle = flash ? '#d8dbe5' : '#2b2e38';
  roundedBody(ctx, x, y - 6 + bob, 25, 33);

  ctx.fillStyle = flash ? '#f2e3b3' : '#8a7d68';
  rect(ctx, x - 19, y - 42 + bob, 38, 38);
  ctx.fillStyle = '#4b4550';
  poly(ctx, [
    [x - 22, y - 42 + bob],
    [x - 12, y - 58 + bob],
    [x + 12, y - 58 + bob],
    [x + 22, y - 42 + bob],
    [x + 18, y - 37 + bob],
    [x - 18, y - 37 + bob]
  ]);
  ctx.fillStyle = '#1a1d27';
  rect(ctx, x - 15, y - 36 + bob, 30, 6);
  ctx.fillStyle = glow;
  rect(ctx, x - 3, y - 35 + bob, 6, 4);
  ctx.fillStyle = '#c9b37b';
  triangle(ctx, x - 18, y - 55 + bob, x - 27, y - 72 + bob, x - 8, y - 58 + bob);
  triangle(ctx, x + 18, y - 55 + bob, x + 27, y - 72 + bob, x + 8, y - 58 + bob);

  ctx.fillStyle = '#594b39';
  rect(ctx, x - 22, y - 11 + bob, 44, 8);
  ctx.fillStyle = '#c9b37b';
  rect(ctx, x - 4, y - 35 + bob, 8, 54);

  ctx.strokeStyle = '#c9b37b';
  ctx.lineWidth = 7;
  line(ctx, x + 22, y - 28 + bob, x + 43, y + 8 + bob);
  ctx.strokeStyle = glow;
  ctx.lineWidth = 3;
  line(ctx, x + 43, y + 8 + bob, x + 55, y + 23 + bob);

  ctx.fillStyle = '#26323d';
  poly(ctx, [
    [x - 25, y - 34 + bob],
    [x - 48, y - 17 + bob],
    [x - 42, y + 22 + bob],
    [x - 22, y + 29 + bob],
    [x - 10, y - 8 + bob]
  ]);
  ctx.strokeStyle = glow;
  ctx.lineWidth = 2;
  circleStroke(ctx, x - 31, y + 2 + bob, 18);
  ctx.fillStyle = '#161923';
  rect(ctx, x - 37, y - 14 + bob, 12, 32);
  ctx.fillStyle = glow;
  diamond(ctx, x - 31, y + 2 + bob, 5);

  ctx.fillStyle = '#141720';
  rect(ctx, x - 18, y + 24 + bob, 11, 8);
  rect(ctx, x + 7, y + 24 - bob, 11, 8);
}

function drawHollowElkBoss(ctx, enemy, x, y) {
  const t = enemy.walkTime || performance.now() / 1000;
  const bob = Math.sin(t * 1.9) * 1.4;
  const flash = enemy.hitFlash > 0;
  const phase = enemy.boss?.phase || enemy.phase || 1;
  const glow = phase >= 3 ? '#ef6f6c' : '#73d18a';

  drawShadow(ctx, x + 5, y + 24, 48, 12);

  ctx.save();
  ctx.globalAlpha = 0.16 + Math.sin(t * 3) * 0.04;
  ctx.fillStyle = glow;
  circle(ctx, x + 7, y - 16 + bob, phase >= 3 ? 58 : 48);
  ctx.restore();

  ctx.fillStyle = flash ? '#cdd8c8' : '#3d5048';
  poly(ctx, [
    [x - 39, y + 2 + bob],
    [x - 24, y - 22 + bob],
    [x + 20, y - 27 + bob],
    [x + 45, y - 9 + bob],
    [x + 35, y + 18 + bob],
    [x - 24, y + 22 + bob]
  ]);

  ctx.fillStyle = flash ? '#eff7e8' : '#71806e';
  poly(ctx, [
    [x + 25, y - 28 + bob],
    [x + 60, y - 28 + bob],
    [x + 69, y - 14 + bob],
    [x + 50, y - 4 + bob],
    [x + 23, y - 8 + bob]
  ]);
  ctx.fillStyle = '#27342e';
  poly(ctx, [
    [x + 41, y - 27 + bob],
    [x + 63, y - 25 + bob],
    [x + 68, y - 15 + bob],
    [x + 55, y - 8 + bob],
    [x + 44, y - 13 + bob]
  ]);
  ctx.fillStyle = '#c9d3bd';
  poly(ctx, [
    [x + 48, y - 30 + bob],
    [x + 66, y - 27 + bob],
    [x + 72, y - 17 + bob],
    [x + 61, y - 10 + bob],
    [x + 48, y - 16 + bob]
  ]);
  ctx.fillStyle = '#1b251f';
  rect(ctx, x + 58, y - 21 + bob, 15, 4);

  ctx.strokeStyle = '#b9d99f';
  ctx.lineWidth = 4;
  line(ctx, x + 45, y - 31 + bob, x + 32, y - 58 + bob);
  line(ctx, x + 43, y - 31 + bob, x + 58, y - 59 + bob);
  line(ctx, x + 33, y - 52 + bob, x + 18, y - 66 + bob);
  line(ctx, x + 56, y - 53 + bob, x + 74, y - 68 + bob);
  line(ctx, x + 29, y - 57 + bob, x + 4, y - 59 + bob);
  line(ctx, x + 64, y - 57 + bob, x + 88, y - 61 + bob);
  line(ctx, x + 17, y - 65 + bob, x + 8, y - 78 + bob);
  line(ctx, x + 75, y - 67 + bob, x + 85, y - 82 + bob);

  ctx.fillStyle = phase >= 3 ? '#ffcc66' : '#d8f6c9';
  rect(ctx, x + 54, y - 24 + bob, 5, 5);
  ctx.strokeStyle = glow;
  ctx.lineWidth = 2;
  line(ctx, x - 26, y - 16 + bob, x - 15, y - 2 + bob);
  line(ctx, x - 4, y - 24 + bob, x + 7, y - 7 + bob);
  line(ctx, x + 16, y - 24 + bob, x + 26, y - 10 + bob);

  ctx.strokeStyle = '#26332d';
  ctx.lineWidth = 6;
  line(ctx, x - 25, y + 16 + bob, x - 35, y + 42 + bob);
  line(ctx, x - 4, y + 18 + bob, x - 6, y + 44 - bob);
  line(ctx, x + 20, y + 15 + bob, x + 28, y + 43 - bob);
  line(ctx, x + 38, y + 10 + bob, x + 48, y + 37 + bob);

  ctx.fillStyle = '#1b241f';
  rect(ctx, x - 39, y + 40 + bob, 10, 4);
  rect(ctx, x - 10, y + 42 - bob, 10, 4);
  rect(ctx, x + 24, y + 41 - bob, 10, 4);
  rect(ctx, x + 44, y + 35 + bob, 10, 4);
}

function drawDemonLordBoss(ctx, enemy, x, y) {
  const t = enemy.walkTime || performance.now() / 1000;
  const bob = Math.sin(t * 1.45) * 1.2;
  const flash = enemy.hitFlash > 0;
  const phase = enemy.boss?.phase || enemy.phase || 1;
  const glow = phase >= 3 ? '#ff5a3d' : phase >= 2 ? '#ef6f6c' : '#b68cff';
  const flare = 0.14 + Math.sin(t * 4) * 0.04;

  drawShadow(ctx, x + 2, y + 28, 52, 14);

  ctx.save();
  ctx.globalAlpha = flare + (phase >= 3 ? 0.12 : 0);
  ctx.fillStyle = glow;
  circle(ctx, x, y - 16 + bob, phase >= 3 ? 76 : 62);
  ctx.restore();

  ctx.fillStyle = flash ? '#efb0a2' : '#2a1018';
  poly(ctx, [
    [x - 54, y - 18 + bob],
    [x - 82, y - 62 + bob],
    [x - 36, y - 52 + bob],
    [x - 16, y - 18 + bob],
    [x - 28, y + 12 + bob]
  ]);
  poly(ctx, [
    [x + 54, y - 18 + bob],
    [x + 82, y - 62 + bob],
    [x + 36, y - 52 + bob],
    [x + 16, y - 18 + bob],
    [x + 28, y + 12 + bob]
  ]);

  ctx.strokeStyle = '#7d2f32';
  ctx.lineWidth = 5;
  line(ctx, x - 18, y - 20 + bob, x - 70, y - 57 + bob);
  line(ctx, x + 18, y - 20 + bob, x + 70, y - 57 + bob);

  ctx.fillStyle = flash ? '#d67d72' : '#3b1721';
  roundedBody(ctx, x, y - 8 + bob, 29, 40);
  ctx.fillStyle = '#5f2430';
  roundedBody(ctx, x, y - 11 + bob, 21, 33);
  ctx.fillStyle = '#1c0c11';
  poly(ctx, [
    [x - 30, y - 31 + bob],
    [x - 15, y - 43 + bob],
    [x, y - 33 + bob],
    [x + 15, y - 43 + bob],
    [x + 30, y - 31 + bob],
    [x + 22, y - 18 + bob],
    [x - 22, y - 18 + bob]
  ]);
  ctx.fillStyle = '#7e2b32';
  triangle(ctx, x - 22, y - 36 + bob, x - 12, y - 52 + bob, x - 5, y - 31 + bob);
  triangle(ctx, x + 22, y - 36 + bob, x + 12, y - 52 + bob, x + 5, y - 31 + bob);

  ctx.fillStyle = '#1b0b10';
  rect(ctx, x - 18, y + 18 + bob, 13, 14);
  rect(ctx, x + 5, y + 18 - bob, 13, 14);

  ctx.fillStyle = flash ? '#f2c7b8' : '#4e1e2c';
  circle(ctx, x, y - 56 + bob, 22);

  ctx.fillStyle = '#0c0709';
  triangle(ctx, x - 15, y - 68 + bob, x - 42, y - 92 + bob, x - 23, y - 50 + bob);
  triangle(ctx, x + 15, y - 68 + bob, x + 42, y - 92 + bob, x + 23, y - 50 + bob);

  ctx.fillStyle = glow;
  rect(ctx, x - 8, y - 59 + bob, 5, 5);
  rect(ctx, x + 3, y - 59 + bob, 5, 5);
  diamond(ctx, x, y - 24 + bob, 8);
  ctx.strokeStyle = '#ff7d55';
  ctx.lineWidth = 2;
  line(ctx, x - 16, y - 13 + bob, x - 7, y - 22 + bob);
  line(ctx, x + 16, y - 13 + bob, x + 7, y - 22 + bob);
  line(ctx, x - 7, y - 2 + bob, x, y - 16 + bob);
  line(ctx, x + 7, y - 2 + bob, x, y - 16 + bob);

  ctx.strokeStyle = '#12070a';
  ctx.lineWidth = 8;
  line(ctx, x - 24, y - 31 + bob, x - 48, y + 8 + bob);
  line(ctx, x + 24, y - 31 + bob, x + 48, y + 8 + bob);

  ctx.strokeStyle = glow;
  ctx.lineWidth = 3;
  line(ctx, x - 48, y + 8 + bob, x - 61, y + 21 + bob);
  line(ctx, x + 48, y + 8 + bob, x + 61, y + 21 + bob);
  ctx.strokeStyle = '#8b5c45';
  ctx.lineWidth = 2;
  line(ctx, x - 26, y - 6 + bob, x - 45, y + 22 + bob);
  line(ctx, x - 45, y + 22 + bob, x - 56, y + 18 + bob);
  line(ctx, x + 26, y - 6 + bob, x + 45, y + 22 + bob);
  line(ctx, x + 45, y + 22 + bob, x + 56, y + 18 + bob);

  if (phase >= 2) {
    ctx.save();
    ctx.globalAlpha = phase >= 3 ? 0.55 : 0.35;
    ctx.strokeStyle = glow;
    ctx.lineWidth = 2;
    circleStroke(ctx, x, y - 28 + bob, phase >= 3 ? 46 : 36);
    line(ctx, x - 24, y - 28 + bob, x + 24, y - 28 + bob);
    line(ctx, x, y - 52 + bob, x, y - 4 + bob);
    ctx.restore();
  }
}

function drawSeraphelBoss(ctx, enemy, x, y) {
  const t = enemy.walkTime || performance.now() / 1000;
  const bob = Math.sin(t * 1.7) * 1.1;
  const flash = enemy.hitFlash > 0;
  const phase = enemy.boss?.phase || enemy.phase || 1;
  const glow = phase >= 3 ? '#ef6f6c' : phase >= 2 ? '#b68cff' : '#d7e8ff';

  drawShadow(ctx, x + 2, y + 25, 44, 12);

  ctx.save();
  ctx.globalAlpha = phase >= 3 ? 0.24 : 0.16;
  ctx.fillStyle = glow;
  circle(ctx, x, y - 34 + bob, phase >= 3 ? 72 : 56);
  ctx.restore();

  ctx.strokeStyle = glow;
  ctx.lineWidth = phase >= 3 ? 5 : 4;
  line(ctx, x - 22, y - 28 + bob, x - 72, y - 72 + bob);
  line(ctx, x + 22, y - 28 + bob, x + 72, y - 72 + bob);
  line(ctx, x - 20, y - 13 + bob, x - 82, y - 22 + bob);
  line(ctx, x + 20, y - 13 + bob, x + 82, y - 22 + bob);
  ctx.fillStyle = phase >= 2 ? '#52475e' : '#c9d4e4';
  poly(ctx, [
    [x - 24, y - 31 + bob],
    [x - 72, y - 75 + bob],
    [x - 55, y - 36 + bob],
    [x - 82, y - 23 + bob],
    [x - 28, y - 14 + bob]
  ]);
  poly(ctx, [
    [x + 24, y - 31 + bob],
    [x + 72, y - 75 + bob],
    [x + 55, y - 36 + bob],
    [x + 82, y - 23 + bob],
    [x + 28, y - 14 + bob]
  ]);

  ctx.fillStyle = flash ? '#ffffff' : '#d8dbe5';
  roundedBody(ctx, x, y - 9 + bob, 24, 39);

  ctx.fillStyle = phase >= 2 ? '#5f546b' : '#eef3ff';
  roundedBody(ctx, x, y - 13 + bob, 17, 31);

  ctx.fillStyle = '#161923';
  rect(ctx, x - 15, y + 19 + bob, 10, 13);
  rect(ctx, x + 5, y + 19 - bob, 10, 13);

  ctx.fillStyle = flash ? '#ffffff' : '#f0d9b5';
  circle(ctx, x, y - 52 + bob, 17);

  ctx.strokeStyle = phase >= 2 ? '#ef6f6c' : '#ffcc66';
  ctx.lineWidth = 3;
  circleStroke(ctx, x, y - 78 + bob, phase >= 2 ? 23 : 18);
  line(ctx, x - 18, y - 78 + bob, x - 28, y - 89 + bob);
  line(ctx, x + 18, y - 78 + bob, x + 28, y - 89 + bob);
  if (phase >= 2) {
    line(ctx, x - 18, y - 78 + bob, x + 18, y - 78 + bob);
  }

  ctx.strokeStyle = glow;
  ctx.lineWidth = 5;
  line(ctx, x + 18, y - 29 + bob, x + 48, y + 22 + bob);
  ctx.lineWidth = 2;
  line(ctx, x + 48, y + 22 + bob, x + 60, y + 35 + bob);

  if (phase >= 2) {
    ctx.fillStyle = '#ef6f6c';
    diamond(ctx, x - 42, y - 38 + bob, 3);
    diamond(ctx, x + 42, y - 38 + bob, 3);
    if (phase >= 3) {
      diamond(ctx, x - 63, y - 25 + bob, 3);
      diamond(ctx, x + 63, y - 25 + bob, 3);
    }
  }

  if (phase >= 3) {
    ctx.save();
    ctx.globalAlpha = 0.5;
    ctx.strokeStyle = '#ffffff';
    ctx.lineWidth = 2;
    circleStroke(ctx, x, y - 26 + bob, 50);
    circleStroke(ctx, x, y - 26 + bob, 66);
    ctx.restore();
  }
}

function drawZephyrBoss(ctx, enemy, x, y) {
  const t = enemy.walkTime || performance.now() / 1000;
  const bob = Math.sin(t * 1.25) * 1.2;
  const flash = enemy.hitFlash > 0;
  const phase = enemy.boss?.phase || enemy.phase || 1;
  const glow = phase >= 3 ? '#66f0ff' : phase >= 2 ? '#d7e8ff' : '#ffefb0';

  drawShadow(ctx, x + 3, y + 30, 58, 14);

  ctx.save();
  ctx.globalAlpha = phase >= 3 ? 0.28 : 0.18;
  ctx.fillStyle = glow;
  circle(ctx, x, y - 38 + bob, phase >= 3 ? 92 : phase >= 2 ? 72 : 56);
  ctx.restore();

  const ringCount = phase >= 3 ? 4 : phase >= 2 ? 3 : 2;
  ctx.strokeStyle = glow;
  ctx.lineWidth = 2;
  for (let i = 0; i < ringCount; i++) {
    const r = 26 + i * 17 + Math.sin(t * 2 + i) * 2;
    circleStroke(ctx, x, y - 42 + bob, r);
  }
  ctx.fillStyle = phase >= 3 ? '#173044' : '#e2d7b6';
  for (let i = 0; i < ringCount + 2; i++) {
    const a = (Math.PI * 2 * i) / (ringCount + 2) + t * 0.18;
    const rx = x + Math.cos(a) * (48 + phase * 7);
    const ry = y - 42 + bob + Math.sin(a) * (35 + phase * 4);
    diamond(ctx, rx, ry, phase >= 3 ? 5 : 4);
  }

  ctx.fillStyle = flash ? '#ffffff' : phase >= 2 ? '#e9f6ff' : '#f7edcf';
  roundedBody(ctx, x, y - 10 + bob, 22, 42);

  ctx.fillStyle = phase >= 3 ? '#1f2b3a' : '#efe5c8';
  roundedBody(ctx, x, y - 13 + bob, 14, 31);

  ctx.fillStyle = glow;
  circle(ctx, x, y - 57 + bob, 18);
  ctx.fillStyle = '#f5f1df';
  poly(ctx, [
    [x - 12, y - 64 + bob],
    [x, y - 73 + bob],
    [x + 12, y - 64 + bob],
    [x + 8, y - 50 + bob],
    [x, y - 44 + bob],
    [x - 8, y - 50 + bob]
  ]);
  ctx.fillStyle = '#111827';
  rect(ctx, x - 7, y - 62 + bob, 4, 3);
  rect(ctx, x + 3, y - 62 + bob, 4, 3);
  ctx.fillStyle = glow;
  diamond(ctx, x, y - 54 + bob, 2.5);

  ctx.strokeStyle = phase >= 3 ? '#66f0ff' : '#d7e8ff';
  ctx.lineWidth = 4;
  line(ctx, x - 20, y - 23 + bob, x - 57, y + 6 + bob);
  line(ctx, x + 20, y - 23 + bob, x + 57, y + 6 + bob);
  line(ctx, x - 5, y + 20 + bob, x - 24, y + 45 + bob);
  line(ctx, x + 5, y + 20 - bob, x + 24, y + 45 - bob);

  ctx.strokeStyle = glow;
  ctx.lineWidth = 2;
  line(ctx, x - 57, y + 6 + bob, x - 69, y + 19 + bob);
  line(ctx, x + 57, y + 6 + bob, x + 69, y + 19 + bob);
  diamond(ctx, x - 70, y + 20 + bob, 5);
  diamond(ctx, x + 70, y + 20 + bob, 5);

  if (phase >= 2) {
    ctx.save();
    ctx.globalAlpha = phase >= 3 ? 0.75 : 0.5;
    ctx.strokeStyle = glow;
    ctx.lineWidth = 3;
    for (let i = 0; i < 6; i++) {
      const a = (Math.PI * 2 * i) / 6 + t * 0.35;
      line(ctx, x, y - 38 + bob, x + Math.cos(a) * 74, y - 38 + bob + Math.sin(a) * 54);
    }
    ctx.restore();
  }
}

function drawEnemyModelPolish(ctx, enemy, x, y) {
  const t = enemy.walkTime || performance.now() / 1000;
  const bob = Math.sin(t * 2.1) * 1.1;
  const bossType = getBossRenderType(enemy);

  if (bossType) return;

  ctx.save();

  if (enemy.kind === 'veyrWraith') {
    ctx.globalAlpha = 0.46;
    ctx.fillStyle = '#66f0ff';
    diamond(ctx, x - 28, y - 22 + bob, 3);
    diamond(ctx, x + 28, y - 22 - bob, 3);
  } else if (enemy.kind === 'stalkerWolf') {
    ctx.globalAlpha = 0.28 + Math.sin(t * 5) * 0.05;
    ctx.strokeStyle = '#9facbf';
    ctx.lineWidth = 2;
    line(ctx, x - 39, y - 5 + bob, x - 55, y - 5 + bob);
    line(ctx, x - 34, y + 3 + bob, x - 47, y + 7 + bob);
  } else if (enemy.kind === 'ashWolf') {
    ctx.globalAlpha = 0.34 + Math.sin(t * 4) * 0.06;
    ctx.strokeStyle = '#ef8b62';
    ctx.lineWidth = 2;
    line(ctx, x - 27, y - 3 + bob, x - 38, y - 10 + bob);
    line(ctx, x - 22, y + 4 + bob, x - 35, y + 2 + bob);
  } else if (enemy.kind === 'hollowling' || enemy.kind === 'basicBeast') {
    ctx.globalAlpha = 0.45;
    ctx.strokeStyle = '#ef6f6c';
    ctx.lineWidth = 1.5;
    line(ctx, x - 6, y - 14 + bob, x + 2, y - 8 + bob);
    line(ctx, x + 4, y - 10 + bob, x + 10, y - 3 + bob);
  }

  if (enemy.isBoss) {
    ctx.globalAlpha = 0.5;
    ctx.strokeStyle = '#d8bdff';
    ctx.lineWidth = 2;
    circleStroke(ctx, x, y - 18 + bob, 32);
    ctx.fillStyle = '#d8bdff';
    triangle(ctx, x - 12, y - 48 + bob, x - 6, y - 57 + bob, x, y - 48 + bob);
    triangle(ctx, x, y - 48 + bob, x + 6, y - 57 + bob, x + 12, y - 48 + bob);
  }

  ctx.restore();
}

function drawEnemyStatus(ctx, enemy, x, y) {
  const now = performance.now() / 1000;

  if ((enemy.slowTimer || 0) > 0 || (enemy.slowUntil || 0) > now) {
    ctx.strokeStyle = 'rgba(115,209,138,0.35)';
    ctx.lineWidth = 2;
    line(ctx, x - 18, y + 15, x + 18, y + 15);
  }

  if ((enemy.rootUntil || 0) > now) {
    ctx.strokeStyle = 'rgba(115,209,138,0.75)';
    ctx.lineWidth = 3;
    line(ctx, x - 14, y + 11, x + 14, y - 2);
    line(ctx, x + 14, y + 11, x - 14, y - 2);
  }

  const soakedUntil = getEnemySoakedUntil(enemy);
  if (soakedUntil > now) {
    drawSoakedEnemyStatus(ctx, enemy, x, y, now, soakedUntil);
  }

  const exposedUntil = getEnemyExposedUntil(enemy);
  if (exposedUntil > now) {
    drawExposedEnemyStatus(ctx, enemy, x, y, now, exposedUntil);
  }

  if (enemy.eliteModifier) {
    const color = getEliteColor(enemy.eliteModifier);
    ctx.strokeStyle = color;
    ctx.lineWidth = 2;
    const r = (enemy.r || enemy.radius || 15) + 10;
    circleStroke(ctx, x, y - 10, r);
    ctx.fillStyle = color;
    triangle(ctx, x - r, y - 10, x - r - 6, y - 14, x - r - 6, y - 6);
    triangle(ctx, x + r, y - 10, x + r + 6, y - 14, x + r + 6, y - 6);
    diamond(ctx, x, y - 10 - r, 3);
  }

  if (enemy.telegraph?.time > 0) {
    ctx.fillStyle = enemy.telegraph.color || '#ffcc66';
    rect(ctx, x - 10, y - getEnemyHpOffset(enemy) + 8, 20 * clamp(1 - enemy.telegraph.time / Math.max(0.001, enemy.telegraph.maxTime || 1), 0, 1), 3);
  }

  if (Number(enemy.boss?.recoveryUntil || 0) > now) {
    const remaining = enemy.boss.recoveryUntil - now;
    ctx.globalAlpha = Math.min(0.65, 0.25 + remaining * 0.2);
    ctx.strokeStyle = '#fff1b8';
    ctx.lineWidth = 2;
    const r = (enemy.r || enemy.radius || 24) + 14;
    ctx.beginPath();
    ctx.arc(x, y - 10, r, Math.PI * 0.15, Math.PI * 0.85);
    ctx.stroke();
    ctx.globalAlpha = 1;
  }
}

function getEnemySoakedUntil(enemy) {
  return Math.max(
    Number(enemy?.waveriderSoakedUntil || 0),
    Number(enemy?.hydromancerSoakedUntil || 0)
  );
}

function getEnemyExposedUntil(enemy) {
  return Math.max(
    Number(enemy?.fellhunterExposedUntil || 0),
    Number(enemy?.mercenaryMarkedUntil || 0)
  );
}

function drawExposedEnemyStatus(ctx, enemy, x, y, now, exposedUntil) {
  const radius = Math.max(13, Number(enemy.r || enemy.radius || 14));
  const remaining = Math.max(0, exposedUntil - now);
  const fade = Math.min(1, remaining / 0.7);
  const appliedAt = Number(enemy.exposedAppliedAt || now);
  const pulse = Math.max(0, 1 - (now - appliedAt) / 0.36);
  const top = y - radius - 19;
  const side = radius + 10 + pulse * 3;

  ctx.save();
  ctx.globalAlpha = 0.56 * fade;
  ctx.strokeStyle = '#ffb36c';
  ctx.lineWidth = 2;
  line(ctx, x - side, top, x - side + 9, top);
  line(ctx, x - side, top, x - side, top + 9);
  line(ctx, x + side, top, x + side - 9, top);
  line(ctx, x + side, top, x + side, top + 9);

  ctx.globalAlpha = 0.28 * fade;
  ctx.strokeStyle = '#d6dde5';
  circleStroke(ctx, x, y - 9, radius + 6 + pulse * 4);
  ctx.restore();
}

function drawSoakedEnemyStatus(ctx, enemy, x, y, now, soakedUntil) {
  const radius = Math.max(13, Number(enemy.r || enemy.radius || 14));
  const remaining = Math.max(0, soakedUntil - now);
  const fade = Math.min(1, remaining / 0.8);
  const pulse = 0.5 + Math.sin(now * 5.2) * 0.5;
  const appliedAt = Number(enemy.soakedAppliedAt || now);
  const splashPulse = Math.max(0, 1 - (now - appliedAt) / 0.42);

  ctx.save();

  ctx.globalAlpha = 0.18 * fade;
  ctx.fillStyle = '#59d7e8';
  circle(ctx, x, y - 9, radius + 7);

  ctx.globalAlpha = (0.34 + splashPulse * 0.12) * fade;
  ctx.strokeStyle = '#8feaf2';
  ctx.lineWidth = 1.5;
  circleStroke(ctx, x, y + 14, radius * (0.92 + pulse * 0.08));

  ctx.globalAlpha = 0.42 * fade;
  ctx.fillStyle = '#d7fbfa';
  const dropletCount = enemy.isBoss || enemy.worldBoss ? 4 : 3;
  for (let i = 0; i < dropletCount; i++) {
    const angle = now * 1.2 + i * (Math.PI * 2 / dropletCount);
    const dx = Math.cos(angle) * radius * 0.78;
    const dy = Math.sin(angle) * radius * 0.3;
    circle(ctx, x + dx, y - 7 + dy, 1.8 + (i % 2) * 0.6);
  }

  if (splashPulse > 0) {
    ctx.globalAlpha = splashPulse * 0.28;
    ctx.strokeStyle = '#d7fbfa';
    ctx.lineWidth = 2;
    circleStroke(ctx, x, y + 13, radius * (1.05 + splashPulse * 0.3));
  }

  ctx.restore();
}

function getEnemyHpOffset(enemy) {
  const profile=getEnemyVisualProfile(enemy);
  if(profile.hpOffset)return profile.hpOffset;
  if (isHumanoidEnemy(enemy)) return 58;
  const bossType = getBossRenderType(enemy);
  if (bossType === 'zephyrLight') return 138;
  if (bossType === 'seraphel') return 112;
  if (bossType === 'demonLord') return 112;
  if (bossType === 'hollowElk') return 96;
  if (bossType === 'veyrWarden') return 88;
  if (enemy.kind === 'brute') return 66;
  if (enemy.kind === 'gravePriest') return 74;
  if (enemy.kind === 'gravebound' || enemy.kind === 'shieldKnight') return enemy.isBoss ? 68 : 60;
  if (enemy.kind === 'veyrWraith') return 68;
  if (enemy.kind === 'wraith') return 58;
  if (enemy.kind === 'archer' || enemy.kind === 'roadlessBandit' || enemy.kind === 'cultist' || enemy.kind === 'demonCultist') return 56;
  if (enemy.kind === 'ashWolf' || enemy.kind === 'stalkerWolf') return 46;
  if (enemy.kind === 'exploder') return 52;
  if (enemy.kind === 'basicBeast') return 45;
  return 48;
}

function getEliteColor(modifier) {
  if(ELITE_CUE_PROFILES[modifier])return ELITE_CUE_PROFILES[modifier].colors[1];
  if (modifier === 'burning') return '#ef6f6c';
  if (modifier === 'frozen') return '#66f0ff';
  if (modifier === 'vampiric') return '#b68cff';
  if (modifier === 'armoured') return '#9facbf';
  if (modifier === 'blink') return '#b68cff';
  if (modifier === 'charger') return '#ffcc66';
  if (modifier === 'summoner') return '#66f0ff';
  if (modifier === 'swift') return '#ffcc66';
  if (modifier === 'poisoned') return '#73d18a';
  return '#d8bdff';
}

// -----------------------------------------------------------------------------
// CIRCULAR LOCAL MINIMAP
// -----------------------------------------------------------------------------

function drawCircularMinimap(ctx, world, player, camera) {
  const radius = 82;
  const margin = 18;
  const cx = ctx.canvas.width - radius - margin;
  const cy = radius + margin;

  const worldW = getWorldWidth(world);
  const worldH = getWorldHeight(world);

  if (!worldW || !worldH) return;

  const visibleTilesX = Math.ceil(ctx.canvas.width / TILE);
  const visibleTilesY = Math.ceil(ctx.canvas.height / TILE);

  const localRadiusTiles = Math.max(
    28,
    Math.ceil(Math.max(visibleTilesX, visibleTilesY) * 0.85)
  );

  const playerTileX = Math.floor(player.x / TILE);
  const playerTileY = Math.floor(player.y / TILE);

  const startX = clamp(playerTileX - localRadiusTiles, 0, worldW - 1);
  const endX = clamp(playerTileX + localRadiusTiles, 0, worldW - 1);
  const startY = clamp(playerTileY - localRadiusTiles, 0, worldH - 1);
  const endY = clamp(playerTileY + localRadiusTiles, 0, worldH - 1);

  const rangeX = Math.max(1, endX - startX);
  const rangeY = Math.max(1, endY - startY);

  ctx.save();

  ctx.fillStyle = 'rgba(0,0,0,0.55)';
  ctx.beginPath();
  ctx.arc(cx, cy, radius + 6, 0, Math.PI * 2);
  ctx.fill();

  ctx.strokeStyle = 'rgba(139,166,214,0.42)';
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.arc(cx, cy, radius + 5, 0, Math.PI * 2);
  ctx.stroke();

  ctx.beginPath();
  ctx.arc(cx, cy, radius, 0, Math.PI * 2);
  ctx.clip();

  ctx.fillStyle = 'rgba(5,8,14,0.92)';
  ctx.fillRect(cx - radius, cy - radius, radius * 2, radius * 2);

  drawLocalMinimapTiles(
    ctx,
    world,
    cx,
    cy,
    radius,
    startX,
    startY,
    endX,
    endY,
    rangeX,
    rangeY
  );

  drawLocalMinimapObjects(
    ctx,
    world,
    cx,
    cy,
    radius,
    startX,
    startY,
    rangeX,
    rangeY
  );

  drawLocalMinimapEnemies(
    ctx,
    world,
    cx,
    cy,
    radius,
    startX,
    startY,
    rangeX,
    rangeY
  );

  ctx.fillStyle = '#ffffff';
  ctx.fillRect(cx - 2, cy - 2, 4, 4);

  ctx.strokeStyle = '#11151a';
  ctx.lineWidth = 1;
  ctx.strokeRect(cx - 2, cy - 2, 4, 4);

  const dirX = player.dirX || 0;
  const dirY = player.dirY || 1;

  ctx.strokeStyle = '#ffffff';
  ctx.lineWidth = 2;
  line(ctx, cx, cy, cx + dirX * 10, cy + dirY * 10);

  ctx.restore();

  ctx.save();

  ctx.strokeStyle = 'rgba(255,255,255,0.16)';
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.arc(cx, cy, radius, 0, Math.PI * 2);
  ctx.stroke();

  ctx.font = 'bold 10px sans-serif';
  ctx.textAlign = 'center';
  ctx.fillStyle = '#e8edf5';
  const mapLabel = world.name === 'Orrakai'
    ? 'Orrakai'
    : world.mode === 'dungeon'
      ? 'Dungeon'
      : 'Local Map';
  ctx.fillText(mapLabel, cx, cy - radius - 10);

  ctx.restore();
}

function drawLocalMinimapTiles(ctx, world, cx, cy, radius, startX, startY, endX, endY, rangeX, rangeY) {
  const tilePixelW = (radius * 2) / Math.max(1, rangeX);
  const tilePixelH = (radius * 2) / Math.max(1, rangeY);

  const step = Math.max(1, Math.ceil(Math.max(rangeX, rangeY) / 90));

  for (let ty = startY; ty <= endY; ty += step) {
    for (let tx = startX; tx <= endX; tx += step) {
      const tile = world.tiles[ty]?.[tx];
      if (!tile) continue;

      const px = cx - radius + ((tx - startX) / rangeX) * radius * 2;
      const py = cy - radius + ((ty - startY) / rangeY) * radius * 2;

      ctx.fillStyle = tile.orrakai && tile.connector ? '#c6b183' : minimapBiomeColor(tile.biome);
      ctx.fillRect(
        Math.floor(px),
        Math.floor(py),
        Math.max(1, Math.ceil(tilePixelW * step)),
        Math.max(1, Math.ceil(tilePixelH * step))
      );
    }
  }
}

function drawLocalMinimapObjects(ctx, world, cx, cy, radius, startX, startY, rangeX, rangeY) {
  for (const object of world.objects || []) {
    if (!object || object.depleted) continue;
    if (object.kind === 'townProp') continue;
    if (object.kind === 'npc' && object.interactable === false) continue;

    const tileX = object.x / TILE;
    const tileY = object.y / TILE;

    if (tileX < startX || tileY < startY || tileX > startX + rangeX || tileY > startY + rangeY) {
      continue;
    }

    const px = cx - radius + ((tileX - startX) / rangeX) * radius * 2;
    const py = cy - radius + ((tileY - startY) / rangeY) * radius * 2;

    if (object.kind === 'capitalExit') {
      ctx.fillStyle = '#73d18a';
      diamond(ctx, px, py, 4);
      continue;
    }

    if (object.kind === 'travelRouteGate') {
      ctx.fillStyle = '#ffcc66';
      diamond(ctx, px, py, 4.5);
      continue;
    }

    if (['marketStall', 'bankService', 'blacksmithService', 'alchemistService', 'guildClerk', 'classTrainerService', 'noticeBoard'].includes(object.kind)) {
      ctx.fillStyle = minimapServiceColor(object.kind);
      ctx.fillRect(px - 1.7, py - 1.7, 3.4, 3.4);
      continue;
    }

    if (object.kind === 'dungeonEntrance') {
      ctx.fillStyle = '#b68cff';
      diamond(ctx, px, py, 4);
      continue;
    }

    if (object.kind === 'poiMarker') {
      ctx.fillStyle = object.markerColor || '#e3cef2';
      diamond(ctx, px, py, 3.7);
      continue;
    }

    if (object.kind === 'worldCache') {
      ctx.fillStyle = object.color || '#d9ad4f';
      ctx.fillRect(px - 1.7, py - 1.7, 3.4, 3.4);
      continue;
    }

    if (object.kind === 'dungeonExit') {
      ctx.fillStyle = '#73d18a';
      diamond(ctx, px, py, 4);
      continue;
    }

    if (object.kind === 'npc') {
      ctx.fillStyle = object.classId ? classColor(object.classId) : '#d9ad4f';
      ctx.fillRect(px - 1.5, py - 1.5, 3, 3);
      continue;
    }

    if (object.kind === 'campfire') {
      ctx.fillStyle = '#ffcc66';
      ctx.fillRect(px - 1, py - 1, 2, 2);
      continue;
    }

    if (object.kind === 'shrine') {
      ctx.fillStyle = '#e2ccff';
      ctx.fillRect(px - 1, py - 1, 2, 2);
    }
  }
}

function minimapServiceColor(kind) {
  if (kind === 'marketStall') return '#d9ad4f';
  if (kind === 'bankService') return '#ffcc66';
  if (kind === 'blacksmithService') return '#ef6f2f';
  if (kind === 'alchemistService') return '#b68cff';
  if (kind === 'guildClerk') return '#66f0ff';
  if (kind === 'classTrainerService') return '#73d18a';
  if (kind === 'noticeBoard') return '#e8dcae';
  return '#e8edf5';
}

function drawLocalMinimapEnemies(ctx, world, cx, cy, radius, startX, startY, rangeX, rangeY) {
  for (const enemy of world.enemies || []) {
    if (!enemy || enemy.dead || enemy.hp <= 0 || enemy.remove) continue;

    const tileX = enemy.x / TILE;
    const tileY = enemy.y / TILE;

    if (tileX < startX || tileY < startY || tileX > startX + rangeX || tileY > startY + rangeY) {
      continue;
    }

    const px = cx - radius + ((tileX - startX) / rangeX) * radius * 2;
    const py = cy - radius + ((tileY - startY) / rangeY) * radius * 2;

    ctx.fillStyle = enemy.isBoss ? '#ffcc66' : '#ef6f6c';
    ctx.fillRect(px - 1, py - 1, enemy.isBoss ? 4 : 2, enemy.isBoss ? 4 : 2);
  }
}

function minimapBiomeColor(biomeId) {
  if (biomeId === 'water') return '#263b54';
  if (biomeId === 'path') return '#8b6a42';
  if (biomeId === 'dead') return '#3d2d2d';
  if (biomeId === 'ruin') return '#55505a';
  if (biomeId === 'grass') return '#2f5b36';
  if (biomeId === 'wall') return '#171923';
  if (biomeId === 'ore') return '#333b43';

  return '#263d2a';
}

// -----------------------------------------------------------------------------
// LOW-LEVEL DRAWING HELPERS
// -----------------------------------------------------------------------------

function screen(object, camera) {
  return {
    x: object.x - camera.x,
    y: object.y - camera.y
  };
}

function isOnScreen(ctx, x, y, margin = 60) {
  return (
    x >= -margin &&
    y >= -margin &&
    x <= ctx.canvas.width + margin &&
    y <= ctx.canvas.height + margin
  );
}

function hp(ctx, x, y, value, max) {
  const safeMax = Math.max(1, max || 1);
  const pct = Math.max(0, Math.min(1, (value || 0) / safeMax));
  const width = 38;
  const fillWidth = Math.round((width - 4) * pct);

  ctx.fillStyle = 'rgba(2,3,5,.82)';
  ctx.fillRect(Math.round(x - width / 2), Math.round(y - 1), width, 7);

  ctx.fillStyle = '#5a1f27';
  ctx.fillRect(Math.round(x - width / 2 + 2), Math.round(y + 1), width - 4, 3);

  ctx.fillStyle = pct < 0.28 ? '#d86a4a' : '#c84845';
  ctx.fillRect(Math.round(x - width / 2 + 2), Math.round(y + 1), fillWidth, 3);

  ctx.globalAlpha = 0.58;
  ctx.fillStyle = '#f3a098';
  ctx.fillRect(Math.round(x - width / 2 + 2), Math.round(y + 1), fillWidth, 1);
  ctx.globalAlpha = 1;

  ctx.strokeStyle = 'rgba(237,240,242,0.25)';
  ctx.lineWidth = 1;
  ctx.strokeRect(Math.round(x - width / 2), Math.round(y - 1), width, 7);
}

function enemyNameLabel(ctx, text, x, y, color='#ff7777') {
  if (!text) return;

  ctx.save();

  ctx.font = 'bold 10px sans-serif';
  ctx.textAlign = 'center';

  ctx.fillStyle = 'rgba(0,0,0,.75)';
  ctx.fillText(text, x + 1, y + 1);

  ctx.fillStyle = color;
  ctx.fillText(text, x, y);

  ctx.restore();
}

function circle(ctx, x, y, r) {
  ctx.beginPath();
  ctx.arc(Math.round(x), Math.round(y), r, 0, Math.PI * 2);
  ctx.fill();
}

function circleStroke(ctx, x, y, r) {
  ctx.beginPath();
  ctx.arc(Math.round(x), Math.round(y), r, 0, Math.PI * 2);
  ctx.stroke();
}

function line(ctx, x1, y1, x2, y2) {
  ctx.beginPath();
  ctx.moveTo(Math.round(x1), Math.round(y1));
  ctx.lineTo(Math.round(x2), Math.round(y2));
  ctx.stroke();
}

function triangle(ctx, x1, y1, x2, y2, x3, y3) {
  ctx.beginPath();
  ctx.moveTo(Math.round(x1), Math.round(y1));
  ctx.lineTo(Math.round(x2), Math.round(y2));
  ctx.lineTo(Math.round(x3), Math.round(y3));
  ctx.closePath();
  ctx.fill();
}

function rect(ctx, x, y, w, h) {
  ctx.fillRect(Math.round(x), Math.round(y), Math.round(w), Math.round(h));
}

function poly(ctx, points) {
  if (!points?.length) return;

  ctx.beginPath();
  ctx.moveTo(Math.round(points[0][0]), Math.round(points[0][1]));

  for (let i = 1; i < points.length; i++) {
    ctx.lineTo(Math.round(points[i][0]), Math.round(points[i][1]));
  }

  ctx.closePath();
  ctx.fill();
}

function diamond(ctx, x, y, r) {
  ctx.beginPath();
  ctx.moveTo(Math.round(x), Math.round(y - r));
  ctx.lineTo(Math.round(x + r), Math.round(y));
  ctx.lineTo(Math.round(x), Math.round(y + r));
  ctx.lineTo(Math.round(x - r), Math.round(y));
  ctx.closePath();
  ctx.fill();
}

function drawShadow(ctx, x, y, rx, ry) {
  drawPixelGroundShadow(ctx, x, y, rx, ry, {
    alpha: 0.80
  });
}

function roundedBody(ctx, x, y, w, h) {
  ctx.beginPath();
  ctx.ellipse(Math.round(x), Math.round(y), w, h, 0, 0, Math.PI * 2);
  ctx.fill();
}

function classColor(classId) {
  return getClassAccentColor(classId);
}

function clamp(value, min, max) {
  return Math.max(min, Math.min(max, value));
}
