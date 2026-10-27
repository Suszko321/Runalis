"""Remove small neighboring fragments that cross a generated cell boundary."""
from collections import deque
from PIL import Image

def boundary_fragments(image, threshold=150):
    w,h=image.size
    alpha=bytearray(image.getchannel('A').point(lambda a:255 if a>=threshold else 0).tobytes())
    total=sum(a>0 for a in alpha)
    visited=bytearray(w*h)
    seeds=[y*w+x for y in range(h) for x in range(w) if x<3 or x>=w-3 or y<3 or y>=h-3]
    for seed in seeds:
        if not alpha[seed] or visited[seed]:continue
        todo=deque([seed]);visited[seed]=1;component=[]
        while todo:
            i=todo.popleft();component.append(i);x=i%w;y=i//w
            for j in (i-1 if x else -1,i+1 if x<w-1 else -1,i-w if y else -1,i+w if y<h-1 else -1):
                if j>=0 and alpha[j] and not visited[j]:visited[j]=1;todo.append(j)
        if len(component)<max(24,total*.28):
            for i in component:alpha[i]=0
    image.putalpha(Image.frombytes('L',(w,h),bytes(alpha)))
    return image
