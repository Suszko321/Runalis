# RUNALIS engineering quality register

Established October 31, 2026. Evidence comes from the
[engineering audit](RUNALIS_ENGINEERING_AUDIT.md) and
[validation record](engineering-audit/VALIDATION.md). Update status and evidence
when behavior changes. Director-specific IDs remain linked to their owning audits.

CRITICAL = demonstrated save loss/core corruption or comparable failure;
HIGH = serious ownership, reliability or trust fault; MEDIUM = bounded defects,
meaningful duplication or coverage/coupling risks; LOW = cleanup with limited impact.
An investigation is not a demonstrated defect. File length and dependency cycles
do not establish severity by themselves.

## Correctness and progression: act first

### E01 · CRITICAL · Save migration/quota can discard characters · FIXED, local validation passed

- **System/evidence:** `gameSave.readProfiles/writeProfiles` removed legacy sources
  before confirming writes; co-op's parallel migration did the same.
  `emergencySlimProfileCollection` sorted and sliced to six profiles.
  Controlled storage scenarios passed 1/12 before the correction, 12/12 afterward.
- **Impact:** a failed migration could delete its only source; an otherwise
  successful emergency write could silently drop older characters. Malformed
  legacy co-op bytes were also deleted without a usable migration.
- **Correction:** cleanup follows successful writes in both paths; malformed/non-array
  legacy data remains; emergency slimming preserves the complete profile set.
  No persisted field/schema change or gameplay change. Removal: only the six-profile
  truncation and premature cleanup operations; no modules/content removed.
- **Dependencies/verification:** host/current/legacy and local co-op writers;
  `verify-profile-storage.mjs` covers failure, success ordering, malformed input,
  eight-character quota fallback and gold/inventory/XP/story preservation. Related
  migration/co-op suites, production build, co-op browser regression and twenty
  packaged save/quit cycles pass. CI now includes this regression. Not deployed.

### E02 · HIGH · Unreadable active saves can be overwritten · OPEN, reproduced

- **System/evidence:** `gameSave.readProfiles` catches parse errors and returns `{}`;
  `couchCoop.loadUnifiedProfiles` also returns an empty collection on parse/shape
  failure. In a disposable Storage mock, seed the active key with truncated JSON,
  then call `upsertProfile` for a new character: it returns `saved:true` and replaces
  the recovery bytes with only the new ID.
- **Impact:** recovery information disappears; load failure is indistinguishable
  from a genuinely empty collection. E01 does not solve this separate contract.
- **Correction:** distinguish unavailable/corrupt storage from empty storage and
  block destructive collection writes until recovery is explicit. Preserve/export
  original bytes; show a useful failure through existing menu/save boundaries.
- **Dependencies/verification:** coordinate both writers, title creation/deletion,
  co-op autosave and online guest `upsertProfile`; verify malformed JSON, wrong
  shapes, inaccessible storage, one malformed legacy key alongside valid data,
  successful recovery and unchanged unrelated profiles. Requires a small boundary/API
  design before implementation; do not add another silent backup/fallback chain.

### E03 · HIGH · Guest character updates bypass host transactions · OPEN, reproduced

- **System/evidence:** `onlineSession.hostMessage` accepts allowlisted gold,
  inventory/equipment/progression fields while `networkMenuBusy`. The controlled
  browser dispatch sets a disposable guest's gold to 987654321 and receives
  `character-accepted`; host gold stays unchanged. No public room/exploit was opened.
- **Impact:** imported-character trust extends into ongoing host-world economy
  updates; field-name allowlisting is not transaction authorization or schema validation.
- **Correction:** with Multiplayer, define permitted initial imports and menu
  operations, then validate/apply service transactions against host state. Preserve
  deliberate portable-character behavior. See [MP-002](RUNALIS_MULTIPLAYER_AUDIT.md).
- **Dependencies/verification:** guest menu services, workshop/shop quotes,
  character commits/acknowledgements, reconnect/save; test forged quantities/gold,
  malformed nested fields, stale revisions, legitimate purchases and host isolation.

### E04 · HIGH · Loot owner is a reusable session slot · OPEN, reproduced

- **System/evidence:** `lootSystem` stores `ownerSlot` and finds a current member
  by that slot. `audit-multiplayer-foundation.mjs` confirms a replacement profile
  in slot 2 receives three iron ore belonging to the departed profile.
- **Impact:** progression/rewards transfer between characters on leave/rejoin.
- **Correction:** stable character/session identity with explicit legacy fallback,
  using existing party identity mechanisms; do not change allocation rules.
  See [MP-001](RUNALIS_MULTIPLAYER_AUDIT.md).
- **Dependencies/verification:** local/online joining, drop persistence and continent
  memory. Test P1–P4 departure/rejoin, different profile reusing a slot, same owner
  returning, legacy saved drops, no double pickup and existing XP/loot percentages.

### E05 · HIGH · Support resolution assumes the caster owns the party · OPEN, reproduced

- **System/evidence:** real ownership links put `coop.players` on the host and
  `questOwner` on allies. Combat `healPartyNear/forPartyNear` enumerate the caster's
  own party; C04 shows P2 Mending Current heals itself but not P1.
- **Impact:** actor-slot-dependent cooperative support delivery.
- **Correction:** one resolver over existing actor/owner links, preserving separate
  resources and legitimate support variants. See [C04](RUNALIS_COMBAT_AUDIT.md).
- **Dependencies/verification:** Combat and Multiplayer; P1–P4 casters/recipients,
  range, terrain, downed/dead/departed actors, wards, fields, summons, support XP
  and isolated resource/cooldown state. Do not fix by sharing mutable player state.

### E06 · HIGH · Effective damage and reward attribution disagree · OPEN, reproduced

- **System/evidence:** C01 heals two HP from a hit removing one HP through
  pre-final legendary damage; C02 reflection directly kills without a contribution,
  yielding no Combat XP. Re-executed foundation probes confirm both.
- **Impact:** excess lifesteal and lost progression/incorrect fallback credit.
- **Correction:** account for effective HP loss and source ownership through
  existing hit/death/ledger paths. See [C01/C02](RUNALIS_COMBAT_AUDIT.md).
- **Dependencies/verification:** Combat, legendary procs, defense hooks, suppression
  and co-op identity. Test overkill/mitigation, lethal reflect, assisted targets,
  bosses, repeated death callbacks and proc recursion. Preserve formulas and shares.

## Bounded corrections and consolidation

