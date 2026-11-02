# Inventory locks and equipped rarity names

Select an inventory item or equipped slot and choose **Lock Item** in its details.
Choose **Unlock Item** to remove protection. Gear locks belong to the individual
copy; material and consumable locks cover the whole stack, including later merges.

Locked items cannot be sold or deconstructed through inventory, the forge, or
bulk salvage selling. Equipped gear remains protected independently. Locks do not
prevent normal use, crafting consumption, equipping, upgrades or Coterie transfers.
They persist through equipment changes, upgrades, transfers and save/load.
Changing a lock invalidates earlier sale/deconstruction confirmations.

Equipped names now use the equipped copy's actual rarity. The original white
text came from important CSS declarations overriding the inline rarity colour.
Scoped rarity styles fix equipment rows and selected details; a dark backing
keeps Common white and Legendary gold readable on parchment.

## Verification

- `node tools/verify-inventory-locks.mjs`: 120 owner/rarity/slot combinations,
  disposal bypass rejection, exact-copy protection, stale confirmations, stack
  merging/bulk sales, upgrades, Coterie transfers and saved lock preservation.
- `node tools/verify-inventory-locks-browser.cjs`: 36 computed colour assertions
  across all six rarities and five equipped slots plus details; real keyboard
  lock controls, protected shop/forge actions, stack locks, explicit unlock,
  equipped save persistence and 390px mobile controls; no page errors.
- Existing gear itemization, ascension, workshop, loot and Orrakai practice gear
  contracts pass. Engineering gate and production build pass.

Browser evidence uses production inventory renderers, CSS, shop and forge in an
isolated fixture. Physical mobile devices and live online transport were not
tested. Screenshots are local generated evidence, excluded from Git.
