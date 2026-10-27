import {bowAimRotation} from './bowOrientation.js';
// codeAssets.js
// Runalis equipment and summon presentation. Generated raster assets are used
// where coverage exists; remaining legacy families are tracked in the manifest.
//
// Updated:
// - Fixes scythe blade orientation for all directions.
// - Replaces unreliable mirrored arc scythe blade with facing-specific curve strokes.
// - Keeps summon evolution visuals.
// - Keeps gear visuals driven by equipped item IDs only.
// - ClassId should NOT force armour to appear.
// - Trainers now grant weapons only; armour visuals come strictly from equipment.

import { ITEMS } from './data.js';
import {drawSummonArt} from './summonArt.js';
import {gravecallerMotionPose,gravecallerBodyOffset} from './gravecallerSummonMotion.js';
import {isBoundDeadMorph} from './lichSummonSystem.js';
import { asset,drawWeaponSprite,attackBodyGrip,castBodyGrip,bowBodyGrip,restingWeaponGrip } from './spriteArt.js';
import {meleeArmReady} from './meleeArmArt.js';
import {sampleMeleeRig} from './meleeRig.js';
import {drawEquippedArt,drawWearableArt,drawLegwearArt,drawTrinketArt,equippedArtReady} from './equipmentArt.js';
import {
  drawPixelGroundShadow,
  getClassVisualPalette,
  steppedSine
} from './visualStyle.js';
import { getGearVisualProfile } from './gearVisualStyle.js';

const LEGENDARY_ITEM_STYLE_HINTS = {
  dawnwardAegis: 'aegis veyrglass',
  demonseedScythe: 'demon',
  crownOfTheEndless: 'crown endless',
  veyrglassBlade: 'veyrglass',
  lichboneScythe: 'lich',
  thornheartStaffLegendary: 'thorn',
  mercenarysLastMark: 'mercenary',
  oathplateOfTheLastDawn: 'oath sun',
  ashboundMantle: 'demon ash',
  sunforgedHalo: 'sun',
  briarCovenantGreaves: 'briar thorn',
  runalisLantern: 'lantern sun',
  zephyrglassAmulet: 'zephyr',
  blackstarGreaves: 'blackstar',
  seraphsBrokenWing: 'seraph'
};

// -----------------------------------------------------------------------------
// SUMMON EVOLUTION HELPERS
// -----------------------------------------------------------------------------

export function getSummonEvolutionStage(kind, player) {
  const level = getRelevantSummonLevel(kind, player);

  if (isNecroSummonKind(kind)) {
    if (level >= 60) return 'lichLord';
    if (level >= 35) return 'lich';
    if (level >= 15) return 'skeletalKnight';
    return 'skeletonServant';
  }

  if (isThornSummonKind(kind)) {
    if (level >= 60) return 'thornTitan';
    if (level >= 35) return 'elderThornbeast';
    if (level >= 15) return 'thornbeast';
    return 'thornling';
  }

  if (isEldritchSummonKind(kind)) {
    if (level >= 60) return 'oldHorror';
    if (level >= 35) return 'manyEyedHorror';
    if (level >= 15) return 'starlessHorror';
    return 'lesserHorror';
  }

  return kind || 'unknown';
}

export function getSummonAssetHpOffset(kind, player) {
  const stage = getSummonEvolutionStage(kind, player);

  if (stage === 'lichLord') return 74;
  if (stage === 'lich') return 58;
  if (stage === 'skeletalKnight') return 56;
  if (stage === 'skeletonServant') return 50;

  if (stage === 'thornTitan') return 82;
  if (stage === 'elderThornbeast') return 72;
  if (stage === 'thornbeast') return 62;
  if (stage === 'thornling') return 48;

  if (stage === 'oldHorror') return 78;
  if (stage === 'manyEyedHorror') return 68;
  if (stage === 'starlessHorror') return 58;
  if (stage === 'lesserHorror') return 48;

  return 30;
}

function getRelevantSummonLevel(kind, player) {
  const skills = player?.skillState?.skills || {};

  if (isNecroSummonKind(kind)) {
    return skills.spirit?.level || player?.classLevel || 1;
  }

  if (isThornSummonKind(kind)) {
    return skills.warding?.level || player?.classLevel || 1;
  }

  if (isEldritchSummonKind(kind)) {
    return skills.spirit?.level || player?.classLevel || 1;
  }

  return 1;
}

function isNecroSummonKind(kind) {
  return [
    'lich',
    'skeleton',
    'skeletonServant',
    'skeletalKnight',
    'lichLord',
    'necromancerSummon'
  ].includes(kind);
}

function isThornSummonKind(kind) {
  return [
    'thornbeast',
    'thornling',
    'elderThornbeast',
    'thornTitan',
    'thornbinderSummon'
  ].includes(kind);
}

function isEldritchSummonKind(kind) {
  return [
    'eldritchHorror',
    'lesserHorror',
    'starlessHorror',
    'manyEyedHorror',
    'oldHorror',
    'eldritchSummon'
  ].includes(kind);
}

// -----------------------------------------------------------------------------
// SUMMON ENTRY POINT
// -----------------------------------------------------------------------------

export function drawSummonAsset(ctx, summon, player, x, y) {
  const stage = summon.evolutionStage || getSummonEvolutionStage(summon.kind, player);
  // Coterie gear still contributes stats; a morphed actor keeps its authored body.
  if(isBoundDeadMorph(summon)&&drawSummonArt(ctx,summon,stage,x,y))return;
  if (['wolf','miniDemon'].includes(summon.kind) && drawSummonArt(ctx,summon,summon.kind,x,y)) return;
  const marksman=isNecroSummonKind(summon.kind)&&/marksman/i.test(summon.skeletonRole||summon.skeletonRoleName||summon.role||'');
  const visualSummon=marksman&&!summon.coterieEquipment?.weapon?{...summon,coterieEquipment:{...(summon.coterieEquipment||{}),weapon:'hunterBow'}}:summon;
  if(isNecroSummonKind(summon.kind)&&Object.values(visualSummon.coterieEquipment||{}).some(Boolean)){
    if(drawEquippedSkeletonArt(ctx,visualSummon,stage,x,y,summon))return;
    // Keep the original attachment fallback while the authored body loads.
    drawNecromancerSummon(ctx,stage,visualSummon,x,y);return;
  }
  if(drawSummonArt(ctx,summon,stage,x,y))return;

  if (
    isNecroSummonKind(summon.kind) ||
    ['skeletonServant', 'skeletalKnight', 'lich', 'lichLord'].includes(stage)
  ) {
    drawNecromancerSummon(ctx, stage, summon, x, y);
    return;
  }

  if (
    isThornSummonKind(summon.kind) ||
    ['thornling', 'thornbeast', 'elderThornbeast', 'thornTitan'].includes(stage)
  ) {
    drawThornSummon(ctx, stage, summon, x, y);
    return;
  }

  if (
    isEldritchSummonKind(summon.kind) ||
    ['lesserHorror', 'starlessHorror', 'manyEyedHorror', 'oldHorror'].includes(stage)
  ) {
    drawEldritchSummon(ctx, stage, summon, x, y);
    return;
  }

  drawSpectralHandAsset(ctx, summon, x, y);
}

// -----------------------------------------------------------------------------
// NECROMANCER SUMMON EVOLUTION
// -----------------------------------------------------------------------------

function drawEquippedSkeletonArt(ctx,summon,stage,x,y,identity=summon){
  if(!['skeletonServant','skeletalKnight'].includes(stage))return false;
  const sheet=asset('skeleton-forge');if(!sheet?.ready)return false;
  const {frame,facing}=gravecallerMotionPose(identity);
  const scale=stage==='skeletalKnight'?.75:.68,gear=getSummonCoterieGear(summon);
  ctx.save();ctx.translate(Math.round(x),Math.round(y));ctx.scale(facing===-1?1:-1,1);ctx.imageSmoothingEnabled=false;
  drawPixelGroundShadow(ctx,0,16,stage==='skeletalKnight'?19:16,5,.4);
  ctx.drawImage(sheet.image,frame*96,0,96,112,gravecallerBodyOffset('skeleton-forge',frame,scale)-Math.round(48*scale),16-Math.round(106*scale),Math.round(96*scale),Math.round(112*scale));
  // Body alignment keeps armour attached to a stable torso through each stride.
  const armour=gear.armour||(stage==='skeletalKnight'?ITEMS.graveboundChest:null);
  if(armour)drawWearableArt(ctx,getCoterieGearProfile(armour),'left',0,-10,0,{state:'idle',bodyType:'male'});
  if(stage==='skeletalKnight')drawWearableArt(ctx,getCoterieGearProfile(ITEMS.graveboundHelm),'left',0,-6,0,{state:'idle',bodyType:'male'});
  if(gear.charm)drawTrinketArt(ctx,getCoterieGearProfile(gear.charm),'left',0,-10,0);
  const hand=frame===3?[-29,-30]:frame===1||frame===2?[-15,-15]:[-11,-17];
  const weapon=gear.weapon||ITEMS.blackIronSword;
  drawEquippedArt(ctx,weapon.id,getCoterieGearProfile(weapon),hand[0],hand[1],-1);
  ctx.restore();return true;
}
asset('skeleton-forge');

function drawNecromancerSummon(ctx, stage, summon, x, y) {
  if (stage === 'lichLord') {
    drawLichLord(ctx, summon, x, y);
  } else if (stage === 'lich') {
    drawLich(ctx, summon, x, y);
  } else if (stage === 'skeletalKnight') {
    drawSkeletalKnight(ctx, summon, x, y);
  } else {
    drawSkeletonServant(ctx, summon, x, y);
  }
}

function drawSkeletonServant(ctx, summon, x, y) {
  const t = summon.walkTime || 0;
  const bob = steppedSine(t, 2.4, 1.25, 8);
  const step = steppedSine(t, 4.2, 2, 9);
  const coterieGear = getSummonCoterieGear(summon);

  shadow(ctx, x, y + 15, 17, 5);

  fill(ctx, '#d9cfb8');
  rect(ctx, x - 10, y - 42 + bob, 20, 18);
  rect(ctx, x - 7, y - 45 + bob, 14, 4);

  fill(ctx, '#efe6d0');
  rect(ctx, x - 7, y - 41 + bob, 5, 4);
  rect(ctx, x + 2, y - 41 + bob, 5, 4);

  fill(ctx, '#16130f');
  rect(ctx, x - 6, y - 36 + bob, 4, 5);
  rect(ctx, x + 3, y - 36 + bob, 4, 5);
  rect(ctx, x - 2, y - 30 + bob, 4, 4);

  fill(ctx, '#c7bba5');
  rect(ctx, x - 3, y - 24 + bob, 6, 5);

  fill(ctx, '#d9cfb8');
  rect(ctx, x - 8, y - 20 + bob, 16, 4);
  rect(ctx, x - 7, y - 14 + bob, 14, 3);
  rect(ctx, x - 6, y - 8 + bob, 12, 3);

  stroke(ctx, '#d9cfb8', 3);
  line(ctx, x - 8, y - 20 + bob, x - 11, y - 2 + bob);
  line(ctx, x + 8, y - 20 + bob, x + 11, y - 2 + bob);
  line(ctx, x, y - 20 + bob, x, y + 2 + bob);

  fill(ctx, '#4b255d');
  rect(ctx, x - 8, y + 0 + bob, 16, 10);
  fill(ctx, '#7d36a4');
  rect(ctx, x - 4, y + 0 + bob, 8, 12);
  drawSkeletonCoterieArmour(ctx, coterieGear.armour, x, y, bob);
  drawSkeletonCoterieCharm(ctx, coterieGear.charm, x, y, bob);

  stroke(ctx, '#c7bba5', 4);
  line(ctx, x - 11, y - 18 + bob, x - 22, y - 5 + bob);
  line(ctx, x + 11, y - 18 + bob, x + 22, y - 5 + bob);

  stroke(ctx, '#d9cfb8', 3);
  line(ctx, x - 22, y - 5 + bob, x - 19, y + 8 + bob);
  line(ctx, x + 22, y - 5 + bob, x + 19, y + 8 + bob);

  stroke(ctx, '#c7bba5', 4);
  line(ctx, x - 5, y + 9 + bob, x - 10, y + 25 + step);
  line(ctx, x + 5, y + 9 + bob, x + 11, y + 25 - step);

  fill(ctx, '#c7bba5');
  rect(ctx, x - 14, y + 24 + step, 9, 3);
  rect(ctx, x + 7, y + 24 - step, 9, 3);

  if (coterieGear.weapon) {
    drawSkeletonCoterieWeapon(ctx, coterieGear.weapon, x, y, bob);
  } else if(!summon.suppressDefaultWeapon) {
    drawSkeletonDefaultWeapon(ctx, x, y, bob);
  }
}

