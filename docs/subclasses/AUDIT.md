# Subclass integration audit — October 7, 2026

The supplied 52-page specification defines six participating classes and 18
permanent subclasses. Eldritch and Classless remain outside that roster. Its
executive note requires actual changes to skill operation, targeting, channeling,
charging, use charges and control, plus a one-gold refund of spent skill points.
The refund preserves the permanent subclass commitment (sections 9–10).

Existing architecture:

- `data.js` owns the active catalogue and aliases. `combatExpansionData.js` adds
  shared technique definitions; legacy skills remain in the same catalogue.
- `combat.js` coordinates input, payments, charge release, mastery, legacy
  execution, damage, projectiles, enemy deaths and combat updates.
- `combatExpansion.js` executes newer techniques with shared damage, effect,
  payment and cooldown hooks. Channels use `abilityChannelSystem.js`; hold
  charging and independent use charges are separate existing systems.
- `classPassives.js` receives basic attack, block, damage and kill events.
- `skillTreeSystem.js` owns prerequisite graphs, investments, unlock migration and
  a cached bonus sum. `abilityLoadoutSystem.js` owns learned skills and four slots.
- `player.js`, `saveProfiles.js` and `gameSave.js` migrate and serialize profiles.
- `ui.js` renders trees, ability details, hotbar, controller navigation and
  confirmation sheets; `combatVisualsRenderer.js` renders combat effects.
- The current repository has class-bearing trainers/story NPCs and local human
  co-op/PvP actors, but no autonomous class-kit simulated-player combat system.
  NPC compatibility must therefore reuse these actors and add a bounded adapter
  for actors explicitly identified as simulated players, without making trainers
  fight or randomly assigning subclasses to real saved characters.

Integration direction: preserve canonical ability IDs, ownership, skill positions,
mastery and slots; resolve subclass overrides before charging/mastery/execution.
Use explicit per-ability transformations and a common combat executor with the
existing collision, channel, damage, contribution and resource hooks. Keep
encounter-only state outside saves. Add selection before class-node spending,
subclass-aware passives/presentation/tooltips, and transactional skill-point reset.
