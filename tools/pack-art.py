"""Deterministic source-atlas packing. Run with --help; preserves source files."""
import argparse, json
import importlib.util
from pathlib import Path
from PIL import Image, ImageDraw

ROOT = Path(__file__).resolve().parents[1]
spec=importlib.util.spec_from_file_location('art_cleanup',ROOT/'tools/art-cleanup.py')
cleanup=importlib.util.module_from_spec(spec);spec.loader.exec_module(cleanup)

def grid_boxes(source,rows,cols):
    """Find the emptiest cut near each expected gutter, independently per column."""
    im=Image.open(source).convert('RGBA');a=im.getchannel('A').point(lambda v:255 if v>=150 else 0)
    def choose(values,nominal,radius):
        return min(range(max(1,round(nominal-radius)),min(len(values)-1,round(nominal+radius))),key=lambda i:(values[i],abs(i-nominal)))
    counts=[sum(v>0 for v in a.crop((x,0,x+1,a.height)).getdata()) for x in range(a.width)]
    xs=[0]+[choose(counts,c*a.width/cols,a.width/cols*.2) for c in range(1,cols)]+[a.width]
    columns=[]
    for c in range(cols):
        part=a.crop((xs[c],0,xs[c+1],a.height))
        counts=[sum(v>0 for v in part.crop((0,y,part.width,y+1)).getdata()) for y in range(part.height)]
        ys=[0]+[choose(counts,r*a.height/rows,a.height/rows*.25) for r in range(1,rows)]+[a.height]
        columns.append(ys)
    return [(xs[c],columns[c][r],xs[c+1],columns[c][r+1]) for r in range(rows) for c in range(cols)]

def bands(values, count):
    # Locate gutters rather than trusting a generator's exact canvas dimensions.
    occupied = [i for i, n in enumerate(values) if n > 2]
    if not occupied:
        raise ValueError('Empty source')
    gaps = []
    for a, b in zip(occupied, occupied[1:]):
        if b - a > 3:
            gaps.append((b-a, (a+b)//2))
    splits = sorted(p for _, p in sorted(gaps, reverse=True)[:count-1])
    if len(splits) != count-1:
        raise ValueError(f'Expected {count} isolated bands; inspect source gutters')
    return list(zip([0]+splits, splits+[len(values)]))

def pack(source, name, rows, cols, width, height, target_height, source_boxes=None):
    image = Image.open(source).convert('RGBA')
    # Generated transparency can contain low-alpha edge specks; binary alpha is
    # intentional at native pixel scale. White backgrounds are not auto-erased.
    alpha = image.getchannel('A').point(lambda a: 255 if a >= 150 else 0)
    image.putalpha(alpha)
    counts_y = [sum(v > 0 for v in alpha.crop((0,y,image.width,y+1)).getdata()) for y in range(image.height)]
    cells = []
    bounds = []
    packed_bounds = []
    boxes=[]
    if source_boxes is None:
        try:
            for top, bottom in bands(counts_y, rows):
                a = alpha.crop((0,top,image.width,bottom))
                counts_x = [sum(v > 0 for v in a.crop((x,0,x+1,a.height)).getdata()) for x in range(a.width)]
                boxes.extend((left,top,right,bottom) for left,right in bands(counts_x, cols))
        except ValueError:
            # Mixed-size prop rows may overlap vertically while columns remain isolated.
            counts_x=[sum(v>0 for v in alpha.crop((x,0,x+1,image.height)).getdata()) for x in range(image.width)]
            columns=[]
            for left,right in bands(counts_x,cols):
                a=alpha.crop((left,0,right,image.height))
                counts=[sum(v>0 for v in a.crop((0,y,a.width,y+1)).getdata()) for y in range(a.height)]
                columns.append([(left,top,right,bottom) for top,bottom in bands(counts,rows)])
            boxes=[columns[col][row] for row in range(rows) for col in range(cols)]
    if source_boxes is not None: boxes=source_boxes
    for left,top,right,bottom in boxes:
            cell = image.crop((left,top,right,bottom))
            if source_boxes is not None:cell=cleanup.boundary_fragments(cell)
            box = cell.getchannel('A').getbbox()
            if not box: raise ValueError('Empty cell')
            cells.append(cell.crop(box))
            bounds.append([left+box[0],top+box[1],left+box[2],top+box[3]])
    # Shared scale within each animated row. This preserves stride proportions.
    atlas = Image.new('RGBA',(width*cols,height*rows))
    for i,cell in enumerate(cells):
        row = i//cols
        group = cells[row*cols:(row+1)*cols]
        scale = min(target_height/max(c.height for c in group), (width-8)/max(c.width for c in group))
        size = (max(1,round(cell.width*scale)),max(1,round(cell.height*scale)))
        cell = cell.resize(size, Image.Resampling.NEAREST)
        cell.putalpha(cell.getchannel('A').point(lambda a:255 if a>=150 else 0))
        left=i%cols*width+(width-cell.width)//2
        top=row*height+height-6-cell.height
        atlas.alpha_composite(cell,(left,top))
        packed_bounds.append([left,top,cell.width,cell.height])
    dest = ROOT/'assets/art/sprites'
    dest.mkdir(parents=True,exist_ok=True)
    atlas.save(dest/f'{name}.png',optimize=True)
    meta = {'name':name,'source':str(source),'rows':rows,'columns':cols,'cellWidth':width,'cellHeight':height,'pivot':[width//2,height-6],'sourceBounds':bounds,'spriteRects':packed_bounds}
    (dest/f'{name}.json').write_text(json.dumps(meta,indent=2))
    preview = Image.new('RGB',atlas.size,'#292d27')
    preview.paste(atlas,mask=atlas.getchannel('A'))
    preview.resize((atlas.width*3,atlas.height*3),Image.Resampling.NEAREST).save(dest/f'{name}-preview.png')
    print(json.dumps(meta))

if __name__=='__main__':
    p=argparse.ArgumentParser()
    p.add_argument('source',type=Path);p.add_argument('name')
    p.add_argument('--rows',type=int,default=4);p.add_argument('--cols',type=int,default=4)
    p.add_argument('--width',type=int,default=64);p.add_argument('--height',type=int,default=80)
    p.add_argument('--target-height',type=int,default=64)
    a=p.parse_args();pack(a.source,a.name,a.rows,a.cols,a.width,a.height,a.target_height)
