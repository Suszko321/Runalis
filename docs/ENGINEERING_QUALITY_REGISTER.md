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
