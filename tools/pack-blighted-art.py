"""Extract isolated animation silhouettes before atlas packing (overlapping gutters)."""
from pathlib import Path
from collections import deque
import json, argparse
from PIL import Image
ROOT=Path(__file__).resolve().parents[1]
parser=argparse.ArgumentParser()
parser.add_argument('--name',default='enemies-blighted');parser.add_argument('--rows',type=int,default=4)
parser.add_argument('--width',type=int,default=96);parser.add_argument('--height',type=int,default=112);parser.add_argument('--target-height',type=int,default=94)
args=parser.parse_args();name=args.name;rows=args.rows;cw=args.width;ch=args.height
source=ROOT/f'assets/art/source/{name}.png' 
im=Image.open(source).convert('RGBA');w,h=im.size;alpha=im.getchannel('A').tobytes();seen=bytearray(w*h);groups=[]
for seed,v in enumerate(alpha):
    if v<150 or seen[seed]:continue
    q=deque([seed]);seen[seed]=1;points=[]
    while q:
        i=q.popleft();points.append(i);x=i%w;y=i//w
        for yy in range(max(0,y-1),min(h,y+2)):
            for xx in range(max(0,x-1),min(w,x+2)):
                j=yy*w+xx
                if alpha[j]>=150 and not seen[j]:seen[j]=1;q.append(j)
    if len(points)>1000:groups.append(points)
assert len(groups)==rows*4, f'Expected {rows*4} complete silhouettes, found {len(groups)}'
groups.sort(key=lambda pts:max(i//w for i in pts))
ordered=[]
for r in range(rows):ordered.extend(sorted(groups[r*4:r*4+4],key=lambda pts:sum(i%w for i in pts)/len(pts)))
boxes={}
for index,pts in enumerate(ordered):
    left=min(i%w for i in pts);right=max(i%w for i in pts)+1
    top=min(i//w for i in pts);bottom=max(i//w for i in pts)+1
    row=index//4;col=index%4
    assert (row,col) not in boxes
    boxes[row,col]=(left,top,right,bottom)
    # Copy source pixels verbatim; isolate frames whose bounding boxes overlap.
    mask=Image.new('L',(right-left,bottom-top));pixels=mask.load()
    for i in pts:pixels[i%w-left,i//w-top]=255
    cell=im.crop((left,top,right,bottom));cell.putalpha(mask)
    dest=ROOT/f'tmp/{name}-frame-{row}-{col}.png';dest.parent.mkdir(exist_ok=True);cell.save(dest)
metadata={'source':str(source.relative_to(ROOT)).replace('\\','/'),'mode':'builtin image generation; silhouette extraction and nearest-neighbour packing','rows':rows,'columns':4,'cellWidth':cw,'cellHeight':ch,'pivot':[cw//2,ch-6],'sourceBounds':[list(boxes[r,c]) for r in range(rows) for c in range(4)],'spriteRects':[]}
atlas=Image.new('RGBA',(cw*4,ch*rows))
for row in range(rows):
    cells=[Image.open(ROOT/f'tmp/{name}-frame-{row}-{c}.png') for c in range(4)]
    scale=min(args.target_height/max(c.height for c in cells),(cw-8)/max(c.width for c in cells))
    for col,cell in enumerate(cells):
        cell=cell.resize((round(cell.width*scale),round(cell.height*scale)),Image.Resampling.NEAREST)
        x=col*cw+(cw-cell.width)//2;y=row*ch+ch-6-cell.height
        atlas.alpha_composite(cell,(x,y));metadata['spriteRects'].append([x,y,cell.width,cell.height])
out=ROOT/'assets/art/sprites';atlas.save(out/f'{name}.png',optimize=True)
(out/f'{name}.json').write_text(json.dumps(metadata,indent=2))
preview=Image.new('RGB',atlas.size,'#292d27');preview.paste(atlas,mask=atlas.getchannel('A'));preview.resize((atlas.width*3,atlas.height*3),Image.Resampling.NEAREST).save(out/f'{name}-preview.png')
print(f'Packed {rows*4} complete {name} silhouettes; preserved full weapons and shared row scale.')