| ID / severity / status | System, evidence and likely impact | Correction, dependencies and verification |
| --- | --- | --- |
| **E07 MEDIUM · OPEN, reproduced** | `onlineTransport` sends a permitted 6,289,437-character packet as 525 chunks, but accepts at most 512. Large permitted snapshots disconnect/fail synchronization. | Derive compatible packet/chunk limits from shared constants. Coordinate [MP-003](RUNALIS_MULTIPLAYER_AUDIT.md); test exact limits, Unicode length policy, out-of-order/duplicate/expired/oversized chunks and actual initial/large-scene sync. |
| **E08 MEDIUM · OPEN, source/definition comparison** | `player.js` and `classData.js` export parallel class tables; eAbility/slots/metadata differ. Alias helpers repeat elsewhere. Different consumers can observe different class contracts. No additional live cast failure is claimed. | Inventory callers/fields and reconcile onto the intended registry with preserved compatibility exports. Combat/creator/Narrative consumers; test all supported and hidden/legacy IDs, starter assignments, class selection, descriptions and old saves before removal. |
| **E09 MEDIUM · OPEN, source-confirmed** | `gameSave` and `couchCoop` independently read/write/migrate the identical profile key. E01 required matching fixes; E02 affects both. Divergent slimming/sanitization/error behavior increases regression risk. | After E02 contracts, extract only the common DOM-free storage boundary. Preserve actor snapshot differences and current public APIs. Run host/P2–P4/online guest fixtures, quota failures, legacy merges, same-ID conflicts, independent state and round trips. No universal save framework. |
| **E10 MEDIUM · PARTIAL, automation added** | Existing combat aggregate fails on a directly duplicated channel assignment; density aggregate fails on empty Orchard `triage` marked combat. Legacy Pages fixture imports a separate sprite cache. Both model failures reproduce with pre-change save modules; all three gates remain red. | Keep new portable gate and PR/Pages wiring. Repair combat fixture through assignment APIs; reconcile authored triage room semantics with Narrative/Combat, rather than populating a safe camp merely to satisfy a generic assertion. Update Pages to observe the actual bundle. Expand mobile/iframe co-op coverage; passing the new gate is not a waiver. |
| **E11 MEDIUM · OPEN, architectural risk** | Six cyclic production components, largest 33 files, connect player/world/story/skills and other modules. Some combat imports presentation; normal/menu-busy update tails repeat. No import-time crash or measured cost was established. | For the next touched responsibility, add behavior contracts and remove a specific reverse dependency/repeated sequence where this simplifies a real change. Test native ESM and bundle initialization, solo/co-op/menu/death branches and instance transitions. Do not globally reorder/split files. |
| **E12 MEDIUM · INVESTIGATE, measured growth** | Packaged ten-cycle contexts: listener count constant at 364 and old loops stop; post-GC heap rises about 2.3–2.4 MiB with slowing increments. Caches/JIT/retained UI roots have not been distinguished. | Capture retained-object paths and longer cycles, compare warmed baseline and native canvas/audio allocations. Investigate constructor-failure cleanup (E15) separately. No unbounded leak or performance fix is claimed. |
| **E13 MEDIUM · INVESTIGATE, source risk** | Frame simulation caps `dt` while expiries use session clocks; camera smoothing uses fixed per-frame factors. World work is duplicated across host-menu paths; migration/derived calculations run frequently. Behavior can diverge across low FPS/pause/suspend, but no new combat timing defect or bottleneck was reproduced. | Deterministic 30/60/120 Hz, pause/long-frame/tab tests, per-mode CPU/frame percentiles and network counters. Coordinate timing changes with Combat/Multiplayer. Preserve existing clamps until intended timing is defined; optimize only a measured root cause. |
| **E14 LOW · OPEN, removal candidates** | Unlinked `enemyAI.js` actually contains older floating-text helpers; `questSystem`/`dungeon` have tool consumers; dormant story data remains useful authored material. Nested upload is not shipped. Similar names can mislead future agents. | Root guidance now identifies the active tree. Update stale tool consumers/ownership labels before retiring confirmed obsolete code. Check HTML, dynamic/registry/string references and saves; coordinate dormant content with Narrative. No uncertain code was deleted. |
| **E15 MEDIUM · INVESTIGATE, source-confirmed exception boundary** | `RunalisGame` binds listeners/UI before loading its saved destination. If construction throws later, `startProfile` sets `currentGame=null`; it never receives a constructed object to destroy. A recovery catch can leave partial resources. Failure-path retained growth has not been reproduced. | Add deterministic initialization-fault injection and verify cleanup before changing initialization structure. Cover old game teardown, new game listeners/menus/audio/network, error UI and successful retry. Prefer scoped cleanup to a new lifecycle framework. |
| **E16 MEDIUM · OPEN, reproduced content contract** | Combat C03: Blackbow requires three/four pieces but all assigned items share weapon/chest slots; advertised higher bonuses are unreachable. Some set bonus consumers need tracing. | Combat owns compatible catalogue/threshold decisions; engineering verifies delivered stats and tooltip consumers. Test reachable combinations, no extra equipment slots, save compatibility and proc/equipment scaling. See [C03/Q01](RUNALIS_COMBAT_AUDIT.md). |

### E17 · HIGH · Humanoid locomotion assembly gaps · REOPENED; rejected pass reverted

- **Outcome:** the director rejected the eight-pose art replacement for palette,
  clothing silhouette and limb proportions. Numerical/render checks passing did
  not establish acceptable artwork. The original reported defects remain open.
- **Restoration:** eight runtime modules restored byte-for-byte from pre-task
  backups; original leg-gait test restored. New body sheets, authoring/verification
  tools and review pages removed from the active project and archived locally.
  Unrelated engineering, multiplayer and narrative work is preserved.
- **Evidence/policy:** [Rollback record](art-audit/REVERTED_WALKING_PASS.md).
  Future art work must follow the requested simple sprite-sheet cycle and retain
  the original character palette and anatomy; do not mark this fixed from technical
  assertions alone.
- **Subsequent conservative gap repair:** [Two-module patch](art-audit/WAIST_GAP_FILL.md)
  fills the existing waist join from original tinted pixels and stops the glove
  mask trimming valid trouser rows. No new assets, frames, rig, clock or proportions.
  Browser comparisons confirm only missing coverage is added; broader animation
  quality remains separate from this bounded repair.

### E18 · MEDIUM · Ordinary Bat Beast art replacement · IMPLEMENTED, verified

- Replaced placeholder geometric art with authored pixel poses based on the user's
  bat-pterosaur references and the existing summons' cluster treatment. Source cells
  are 96×80 to contain wings/tail; six states, sixteen held slots, timing and combat
  remain. Renderer changes only source/destination width and existing-direction mirroring.
- Passing: 96 production browser crop contracts, mirrored draw, padded cells,
  binary alpha, shared 32-color palette, art foundation, engineering/build and four
  Veyreign feature suites. Royal boss and player assets unchanged.
- [Art report and limits](art-audit/bat-beast/README.md). Four authored poses/state;
  still captures/contracts do not certify every combat or co-op scene.

### E19 · MEDIUM · Royal Bat Beast placeholder replacement · IMPLEMENTED, verified

- Replaced crowned humanoid geometry with the requested evolved beast, without a
  crown. 112×80 cells contain the wider wings/tail; seven state rows and 48 timing
  slots remain, using 28 distinct authored drawings. Native-size art inspected for
  future summon reuse; no new summon gameplay introduced.
- Passing: engineering/build, four Veyreign Node suites, art foundation, 336 source
  cell padding/alpha/palette checks, all royal production crop/hidden-state contracts,
  mirroring and ordinary Bat Beast regression. Actual boss browser test covers weapon
  transition, saved transformation, blood waves and compact viewport without errors.
- [Artwork, encounter captures and limits](art-audit/royal-bat-beast/README.md).
- Subsequent user-directed distinction pass: keep the accepted build, add a smaller
  lower wing pair (four wings total), black hide and antique-gold membranes/accents.
  Approved crimson master/export preserved locally. Artwork and palette metadata
  only; existing dimensions/renderer retained. Re-ran engineering/build, feral Node,
  art foundation, 336 padding/alpha/palette checks, production royal browser and
  actual feral encounter browser suites; all pass. Boss/native previews refreshed.
- Final user-directed palette refinement: four wings retained, blood-red membranes
  and mane, black body/struts, narrow gold edging only. Black/gold version backed up.
  No new renderer/gameplay changes; engineering/build, art foundation, all source
  padding/alpha/palette checks and both royal production/encounter browser suites pass.

### E20 · MEDIUM · Director-limited quest roster · IMPLEMENTED, verified

- **Change:** only the main campaign and Castle Veyreign, Blighted Grove,
  Ashen Orchard cellar and WIP Iron Mine quests remain playable. Removed 36
  other definitions and their dialogue/resolution/assignment paths. Stable IDs
  for retained content remain. Character rewards, bloodlines and past world
  outcomes are preserved; retired journal/tracker entries are removed on load.
- **Source corrections:** active and compatibility quest logs/notifications are
  cleaned without mutating their source save maps. UI no longer synthesizes
  old tutorial tasks. Saved dialogue refresh and stale-choice checks prevent
  retired content returning. Radar and overhead NPC markers use the same
  current eligibility, ignoring retired cached IDs. Retained Castle acceptance
  is no longer filtered out merely because its authored option closes dialogue.
- **Verification:** exact-roster/absence/save/host-P2/marker/action regression;
  actual Canvas/radar/journal and old-profile browser checks; main campaign,
  Grove/Orchard/Iron Mine/Veyreign, training/medicine and visibility suites;
  engineering gate/build; packaged startup/save/reload at both hosting prefixes.
  A UI-helper truncation during implementation was caught by startup testing,
  restored, and the final source and packaged browser checks pass.
- **Scope/limits:** user-directed content removal, not a redesign of acts,
  combat, mythology or personal bloodline choices. No live network or physical
  controller playthrough is claimed. [Roster and evidence](quest-roster/README.md).

