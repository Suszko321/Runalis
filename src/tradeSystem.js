// Host-owned, transient two-party transactions. No item leaves its bag until
// both players approve the same revision on the separate final-review screen.
import {ITEMS,RECIPES} from './data.js';
import {isItemLocked,isGearInstanceEquipped} from './gearServices.js';
import {gearAcquisitionReason} from './gearItemization.js';
import {gearRarity} from './gearRarity.js';
import {hasLineOfSight} from './world.js';

export const TRADE_WAIT_SECONDS=4;
export const TRADE_RANGE=72;
const MAX_LINES=20,MAX_BAG=2000;
const ingredients=new Set(Object.values(RECIPES).flatMap(r=>(r.materials||[]).map(([id])=>id)));
const alive=p=>p&&p.active!==false&&p.joined!==false&&p.hp>0&&!p.dead&&!p.remove&&(!p.lifeState||p.lifeState==='alive');
const integer=n=>Number.isSafeInteger(n)&&n>=0;
const balance=p=>integer(p.gold)?p.gold:0;
const clone=value=>structuredClone(value);
const economicState=p=>JSON.stringify([p.inventory,p.gold,p.equipment,p.equippedGear,p.gravecaller?.skeletons?.map(s=>s.equippedGear)]);

export function tradeItemReason(player,entry){
 const item=ITEMS[entry?.id];
 if(!item||!Object.hasOwn(ITEMS,entry.id))return 'Unknown item.';
 if(['material','reagent','fish','currency'].includes(item.type)||ingredients.has(entry.id))return 'Crafting materials cannot be traded.';
 if(item.type==='quest'||item.questItem||item.noTrade||item.soulbound||entry.bound||entry.soulbound)return 'This item belongs to your character.';
 if(isItemLocked(entry))return 'Unlock this item before trading it.';
 if(isGearInstanceEquipped(player,entry))return 'Unequip this item before trading it.';
 if(!Number.isSafeInteger(entry.qty)||entry.qty<1)return 'Invalid item quantity.';
 return '';
}

