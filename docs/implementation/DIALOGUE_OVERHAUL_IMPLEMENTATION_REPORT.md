# Runalis Dialogue System Overhaul — Implementation Report

Date: 2026-07-21

Status: Implemented and verified

## Outcome

Runalis dialogue now follows one unambiguous presentation rule: one speaker delivers one current utterance at a time. The current line occupies the white dialogue area; actual player responses appear separately and only after the line finishes. A confirm press during typing reveals the line and is consumed. A second, deliberate press advances or selects.

The work replaces the old display-level behavior with a reusable runtime, explicit state machine, input ownership, event protection, save support, authoring validation, and backward-compatible migration of existing dialogue content.

## Files Changed

### New files

- `src/dialogueRuntime.js` — state machine, elapsed-time word reveal, input normalization, history suspension, settings, and runtime serialization.
- `src/dialogueValidation.js` — whole-project dialogue authoring validator and formatted report.
- `docs/implementation/DIALOGUE_OVERHAUL_PRECHANGE_AUDIT.md` — required audit completed before source changes.
- `docs/implementation/DIALOGUE_OVERHAUL_IMPLEMENTATION_REPORT.md` — this report.

### Extended or replaced files

- `src/dialogueSystem.js` — runtime integration, node transitions, migration handling, choice consequences, confirmations, history, serialization, and restoration.
- `src/dialogueUi.js` — replaced dialogue canvas presentation with a one-utterance renderer, separate choice viewport, contextual controls, accessibility presentation, and pointer hit testing.
- `src/worldContent.js` — explicitly migrated Warden Mael's introduction and corrected `relief traces` to `relief routes`.
- `src/main.js` — keyboard and mouse routing, repeated-key rejection, pointer choice selection, and safe post-dialogue UI handoffs.
- `src/inputController.js` — controller press/release semantics, dialogue ownership, history input, and held-input protection.
- `src/gameSave.js` — active dialogue save and restore.
- `src/saveProfiles.js` — save schema updated from version 10 to version 11.
- `src/audioSystem.js` — optional, rate-limited speaker-specific dialogue ticks.

## Systems Replaced or Extended

The previous dialogue presentation depended on loosely related state such as the active node, a secondary response string, and a timer. That structure allowed an NPC reply to remain in one area while another NPC line appeared inside the selectable list.

The new system has one canonical runtime record for:

- current conversation and node;
- current speaker and resolved line;
- tokenized word progress;
- explicit phase;
- visible choices and selected index;
- controlling player and last input device;
- transition/release locks;
- dialogue history and suspension state;
- transient compatibility nodes;
- committed event identifiers;
- pending owned-UI actions.

No dialogue behavior is inferred from what the renderer happens to display. The renderer reads the runtime state; it does not drive quest or story effects.

## State-Machine Design

The runtime uses the requested states:

| State | Responsibility |
|---|---|
| `CLOSED` | No active conversation or dialogue input. |
| `OPENING` | Begins the panel transition and consumes the interaction input that opened it. |
| `TYPING` | Reveals one resolved utterance word by word. Confirm only reveals the remainder. |
| `AWAITING_CONTINUE` | The line is complete and an automatic `nextNodeId` follows. |
| `AWAITING_CHOICE` | The completed line remains visible while valid player responses are selectable. |
| `PROCESSING_CHOICE` | Applies the chosen result once and blocks additional input. |
| `SUSPENDED` | Preserves the exact conversation state while history or another owned UI has focus. |
| `CLOSING` | Releases the conversation through a short protected transition before gameplay resumes. |

Transitions have a short lock, and controller opening requires release before another confirm can be accepted. Keyboard repeat events are ignored during dialogue. Directional input skips unavailable choices. These protections prevent reveal-and-advance, reveal-and-select, held-button traversal, and closing input from bleeding into combat or interaction.

## Updated Dialogue Schema

New authoring uses `text` for the current speaker and `choices` for player responses:

```js
{
  id: 'wardenMaelRoadWarning',
  speaker: 'Warden Mael',
  text: 'The Rot drove the wildlife first...',
  choices: [
    { id: 'readyForWork', text: 'I am ready for work.', nextNodeId: 'maelAssignsWork' },
    { id: 'askAdvice', text: 'Any advice?', nextNodeId: 'maelAdvice' },
    { id: 'leave', text: 'Leave.', action: 'closeDialogue' },
  ],
}
```

Linear speech uses a real continuation instead of a fake selectable line:

