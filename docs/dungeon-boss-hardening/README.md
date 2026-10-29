# Grove and Orchard: four-player boss review

Both encounters now use effective stats after the global enemy multiplier:

| Boss | Solo HP | Two players | Three players | Four players | Base attack damage |
| --- | ---: | ---: | ---: | ---: | ---: |
| Mother of Briars | 5,250 | 10,500 | 16,275 | 22,050 | 45 |
| Alder Verran, the Grafted Custodian | 7,000 | 14,000 | 21,700 | 29,400 | 50 |

Move multipliers apply to base damage. Each additional party member adds 5%
attack damage; phases two and three add 10% and 20% respectively. Later phases
also shorten recovery and expand selected patterns. Existing armour, dodge and
block rules still apply. Health scaling preserves the current health fraction,
is idempotent and cannot shrink during a locked attempt when allies fall or
disconnect. Late joins can increase the pool. A wipe unlocks party sizing for
the next attempt.

Targeted patterns consider every living joined player. All players inside an
active sealed arena can take damage even when outside the primary camera.
Arena locks survive saves; victory and full-party defeat still release them.

The Mother fights inside a burial crown framed by huge roots, woven oath-root
spirals, pale petals and lamps. The Custodian's cistern has monumental turning
pressure wheels, four illuminated basins and a brass charter ring. Ground art
does not add collision. Each of the eight moves has both anticipation and
impact effects: thorn eruptions, raking crescents, briar lanes, annular ripples,
pressure spray, steam and white impact streaks. Effects follow the same shapes
as combat, leaving ring safe zones clear. Impact sounds and camera shake are
triggered by simulation release. Native 60-by-80 character sheets and shared
animation clocks remain in use.

Validation:

- `node tools/verify-dungeon-boss-coop.mjs`: both bosses, every party size,
  scaling stability, simultaneous party damage, off-camera hits, tells,
  locked save/reload and wipe reset.
- `node tools/verify-dungeon-boss-effects-browser.cjs`: all eight moves in
  anticipation and impact with four player actors; sixteen rendered captures.
- Both dungeon progression and production browser suites, shared enemy-density
  regression checks, native character animation checks and the main campaign
  flow with 43 save/load checkpoints pass.

Browser images and verification JSON are generated locally and ignored by Git.
Automated geometry and progression tests do not establish human encounter
balance; a coordinated four-person playtest is still needed to judge clear
times and difficulty across classes and equipment.