function getSummonCoterieGear(summon) {
  const equipment = summon?.coterieEquipment || {};
  return {
    weapon: equipment.weapon ? ITEMS[equipment.weapon] : null,
    armour: equipment.armour ? ITEMS[equipment.armour] : null,
    charm: equipment.charm ? ITEMS[equipment.charm] : null
  };
}

function getCoterieGearProfile(item) {
  return item ? getGearVisualProfile(item.id, item, 'gravecaller') : null;
}

function drawSkeletonCoterieArmour(ctx, item, x, y, bob) {
  const profile = getCoterieGearProfile(item);
  if (!profile) return;

  fill(ctx, profile.deep);
  rect(ctx, x - 10, y - 21 + bob, 20, 6);
  rect(ctx, x - 8, y - 14 + bob, 16, 10);

  fill(ctx, profile.base);
  rect(ctx, x - 7, y - 19 + bob, 14, 5);
  rect(ctx, x - 6, y - 12 + bob, 12, 7);

  stroke(ctx, profile.light, 1);
  line(ctx, x - 6, y - 15 + bob, x + 6, y - 15 + bob);
}

function drawSkeletonCoterieCharm(ctx, item, x, y, bob) {
  const profile = getCoterieGearProfile(item);
  if (!profile) return;

  stroke(ctx, profile.accent, 2);
  circleStroke(ctx, x - 13, y - 10 + bob, 5);
  fill(ctx, profile.light);
  rect(ctx, x - 14, y - 11 + bob, 3, 3);
}

function drawSkeletonCoterieWeapon(ctx, item, x, y, bob) {
  const profile = getCoterieGearProfile(item);
  const weaponType = item?.weaponType || profile?.weaponType || 'sword';
  const haft = profile?.deep || '#61422b';
  const edge = profile?.light || '#bfc4c8';
  const glow = profile?.accent || '#a86bd6';

  if (weaponType === 'staff' || weaponType === 'spiritFocus') {
    stroke(ctx, haft, 4);
    line(ctx, x - 26, y - 13 + bob, x - 35, y + 17 + bob);
    stroke(ctx, edge, 2);
    line(ctx, x - 26, y - 13 + bob, x - 35, y + 17 + bob);
    fill(ctx, glow);
    circle(ctx, x - 25, y - 16 + bob, weaponType === 'spiritFocus' ? 6 : 4);
    fill(ctx, edge);
    circle(ctx, x - 25, y - 16 + bob, 2);
    return;
  }

  if (weaponType === 'bow') {
    stroke(ctx, edge, 3);
    arc(ctx, x - 29, y + 2 + bob, 9, -Math.PI * 0.62, Math.PI * 0.62);
    stroke(ctx, haft, 1);
    line(ctx, x - 29, y - 6 + bob, x - 29, y + 10 + bob);
    return;
  }

  if (weaponType === 'scythe') {
    stroke(ctx, haft, 4);
    line(ctx, x - 25, y - 10 + bob, x - 35, y + 18 + bob);
    stroke(ctx, edge, 3);
    arc(ctx, x - 35, y - 12 + bob, 13, Math.PI * 0.12, Math.PI * 0.82);
    stroke(ctx, glow, 1);
    arc(ctx, x - 35, y - 12 + bob, 9, Math.PI * 0.12, Math.PI * 0.82);
    return;
  }

  stroke(ctx, edge, 4);
  line(ctx, x - 24, y + 0 + bob, x - 31, y + 15 + bob);
  stroke(ctx, haft, 2);
  line(ctx, x - 31, y + 13 + bob, x - 25, y + 18 + bob);
}

function drawSkeletonDefaultWeapon(ctx, x, y, bob) {
  stroke(ctx, '#bfc4c8', 3);
  line(ctx, x - 24, y + 0 + bob, x - 31, y + 13 + bob);
  stroke(ctx, '#7f858a', 2);
  line(ctx, x - 31, y + 13 + bob, x - 25, y + 18 + bob);
}

function drawSkeletalKnight(ctx, summon, x, y) {
  const t = summon.walkTime || 0;
  const bob = steppedSine(t, 2.2, 1, 8);

  drawSkeletonServant(ctx, {...summon,suppressDefaultWeapon:true}, x, y);

  fill(ctx, '#60666a');
  rect(ctx, x - 12, y - 48 + bob, 24, 7);
  rect(ctx, x - 9, y - 53 + bob, 18, 5);

  fill(ctx, '#35383c');
  rect(ctx, x - 4, y - 55 + bob, 8, 3);

  fill(ctx, '#6b7074');
  rect(ctx, x - 18, y - 22 + bob, 8, 6);
  rect(ctx, x + 10, y - 22 + bob, 8, 6);

  fill(ctx, '#4f565b');
  rect(ctx, x + 22, y - 18 + bob, 14, 22);
  stroke(ctx, '#c7bba5', 2);
  rectStroke(ctx, x + 22, y - 18 + bob, 14, 22);

  if(!getSummonCoterieGear(summon).weapon){
    stroke(ctx, '#bfc4c8', 4);
    line(ctx, x - 26, y - 12 + bob, x - 37, y + 15 + bob);
    stroke(ctx, '#61422b', 3);
    line(ctx, x - 23, y - 7 + bob, x - 29, y + 1 + bob);
  }
}

function drawLich(ctx, summon, x, y) {
  const t = summon.walkTime || 0;
  const bob = Math.sin(t * 2.1) * 1.8;

  shadow(ctx, x, y + 17, 19, 6);

  fill(ctx, '#1f1629');
  poly(ctx, [
    [x - 17, y - 31 + bob],
    [x + 17, y - 31 + bob],
    [x + 22, y + 17 + bob],
    [x + 8, y + 8 + bob],
    [x, y + 21 + bob],
    [x - 8, y + 8 + bob],
    [x - 22, y + 17 + bob]
  ]);

  fill(ctx, '#4b255d');
  poly(ctx, [
    [x - 10, y - 25 + bob],
    [x + 10, y - 25 + bob],
    [x + 13, y + 10 + bob],
    [x, y + 17 + bob],
    [x - 13, y + 10 + bob]
  ]);

  fill(ctx, '#111018');
  rect(ctx, x - 14, y - 47 + bob, 28, 20);
  rect(ctx, x - 10, y - 52 + bob, 20, 6);

  fill(ctx, '#d9cfb8');
  rect(ctx, x - 8, y - 43 + bob, 16, 13);

  fill(ctx, '#16130f');
  rect(ctx, x - 6, y - 39 + bob, 4, 4);
  rect(ctx, x + 2, y - 39 + bob, 4, 4);
  rect(ctx, x - 2, y - 34 + bob, 4, 3);

  fill(ctx, '#a833ff');
  rect(ctx, x - 5, y - 38 + bob, 2, 2);
  rect(ctx, x + 4, y - 38 + bob, 2, 2);

  stroke(ctx, '#8b6f4e', 4);
  line(ctx, x + 20, y - 32 + bob, x + 29, y + 18 + bob);

  fill(ctx, '#a833ff');
  circle(ctx, x + 18, y - 36 + bob, 5);
}

function drawLichLord(ctx, summon, x, y) {
  const t = summon.walkTime || 0;
  const bob = Math.sin(t * 2) * 1.6;

  drawLich(ctx, summon, x, y);

  fill(ctx, '#9c8a61');
  rect(ctx, x - 14, y - 58 + bob, 28, 5);
  rect(ctx, x - 13, y - 68 + bob, 5, 10);
  rect(ctx, x - 2, y - 70 + bob, 5, 12);
  rect(ctx, x + 9, y - 68 + bob, 5, 10);

  fill(ctx, '#a833ff');
  rect(ctx, x - 1, y - 66 + bob, 3, 3);

  stroke(ctx, '#7d36a4', 3);
  line(ctx, x - 21, y - 17 + bob, x - 29, y + 20 + bob);
  line(ctx, x + 21, y - 17 + bob, x + 29, y + 20 + bob);

  fill(ctx, 'rgba(168,51,255,0.75)');
  rect(ctx, x - 34, y - 20 + bob, 3, 3);
  rect(ctx, x + 34, y - 7 + bob, 2, 2);
  rect(ctx, x + 28, y - 34 + bob, 2, 2);
}

// -----------------------------------------------------------------------------
// THORNBINDER SUMMON EVOLUTION
// -----------------------------------------------------------------------------

function drawThornSummon(ctx, stage, summon, x, y) {
  if (stage === 'thornTitan') {
    drawThornTitan(ctx, summon, x, y);
  } else if (stage === 'elderThornbeast') {
    drawElderThornbeast(ctx, summon, x, y);
  } else if (stage === 'thornbeast') {
    drawThornbeastAsset(ctx, summon, x, y, 1);
  } else {
    drawThornling(ctx, summon, x, y);
  }
}

function drawThornling(ctx, summon, x, y) {
  drawThornbeastAsset(ctx, summon, x, y + 6, 0.68);
}

function drawElderThornbeast(ctx, summon, x, y) {
  drawThornbeastAsset(ctx, summon, x, y - 4, 1.28);

  const t = summon.walkTime || 0;
  const bob = Math.sin(t * 2.1) * 1.2;

  fill(ctx, '#e2403c');
  triangle(ctx, x - 18, y - 3 + bob, x - 31, y - 12 + bob, x - 17, y - 15 + bob);
  triangle(ctx, x + 18, y + 0 + bob, x + 33, y - 7 + bob, x + 19, y - 13 + bob);
}

function drawThornTitan(ctx, summon, x, y) {
  drawThornbeastAsset(ctx, summon, x, y - 10, 1.55);

  const t = summon.walkTime || 0;
  const bob = Math.sin(t * 2.1) * 1.1;

  stroke(ctx, '#2e572f', 8);
  line(ctx, x - 22, y + 12 + bob, x - 35, y + 38 + bob);
  line(ctx, x + 22, y + 12 + bob, x + 37, y + 38 + bob);

  fill(ctx, '#e2403c');
  triangle(ctx, x - 30, y + 4 + bob, x - 45, y - 3 + bob, x - 31, y - 9 + bob);
  triangle(ctx, x + 31, y + 4 + bob, x + 47, y - 2 + bob, x + 32, y - 9 + bob);
}

function drawThornbeastAsset(ctx, summon, x, y, scale = 1) {
  const t = summon.walkTime || 0;
  const bob = Math.sin(t * 2.1) * 1.4;
  const jaw = Math.sin(t * 3.8) * 1.8;

  ctx.save();
  ctx.translate(x, y);
  ctx.scale(scale, scale);

  shadow(ctx, 0, 20, 24, 7);

  stroke(ctx, '#305c2f', 7);
  line(ctx, -8, 12, -19, 28);
  line(ctx, 8, 12, 20, 28);

  stroke(ctx, '#4f8a3f', 5);
  line(ctx, -3, 11, -8, 29);
  line(ctx, 14, 8, 7, 29);

  stroke(ctx, '#2c4d28', 11);
  ctx.beginPath();
  ctx.moveTo(0, 17);
  ctx.quadraticCurveTo(-17, -2, -2, -22 + bob);
  ctx.quadraticCurveTo(11, -38 + bob, 4, -54 + bob);
  ctx.stroke();

  stroke(ctx, '#5f9d45', 7);
  ctx.beginPath();
  ctx.moveTo(0, 15);
  ctx.quadraticCurveTo(-13, -2, 0, -21 + bob);
  ctx.quadraticCurveTo(10, -36 + bob, 4, -51 + bob);
  ctx.stroke();

  fill(ctx, '#3d6f32');
  poly(ctx, [[-15, -1], [-39, -10], [-42, 8], [-24, 12], [-8, 5]]);

  fill(ctx, '#487d38');
  poly(ctx, [[10, -5], [34, -13], [42, 4], [24, 11], [11, 5]]);

  stroke(ctx, '#294a26', 2);
  line(ctx, -35, 0, -12, 4);
  line(ctx, 16, 4, 36, -1);

  ctx.save();
  ctx.translate(0, -54 + bob);
  ctx.rotate(-0.16);

  fill(ctx, '#d8272c');
  poly(ctx, [
    [-29, 5], [-51, -6], [-31, -8], [-49, -22], [-24, -17], [-30, -34],
    [-10, -21], [6, -31], [11, -15], [30, -18], [19, -3], [34, 8], [13, 9], [-4, 14]
  ]);

  fill(ctx, '#f05a53');
  poly(ctx, [
    [-24, 1], [-43, -7], [-22, -7], [-37, -18], [-14, -11], [-22, -27],
    [-5, -17], [8, -24], [8, -10], [25, -13], [14, -1], [27, 7], [8, 7], [-4, 11]
  ]);

  fill(ctx, '#a92128');
  poly(ctx, [[-25, 6], [-8, 18 + jaw], [16, 17 + jaw], [31, 8], [10, 7], [-8, 10], [-25, 6]]);

  fill(ctx, '#f06b65');
  poly(ctx, [[-13, 9], [-2, 14 + jaw], [12, 13 + jaw], [3, 10], [-9, 11]]);

  fill(ctx, '#090909');
  rect(ctx, 6, -11, 9, 9);
  fill(ctx, '#ffffff');
  rect(ctx, 11, -8, 2, 2);

  fill(ctx, '#e8dfc7');
  triangle(ctx, -18, 5, -13, 14, -8, 6);
  triangle(ctx, -4, 7, 0, 16, 5, 7);
  triangle(ctx, 13, 7, 17, 14, 22, 7);

  ctx.restore();

  fill(ctx, '#d8272c');
  triangle(ctx, -13, -24 + bob, -26, -31 + bob, -13, -35 + bob);
  triangle(ctx, 11, -18 + bob, 24, -23 + bob, 12, -30 + bob);
  triangle(ctx, -10, 3, -21, -3, -11, -9);
  triangle(ctx, 15, 8, 27, 3, 16, -4);

  ctx.restore();
}

