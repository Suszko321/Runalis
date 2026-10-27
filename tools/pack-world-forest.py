"""Pack reviewed generated forest drawings into the unchanged production cells.
Not an art generator: nearest-neighbour export, alpha cleanup and registration.
The two clipped right-edge tree candidates are deliberately rejected.
"""
from pathlib import Path
from PIL import Image
import shutil, json, sys
root=Path(__file__).resolve().parents[1]
source=Path(sys.argv[1])
target=root/'assets/art/sprites/echoryn-forest-kit.png'
backup=root/'backups/world-art-2026-10-18/echoryn-forest-kit.png'
if not backup.exists(): shutil.copy2(target,backup)
original=Image.open(backup).convert('RGBA')
generated=Image.open(source).convert('RGBA')
raw=root/'assets/art/source/echoryn-forest-cohesion.png'
shutil.copy2(source,raw)
boxes=[(0,60,290,365),(300,60,540,365),(540,60,910,365),None,
 (0,390,290,740),(295,390,550,740),(550,390,910,740),None,
 None,None,(550,790,895,1055),(895,790,generated.width,1055),
 (0,1090,286,generated.height),(286,1090,580,generated.height),(590,1090,850,generated.height),(850,1090,generated.width,generated.height)]
atlas=original.copy();records=[];canopies=Image.new('RGBA',(1024,608));nativeIndices=[0,1,2,4,5,6]
for i,box in enumerate(boxes):
 if box is None:
  records.append({'index':i,'retained':True,'reason':'retain seamless cliff crop' if i in [8,9] else 'candidate clipped by right image boundary'})
  continue
 cell=original.crop((i%4*160,i//4*192,i%4*160+160,i//4*192+192))
 bbox=cell.getbbox();sprite=generated.crop(box)
 alpha=sprite.getchannel('A').point(lambda a:255 if a>=128 else 0);sprite.putalpha(alpha)
 sprite=sprite.crop(sprite.getbbox())
 if i in nativeIndices:
  # Author the large tree source from the generated master, rather than enlarge
  # the small export. At a typical 1.6x tree size this is near one source pixel
  # per world pixel, matching the unchanged player much more closely.
  native=sprite.copy();nativeWidth=min(244,(bbox[2]-bbox[0]+8)*1.6);nativeHeight=min(244,(bbox[3]-bbox[1]+20)*1.6)
  nativeScale=min(nativeWidth/native.width,nativeHeight/native.height)
  native=native.resize((round(native.width*nativeScale),round(native.height*nativeScale)),Image.Resampling.NEAREST)
  native=native.quantize(colors=80,method=Image.Quantize.FASTOCTREE).convert('RGBA')
  canopies.paste(native,(i%4*256+(256-native.width)//2,i//4*304+295-native.height))
 # Preserve the established lower kit bounds used by cliff crops and entrances.
 # Trees have enough native area for leaf clusters while remaining inside cells.
 tw,th=(min(152,bbox[2]-bbox[0]+8),min(152,bbox[3]-bbox[1]+20)) if i<8 else (bbox[2]-bbox[0],bbox[3]-bbox[1])
 scale=min(tw/sprite.width,th/sprite.height)
 sprite=sprite.resize((round(sprite.width*scale),round(sprite.height*scale)),Image.Resampling.NEAREST)
 # An atlas-wide restrained palette preserves clusters without fuzzy alpha edges.
 sprite=sprite.quantize(colors=64,method=Image.Quantize.FASTOCTREE).convert('RGBA')
 x=i%4*160+(160-sprite.width)//2;y=i//4*192+186-sprite.height
 atlas.paste((0,0,0,0),(i%4*160,i//4*192,i%4*160+160,i//4*192+192))
 atlas.paste(sprite,(x,y))
 records.append({'index':i,'retained':False,'width':sprite.width,'height':sprite.height,'pivotY':186})
atlas.save(target,optimize=True)
canopyTarget=root/'assets/art/sprites/echoryn-canopies.png';canopies.save(canopyTarget,optimize=True)
(root/'assets/art/sprites/echoryn-canopies.json').write_text(json.dumps({'columns':4,'rows':2,'cellWidth':256,'cellHeight':304,'pivot':[128,295],'indices':nativeIndices,'source':'assets/art/source/echoryn-forest-cohesion.png'},indent=2))
(root/'docs/world-art/forest-packing.json').write_text(json.dumps({'source':str(raw.relative_to(root)),'atlasSize':atlas.size,'records':records},indent=2))
print('Packed',target, target.stat().st_size,'bytes')
