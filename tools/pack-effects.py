"""Fixed-grid packing preserves effect centers and relative frame extents."""
from PIL import Image
from pathlib import Path
import json
import sys
import importlib.util
root=Path(__file__).resolve().parents[1]
spec=importlib.util.spec_from_file_location('art_cleanup',root/'tools/art-cleanup.py')
cleanup=importlib.util.module_from_spec(spec);spec.loader.exec_module(cleanup)
name=sys.argv[1] if len(sys.argv)>1 else 'combat-effects'
source=root/f'assets/art/source/{name}.png'
im=Image.open(source).convert('RGBA');out=Image.new('RGBA',(640,640))
for row in range(4):
    for col in range(4):
        frame=im.crop((round(col*im.width/4),round(row*im.height/4),round((col+1)*im.width/4),round((row+1)*im.height/4)))
        if name=='skill-effects' and row in (2,3):
            # The generated water and void silhouettes interleave vertically.
            # Keep their tips while excluding the neighboring effect's palette.
            top,bottom=(.49,.755) if row==2 else (.708,1)
            edges=[0,.228,.471,.752,1] if row==2 else [0,.238,.475,.742,1]
            frame=im.crop((round(edges[col]*im.width),round(top*im.height),round(edges[col+1]*im.width),round(bottom*im.height)))
            pixels=[]
            for r,g,b,a in frame.getdata():
                wrong=(r>b*1.2 and r>g*1.2) if row==2 else (b>r*1.2 and b>g*.8)
                pixels.append((r,g,b,0 if wrong else a))
            frame.putdata(pixels)
        frame=cleanup.boundary_fragments(frame,170)
        frame.thumbnail((148,148),Image.Resampling.NEAREST)
        frame.putalpha(frame.getchannel('A').point(lambda a:255 if a>=170 else 0))
        out.alpha_composite(frame,(col*160+(160-frame.width)//2,row*160+(160-frame.height)//2))
out.save(root/f'assets/art/sprites/{name}.png')
(root/f'assets/art/sprites/{name}.json').write_text(json.dumps({'name':name,'source':str(source),'rows':4,'columns':4,'cellWidth':160,'cellHeight':160,'pivot':[80,80]},indent=2))
