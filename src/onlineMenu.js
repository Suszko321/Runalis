import {menuDirection,directionalMenuItem} from './menuNavigation.js';
export function createOnlineMenu(session){
 const root=document.createElement('div');root.id='onlineMultiplayerOverlay';root.className='online-multiplayer-overlay';root.setAttribute('role','dialog');root.setAttribute('aria-modal','true');root.setAttribute('aria-label','Multiplayer');root.hidden=true;
 root.innerHTML=`<section class="online-multiplayer-card"><header><div><small>RUNALIS</small><h2>Multiplayer</h2></div><button type="button" data-online-close aria-label="Close multiplayer menu">×</button></header>
 <p>Adventure together in the host’s world. Up to four players, each using their own character.</p>
 <form data-online-form><label>World password<input type="password" data-online-password minlength="8" maxlength="128" autocomplete="off" autocapitalize="off" spellcheck="false" placeholder="At least 8 characters" required></label>
 <div class="online-actions"><button type="button" data-online-host>Open World</button><button type="submit" data-online-join>Join World</button></div>
 <p class="online-help">Host: set a password and open your world. Friends: enter the exact same password and choose Join World. Keep the host’s game open.</p></form>
 <p data-online-status role="status" aria-live="polite"></p><ul data-online-players></ul><button type="button" data-online-leave hidden>Leave World</button>
 <details><summary>Connection help</summary><p>Both games need the same version and an internet connection. Some mobile, work or school networks block direct connections; try another network if joining times out. The host must keep this tab active.</p></details></section>`;
 const badge=document.createElement('div');badge.id='onlineSessionStatus';badge.setAttribute('role','status');badge.hidden=true;
 const password=root.querySelector('[data-online-password]');
 const render=()=>{
  const active=!!session.role;
  if(active&&!badge.isConnected)document.body.append(badge);else if(!active)badge.remove();
  badge.hidden=!active;badge.textContent=session.role==='guest'&&session.hostPaused?'Host paused the world':active?`Multiplayer · ${1+(session.game.player.coop?.players?.length||0)}/4 players`:'';
  root.querySelector('[data-online-form]').hidden=active;
  for(const b of root.querySelectorAll('[data-online-host],[data-online-join]'))b.disabled=session.connecting;
  root.querySelector('[data-online-status]').textContent=session.status;
  const leave=root.querySelector('[data-online-leave]');leave.hidden=!active&&!session.connecting;leave.textContent=session.connecting?'Cancel connection':session.role==='host'?'Close World':'Leave World';
  const players=root.querySelector('[data-online-players]');players.replaceChildren();
  if(active){for(const p of [session.game.player,...(session.game.player.coop?.players||[])]){const li=document.createElement('li');li.textContent=p.name||'Wayfarer';players.append(li);}}
 };
 const close=()=>{root.hidden=true;root.classList.remove('active');if(!session.role&&!session.connecting)root.remove();};
 root.querySelector('[data-online-close]').onclick=close;
 root.addEventListener('keydown',event=>{event.stopPropagation();if(event.key==='Escape'){event.preventDefault();close();}});
 const connect=kind=>{if(!password.reportValidity())return;session.connect(kind,password.value).catch(error=>session.setStatus(error.message));};
 root.querySelector('[data-online-host]').onclick=()=>connect('host');
 root.querySelector('form').onsubmit=event=>{event.preventDefault();connect('guest');};
 root.querySelector('[data-online-leave]').onclick=()=>{session.disconnect();render();};
 return {render,open(){if(!root.isConnected)document.body.append(root);root.hidden=false;root.classList.add('active');render();if(!session.role)password.focus();},close,clearPassword(){password.value='';},handleInput(input){
  if(root.hidden)return false;
  const elements=[...root.querySelectorAll('input,button,summary')].filter(e=>!e.disabled&&e.getBoundingClientRect().width&&e.getBoundingClientRect().height);
  const direction=menuDirection(input);
  if(direction)directionalMenuItem(elements,document.activeElement,direction)?.focus();
  if(input.cancelPressed||input.backPressed)close();
  else if(input.confirmPressed){if(document.activeElement===password)password.focus();else document.activeElement?.click?.();}
  return true;
 },destroy(){root.remove();badge.remove();}};
}
