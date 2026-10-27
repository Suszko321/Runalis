// Visual-only combat feedback profiles. They decorate existing damage, AI, loot,
// and projectile systems without changing their authoritative timing.
import {getEnemyVisualProfile} from './enemyVisualProfiles.js';
import {getOathVisualFamily} from './oathbladeProfiles.js';

export const ENEMY_REACTION_PROFILES = Object.freeze({
  light: Object.freeze({ id: 'light', duration: 0.18, recoil: 3.5, rotation: 0.035, squash: 0.035, flash: 0.45 }),
  heavy: Object.freeze({ id: 'heavy', duration: 0.28, recoil: 7, rotation: 0.075, squash: 0.07, flash: 0.68 }),
  critical: Object.freeze({ id: 'critical', duration: 0.32, recoil: 8, rotation: 0.09, squash: 0.09, flash: 0.86 }),
  charged: Object.freeze({ id: 'charged', duration: 0.3, recoil: 7.5, rotation: 0.08, squash: 0.08, flash: 0.78 }),
  stagger: Object.freeze({ id: 'stagger', duration: 0.36, recoil: 6, rotation: 0.12, squash: 0.1, flash: 0.72 }),
  knockback: Object.freeze({ id: 'knockback', duration: 0.27, recoil: 9, rotation: 0.07, squash: 0.06, flash: 0.7 }),
  magic: Object.freeze({ id: 'magic', duration: 0.25, recoil: 4.5, rotation: 0.05, squash: 0.06, flash: 0.76 }),
  resistant: Object.freeze({ id: 'resistant', duration: 0.16, recoil: 1.4, rotation: 0.018, squash: 0.018, flash: 0.52 })
});

export const ENEMY_DEATH_PROFILES = Object.freeze({
  normalCollapse: Object.freeze({ id: 'normalCollapse', duration: 0.35, rotation: 0.42, sink: 10, color: '#ef6f6c' }),
  heavyKnockdown: Object.freeze({ id: 'heavyKnockdown', duration: 0.35, rotation: 0.72, sink: 7, color: '#ffb36b' }),
  magicDissolve: Object.freeze({ id: 'magicDissolve', duration: 0.35, rotation: 0.12, sink: 4, color: '#c7d0dd' }),
  emberFade: Object.freeze({ id: 'emberFade', duration: 0.35, rotation: 0.2, sink: 5, color: '#ef6f4f' }),
  necromancerCollapse: Object.freeze({ id: 'necromancerCollapse', duration: 0.35, rotation: 0.18, sink: 8, color: '#7d36a4' }),
  eldritchRupture: Object.freeze({ id: 'eldritchRupture', duration: 0.35, rotation: 0.08, sink: 3, color: '#ef4056' }),
  thornOvergrowth: Object.freeze({ id: 'thornOvergrowth', duration: 0.35, rotation: 0.3, sink: 8, color: '#5e9b4b' }),
  holyBurst: Object.freeze({ id: 'holyBurst', duration: 0.35, rotation: 0.15, sink: 4, color: '#d9ad4f' })
});

export const PROJECTILE_VISUAL_PROFILES = Object.freeze({
  arrow: Object.freeze({ id: 'arrow', shape: 'arrow', trail: 'line', color: '#d9ad4f', light: '#e8edf5', size: 1 }),
  powerArrow: Object.freeze({ id: 'powerArrow', shape: 'arrow', trail: 'line', color: '#ef6f4f', light: '#ffd39a', size: 1.25 }),
  focusBolt: Object.freeze({ id: 'focusBolt', shape: 'lens', trail: 'streak', color: '#d9ad4f', light: '#fff1b8', size: 1.05 }),
  focusLance: Object.freeze({ id: 'focusLance', shape: 'prism', trail: 'streak', color: '#f4d35e', light: '#ffffff', size: 1.28 }),
  gleamBolt: Object.freeze({ id: 'gleamBolt', shape: 'flare', trail: 'streak', color: '#d9ad4f', light: '#fff7d8', size: 1.12 }),
  holyBolt: Object.freeze({ id: 'holyBolt', shape: 'flare', trail: 'streak', color: '#d9ad4f', light: '#fff1b8', size: 1.1 }),
  necromancerBolt: Object.freeze({ id: 'necromancerBolt', shape: 'orb', trail: 'runes', color: '#7d36a4', light: '#c69cff', size: 1.15 }),
  thornDart: Object.freeze({ id: 'thornDart', shape: 'thorn', trail: 'leaves', color: '#5e9b4b', light: '#d8b86a', size: 1 }),
  eldritchShard: Object.freeze({ id: 'eldritchShard', shape: 'shard', trail: 'rupture', color: '#ef4056', light: '#ff8a98', size: 1.2 }),
  enemyArrow: Object.freeze({ id: 'enemyArrow', shape: 'arrow', trail: 'line', color: '#9facbf', light: '#e8edf5', size: 1 }),
  enemyCurse: Object.freeze({ id: 'enemyCurse', shape: 'orb', trail: 'runes', color: '#7d36a4', light: '#c69cff', size: 1 }),
  bossProjectile: Object.freeze({ id: 'bossProjectile', shape: 'flare', trail: 'streak', color: '#ef6f6c', light: '#ffd39a', size: 1.45 })
});

