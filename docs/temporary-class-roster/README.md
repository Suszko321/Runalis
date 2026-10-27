# Temporary class roster

Lightbringer and Classless are temporarily unavailable for new characters. The creator lists Gravecaller, Thornbinder, Waverider, Oathkeeper and Fellhunter; Eldritch remains hidden until unlocked.

The shared availability gate also rejects new selections through both player and game-interaction APIs. The combat practice selector excludes the two classes and ignores a direct link requesting their class skills. The Lightbringer trainer is omitted from newly generated Orrakai.

Definitions, skill effects, gear, aliases and progression data remain intact for existing profiles and future restoration. Saved Lightbringer/Classless characters still migrate with their class, level, mastery and known abilities preserved. Their locked appearance editor retains the correct existing class instead of substituting Gravecaller. Unchosen characters remain an internal creation state, not a selectable Classless path.

The temporary exclusions live in `TEMPORARILY_UNAVAILABLE_CLASSES` in `src/classData.js`. No stored player data was rewritten.

## Verification

- Node checks: exact active roster, hidden class, both selection gates, remaining class starters/Block, aliases, saved-class round trips and Orrakai trainer removal.
- Browser checks at three sizes: five ordinary options, all three morph families for each, controller selection, Eldritch unlock, six archived appearance checks and the practice roster/direct-link exclusion. No errors or missing assets.
- Creator information regression: six selectable classes including Eldritch at six sizes (36 layouts), all choices reachable, no clipping/scrolling and readable contrast.
- Full-screen menu regression: 64 menu/dialog views passed. Count assertions now follow the selectable roster.

Backups: `backups/temporary-class-roster-2026-10-13/`.