// -----------------------------------------------------------------------------
// ELDRITCH SUMMON EVOLUTION
// -----------------------------------------------------------------------------

function drawEldritchSummon(ctx, stage, summon, x, y) {
  const scale =
    stage === 'oldHorror' ? 1.55 :
    stage === 'manyEyedHorror' ? 1.28 :
    stage === 'starlessHorror' ? 1.05 :
    0.72;

  const t = summon.walkTime || 0;
  const bob = steppedSine(t, 2.4, 2, 8);
  const pulse = 1 + steppedSine(t, 4.6, 0.08, 10);

  ctx.save();
  ctx.translate(x, y + bob);
  ctx.scale(scale, scale);

  shadow(ctx, 0, 18, 24, 7);

  ctx.globalAlpha = 0.22;
  fill(ctx, '#ef4056');
  circle(ctx, 0, -18, 24 * pulse);

  ctx.globalAlpha = 1;
  stroke(ctx, '#151019', 9);
  for (let i = 0; i < 5; i++) {
    const angle = t * 0.9 + i * Math.PI * 0.4;
    const sx = Math.cos(angle) * 10;
    const sy = -18 + Math.sin(angle) * 7;
    const ex = Math.cos(angle + 0.9) * (26 + i % 2 * 7);
    const ey = -18 + Math.sin(angle + 0.9) * (18 + i % 3 * 5);
    line(ctx, sx, sy, ex, ey);
  }

  stroke(ctx, '#ef4056', 3);
  for (let i = 0; i < 5; i++) {
    const angle = -t * 1.1 + i * Math.PI * 0.4;
    line(ctx, Math.cos(angle) * 8, -18 + Math.sin(angle) * 5, Math.cos(angle + 1.1) * 25, -18 + Math.sin(angle + 1.1) * 16);
  }

  fill(ctx, '#100a12');
  ctx.beginPath();
  ctx.ellipse(0, -20, 18, 24, Math.sin(t) * 0.08, 0, Math.PI * 2);
  ctx.fill();

  stroke(ctx, '#40111b', 3);
  circleStroke(ctx, 0, -20, 18);

  fill(ctx, '#ef4056');
  circle(ctx, 0, -24, 7);
  fill(ctx, '#090609');
  circle(ctx, 0, -24, 3);

  if (stage === 'manyEyedHorror' || stage === 'oldHorror') {
    for (const eye of [[-9, -14], [10, -16], [-6, -31], [8, -34]]) {
      fill(ctx, '#ff8b98');
      circle(ctx, eye[0], eye[1], 3);
      fill(ctx, '#090609');
      circle(ctx, eye[0], eye[1], 1.2);
    }
  }

  if (stage === 'oldHorror') {
    stroke(ctx, '#ef4056', 4);
    circleStroke(ctx, 0, -20, 30 + Math.sin(t * 3) * 2);
    stroke(ctx, '#050306', 2);
    circleStroke(ctx, 0, -20, 36 + Math.cos(t * 2.2) * 2);
  }

  ctx.restore();
}

// -----------------------------------------------------------------------------
// SPECTRAL HAND
// -----------------------------------------------------------------------------

function drawSpectralHandAsset(ctx, summon, x, y) {
  const t = summon.walkTime || 0;
  const bob = Math.sin(t * 3) * 1.5;

  shadow(ctx, x, y + 9, 10, 4);

  fill(ctx, 'rgba(182,140,255,0.78)');
  rect(ctx, x - 5, y - 4 + bob, 10, 10);

  rect(ctx, x - 7, y - 14 + bob, 3, 10);
  rect(ctx, x - 3, y - 17 + bob, 3, 13);
  rect(ctx, x + 1, y - 16 + bob, 3, 12);
  rect(ctx, x + 5, y - 12 + bob, 3, 9);

  fill(ctx, 'rgba(182,140,255,0.45)');
  rect(ctx, x - 3, y + 6 + bob, 6, 7);

  stroke(ctx, 'rgba(182,140,255,0.9)', 2);
  line(ctx, x - 2, y + 13 + bob, x - 7, y + 21 + bob);
  line(ctx, x + 2, y + 13 + bob, x + 7, y + 21 + bob);
}

// -----------------------------------------------------------------------------
// PLAYER / GEAR ASSETS
// -----------------------------------------------------------------------------

export function drawCodeGear(ctx, actor, camera, options = {}) {
  const equipment = actor.equipment || {};
  const layer = options.layer || 'all';

  const facing = options.facing || getFacing(actor.dirX ?? 0, actor.dirY ?? 1);
  const bob = options.bob || 0;
  const step = options.step || 0;
  const armSwing = options.armSwing || 0;

  if (options.local) {
    drawCodeGearLayer(ctx, actor, 0, 0, equipment, {
      ...options,
      layer,
      facing,
      bob,
      step,
      armSwing
    });

    return;
  }

  const x = actor.x - camera.x;
  const y = actor.y - camera.y;

  drawCodeGearLayer(ctx, actor, x, y, equipment, {
    ...options,
    layer,
    facing,
    bob,
    step,
    armSwing
  });
}

function drawCodeGearLayer(ctx, actor, x, y, equipment, options) {
  const layer = options.layer || 'all';

  if (layer === 'all' || layer === 'outfit') {
    drawOutfitOverlay(ctx, actor, x, y, equipment, options);
  }

  if (layer === 'all' || layer === 'trinket') {
    drawTrinketAsset(ctx, x, y, equipment.trinket, options);
  }

  if (layer === 'all' || layer === 'weapon') {
    drawWeaponAsset(ctx, actor, x, y, equipment.weapon, options);
  }
}

function drawOutfitOverlay(ctx, actor, x, y, equipment, options = {}) {
  let chest = normalizeItemId(equipment.chest);
  let helm = normalizeItemId(equipment.helm);
  let legs = normalizeItemId(equipment.legs);

  const facing = options.facing || 'down';
  const bob = options.bob || 0;
  const step = options.step || 0;
  const animationPose = options.animationPose || null;
  const cloakSway = options.animationPose?.cloakSway || 0;
  const gear = {
    chest: chest ? getGearVisualProfile(chest, ITEMS[chest], actor.classId) : null,
    helm: helm ? getGearVisualProfile(helm, ITEMS[helm], actor.classId) : null,
    legs: legs ? getGearVisualProfile(legs, ITEMS[legs], actor.classId) : null
  };

  // Completed raster layers replace the corresponding procedural garment.
  if(drawLegwearArt(ctx,gear.legs,facing,x,y,bob,step,animationPose||{})){legs=null;gear.legs=null;}
  if(drawWearableArt(ctx,gear.chest,facing,x,y,bob,animationPose||{})){chest=null;gear.chest=null;}
  if(drawWearableArt(ctx,gear.helm,facing,x,y,bob,animationPose||{})){helm=null;gear.helm=null;}

  drawGeneratedWearableBase(ctx, x, y, {
    gear,
    facing,
    bob,
    step,
    animationPose,
    cloakSway
  });

  if (facing === 'up') {
    drawBackOutfit(ctx, x, y, { chest, helm, legs, bob, step, animationPose });
  } else if (facing === 'left' || facing === 'right') {
    drawSideOutfit(ctx, x, y, {
      chest,
      helm,
      legs,
      bob,
      step,
      animationPose,
      side: facing === 'left' ? -1 : 1
    });
  } else {
    drawFrontOutfit(ctx, x, y, { chest, helm, legs, bob, step, animationPose });
  }

  drawOutfitSecondaryMotion(ctx, x, y, {
    chest,
    facing,
    bob,
    cloakSway
  });

  drawGeneratedWearableDetails(ctx, x, y, {
    gear,
    facing,
    bob,
    step,
    animationPose,
    cloakSway
  });
}

function drawGeneratedWearableBase(ctx, x, y, data) {
  const { gear, facing, bob, step, animationPose, cloakSway } = data;
  const sideView = facing === 'left' || facing === 'right';
  const side = facing === 'left' ? -1 : 1;
  const chest = gear.chest;
  const helm = gear.helm;
  const legs = gear.legs;

  ctx.save();

  if (chest) {
    const width = sideView ? 19 : chest.silhouette === 'plate' ? 27 : 23;
    const left = x - width / 2;
    const hem = chest.silhouette === 'robe' ? 7 : chest.silhouette === 'coat' ? 4 : 1;

    fill(ctx, chest.outline);
    if (sideView) {
      poly(ctx, [
        [left - 2, y - 27 + bob],
        [left + width + 2, y - 27 + bob],
        [left + width + 1 + side * hem, y + 5 + bob],
        [left - 1 + side * cloakSway * 0.25, y + 5 + bob]
      ]);
    } else {
      poly(ctx, [
        [left - 2, y - 27 + bob],
        [left + width + 2, y - 27 + bob],
        [left + width + hem, y + 5 + bob],
        [left - hem, y + 5 + bob]
      ]);
    }

    fill(ctx, chest.base);
    if (sideView) {
      poly(ctx, [
        [left, y - 25 + bob],
        [left + width, y - 25 + bob],
        [left + width - 1 + side * hem, y + 3 + bob],
        [left + 1 + side * cloakSway * 0.2, y + 3 + bob]
      ]);
    } else {
      poly(ctx, [
        [left, y - 25 + bob],
        [left + width, y - 25 + bob],
        [left + width - 2 + hem, y + 3 + bob],
        [left + 2 - hem, y + 3 + bob]
      ]);
    }

    if (chest.silhouette === 'plate') {
      fill(ctx, chest.mid);
      rect(ctx, left + 3, y - 23 + bob, width - 6, 5);
    }
  }

  if (legs) {
    drawMovingLegArmourPair(ctx, x, y, {
      facing,
      bob,
      step,
      animationPose,
      deep: legs.deep,
      layer: 'base'
    });
  }

  if (helm) {
    fill(ctx, helm.outline);
    if (helm.silhouette === 'hood') {
      poly(ctx, [
        [x, y - 53 + bob],
        [x + (sideView ? side * 12 : 13), y - 44 + bob],
        [x + (sideView ? side * 10 : 11), y - 28 + bob],
        [x - (sideView ? side * 8 : 11), y - 28 + bob],
        [x - (sideView ? side * 10 : 13), y - 44 + bob]
      ]);
    } else if (helm.silhouette === 'helmet') {
      poly(ctx, [
        [x - 12, y - 43 + bob],
        [x - 7, y - 51 + bob],
        [x + 7, y - 51 + bob],
        [x + 12, y - 43 + bob],
        [x + 10, y - 30 + bob],
        [x - 10, y - 30 + bob]
      ]);
    }
  }

  ctx.restore();
}

