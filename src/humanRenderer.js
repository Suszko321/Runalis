// humanRenderer.js
// Runalis code-drawn humanoid renderer.
//
// Render order:
// - Ground shadow.
// - Silhouette underlay and base body.
// - Rear-facing weapons/off-hands behind the body; front/side gear above it.
// - Body remains code-drawn at the original gameplay scale.

import {drawVampireFace} from './vampireFaceArt.js';
import {drawHumanIdentityArt} from './humanIdentityArt.js';
import {drawFactionCloak,isFactionGuard,drawFactionGuard} from './factionEquipmentArt.js';
import { humanSpriteReady, drawHumanSprite,asset,drawRestingWeaponHand,applyHumanTorsoMotion } from './spriteArt.js';
import { drawCreatorAccessoryArt,drawCreatorCloakArt } from './creatorAccessoryArt.js';
import { drawFaceDetailArt } from './faceDetailArt.js';
import {meleeArmReady,drawMeleeArms,sampleArmoredArms} from './meleeArmArt.js';
import {armorReplacement} from './armorMotionArt.js';
import {sampleMeleeRig} from './meleeRig.js';
import {weaponShoulderSide,weaponBehindBody,shieldBehindBody,shieldGrip} from './handedness.js';
import {drawSheathedWeapon} from './sheathedWeaponArt.js';
import {drawHandTrinketArt} from './handTrinketArt.js';
import {drawFacialHairArt} from './facialHairArt.js';
import {customHeadReady,drawCustomHead} from './headArt.js';
import { drawCodeGear } from './codeAssets.js';
import {
  applyHumanVisualProfile,
  getHumanVisualProfile
} from './humanVisualProfiles.js';
import { getHumanAnimationPose } from './playerAnimationController.js';
import {usesSideLocomotion,sideLocomotionTilt} from './humanLocomotionRig.js';
import {
  drawOutlinedText,
  drawPixelGroundShadow,
  getClassVisualPalette,
  MASTER_VISUAL_PALETTE
} from './visualStyle.js';

const APPEARANCE_ACCENT_COLORS = {
  brass: '#c89145',
  gold: '#ffd15c',
  silver: '#cbd3dd',
  white: '#f2f4f7',
  black: '#101116',
  bone: '#d6c8a6',
  rose: '#d66b8f',
  seaGlass: '#61d1c6',
  teal: '#2fd0bd',
  sapphire: '#4f8dff',
  emerald: '#54c46b',
  ruby: '#e0445f',
  sun: '#ffcf4f',
  ember: '#e7663c',
  violet: '#a57dff',
  shadow: '#3a3146'
};

const APPEARANCE_EYE_COLORS = {
  black: '#050507',
  hazel: '#b38a46',
  brown: '#53341d',
  amber: '#d8952e',
  green: '#6da06e',
  paleGreen: '#a9d38e',
  teal: '#4fc1b7',
  blue: '#74a7d8',
  cyan: '#70e8ff',
  gray: '#9aa1ab',
  silver: '#d6dce5',
  gold: '#ffd86b',
  violet: '#b58cff',
  red: '#e34b56'
};

