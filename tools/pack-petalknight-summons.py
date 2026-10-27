"""Prepare generated source sheets for the existing sprite renderer.

Only sprite extraction, shared nearest-neighbour scale, binary transparency and
anchor packing happen here. The new anatomy comes entirely from the generated
source art; no Standard summon pixels or flower overlay code are consumed.
"""
from pathlib import Path
from PIL import Image
import importlib.util, json

ROOT=Path(__file__).resolve().parents[1]
spec=importlib.util.spec_from_file_location('pack_art',ROOT/'tools/pack-art.py')
pack_art=importlib.util.module_from_spec(spec);spec.loader.exec_module(pack_art)
profiles=[('rose-sentinel','thornling',80,80,48),('rose-stalker','thornbeast',112,104,66),('rose-siegebeast','elderThornbeast',128,112,78),('rose-titan','thornTitan',144,128,90)]
for suffix,stage,width,height,target in profiles:
 name='petalknight-'+suffix;source=ROOT/'assets/art/source'/f'{name}.png'
 image=Image.open(source).convert('RGBA');image.putalpha(image.getchannel('A').point(lambda a:255 if a>=150 else 0))
 boxes=pack_art.grid_boxes(source,3,4);cells=[];bounds=[];anchors=[]
 for box in boxes:
  cell=pack_art.cleanup.boundary_fragments(image.crop(box));bound=cell.getchannel('A').getbbox()
  if not bound:raise ValueError(f'{name}: empty frame')
  cell=cell.crop(bound);cells.append(cell);bounds.append([box[0]+bound[0],box[1]+bound[1],box[0]+bound[2],box[1]+bound[3]])
  # Align torso mass rather than a bounding box that expands with the weapon
  # or tail. The lower feet retain a fixed ground-contact pivot in every pose.
  alpha=cell.getchannel('A');ys=range(round(cell.height*.38),round(cell.height*.67))
  counts=[sum(alpha.getpixel((x,y))>0 for y in ys) for x in range(cell.width)]
  total=sum(counts);running=0;anchor=cell.width/2
  for x,count in enumerate(counts):
   running+=count
   if running>=total/2:anchor=x;break
  anchors.append(anchor)
 scale=min(target/max(c.height for c in cells),*(min((width/2-4)/max(1,a),(width/2-4)/max(1,c.width-a)) for c,a in zip(cells,anchors)))
 atlas=Image.new('RGBA',(width*12,height));rects=[]
 for frame,(cell,anchor) in enumerate(zip(cells,anchors)):
  size=(max(1,round(cell.width*scale)),max(1,round(cell.height*scale)));native=cell.resize(size,Image.Resampling.NEAREST)
  left=frame*width+width//2-round(anchor*scale);top=height-6-native.height
  if left<frame*width+2 or left+native.width>(frame+1)*width-2:raise ValueError(f'{name}: clipped frame {frame}')
  atlas.alpha_composite(native,(left,top));rects.append([left-frame*width,top,native.width,native.height])
 # One native game-pixel cardinal edge, without smoothing or rescaling limbs.
 outline=Image.new('RGBA',atlas.size);alpha=atlas.getchannel('A')
 for y in range(atlas.height):
  for x in range(atlas.width):
   if not alpha.getpixel((x,y)):continue
   for dx,dy in [(-1,0),(1,0),(0,-1),(0,1)]:
    nx,ny=x+dx,y+dy
    if 0<=nx<atlas.width and 0<=ny<atlas.height and not alpha.getpixel((nx,ny)):outline.putpixel((nx,ny),(14,15,15,255))
 outline.alpha_composite(atlas);atlas=outline
 destination=ROOT/'assets/art/sprites';atlas.save(destination/f'{name}.png',optimize=True)
 meta={'name':name,'stage':stage,'source':f'assets/art/source/{name}.png','sourceGrid':[4,3],'frames':12,'cellWidth':width,'cellHeight':height,'pivot':[width//2,height-6],'sharedScale':scale,'frameOrder':['idle1','idle2',*[f'walk{i}' for i in range(1,7)],'anticipation','swing','contact','recovery'],'sourceBounds':bounds,'spriteRects':rects}
 (destination/f'{name}.json').write_text(json.dumps(meta,indent=2)+'\n')
 preview=Image.new('RGB',(width*4,height*3),'#222b26')
 for f in range(12):preview.paste(atlas.crop((f*width,0,(f+1)*width,height)),((f%4)*width,(f//4)*height),atlas.crop((f*width,0,(f+1)*width,height)).getchannel('A'))
 preview.resize((preview.width*3,preview.height*3),Image.Resampling.NEAREST).save(destination/f'{name}-preview.png')
 print(json.dumps({'name':name,'frames':12,'scale':scale,'bodyHeights':[r[3] for r in rects]}))
