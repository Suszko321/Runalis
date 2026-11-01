"""Register authored equipment surfaces; the approved body sprites are read-only."""
from pathlib import Path
import json
from PIL import Image
ROOT=Path(__file__).resolve().parents[1]
source=Image.open(ROOT/'assets/art/source/player-wearables/first-pass-master.png').convert('RGBA')
source.putalpha(source.getchannel('A').point(lambda a:255 if a>=150 else 0))
rects=[[(20,8,24,22),(23,33,18,18),(19,48,26,30)],[(21,9,22,21),(24,33,16,18),(20,48,24,30)]]
out=Image.new('RGBA',(256,480))
for row in range(3):
 for col in range(4):
  cell=source.crop((round(col*source.width/4),round(row*source.height/3),round((col+1)*source.width/4),round((row+1)*source.height/3)))
  bounds=cell.getchannel('A').getbbox();assert bounds,'Empty authored item view'
  crop=cell.crop(bounds)
  palette=crop.convert('RGB').quantize(colors=16,method=Image.Quantize.MEDIANCUT).convert('RGBA');palette.putalpha(crop.getchannel('A'))
  for body in range(2):
   x,y,w,h=rects[body][row]
   fitted=palette.resize((w,h),Image.Resampling.NEAREST)
   out.alpha_composite(fitted,(col*64+x,(body*3+row)*80+y))
dest=ROOT/'assets/art/sprites';out.save(dest/'player-wearables-first-pass.png',optimize=True)
meta=dict(width=64,height=80,frames=4,states=['maleHelm','maleChest','maleLegs','femaleHelm','femaleChest','femaleLegs'],directions=['down','right','up','left'],fitRects=rects,style='native fitted pixel-art garment surfaces')
(dest/'player-wearables-first-pass.json').write_text(json.dumps(meta,indent=2)+'\n')
out.resize((768,1440),Image.Resampling.NEAREST).save(ROOT/'docs/player-wearables-first-pass/registered-surfaces.png')
print('Packed 12 authored directional designs into 24 body-specific surfaces; base character bytes untouched.')
