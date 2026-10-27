"""Catch wrong-sheet frames, clipping, missing poses and filtered alpha."""
from pathlib import Path
from PIL import Image
import json
root=Path(__file__).resolve().parents[1]
report=[]
for name,rows in [('enemies-blighted',4),('bosses-frontier',3),('enemies-blighted-victims',2),('skeleton-forge',1)]:
    meta=json.loads((root/f'assets/art/sprites/{name}.json').read_text())
    source=Image.open(root/meta['source']).convert('RGBA')
    atlas=Image.open(root/f'assets/art/sprites/{name}.png').convert('RGBA')
    assert atlas.size==(meta['cellWidth']*4,meta['cellHeight']*rows)
    assert set(atlas.getchannel('A').get_flattened_data())=={0,255}
    for i,(x,y,w,h) in enumerate(meta['spriteRects']):
        cell=atlas.crop((x,y,x+w,y+h))
        source_colors={p[:3] for p in source.crop(meta['sourceBounds'][i]).get_flattened_data() if p[3]>=150}
        colors={p[:3] for p in cell.get_flattened_data() if p[3]}
        assert colors and colors.issubset(source_colors),f'{name} frame {i} contains pixels from another source sheet'
        bounds=cell.getchannel('A').getbbox()
        assert bounds and bounds[0]<=2 and bounds[1]<=2 and bounds[2]>=w-2 and bounds[3]>=h-2,f'{name} frame {i} is unexpectedly empty'
        row,col=divmod(i,4)
        assert x>=col*meta['cellWidth']+3 and x+w<=(col+1)*meta['cellWidth']-3
        assert y>=row*meta['cellHeight']+3 and y+h==(row+1)*meta['cellHeight']-6
    report.append({'atlas':name,'frames':rows*4,'sourcePixelsPreserved':True,'binaryAlpha':True,'paddingAndPivots':True})
(root/'docs/enemy-visual-overhaul/atlas-validation.json').write_text(json.dumps(report,indent=2))
print(json.dumps(report,indent=2))