## Sequence and review policy

1. E02 first; E03–E06 next, coordinated with their directors. E01 remains guarded.
2. E07 and E10 are bounded reliability/validation work; then E09/E08 consolidation
   under established behavioral contracts, followed by defensive damage parity.
3. Address E11 as concrete feature work needs it. Measure E12/E13/E15 before choosing
   optimizations or lifecycle restructuring. Resolve E16 through Combat ownership.
4. E14 is lower priority than real progression/ownership failures. Keep dormant
   authored content until its owning director resolves purpose and compatibility.

Keep each correction independently reviewable. Mark fixed only after affected
contracts and integration checks pass; record unavailable checks. No performance,
memory, security or gameplay readiness claim follows solely from a green build.

### E20 · Vampire bloodline overhaul · IMPLEMENTED, verified

- Replaced universal Vampire drain and retired tree bonuses with maximum-HP costs and one effective-damage recovery path. Added nine actives, ten passives, eight morphs, transient Royal form and owner-attributed Bat companions using existing combat/channel/companion systems.
- Idempotent tree normalization refunds obsolete investments through available points. Save snapshots terminate transient states and preserve end recovery without changing the live actor. Bloodline identity, mastery and unrelated trees remain.
- Verified: 16 Vampire scenario groups, browser tree/menu/controller/render checks, all 11 engineering suites and 14 affected combat regression scripts. See [implementation and numerical decisions](vampire-overhaul/README.md). Human endurance balance, hardware latency and a real online session remain unmeasured. C01’s wider non-Vampire healing behavior remains open.

### E21 · Bat mastery evolution and shared royal art · IMPLEMENTED, verified

- Added bounded visual milestones from persistent Call Bat Beast mastery, synchronized per owner during existing summon updates without changing health, identity or combat scaling.
- Replaced the royal atlas with 28 newly authored poses while retaining existing dimensions, seven states, timing slots and feet pivot. Boss and player consume the canonical export; summons share its silhouette through one cached allied palette.
- Focused model/browser checks cover threshold boundaries, four owners, save/load, palette/alpha identity, crop geometry and the actual Veyreign transformation encounter. See [art prompt, paths and verification](bat-mastery-evolution/README.md).

### E22 · Persistent summon visual evolution · IMPLEMENTED, verified

- All persistent summon skills now use visual mastery milestones 1/5/10/20/50 without altering combat evolutionStage, source, identity or statistics. Owner-stamped mastery travels with existing summon snapshots; temporary legendary procs are excluded.
- Inspected shipped art before built-in ImageGen production. Added 48 source-matched Fae Thornling, Fae Elder and Rose Siegebeast poses as sibling atlases; shipped midpoint bodies remain intact. Other fixed bodies receive five size stages retaining equipment and morph identities.
- Verified actual spawn/live evolution/save-load-recast for three Thornbinder doctrines × two skills × four local owners. Browser production rendering covers 15 forms × five tiers, all authored animation crops, palettes, hard alpha and no clipping/mutation. Fae, Petalknight, lich and Bat regression suites, engineering 11/11 and build pass. [Coverage and validation limits](summon-evolution/README.md).

### E23 · Gravecaller authored mastery evolutions · IMPLEMENTED, verified

- Added 96 new poses for six Bound Dead/Lich forms around retained mastery10 bodies; milestones remain1/5/10/20/50 and morph gates remain enforced. Uses source-derived 32-color palettes, fixed ground pivots and existing simulation-driven animation.
- Standard skeletons retain actual equipment overlays, marksman bows and legacy gear; corrected charm rendering from a profile-object argument to its item ID. Owner/source mastery remains independent, with no health/identity/stat mutation on evolution.
- Verified six forms × four local slots × five milestones, wire clones and save/load/recast. Browser: 360 cases covering every authored pose, facing and equipped variant. Engineering11/11, build and affected sustain/lich/movement/positioning/recovery/evolution suites pass. [Production notes and limits](gravecaller-evolution/README.md).

### E24 · Abandoned Iron Vault authored overhaul · IMPLEMENTED, verified

- Replaced the generic Iron Mire dungeon with three authored industrial floors,
  five-stage crew-record/memorial quest, guarded pumps/records/brakes, 56/72/21
  solo encounter populations, profession nodes, stores and a sealed Foreman boss.
  Level-16 map guidance and 11,200-HP/64-damage boss place it above Orchard's
  7,000/50 contract; three phases and five telegraphed move families retain the
  existing party/minion damage, consent, arena, completion and reward systems.
- Added 24 original boss drawings and twelve mine machinery props via built-in
  ImageGen, then native packing/palette/alpha/padding validation. Environmental
  layers and props use the existing Canvas/depth pipeline. Player art untouched.
- Passing nine focused model scenario groups, actual startup/production browser
  progression and compact capture, four-owner/minion damage and wire geometry,
  save/load/retry/old cleared-save migration, single-award victory/report, art
  foundation, engineering 11/11/build and nine related dungeon/party regressions.
- [Implementation, tuning, migration and limits](iron-mire/README.md). Browser
  fixtures accelerate pack deaths; human balance/endurance and a real transport
  session remain unmeasured. No broader audit findings are marked closed.

### E24 · Class-open boss weapons, book focuses and distinct shots · IMPLEMENTED, verified

- Added eight rare boss finds with sixteen-percent themed pools (eight-percent each), at most one additional armory item. Uses existing seeded death/owner/pickup handling, equipment tiers and class-open proficiency rules.
- Nine generated/packed assets supply eight equipment designs plus sixteen projectile motifs. All fifteen registered focuses have separate silhouette identities, latched on their committed move/projectile. Actual item art serves inventory and player grips; original assets remain intact.
- Verified64 class/item equip-hit-save combinations, real Petalknight casting with Rose Reaper, four slots ×15 focuses ×light/heavy across gear swaps, exactly-once physical boss drops/pickup; browser64 player renders,16 grips,120 projectile checks. Engineering11/11, build and loot/stance/heavy regressions pass. [Assets, prompts, stats and limits](boss-armory/README.md).

### E25 · Universal gear rarity, bag capacity and disposal · IMPLEMENTED, verified

- Added one shared enemy gear roll (1.5%/6%/30%) across all202 bases, receiver-level rarity formulas and level50 gates. Per-copy metadata resolves real stats and quality-gates Legendary/Mythical effects; legacy owned stats and upgrade records remain intact.
- Enforced20 unequipped combat-gear slots per actor. Purchases, crafting and quest claims preflight; full-bag world reward copies remain on the ground. Exact-copy sale quotes reject stale/repeated commits. Live blacksmith deconstruction previews materials and protects equipped gear. Material stacks and legacy overfull saves are retained.
- Model/browser checks cover formulas, all bases, real stats/UI/save, four owners, disposal, full-bag recovery, controller navigation and mobile. Existing loot/workshop/quest/boss/sustain/support suites and engineering11/11/build pass. [Detailed evidence and limitations](gear-itemization/README.md). No broader online character-trust or human economy-balancing claim.

### E26 · Mobile Bat Beast atlas compatibility · FIXED, verified

- Reproduced the old royal summon renderer throwing on a 5,376 × 560 recolour canvas under a controlled 4,096-side limit. Older iOS has this restriction; modern WebKit has raised the limit. Physical user-device diagnosis remains unconfirmed.
- Losslessly packed ordinary/royal sheets into four columns and exported the allied palette ahead of time. All 432 source timing slots match original pixels; runtime sheets are at most 448 × 560, with no palette readback. New asset names avoid old sprite cache entries. Narrow-view boss scale and HP/nameplate offsets agree.
- Four touch/mobile browser profiles pass across Chromium/WebKit and portrait/landscape, including all five mastery sizes, crop bounds, intended sheets, no oversized canvases or wide requests, and no page errors. Existing animation, mastery/four-owner save-load, Vampire gameplay/browser, real Veyreign encounter/browser, engineering11/11 and build pass. [Reproduction, repair and limits](mobile-bats/README.md).

### E27 · Selected player wearable anatomy and art · FIRST PASS IMPLEMENTED

