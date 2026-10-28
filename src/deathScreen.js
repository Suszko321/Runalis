// Death presentation is transient game state; saves retain the existing defeat
// recovery rules. The game loop owns time, so no timers survive game teardown.
export function createDeathScreen(game){
 const overlay=document.createElement('div');overlay.id='deathScreenOverlay';overlay.className='death-screen';
 overlay.setAttribute('role','dialog');overlay.setAttribute('aria-modal','true');overlay.setAttribute('aria-labelledby','deathScreenTitle');overlay.tabIndex=-1;
 overlay.innerHTML='<div class="death-screen-card"><p class="death-screen-kicker">Your journey is not over</p><h1 id="deathScreenTitle">You have died</h1><p class="death-screen-countdown" role="status" aria-live="polite" aria-atomic="true">3</p><button type="button" data-death-respawn hidden>Respawn at nearest Nav Stone</button></div>';
 if(!document.getElementById('deathScreenStyles')){
  const style=document.createElement('style');style.id='deathScreenStyles';style.textContent=`
   #deathScreenOverlay{display:none;position:fixed;inset:0;z-index:30000;box-sizing:border-box;width:100%;height:100dvh;padding:max(20px,env(safe-area-inset-top)) max(16px,env(safe-area-inset-right)) max(20px,env(safe-area-inset-bottom)) max(16px,env(safe-area-inset-left));overflow:auto;overscroll-behavior:contain;background:radial-gradient(ellipse at center,#1b1018ed,#03060cf7);color:#e9dfd0;text-align:center;touch-action:pan-y}
   #deathScreenOverlay.active{display:grid;place-items:center}
   #deathScreenOverlay .death-screen-card{width:min(100%,500px);padding:24px 8px;box-sizing:border-box}
   #deathScreenOverlay .death-screen-kicker{font:12px/1.5 system-ui,sans-serif;letter-spacing:.16em;text-transform:uppercase;color:#b9a997}
   #deathScreenOverlay h1{font:normal clamp(32px,7vw,54px)/1.2 Georgia,serif;color:#e7b5ae;margin:12px 0 20px}
   #deathScreenOverlay .death-screen-countdown{font:normal 44px/1 Georgia,serif;min-height:44px;margin:16px 0;color:#e9cf9b}
   #deathScreenOverlay button{min-height:52px;max-width:100%;padding:14px 20px;border:1px solid #ad9364;border-radius:8px;background:#202b36;color:#f3e5cb;font:600 16px/1.3 system-ui,sans-serif;touch-action:manipulation;cursor:pointer}
   #deathScreenOverlay button[hidden]{display:none!important}
   #deathScreenOverlay button:focus-visible{outline:3px solid #f1d69e;outline-offset:4px}
   body.death-screen-active #mobileControls{visibility:hidden}
  `;document.head.append(style);
 }
 document.body.append(overlay);
 const button=overlay.querySelector('[data-death-respawn]'),countdown=overlay.querySelector('[role="status"]');
 let active=false,ready=false,startedAt=0,lastCount=3;
 const screen={
  get active(){return active;},get ready(){return ready;},
  start(){
   if(active)return;
   active=true;ready=false;startedAt=performance.now()/1000;lastCount=3;
   countdown.textContent='3';countdown.hidden=false;button.hidden=true;button.disabled=true;
   overlay.classList.add('active');document.body.classList.add('death-screen-active');overlay.focus({preventScroll:true});
  },
  update(now=performance.now()/1000){
   if(!active||ready)return;
   const remaining=Math.max(0,Math.ceil(3-(now-startedAt)));
   if(remaining===lastCount)return;lastCount=remaining;
   if(remaining){countdown.textContent=String(remaining);return;}
   ready=true;countdown.textContent='You may return.';countdown.hidden=true;
   button.hidden=false;button.disabled=false;button.focus({preventScroll:true});
  },
  respawn(){
   if(!active||!ready)return false;
   // Remove the gate before calling recovery, preventing duplicate activations.
   active=false;ready=false;overlay.classList.remove('active');document.body.classList.remove('death-screen-active');
   game.completePlayerRespawn();return true;
  },
  handleController(inputs){
   if(!active)return false;
   if(inputs.some(input=>game.inputOwnsActor(input,game.player)&&input.confirmPressed))screen.respawn();
   return true;
  },
  destroy(){active=false;ready=false;overlay.remove();document.body.classList.remove('death-screen-active');window.removeEventListener('keydown',keydown,true);}
 };
 button.onclick=()=>screen.respawn();
 const keydown=event=>{
  if(!active)return;event.preventDefault();event.stopImmediatePropagation();
  if(!event.repeat&&(event.key==='Enter'||event.key===' '))screen.respawn();
 };
 window.addEventListener('keydown',keydown,true);
 return screen;
}
