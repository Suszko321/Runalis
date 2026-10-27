// audioSystem.js
// Code-generated SFX and adaptive retro dark-fantasy music.

const MASTER_VOLUME = 0.5;
const SFX_VOLUME = 0.55;
const MUSIC_VOLUME = 0.68;

let singleton = null;
let autoUnlockInstalled = false;
const sfxObservers=new Set();
export function observeSfx(observer){sfxObservers.add(observer);return ()=>sfxObservers.delete(observer);}

export function createAudioSystem() {
  if (singleton) return singleton;

  singleton = new RunalisAudioSystem();
  installAutoUnlockAudio();
  return singleton;
}

export function unlockAudio() {
  createAudioSystem().unlock();
}

export function playSfx(name, options = {}) {
  for(const observer of sfxObservers){try{observer(name,options);}catch{/* Sound playback must survive an optional observer. */}}
  createAudioSystem().play(name, options);
}

// Environmental cues share the existing mixer, unlock and volume controls.
export function playEnvironmentCue(region) {
  const a=singleton;if(!a?.unlocked||a.ctx?.state!=='running')return;
  const time=a.ctx.currentTime;
  if(['crypt','mine'].includes(region)){
    a.tone(region==='crypt'?380:170,.45,'sine',.018,time,-100);
    a.tone(region==='crypt'?380:170,.3,'sine',.006,time+.3,-100);
  }else if(['woodland','river','aureate'].includes(region)){
    a.tone(1200,.12,'sine',.018,time,500);a.tone(1500,.1,'sine',.012,time+.16,-200);
  }else if(region==='night'||region==='marsh'){
    for(let i=0;i<3;i++)a.tone(region==='marsh'?230:2100,.05,'sine',.012,time+i*.15,40);
  }else a.tone(95,1.2,'sine',.012,time,-25);
}

export function updateAdaptiveMusic(state = {}) {
  createAudioSystem().updateMusic(state);
}

export function stopAudio() {
  createAudioSystem().stop();
}

export function classifyAdaptiveMusicThreats(enemies = [], party = [], now = performance.now() / 1000) {
  const activeThreats = [];
  const actors = collectMusicActors(party);

  for (const enemy of enemies || []) {
    if (!enemy || enemy.dead || enemy.remove || (enemy.hp || 0) <= 0) continue;

    const nearestDistance = getNearestActorDistance(enemy, actors);
    if (!Number.isFinite(nearestDistance)) continue;

    const aggroRange = Math.max(190, Number(enemy.aggroRange || 230));
    const engagementRadius = Math.min(
      enemy.isBoss || enemy.worldBoss ? 900 : 680,
      Math.max(aggroRange + 220, Number(enemy.attackRange || 28) + 160)
    );
    const recentlyHit = !!enemy.lastHitAt && now - Number(enemy.lastHitAt) < 4.5;
    const activelyEngaged =
      enemy.telegraph?.time > 0 ||
      !!enemy.combatTargetId ||
      (enemy.aggro || 0) > 0 ||
      !!enemy.alerted ||
      !!enemy.lastDamagedByPlayer ||
      !!enemy.awakened ||
      recentlyHit;

    if (activelyEngaged && nearestDistance <= engagementRadius) {
      activeThreats.push(enemy);
    }
  }

  return {
    combat: activeThreats.length > 0,
    boss: activeThreats.some(enemy => enemy.isBoss || enemy.worldBoss || enemy.bossId),
    count: activeThreats.length
  };
}

export function resolveAdaptiveMusicMode(state = {}) {
  if (state.boss) return 'boss';
  if (state.combat) return 'combat';

  const worldMode = String(state.mode || 'overworld');
  if (worldMode === 'capital') return 'hub';
  if (worldMode === 'dungeon' || worldMode === 'tower') return 'dungeon';
  if (worldMode === 'travelRoute') return 'travel';
  return 'explore';
}

export function getAdaptiveMusicProfile(mode = 'explore') {
  return getMusicData(mode);
}

class RunalisAudioSystem {
  constructor() {
    this.ctx = null;
    this.master = null;
    this.sfxGain = null;
    this.musicGain = null;
    this.unlocked = false;
    this.nextMusicAt = 0;
    this.musicStep = 0;
    this.musicMode = 'explore';
    this.musicGainTarget = null;
    this.lastSfx = new Map();
    this.noiseBuffer = null;
  }

