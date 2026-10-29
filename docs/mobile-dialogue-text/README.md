# Mobile dialogue readability

Mobile conversations now use 28 CSS-pixel body text and 26-pixel responses.
This is roughly three times the previous effective body size on a typical
landscape phone, where canvas scaling reduced 14-pixel text to about 9 pixels.
The existing dialogue font-scale preference still applies. Speaker names and
controls are also enlarged to readable phone sizes.

Conversations use a full-screen reading panel with native vertical scrolling.
Long text, complete responses and history remain accessible without shrinking
the font or truncating the response labels. Leave stays in the header; History,
Reveal text, Continue and Return use the existing dialogue state machine. NPC
portraits still use the existing pixel-art renderer and speaking animation.
Keyboard/controller selection is highlighted and scrolled into view. Online
choices continue through the existing authenticated host input route.

Following the user's clarification, the increase is focused on dialogue.
Descriptions and tips receive modest targeted increases to 17 pixels, and the
Malakar conversation panel uses 26-pixel paragraphs. Skill icons, hotbar slots,
tree nodes, inventory grids and gameplay touch controls keep their geometry and
existing font sizes. Desktop canvas dialogue remains unchanged.

Validation:

- `tools/verify-mobile-dialogue-text.cjs`: landscape and portrait body/response
  sizes, full text, real response effects, history and return, 24 overflowing
  responses, disabled choices, native scrolling, persistent Leave, unchanged
  hotbar sizes, existing pause behavior and desktop presentation.
- `tools/verify-mobile-skills.cjs`: native drag/tap equipping, occupied slots,
  cancellation, morph selection, slot clearing, portrait placement, hotbar
  feedback and saved/reloaded equipment.
- `tools/verify-mobile-tree-taps.cjs`: description taps, purchases, locked and
  learned nodes, persistence and navigation away from the description popup.
- `tools/verify-dialogue-mobile-preview.cjs`: persistent Leave in all five
  conversation phases on desktop, controller, landscape and portrait, plus
  character customization and its Start Game action.
- `tools/verify-online-browser.cjs`: mobile guest response selection and Leave
  reach the host, alongside existing online movement, combat, shops, forge,
  fishing, dungeon travel, subclass effects and disconnect checks.
- `node tools/prepare-pages.mjs`: production module paths, stylesheet packaging
  and filename case validate successfully.

Browser suites use `RUNALIS_NODE_MODULES` and `RUNALIS_URL` as the existing test
tools do. Captures and verification JSON are generated locally and ignored.