export function drawHumanActor(ctx, actor, camera, options = {}) {
  const scale = options.scale ?? actor.scale ?? 1;

  const x = actor.x - camera.x;
  const y = actor.y - camera.y;

  const dirX = actor.dirX ?? 0;
  const dirY = actor.dirY ?? 1;

  const facing = getFacing(dirX, dirY);

  const animationPose = getHumanAnimationPose(actor, {
    now: options.animationTime,
    classId: actor.classId || options.classId || null,
    moving: Math.abs(dirX) > 0.05 || Math.abs(dirY) > 0.05
  });
  if(usesSideLocomotion(animationPose,facing)){
    // Hold four authored pixel poses. Fractional rocking/scaling made the
    // strip-based gait look like a smoothly deforming paper puppet.
    animationPose.bob=Math.abs(Math.floor(animationPose.gaitKey||0))%2?-1:0;
    animationPose.rootOffsetX=0;animationPose.rootOffsetY=0;
    animationPose.rootRotation=0;
    animationPose.rootScaleX=1;animationPose.rootScaleY=1;
  }
  const {
    bob,
    step,
    armSwing,
    blocking,
    attacking,
    attackProgress
  } = animationPose;

  const skin = options.skin || actor.skin || '#ffd1bd';
  const hair = options.hair || actor.hair || '#111111';
  const shirt = options.shirt || actor.shirt || '#f2a51f';
  const pants = options.pants || actor.pants || '#293fba';
  const boots = options.boots || actor.boots || '#3a2a22';
  const bodyType = options.bodyType || actor.bodyType || actor.appearance?.bodyType || 'male';
  const selectedHairStyle = options.hairStyle || actor.hairStyle || actor.appearance?.hairStyle || 'short';
  const hairStyle=selectedHairStyle==='tied'?'ponytail':selectedHairStyle;
  const classId = actor.classId || options.classId || null;
  const appearanceCosmetics = getActorAppearanceCosmetics(actor, options, {
    classId,
    shirt,
    hair
  });
  const headgear = normalizeItemId(actor.equipment?.helm);
  const baseVisualProfile = getHumanVisualProfile(actor, {
    ...options,
    bodyType,
    classId
  }, facing);
  const visualProfile = {
    ...baseVisualProfile,
    headLift: (baseVisualProfile.headLift || 0) + (animationPose.headLift || 0)
  };

  ctx.save();
  ctx.translate(Math.round(x), Math.round(y));
  ctx.scale(scale, scale);

  drawActorShadow(ctx, 0, 18, 16, 5);

  ctx.translate(animationPose.rootOffsetX || 0, animationPose.rootOffsetY || 0);
  if (animationPose.rootRotation) ctx.rotate(animationPose.rootRotation);
  ctx.scale(animationPose.rootScaleX || 1, animationPose.rootScaleY || 1);

  ctx.save();
  applyHumanVisualProfile(ctx, visualProfile);

  const useSprite = humanSpriteReady(bodyType);
  animationPose.bodyType = bodyType;
  animationPose.hairStyle = hairStyle;
  if (useSprite && usesSideLocomotion(animationPose, facing)) {
    // One rigid upper-body motion carries the head, torso, arms and gear.
    // The sprite and legwear renderers undo it below the shared belt seam.
    animationPose.sideLocomotionTilt = sideLocomotionTilt(animationPose, facing);
    animationPose.sideLocomotionArms = !!asset('melee-arm-parts')?.ready;
    applyHumanTorsoMotion(ctx, animationPose, bob);
  }
  const articulatedArms=useSprite&&meleeArmReady(animationPose);
  const armoredArms=useSprite&&armorReplacement(actor,'chest')&&!!asset('melee-arm-parts')?.ready;
  animationPose.fittedTorso = !!armoredArms;
  animationPose.locomotionArms = !!animationPose.sideLocomotionArms
    || (!!armoredArms && ['walk','run'].includes(animationPose.state));
  const replacementLegs=useSprite&&armorReplacement(actor,'legs');
  const replacementGloves=replacementLegs&&!armoredArms&&!!asset('melee-arm-parts')?.ready;
  const modularArms=articulatedArms||armoredArms||animationPose.sideLocomotionArms;
  const rearWeapon=weaponBehindBody(facing);
  const rearArm=rearWeapon?'primary':modularArms&&facing==='left'?'support':null;
  const frontArm=rearArm==='primary'?'support':rearArm==='support'?'primary':'all';
  const armActor={...actor,skin,shirt,bodyType};
  const factionGuard=isFactionGuard(actor);
  const drawGuard=()=>drawFactionGuard(ctx,actor,facing,sampleArmoredArms(armActor,animationPose,facing,bob).support.hand);
  const drawArms=(layer,selection)=>drawMeleeArms(ctx,armActor,animationPose,facing,bob,layer,selection,armoredArms);
  const drawLegwearGloves=selection=>drawMeleeArms(ctx,armActor,animationPose,facing,bob,'hands',selection,true);
  const handParts={bodyType,hairStyle,skin,hair,shirt,pants,boots,facing,bob,animationPose};
  // The left arm is the far arm facing east, and the near arm facing west.
  if(options.weaponSheathed&&facing!=='up')drawSheathedWeapon(ctx,actor,facing,bob);
  if(modularArms&&rearArm){drawArms('arms',rearArm);drawArms('hands',rearArm);}
  if(replacementGloves&&!modularArms&&(rearWeapon||facing==='left'))drawLegwearGloves(rearWeapon?'primary':'support');
  if (rearWeapon&&!options.weaponSheathed) {
    drawEquippedWeaponLayer(ctx, actor, camera, {
      facing,
      bob,
      step,
      armSwing,
      scale,
      classId,
      animationPose,
      isPlayer: !!options.isPlayer,
      debugEquipmentOrientation: !!(options.debugEquipmentOrientation || actor.debugEquipmentOrientation)
    });

    if(modularArms)drawArms('hands','primary');
    else if(replacementGloves)drawLegwearGloves('primary');
    else if(useSprite)drawRestingWeaponHand(ctx,handParts);
  }
  if(blocking&&shieldBehindBody(facing))drawBlockPoseOverlay(ctx,facing,bob,classId);
  if (!useSprite) drawHumanSilhouetteOutline(ctx, {
    facing,
    bob,
    step,
    armSwing,
    visualProfile,
    animationPose
  });

  drawAppearanceCloakBase(ctx, {
    bodyType,
    equipment:actor.equipment,
    facing,
    bob,
    step,
    appearanceCosmetics,
    visualProfile,
    animationPose
  });

  if(actor.veyreignLord){ctx.fillStyle='#451528';ctx.beginPath();ctx.moveTo(-13,-30+bob);ctx.lineTo(13,-30+bob);ctx.lineTo(22,15+bob);ctx.lineTo(-22,15+bob);ctx.fill();ctx.fillStyle='#b79359';ctx.fillRect(-13,-29+Math.round(bob),26,2);}
  drawFactionCloak(ctx,actor,facing,bob,animationPose,false);
  if(factionGuard&&shieldBehindBody(facing))drawGuard();
  const spriteUsesClassicHead = customHeadReady() || !['short', 'ponytail'].includes(hairStyle);
  if (useSprite) {
    ctx.save();
    // Keep the generated head, torso and legs; replace baked arms with jointed sprites.
    if(armoredArms){
      // Chest armour replaces the entire starter shirt and its baked sleeves.
      ctx.beginPath();ctx.rect(-100,-150,200,125+Math.round(bob));
      if(!replacementLegs)ctx.rect(-100,-4+Math.round(bob),200,104);
      ctx.clip();
    } else if(articulatedArms){
      // Both authored arms are replaced; retain only the neutral torso and legs.
      const torsoWidth=facing==='left'||facing==='right'?12:16;
      ctx.beginPath();ctx.rect(-100,-150,200,126+bob);
      ctx.rect(-torsoWidth/2,-24+bob,torsoWidth,27);
      ctx.rect(-100,3+bob,200,100);ctx.clip();
    }
    if(replacementLegs&&!armoredArms){
      // The original pants start at -5; gloves are restored as independent pieces.
      ctx.beginPath();ctx.rect(-100,-150,200,144+Math.round(bob));
      ctx.clip();
    }
    drawHumanSprite(ctx, { bodyType, hairStyle, skin, hair, shirt, pants, boots, facing, bob, hideLegs:replacementLegs, animationPose:articulatedArms&&!armoredArms?{...animationPose,state:'idle',attacking:false,weaponType:'unarmed'}:animationPose, bodyOnly: spriteUsesClassicHead });
    ctx.restore();
    if (spriteUsesClassicHead) {
      if(customHeadReady())drawCustomHead(ctx,{bodyType,hairStyle,facing,bob,skin,hair,eyeColor:appearanceCosmetics?.eyeColor});
      else {
      const head = { bob, skin, hair, hairStyle, headgear, headLift: visualProfile.headLift || 0, side: facing === 'left' ? -1 : 1 };
      if (facing === 'up') drawBackHead(ctx, head);
      else if (facing === 'down') drawFrontHead(ctx, head);
      else drawSideHead(ctx, head);
      }
    }
  } else if (facing === 'up') {
    drawBackBody(ctx, {
      bob,
      step,
      armSwing,
      skin,
      hair,
      shirt,
      pants,
      boots,
      bodyType,
      hairStyle,
      headgear,
      visualProfile,
      blocking,
      animationPose
    });
  } else {
    drawFrontOrSideBody(ctx, {
      bob,
      step,
      armSwing,
      skin,
      hair,
      shirt,
      pants,
      boots,
      bodyType,
      hairStyle,
      headgear,
      visualProfile,
      appearanceCosmetics,
      facing,
      blocking,
      attacking,
      attackProgress,
      animationPose
      });
  }

  if (!useSprite) drawHumanModelPolish(ctx, {
    facing,
    bob,
    step,
    classId,
    shirt,
    pants,
    boots,
    skin,
    visualProfile,
    blocking
  });

  drawHumanIdentityOverlay(ctx, {
    actor,
    bodyType,
    facing,
    bob,
    visualFactionId: options.visualFactionId || actor.visualFactionId,
    professionId: options.professionId || actor.professionId,
    role: options.role || actor.role
  });

  drawAppearanceCosmetics(ctx, {
    bodyType,
    facing,
    bob,
    animationPose,
    hairStyle,
    classId,
    skin,
    hair,
    shirt,
    headgear,
    appearanceCosmetics,
    visualProfile: useSprite && (!spriteUsesClassicHead || customHeadReady())
      ? { ...visualProfile, headLift: (visualProfile.headLift || 0) - 9 }
      : visualProfile
  });

  drawCodeGear(ctx, actor, camera, {
    local: true,
    facing,
    bob,
    step,
    armSwing,
    scale,
    classId,
    layer: 'outfit',
    animationPose,
    isPlayer: !!options.isPlayer
  });

  const cloakParts={bodyType,equipment:actor.equipment,facing,bob,animationPose,shirt,appearanceCosmetics,visualProfile};
  drawAppearanceBackFacingCloak(ctx,cloakParts);
  drawFactionCloak(ctx,actor,facing,bob,animationPose,true);
  drawAppearanceCloakCollar(ctx,cloakParts);

  if(!factionGuard)drawCodeGear(ctx, actor, camera, {
    local: true,
    facing,
    bob,
    step,
    armSwing,
    scale,
    classId,
    layer: 'trinket',
    animationPose,
    isPlayer: !!options.isPlayer
  });

  if(options.weaponSheathed&&facing==='up')drawSheathedWeapon(ctx,actor,facing,bob);
  if(modularArms)drawArms('arms',frontArm);

  if (blocking && !shieldBehindBody(facing)) {
    drawBlockPoseOverlay(ctx, facing, bob, classId);
  }

  if (!rearWeapon&&!options.weaponSheathed) {
    drawEquippedWeaponLayer(ctx, actor, camera, {
      facing,
      bob,
      step,
      armSwing,
      scale,
      classId,
      animationPose,
      isPlayer: !!options.isPlayer,
      debugEquipmentOrientation: !!(options.debugEquipmentOrientation || actor.debugEquipmentOrientation)
    });
  }

  if(modularArms)drawArms('hands',frontArm);
  else if(replacementGloves)drawLegwearGloves(rearWeapon?'support':facing==='left'?'primary':'all');
  else if(useSprite&&!options.weaponSheathed&&!rearWeapon)drawRestingWeaponHand(ctx,handParts);
  drawHandTrinketArt(ctx,armActor,animationPose,facing,bob);
  drawVampireFace(ctx,actor,{bodyType,hairStyle,facing,bob});
  if(factionGuard&&!shieldBehindBody(facing))drawGuard();

  ctx.restore();
  ctx.restore();

  if (options.name) {
    drawNameLabel(ctx, options.name, x, y - 48 * scale);
  }
}

// Developer-only visual regression helper. Call from a debug canvas/tool to
// compare every facing and optional weapon list with grip markers enabled.
export function drawHumanEquipmentOrientationPreview(ctx, actor, options = {}) {
  if (!ctx || !actor) return;

  const facings = [
    { id: 'North', dirX: 0, dirY: -1 },
    { id: 'South', dirX: 0, dirY: 1 },
    { id: 'West', dirX: -1, dirY: 0 },
    { id: 'East', dirX: 1, dirY: 0 }
  ];
  const currentWeapon = normalizeItemId(actor.equipment?.weapon);
  const weaponIds = Array.isArray(options.weaponIds) && options.weaponIds.length
    ? options.weaponIds
    : [currentWeapon];
  const cellWidth = Number(options.cellWidth || 112);
  const cellHeight = Number(options.cellHeight || 112);
  const originX = Number(options.x || 64);
  const originY = Number(options.y || 74);

  weaponIds.forEach((weaponId, row) => {
    facings.forEach((facing, column) => {
      const previewActor = {
        ...actor,
        equipment: {
          ...(actor.equipment || {}),
          weapon: weaponId
        },
        x: originX + column * cellWidth,
        y: originY + row * cellHeight,
        dirX: facing.dirX,
        dirY: facing.dirY,
        isMoving: false,
        debugEquipmentOrientation: true
      };

      drawHumanActor(ctx, previewActor, { x: 0, y: 0 }, {
        ...options,
        name: `${facing.id}${weaponId ? ` - ${weaponId}` : ''}`,
        debugEquipmentOrientation: true
      });
    });
  });
}

