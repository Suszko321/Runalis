import {createSaveState,applySaveToGame,upsertProfile} from './gameSave.js';
import {migratePlayer,getClassDefinition} from './player.js';
import {joinOnlineCoopPlayer,leaveCouchCoopPlayer} from './couchCoop.js';
import {updateDialogueInput,closeDialogue} from './dialogueSystem.js';
import {openWorkshopService,closeWorkshopService} from './workshopService.js';
import {openMarketShop} from './shopSystem.js';
import {closeCharacterCreator} from './characterCreator.js';
import {renderOnlineFishing,handleFishingMiniGameInput} from './survivalSkills.js';
import {createOnlinePeer,bindOnlineConnection} from './onlineTransport.js';
import {ONLINE_PROTOCOL,ONLINE_BUILD,wireClone,passwordRoom,roomProof,checkRoomProof,sanitizeOnlineInput,mergeOnlineInput,clearOnlineEdges,rebaseCharacterClock} from './onlineProtocol.js';
import {createOnlineMenu} from './onlineMenu.js';
import {hostPresentationRefs,actorPresentation,hydratePresentation,eliteEncounterPresentation} from './onlinePresentation.js';
import {observeSfx,playSfx} from './audioSystem.js';
import {cancelActiveAbilityCharge,cancelActiveHeavyAttackCharge} from './combat.js';
import {answerPartyEntry,partyEntrySnapshot,receivePartyEntry,partyEntryPending,cancelPartyEntry} from './partyEntrySystem.js';

const CHARACTER_FIELDS=['name','appearance','bodyType','skin','hair','shirt','pants','boots','inventory','equipment','equippedGear','equipmentProgressionVersion','gearInstanceSequence','equipmentInstances','ownedGear','gearInstances','loadout','gold','attributes','attributePoints','skillState','skillTree','skills','knownAbilities','unlockedAbilities','unlockedPassives','abilityMorphs','abilityMastery','abilityExpertise','skillExpertise','expertise','crafting','craftingState','recipeUnlocks','inputBindings'];
const VISUAL_FIELDS=['name','x','y','dirX','dirY','hp','maxHp','stamina','maxStamina','spirit','maxSpirit','isMoving','walkTime','lifeState','downedState','reviveAction','combatState','actionState','visualAction','visualHitUntil','abilityCharge','activeChannel','summons','traps','combatEffects','floatingTexts','flags','classId','className','appearance','bodyType','skin','hair','shirt','pants','boots','equipment','loadout','level','combatLevel','bloodline','gravecaller','lightbringer','currentZone','lastCombatAimX','lastCombatAimY','eliteFrost','eliteFrozenUntil','eliteFrostRecoveryUntil'];
const pick=(object,fields)=>Object.fromEntries(fields.filter(key=>object[key]!==undefined).map(key=>[key,object[key]]));
const sceneIds=new WeakMap();let nextScene=0;
const sceneKey=world=>{if(!sceneIds.has(world))sceneIds.set(world,++nextScene);return `${sceneIds.get(world)}:${world.mode}:${world.floor||0}:${world.seed||0}`;};
const entityIds=new WeakMap();let nextEntity=0;
const entityId=(entity,group)=>{if(entity.id!=null)return String(entity.id);if(!entityIds.has(entity))entityIds.set(entity,`${group}-online-${++nextEntity}`);return entityIds.get(entity);};
// The creator completes by choosing a class (including Classless). It has
// never written a separate characterCreationComplete flag to real profiles.
function usableCharacter(player){return !!getClassDefinition(player?.classId)?.id&&Array.isArray(player.inventory)&&player.inventory.length<=2000;}
function friendlyError(error){
 if(error?.type==='unavailable-id')return 'A world already uses that password. Choose another password, or join it.';
 if(error?.type==='peer-unavailable')return 'No open world was found with that password. Check it with the host and try again.';
 return error?.message||'Could not connect. Try again or use another network.';
}

