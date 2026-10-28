import {isMobileInputDevice} from './mobileControls.js';

let busy=false;
const bound=new WeakSet();
function refresh(){
  for(const button of document.querySelectorAll('[data-desktop-fullscreen]')){
    button.hidden=isMobileInputDevice()&&!button.hasAttribute('data-mobile-fullscreen');
    button.textContent=document.fullscreenElement?'Exit fullscreen':'Enter fullscreen';
    button.setAttribute('aria-pressed',String(!!document.fullscreenElement));
    button.disabled=busy||!document.fullscreenEnabled||!document.documentElement.requestFullscreen;
    button.title=button.disabled&&!busy?'Fullscreen is unavailable in this browser.':document.fullscreenElement?'Press Esc or use this button to exit fullscreen.':'';
  }
}
if(typeof document!=='undefined')document.addEventListener('fullscreenchange',refresh);

export function bindFullscreenButtons(root=document){
  for(const button of root.querySelectorAll('[data-desktop-fullscreen]')){
    if(bound.has(button))continue;bound.add(button);
    button.onclick=async()=>{
      if(busy)return;
      busy=true;refresh();
      button.parentElement.querySelector('[data-fullscreen-error]')?.remove();
      try{
        if(document.fullscreenElement)await document.exitFullscreen();
        else await document.documentElement.requestFullscreen();
      }catch{
        const message=document.createElement('p');message.dataset.fullscreenError='';message.setAttribute('role','alert');
        message.textContent='The browser could not change fullscreen mode. Please try again.';
        button.insertAdjacentElement('afterend',message);
      }finally{busy=false;refresh();}
    };
  }
  refresh();
}
