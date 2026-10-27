# Class selection demonstrations

Selecting a class with the mouse, keyboard or controller immediately starts its
short demonstration. The sequence repeats after a quiet pause; selecting the
same class preserves the sequence, and switching classes discards the previous
scene. Appearance editing keeps its normal idle preview.

The demonstrations reuse the game's humanoid signature poses, spell effect art
and summon sprites. Spell geometry is rendered on a half-resolution canvas and
enlarged without smoothing. Actors and summons belong only to the preview; no
combat abilities execute and no player resources, mastery or equipment change.

| Class | Demonstration |
| --- | --- |
| Classless | Three sword strikes |
| Gravecaller | Raise the Bound Dead, then Necrotic Bolt |
| Thornbinder | Thornling summon, then Thorn Lash |
| Waverider | Water Torrent, then Bubble Ward |
| Lightbringer | Gleam Bolt, then Dawncarver beam |
| Oathkeeper | Oath Strike, then shield guard |
| Fellhunter | Bear Trap, then Throwing Daggers |
| Eldritch (when unlocked) | Summon Horror, then Black Star Pulse |

Validation: `tools/verify-class-previews.cjs` exercises all eight scenes, actual
selection inputs, stable timing on repeat selection, interruption, four fitted
layouts (1920x1080 to 640x360), player-state isolation, the hidden-class lock and
animation cleanup. `verification.json` records the result; `all-classes.png`
shows one frame from each demonstration. Controller and full-screen menu
regression checks also passed.
