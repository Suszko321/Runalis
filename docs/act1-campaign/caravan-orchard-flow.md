# Caravan to Orchard quest revision

Ashes of Orrakai now follows this sequence:

1. Investigate the caravan manifest and empty reliquary cradle.
2. Speak with Scout Hessa beside the wreck and accept her request.
3. Investigate three clues at Ashen Orchard.
4. Clear Ashen Orchard Cellar.
5. Return to Cardinal Callworth, then Mara, with the findings.
6. Follow the channel evidence to the Broken Chapel.

Hessa is the existing relief-road scout. Her eyewitness account connects the
missing wagons, black irrigation and cellar growth. Clearing the cellar serves
the relief effort while advancing the stolen-cargo investigation. Her reminders
and the journal describe the next steps without requiring a town visit midway.

Campaign version 3 refreshes objectives and stage indices by stable stage IDs.
The retired Bram-to-scout stage resumes at the Orchard investigation. Old saves
at the pre-cellar Covenant consultation resume at the cellar unless it was
already cleared. Later stages retain their position. Existing dungeon records,
matching objective progress and reward claims remain valid.

Validation:

- `node tools/verify-act1-campaign.mjs`: all six class paths, explicit assignment
  acceptance, dungeon gate, dialogue persistence, and nine version 2 save cases.
- `node tools/verify-mercy-flow.mjs`: full Mercy and Act I interaction flow,
  actual dungeon death/completion handling, and 42 save/load checkpoints.
- `node tools/verify-act1-access.mjs`: all 1,042 overworld interactions reachable.

The interaction flow repositions the player for travel and sets enemy HP to zero
to exercise death handling. It does not assess combat balance or manual travel.
