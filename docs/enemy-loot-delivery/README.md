# Enemy loot delivery and dungeon quality

Implemented November 1, 2026. This location policy supersedes the earlier
receiver-level rarity formula **inside dungeons**. The full eligible base pool
is retained, including cross-class weapons, focuses and accessories. Existing
quest-only exclusions and exact-grade endgame source/level gates remain.

## Delivery

Enemy deaths leave only combat gear (weapons, armour, trinkets) and learnable
skill scrolls on the ground. Every other successful reward roll is credited
immediately to the assigned nearest party member, even with a full gear bag:
coins become gold; upgrade/crafting materials, tokens, food and other items use
their existing inventory stacks. This preserves crafting, quests and saves.
Successful resources are no longer discarded by the old physical-drop cap or
legacy equipment results that the universal gear roll replaces.

Discovery and party collection objectives run at credit time. The existing
enemy reward flag prevents a second payout. Existing saved resource drops are
swept into the appropriate present owner's inventory without requiring proximity.
Scrolls still require pickup and reading; gear still respects the 20-slot bag
and remains recoverable on the ground when full.

A white bottom-left feed shows quantities, combines repeated materials, retains
at most five recent entries and fades after 4.5 seconds. Shared view identifies
P1–P4; split view shows each player's own receipts. Rendering grants no rewards.
Both profile normalization and game-save sanitization clear these temporary
notices. Host-authoritative profile delivery includes notices for online owners;
real transport latency/clock differences are not hardware-tested here.

## Dungeon distribution

All percentages below are conditional on the one universal gear roll succeeding.

| Location | Common | Uncommon | Rare | Legendary |
| --- | ---: | ---: | ---: | ---: |
| Blighted Root Cellar, Ashen Orchard | 100% | 0% | 0% | 0% |
| Other dungeons | 70% | 24% | 6% | 0% |
| Malakar / Veyreign mobs and elites | 64% | 27% | 8% | 1% |
| Malakar / Veyreign final bosses | 15% | 15% | 30% | 40% |

Early locations use the authored encounter range ending at level8 or below.
Unknown dungeon IDs fall back to common at tier/depth1, otherwise the normal
dungeon pool. Malakar recognizes both `demonCultLair` and `dawnspireRoot`;
Veyreign uses `castleVeyr`. Visiting with a high-level character does not bypass
location quality. Dungeon mobs retain 1.5% gear chance, elites 6%, ordinary
dungeon bosses 30%. Malakar/Veyreign final bosses guarantee one gear copy, giving
**40% legendary per kill**, rather than 40% of a 30% roll. Summons and suppressed
enemies remain ineligible. Minibosses do not receive the final-boss guarantee.

Outside dungeons the existing level-based six-grade formula, level50 upper-grade
gate and rank chances remain. Dungeon random gear currently tops out at Legendary;
fixed quest/first-clear rewards are separate authored rewards.

## Ground presentation

White/green/blue/yellow/purple/crimson glows use the inventory's canonical colours.
Legendary and higher gear rises through a short 0.8-second arc, with broken runic
spires and rising pixel motes marking its resting place. Pickup waits until that
arc completes. Persistent columns remain visible while gear awaits collection.
Effects use Canvas primitives and preserve gear identity, stats and hit geometry.

## Verification

- `verify-enemy-loot-delivery.mjs`: exact geographic distributions at high player
  level; all eligible bases remain selectable; 10,000 final-boss rolls give
  exactly4,000 Legendaries; suppression, all four nearest owners, immediate
  resources with full bags, scroll/gear ground delivery, exactly-once payout,
  overflow recovery, old saved resources, both save paths, bounded notices and
  launch-before-pickup timing.
- `verify-enemy-loot-browser.cjs`: Chromium and WebKit at 1440×900,390×844 and
  844×390. Six rarity glows, launch presentation, four-owner white notices,
  aggregation, expiry, bounds and no page errors. Captures live beside this file
  as ignored local review artifacts; portrait WebKit capture visually reviewed.
  Actual game startup and `drawWorld` also verify the feed in single-player,
  shared four-player and split four-player views.
- Existing gear itemization model/browser, 24 loot overhaul groups including
  150,000 sampled kills, endgame gear, 13 workshop groups/63 recipes, quest
  interactables, Malakar climax and actual Veyreign encounter browser pass.
- Engineering gate11/11 and publication build pass. No physical phone,
  controller endurance or economy pacing playtest is claimed.
