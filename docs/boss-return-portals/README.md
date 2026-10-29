# Victory-only return portals

Defeated instanced boss encounters now leave a visible, animated pixel portal
named **Return to Entrance**. This covers dungeon finales, non-final floor
bosses, authored miniboss rooms, the Mother of Briars, existing side-zone
wardens and regional Infinite Dungeon bosses. Ordinary enemies and summoned
bosses cannot create one. In a multi-boss arena, every required boss must fall.
An active sealed encounter cannot use a return portal from an earlier victory.

Portals open near the defeated encounter at a passable position. Surviving
ordinary enemies do not delay them. Standard dungeons, towers and procedural
side zones use the existing party return to the overworld entrance that was
actually used. The Grove returns the entire party to its entrance inside the
zone so Edda's quest conclusion remains accessible on the same visit.

Each victory has a persisted record with its encounter IDs, floor and portal
position. Save/load and repeat visits rebuild missing portals after boss corpses
disappear. Older tower saves recover from a defeated arena or cleared floor;
repeatable-instance death records also reconstruct returns for older victories.
A living restored boss invalidates its return record and removes the portal.
Fresh expedition cycles start without victory portals. Portals have distinct
animated green pixel apertures and runes, using the existing object renderer.

Returning after a floor boss or miniboss does not mark the full dungeon cleared
or unlock its final rewards. Malakar's portal still waits until the existing
death sequence completes. Existing ordinary entrance exits keep their rules.

Validation:

- `node tools/verify-boss-return-portals.mjs`: Grove party return and quest
  access; all ten side-zone types with and without wardens; all eight regional
  tower bosses; partial and legacy clears; multi-boss gating; summons; ordinary
  floors; floor-boss and miniboss returns; active-arena restrictions; reachable
  portals; corpse removal, repeat visits, resurrection and production saves.
- `node tools/verify-dungeon-return-portals.mjs`: seven dungeon themes, final
  victory, ordinary survivors, idempotent creation, real used entrance returns
  and both dungeon-specific and production save restoration.
- `node tools/verify-boss-return-portals-browser.cjs`: production renderer,
  portal reconstruction and actual interaction in the Grove, Orchard and a
  tower boss floor. Captures and reports are generated locally and ignored.
- Existing Grove, Orchard, Malakar, encounter regression, party consent and main
  campaign suites pass, including 43 campaign save/load checkpoints.
