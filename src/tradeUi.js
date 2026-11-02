import {createTradeSystem} from './tradeSystem.js';
import {drawDialogueReadyIndicator} from './objectRenderer.js';
import {readProfiles,writeProfiles,createSaveState} from './gameSave.js';
import {serializeCoopPlayerAsUnifiedProfile} from './couchCoop.js';
import {cancelActiveAbilityCharge,cancelActiveHeavyAttackCharge} from './combat.js';
import {directionalMenuItem,menuDirection} from './menuNavigation.js';
import {GEAR_RARITIES} from './gearRarity.js';

const escape=value=>String(value??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const number=value=>Number(value).toLocaleString('en-US');
const itemText=item=>`${item.name}${item.tier?` · ${GEAR_RARITIES[item.rarity]?.name||item.rarity} · +${item.tier-1}`:''} × ${number(item.qty)}`;
export function createTrading(game){
 const panels=new Map(),notices=new Map();let remote={nearby:[]};
 const locals=()=>[game.player,...(game.player.coop?.players||[])].filter(a=>a&&a.active!==false&&!a.networkRemote);
 const guest=()=>game.onlineSession?.role==='guest';
 const state=actor=>guest()?remote:system.snapshot(actor);
 function notice(actor,message){
  if(message===undefined)return;
  notices.get(actor)?.element?.remove();
  if(message)notices.set(actor,{message,until:Date.now()+7000});else notices.delete(actor);
 }
 const system=createTradeSystem(game,{
  changed(actors,message){
   for(const actor of actors){notice(actor,message);if(system.isBusy(actor)){cancelActiveAbilityCharge(actor);cancelActiveHeavyAttackCharge(actor,game.world);}}
   if(message)game.log?.(message);
   game.onlineSession?.sendTradeStates?.(actors,message);render();
  },
  persist(actors,economies){
   const local=actors.filter(a=>!a.networkRemote);if(!local.length)return true;
   const profiles=readProfiles();
   for(const actor of local){
    const profileId=actor===game.player?game.profileId:actor.profileId;
    // A failed/corrupt profile read must never be turned into a fresh collection.
    if(!profileId||!profiles[profileId])return false;
    const projected={...actor,...economies[actors.indexOf(actor)]};
    if(actor===game.player)profiles[profileId]={...profiles[profileId],updated:Date.now(),state:createSaveState({...game,player:projected})};
    else profiles[profileId]=serializeCoopPlayerAsUnifiedProfile(game,projected,profiles);
   }
   return writeProfiles(profiles);
  },
  completed(actors){game.onlineSession?.completeTrade?.(actors);}
 });
 function send(actor,command){
  const snapshot=state(actor);if(!snapshot.id)return;
  const packet={...command,id:snapshot.id,revision:snapshot.revision};
  if(guest()){game.onlineSession.sendTradeCommand(packet);return;}
  const result=system.action(actor,packet);if(!result.ok)notice(actor,result.reason);render();
 }
 function offerList(offer,own,editable){return `<p class="trade-gold"><b>${number(offer.gold)}</b> gold</p><ul>${offer.items.map(item=>`<li><span style="color:${GEAR_RARITIES[item.rarity]?.color||'#eee2c9'}">${escape(itemText(item))}</span>${own&&editable?`<button data-trade-remove="${escape(item.key)}" aria-label="Remove ${escape(item.name)}">Remove</button>`:''}</li>`).join('')||'<li class="trade-muted">No items offered</li>'}</ul>`;}
 function markup(s){
  const review=s.stage==='review';
  return `<header><div><small>PLAYER TRADING · ${review?'FINAL REVIEW':'YOUR OFFER'}</small><h2>${escape(s.name)} ↔ ${escape(s.partner)}</h2></div><button data-trade-cancel aria-label="Decline trade">×</button></header>
   <div class="trade-content"><p class="trade-help">${review?'Check both offers carefully. Nothing moves until BOTH players confirm.':'Offer items from your bag or gold. Changes reset both approvals.'}</p>
   <div class="trade-offers"><section><h3>You give</h3>${offerList(s.own,true,!review)}</section><section><h3>You receive</h3>${offerList(s.other,false,false)}</section></div>
   ${review?'':`<div class="trade-gold-controls"><label>Gold available: ${number(s.gold)}<input data-trade-gold type="number" inputmode="numeric" min="0" max="${s.gold}" step="1" value="${s.own.gold}" aria-label="Gold to offer"></label><button data-trade-set-gold>Offer gold</button><button data-trade-gold-step="-1">−1 gold</button><button data-trade-gold-step="1">+1 gold</button><button data-trade-gold-step="100">+100 gold</button><button data-trade-all-gold>All gold</button><button data-trade-clear-gold>No gold</button></div>
   <section class="trade-bag"><div class="trade-bag-heading"><h3>Your tradable bag</h3><label>Quantity <input data-trade-qty type="number" inputmode="numeric" min="1" step="1" value="1" aria-label="Item quantity"></label><button data-trade-qty-step="-1" aria-label="Decrease quantity">−</button><button data-trade-qty-step="1" aria-label="Increase quantity">+</button></div><p class="trade-muted">No crafting materials or quest items. Unequip and unlock gear first.</p><div class="trade-bag-list">${s.inventory.map(item=>{const remaining=item.qty-(s.own.items.find(o=>o.key===item.key)?.qty||0);return `<div><button data-trade-add="${escape(item.key)}" ${remaining<1?'disabled':''}>${escape(itemText({...item,qty:remaining}))}</button>${remaining>1?`<button data-trade-all="${escape(item.key)}">All</button>`:''}</div>`;}).join('')||'<p>No tradable items in your bag.</p>'}</div></section>`}
   </div><p data-trade-feedback role="status" aria-live="polite"></p>
   <footer><p>${review?(s.confirmed?'You confirmed. Waiting for your partner…':s.partnerConfirmed?'Your partner confirmed. Review, then confirm.':'Both players must confirm this final offer.'):(s.accepted?'You accepted. Waiting for your partner…':s.partnerAccepted?'Your partner accepted this offer.':'Neither player has accepted yet.')}</p><div>${review?'<button data-trade-edit>Change offer</button>':''}<button class="trade-primary" data-trade-accept ${review?s.confirmed?'disabled':'':s.accepted?'disabled':''}>${review?'Confirm exchange':'Accept offer'}</button><button data-trade-cancel>Decline</button></div></footer>`;
 }
 function bind(panel,actor){
  const quantity=()=>Number(panel.querySelector('[data-trade-qty]')?.value||1);
  panel.onclick=event=>{
   const button=event.target.closest('button');if(!button||button.disabled)return;
   for(const other of panel.querySelectorAll('.trade-controller-focus'))other.classList.remove('trade-controller-focus');
   button.classList.add('trade-controller-focus');
   const s=state(actor),data=button.dataset;
   if('tradeCancel'in data)send(actor,{type:'cancel'});
   else if('tradeEdit'in data)send(actor,{type:'edit'});
   else if('tradeAccept'in data)send(actor,{type:s.stage==='review'?'confirm':'accept'});
   else if('tradeSetGold'in data)send(actor,{type:'gold',gold:Number(panel.querySelector('[data-trade-gold]').value)});
   else if('tradeAllGold'in data)send(actor,{type:'gold',gold:s.gold});
   else if('tradeClearGold'in data)send(actor,{type:'gold',gold:0});
   else if('tradeGoldStep'in data)send(actor,{type:'gold',gold:Math.max(0,Math.min(s.gold,s.own.gold+Number(data.tradeGoldStep)))});
   else if('tradeAdd'in data)send(actor,{type:'add',key:data.tradeAdd,qty:quantity()});
   else if('tradeAll'in data){const entry=s.inventory.find(e=>e.key===data.tradeAll);send(actor,{type:'add',key:entry.key,qty:entry.qty-(s.own.items.find(e=>e.key===entry.key)?.qty||0)});}
   else if('tradeRemove'in data)send(actor,{type:'remove',key:data.tradeRemove});
   else if('tradeQtyStep'in data){const field=panel.querySelector('[data-trade-qty]');field.value=Math.max(1,(Number(field.value)||1)+Number(data.tradeQtyStep));}
  };
  panel.addEventListener('keydown',event=>{
   // Keyboard gameplay remains P1's, but numeric fields can be typed by pointer.
   if(event.key==='Escape'){event.preventDefault();send(actor,{type:'cancel'});}
   if(event.target.matches('input')||event.key==='Escape')event.stopPropagation();
  });
 }
 function render(){
  const actors=locals(),rect=game.canvas.getBoundingClientRect();
  for(const [actor,note]of notices){
   if(!actors.includes(actor)||Date.now()>=note.until){note.element?.remove();notices.delete(actor);continue;}
   if(state(actor).id){note.element?.remove();note.element=null;continue;}
   if(!note.element){note.element=document.createElement('div');note.element.className='trade-toast';note.element.setAttribute('role','status');note.element.textContent=note.message;document.body.append(note.element);}
   const v=game.getMenuViewportForActor(actor);Object.assign(note.element.style,{left:`${rect.left+v.x*rect.width/game.canvas.width+8}px`,top:`${rect.top+v.y*rect.height/game.canvas.height+8}px`,width:`${v.width*rect.width/game.canvas.width-16}px`});
  }
  for(const [actor,entry]of panels)if(!actors.includes(actor)||!state(actor).id){entry.panel.remove();panels.delete(actor);}
  for(const actor of actors){
   const s=state(actor);if(!s.id)continue;
   let entry=panels.get(actor);
   if(!entry){const panel=document.createElement('section');panel.className='player-trade';panel.dataset.tradeOwner=actor===game.player?1:actor.slot;panel.setAttribute('role','dialog');panel.setAttribute('aria-label',`Trade: ${actor.name}`);document.body.append(panel);entry={panel,text:''};panels.set(actor,entry);bind(panel,actor);}
   const {panel}=entry,v=game.getMenuViewportForActor(actor);
   Object.assign(panel.style,{left:`${rect.left+v.x*rect.width/game.canvas.width}px`,top:`${rect.top+v.y*rect.height/game.canvas.height}px`,width:`${v.width*rect.width/game.canvas.width}px`,height:`${v.height*rect.height/game.canvas.height}px`});
   const text=JSON.stringify(s);
   if(entry.text!==text){
    const active=document.activeElement,selected=panel.querySelector('.trade-controller-focus')||(active?.closest('.player-trade')===panel?active:null);
    const identity=button=>JSON.stringify(Object.entries(button.dataset).filter(([name])=>name.startsWith('trade')));
    const focus=selected?identity(selected):null;
    const scroll=panel.querySelector('.trade-bag-list')?.scrollTop||0,qty=panel.querySelector('[data-trade-qty]')?.value||1;
    panel.innerHTML=markup(s);panel.querySelector('[data-trade-qty]')?.setAttribute('value',qty);
    if(panel.querySelector('.trade-bag-list'))panel.querySelector('.trade-bag-list').scrollTop=scroll;
    if(focus){const target=[...panel.querySelectorAll('button:not([disabled])')].find(b=>identity(b)===focus);target?.classList.add('trade-controller-focus');if(active===selected)target?.focus({preventScroll:true});}
    entry.text=text;
   }
   const note=notices.get(actor);panel.querySelector('[data-trade-feedback]').textContent=note&&Date.now()<note.until?note.message:'';
   panel.hidden=!!game.paused;
  }
 }
 function handleInput(input,actor){
  if(!actor||!state(actor).id)return false;
  input.menuConsumed=true;
  if(input.dropOutPressed){if(!guest())system.cancelActor(actor);return false;}
  if(input.cancelPressed||input.backPressed||input.pausePressed){send(actor,{type:'cancel'});return true;}
  const panel=panels.get(actor)?.panel;if(!panel)return true;
  const buttons=[...panel.querySelectorAll('button:not([disabled])')],direction=menuDirection(input);
  let selected=panel.querySelector('.trade-controller-focus');
  if(direction||input.confirmPressed){
   selected=directionalMenuItem(buttons,selected||panel.querySelector('[data-trade-add]:not([disabled]),[data-trade-accept]:not([disabled])'),direction)||buttons[0];
   for(const b of buttons)b.classList.toggle('trade-controller-focus',b===selected);
   selected?.scrollIntoView({block:'nearest'});
   if(input.confirmPressed)selected?.click();
  }
  return true;
 }
 return {system,state,render,send,
  snapshot:actor=>system.snapshot(actor),
  update(dt){if(!guest())system.update(dt);render();},
  interact:actor=>system.interact(actor),
  isBusy:actor=>guest()?actor===game.player&&!!remote.id:system.isBusy(actor),
  hasLocalOpen:()=>locals().some(a=>!!state(a).id),
  handleInput,
  handleKeyboard(event){
   if(!state(game.player).id)return false;
   if(event.target.matches?.('input'))return true;
   event.preventDefault();
   if(event.key==='Escape')send(game.player,{type:'cancel'});
   else if(['ArrowUp','ArrowDown','ArrowLeft','ArrowRight','Enter'].includes(event.key))handleInput({[{ArrowUp:'upPressed',ArrowDown:'downPressed',ArrowLeft:'leftPressed',ArrowRight:'rightPressed',Enter:'confirmPressed'}[event.key]]:true},game.player);
   return true;
  },
  receive(snapshot,message){remote=snapshot||{nearby:[]};notice(game.player,message);render();},
  cancelActor:actor=>system.cancelActor(actor),
  reset(){system.reset();remote={nearby:[]};for(const e of panels.values())e.panel.remove();panels.clear();for(const note of notices.values())note.element?.remove();notices.clear();},
  destroy(){this.reset();},
  drawHints(){
   if(game.paused)return;
   const split=game.currentSplitLayout;
   const views=split?split.members.map((actor,i)=>({actors:[actor],camera:split.cameras[i],viewport:split.viewports[i],zoom:1})):[{actors:locals(),camera:game.renderCamera,viewport:{x:0,y:0,width:game.canvas.width,height:game.canvas.height},zoom:game.cameraMode==='sharedParty'?game.coopCameraZoom||1:1}];
   for(const view of views){const ctx=game.ctx,v=view.viewport;ctx.save();ctx.beginPath();ctx.rect(v.x,v.y,v.width,v.height);ctx.clip();const shown=new Set();
    for(const actor of view.actors)for(const target of state(actor).nearby||[]){if(shown.has(target.id))continue;shown.add(target.id);
     const x=v.x+(target.x-view.camera.x)*view.zoom,y=v.y+(target.y-view.camera.y)*view.zoom-86;
     drawDialogueReadyIndicator(ctx,x,y);ctx.font='bold 10px Georgia';ctx.textAlign='center';ctx.fillStyle='#f7e6b8';ctx.strokeStyle='#111';ctx.lineWidth=3;ctx.strokeText('Trade',x,y-15);ctx.fillText('Trade',x,y-15);
    }ctx.restore();
   }
  }
 };
}
