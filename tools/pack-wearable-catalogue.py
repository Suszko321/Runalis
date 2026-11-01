"""Pack authored catalogue garments/accessories into existing native anchors."""
from pathlib import Path
import json
import sys
from PIL import Image
from wearable_export import isolate_cell,authored_cells
ROOT=Path(__file__).resolve().parents[1]
manifest=json.loads((ROOT/'docs/wearable-catalogue/manifest.json').read_text())
RECTS=[[(20,8,24,22),(23,33,18,18),(19,48,26,30)],[(21,9,22,21),(24,33,16,18),(20,48,24,30)]]
dest=ROOT/'assets/art/sprites';source_dir=ROOT/'assets/art/source/player-wearables'
for spec in manifest['prompts']:
 name=spec['sheet'];items=[i for i in manifest['body']+manifest['accessories'] if i['sheet']==name];rows=len(items)
 if len(sys.argv)>1 and name!=sys.argv[1]:continue
 source=Image.open(source_dir/f'{name}-master.png').convert('RGBA')
 source.putalpha(source.getchannel('A').point(lambda a:255 if a>=150 else 0))
 cells=authored_cells(source,rows)
 accessory=items[0]['part']==3;bodies=1 if accessory else 2
 out=Image.new('RGBA',(256,rows*bodies*80));icons=Image.new('RGBA',(rows*32,32))
 for item in items:
  row=item['row'];part=item['part']
  for col in range(4):
   cell=cells[row,col]
   cell=isolate_cell(cell,part);bounds=cell.getchannel('A').getbbox();assert bounds,(name,row,col)
   crop=cell.crop(bounds);palette=crop.convert('RGB').quantize(colors=16,method=Image.Quantize.MEDIANCUT).convert('RGBA');palette.putalpha(crop.getchannel('A'))
   if accessory:
    w,h={'cloak':(30 if col in (0,2) else 18,42),'shield':(24 if col in (0,2) else 14,32),'lantern':(10,13),'charm':(5,7),'ring':(3,3)}[item['kind']]
    scale=min(w/crop.width,h/crop.height);w,h=max(1,round(crop.width*scale)),max(1,round(crop.height*scale))
    top={'cloak':0,'shield':0,'lantern':10,'charm':5,'ring':20}[item['kind']]
    out.alpha_composite(palette.resize((w,h),Image.Resampling.NEAREST),(col*64+16+(32-w)//2,row*80+16+top))
   else:
    for body in range(2):
     x,y,w,h=item.get('rects',[RECTS[0][part],RECTS[1][part]])[body]
     out.alpha_composite(palette.resize((w,h),Image.Resampling.NEAREST),(col*64+x,(body*rows+row)*80+y))
   if col==0:
    scale=min(28/crop.width,28/crop.height);w,h=max(1,round(crop.width*scale)),max(1,round(crop.height*scale))
    icons.alpha_composite(palette.resize((w,h),Image.Resampling.NEAREST),(row*32+(32-w)//2,(32-h)//2))
 out.save(dest/f'{name}.png',optimize=True);icons.save(dest/f'{name}-icons.png',optimize=True)
 states=[f'{body}{i["id"]}' for body in ([''] if accessory else ['male','female']) for i in items]
 meta=dict(width=64,height=80,frames=4,states=states,directions=['down','right','up','left'])
 (dest/f'{name}.json').write_text(json.dumps(meta,indent=2)+'\n')
 (dest/f'{name}-icons.json').write_text(json.dumps(dict(width=32,height=32,frames=rows,states=['items']),indent=2)+'\n')
 print(f'{name}: {rows*4} views, {rows*4*bodies} surfaces, {rows} icons')
# Complete the original selected outfit's icons from its retained authored atlas.
original=Image.open(dest/'player-wearables-first-pass.png').convert('RGBA');icons=Image.new('RGBA',(96,32))
for row,(x,y,w,h) in enumerate(RECTS[0]):
 crop=isolate_cell(original.crop((x,row*80+y,x+w,row*80+y+h)),row);crop=crop.crop(crop.getchannel('A').getbbox());w,h=crop.size;scale=min(28/w,28/h);w,h=round(w*scale),round(h*scale)
 icons.alpha_composite(crop.resize((w,h),Image.Resampling.NEAREST),(row*32+(32-w)//2,(32-h)//2))
icons.save(dest/'player-wearables-first-pass-icons.png',optimize=True)
(dest/'player-wearables-first-pass-icons.json').write_text(json.dumps(dict(width=32,height=32,frames=3,states=['items']),indent=2)+'\n')
