# Main menu and opening input

Developer Mode has been removed from the player's main menu and its controller focus list. The Settings message no longer advertises the editor. Existing authoring code and isolated review tools are retained.

Any keyboard key now skips the caravan opening, with an updated on-screen prompt. The key is consumed until release, including repeats after recovery, so skipping cannot trigger an attack, ability or movement in the next scene. Text inputs and blocking overlays retain their normal controls. Mara's recovery conversation is not skipped. Existing controller confirm/cancel skipping remains available.

The browser regression checks ten representative keys: letters, movement/ability keys, Space, arrows, Tab, F2, Shift, Escape and Enter. It also verifies held-key suppression, typing, the creator overlay, controller confirmation, and the recovery dialogue. No browser exceptions or missing resources were reported.

Live-game smoke fixtures now load normal player profiles rather than relying on the removed Developer Mode menu entry. Loot and skill-morph browser suites pass with that route. Root & Retort checks and the local deployment build also pass.

The older enemy-art browser suite fails its player-pixel comparison before reaching its game-launch smoke check. The unchanged committed version of that test fails at the same assertion, and its player-rendering sources/assets have no working-tree changes. Its historical art snapshots were not rewritten as part of this menu/input change. The humanoid-style suite was not reached by that stopped batch.

- [Menu and opening verification](verification.json)
- [Updated main menu](main-menu.png)