function drawEquippedWeaponLayer(ctx, actor, camera, options) {
  drawCodeGear(ctx, actor, camera, {
    ...options,
    local: true,
    layer: 'weapon'
  });
}

function drawHumanModelPolish(ctx, parts) {
  const {
    facing,
    bob,
    step,
    shirt,
    pants,
    boots,
    skin,
    blocking,
    visualProfile
  } = parts;
  const side = facing === 'left' ? -1 : 1;
  const isSide = facing === 'left' || facing === 'right';

  ctx.save();

  ctx.globalAlpha = 0.85;
  fill(ctx, darken(shirt, 0.24));

  if (isSide) {
    roundedRect(ctx, -7, -8 + bob, 14, 5, 2);
    fill(ctx, darken(shirt, 0.04));
    rect(ctx, side * 3 - 1, -18 + bob, 3, 14);
  } else {
    roundedRect(ctx, -10, -8 + bob, 20, 5, 2);
    fill(ctx, darken(shirt, 0.04));
    rect(ctx, -2, -18 + bob, 4, 14);
  }

  fill(ctx, getClassVisualPalette(parts.classId).accent);
  rect(ctx, isSide ? side * 5 - 1 : -2, -7 + bob, 4, 3);

  fill(ctx, darken(shirt, 0.34));
  if (isSide) {
    rect(ctx, -7, -24 + bob + (visualProfile?.shoulderBias || 0) * 0.2, 14, 3);
  } else {
    rect(ctx, -12 - (visualProfile?.shoulderBias || 0), -24 + bob, 24 + (visualProfile?.shoulderBias || 0) * 2, 3);
  }

  fill(ctx, darken(pants, 0.18));
  if (isSide) {
    rect(ctx, -5, 6 + bob, 10, 2);
    rect(ctx, -5, 14 + bob, 10, 2);
  } else {
    rect(ctx, -9, 6 + bob + step * 0.16, 7, 2);
    rect(ctx, 2, 6 + bob - step * 0.16, 7, 2);
  }

  ctx.globalAlpha = 0.45;
  fill(ctx, lighten(skin, 0.07));
  if (!isSide) {
    rect(ctx, -7, -41 + bob, 4, 2);
    rect(ctx, 3, -41 + bob, 4, 2);
  }

  fill(ctx, darken(boots, 0.12));
  rect(ctx, isSide ? -6 : -11, 18 + bob + (isSide ? 0 : Math.max(0, step) * 0.08), isSide ? 12 : 9, 2);
  if (!isSide) {
    rect(ctx, 2, 18 + bob + Math.max(0, -step) * 0.08, 9, 2);
  }

  ctx.restore();
}

function drawHumanIdentityOverlay(ctx, parts) {
  drawHumanIdentityArt(ctx, parts);
}

function drawHumanSilhouetteOutline(ctx, parts) {
  const { facing, bob, step, armSwing, visualProfile, animationPose } = parts;
  const isSide = facing === 'left' || facing === 'right';
  const side = facing === 'left' ? -1 : 1;
  const frontHandX = animationPose?.frontHandOffsetX || 0;
  const frontHandY = animationPose?.frontHandOffsetY || 0;
  const backHandX = animationPose?.backHandOffsetX || 0;
  const backHandY = animationPose?.backHandOffsetY || 0;

  ctx.save();
  ctx.globalAlpha = visualProfile?.outlineAlpha || 1;
  fill(ctx, MASTER_VISUAL_PALETTE.outline);
  ctx.strokeStyle = MASTER_VISUAL_PALETTE.outline;
  ctx.lineCap = 'round';
  ctx.lineWidth = 7;

  if (isSide) {
    roundedRect(ctx, -10, -50 + bob, 20, 26, 7);
    roundedRect(ctx, -9 - (visualProfile?.shoulderBias || 0), -28 + bob, 18 + (visualProfile?.shoulderBias || 0) * 2, 31, 5);
    line(ctx, side * 5, -22 + bob, side * 16 + frontHandX, -6 + bob - armSwing * 0.2 + frontHandY);
    roundedRect(ctx, -7 - (visualProfile?.stanceWidth || 0) * 0.25, 0 + bob, 10, 22, 4);
    roundedRect(ctx, -3 + (visualProfile?.stanceWidth || 0) * 0.25, 1 + bob, 10, 21, 4);
  } else {
    roundedRect(ctx, -12, -50 + bob, 24, 25, 7);
    roundedRect(ctx, -13 - (visualProfile?.shoulderBias || 0), -28 + bob, 26 + (visualProfile?.shoulderBias || 0) * 2, 31, 5);
    line(ctx, -10, -21 + bob, -16 + backHandX, -5 + bob - armSwing * 0.2 + backHandY);
    line(ctx, 10, -21 + bob, 16 + frontHandX, -5 + bob + armSwing * 0.2 + frontHandY);
    roundedRect(ctx, -11 - (visualProfile?.stanceWidth || 0) * 0.5, 0 + bob + step * 0.12, 10, 22, 4);
    roundedRect(ctx, 1 + (visualProfile?.stanceWidth || 0) * 0.5, 0 + bob - step * 0.12, 10, 22, 4);
  }

  ctx.restore();
}

// -----------------------------------------------------------------------------
// BODY DRAWING
// -----------------------------------------------------------------------------

function drawFrontOrSideBody(ctx, parts) {
  const {
    bob,
    step,
    armSwing,
    skin,
    hair,
    shirt,
    pants,
    boots,
    bodyType,
    hairStyle,
    headgear,
    visualProfile,
    facing,
    appearanceCosmetics,
    blocking,
    attacking,
    attackProgress,
    animationPose
  } = parts;

  const side = facing === 'left' ? -1 : 1;
  const isSide = facing === 'left' || facing === 'right';

  const frontLegOffset = animationPose?.frontLegStride ?? step;
  const backLegOffset = animationPose?.backLegStride ?? -step;

  const attackReach = attacking ? Math.sin(attackProgress * Math.PI) * 8 : 0;
  const frontArmOffset = blocking ? -1.5 : -armSwing;
  const backArmOffset = blocking ? 1.5 : armSwing;

  if (isSide) {
    drawSideBody(ctx, {
      bob,
      side,
      frontLegOffset,
      backLegOffset,
      frontArmOffset,
      backArmOffset,
      attackReach,
      skin,
      hair,
      shirt,
      pants,
      boots,
      bodyType,
      hairStyle,
      headgear,
      visualProfile,
      appearanceCosmetics,
      blocking,
      attacking,
      attackProgress,
      animationPose
    });

    return;
  }

  drawFrontBody(ctx, {
    bob,
    frontLegOffset,
    backLegOffset,
    frontArmOffset,
    backArmOffset,
    attackReach,
    skin,
    hair,
    shirt,
    pants,
    boots,
    bodyType,
    hairStyle,
    headgear,
    visualProfile,
    blocking,
    attacking,
    attackProgress,
    animationPose
  });
}