function drawGeneratedWearableDetails(ctx, x, y, data) {
  const { gear, facing, bob, step, animationPose, cloakSway } = data;
  const sideView = facing === 'left' || facing === 'right';
  const side = facing === 'left' ? -1 : 1;
  const chest = gear.chest;
  const helm = gear.helm;
  const legs = gear.legs;

  ctx.save();

  if (chest) {
    fill(ctx, chest.deep);
    if (sideView) {
      rect(ctx, x - 7, y - 12 + bob, 14, 4);
      rect(ctx, x + side * 7 - 2, y - 23 + bob, 5, 11);
    } else {
      rect(ctx, x - 10, y - 12 + bob, 20, 4);
      rect(ctx, x - 16, y - 23 + bob, 6, chest.silhouette === 'plate' ? 9 : 6);
      rect(ctx, x + 10, y - 23 + bob, 6, chest.silhouette === 'plate' ? 9 : 6);
    }

    fill(ctx, chest.accent);
    if (sideView) {
      rect(ctx, x + side * 4 - 1, y - 22 + bob, 3, 18);
    } else {
      rect(ctx, x - 2, y - 22 + bob, 4, 19);
    }

    fill(ctx, chest.light);
    if (chest.silhouette === 'plate') {
      rect(ctx, sideView ? x - 4 : x - 7, y - 22 + bob, sideView ? 8 : 14, 2);
    } else if (chest.silhouette === 'coat' || chest.silhouette === 'robe') {
      stroke(ctx, chest.light, 1);
      line(ctx, x, y - 20 + bob, x + (sideView ? side * cloakSway : cloakSway * 0.3), y + 2 + bob);
    }
  }

  if (legs) {
    drawMovingLegArmourPair(ctx, x, y, {
      facing,
      bob,
      step,
      animationPose,
      base: legs.base,
      accent: legs.accent,
      light: legs.light,
      layer: 'detail'
    });
  }

  if (helm) {
    if (helm.silhouette === 'hood') {
      fill(ctx, helm.base);
      poly(ctx, [
        [x, y - 50 + bob],
        [x + (sideView ? side * 9 : 10), y - 43 + bob],
        [x + (sideView ? side * 7 : 8), y - 31 + bob],
        [x - (sideView ? side * 6 : 8), y - 31 + bob],
        [x - (sideView ? side * 8 : 10), y - 43 + bob]
      ]);
      fill(ctx, helm.deep);
      rect(ctx, sideView ? x + side * 1 - 5 : x - 6, y - 40 + bob, 12, 9);
    } else if (helm.silhouette === 'helmet') {
      fill(ctx, helm.base);
      poly(ctx, [
        [x - 10, y - 43 + bob],
        [x - 6, y - 48 + bob],
        [x + 6, y - 48 + bob],
        [x + 10, y - 43 + bob],
        [x + 8, y - 32 + bob],
        [x - 8, y - 32 + bob]
      ]);
      fill(ctx, helm.light);
      rect(ctx, x - 7, y - 46 + bob, 14, 3);
      fill(ctx, helm.deep);
      rect(ctx, sideView ? x + side * 1 - 6 : x - 7, y - 39 + bob, sideView ? 7 : 14, 3);
      fill(ctx, helm.accent);
      rect(ctx, x - 1, y - 49 + bob, 2, 9);
    }
  }

  ctx.restore();
}

function drawOutfitSecondaryMotion(ctx, x, y, data) {
  const { chest, facing, bob, cloakSway } = data;
  const profile = chest ? getGearVisualProfile(chest, ITEMS[chest]) : null;
  const flowing = profile?.silhouette === 'robe' || profile?.silhouette === 'coat';
  if (!flowing || Math.abs(cloakSway) < 0.2) return;

  const colors = { base: profile.deep, edge: profile.accent };
  const sway = Math.max(-3, Math.min(3, cloakSway));
  const side = facing === 'left' ? -1 : 1;

  ctx.save();
  fill(ctx, colors.base);

  if (facing === 'left' || facing === 'right') {
    poly(ctx, [
      [x - side * 4, y - 5 + bob],
      [x + side * 7, y - 5 + bob],
      [x + side * (8 + sway), y + 6 + bob],
      [x - side * (3 - sway * 0.35), y + 4 + bob]
    ]);
    stroke(ctx, colors.edge, 1);
    line(ctx, x + side * 6, y - 4 + bob, x + side * (8 + sway), y + 5 + bob);
  } else {
    poly(ctx, [
      [x - 10, y - 4 + bob],
      [x + 10, y - 4 + bob],
      [x + 9 + sway, y + 6 + bob],
      [x - 9 + sway, y + 6 + bob]
    ]);
    stroke(ctx, colors.edge, 1);
    line(ctx, x + sway * 0.35, y - 3 + bob, x + sway, y + 5 + bob);
  }

  ctx.restore();
}

function drawFrontOutfit(ctx, x, y, data) {
  const { chest, helm, legs, bob, step, animationPose } = data;

  if (isLegendaryArmour(chest)) {
    drawLegendaryChest(ctx, x, y, chest, bob, 'front');
  }

  if (chest === 'necromancerRobe') {
    fill(ctx, '#17111f');
    rect(ctx, x - 12, y - 25 + bob, 24, 29);
    fill(ctx, '#5a2c74');
    rect(ctx, x - 9, y - 23 + bob, 18, 24);
    fill(ctx, '#2d1739');
    rect(ctx, x - 13, y - 21 + bob, 4, 23);
    rect(ctx, x + 9, y - 21 + bob, 4, 23);
  }

  if (chest === 'thornbinderGarb') {
    fill(ctx, '#365b2e');
    rect(ctx, x - 10, y - 24 + bob, 20, 24);
    fill(ctx, '#75a957');
    rect(ctx, x - 4, y - 24 + bob, 8, 24);
    stroke(ctx, '#2e572f', 2);
    line(ctx, x - 9, y - 12 + bob, x + 9, y - 19 + bob);
  }

  if (chest === 'knightChest' || chest === 'wardedChest') {
    fill(ctx, '#8c9297');
    rect(ctx, x - 12, y - 24 + bob, 24, 20);
    fill(ctx, '#b8bec4');
    rect(ctx, x - 9, y - 22 + bob, 18, 4);
    fill(ctx, '#6f777d');
    rect(ctx, x - 15, y - 21 + bob, 5, 8);
    rect(ctx, x + 10, y - 21 + bob, 5, 8);
  }

  if (chest === 'battleMageCoat') {
    fill(ctx, '#1e3f8a');
    rect(ctx, x - 11, y - 24 + bob, 22, 28);
    stroke(ctx, '#d9ad4f', 2);
    line(ctx, x - 8, y - 18 + bob, x - 8, y + 3 + bob);
    line(ctx, x + 8, y - 18 + bob, x + 8, y + 3 + bob);
  }

  if (chest === 'rogueLeathers') {
    fill(ctx, '#263d2a');
    rect(ctx, x - 10, y - 24 + bob, 20, 22);
    fill(ctx, '#111611');
    rect(ctx, x - 7, y - 11 + bob, 14, 7);
  }

  drawOutfitTrim(ctx, x, y, { chest, helm, legs, bob, step, facing: 'front', animationPose });
  drawLegendaryLegs(ctx, x, y, legs, bob, step, 'front', 1, animationPose);
  drawHelmetFront(ctx, x, y, helm, bob);
  drawLegendaryHelm(ctx, x, y, helm, bob, 'front');
  drawLegArmourFront(ctx, x, y, legs, bob, step, animationPose);
}

function drawBackOutfit(ctx, x, y, data) {
  const { chest, helm, legs, bob, step, animationPose } = data;

  if (isLegendaryArmour(chest)) {
    drawLegendaryChest(ctx, x, y, chest, bob, 'back');
  }

  if (chest === 'necromancerRobe') {
    fill(ctx, '#120c18');
    rect(ctx, x - 12, y - 25 + bob, 24, 29);
    fill(ctx, '#3d1f4f');
    rect(ctx, x - 8, y - 23 + bob, 16, 25);
  }

  if (chest === 'thornbinderGarb') {
    fill(ctx, '#294a26');
    rect(ctx, x - 10, y - 24 + bob, 20, 24);
    fill(ctx, '#487d38');
    rect(ctx, x - 3, y - 24 + bob, 6, 24);
  }

  if (chest === 'knightChest' || chest === 'wardedChest') {
    fill(ctx, '#737b82');
    rect(ctx, x - 12, y - 24 + bob, 24, 20);
    fill(ctx, '#a5acb2');
    rect(ctx, x - 8, y - 22 + bob, 16, 4);
  }

  if (chest === 'battleMageCoat') {
    fill(ctx, '#142f6b');
    rect(ctx, x - 11, y - 24 + bob, 22, 28);
    stroke(ctx, '#b69251', 2);
    line(ctx, x, y - 20 + bob, x, y + 4 + bob);
  }

  if (chest === 'rogueLeathers') {
    fill(ctx, '#1d2e20');
    rect(ctx, x - 10, y - 24 + bob, 20, 22);
  }

  drawOutfitTrim(ctx, x, y, { chest, helm, legs, bob, step, facing: 'back', animationPose });
  drawLegendaryLegs(ctx, x, y, legs, bob, step, 'back', 1, animationPose);
  drawHelmetBack(ctx, x, y, helm, bob);
  drawLegendaryHelm(ctx, x, y, helm, bob, 'back');
  drawLegArmourFront(ctx, x, y, legs, bob, step, animationPose);
}

function drawSideOutfit(ctx, x, y, data) {
  const { chest, helm, legs, bob, step, side, animationPose } = data;

  if (isLegendaryArmour(chest)) {
    drawLegendaryChest(ctx, x, y, chest, bob, 'side', side);
  }

  if (chest === 'necromancerRobe') {
    fill(ctx, '#17111f');
    rect(ctx, x - 9, y - 25 + bob, 18, 29);
    fill(ctx, '#5a2c74');
    rect(ctx, x - 6, y - 23 + bob, 12, 24);
    fill(ctx, '#2d1739');

    if (side === 1) {
      rect(ctx, x + 7, y - 21 + bob, 4, 23);
    } else {
      rect(ctx, x - 11, y - 21 + bob, 4, 23);
    }
  }

  if (chest === 'thornbinderGarb') {
    fill(ctx, '#365b2e');
    rect(ctx, x - 9, y - 24 + bob, 18, 24);
    fill(ctx, '#75a957');
    rect(ctx, x - 3, y - 24 + bob, 6, 24);
    stroke(ctx, '#2e572f', 2);
    line(ctx, x - side * 5, y - 12 + bob, x + side * 7, y - 19 + bob);
  }

  if (chest === 'knightChest' || chest === 'wardedChest') {
    fill(ctx, '#8c9297');
    rect(ctx, x - 10, y - 24 + bob, 20, 20);
    fill(ctx, '#b8bec4');
    rect(ctx, x - 7, y - 22 + bob, 14, 4);
    fill(ctx, '#6f777d');

    if (side === 1) {
      rect(ctx, x + 8, y - 21 + bob, 5, 8);
    } else {
      rect(ctx, x - 13, y - 21 + bob, 5, 8);
    }
  }

  if (chest === 'battleMageCoat') {
    fill(ctx, '#1e3f8a');
    rect(ctx, x - 9, y - 24 + bob, 18, 28);
    stroke(ctx, '#d9ad4f', 2);
    line(ctx, x + side * 5, y - 18 + bob, x + side * 5, y + 3 + bob);
  }

  if (chest === 'rogueLeathers') {
    fill(ctx, '#263d2a');
    rect(ctx, x - 9, y - 24 + bob, 18, 22);
    fill(ctx, '#111611');
    rect(ctx, x - 5, y - 11 + bob, 10, 7);
  }

  drawOutfitTrim(ctx, x, y, { chest, helm, legs, bob, step, facing: 'side', side, animationPose });
  drawLegendaryLegs(ctx, x, y, legs, bob, step, 'side', side, animationPose);
  drawHelmetSide(ctx, x, y, helm, bob, side);
  drawLegendaryHelm(ctx, x, y, helm, bob, 'side', side);
  drawLegArmourSide(ctx, x, y, legs, bob, step, side, animationPose);
}

