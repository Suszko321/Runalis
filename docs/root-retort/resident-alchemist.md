# Root & Retort residents

Mara Vell remains upstairs in the recovery room. Her Thornbinder instructor,
companion and quest identities belong to that upstairs actor. Visiting her does
not restart the recovery introduction after it has been completed.

Oren Fenwick is the resident alchemist at the downstairs counter. He works for
the Vell family, brews the existing medicines and directs visitors through the
eastern herb room to Mara’s stairs. His appearance uses the native human model:
male build, short grey hair, warm brown skin, ochre work tunic, dark brown
trousers and leather boots. He has his own NPC and dialogue IDs, and does not
inherit Mara’s companion or quest roles.

Town reconstruction removes the old downstairs Mara from published snapshots
and installs Oren once. Medicine recipes, prices and internal service action IDs
remain compatible. Quest directions now explicitly place Mara upstairs.

Verified with `verify-root-retort.mjs`, `verify-root-retort-browser.cjs`,
`verify-orrakai.mjs`, `verify-act1-campaign.mjs` and `verify-mercy-flow.mjs`.
The browser check exercises recovery, both stair directions, medicine service
dispatch, physical walking and saving on both floors, with no page errors or
missing resources. The full campaign interaction flow includes 42 save/load
checkpoints; travel is repositioned and enemy HP is set to zero for death handling.
