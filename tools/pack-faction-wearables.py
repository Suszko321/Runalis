"""Pack authored faction garment views without editing approved human sprites."""
from pathlib import Path
import json
from PIL import Image
from wearable_export import isolate_cell,authored_cells
ROOT=Path(__file__).resolve().parents[1]
RECTS=[[(20,8,24,22),(23,33,18,18),(19,48,26,30)],[(21,9,22,21),(24,33,16,18),(20,48,24,30)]]
PARTS=[0,1,2,1,0,1]
dest=ROOT/'assets/art/sprites'
review=ROOT/'docs/faction-wearables';review.mkdir(exist_ok=True)
for faction in ['covenant','last-dawn']:
 source=Image.open(ROOT/f'assets/art/source/player-wearables/{faction}-master.png').convert('RGBA')
 source.putalpha(source.getchannel('A').point(lambda a:255 if a>=150 else 0))
 cells=authored_cells(source,6)
 out=Image.new('RGBA',(256,960));icons=Image.new('RGBA',(192,32))
 for row,part in enumerate(PARTS):
  for col in range(4):
   cell=cells[row,col]
   cell=isolate_cell(cell,part);bounds=cell.getchannel('A').getbbox();assert bounds,(faction,row,col)
   crop=cell.crop(bounds)
   palette=crop.convert('RGB').quantize(colors=16,method=Image.Quantize.MEDIANCUT).convert('RGBA');palette.putalpha(crop.getchannel('A'))
   for body in range(2):
    x,y,w,h=RECTS[body][part]
    out.alpha_composite(palette.resize((w,h),Image.Resampling.NEAREST),(col*64+x,(body*6+row)*80+y))
   if col==0:
    scale=min(28/crop.width,28/crop.height);w,h=round(crop.width*scale),round(crop.height*scale)
    icons.alpha_composite(palette.resize((w,h),Image.Resampling.NEAREST),(row*32+(32-w)//2,(32-h)//2))
 name=f'player-wearables-{faction}'
 out.save(dest/f'{name}.png',optimize=True);icons.save(dest/f'{name}-icons.png',optimize=True)
 meta=dict(width=64,height=80,frames=4,states=[f'{body}{part}' for body in ['male','female'] for part in ['Helm','Chest','Legs','Robe','ScoutHelm','ScoutChest']],directions=['down','right','up','left'])
 (dest/f'{name}.json').write_text(json.dumps(meta,indent=2)+'\n')
 (dest/f'{name}-icons.json').write_text(json.dumps(dict(width=32,height=32,frames=6,states=['items']),indent=2)+'\n')
 out.resize((768,2880),Image.Resampling.NEAREST).save(review/f'{faction}-surfaces.png')
 print(f'{faction}: 24 authored views, 48 fitted surfaces, 6 matching icons')