function drawOutfitTrim(ctx, x, y, data) {
  const { chest, helm, legs, bob, step, facing, side = 1 } = data;
  const palette = getOutfitPalette(chest, helm, legs);
  const sideView = facing === 'side';
  const width = sideView ? 16 : 21;
  const left = x - width / 2;

  if (!chest && !helm && !legs) return;

  ctx.save();
  ctx.globalAlpha = 0.88;

  stroke(ctx, 'rgba(8,10,14,0.62)', 1);
  rectStroke(ctx, left, y - 24 + bob, width, facing === 'back' ? 24 : 22);

  fill(ctx, palette.trim);
  rect(ctx, left + 2, y - 10 + bob, width - 4, 3);

  fill(ctx, palette.accent);
  if (sideView) {
    rect(ctx, x + side * 4 - 1, y - 22 + bob, 3, 20);
  } else {
    rect(ctx, x - 2, y - 22 + bob, 4, 19);
  }

  if (helm) {
    stroke(ctx, palette.accent, 1);
    line(ctx, x - 8, y - 34 + bob, x + 8, y - 34 + bob);
  }

  ctx.restore();
}

function getOutfitPalette(chest, helm, legs) {
  const id = `${chest || ''} ${helm || ''} ${legs || ''}`.toLowerCase();

  const legendary = [chest, helm, legs].find(itemId => isLegendaryArmour(itemId));
  if (legendary) {
    const style = getLegendaryStyle(legendary);
    return { accent: style.accent, trim: style.dark, metal: style.metal };
  }

  if (id.includes('necro') || id.includes('grave')) {
    const palette = getClassVisualPalette('necromancer');
    return { accent: palette.accent, trim: palette.shadow, metal: palette.mid };
  }

  if (id.includes('thorn') || id.includes('briar')) {
    const palette = getClassVisualPalette('thornbinder');
    return { accent: palette.accent, trim: palette.shadow, metal: palette.mid };
  }

  if (id.includes('knight') || id.includes('warded') || id.includes('iron')) {
    const palette = getClassVisualPalette('oathkeeper');
    return { accent: palette.accent, trim: palette.shadow, metal: palette.mid };
  }

  if (id.includes('rogue') || id.includes('mercenary') || id.includes('fellhunter')) {
    const palette = getClassVisualPalette('mercenary');
    return { accent: palette.accent, trim: palette.shadow, metal: palette.mid };
  }

  return { accent: '#6fa8ef', trim: '#283246', metal: '#8b98a8' };
}

function drawHelmetFront(ctx, x, y, helm, bob) {
  if (helm === 'clothHood' || helm === 'necromancerHood') {
    fill(ctx, '#0b0910');
    poly(ctx, [
      [x - 13, y - 41 + bob],
      [x - 8, y - 49 + bob],
      [x + 8, y - 49 + bob],
      [x + 13, y - 41 + bob],
      [x + 10, y - 29 + bob],
      [x + 6, y - 35 + bob],
      [x - 6, y - 35 + bob],
      [x - 10, y - 29 + bob]
    ]);
    fill(ctx, '#4b2d59');
    rect(ctx, x - 8, y - 47 + bob, 16, 4);
    rect(ctx, x - 12, y - 40 + bob, 4, 9);
    rect(ctx, x + 8, y - 40 + bob, 4, 9);
  }

  if (helm === 'knightHelm') {
    fill(ctx, '#343b43');
    poly(ctx, [
      [x - 12, y - 43 + bob],
      [x - 8, y - 49 + bob],
      [x + 8, y - 49 + bob],
      [x + 12, y - 43 + bob],
      [x + 10, y - 31 + bob],
      [x - 10, y - 31 + bob]
    ]);
    fill(ctx, '#aeb9c6');
    rect(ctx, x - 9, y - 46 + bob, 18, 5);
    fill(ctx, '#171a20');
    rect(ctx, x - 8, y - 38 + bob, 16, 3);
    fill(ctx, '#d8dde0');
    rect(ctx, x - 6, y - 45 + bob, 5, 2);
  }
}

function drawHelmetBack(ctx, x, y, helm, bob) {
  if (helm === 'clothHood' || helm === 'necromancerHood') {
    fill(ctx, '#0b0910');
    poly(ctx, [
      [x - 13, y - 41 + bob],
      [x - 8, y - 49 + bob],
      [x + 8, y - 49 + bob],
      [x + 13, y - 41 + bob],
      [x + 10, y - 27 + bob],
      [x - 10, y - 27 + bob]
    ]);
    fill(ctx, '#3d2448');
    rect(ctx, x - 8, y - 46 + bob, 16, 4);
    rect(ctx, x - 9, y - 38 + bob, 18, 10);
  }

  if (helm === 'knightHelm') {
    fill(ctx, '#343b43');
    poly(ctx, [
      [x - 12, y - 43 + bob],
      [x - 8, y - 49 + bob],
      [x + 8, y - 49 + bob],
      [x + 12, y - 43 + bob],
      [x + 10, y - 31 + bob],
      [x - 10, y - 31 + bob]
    ]);
    fill(ctx, '#858f9b');
    rect(ctx, x - 9, y - 46 + bob, 18, 9);
    fill(ctx, '#5a626c');
    rect(ctx, x - 7, y - 35 + bob, 14, 3);
  }
}

function drawHelmetSide(ctx, x, y, helm, bob, side) {
  if (helm === 'clothHood' || helm === 'necromancerHood') {
    fill(ctx, '#0b0910');
    poly(ctx, [
      [x - 10, y - 42 + bob],
      [x - 5, y - 49 + bob],
      [x + 7, y - 47 + bob],
      [x + side * 11, y - 39 + bob],
      [x + side * 8, y - 29 + bob],
      [x - side * 8, y - 31 + bob]
    ]);
    fill(ctx, '#4b2d59');
    rect(ctx, x - 6, y - 46 + bob, 12, 4);
    rect(ctx, x + side * 7 - 2, y - 40 + bob, 4, 9);
  }

  if (helm === 'knightHelm') {
    fill(ctx, '#343b43');
    poly(ctx, [
      [x - 9, y - 43 + bob],
      [x - 5, y - 49 + bob],
      [x + 7, y - 47 + bob],
      [x + side * 11, y - 40 + bob],
      [x + side * 9, y - 31 + bob],
      [x - side * 8, y - 31 + bob]
    ]);
    fill(ctx, '#aeb9c6');
    rect(ctx, x - 6, y - 46 + bob, 13, 5);
    fill(ctx, '#171a20');
    rect(ctx, x + side * 1 - (side < 0 ? 7 : 0), y - 38 + bob, 7, 3);
  }
}

function drawLegArmourFront(ctx, x, y, legs, bob, step, animationPose) {
  if (legs === 'ironGreaves' || legs === 'graveboundGreaves') {
    drawMovingLegArmourPair(ctx, x, y, {
      facing: 'front',
      bob,
      step,
      animationPose,
      deep: '#4f565b',
      base: '#7f858a',
      accent: '#b8bec4',
      layer: 'all'
    });
  }
}

function drawLegArmourSide(ctx, x, y, legs, bob, step, side, animationPose) {
  if (legs === 'ironGreaves' || legs === 'graveboundGreaves') {
    drawMovingLegArmourPair(ctx, x, y, {
      facing: side < 0 ? 'left' : 'right',
      bob,
      step,
      animationPose,
      deep: '#4f565b',
      base: '#7f858a',
      accent: '#b8bec4',
      layer: 'all'
    });
  }
}

function drawLegendaryChest(ctx, x, y, chest, bob, facing, side = 1) {
  const style = getLegendaryStyle(chest);
  const isSide = facing === 'side';
  const width = isSide ? 19 : 25;
  const left = x - width / 2;

  fill(ctx, style.dark);
  rect(ctx, left, y - 25 + bob, width, 29);
  fill(ctx, style.core);
  rect(ctx, left + 3, y - 22 + bob, width - 6, 22);
  stroke(ctx, style.metal, 2);
  rectStroke(ctx, left + 2, y - 24 + bob, width - 4, 26);

  if (chest === 'oathplateOfTheLastDawn') {
    fill(ctx, '#f8e6a0');
    rect(ctx, x - (isSide ? 3 : 8), y - 21 + bob, isSide ? 6 : 16, 4);
    stroke(ctx, style.accent, 2);
    line(ctx, x - side * 8, y - 9 + bob, x + side * 8, y - 18 + bob);
    fill(ctx, style.accent);
    triangle(ctx, x, y - 18 + bob, x - 4, y - 8 + bob, x + 4, y - 8 + bob);
    return;
  }

  if (chest === 'ashboundMantle') {
    fill(ctx, '#2c2430');
    rect(ctx, left - 2, y - 22 + bob, width + 4, 28);
    stroke(ctx, '#f08c42', 2);
    line(ctx, x - side * 8, y - 20 + bob, x + side * 5, y + 3 + bob);
    fill(ctx, '#ffcc66');
    rect(ctx, x - 2, y - 16 + bob, 4, 4);
    return;
  }

  fill(ctx, style.accent);
  rect(ctx, x - 2, y - 23 + bob, 4, 24);
}

function drawLegendaryHelm(ctx, x, y, helm, bob, facing, side = 1) {
  if (!isLegendaryArmour(helm)) return;

  const style = getLegendaryStyle(helm);

  if (helm === 'crownOfTheEndless') {
    fill(ctx, '#17121f');
    rect(ctx, x - 12, y - 42 + bob, 24, 8);
    fill(ctx, style.accent);
    triangle(ctx, x - 13, y - 42 + bob, x - 9, y - 51 + bob, x - 5, y - 42 + bob);
    triangle(ctx, x - 4, y - 42 + bob, x, y - 54 + bob, x + 4, y - 42 + bob);
    triangle(ctx, x + 5, y - 42 + bob, x + 9, y - 51 + bob, x + 13, y - 42 + bob);
    fill(ctx, '#66f0ff');
    rect(ctx, x - 2, y - 48 + bob, 4, 4);
    return;
  }

  if (helm === 'sunforgedHalo') {
    stroke(ctx, '#ffd98a', 3);
    ctx.beginPath();
    ctx.ellipse(Math.round(x), Math.round(y - 44 + bob), 15, 5, 0, 0, Math.PI * 2);
    ctx.stroke();
    fill(ctx, '#f7f0d2');
    rect(ctx, x - 10, y - 40 + bob, 20, 7);
    fill(ctx, '#ff8a3d');
    rect(ctx, x + side * (facing === 'side' ? 5 : 0) - 2, y - 47 + bob, 4, 9);
  }
}

function drawLegendaryLegs(ctx, x, y, legs, bob, step, facing, side = 1, animationPose = null) {
  if (!isLegendaryArmour(legs)) return;

  const style = getLegendaryStyle(legs);
  drawMovingLegArmourPair(ctx, x, y, {
    facing: facing === 'side' ? (side < 0 ? 'left' : 'right') : facing,
    bob,
    step,
    animationPose,
    deep: style.dark,
    base: style.core,
    accent: style.accent,
    light: style.metal,
    layer: 'all'
  });
}

function drawMovingLegArmourPair(ctx, x, y, options = {}) {
  const {
    facing = 'front',
    bob = 0,
    step = 0,
    animationPose = null,
    deep = '#34383d',
    base = '#7f858a',
    accent = '#b8bec4',
    light = null,
    layer = 'all'
  } = options;
  const sideView = facing === 'left' || facing === 'right' || facing === 'side';
  const side = facing === 'left' ? -1 : 1;
  const frontStride = animationPose?.frontLegStride ?? step;
  const backStride = animationPose?.backLegStride ?? -step;
  const frontLift = animationPose?.frontFootLift ?? 0;
  const backLift = animationPose?.backFootLift ?? 0;

  if (sideView) {
    drawMovingSideLegArmour(ctx, x - side, y + bob, backStride, backLift, side, {
      deep,
      base,
      accent,
      light,
      layer,
      back: true
    });
    drawMovingSideLegArmour(ctx, x + side * 3, y + bob, frontStride, frontLift, side, {
      deep,
      base,
      accent,
      light,
      layer
    });
    return;
  }

  drawMovingFrontLegArmour(ctx, x - 6, y + bob + frontStride * 0.12, frontStride, frontLift, {
    deep,
    base,
    accent,
    light,
    layer
  });
  drawMovingFrontLegArmour(ctx, x + 5, y + bob + backStride * 0.12, backStride, backLift, {
    deep,
    base,
    accent,
    light,
    layer,
    back: true
  });
}

