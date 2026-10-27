"""Validate independent bound-servant atlases and their provenance."""
import hashlib,json
from pathlib import Path
from PIL import Image
ROOT=Path(__file__).resolve().parents[1]
results=[]
for name in ['bound-dead-mummy','bound-dead-specter','bound-dead-knight']:
 path=ROOT/'assets/art/sprites'/f'{name}.png'
 im=Image.open(path).convert('RGBA')
 assert im.size==(384,112),name
 assert set(im.getchannel('A').get_flattened_data())=={0,255},name
 hashes=[]
 for i in range(4):
  frame=im.crop((i*96,0,(i+1)*96,112));box=frame.getchannel('A').getbbox()
  assert box and box[0]>0 and box[1]>0 and box[2]<96 and box[3]<112,(name,i,box)
  hashes.append(hashlib.sha256(frame.tobytes()).hexdigest())
 assert len(set(hashes))==4,name
 assert (ROOT/'assets/art/source'/f'{name}.png').is_file()
 assert (ROOT/'assets/art/source'/f'{name}-prompt.txt').is_file()
 if name!='bound-dead-mummy':
  greater='lich-acolyte' if name.endswith('specter') else 'lich-deathknight'
  assert path.read_bytes()!=(ROOT/'assets/art/sprites'/f'{greater}.png').read_bytes()
 results.append({'asset':str(path.relative_to(ROOT)),'size':im.size,'binaryAlpha':True,'clearCellMargins':True,'distinctFrames':4})
(ROOT/'docs/bound-dead/art-verification.json').write_text(json.dumps({'pass':True,'assets':results},indent=2)+'\n')
print('PASS: three independent four-frame pixel art atlases, binary transparency, margins and source/prompt provenance.')
