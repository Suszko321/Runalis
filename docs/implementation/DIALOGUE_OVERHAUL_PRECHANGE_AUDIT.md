# Dialogue Overhaul Pre-Change Audit

## Current Architecture

Runalis has three primary dialogue layers:

- `dialogueSystem.js` owns the shared conversation state, conditional option filtering, quest/story effects, and dialogue input.
- `dialogueUi.js` draws the complete interface directly on the game canvas.
- `worldContent.js` and `dialogueData.js` contain 35 dialogue roots with 114 NPC replies authored on choice objects as `response` fields.

The game has no typewriter implementation. `dialogueState.text` appears immediately, all available choices appear immediately, and a selected choice's `response` is rendered below the original line while the choices remain visible.

## Findings

### Dialogue manager

- The manager is controlled by `active` plus incidental fields rather than an explicit state machine.
- It has no distinction between typing, continuing, choosing, processing, closing, or suspension.
- It has no automatic NPC-to-NPC chain support. No existing authored node uses `nextNodeId`.
- Selecting a choice applies its effects immediately, then stores its NPC reply in `responseText` without changing the current speaker or node.
- The original NPC line, reply, and choices therefore coexist.
- A fallback conversation is represented as one line plus an injected Leave option.

### Rendering

- The canvas renderer draws the original `text`, then a gold-bordered `responseText`, then every choice.
- The response treatment visually resembles a selectable row and is the source of the reported ambiguity.
- The footer is static even when its instructions are irrelevant.
- Long dialogue is capped at three rendered lines and choice labels are truncated.
- Every option is compressed into the available space; there is no independent choice scrolling.
- Speaker presentation is tied to `npcName` and cannot reliably represent interjections, narration, or the player.

### Keyboard, controller, and mouse input

- Keyboard input is handled from `keydown`; Enter, Space, or E immediately select the current option.
- Controller input is edge-based and owner-filtered, but all of A/Enter/Space/E are normalized into the same selection action.
- The system does not consume the input that opened a conversation, require release, or lock briefly between states.
- Repeated keyboard events are not rejected while dialogue is open.
- Left-click dialogue interaction is not implemented; mouse attacks are merely suppressed while dialogue is active.
- Escape/B closes immediately, with no explicit close-state release barrier.

### Authoring schema and migration inventory

- 35 dialogue roots exist; 32 have options.
- 114 choice objects contain an NPC `response`.
- No authored node currently uses `nextNodeId`; no option uses legacy `next` in the current content.
- No literal fake Continue option was found. The migration problem is broader: every `response` is an NPC utterance stored inside a player-choice object and rendered without a node transition.
- Warden Mael's opening reproduces the reported defect exactly. The road explanation is a response attached to `What happened to the roads?`, including the typo `relief traces`.
- Existing class, race, quest, flag, item, and POI conditions already share the dialogue condition path and should be retained.

### Quest and story events

- Root-node flags are applied when the node is displayed.
- Quest starts, completions, POI resolutions, inventory costs/rewards, flags, reveals, and hostility are applied on choice selection.
- Effects are generally protected by their destination systems, but dialogue has no committed-event ledger of its own.
- The UI timer controls only how long `responseText` remains and is not a safe progression boundary.

### Save and restore

- Player, quest, world, and POI consequences are saved.
- The active conversation, current node, reveal status, selected choice, history, and committed dialogue events are not saved.
- Saving during dialogue silently reloads outside the conversation.

### Co-op

- The game has local couch co-op with a single shared dialogue object.
- `dialogue.actor` identifies the initiating player.
- Only the controller mapped to that actor can submit dialogue input; keyboard dialogue control is restricted to Player 1.
- Conditional choices evaluate the initiating actor, while shared quests bridge to the host quest owner.
- The existing ownership model is sound and should be made explicit in the new state and UI.

### Settings and accessibility

- There are no dialogue-specific preferences for text speed, instant text, auto-advance, font scale, contrast, reduced motion, confirmation, history, or speech ticks.
- No dialogue history/backlog exists.
- No speech-tick audio exists; the general sound-effect system can support rate-limited dialogue cues later.

## Implementation Plan

1. Replace incidental dialogue booleans with explicit `CLOSED`, `OPENING`, `TYPING`, `AWAITING_CONTINUE`, `AWAITING_CHOICE`, `PROCESSING_CHOICE`, `SUSPENDED`, and `CLOSING` states while retaining `active` for surrounding-system compatibility.
2. Normalize authored nodes at runtime to `speakerId`, `speakerName`, `text`, `nextNodeId`, and `choices`. Treat legacy `options`, `next`, and `response` as migration inputs.
3. Convert every legacy choice response into a synthetic, single-speaker reply node. Briefly show the selected player response as its own `You` utterance before the NPC reply.
4. Migrate Warden Mael explicitly into the required two-line opening chain and correct `relief traces` to `relief routes`.
5. Add elapsed-time word tokenization, punctuation pacing, instant reveal, optional auto-advance, configurable speeds, and clean cancellation without timers.
6. Add state-specific keyboard/controller/mouse behavior, input consumption, confirm-release protection, transition locks, disabled-option skipping, and independent choice scrolling.
7. Replace the response panel with one current-utterance area, a choice-only area, a state-aware footer, speaker transitions, owner display for co-op, reduced-motion/high-contrast support, and a suspendable history view.
8. Add committed event IDs, permanent-choice confirmation, active-dialogue serialization/restoration, and safe fallback closing for invalid restored nodes.
9. Add a development validator covering node integrity, references, loops, empty content, duplicate IDs, option exits, suspicious exposition choices, and known class/race/item/companion/quest conditions.
10. Verify Warden Mael and representative schema/input/save/layout cases in a running local game, then publish the required implementation report.