function drawFrontBody(ctx, parts) {
  const {
    bob,
    frontLegOffset,
    backLegOffset,
    frontArmOffset,
    backArmOffset,
    attackReach,
    skin,
    hair,
    shirt,
    pants,
    boots,
    bodyType,
    hairStyle,
    headgear,
    visualProfile,
    appearanceCosmetics,
    blocking,
    animationPose
  } = parts;
  const shoulderBias = visualProfile?.shoulderBias || 0;
  const frontHandX = animationPose?.frontHandOffsetX || 0;
  const frontHandY = animationPose?.frontHandOffsetY || 0;
  const backHandX = animationPose?.backHandOffsetX || 0;
  const backHandY = animationPose?.backHandOffsetY || 0;

  drawLongHairBack(ctx, {
    bob,
    hair,
    bodyType,
    hairStyle,
    facing: 'down',
    headgear
  });

  drawLimbSegment(ctx, {
    x1: -11 - shoulderBias,
    y1: -20 + bob + backArmOffset * 0.32,
    x2: -15 + backHandX,
    y2: -6 + bob + backArmOffset * 0.38 + backHandY,
    width: 5,
    color: skin
  });

  drawLimbSegment(ctx, {
    x1: 11 + shoulderBias,
    y1: -20 + bob + frontArmOffset * 0.32,
    x2: blocking ? 8 : 15 + attackReach + frontHandX,
    y2: blocking ? -16 + bob : -6 + bob + frontArmOffset * 0.38 + frontHandY,
    width: 5,
    color: skin
  });

  drawLeg(ctx, -6, 0 + bob + frontLegOffset * 0.12, frontLegOffset, pants, boots, animationPose, false);
  drawLeg(ctx, 5, 0 + bob + backLegOffset * 0.12, backLegOffset, pants, boots, animationPose, true);

  fill(ctx, darken(skin, 0.04));
  roundedRect(ctx, -4, -29 + bob, 8, 8, 3);

  fill(ctx, darken(shirt, 0.08));
  polygon(ctx, [
    [-12 - shoulderBias, -25 + bob],
    [12 + shoulderBias, -25 + bob],
    [10, 1 + bob],
    [-10, 1 + bob]
  ]);

  fill(ctx, shirt);
  polygon(ctx, [
    [-10, -24 + bob],
    [10, -24 + bob],
    [8, 0 + bob],
    [-8, 0 + bob]
  ]);

  fill(ctx, lighten(shirt, 0.13));
  polygon(ctx, [
    [-7, -22 + bob],
    [-2, -22 + bob],
    [-3, -1 + bob],
    [-8, -1 + bob]
  ]);

  fill(ctx, darken(shirt, 0.16));
  rect(ctx, -1, -22 + bob, 2, 21);

  drawWristCuff(ctx, -15 + backHandX, -11 + bob + backArmOffset * 0.38 + backHandY, shirt, false);
  drawWristCuff(ctx, 15 + attackReach + frontHandX, -11 + bob + frontArmOffset * 0.38 + frontHandY, shirt, false);
  drawHand(ctx, -15 + backHandX, -5 + bob + backArmOffset * 0.38 + backHandY, skin, -1);
  drawHand(ctx, 15 + attackReach + frontHandX, -5 + bob + frontArmOffset * 0.38 + frontHandY, skin, 1);

  drawFrontHead(ctx, {
    bob,
    skin,
    hair,
    bodyType,
    hairStyle,
    headgear,
    headLift: visualProfile?.headLift || 0
  });
}

function drawSideBody(ctx, parts) {
  const {
    bob,
    side,
    frontLegOffset,
    backLegOffset,
    frontArmOffset,
    backArmOffset,
    attackReach,
    skin,
    hair,
    shirt,
    pants,
    boots,
    bodyType,
    hairStyle,
    headgear,
    visualProfile,
    appearanceCosmetics,
    blocking,
    animationPose
  } = parts;
  const shoulderBias = visualProfile?.shoulderBias || 0;
  const frontHandX = animationPose?.frontHandOffsetX || 0;
  const frontHandY = animationPose?.frontHandOffsetY || 0;
  const backHandX = animationPose?.backHandOffsetX || 0;
  const backHandY = animationPose?.backHandOffsetY || 0;

  drawLongHairBack(ctx, {
    bob,
    hair,
    bodyType,
    hairStyle,
    facing: 'side',
    side,
    headgear
  });

  if (appearanceCosmetics?.cloak) {
    drawSideBackCloak(ctx, {
      bob,
      side,
      appearanceCosmetics,
      visualProfile,
      animationPose
    });
  } else {
    // Back arm behind torso. Cloaks suppress this limb so the fabric reads as
    // covering the far-side shoulder and arm.
    drawLimbSegment(ctx, {
      x1: -side * 4,
      y1: -20 + bob + backArmOffset * 0.32,
      x2: -side * 9 + backHandX,
      y2: -5 + bob + backArmOffset * 0.38 + backHandY,
      width: 5,
      color: darken(skin, 0.04)
    });
  }

  drawSideLeg(ctx, -side * 1, 0 + bob, backLegOffset, pants, boots, true, animationPose, side);
  drawSideLeg(ctx, side * 3, 0 + bob, frontLegOffset, pants, boots, false, animationPose, side);

  fill(ctx, darken(skin, 0.04));
  roundedRect(ctx, -4, -29 + bob, 8, 8, 3);

  fill(ctx, darken(shirt, 0.1));
  polygon(ctx, [
    [-9, -25 + bob],
    [8, -25 + bob],
    [7, 0 + bob],
    [-7, 0 + bob]
  ]);

  fill(ctx, shirt);
  polygon(ctx, [
    [-7, -24 + bob],
    [7, -24 + bob],
    [6, -1 + bob],
    [-6, -1 + bob]
  ]);

  fill(ctx, lighten(shirt, 0.1));
  rect(ctx, -side * 5, -21 + bob, 4, 19);

  // The front arm carries one compact hand shape so weapons have a readable
  // attachment point without restoring the old detached side-facing nub.
  drawLimbSegment(ctx, {
    x1: side * (7 + shoulderBias),
    y1: -20 + bob + frontArmOffset * 0.3,
    x2: side * (blocking ? 8 : 12 + attackReach) + frontHandX,
    y2: blocking ? -16 + bob : -4 + bob + frontArmOffset * 0.36 + frontHandY,
    width: 5,
    color: skin
  });

  drawWristCuff(
    ctx,
    side * (blocking ? 8 : 12 + attackReach) + frontHandX,
    blocking ? -19 + bob : -8 + bob + frontArmOffset * 0.36 + frontHandY,
    shirt,
    true
  );
  drawHand(
    ctx,
    side * (blocking ? 8 : 12 + attackReach) + frontHandX,
    blocking ? -15 + bob : -4 + bob + frontArmOffset * 0.36 + frontHandY,
    skin,
    side
  );

  drawSideHead(ctx, {
    bob,
    side,
    skin,
    hair,
    bodyType,
    hairStyle,
    headgear,
    headLift: visualProfile?.headLift || 0
  });
}

function drawBackBody(ctx, parts) {
  const {
    bob,
    step,
    armSwing,
    skin,
    hair,
    shirt,
    pants,
    boots,
    bodyType,
    hairStyle,
    headgear,
    visualProfile,
    animationPose
  } = parts;
  const shoulderBias = visualProfile?.shoulderBias || 0;
  const frontHandX = animationPose?.frontHandOffsetX || 0;
  const frontHandY = animationPose?.frontHandOffsetY || 0;
  const backHandX = animationPose?.backHandOffsetX || 0;
  const backHandY = animationPose?.backHandOffsetY || 0;

  const leftLegOffset = animationPose?.frontLegStride ?? step;
  const rightLegOffset = animationPose?.backLegStride ?? -step;

  const leftArmOffset = -armSwing;
  const rightArmOffset = armSwing;

  drawLimbSegment(ctx, {
    x1: -11 - shoulderBias,
    y1: -20 + bob + leftArmOffset * 0.3,
    x2: -15 + frontHandX,
    y2: -6 + bob + leftArmOffset * 0.36 + frontHandY,
    width: 5,
    color: darken(skin, 0.06)
  });

  drawLimbSegment(ctx, {
    x1: 11 + shoulderBias,
    y1: -20 + bob + rightArmOffset * 0.3,
    x2: 15 + backHandX,
    y2: -6 + bob + rightArmOffset * 0.36 + backHandY,
    width: 5,
    color: darken(skin, 0.06)
  });

  drawWristCuff(ctx, -15 + frontHandX, -11 + bob + leftArmOffset * 0.36 + frontHandY, shirt, false);
  drawWristCuff(ctx, 15 + backHandX, -11 + bob + rightArmOffset * 0.36 + backHandY, shirt, false);
  drawHand(ctx, -15 + frontHandX, -5 + bob + leftArmOffset * 0.36 + frontHandY, darken(skin, 0.04), -1);
  drawHand(ctx, 15 + backHandX, -5 + bob + rightArmOffset * 0.36 + backHandY, darken(skin, 0.04), 1);

  drawLeg(ctx, -6, 0 + bob + leftLegOffset * 0.12, leftLegOffset, pants, boots, animationPose, false);
  drawLeg(ctx, 5, 0 + bob + rightLegOffset * 0.12, rightLegOffset, pants, boots, animationPose, true);

  fill(ctx, darken(skin, 0.08));
  roundedRect(ctx, -4, -29 + bob, 8, 8, 3);

  fill(ctx, darken(shirt, 0.18));
  polygon(ctx, [
    [-12 - shoulderBias, -25 + bob],
    [12 + shoulderBias, -25 + bob],
    [10, 1 + bob],
    [-10, 1 + bob]
  ]);

  fill(ctx, darken(shirt, 0.06));
  polygon(ctx, [
    [-9, -23 + bob],
    [9, -23 + bob],
    [7, 0 + bob],
    [-7, 0 + bob]
  ]);

  drawBackHead(ctx, {
    bob,
    skin,
    hair,
    bodyType,
    hairStyle,
    headgear,
    headLift: visualProfile?.headLift || 0
  });
}