export const IMPACT_EFFECT_PROFILES = Object.freeze({
  light: Object.freeze({ id: 'light', radius: 12, ttl: 0.14 }),
  heavy: Object.freeze({ id: 'heavy', radius: 22, ttl: 0.22 }),
  critical: Object.freeze({ id: 'critical', radius: 30, ttl: 0.28 }),
  projectile: Object.freeze({ id: 'projectile', radius: 17, ttl: 0.18 }),
  resistant: Object.freeze({ id: 'resistant', radius: 15, ttl: 0.16 })
});

export const INTERRUPT_EFFECT_PROFILES = Object.freeze({
  stagger: Object.freeze({ id: 'stagger', color: '#ffcc66', radius: 24, ttl: 0.26 }),
  guardBreak: Object.freeze({ id: 'guardBreak', color: '#e8edf5', radius: 30, ttl: 0.3 }),
  interrupt: Object.freeze({ id: 'interrupt', color: '#fff1b8', radius: 34, ttl: 0.32 }),
  resistant: Object.freeze({ id: 'resistant', color: '#9facbf', radius: 20, ttl: 0.2 })
});

export const SOUND_EVENT_KEYS = Object.freeze({
  FOOTSTEP: 'footstep',
  RUN_STEP: 'runStep',
  GEAR_MOVE: 'gearMove',
  LIGHT_HIT: 'hit',
  HEAVY_HIT: 'heavyHit',
  CRITICAL_HIT: 'crit',
  BLOCKED_HIT: 'block',
  ENEMY_STAGGER: 'enemyStagger',
  ENEMY_DEATH: 'enemyDeath',
  PROJECTILE_LAUNCH: 'projectileLaunch',
  PROJECTILE_IMPACT: 'projectileImpact',
  SPELL_BUILDUP: 'spellBuildup',
  SPELL_RELEASE: 'spellRelease',
  BOSS_WINDUP: 'bossWindup',
  BOSS_IMPACT: 'bossImpact',
  INTERRUPT: 'interrupt'
});

export function recordEnemyHitReaction(enemy, options = {}) {
  if (!enemy) return null;

  const resistant = !!(enemy.isBoss || enemy.worldBoss || enemy.eliteModifier || enemy.elite || enemy.isElite);
  const profileId = resistant
    ? 'resistant'
    : options.crit
      ? 'critical'
      : options.stagger
        ? 'stagger'
        : options.charged
          ? 'charged'
          : options.knockback
            ? 'knockback'
            : options.magic
              ? 'magic'
              : options.heavy
                ? 'heavy'
                : 'light';
  const profile = ENEMY_REACTION_PROFILES[profileId];
  const now = performance.now() / 1000;

  enemy.visualReaction = {
    profileId,
    style: resolveEnemyReactionStyle(enemy),
    startedAt: now,
    duration: options.dot ? .12 : profile.duration,
    dirX: Number(options.dirX || 0),
    dirY: Number(options.dirY ?? 1),
    weight: Math.max(.2,Math.min(1,1/(1+Math.max(0,Number(enemy.poise||enemy.staggerResistance||0))*.6+Math.max(0,(enemy.radius||enemy.r||14)-18)*.03))),
    subtle:!!options.dot,
    color: options.color || (resistant ? '#9facbf' : '#ffffff')
  };

  return enemy.visualReaction;
}

