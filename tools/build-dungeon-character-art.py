"""Native 60 x 80 pixel character sheets; no resized source images or antialiasing."""
from PIL import Image, ImageDraw
from pathlib import Path
import math, random, json
ROOT=Path(__file__).resolve().parents[1]
OUT=ROOT/'assets/art/sprites'
STATES=['idle','anticipation','execution','recovery','hit','death']
W,H,N=60,80,16
INK='#101713'; BARK=['#202c24','#354333','#526044','#73815a']; BONE=['#6b705a','#9f9f7e','#d0c7a1','#e4d6b0']; IRON=['#263532','#43574f','#718174','#a6ac91']; BRASS=['#544831','#877143','#b39b60','#dac386']
def make(kind,state,k):
    im=Image.new('RGBA',(W,H));d=ImageDraw.Draw(im);t=k/(N-1);rng=random.Random(419)
    wind=t if state=='anticipation' else 1-t if state=='execution' else 0
    breath=round(math.sin(k/N*math.tau)) if state=='idle' else 0
    recoil=round(math.sin(t*math.pi)*3) if state=='hit' else 0
    collapse=round(t*13) if state=='death' else 0
    def poly(p,fill,outline=INK):d.polygon([(round(x),round(y)) for x,y in p],fill=fill);d.line([(round(x),round(y)) for x,y in p+[p[0]]],fill=outline,width=1)
    def rect(b,c):d.rectangle(tuple(round(v) for v in b),fill=c)
    def line(p,c,width=1):d.line([(round(x),round(y)) for x,y in p],fill=c,width=width)
    y=breath+recoil+collapse+(round(math.sin(t*math.pi)*2) if state=='recovery' else 0)
    if kind=='grove-mother':
        # Uneven roots, narrow trunk waist, shrouded female bone mask and thorn crown.
        poly([(13,65),(19,52),(38,52),(46,64),(56,73),(49,76),(35,72),(28,76),(18,72),(4,76),(7,72)],BARK[0])
        for p in [[(7,74),(19,65),(23,54)],[(18,72),(26,61),(25,48)],[(29,74),(33,60),(33,49)],[(48,74),(39,64),(37,52)]]:line(p,BARK[2],2);line([(x+1,y-1) for x,y in p],BARK[1])
        poly([(21,31+y),(39,31+y),(43,47+y),(38,64),(31,70),(24,64),(17,51+y)],BARK[1])
        poly([(23,35+y),(29,39+y),(28,63),(22,58)],BARK[2]);poly([(34,36+y),(39,40+y),(37,61),(32,66)],BARK[0])
        for side in [-1,1]:
            lift=round(wind*9);sx=30+side*12
            poly([(sx-side*3,33+y),(sx+side*4,31+y),(sx+side*8,43+y-lift),(sx+side*11,57+y-lift),(sx+side*7,62+y-lift),(sx+side*4,46+y-lift)],BARK[1])
            line([(sx+side*3,34+y),(sx+side*6,45+y-lift),(sx+side*9,57+y-lift)],BARK[3])
            for j in range(3):line([(sx+side*9,57+y-lift),(sx+side*(10+j),64+y-lift+j%2)],BONE[0])
        # Mantle folds and scattered moss, distinct from a rectangular trunk.
        for i in range(65):
            x=rng.randrange(20,40);py=rng.randrange(34,63)+y
            if 0<=py<70:rect((x,py,x+(i%3==0),py),BARK[(i%3)+1])
        poly([(24,40+y),(35,40+y),(38,50+y),(34,58+y),(27,60+y),(23,52+y)],INK)
        core=BRASS[3] if state=='recovery' else '#b69462'
        poly([(29,42+y),(34,45+y),(33,54+y),(29,57+y),(26,51+y)],core,BRASS[0]);line([(30,46+y),(30,53+y)],'#eedb9f')
        poly([(22,21+y),(26,17+y),(35,18+y),(40,25+y),(37,34+y),(30,39+y),(23,33+y)],BARK[0])
        poly([(26,22+y),(35,21+y),(37,27+y),(34,34+y),(29,36+y),(25,31+y)],BONE[2]);line([(26,23+y),(29,22+y),(33,22+y)],BONE[3]);rect((26,26+y,29,29+y),INK);rect((33,26+y,35,29+y),INK)
        rect((27,27+y,28,27+y),'#a5be8e');rect((33,27+y,34,27+y),'#a5be8e');line([(30,29+y),(29,32+y),(31,32+y)],BONE[0]);line([(28,34+y),(32,34+y)],BONE[0])
        for side in [-1,1]:
            p=[(30+side*9,25+y),(30+side*13,18+y),(30+side*15,7+y),(30+side*20,2+y)]
            line(p,INK,4);line(p,BARK[2],2);line([(30+side*13,18+y),(30+side*21,14+y),(30+side*23,8+y)],BARK[1],2)
            line([(30+side*15,9+y),(30+side*10,7+y),(30+side*9,3+y)],BONE[0])
        for i in range(12):
            px=20+(i*7)%21;py=34+(i*11)%18+y;rect((px,py,px+1,py+2),'#83905b')
    elif kind=='orchard-custodian':
        for sx in [19,35]:poly([(sx,57+y),(sx+7,57+y),(sx+8,71),(sx+11,74),(sx-3,75),(sx-1,68)],IRON[1]);line([(sx+1,60+y),(sx+1,71),(sx+6,72)],IRON[3])
        poly([(20,27+y),(39,27+y),(45,39+y),(40,59+y),(32,65+y),(21,60+y),(15,41+y)],IRON[1]);line([(20,30+y),(18,41+y),(23,58+y)],IRON[3]);line([(38,30+y),(42,39+y),(37,57+y)],IRON[0])
        # Sixteen distinct rotations of a hand-pixelled, broken pressure wheel.
        cx,cy=30,43+y;d.ellipse((cx-16,cy-16,cx+16,cy+16),fill=INK);d.ellipse((cx-14,cy-14,cx+14,cy+14),outline=BRASS[2],width=2);d.ellipse((cx-12,cy-12,cx+12,cy+12),outline=BRASS[0])
        angle=k/N*math.tau/3 if state=='idle' else wind*.7
        for i in range(6):
            a=angle+i*math.tau/6;ex=round(cx+13*math.cos(a));ey=round(cy+13*math.sin(a));line([(cx,cy),(ex,ey)],BRASS[1],2);rect((ex,ey,ex+1,ey+1),BRASS[3])
        poly([(25,36+y),(35,36+y),(37,47+y),(33,52+y),(26,50+y),(23,43+y)],IRON[0]);rect((27,38+y,33,48+y),BRASS[1]);rect((28,40+y,32,46+y),'#e1c580');rect((30,40+y,31,44+y),'#f2dfac');line([(27,35+y),(28,32+y),(32,32+y),(34,35+y)],BRASS[2])
        for side in [-1,1]:
            sx=30+side*18;lift=round(wind*(10 if side>0 else 6))
            poly([(sx-side*2,28+y),(sx+side*4,30+y),(sx+side*5,48+y-lift),(sx+side*4,59+y-lift),(sx-side*4,59+y-lift),(sx-side*3,46+y-lift)],IRON[0])
            line([(sx,32+y),(sx,51+y-lift)],IRON[3],2);rect((sx-4,51+y-lift,sx+4,54+y-lift),BRASS[1]);rect((sx-5,57+y-lift,sx+5,61+y-lift),IRON[1]);line([(sx-4,58+y-lift),(sx+3,58+y-lift)],IRON[3])
            if side>0:rect((sx-2,56+y-lift,sx,57+y-lift),BRASS[3])
        # Verran's decayed face under a dented founder's circlet, not a robot.
        poly([(23,12+y),(28,8+y),(36,10+y),(39,16+y),(37,24+y),(31,29+y),(25,25+y)],IRON[0]);poly([(26,14+y),(34,13+y),(36,18+y),(33,25+y),(29,26+y),(25,21+y)],BONE[1]);line([(26,15+y),(30,14+y),(33,15+y)],BONE[2]);rect((26,18+y,29,20+y),INK);rect((32,18+y,35,20+y),INK);rect((27,19+y,28,19+y),'#9fbca3');rect((33,19+y,34,19+y),'#9fbca3');line([(30,20+y),(29,23+y),(32,23+y)],BONE[0]);line([(28,25+y),(33,25+y)],INK)
        line([(23,13+y),(27,11+y),(35,12+y),(38,14+y)],BRASS[1],2);rect((24,8+y,26,12+y),BRASS[2]);rect((31,7+y,33,11+y),BRASS[3]);rect((36,10+y,37,13+y),BRASS[2])
        for i in range(38):
            px=rng.randrange(17,44);py=rng.randrange(29,60)+y
            if im.getpixel((px,min(79,py)))[3]:rect((px,py,px,py),IRON[i%3])
        for x in [21,25,37,40]:line([(x,52+y),(x-2,65+y),(x+1,70)],'#63553d')
    elif kind=='sister-tamsin':
        # Native human proportions and Covenant ivory/brass cloth ramps.
        for x in [24,33]:poly([(x,57+y),(x+5,57+y),(x+5,69),(x+7,73),(x-1,74)],'#34362e');line([(x+1,64),(x+1,71),(x+5,72)],'#6a6250')
        poly([(23,31+y),(36,31+y),(40,43+y),(37,61+y),(31,65+y),(23,61+y),(20,44+y)],'#6c6a51');poly([(24,33+y),(33,33+y),(36,57+y),(31,61+y),(24,58+y)],'#b5b098');line([(24,36+y),(25,52+y),(28,58+y)],'#ddd1af');line([(32,35+y),(34,51+y),(32,60+y)],'#858370');rect((22,47+y,38,49+y),'#715d3d');rect((28,47+y,31,49+y),'#c4a15b')
        gesture=round(math.sin(t*math.pi)*3) if state in ['execution','anticipation'] else 0
        poly([(21,35+y),(17,40+y),(18,50+y),(23,52+y),(25,48+y),(22,44+y)],'#a69f83');poly([(37,35+y),(42,40+y-gesture),(40,51+y-gesture),(35,51+y),(34,47+y)],'#d4c9a6');line([(18,43+y),(21,48+y),(26,47+y)],'#ddd0a5',2);rect((23,46+y,26,48+y),'#c3a785');line([(39,42+y-gesture),(37,48+y-gesture)],'#f0e1bd');rect((35,48+y-gesture,38,51+y-gesture),'#c7aa87')
        poly([(22,16+y),(25,11+y),(33,10+y),(39,16+y),(38,29+y),(34,34+y),(24,30+y),(20,24+y)],'#484636');poly([(24,18+y),(34,16+y),(37,21+y),(35,29+y),(30,32+y),(25,28+y)],'#bc9e7b');line([(26,18+y),(31,17+y),(34,19+y)],'#e0c19a');line([(25,23+y),(28,23+y)],'#332f29');line([(32,22+y),(35,22+y)],'#332f29');rect((29,25+y,30,27+y),'#90704e');line([(29,29+y),(32,29+y)],'#684e3b');line([(23,17+y),(28,13+y),(34,14+y),(37,18+y)],'#a99266',3);line([(23,18+y),(22,26+y),(25,31+y)],'#6e6046',2)
        # Travel-worn white mantle and a small Covenant sun brooch.
        if state=='execution' and k%4 in [1,2]:rect((29,29+y,32,30+y),'#684e3b')
        if state=='idle' and k in [7,8]:line([(25,23+y),(28,23+y)],'#a08465');line([(32,22+y),(35,22+y)],'#a08465')
        line([(22,31+y),(29,37+y),(37,31+y)],'#e1d5ae',2);rect((29,35+y,31,37+y),'#c4a15b')
    else:
        # Edda: carved bone with cracks, hanging moss, moving jaw and eye glint.
        y+=round(wind*2)
        rect((12,68,48,73),'#344331');line([(11,73),(22,68),(34,72),(48,69)],'#687250',2)
        jaw=round((math.sin(t*math.pi*3)+1)*1.4) if state=='execution' else 0
        poly([(19,43+y),(22,37+y),(33,34+y),(42,39+y),(44,48+y),(40,58+y),(34,62+y),(23,59+y),(18,52+y)],BONE[0]);poly([(21,42+y),(26,38+y),(35,37+y),(40,41+y),(41,49+y),(36,57+y),(25,56+y),(21,50+y)],BONE[2]);line([(24,40+y),(29,38+y),(35,39+y)],BONE[3]);poly([(23,45+y),(28,44+y),(29,49+y),(25,52+y),(22,50+y)],INK);poly([(33,44+y),(38,44+y),(39,49+y),(35,51+y),(32,49+y)],INK);rect((25,47+y,26,48+y),'#96b695');rect((35,46+y,36,48+y),'#96b695');poly([(30,49+y),(32,54+y),(28,55+y)],'#424d3b');poly([(24,59+y+jaw),(37,59+y+jaw),(35,65+y+jaw),(27,65+y+jaw)],BONE[1]);line([(26,60+y+jaw),(35,60+y+jaw)],BONE[3]);
        for x in [26,29,32,35]:rect((x,56+y,x+1,59+y),BONE[2]);line([(33,37+y),(31,41+y),(33,43+y)],BONE[0]);line([(39,53+y),(37,56+y)],BONE[0])
        for i in range(14):px=18+(i*7)%26;py=37+(i*3)%9;rect((px,py,px+1,py+2),BARK[(i%3)+1])
    if state=='death':
        # Final frames settle into a transparent, collapsed silhouette.
        if t>.35:
            copy=im.copy();im=Image.new('RGBA',(W,H));height=max(8,round(H*(1-(t-.35)*.7)));im.alpha_composite(copy.resize((W,height),Image.Resampling.NEAREST),(0,H-height))
    return im
def main():
    OUT.mkdir(parents=True,exist_ok=True);meta={'frameWidth':W,'frameHeight':H,'frames':N,'rows':STATES,'fps':12,'filter':'nearest','characters':[]}
    for kind in ['grove-mother','orchard-custodian','sister-tamsin','edda-skull']:
        sheet=Image.new('RGBA',(W*N,H*len(STATES)))
        for row,state in enumerate(STATES):
            for k in range(N):sheet.paste(make(kind,state,k),(k*W,row*H))
        name='dungeon-'+kind;sheet.save(OUT/(name+'.png'));meta['characters'].append(name)
    (OUT/'dungeon-characters.json').write_text(json.dumps(meta,indent=2)+'\n')
if __name__=='__main__':main()