```js
{
  id: 'wardenMaelIntro',
  speaker: 'Warden Mael',
  text: 'The Covenant physicians say you can walk...',
  nextNodeId: 'wardenMaelRoadWarning',
}
```

The runtime also supports speaker changes, narration/player speaker presentation, `showWhenUnavailable`, requirement labels, hidden conditions, actions, consequences, confirmations, text variables, and optional speech profiles.

## Migration Work

The source audit found 35 original dialogue roots, 32 roots with options, 114 legacy option `response` fields, no explicit `nextNodeId` chains, and no literal fake Continue choices.

All existing dialogue remains playable through a compatibility layer:

- legacy `options` is normalized as `choices`;
- legacy `next` is normalized as `nextNodeId`;
- a legacy choice `response` becomes a transient NPC utterance node;
- the selected response may first appear as a short player-spoken line;
- the NPC reply then replaces it in the main dialogue area;
- refreshed player choices return beneath that reply without replaying the parent question;
- legacy replies are never rendered as selectable NPC exposition.

Warden Mael was converted directly to the canonical schema and now provides the reference pattern for future manual conversion. The validator currently inventories 36 authored nodes and 146 choices. All 114 remaining legacy `response` fields are covered by the migration layer; none retain the old simultaneous-text presentation.

## Warden Mael Before and After

### Before

The older recovery statement remained in the white area. The road warning was encoded/presented alongside gold selectable rows, so it looked like something the player could choose. Actual responses appeared below it.

### After

1. Warden Mael says the recovery statement alone, one word at a time.
2. Confirm while it is typing reveals only that statement.
3. A separate confirm replaces it with the road warning.
4. When the road warning finishes, it stays visible while only these responses appear below:
   - `I am ready for work.`
   - `Any advice?`
   - `Leave.`
5. The wording now correctly says `relief routes`.

## Input Handling

- Keyboard: Enter and E confirm, arrows navigate, Escape closes, and repeated keydown events are ignored.
- Xbox-style controller: A confirms, D-pad/stick navigation changes choices, B closes, and View opens history.
- Mouse: a left click inside the panel reveals/continues; clicking a choice selects that player response. Dialogue clicks do not attack.
- Device-aware footers show only controls relevant to `TYPING`, `AWAITING_CONTINUE`, `AWAITING_CHOICE`, or history.
- Only the initiating co-op slot controls the conversation. The panel displays that owner.
- Opening, transitions, processing, closing, and held inputs are consumed or locked to prevent double actions.

## Typewriter Behavior

- Text is tokenized into word-plus-whitespace segments once per utterance.
- Reveal uses elapsed time in the main update loop, not frame counts or overlapping timers.
- Commas, sentence punctuation, and paragraph boundaries add configurable pauses.
- Revealing a line immediately completes the existing token sequence without restarting panel animation.
- Player-spoken response lines can use a faster multiplier than NPC speech.
- Resolved variables such as player and item names are substituted before tokenization, preventing partial-token layout errors.
- Dialogue performs no update work while closed, and no timer handle is saved or left running.

## UI, Long Text, and Long Choice Lists

- The dark Runalis panel, gold border, and speaker tab remain.
- Exactly one current line is drawn in white in the speech area.
- The nameplate updates with every speaker change and supports NPC, companion, narration, and player presentation.
- Choices fade in only after speech completes and use a separate viewport.
- Long text scales down to a readable minimum and clips safely if it still cannot fit.
- Long choice lists scroll independently, keep the selection visible, and show more-above/more-below cues.
- Compact rendering was verified at 640×360 for split-screen-style layouts.
- Mouse hit testing is derived from the same layout calculations used to render choices.

## Accessibility and Presentation Settings

The runtime persists settings for:

- text speed and punctuation delays;
- instant text;
- optional auto-advance, disabled by default;
- speech-tick volume and speaker profile;
- font scale;
- high contrast;
- reduced motion;
- hold-to-fast-reveal behavior;
- controller vibration preference;
- permanent-choice confirmations;
- selected player-response presentation.

Reduced motion removes panel/choice transition movement. High contrast and font scale affect rendering. Optional speech ticks are rate-limited and default to silent. The preference model is ready for a future dedicated settings screen; this change does not add that menu surface.

## History and Interruptions

Reached utterances are appended to a dialogue history with speaker attribution. Opening history moves the runtime to `SUSPENDED`; returning restores the exact prior node, phase, selection, and completed line. Pending shop or other owned-UI actions close dialogue safely before handing control to the destination UI.