export function recordEnemyDeathVisual(enemy, options = {}) {
  if (!enemy || enemy.visualDeath) return enemy?.visualDeath || null;

  const family=getEnemyVisualProfile(enemy).family;
  const profileId = options.profileId || (family==='spectral'?'magicDissolve':family==='skeleton'?'necromancerCollapse':resolveDeathProfileId(options));
  const profile = ENEMY_DEATH_PROFILES[profileId] || ENEMY_DEATH_PROFILES.normalCollapse;
  enemy.visualDeath = {
    profileId: profile.id,
    startedAt: performance.now() / 1000,
    duration: profile.duration,
    dirX: Number(options.dirX || 0),
    dirY: Number(options.dirY ?? 1),
    family,
    color: options.color || profile.color
  };
  return enemy.visualDeath;
}

export function sampleEnemyVisualState(enemy, now = performance.now() / 1000) {
  // Also recover actors already revived with stale death state by older code.
  const living = enemy?.hp > 0 && !enemy.dead && !enemy.remove && enemy.alive !== false;
  if (enemy?.visualDeath && !living) {
    const profile = ENEMY_DEATH_PROFILES[enemy.visualDeath.profileId] || ENEMY_DEATH_PROFILES.normalCollapse;
    const progress = clamp01((now - enemy.visualDeath.startedAt) / Math.max(0.001, enemy.visualDeath.duration));
    const eased = 1 - Math.pow(1 - progress, 3);
    const dir = normalized(enemy.visualDeath.dirX, enemy.visualDeath.dirY);
    return {
      kind: 'death',
      profileId: profile.id,
      family: enemy.visualDeath.family,
      progress,
      x: dir.x * profile.sink * eased * 0.25,
      y: profile.sink * eased,
      rotation: directionSign(dir.x) * profile.rotation * eased,
      scaleX: enemy.visualDeath.family==='spectral'?1:1 + eased * 0.08,
      scaleY: enemy.visualDeath.family==='spectral'?1:Math.max(0.18, 1 - eased * 0.72),
      alpha: Math.max(0, 1 - progress),
      color: enemy.visualDeath.color || profile.color
    };
  }

  if (enemy?.visualReaction) {
    const profile = ENEMY_REACTION_PROFILES[enemy.visualReaction.profileId] || ENEMY_REACTION_PROFILES.light;
    const progress = clamp01((now - enemy.visualReaction.startedAt) / Math.max(0.001, enemy.visualReaction.duration));
    const pulse = Math.sin(progress * Math.PI)*(enemy.visualReaction.weight??1)*(enemy.visualReaction.subtle?.2:1);
    const dir = normalized(enemy.visualReaction.dirX, enemy.visualReaction.dirY);
    const style = enemy.visualReaction.style || 'default';
    const recoilScale = style === 'small' ? 1.25 : style === 'cultist' ? 1.15 : style === 'shielded' ? 0.58 : 1;
    const rotationScale = style === 'undead' ? 1.35 : style === 'cultist' ? 1.18 : style === 'shielded' ? 0.45 : 1;
    const family=getEnemyVisualProfile(enemy).family;
    const squashScale = family==='human'?0:style === 'beast' ? 1.35 : style === 'shielded' ? 0.55 : 1;
    return {
      kind: 'hit',
      profileId: profile.id,
      progress,
      style,
      x: dir.x * profile.recoil * pulse * recoilScale,
      y: dir.y * profile.recoil * pulse * 0.45 * recoilScale,
      rotation: directionSign(dir.x) * profile.rotation * pulse * rotationScale,
      scaleX: 1 + profile.squash * pulse * squashScale,
      scaleY: 1 - profile.squash * pulse * squashScale,
      alpha: 1,
      flash: profile.flash * pulse,
      color: enemy.visualReaction.color || '#ffffff'
    };
  }

  return null;
}

