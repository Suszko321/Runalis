# Subtle player ground indicators

Every player rendered in the world has a thin, unfilled circle projected onto
the ground beneath their boots, plus a small triangular facing arrow. The ring
uses 18% opacity and the arrow 28%, inheriting any parent fade. There is no glow,
pulse, text or extra animation. It stays anchored to the feet rather than bobbing
with the walking animation. The cue draws after the body so north-facing arrows
remain readable against the boots; normal scenery depth overlays still apply.

Colours reuse `partyIdentity.js`: P1 gold, P2 green, P3 violet, P4 cyan. Online
replicas use the host-assigned `partyMapSlot`, matching the minimap rather than a
guest's locally reordered player slots. Direction uses normalized `dirX/dirY`,
including diagonals, independently of attack aim. NPCs, summons and inventory/
creation previews do not receive player markers.

`tools/verify-player-ground-indicator.cjs` verifies 32 slot/direction combinations,
inherited opacity, unchanged actor/Canvas state, the online colour source and
exactly four markers through the actual world renderer. It captures a 4×8 visual
review after sprite assets decode. No browser page errors. Engineering gate and
production build pass. Live network transport and physical devices were not
tested. The generated review image is local and excluded from Git.
