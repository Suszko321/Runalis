const SESSION_KEY='runalis-home-screen-visit';
const SNOOZE_KEY='runalis-home-screen-remind-after';
const WEEK=7*24*60*60*1000;

function standalone(){
  return navigator.standalone===true||['standalone','fullscreen','minimal-ui'].some(mode=>matchMedia(`(display-mode: ${mode})`).matches);
}
function mobile(){return navigator.maxTouchPoints>0&&matchMedia('(pointer: coarse)').matches;}
function remembered(){
  try{return sessionStorage.getItem(SESSION_KEY)==='continue'||Number(localStorage.getItem(SNOOZE_KEY))>Date.now();}catch{return false;}
}
function rememberVisit(){try{sessionStorage.setItem(SESSION_KEY,'continue');}catch{}}
function remindLater(){try{localStorage.setItem(SNOOZE_KEY,String(Date.now()+WEEK));}catch{}}

// Capture before the startup release request completes: previously engaged
// browsers can announce installability as soon as the manifest is available.
let deferred=null,installedThisPage=false,onPrompt=()=>{},onInstalled=()=>{};
addEventListener('beforeinstallprompt',event=>{
  if(!mobile()||standalone())return;
  event.preventDefault();deferred=event;onPrompt();
});
addEventListener('appinstalled',()=>{installedThisPage=true;onInstalled();});

export function initHomeScreenPrompt(){
  if(!mobile()||standalone())return;
  let root=null,confirmed=false;
  const previousFocus=document.activeElement,menu=document.getElementById('mainMenu'),wasInert=menu?.inert;
  const ios=/iPad|iPhone|iPod/.test(navigator.userAgent)||(navigator.platform==='MacIntel'&&navigator.maxTouchPoints>1);
  function close(){
    if(!root)return;
    root.remove();root=null;document.body.classList.remove('home-screen-prompt-open');
    if(menu)menu.inert=wasInert;
    if(previousFocus?.isConnected)previousFocus.focus({preventScroll:true});
  }
  function renderInstallButton(){
    if(!root)return;
    root.querySelector('[data-home-screen-install]').hidden=!deferred||confirmed;
    root.querySelector('[data-home-screen-added]').hidden=!!deferred||confirmed;
  }
  function confirmAdded(){
    confirmed=true;remindLater();
    if(!root)return;
    root.querySelector('#homeScreenPromptTitle').textContent='Launch from your Home Screen';
    root.querySelector('[data-home-screen-lead]').textContent='Close this browser tab, then tap the Runalis icon on your Home Screen to play fullscreen.';
    root.querySelector('ol').hidden=true;root.querySelector('[data-home-screen-fallback]').hidden=true;
    root.querySelector('[data-home-screen-later]').hidden=true;
    root.querySelector('[data-home-screen-status]').textContent='Your browser may ask you to confirm adding the icon first.';
    renderInstallButton();root.querySelector('[data-home-screen-continue]').focus();
  }
  onPrompt=renderInstallButton;onInstalled=confirmAdded;
  const display=matchMedia('(display-mode: standalone)');
  display.addEventListener('change',()=>{if(standalone())close();});
  if(remembered())return;
  root=document.createElement('div');root.id='homeScreenPrompt';root.setAttribute('role','dialog');root.setAttribute('aria-modal','true');root.setAttribute('aria-labelledby','homeScreenPromptTitle');
  root.innerHTML=`<section class="home-screen-card"><small>RUNALIS</small><h2 id="homeScreenPromptTitle" tabindex="-1">Play Runalis fullscreen</h2>
    <p data-home-screen-lead>Add Runalis to your Home Screen to play without browser bars.</p>
    <ol>${ios?'<li>Tap your browser’s <strong>Share</strong> button (or <strong>⋯ → Share</strong>).</li><li>Choose <strong>Add to Home Screen</strong>. Keep <strong>Open as Web App</strong> on if shown, then tap <strong>Add</strong>.</li>':'<li>Open your browser’s <strong>⋮ menu</strong>.</li><li>Choose <strong>Install app</strong> or <strong>Add to Home screen</strong>, then confirm.</li>'}<li><strong>Close this tab</strong>, then launch <strong>Runalis</strong> from your Home Screen.</li></ol>
    <p class="home-screen-help" data-home-screen-fallback>If these options are missing, open this link in ${ios?'Safari':'Chrome'} first.</p>
    <p class="home-screen-help" data-home-screen-status role="status" aria-live="polite"></p>
    <div class="home-screen-actions"><button type="button" data-home-screen-install hidden>Install Runalis</button><button type="button" data-home-screen-added>I’ve added it</button><button type="button" data-home-screen-continue>Continue in browser</button><button type="button" data-home-screen-later>Remind me later</button></div></section>`;
  root.querySelector('[data-home-screen-continue]').onclick=()=>{rememberVisit();close();};
  root.querySelector('[data-home-screen-later]').onclick=()=>{rememberVisit();remindLater();close();};
  root.querySelector('[data-home-screen-added]').onclick=confirmAdded;
  root.querySelector('[data-home-screen-install]').onclick=async()=>{
    if(!deferred)return;
    const event=deferred;deferred=null;const button=root.querySelector('[data-home-screen-install]');button.disabled=true;
    try{
      const result=await event.prompt(),choice=result?.outcome?result:await event.userChoice;
      if(choice?.outcome==='accepted')confirmAdded();
      else if(root)root.querySelector('[data-home-screen-status]').textContent='You can keep playing in your browser or follow the steps above later.';
    }catch{if(root)root.querySelector('[data-home-screen-status]').textContent='Installation could not open. Use the browser-menu steps above instead.';}
    finally{button.disabled=false;renderInstallButton();}
  };
  root.addEventListener('keydown',event=>{
    event.stopPropagation();
    if(event.key==='Escape'){event.preventDefault();rememberVisit();close();return;}
    if(event.key!=='Tab')return;
    const buttons=[...root.querySelectorAll('button')].filter(b=>!b.hidden&&!b.disabled);
    const index=buttons.indexOf(document.activeElement),next=index<0?(event.shiftKey?buttons.length-1:0):(index+(event.shiftKey?-1:1)+buttons.length)%buttons.length;
    event.preventDefault();buttons[next]?.focus();
  });
  document.body.classList.add('home-screen-prompt-open');if(menu)menu.inert=true;
  document.body.append(root);renderInstallButton();root.querySelector('h2').focus();
  if(installedThisPage)confirmAdded();
}
