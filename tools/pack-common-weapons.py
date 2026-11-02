"""Mechanical packing of accepted plain-weapon ImageGen masters."""
import json,subprocess
from pathlib import Path
from PIL import Image
ROOT=Path(__file__).resolve().parents[1];DEST=ROOT/'assets/art/sprites';SOURCE=ROOT/'assets/art/source/common-weapons'
data=json.loads(subprocess.check_output(['node','--input-type=module','-e',"import {COMMON_WEAPON_ART as art,COMMON_WEAPON_EXPORTS as exports} from './src/commonWeaponData.js';console.log(JSON.stringify({art,exports}));"],cwd=ROOT,text=True))
def hard(im):
 im=im.convert('RGBA');im.putalpha(im.getchannel('A').point(lambda a:255 if a>=200 else 0));return im
def cells(im,count):
 alpha=im.getchannel('A');xs=[x for x in range(im.width) if alpha.crop((x,0,x+1,im.height)).getbbox()];gaps=sorted([(b-a-1,(a+b)//2) for a,b in zip(xs,xs[1:]) if b-a>1],reverse=True)[:count-1]
 assert len(gaps)==count-1 and min(g[0] for g in gaps)>im.width*.012,('Missing gutters',gaps)
 cuts=[0]+sorted(g[1] for g in gaps)+[im.width];return [im.crop((cuts[i],0,cuts[i+1],im.height)) for i in range(count)]
def resize(im,width,height):
 factor=min(width/im.width,height/im.height);im=im.resize((max(1,round(im.width*factor)),max(1,round(im.height*factor))),Image.Resampling.NEAREST);alpha=im.getchannel('A');im=im.convert('RGB').quantize(colors=16,method=Image.Quantize.MEDIANCUT).convert('RGBA');im.putalpha(alpha);return im
masters={name:cells(hard(Image.open(SOURCE/f'{name}-master.png')),count) for name,count in [('martial-a',4),('martial-b',5),('magic',4)]}
for id,export in data['exports'].items():
 a=data['art'][id];cell=masters[export['master']][export['column']];box=cell.getbbox();assert box and min(box[0],box[1],cell.width-box[2],cell.height-box[3])>=2,('Clipped master',id,box)
 crop=cell.crop(box);im=resize(crop,72,export['height']);gx,gy=a['gripX'],a['gripY'];fx,fy=export['fraction'];x,y=round(gx-fx*im.width),round(gy-fy*im.height)
 assert 2<=x and x+im.width<=94 and 2<=y and y+im.height<=126,('Clipped export',id,x,y,im.size)
 atlas=Image.new('RGBA',(96,128));atlas.paste(im,(x,y));assert any(atlas.getpixel((xx,yy))[3] for yy in range(gy-2,gy+3) for xx in range(gx-2,gx+3)),('Empty grip',id)
 atlas.save(DEST/f"{a['sheet']}.png");icon=Image.new('RGBA',(32,32));small=resize(crop,28,28);icon.paste(small,((32-small.width)//2,(32-small.height)//2));icon.save(DEST/f"{a['iconSheet']}.png")
 source=f"assets/art/source/common-weapons/{export['master']}-master.png"
 (DEST/f"{a['sheet']}.json").write_text(json.dumps({'cellWidth':96,'cellHeight':128,'columns':1,'rows':1,'source':source,'sourceColumn':export['column'],'rect':[x,y,im.width,im.height],**a},indent=2)+'\n')
 (DEST/f"{a['iconSheet']}.json").write_text(json.dumps({'cellWidth':32,'cellHeight':32,'columns':1,'rows':1,'source':source,'sourceColumn':export['column']},indent=2)+'\n');print('Packed',id,im.size)
atlas=Image.new('RGBA',(64,32));source='assets/art/source/common-weapons/projectiles-master.png'
for index,cell in enumerate(cells(hard(Image.open(ROOT/source)),2)):
 im=resize(cell.crop(cell.getbbox()),26,18);atlas.paste(im,(index*32+(32-im.width)//2,(32-im.height)//2))
atlas.save(DEST/'common-focus-projectiles.png');(DEST/'common-focus-projectiles.json').write_text(json.dumps({'cellWidth':32,'cellHeight':32,'columns':2,'rows':1,'source':source,'direction':'right'},indent=2)+'\n')
