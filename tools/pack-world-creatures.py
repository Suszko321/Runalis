"""Register reviewed creature redraws in the existing atlas contracts.
Nearest-neighbour packing only. All row/column indices and ground pivots survive.
Reject an entire animation row when any candidate frame touches its source cell.
"""
from pathlib import Path
from PIL import Image
import json, statistics, shutil, sys
root=Path(__file__).resolve().parents[1]
jobs=json.loads(Path(sys.argv[1]).read_text())
report=[]
def cuts(projection,count):
 # Generated sheets preserve pose order but sometimes have unequal gutters.
 # Find the actual transparent lanes instead of slicing a hand at 1/N width.
 gaps=[];start=None
 for i,value in enumerate(projection):
  if not value and start is None:start=i
  if value and start is not None:
   if start>0:gaps.append((i-start,(start+i)//2))
   start=None
 if len(gaps)<count-1:return [round(i*len(projection)/count) for i in range(count+1)]
 selected=sorted(mid for length,mid in sorted(gaps,reverse=True)[:count-1])
 return [0,*selected,len(projection)]

def regions(image,rows,cols):
 alpha=image.getchannel('A').point(lambda a:255 if a>=150 else 0)
 ys=cuts(alpha.getprojection()[1],rows);result=[]
 for row in range(rows):
  band=alpha.crop((0,ys[row],image.width,ys[row+1]));xs=cuts(band.getprojection()[0],cols)
  result.append([(xs[col],ys[row],xs[col+1],ys[row+1]) for col in range(cols)])
 return result

for job in jobs:
 name=job['name'];src=Path(job['path']);original=root/f'backups/world-art-2026-10-18/{name}.png'
 originalMeta=root/f'backups/world-art-2026-10-18/{name}.json'
 metaPath=root/f'assets/art/sprites/{name}.json'
 if not originalMeta.exists():shutil.copy2(metaPath,originalMeta)
 meta=json.loads(originalMeta.read_text());cols,rows=meta['columns'],meta['rows'];cw,ch=meta['cellWidth'],meta['cellHeight']
 old=Image.open(original).convert('RGBA');image=Image.open(src).convert('RGBA');out=old.copy()
 repair=Image.open(job['repairPath']).convert('RGBA') if job.get('repairPath') else None
 primaryRegions=regions(image,rows,cols);repairRegions=regions(repair,rows,cols) if repair else None
 sourceCopy=root/f'assets/art/source/{name}-cohesion.png';shutil.copy2(src,sourceCopy)
 if repair:shutil.copy2(job['repairPath'],root/f'assets/art/source/{name}-cohesion-repair.png')
 frames=[];sourceBounds=[];spriteRects=[];rejected=[];newCount=0
 for row in range(rows):
  rowImage=repair if repair and row in job.get('repairRows',[]) else image
  candidates=[]
  for col in range(cols):
   box=(repairRegions if rowImage is repair else primaryRegions)[row][col]
   frame=rowImage.crop(box);frame.putalpha(frame.getchannel('A').point(lambda a:255 if a>=150 else 0));bbox=frame.getbbox()
   oldCell=old.crop((col*cw,row*ch,(col+1)*cw,(row+1)*ch));oldBbox=oldCell.getbbox()
   clipped=not bbox or bbox[0]<2 or bbox[1]<2 or bbox[2]>frame.width-2 or bbox[3]>frame.height-2
   candidates.append((frame.crop(bbox) if bbox else frame,box,bbox,oldBbox,clipped))
  bad=any(c[-1] for c in candidates)
  if bad:rejected.append(row)
  ratios=[(v[3][3]-v[3][1])/v[0].height for v in candidates]
  scale=statistics.median(ratios)
  scale=min(scale,*[(cw-8)/v[0].width for v in candidates],*[(ch-10)/v[0].height for v in candidates])
  for col,(frame,sourceBox,bbox,oldBbox,clipped) in enumerate(candidates):
   # Metadata can mix retained old rows and new rows by pointing at a registered
   # source atlas; the provenance manifest keeps the original generated sources.
   if not bad:
    frame=frame.resize((max(1,round(frame.width*scale)),max(1,round(frame.height*scale))),Image.Resampling.NEAREST)
    x=col*cw+(cw-frame.width)//2;y=row*ch+ch-6-frame.height
    out.paste((0,0,0,0),(col*cw,row*ch,(col+1)*cw,(row+1)*ch));out.paste(frame,(x,y));newCount+=1
   else:
    x=col*cw+oldBbox[0];y=row*ch+oldBbox[1];frame=old.crop((x,y,col*cw+oldBbox[2],row*ch+oldBbox[3]))
   spriteRects.append([x,y,frame.width,frame.height]);sourceBounds.append([x,y,x+frame.width,y+frame.height])
   frames.append({'row':row,'column':col,'retained':bad,'candidate':'repair' if rowImage is repair else 'primary','sourceCrop':list(sourceBox),'sourceBounds':bbox,'nativeBounds':[x,y,frame.width,frame.height]})
 target=root/f'assets/art/sprites/{name}.png';out.save(target,optimize=True)
 # A native production master makes packing reproducible and keeps old source
 # validation meaningful for all rows, including deliberately retained frames.
 master=root/f'assets/art/source/{name}-cohesion-master.png';out.save(master,optimize=True)
 meta.update({'source':master.relative_to(root).as_posix(),'mode':'reviewed built-in redraw; nearest-neighbour registration; binary alpha','sourceBounds':sourceBounds,'spriteRects':spriteRects})
 metaPath.write_text(json.dumps(meta,indent=2))
 report.append({'name':name,'framesRedrawn':newCount,'framesTotal':rows*cols,'rejectedRows':rejected,'bytesBefore':original.stat().st_size,'bytesAfter':target.stat().st_size,'frames':frames})
(root/'docs/world-art/creature-packing.json').write_text(json.dumps(report,indent=2))
print(json.dumps([{k:v for k,v in r.items() if k!='frames'} for r in report],indent=2))
