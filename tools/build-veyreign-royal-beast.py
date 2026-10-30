"""Native 60x80 royal blood-beast: 48 frames x 7 states, no resized source art."""
from PIL import Image,ImageDraw
from pathlib import Path
import math,json
N=48;states=['transformation','idle','anticipation','execution','recovery','hit','death'];sheet=Image.new('RGBA',(60*N,80*len(states)))
for row,state in enumerate(states):
 for f in range(N):
  im=Image.new('RGBA',(60,80));d=ImageDraw.Draw(im);t=f/(N-1);wave=math.sin(f*math.tau/12);bob=round(math.sin(f*math.tau/24)*1.3)
  growth=t if row==0 else 1;death=t if row==6 else 0
  cy=35+bob+round(death*22);spread=round(8+20*growth*(1-death*.7));tip=round(10+wave*6*(.3+.7*growth)+death*30)
  if row==2:tip+=round(t*9)
  if row==3:tip-=round(math.sin(t*math.pi)*9)
  # Spined wings: individual fingers, layered membranes and arterial ribs.
  for side in [-1,1]:
   at=lambda x,y:(30+side*x,cy+y)
   root=at(7,3);tippt=(30+side*spread,tip)
   vertices=[root,at(spread-3,-29),tippt,at(spread,-8),at(spread-4,16),at(18,7),at(16,24),at(10,14),at(7,22)]
   d.polygon(vertices,fill='#321628',outline='#110d18')
   d.polygon([root,tippt,at(spread-4,16)],fill='#6c203b')
   d.polygon([root,at(spread-4,16),at(18,7),at(16,24)],fill='#491c36')
   for end in [tippt,at(spread-4,16),at(16,24),at(7,22)]:
    d.line([root,end],fill='#b1848a',width=2);d.line([at(6,3),end],fill='#e0b39a',width=1)
   for x,y in [(spread-3,-26),(spread-1,-15),(spread-3,5),(19,12),(14,20)]:
    d.polygon([at(x,y+5),at(x+3,y-5),at(x-2,y)],fill='#c6b398',outline='#32232d')
   d.line([root,at(spread-7,4)],fill='#c13654',width=1)
   # Huge forearms and hooked royal talons.
   d.polygon([at(5,4),at(10,10),at(11,24),at(7,28),at(5,15)],fill='#56505d',outline='#14121c')
   for finger in range(3):d.line([at(7+finger,23),at(8+finger,29+finger%2)],fill='#ecdfc0',width=1)
   d.polygon([at(4,20),at(8,30),at(7,37),at(2,37),at(2,27)],fill='#332f3d',outline='#15111b')
   d.line([at(3,35),at(8,37)],fill='#c9b99e',width=2)
  # Pale muscular torso, exposed blood-heart, segmented gold regalia.
  d.polygon([(23,cy-3),(30,cy-8),(37,cy-3),(35,cy+20),(30,cy+27),(25,cy+20)],fill='#716274',outline='#15111c')
  d.polygon([(25,cy+2),(29,cy+6),(28,cy+14),(24,cy+10)],fill='#ac8c91')
  d.polygon([(35,cy+2),(31,cy+6),(32,cy+14),(36,cy+10)],fill='#ac8c91')
  d.line([(30,cy+6),(30,cy+23)],fill='#302332')
  for y in [12,17,22]:d.line([(26,cy+y),(34,cy+y)],fill='#413141')
  d.polygon([(28,cy+2),(30,cy),(33,cy+3),(31,cy+8),(28,cy+6)],fill='#ce2447');d.point((30,cy+2),fill='#ffc0a0')
  for side in [-1,1]:
   d.polygon([(30+side*7,cy-4),(30+side*12,cy-5),(30+side*8,cy+3)],fill='#bd9558',outline='#3c2830')
   d.line([(30+side*8,cy-3),(30+side*4,cy+8)],fill='#e8c480')
  # Heavy bat muzzle, large ivory fangs and a five-pronged royal crown.
  d.polygon([(23,cy-13),(21,cy-25),(28,cy-20),(32,cy-20),(39,cy-25),(37,cy-13),(34,cy-5),(26,cy-5)],fill='#65566b',outline='#120f1a')
  d.polygon([(24,cy-19),(30,cy-15),(36,cy-19),(34,cy-10),(26,cy-10)],fill='#b18c91')
  d.rectangle((24,cy-16,27,cy-15),fill='#f52c4d');d.rectangle((33,cy-16,36,cy-15),fill='#f52c4d')
  d.rectangle((27,cy-10,33,cy-7),fill='#26101f')
  d.polygon([(26,cy-11),(28,cy-11),(28,cy-5)],fill='#f1e1bf');d.polygon([(32,cy-11),(34,cy-11),(32,cy-5)],fill='#f1e1bf')
  d.polygon([(23,cy-21),(21,cy-31),(27,cy-26),(30,cy-34),(33,cy-26),(39,cy-31),(37,cy-21)],fill='#b88b46',outline='#30202a')
  d.line([(24,cy-23),(36,cy-23)],fill='#efd197',width=2);d.rectangle((29,cy-26,31,cy-23),fill='#e13c52')
  # Transformation blood ribbons; death fractures the crown and collapses wings.
  if row==0:
   for k in range(5):
    x=round(30+math.sin(t*math.tau*2+k)*((1-t)*22+3));y=round(72-t*60+k*3)
    d.line([(30,76),(x,y)],fill='#a72549',width=1);d.rectangle((x,y,x+1,y+2),fill='#f16f77')
  if row==5:d.line([(26,cy-2),(34,cy+7)],fill='#f2c2bb',width=2)
  if row==6:im.putalpha(im.getchannel('A').point(lambda a:round(a*max(0,1-t*.95))))
  sheet.alpha_composite(im,(f*60,row*80))
out=Path('assets/art/sprites');sheet.save(out/'veyreign-royal-blood-beast.png');(out/'veyreign-royal-blood-beast.json').write_text(json.dumps({'width':60,'height':80,'frames':N,'states':states,'fps':12,'transformSeconds':4,'palette':'ash violet, royal crimson, antique gold, ivory'},indent=2))
preview=Image.new('RGBA',(60*7,80),(17,12,22,255))
for r in range(7):preview.alpha_composite(sheet.crop((24*60,r*80,25*60,(r+1)*80)),(r*60,0))
preview.resize((1260,240),Image.Resampling.NEAREST).save('tmp/royal-blood-beast-review.png')