- User-selected Gravebound Helm, Patched Road Leathers and Gravebound Greaves now
  use native authored directional surfaces registered to both approved bodies.
  Chest/legs no longer force replacement limbs or stance; original body alpha,
  gait, arm geometry and weapon anchors remain. Helm has an open face and restrained
  iron shading. Other item families and non-human equipment fitting remain separate.
- Passing 4,992 end-to-end silhouette comparisons across two bodies/four heads/
  four facings/thirteen pose samples/four weapon families, plus per-copy refs,
  underlying-color isolation, non-human overlay coverage and render non-mutation.
  Browser checks compare original/current production rendering and actual inventory
  equip operations for the full screenshot outfit. Engineering11/11, build and
  armour/head/gait/melee/stance/Gravecaller regression suites pass.
- Full art audit remains red on 24 pre-existing metadata-format/coverage errors.
  Reproduced identical errors from an isolated clean HEAD archive; this sheet adds
  24 inspected cells and zero errors. Eight approved player-sheet hashes remain.
  [Comparison, exact scope, prompts and limits](player-wearables-first-pass/README.md).

### E28 · Covenant / Last Dawn fitted wearables · IMPLEMENTED, verified

- Extended the anatomy-preserving garment path to twelve existing faction items:
  helm, plate chest, greaves, ceremonial robe, scout hood and scout leathers for
  each order. Added 48 authored directional designs, 96 native body registrations
  and twelve matching raster icons. Covenant ivory/brass and Last Dawn oxblood/
  blackened steel retain their distinct identity. Existing item IDs/stats remain.
- Reproduced attack silhouette drift from the unarmoured arm path selecting a
  plate/cloth source row. Base arms now retain their original source geometry;
  rig math, weapon anchors, movement and approved body files remain unchanged.
- Passing 9,984 silhouette comparisons including mixed factions and all thirteen
  pose samples; original first-pass 4,992 comparisons and affected armour/head/
  gait/melee/stance/Gravecaller suites. Browser compares 48 previous/64 fitted
  production renders and real equip operations for all twelve items, no page errors.
  Engineering11/11/build pass; 108 new art cells add zero structural audit errors.
  The aggregate art audit retains its 24 documented pre-existing format errors.
- [Scope, visual evidence, exact prompts and limits](faction-wearables/README.md).
  Robes retain the existing fitted torso silhouette. Non-human standalone fittings,
  separate authored enemy/boss bodies and faction weapons/cloaks/shields are outside
  this wearable pass; this is not a claim that every catalogue item is corrected.

### E29 · Complete player wearable catalogue · IMPLEMENTED, verified

- All 85 body wearables and 35 accessories now have explicit authored directional
  registrations and matching raster icons. Seventy additional body items cover
  remaining factions, regular/class clothing, legendary and mythical pieces;
  35 accessories include compact jewellery, seven cloaks and eleven hand shields.
  Crown/halo native rectangles and offsets are separate from full helmets.
- Retained the approved base anatomy, original body alpha, gait and arm/weapon
  anchors. Native equipment consumers use fitted garment materials; standalone
  non-human fittings retain their existing geometry. Item/save/progression rules
  and weapon art remain unchanged. Portable `check:wearables` catches any future
  non-weapon ID lacking authored art, slot registration or icon contracts.
- Visual review reproduced fixed-grid export importing neighbour fragments and
  clipping small ornaments; measured gutters/item clusters now isolate complete
  items. Rejected and regenerated one crowded seal master. Shield grip height
  corrected within the existing free-hand layer. Iron/red rings keep ring-sized
  geometry and now use material-appropriate colours.
- Verification fixture observation: prior short walkTime samples stayed in held
  key0. Corrected all three fitting fixtures, asserting actual gait keys0/1/2/3;
  no runtime gait/clock change. Passing79,057 renders/24,032 silhouette comparisons,
  120 browser equip operations/960 renders/120 decoded icons, 96 gait previews,
  four in-game mixed outfits, shield-grip and affected gear/armour/head/gait/melee/
  legendary/stance/Gravecaller regressions. Engineering11/11, build and coverage pass.
- New exports add808 inspected cells beyond E28 with no new audit errors and all
  eight approved player-sheet hashes intact. Aggregate audit retains the identical
  24 pre-existing format/coverage errors. [Full scope, prompts, review and limits](wearable-catalogue/README.md).

### E30 · Endgame high-fantasy equipment · IMPLEMENTED, verified

- Added twelve four-piece ensembles (48 new persistent item IDs), covering Mage,
  Knight, Archer and Battlemage at exact Legendary/Mythical/Primordial grades.
  Both wearer and encounter levels must meet 50/65/80; only existing elite/boss
  classifications qualify. Existing drop chances, grade weights and three-call
  RNG order remain. Eligible high-grade selections retain a 40% legacy pool.
- Acquisition/equip/reward boundaries reject forbidden grades and insufficient
  levels. Existing instance upgrades, bag recovery, ownership and save contracts
  remain authoritative. Added functional two/three/four-piece set bonuses using
  existing consumed stat keys. No new skill or transformation engine.
- Authored 192 directional drawings and 48 icons, registered to both base bodies.
  Approved body geometry, alpha, arm/weapon anchors and gait remain unchanged.
  Compact head fittings and existing cloak layers supply the ornate silhouettes.
- Passing contracts: all48 selections, 240 forbidden-grade cases, 192 four-piece
  loadouts across classes/owners, seeded real deaths at all three grades, full-bag
  recovery and save/load. Art: 40,296 renders/9,984 silhouette comparisons; browser
  equips all48 pieces, verifies live bonuses and captures twelve directional sets.
  Existing affected gear/loot/armour/head/gait/melee/stance/Gravecaller suites pass.
- Reproduced existing P3/P4 ground-drop labels incorrectly showing P1; labels now
  reflect all four owner slots. All-owner nearest-recipient and foreign-pickup
  rejection contracts pass; pickup authority is unchanged.
- Engineering11/11, build and all168 wearable coverage contracts pass. New art
  adds432 cells with no new structural errors; eight approved player hashes stay
  intact. Aggregate audit retains the same24 pre-existing errors. Balance/grind
  duration remains a human playtest limitation, separate from passing contracts.
  [Content, prompts, visual evidence and verification](endgame-equipment/README.md).

### E31 · Enemy auto-collection and dungeon loot quality · IMPLEMENTED, verified

- Enemy ground rewards now contain only combat gear and learnable scrolls. Other successful rolls credit the assigned nearest owner immediately, preserving materials/quest/discovery hooks and eliminating obsolete ground-cap resource loss. Old resource drops sweep safely; full gear bags do not block resources. Shared/split white receipts aggregate, expire and clear on both profile/game saves.
- Geographic common/green/blue pools override visiting level; Malakar/Veyreign allow legendary mobs and guarantee one final-boss gear copy with40% legendary probability per kill. Full eligible base pool and exact-grade endgame gates remain. Rarity glows and Legendary+ pixel-spire launch preserve identity and delay collection only through the0.8-second launch.
- Exact distribution/all-base/10,000-boss-roll contracts, four-owner/full-bag/exactly-once/legacy/save checks, six Chromium/WebKit viewport profiles, existing gear/loot/endgame/workshop/quest/boss suites pass. Engineering11/11/build pass. [Evidence and limitations](enemy-loot-delivery/README.md); no physical-device or human economy pacing claim.

### E32 · Lifelong gear rarity ascension · IMPLEMENTED, verified

- All owned gear supports +1–+20 cycles and successive rarity ascension, capped at Primordial +20. Retained completed-cycle steps prevent a strength drop at reset. Exact-copy identity/affixes, existing art, combat/display agreement, bag/equipped ownership and save metadata remain intact; owned endgame ensembles may improve above their authored drop quality.
- Cheap Common starts, rank/tier gold growth, staged ordinary/advanced materials, Boss Cores for Rare+ and Tower Fragments for Legendary+. Live smith quotes bind current rarity/tier/cycle and recalculate costs atomically. Forge previews, promotion confirmation, missing materials and level50 locks are explicit.
- Four full119-transaction starter paths,234 promotable bases, stat/preview/save/swap/atomicity contracts, four Chromium/WebKit desktop/mobile forge profiles and controller confirmation pass. Existing workshop, loot, itemization, endgame and enemy-delivery suites plus engineering11/11/build pass. [Exact costs and validation limits](gear-ascension/README.md); human economy pacing and physical-device/live-transport tests remain unclaimed.