function drawBlockPoseOverlay(ctx, facing, bob, classId) {
  const [x,gripY]=shieldGrip(facing);
  const y = gripY + bob;
  const palette = getClassVisualPalette(classId);

  ctx.save();
  ctx.globalAlpha = 0.96;

  fill(ctx, MASTER_VISUAL_PALETTE.outline);
  polygon(ctx, [
    [x, y - 12],
    [x + 10, y - 7],
    [x + 8, y + 11],
    [x, y + 17],
    [x - 8, y + 11],
    [x - 10, y - 7]
  ]);

  fill(ctx, palette.shadow);
  polygon(ctx, [
    [x, y - 9],
    [x + 7, y - 5],
    [x + 6, y + 9],
    [x, y + 14],
    [x - 6, y + 9],
    [x - 7, y - 5]
  ]);

  fill(ctx, palette.base);
  polygon(ctx, [
    [x, y - 7],
    [x + 5, y - 4],
    [x + 4, y + 6],
    [x, y + 10],
    [x - 4, y + 6],
    [x - 5, y - 4]
  ]);

  stroke(ctx, palette.accent, 2);
  line(ctx, x, y - 8, x, y + 11);
  line(ctx, x - 5, y + 2, x + 5, y + 2);

  fill(ctx, palette.effectLight || palette.light);
  rect(ctx, x - 2, y, 4, 4);

  ctx.restore();
}

// -----------------------------------------------------------------------------
// BODY PARTS
// -----------------------------------------------------------------------------

function drawFrontHead(ctx, parts) {
  const { bob, skin, hair, hairStyle = 'short', headgear, headLift = 0 } = parts;
  const y = bob - headLift;
  const covered = isCoveringHeadgear(headgear);

  fill(ctx, darken(skin, 0.1));
  polygon(ctx, [
    [-10, -44 + y],
    [10, -44 + y],
    [10, -34 + y],
    [6, -27 + y],
    [-6, -27 + y],
    [-10, -34 + y]
  ]);

  fill(ctx, skin);
  polygon(ctx, [
    [-8, -43 + y],
    [8, -43 + y],
    [8, -34 + y],
    [5, -29 + y],
    [-5, -29 + y],
    [-8, -34 + y]
  ]);

  ctx.globalAlpha = 0.42;
  fill(ctx, lighten(skin, 0.12));
  rect(ctx, -6, -42 + y, 6, 3);
  ctx.globalAlpha = 1;

  if (!covered && hairStyle !== 'shaved') {
    fill(ctx, darken(hair, 0.15));
    roundedRect(ctx, -11, -48 + y, 22, 8, 4);
    fill(ctx, hair);
    polygon(ctx, [
      [-10, -47 + y],
      [10, -47 + y],
      [8, -41 + y],
      [3, -44 + y],
      [-1, -40 + y],
      [-5, -44 + y],
      [-10, -40 + y]
    ]);
    rect(ctx, -10, -43 + y, 4, 8);
    rect(ctx, 6, -43 + y, 4, 8);
  } else if (!covered) {
    ctx.globalAlpha = 0.34;
    fill(ctx, hair);
    roundedRect(ctx, -8, -45 + y, 16, 3, 2);
    ctx.globalAlpha = 1;
  }

  fill(ctx, '#171513');
  rect(ctx, -5, -37 + y, 3, 2);
  rect(ctx, 3, -37 + y, 3, 2);

  fill(ctx, darken(skin, 0.22));
  rect(ctx, -1, -32 + y, 2, 2);
}

function drawSideHead(ctx, parts) {
  const { bob, side, skin, hair, hairStyle = 'short', headgear, headLift = 0 } = parts;
  const y = bob - headLift;
  const covered = isCoveringHeadgear(headgear);

  fill(ctx, darken(skin, 0.1));
  polygon(ctx, [
    [-8, -44 + y],
    [side * 9, -44 + y],
    [side * 11, -36 + y],
    [side * 7, -28 + y],
    [-side * 5, -28 + y],
    [-8, -35 + y]
  ]);

  fill(ctx, skin);
  polygon(ctx, [
    [-6, -43 + y],
    [side * 8, -43 + y],
    [side * 9, -37 + y],
    [side * 6, -30 + y],
    [-side * 4, -30 + y],
    [-6, -35 + y]
  ]);

  fill(ctx, skin);
  rect(ctx, side > 0 ? 7 : -10, -38 + y, 4, 4);

  if (!covered && hairStyle !== 'shaved') {
    fill(ctx, darken(hair, 0.14));
    roundedRect(ctx, -9, -48 + y, 18, 8, 4);
    fill(ctx, hair);
    polygon(ctx, [
      [-8, -47 + y],
      [8, -47 + y],
      [side * 7, -40 + y],
      [-side * 1, -43 + y],
      [-side * 8, -39 + y]
    ]);
    rect(ctx, -side * 9, -42 + y, 5, 12);
  } else if (!covered) {
    ctx.globalAlpha = 0.34;
    fill(ctx, hair);
    roundedRect(ctx, -7, -45 + y, 14, 3, 2);
    ctx.globalAlpha = 1;
  }

  fill(ctx, '#171513');
  rect(ctx, side > 0 ? 4 : -7, -37 + y, 3, 2);
}

function drawLongHairBack(ctx, parts) {
  const { bob, hair, hairStyle = 'short', facing, side = 1, headgear } = parts;

  if (!['long', 'tied'].includes(hairStyle) || isCoveringHeadgear(headgear)) return;

  fill(ctx, hair);

  if (facing === 'side') {
    if (hairStyle === 'tied') {
      roundedRect(ctx, side > 0 ? -9 : -5, -39 + bob, 8, 23, 4);
    } else {
      roundedRect(ctx, side > 0 ? -10 : -7, -43 + bob, 17, 28, 6);
    }
    return;
  }

  if (hairStyle === 'tied') {
    roundedRect(ctx, -3, -39 + bob, 6, 25, 4);
  } else {
    roundedRect(ctx, -13, -43 + bob, 6, 28, 4);
    roundedRect(ctx, 7, -43 + bob, 6, 28, 4);
  }
}

function drawBackHead(ctx, parts) {
  const { bob, skin, hair, hairStyle = 'short', headgear, headLift = 0 } = parts;
  const y = bob - headLift;
  const covered = isCoveringHeadgear(headgear);

  fill(ctx, darken(skin, 0.1));
  polygon(ctx, [
    [-10, -44 + y],
    [10, -44 + y],
    [9, -32 + y],
    [5, -27 + y],
    [-5, -27 + y],
    [-9, -32 + y]
  ]);

  if (!covered && hairStyle !== 'shaved') {
    const longBack = hairStyle === 'long';
    fill(ctx, darken(hair, 0.16));
    roundedRect(ctx, -12, -48 + y, 24, 9, 5);
    fill(ctx, hair);
    roundedRect(ctx, -10, -45 + y, 20, longBack ? 27 : 15, 4);
    ctx.globalAlpha = 0.35;
    fill(ctx, lighten(hair, 0.1));
    rect(ctx, -7, -44 + y, 5, longBack ? 21 : 10);
    ctx.globalAlpha = 1;
  } else if (!covered) {
    ctx.globalAlpha = 0.34;
    fill(ctx, hair);
    roundedRect(ctx, -9, -45 + y, 18, 4, 2);
    ctx.globalAlpha = 1;
  }
}

function drawWristCuff(ctx, x, y, shirt, sideView) {
  fill(ctx, darken(shirt, 0.28));
  roundedRect(ctx, x - (sideView ? 3 : 4), y, sideView ? 6 : 8, 5, 2);
  ctx.globalAlpha = 0.45;
  fill(ctx, lighten(shirt, 0.08));
  rect(ctx, x - (sideView ? 2 : 3), y + 1, sideView ? 3 : 4, 1);
  ctx.globalAlpha = 1;
}

function drawHand(ctx, x, y, skin, direction) {
  fill(ctx, darken(skin, 0.08));
  polygon(ctx, [
    [x - 3, y - 2],
    [x + 3, y - 2],
    [x + 4, y + 2],
    [x + direction * 2, y + 4],
    [x - 3, y + 2]
  ]);
  fill(ctx, skin);
  rect(ctx, x - 2, y - 1, 4, 3);
}

function isCoveringHeadgear(headgear) {
  if (!headgear) return false;
  return !['sunforgedHalo', 'crownOfTheEndless'].includes(headgear);
}