  unlock() {
    if (this.unlocked && this.ctx?.state === 'running') return true;

    const AudioContext = globalThis.AudioContext || globalThis.webkitAudioContext;
    if (!AudioContext) return false;

    if (!this.ctx) {
      this.ctx = new AudioContext();
      this.master = this.ctx.createGain();
      this.sfxGain = this.ctx.createGain();
      this.musicGain = this.ctx.createGain();

      this.master.gain.value = MASTER_VOLUME;
      this.sfxGain.gain.value = SFX_VOLUME;
      this.musicGain.gain.value = MUSIC_VOLUME;

      this.sfxGain.connect(this.master);
      this.musicGain.connect(this.master);
      this.master.connect(this.ctx.destination);
      this.noiseBuffer = createNoiseBuffer(this.ctx);
    }

    if (this.ctx.state === 'suspended') {
      this.ctx.resume?.();
    }

    if (!this.nextMusicAt || this.nextMusicAt < this.ctx.currentTime) {
      this.nextMusicAt = this.ctx.currentTime + 0.05;
    }

    this.unlocked = true;
    return true;
  }

  play(name, options = {}) {
    if (!this.unlock()) return;

    const now = this.ctx.currentTime;
    const throttle = options.throttle ?? getDefaultThrottle(name);
    const throttleKey=options.throttleKey||name;
    const last = this.lastSfx.get(throttleKey) ?? -Infinity;

    if (throttle > 0 && now - last < throttle) return;
    this.lastSfx.set(throttleKey, now);

    const volume = options.volume ?? 1;

    switch (name) {
      case 'malakarChant': for(const [i,f]of [82,110,123].entries())this.tone(f,2.8,'triangle',.02*volume,now+i*.12,-3);return;
      case 'bossRoar': this.tone(65,.85,'sawtooth',.07*volume,now,-28);this.tone(98,.9,'sine',.05*volume,now+.1,-20);return;
      case 'bossSlam': this.noise(.18,.12*volume,600,.003);this.tone(75,.35,'sine',.12*volume,now,-50);return;
      case 'cast': this.tone(210,.3,'triangle',.06*volume,now,150);return;
      case 'fire': this.noise(.45,.09*volume,1800,.02);return;

      case 'spectralUrn': {
        if(options.phase==='urnShatter'){
          this.noise(.1,.08*volume,3300,.003);
          for(const [i,f] of [392,493.88,587.33].entries())this.tone(f,.23,'sine',.032*volume,now+i*.025,50);
          return;
        }
        if(options.phase==='impact')return this.tone(660,.1,'sine',.045*volume,now,-220);
        this.noise(.085,.04*volume,1300,.012);
        return this.tone(230,.16,'triangle',.05*volume,now,-105);
      }
      case 'fellhunterTool': {
        const impact=options.phase==='impact',blood=options.family==='bloodhound';
        this.noise(options.tool?.1:.04,(impact?.08:.045)*volume,blood?1100:1900,.004);
        this.tone(blood?155:240,impact?.13:.085,'triangle',.05*volume,now,-85);
        return;
      }
      case 'hellstalkerSpell': {
        const flash=options.phase==='flashover',impact=options.phase==='impact';
        this.noise(flash?.16:options.mobility?.12:.065,(flash?.15:.075)*volume,flash?1050:impact?1900:2600,.003);
        this.tone(flash?85:impact?138:185,flash?.23:.16,'triangle',.065*volume,now,flash?-40:-95);
        this.tone(flash?52:73,.2,'sine',.035*volume,now,-22);
        return this.tone(flash?360:480,.09,'sine',.028*volume,now+.018,-170);
      }
      case 'gardenGraveSpell': {
        const f=options.family,impact=options.phase==='impact',end=options.phase==='channelEnd';
        if(end)return this.tone(f==='deathknight'?90:220,.09,'sine',.035*volume,now,-40);
        if(f==='deathknight'){
          this.noise(impact?.08:.045,.08*volume,750,.003);
          this.tone(impact?73:110,.17,'sine',.09*volume,now,-40);
          return this.tone(330,.11,'triangle',.035*volume,now+.012,-120);
        }
        if(f==='petalknight'){
          if(options.eruption){
            this.noise(.16,.09*volume,900,.005);
            this.tone(123,.24,'sine',.1*volume,now,-55);
            this.tone(247,.13,'triangle',.055*volume,now+.035,-100);
            return this.tone(392,.12,'sine',.028*volume,now+.07,-70);
          }
          this.noise(.065,.055*volume,2400,.004);
          this.tone(impact?185:247,.13,'triangle',.055*volume,now,-85);
          return this.tone(392,.09,'sine',.028*volume,now+.025,-45);
        }
        this.tone(523,.19,'sine',.045*volume,now,8);
        this.tone(784,.25,'sine',.032*volume,now+.04,-8);
        return this.tone(1046,.19,'triangle',.018*volume,now+.09,-16);
      }
      case 'bluntLift':
        return this.noise(.055,.035*volume,1150,.006);
      case 'bluntSwing':
        this.noise(options.heavy?.105:.065,.08*volume,650,.004);
        return this.tone(options.heavy?155:225,.065,'triangle',.035*volume,now,-95);
      case 'bluntImpact': {
        const heavy=options.heavy||options.finisher;
        this.noise(heavy?.095:.055,(heavy?.18:.115)*volume,heavy?560:900,.002);
        this.tone(heavy?93:145,heavy?.18:.11,'sine',.14*volume,now,heavy?-48:-60);
        return this.tone(heavy?380:590,.075,'triangle',.035*volume,now+.012,-120);
      }
      case 'oathBlade': {
        const f=options.family,impact=options.phase==='bladeImpact',launch=options.phase==='bladeLaunch',frequency=f==='sinner'?138:f==='holyknight'?330:294;
        this.tone(impact?frequency*.7:frequency,launch?.095:.2,f==='sinner'?'triangle':'sine',.075*volume,now,launch?180:impact?-120:30);
        this.tone(frequency*2,.13,'sine',.035*volume,now+.022,impact?-90:60);
        if(f==='sinner')this.noise(impact?.075:.035,.075*volume,850,.004);
        else if(impact)this.noise(.045,.07*volume,1800,.003);
        return;
      }
      case 'oathMiracle': {
        const impact=options.phase==='impact',start=options.phase==='start',family=options.family;
        const base=family==='sinner'?168:275;
        this.tone(impact?base*.5:base,start?.16:.22,'sine',.075*volume,now,impact?-35:20);
        this.tone(base*2,.2,'triangle',.045*volume,now+.018,-30);
        if(family==='sinner')this.noise(.07,.075*volume,900,.002);
        if(impact){this.noise(options.heavy?.12:.06,.13*volume,650,.002);this.tone(options.heavy?70:110,.13,'sine',.09*volume,now,-35);}
        return;
      }
      case 'cryoSpell': {
        const shatter=options.phase==='shatter',freeze=options.phase==='freeze',impact=options.phase==='impact';
        this.tone(shatter?1420:freeze?1040:impact?660:880,.12,'sine',.065*volume,now,shatter?-650:impact?-240:120);
        this.tone(shatter?710:1320,.16,'triangle',.04*volume,now+.035,-90);
        return this.noise(shatter?.09:impact?.055:.035,(shatter?.1:impact?.055:.035)*volume,shatter?4800:3200,.003);
      }
      case 'eliteHazard': {
        const recipe=options.recipe;
        for(const note of (recipe?.tones||[]).slice(0,4))this.tone(note.frequency,note.duration,note.wave,note.gain*volume,now+(note.delay||0),note.bend||0);
        if(recipe?.noise)this.noise(recipe.noise.duration,recipe.noise.gain*volume,recipe.noise.cutoff,.003);
        return;
      }
      case 'ui':
        return this.tone(620, 0.045, 'triangle', 0.12 * volume, now, 20);
      case 'dialogueTick':
        return this.tone(Number(options.frequency || 440), 0.022, 'sine', 0.045 * volume, now, 8);
      case 'menuBack':
        return this.tone(260, 0.065, 'sine', 0.12 * volume, now, -20);
      case 'attack':
        return this.sweep(260, 130, 0.075, 'sawtooth', 0.12 * volume);
      case 'footstep':
        this.noise(0.025, 0.035 * volume, 380, 0.001);
        return this.tone(92, 0.035, 'sine', 0.025 * volume, now, -12);
      case 'runStep':
        this.noise(0.035, 0.055 * volume, 460, 0.001);
        return this.tone(82, 0.045, 'triangle', 0.035 * volume, now, -18);
      case 'gearMove':
        return this.noise(0.025, 0.025 * volume, 2100, 0.001);
      case 'bow':
        this.noise(0.04, 0.12 * volume, 1800, 0.002);
        return this.sweep(420, 145, 0.08, 'triangle', 0.11 * volume);
      case 'projectileLaunch':
        this.noise(0.03, 0.08 * volume, 1600, 0.001);
        return this.sweep(520, 230, 0.07, 'triangle', 0.08 * volume);
      case 'projectileImpact':
        this.noise(0.04, 0.1 * volume, 1000, 0.001);
        return this.tone(150, 0.045, 'square', 0.065 * volume, now, -30);
      case 'ability':
        this.tone(330, 0.08, 'triangle', 0.10 * volume, now, 40);
        return this.tone(660, 0.12, 'sine', 0.08 * volume, now + 0.02, -80);
      case 'spellBuildup':
        return this.sweep(180, 410, 0.12, 'sine', 0.055 * volume);
      case 'spellRelease':
        this.tone(310, 0.07, 'triangle', 0.075 * volume, now, 80);
        return this.tone(620, 0.11, 'sine', 0.06 * volume, now + 0.02, -50);
      case 'summon':
        this.tone(190, 0.18, 'sine', 0.10 * volume, now, -30);
        return this.tone(380, 0.22, 'triangle', 0.09 * volume, now + 0.03, 45);
      case 'hit':
        this.noise(0.045, 0.18 * volume, 700, 0.001);
        return this.tone(130, 0.05, 'square', 0.10 * volume, now, -35);
      case 'heavyHit':
        this.noise(0.075, 0.2 * volume, 620, 0.001);
        return this.sweep(150, 62, 0.1, 'square', 0.12 * volume);
      case 'enemyStagger':
        this.noise(0.055, 0.12 * volume, 900, 0.001);
        return this.tone(115, 0.09, 'sawtooth', 0.08 * volume, now, -32);
      case 'interrupt':
        this.noise(0.045, 0.11 * volume, 1800, 0.001);
        return this.sweep(680, 180, 0.11, 'square', 0.09 * volume);
      case 'crit':
        this.noise(0.06, 0.18 * volume, 1200, 0.001);
        this.tone(740, 0.05, 'square', 0.10 * volume, now, 120);
        return this.tone(980, 0.08, 'triangle', 0.10 * volume, now + 0.035, -80);
      case 'enemyDeath':
        this.noise(0.12, 0.13 * volume, 420, 0.004);
        return this.sweep(180, 54, 0.18, 'sawtooth', 0.12 * volume);
      case 'playerHit':
        this.noise(0.07, 0.18 * volume, 340, 0.002);
        return this.tone(96, 0.08, 'sawtooth', 0.12 * volume, now, -20);
      case 'block':
        this.noise(0.035, 0.12 * volume, 2200, 0.001);
        return this.tone(340, 0.05, 'square', 0.10 * volume, now, -40);
      case 'guardBreak':
        this.noise(0.12, 0.20 * volume, 900, 0.001);
        return this.sweep(220, 70, 0.16, 'square', 0.14 * volume);
      case 'loot':
      case 'chest':
        this.tone(523, 0.075, 'triangle', 0.11 * volume, now, 20);
        return this.tone(784, 0.12, 'triangle', 0.10 * volume, now + 0.055, -30);
      case 'harvest':
        this.noise(0.08, 0.08 * volume, 1500, 0.004);
        return this.tone(440, 0.06, 'triangle', 0.07 * volume, now, -60);
      case 'mining':
        this.noise(0.04, 0.14 * volume, 2600, 0.001);
        return this.tone(155, 0.08, 'square', 0.10 * volume, now, -25);
      case 'fish':
        this.noise(0.09, 0.08 * volume, 900, 0.006);
        return this.tone(392, 0.09, 'sine', 0.08 * volume, now + 0.02, 40);
      case 'campfire':
        return this.noise(0.22, 0.08 * volume, 1100, 0.015);
      case 'shrine':
        this.tone(220, 0.35, 'sine', 0.09 * volume, now, 20);
        this.tone(440, 0.38, 'triangle', 0.08 * volume, now + 0.08, 20);
        return this.tone(660, 0.42, 'sine', 0.06 * volume, now + 0.16, -20);
      case 'dungeon':
        this.tone(110, 0.36, 'sawtooth', 0.11 * volume, now, -40);
        return this.tone(220, 0.28, 'triangle', 0.08 * volume, now + 0.08, -20);
      case 'boss':
        this.noise(0.22, 0.14 * volume, 500, 0.01);
        return this.sweep(98, 49, 0.45, 'sawtooth', 0.14 * volume);
      case 'bossWindup':
        return this.sweep(74, 190, 0.28, 'sawtooth', 0.09 * volume);
      case 'bossImpact':
        this.noise(0.16, 0.16 * volume, 420, 0.004);
        return this.sweep(128, 42, 0.22, 'square', 0.12 * volume);
      case 'quest':
        this.tone(392, 0.12, 'triangle', 0.08 * volume, now, 15);
        this.tone(587, 0.13, 'triangle', 0.08 * volume, now + 0.08, 10);
        return this.tone(784, 0.18, 'triangle', 0.08 * volume, now + 0.16, -20);
      case 'levelUp':
        [392, 523, 659, 784].forEach((f, i) => this.tone(f, 0.16, 'triangle', 0.09 * volume, now + i * 0.075, -15));
        return;
      default:
        return this.tone(440, 0.07, 'triangle', 0.08 * volume, now, 0);
    }
  }

