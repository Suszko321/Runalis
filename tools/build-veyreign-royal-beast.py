"""Pack authored royal beast, never redraw a geometric placeholder.

Usage: python tools/build-veyreign-royal-beast.py [transparent-master.png]
"""
from pathlib import Path
import json,sys
from PIL import Image

ROOT=Path(__file__).resolve().parents[1]
source=Path(sys.argv[1]) if len(sys.argv)>1 else ROOT/'assets/art/source/royal-bat-evolution/master.png'
if not source.exists():
 raise SystemExit('Authored master missing. Supply its path; see docs/art-audit/royal-bat-beast/PROMPTS.md')
image=Image.open(source).convert('RGBA')
alpha=image.getchannel('A').point(lambda a:255 if a>=150 else 0)
pixels=alpha.load();seen=set();parts=[]
for y in range(image.height):
 for x in range(image.width):
  if not pixels[x,y] or (x,y) in seen:continue
  todo=[(x,y)];points=[];seen.add((x,y))
  while todo:
   px,py=todo.pop();points.append((px,py))
   for dx,dy in ((-1,0),(1,0),(0,-1),(0,1)):
    nx,ny=px+dx,py+dy
    if 0<=nx<image.width and 0<=ny<image.height and (nx,ny) not in seen and pixels[nx,ny]:
     seen.add((nx,ny));todo.append((nx,ny))
  parts.append(points)
figures=[p for p in parts if len(p)>500]
assert len(figures)==28,f'Expected 28 isolated authored poses, got {len(figures)}; inspect master'
figures.sort(key=lambda p:min(y for x,y in p))
figures=[p for row in range(7) for p in sorted(figures[row*4:row*4+4],key=lambda p:min(x for x,y in p))]
centres=[(sum(x for x,y in p)/len(p),sum(y for x,y in p)/len(p)) for p in figures]
for fragment in parts:
 if len(fragment)>500 or len(fragment)<4:continue
 x,y=fragment[0]
 i=min(range(28),key=lambda i:(x-centres[i][0])**2+(y-centres[i][1])**2)
 figures[i].extend(fragment)
rgb=image.convert('RGB');samples=[rgb.getpixel((x,y)) for p in figures for x,y in p]
ramp=Image.new('RGB',(len(samples),1));ramp.putdata(samples)
ramp=ramp.quantize(colors=32,method=Image.Quantize.MEDIANCUT)
colored=rgb.quantize(palette=ramp,dither=Image.Dither.NONE).convert('RGBA')
crops=[]
for points in figures:
 mask=Image.new('L',image.size);mp=mask.load()
 for x,y in points:mp[x,y]=255
 crop=colored.copy();crop.putalpha(mask);crops.append(crop.crop(mask.getbbox()))
# One scale for all seven states; death/transform drawings must not inflate.
scale=min(104/max(c.width for c in crops),70/max(c.height for c in crops))
cells=[]
for crop in crops:
 crop=crop.resize((round(crop.width*scale),round(crop.height*scale)),Image.Resampling.NEAREST)
 cell=Image.new('RGBA',(112,80));cell.alpha_composite(crop,((112-crop.width)//2,74-crop.height));cells.append(cell)
sheet=Image.new('RGBA',(112*48,80*7))
for row in range(7):
 for frame in range(48):
  # One-way states progress once; other states repeat a compact four-pose cycle.
  pose=frame//12 if row in (0,6) else frame%12//3
  sheet.alpha_composite(cells[row*4+pose],(frame*112,row*80))
out=ROOT/'assets/art/sprites'
sheet.save(out/'veyreign-royal-blood-beast.png',optimize=True)
meta=dict(width=112,height=80,frames=48,states=['transformation','idle','anticipation','execution','recovery','hit','death'],fps=12,transformSeconds=4,palette='obsidian black, blood crimson, thin antique gold trim, ivory fangs',authoredPosesPerState=4,pivot=[56,74])
(out/'veyreign-royal-blood-beast.json').write_text(json.dumps(meta,indent=2)+'\n')
review=Image.new('RGBA',(112*4,80*7))
for i,cell in enumerate(cells):review.alpha_composite(cell,(i%4*112,i//4*80))
dest=ROOT/'docs/art-audit/royal-bat-beast';dest.mkdir(parents=True,exist_ok=True)
review.save(dest/'poses.png');review.resize((896,1120),Image.Resampling.NEAREST).save(dest/'poses-2x.png')
print('Packed 28 authored poses into 336 timing slots, 112x80 cells, shared 32-color palette.')
