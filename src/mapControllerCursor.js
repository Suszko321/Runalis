const clamp=(value,min,max)=>Math.max(min,Math.min(max,value));
const axis=value=>{const n=clamp(Number(value)||0,-1,1);return Math.abs(n)<.22?0:n;};

// Screen-space cursor: its size and speed stay constant while the map zooms.
export function bindMapControllerCursor(el,viewport,key,{pan,zoom}){
 const node=viewport.querySelector('.survey-controller-cursor');
 const state=el.surveyCursor?.key===key?el.surveyCursor:{key,x:.5,y:.5,active:false,hoveredId:null};
 el.surveyCursor=state;
 const buttons=[...el.querySelectorAll('.survey-surface [data-select-stone]')];
 let lastTime=performance.now();
 function refresh(){
  node.hidden=!state.active;
  if(!state.active){state.hoveredId=null;el.querySelectorAll('.cursor-hovered').forEach(b=>b.classList.remove('cursor-hovered'));return;}
  const rect=viewport.getBoundingClientRect(),cx=rect.left+state.x*rect.width,cy=rect.top+state.y*rect.height;
  node.style.left=`${state.x*100}%`;node.style.top=`${state.y*100}%`;
  let closest=null,distance=26;
  for(const button of buttons){
   const box=button.getBoundingClientRect(),x=(box.left+box.right)/2,y=(box.top+box.bottom)/2;
   if(x<rect.left||x>rect.right||y<rect.top||y>rect.bottom)continue;
   const d=Math.hypot(x-cx,y-cy);if(d<distance){closest=button;distance=d;}
  }
  const hoveredId=closest?.dataset.selectStone||null;
  if(state.hoveredId!==hoveredId)buttons.forEach(b=>b.classList.toggle('cursor-hovered',b===closest));
  else closest?.classList.add('cursor-hovered');
  state.hoveredId=hoveredId;
  node.classList.toggle('over-stone',!!closest);
  const label=node.querySelector('span'),text=closest?.title||'';if(label.textContent!==text)label.textContent=text;
 }
 function activate(){
  if(state.active)return;
  // Start over the selected destination when visible, otherwise at map centre.
  const rect=viewport.getBoundingClientRect(),selected=el.querySelector('.survey-surface .survey-stone.selected')?.getBoundingClientRect();
  if(selected){const x=(selected.left+selected.right)/2-rect.left,y=(selected.top+selected.bottom)/2-rect.top;
   if(x>=0&&x<=rect.width&&y>=0&&y<=rect.height){state.x=x/rect.width;state.y=y/rect.height;}}
  el.querySelectorAll('.game-ui-controller-focus').forEach(button=>button.classList.remove('game-ui-controller-focus'));
  if(document.activeElement?.closest('.survey-stone-list'))document.activeElement.blur();
  state.active=true;
 }
 function update(input,elapsed){
  const now=performance.now(),dt=clamp(elapsed??((now-lastTime)/1000),0,.05);lastTime=now;
  const rightX=axis(input?.rawRightStickX),rightY=axis(input?.rawRightStickY),rightActive=!!(rightX||rightY);
  let vx=axis(input?.mapCursorX??(rightActive?rightX:input?.moveX)),vy=axis(input?.mapCursorY??(rightActive?rightY:input?.moveY));
  const magnitude=Math.hypot(vx,vy);if(magnitude>1){vx/=magnitude;vy/=magnitude;}
  const zoomIn=!!(input?.mapZoomInHeld??input?.ability0Held),zoomOut=!!(input?.mapZoomOutHeld??input?.ability4Held);
  const zoomStep=(!zoomIn&&(input?.rtPressed||input?.pageRightPressed)?1:0)-(!zoomOut&&(input?.ltPressed||input?.pageLeftPressed)?1:0);
  const wasActive=state.active;
  if(vx||vy||zoomIn||zoomOut||zoomStep)activate();
  if(!state.active)return;
  const width=viewport.clientWidth,height=viewport.clientHeight;
  if(width<1||height<1)return;
  const speed=420,margin=12;
  const x=clamp(state.x*width+vx*speed*dt,margin,Math.max(margin,width-margin));
  const y=clamp(state.y*height+vy*speed*dt,margin,Math.max(margin,height-margin));
  state.x=x/width;state.y=y/height;
  // Push toward a viewport edge to scroll the enlarged map beneath the cursor.
  const edge=36,px=vx<0&&x<edge||vx>0&&x>width-edge?vx*speed*dt:0,py=vy<0&&y<edge||vy>0&&y>height-edge?vy*speed*dt:0;
  if(px||py)pan(-px,-py);
  const direction=Number(zoomIn)-Number(zoomOut);
  if(direction||zoomStep)zoom(Math.exp(direction*1.6*dt+zoomStep*.18),{x,y});
  if(!wasActive||vx||vy||input?.confirmPressed)refresh();
 }
 const controller={update,refresh,hide(){state.active=false;refresh();}};
 refresh();return controller;
}
