"""Native atlas export for the twelve authored endgame ensembles."""
from pathlib import Path
import json,subprocess,sys
from PIL import Image
from wearable_export import authored_cells,isolate_cell
ROOT=Path(__file__).resolve().parents[1]
data=json.loads(subprocess.check_output(['node','--input-type=module','-e',"import{ENDGAME_ENSEMBLES,ENDGAME_WEARABLE_ART}from './src/endgameEquipmentData.js';console.log(JSON.stringify({sets:ENDGAME_ENSEMBLES,art:ENDGAME_WEARABLE_ART}))"],cwd=ROOT,text=True))
rects=[[(20,8,24,22),(23,33,18,18),(19,48,26,30)],[(21,9,22,21),(24,33,16,18),(20,48,24,30)]]
dest=ROOT/'assets/art/sprites'
for ensemble in data['sets'].values():
 if len(sys.argv)>1 and ensemble['id'] not in sys.argv[1:]:continue
 name=ensemble['sheet'];source=Image.open(ROOT/f'assets/art/source/endgame-equipment/{name}-master.png').convert('RGBA');source.putalpha(source.getchannel('A').point(lambda a:255 if a>=150 else 0));cells=authored_cells(source,4)
 out=Image.new('RGBA',(256,640));icons=Image.new('RGBA',(128,32))
 for row,item_id in enumerate(ensemble['pieces']):
  fit=data['art'][item_id]
  for col in range(4):
   cell=isolate_cell(cells[row,col],row);crop=cell.crop(cell.getchannel('A').getbbox());assert crop.width and crop.height
   palette=crop.convert('RGB').quantize(colors=24,method=Image.Quantize.MEDIANCUT).convert('RGBA');palette.putalpha(crop.getchannel('A'))
   for body in range(2):
    if row==3:
     x,y,w,h=fit['accessoryRect'];scale=min(w/crop.width,h/crop.height);w,h=max(1,round(crop.width*scale)),max(1,round(crop.height*scale));x=32-w//2
    else:x,y,w,h=fit.get('rects',[rects[0][row],rects[1][row]])[body]
    out.alpha_composite(palette.resize((w,h),Image.Resampling.NEAREST),(col*64+x,(body*4+row)*80+y))
   if col==0:
    scale=min(28/crop.width,28/crop.height);w,h=round(crop.width*scale),round(crop.height*scale);icons.alpha_composite(palette.resize((w,h),Image.Resampling.NEAREST),(row*32+(32-w)//2,(32-h)//2))
 out.save(dest/f'{name}.png',optimize=True);icons.save(dest/f'{name}-icons.png',optimize=True)
 (dest/f'{name}.json').write_text(json.dumps(dict(width=64,height=80,frames=4,states=[f'{body}{suffix}' for body in ['male','female'] for suffix in ['Helm','Chest','Legs','Mantle']],directions=['down','right','up','left']),indent=2)+'\n')
 (dest/f'{name}-icons.json').write_text(json.dumps(dict(width=32,height=32,frames=4,states=['items']),indent=2)+'\n')
 print(f'{ensemble["name"]}: 16 authored views, 32 registrations, 4 icons')