function drawLeg(ctx, x, y, step, pants, boots, gait = null, backLeg = false) {
  const gaitLift = backLeg ? gait?.backFootLift : gait?.frontFootLift;
  const lift = Number.isFinite(gaitLift) ? gaitLift : Math.max(0, Math.abs(step) - 0.65) * 0.75;
  const footShift = Math.max(-2.4, Math.min(2.4, step * 0.5));

  fill(ctx, darken(pants, 0.08));
  roundedRect(ctx, x - 4, y, 8, 17 - lift, 3);

  fill(ctx, pants);
  roundedRect(ctx, x - 3, y + 1, 6, 15 - lift, 2);

  fill(ctx, boots);
  roundedRect(ctx, x - 5 + footShift, y + 16 - lift, 10, 5, 2);
  fill(ctx, darken(boots, 0.25));
  rect(ctx, x - 5 + footShift, y + 19 - lift, 10, 2);
  ctx.globalAlpha = 0.4;
  fill(ctx, lighten(boots, 0.12));
  rect(ctx, x - 3 + footShift, y + 16 - lift, 5, 1);
  ctx.globalAlpha = 1;

  if (step > 0.9) {
    rect(ctx, x - 6 + footShift, y + 18 - lift, 3, 3);
  }
}

function drawSideLeg(ctx, x, y, step, pants, boots, backLeg, gait = null, side = 1) {
  const shade = backLeg ? darken(pants, 0.14) : pants;
  const gaitLift = backLeg ? gait?.backFootLift : gait?.frontFootLift;
  const lift = Number.isFinite(gaitLift) ? gaitLift : Math.max(0, Math.abs(step) - 1.05) * 0.35;
  const travel = Math.max(-7, Math.min(7, step * side * 1.55));
  const kneeX = x + travel * 0.46;
  const kneeY = y + 8 - lift * 0.35;
  const footX = x + travel;
  const footY = y + 17 - lift;

  ctx.save();
  ctx.lineCap = 'round';
  ctx.strokeStyle = darken(shade, 0.22);
  ctx.lineWidth = 9;
  line(ctx, x, y + 2, kneeX, kneeY);
  line(ctx, kneeX, kneeY, footX, footY);
  ctx.strokeStyle = shade;
  ctx.lineWidth = 6;
  line(ctx, x, y + 2, kneeX, kneeY);
  line(ctx, kneeX, kneeY, footX, footY);
  ctx.restore();

  fill(ctx, backLeg ? darken(boots, 0.12) : boots);
  roundedRect(ctx, footX - 5, footY - 1, 11, 5, 2);
  fill(ctx, darken(boots, 0.25));
  rect(ctx, footX - 5, footY + 2, 11, 2);
}

function drawLimbSegment(ctx, opts) {
  const {
    x1,
    y1,
    x2,
    y2,
    width,
    color
  } = opts;

  ctx.save();
  ctx.strokeStyle = color;
  ctx.lineWidth = width;
  ctx.lineCap = 'round';

  ctx.beginPath();
  ctx.moveTo(Math.round(x1), Math.round(y1));
  ctx.lineTo(Math.round(x2), Math.round(y2));
  ctx.stroke();

  ctx.restore();
}

// -----------------------------------------------------------------------------
// APPEARANCE COSMETICS
// -----------------------------------------------------------------------------

function getActorAppearanceCosmetics(actor, options, context = {}) {
  if (options?.suppressAppearanceCosmetics) return null;

  const appearance = {
    ...(actor?.appearance || {}),
    ...(options?.appearance || {})
  };
  const classPalette = getClassVisualPalette(context.classId);
  const accent = normalizeCosmeticColor(
    options?.outfitAccent ||
    actor?.outfitAccent ||
    appearance.outfitAccent ||
    APPEARANCE_ACCENT_COLORS[appearance.accentColor] ||
    classPalette.accent,
    classPalette.accent
  );
  const eyeColor = normalizeCosmeticColor(
    options?.eyeColor ||
    actor?.eyeColor ||
    APPEARANCE_EYE_COLORS[appearance.eyeColor],
    '#171513'
  );

  return {
    cloak: normalizeCosmeticId(options?.cloak || actor?.cloak || appearance.cloak),
    accessory: normalizeCosmeticId(options?.accessory || actor?.accessory || appearance.accessory),
    marking: normalizeCosmeticId(options?.marking || actor?.marking || appearance.marking),
    facialHair: normalizeCosmeticId(options?.facialHair || actor?.facialHair || appearance.facialHair),
    accent,
    eyeColor,
    cloakBase: darken(context.shirt || '#2b2f38', 0.38),
    cloakShadow: darken(context.shirt || '#2b2f38', 0.58),
    hair: context.hair || '#111111'
  };
}

function drawAppearanceCloakBase(ctx, parts) {
  if(drawCreatorCloakArt(ctx,parts,'back'))return;
  const {
    facing,
    bob,
    appearanceCosmetics,
    visualProfile,
    animationPose
  } = parts;

  if (!appearanceCosmetics?.cloak) return;

  const cloak = appearanceCosmetics.cloak;
  const side = facing === 'left' ? -1 : 1;
  const isSide = facing === 'left' || facing === 'right';
  const shoulderBias = visualProfile?.shoulderBias || 0;
  const sway = Math.max(-3, Math.min(3, Number(animationPose?.cloakSway || 0)));
  const shortCape = cloak === 'shortCape';
  const mantle = cloak === 'shoulderMantle';
  const bottom = mantle ? -9 : shortCape ? 5 : 16;
  const width = mantle ? 19 : shortCape ? 15 : 18;

  if (facing === 'up' || isSide) return;

  ctx.save();
  ctx.globalAlpha = mantle ? 0.78 : 0.86;

  fill(ctx, appearanceCosmetics.cloakShadow);

  if (isSide) {
    const back = -side;
    const outerBack = mantle ? 11 : shortCape ? 13 : 15;
    const innerBack = mantle ? 2 : 3;
    const sideBottom = mantle ? -8 : shortCape ? 4 : 14;

    polygon(ctx, [
      [back * (10 + shoulderBias), -25 + bob],
      [back * innerBack, -23 + bob],
      [back * (innerBack + 1) + sway * 0.1, sideBottom + bob],
      [back * outerBack + sway * 0.35, sideBottom + bob]
    ]);

    fill(ctx, appearanceCosmetics.cloakBase);
    polygon(ctx, [
      [back * (8 + shoulderBias), -24 + bob],
      [back * Math.max(1, innerBack - 1), -23 + bob],
      [back * innerBack + sway * 0.08, sideBottom - 2 + bob],
      [back * Math.max(9, outerBack - 3) + sway * 0.28, sideBottom - 2 + bob]
    ]);
  } else {
    polygon(ctx, [
      [-13 - shoulderBias, -26 + bob],
      [13 + shoulderBias, -26 + bob],
      [width + sway * 0.45, bottom + bob],
      [-width + sway * 0.15, bottom + bob]
    ]);

    fill(ctx, appearanceCosmetics.cloakBase);
    polygon(ctx, [
      [-11 - shoulderBias, -25 + bob],
      [11 + shoulderBias, -25 + bob],
      [Math.max(10, width - 2) + sway * 0.35, bottom - 2 + bob],
      [-Math.max(10, width - 2) + sway * 0.1, bottom - 2 + bob]
    ]);
  }

  ctx.globalAlpha = 0.55;
  stroke(ctx, darken(appearanceCosmetics.accent, 0.18), 1);

  if (isSide) {
    const back = -side;
    const outerBack = mantle ? 8 : shortCape ? 10 : 12;
    const sideBottom = mantle ? -10 : shortCape ? 2 : 12;
    line(ctx, back * (8 + shoulderBias), -24 + bob, back * outerBack + sway * 0.25, sideBottom + bob);
  } else {
    line(ctx, -11 - shoulderBias, -25 + bob, -Math.max(10, width - 2) + sway * 0.1, bottom - 2 + bob);
    line(ctx, 11 + shoulderBias, -25 + bob, Math.max(10, width - 2) + sway * 0.35, bottom - 2 + bob);
  }

  ctx.restore();
}

