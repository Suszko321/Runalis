// Only one shared skill menu can own touch input, including in co-op.
let activeBinding=null;
let suppressClickUntil=0;
if(typeof document!=='undefined')document.addEventListener('click',event=>{if(event.isTrusted&&Date.now()<suppressClickUntil&&event.target.closest('.ability-management-onepage')){event.preventDefault();event.stopImmediatePropagation();}},true);
// Suppress only the trailing click from a drag. A fresh touch is a new action,
// even if the player immediately taps a skill or another hotbar slot.
if(typeof document!=='undefined')document.addEventListener('pointerdown',()=>{suppressClickUntil=0;},true);

export function bindMobileSkills(game,assign){
  activeBinding?.abort();activeBinding=null;
  if(!document.body.classList.contains('mobile-input'))return;
  const root=document.querySelector('.ability-management-onepage');if(!root)return;
  const abort=new AbortController();activeBinding=abort;
  let drag=null,ghost=null,target=null;
  function clean(){
    const pointer=drag?.pointer;drag=null;
    if(pointer!==undefined&&root.hasPointerCapture(pointer))root.releasePointerCapture(pointer);
    target?.classList.remove('mobile-drop-target');ghost?.remove();
    document.body.classList.remove('mobile-skill-dragging');ghost=target=null;
  }
  abort.signal.addEventListener('abort',clean);
  root.addEventListener('pointerdown',event=>{
    const icon=event.target.closest('[data-select-ability-id] > i');
    const button=event.target.closest('[data-select-ability-id]');
    if(!button||drag||event.button!==0)return;
    drag={pointer:event.pointerId,id:button.dataset.selectAbilityId,x:event.clientX,y:event.clientY,button,canDrag:!!icon,moved:false,active:false};
    try{root.setPointerCapture(event.pointerId);}catch{}
  },{signal:abort.signal});
  root.addEventListener('pointermove',event=>{
    if(!drag||drag.pointer!==event.pointerId)return;
    if(!drag.active&&Math.hypot(event.clientX-drag.x,event.clientY-drag.y)<8)return;
    if(!drag.canDrag){drag.moved=true;return;}
    event.preventDefault();
    if(!drag.active){
      drag.active=true;document.body.classList.add('mobile-skill-dragging');
      ghost=document.createElement('div');ghost.className='mobile-skill-ghost';ghost.setAttribute('aria-hidden','true');
      ghost.innerHTML=drag.button.querySelector('i').innerHTML;document.body.append(ghost);
    }
    ghost.style.left=event.clientX+'px';ghost.style.top=event.clientY+'px';
    target?.classList.remove('mobile-drop-target');
    target=document.elementFromPoint(event.clientX,event.clientY)?.closest('[data-assign-selected-slot]');
    if(target&&!root.contains(target))target=null;
    target?.classList.add('mobile-drop-target');
  },{signal:abort.signal,passive:false});
  root.addEventListener('pointerup',event=>{
    if(!drag||drag.pointer!==event.pointerId)return;
    const {id,active,moved,button}=drag,slot=target?Number(target.dataset.assignSelectedSlot):null;
    if(active||!moved){event.preventDefault();suppressClickUntil=Date.now()+350;}
    clean();if(active&&slot!==null)assign(id,slot);else if(!active&&!moved)button.click();
  },{signal:abort.signal});
  root.addEventListener('pointercancel',clean,{signal:abort.signal});
  root.addEventListener('lostpointercapture',clean,{signal:abort.signal});
  window.addEventListener('blur',clean,{signal:abort.signal});
  root.querySelector('[data-mobile-skill-close]')?.addEventListener('click',()=>{
    game.uiState.mobileAbilityDetailOpen=false;root.classList.remove('mobile-detail-open');
    root.querySelector(`[data-select-ability-id="${CSS.escape(game.uiState.selectedAbilityId||'')}"]`)?.focus({preventScroll:true});
  },{signal:abort.signal});
}
