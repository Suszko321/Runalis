# Infernal Waller barrier

Waller barriers now rise as pixel-art basalt masonry with scorched bevels, jagged molten seams, flickering orange/gold flames and occasional upward embers. Cracks pulse with heat; the stone emerges in discrete pixel steps. Warm floor markings preview the existing U-shaped collision footprint. The active barrier no longer places a redundant WALLER label beneath the player.

The shared `getWallerSegments` geometry supplies both the warning and existing collision activation. Only validated, active segments receive art, keeping omitted walls and the escape opening clear. No damage, duration, cooldown, summon behavior or pathfinding change was made. The fire is visual and does not introduce a burning-ground hazard.

Small stone/magma canvases are cached by live segment in a weak map. Flames are drawn directly, with no added world particles or persistent resources. The renderer uses world-based masonry seeds and snapped coordinates; it cannot modify the hazard or barrier geometry.

Browser verification captured warning, emergence, active and night frames using production gameplay. It checked collision against the actual three segments, the exit route, animated magma/fire pixels, camera anchoring, unchanged effect queues and expiry cleanup. Pixel comparisons allow 3/255 channel rounding for layered translucent compositing. No browser errors occurred. Sixteen enemy combat checks and eleven enemy-density critical regression checks also passed.

See [preview](preview.png) and [verification](verification.json). Reload the game to load the new renderer.
