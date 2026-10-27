# Petalknight — independent creature art

The four creatures now have their own anatomy, silhouette and sprite sheets, generated from scratch with the built-in imagegen tool. No Standard summon artwork was supplied as an input or used in their production renderer.

| Stage | Creature | Production asset |
| --- | --- | --- |
| Thornling pack | Rose Sentinel: petal helmet, sepal shield and thorn cleaver | [12-frame sheet](../../assets/art/sprites/petalknight-rose-sentinel.png) |
| Thornbeast | Rose Stalker: low feline predator with plated petals and a barbed tail | [12-frame sheet](../../assets/art/sprites/petalknight-rose-stalker.png) |
| Elder Thornbeast | Rose Siegebeast: broad tusked creature with a petal mantle | [12-frame sheet](../../assets/art/sprites/petalknight-rose-siegebeast.png) |
| Thorn Titan | Rose Thorn Titan: large petal-armoured goliath with thorn shield and cleaver | [12-frame sheet](../../assets/art/sprites/petalknight-rose-titan.png) |

Each sheet contains two idle frames, six walking frames and four attack frames. Frames keep one shared scale and a planted ground pivot. Nearest-neighbour packing and a slim dark outline keep the game art crisp. The movement controller uses actual simulated travel and stable facing rather than advancing when a frame is drawn. The existing summon health, damage, armour, speed, targeting, grouping, thorn retaliation and recovery are preserved.

The original generated source sheets remain in `assets/art/source/petalknight-rose-*.png`. The exact prompt set and tool provenance are saved in [petalknight-summons-prompts.json](../../assets/art/source/petalknight-summons-prompts.json). Production sheets and packing metadata are in `assets/art/sprites/petalknight-rose-*.png` and the matching JSON files. `tools/pack-petalknight-summons.py` reproduces extraction and packing from those sources without regenerating or repainting the creatures.

Checks actually performed include all 48 renderer poses, distinct silhouettes against the original creatures, six unique walk frames per stage, no foot drift, binary transparency, actual pack-and-elder following with all six walk poses, repeated-render stability, facing stability, attack sequence, teleport recovery, unchanged combat statistics and byte-for-byte preservation of Lifebloom sheets. [Detailed browser results](petalknight-browser-verification.json) and [motion/stat checks](petalknight-art-verification.json) are available.

[Open the animated Petalknight preview](./#petalknight).
