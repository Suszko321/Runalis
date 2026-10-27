import {ITEMS,getAllRecipes} from './data.js';
import {countItem} from './player.js';
import {getRecipeCraftStatus,upgradeOwnedGear,craftRecipe} from './craftingSystem.js';
import {normalizeEquipmentProgression,isTieredEquipment,makeOwnedGearUpgradeQuote} from './equipmentProgressionSystem.js';
import {beginWorkshopSession,endWorkshopSession,workshopAccessStatus} from './workshopAccess.js';
import {itemStatBlock} from './panelInventory.js';
import {menuDirection,directionalMenuItem} from './menuNavigation.js';
import {playSfx} from './audioSystem.js';

const escape=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const label=s=>String(s||'').replace(/^./,c=>c.toUpperCase());
function rows(s){
 const p=s.actor;
 if(s.kind==='craftsman')return getAllRecipes().filter(r=>s.category==='all'||r.skill===s.category).map(r=>({id:r.id,name:r.title||ITEMS[r.output]?.name||r.id,recipe:r,meta:`${label(r.skill)} ${r.requiredLevel||1}`}));
 normalizeEquipmentProgression(p);
 return [...Object.entries(p.equippedGear).filter(([,e])=>e).map(([slot,entry])=>({entry,location:`Equipped · ${label(slot)}`})),...p.inventory.filter(e=>isTieredEquipment(ITEMS[e.id])).map(entry=>({entry,location:'Bag'}))]
  .filter(({entry})=>s.category==='all'||(s.category==='weapons'?ITEMS[entry.id]?.type==='weapon':ITEMS[entry.id]?.type!=='weapon'))
  .map(({entry,location})=>({id:entry.instanceId,name:ITEMS[entry.id]?.name||entry.id,entry,meta:`${location} · Tier ${entry.upgradeTier}/20`}));
}
function categories(s){return s.kind==='blacksmith'?[['weapons','Weapons'],['armour','Armour & Trinkets'],['all','All Gear']]:[['all','All Recipes'],...[...new Set(getAllRecipes().map(r=>r.skill))].map(id=>[id,label(id)])];}
function requirements(p,materials){return (materials||[]).map(([id,n])=>`<div class="workshop-material"><span>${escape(ITEMS[id]?.name||id)}</span><strong class="${countItem(p,id)>=n?'enough':'missing'}">${countItem(p,id)} / ${n}</strong></div>`).join('');}
function detail(s,row){
 if(!row)return '<p>There are no items in this category. Retrieve Coterie equipment to your bag before bringing it to the forge.</p>';
 const p=s.actor;
 if(row.recipe){
  const r=row.recipe,item=ITEMS[r.output],status=getRecipeCraftStatus(p,r);
  return `<h3>${escape(row.name)}</h3><p>${escape(item?.desc||'')}</p><p>Creates ${escape(item?.name||r.output)} ×${r.outputQty||1}</p><p>${escape(label(r.skill))} ${r.requiredLevel||1} required · You: ${status.level||1} · ${r.xp||0} XP</p>${item?itemStatBlock(p,item,{id:item.id,upgradeTier:1}):''}<h4>Ingredients · Available / Required</h4>${requirements(p,r.materials)}<p class="missing">${escape(status.reason)}</p><button data-workshop-perform ${status.ok?'':'disabled'}>Craft ${escape(item?.name||r.output)}</button>`;
 }
 const item=ITEMS[row.entry.id],quote=makeOwnedGearUpgradeQuote(p,row.id);
 const missing=quote?.cost.materials.filter(([id,n])=>countItem(p,id)<n)||[],affordable=quote&&p.gold>=quote.cost.gold&&!missing.length;
 return `<h3>${escape(row.name)}</h3><p>${escape(row.meta)}</p><p>${escape(item?.desc||'')}</p><div class="workshop-comparison"><section><h4>Current · Tier ${row.entry.upgradeTier}</h4>${itemStatBlock(p,item,row.entry)}</section><section><h4>${quote?`After · Tier ${quote.targetTier}`:'Maximum Tier 20'}</h4>${quote?itemStatBlock(p,item,{...row.entry,upgradeTier:quote.targetTier}):'<p>This piece has reached its upgrade cap.</p>'}</section></div>${quote?`<h4>Materials · Available / Required</h4>${requirements(p,quote.cost.materials)}<p class="${p.gold>=quote.cost.gold?'enough':'missing'}">Ash Coins: ${p.gold||0} / ${quote.cost.gold}</p><p class="missing">${escape(missing.length?'Missing upgrade materials.':p.gold<quote.cost.gold?'Not enough Ash Coins.':'')}</p><button data-workshop-perform ${affordable?'':'disabled'}>${s.pending?.instanceId===quote.instanceId&&s.pending.currentTier===quote.currentTier?'Confirm Upgrade':'Review Upgrade'}</button>`:''}`;
}
function refresh(game){
 const host=game.hostGame||game,s=host.workshopService,overlay=document.getElementById('workshopServiceOverlay');if(!s||!overlay)return;
 if(!workshopAccessStatus(s.actor,s.kind).ok){closeWorkshopService(host);return;}
 const list=rows(s);if(!list.some(r=>r.id===s.selected)){s.selected=list[0]?.id||null;s.pending=null;}
 const chosen=list.find(r=>r.id===s.selected),scroll=overlay.querySelector('.workshop-list')?.scrollTop||0;
 overlay.innerHTML=`<div class="workshop-panel" role="dialog" aria-modal="true" aria-labelledby="workshop-heading"><header><div><small>${escape(s.world.name||'Settlement')} · ${s.kind==='blacksmith'?'Forge':'Workshop'}</small><h2 id="workshop-heading">${escape(s.npc.name)}</h2></div><div>Ash Coins <b>${s.actor.gold||0}</b></div><button data-workshop-close aria-label="Leave workshop">Leave</button></header><nav aria-label="Service categories">${categories(s).map(([id,name])=>`<button data-workshop-category="${id}" aria-pressed="${s.category===id}">${escape(name)}</button>`).join('')}</nav><div class="workshop-body"><div class="workshop-list" role="listbox" aria-label="${s.kind==='blacksmith'?'Owned equipment':'Crafting recipes'}">${list.map((r,i)=>`<button data-workshop-row="${i}" role="option" aria-selected="${r.id===s.selected}" class="${r.id===s.selected?'selected':''}"><b>${escape(r.name)}</b><small>${escape(r.meta)}</small></button>`).join('')||'<p>No items in this category.</p>'}</div><div class="workshop-detail">${detail(s,chosen)}</div></div><footer><div role="status" aria-live="polite">${escape(s.message||'Choose an item. Upgrades require confirmation; you can work on several pieces without leaving.')}</div>${s.kind==='blacksmith'?'<button data-workshop-supply>Refine Ore / Buy Scrap</button>':''}<small>Arrows / D-pad: select · Enter / A: action · LB/RB: category · Esc / B: leave</small></footer></div>`;
 overlay.querySelector('.workshop-list').scrollTop=scroll;
 overlay.querySelectorAll('[data-workshop-row]').forEach(button=>{button.onclick=()=>{s.selected=list[Number(button.dataset.workshopRow)].id;s.pending=null;refresh(game);overlay.querySelector(`[data-workshop-row="${button.dataset.workshopRow}"]`)?.focus({preventScroll:true});};});
 overlay.querySelectorAll('[data-workshop-category]').forEach(button=>button.onclick=()=>{s.category=button.dataset.workshopCategory;s.selected=null;s.pending=null;refresh(game);overlay.querySelector('[data-workshop-row]')?.focus();});
 overlay.querySelector('[data-workshop-close]').onclick=()=>closeWorkshopService(host);
 overlay.querySelector('[data-workshop-perform]')?.addEventListener('click',()=>performSelected(game));
 overlay.querySelector('[data-workshop-supply]')?.addEventListener('click',async()=>{const {supplyBlacksmithMaterials}=await import('./hubSystem.js');s.message=supplyBlacksmithMaterials(game)?'Smithing supplies updated.':'Bring Iron Ore ×2 or 18 Ash Coins for more scrap.';refresh(game);});
}
export function openWorkshopService(game,npc,category='all'){
 if(!game?.player||typeof document==='undefined')return false;
 if(game.player.networkRemote&&(game.hostGame||game).onlineSession?.delegateService(game.player,{type:category==='weapons'?'workshopWeapons':category==='armour'?'workshopArmour':'workshopCraft'},npc))return true;
 const host=game.hostGame||game;if(host.marketShop?.active)return false;
 const session=beginWorkshopSession(game,npc,npc?.workshopService);if(!session){game.log?.('Approach the service provider to use this workshop.');return false;}
 host.setUiOwner?.(game.player);session.category=category==='craft'?'all':category;session.previousFocus=document.activeElement;
 injectStyles();let overlay=document.getElementById('workshopServiceOverlay');
 if(!overlay){overlay=document.createElement('div');overlay.id='workshopServiceOverlay';document.body.appendChild(overlay);}
 overlay.classList.add('active');overlay.dataset.ownerSlot=String(game.player.slot||game.player.playerNumber||1);overlay.tabIndex=-1;overlay.__game=game;
 if(game.player.controllerSlotIndex!=null)overlay.dataset.controllerSlotIndex=String(game.player.controllerSlotIndex);else delete overlay.dataset.controllerSlotIndex;
 Object.assign(game.input||host.input||{},{moveX:0,moveY:0,attackHeld:false,attackPressed:false,attackReleased:false,dashPressed:false});
 refresh(game);overlay.querySelector('[data-workshop-row]')?.focus();return true;
}
export function closeWorkshopService(game){
 const host=game?.hostGame||game,s=host?.workshopService;endWorkshopSession(s?.actor);
 const overlay=typeof document==='undefined'?null:document.getElementById('workshopServiceOverlay');overlay?.remove();
 s?.previousFocus?.isConnected&&s.previousFocus.focus({preventScroll:true});
}
export function updateWorkshopService(game){const s=(game.hostGame||game).workshopService;if(s&&!workshopAccessStatus(s.actor,s.kind).ok)closeWorkshopService(game);}
function performSelected(game){
 const s=(game.hostGame||game).workshopService;if(!s||!workshopAccessStatus(s.actor,s.kind).ok){closeWorkshopService(game);return false;}
 const row=rows(s).find(r=>r.id===s.selected);if(!row)return false;let success=false;
 if(s.kind==='craftsman')success=craftRecipe(s.actor,row.recipe.id,game);
 else{
  const quote=makeOwnedGearUpgradeQuote(s.actor,row.id);if(!quote)return false;
  if(!s.pending||s.pending.instanceId!==quote.instanceId||s.pending.currentTier!==quote.currentTier){s.pending=quote;s.message=`Confirm ${row.name}: Tier ${quote.currentTier} → ${quote.targetTier}, ${quote.cost.gold} Ash Coins. The listed materials will be consumed.`;refresh(game);document.querySelector('[data-workshop-perform]')?.focus();return false;}
  success=upgradeOwnedGear(s.actor,s.pending,game);s.pending=null;
 }
 s.message=success?(s.kind==='blacksmith'?'Upgrade complete. The same item now carries its new tier.':'Crafting complete. The result is in your inventory.'):'Requirements changed. Review the current costs and materials.';
 if(success){s.npc.workPulseUntil=performance.now()/1000+.45;s.world.effects ||= [];if(s.world.effects.length<280)s.world.effects.push({kind:'workshopStrike',x:s.npc.x,y:s.npc.y,service:s.kind,age:0,ttl:.35,layer:'front'});playSfx(s.kind==='blacksmith'?'mining':'harvest',{volume:.5,throttle:.08});}
 refresh(game);document.querySelector('[data-workshop-perform]')?.focus({preventScroll:true});return success;
}
export function handleWorkshopControllerInput(input){
 const overlay=document.getElementById('workshopServiceOverlay');if(!overlay?.classList.contains('active'))return false;
 const game=overlay.__game,s=(game.hostGame||game).workshopService;if(!s)return false;
 if(input.cancelPressed||input.backPressed){closeWorkshopService(game);return true;}
 if(input.lbPressed||input.rbPressed||input.leftShoulderPressed||input.rightShoulderPressed){const tabs=categories(s),i=tabs.findIndex(([id])=>id===s.category),delta=input.lbPressed||input.leftShoulderPressed?-1:1;s.category=tabs[(i+delta+tabs.length)%tabs.length][0];s.selected=null;s.pending=null;refresh(game);overlay.querySelector('[data-workshop-row]')?.focus();return true;}
 const direction=menuDirection(input);
 if(direction){const buttons=[...overlay.querySelectorAll('button:not(:disabled)')],next=directionalMenuItem(buttons,document.activeElement,direction);if(next?.dataset.workshopRow!=null){s.selected=rows(s)[Number(next.dataset.workshopRow)].id;s.pending=null;const index=next.dataset.workshopRow;refresh(game);overlay.querySelector(`[data-workshop-row="${index}"]`)?.focus();}else next?.focus();return true;}
 if(input.confirmPressed){const focused=document.activeElement;if(focused?.matches('[data-workshop-row]')||!overlay.contains(focused))performSelected(game);else focused?.click();return true;}
 return true;
}
function injectStyles(){
 if(document.getElementById('workshopStyles'))return;const style=document.createElement('style');style.id='workshopStyles';style.textContent=`
 #workshopServiceOverlay.active{position:fixed;inset:0;z-index:18000;display:grid;place-items:center;background:#090b0de8;padding:12px;color:#e2d6bb;font:16px system-ui}
 #workshopServiceOverlay *{box-sizing:border-box}.workshop-panel{width:min(1120px,100%);max-height:calc(100dvh - 24px);height:800px;display:flex;flex-direction:column;background:#202220;border:2px solid #877452;box-shadow:0 15px 60px #0009}
 .workshop-panel header,.workshop-panel footer{padding:14px 18px;display:flex;gap:14px;align-items:center;border-bottom:1px solid #63573e;flex-wrap:wrap}.workshop-panel header h2{margin:3px 0;font-size:24px}.workshop-panel header>div:first-child{flex:1}.workshop-panel nav{display:flex;gap:6px;padding:10px;flex-wrap:wrap}.workshop-panel button{font:inherit;color:#e8ddc6;background:#37372f;border:1px solid #796747;padding:10px 14px;min-height:40px;cursor:pointer}.workshop-panel button:focus-visible{outline:2px solid #e6c47e;outline-offset:-3px}.workshop-panel button:disabled{opacity:.5;cursor:default}.workshop-panel button[aria-pressed=true],.workshop-panel .selected{background:#594b31;border-color:#d6b36b}
 .workshop-body{display:grid;grid-template-columns:minmax(200px,34%) 1fr;min-height:0;flex:1;border-top:1px solid #63573e}.workshop-list,.workshop-detail{overflow:auto;min-height:0;padding:14px}.workshop-list{border-right:1px solid #63573e}.workshop-list button{display:flex;flex-direction:column;text-align:left;width:100%;margin-bottom:7px;gap:5px}.workshop-detail h3{margin-top:0}.workshop-detail p{line-height:1.4}.workshop-comparison{display:grid;grid-template-columns:1fr 1fr;gap:14px}.workshop-comparison section{padding:10px;background:#181b18}.workshop-material,.workshop-detail .stat-row{display:flex;justify-content:space-between;gap:12px;padding:4px 0}.workshop-panel .enough{color:#b4ccad}.workshop-panel .missing{color:#d6a598}.workshop-panel footer{border-top:1px solid #63573e;border-bottom:0}.workshop-panel footer [role=status]{flex:1;min-width:200px}.workshop-panel footer small{width:100%;color:#b8af9b}
 @media(max-width:650px){#workshopServiceOverlay.active{padding:0}.workshop-panel{height:100dvh;max-height:100dvh}.workshop-panel header{padding:8px}.workshop-panel header h2{font-size:19px}.workshop-body{grid-template-columns:minmax(120px,32%) 1fr}.workshop-list,.workshop-detail{padding:8px}.workshop-comparison{grid-template-columns:1fr}.workshop-panel button{padding:9px}.workshop-panel footer{padding:8px}.workshop-panel footer small{font-size:11px}}
 `;document.head.appendChild(style);
 document.addEventListener('keydown',e=>{
  const overlay=document.getElementById('workshopServiceOverlay');if(!overlay?.classList.contains('active'))return;
  e.stopPropagation();if(e.repeat&&e.key==='Enter'){e.preventDefault();return;}
  if(e.key==='Escape'){e.preventDefault();closeWorkshopService(overlay.__game);return;}
  if(e.key==='Tab'){const buttons=[...overlay.querySelectorAll('button:not(:disabled)')];const i=buttons.indexOf(document.activeElement),next=buttons[(i+(e.shiftKey?-1:1)+buttons.length)%buttons.length];e.preventDefault();next?.focus();return;}
  const directions={ArrowUp:'up',ArrowDown:'down',ArrowLeft:'left',ArrowRight:'right'};
  if(directions[e.key]){e.preventDefault();handleWorkshopControllerInput({[`${directions[e.key]}Pressed`]:true});}
  if(e.key==='Enter'){e.preventDefault();handleWorkshopControllerInput({confirmPressed:true});}
 },true);
}