### E33 · Legendary weapon collection · IMPLEMENTED, verified

- Added twenty persistent weapon IDs: four each of grimoires, swords, staves,
  maces and bows, with authored held models/icons and four grimoire projectiles.
  Existing source anatomy, gait, weapon rigs, moves/hitboxes and timing remain.
  Measured transparent source gutters prevent neighbouring-cell fragments;
  rejected/regenerated an initial sword master with clipped blade tips.
- Only found at Legendary quality from qualifying level50+ elites/bosses by a
  level50+ owner. Joined the existing 60% endgame pool without extra rolls or
  altered geographic rarity policy; 40% legacy pool remains. Existing owned-copy
  smith ascension is supported, including exact identity/passive preservation.
  Twenty named effects use existing effective Legendary types, not new engines.
- Passing contracts: 100 forbidden-grade acquisitions, all20 deterministic pool
  selections and passive effects, 320 real light/heavy eight-class combinations,
  four owners, save/load, 20 smith promotions, 32 latched book shots, real seeded
  exactly-once death/drop/pickup and full-bag recovery. Native art: 8,960 samples,
  40 pivot checks; browser: 520 actual-model renders, 20 decoded UI icons, five
  normal-game captures with no missing resources/page errors.
- Existing boss-armory model/browser now cover all19 focus identities, with152
  direction/weight cases. Endgame gear, itemization, loot overhaul, enemy delivery,
  lifelong ascension, 23,136 melee rig samples, 64 stance weapons and 3,776
  Legendary locomotion renders pass. Engineering11/11, build and wearable coverage
  pass. Forty-four new inspected art cells add no errors; eight approved player
  hashes intact; the same24 pre-existing aggregate art errors remain visible.
  [Content, prompts, visual evidence and playtest limits](legendary-weapons/README.md).

### E34 · Focus proportions and fixed hip carry · IMPLEMENTED, verified

- Reproduced nineteen focuses/books using raised wrist-rest placement and the
  weapon hand's east-rear/west-front layering. All now use75% world size and a
  fixed anatomical-right hip attachment for idle/walk/run. East draws in front;
  west draws before the body and is mostly occluded. Bob follows the existing
  root, without per-frame wrist/side switches or duplicate back-sheathed copies.
- Action poses retain their existing hand attachment with the smaller model.
  Inventory icons/projectiles, item IDs, gameplay data, original art, arm ownership,
  gait clock, body geometry and non-focus weapons remain unchanged.
- Passing native contracts:5,472 hip samples,608 active samples,38 actual pixel
  exposure comparisons,1,216 full-armour/mantle cases; both bodies/four heads/all
  facings/held frames, exact size/pivot, depth order, one model and no actor mutation.
  Browser all19 equip/1,368 samples pass, plus Legendary weapon520-render normal
  startup and existing boss-armory19-projectile/152-case browser coverage. One
  earlier fixture profile-load timeout repeated successfully; cause unconfirmed.
- Engineering11/11/build; affected weapon combat/save/loot/ascension,8,960 weapon
  art,3,776 locomotion,23,136 melee rig and64 stance cases pass.
  [Visual review, contracts and limitations](focus-hip/README.md).

### E35 · Grimoire/focus combat-ready persistence · IMPLEMENTED, verified

- Reproduced immediate return to hip after an action: Spirit focuses were absent
  from the shared stowable registry and the hip predicate ignored the live stance.
  All19 books/focuses now use the existing six-second readiness owner. Player and
  co-op renderers already supply its result; that result now selects hand versus
  hip placement through the visual pose. No second timer, saved state or proximity
  policy was introduced. Smaller scale and fixed resting-hip depth remain.
- Passing76 item/owner timelines cover all19 finds/four players, attack/cast/charge/
  guard refresh, exact expiry, continuously targeting enemies and existing dead/
  home-return/safe-zone/other-recipient exclusions. Native and Chromium each verify
  152 rendered after-attack/threat/expiry transitions across both bodies/facings.
  Existing1,368 browser hip samples,5,472 native hip samples,608 active samples,
  1,216 armour/mantle cases,83 stowable weapons,8,960 weapon art samples,3,776
  locomotion renders and actual weapon combat/save/loot/ascension checks pass.
- Engineering11/11/build pass. [Behaviour and verification](focus-hip/README.md).

### E36 · Orrakai Common practice shops · IMPLEMENTED, verified

- Aren's existing dialogue sells seven new plain martial weapons; Oren's counter
  sells four magical variants plus the established Wolf Summon scroll. Eleven new
  class-open weapon IDs cover all ten item-catalogue families, with separate book/
  lens options. No starter gear reused, no class/level/quest gate,4–8 gold weapons,
  explicit white Common/itemLevel1/+1 acquisition; original smith/restorative/
  market services remain. Owned copies use existing upgrades/ascension. No new
  random drop entries; unrestricted202-base/endgame pool probabilities retained.
- Eleven modest raster models/icons and two focus shots use existing native grips,
  stance and anatomy. Item source IDs/recipes/progression remain intact. Market
  selection/filter/purchase all use the current vendor's stock; dialogue preserves
  the NPC reference through the existing local/online shop path. Gold is debited
  only after successful acquisition; wrong stock/unfunded/full bag stay atomic.
- Passing352 level1 purchase/equip/save combinations across eight classes/four
  owners; all new bases weaker than every existing same-family base;22 real light/
  heavy hits and victory XP;11 actual smith upgrades; four real level1 Wolf Scroll
  purchase/read/assign/cast cycles with duplicate protection. Browser physical NPC
  interactions and keyboard dialogue open both stocks,12 real UI buys,88 native
  model renders,11 decoded icons and390px layout, no page/resource errors.
- Real XP contract reproduced spear light/heavy credit to Blade while item data
  declared Warding. Attack skill lookup now honours the existing alias and spear
  heavy fallback uses Warding. Existing XP/save data, hitboxes, timing and damage
  calculation are preserved. Corrected misleading staff purpose text to Warding.
- Engineering11/11/build/wearables pass; existing gear,24-group loot,265-base smith
  ascension,13-group workshop, boss armory,92-weapon stance and melee23,136 samples
  pass. Focus coverage expands to21, including6,048 native hip/672 active cases,
  1,512 browser hip/168 ready timelines and21 unique projectile silhouettes/168
  direction-weight cases. Existing gear sale/full-bag/mobile shop browser passes.
- Twenty-four new inspected cells add no structural errors; eight approved player
  hashes unchanged; aggregate audit retains24 pre-existing errors. Early dialogue
  fixture confirmation initially failed;160ms settling yielded repeats passing,
  without changing input runtime; exact original cause unisolated. Human economy
  pacing and live online transport untested. [Content, prompts and evidence](orrakai-practice-gear/README.md).

### E37 — Inventory disposal locks and equipped rarity text

- Fixed missing per-copy/stack disposal protection: owned item details now expose
  Lock/Unlock with a visible locked marker. Sale quotes, direct sale commits,
  direct deconstruction, inventory actions, forge confirmation and bulk salvage
  reject locked entries. Bulk selling removes only eligible unlocked entries,
  including legacy duplicate stacks. Lock revisions invalidate old confirmations.
- Lock metadata survives existing save/load, equipment changes, upgrades and
  Coterie transfers. Normal use, crafting consumption and equipment progression
  remain available; locks cover disposal rather than freezing item activity.
- Source observation confirmed important equipment-name and parchment rules
  overriding rarity colours. Scoped copy-specific rarity styling fixes equipped
  rows/details; slot lookup now resolves the actual equipped copy. Dark detail
  title backing preserves white/gold readability on parchment.
- Passing contracts: 120 owner/grade/slot lock combinations, stale quotes,
  protected mutations, exact-copy sales, stack merges, bulk sales, save/load,
  upgrades and real Coterie transfers. Browser verifies 36 computed colours across
  six grades, keyboard lock/unlock, protected shop/forge, stacks, equipped save
  persistence and 390px controls with no page errors. Existing gear, smith,
  workshop, loot and practice-gear contracts pass; engineering gate/build pass.
