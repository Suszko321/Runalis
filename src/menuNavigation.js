export function menuDirection(input={}) {
  return input.upPressed?'up':input.downPressed?'down':input.leftPressed?'left':input.rightPressed?'right':null;
}
// Select an option in the pressed direction, preferring the same visual lane.
// At an edge focus stays put instead of wrapping to the opposite side.
export function directionalMenuItem(elements,current,direction) {
  if(!direction||!elements.length)return current;
  if(!current||!elements.includes(current))return elements[0];
  const a=current.getBoundingClientRect(),vertical=direction==='up'||direction==='down';
  const sign=direction==='up'||direction==='left'?-1:1;
  const ax=(a.left+a.right)/2,ay=(a.top+a.bottom)/2;
  let best=current,bestScore=Infinity;
  for(const element of elements){
    if(element===current||element.disabled)continue;
    const b=element.getBoundingClientRect();if(!b.width||!b.height)continue;
    const bx=(b.left+b.right)/2,by=(b.top+b.bottom)/2;
    const forward=(vertical?by-ay:bx-ax)*sign;if(forward<=1)continue;
    const gap=direction==='down'?b.top-a.bottom:direction==='up'?a.top-b.bottom:
      direction==='right'?b.left-a.right:a.left-b.right;
    if(gap < -2)continue;
    const cross=Math.abs(vertical?bx-ax:by-ay);
    const overlap=vertical?Math.min(a.right,b.right)-Math.max(a.left,b.left):Math.min(a.bottom,b.bottom)-Math.max(a.top,b.top);
    const score=forward+cross*2+(overlap<=0?10000:0);
    if(score<bestScore){bestScore=score;best=element;}
  }
  return best;
}