function drawSideBackCloak(ctx, parts) {
  // The shared cloth layer already dresses fallback bodies while assets load.
  if (asset('creator-cloaks')?.ready) return;
  const {
    bob,
    side,
    appearanceCosmetics,
    visualProfile,
    animationPose
  } = parts;

  if (!appearanceCosmetics?.cloak) return;

  const cloak = appearanceCosmetics.cloak;
  const shortCape = cloak === 'shortCape';
  const mantle = cloak === 'shoulderMantle';
  const back = -side;
  const shoulderBias = visualProfile?.shoulderBias || 0;
  const sway = Math.max(-3, Math.min(3, Number(animationPose?.cloakSway || 0)));
  const topOuter = mantle ? 10 : 12;
  const topInner = mantle ? 1 : 2;
  const bottomOuter = mantle ? 8 : shortCape ? 11 : 14;
  const bottomInner = mantle ? 2 : 3;
  const bottomY = mantle ? -8 : shortCape ? 4 : 14;

  ctx.save();
  ctx.globalAlpha = mantle ? 0.88 : 0.94;

  fill(ctx, appearanceCosmetics.cloakShadow);
  polygon(ctx, [
    [back * (topOuter + shoulderBias), -26 + bob],
    [back * topInner, -24 + bob],
    [back * bottomInner + sway * 0.08, bottomY + bob],
    [back * bottomOuter + sway * 0.32, bottomY + bob]
  ]);

  fill(ctx, appearanceCosmetics.cloakBase);
  polygon(ctx, [
    [back * (Math.max(8, topOuter - 2) + shoulderBias), -25 + bob],
    [back * Math.max(1, topInner - 1), -23 + bob],
    [back * bottomInner + sway * 0.06, bottomY - 2 + bob],
    [back * Math.max(8, bottomOuter - 3) + sway * 0.24, bottomY - 2 + bob]
  ]);

  ctx.globalAlpha = 0.5;
  stroke(ctx, darken(appearanceCosmetics.accent, 0.18), 1);
  line(
    ctx,
    back * (Math.max(8, topOuter - 2) + shoulderBias),
    -25 + bob,
    back * Math.max(8, bottomOuter - 3) + sway * 0.24,
    bottomY - 2 + bob
  );

  ctx.restore();
}

function drawAppearanceCosmetics(ctx, parts) {
  const {
    facing,
    bob,
    skin,
    hair,
    shirt,
    headgear,
    appearanceCosmetics,
    visualProfile
  } = parts;

  if (!appearanceCosmetics) return;

  drawAppearanceEyesAndMarking(ctx, {
    bodyType:parts.bodyType,
    facing,
    bob,
    hairStyle: parts.hairStyle,
    skin,
    appearanceCosmetics,
    visualProfile,
    headgear
  });
  drawAppearanceFacialHair(ctx, {
    bodyType:parts.bodyType,
    facing,
    bob,
    hairStyle: parts.hairStyle,
    hair,
    appearanceCosmetics,
    visualProfile,
    headgear
  });
  drawAppearanceAccessory(ctx, {
    bodyType:parts.bodyType,
    hairStyle:parts.hairStyle,
    facing,
    bob,
    appearanceCosmetics,
    visualProfile,
    headgear
  });
}

function drawAppearanceBackFacingCloak(ctx, parts) {
  if(drawCreatorCloakArt(ctx,parts,'front'))return;
  const {
    facing,
    bob,
    appearanceCosmetics,
    visualProfile
  } = parts;

  if (facing !== 'up' || !appearanceCosmetics?.cloak) return;

  const cloak = appearanceCosmetics.cloak;
  const shortCape = cloak === 'shortCape';
  const mantle = cloak === 'shoulderMantle';
  const shoulderBias = visualProfile?.shoulderBias || 0;
  const bottom = mantle ? -9 : shortCape ? 5 : 17;
  const topWidth = mantle ? 17 : 14;
  const bottomWidth = mantle ? 16 : shortCape ? 13 : 15;

  ctx.save();
  ctx.globalAlpha = mantle ? 0.84 : 0.9;

  fill(ctx, appearanceCosmetics.cloakShadow);
  polygon(ctx, [
    [-topWidth - shoulderBias, -27 + bob],
    [topWidth + shoulderBias, -27 + bob],
    [bottomWidth, bottom + bob],
    [-bottomWidth, bottom + bob]
  ]);

  fill(ctx, appearanceCosmetics.cloakBase);
  polygon(ctx, [
    [-topWidth + 2 - shoulderBias, -26 + bob],
    [topWidth - 2 + shoulderBias, -26 + bob],
    [Math.max(9, bottomWidth - 2), bottom - 2 + bob],
    [-Math.max(9, bottomWidth - 2), bottom - 2 + bob]
  ]);

  ctx.globalAlpha = 0.38;
  fill(ctx, lighten(appearanceCosmetics.cloakBase, 0.12));
  rect(ctx, -2, -23 + bob, 4, Math.max(4, bottom - -23));

  ctx.globalAlpha = 0.58;
  stroke(ctx, darken(appearanceCosmetics.accent, 0.18), 1);
  line(ctx, -topWidth + 2 - shoulderBias, -26 + bob, -Math.max(9, bottomWidth - 2), bottom - 2 + bob);
  line(ctx, topWidth - 2 + shoulderBias, -26 + bob, Math.max(9, bottomWidth - 2), bottom - 2 + bob);

  ctx.restore();
}

function drawAppearanceCloakCollar(ctx, parts) {
  if(drawCreatorCloakArt(ctx,parts,'collar'))return;
  const {
    facing,
    bob,
    shirt,
    appearanceCosmetics,
    visualProfile
  } = parts;

  if (!appearanceCosmetics?.cloak) return;

  const side = facing === 'left' ? -1 : 1;
  const isSide = facing === 'left' || facing === 'right';
  const shoulderBias = visualProfile?.shoulderBias || 0;
  const collar = appearanceCosmetics.cloak === 'shoulderMantle';

  ctx.save();
  ctx.globalAlpha = 0.95;
  fill(ctx, collar ? appearanceCosmetics.cloakBase : darken(shirt, 0.32));

  if (isSide) {
    const back = -side;
    const x = back < 0 ? -11 - shoulderBias * 0.2 : -1 + shoulderBias * 0.2;
    roundedRect(ctx, x, -27 + bob, 12 + shoulderBias * 0.2, collar ? 7 : 4, 2);
    fill(ctx, appearanceCosmetics.accent);
    rect(ctx, back < 0 ? -8 : 4, -25 + bob, 4, 2);
  } else {
    roundedRect(ctx, -13 - shoulderBias, -27 + bob, 26 + shoulderBias * 2, collar ? 7 : 4, 2);
    fill(ctx, appearanceCosmetics.accent);
    rect(ctx, -2, -26 + bob, 4, 3);

    if (facing !== 'up' && appearanceCosmetics.cloak !== 'shoulderMantle') {
      ctx.globalAlpha = 0.58;
      fill(ctx, darken(appearanceCosmetics.accent, 0.12));
      rect(ctx, -8, -20 + bob, 2, 13);
      rect(ctx, 6, -20 + bob, 2, 13);
    }
  }

  ctx.restore();
}

function drawAppearanceEyesAndMarking(ctx, parts) {
  if(parts.facing==='up'||isCoveringHeadgear(parts.headgear))return;
  if(drawFaceDetailArt(ctx,parts))return;
  const {
    facing,
    bob,
    skin,
    appearanceCosmetics,
    visualProfile,
    headgear
  } = parts;

  if (facing === 'up') return;
  if (isCoveringHeadgear(headgear)) return;

  const side = facing === 'left' ? -1 : 1;
  const isSide = facing === 'left' || facing === 'right';
  const y = bob - (visualProfile?.headLift || 0);

  ctx.save();

  if (appearanceCosmetics.eyeColor) {
    fill(ctx, appearanceCosmetics.eyeColor);

    if (isSide) {
      rect(ctx, side > 0 ? 4 : -7, -37 + y, 3, 2);
    } else {
      rect(ctx, -5, -37 + y, 3, 2);
      rect(ctx, 3, -37 + y, 3, 2);
    }
  }

  const marking = appearanceCosmetics.marking;

  if (marking) {
    ctx.globalAlpha = 0.75;
    stroke(ctx, marking === 'scar' ? lighten(skin, 0.08) : appearanceCosmetics.accent, 1);
    fill(ctx, appearanceCosmetics.accent);

    if (marking === 'scar') {
      line(ctx, isSide ? side * 5 : 5, -41 + y, isSide ? side * 2 : -1, -32 + y);
    } else if (marking === 'freckles') {
      const freckles = isSide ? [[side * 4, -34], [side * 6, -32]] : [[-5, -34], [-2, -33], [3, -34], [6, -33]];
      freckles.forEach(([x, fy]) => rect(ctx, x, fy + y, 1, 1));
    } else if (marking === 'briarMark') {
      stroke(ctx, '#6fae72', 1);
      line(ctx, isSide ? side * 7 : -7, -38 + y, isSide ? side * 3 : -3, -31 + y);
      line(ctx, isSide ? side * 5 : -5, -35 + y, isSide ? side * 8 : -8, -33 + y);
    } else if (marking === 'sunMark') {
      stroke(ctx, '#ffe6a3', 1);
      circleStroke(ctx, isSide ? side * 5 : 0, -40 + y, 3);
    } else if (marking === 'tideMark') {
      stroke(ctx, '#59d7e8', 1);
      line(ctx, isSide ? side * 6 : -6, -33 + y, isSide ? side * 2 : -1, -36 + y);
      line(ctx, isSide ? side * 2 : -1, -36 + y, isSide ? side * -2 : 5, -33 + y);
    }
  }

  ctx.restore();
}