const impactTimes=new WeakMap();
export function recordEnemyContactImpact(enemy,origin,world,options={}){
 if(!enemy||!world)return null;
 const now=options.now??performance.now()/1000,previous=impactTimes.get(enemy)||-Infinity;
 const heavy=!!(options.heavy||options.crit||options.charged),dot=!!(options.dot||options.channelTick);
 if(now-previous<(dot?.3:heavy?.04:.065))return null;
 impactTimes.set(enemy,now);
 const dx=Number(options.dirX??enemy.x-(origin?.x??enemy.x)),dy=Number(options.dirY??enemy.y-(origin?.y??enemy.y)),dir=normalized(dx,dy);
 const profile=getEnemyVisualProfile(enemy),radius=Math.max(8,Math.min(30,enemy.radius||enemy.r||14));
 const element=options.element||(['spirit','summoning'].includes(options.skill)?'necrotic':options.skill==='warding'?'nature':null);
 const material=element||(/shield|knight/.test(enemy.kind||'')||profile.family==='human'&&/plate|iron|sentinel/i.test(String(enemy.equipment?.chest))?'armour':profile.family==='skeleton'?'bone':profile.family==='spectral'?'necrotic':profile.family==='beast'?'flesh':'physical');
 const colors={fire:'#e99554',ice:'#b7e4ed',water:'#88cbd7',lightning:'#f4dc91',poison:'#9dbe77',necrotic:'#b99dcc',nature:'#a4bd83',holy:'#f0d6a1',radiant:'#f0d6a1',armour:'#e2d6bb',bone:'#cfbda3',flesh:'#af6b65',physical:'#d1c1a2'};
 world.effects=Array.isArray(world.effects)?world.effects:[];
 if(world.effects.length>=300)return null;
 const fx={kind:'enemyContactImpact',x:enemy.x-dir.x*radius*.65,y:enemy.y-Math.min(38,(profile.hpOffset||55)*.38)-dir.y*radius*.3,
  material,color:options.color||colors[material]||'#dbc8b2',dirX:dir.x,dirY:dir.y,heavy,dot,age:0,ttl:dot?.13:heavy?.24:.17,radius:dot?7:heavy?22:11,
  blunt:options.skill==='blunt'||['mace','hammer'].includes(options.weaponType),
  oathkeeper:String(options.sourceAbilityId||'').startsWith('oathkeeper')||origin?.classId==='oathkeeper'&&(options.skill==='blunt'||['mace','hammer'].includes(options.weaponType)),
  subclassId:options.subclassId??(options.sourceAbilityId?origin?.abilityMorphs?.[options.sourceAbilityId]:getOathVisualFamily(origin))};
 world.effects.push(fx);return fx;
}

export function getProjectileVisualProfile(projectile) {
  const id = projectile?.visualProfile || projectile?.kind || 'arrow';
  return PROJECTILE_VISUAL_PROFILES[id] || PROJECTILE_VISUAL_PROFILES.arrow;
}

function resolveDeathProfileId(options) {
  if (options.classId === 'oathkeeper' || options.classId === 'templar' || options.element === 'holy') return 'holyBurst';
  if (options.classId === 'gravecaller' || options.classId === 'necromancer' || options.skill === 'spirit') return 'necromancerCollapse';
  if (options.classId === 'hydromancer' || options.classId === 'waverider' || options.element === 'water') return 'magicDissolve';
  if (options.classId === 'thornbinder' || options.skill === 'warding') return 'thornOvergrowth';
  if (options.classId === 'eldritch') return 'eldritchRupture';
  if (options.element === 'fire') return 'emberFade';
  if (options.magic) return 'magicDissolve';
  if (options.heavy || options.knockback) return 'heavyKnockdown';
  return 'normalCollapse';
}

function resolveEnemyReactionStyle(enemy) {
  const kind = String(enemy?.archetype || enemy?.kind || '').toLowerCase();
  if (kind.includes('shield') || kind.includes('gravebound')) return 'shielded';
  if (kind.includes('beast') || kind.includes('wolf') || kind.includes('elk')) return 'beast';
  if (kind.includes('cultist') || kind.includes('archer') || kind.includes('bandit')) return 'cultist';
  if (kind.includes('wraith') || kind.includes('grave') || kind.includes('hollow')) return 'undead';
  if ((enemy?.r || enemy?.radius || 14) <= 12) return 'small';
  return 'default';
}

function normalized(x, y) {
  const length = Math.hypot(Number(x || 0), Number(y || 0)) || 1;
  return { x: Number(x || 0) / length, y: Number(y || 0) / length };
}

function directionSign(value) {
  return Number(value || 0) < 0 ? -1 : 1;
}

function clamp01(value) {
  return Math.max(0, Math.min(1, Number(value || 0)));
}