  updateMusic(state = {}) {
    if (!this.unlocked || !this.ctx || this.ctx.state !== 'running') return;

    const mode = resolveAdaptiveMusicMode(state);
    const target = state.paused ? 0 : getMusicData(mode).gain;
    this.setMusicGainTarget(target, state.paused ? 0.12 : 0.5);

    if (state.paused) return;

    if (mode !== this.musicMode) {
      this.musicMode = mode;
      this.musicStep = 0;
      this.nextMusicAt = this.ctx.currentTime + 0.12;
    }

    const lookahead = 0.55;
    if (!this.nextMusicAt || this.nextMusicAt < this.ctx.currentTime - 0.05) {
      this.nextMusicAt = this.ctx.currentTime + 0.04;
    }

    while (this.nextMusicAt < this.ctx.currentTime + lookahead) {
      this.scheduleMusicStep(this.nextMusicAt, mode, this.musicStep);
      this.musicStep += 1;
      this.nextMusicAt += getMusicData(mode).stepDuration / (mode==='boss'?1+Math.max(0,Math.min(2,(state.bossPhase||1)-1))*.08:1);
    }
  }

  stop() {
    if (!this.ctx || !this.musicGain || this.ctx.state !== 'running') return;

    const now = this.ctx.currentTime;
    this.setMusicGainTarget(0, 0.06);
    this.nextMusicAt = now + 1;
    this.musicStep = 0;
  }

