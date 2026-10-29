# Dungeon characters: native pixel and animation contract

The Grove Mother, Orchard Custodian, Sister Tamsin and Edda now use sheets in
the existing `assets/art/sprites/` cache. Every source cell is exactly **60×80**.
The source is hand-authored pixel geometry, not reduced versions of the old
128-pixel placeholder sheets. Their restrained bark, bone, weathered iron,
brass and Covenant-ivory ramps follow the game's earth/ash/brass material style.
Ink outlines and hard alpha edges are preserved; rendering uses nearest-neighbor
sampling and integer 2× enlargement for bosses. NPCs use their native scale.

Each sheet is 960×480: sixteen cells across six rows (idle, anticipation,
execution, recovery, hit and death). Natural pixel holds are intentional;
frame count is not a claim that every cell has unique painted pixels. The
Custodian's wheel turns, the Mother raises her root arms, Tamsin breathes,
blinks and gestures, and Edda's cracked jaw moves during speech. Dialogue
portraits use these same assets.

`dungeonCharacterSprites.js` uses `spriteArt.asset()` and samples the existing
enemy attack-presentation system. Simulation tell/release timing selects the
animation phase; painting a frame cannot advance combat. The Custodian's press
now uses a short eased movement instead of teleporting to its destination.
Boss corpses persist long enough for their death row to finish. Regenerating
the art does not touch encounter stats, rewards or quest progress.

Generation and validation:

- `tools/build-dungeon-character-art.py` writes the four sheets and metadata.
- `tools/verify-dungeon-character-art.py` checks all 384 cells for frame size,
  nonempty artwork, hard alpha and state variation. It exports a contact sheet
  and four animated previews into this directory.
- `node tools/verify-dungeon-character-runtime.mjs` checks all sixteen windup
  positions, shared presentation registration, release, recovery, hit/death
  timing and continuous pressure-rush movement.
- Both dungeon flow suites and production browser suites pass; main campaign
  progression still passes with 43 save/load checkpoints.

The boss fights, NPC world sprites and skull portrait were inspected in the
running game. Automated combat flows use repositioned travel and zero enemy HP
for death handling; separate geometry checks validate damage timing.