## Event Safety

- Choice results are processed only in `PROCESSING_CHOICE`.
- Committed consequence IDs are recorded so permanent events cannot fire twice after reload or re-entry.
- Dangerous/permanent choices can require an explicit confirmation before applying their consequence.
- Class, race, item, companion, quest, and flag requirements use the shared condition evaluation path.
- Conditions are periodically refreshed while choices are open, without reevaluating every rendered frame.
- The previously authored `hostileNpcObjectId` consequence is now executed rather than ignored, and combat begins after the response is delivered.
- Shop choices queue a safe UI handoff instead of opening another interface during choice processing.

## Save Compatibility

Save schema version 11 stores:

- active conversation/root and node IDs;
- owner slot;
- current phase and line-completion/token progress;
- selected choice;
- history;
- transient compatibility nodes;
- committed event IDs;
- dialogue preferences.

Restore reconstructs the runtime rather than persisting raw timers. It restores the active Player 1 conversation after world objects and quest state exist, preventing duplicated consequences. A conversation controlled by an absent secondary co-op player is intentionally not reopened into an ownerless state.

## Co-op Handling

- The player who initiates the conversation owns reveal, navigation, selection, and closing.
- Other player inputs cannot advance the shared dialogue.
- Class/race/quest/item conditions evaluate against the initiating player context.
- Consequences apply through the existing shared world/quest systems and use the committed-event ledger.
- The owner is shown in the panel in co-op.

Voting and suggestion mechanics were not added; the deliberately conservative rule is one controlling player per conversation.

## Validation Tool

`validateAllRunalisDialogues()` checks authored content for:

- duplicate or missing node IDs;
- missing speaker or empty text;
- ambiguous choices plus automatic continuation;
- missing node references;
- inaccessible nodes;
- unintended automatic cycles;
- empty or duplicate choices;
- choice sets with no exit;
- fake continuation choices;
- likely NPC exposition inside a player choice;
- invalid class, race, item, companion, quest, and flag conditions;
- repeat-sensitive consequences without stable event identifiers.

Current result:

```text
Dialogue validation: PASS
36 nodes, 146 choices, 0 errors, 0 warnings
```

## Verification Performed

Automated engine checks: 24 passed.

The checks cover progressive Warden text, hidden choices during typing, reveal-only confirm, separate advancement, old-line replacement, exact initial choices, player/NPC speaker replacement, returning choices beneath the latest reply, active save/restore, history suspension, opening input barriers, disabled-choice skipping, controller navigation, permanent confirmation, one-time hostility, owned shop handoff, validation, and legacy-response migration coverage.

Additional verification:

- JavaScript syntax checks passed for all 10 changed/new runtime source files.
- Whole-project dialogue validation passed with zero errors and zero warnings.
- Interactive browser testing verified keyboard reveal/advance/select semantics.
- Mouse choice activation was verified through the rendered panel.
- History open/return was exercised.
- A 15-choice test verified independent scrolling and skipping a disabled class choice from index 12 to index 14.
- A long paragraph and a compact 640×360 layout were visually inspected for containment.
- The full game entry page loaded successfully with the changed modules in place.
- Removed legacy display fields (`responseText`, `messageTimer`) and the incorrect Warden phrase are absent from the changed dialogue path.

## Remaining Risks and Follow-up Work

- The 114 legacy `response` fields are behaviorally migrated but not all manually rewritten into permanent authored node chains. New content should use `text`, `nextNodeId`, and `choices`; gradual direct conversion will make the data easier for writers to inspect.
- Dialogue preferences exist and persist, but Runalis still needs a dedicated options-screen section to expose every new setting to players.
- Optional speech ticks are implemented but silent by default; speaker profiles need audio-direction tuning before enabling them broadly.
- Active dialogue owned by Player 2 or later is not resumed if that owner is absent when the host save loads. This avoids corruption but can restart that interaction after the player rejoins.
- Co-op deliberately uses single-owner selection. A voting/suggestion feature would be a separate design addition.
- Browser and engine tests cover the critical runtime paths, but a larger content-focused regression suite should add explicit authored fixtures for alternating NPCs, companion interjections, every supported condition type, and repeated open/close soak testing as the dialogue library grows.

## Authoring Rule Going Forward

Every node should contain exactly one speaker's natural utterance. Use `nextNodeId` for another utterance, and use `choices` only for things the player says, asks, attempts, or does. Run the dialogue validator whenever dialogue content changes.
