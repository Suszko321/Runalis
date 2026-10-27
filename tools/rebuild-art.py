"""Rebuild shipped atlases from preserved source images; no generation/API calls."""
import importlib.util
from pathlib import Path
from PIL import Image

root=Path(__file__).resolve().parents[1]
spec=importlib.util.spec_from_file_location('pack_art',root/'tools/pack-art.py')
packer=importlib.util.module_from_spec(spec);spec.loader.exec_module(packer)
for name,rows,cols,w,h,target in [
    ('human-male',4,4,64,80,64),('human-female',4,4,64,80,64),
    ('enemies-core',4,4,80,96,72),('enemies-extra',4,4,80,96,72),
    ('enemies-remaining',3,4,80,96,72),('bosses-act1',4,3,160,176,148),
    ('props-core',4,4,128,128,112),('icons-core',4,4,64,64,52),
    ('human-male-attack',4,4,64,80,64),('human-female-attack',4,4,64,80,64),
    ('human-male-cast',4,4,64,80,64),('human-female-cast',4,4,64,80,64),
    ('human-male-bow',4,4,64,80,64),('human-female-bow',4,4,64,80,64),
    ('dungeon-interactables',4,4,112,128,112),
    ('creator-accessories',4,4,48,48,36),
    ('creator-cloaks',3,4,64,80,64),
    ('creator-face-details',6,3,64,48,36),
    ('facial-hair',3,3,48,48,32),('persistent-ground',4,4,160,112,92),
    ('armor-motion-plate',4,6,64,64,46),('armor-motion-leather',4,6,64,64,46),('armor-motion-cloth',4,6,64,64,46),('melee-arm-parts',3,3,48,48,32),
    ('architecture-core',2,3,160,176,152),('weapons-equipped',4,4,80,112,96),
    ('armor-equipped',3,4,48,48,32),('headgear-equipped',4,4,48,48,32),
    ('accessories-equipped',4,4,48,48,32),('heads-custom',4,4,48,48,32),
    ('environment-props',4,4,96,112,96),('buildings-town',3,4,192,208,184),
    ('summons-core',4,4,96,112,88),('summons-evolved',4,4,96,112,88),
    ('summons-ancient',4,4,128,144,112),('arcane-special',4,4,96,112,88),
    ('landmarks-modular',4,4,160,176,152),('icons-extra',4,4,64,64,52),
    ('town-details',4,4,96,112,96),('plague-props',4,4,112,128,112),
    ('story-props',4,4,112,128,112),('icons-materials',4,4,64,64,52),
    ('bosses-ascendant',4,3,160,176,148),('bosses-zephyr',3,3,160,176,148)]:
    boxes=[[0,0,354,315],[354,0,750,315],[750,0,1050,312],[1050,0,1448,312],[0,330,354,664],[375,370,735,675],[750,312,1035,682],[1050,330,1448,679],[0,665,352,1086],[352,720,758,1086],[780,683,1060,1086],[1080,673,1448,1086]] if name=='buildings-town' else None
    cuts={'summons-evolved':([0,351,702,1051,1402],[0,290,595,890,1122]),'summons-ancient':([0,384,768,1152,1536],[0,251,502,758,1024]),'arcane-special':([0,307,614,920,1227],[0,321,643,948,1281])}.get(name)
    if cuts:
        xs,ys=cuts
        boxes=[(xs[c],ys[r],xs[c+1],ys[r+1]) for r in range(rows) for c in range(cols)]
    if name=='landmarks-modular':
        xs=[0,342,661,987,1312]
        ys=[[0,270,618,913,1199],[0,312,615,906,1199],[0,304,630,915,1199],[0,325,624,912,1199]]
        boxes=[(xs[c],ys[c][r],xs[c+1],ys[c][r+1]) for r in range(rows) for c in range(cols)]
    if name.startswith('armor-motion-') or name in ['town-details','plague-props','story-props','bosses-ascendant','bosses-zephyr','creator-face-details']:boxes=packer.grid_boxes(root/f'assets/art/source/{name}.png',rows,cols)
    packer.pack(root/f'assets/art/source/{name}.png',name,rows,cols,w,h,target,boxes)
source=Image.open(root/'assets/art/source/terrain-core.png').convert('RGB')
atlas=Image.new('RGB',(256,128))
for row in range(2):
    for col in range(4):
        tile=source.crop((round(col*source.width/4),round(row*source.height/2),round((col+1)*source.width/4),round((row+1)*source.height/2)))
        atlas.paste(tile.resize((64,64),Image.Resampling.NEAREST),(col*64,row*64))
atlas.save(root/'assets/art/sprites/terrain-core.png')
import subprocess,sys
for name in ['combat-effects','skill-effects','skill-effects-extra']:
    subprocess.run([sys.executable,str(root/'tools/pack-effects.py'),name],check=True)