export function createTradeSystem(game,{changed=()=>{},completed=()=>{},persist=()=>true}={}){
 const sessions=new Set(),pairs=new Map(),positions=new Map(),keys=new WeakMap();
 let world=game.world,sequence=0,itemSequence=0;
 const members=()=>[game.player,...(game.player?.coop?.players||[])].filter(p=>p&&p.active!==false);
 const current=actor=>[...sessions].find(s=>s.actors.includes(actor));
 const key=entry=>{if(!keys.has(entry))keys.set(entry,`item-${++itemSequence}`);return keys.get(entry);};
 const id=actor=>actor===game.player?'host':actor.networkId||actor.profileId||`local-${actor.slot}`;
 const basicPair=(a,b)=>game.world?.safeZone===true&&alive(a)&&alive(b)&&a!==b&&
  Math.hypot(a.x-b.x,a.y-b.y)<=TRADE_RANGE&&hasLineOfSight(game.world,a.x,a.y,b.x,b.y);
 const connected=actor=>actor===game.player||actor.networkRemote||!actor.controllerDisconnected;
 const free=actor=>connected(actor)&&!current(actor)&&!actor.networkMenuBusy&&!game.isActorInterfaceBusy?.(actor)&&!game.partyEntryReady&&!game.couchCoopJoinMenu?.active;
 const stationary=actor=>{const last=positions.get(actor);return last&&Math.hypot(actor.x-last.x,actor.y-last.y)<.25&&!actor.isMoving&&!actor.activeChannel&&!actor.abilityCharge?.active&&!actor.combatState?.heavyChargeActive&&!actor.combatState?.attacking;};
 const readyFor=actor=>[...pairs.values()].filter(p=>p.time>=TRADE_WAIT_SECONDS&&p.actors.includes(actor)&&p.actors.every(free)&&basicPair(...p.actors)).map(p=>p.actors.find(a=>a!==actor));
 const forget=actors=>{for(const [k,p]of pairs)if(p.actors.some(a=>actors.includes(a)))pairs.delete(k);};
 function cancel(session,reason='Trade declined. Nothing was exchanged.'){
  if(!sessions.delete(session))return false;
  forget(session.actors);changed(session.actors,reason);return true;
 }
 function valid(session){
  const party=members();
  if(session.actors.some(a=>!connected(a)))return 'Trade cancelled: a controller disconnected. Nothing was exchanged.';
  if(session.world!==game.world||!session.actors.every(a=>party.includes(a))||!basicPair(...session.actors)||game.partyEntryReady)return 'Trade cancelled: stay together in a safe zone.';
  if(session.actors.some((a,i)=>economicState(a)!==session.baseline[i]))return 'Inventory or gold changed. Trade cancelled; nothing was exchanged.';
  return '';
 }
 function inventory(actor){return (actor.inventory||[]).filter(e=>!tradeItemReason(actor,e)).map(e=>({key:key(e),id:e.id,name:ITEMS[e.id].name,qty:e.qty,rarity:gearRarity(ITEMS[e.id],e),tier:e.upgradeTier||null}));}
 function offered(session,i){return session.offers[i].items.map(line=>{
  const entry=session.actors[i].inventory.find(e=>key(e)===line.key);
  return {...line,id:entry.id,name:ITEMS[entry.id].name,rarity:gearRarity(ITEMS[entry.id],entry),tier:entry.upgradeTier||null};
 });}
 function snapshot(actor){
  const session=current(actor);
  if(!session)return {nearby:readyFor(actor).map(p=>({id:id(p),name:p.name,x:p.x,y:p.y}))};
  const i=session.actors.indexOf(actor),other=1-i;
  return {nearby:[],id:session.id,revision:session.revision,stage:session.stage,
   name:actor.name,partner:session.actors[other].name,gold:balance(actor),inventory:inventory(actor),
   own:{gold:session.offers[i].gold,items:offered(session,i)},other:{gold:session.offers[other].gold,items:offered(session,other)},
   accepted:session.accepted.has(actor),partnerAccepted:session.accepted.has(session.actors[other]),
   confirmed:session.confirmed.has(actor),partnerConfirmed:session.confirmed.has(session.actors[other])};
 }
 function interact(actor,targetId){
  if(current(actor))return true;
  if(game.paused||!free(actor))return false;
  const partner=readyFor(actor).filter(p=>!targetId||id(p)===targetId).sort((a,b)=>Math.hypot(a.x-actor.x,a.y-actor.y)-Math.hypot(b.x-actor.x,b.y-actor.y))[0];
  if(!partner)return false;
  const actors=[actor,partner];
  const session={id:++sequence,world:game.world,actors,revision:1,stage:'offer',offers:actors.map(()=>({gold:0,items:[]})),accepted:new Set(),confirmed:new Set(),baseline:actors.map(economicState)};
  sessions.add(session);forget(actors);game.blur?.();changed(actors,'');return true;
 }
 function exchange(session){
  const invalid=valid(session);if(invalid)return invalid;
  const result=session.actors.map((a,i)=>{
   const offer=session.offers[i];if(!integer(a.gold)||offer.gold>a.gold)throw Error('Not enough gold.');
   const bag=clone(a.inventory);
   for(const line of offer.items){
    const index=a.inventory.findIndex(e=>key(e)===line.key),entry=a.inventory[index];
    if(!entry||tradeItemReason(a,entry)||!integer(line.qty)||line.qty<1||line.qty>entry.qty)throw Error('An offered item is no longer available.');
    bag[index].qty-=line.qty;
   }
   return {inventory:bag.filter(e=>e.qty>0),gold:a.gold-offer.gold};
  });
  for(let i=0;i<2;i++){
   const source=session.actors[1-i],incoming=session.offers[1-i],target=result[i];
   target.gold+=incoming.gold;if(!integer(target.gold))throw Error('This gold amount is too large.');
   const ownedIds=new Set([...target.inventory,...Object.values(session.actors[i].equippedGear||{}),...(session.actors[i].gravecaller?.skeletons||[]).flatMap(s=>Object.values(s.equippedGear||{}))].map(e=>e?.instanceId).filter(Boolean));
   for(const line of incoming.items){
    const entry=source.inventory.find(e=>key(e)===line.key),copy=clone({...entry,qty:line.qty});
    if(copy.instanceId&&ownedIds.has(copy.instanceId))throw Error('This gear identity already exists in the receiving character.');
    const reason=gearAcquisitionReason({...session.actors[i],inventory:target.inventory},copy.id,copy.qty,copy);
    if(reason)throw Error(reason);
    if(copy.instanceId)ownedIds.add(copy.instanceId);
    const metadata=e=>JSON.stringify({...e,qty:0});
    const stack=ITEMS[copy.id].stack&&target.inventory.find(e=>metadata(e)===metadata(copy));
    if(stack){stack.qty+=copy.qty;if(!integer(stack.qty))throw Error('This item stack is too large.');}
    else target.inventory.push(copy);
    if(target.inventory.length>MAX_BAG)throw Error('The receiving bag is full.');
   }
  }
  if(!persist(session.actors,result))throw Error('Could not save the exchange. Nothing was exchanged; free browser storage and try again.');
  // One synchronous commit, after validating BOTH projected inventories.
  for(let i=0;i<2;i++)Object.assign(session.actors[i],result[i]);
  sessions.delete(session);forget(session.actors);return '';
 }
 function action(actor,command){
  const session=current(actor);
  if(!session||!command||command.id!==session.id)return {ok:false,reason:'This trade has ended.'};
  if(command.type==='cancel'){cancel(session);return {ok:true};}
  const invalid=valid(session);if(invalid){cancel(session,invalid);return {ok:false,reason:invalid};}
  if(game.paused||command.revision!==session.revision)return {ok:false,reason:'The offer changed. Review the current offer before accepting.'};
  const index=session.actors.indexOf(actor),offer=session.offers[index];
  const reset=()=>{session.revision++;session.accepted.clear();session.confirmed.clear();};
  if(command.type==='edit'&&session.stage==='review'){session.stage='offer';reset();}
  else if(command.type==='accept'&&session.stage==='offer'){
   if(!session.offers.some(o=>o.gold||o.items.length))return {ok:false,reason:'Add an item or gold first.'};
   session.accepted.add(actor);
   if(session.accepted.size===2){session.stage='review';reset();}
  }else if(command.type==='confirm'&&session.stage==='review'){
   session.confirmed.add(actor);
   if(session.confirmed.size===2){
    try{const reason=exchange(session);if(reason)throw Error(reason);}
    catch(error){cancel(session,`Trade cancelled: ${error.message}`);return {ok:false,reason:error.message};}
    completed(session.actors);changed(session.actors,'Trade completed.');
    return {ok:true};
   }
  }else if(session.stage==='offer'&&command.type==='gold'){
   if(!integer(command.gold)||command.gold>balance(actor))return {ok:false,reason:'Choose a whole gold amount you own.'};
   offer.gold=command.gold;reset();
  }else if(session.stage==='offer'&&command.type==='add'){
   const entry=actor.inventory.find(e=>key(e)===command.key),line=offer.items.find(e=>e.key===command.key);
   if(!entry||tradeItemReason(actor,entry))return {ok:false,reason:'That item cannot be traded.'};
   if(!integer(command.qty)||command.qty<1||(line?.qty||0)+command.qty>entry.qty)return {ok:false,reason:'Choose an available whole item quantity.'};
   if(line)line.qty+=command.qty;
   else {if(offer.items.length>=MAX_LINES)return {ok:false,reason:'Offer at most 20 different items.'};offer.items.push({key:command.key,qty:command.qty});}
   reset();
  }else if(session.stage==='offer'&&command.type==='remove'){
   if(!offer.items.some(e=>e.key===command.key))return {ok:false,reason:'This item is not offered.'};
   offer.items=offer.items.filter(e=>e.key!==command.key);reset();
  }else return {ok:false,reason:'This action is unavailable on this trade screen.'};
  changed(session.actors,'');return {ok:true};
 }
 function update(dt){
  if(world!==game.world){reset();world=game.world;}
  for(const session of [...sessions]){const reason=valid(session);if(reason)cancel(session,reason);}
  const party=members();
  for(const [actor]of positions)if(!party.includes(actor))positions.delete(actor);
  const live=new Set();
  for(let i=0;i<party.length;i++)for(let j=i+1;j<party.length;j++){
   const a=party[i],b=party[j],pairKey=[id(a),id(b)].sort().join('|');live.add(pairKey);
   let pair=pairs.get(pairKey);
   if(!pair||!pair.actors.includes(a)||!pair.actors.includes(b)){pair={actors:[a,b],time:0};pairs.set(pairKey,pair);}
   if(basicPair(a,b)&&free(a)&&free(b)&&stationary(a)&&stationary(b)&&!game.paused)pair.time+=Math.max(0,Math.min(dt,.1));
   else pair.time=0;
  }
  for(const k of pairs.keys())if(!live.has(k))pairs.delete(k);
  for(const actor of party)positions.set(actor,{x:actor.x,y:actor.y});
 }
 function reset(){for(const s of [...sessions])cancel(s,'Trade cancelled. Nothing was exchanged.');pairs.clear();positions.clear();}
 return {update,interact,action,snapshot,isBusy:actor=>!!current(actor),cancelActor(actor,reason){const s=current(actor);if(s)cancel(s,reason);forget([actor]);positions.delete(actor);},reset};
}