  scheduleMusicStep(time, mode, step) {
    const data = getMusicData(mode);
    const root = data.roots[Math.floor(step / data.beatGroup) % data.roots.length];
    const melodyStep = data.melody[step % data.melody.length];
    const note = melodyStep === null ? null : melodyStep + root;
    const accent = step % data.beatGroup === 0;
    const patternStep = step % data.beatGroup;
    const bassPulse = data.bassPattern?.includes(patternStep) ?? accent;

    if (accent && data.drone) {
      this.musicTone(
        midiToHz(root - 24),
        time,
        data.stepDuration * (data.beatGroup - 0.35),
        'sine',
        data.droneVolume || 0.035
      );
    }

    if (bassPulse) {
      this.musicTone(
        midiToHz(root - 12),
        time,
        data.stepDuration * (accent ? 1.8 : 0.72),
        data.bassWave || 'triangle',
        accent ? data.bassAccentVolume : data.bassVolume
      );
    }

    if (note !== null) {
      this.musicTone(
        midiToHz(note),
        time + 0.01,
        data.stepDuration * data.leadHold,
        data.leadWave,
        data.leadVolume
      );

      if (data.chimeSteps?.includes(step % data.melody.length)) {
        this.musicTone(midiToHz(note + 12), time + 0.035, data.stepDuration * 0.7, 'sine', data.chimeVolume || 0.018);
      }
    }

    if (accent && data.chord?.length) {
      for (const interval of data.chord) {
        this.musicTone(
          midiToHz(root + interval),
          time + 0.018,
          data.stepDuration * data.chordHold,
          data.chordWave || 'triangle',
          data.chordVolume
        );
      }
    }

    if (data.counterMelody?.length) {
      const counterStep = data.counterMelody[step % data.counterMelody.length];
      if (counterStep !== null) {
        this.musicTone(
          midiToHz(root + counterStep),
          time + data.stepDuration * 0.5,
          data.stepDuration * 0.44,
          'triangle',
          data.counterVolume
        );
      }
    }

    if (data.percussion) {
      if (accent) this.musicNoise(time, 0.055, data.percussion.low, 180);
      if (data.percussion.highSteps.includes(patternStep)) {
        this.musicNoise(time + 0.01, 0.032, data.percussion.high, 1200);
      }
    }
  }

