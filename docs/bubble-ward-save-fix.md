# Bubble Ward logout repair

Bubble Ward's `buffs.bubbleWard.until` and `visuals.bubbleWardUntil` were serialized as absolute `performance.now()` timestamps. A new browser session resets that clock, making an old saved ward appear active far beyond its intended duration. New casts also used the maximum of the old and new expiry, prolonging the stale timestamp.

`normalizeProfileSave` now excludes this temporary protection and its three visual fields. This covers normal saves/loads and couch profiles, and repairs existing affected saves without a schema change. Nested buff/visual objects are copied first, so autosaving does not remove an active ward from the live actor or modify unrelated fields. Bubble Ward must be cast again after login.

Executed validation:

- `verify-bubble-ward-save.mjs`: eight legacy combinations (P1/P2, base/Sunken, short/long previous-session timestamp), non-mutation, unrelated-state preservation, and the actual game save/load round trip.
- `verify-bubble-ward-browser.cjs`: injected an affected legacy profile into isolated browser storage, reloaded through the profile picker, and verified no ward returns without casting. A real party cast produced bubble pixels on caster and ally, saving retained the live visual, the normalized profile rendered zero bubble pixels, and both live bubbles rendered zero pixels after advancing the browser clock beyond the actual 6.5-second duration. Zero uncaught page errors.
- Sunken Waverider, progression, and co-op readiness regressions pass. Production build and whitespace checks pass.
