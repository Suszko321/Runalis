"""Pack authored Bat Beast master. Usage: python tools/build-veyreign-bat.py [master.png]."""
from pathlib import Path
import json, sys
from PIL import Image

ROOT = Path(__file__).resolve().parents[1]
source = Path(sys.argv[1]) if len(sys.argv)>1 else ROOT/'assets/art/source/bat-beast/master.png'
if not source.exists():
    raise SystemExit('Authored master missing. Supply its path; see docs/art-audit/bat-beast/PROMPTS.md')
image = Image.open(source).convert('RGBA')
pixels = image.getchannel('A').point(lambda a:255 if a>=150 else 0).load()
seen, parts = set(), []
for y in range(image.height):
 for x in range(image.width):
  if not pixels[x,y] or (x,y) in seen: continue
  todo,points=[(x,y)],[]
  seen.add((x,y))
  while todo:
   px,py=todo.pop(); points.append((px,py))
   for dx,dy in ((-1,0),(1,0),(0,-1),(0,1)):
    nx,ny=px+dx,py+dy
    if 0<=nx<image.width and 0<=ny<image.height and (nx,ny) not in seen and pixels[nx,ny]:
     seen.add((nx,ny));todo.append((nx,ny))
  parts.append(points)
figures=[p for p in parts if len(p)>500]
assert len(figures)==24, f'Expected 24 isolated authored poses, got {len(figures)}; inspect source'
figures.sort(key=lambda p:min(y for x,y in p))
figures=[p for row in range(6) for p in sorted(figures[row*4:row*4+4],key=lambda p:min(x for x,y in p))]
centres=[(sum(x for x,y in p)/len(p),sum(y for x,y in p)/len(p)) for p in figures]
for fragment in parts:
 if len(fragment)>500 or len(fragment)<4: continue
 x,y=fragment[0]
 nearest=min(range(24),key=lambda i:(x-centres[i][0])**2+(y-centres[i][1])**2)
 figures[nearest].extend(fragment)
# Shared palette and scale preserve mass and color through the state changes.
rgb=image.convert('RGB')
samples=[rgb.getpixel((x,y)) for p in figures for x,y in p]
ramp=Image.new('RGB',(len(samples),1));ramp.putdata(samples)
ramp=ramp.quantize(colors=32,method=Image.Quantize.MEDIANCUT)
colored=rgb.quantize(palette=ramp,dither=Image.Dither.NONE).convert('RGBA')
cells=[]
for points in figures:
 mask=Image.new('L',image.size);mp=mask.load()
 for x,y in points: mp[x,y]=255
 crop=colored.copy();crop.putalpha(mask);crop=crop.crop(mask.getbbox())
 crop=crop.resize((round(crop.width*.31),round(crop.height*.31)),Image.Resampling.NEAREST)
 assert crop.width<=90 and crop.height<=70,'Pose needs more padding'
 cell=Image.new('RGBA',(96,80));cell.alpha_composite(crop,((96-crop.width)//2,74-crop.height));cells.append(cell)
sheet=Image.new('RGBA',(96*16,80*6))
for row in range(6):
 for frame in range(16):
  # Four distinct drawings, held in the existing sixteen time slots.
  sheet.alpha_composite(cells[row*4+frame//4],(frame*96,row*80))
out=ROOT/'assets/art/sprites'
sheet.save(out/'veyreign-bat-beast.png',optimize=True)
meta=dict(width=96,height=80,frames=16,fps=12,states=['idle','anticipation','execution','recovery','hit','death'],style='dark fantasy pixel art',authoredPosesPerState=4)
(out/'veyreign-bat-beast.json').write_text(json.dumps(meta,indent=2)+'\n')
review=Image.new('RGBA',(96*4,80*6))
for i,cell in enumerate(cells): review.alpha_composite(cell,(i%4*96,i//4*80))
review.save(ROOT/'docs/art-audit/bat-beast/poses.png')
review.resize((768,960),Image.Resampling.NEAREST).save(ROOT/'docs/art-audit/bat-beast/poses-2x.png')
print('Packed 24 authored poses, 96x80 cells, 32-color palette; six states / sixteen held slots.')