  setMusicGainTarget(target, timeConstant = 0.35) {
    if (target === this.musicGainTarget) return;

    const now = this.ctx.currentTime;
    this.musicGain.gain.cancelScheduledValues(now);
    this.musicGain.gain.setTargetAtTime(target, now, timeConstant);
    this.musicGainTarget = target;
  }

  tone(freq, duration, type, volume, when, bend = 0) {
    const ctx = this.ctx;
    const start = when ?? ctx.currentTime;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();

    osc.type = type;
    osc.frequency.setValueAtTime(freq, start);
    if (bend) osc.frequency.exponentialRampToValueAtTime(Math.max(24, freq + bend), start + duration);

    gain.gain.setValueAtTime(0.0001, start);
    gain.gain.exponentialRampToValueAtTime(Math.max(0.0002, volume), start + 0.008);
    gain.gain.exponentialRampToValueAtTime(0.0001, start + duration);

    osc.connect(gain);
    gain.connect(this.sfxGain);
    osc.start(start);
    osc.stop(start + duration + 0.02);
  }

  musicTone(freq, when, duration, type, volume) {
    const ctx = this.ctx;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    const filter = ctx.createBiquadFilter();

    osc.type = type;
    osc.frequency.setValueAtTime(freq, when);
    filter.type = 'lowpass';
    filter.frequency.setValueAtTime(type === 'square' ? 1150 : 900, when);

    gain.gain.setValueAtTime(0.0001, when);
    gain.gain.exponentialRampToValueAtTime(Math.max(0.0002, volume), when + 0.015);
    gain.gain.exponentialRampToValueAtTime(0.0001, when + duration);

    osc.connect(filter);
    filter.connect(gain);
    gain.connect(this.musicGain);
    osc.start(when);
    osc.stop(when + duration + 0.03);
  }