function drawAppearanceFacialHair(ctx, parts) {
  const {
    facing,
    bob,
    hair,
    appearanceCosmetics,
    visualProfile,
    headgear
  } = parts;

  const facialHair = appearanceCosmetics?.facialHair;
  if (!facialHair || facing === 'up' || isCoveringHeadgear(headgear)) return;
  if(drawFacialHairArt(ctx,parts))return;

  const side = facing === 'left' ? -1 : 1;
  const isSide = facing === 'left' || facing === 'right';
  const y = bob - (visualProfile?.headLift || 0);

  ctx.save();
  ctx.globalAlpha = facialHair === 'stubble' ? 0.45 : 0.82;
  fill(ctx, hair || appearanceCosmetics.hair || '#111111');

  if (isSide) {
    if (facialHair === 'stubble') {
      rect(ctx, side > 0 ? 1 : -7, -31 + y, 7, 2);
    } else if (facialHair === 'shortBeard') {
      rect(ctx, side > 0 ? 0 : -7, -31 + y, 8, 4);
    } else if (facialHair === 'fullBeard') {
      rect(ctx, side > 0 ? -1 : -8, -32 + y, 9, 6);
      rect(ctx, side > 0 ? 1 : -6, -27 + y, 6, 3);
    }
  } else if (facialHair === 'stubble') {
    rect(ctx, -5, -31 + y, 10, 2);
  } else if (facialHair === 'shortBeard') {
    rect(ctx, -5, -31 + y, 10, 4);
    rect(ctx, -3, -27 + y, 6, 2);
  } else if (facialHair === 'fullBeard') {
    rect(ctx, -6, -32 + y, 12, 6);
    rect(ctx, -4, -26 + y, 8, 4);
  }

  ctx.restore();
}

function drawAppearanceAccessory(ctx, parts) {
  const {
    facing,
    bob,
    appearanceCosmetics,
    visualProfile,
    headgear
  } = parts;

  const accessory = appearanceCosmetics?.accessory;
  if (!accessory) return;
  if(drawCreatorAccessoryArt(ctx,accessory,facing,bob,visualProfile?.headLift||0,appearanceCosmetics.accent,isCoveringHeadgear(headgear),parts))return;

  const side = facing === 'left' ? -1 : 1;
  const isSide = facing === 'left' || facing === 'right';
  const y = bob - (visualProfile?.headLift || 0);
  const headCovered = isCoveringHeadgear(headgear);

  ctx.save();
  ctx.globalAlpha = 0.94;
  stroke(ctx, appearanceCosmetics.accent, 1);
  fill(ctx, appearanceCosmetics.accent);

  if (accessory === 'earring') {
    if (!headCovered && facing !== 'up') {
      circleStroke(ctx, isSide ? side * 9 : 9, -33 + y, 2);
    }
  } else if (accessory === 'amulet') {
    if (facing !== 'up') {
      line(ctx, -5, -20 + bob, 0, -14 + bob);
      line(ctx, 5, -20 + bob, 0, -14 + bob);
      rect(ctx, -2, -15 + bob, 4, 4);
      ctx.globalAlpha = 0.35;
      fill(ctx, '#ffffff');
      rect(ctx, -1, -14 + bob, 2, 1);
    } else {
      rect(ctx, -2, -24 + bob, 4, 3);
    }
  } else if (accessory === 'mask') {
    if (!headCovered && facing !== 'up') {
      fill(ctx, darken(appearanceCosmetics.accent, 0.42));
      if (isSide) {
        rect(ctx, side > 0 ? 1 : -8, -39 + y, 9, 5);
      } else {
        rect(ctx, -8, -39 + y, 16, 5);
      }
      ctx.globalAlpha = 0.45;
      fill(ctx, lighten(appearanceCosmetics.accent, 0.2));
      rect(ctx, isSide ? (side > 0 ? 4 : -6) : -5, -37 + y, isSide ? 3 : 10, 1);
    }
  } else if (accessory === 'headband') {
    if (!headCovered) {
      fill(ctx, appearanceCosmetics.accent);
      if (isSide) {
        rect(ctx, -8, -43 + y, 16, 2);
      } else {
        rect(ctx, -9, -43 + y, 18, 2);
      }
    }
  }

  ctx.restore();
}

function normalizeCosmeticId(id) {
  const safe = String(id || '').trim();
  return safe && safe !== 'none' ? safe : null;
}

function normalizeCosmeticColor(color, fallback) {
  const safe = String(color || '').trim();
  return /^#[0-9a-f]{6}$/i.test(safe) ? safe : fallback;
}

// -----------------------------------------------------------------------------
// LABEL / EFFECTS
// -----------------------------------------------------------------------------

function drawNameLabel(ctx, text, x, y) {
  drawOutlinedText(ctx, text, x, y, {
    font: 'bold 12px sans-serif',
    outlineWidth: 3
  });
}

function drawActorShadow(ctx, x, y, rx, ry) {
  drawPixelGroundShadow(ctx, x, y, rx, ry, {
    alpha: 0.9
  });
}

// -----------------------------------------------------------------------------
// FACING
// -----------------------------------------------------------------------------

function getFacing(dirX, dirY) {
  if (Math.abs(dirX) > Math.abs(dirY)) {
    return dirX < 0 ? 'left' : 'right';
  }

  if (dirY < -0.15) return 'up';
  return 'down';
}

// -----------------------------------------------------------------------------
// LOW-LEVEL HELPERS
// -----------------------------------------------------------------------------

function normalizeItemId(itemRef) {
  if (!itemRef) return null;
  if (typeof itemRef === 'string') return itemRef;
  return itemRef.id || null;
}

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

function line(ctx, x1, y1, x2, y2) {
  ctx.beginPath();
  ctx.moveTo(Math.round(x1), Math.round(y1));
  ctx.lineTo(Math.round(x2), Math.round(y2));
  ctx.stroke();
}

function circleStroke(ctx, x, y, r) {
  ctx.beginPath();
  ctx.arc(Math.round(x), Math.round(y), r, 0, Math.PI * 2);
  ctx.stroke();
}

function roundedRect(ctx, x, y, w, h, r = 3) {
  const rx = Math.round(x);
  const ry = Math.round(y);
  const rw = Math.round(w);
  const rh = Math.round(h);
  const rr = Math.max(0, Math.min(r, Math.min(rw, rh) / 2));

  ctx.beginPath();
  ctx.moveTo(rx + rr, ry);
  ctx.lineTo(rx + rw - rr, ry);
  ctx.quadraticCurveTo(rx + rw, ry, rx + rw, ry + rr);
  ctx.lineTo(rx + rw, ry + rh - rr);
  ctx.quadraticCurveTo(rx + rw, ry + rh, rx + rw - rr, ry + rh);
  ctx.lineTo(rx + rr, ry + rh);
  ctx.quadraticCurveTo(rx, ry + rh, rx, ry + rh - rr);
  ctx.lineTo(rx, ry + rr);
  ctx.quadraticCurveTo(rx, ry, rx + rr, ry);
  ctx.closePath();
  ctx.fill();
}

function polygon(ctx, points) {
  if (!points.length) return;

  ctx.beginPath();
  ctx.moveTo(Math.round(points[0][0]), Math.round(points[0][1]));

  for (let i = 1; i < points.length; i++) {
    ctx.lineTo(Math.round(points[i][0]), Math.round(points[i][1]));
  }

  ctx.closePath();
  ctx.fill();
}

function clamp255(n) {
  return Math.max(0, Math.min(255, Math.round(n)));
}

function hexToRgb(hex) {
  const clean = String(hex || '#ffffff').replace('#', '');

  if (clean.length !== 6) {
    return {
      r: 255,
      g: 255,
      b: 255
    };
  }

  return {
    r: parseInt(clean.slice(0, 2), 16),
    g: parseInt(clean.slice(2, 4), 16),
    b: parseInt(clean.slice(4, 6), 16)
  };
}

function rgbToHex({ r, g, b }) {
  return `#${clamp255(r).toString(16).padStart(2, '0')}${clamp255(g).toString(16).padStart(2, '0')}${clamp255(b).toString(16).padStart(2, '0')}`;
}

function lighten(hex, amount = 0.1) {
  const rgb = hexToRgb(hex);

  return rgbToHex({
    r: rgb.r + (255 - rgb.r) * amount,
    g: rgb.g + (255 - rgb.g) * amount,
    b: rgb.b + (255 - rgb.b) * amount
  });
}

function darken(hex, amount = 0.1) {
  const rgb = hexToRgb(hex);

  return rgbToHex({
    r: rgb.r * (1 - amount),
    g: rgb.g * (1 - amount),
    b: rgb.b * (1 - amount)
  });
}

