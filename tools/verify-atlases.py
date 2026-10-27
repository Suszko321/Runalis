from pathlib import Path
from PIL import Image
import json
root=Path(__file__).resolve().parents[1]
results=[]
for meta_path in (root/'assets/art/sprites').glob('*.json'):
    meta=json.loads(meta_path.read_text());im=Image.open(meta_path.with_suffix('.png')).convert('RGBA')
    w,h=meta['cellWidth'],meta['cellHeight'];count=0
    assert im.size==(w*meta['columns'],h*meta['rows']),meta_path.name
    for row in range(meta['rows']):
        for col in range(meta['columns']):
            cell=im.crop((col*w,row*h,(col+1)*w,(row+1)*h));bbox=cell.getchannel('A').getbbox()
            assert bbox and bbox[0]>=2 and bbox[1]>=2 and bbox[2]<=w-2 and bbox[3]<=h-2,(meta_path.name,row,col,bbox)
            assert set(cell.getchannel('A').getdata()) <= {0,255},'Unexpected alpha fringe'
            count+=1
    results.append({'atlas':meta['name'],'frames':count,'bounds':'passed','binaryAlpha':'passed','bytes':meta_path.with_suffix('.png').stat().st_size})
(root/'docs/visual-production/atlas-checks.json').write_text(json.dumps(results,indent=2))
print(json.dumps(results,indent=2))
