"""Mechanical export of ImageGen masters; no weapon drawing or anatomy edits."""
import json, subprocess
from pathlib import Path
from PIL import Image

ROOT=Path(__file__).resolve().parents[1]
data=json.loads(subprocess.check_output(['node','--input-type=module','-e',"import {LEGENDARY_WEAPON_FAMILIES as families,LEGENDARY_WEAPON_ART as art} from './src/legendaryWeaponData.js';console.log(JSON.stringify({families,art}));"],cwd=ROOT,text=True))
source_dir=ROOT/'assets/art/source/legendary-weapons'
dest=ROOT/'assets/art/sprites'
def hard_alpha(im):
 im=im.convert('RGBA');im.putalpha(im.getchannel('A').point(lambda a:255 if a>=200 else 0));return im
def palette(im):
 alpha=im.getchannel('A');im=im.convert('RGB').quantize(colors=24,method=Image.Quantize.MEDIANCUT).convert('RGBA');im.putalpha(alpha);return im
def contained(im,box):
 w,h=box;factor=min(w/im.width,h/im.height)
 return palette(im.resize((max(1,round(im.width*factor)),max(1,round(im.height*factor))),Image.Resampling.NEAREST))
def columns(im):
 # Masters have four drawings, but their centers need not be exact quarter cells.
 alpha=im.getchannel('A');occupied=[x for x in range(im.width) if alpha.crop((x,0,x+1,im.height)).getbbox()]
 gaps=sorted([(b-a-1,(a+b)//2) for a,b in zip(occupied,occupied[1:]) if b-a>1],reverse=True)[:3]
 assert len(gaps)==3 and min(g[0] for g in gaps)>im.width*.02,('Missing transparent gutters',gaps)
 cuts=[0]+sorted(g[1] for g in gaps)+[im.width]
 return [im.crop((cuts[i],0,cuts[i+1],im.height)) for i in range(4)]
for group,ids in data['families'].items():
 source=hard_alpha(Image.open(source_dir/f'{group}-master.png'))
 cells=columns(source)
 for col,id in enumerate(ids):
  cell=cells[col];bounds=cell.getbbox()
  assert bounds and min(bounds[0],bounds[1],cell.width-bounds[2],cell.height-bounds[3])>=2,('Clipped source',id,bounds,cell.size)
  crop=cell.crop(bounds)
  im=contained(crop,(66,104) if group=='swords' else (52,100) if group=='maces' else (72,80) if group=='grimoires' else (64,112))
  profile=data['art'][id];gx,gy=profile['gripX'],profile['gripY']
  fraction=([.5,.70] if group=='grimoires' else [[.22,.50],[.15,.50],[.25,.50],[.18,.50]][col] if group=='bows' else [.5,.70] if group=='staves' else [.5,.82] if group=='swords' else [.5,.77])
  x,y=round(gx-fraction[0]*im.width),round(gy-fraction[1]*im.height)
  assert 2<=x and x+im.width<=94 and 2<=y and y+im.height<=126,('Clipped export',id,x,y,im.size)
  atlas=Image.new('RGBA',(96,128));atlas.paste(im,(x,y))
  # Ensure a solid authored handle lies under the renderer's exact pivot.
  assert any(atlas.getpixel((xx,yy))[3] for yy in range(gy-2,gy+3) for xx in range(gx-2,gx+3)),('Empty grip',id)
  sheet=profile['sheet'];atlas.save(dest/f'{sheet}.png')
  icon=Image.new('RGBA',(32,32));small=contained(crop,(28,28));icon.paste(small,((32-small.width)//2,(32-small.height)//2));icon.save(dest/f'{sheet}-icon.png')
  meta={'cellWidth':96,'cellHeight':128,'columns':1,'rows':1,'source':f'assets/art/source/legendary-weapons/{group}-master.png','sourceCell':col,'sourceBounds':bounds,'rect':[x,y,im.width,im.height],**profile}
  (dest/f'{sheet}.json').write_text(json.dumps(meta,indent=2)+'\n')
  (dest/f'{sheet}-icon.json').write_text(json.dumps({'cellWidth':32,'cellHeight':32,'columns':1,'rows':1,'source':meta['source'],'sourceCell':col},indent=2)+'\n')
  print('Packed',id,im.size,'grip',gx,gy)
source=hard_alpha(Image.open(source_dir/'projectiles-master.png'));atlas=Image.new('RGBA',(128,32));cells=columns(source)
for col in range(4):
 cell=cells[col];im=contained(cell.crop(cell.getbbox()),(28,24));atlas.paste(im,(col*32+(32-im.width)//2,(32-im.height)//2))
atlas.save(dest/'legendary-focus-projectiles.png')
(dest/'legendary-focus-projectiles.json').write_text(json.dumps({'cellWidth':32,'cellHeight':32,'columns':4,'rows':1,'direction':'right','source':'assets/art/source/legendary-weapons/projectiles-master.png'},indent=2)+'\n')
