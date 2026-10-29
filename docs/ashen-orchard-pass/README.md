# Ashen Orchard — Below the White Fire

The relief encampment remains a working camp. Its Covenant physician and
engineer are trying to save patients, not conceal a villainous ritual. The
Last Dawn damaged the farmhouse's return system. Purification residue now feeds
an older cistern, whose root-bound Custodian interprets the founding water
charter as an obligation to feed every growing root.

The existing relief engineer offers **Below the White Fire** beside the camp.
Entering the cellar also starts the quest and introduces the missing attendant,
Sister Tamsin. She has isolated the camp feed but cannot close the two damaged
returns herself. The player clears their pump tenders, closes each return and
descends to the Founders' Cistern. A report to the same engineer concludes the
quest after victory. The existing Last Harvest investigation and main quest
retain their IDs, decisions and dungeon completion requirements.

The two authored floors have distinct functions and visuals: a temporary triage
station, settling beds, pump house and charter gallery above; a brass-routed
cistern with four dark-water basins below. White chalk marks the treatment feed;
black roots follow the broken returns. The final chamber has a readable warning
before its threshold and seals the party inside during combat.

**Alder Verran, the Grafted Custodian** has a native 60×80 animated pixel sheet
at `assets/art/sprites/dungeon-orchard-custodian.png`: a founding warden's corpse inside a brass
waterwheel, with hydraulic press arms and a purification lantern in its ribs.
Six animation rows have sixteen timed cells each and use the shared asset cache
and attack-presentation timing. The pressure rush interpolates across its path.
His four serial attacks are a pressure rush, alternating flooding quadrants,
a large lantern ring with a safe center, and radial waterwheel spokes. At 70%
and 35% health, flood coverage, spoke count/width and recovery times escalate.
Damage uses the same shapes as the visible warnings and respects ordinary
armour, guard and dodge protection. Failure resets the boss and warnings;
mid-fight reload preserves the seal and gives warning grace. Stair transitions
cannot bypass an active boss arena.

The existing legendary **Orrakai Founder's Signet** retains its implemented
Founder's Resolve passive: kills restore health and awakened Spirit. The
Custodian gets one dedicated **2%** roll per eligible defeat, even at the
Orchard's early levels. Generic enemy loot and the generic first-kill reward
bundle are filtered so their separate Signet chances cannot stack with this
roll. The roll and generated world loot are persisted against duplication.
This does not guarantee an item every fifty kills. Repeat expeditions retain
the game's existing dungeon-reset schedule.

Verification:

- `node tools/verify-ashen-orchard.mjs`: camp assignment, attendant dialogue,
  both valves and guardian gates, room reachability, floor transitions,
  sealed movement/stairs/exits, save/load, four attack tells and damage,
  phase changes, wipe reset, boss death, original dungeon completion,
  camp report, reward persistence and exact 2% drop boundaries. It also checks
  that generic first-kill rewards cannot secretly add an 18% Signet chance.
- `node tools/verify-ashen-orchard-browser.cjs`: production entry at the actual
  farmhouse entrance, dialogue, valves, final arena, combat reload, boss death,
  surface return and camp debrief. Screenshots and sprite export; no page errors.
- `node tools/verify-mercy-flow.mjs`: complete opening/main campaign with the
  new cellar steps and 43 save/load checkpoints.
- Grove, campaign, shared combat/instance and quest-evidence regressions pass.

Flow tests reposition travel and set enemy HP to zero to exercise death
handling. Mechanics checks test damage separately. These are not manual combat
clears or balance tests of every build; the difficulty targets prepared players
around level 6 and still benefits from human playtesting.
