# Dungeon conversations

Grove and Orchard arrival hooks initialize their quests without opening dialogue.
Players approach and interact with Edda's skull or Sister Tamsin through the
existing keyboard, controller or touch interaction system.

Veyreign floors 1–4 have a named, stationary Castellan Edrik's Echo in the safe
entry chamber, using the existing human NPC art and animation framework.
Interacting opens the existing chapter conversation. Updates repair missing
echoes in old floor saves without duplicating them. Repeat runs remove echoes.

The final Alistair introduction waits for an active, sealed arena after party
consent. Merely arriving on floor 5 or opening/rejecting the entry vote does not
play it or mark it seen. The boss waits during his introduction. Repeat bosses
remain silent. Malakar's accepted sanctum entry now seals the arena before
starting the ritual or introduction.

Verification:

- `verify-dungeon-dialogue-entry.mjs`: quiet arrivals, manual chapter dialogue,
  repeat actors, rejected/partial/unanimous votes, sealed boss introduction,
  paused boss attacks and Malakar's initial seal.
- `verify-dungeon-dialogue-entry-browser.cjs`: real keyboard E and touch
  Interact at all three quest givers, after quiet arrival and idle exploration.
- Existing Grove, Orchard, Veyreign, Malakar climax and full Mercy/Act I flow
  checks passed, including save/load checkpoints. Pages build passed.