  musicNoise(when, duration, volume, cutoff = 600) {
    if (!this.noiseBuffer) return;

    const source = this.ctx.createBufferSource();
    const filter = this.ctx.createBiquadFilter();
    const gain = this.ctx.createGain();

    source.buffer = this.noiseBuffer;
    filter.type = 'bandpass';
    filter.frequency.setValueAtTime(cutoff, when);
    filter.Q.value = 1.1;

    gain.gain.setValueAtTime(0.0001, when);
    gain.gain.exponentialRampToValueAtTime(Math.max(0.0002, volume), when + 0.004);
    gain.gain.exponentialRampToValueAtTime(0.0001, when + duration);

    source.connect(filter);
    filter.connect(gain);
    gain.connect(this.musicGain);
    source.start(when);
    source.stop(when + duration + 0.02);
  }

  sweep(from, to, duration, type, volume) {
    const now = this.ctx.currentTime;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();

    osc.type = type;
    osc.frequency.setValueAtTime(from, now);
    osc.frequency.exponentialRampToValueAtTime(Math.max(24, to), now + duration);
    gain.gain.setValueAtTime(0.0001, now);
    gain.gain.exponentialRampToValueAtTime(Math.max(0.0002, volume), now + 0.006);
    gain.gain.exponentialRampToValueAtTime(0.0001, now + duration);

    osc.connect(gain);
    gain.connect(this.sfxGain);
    osc.start(now);
    osc.stop(now + duration + 0.02);
  }