- Browser evidence is an isolated fixture using production components/styles;
  physical devices and live online transport untested. [Details](inventory-locks/README.md).

### E38 — Compact mobile inventory and copy-specific comparisons

- Source observations: responsive lexicon rules stacked the equipment panes;
  stronger touch rules forced normal flow, defeating the bounded desktop layout.
  The equipment tab now keeps bag / equipped / selected details in three adjacent
  columns on phone, tablet, short screens and coarse-pointer devices. Independent
  list/detail scrolling retains all gear; portrait art is omitted in compact mode.
- Equip/Unequip and Lock/Unlock precede secondary details with 44px minimum
  targets. Selection follows the same copy through equip/unequip and no longer
  changes on hover. Full-bag protection and disposal locks remain authoritative.
- Comparison now resolves the equipped instance's actual rarity as well as both
  upgrade tiers. It shows green/red directional indicators and signed per-stat
  deltas, plus equal/empty/trade-off cases. Build-specific passives/set effects
  remain descriptive rather than being ranked by an invented overall score.
- Passing browser contract: seven touch viewport sizes from 320×568 through
  1440×1000; full 20-entry list, adjacent panes, on-screen actions/comparison,
  zero outer/horizontal overflow, last-click retention, copy rarity, upgrades,
  mixed stats, locks, equip/unequip, full-bag rejection, expanded details, isolated
  local menu document and separate mouse desktop. No page errors. Existing lock,
  itemization, ascension, workshop and 12-group local-player browser suites pass;
  engineering gate and production build pass.
- Broader mobile-controls browser suite timed out before menus at its five-slot
  Block activation wait (line 38). Not a passing combat check; baseline cause not
  established. Concurrent legacy profile boots initially timed out; serial local
  menu rerun passed. Physical devices, Safari and live online transport untested.
  [Behaviour and verification](mobile-inventory/README.md).

### E39 — Subtle player ground identity and facing cue

- Added an unfilled ground circle and small facing arrow to the existing main/
  co-op player rendering paths. Static 18%/28% opacity, no glow or pulsing; anchored
  to the common foot offset with the actor's rendered scale. NPCs, summons and
  authoring/inventory previews remain outside these player-only call sites.
- Reuses the established party palette and authoritative online partyMapSlot.
  Arrow follows normalized facing, including diagonals, without changing input,
  aim, animation, gameplay or saves. Canvas state is restored after each marker.
- Passing browser contracts: 32 player-colour/direction cases, parent opacity,
  actor/Canvas state preservation and exactly four differently coloured markers
  through production world rendering. Inspected the decoded-sprite 4×8 gallery;
  no page errors. Engineering 11/11 and production build pass. Live transport and
  physical devices untested. [Behaviour and review](player-ground-indicator/README.md).

### E40 — Ground marker follows combat readiness

- Idle stance now hides the player ring/arrow. Combat-ready markers are about
  20% larger with 28% ring/42% arrow opacity and a slightly stronger 1.2px stroke.
  Player colours, ground anchor, facing and normal depth rendering are retained.
- Extracted the existing readiness sampler so both the player body and marker
  consume one shared result per render. Weapon sheathing policy is unchanged;
  bows and unarmed actors can now expose the same combat readiness to the marker.
  No new timer, actor/save fields, aggro rules or combat/input behavior introduced.
- Passing: original 92-weapon stance and 84 focus timelines plus all-four-owner
  bow/unarmed idle, attack, six-second recovery and sustained targeting cases.
  Browser verifies zero idle markers then four distinct combat markers through
  production rendering, 32 colour/facing cases and restored actor/Canvas state.
  Inspected updated sprite gallery. Engineering 11/11 and production build pass;
  live transport and physical devices untested. [Details](player-ground-indicator/README.md).

### E41 — Pages reruns collide on uploaded artifact names

- Remote evidence: release commit 00e8ffe passed engineering/build/upload, then
  failed publishing with an OIDC token request socket hang-up despite existing
  id-token:write permission. The live site continued serving cbd67bfeca189fda.
- Rerunning failed jobs reproduced a separate deterministic workflow defect:
  upload produced a second github-pages artifact and deploy-pages rejected the
  ambiguous name (artifact count 2). Run 41468367049 attempts 1 and 2 document
  both failures. This was a failed deployment, not proof of a phone cache defect.
- Upload and deploy now share a name containing github.run_id/run_attempt, so
  repeated attempts cannot select artifacts left by previous attempts. Existing
  checks, deployment permissions and release/save handling are unchanged. The
  new run still executes the engineering and package gates before publishing.

### E42 · Player-to-player trading · IMPLEMENTED, feature validation

- **Request/behavior:** four stationary seconds within 72 world units and line of
  sight in a marked safe zone expose the existing dialogue dots. E/controller
  A/touch Interact opens actor-owned offers. Both accept, then both confirm a
  separate final review. Offer edits invalidate approvals; decline/leave/death,
  controller loss, separation or world change cancels unfinished trades.
- **Authority/integrity:** common host/local transaction validates both projected
  bags and balances before committing. No crafting inputs/materials, quest/bound,
  locked or equipped items. Existing gear capacity/acquisition rules remain;
  exact instance/tier/rarity metadata is preserved. Local profiles are written
  together before live transfer; failure leaves the live exchange unchanged.
  Online commands belong to the authenticated actor; trade revisions reject stale
  approvals, and economy revisions fence delayed pre-trade character updates.
- **Scope:** `tradeSystem`/`tradeUi`, small existing input/interaction/camera/session
  hooks and a matching stylesheet. Reuses the existing NPC dot renderer and ally
  profile serializer. No save-schema change, balance/content change, new service,
  paid infrastructure or deployment. Online build compatibility is advanced so
  older clients must refresh.
- **Evidence:** eight Node transaction groups; local/source and packaged-browser
  trade checks (10/10 final staged cases), including native WebRTC host/guest, separate local profiles,
  gamepad ownership, compact panels, item fidelity, two approvals, delayed menu
  commits, guest-to-guest host isolation, guest quota failure/save retry and
  cancellation. The transaction suite joins the small engineering
  gate (12 checks); static build and existing
  independent-menu and online lifecycle suites pass. The broader online gameplay
  suite times out on its mobile dialogue Leave button on both unchanged HEAD and
  trading code; no claim that this pre-existing failure passed. See
  [complete evidence and limitations](player-trading/README.md).
- **Remaining boundaries:** E03's broader imported/updated-character trust is still
  open. Different-browser storage is not crash-atomic; durable delivery receipts,
  physical controllers, real phones and separate-network soak remain future work.

### E43 — Mobile menu chooser uses a vertical left-side list

- Source observation: generic touch navigation overrides flattened the chooser
  into a sticky horizontal strip, with focused labels expanding into neighbours.
  Chooser-scoped styles now provide a left rail, 18px stable labels, 44px targets,
  safe-area spacing and independent vertical scrolling. Existing handlers and
  all seven destinations are reused; open workspace navigation stays unchanged.
- Visual review caught inherited align-self:end pushing the list downward after
  portrait rotation. Explicit stretch/start alignment keeps it at the upper left.
- Passing actual-game touch checks at five portrait/landscape sizes from 320px
  to 1280px: left alignment after rotation, one column, no horizontal overflow,
  six sections open, Multiplayer opens, Menus closes, no page errors. Existing
  seven-size inventory checks, engineering 12/12 and production build pass.
  Physical devices untested. [Behaviour and evidence](mobile-menu-list/README.md).

### E44 — Remove the main navigation banner inside mobile workspaces

- Main tab strip now appears only in the chooser; the existing top-right Menus
  control provides the return route. Equipment/Bag and skill-section tabs remain,
  with room reserved for the button. Equipment top inset drops from 54px to the
  safe-area edge, reclaiming the banner's space.
- Layout verification reproduced invisible inactive Skills content occupying
  space before Quests: subtab-specific display rules overrode the hidden panel.
  Mobile direct-child inactive panels now use display:none, and active workspace
  content uses block flow rather than inherited grid placement. No menu state,
  action, inventory or save logic changed.