function drawMovingFrontLegArmour(ctx, x, y, stride, lift, colors) {
  const footShift = clamp(stride * 0.5, -2.4, 2.4);
  const height = Math.max(9, 16 - lift);

  if (colors.layer === 'base' || colors.layer === 'all') {
    fill(ctx, colors.deep);
    rect(ctx, x - 4, y + 1, 8, height);
  }
  if (colors.layer === 'detail' || colors.layer === 'all') {
    fill(ctx, colors.base);
    rect(ctx, x - 3, y + 2, 6, Math.max(7, height - 2));
    fill(ctx, colors.accent);
    rect(ctx, x - 3 + footShift * 0.2, y + Math.max(5, height * 0.48), 6, 3);
    if (colors.light) {
      fill(ctx, colors.light);
      rect(ctx, x - 2, y + 3, 4, 1);
    }
  }
}

function drawMovingSideLegArmour(ctx, x, y, stride, lift, side, colors) {
  const travel = clamp(stride * side * 1.55, -7, 7);
  const kneeX = x + travel * 0.46;
  const kneeY = y + 8 - lift * 0.35;
  const footX = x + travel;
  const footY = y + 17 - lift;
  const shade = colors.back ? darkenAssetColor(colors.deep, 0.1) : colors.deep;

  ctx.save();
  ctx.lineCap = 'round';
  if (colors.layer === 'base' || colors.layer === 'all') {
    stroke(ctx, shade, 8);
    line(ctx, x, y + 2, kneeX, kneeY);
    line(ctx, kneeX, kneeY, footX, footY);
  }
  if (colors.layer === 'detail' || colors.layer === 'all') {
    stroke(ctx, colors.base, 5);
    line(ctx, x, y + 2, kneeX, kneeY);
    line(ctx, kneeX, kneeY, footX, footY);
    fill(ctx, colors.accent);
    rect(ctx, kneeX - 3, kneeY - 1, 6, 3);
    if (colors.light) {
      stroke(ctx, colors.light, 1);
      line(ctx, x, y + 3, kneeX, kneeY);
    }
  }
  ctx.restore();
}

function clamp(value, min, max) {
  return Math.max(min, Math.min(max, Number(value || 0)));
}

