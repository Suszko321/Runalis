# Subtle player ground indicators

Combat-ready players have a thin, unfilled circle projected onto the ground
beneath their boots, plus a small triangular facing arrow. Idle players have no
marker. Visibility shares the existing six-second readiness timer for attacks,
casts, charges, blocking and enemies targeting the player, including bows and
unarmed players without changing their weapon presentation. The combat marker is
about 20% larger than the original: ring radii 23×11, arrow reach 29×14.5 world
pixels. The ring uses 28% opacity and the arrow 42%, inheriting any parent fade.
There is no glow,
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
no markers for four idle players and exactly four markers for the same players
in combat through the actual world renderer. It captures a 4×8 visual
review after sprite assets decode. No browser page errors. Engineering gate and
production build pass. `verify-weapon-stance.mjs` also covers idle/readiness/
six-second recovery/aggro for all four owners, including bows and unarmed actors,
alongside existing 92-weapon and 84 focus timelines. Live network transport and physical devices were not
tested. The generated review image is local and excluded from Git.