export function createOnlineSession(game) {return new OnlineSession(game);}
class OnlineSession {
 constructor(game){
  this.game=game;this.role=null;this.connecting=false;this.clients=new Map();this.receivedGroups={};this.smoothing=new Map();this.partyActors=new Map();this.menu=createOnlineMenu(this);
  this.status='Choose Open World or Join World.';this.sendAt=0;this.hostAt=0;this.saveAt=0;this.offset=0;this.ready=false;this.sequence=0;this.initializing=false;
  this.audioQueue=[];this.audioSequence=0;this.audioTimes=new Map();this.unsubscribeAudio=observeSfx((name,options)=>{
   if(this.role!=='host'||['ui','menuBack','dialogueTick','save','profile'].includes(name))return;
   const key=`${name}:${options.family||''}:${options.phase||''}`,now=Date.now();if(now-(this.audioTimes.get(key)||0)<Math.max(30,(options.throttle||0)*1000))return;this.audioTimes.set(key,now);
   this.audioQueue.push({id:++this.audioSequence,name,at:performance.now(),options:wireClone(pick(options,['volume','throttle','heavy','finisher','family','phase','frequency','recipe','skill','classId','chargeLevel']))});if(this.audioQueue.length>64)this.audioQueue.shift();
  });
 }
 openMenu(){this.game.togglePause(false);this.menu.open();}
 handleMenuInput(input){return this.menu.handleInput(input);}
 setStatus(text){this.status=text;this.menu.render();}
 async connect(kind,password){
  if(this.role||this.connecting)return;
  if(!globalThis.isSecureContext||!globalThis.RTCPeerConnection)throw Error('Use the secure Runalis website link or localhost in a browser that supports online play.');
  const attempt=this.attempt=(this.attempt||0)+1;
  this.lastSaveSucceeded=null;
  if(!getClassDefinition(this.game.player?.classId)?.id)throw Error('Choose your character’s class before opening or joining a world.');
  if(!usableCharacter(this.game.player))throw Error('Your character inventory could not be prepared for online play. Save and reload your character, then try again.');
  if(this.game.world.mode==='act1Opening')throw Error('Finish or skip the opening cinematic first.');
  if(this.game.player.coop?.players?.some(p=>p.active!==false))throw Error('Leave the local co-op session before using online multiplayer.');
  this.connecting=true;this.menu.render();this.setStatus(kind==='host'?'Opening your world…':'Finding the host’s world…');
  try{
   const room=await passwordRoom(password);if(!this.connecting||attempt!==this.attempt)return;
   this.room=room;const created=await createOnlinePeer(kind==='host'?room.id:'runalis-player-'+crypto.randomUUID());
   if(!this.connecting||attempt!==this.attempt){created.destroy();return;}this.peer=created;
   const peer=this.peer;
   peer.on('error',error=>{if(this.peer===peer)this.fail(friendlyError(error));});
   peer.on('disconnected',()=>{if(this.peer===peer&&!peer.destroyed){try{peer.reconnect();}catch{this.fail('The connection service disconnected. Please reopen the world.');}}});
   peer.on('connection',connection=>{if(this.role==='host')this.acceptConnection(connection);else connection.close();});
   this.connectTimer=setTimeout(()=>this.fail('Connection timed out. Check the password, keep the host’s game open, and try another network if needed.'),25000);
   peer.on('open',()=>{
    if(this.peer!==peer)return;
    if(kind==='host'){
     clearTimeout(this.connectTimer);this.connecting=false;this.role='host';this.setStatus('World open. Friends can join using the same password.');this.menu.clearPassword();this.game.log('Online world opened.');
    }else this.joinConnection(peer.connect(room.id,{serialization:'json',reliable:true,metadata:{protocol:ONLINE_PROTOCOL,build:ONLINE_BUILD}}));
   });
  }catch(error){if(attempt===this.attempt)this.fail(friendlyError(error));}
 }
 fail(message){this.disconnect({restore:true});this.setStatus(this.lastSaveSucceeded===false?'Connection ended. Your character is still loaded, but saving failed. Use Save before closing this tab.':message);if(!this.game.destroyed)this.menu.open();}
 acceptConnection(connection){
  if(this.clients.size>=3){connection.on('open',()=>{const wire=bindOnlineConnection(connection,()=>{},()=>{});wire.send({type:'error',message:'This world is full (four players).'});setTimeout(()=>connection.close(),500);});return;}
  const challenge=crypto.randomUUID()+crypto.randomUUID(),roomKey=this.room.key,record={connection,actor:null,input:sanitizeOnlineInput(),lastInput:Date.now(),lastSeq:-1,ready:false,scene:null,caches:{},at:Date.now(),packets:0,window:Date.now()};
  this.clients.set(connection.peer,record);
  const remove=()=>this.removeClient(connection.peer);
  record.wire=bindOnlineConnection(connection,packet=>{
   if(Date.now()-record.window>1000){record.window=Date.now();record.packets=0;}
   if(++record.packets>100){remove();return;}
   this.hostMessage(record,packet,challenge).catch(()=>remove());
  },remove);
  connection.on('close',remove);
  connection.on('open',()=>roomProof(roomKey,'host:'+challenge).then(proof=>{if(this.clients.get(connection.peer)===record)record.wire.send({type:'challenge',challenge,proof,protocol:ONLINE_PROTOCOL,build:ONLINE_BUILD});}).catch(remove));
 }
 async hostMessage(record,packet,challenge){
  if(!packet||typeof packet!=='object')throw Error('Invalid packet');
  if(!record.actor){
   if(packet.type!=='authenticate'||packet.protocol!==ONLINE_PROTOCOL||packet.build!==ONLINE_BUILD||!usableCharacter(packet.player)||!await checkRoomProof(this.room.key,'guest:'+challenge,packet.proof)){
    record.wire.send({type:'error',message:'Could not authenticate this character. Refresh both games and check the password.'});setTimeout(()=>this.removeClient(record.connection.peer),300);return;
   }
   if(record.actor||this.role!=='host'||this.clients.get(record.connection.peer)!==record)return;
   record.actor=joinOnlineCoopPlayer(this.game,rebaseCharacterClock(packet.player,performance.now()/1000),record.connection.peer);
   if(!record.actor)throw Error('World full');
   record.lastInput=Date.now();this.setStatus(`${this.clients.size+1}/4 players connected.`);this.sendInitial(record);return;
  }
  if(packet.type==='ready'){record.ready=true;return;}
  if(packet.type==='leave'){this.removeClient(record.connection.peer);return;}
  if(packet.type==='party-entry'){
   if(record.ready&&Number.isSafeInteger(packet.id)&&typeof packet.accept==='boolean')answerPartyEntry(this.game,record.actor,packet.accept,packet.id);
   return;
  }
  if(packet.type==='input'){
   if(!Number.isSafeInteger(packet.seq)||packet.seq<=record.lastSeq)return;
   record.lastSeq=packet.seq;record.lastInput=Date.now();
   if(packet.busy===true&&!record.actor.networkMenuBusy){cancelActiveAbilityCharge(record.actor);cancelActiveHeavyAttackCharge(record.actor,this.game.world);}
   record.actor.networkMenuBusy=packet.busy===true;
   record.viewWidth=Math.max(320,Math.min(4096,Number(packet.viewport?.width)||960));record.viewHeight=Math.max(240,Math.min(4096,Number(packet.viewport?.height)||600));
   record.input=mergeOnlineInput(record.input,sanitizeOnlineInput(packet.input));return;
  }
  if(packet.type==='character'&&record.actor.networkMenuBusy){
   // Co-op characters belong to their own browser. Only menu-owned character
   // fields are accepted; position, damage, health and the world remain host-run.
   const character=packet.character;if(!character||JSON.stringify(character).length>256000)throw Error('Invalid character update');
   Object.assign(record.actor,pick(character,CHARACTER_FIELDS));migratePlayer(record.actor);record.wire.send({type:'character-accepted',revision:packet.revision});return;
  }
  if(packet.type==='dialogue'&&this.game.dialogue?.actor===record.actor){
   if(packet.close)closeDialogue(this.game.dialogue);
   else updateDialogueInput(this.game.dialogue,pick(packet.input||{},['confirmPressed','confirmHeld','confirmReleased','cancelPressed','upPressed','downPressed','historyPressed','pointerConfirm','pointerChoiceIndex','inputDevice']),record.actor,this.game.world);
  }
  if(packet.type==='fishing'&&this.game.fishingMiniGame?.player===record.actor)handleFishingMiniGameInput(this.game,{confirmPressed:!packet.cancel,cancelPressed:!!packet.cancel});
  if(packet.type==='cancelCharge'){cancelActiveAbilityCharge(record.actor);cancelActiveHeavyAttackCharge(record.actor,this.game.world);}
 }
 sendInitial(record){
  const state=createSaveState(this.game);state.player=wireClone(record.actor);delete state.player.networkRemote;delete state.player.networkId;state.player.slot=state.player.playerNumber=1;
  state.dialogueState=null;state.currentSession=null;state.lastKnownLocalPlayers=[];
  record.scene=sceneKey(this.game.world);record.ready=false;record.caches={};record.wire.send({type:'initial',state,clock:performance.now(),build:ONLINE_BUILD});
 }
 joinConnection(connection){
  this.connection=connection;this.wire=bindOnlineConnection(connection,packet=>{if(this.connection===connection)this.guestMessage(packet).catch(error=>{if(this.connection===connection)this.fail(friendlyError(error));});},error=>{if(this.connection===connection)this.fail(friendlyError(error));});
  connection.on('close',()=>{if(this.connection===connection)this.fail('The host closed the world or the connection was lost. Your character has been saved.');});
 }
 async guestMessage(packet){
  if(packet.type==='error'){this.fail(String(packet.message).slice(0,300));return;}
  if(packet.type==='challenge'){
   if(packet.protocol!==ONLINE_PROTOCOL||packet.build!==ONLINE_BUILD){this.fail('The games are different versions. Refresh both devices.');return;}
   const connection=this.connection,key=this.room.key;
   if(!await checkRoomProof(key,'host:'+packet.challenge,packet.proof))throw Error('The host could not verify the world password.');
   const proof=await roomProof(key,'guest:'+packet.challenge);
   if(this.connection===connection)this.wire?.send({type:'authenticate',protocol:ONLINE_PROTOCOL,build:ONLINE_BUILD,proof,player:createSaveState(this.game).player});return;
  }
  if(packet.type==='closed'){this.fail('The host closed the world. Your character has been saved.');return;}
  if(packet.type==='character-accepted'){if(packet.revision===this.characterRevision)this.menuCommitPending=false;return;}
  if(packet.type==='initial'){
   if(packet.build!==ONLINE_BUILD)throw Error('Refresh both games to use the same version.');
   if(!this.backup)this.backup=createSaveState(this.game);
   clearTimeout(this.connectTimer);this.connecting=false;this.role='guest';this.ready=false;this.initializing=true;
   this.syncClock(packet.clock);
   applySaveToGame(this.game,packet.state);this.game.setUiOwner(this.game.player);this.game.player.networkRemote=false;
   this.receivedGroups={};this.smoothing.clear();this.partyActors.clear();this.initializing=false;this.ready=true;this.lastSnapshot=Date.now();this.menu.close();this.menu.clearPassword();this.setStatus('Joined the host’s world.');this.wire.send({type:'ready'});return;
  }
  if(packet.type==='state'&&this.role==='guest'&&this.ready){
   this.lastSnapshot=Date.now();this.syncClock(packet.clock);this.receiveState(packet);return;
  }
  if(packet.type==='service'&&this.role==='guest'){
   const npc=this.game.world.objects.find(o=>o.id===packet.npcId);
   if(packet.action==='shop')openMarketShop(this.game,npc);
   else if(npc)openWorkshopService(this.game,npc,packet.action==='workshopWeapons'?'weapons':packet.action==='workshopArmour'?'armour':'craft');
  }
 }
 syncClock(hostClock){
  if(!Number.isFinite(hostClock))return;
  if(!this.nativeNow){this.nativeNow=performance.now.bind(performance);this.performanceDescriptor=Object.getOwnPropertyDescriptor(performance,'now');Object.defineProperty(performance,'now',{configurable:true,value:()=>this.nativeNow()+this.offset});}
  this.offset=hostClock-this.nativeNow();
 }
 getRemoteInputs(){return this.role==='host'?[...this.clients.values()].filter(c=>c.actor&&c.ready).map(c=>({...c.input,slotIndex:c.actor.controllerSlotIndex,connected:true})):[];}
 updateHost(dt){
  if(this.role!=='host')return;
  for(const [id,record]of this.clients){
   if(!record.actor&&Date.now()-record.at>12000||record.actor&&Date.now()-record.lastInput>(record.ready?20000:60000)){this.removeClient(id);continue;}
   if(Date.now()-record.lastInput>750){record.input=sanitizeOnlineInput();if(record.actor){cancelActiveAbilityCharge(record.actor);cancelActiveHeavyAttackCharge(record.actor,this.game.world);}}
   clearOnlineEdges(record.input);
  }
  if(Date.now()<this.hostAt)return;this.hostAt=Date.now()+100;
  for(const record of this.clients.values()){
   try{
   if(!record.actor)continue;
   if(record.scene!==sceneKey(this.game.world)){this.sendInitial(record);continue;}
   if(!record.ready)continue;
   if(record.connection.bufferSize>4||record.connection.dataChannel?.bufferedAmount>256000)continue;
   const packet=this.makeState(record);record.wire.send(packet,{state:true});
   }catch(error){record.wire.send({type:'error',message:'The world could not be synchronized. Please try joining again.'});setTimeout(()=>this.removeClient(record.connection.peer),300);}
  }
 }
 makeState(record){
  const g=this.game,p=record.actor,groups={},refs=hostPresentationRefs(g);
  const radius=Math.max(1800,Math.hypot(record.viewWidth||960,record.viewHeight||600)/2+400);
  for(const group of ['objects','enemies','effects','combatEffects','drops']){
   const previous=record.caches[group]||new Map(),next=new Map(),upsert=[],remove=[];
   for(const entity of g.world[group]||[]){
    if(!entity||typeof entity!=='object')continue;
    const margin=Math.max(Number(entity.radius)||0,Number(entity.drawRadius)||0,(Number(entity.artWidth)||0)/2,(Number(entity.artHeight)||0)/2);
    if(Number.isFinite(entity.x)&&Number.isFinite(entity.y)&&Math.hypot(entity.x-p.x,entity.y-p.y)>radius+margin)continue;
    const id=entityId(entity,group),value=wireClone(entity,refs),text=JSON.stringify(value);next.set(id,text);
    if(previous.get(id)!==text)upsert.push({id,value});
   }
   for(const id of previous.keys())if(!next.has(id))remove.push(id);
   groups[group]={upsert,remove};record.caches[group]=next;
  }
  const party=[g.player,...(g.player.coop?.players||[]).filter(a=>a.active!==false)].map(a=>{
   const visual=wireClone(pick(a,[...VISUAL_FIELDS,'equippedGear','buffs','abilityMorphs','knownAbilities']),refs);
   visual.summons=(a.summons||[]).map(s=>wireClone(s,refs));
   return {id:a===g.player?'host':a.networkId||String(a.slot),visual,presentation:actorPresentation(a,refs)};
  });
  for(const entry of party)for(const key of ['abilityCharge','activeChannel','visualAction','downedState','reviveAction'])entry.visual[key] ??=null;
  for(const entry of party)for(const key of ['eliteFrost','eliteFrozenUntil','eliteFrostRecoveryUntil'])entry.visual[key] ??=0;
  const full=Date.now()>(record.profileAt||0);if(full)record.profileAt=Date.now()+500;
  const sounds=this.audioQueue.filter(e=>e.id>(record.audioCursor||0));record.audioCursor=this.audioSequence;
  return {type:'state',clock:performance.now(),groups,party,sounds,eliteEncounters:eliteEncounterPresentation(g.world,refs),self:p.networkId,profile:full?wireClone(p,refs):null,entryReady:partyEntrySnapshot(g,p),paused:!!g.paused||partyEntryPending(g),meta:wireClone(pick(g.world,['mode','name','theme','floor','depth','tier','regionId','actId','safeZone','cleared','dungeonState','bossRoomCenter','floorType','bossArena','arenaBarriers'])),dialogue:g.dialogue?.active&&g.dialogue.actor===p?wireClone({...g.dialogue,actor:undefined,world:undefined}):null,fishing:g.fishingMiniGame?.active&&g.fishingMiniGame.player===p?wireClone({...g.fishingMiniGame,object:undefined,player:undefined,objectId:g.fishingMiniGame.object?.id}):null};
 }
 receiveState(packet){
  const g=this.game,busy=this.isMenuBusy();
  if(packet.profile&&!busy&&!this.menuCommitPending){const {x,y,...profile}=packet.profile;Object.assign(g.player,profile);g.player.slot=g.player.playerNumber=1;g.player.networkRemote=false;}
  const others=[];
  for(const entry of packet.party||[]){
   if(entry.id===packet.self)this.applyVisual(g.player,busy||this.menuCommitPending?Object.fromEntries(Object.entries(entry.visual).filter(([key])=>!CHARACTER_FIELDS.includes(key))):entry.visual);
   else {let actor=this.partyActors.get(entry.id);if(!actor){actor={};this.partyActors.set(entry.id,actor);}this.applyVisual(actor,entry.visual);Object.assign(actor,{networkRemote:true,networkId:entry.id,slot:others.length+2,playerNumber:others.length+2,active:true});others.push(actor);}
  }
  g.player.coop={enabled:others.length>0,players:others};g.player.slot=g.player.playerNumber=1;g.player.networkRemote=false;
  const liveIds=new Set(others.map(a=>a.networkId));for(const [id,actor]of this.partyActors)if(!liveIds.has(id)){this.smoothing.delete(actor);this.partyActors.delete(id);}
  Object.assign(g.world,packet.meta||{},{networkGuest:true});
  for(const [group,delta]of Object.entries(packet.groups||{})){
   if(!['objects','enemies','effects','combatEffects','drops'].includes(group))continue;
   const values=this.receivedGroups[group] ||=new Map();for(const id of delta.remove||[])values.delete(id);for(const e of delta.upsert||[]){const old=values.get(e.id);if(old){this.applyVisual(old,e.value,true);values.set(e.id,old);}else values.set(e.id,e.value);}g.world[group]=[...values.values()];
  }
  for(const entry of packet.party||[]){const actor=entry.id===packet.self?g.player:this.partyActors.get(entry.id);if(actor)actor.networkPresentation=entry.presentation;}
  g.world.networkPresentation={eliteEncounters:packet.eliteEncounters||{hazards:[],actors:[],states:[]}};
  hydratePresentation(g,packet.self,this.partyActors);
  const old=!!g.dialogue.active;
  if(packet.dialogue)Object.assign(g.dialogue,packet.dialogue,{actor:g.player,world:g.world,ownerSlot:1});
  else if(old)closeDialogue(g.dialogue,{immediate:true});
  if(this.hostPaused!==packet.paused||this.memberCount!==packet.party.length){this.hostPaused=packet.paused;this.memberCount=packet.party.length;this.menu.render();}
  renderOnlineFishing(g,packet.fishing);
  receivePartyEntry(g,packet.entryReady||null);
  for(const sound of packet.sounds||[])if(sound.id>(this.lastAudioId||0)){this.lastAudioId=sound.id;if(performance.now()-sound.at<1000){this.lastAudioName=sound.name;playSfx(sound.name,sound.options);}}
 }
 applyVisual(target,source,replace=false){
  const x=target.x,y=target.y,dx=source.x-x,dy=source.y-y;
  if(replace)for(const key of Object.keys(target))if(!(key in source))delete target[key];Object.assign(target,source);
  if(Number.isFinite(dx)&&Number.isFinite(dy)&&Math.hypot(dx,dy)>.01&&Math.hypot(dx,dy)<256){this.smoothing.set(target,{x,y,toX:source.x,toY:source.y,at:Date.now()});target.x=x;target.y=y;}
  else this.smoothing.delete(target);
 }
 isMenuBusy(){return this.game.paused||!!document.querySelector('.panel.open,#characterCreatorOverlay.active,#workshopServiceOverlay.active,#marketShopOverlay.active,#onlineMultiplayerOverlay.active');}
 updateGuest(dt){
  if(!this.ready)return;
  const g=this.game,now=Date.now(),busy=this.isMenuBusy();
  g.updateInputMovement();const controller=g.getPrimaryControllerInput();
  const input=sanitizeOnlineInput({...g.input,...(controller.connected?pick(controller,Object.keys(sanitizeOnlineInput(controller))):{}),combatAimX:g.input.combatAimX,combatAimY:g.input.combatAimY,interactPressed:!!g.onlineInteractionRequested||!!controller.interactPressed,confirmHeld:!!controller.confirmHeld||g.keys.has('e'),pointerAimActive:!!g.input.mouseAimActive,pointerAimSource:g.input.aimSource,aimDistance:Math.hypot(g.input.mouseWorldX-g.player.x,g.input.mouseWorldY-g.player.y)});
  g.onlineInteractionRequested=false;
  if(this.wasMenuBusy&&!busy)this.commitCharacter();
  if(busy&&!this.wasMenuBusy)this.wire.send({type:'input',seq:++this.sequence,busy:true,input:sanitizeOnlineInput()});
  this.wasMenuBusy=busy;
  if(g.dialogue.active&&controller.connected&&(controller.confirmPressed||controller.cancelPressed||controller.upPressed||controller.downPressed))this.sendDialogue({confirmPressed:controller.confirmPressed,cancelPressed:controller.cancelPressed,upPressed:controller.upPressed,downPressed:controller.downPressed,inputDevice:'controller'});
  this.pendingInput=partyEntryPending(g)?sanitizeOnlineInput():mergeOnlineInput(this.pendingInput,input);
  if(now>=this.sendAt){
   this.sendAt=now+40;this.wire.send({type:'input',seq:++this.sequence,busy,viewport:{width:g.canvas.width,height:g.canvas.height},input:busy||partyEntryPending(g)||g.dialogue.active||g.fishingMiniGame?.active?sanitizeOnlineInput():this.pendingInput});this.pendingInput=null;
  }
  if(now-this.lastSnapshot>20000){this.fail('The host stopped responding. Your character has been saved.');return;}
  if(now>=this.saveAt){this.saveAt=now+2500;this.saveGuest(false);}
  for(const [target,pose]of this.smoothing){const t=Math.min(1,(now-pose.at)/100);target.x=pose.x+(pose.toX-pose.x)*t;target.y=pose.y+(pose.toY-pose.y)*t;if(t>=1)this.smoothing.delete(target);}
  // Presentation only: combat, collisions, damage and expiry remain host-owned.
  if(!this.hostPaused){
   const eliteHazards=g.world.networkPresentation?.eliteEncounters?.hazards||[];
   for(const hazard of eliteHazards)hazard.age=Math.min(hazard.warning+hazard.duration,hazard.age+dt);
   if(g.world.networkPresentation?.eliteEncounters)g.world.networkPresentation.eliteEncounters.hazards=eliteHazards.filter(h=>h.age<h.warning+h.duration);
   for(const effect of [...(g.world.effects||[]),...(g.world.combatEffects||[])]){if(Number.isFinite(effect.age))effect.age+=dt;if(effect.mantleVisual?.active)effect.mantleVisual.elapsed+=dt;if(effect.stormVisual?.active)effect.stormVisual.elapsed+=dt;}
   for(const actor of [g.player,...(g.player.coop?.players||[])]){
   if(actor.isMoving)actor.walkTime=(actor.walkTime||0)+dt*9;
   const combat=actor.combatState;if(combat?.attacking)combat.attackElapsed=(combat.attackElapsed||0)+dt;
   if(combat?.heavyChargeActive)combat.heavyChargeTime=(combat.heavyChargeTime||0)+dt;
   if(actor.abilityCharge?.active){const charge=actor.abilityCharge;charge.elapsed=Math.min(charge.maxChargeTime,charge.elapsed+dt);charge.progress=charge.elapsed/Math.max(.01,charge.maxChargeTime);}
   }
  }
  g.camera.x+=(g.player.x-g.canvas.width/2-g.camera.x)*.25;g.camera.y+=(g.player.y-g.canvas.height/2-g.camera.y)*.25;
  g.input.attackPressed=g.input.attackReleased=g.input.dashPressed=false;g.clearAbilityInputEdges();
 }
 commitCharacter(){if(this.role==='guest'&&this.wire){this.menuCommitPending=true;this.characterRevision=(this.characterRevision||0)+1;this.wire.send({type:'character',revision:this.characterRevision,character:wireClone(pick(this.game.player,CHARACTER_FIELDS))});}}
 sendDialogue(input){if(this.role!=='guest')return false;this.wire?.send({type:'dialogue',input});return true;}
 closeDialogue(){if(this.role!=='guest')return false;this.wire?.send({type:'dialogue',close:true});return true;}
 sendFishing(cancel=false){if(this.role!=='guest')return false;this.wire?.send({type:'fishing',cancel});return true;}
 cancelCharges(){if(this.role==='guest')this.wire?.send({type:'cancelCharge'});}
 sendPartyEntryAnswer(id,accept){if(this.role==='guest'&&this.ready)this.wire?.send({type:'party-entry',id,accept});}
 delegateService(actor,action,npc){
  if(!['shop','workshopWeapons','workshopArmour','workshopCraft'].includes(action.type))return false;
  const record=[...this.clients.values()].find(c=>c.actor===actor);if(!record)return false;
  actor.networkMenuBusy=true;record.wire.send({type:'service',action:action.type,npcId:npc?.id});return true;
 }
 guestSaveState(){
  const original=this.backup.player,player=wireClone(this.game.player);
  for(const field of ['x','y','currentZone','currentRegion','regions','story','quests','worldMemory','lastSafeLocation','act1OpeningPending'])if(original[field]!==undefined)player[field]=original[field];
  player.slot=player.playerNumber=1;delete player.networkRemote;delete player.networkId;delete player.networkMenuBusy;delete player.controllerSlotIndex;delete player.sessionSlot;player.cooldownClockSeconds=performance.now()/1000;
  player.profileId=original.profileId||this.game.profileId;player.origin=original.origin;if(original.id!==undefined)player.id=original.id;
  return {...this.backup,player,currentSession:null,lastKnownLocalPlayers:[],dialogueState:null};
 }
 saveGuest(showLog=false){if(!this.backup)return false;const result=upsertProfile(this.game.profileId,this.game.profileName,this.guestSaveState());this.lastSaveSucceeded=result.saved===true;if(showLog)this.game.log(result.saved?'Your online character has been saved.':'Your character could not be saved. Free some browser storage and try again.');return result.saved===true;}
 removeClient(id){
  const record=this.clients.get(id);if(!record)return;this.clients.delete(id);record.wire?.close();
  if(record.actor){if(this.game.dialogue?.actor===record.actor)closeDialogue(this.game.dialogue,{immediate:true});leaveCouchCoopPlayer(this.game,record.actor,{reason:'disconnected'});}
  this.menu.render();
 }
 disconnect({restore=true}={}){
  cancelPartyEntry(this.game,'',false);
  this.attempt=(this.attempt||0)+1;
  clearTimeout(this.connectTimer);const wasGuest=this.role==='guest',state=wasGuest&&this.backup?this.guestSaveState():null;
  if(wasGuest){this.commitCharacter();this.saveGuest(false);this.wire?.send({type:'leave'});}
  if(this.role==='host')for(const c of this.clients.values())c.wire?.send({type:'closed'});
  this.role=null;this.connecting=false;this.ready=false;this.connection=null;this.room=null;
  for(const id of [...this.clients.keys()])this.removeClient(id);
  this.wire?.close();this.wire=null;const peer=this.peer;this.peer=null;peer?.destroy();
  if(this.nativeNow){if(this.performanceDescriptor)Object.defineProperty(performance,'now',this.performanceDescriptor);else delete performance.now;this.nativeNow=null;}
  if(wasGuest&&restore&&state&&!this.game.destroyed){closeWorkshopService(this.game);closeCharacterCreator();document.querySelector('#marketShopOverlay')?.classList.remove('active');document.querySelector('.panel')?.classList.remove('open');this.game.uiState.activeMainTab=null;this.game.marketShop=null;this.game.applySave(state);this.game.setUiOwner(this.game.player);this.game.blur();}
  this.backup=null;this.receivedGroups={};this.smoothing.clear();this.partyActors.clear();this.wasMenuBusy=false;this.pendingInput=null;this.menuCommitPending=false;this.lastAudioId=0;this.audioQueue=[];this.audioTimes.clear();
  this.setStatus('World closed. You can open or join another world.');
 }
 destroy(){this.disconnect({restore:false});this.unsubscribeAudio();this.menu.destroy();}
}