function darkenAssetColor(color, amount = 0.1) {
  if (!/^#[0-9a-f]{6}$/i.test(String(color || ''))) return color;
  const value = parseInt(color.slice(1), 16);
  const scale = Math.max(0, 1 - amount);
  const r = Math.round(((value >> 16) & 255) * scale);
  const g = Math.round(((value >> 8) & 255) * scale);
  const b = Math.round((value & 255) * scale);
  return `rgb(${r},${g},${b})`;
}

function drawTrinketAsset(ctx, x, y, trinketRef, options = {}) {
  const trinket = normalizeItemId(trinketRef);
  if (!trinket) return;
  if(drawTrinketArt(ctx,trinket,options.facing||'down',x,y,options.bob||0))return;

  const item = ITEMS[trinket] || {};
  const profile = getGearVisualProfile(trinket, item, options.classId);
  const style = isLegendaryItem(trinket)
    ? getLegendaryStyle(trinket)
    : {
        accent: profile.accent,
        core: profile.base,
        dark: profile.deep,
        light: profile.light,
        metal: profile.mid
      };
  const bob = options.bob || 0;
  const facing = options.facing || 'down';

  if (facing === 'up') return;

  const sx = facing === 'left' ? -4 : facing === 'right' ? 4 : 0;
  const tx = x + sx;
  const ty = y - 15 + bob;

  stroke(ctx, style.metal, 2);
  line(ctx, tx - 5, ty - 7, tx, ty + 1);
  line(ctx, tx + 5, ty - 7, tx, ty + 1);

  fill(ctx, style.dark);
  rect(ctx, tx - 4, ty, 8, 9);
  fill(ctx, style.accent);

  if (trinket === 'runalisLantern') {
    rect(ctx, tx - 3, ty + 1, 6, 7);
    fill(ctx, '#fff2b0');
    rect(ctx, tx - 1, ty + 3, 2, 3);
    return;
  }

  if (trinket === 'dawnwardAegis') {
    triangle(ctx, tx, ty, tx - 5, ty + 8, tx + 5, ty + 8);
    fill(ctx, '#fff1bb');
    rect(ctx, tx - 1, ty + 2, 2, 5);
    return;
  }

  if (trinket.toLowerCase().includes('ring')) {
    stroke(ctx, style.accent, 3);
    circleStroke(ctx, tx, ty + 4, 4);
    fill(ctx, style.light);
    rect(ctx, tx - 1, ty - 1, 3, 3);
    return;
  }

  if (trinket === 'thornCharm') {
    fill(ctx, style.base || style.core);
    triangle(ctx, tx, ty - 1, tx - 6, ty + 8, tx + 6, ty + 8);
    stroke(ctx, style.accent, 2);
    line(ctx, tx - 5, ty + 7, tx + 6, ty + 1);
    return;
  }

  fill(ctx, style.dark);
  triangle(ctx, tx, ty - 2, tx - 6, ty + 8, tx + 6, ty + 8);
  fill(ctx, style.accent);
  circle(ctx, tx, ty + 4, 3);
  fill(ctx, style.light);
  rect(ctx, tx - 1, ty + 2, 2, 3);
}

// -----------------------------------------------------------------------------
// WEAPONS
// -----------------------------------------------------------------------------

// Every weapon family uses the same directional attachment contract. Individual
// models are drawn once and receive a facing-aware grip, handedness, silhouette
// direction, and depth hint instead of swapping to unrelated rear-view shapes.
export const EQUIPMENT_ORIENTATION_PROFILES = Object.freeze({
  default: Object.freeze({
    down: Object.freeze({ x: 16, y: -16, side: 1, modelFacing: 'down', armSwingFactor: 0.35, depth: 'front' }),
    up: Object.freeze({ x: -15, y: -17, side: -1, modelFacing: 'up', armSwingFactor: 0, depth: 'rear' }),
    right: Object.freeze({ x: 8, y: -16, side: 1, modelFacing: 'right', armSwingFactor: 0.35, depth: 'rear' }),
    left: Object.freeze({ x: 8, y: -16, side: -1, modelFacing: 'left', armSwingFactor: 0.35, depth: 'front' })
  }),
  bow: Object.freeze({
    down: Object.freeze({ x: 5, y: -10, side: 1, modelFacing: 'down', armSwingFactor: 0.18, depth: 'front' }),
    up: Object.freeze({ x: -9, y: -7, side: -1, modelFacing: 'up', armSwingFactor: 0, depth: 'rear' }),
    right: Object.freeze({ x: 8, y: -7, side: 1, modelFacing: 'right', armSwingFactor: 0.18, depth: 'rear' }),
    left: Object.freeze({ x: 8, y: -6, side: -1, modelFacing: 'left', armSwingFactor: 0.18, depth: 'front' })
  })
});

export function getEquipmentOrientationTransform(type, facing, options = {}) {
  const safeFacing = ['up', 'down', 'left', 'right'].includes(facing) ? facing : 'down';
  const family = type === 'bow' ? EQUIPMENT_ORIENTATION_PROFILES.bow : EQUIPMENT_ORIENTATION_PROFILES.default;
  const rule = family[safeFacing];
  const bob = Number(options.bob || 0);
  const armSwing = Number(options.armSwing || 0);

  return {
    facing: safeFacing,
    gripX: rule.x,
    gripY: rule.y + bob - armSwing * rule.armSwingFactor,
    side: rule.side,
    modelFacing: rule.modelFacing,
    depth: rule.depth,
    rotation: Number(rule.rotation || 0),
    scaleX: Number(rule.scaleX || 1),
    scaleY: Number(rule.scaleY || 1)
  };
}

function drawWeaponAsset(ctx, actor, x, y, weaponRef, options = {}) {
  const weaponId = normalizeItemId(weaponRef);
  if (!weaponId) return;

  const item = ITEMS[weaponId] || {};
  const visualProfile = getGearVisualProfile(weaponId, item, actor.classId);
  const type = visualProfile.weaponType;

  const facing = options.facing || getFacing(actor.dirX ?? 0, actor.dirY ?? 1);
  const bob = options.bob || 0;
  const armSwing = options.armSwing || 0;
  const pose = options.animationPose || {};
  const recoil = pose.weaponRecoil || 0;
  const orientation = getEquipmentOrientationTransform(type, facing, { bob, armSwing });
  const raster=equippedArtReady(weaponId,visualProfile);
  const gripY=orientation.gripY+(raster && type!=='bow'?12:0);
  const meleeRig=raster&&meleeArmReady(pose)?sampleMeleeRig(pose,facing,0):null;
  const actionGrip=raster?(bowBodyGrip(actor,pose,facing)||castBodyGrip(actor,pose,facing)||attackBodyGrip(actor,pose,facing)):null;
  const restingGrip=!meleeRig&&!actionGrip?restingWeaponGrip(actor,{...pose,weaponType:type},facing):null;
  const authoredGrip=meleeRig?meleeRig.primary.hand:actionGrip||restingGrip?.hand;
  const bowAngle=type==='bow'?bowAimRotation(actor,pose,facing,orientation.side):null;
  const recoilX = facing === 'left' || facing === 'right' ? -orientation.side * recoil : 0;
  const recoilY = facing === 'up' ? recoil : facing === 'down' ? -recoil * 0.35 : 0;

  ctx.save();
  ctx.translate(
    x + (authoredGrip?0:(pose.weaponOffsetX || 0) + recoilX),
    y + (authoredGrip?0:(pose.weaponOffsetY || 0) + recoilY)
  );
  ctx.translate(
    authoredGrip?authoredGrip[0]:orientation.gripX + (pose.weaponGripOffsetX || 0),
    authoredGrip?authoredGrip[1]+bob:gripY + (pose.weaponGripOffsetY || 0)
  );
  if (bowAngle!==null || meleeRig || restingGrip || orientation.rotation || pose.weaponRotation) {
    ctx.rotate(bowAngle??(meleeRig?meleeRig.weaponAngle:restingGrip?restingGrip.angle:orientation.rotation + Number(pose.weaponRotation || 0)));
  }
  ctx.scale(orientation.scaleX, orientation.scaleY);
  ctx.translate(-orientation.gripX, -gripY);

  if(raster){
    if(pose.phase==='strike' && pose.phaseProgress<.98 && !['bow','staff','spiritFocus','eldritch'].includes(type)){
      const sign=(facing==='left'?-1:1)*(pose.family==='reverseSlash'?-1:1);
      for(let i=2;i>0;i--){ctx.save();ctx.globalAlpha*=i===2?.12:.24;ctx.translate(orientation.gripX,gripY);ctx.rotate(-sign*i*.24);drawEquippedArt(ctx,weaponId,visualProfile,0,0,orientation.side);ctx.restore();}
    }
    drawEquippedArt(ctx,weaponId,visualProfile,orientation.gripX,gripY,orientation.side);
  } else drawOrientedWeapon(ctx, orientation.gripX, orientation.gripY, weaponId, item, type, orientation, visualProfile);

  if (options.debugEquipmentOrientation) {
    drawEquipmentOrientationDebug(ctx, orientation, type);
  }

  ctx.restore();
}

function drawOrientedWeapon(ctx, gripX, gripY, weaponId, item, type, orientation, visualProfile) {
  const side = orientation.side;

  if (type === 'sword') {
    drawSword(ctx, gripX, gripY, side, weaponId, item, visualProfile);
  } else if (type === 'dagger') {
    drawDagger(ctx, gripX, gripY, side, weaponId, item, visualProfile);
  } else if (type === 'staff') {
    drawStaff(ctx, gripX, gripY, side, weaponId, item, visualProfile);
  } else if (type === 'scythe') {
    drawScytheFacing(ctx, gripX, gripY, side, weaponId, item, orientation.modelFacing, visualProfile);
  } else if (type === 'bow') {
    drawBow(ctx, gripX, gripY, side, item, orientation.modelFacing, visualProfile);
  } else if (type === 'spiritFocus') {
    drawSpiritFocus(ctx, gripX, gripY, side, weaponId, item, visualProfile);
  } else if (type === 'eldritch') {
    drawEldritchConduit(ctx, gripX, gripY, side);
  } else if (type === 'shield') {
    drawShieldWeapon(ctx, gripX, gripY, side);
  }
}

function drawEquipmentOrientationDebug(ctx, orientation, type) {
  ctx.save();
  ctx.globalAlpha = 0.95;
  stroke(ctx, '#ff4b3e', 1);
  line(ctx, orientation.gripX - 4, orientation.gripY, orientation.gripX + 4, orientation.gripY);
  line(ctx, orientation.gripX, orientation.gripY - 4, orientation.gripX, orientation.gripY + 4);
  fill(ctx, '#fff4d2');
  ctx.font = '7px monospace';
  ctx.fillText(`${type}:${orientation.facing}:${orientation.depth}`, orientation.gripX + 5, orientation.gripY - 5);
  ctx.restore();
}

function drawSpiritFocus(ctx, x, y, side, weaponId, item, visualProfile = null) {
  const profile = visualProfile || getGearVisualProfile(weaponId, item);
  const frameX = x + side * 5;
  const frameY = y - 7;
  const lensRadius = profile.silhouette === 'focusgauntlet' ? 8 : 7;
  const handleY = y + 5;

  stroke(ctx, profile.outline, 5);
  line(ctx, x - side * 2, y + 9, frameX, handleY);
  stroke(ctx, profile.deep, 3);
  line(ctx, x - side * 2, y + 9, frameX, handleY);

  fill(ctx, profile.deep);
  circle(ctx, frameX, frameY, lensRadius + 3);
  fill(ctx, profile.base);
  circle(ctx, frameX, frameY, lensRadius + 1);

  if (profile.silhouette === 'reliquaryfocus') {
    fill(ctx, profile.mid);
    circle(ctx, frameX, frameY, lensRadius - 1);
    stroke(ctx, profile.accent, 2);
    circleStroke(ctx, frameX, frameY, lensRadius + 3);
  } else {
    fill(ctx, profile.light);
    poly(ctx, [
      [frameX, frameY - lensRadius],
      [frameX + side * lensRadius, frameY],
      [frameX, frameY + lensRadius],
      [frameX - side * lensRadius, frameY]
    ]);
    fill(ctx, profile.accent);
    circle(ctx, frameX - side * 1, frameY - 1, 2.5);
  }

  stroke(ctx, profile.accent, 2);
  line(ctx, frameX - side * 9, frameY + 1, frameX + side * 9, frameY + 1);
}

function drawShieldWeapon(ctx, x, y, side) {
  fill(ctx, '#151a20');
  poly(ctx, [
    [x, y - 14],
    [x + side * 11, y - 8],
    [x + side * 9, y + 10],
    [x, y + 16],
    [x - side * 7, y + 9],
    [x - side * 8, y - 8]
  ]);
  fill(ctx, '#707b84');
  poly(ctx, [
    [x, y - 10],
    [x + side * 7, y - 6],
    [x + side * 6, y + 7],
    [x, y + 12],
    [x - side * 5, y + 6],
    [x - side * 5, y - 6]
  ]);
  stroke(ctx, '#d9ad4f', 2);
  line(ctx, x, y - 9, x, y + 11);
}

function drawEldritchConduit(ctx, x, y, side) {
  stroke(ctx, '#13090e', 5);
  line(ctx, x, y + 10, x + side * 3, y - 22);

  stroke(ctx, '#ef4056', 2);
  line(ctx, x + side * 1, y + 6, x + side * 3, y - 18);

  fill(ctx, '#10070c');
  circle(ctx, x + side * 4, y - 25, 8);
  stroke(ctx, '#ef4056', 2);
  circleStroke(ctx, x + side * 4, y - 25, 8);
  fill(ctx, '#ff6b7c');
  circle(ctx, x + side * 4, y - 25, 3);
}

function drawSword(ctx, x, y, side, weaponId, item, visualProfile = null) {
  if (isLegendaryItem(weaponId)) {
    drawLegendarySword(ctx, x, y, side, weaponId);
    return;
  }

  const profile = visualProfile || getGearVisualProfile(weaponId, item);
  if (profile.silhouette === 'sword' && drawWeaponSprite(ctx, 0, x, y, side, .8)) return;
  const greatsword = profile.silhouette === 'greatsword';
  const rapier = profile.silhouette === 'rapier';
  const bladeTop = y - (greatsword ? 29 : rapier ? 27 : 22);
  const bladeOutlineWidth = greatsword ? 10 : rapier ? 6 : 8;
  const bladeWidth = greatsword ? 8 : rapier ? 3 : 6;
  const guardHalf = greatsword ? 9 : rapier ? 7 : 6;
  const pommelX = x + side * (greatsword ? 5 : 4);
  const pommelY = y + (greatsword ? 21 : 19);

  stroke(ctx, profile.deep, 5);
  line(ctx, x, y + 12, pommelX, pommelY);

  stroke(ctx, profile.outline, bladeOutlineWidth);
  line(ctx, x, y + 8, x + side * 2, bladeTop);

  stroke(ctx, profile.base, bladeWidth);
  line(ctx, x, y + 7, x + side * 2, bladeTop);

  stroke(ctx, profile.light, rapier ? 1 : 2);
  line(ctx, x + side * 1, y + 5, x + side * 2, bladeTop + 4);

  stroke(ctx, profile.accent, 4);
  line(ctx, x - side * guardHalf, y + 8, x + side * (guardHalf + 1), y + 8);

  fill(ctx, profile.accent);
  triangle(
    ctx,
    x + side * 2,
    bladeTop - (greatsword ? 5 : 3),
    x - side * (greatsword ? 3 : 2),
    bladeTop + (greatsword ? 7 : 4),
    x + side * (greatsword ? 7 : 6),
    bladeTop + (greatsword ? 7 : 4)
  );
}

function drawDagger(ctx, x, y, side, weaponId, item, visualProfile = null) {
  if (!isLegendaryItem(weaponId) && drawWeaponSprite(ctx, 1, x, y, side, .75)) return;
  const profile = visualProfile || getGearVisualProfile(weaponId, item);

  stroke(ctx, profile.deep, 5);
  line(ctx, x, y + 9, x + side * 4, y + 15);

  stroke(ctx, profile.outline, 7);
  line(ctx, x, y + 5, x + side * 2, y - 14);
  stroke(ctx, profile.light, 3);
  line(ctx, x + side, y + 3, x + side * 2, y - 12);

  stroke(ctx, profile.accent, 4);
  line(ctx, x - side * 5, y + 5, x + side * 6, y + 5);
}

function drawStaff(ctx, x, y, side, weaponId, item, visualProfile = null) {
  if (isLegendaryItem(weaponId)) {
    drawLegendaryStaff(ctx, x, y, side, weaponId);
    return;
  }

  if (weaponId === 'rootStaff') {
    drawRootStaff(ctx, x, y, side);
    return;
  }

  const profile = visualProfile || getGearVisualProfile(weaponId, item);

  stroke(ctx, profile.outline, 7);
  line(ctx, x, y + 18, x + side * 3, y - 26);
  stroke(ctx, profile.base, 4);
  line(ctx, x, y + 17, x + side * 3, y - 25);

  fill(ctx, profile.deep);
  if (profile.archetype === 'thornbinder') {
    circle(ctx, x + side * 2, y - 28, 7);
    stroke(ctx, profile.accent, 2);
    line(ctx, x + side * 1, y - 25, x - side * 9, y - 18);
    line(ctx, x + side * 4, y - 25, x + side * 11, y - 19);
  } else {
    poly(ctx, [
      [x + side * 2, y - 35],
      [x + side * 8, y - 29],
      [x + side * 3, y - 23],
      [x - side * 4, y - 29]
    ]);
  }

  fill(ctx, profile.accent);
  circle(ctx, x + side * 2, y - 29, 3);
}

function drawRootStaff(ctx, x, y, side) {
  const shaftTopX = x + side * 3;
  const orbX = x + side * 3;
  const orbY = y - 31;

  // Dark bark outline and warm heartwood shaft.
  stroke(ctx, '#24170f', 8);
  line(ctx, x, y + 19, shaftTopX, y - 24);
  stroke(ctx, '#654225', 5);
  line(ctx, x, y + 18, shaftTopX, y - 24);
  stroke(ctx, '#a7753e', 2);
  line(ctx, x - side, y + 14, x + side * 2, y - 20);

  // Forked branches cradle the focus instead of reading as a plain stick.
  stroke(ctx, '#24170f', 6);
  line(ctx, shaftTopX, y - 22, x - side * 8, y - 32);
  line(ctx, shaftTopX, y - 22, x + side * 13, y - 33);
  stroke(ctx, '#654225', 3);
  line(ctx, shaftTopX, y - 22, x - side * 8, y - 32);
  line(ctx, shaftTopX, y - 22, x + side * 13, y - 33);

  // A solid green orb with a bright glassy face, intentionally without glow.
  fill(ctx, '#132718');
  circle(ctx, orbX, orbY, 9);
  fill(ctx, '#357344');
  circle(ctx, orbX, orbY, 7);
  fill(ctx, '#69b85f');
  circle(ctx, orbX - side * 1, orbY - 1, 4);
  fill(ctx, '#b8e38d');
  circle(ctx, orbX - side * 2, orbY - 3, 2);

  // Small leaf shapes keep the starter weapon unmistakably Thornbinder.
  fill(ctx, '#315f35');
  triangle(ctx, x - side * 7, y - 29, x - side * 14, y - 36, x - side * 13, y - 26);
  fill(ctx, '#4b8a46');
  triangle(ctx, x + side * 10, y - 30, x + side * 17, y - 37, x + side * 16, y - 27);
}

function drawScytheFacing(ctx, x, y, side, weaponId, item, facing = 'right', visualProfile = null) {
  if (isLegendaryItem(weaponId)) {
    drawLegendaryScythe(ctx, x, y, side, weaponId, facing);
    return;
  }

  const profile = visualProfile || getGearVisualProfile(weaponId, item);
  const blade = profile.base;
  const highlight = profile.light;

  stroke(ctx, profile.outline, 7);

  if (facing === 'right') {
    line(ctx, x - 2, y + 20, x + 5, y - 30);
  } else if (facing === 'left') {
    line(ctx, x + 2, y + 20, x - 5, y - 30);
  } else if (facing === 'down') {
    line(ctx, x - 1, y + 20, x + 4, y - 30);
  } else {
    line(ctx, x + 1, y + 20, x - 4, y - 30);
  }

  drawScytheBlade(ctx, x, y, facing, blade, highlight);

  fill(ctx, profile.accent);
  rect(ctx, x - 3, y - 14, 6, 4);
}

function drawScytheBlade(ctx, x, y, facing, blade, highlight) {
  const points = getScytheBladePoints(x, y, facing);

  fill(ctx, '#4a2f1b');
  rect(ctx, points.collarX - 4, points.collarY - 2, 8, 5);

  stroke(ctx, blade, 5);
  ctx.beginPath();
  ctx.moveTo(points.rootX, points.rootY);
  ctx.quadraticCurveTo(points.midX, points.midY, points.tipX, points.tipY);
  ctx.quadraticCurveTo(points.innerX, points.innerY, points.innerTipX, points.innerTipY);
  ctx.stroke();

  stroke(ctx, highlight, 2);
  ctx.beginPath();
  ctx.moveTo(points.rootX, points.rootY - 1);
  ctx.quadraticCurveTo(points.midX, points.midY + points.highlightYOffset, points.tipX, points.tipY);
  ctx.stroke();

  fill(ctx, blade);
  triangle(
    ctx,
    points.tipX,
    points.tipY,
    points.tipWingAX,
    points.tipWingAY,
    points.tipWingBX,
    points.tipWingBY
  );
}

function getScytheBladePoints(x, y, facing) {
  if (facing === 'right') {
    return {
      collarX: x + 5,
      collarY: y - 30,

      rootX: x + 4,
      rootY: y - 30,
      midX: x + 23,
      midY: y - 43,
      tipX: x + 31,
      tipY: y - 25,

      innerX: x + 18,
      innerY: y - 30,
      innerTipX: x + 10,
      innerTipY: y - 27,

      tipWingAX: x + 22,
      tipWingAY: y - 23,
      tipWingBX: x + 26,
      tipWingBY: y - 34,

      highlightYOffset: 2
    };
  }

  if (facing === 'left') {
    return {
      collarX: x - 5,
      collarY: y - 30,

      rootX: x - 4,
      rootY: y - 30,
      midX: x - 23,
      midY: y - 43,
      tipX: x - 31,
      tipY: y - 25,

      innerX: x - 18,
      innerY: y - 30,
      innerTipX: x - 10,
      innerTipY: y - 27,

      tipWingAX: x - 22,
      tipWingAY: y - 23,
      tipWingBX: x - 26,
      tipWingBY: y - 34,

      highlightYOffset: 2
    };
  }

  if (facing === 'up') {
    return {
      collarX: x - 4,
      collarY: y - 30,

      rootX: x - 4,
      rootY: y - 30,
      midX: x - 24,
      midY: y - 42,
      tipX: x - 30,
      tipY: y - 23,

      innerX: x - 16,
      innerY: y - 28,
      innerTipX: x - 9,
      innerTipY: y - 26,

      tipWingAX: x - 21,
      tipWingAY: y - 22,
      tipWingBX: x - 25,
      tipWingBY: y - 34,

      highlightYOffset: 2
    };
  }

  return {
    collarX: x + 5,
    collarY: y - 30,

    rootX: x + 4,
    rootY: y - 30,
    midX: x + 24,
    midY: y - 42,
    tipX: x + 30,
    tipY: y - 23,

    innerX: x + 16,
    innerY: y - 28,
    innerTipX: x + 9,
    innerTipY: y - 26,

    tipWingAX: x + 21,
    tipWingAY: y - 22,
    tipWingBX: x + 25,
    tipWingBY: y - 34,

    highlightYOffset: 2
  };
}

function drawBow(ctx, gripX, gripY, side, item = {}, facing = 'right', visualProfile = null) {
  if (item?.rarity === 'legendary') {
    drawLegendaryBow(ctx, gripX, gripY, side, item.id, facing);
    return;
  }

  const pose = getBowPose(gripX, gripY, side, facing);
  const profile = visualProfile || getGearVisualProfile(item.id, item);

  stroke(ctx, profile.outline, 6);
  ctx.beginPath();
  ctx.moveTo(pose.topX, pose.topY);
  ctx.quadraticCurveTo(pose.outerX, pose.outerTopY, pose.gripX, pose.gripY);
  ctx.quadraticCurveTo(pose.outerX, pose.outerBottomY, pose.bottomX, pose.bottomY);
  ctx.stroke();

  stroke(ctx, profile.base, 3);
  ctx.beginPath();
  ctx.moveTo(pose.topX, pose.topY + 1);
  ctx.quadraticCurveTo(pose.outerX, pose.outerTopY, pose.gripX, pose.gripY);
  ctx.quadraticCurveTo(pose.outerX, pose.outerBottomY, pose.bottomX, pose.bottomY - 1);
  ctx.stroke();

  stroke(ctx, profile.light, 1);
  line(ctx, pose.topX, pose.topY, pose.bottomX, pose.bottomY);

  stroke(ctx, profile.accent, 4);
  line(ctx, pose.gripX, pose.gripY - 3, pose.gripX, pose.gripY + 3);

  fill(ctx, profile.accent);
  rect(ctx, pose.topX - 2, pose.topY - 1, 4, 3);
  rect(ctx, pose.bottomX - 2, pose.bottomY - 2, 4, 3);
}

function drawLegendarySword(ctx, x, y, side, weaponId) {
  const style = getLegendaryStyle(weaponId);

  stroke(ctx, '#5c341f', 5);
  line(ctx, x, y + 14, x + side * 5, y + 22);

  stroke(ctx, style.metal, 6);
  line(ctx, x - side * 5, y + 9, x + side * 8, y + 8);

  stroke(ctx, style.core, 8);
  line(ctx, x, y + 6, x + side * 3, y - 29);
  stroke(ctx, style.light, 3);
  line(ctx, x + side * 1, y + 3, x + side * 3, y - 25);

  fill(ctx, style.accent);
  triangle(ctx, x + side * 3, y - 32, x - side * 2, y - 22, x + side * 8, y - 22);
}

function drawLegendaryStaff(ctx, x, y, side, weaponId) {
  const style = getLegendaryStyle(weaponId);

  stroke(ctx, '#4a2b1f', 6);
  line(ctx, x, y + 20, x + side * 4, y - 30);
  stroke(ctx, style.accent, 2);
  line(ctx, x - side * 2, y + 14, x + side * 4, y - 26);

  fill(ctx, style.dark);
  rect(ctx, x + side * -5, y - 35, 10, 10);
  fill(ctx, style.accent);

  if (weaponId === 'thornheartStaffLegendary') {
    circle(ctx, x + side * 2, y - 31, 6);
    stroke(ctx, '#73d18a', 2);
    line(ctx, x + side * 1, y - 27, x - side * 10, y - 19);
    line(ctx, x + side * 4, y - 28, x + side * 13, y - 22);
    fill(ctx, '#ff7ac8');
    rect(ctx, x - 2, y - 35, 4, 4);
    return;
  }

  circle(ctx, x + side * 1, y - 31, 6);
}

function drawLegendaryScythe(ctx, x, y, side, weaponId, facing) {
  const style = getLegendaryStyle(weaponId);
  const points = getScytheBladePoints(x, y, facing);

  stroke(ctx, weaponId === 'lichboneScythe' ? '#f3eee2' : '#21131a', 6);

  if (facing === 'right') {
    line(ctx, x - 2, y + 22, x + 6, y - 32);
  } else if (facing === 'left') {
    line(ctx, x + 2, y + 22, x - 6, y - 32);
  } else if (facing === 'down') {
    line(ctx, x - 1, y + 22, x + 5, y - 32);
  } else {
    line(ctx, x + 1, y + 22, x - 5, y - 32);
  }

  stroke(ctx, style.core, 7);
  ctx.beginPath();
  ctx.moveTo(points.rootX, points.rootY);
  ctx.quadraticCurveTo(points.midX, points.midY - 5, points.tipX + side * 4, points.tipY - 2);
  ctx.quadraticCurveTo(points.innerX, points.innerY, points.innerTipX, points.innerTipY);
  ctx.stroke();

  stroke(ctx, style.light, 2);
  ctx.beginPath();
  ctx.moveTo(points.rootX, points.rootY - 2);
  ctx.quadraticCurveTo(points.midX, points.midY - 4, points.tipX + side * 2, points.tipY - 2);
  ctx.stroke();

  fill(ctx, style.accent);
  rect(ctx, points.collarX - 5, points.collarY - 3, 10, 6);
  fill(ctx, weaponId === 'demonseedScythe' ? '#ff4b3e' : style.light);
  circle(ctx, points.collarX, points.collarY, 3);
}

function drawLegendaryBow(ctx, gripX, gripY, side, weaponId, facing = 'right') {
  const style = getLegendaryStyle(weaponId);
  const pose = getBowPose(gripX, gripY, side, facing, 22);

  stroke(ctx, style.dark, 6);
  ctx.beginPath();
  ctx.moveTo(pose.topX, pose.topY);
  ctx.quadraticCurveTo(pose.outerX + side * 2, pose.outerTopY, pose.gripX, pose.gripY);
  ctx.quadraticCurveTo(pose.outerX + side * 2, pose.outerBottomY, pose.bottomX, pose.bottomY);
  ctx.stroke();

  stroke(ctx, style.accent, 3);
  ctx.beginPath();
  ctx.moveTo(pose.topX, pose.topY + 1);
  ctx.quadraticCurveTo(pose.outerX, pose.outerTopY + 1, pose.gripX, pose.gripY);
  ctx.quadraticCurveTo(pose.outerX, pose.outerBottomY - 1, pose.bottomX, pose.bottomY - 1);
  ctx.stroke();

  stroke(ctx, style.light, 1);
  line(ctx, pose.topX, pose.topY, pose.bottomX, pose.bottomY);
  stroke(ctx, style.metal, 5);
  line(ctx, pose.gripX, pose.gripY - 3, pose.gripX, pose.gripY + 3);

  fill(ctx, '#ff4b3e');
  triangle(
    ctx,
    pose.gripX + side * 1,
    pose.gripY - 3,
    pose.gripX + side * 8,
    pose.gripY,
    pose.gripX + side * 1,
    pose.gripY + 3
  );
}

function getBowPose(gripX, gripY, side, facing, height = 20) {
  const verticalTilt = facing === 'down' ? 1 : facing === 'up' ? -1 : 0;
  const topX = gripX - side * verticalTilt * 2;
  const bottomX = gripX + side * verticalTilt * 2;
  const outward = facing === 'down' || facing === 'up' ? 13 : 15;

  return {
    gripX,
    gripY,
    topX,
    topY: gripY - height,
    bottomX,
    bottomY: gripY + height,
    outerX: gripX + side * outward,
    outerTopY: gripY - height * 0.55,
    outerBottomY: gripY + height * 0.55
  };
}

function isLegendaryItem(itemId) {
  return !!itemId && ITEMS[itemId]?.rarity === 'legendary';
}

function isLegendaryArmour(itemId) {
  const item = ITEMS[itemId];
  return !!item && item.rarity === 'legendary' && (item.type === 'armour' || item.slot === 'helm' || item.slot === 'chest' || item.slot === 'legs');
}

function getLegendaryStyle(itemId) {
  const hint = LEGENDARY_ITEM_STYLE_HINTS[itemId] || '';
  const id = `${itemId || ''} ${hint}`.toLowerCase();

  if (id.includes('demon') || id.includes('redseal')) {
    return {
      accent: '#ff4b3e',
      core: '#311018',
      dark: '#10070a',
      light: '#ffb35f',
      metal: '#7a2530'
    };
  }

  if (id.includes('lich') || id.includes('crown') || id.includes('endless')) {
    return {
      accent: '#b68cff',
      core: '#24142f',
      dark: '#0d0a12',
      light: '#e9dcff',
      metal: '#85719b'
    };
  }

  if (id.includes('thorn') || id.includes('briar')) {
    return {
      accent: '#73d18a',
      core: '#18351f',
      dark: '#0d1910',
      light: '#d6ffb2',
      metal: '#7fa36d'
    };
  }

  if (id.includes('sun') || id.includes('oath') || id.includes('seraph')) {
    return {
      accent: '#ffcc66',
      core: '#5a4320',
      dark: '#1d1820',
      light: '#fff0b0',
      metal: '#d9ad4f'
    };
  }

  if (id.includes('zephyr') || id.includes('veyrglass') || id.includes('aegis')) {
    return {
      accent: '#66f0ff',
      core: '#153d4c',
      dark: '#0b111a',
      light: '#d8fbff',
      metal: '#72b8d1'
    };
  }

  if (id.includes('blackstar') || id.includes('mercenary') || id.includes('fellhunter')) {
    return {
      accent: '#ffcc66',
      core: '#1c1d28',
      dark: '#07090f',
      light: '#f2f4f8',
      metal: '#5e7486'
    };
  }

  return {
    accent: '#ffcc66',
    core: '#2c2530',
    dark: '#111119',
    light: '#fff0b0',
    metal: '#d9ad4f'
  };
}

// -----------------------------------------------------------------------------
// GENERAL HELPERS
// -----------------------------------------------------------------------------

function normalizeItemId(itemRef) {
  if (!itemRef) return null;
  if (typeof itemRef === 'string') return itemRef;
  return itemRef.id || null;
}

function getFacing(dirX, dirY) {
  if (Math.abs(dirX) > Math.abs(dirY)) {
    return dirX < 0 ? 'left' : 'right';
  }

  if (dirY < -0.15) return 'up';
  return 'down';
}

// -----------------------------------------------------------------------------
// LOW-LEVEL DRAW HELPERS
// -----------------------------------------------------------------------------

function fill(ctx, color) {
  ctx.fillStyle = color;
}

function stroke(ctx, color, width = 1) {
  ctx.strokeStyle = color;
  ctx.lineWidth = width;
}

function rect(ctx, x, y, w, h) {
  ctx.fillRect(Math.round(x), Math.round(y), Math.round(w), Math.round(h));
}

function rectStroke(ctx, x, y, w, h) {
  ctx.strokeRect(Math.round(x), Math.round(y), Math.round(w), Math.round(h));
}

function line(ctx, x1, y1, x2, y2) {
  ctx.beginPath();
  ctx.moveTo(Math.round(x1), Math.round(y1));
  ctx.lineTo(Math.round(x2), Math.round(y2));
  ctx.stroke();
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

function arc(ctx, x, y, r, start, end) {
  ctx.beginPath();
  ctx.arc(Math.round(x), Math.round(y), r, start, end);
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

function poly(ctx, points) {
  if (!points.length) return;

  ctx.beginPath();
  ctx.moveTo(Math.round(points[0][0]), Math.round(points[0][1]));

  for (let i = 1; i < points.length; i++) {
    ctx.lineTo(Math.round(points[i][0]), Math.round(points[i][1]));
  }

  ctx.closePath();
  ctx.fill();
}

function shadow(ctx, x, y, rx, ry) {
  drawPixelGroundShadow(ctx, x, y, rx, ry, {
    alpha: 0.82
  });
}


