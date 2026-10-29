# Main-quest conversation review

The post-recovery main quest was using a shared placeholder: a monologue,
“Record the account,” a generic journal reply, and every known route. A broad
guide fallback also replaced Bram and the hunter's authored conversations.
Those overrides have been removed.

Nine main-quest scenes now have 27 substantive optional questions and nine
distinct progression responses. Hessa discusses the cargo and relief camp;
Callworth distinguishes the treatment above from the failure below; Mara
examines the samples and speaks personally about the survivor's return; the
Chapel witnesses give separate accounts; the defector answers for the violence;
Mael handles evidence, preparation and the aftermath. Directions are a single
relevant optional topic where needed. Quest IDs and objectives remain stable.

Questions remember that the actor asked them. Reopening a scene gives a short
follow-up after discussion, and completed talk objectives are acknowledged
instead of offered again while the other objectives remain unfinished. Main
characters also have stage-aware check-ins and aftermath conversations. Bram's
training/work options and Mara's Thornbinding conversation remain available.
Ambient check-ins yield to active Order conversations.

Other repetition fixes:

- Recovery questions remember Mara's existing opening flags and retain their
  original prerequisite before the player leaves recovery.
- The healing rite, marked patient, defeated Malakar, Orchard engineer, Tamsin
  and defector acknowledge completed events instead of restarting assignments.
- Multi-character replies use the speaker of the current authored node, so
  Mael's lines during his visit to Mara are attributed to Mael.
- Persistent dialogue effects use the authored choice identity rather than a
  temporary response node, preventing a repeat visit from paying them again.
- Co-op conversation selection follows the shared quest owner, while optional
  questions keep individual read history. Routes and the regulator sequence
  reach the host as well as the interacting actor.
- Embedded legacy record/guide menus are refreshed when restored from a save;
  accepted quest effects stay saved and unaccepted tasks still require consent.

Validation:

- `node tools/verify-campaign-dialogue.mjs`: all nine scenes, question memory,
  distinct responses, explicit progression, follow-ups, legacy snapshots,
  co-op ownership, shared regulator, per-player topics, training, completed
  events, speaker attribution and repeat effect protection.
- `node tools/verify-mercy-flow.mjs`: complete Mercy and Act I through real
  dialogue/evidence/death handlers and 43 save/load checkpoints. Both the Mael
  and Callworth evidence-report branches pass. Travel and enemy deaths are
  expedited; this is not a combat or manual-navigation playtest.
- `node tools/verify-act1-campaign.mjs`: all six classes, migration, both
  evidence branches, Order founding/undertakings, recruitment and progression.
- `node tools/verify-root-retort.mjs`: twelve recovery, trainer, medicine,
  upstairs/downstairs and evening-visit checks.
- `tools/verify-campaign-dialogue-browser.cjs`: desktop and actual mobile
  dialogue controls, player/NPC speech, remembered topics and production saves.
- `node tools/prepare-pages.mjs`: deployment modules and paths validate.

Browser captures and JSON reports are generated locally and ignored by Git.