  noise(duration, volume, cutoff = 1000, attack = 0.002) {
    const now = this.ctx.currentTime;
    const source = this.ctx.createBufferSource();
    const filter = this.ctx.createBiquadFilter();
    const gain = this.ctx.createGain();

    source.buffer = this.noiseBuffer;
    filter.type = 'bandpass';
    filter.frequency.setValueAtTime(cutoff, now);
    filter.Q.value = 0.8;

    gain.gain.setValueAtTime(0.0001, now);
    gain.gain.exponentialRampToValueAtTime(Math.max(0.0002, volume), now + attack);
    gain.gain.exponentialRampToValueAtTime(0.0001, now + duration);

    source.connect(filter);
    filter.connect(gain);
    gain.connect(this.sfxGain);
    source.start(now);
    source.stop(now + duration + 0.02);
  }
}

function createNoiseBuffer(ctx) {
  const length = Math.max(1, Math.floor(ctx.sampleRate * 0.6));
  const buffer = ctx.createBuffer(1, length, ctx.sampleRate);
  const data = buffer.getChannelData(0);

  for (let i = 0; i < length; i++) {
    data[i] = Math.random() * 2 - 1;
  }

  return buffer;
}

function getDefaultThrottle(name) {
  if (name === 'hit' || name === 'playerHit') return 0.035;
  if (name === 'footstep' || name === 'runStep') return 0.12;
  if (name === 'gearMove') return 0.25;
  if (name === 'projectileLaunch' || name === 'projectileImpact') return 0.035;
  if (name === 'harvest' || name === 'loot') return 0.05;
  if (name === 'attack' || name === 'bow') return 0.04;
  return 0;
}

