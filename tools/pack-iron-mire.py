"""Pack built-in ImageGen masters into native Iron Vault atlases. Requires Pillow."""
from pathlib import Path
import json
from PIL import Image
ROOT=Path(__file__).resolve().parents[1]
def pack(source,name,rows,size,states):
 image=Image.open(ROOT/'assets/art/source/iron-mire'/source).convert('RGBA')
 alpha=image.getchannel('A').point(lambda a:255 if a>=150 else 0);px=alpha.load();seen=set();parts=[]
 for y in range(image.height):
  for x in range(image.width):
   if not px[x,y] or (x,y) in seen:continue
   todo=[(x,y)];seen.add((x,y));points=[]
   while todo:
    xx,yy=todo.pop();points.append((xx,yy))
    for dx,dy in ((-1,0),(1,0),(0,-1),(0,1)):
     nx,ny=xx+dx,yy+dy
     if 0<=nx<image.width and 0<=ny<image.height and (nx,ny) not in seen and px[nx,ny]:seen.add((nx,ny));todo.append((nx,ny))
   parts.append(points)
 figures=[p for p in parts if len(p)>700]
 assert len(figures)==rows*4,f'{name}: expected {rows*4} main silhouettes, got {len(figures)}'
 figures.sort(key=lambda p:min(y for x,y in p))
 figures=[p for r in range(rows) for p in sorted(figures[r*4:r*4+4],key=lambda p:min(x for x,y in p))]
 centres=[(sum(x for x,y in p)/len(p),sum(y for x,y in p)/len(p)) for p in figures]
 for frag in parts:
  if len(frag)>700 or len(frag)<4:continue
  x,y=frag[0];i=min(range(len(figures)),key=lambda i:(x-centres[i][0])**2+(y-centres[i][1])**2);figures[i].extend(frag)
 rgb=image.convert('RGB');samples=[rgb.getpixel((x,y)) for p in figures for x,y in p]
 palette=Image.new('RGB',(len(samples),1));palette.putdata(samples);palette=palette.quantize(colors=48,method=Image.Quantize.MEDIANCUT)
 colored=rgb.quantize(palette=palette,dither=Image.Dither.NONE).convert('RGBA');crops=[]
 for p in figures:
  mask=Image.new('L',image.size);mp=mask.load()
  for x,y in p:mp[x,y]=255
  crop=colored.copy();crop.putalpha(mask);crops.append(crop.crop(mask.getbbox()))
 # Same scale through the boss cycle. Independent prop sizes are purposeful.
 shared=min((size-12)/max(c.width for c in crops),(size-12)/max(c.height for c in crops))
 sheet=Image.new('RGBA',(size*4,size*rows))
 for i,crop in enumerate(crops):
  scale=shared if rows==6 else min((size-12)/crop.width,(size-12)/crop.height)
  crop=crop.resize((round(crop.width*scale),round(crop.height*scale)),Image.Resampling.NEAREST)
  sheet.alpha_composite(crop,(i%4*size+(size-crop.width)//2,i//4*size+size-6-crop.height))
 dest=ROOT/'assets/art/sprites';sheet.save(dest/(name+'.png'),optimize=True)
 (dest/(name+'.json')).write_text(json.dumps(dict(width=size,height=size,frames=4,fps=8,states=states,pivot=[size//2,size-6],style='dark fantasy pixel art'),indent=2)+'\n')
 review=ROOT/'docs/iron-mire';review.mkdir(parents=True,exist_ok=True)
 sheet.resize((sheet.width*2,sheet.height*2),Image.Resampling.NEAREST).save(review/(name+'-2x.png'))
 print(name, sheet.size, len(figures),'authored cells')
pack('foreman.png','dungeon-iron-foreman',6,128,['idle','anticipation','execution','recovery','hit','death'])
pack('machinery.png','dungeon-iron-machinery',3,96,['works','equipment','memorial'])
