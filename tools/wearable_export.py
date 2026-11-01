"""Isolate the principal item cluster from neighbouring-row overflow."""
from collections import deque
def authored_cells(source,rows):
 """Find real row gutters per direction; generated masters are not exact grids."""
 result={}
 for col in range(4):
  column=source.crop((round(col*source.width/4),0,round((col+1)*source.width/4),source.height))
  alpha=column.getchannel('A');data=list(alpha.getdata());w,h=column.size
  occupied=[y for y in range(h) if sum(v>0 for v in data[y*w:(y+1)*w])>=3]
  assert occupied,'Empty direction column'
  gaps=[(b-a-1,(a+b)//2) for a,b in zip(occupied,occupied[1:]) if b-a>1]
  assert len(gaps)>=rows-1,('Missing authored row gutters',col,len(gaps),rows)
  gutters=sorted(g[1] for g in sorted(gaps,reverse=True)[:rows-1])
  limits=[0]+gutters+[h]
  for row in range(rows):result[row,col]=column.crop((0,limits[row],w,limits[row+1]))
 return result
def isolate_cell(cell,part=None):
 alpha=cell.getchannel('A');w,h=cell.size;data=list(alpha.getdata());seen=set();components=[]
 for start,value in enumerate(data):
  if not value or start in seen:continue
  seen.add(start);queue=deque([start]);points=[]
  while queue:
   i=queue.popleft();points.append(i);x,y=i%w,i//w
   for nx,ny in [(x+dx,y+dy) for dx in [-1,0,1] for dy in [-1,0,1] if dx or dy]:
    n=ny*w+nx
    if 0<=nx<w and 0<=ny<h and data[n] and n not in seen:seen.add(n);queue.append(n)
  components.append((points,(min(i%w for i in points),min(i//w for i in points),max(i%w for i in points)+1,max(i//w for i in points)+1)))
 if not components:return cell
 components.sort(key=lambda c:len(c[0]),reverse=True);main,box=components[0];largest=len(main);accepted=[box];keep=set(main)
 for points,b in components[1:]:
  # Adjacent details belong to the drawing; a second leg may be disconnected.
  near=any(max(0,a[0]-b[2],b[0]-a[2])<=min(w,h)*.035 and max(0,a[1]-b[3],b[1]-a[3])<=min(w,h)*.035 for a in accepted)
  overlap=max(0,min(box[3],b[3])-max(box[1],b[1]))/max(1,min(box[3]-box[1],b[3]-b[1]))
  second_leg=part==2 and len(points)>largest*.3 and overlap>.7
  if near or second_leg:keep.update(points);accepted.append(b)
 for i in range(len(data)):
  if i not in keep:data[i]=0
 alpha.putdata(data);cell.putalpha(alpha);return cell
