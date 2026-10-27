# Fellhunter · Complete toolkit pass

This page records the weapon integration. The current [Fang & Hellfire identity pass](../fellhunter-identity/README.md) revises Bloodhound and Hellstalker while retaining the weapon support described here.

## Weapon compatibility

- Tactical Advantage from dodge/tools now boosts melee as well as ranged primary attacks. Each weapon keeps its existing light/heavy attacks and progression.
- Fellhunter class skills use Level, Dexterity, mastery, equipment and the higher of Archery or the currently equipped melee weapon’s proficiency. Those proficiency contributions are selected, not added together. Class-tree IDs and saved purchases remain unchanged.
- Ranged class tools are hunter handbow shots and throwing tools, available with any weapon. Melee hunters use a tool/throw gesture rather than holding their sword or mace in a bow draw pose. Practical Strike uses a melee pose. No weapon is secretly equipped or removed.
- Original skills retain their established mechanics. Vaulting Shot now fires from the departure point toward the threat, without dealing an accidental strike along the backward retreat. Its projectile and mobility still respect terrain.

## Bloodhound

Fifteen authored forms now combine ranged barbed shots, venom fangs, traps and single-quarry pursuit. Bleed stacks up to eight layers lasting ten seconds each; Poison stacks up to six lasting fourteen seconds each. Both tick once per second and retain independent lifetimes. Weapon pressure can add a paced Bleed layer to an existing quarry; new hits do not refresh older layers. Red Quarry explicitly retargets the hunt.

Marked quarry takes stronger direct hits, with stronger bonuses below half health. Prepared finishing tools gain an additional bonus against marked quarry below 35% health; they do not instantly kill bosses. Hook pursuit stops in striking range instead of overshooting nearby targets. Bloodhound gains no automatic ward, healing or lifesteal.

## Art and sound

All 30 Original/Bloodhound forms have distinct native pixel silhouettes: knives, bolts, handbows, iron jaws, caltrops, fuse warnings, blasts, tether links, steel arcs, quarry marks, silver seals and broken ward fragments. Fields draw in world space, behind actors, with bounded caches. There are no new raster filters or changes to the base player anatomy. Existing equipment sprites are used for actual equipped weapons.

Waiting traps remain visible throughout their arming and waiting periods, until they trigger or expire. This also repairs the shared morph-trap rendering path used by Hellstalker; it does not change its damage or burn tuning.

The existing sound mixer distinguishes physical hunting tools from Hellstalker's deeper demonic casting and fire. See the current identity pass for its short, hard-ticking burn rules.

## Current verification

The retained forms unlock at mastery 5 and 10. See [the current catalogue and regression results](../subclass-reduction/README.md). Earlier numeric reports beside this guide describe their original runs.
