// Animation follows simulated travel, not render calls or the wall clock.
// Keep this transient: loading a save starts with planted feet, never stale motion.
const motions = new WeakMap();
export const isGravecallerSummon = s => s?.kind === 'lich' || s?.kind === 'greaterLich';
const cycle = [0, 1, 1, 0, 0, 2, 2, 0];
const wrap = n => ((n % 1) + 1) % 1;

function state(s) {
  let m = motions.get(s);
  if (!m) {
    m = {phase: 0, elapsed: 0, moving: false, settle: 0, attack: 0,
      facing: (s.dirX || 0) < 0 ? -1 : 1, turn: 0, nextFacing: 0};
    motions.set(s, m);
  }
  return m;
}

export function beginGravecallerMotion(s) {
  if (!isGravecallerSummon(s)) return null;
  state(s);
  return {x: s.x, y: s.y, cooldown: s.attackCooldown || 0,
    attackStamp: s.attackAnimationUntil || 0};
}

export function finishGravecallerMotion(s, before, dt) {
  if (!before || !(dt > 0)) return;
  const m = state(s), step = Math.min(.05, dt);
  const distance = Math.hypot(s.x - before.x, s.y - before.y);
  m.elapsed += step;
  m.attack = Math.max(0, m.attack - step);
  const attacked = (s.attackCooldown || 0) > before.cooldown + .05 ||
    (s.attackAnimationUntil || 0) > before.attackStamp;
  if (attacked) m.attack = .22;
  // Collision corrections and formation settling are not a full walking stride.
  // A recall teleport must not race through the animation either.
  const travelling = distance > step * 8 && distance < Math.max(24, step * 1600);
  if (travelling) {
    const stride = s.kind === 'greaterLich' ? 112 : 88;
    const fastestGait = s.kind === 'greaterLich' ? 2.6 : 3.2;
    m.phase = wrap(m.phase + Math.min(distance / stride, step * fastestGait));
    m.settle = .09;
    m.moving = true;
  } else {
    m.settle = Math.max(0, m.settle - step);
    m.moving = m.settle > 0;
    if (!m.moving) m.phase = 0;
  }
  // Preserve the last side when facing up/down; tiny sideways corrections
  // otherwise make the entire sprite flip back and forth.
  const desired = Math.abs(s.dirX || 0) >= .25 ? Math.sign(s.dirX) : m.facing;
  if (desired === m.facing) { m.turn = 0; m.nextFacing = 0; }
  else if (attacked) { m.facing = desired; m.turn = 0; }
  else {
    if (m.nextFacing !== desired) { m.nextFacing = desired; m.turn = 0; }
    m.turn += step;
    if (m.turn >= .075) { m.facing = desired; m.turn = 0; }
  }
}

export function gravecallerMotionPose(s) {
  const m = motions.get(s);
  const review = typeof s.reviewAnimation === 'string';
  const time = review ? (s.reviewAnimationTime ?? performance.now() / 1000) : (m?.elapsed || 0);
  const moving = review ? ['walk', 'run'].includes(s.reviewAnimation) : !!m?.moving;
  const attack = review ? s.reviewAnimation === 'attack' : (m ? m.attack > 0 : false);
  const phase = review ? wrap(time * 2) : (m?.phase || 0);
  const floating = s.kind === 'greaterLich' && s.summonMorph === 'acolyte';
  // The greater specter glides: its trailing cloak never snaps back to the
  // planted idle silhouette between steps. Lesser specters still have a gait.
  const frame = attack ? 3 : !moving ? 0 : floating ? (phase < .5 ? 1 : 2) : cycle[Math.floor(phase * cycle.length)];
  return {frame, moving, attack, phase,
    facing: review ? ((s.dirX || 0) < 0 ? -1 : 1) : (m?.facing || ((s.dirX || 0) < 0 ? -1 : 1)),
    bob: floating ? Math.round(Math.sin(time * 2.4)) : 0};
}

// Atlases are packed by silhouette bounds. Cloaks and weapons change those
// bounds between poses, so align the body instead of the bounding-box centre.
// Integer source-pixel offsets preserve the original pixels and body proportions.
const bodyOffsets = {
  'lich-deathknight': [0, -10, -9, -13],
  'lich-acolyte': [0, -10, -9, -9],
  'bound-dead-specter': [0, -2, -3, -11],
  'bound-dead-knight': [0, -2, -3, -4],
  skeletonServant: [0, -3, -6, -7],
  skeletalKnight: [0, 0, 0, 0],
  lich: [0, -1, -4, -2],
  lichLord: [0, 0, 0, 0],
  'skeleton-forge': [0, 9, 9, 5]
};
export const gravecallerBodyOffset = (name, frame, scale = 1) =>
  Math.round((bodyOffsets[name]?.[frame] || 0) * scale);
