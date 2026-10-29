from PIL import Image,ImageDraw
from pathlib import Path
import json
root=Path(__file__).resolve().parents[1];src=root/'assets/art/sprites';out=root/'docs/dungeon-character-art';out.mkdir(parents=True,exist_ok=True)
meta=json.loads((src/'dungeon-characters.json').read_text());assert(meta['frameWidth'],meta['frameHeight'])==(60,80)
gallery=Image.new('RGB',(1000,760),'#252b27');d=ImageDraw.Draw(gallery);results=[]
for row,name in enumerate(meta['characters']):
    im=Image.open(src/(name+'.png')).convert('RGBA');assert im.size==(960,480),name
    assert set(im.getchannel('A').tobytes())<={0,255},'Antialiased source pixels'
    counts=[];frames=[]
    for state in range(6):
        cells=[im.crop((f*60,state*80,(f+1)*60,(state+1)*80)) for f in range(16)]
        assert all(c.getbbox() for c in cells),f'{name}: blank animation frame'
        unique=len({c.tobytes() for c in cells});assert unique>=3,f'{name}: static row {state}';counts.append(unique)
        tile=cells[8].resize((120,160),Image.Resampling.NEAREST);gallery.paste(tile,(170+state*135,row*190+15),tile);d.text((170+state*135,row*190+178),meta['rows'][state],fill='#d9c8a0')
        frames+=cells
    d.text((8,row*190+80),name.replace('dungeon-',''),fill='#d9c8a0')
    previews=[]
    for cell in frames:
        preview=Image.new('RGB',(240,320),'#252b27');tile=cell.resize((240,320),Image.Resampling.NEAREST);preview.paste(tile,(0,0),tile);previews.append(preview)
    previews[0].save(out/(name+'.gif'),save_all=True,append_images=previews[1:],duration=83,loop=0)
    results.append({'name':name,'frameSize':[60,80],'frames':96,'distinctFramesByState':counts,'opaquePixelEdges':True})
gallery.save(out/'contact-sheet.png');(out/'asset-verification.json').write_text(json.dumps(results,indent=2))
print(json.dumps(results))
