import {planBankTransfer,bankDepositReason} from './bankSystem.js';
import {decodeDeviceBank,decodeProfileCollection} from './profileStorage.js';
import {PROFILE_KEY,readProfiles,writeProfiles,createSaveState} from './gameSave.js';
import {serializeCoopPlayerAsUnifiedProfile} from './couchCoop.js';
import {ITEMS} from './data.js';
import {GEAR_RARITIES,gearRarity} from './gearRarity.js';
import {objectInInteractionRange} from './interactionRange.js';
import {directionalMenuItem,menuDirection} from './menuNavigation.js';
import {cancelActiveAbilityCharge,cancelActiveHeavyAttackCharge} from './combat.js';

const escape=value=>String(value??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const lock=work=>navigator.locks?navigator.locks.request('runalis-device-bank',work):Promise.resolve().then(work);
export function createBanking(game){
 const sessions=new Map();let destroyed=false;
 const locals=()=>[game.player,...(game.player.coop?.players||[])].filter(a=>a&&!a.networkRemote&&a.active!==false);
 const readBank=()=>decodeDeviceBank(localStorage.getItem(PROFILE_KEY));
 function profiles(){decodeProfileCollection(localStorage.getItem(PROFILE_KEY));return readProfiles();}
 function saveActor(collection,actor,economy){
  const id=actor===game.player?game.profileId:actor.profileId;
  if(!id||!collection[id])throw Error('Character save is unavailable. Nothing was transferred.');
  const projected={...actor,...economy};
  const state=game.onlineSession?.role==='guest'?{...game.onlineSession.guestSaveState(),player:{...game.onlineSession.guestSaveState().player,...economy}}:createSaveState({...game,player:projected});
  collection[id]=actor===game.player?{...collection[id],updated:Date.now(),state}:serializeCoopPlayerAsUnifiedProfile(game,projected,collection);
 }
 function migrate(){
  const collection=profiles(),bank=readBank(),updates=[];let changed=false;
  for(const [id,profile]of Object.entries(collection)){
   const actor=locals().find(a=>(a===game.player?game.profileId:a.profileId)===id);
   const reserve=(actor||profile.state?.player)?.storage?.goldReserve;
   if(reserve===undefined||reserve===0)continue;
   if(!Number.isSafeInteger(reserve)||reserve<0||!Number.isSafeInteger(bank.gold+reserve))throw Error('Legacy bank balance needs recovery. Nothing was changed.');
   bank.gold+=reserve;changed=true;
   const storage={...(actor||profile.state.player).storage,goldReserve:0};
   if(actor){saveActor(collection,actor,{inventory:actor.inventory,gold:actor.gold,storage});updates.push([actor,storage]);}
   else profile.state.player.storage=storage;
  }
  if(changed){bank.revision++;if(!writeProfiles(collection,bank))throw Error('Bank could not be saved. Free browser storage and try again.');for(const [actor,storage]of updates)actor.storage=storage;game.onlineSession?.commitCharacter();}
 }
 function close(actor){const s=sessions.get(actor);s?.panel.remove();sessions.delete(actor);game.canvas?.focus?.();}
 function valid(actor,s){return !destroyed&&game.started!==false&&locals().includes(actor)&&actor.hp>0&&!actor.dead&&!actor.controllerDisconnected&&s.world===game.world&&game.world.safeZone===true&&game.world.objects.includes(s.npc)&&objectInInteractionRange(actor,s.npc)&&!game.partyEntryReady;}
 async function transfer(actor,command){
  const s=sessions.get(actor);if(!s||s.pending||!s.ready)return;
  const revision=s.revision;
  s.pending=true;
  try{await lock(()=>{
   if(sessions.get(actor)!==s||!valid(actor,s))throw Error('Stay beside the teller to use the bank.');
   const bank=readBank();if(bank.revision!==revision)throw Error('The shared bank changed. Review it and try again.');
   const result=planBankTransfer(actor,bank,command),collection=profiles();saveActor(collection,actor,result.player);
   if(!writeProfiles(collection,result.bank))throw Error('Transfer was not saved. Free browser storage and try again.');
   Object.assign(actor,result.player);game.onlineSession?.commitCharacter();s.message='Transfer saved.';
  });}catch(error){s.message=error.message;}finally{s.pending=false;s.text='';render();}
 }
 function markup(actor,bank){
  const rows=(entries,withdraw)=>entries.map((entry,index)=>{
   if(!withdraw&&bankDepositReason(actor,entry))return '';
   const rarity=gearRarity(ITEMS[entry.id],entry);
   return `<li><span style="color:${GEAR_RARITIES[rarity]?.color||'#eee'}">${escape(ITEMS[entry.id]?.name||entry.id)} · ${escape(GEAR_RARITIES[rarity]?.name||rarity)} · +${Math.max(0,(entry.upgradeTier||1)-1)}${entry.locked?' · Locked':''} ×${entry.qty}</span><button data-bank-item="${index}" data-withdraw="${withdraw}">${withdraw?'Withdraw':'Store'}</button></li>`;
  }).join('')||'<li>No gear available.</li>';
  return `<header><div><small>ORRAKAI COUNTING HOUSE</small><h2>Shared Bank · ${escape(actor.name)}</h2></div><button data-bank-close>Close ×</button></header><div class="trade-content"><p class="trade-help">Shared by all characters on this device/browser profile. Stored gold is safe from death. Unequip gear before depositing; locked gear keeps its lock.</p><div class="trade-offers"><section><h3>Your bag · ${actor.gold.toLocaleString()} gold</h3><ul>${rows(actor.inventory,false)}</ul></section><section><h3>Shared vault · ${bank.gold.toLocaleString()} gold</h3><ul>${rows(bank.items,true)}</ul></section></div><div class="trade-gold-controls"><label>Gold amount<input data-bank-amount type="number" inputmode="numeric" min="1" step="1" value="1"></label><button data-bank-step="-1">−1</button><button data-bank-step="1">+1</button><button data-bank-gold="deposit">Deposit gold</button><button data-bank-gold="withdraw">Withdraw gold</button><button data-bank-all="deposit">Deposit all gold</button><button data-bank-all="withdraw">Withdraw all gold</button></div></div><footer><p data-bank-status role="status"></p><button data-bank-close>Return to game</button></footer>`;
 }
 function render(){
  for(const [actor,s]of sessions){
   if(!valid(actor,s)){close(actor);continue;}
   const rect=game.canvas.getBoundingClientRect(),v=game.getMenuViewportForActor(actor);
   Object.assign(s.panel.style,{left:`${rect.left+v.x*rect.width/game.canvas.width}px`,top:`${rect.top+v.y*rect.height/game.canvas.height}px`,width:`${v.width*rect.width/game.canvas.width}px`,height:`${v.height*rect.height/game.canvas.height}px`});s.panel.hidden=!!game.paused||!!game.couchCoopJoinMenu?.active;
   try{
    const bank=readBank(),text=JSON.stringify([bank,actor.inventory,actor.gold]);
    if(text!==s.text){
     const selected=s.panel.querySelector('.trade-controller-focus'),identity=selected?JSON.stringify(selected.dataset):null,amount=s.panel.querySelector('input')?.value||'1';
     s.panel.innerHTML=markup(actor,bank);s.panel.querySelector('input').value=amount;s.text=text;s.revision=bank.revision;
     s.identities={bag:actor.inventory.map(e=>JSON.stringify(e)),vault:bank.items.map(e=>JSON.stringify(e))};s.bankGold=bank.gold;s.carriedGold=actor.gold;
     if(identity)[...s.panel.querySelectorAll('button')].find(b=>JSON.stringify(b.dataset)===identity)?.classList.add('trade-controller-focus');
    }
    s.panel.querySelector('[data-bank-status]').textContent=s.message||'Transfers save immediately. Gear keeps its exact upgrades and identity.';
   }catch(error){s.panel.textContent=error.message;const button=document.createElement('button');button.textContent='Close bank';button.onclick=()=>close(actor);s.panel.append(button);}
  }
 }
 function handleInput(input,actor){
  const s=sessions.get(actor);if(!s||game.paused||game.couchCoopJoinMenu?.active)return false;if(input.dropOutPressed){close(actor);return false;}
  input.menuConsumed=true;if(input.cancelPressed||input.backPressed||input.pausePressed){close(actor);return true;}
  const buttons=[...s.panel.querySelectorAll('button')],direction=menuDirection(input);
  if(direction||input.confirmPressed){const selected=directionalMenuItem(buttons,s.panel.querySelector('.trade-controller-focus')||s.panel.querySelector('[data-bank-item],[data-bank-gold]'),direction)||buttons[0];for(const b of buttons)b.classList.toggle('trade-controller-focus',b===selected);selected?.scrollIntoView({block:'nearest'});if(input.confirmPressed)selected?.click();}return true;
 }
 return {render,transfer,close,isBusy:actor=>sessions.has(actor),hasLocalOpen:()=>sessions.size>0,handleInput,
  open(actor,npc){
   if(!locals().includes(actor)||game.trading?.isBusy(actor)||sessions.has(actor)||!npc||!['orrakaiBanker','orrakaiBank'].includes(npc.id)||game.world.safeZone!==true||!objectInInteractionRange(actor,npc))return false;
   const panel=document.createElement('section'),s={panel,npc,world:game.world,text:'',message:'',revision:-1};sessions.set(actor,s);
   panel.className='player-trade player-bank';panel.dataset.bankOwner=actor===game.player?1:actor.slot;panel.setAttribute('role','dialog');panel.setAttribute('aria-label','Shared Bank');document.body.append(panel);
   cancelActiveAbilityCharge(actor);cancelActiveHeavyAttackCharge(actor,game.world);game.keys?.clear();
   // Use the established browser-owned character menu channel online.
   if(game.onlineSession?.role==='guest'){game.onlineSession.wasMenuBusy=true;game.onlineSession.wire.send({type:'input',seq:++game.onlineSession.sequence,busy:true,input:{}});}
   panel.onclick=event=>{const button=event.target.closest('button');if(!button)return;const d=button.dataset;for(const b of panel.querySelectorAll('button'))b.classList.toggle('trade-controller-focus',b===button);
    if('bankClose'in d){close(actor);return;}if('bankStep'in d){const field=panel.querySelector('input');field.value=Math.max(1,(Number(field.value)||1)+Number(d.bankStep));return;}
    if('bankItem'in d){const withdraw=d.withdraw==='true';transfer(actor,{type:'item',withdraw,index:Number(d.bankItem),identity:s.identities[withdraw?'vault':'bag'][Number(d.bankItem)]});}
    else if('bankGold'in d||'bankAll'in d){const withdraw=(d.bankGold||d.bankAll)==='withdraw';transfer(actor,{type:'gold',withdraw,amount:'bankAll'in d?(withdraw?s.bankGold:s.carriedGold):Number(panel.querySelector('input').value)});}
   };
   panel.addEventListener('keydown',event=>{if(event.target.matches('input')){event.stopPropagation();if(event.key==='Escape')close(actor);}});
   lock(()=>{if(sessions.get(actor)!==s||!valid(actor,s))return;migrate();s.ready=true;}).catch(error=>{s.message=error.message;}).finally(()=>render());render();return true;
  },
  handleKeyboard(event){if(!sessions.has(game.player)||game.paused||game.couchCoopJoinMenu?.active)return false;if(event.target.matches?.('input'))return true;event.preventDefault();const action={Escape:'cancelPressed',ArrowUp:'upPressed',ArrowDown:'downPressed',ArrowLeft:'leftPressed',ArrowRight:'rightPressed',Enter:'confirmPressed'}[event.key];if(action)handleInput({[action]:true},game.player);return true;},
  reset(){for(const actor of [...sessions.keys()])close(actor);},destroy(){destroyed=true;this.reset();}
 };
}