- Passing touch checks: six menus at five phone/tablet portrait/landscape sizes,
  no main strip, workspace at the top, section controls clear Menus, chooser and
  Multiplayer remain reachable. No page errors. Existing seven-size inventory
  suite, engineering 12/12 and production build pass; physical devices untested.
  [Behaviour and evidence](mobile-banner-removal/README.md).

### E45 — Shared device gear/gold bank · IMPLEMENTED, feature validation

- **Source observations:** the Bank Clerk lacked a dialogue identity and only
  logged a line; the Storage Bank service toggled 25 gold between carried funds
  and a private `storage.goldReserve`. No gear transfer or shared vault existed.
- **Behavior:** real teller dialogue offers Open Bank, with actor-owned gear and
  gold deposit/withdraw controls, whole amounts/all gold, exact instance/rarity/
  upgrade/lock preservation, current gear capacity/acquisition restrictions and
  cancellation on separation, death, controller loss, leave or world change.
  Local co-op shares the device vault; online guests bank in their own browser.
  Existing 12% carried-gold death penalties cannot reach stored funds.
- **Persistence:** one reserved metadata entry in the existing profile collection,
  hidden from character readers and preserved by both writers, fallback slimming
  and profile deletion. A single write commits bank and character before live
  mutation. Existing reserves migrate once with cleared originals in that write.
  Quota/corrupt-current-storage failure preserves data and reports the failure.
  No character schema change, additional service or dependency.
- **Passing contracts:** 6/6 Node groups and 8/8 final packaged-browser cases,
  including real teller input, two-profile legacy migration, save/reload into
  another character, actual death-penalty invocation, quota failure, three compact
  layouts, stale displayed-item rejection, independent local controller/panel ownership and native WebRTC guest
  vault isolation. Browser testing reproduced a bank overlay covering the local
  join picker; the panel now hides/yields input until that picker closes, and the
  two-local-player case passes. Zero page errors. Engineering 13/13/build pass;
  existing storage 12/12, trading browser 10/10, local menus 12/12 and online
  lifecycle 9/9 pass. [Contracts and evidence](banking/README.md).
- **Guest-to-host follow-up:** added direct packaged-browser coverage for both
  split-screen and native WebRTC visitors depositing exact gear and gold,
  leaving/reloading their character, starting a new online host world and
  withdrawing the same items/funds. Bank storage already belongs to the browser
  profile rather than the world; no runtime change was needed. The expanded
  banking browser suite passes 10/10 with no page errors; engineering 13/13 and
  build pass. Online import may add existing itemId/quantity aliases before
  banking; all original metadata and the complete deposited copy are verified.
- **Limits:** browser-origin/profile storage, not cross-device account sync.
  Existing E03 imported-character trust, distributed online recovery and general
  simultaneous-tab character-save concurrency remain open. Physical phones/
  controllers, Safari, separate networks and long soak remain untested.

### E46 — Separate Foci and Grimoire weapon categories · IMPLEMENTED, feature verified

- Twelve Foci spend stamina; nine authored Grimoires spend existing Mana/Spirit. Added class-open Grimoire proficiency, encounter XP/scaling, independent twelve-node mastery tree/shot perks and book emblems. Both categories share exactly6 Mana per successful target hit, including heavy attacks. No cross-bar payment; misses refund nothing.
- Preserved book IDs/art/projectiles/rarity/ascension, weapon handling, service materials and legendary identities. One-time old-book migration retains former Spirit proficiency in the new line without removing/repeatedly copying Spirit. UI distinguishes categories and actual attack costs.
- Passing168 four-owner hit/payment cases, tree/XP/save/migration coverage, four Chromium/WebKit UI profiles and boss/legendary/practice/Vampire/heavy/ascension regressions; engineering13/13/build pass. Three older aggregate failures reproduced or matched in unchanged1a19edf: Blood Communion fixture, six-vs-seven channel count, eight missing Vampire signature profiles. No broader audit closure. [Detailed evidence and limitations](grimoire-category/README.md).

### E47 — Headgear connects to shoulders and layers with torso/charm gear

- Reproduced Cloth Hood's missing shoulder connection on the Chapel Hermit:
  fitted head cells stopped above the shoulders. Hood cowls now use the existing
  cell palette and shared head/body/facing/bob anchors. Endgame mage/archer cloth
  headpieces declare the same fitting; hard helmets/crowns/halo retain their art.
- Covered heads restore a short authored neck patch. Headgear now draws after
  cloak collars and before chest charms/front arms. Charm chains are clipped to
  the torso, preserving the face. Original sprites, body rig, item IDs/stats,
  rarity, weapon handling, timing and saves remain unchanged.
- Passing native contracts: all 40 headgear × 52 chests plus bare torso × two
  bodies × four head styles × four facings (67,840 pairs); all 47 trinkets against
  the same head variants (60,160 pairs); 672 shoulder-seam cases and 10,240 mixed
  action cases. Actor state preserved. Browser baseline 13dc4ea shoulder probe
  improves zero→46 pixels; inspected 32 actual-NPC/mixed-kit previews, all headgear
  decoded, no page errors. Existing first-pass/faction/head-fit/endgame suites,
  168-item registration, engineering 13/13 and build pass.
- Pair coverage is factored, not exhaustive visual review of every three-item
  outfit. Physical devices/live transport untested. Initial unbatched native test
  stopped for cache churn; same pair coverage passes batched by torso, without
  changing runtime caches. [Evidence and limits](headgear-compatibility/README.md).

### E48 — Percentage primary weapon Spirit recovery · IMPLEMENTED, feature verified

- Grimoires restore40% maximum Spirit per successful target hit; Foci30%; other primary families/unarmed25%. Recovery remains capped, fractional, attacker-owned and subject to existing target-hit guards. No miss/dead-target refund or cross-resource payment change. Committed family identity now covers ordinary weapon attacks/arrows as well as books/Foci.
- Shared pure rate/amount/text rule supplies actual combat and hotbar, equipment/help and Grimoire tree descriptions. The old flat numeric export remains compatibility-only, with no runtime/UI use.
- Passing288 real hit cases covering twelve families, four owners and three Spirit pools, repeat updates, caps/misses/dead targets/cleaves/fractions/weapon swaps;168 Grimoire cases and boss/legendary/practice gear checks. Chromium/WebKit desktop/mobile UI and engineering13/13/build pass. [Evidence and remaining broad-suite/human playtest limits](weapon-spirit-recovery/README.md).
### E49 — Encounter training and ability mastery · IMPLEMENTED, feature verified

- Fixed-budget progression from effective combat actions, equipment and selected priority. Light Armour, Heavy Armour, Channeling, Close Combat and Area Control give handling benefits. Three universal Wayfarer scrolls broaden class access to these playstyles.
- Effective abilities share 18% of victory Combat XP as mastery. Five distinct assigned abilities share 2% even on weapon-only victories. Preserved legacy ranks and morphs. At Combat Level 47, a full-hotbar model reaches M29 on the most-used ability. The new cap curves soften permanent damage stacking while retaining conditional combat effects.
- Four-slot encounter and healing checks, 11-class Wayfarer checks, save and browser tests, Grimoire and Spirit recovery regressions, engineering gate and build verified. Campaign balance and physical-controller use still need playtesting.

### E50 — Ability and morph progression labels

- Ability details and active tree nodes display combat training lines. Morph cards show their individual training profiles before unlock.
- Equipped abilities share 2% of the victory training budget within the existing offence allocation. The encounter snapshots the assigned forms on first contribution.
- Catalogue verification covers 101 base abilities and 154 morphs, plus equipped training on weapon-only victories and late loadout changes.

### E51 — Light, Medium and Heavy Armour roles

- Medium Armour has its own combat proficiency and worn-gear training. Armour weight affects ranged and close-range damage, protection, maximum Health and resource costs according to the piece's role.
- Armour catalogue, actual bow and melee damage, technique scaling, training attribution, save/load and Health swap checks pass in verify-armour-progression.mjs.

### E52 — Travel interaction indicators

