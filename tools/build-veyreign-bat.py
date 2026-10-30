from PIL import Image,ImageDraw
import math,json
from pathlib import Path
out=Path('assets/art/sprites');sheet=Image.new('RGBA',(60*16,80*6))
for row in range(6):
 for frame in range(16):
  im=Image.new('RGBA',(60,80));d=ImageDraw.Draw(im);phase=frame/16*math.tau
  lift=round(math.sin(phase)*3);fold=round(math.cos(phase)*11)
  if row==1:fold-=5;lift+=2
  if row==2:fold+=8
  if row==4:lift-=3
  death=frame/15 if row==5 else 0
  cy=42+lift+round(death*23);spread=round(26*(1-death*.7))
  for side in [-1,1]:
   pts=[(30+side*5,cy-8),(30+side*spread,cy-18+fold),(30+side*(spread-3),cy+11),(30+side*16,cy+1),(30+side*10,cy+13),(30+side*5,cy+6)]
   d.polygon(pts,fill='#4b3349',outline='#160f1d');d.line([pts[0],pts[1]],fill='#a18184',width=2);d.line([pts[1],pts[3]],fill='#72516b');d.line([pts[0],pts[4]],fill='#72516b')
  d.polygon([(23,cy-11),(37,cy-11),(39,cy+11),(33,cy+21),(26,cy+18),(21,cy+5)],fill='#322c3c',outline='#100e19')
  d.polygon([(23,cy-10),(22,cy-28),(29,cy-20),(35,cy-25),(38,cy-10),(33,cy-4),(26,cy-5)],fill='#675363',outline='#17101b')
  d.rectangle((25,cy-14,27,cy-13),fill='#ff3147');d.rectangle((32,cy-14,34,cy-13),fill='#ff3147');d.rectangle((26,cy-8,27,cy-4),fill='#e5d6ba');d.rectangle((32,cy-8,33,cy-4),fill='#e5d6ba')
  d.line([(26,cy+17),(24,cy+26)],fill='#a18580',width=2);d.line([(34,cy+17),(37,cy+26)],fill='#a18580',width=2)
  if row==5:im.putalpha(im.getchannel('A').point(lambda a:round(a*(1-death*.85))))
  sheet.alpha_composite(im,(frame*60,row*80))
sheet.save(out/'veyreign-bat-beast.png')
(out/'veyreign-bat-beast.json').write_text(json.dumps({'width':60,'height':80,'frames':16,'fps':12,'states':['idle','anticipation','execution','recovery','hit','death'],'style':'dark fantasy pixel art'},indent=2))
