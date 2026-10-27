# Malakar climax implementation and verification

Implemented directly in the existing project on 2026-10-25.

## Encounter

The final descent is now an explicit Ritual Sanctum interaction with a preparation/consent panel. All active local co-op players must agree; declining keeps the party outside. Consent belongs to each actor, including when another player initiates or someone disconnects. The party arrives together facing the royal altar.

An 18-second staged ritual establishes that four Last Dawn leaders knowingly offer their own lives to open the prison with the stolen caravan relic. Their stations flare, they ignite and dissolve, and their energy converges into Malakar. Escape/controller Back or the visible button skips consistently. Three introduction responses converge on combat after a three-second handoff and two-second attack grace. Repeated attempts skip the ritual. Cinematic simulation is suspended for the entire party.

The chamber uses the existing pixel-art renderer and boss sprites, with a throne, ceremonial standards, columns, central markings, sacrificial stations, a visible seal, synthesized cues, phase music acceleration, and camera framing. Damage indicators are separate from decorative markings.

## Health and combat

Baseline captured from the actual dungeon factory: demonCultLair, tier 5, depth 3, final floor, seed malakar-climax, otherwise unchanged conditions.

| Players | Previous HP | New HP |
| --- | ---: | ---: |
| 1 | 3,944 | 11,832 |
| 2 | 5,325 | 15,975 |
| 3 | 6,705 | 20,115 |
| 4 | 8,283 | 24,849 |

The encounter installation applies the multiplier once and persists its version marker. Save/load and retries do not multiply it again. Existing difficulty and party scaling precede this multiplier.

- Royal Cleave: two heavy strikes, three in Ruin; early tracking stops before release; extended finishing recovery.
- Thronebreaker: a committed destination, visible lane, advancing hitbox, and recovery.
- Infernal Decree: three directional lanes with readable gaps.
- Brand of the Last Dawn: tracking mark, visibly locked position, delayed explosion.
- Sovereign's Rupture: annular blast with a safe inner area and outside route.
- The Final Siege: three alternating floor-fracture volleys and a substantial punish window.

Authority teaches separated attacks. Wrath starts at 70% HP and Ruin at 35%. Transitions clear unfinished attacks and queued combinations. Authored serial combinations include brand/cleave, charge/rupture, and decree/charge, retaining recovery and a new tell between them. Target selection rotates through living players. No adds or ambient dungeon spawns remain in the sanctum.

Defeat dissolves Malakar, clears hazards, then uses existing death/reward processing once. His established final testimony remains available. Securing the broken caravan reliquary is a required journal objective. The exit and portal open, completion persists, and the named dungeon's timed reset is disabled.

## Performed verification

- `tools/verify-malakar-climax.mjs`: 22 passing checks covering 1-4 actors, consent/decline/disconnect, health/save idempotence, all dialogue responses, full ritual and skipping, mid-ritual/introduction/active/victory saves, all six attacks, phase cleanup, retry, rewards, and exit creation.
- Movement-based checks evade every attack from melee and ranged starting positions at 205 units/second without class abilities. A stationary control takes actual damage. Separate combination checks verify recovery plus a fresh tell; those timing checks restore test-player HP to isolate scheduling.
- `tools/verify-malakar-browser.cjs`: actual Edge keyboard entrance and movement, consent click, ritual playback, Escape skip, relic dialogue response, phase visuals, death/portal, and no page errors. Screenshots are in this directory. Boss HP is injected for phase/death coverage; this is not a normal-play victory.
- `tools/verify-act1-descent.mjs`: 12 floor/seed reachability and save checks, real basic-weapon damage for all six classes, and boss/death integration smoke checks.
- `tools/verify-act1-campaign.mjs`: campaign branches, actors, objectives, dialogue and unrelated-boss regression checks pass.
- `tools/verify-mercy-flow.mjs`: all six classes complete the scripted Mercy-through-Act-I flow with 44 save/load checkpoints each, including the new relic objective. Quest stages are not injected; combat completion is scripted.
- Existing dungeon-return and floor-progression suites pass across seven themes, including 40 generated floors.

## Remaining verification limits

A full unassisted victory using normally progressed equipment has not been performed. Fight duration, sustained resource economy and subjective difficulty still need gameplay tuning. Physical multi-controller sessions have not been played; multiplayer tests exercise the existing local co-op actor/control paths, not network multiplayer. The browser pass uses one player and controlled phase/death HP changes. No claim of end-to-end survival balance is made from these tests.