- Doors, stairs, portals and travel gates lacked the NPC-style proximity prompt. World prompts now share Interact's target selection, quest visibility and Orrakai line-of-sight checks. Travel uses a doorway, directional arrow or lock glyph.
- Split-screen prompts use the viewport's actor. Shared-camera prompts show each local actor's target. Travel prompts take precedence over pending trade offers; an open trade still owns Interact.
- Mara's stairs now transition the host world when selected by a party member and place the party at the arrival point using the existing hub travel rules.
- `verify-travel-interaction-prompts.mjs` covers drawing and input contracts, including out-of-range and obscured targets, competing NPCs, both Mara stair directions through an actor view, and sealed versus open dungeon stairs. Physical mobile and live network play were not exercised.

### E53 — Explicit armour weights and Orrakai beginner stock

- All 126 wearable armour items declare a weight. Inventory and merchant labels, handling bonuses and combat XP use that designation. Existing player gear roles remain intact. The three plated faction helms now count as Heavy instead of defaulting to Light.
- The Root & Retort sells three Common Light pieces for 18 gold total. Orrakai's blacksmith sells three Common Medium pieces for 22 gold and three Common Heavy pieces for 26 gold. Each outfit covers head, chest and legs, with individual Tier 1 purchases and no class or level gate.
- Five new items reuse existing fitted sprite and icon cells. The catalogue, shop purchase/equip, role bonuses, save and XP contracts pass in `verify-armour-progression.mjs` and the wearable registration gate.
- The browser smoke test opened both shops through NPC dialogue, bought all 21 offers at level 1, and checked the displayed armour weight labels.

### E52 — Healing and Taunting progression

- Two universal Support trees and two combat proficiency lines. Shared classification drives ability cards, morph cards and combat training. Hybrid healing and protection trains Healing.
- Verified real casts, perk purchases, XP attribution, taunt exclusions and expiration, and save/load with the dedicated support progression and party support suites.

### E54 — Grimoire attack Mana costs

- Reduced final Mana spend for every Grimoire move by 65%, with hundredth-point precision. Equipment inspection uses the same conversion for the first light shot.
- Verified light and heavy costs across nine books and four owners, Grimoire and Focus perk isolation, misses, insufficient resources and percentage Spirit recovery. Damage tuning is deferred pending campaign balance evidence.

### E55 — Bounded ranged ability aim assist

- Uncharged directional projectiles, targeted abilities, ranged ground casts and channels use a 22-degree acquisition cone and up to 10 degrees of correction. Enemies behind cover, out of reach or outside the cone are ignored. Channels recalculate from current player intent.
- Dedicated checks verify real projectile hits across four player slots and beam retargeting, angle bounds, cover, exclusions and direct manual aim. Existing charged aim, Vampire beam and Fae channel checks pass. Physical-device play was not exercised.

### E56 — Grimoire and Foci weapon aim assist

- Light and heavy Grimoire and Focus shots use the ranged ability assist at attack commitment. Heavy charge aim tracks the input until release. The correction is committed to the projectile without changing stored player intent.
- Actual off-axis light hits and held heavy releases are verified for both weapon families across all four owner slots.

### Hood seating follow-up

- Lowered fitted hoods and headpieces with cowls by two native pixels while retaining the shoulder anchor and item-specific offsets. Browser review covered the Chapel Hermit and mixed outfits from four directions on both bodies.
- Follow-up lowered the hood shell another two native pixels and cropped the covered hair above the face when fitted hood art is ready. Reviewed the 32 browser poses again, including the Hermit's front view.
- Lowered the fitted hood shell one additional native pixel. The head fit checks and 32 browser previews passed.

### Orrakai tailor

- The Quiet Stitch is a walk-in house on the southwest edge of Orrakai, with a needle-and-thread radar marker. A valid nearby interaction opens the tailor for the interacting actor.
- Dye presets and custom colours preview through the normal human renderer. Dye remaps RGB in the fitted helm atlas and garment texture samples while preserving alpha. Changes are character cosmetics keyed by armour design and exclude weapons and accessories.
- Browser contracts covered 126 armour designs in 1,008 body/direction renders, dye apply/reset, profile reload, radar classification, radius-aware house access and mobile panel width. The historical reconstruction fixture still stops at the banker's existing NPC identity mismatch.

### Living Adventurers

- `livingAdventurers.js` owns a six-character roster in character world memory. The host update projects nearby members into Orrakai or the Echoryn approach to Orrakai, routes them with bounded tile searches and the normal actor collision helper, and snapshots location, health, loadout and combat level. Town visits last about 75 seconds and expeditions about 135 seconds, staggered by roster index. Offscreen expedition XP is bounded and applied through the normal progression API on activation.
- `simulatedSubclassPlayers.js` supplies real class kits, targeting, movement, cooldowns and resource expenditure. Roster combat is restricted to ordinary dynamic encounters. Roster final blows skip world loot and quest credit while preserving normal XP for qualifying combat contributors. `objectRenderer.js` uses gold level labels, and `enemyNameplateArt.js` uses red hostile names and skulls for existing elite and boss ranks.
- The runtime fixture tests movement in the actual capital map, save round trips, death removal, real subclass damage, boss protection and loot isolation. Dungeon participation, a simulated equipment economy, detailed resource gathering and live multiplayer validation remain outside this implementation.
- Recruitment adds a 10-gold contract through adventurer dialogue. One hired companion follows the host across supported scenes and saves until dismissed or killed. Payment revalidates proximity, visibility and availability. Hired companions can join fights against ordinary enemies the real party has engaged. Quest and boss exclusions remain in force. The fixture covers the dialogue action, insufficient funds, duplicate payment, dismissal, reload and dungeon arrival.

### Adventurers Guild in Orrakai

- Warden’s Hall is now the Adventurers Guild. The two Covenant residents formerly in the hall relocated to the Sanctuary to preserve their dialogue. The Guild Factor offers six boss contracts and keeps tower milestones and travel permits in a separate service.
- Contracts record the kill count at acceptance and pay once after a new recorded boss defeat. Legacy paid flags prevent duplicate payouts on older characters.
- The lounge is an independently restored safe interior with shared-party stairs. Resting adventurers gather upstairs, and expedition anchors move away from the Orrakai landing. Older rosters clear their obsolete unhired coordinates once.
- The guild fixture checks the vendor dialogue, new kill proof, one-time payment, both stairs and a save restored upstairs.

- Adventurers now advance their gait clock at the same rate as ambient human NPCs, including during combat repositioning. Route arrivals consume reached waypoints before choosing the current frame’s movement, and the renderer skips the class-instructor ground marker for simulated adventurers.
- Hired adventurers appear with a human portrait and live HP in the standard and shared/split HUDs. Their follow route uses the summon movement-speed resolver. The owner must stand within talk range for three uninterrupted seconds before the companion can be selected for dialogue.
- Adventurer pathfinding now allows diagonal steps with corner-clearance checks. Their equipped weapons use the shared six-second player stance timer, and hired adventurers look for nearby ordinary hostiles around the party instead of their original spawn. The runtime fixture verifies a diagonal walk, idle and combat weapon stance, and a hired companion casting a real class skill and defeating an ordinary hostile away from its spawn.
- Adventurers take direct routes when the full actor footprint clears terrain. Travel speed ramps up, eases into the last waypoint, and stays lower near the owner, with separate distances for starting and stopping follow movement. Combat AI checks the real ability gate, applies a per-skill reuse delay, and independently attempts equipped-weapon attacks between casts. The runtime fixture verifies both a real class skill and a held-weapon hit against the same enemy.

### Guild-hired companions

- The Guild Factor hires randomized adventurers for 500 gold. Free-roaming adventurers have been retired, previously hired companions are retained, and paid reserves wait upstairs. Switching an existing hire is free.
- At zero HP a companion is downed for 20 simulation seconds, including across save and reload, then returns at full health. The HUD displays the remaining seconds.
- Companion dialogue opens an equipment inventory. Transfers move the original gear copy between the player's bag and the companion, preserve its tier, and honour locked items and bag capacity. Starting gear is supplied with the hire.
- Companions use the shared exponential combat and skill curves with simpler XP awards for the held weapon and dominant worn armour weight. Runtime checks cover fee, bench and active roster, exact transfers, armour XP, recovery and real combat.
- Both upstairs interiors now have timber floors, plaster and beams, rugs and daylight from visible windows. Stair approaches take priority over overlapping NPC talk prompts, and active companions stand aside at town stair landings. Browser review covered both rooms, and the travel fixture checks a closer NPC cannot intercept the stairs.