function getMusicData(mode) {
  if (mode === 'boss') {
    return {
      gain: 0.78,
      stepDuration: 0.27,
      roots: [38, 37, 35, 34],
      beatGroup: 4,
      melody: [12, 15, 19, 15, 10, 14, 17, 10],
      counterMelody: [0, null, 3, null, -2, null, 3, null],
      bassPattern: [0, 2],
      bassWave: 'sawtooth',
      bassAccentVolume: 0.105,
      bassVolume: 0.07,
      leadWave: 'square',
      leadVolume: 0.082,
      leadHold: 0.68,
      counterVolume: 0.042,
      chord: [0, 7],
      chordWave: 'sawtooth',
      chordVolume: 0.032,
      chordHold: 1.4,
      percussion: { low: 0.07, high: 0.045, highSteps: [2] }
    };
  }

  if (mode === 'combat') {
    return {
      gain: 0.68,
      stepDuration: 0.34,
      roots: [40, 43, 38, 35],
      beatGroup: 4,
      melody: [12, null, 7, 10, 12, null, 14, 10, 7, null, 12, 15],
      counterMelody: [0, null, 5, null, 3, null, 7, null],
      bassPattern: [0, 2],
      bassWave: 'triangle',
      bassAccentVolume: 0.09,
      bassVolume: 0.058,
      leadWave: 'square',
      leadVolume: 0.062,
      leadHold: 0.64,
      counterVolume: 0.034,
      chord: [0, 7],
      chordWave: 'triangle',
      chordVolume: 0.024,
      chordHold: 1.25,
      percussion: { low: 0.052, high: 0.028, highSteps: [2] }
    };
  }

  if (mode === 'hub') {
    return {
      gain: 0.43,
      stepDuration: 0.72,
      roots: [45, 48, 43, 45],
      beatGroup: 8,
      melody: [12, null, null, 16, null, 19, null, null, 14, null, 12, null, 16, null, null, null],
      counterMelody: [0, null, null, null, 7, null, null, null],
      bassPattern: [0, 4],
      bassWave: 'sine',
      bassAccentVolume: 0.062,
      bassVolume: 0.036,
      leadWave: 'triangle',
      leadVolume: 0.042,
      leadHold: 1.25,
      counterVolume: 0.021,
      chord: [0, 7, 12],
      chordWave: 'sine',
      chordVolume: 0.017,
      chordHold: 3.2,
      chimeSteps: [5, 12],
      chimeVolume: 0.014
    };
  }

  if (mode === 'dungeon') {
    return {
      gain: 0.47,
      stepDuration: 0.7,
      roots: [38, 36, 33, 35],
      beatGroup: 8,
      melody: [12, null, null, null, 10, null, null, 7, null, null, 15, null, null, null, 10, null],
      counterMelody: [0, null, null, null, -2, null, null, null],
      bassPattern: [0, 4],
      bassWave: 'sine',
      bassAccentVolume: 0.066,
      bassVolume: 0.034,
      leadWave: 'triangle',
      leadVolume: 0.038,
      leadHold: 1.5,
      counterVolume: 0.018,
      chord: [0, 5, 12],
      chordWave: 'sine',
      chordVolume: 0.014,
      chordHold: 4.4,
      drone: true,
      droneVolume: 0.026
    };
  }

  if (mode === 'travel') {
    return {
      gain: 0.5,
      stepDuration: 0.52,
      roots: [40, 43, 45, 38],
      beatGroup: 8,
      melody: [12, null, 15, null, null, 19, null, 17, 14, null, null, 12, null, 10, null, null],
      counterMelody: [0, null, null, 7, null, null, 5, null],
      bassPattern: [0, 4],
      bassWave: 'triangle',
      bassAccentVolume: 0.072,
      bassVolume: 0.04,
      leadWave: 'triangle',
      leadVolume: 0.046,
      leadHold: 1.05,
      counterVolume: 0.023,
      chord: [0, 7],
      chordWave: 'sine',
      chordVolume: 0.018,
      chordHold: 2.8,
      chimeSteps: [5],
      chimeVolume: 0.014
    };
  }

  return {
    gain: 0.48,
    stepDuration: 0.64,
    roots: [45, 43, 40, 45, 48, 43, 45, 40],
    beatGroup: 8,
    melody: [12, null, null, 19, null, 16, null, null, 14, null, 12, null, null, 19, null, 16],
    counterMelody: [0, null, null, null, 7, null, null, null],
    bassPattern: [0, 4],
    bassWave: 'sine',
    bassAccentVolume: 0.068,
    bassVolume: 0.038,
    leadWave: 'triangle',
    leadVolume: 0.044,
    leadHold: 1.15,
    counterVolume: 0.022,
    chord: [0, 7, 12],
    chordWave: 'sine',
    chordVolume: 0.016,
    chordHold: 3.6,
    chimeSteps: [3, 13],
    chimeVolume: 0.015
  };
}

function collectMusicActors(party) {
  const actors = [];

  for (const member of party || []) {
    if (!member || member.active === false || (member.hp || 0) <= 0) continue;
    actors.push(member);

    for (const summon of member.summons || []) {
      if (!summon || summon.alive === false || summon.dead || (summon.hp || 0) <= 0) continue;
      actors.push(summon);
    }
  }

  return actors;
}

function getNearestActorDistance(enemy, actors) {
  let nearest = Infinity;

  for (const actor of actors) {
    nearest = Math.min(nearest, Math.hypot((enemy.x || 0) - (actor.x || 0), (enemy.y || 0) - (actor.y || 0)));
  }

  return nearest;
}

function midiToHz(note) {
  return 440 * Math.pow(2, (note - 69) / 12);
}

function installAutoUnlockAudio() {
  if (autoUnlockInstalled || typeof globalThis.addEventListener !== 'function') return;
  autoUnlockInstalled = true;

  const wake = () => {
    const audio = createAudioSystem();
    audio.unlock();
  };

  const options = { passive: true };
  globalThis.addEventListener('pointerdown', wake, options);
  globalThis.addEventListener('mousedown', wake, options);
  globalThis.addEventListener('click', wake, options);
  globalThis.addEventListener('keydown', wake, options);
  globalThis.addEventListener('touchstart', wake, options);
  globalThis.addEventListener('gamepadconnected', wake, options);
}
