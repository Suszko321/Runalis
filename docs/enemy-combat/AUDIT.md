# Enemy combat audit — 11 October 2026

The production renderer is Canvas 2D with pixel atlases and layered human bodies/equipment, not Babylon.js. Preserve it, the authored faction outfits, monster silhouettes, player combos, damage/defence authorities, eight elite modifiers, geographic population scaling, boss phases, reward/quest/death callbacks and camera-shake opt-out.

Concrete weaknesses found before implementation:

- Legacy melee attacks and advanced basic-beast/knight strikes apply damage immediately; humanoid animations infer attacks from a cooldown increase after contact.
- Advanced attack cooldowns decrement in both the main enemy update and the advanced AI. Phase Strike calls a basic-hit helper that can reject its own scheduled release because the cooldown has already started.
- Advanced warnings allocate a new effect every update and linger briefly after cancellation. Basic ranged attacks draw broad ground lines despite being ordinary shots.
- Source-centred attacks check damage against target-centred coordinates. Cleave/cone warnings disagree with circular collision; charge warnings infer widths from unrelated radii. Boss warning radius differs from generic boss damage radius; decorative crosses/rifts/eyes look dangerous despite doing no damage.
- Windups and recovery are not represented consistently in the actual human weapon pose. Monster atlases hold the same attack frame throughout preparation.
- Cosmetic hit-stop also skips enemy AI; repeated minor/channel/DoT impacts can interfere with attack clocks. Hit feedback defaults often lose valid zero direction components. Contact sparks mostly appear at the centre and several summon/DoT paths lack reactions.
- Existing damage numbers, elemental palettes, audio synthesis, corpse rewards and disposal already work and should be retained. Camera shake is deliberately disabled and will remain disabled.

Implementation approach: bind presentation to existing attack state, add scheduled windups only to instant basic attacks, share warning geometry with collision, keep normal tells on the body, retain elite/boss mechanics, and distinguish cosmetic recoil from authoritative stagger. Add bounded contact effects and an isolated practice page that executes production AI and damage paths. Verify interruption, death, save/load, visibility, walls, party/summon targeting, rewards and dense encounters before delivery.
