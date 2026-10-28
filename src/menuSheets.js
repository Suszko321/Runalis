// Historical public module name retained for menu callers. Fullscreen menus use
// continuous scrolling; no nodes are moved, hidden, or split into trigger pages.
let installed=false;
let touchFocus=false;
export function noteControllerMenuInput(){touchFocus=false;}
export function isTouchMenuInteraction(){return touchFocus&&document.body.classList.contains('mobile-input');}
export function captureTouchMenuScroll(root){
 if(!root||!document.body.classList.contains('mobile-input'))return ()=>{};
 const saved=[root,...root.querySelectorAll('*')].filter(e=>e.scrollTop>0||e.scrollLeft>0).map(element=>{
  const path=[];for(let node=element;node!==root;node=node.parentElement){const peers=[...node.parentElement.children].filter(n=>n.tagName===node.tagName);path.unshift(`${node.tagName.toLowerCase()}:nth-of-type(${peers.indexOf(node)+1})`);}
  return {path:path.join(' > '),top:element.scrollTop,left:element.scrollLeft};
 });
 return ()=>{for(const s of saved){const element=s.path?root.querySelector(s.path):root;if(element){element.scrollTop=s.top;element.scrollLeft=s.left;}}};
}
const visible=el=>!!el.getClientRects().length&&getComputedStyle(el).visibility!=='hidden';
export function menuSheetItemVisible(){return true;}
export function prepareMenuSheets(){} // Compatibility for older menu refresh hooks.
export function revealMenuFocus(element){
 if(isTouchMenuInteraction())return;
 // Scroll only overflowing ancestors, keeping headers and sibling details still.
 for(let pane=element.parentElement;pane&&pane!==document.body;pane=pane.parentElement){
  const style=getComputedStyle(pane),a=element.getBoundingClientRect(),b=pane.getBoundingClientRect();
  if(/auto|scroll/.test(style.overflowY)){
   if(a.top<b.top+4)pane.scrollTop-=b.top+4-a.top;
   else if(a.bottom>b.bottom-4)pane.scrollTop+=a.bottom-b.bottom+4;
  }
  if(/auto|scroll/.test(style.overflowX)){
   if(a.left<b.left+4)pane.scrollLeft-=b.left+4-a.left;
   else if(a.right>b.right-4)pane.scrollLeft+=a.right-b.right+4;
  }
 }
}
export function installMenuSheets(){
 if(typeof document==='undefined'||installed)return;installed=true;
 document.body.classList.add('fullscreen-menu-design');
 document.addEventListener('pointerdown',event=>{touchFocus=event.pointerType==='touch';},true);
 document.addEventListener('keydown',()=>{touchFocus=false;},true);
 for(const path of ['../controller-ui.css','../fullscreen-menus.css','../creator-class-information.css']){
  const link=document.createElement('link');link.rel='stylesheet';link.href=new URL(path,import.meta.url).href;document.head.append(link);
 }
 document.addEventListener('focusin',event=>{
  if(touchFocus&&document.body.classList.contains('mobile-input'))return;
  if(event.target.closest?.('.panel.open,.market-shop-panel,.workshop-panel,.character-creator-panel,.coop-join-panel,.pvp-arena-panel'))revealMenuFocus(event.target);
 });
 document.addEventListener('keydown',event=>{
  if((event.key==='PageDown'||event.key==='PageUp')&&handleMenuSheetInput({rtPressed:event.key==='PageDown',ltPressed:event.key==='PageUp'}))event.preventDefault();
 });
}
export function handleMenuSheetInput(input,root=document){
 if(!input?.ltPressed&&!input?.rtPressed)return false;
 const focus=document.activeElement;
 const workspaces=[...root.querySelectorAll('.runalis-menu-workspace.active,.market-shop-panel,.coop-join-panel')].filter(visible);
 const workspace=workspaces.find(el=>el.contains(focus))||workspaces.at(-1);
 if(!workspace)return false;
 const candidates=[...workspace.querySelectorAll('*')].filter(el=>/auto|scroll/.test(getComputedStyle(el).overflowY)&&visible(el)&&el.scrollHeight>el.clientHeight+4);
 const pane=candidates.find(el=>el.matches('.inventory-detail-pane,.ability-detail-info,.ability-detail-pane,.world-skill-detail,.quest-detail-pane,.character-stat-detail,.skill-tree-detail-pane,.market-shop-detail'))||candidates.find(el=>el.contains(focus))||candidates[0];
 if(!pane)return false;
 pane.scrollBy({top:(input.rtPressed?1:-1)*pane.clientHeight*.75,behavior:'instant'});return true;
}
